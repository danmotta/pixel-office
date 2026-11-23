export function px(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

export function outlinedBox(ctx, x, y, w, h, fill, border = '#0b101b') {
  px(ctx, x - 1, y - 1, w + 2, h + 2, border);
  px(ctx, x, y, w, h, fill);
}

function shadeHex(hex, delta) {
  if (!/^#[0-9a-f]{6}$/i.test(hex || '')) return hex;
  const n = parseInt(hex.slice(1), 16);
  const clamp = (v) => Math.max(0, Math.min(255, v));
  const r = clamp(((n >> 16) & 255) + delta);
  const g = clamp(((n >> 8) & 255) + delta);
  const b = clamp((n & 255) + delta);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

function softShadow(ctx, cx, cy, rx, ry, alpha = 0.26) {
  ctx.save();
  ctx.fillStyle = `rgba(4, 7, 14, ${alpha})`;
  ctx.beginPath();
  ctx.ellipse(Math.round(cx), Math.round(cy), rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

const SKIN_TONES = ['#fde2c8', '#f4c7a1', '#dc9e72', '#a86b45', '#6e4229'];
const HAIR_COLORS = ['#1e293b', '#6d3917', '#d97706', '#991b1b', '#3b82f6', '#e2e8f0', '#7c3aed'];
const SHIRT_COLORS = ['#0284c7', '#e11d48', '#16a34a', '#9333ea', '#ea580c', '#0d9488', '#db2777', '#2563eb'];
const PANTS_COLORS = ['#1e293b', '#334155', '#1e3a8a', '#3f3f46', '#451a03'];
const HAIR_STYLES = ['spiky', 'mohawk', 'parted', 'bob', 'ponytail', 'curly', 'bun', 'cap'];

function hashId(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function getAvatarAppearance(agent) {
  const h = hashId(String(agent?.id || agent?.personaName || 'agent'));
  const autoLook = {
    skin: SKIN_TONES[h % SKIN_TONES.length],
    hairColor: HAIR_COLORS[(h >>> 3) % HAIR_COLORS.length],
    hairStyle: HAIR_STYLES[(h >>> 6) % HAIR_STYLES.length],
    shirt:
      agent?.source === 'gemini-web'
        ? ['#7c3aed', '#6366f1', '#9333ea', '#4f46e5'][(h >>> 9) % 4]
        : SHIRT_COLORS[(h >>> 9) % SHIRT_COLORS.length],
    pants: PANTS_COLORS[(h >>> 12) % PANTS_COLORS.length],
    glasses: ((h >>> 14) & 3) === 0,
    headset: agent?.source === 'antigravity' && ((h >>> 16) & 2) === 0,
    beard: ((h >>> 18) & 5) === 0,
    blinkPhase: (h >>> 20) % 29,
  };

  const ov = agent?.customLook;
  if (!ov) return autoLook;

  let glasses = autoLook.glasses;
  let headset = autoLook.headset;
  if (ov.accessory === 'none') {
    glasses = false;
    headset = false;
  } else if (ov.accessory === 'glasses') {
    glasses = true;
    headset = false;
  } else if (ov.accessory === 'headset') {
    glasses = false;
    headset = true;
  } else if (ov.accessory === 'both') {
    glasses = true;
    headset = true;
  }

  return {
    ...autoLook,
    hairColor: ov.hairColor || autoLook.hairColor,
    hairStyle: ov.hairStyle || autoLook.hairStyle,
    shirt: ov.shirt || autoLook.shirt,
    glasses,
    headset,
  };
}

function drawHair(ctx, cx, headY, look, christmas = false) {
  const hc = look.hairColor;
  const hi = shadeHex(hc, 28);
  const lo = shadeHex(hc, -24);
  const st = look.hairStyle;

  if (christmas) {
    px(ctx, cx - 7, headY - 4, 14, 4, '#dc2626');
    px(ctx, cx - 5, headY - 8, 10, 4, '#b91c1c');
    px(ctx, cx - 8, headY - 2, 16, 3, '#f8fafc');
    px(ctx, cx + 4, headY - 9, 4, 4, '#f8fafc');
    return;
  }

  px(ctx, cx - 6, headY - 3, 12, 4, hc);
  px(ctx, cx - 4, headY - 3, 7, 1, hi);
  if (st === 'spiky') {
    px(ctx, cx - 6, headY - 6, 3, 3, hc);
    px(ctx, cx - 1, headY - 8, 4, 5, hc);
    px(ctx, cx + 4, headY - 5, 3, 2, hc);
    px(ctx, cx, headY - 7, 2, 2, hi);
  } else if (st === 'mohawk') {
    px(ctx, cx - 2, headY - 9, 4, 6, '#38bdf8');
    px(ctx, cx - 1, headY - 8, 2, 3, '#bae6fd');
    px(ctx, cx - 7, headY - 2, 2, 5, lo);
    px(ctx, cx + 5, headY - 2, 2, 5, lo);
  } else if (st === 'bob') {
    px(ctx, cx - 8, headY - 1, 2, 10, hc);
    px(ctx, cx + 6, headY - 1, 2, 10, lo);
  } else if (st === 'ponytail') {
    px(ctx, cx - 8, headY - 1, 2, 6, hc);
    px(ctx, cx + 6, headY - 1, 3, 10, lo);
    px(ctx, cx + 6, headY + 2, 2, 2, '#f43f5e');
  } else if (st === 'curly') {
    px(ctx, cx - 8, headY - 5, 16, 5, hc);
    px(ctx, cx - 5, headY - 5, 9, 2, hi);
    px(ctx, cx - 9, headY - 2, 3, 7, lo);
    px(ctx, cx + 6, headY - 2, 3, 7, lo);
  } else if (st === 'bun') {
    px(ctx, cx - 3, headY - 8, 6, 5, hc);
    px(ctx, cx - 2, headY - 7, 3, 2, hi);
    px(ctx, cx - 8, headY - 1, 2, 5, hc);
    px(ctx, cx + 6, headY - 1, 2, 5, hc);
  } else if (st === 'cap') {
    px(ctx, cx - 7, headY - 5, 14, 5, '#dc2626');
    px(ctx, cx - 5, headY - 5, 8, 2, '#f87171');
    px(ctx, cx - 1, headY - 1, 10, 2, '#991b1b');
  } else {
    px(ctx, cx - 8, headY - 1, 2, 5, hc);
    px(ctx, cx + 6, headY - 1, 2, 5, lo);
  }
}

export function drawChibiAvatar(ctx, cx, cy, agent, opts = {}) {
  const {
    tick = 0,
    walking = false,
    dir = 1,
    christmas = false,
    seated = false,
    scale = 1,
    shellElapsedSec = 0,
  } = opts;

  const look = getAvatarAppearance(agent);
  const state = agent?.state || 'idle';
  const sleeping = Boolean(agent?.sleeping);
  const dreaming = state === 'dreaming';

  const bob = walking
    ? Math.sin(tick * 1.4) * 1.1
    : state === 'coding' || state === 'terminal'
      ? tick % 4 < 2
        ? 0
        : 0.7
      : 0;

  ctx.save();
  ctx.translate(cx, cy + bob * scale);
  ctx.scale(scale, scale);

  // Soft ground shadow
  if (!seated) {
    softShadow(ctx, 0, 13.5, 8, 3, 0.28);
  } else {
    softShadow(ctx, 0, 10.5, 7, 2.5, 0.2);
  }

  // Legs + shoes
  if (!seated) {
    const stride = walking ? Math.sin(tick * 1.5) * 2.1 : 0;
    outlinedBox(ctx, -5, 6 + stride, 4, 6, look.pants);
    outlinedBox(ctx, 1, 6 - stride, 4, 6, shadeHex(look.pants, -12));
    px(ctx, -5, 11 + stride, 4, 2, '#0b101b');
    px(ctx, 1, 11 - stride, 4, 2, '#0b101b');
    px(ctx, -4, 11 + stride, 2, 1, '#475569');
    px(ctx, 2, 11 - stride, 2, 1, '#475569');
  }

  // Torso with collar & shoulder shading
  const shirtLo = shadeHex(look.shirt, -26);
  const shirtHi = shadeHex(look.shirt, 18);
  outlinedBox(ctx, -7, -3, 14, 10, look.shirt);
  px(ctx, -6, -3, 12, 2, shirtHi);
  px(ctx, -7, 4, 14, 3, shirtLo);
  px(ctx, -2, -3, 4, 3, '#f8fafc');
  px(ctx, -1, -2, 2, 2, '#cbd5e1');

  // Arms
  const skinLo = shadeHex(look.skin, -18);
  if (state === 'waiting') {
    outlinedBox(ctx, -10, -2, 3, 7, shirtLo);
    px(ctx, -10, 4, 3, 2, look.skin);
    const wave = tick % 4 < 2 ? 0 : 2;
    outlinedBox(ctx, 7, -14 + wave, 3, 12, shirtHi);
    px(ctx, 7, -16 + wave, 3, 3, look.skin);
  } else if ((state === 'coding' || state === 'terminal') && !walking) {
    const tL = tick % 2 === 0 ? 0 : 2;
    const tR = tick % 2 === 0 ? 2 : 0;
    outlinedBox(ctx, -10, -2 + tL, 3, 7, shirtLo);
    px(ctx, -10, 4 + tL, 3, 2, look.skin);
    outlinedBox(ctx, 7, -2 + tR, 3, 7, shirtHi);
    px(ctx, 7, 4 + tR, 3, 2, look.skin);
  } else if (state === 'thinking') {
    outlinedBox(ctx, -10, -2, 3, 7, shirtLo);
    outlinedBox(ctx, 7, -4, 3, 7, shirtHi);
    px(ctx, 4, -5, 4, 3, look.skin);
  } else if (shellElapsedSec >= 8 && shellElapsedSec < 180) {
    outlinedBox(ctx, -10, -2, 3, 7, shirtLo);
    outlinedBox(ctx, 7, -2, 3, 7, shirtHi);
    outlinedBox(ctx, -4, 1, 8, 6, '#dc2626');
    px(ctx, -2, 1, 2, 6, '#f8fafc');
    px(ctx, 2, 1, 2, 6, '#f8fafc');
    px(ctx, -3, -1, 6, 2, '#fef08a');
  } else {
    const armSwing = walking ? Math.sin(tick * 1.5) * 1.5 : 0;
    outlinedBox(ctx, -10, -2 + armSwing, 3, 7, shirtLo);
    px(ctx, -10, 4 + armSwing, 3, 2, look.skin);
    outlinedBox(ctx, 7, -2 - armSwing, 3, 7, shirtHi);
    px(ctx, 7, 4 - armSwing, 3, 2, look.skin);
  }

  // Head (stepped rounded chibi head)
  const headY = -16;
  px(ctx, -7, headY - 1, 14, 15, '#0b101b');
  px(ctx, -8, headY + 1, 16, 11, '#0b101b');
  px(ctx, -6, headY, 12, 13, look.skin);
  px(ctx, -7, headY + 2, 14, 9, look.skin);
  px(ctx, -6, headY + 11, 12, 2, skinLo); // chin shade
  px(ctx, -5, headY + 8, 2, 1, '#fda4af'); // soft cheek blush
  px(ctx, 3, headY + 8, 2, 1, '#fda4af');

  // Eyes (with natural blink)
  const eyeOffset = dir >= 0 ? 1 : -1;
  const blinking = (tick + look.blinkPhase) % 27 === 0;
  if (sleeping || dreaming || shellElapsedSec >= 1500 || blinking) {
    px(ctx, -4 + eyeOffset, headY + 6, 3, 1, '#0f172a');
    px(ctx, 1 + eyeOffset, headY + 6, 3, 1, '#0f172a');
  } else {
    px(ctx, -4 + eyeOffset, headY + 5, 2, 3, '#0f172a');
    px(ctx, 2 + eyeOffset, headY + 5, 2, 3, '#0f172a');
    px(ctx, -4 + eyeOffset, headY + 5, 1, 1, '#ffffff');
    px(ctx, 2 + eyeOffset, headY + 5, 1, 1, '#ffffff');
  }

  if (look.beard) {
    px(ctx, -5, headY + 10, 10, 3, shadeHex(look.hairColor, -8));
  }

  if (look.glasses) {
    px(ctx, -5 + eyeOffset, headY + 4, 4, 4, 'rgba(87, 193, 255, 0.34)');
    px(ctx, 1 + eyeOffset, headY + 4, 4, 4, 'rgba(87, 193, 255, 0.34)');
    px(ctx, -5 + eyeOffset, headY + 4, 4, 1, '#1e293b');
    px(ctx, 1 + eyeOffset, headY + 4, 4, 1, '#1e293b');
    px(ctx, -1 + eyeOffset, headY + 5, 2, 1, '#0f172a');
  }

  drawHair(ctx, 0, headY, look, christmas);

  if (look.headset && !christmas) {
    px(ctx, -9, headY + 2, 2, 6, '#38bdf8');
    px(ctx, 7, headY + 2, 2, 6, '#38bdf8');
    px(ctx, -7, headY - 4, 14, 2, '#0284c7');
  }

  ctx.restore();

  if (dreaming) {
    drawDreamingBubble(ctx, cx, cy - 35 * scale, tick);
  } else if (sleeping || shellElapsedSec >= 1500) {
    const drift = Math.sin(tick * 0.5) * 2;
    ctx.save();
    ctx.fillStyle = '#cbd5e1';
    ctx.font = 'bold 10px Inter, "Segoe UI", sans-serif';
    ctx.fillText('Zzz', cx + 9, cy - 22 * scale + drift);
    ctx.restore();
  } else if (shellElapsedSec >= 600) {
    ctx.save();
    ctx.strokeStyle = 'rgba(226, 232, 240, 0.72)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx + 8, cy - 10);
    ctx.lineTo(cx + 16, cy - 2);
    ctx.moveTo(cx + 16, cy - 10);
    ctx.lineTo(cx + 8, cy - 2);
    ctx.stroke();
    ctx.restore();
  }
}

export function drawAvatarPortrait(canvas, agent, christmas = false) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.imageSmoothingEnabled = false;
  const bg = agent?.source === 'gemini-web' ? '#24144a' : '#12151f';
  px(ctx, 0, 0, w, h, bg);
  px(ctx, 0, 0, w, 2, agent?.source === 'gemini-web' ? '#7c3aed' : '#5e6ad2');
  const scale = Math.max(1, Math.floor(w / 22));
  drawChibiAvatar(ctx, w / 2, h * 0.78, { ...agent, state: 'idle', sleeping: false }, {
    scale,
    seated: true,
    christmas,
  });
}

export function drawDreamingBubble(ctx, cx, cy, tick) {
  const floatY = Math.sin(tick * 0.6) * 1.5;
  const x = Math.round(cx - 24);
  const y = Math.round(cy - 18 + floatY);

  ctx.save();
  ctx.fillStyle = '#1e1b4b';
  ctx.beginPath();
  ctx.roundRect(x - 1, y, 50, 18, 9);
  ctx.fill();
  ctx.fillStyle = '#5b21b6';
  ctx.beginPath();
  ctx.roundRect(x, y + 1, 48, 16, 8);
  ctx.fill();
  ctx.restore();

  px(ctx, cx - 2, y + 20, 4, 4, '#7c3aed');
  px(ctx, cx - 4, y + 25, 3, 3, '#a78bfa');

  const shift = tick % 4;
  px(ctx, x + 9, y + 6 + (shift % 2), 4, 4, '#38bdf8');
  px(ctx, x + 21, y + 4 + ((shift + 1) % 2), 5, 5, '#ffc533');
  px(ctx, x + 33, y + 7 - (shift % 2), 4, 4, '#e9d5ff');
  px(ctx, x + 46 + shift * 2, y + 4, 2, 2, 'rgba(203, 213, 225, 0.55)');
}

export function drawSpeechBubble(ctx, cx, cy, text, kind = 'work') {
  if (!text) return;
  ctx.save();
  ctx.font = '600 10.5px Inter, "Segoe UI", sans-serif';
  const label = text.length > 26 ? `${text.slice(0, 25)}…` : text;
  const tw = Math.ceil(ctx.measureText(label).width);
  const bw = tw + 14;
  const bh = 20;
  const bx = Math.round(cx - bw / 2);
  const by = Math.round(cy - bh - 5);

  let bg = '#f7f8f8';
  let fg = '#0f172a';
  let border = '#34343a';

  if (kind === 'waiting') {
    bg = '#ffc533';
    fg = '#0b0c0e';
    border = '#92400e';
  } else if (kind === 'dreaming') {
    bg = '#3b0764';
    fg = '#f3e8ff';
    border = '#a855f7';
  } else if (kind === 'happy') {
    bg = '#065f46';
    fg = '#ecfdf5';
    border = '#00d992';
  } else if (kind === 'error') {
    bg = '#7f1d1d';
    fg = '#fef2f2';
    border = '#ff6161';
  } else if (kind === 'social') {
    bg = '#0f1011';
    fg = '#e2e8f0';
    border = '#5e6ad2';
  }

  ctx.fillStyle = 'rgba(0, 0, 0, 0.34)';
  ctx.beginPath();
  ctx.roundRect(bx + 1, by + 2, bw, bh, 6);
  ctx.fill();

  ctx.fillStyle = bg;
  ctx.strokeStyle = border;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(bx, by, bw, bh, 6);
  ctx.fill();
  ctx.stroke();

  // Caret pointer
  px(ctx, cx - 2, by + bh, 4, 3, bg);
  px(ctx, cx - 1, by + bh + 3, 2, 1, border);

  ctx.fillStyle = fg;
  ctx.textBaseline = 'middle';
  ctx.fillText(label, bx + 7, by + bh / 2 + 0.5);
  ctx.restore();
}

export function drawNamePill(ctx, cx, cy, name, badgeChar, badgeColor) {
  ctx.save();
  ctx.font = '600 10px Inter, "Segoe UI", sans-serif';
  const label = name.length > 14 ? `${name.slice(0, 13)}…` : name;
  const tw = Math.ceil(ctx.measureText(label).width);
  const bw = tw + 22;
  const bh = 16;
  const bx = Math.round(cx - bw / 2);
  const by = Math.round(cy);

  ctx.fillStyle = 'rgba(13, 14, 18, 0.90)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(bx, by, bw, bh, 5);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = badgeColor;
  ctx.beginPath();
  ctx.roundRect(bx + 2, by + 2, 12, 12, 3);
  ctx.fill();

  ctx.fillStyle = '#07080a';
  ctx.font = '800 8.5px Inter, Consolas, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText(badgeChar, bx + 5, by + 8.5);

  ctx.fillStyle = '#f7f8f8';
  ctx.font = '600 10px Inter, "Segoe UI", sans-serif';
  ctx.fillText(label, bx + 17, by + 8.5);
  ctx.restore();
}

export function drawTree(ctx, x, y, isPine = false) {
  softShadow(ctx, x, y + 9, 13, 4.5, 0.24);
  // Textured bark trunk
  outlinedBox(ctx, x - 3, y - 2, 6, 11, '#7c3f1c', '#2a1609');
  px(ctx, x - 1, y - 1, 2, 9, '#9a5228');

  if (isPine) {
    outlinedBox(ctx, x - 13, y - 11, 26, 10, '#14532d', '#092414');
    px(ctx, x - 11, y - 10, 18, 4, '#15803d');
    outlinedBox(ctx, x - 10, y - 19, 20, 9, '#15803d', '#092414');
    px(ctx, x - 8, y - 18, 12, 4, '#16a34a');
    outlinedBox(ctx, x - 6, y - 26, 12, 8, '#16a34a', '#092414');
    px(ctx, x - 4, y - 25, 6, 4, '#4ade80');
  } else {
    outlinedBox(ctx, x - 13, y - 18, 26, 17, '#15803d', '#092414');
    outlinedBox(ctx, x - 10, y - 23, 20, 15, '#16a34a', '#092414');
    px(ctx, x - 9, y - 21, 14, 9, '#22c55e');
    px(ctx, x - 7, y - 20, 7, 4, '#4ade80');
    px(ctx, x + 5, y - 10, 6, 6, '#14532d');
  }
}

export function drawPineTree(ctx, x, y) {
  drawTree(ctx, x, y, true);
}

export function drawBush(ctx, x, y) {
  softShadow(ctx, x, y + 3, 10, 3, 0.22);
  outlinedBox(ctx, x - 9, y - 5, 18, 8, '#15803d', '#092414');
  px(ctx, x - 7, y - 6, 14, 6, '#16a34a');
  px(ctx, x - 5, y - 5, 7, 3, '#4ade80');
  px(ctx, x - 4, y - 2, 2, 2, '#fb7185');
  px(ctx, x + 3, y - 3, 2, 2, '#fde047');
}

export function drawPottedPlant(ctx, x, y) {
  softShadow(ctx, x, y + 6, 7, 2.5, 0.2);
  outlinedBox(ctx, x - 5, y, 10, 7, '#b45309', '#451a03');
  px(ctx, x - 6, y - 1, 12, 2, '#d97706');
  px(ctx, x - 7, y - 10, 5, 8, '#16a34a');
  px(ctx, x - 2, y - 13, 4, 11, '#22c55e');
  px(ctx, x + 2, y - 9, 5, 7, '#15803d');
  px(ctx, x - 1, y - 12, 2, 4, '#4ade80');
}

export function drawFloorLamp(ctx, x, y, warmGlow = false) {
  if (warmGlow) {
    const grad = ctx.createRadialGradient(x, y - 12, 2, x, y - 12, 46);
    grad.addColorStop(0, 'rgba(253, 224, 120, 0.28)');
    grad.addColorStop(1, 'rgba(253, 224, 120, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(x - 46, y - 58, 92, 92);
  }
  px(ctx, x - 4, y + 10, 8, 3, '#334155');
  px(ctx, x - 1, y - 10, 2, 21, '#64748b');
  outlinedBox(ctx, x - 6, y - 18, 12, 9, warmGlow ? '#fde68a' : '#fef3c7', '#451a03');
  px(ctx, x - 4, y - 16, 8, 3, '#ffffff');
}

export function drawWorkstation(ctx, deskX, deskY, scrColor, tick, hasOcupant) {
  // Subtle floor shadow under desk
  px(ctx, deskX + 2, deskY + 21, 60, 4, 'rgba(0,0,0,0.22)');
  // Desk wood top + front edge bevel
  outlinedBox(ctx, deskX, deskY, 64, 21, '#d8b989', '#2b1b0e');
  px(ctx, deskX + 1, deskY + 1, 62, 3, '#ecd2a8');
  px(ctx, deskX, deskY + 18, 64, 3, '#b58d58');
  px(ctx, deskX + 6, deskY + 21, 4, 4, '#334155');
  px(ctx, deskX + 54, deskY + 21, 4, 4, '#334155');

  // Dual monitor stand & bezel
  px(ctx, deskX + 29, deskY - 2, 6, 4, '#334155');
  outlinedBox(ctx, deskX + 14, deskY - 14, 36, 13, '#181b24', '#090b10');
  px(ctx, deskX + 16, deskY - 12, 32, 9, scrColor);
  if (hasOcupant && scrColor !== '#0f172a') {
    const codeShift = tick % 3;
    px(ctx, deskX + 18, deskY - 10 + codeShift, 14, 2, 'rgba(255,255,255,0.7)');
    px(ctx, deskX + 18, deskY - 6, 22, 1.5, 'rgba(255,255,255,0.45)');
  }

  // Keyboard & mouse pad
  px(ctx, deskX + 20, deskY + 6, 20, 5, '#334155');
  px(ctx, deskX + 21, deskY + 7, 18, 3, '#64748b');
  px(ctx, deskX + 44, deskY + 7, 6, 4, '#1e293b');

  // Steaming coffee mug
  px(ctx, deskX + 7, deskY + 5, 5, 5, '#f8fafc');
  px(ctx, deskX + 8, deskY + 6, 3, 2, '#78350f');
  if (hasOcupant && tick % 4 < 2) {
    px(ctx, deskX + 9, deskY + 2, 2, 2, 'rgba(248,250,252,0.55)');
  }
}

export function drawOfficeChair(ctx, sx, sy) {
  softShadow(ctx, sx, sy + 7, 9, 3, 0.22);
  outlinedBox(ctx, sx - 9, sy - 5, 18, 12, '#334155', '#0f172a');
  px(ctx, sx - 7, sy - 4, 14, 5, '#475569');
  px(ctx, sx - 11, sy - 1, 2, 6, '#1e293b');
  px(ctx, sx + 9, sy - 1, 2, 6, '#1e293b');
}

export function drawSofa(ctx, x, y, w = 68, h = 22, color = '#3b82f6') {
  px(ctx, x + 2, y + h + 1, w - 4, 4, 'rgba(0,0,0,0.22)');
  outlinedBox(ctx, x, y, w, h, color, '#172554');
  px(ctx, x + 3, y + 3, w - 6, 6, shadeHex(color, 26));
  px(ctx, x + 6, y + 10, w / 2 - 8, h - 13, shadeHex(color, -18));
  px(ctx, x + w / 2 + 2, y + 10, w / 2 - 8, h - 13, shadeHex(color, -18));
}

export function drawBookcase(ctx, x, y) {
  outlinedBox(ctx, x, y, 42, 28, '#6d3917', '#291507');
  px(ctx, x + 2, y + 3, 38, 10, '#3b1e0a');
  px(ctx, x + 2, y + 15, 38, 10, '#3b1e0a');
  const colors = ['#ef4444', '#38bdf8', '#facc15', '#4ade80', '#c084fc', '#fb923c'];
  colors.forEach((c, idx) => {
    px(ctx, x + 4 + idx * 6, y + 5, 4, 8, c);
    px(ctx, x + 4 + ((idx + 2) % 6) * 6, y + 17, 4, 8, c);
  });
}

export function drawChristmasTree(ctx, x, y, tick) {
  softShadow(ctx, x, y + 9, 14, 4.5, 0.26);
  outlinedBox(ctx, x - 3, y + 4, 6, 6, '#78350f', '#2a1609');
  outlinedBox(ctx, x - 13, y - 6, 26, 11, '#14532d', '#092414');
  outlinedBox(ctx, x - 9, y - 15, 18, 10, '#15803d', '#092414');
  outlinedBox(ctx, x - 5, y - 23, 10, 9, '#16a34a', '#092414');
  px(ctx, x - 2, y - 27, 4, 4, '#facc15');
  const blink = tick % 6 < 3;
  px(ctx, x - 6, y - 3, 3, 3, blink ? '#ef4444' : '#facc15');
  px(ctx, x + 4, y - 11, 3, 3, blink ? '#38bdf8' : '#ef4444');
  px(ctx, x - 3, y - 18, 3, 3, blink ? '#facc15' : '#38bdf8');
  outlinedBox(ctx, x - 13, y + 5, 7, 6, '#ef4444', '#450a0a');
  px(ctx, x - 10, y + 5, 1, 6, '#facc15');
  outlinedBox(ctx, x + 6, y + 6, 7, 5, '#3b82f6', '#172554');
  px(ctx, x + 9, y + 6, 1, 5, '#f8fafc');
}

export function drawLamppost(ctx, x, y, nightMode) {
  softShadow(ctx, x, y + 1, 5, 2, 0.25);
  outlinedBox(ctx, x - 2, y - 28, 4, 28, '#334155', '#0f172a');
  px(ctx, x - 1, y - 27, 1, 26, '#64748b');
  px(ctx, x - 5, y - 32, 10, 5, nightMode ? '#fde047' : '#cbd5e1');
  px(ctx, x - 6, y - 34, 12, 2, '#1e293b');
  if (nightMode) {
    const grad = ctx.createRadialGradient(x, y - 28, 3, x, y - 28, 52);
    grad.addColorStop(0, 'rgba(253, 224, 71, 0.40)');
    grad.addColorStop(0.5, 'rgba(253, 224, 71, 0.14)');
    grad.addColorStop(1, 'rgba(253, 224, 71, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(x - 52, y - 80, 104, 104);
  }
}

export function drawCar(ctx, x, y, color, dir, nightMode) {
  ctx.save();
  ctx.translate(x, y);
  softShadow(ctx, 0, 7, 17, 4, 0.3);
  outlinedBox(ctx, -17, -6, 34, 12, color, '#090d16');
  px(ctx, -15, -5, 30, 3, shadeHex(color, 26));
  outlinedBox(ctx, -10, -11, 18, 6, '#dbeafe', '#0f172a');
  px(ctx, -8, -10, 14, 2, '#ffffff');
  px(ctx, -13, 5, 6, 4, '#0f172a');
  px(ctx, 7, 5, 6, 4, '#0f172a');
  px(ctx, -11, 6, 2, 2, '#94a3b8');
  px(ctx, 9, 6, 2, 2, '#94a3b8');

  const tailX = dir >= 0 ? -18 : 16;
  px(ctx, tailX, -2, 2, 4, '#ef4444');
  if (nightMode) {
    const hx = dir >= 0 ? 17 : -21;
    px(ctx, hx, -3, 4, 3, '#fde047');
    ctx.fillStyle = 'rgba(253, 224, 71, 0.24)';
    ctx.beginPath();
    ctx.moveTo(hx + (dir >= 0 ? 4 : 0), -2);
    ctx.lineTo(hx + dir * 56, -14);
    ctx.lineTo(hx + dir * 56, 12);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

export function drawPingPongTable(ctx, x, y, tick, active) {
  px(ctx, x - 25, y + 13, 50, 4, 'rgba(0,0,0,0.22)');
  outlinedBox(ctx, x - 26, y - 13, 52, 26, '#0369a1', '#082f49');
  px(ctx, x - 24, y - 11, 48, 22, '#0284c7');
  px(ctx, x - 24, y - 1, 48, 2, '#f8fafc');
  px(ctx, x - 1, y - 14, 2, 28, '#e2e8f0');
  if (active) {
    const bx = x - 18 + Math.sin(tick * 1.1) * 18;
    const by = y - 2 + Math.cos(tick * 2.2) * 5;
    px(ctx, bx, by, 3.5, 3.5, '#ffffff');
  }
}

export function drawLoungeTV(ctx, x, y, tick, show = 'futebol', active = true) {
  outlinedBox(ctx, x - 24, y, 48, 24, '#18181b', '#09090b');
  px(ctx, x - 22, y + 2, 44, 20, active ? '#0f172a' : '#111827');
  if (!active) return;
  if (show === 'futebol') {
    px(ctx, x - 21, y + 3, 42, 18, '#15803d');
    const ballX = x - 12 + ((tick * 2) % 24);
    px(ctx, ballX, y + 11, 3, 3, '#ffffff');
    if (tick % 12 < 3) {
      ctx.fillStyle = '#facc15';
      ctx.font = 'bold 8.5px Inter, Consolas, sans-serif';
      ctx.fillText('GOL!', x - 10, y + 12);
    }
  } else if (show === 'novela') {
    px(ctx, x - 21, y + 3, 42, 18, '#4c1d95');
    px(ctx, x - 3, y + 8, 6, 6, '#fb7185');
  } else {
    px(ctx, x - 21, y + 3, 42, 18, '#0369a1');
    px(ctx, x - 12 + (tick % 20), y + 9, 5, 5, '#facc15');
  }
}

export function drawArcadeCabinet(ctx, x, y, tick, color = '#4c1d95') {
  px(ctx, x + 1, y + 30, 18, 4, 'rgba(0,0,0,0.22)');
  outlinedBox(ctx, x, y, 20, 30, color, '#0f0720');
  px(ctx, x + 2, y + 2, 16, 4, '#f43f5e');
  px(ctx, x + 3, y + 8, 14, 10, '#090d16');
  px(ctx, x + 5 + (tick % 6), y + 12, 3, 3, '#00d992');
  px(ctx, x + 2, y + 20, 16, 4, '#334155');
  px(ctx, x + 5, y + 21, 3, 2, '#facc15');
  px(ctx, x + 12, y + 21, 3, 2, '#38bdf8');
}

export function drawPetSprite(ctx, cx, cy, petType, mood, tick, dir = 1, scale = 1) {
  if (!petType || petType === 'none') return;
  const hop = mood === 'alert' ? (tick % 4 < 2 ? -3 : 0) : tick % 6 < 3 ? -1 : 0;

  ctx.save();
  ctx.translate(cx, cy + hop * scale);
  softShadow(ctx, 0, 9 * scale, 7 * scale, 2.5 * scale, 0.25);
  ctx.scale(dir * scale, scale);

  if (petType === 'cyberfox') {
    px(ctx, -12, -2, 6, 4, '#ea580c');
    px(ctx, -14, -4, 3, 3, '#f8fafc');
    outlinedBox(ctx, -7, -2, 14, 8, '#f97316');
    px(ctx, -4, 1, 8, 5, '#fed7aa');
    const leg = mood === 'walk' && tick % 4 < 2 ? 1 : 0;
    px(ctx, -6, 6 + leg, 3, 3, '#9a3412');
    px(ctx, 3, 6 - leg, 3, 3, '#9a3412');
    outlinedBox(ctx, -2, -10, 12, 9, '#f97316');
    px(ctx, -2, -14, 3, 4, '#ea580c');
    px(ctx, 6, -14, 3, 4, '#ea580c');
    px(ctx, 2, -8, 8, 3, mood === 'alert' ? '#facc15' : '#22d3ee');
    px(ctx, 9, -4, 2, 2, '#0f172a');
  } else if (petType === 'cat') {
    const tailWag = tick % 6 < 3 ? -2 : 0;
    px(ctx, -11, -3 + tailWag, 5, 2, '#f59e0b');
    outlinedBox(ctx, -7, -2, 13, 8, '#fef3c7');
    px(ctx, -5, -1, 4, 4, '#f59e0b');
    const leg = mood === 'walk' && tick % 4 < 2 ? 1 : 0;
    px(ctx, -6, 6 + leg, 3, 3, '#d97706');
    px(ctx, 3, 6 - leg, 3, 3, '#d97706');
    outlinedBox(ctx, -1, -10, 11, 9, '#fef3c7');
    px(ctx, -1, -13, 3, 3, '#f59e0b');
    px(ctx, 7, -13, 3, 3, '#f59e0b');
    if (mood === 'sleep' || mood === 'dream') {
      px(ctx, 2, -6, 2, 1, '#0f172a');
      px(ctx, 6, -6, 2, 1, '#0f172a');
    } else {
      px(ctx, 2, -7, 2, 2, '#0f172a');
      px(ctx, 6, -7, 2, 2, '#0f172a');
    }
    px(ctx, 4, -4, 2, 1, '#fb7185');
  } else if (petType === 'dragon') {
    const wing = tick % 4 < 2 ? -2 : 0;
    px(ctx, -4, -9 + wing, 6, 5, '#facc15');
    px(ctx, -12, -1, 6, 3, '#15803d');
    outlinedBox(ctx, -7, -2, 13, 8, '#16a34a');
    px(ctx, -3, 1, 7, 5, '#bbf7d0');
    px(ctx, -6, 6, 3, 3, '#14532d');
    px(ctx, 3, 6, 3, 3, '#14532d');
    outlinedBox(ctx, -1, -10, 11, 9, '#22c55e');
    px(ctx, 0, -13, 2, 3, '#fde047');
    px(ctx, 6, -13, 2, 3, '#fde047');
    px(ctx, 6, -7, 2, 2, '#fef08a');
    if (mood === 'alert' || mood === 'happy') {
      px(ctx, 11, -6, 3, 2, '#f97316');
      px(ctx, 13, -7, 2, 2, '#facc15');
    }
  } else if (petType === 'robot') {
    px(ctx, 3, -15, 2, 4, '#38bdf8');
    px(ctx, 2, -17, 4, 2, mood === 'alert' ? '#facc15' : '#00d992');
    outlinedBox(ctx, -6, -2, 12, 9, '#64748b');
    px(ctx, -4, 0, 8, 5, '#94a3b8');
    px(ctx, -5, 7, 3, 3, '#334155');
    px(ctx, 2, 7, 3, 3, '#334155');
    outlinedBox(ctx, -3, -11, 12, 9, '#475569');
    px(ctx, -1, -9, 8, 5, '#0f172a');
    px(ctx, 0, -8, 2, 3, mood === 'alert' ? '#facc15' : '#22d3ee');
    px(ctx, 4, -8, 2, 3, mood === 'alert' ? '#facc15' : '#22d3ee');
  }

  ctx.restore();

  if (mood === 'happy') {
    px(ctx, cx - 2, cy - 20 * scale, 2 * scale, 2 * scale, '#f43f5e');
    px(ctx, cx + 2, cy - 20 * scale, 2 * scale, 2 * scale, '#f43f5e');
    px(ctx, cx - 1 * scale, cy - 18 * scale, 4 * scale, 2 * scale, '#f43f5e');
  } else if (mood === 'alert') {
    px(ctx, cx + 8 * scale, cy - 22 * scale, 6 * scale, 8 * scale, '#ffc533');
    px(ctx, cx + 10 * scale, cy - 20 * scale, 2 * scale, 4 * scale, '#0f172a');
  } else if (mood === 'dream') {
    px(ctx, cx + 8 * scale, cy - 18 * scale, 5 * scale, 5 * scale, '#a855f7');
    px(ctx, cx + 10 * scale, cy - 16 * scale, 2 * scale, 2 * scale, '#38bdf8');
  } else if (mood === 'sleep') {
    ctx.save();
    ctx.fillStyle = '#94a3b8';
    ctx.font = `bold ${Math.round(9 * scale)}px Inter, Consolas, sans-serif`;
    ctx.fillText('z', cx + 9 * scale, cy - 10 * scale);
    ctx.restore();
  }
}
