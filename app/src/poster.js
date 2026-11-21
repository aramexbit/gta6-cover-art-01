// Vice Poster Studio — poster.js: draws the whole cover onto a canvas.
// One function draws everything (panels, grades, effects, dressing, caption)
// so the preview and the exported PNG are the same picture, at any size.

import { layoutRects, gradeById, sampleById, sizeById } from './state.js';

const imgCache = new Map();

export function loadImage(src) {
  if (!imgCache.has(src)) {
    imgCache.set(src, new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('cannot load ' + src));
      img.src = src;
    }));
  }
  return imgCache.get(src);
}

export async function ensureFonts() {
  if (!document.fonts) return;
  const loads = [
    '100px "Bebas Neue"', '100px "Anton"',
    '600 100px "Oswald"', '400 100px "Oswald"',
    '100px "Great Vibes"',
  ];
  await Promise.all(loads.map((f) => document.fonts.load(f).catch(() => null)));
  await document.fonts.ready.catch(() => null);
}

function starPath(ctx, cx, cy, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const ang = (Math.PI / 5) * i - Math.PI / 2;
    const rad = i % 2 === 0 ? r : r * 0.45;
    const x = cx + Math.cos(ang) * rad, y = cy + Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function drawStars(ctx, x, y, size, rating) {
  const gap = size * 1.25;
  for (let i = 0; i < 5; i++) {
    const cx = x + i * gap;
    const fill = Math.max(0, Math.min(1, rating - i));
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    starPath(ctx, cx, y, size * 0.5);
    ctx.fill();
    if (fill > 0) {
      ctx.beginPath();
      ctx.rect(cx - size * 0.5, y - size * 0.5, size * fill, size);
      ctx.clip();
      ctx.fillStyle = '#ffc93c';
      starPath(ctx, cx, y, size * 0.5);
      ctx.fill();
    }
    ctx.restore();
  }
}

// Deterministic pseudo-random from an integer seed (skyline must look the
// same in the preview and in every export).
function seeded(n) {
  let s = (n * 2654435761) % 4294967296;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function drawSkyline(ctx, W, H) {
  const stripH = Math.round(H * 0.075);
  const y0 = H - stripH;
  ctx.fillStyle = '#14081f';
  ctx.fillRect(0, y0, W, stripH);
  const rnd = seeded(20261121);
  let x = 0;
  while (x < W) {
    const bw = W * (0.03 + rnd() * 0.05);
    const bh = stripH * (0.35 + rnd() * 0.65);
    const bx = x, by = y0 + stripH - bh;
    ctx.fillStyle = rnd() > 0.5 ? '#1d0b2e' : '#160a24';
    ctx.fillRect(bx, by, bw - 2, bh);
    // Aerial on some towers.
    if (rnd() > 0.7) {
      ctx.fillStyle = '#1d0b2e';
      ctx.fillRect(bx + bw / 2 - 1, by - stripH * 0.12, 2, stripH * 0.12);
    }
    // Lit windows.
    const cols = Math.max(1, Math.floor(bw / (W * 0.012)));
    const rows = Math.max(1, Math.floor(bh / (stripH * 0.22)));
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        if (rnd() > 0.55) {
          ctx.fillStyle = rnd() > 0.75 ? '#ffd166' : '#9be7ff';
          ctx.fillRect(bx + 3 + c * (bw / cols), by + 4 + r * (stripH * 0.2), Math.max(2, W * 0.005), Math.max(2, stripH * 0.1));
        }
      }
    }
    x += bw;
  }
  // Warm sunset glow just above the skyline.
  const glow = ctx.createLinearGradient(0, y0 - H * 0.05, 0, y0);
  glow.addColorStop(0, 'rgba(255,120,60,0)');
  glow.addColorStop(1, 'rgba(255,120,60,0.22)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, y0 - H * 0.05, W, H * 0.05);
}

let noisePattern = null;
function grainPattern(ctx) {
  if (noisePattern) return noisePattern;
  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const g = c.getContext('2d');
  const img = g.createImageData(128, 128);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 110 + Math.floor(Math.random() * 90);
    img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  noisePattern = ctx.createPattern(c, 'repeat');
  return noisePattern;
}

async function drawPanel(ctx, img, rect, panel, W, H) {
  const grade = gradeById(panel.grade);
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  // Cover-fit with pan / zoom / rotate / flip. The focus point (cx, cy) of
  // the photo sits on the panel centre: at cx=cy=0.5 the photo is centred.
  const scale = Math.max(rect.w / img.width, rect.h / img.height) * panel.zoom;
  const dw = img.width * scale, dh = img.height * scale;
  ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
  ctx.rotate((panel.rotate * Math.PI) / 180);
  ctx.scale(panel.flip ? -1 : 1, 1);
  ctx.filter = `brightness(${panel.brightness}) contrast(${panel.contrast}) saturate(${panel.saturation}) ${grade.filter}`;
  ctx.drawImage(img, -dw * panel.cx, -dh * panel.cy, dw, dh);
  ctx.filter = 'none';
  ctx.restore();
  // Grade tint over the panel.
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.fillStyle = grade.tint;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
}

function drawTag(ctx, rect, text, H) {
  const fs = Math.max(11, Math.round(H * 0.016));
  ctx.font = `600 ${fs}px "Oswald", sans-serif`;
  const tw = ctx.measureText(text).width;
  const pad = fs * 0.7;
  const bx = rect.x + 8, by = rect.y + 8;
  ctx.fillStyle = 'rgba(10,6,20,0.72)';
  ctx.fillRect(bx, by, tw + pad * 2, fs + pad);
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, bx + pad, by + (fs + pad) / 2 + 1);
}

function drawRibbon(ctx, W, H, text) {
  const band = Math.round(H * 0.052);
  ctx.save();
  ctx.translate(W * 0.02, H * 0.16);
  ctx.rotate(-0.62);
  ctx.fillStyle = '#f5b90d';
  ctx.fillRect(-W * 0.25, -band / 2, W * 0.62, band);
  ctx.fillStyle = '#1a0b00';
  ctx.font = `600 ${Math.round(band * 0.52)}px "Oswald", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, W * 0.06, 1);
  ctx.restore();
  ctx.textAlign = 'left';
}

function drawCaption(ctx, state, W, H, hero) {
  const d = state.dressing;
  const fonts = { bebas: '"Bebas Neue"', anton: '"Anton"', oswald: '"Oswald"' };
  const fam = fonts[state.captionFont] || '"Bebas Neue"';
  const top = state.captionPosition === 'top';
  const base = Math.round(H * 0.115 * state.captionSize);
  // Shrink the title until it fits the hero's width (a long title must not
  // spill over the small panels).
  let titleSize = base;
  ctx.font = `${titleSize}px ${fam}, sans-serif`;
  const maxTitleW = hero.w - Math.round(W * 0.05);
  while (titleSize > Math.round(H * 0.05) && ctx.measureText(state.title).width > maxTitleW) {
    titleSize = Math.round(titleSize * 0.94);
    ctx.font = `${titleSize}px ${fam}, sans-serif`;
  }
  const tx = hero.x + Math.round(W * 0.028);
  const titleY = top ? hero.y + Math.round(H * 0.10) : H - Math.round(H * 0.155);
  if (top) {
    const scrim = ctx.createLinearGradient(0, hero.y, 0, hero.y + H * 0.2);
    scrim.addColorStop(0, 'rgba(8,4,18,0.72)');
    scrim.addColorStop(1, 'rgba(8,4,18,0)');
    ctx.fillStyle = scrim;
    ctx.fillRect(hero.x, hero.y, hero.w, H * 0.2);
  }
  ctx.save();
  ctx.textBaseline = 'alphabetic';
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = Math.round(H * 0.012);
  ctx.shadowOffsetY = Math.round(H * 0.006);
  ctx.font = `${titleSize}px ${fam}, sans-serif`;
  ctx.lineWidth = Math.max(2, Math.round(H * 0.006));
  ctx.strokeStyle = 'rgba(20,6,30,0.85)';
  ctx.strokeText(state.title, tx, titleY);
  ctx.fillStyle = state.captionColor;
  ctx.fillText(state.title, tx, titleY);
  ctx.restore();
  // Script line in Great Vibes, gold, just above the title.
  ctx.save();
  ctx.font = `${Math.round(H * 0.042)}px "Great Vibes", cursive`;
  ctx.fillStyle = '#ffd166';
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = Math.round(H * 0.008);
  ctx.fillText(d.script, tx + 2, titleY - Math.round(H * 0.075));
  ctx.restore();
  // Subtitle under the title.
  ctx.save();
  ctx.font = `600 ${Math.round(H * 0.026)}px "Oswald", sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  const sub = state.subtitle.toUpperCase();
  const spacing = Math.round(H * 0.004);
  let sx = tx;
  for (const ch of sub) {
    ctx.fillText(ch, sx, titleY + Math.round(H * 0.045));
    sx += ctx.measureText(ch).width + spacing;
  }
  ctx.restore();
}

function drawDressing(ctx, state, W, H, hero) {
  const d = state.dressing;
  // Location pill, top-right.
  const fs = Math.max(12, Math.round(H * 0.02));
  ctx.font = `600 ${fs}px "Oswald", sans-serif`;
  const tw = ctx.measureText(d.location).width;
  const pad = fs * 0.8;
  const bx = W - tw - pad * 2 - Math.round(W * 0.018);
  const by = Math.round(H * 0.018);
  ctx.fillStyle = 'rgba(10,6,20,0.72)';
  ctx.fillRect(bx, by, tw + pad * 2, fs + pad);
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'middle';
  ctx.fillText(d.location, bx + pad, by + (fs + pad) / 2 + 1);
  // Star badge + HEAT under the location pill.
  const starSize = Math.round(H * 0.026);
  const starsW = starSize * 1.25 * 5;
  const sx = W - starsW - Math.round(W * 0.018);
  const sy = by + fs + pad + Math.round(H * 0.022);
  drawStars(ctx, sx + starSize * 0.5, sy + starSize * 0.5, starSize, d.rating);
  ctx.font = `600 ${Math.round(H * 0.02)}px "Oswald", sans-serif`;
  ctx.fillStyle = '#ffc93c';
  ctx.textBaseline = 'middle';
  ctx.fillText(`HEAT ${d.rating.toFixed(1)}`, sx, sy + starSize + Math.round(H * 0.022));
  // Diagonal ribbon across the hero's top-left corner.
  drawRibbon(ctx, W, H, d.ribbon);
  // EST. sticker, bottom-right circle.
  const cr = Math.round(H * 0.048);
  const cxp = W - cr - Math.round(W * 0.02);
  const cyp = H - cr - Math.round(H * 0.085);
  ctx.save();
  ctx.translate(cxp, cyp);
  ctx.rotate(-0.12);
  ctx.beginPath();
  ctx.arc(0, 0, cr, 0, Math.PI * 2);
  ctx.fillStyle = '#f5b90d';
  ctx.fill();
  ctx.lineWidth = Math.max(2, Math.round(H * 0.004));
  ctx.strokeStyle = 'rgba(20,6,30,0.6)';
  ctx.stroke();
  ctx.fillStyle = '#1a0b00';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `600 ${Math.round(cr * 0.34)}px "Oswald", sans-serif`;
  ctx.fillText('EST.', 0, -cr * 0.22);
  ctx.fillText('2026', 0, cr * 0.28);
  ctx.restore();
  ctx.textAlign = 'left';
}

// Draw the full cover at W x H. Returns the canvas.
export async function renderCover(state, W, H) {
  await ensureFonts();
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#0d0618';
  ctx.fillRect(0, 0, W, H);
  const rects = layoutRects(state.layout, W, H);
  const jobs = state.panels.map(async (p, i) => {
    const sample = sampleById(p.photo);
    if (!sample) return null;
    try {
      const src = sample.file.startsWith('data:') ? sample.file : 'samples/' + sample.file;
      const img = await loadImage(src);
      return { img, rect: rects[i], panel: p };
    } catch {
      return null;
    }
  });
  const drawn = (await Promise.all(jobs)).filter(Boolean);
  for (const { img, rect, panel } of drawn) {
    await drawPanel(ctx, img, rect, panel, W, H);
  }
  // Panel tags.
  drawn.forEach(({ rect, panel }, i) => {
    const sample = sampleById(panel.photo);
    if (!sample) return;
    const isRightTop = rect.x > W * 0.5 && rect.y < H * 0.3;
    if (state.dressing.show && isRightTop) return; // keep clear of the badge
    drawTag(ctx, rect, sample.label, H);
  });
  if (state.dressing.show && state.dressing.skyline) drawSkyline(ctx, W, H);
  const hero = rects[0];
  if (state.dressing.show) drawDressing(ctx, state, W, H, hero);
  drawCaption(ctx, state, W, H, hero);
  // Whole-cover effects last.
  if (state.effects.grain) {
    ctx.save();
    ctx.globalAlpha = 0.07;
    ctx.fillStyle = grainPattern(ctx);
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  if (state.effects.vignette) {
    const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.34)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
  }
  return canvas;
}

export async function exportPNG(state, sizeId) {
  const size = sizeById(sizeId);
  const canvas = await renderCover(state, size.w, size.h);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  return { blob, w: size.w, h: size.h, bytes: blob ? blob.size : 0 };
}

// In-page check the screenshot runner calls: renders every export size and
// reports the exact dimensions, so a wrong size fails loudly instead of
// shipping a wrong PNG.
export async function verifyExport(state) {
  const out = [];
  for (const s of ['1080x1080', '1080x1350', '1920x1080']) {
    const size = sizeById(s);
    const canvas = await renderCover(state, size.w, size.h);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    out.push({ size: s, w: canvas.width, h: canvas.height, bytes: blob ? blob.size : 0, ok: canvas.width === size.w && canvas.height === size.h });
  }
  return out;
}
