// Vice Poster Studio — poster render engine.
// Draws the multi-panel poster onto any 2D canvas context at any size: the live
// preview and the exact-size PNG exports share this one function, so what you
// see is exactly what you export.

export const GRADES = {
  sunset: { name: 'Sunset', top: 'rgba(255,46,136,0.20)', mid: 'rgba(255,120,60,0.16)', bottom: 'rgba(255,80,40,0.28)', tint: '#ff7a3d' },
  neon: { name: 'Neon Nights', top: 'rgba(255,0,229,0.24)', mid: 'rgba(123,47,255,0.14)', bottom: 'rgba(0,229,255,0.22)', tint: '#c44dff' },
  teal: { name: 'Vice Teal', top: 'rgba(0,60,70,0.26)', mid: 'rgba(45,226,197,0.10)', bottom: 'rgba(255,224,138,0.14)', tint: '#2de2c5' },
  noir: { name: 'Noir', top: 'rgba(0,0,0,0.30)', mid: 'rgba(20,20,30,0.18)', bottom: 'rgba(0,0,0,0.42)', tint: '#9aa0b0' },
  gold: { name: 'Palm Gold', top: 'rgba(255,180,40,0.18)', mid: 'rgba(255,201,61,0.14)', bottom: 'rgba(122,74,0,0.26)', tint: '#ffc93d' },
};

export const LAYOUTS = {
  hero2: { name: 'Hero + 2', panels: 3 },
  hero3: { name: 'Hero + 3 strip', panels: 4 },
  grid: { name: 'Grid 2 x 2', panels: 4 },
  full: { name: 'Full bleed + strip', panels: 3 },
};

/** Panel rectangles for a layout, as fractions of the poster (x, y, w, h). */
export function layoutRects(layout, W, H) {
  const g = Math.round(Math.min(W, H) * 0.014); // gutter
  const f = (x, y, w, h) => ({ x: x * W, y: y * H, w: w * W, h: h * H });
  switch (layout) {
    case 'hero3': {
      const stripH = 0.3;
      const sw = (1 - 4 * (g / W)) / 3;
      return [
        f(0, 0, 1, 1 - stripH - g / H),
        f(0, 1 - stripH, sw, stripH),
        f(sw + g / W, 1 - stripH, sw, stripH),
        f(2 * (sw + g / W), 1 - stripH, sw, stripH),
      ];
    }
    case 'grid': {
      const cw = (1 - 3 * (g / W)) / 2;
      const ch = (1 - 3 * (g / H)) / 2;
      return [
        f(0, 0, cw, ch), f(cw + g / W, 0, cw, ch),
        f(0, ch + g / H, cw, ch), f(cw + g / W, ch + g / H, cw, ch),
      ];
    }
    case 'full': {
      const stripH = 0.24;
      const sw = (1 - 3 * (g / W)) / 2;
      return [
        f(0, 0, 1, 1),
        f(g / W, 1 - stripH - g / H, sw, stripH),
        f(sw + 2 * (g / W), 1 - stripH - g / H, sw, stripH),
      ];
    }
    case 'hero2':
    default: {
      const sideW = 0.36;
      const sh = (1 - 3 * (g / H)) / 2;
      return [
        f(0, 0, 1 - sideW - g / W, 1),
        f(1 - sideW, 0, sideW, sh),
        f(1 - sideW, sh + g / H, sideW, sh),
      ];
    }
  }
}

/** A tiny deterministic pseudo-random stream, so grain looks the same every render. */
function seeded(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Draws one photo into a panel rect with pan / zoom / rotate / flip and filters. */
export function drawPanel(ctx, img, panel, rect) {
  const { x, y, w, h } = rect;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  if (!img) {
    const grad = ctx.createLinearGradient(x, y, x + w, y + h);
    grad.addColorStop(0, '#3d1a5e');
    grad.addColorStop(1, '#160b24');
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, h);
    ctx.restore();
    return;
  }
  const p = panel;
  const base = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const scale = base * (p.zoom || 1);
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const cx = x + w / 2 + (p.panX || 0) * w;
  const cy = y + h / 2 + (p.panY || 0) * h;
  ctx.translate(cx, cy);
  ctx.rotate(((p.rot || 0) * Math.PI) / 180);
  ctx.scale(p.flip ? -1 : 1, 1);
  ctx.filter = `brightness(${p.bright ?? 1}) contrast(${p.contrast ?? 1.05}) saturate(${p.sat ?? 1.15})${p.duotone ? ' grayscale(1)' : ''}`;
  ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
  ctx.filter = 'none';
  ctx.restore();

  // Duotone tint over the panel.
  if (p.duotone) {
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = p.duotoneColor || '#ff2e88';
    ctx.globalAlpha = 0.45;
    ctx.fillRect(x, y, w, h);
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = '#2de2c5';
    ctx.globalAlpha = 0.22;
    ctx.fillRect(x, y, w, h);
    ctx.restore();
  }
}

/** Warm / neon grade wash over a panel rect. */
function gradeWash(ctx, rect, grade) {
  const { x, y, w, h } = rect;
  const grad = ctx.createLinearGradient(x, y, x, y + h);
  grad.addColorStop(0, grade.top);
  grad.addColorStop(0.55, grade.mid);
  grad.addColorStop(1, grade.bottom);
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

/** Halftone dot screen + film grain + vignette over the whole poster. */
function posterEffects(ctx, W, H, fx) {
  if (fx.halftone) {
    const step = Math.max(7, Math.round(W / 150));
    ctx.save();
    ctx.fillStyle = 'rgba(10,4,20,0.10)';
    for (let yy = step / 2; yy < H; yy += step) {
      for (let xx = step / 2; xx < W; xx += step) {
        const r = step * 0.16 * (0.6 + 0.4 * ((xx + yy) % 3) / 2);
        ctx.beginPath(); ctx.arc(xx, yy, r, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();
  }
  if (fx.grain) {
    const rnd = seeded(20261119);
    ctx.save();
    const n = Math.round((W * H) / 900);
    for (let i = 0; i < n; i++) {
      const a = rnd() * 0.10;
      ctx.fillStyle = rnd() > 0.5 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a})`;
      ctx.fillRect(rnd() * W, rnd() * H, 1.6, 1.6);
    }
    ctx.restore();
  }
  if (fx.vignette) {
    const grad = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.75);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(5,0,12,0.42)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }
}

/** Bold condensed title + subtitle, with outline, shadow and letter spacing. */
export function drawCaption(ctx, state, W, H) {
  const title = (state.title || '').trim().toUpperCase();
  const sub = (state.subtitle || '').trim();
  if (!title && !sub) return;
  const font = state.font || 'Bebas Neue';
  const base = Math.min(W, H);
  const size = (state.titleSize || 118) * (base / 1080);
  const pos = state.captionPos || 'bottom';
  const pad = base * 0.045;
  let ty;
  if (pos === 'top') ty = pad + size;
  else if (pos === 'overlay') ty = H * 0.52;
  else ty = H - pad - (sub ? size * 0.42 : 0);

  // A soft band behind the caption so lettering reads on any photo.
  if (pos !== 'overlay') {
    const bandH = size * 1.05 + (sub ? size * 0.42 : 0) + pad * 0.7;
    const by = pos === 'top' ? 0 : H - bandH;
    const band = ctx.createLinearGradient(0, by, 0, by + bandH);
    const dark = pos === 'top' ? ['rgba(10,2,20,0.72)', 'rgba(10,2,20,0)'] : ['rgba(10,2,20,0)', 'rgba(10,2,20,0.78)'];
    band.addColorStop(0, dark[0]);
    band.addColorStop(1, dark[1]);
    ctx.fillStyle = band;
    ctx.fillRect(0, by, W, bandH);
  }

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${(state.spacing || 4) * (base / 1080)}px`;
  ctx.font = `400 ${size}px "${font}", "Bebas Neue", sans-serif`;
  // Shrink the title until it fits the poster width.
  let fit = size;
  while (ctx.measureText(title).width > W * 0.92 && fit > 20) {
    fit -= 4;
    ctx.font = `400 ${fit}px "${font}", "Bebas Neue", sans-serif`;
  }
  const outline = (state.outline || 6) * (base / 1080);
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = size * 0.16;
  ctx.shadowOffsetY = size * 0.04;
  if (outline > 0) {
    ctx.lineWidth = outline;
    ctx.strokeStyle = '#14061f';
    ctx.lineJoin = 'round';
    ctx.strokeText(title, W / 2, ty);
  }
  ctx.fillStyle = state.titleColor || '#ffffff';
  ctx.fillText(title, W / 2, ty);
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  if (sub) {
    const subSize = Math.max(16, size * 0.24);
    ctx.font = `600 ${subSize}px "Oswald", sans-serif`;
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${(subSize * 0.22).toFixed(1)}px`;
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    const sy = pos === 'top' ? ty + subSize * 1.5 : ty + subSize * 1.4;
    ctx.fillText(sub.toUpperCase(), W / 2, sy);
  }
  ctx.restore();
}

/** The small label printed on a side panel, if the panel has a note. */
function panelNote(ctx, text, rect) {
  if (!text) return;
  const { x, y, w, h } = rect;
  const size = Math.max(13, Math.min(w, h) * 0.11);
  ctx.save();
  ctx.font = `400 ${size}px "Bebas Neue", sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  const tw = ctx.measureText(text.toUpperCase()).width;
  // Top-left, so the note never collides with the bottom caption band.
  ctx.fillStyle = 'rgba(10,2,20,0.72)';
  ctx.fillRect(x, y, tw + size * 1.1, size * 1.9);
  ctx.fillStyle = '#ffe08a';
  ctx.fillText(text.toUpperCase(), x + size * 0.55, y + size * 1.35);
  ctx.restore();
}

/**
 * Draws the whole poster.
 * state: { layout, grade, fx, title, subtitle, font, titleSize, titleColor,
 *   outline, spacing, captionPos, panels: [{ photo, zoom, panX, panY, rot, flip,
 *   bright, contrast, sat, duotone, duotoneColor, note }] }
 * images: Map from photo id to a loaded HTMLImageElement.
 */
export function drawPoster(ctx, state, images, W, H) {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#160b24';
  ctx.fillRect(0, 0, W, H);
  const grade = GRADES[state.grade] || GRADES.sunset;
  const rects = layoutRects(state.layout, W, H);
  const fx = state.fx || {};
  rects.forEach((rect, i) => {
    const panel = state.panels[i];
    if (!panel) return;
    const img = panel.photo ? images.get(panel.photo) || null : null;
    drawPanel(ctx, img, { ...panel, duotone: fx.duotone || panel.duotone, duotoneColor: grade.tint }, rect);
    gradeWash(ctx, rect, grade);
    // Thin frame around every panel: the multi-panel poster look.
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = Math.max(2, W * 0.004);
    ctx.strokeRect(rect.x + ctx.lineWidth / 2, rect.y + ctx.lineWidth / 2, rect.w - ctx.lineWidth, rect.h - ctx.lineWidth);
    ctx.restore();
    panelNote(ctx, panel.note, rect);
  });
  posterEffects(ctx, W, H, fx);
  drawCaption(ctx, state, W, H);
}

/** Renders the poster at an exact export size and returns the canvas. */
export function renderExport(state, images, w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  drawPoster(canvas.getContext('2d'), state, images, w, h);
  return canvas;
}
