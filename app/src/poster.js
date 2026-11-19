// poster.js — Vice Poster Studio: the cover renderer.
// Everything is drawn on a 2D canvas from a state object (see state.js):
// five multi-panel layouts, per-panel photos with crop/position/grade, the
// bold caption block, the cover dressing (badge, script, ribbon, sticker,
// location, skyline) and the finishing effects. The same function draws the
// small live preview and the full-size PNG export, so what you see is what
// you share.

import { layoutById, gradeById, subtitleFor } from './state.js';

// Panel geometry. The panels fill the cover down to the skyline strip at
// the bottom (6% of the height); the caption block is painted over the
// lower part of the panels on a dark scrim, poster style.
export function layoutRects(layoutId, W, H) {
  const g = Math.max(4, Math.round(W * 0.008));
  const PH = Math.round(H * 0.94);
  const col = (x0, x1, y0, y1) => ({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
  const splitV = (x0, x1, n) => {
    const out = [];
    const total = PH - g * (n - 1);
    const each = total / n;
    for (let i = 0; i < n; i++) out.push(col(x0, x1, Math.round(i * (each + g)), Math.round(i * (each + g) + each)));
    return out;
  };
  const splitH = (y0, y1, n) => {
    const out = [];
    const total = W - g * (n - 1);
    const each = total / n;
    for (let i = 0; i < n; i++) out.push(col(Math.round(i * (each + g)), Math.round(i * (each + g) + each), y0, y1));
    return out;
  };
  switch (layoutId) {
    case 'hero2': {
      const hero = col(0, Math.round(W * 0.615), 0, PH);
      const right = splitV(Math.round(W * 0.615) + g, W, 2);
      return [hero, ...right];
    }
    case 'hero3': {
      const hero = col(0, Math.round(W * 0.575), 0, PH);
      const right = splitV(Math.round(W * 0.575) + g, W, 3);
      return [hero, ...right];
    }
    case 'grid': {
      const top = splitH(0, Math.round(PH / 2) - Math.floor(g / 2), 2);
      const bot = splitH(Math.round(PH / 2) + Math.ceil(g / 2), PH, 2);
      return [...top, ...bot];
    }
    case 'bleed': {
      const hero = col(0, W, 0, Math.round(PH * 0.66));
      const strip = splitH(Math.round(PH * 0.66) + g, PH, 2);
      return [hero, ...strip];
    }
    case 'grid5':
    default: {
      const hero = col(0, Math.round(W * 0.595), 0, PH);
      const rx = Math.round(W * 0.595) + g;
      // The right-hand 2x2 grid, computed directly so its columns line up.
      const rw = W - rx;
      const cw = Math.floor((rw - g) / 2);
      const ch = Math.floor((PH - g) / 2);
      return [
        hero,
        { x: rx, y: 0, w: cw, h: ch },
        { x: rx + cw + g, y: 0, w: rw - cw - g, h: ch },
        { x: rx, y: ch + g, w: cw, h: PH - ch - g },
        { x: rx + cw + g, y: ch + g, w: rw - cw - g, h: PH - ch - g },
      ].map((r) => ({ x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.w), h: Math.round(r.h) }));
    }
  }
}

// Deterministic pseudo-random, so the skyline looks the same every render.
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const imageCache = new Map();
export function loadImage(src) {
  if (imageCache.has(src)) return imageCache.get(src);
  const p = new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`cannot load ${src}`));
    img.src = src;
  });
  imageCache.set(src, p);
  return p;
}

// Draw one photo into its panel: cover-fit, then the panel's own pan, zoom,
// rotation and flip, then its light tweaks and grade wash.
function drawPanel(ctx, img, rect, panel) {
  const { x, y, w, h } = rect;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  const grade = gradeById(panel.grade);
  const sat = panel.grade === 'noir' ? panel.saturation * 0.12 : panel.saturation;
  ctx.filter = `brightness(${panel.brightness}) contrast(${panel.contrast}) saturate(${sat})`;
  const iw = img.naturalWidth, ih = img.naturalHeight;
  const base = Math.max(w / iw, h / ih);
  const dw = iw * base * panel.zoom;
  const dh = ih * base * panel.zoom;
  const cx = x + w / 2 + panel.panX * w;
  const cy = y + h / 2 + panel.panY * h;
  ctx.translate(cx, cy);
  if (panel.rotate) ctx.rotate((panel.rotate * Math.PI) / 180);
  if (panel.flip) ctx.scale(-1, 1);
  ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
  ctx.restore();
  // Grade wash, clipped to the panel.
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  const grad = ctx.createLinearGradient(x, y, x + w * 0.25, y + h);
  grad.addColorStop(0, grade.top);
  grad.addColorStop(1, grade.bottom);
  ctx.globalCompositeOperation = grade.blend;
  ctx.globalAlpha = grade.lift * 0.5;
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
  // Duotone: one hue laid over the panel's light.
  if (panel.duotone) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.globalCompositeOperation = 'color';
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = grade.top;
    ctx.fillRect(x, y, w, h);
    ctx.restore();
  }
  // Thin inner edge so panels read as separate poster tiles.
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.lineWidth = Math.max(1, Math.round(w * 0.002));
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  ctx.restore();
}

function drawTag(ctx, rect, tag, W) {
  if (!tag) return;
  const fs = Math.max(10, Math.round(W * 0.016));
  ctx.save();
  ctx.font = `600 ${fs}px Oswald, sans-serif`;
  const tw = ctx.measureText(tag).width;
  const padX = fs * 0.7, padY = fs * 0.45;
  const bw = tw + padX * 2, bh = fs + padY * 2;
  // Tags sit at the top of a panel: the bottom holds the caption scrim.
  const bx = rect.x + Math.round(W * 0.012);
  const by = rect.y + Math.round(W * 0.012);
  ctx.fillStyle = 'rgba(8,5,14,0.62)';
  ctx.fillRect(bx, by, bw, bh);
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'middle';
  ctx.fillText(tag, bx + padX, by + bh / 2 + 1);
  ctx.restore();
}

function starPath(ctx, cx, cy, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const ang = (Math.PI / 5) * i - Math.PI / 2;
    const rad = i % 2 === 0 ? r : r * 0.45;
    const px = cx + Math.cos(ang) * rad, py = cy + Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function drawStars(ctx, cx, cy, r, value) {
  for (let i = 0; i < 5; i++) {
    const sx = cx + i * r * 2.3;
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    starPath(ctx, sx, cy, r);
    ctx.fill();
    const fill = Math.max(0, Math.min(1, value - i));
    if (fill > 0) {
      ctx.beginPath();
      ctx.rect(sx - r, cy - r, r * 2 * fill, r * 2);
      ctx.clip();
      ctx.fillStyle = '#ffc93c';
      starPath(ctx, sx, cy, r);
      ctx.fill();
    }
    ctx.restore();
  }
}

// The skyline strip along the bottom: a sunset glow, dark towers with lit
// windows. Tall and bright enough to read at a glance.
function drawSkyline(ctx, W, H, seed = 20261119) {
  const stripH = Math.round(H * 0.06);
  const y0 = H - stripH;
  const glow = ctx.createLinearGradient(0, y0, 0, H);
  glow.addColorStop(0, 'rgba(255,110,60,0.38)');
  glow.addColorStop(1, 'rgba(20,8,24,0.9)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, y0, W, stripH);
  const rand = mulberry32(seed);
  let x = -10;
  ctx.fillStyle = '#0d0916';
  while (x < W + 10) {
    const bw = Math.round(W * (0.028 + rand() * 0.045));
    const bh = Math.round(stripH * (0.45 + rand() * 0.55));
    const by = y0 + stripH - bh;
    ctx.fillRect(x, by, bw, bh);
    // Antenna on some towers.
    if (rand() < 0.3) ctx.fillRect(x + bw / 2 - 1, by - Math.round(stripH * 0.22), 2, Math.round(stripH * 0.22));
    // Lit windows.
    const cols = Math.max(1, Math.floor(bw / Math.max(6, W * 0.008)));
    const rows = Math.max(1, Math.floor(bh / Math.max(7, stripH * 0.16)));
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        if (rand() < 0.42) {
          ctx.fillStyle = rand() < 0.8 ? '#ffd76a' : '#9be8ff';
          ctx.fillRect(x + 3 + c * Math.max(6, W * 0.008), by + 4 + r * Math.max(7, stripH * 0.16), 3, 4);
          ctx.fillStyle = '#0d0916';
        }
      }
    }
    x += bw + Math.round(W * 0.004);
  }
  ctx.fillStyle = 'rgba(255,255,255,0.10)';
  ctx.fillRect(0, y0, W, 1);
}

// Dot and grain patterns, rendered once and tiled.
let dotPattern = null;
let grainPattern = null;
function getDotPattern(ctx) {
  if (dotPattern) return dotPattern;
  const c = document.createElement('canvas');
  c.width = 9; c.height = 9;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(0,0,0,0.55)';
  g.beginPath(); g.arc(4.5, 4.5, 1.7, 0, Math.PI * 2); g.fill();
  dotPattern = ctx.createPattern(c, 'repeat');
  return dotPattern;
}
function getGrainPattern(ctx) {
  if (grainPattern) return grainPattern;
  const c = document.createElement('canvas');
  c.width = 140; c.height = 140;
  const g = c.getContext('2d');
  const data = g.createImageData(140, 140);
  for (let i = 0; i < data.data.length; i += 4) {
    const v = 110 + Math.floor(Math.random() * 40);
    data.data[i] = v; data.data[i + 1] = v; data.data[i + 2] = v; data.data[i + 3] = 28;
  }
  g.putImageData(data, 0, 0);
  grainPattern = ctx.createPattern(c, 'repeat');
  return grainPattern;
}

// The whole cover: panels, caption block, dressing, effects.
export function renderCover(ctx, state, W, H, images) {
  ctx.save();
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#0d0b12';
  ctx.fillRect(0, 0, W, H);
  const rects = layoutRects(state.layout, W, H);
  // The dressing's location label and star badge live in the top-right
  // corner, so the top-right panel's tag stays hidden while dressing is on.
  const topRight = rects.reduce((best, r, i) => (
    best < 0 || r.x > rects[best].x || (r.x === rects[best].x && r.y < rects[best].y) ? i : best
  ), -1);
  state.panels.forEach((panel, i) => {
    const img = images.get(panel.photo);
    if (!img) return;
    drawPanel(ctx, img, rects[i], { ...panel, duotone: state.effects.duotone });
    if (i > 0 && !(state.dressing.show && i === topRight)) drawTag(ctx, rects[i], panel.tag, W);
  });

  // Caption scrim: dark at the edge the caption sits on, fading out.
  // The caption can sit at the bottom (default) or the top of the panels.
  const capTop = state.captionPosition === 'top';
  const panelBottom = Math.round(H * 0.94);
  const scrimH = Math.round(H * 0.24);
  const scrim = capTop
    ? ctx.createLinearGradient(0, 0, 0, scrimH)
    : ctx.createLinearGradient(0, panelBottom - scrimH, 0, panelBottom);
  if (capTop) {
    scrim.addColorStop(0, 'rgba(5,3,10,0.86)');
    scrim.addColorStop(1, 'rgba(5,3,10,0)');
    ctx.fillStyle = scrim;
    ctx.fillRect(0, 0, W, scrimH);
  } else {
    scrim.addColorStop(0, 'rgba(5,3,10,0)');
    scrim.addColorStop(1, 'rgba(5,3,10,0.86)');
    ctx.fillStyle = scrim;
    ctx.fillRect(0, panelBottom - scrimH, W, scrimH);
  }

  const d = state.dressing;
  const padX = Math.round(W * 0.045);
  if (d.show) {
    // Location label, top right.
    ctx.save();
    ctx.font = `600 ${Math.max(11, Math.round(W * 0.02))}px Oswald, sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'alphabetic';
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = Math.round(W * 0.006);
    ctx.fillText(d.location, W - padX, Math.round(H * 0.038));
    ctx.fillStyle = '#ffc93c';
    ctx.fillRect(W - padX - Math.round(W * 0.09), Math.round(H * 0.048), Math.round(W * 0.09), Math.max(2, Math.round(H * 0.004)));
    ctx.restore();
    // Star rating badge under the location.
    ctx.save();
    const r = Math.max(7, Math.round(W * 0.011));
    const starsW = r * 2.3 * 5;
    const by = Math.round(H * 0.075);
    ctx.font = `${Math.max(13, Math.round(W * 0.024))}px "Bebas Neue", sans-serif`;
    // Right-align the whole badge group so "HEAT 4.5" never runs off the edge.
    const label = `HEAT ${d.rating}`;
    const labelW = ctx.measureText(label).width;
    const gap = Math.round(W * 0.012);
    const bx = W - padX - starsW - gap - labelW;
    drawStars(ctx, bx + r, by, r, parseFloat(d.rating) || 0);
    ctx.fillStyle = '#ffc93c';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, bx + starsW + gap, by + 1);
    ctx.restore();
    // Diagonal ribbon across the top-left corner.
    ctx.save();
    ctx.translate(Math.round(W * 0.11), Math.round(W * 0.11));
    ctx.rotate(-Math.PI / 4);
    ctx.fillStyle = '#f5c542';
    ctx.fillRect(-Math.round(W * 0.17), -Math.round(H * 0.018), Math.round(W * 0.34), Math.round(H * 0.036));
    ctx.fillStyle = '#1a1210';
    ctx.font = `600 ${Math.max(11, Math.round(W * 0.019))}px Oswald, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(d.ribbon, 0, 1);
    ctx.restore();
  }

  // Caption block: script line, title, subtitle.
  const fontCss = { bebas: '"Bebas Neue", sans-serif', anton: '"Anton", sans-serif', oswald: '"Oswald", sans-serif' }[state.captionFont] || '"Bebas Neue", sans-serif';
  const titleSize = Math.round(W * 0.115 * state.captionSize);
  const subSize = Math.max(12, Math.round(W * 0.028));
  const scriptSize = Math.max(16, Math.round(W * 0.052));
  // Caption block: bottom (default) or top. At the top the text starts
  // clear of the ribbon's diagonal band in the top-left corner.
  const capX = capTop ? Math.round(W * 0.21) : padX;
  const titleY = capTop
    ? Math.round(H * 0.05) + scriptSize + Math.round(H * 0.02) + titleSize
    : panelBottom - Math.round(H * 0.018) - subSize - Math.round(H * 0.012);
  const scriptY = capTop ? Math.round(H * 0.05) : titleY - titleSize - Math.round(H * 0.012);
  const subY = capTop ? titleY + subSize + Math.round(H * 0.015) : panelBottom - Math.round(H * 0.018);
  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  if (d.show && d.script) {
    ctx.font = `${scriptSize}px "Great Vibes", cursive`;
    ctx.fillStyle = '#ffd76a';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = Math.round(W * 0.008);
    ctx.fillText(d.script, capX, scriptY);
  }
  ctx.font = `${titleSize}px ${fontCss}`;
  try { ctx.letterSpacing = `${Math.round(titleSize * state.captionSpacing)}px`; } catch { /* older canvas */ }
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = Math.round(titleSize * 0.08);
  ctx.shadowOffsetY = Math.round(titleSize * 0.03);
  if (state.captionOutline) {
    ctx.lineWidth = Math.max(2, Math.round(titleSize * 0.06));
    ctx.strokeStyle = 'rgba(10,5,15,0.85)';
    ctx.lineJoin = 'round';
    ctx.strokeText(state.title, capX, titleY);
  }
  ctx.fillStyle = state.captionColor;
  ctx.fillText(state.title, capX, titleY);
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  try { ctx.letterSpacing = '0px'; } catch { /* older canvas */ }
  ctx.font = `500 ${subSize}px Oswald, sans-serif`;
  try { ctx.letterSpacing = `${Math.round(subSize * 0.28)}px`; } catch { /* older canvas */ }
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.fillText(state.subtitle.toUpperCase(), capX, subY);
  try { ctx.letterSpacing = '0px'; } catch { /* older canvas */ }
  ctx.restore();

  // Round sticker, bottom right above the skyline.
  if (d.show && d.sticker) {
    ctx.save();
    const sr = Math.max(22, Math.round(W * 0.042));
    const sx = W - padX - sr;
    const sy = panelBottom - sr - Math.round(H * 0.02);
    ctx.translate(sx, sy);
    ctx.rotate(-0.14);
    ctx.beginPath();
    ctx.arc(0, 0, sr, 0, Math.PI * 2);
    ctx.fillStyle = '#ffc93c';
    ctx.fill();
    ctx.lineWidth = Math.max(2, Math.round(sr * 0.08));
    ctx.strokeStyle = '#1a1210';
    ctx.stroke();
    ctx.fillStyle = '#1a1210';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `600 ${Math.round(sr * 0.34)}px Oswald, sans-serif`;
    const parts = d.sticker.split(' ');
    ctx.fillText(parts[0] || '', 0, -sr * 0.22);
    ctx.fillText(parts.slice(1).join(' ') || '', 0, sr * 0.28);
    ctx.restore();
  }

  // Skyline strip along the very bottom.
  if (!d.show || d.skyline) drawSkyline(ctx, W, H);

  // Finishing effects, over the whole cover.
  if (state.effects.halftone) {
    ctx.save();
    ctx.globalAlpha = 0.16;
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = getDotPattern(ctx);
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  if (state.effects.grain) {
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = getGrainPattern(ctx);
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  if (state.effects.vignette) {
    const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.72);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.34)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.14)';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, W - 2, H - 2);
  ctx.restore();
}

// Render the state into a fresh canvas of exactly w x h pixels.
export function renderToCanvas(state, images, w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  renderCover(canvas.getContext('2d'), state, w, h, images);
  return canvas;
}

// Export the cover as a PNG blob at exactly w x h pixels.
export function exportPNG(state, images, w, h) {
  return new Promise((resolve, reject) => {
    const canvas = renderToCanvas(state, images, w, h);
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('PNG export failed'));
    }, 'image/png');
  });
}

// Verify an export in-page (used by the headless checks): renders the PNG
// and reads its real pixel size back from the bytes.
export async function verifyExport(state, images, w, h) {
  const blob = await exportPNG(state, images, w, h);
  const buf = new Uint8Array(await blob.arrayBuffer());
  const png = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  const view = new DataView(buf.buffer);
  const iw = view.getUint32(16);
  const ih = view.getUint32(20);
  return { requested: [w, h], actual: [iw, ih], bytes: blob.size, png, exact: png && iw === w && ih === h };
}
