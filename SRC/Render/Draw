// ============================================
// RENDER/DRAW — примитивы отрисовки
// ============================================

import { FONT } from '../constants.js';

// Отрисовка спрайта
export function drawSpr(ctx, s, x, y, ang, flashWhite, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha == null ? 1 : alpha;
  ctx.translate(Math.round(x), Math.round(y));
  ctx.rotate(ang);
  ctx.drawImage(flashWhite ? s.f : s.n, -Math.round(s.w / 2), -Math.round(s.h / 2));
  ctx.restore();
  ctx.globalAlpha = 1;
}

// Пиксельный текст (шрифт 3x5)
export function pxText(ctx, str, x, y, col, sc) {
  sc = sc || 1;
  ctx.fillStyle = col;
  let cx = Math.round(x);
  for (let i = 0; i < str.length; i++) {
    const gl = FONT[str[i]];
    if (!gl) {
      cx += 4 * sc;
      continue;
    }
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 3; c++) {
        if (gl[r][c] === '1') {
          ctx.fillRect(cx + c * sc, Math.round(y) + r * sc, sc, sc);
        }
      }
    }
    cx += 4 * sc;
  }
}

// Ширина пиксельного текста
export function pxTextW(str, sc) {
  return str.length * 4 * (sc || 1) - (sc || 1);
}

// Пиксельная окружность (алгоритм Брезенхэма)
export function pxCircle(ctx, cx, cy, r, col, alpha) {
  cx = Math.round(cx);
  cy = Math.round(cy);
  r = Math.round(r);
  if (r < 1) return;
  ctx.globalAlpha = alpha == null ? 1 : alpha;
  ctx.fillStyle = col;
  let x = r, y = 0, err = 1 - r;
  while (x >= y) {
    ctx.fillRect(cx + x, cy + y, 1, 1);
    ctx.fillRect(cx + y, cy + x, 1, 1);
    ctx.fillRect(cx - y, cy + x, 1, 1);
    ctx.fillRect(cx - x, cy + y, 1, 1);
    ctx.fillRect(cx - x, cy - y, 1, 1);
    ctx.fillRect(cx - y, cy - x, 1, 1);
    ctx.fillRect(cx + y, cy - x, 1, 1);
    ctx.fillRect(cx + x, cy - y, 1, 1);
    y++;
    if (err < 0) {
      err += 2 * y + 1;
    } else {
      x--;
      err += 2 * (y - x) + 1;
    }
  }
  ctx.globalAlpha = 1;
}

// Пиксельный диск (заполненный)
export function pxDisc(ctx, cx, cy, r, col, alpha) {
  cx = Math.round(cx);
  cy = Math.round(cy);
  r = Math.round(r);
  ctx.globalAlpha = alpha == null ? 1 : alpha;
  ctx.fillStyle = col;
  for (let y = -r; y <= r; y++) {
    const w = Math.floor(Math.sqrt(Math.max(0, r * r - y * y)));
    ctx.fillRect(cx - w, cy + y, w * 2 + 1, 1);
  }
  ctx.globalAlpha = 1;
}
