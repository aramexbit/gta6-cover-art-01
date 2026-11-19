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
  grid5: { name: 'Neon Grid 5', panels: 5 },
};

/** Default cover dressing (rating, script, ribbon, sticker, location, skyline). */
export const DRESSING_DEFAULT = {
  on: true,
  rating: 'HEAT 4.5',
  script: 'neon harbor nights',
  ribbon: 'SAME TROUBLE',
  sticker: 'EST. 2026',
  location: 'SOLMAR BAY',
  skyline: true,
};

/** Panel rectangles for a layout, as fractions of the poster (x, y, w, h). */
export function layoutRects(layout, W, H) {
  const g = Math.round(Math.min(W, H) * 0.014); // gutter
  const f = (x, y, w, h) => ({ x: x * W, y: y * H, w: w * W, h: h * H });
  switch (layout) {
    case 'grid5': {
      // Big hero on the left (~60% wide, full height) + 4 small panels right, 2x2.
      const heroW = 0.60;
      const rx = heroW + g / W;
      const rw = 1 - heroW - g / W;
      const cw = (rw - g / W) / 2;
      const ch = (1 - g / H) / 2;
      return [
        f(0, 0, heroW, 1),
        f(rx, 0, cw, ch),
        f(rx + cw + g / W, 0, cw, ch),
        f(rx, ch + g / H, cw, ch),
        f(rx + cw + g / W, ch + g / H, cw, ch),
      ];
    }
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

/** Shared caption geometry: title size, baseline, subtitle size and padding. */
export function captionMetrics(state, W, H) {
  const base = Math.min(W, H);
  const size = (state.titleSize || 118) * (base / 1080);
  const pos = state.captionPos || 'bottom';
  const pad = base * 0.045;
  const sub = (state.subtitle || '').trim();
  let ty;
  if (pos === 'top') ty = pad + size;
  else if (pos === 'overlay') ty = H * 0.52;
  else {
    // The taller skyline strip would collide with the subtitle baseline, so
    // lift a bottom caption by the extra skyline height (vs the old 34px).
    const skylineOn = state.dressing?.skyline !== false && state.dressing?.on !== false;
    const skyLift = skylineOn ? Math.max(0, Math.round(H * 0.062) - 34) : 0;
    ty = H - pad - (sub ? size * 0.42 : 0) - skyLift;
  }
  return { base, size, pos, pad, ty, subSize: Math.max(16, size * 0.24), sub };
}

/** Bold condensed title + subtitle, with outline, shadow and letter spacing. */
export function drawCaption(ctx, state, W, H) {
  const title = (state.title || '').trim().toUpperCase();
  const sub = (state.subtitle || '').trim();
  if (!title && !sub) return;
  const font = state.font || 'Bebas Neue';
  const { base, size, pos, pad, ty } = captionMetrics(state, W, H);

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

/** The small label printed on a side panel, if the panel has a note.
 *  `bottom` pins it to the panel's bottom-left instead of its top-left —
 *  used for the top-right corner panel, whose top-left sits under the
 *  diagonal dressing ribbon. */
function panelNote(ctx, text, rect, bottom) {
  if (!text) return;
  const { x, y, w, h } = rect;
  const size = Math.max(13, Math.min(w, h) * 0.11);
  ctx.save();
  ctx.font = `400 ${size}px "Bebas Neue", sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  const tw = ctx.measureText(text.toUpperCase()).width;
  // Top-left, so the note never collides with the bottom caption band —
  // unless it is the corner panel under the ribbon (see above).
  const ny = bottom ? y + h - size * 1.9 - Math.max(6, size * 0.4) : y;
  ctx.fillStyle = 'rgba(10,2,20,0.72)';
  ctx.fillRect(x, ny, tw + size * 1.1, size * 1.9);
  ctx.fillStyle = '#ffe08a';
  ctx.fillText(text.toUpperCase(), x + size * 0.55, ny + size * 1.35);
  ctx.restore();
}

/** Rounded-rect path helper (works in every canvas). */
function rr(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

/** One 5-point star path, centred at (cx, cy) with outer radius r. */
function starPath(ctx, cx, cy, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const px = cx + Math.cos(a) * rad;
    const py = cy + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

/**
 * Cover dressing: star-rating badge, italic script line, diagonal ribbon,
 * round sticker, location label and a skyline silhouette strip. Drawn last,
 * on top of the caption, and positioned to stay clear of the centred title
 * and subtitle. All of it exports with the PNG.
 */
export function drawDressing(ctx, state, W, H) {
  const d = { ...DRESSING_DEFAULT, ...(state.dressing || {}) };
  if (!d.on) return;
  const { base, size, pos, pad, ty, subSize } = captionMetrics(state, W, H);
  const u = base / 1080; // scale unit (1 at 1080px)

  // --- skyline silhouette strip along the very bottom edge ---
  if (d.skyline) {
    const sh = Math.max(48, H * 0.062);
    const rnd = seeded(77);
    ctx.save();
    // Sunset glow behind the buildings so the silhouette reads at a glance.
    const glow = ctx.createLinearGradient(0, H - sh * 2.4, 0, H);
    glow.addColorStop(0, 'rgba(255,110,60,0)');
    glow.addColorStop(1, 'rgba(255,110,60,0.35)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, H - sh * 2.4, W, sh * 2.4);
    let x = 0;
    while (x < W) {
      const bw = (0.03 + rnd() * 0.075) * W;
      const bh = sh * (0.45 + rnd() * 0.55);
      ctx.fillStyle = '#0b0216';
      ctx.fillRect(x, H - bh, bw, bh);
      if (rnd() > 0.45) { // one lit window per building, more often than before
        ctx.fillStyle = 'rgba(255,201,61,0.9)';
        ctx.fillRect(x + bw * 0.3, H - bh + sh * 0.14, Math.max(3, 4 * u), Math.max(3, 6 * u));
      }
      x += bw + 2;
    }
    ctx.restore();
  }

  // --- star-rating badge, top-left ---
  const ratingText = (d.rating || '').trim().toUpperCase();
  if (ratingText) {
    const m = ratingText.match(/(\d+(?:[.,]\d+)?)\s*$/);
    const val = m ? Math.max(0, Math.min(5, parseFloat(m[1].replace(',', '.')))) : 4.5;
    const starR = 11 * u;
    const gap = 5 * u;
    const starsW = 5 * starR * 2 + 4 * gap;
    ctx.save();
    ctx.font = `400 ${27 * u}px "Bebas Neue", sans-serif`;
    const tw = ctx.measureText(ratingText).width;
    const bh = 46 * u;
    const bw = pad + starsW + 16 * u + tw + pad;
    const bx = pad;
    const by = pad;
    ctx.fillStyle = 'rgba(10,2,20,0.78)';
    rr(ctx, bx, by, bw, bh, bh / 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,201,61,0.9)';
    ctx.lineWidth = Math.max(1.5, 2 * u);
    ctx.stroke();
    const cy = by + bh / 2;
    for (let i = 0; i < 5; i++) {
      const cx = bx + pad + starR + i * (starR * 2 + gap);
      starPath(ctx, cx, cy, starR);
      ctx.fillStyle = 'rgba(255,201,61,0.28)';
      ctx.fill();
      if (val >= i + 1) {
        ctx.fillStyle = '#ffc93d';
        ctx.fill();
      } else if (val > i) { // half star: fill only the left part
        ctx.save();
        ctx.beginPath();
        ctx.rect(cx - starR, cy - starR, starR, starR * 2);
        ctx.clip();
        starPath(ctx, cx, cy, starR);
        ctx.fillStyle = '#ffc93d';
        ctx.fill();
        ctx.restore();
      }
    }
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(ratingText, bx + pad + starsW + 16 * u, cy + u);
    ctx.restore();
  }

  // --- location label, under the rating badge ---
  const loc = (d.location || '').trim().toUpperCase();
  if (loc) {
    ctx.save();
    ctx.font = `600 ${17 * u}px "Oswald", sans-serif`;
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${(2 * u).toFixed(1)}px`;
    const tw = ctx.measureText(loc).width;
    const lh = 30 * u;
    const ly = pad + 46 * u + 8 * u;
    ctx.fillStyle = 'rgba(10,2,20,0.65)';
    rr(ctx, pad, ly, tw + 24 * u, lh, lh / 2);
    ctx.fill();
    ctx.fillStyle = '#ffe08a';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(loc, pad + 12 * u, ly + lh / 2 + u);
    ctx.restore();
  }

  // --- italic script line, just above the title (or below it when on top) ---
  const script = (d.script || '').trim();
  if (script) {
    const sy = pos === 'bottom'
      ? ty - size * 0.82
      : ty + subSize * 1.5 + 46 * u;
    ctx.save();
    ctx.font = `400 ${Math.round(52 * u)}px "Great Vibes", cursive`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 10 * u;
    ctx.shadowOffsetY = 3 * u;
    ctx.fillStyle = '#ffd9ec';
    ctx.fillText(script, W / 2, sy);
    ctx.restore();
  }

  // --- diagonal ribbon across the top-right corner ---
  // Centred on the corner diagonal, close to the corner. The top-right
  // panel's note drops to its bottom-left (see panelNote), so the ribbon
  // never covers a label.
  const ribbon = (d.ribbon || '').trim().toUpperCase();
  if (ribbon) {
    ctx.save();
    ctx.translate(W - 72 * u, 72 * u);
    ctx.rotate(Math.PI / 4);
    ctx.shadowColor = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur = 12 * u;
    ctx.shadowOffsetY = 4 * u;
    ctx.fillStyle = '#ffc93d';
    ctx.fillRect(-150 * u, -25 * u, 300 * u, 50 * u);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.fillStyle = 'rgba(20,6,31,0.55)';
    ctx.fillRect(-150 * u, -25 * u, 300 * u, 4 * u);
    ctx.fillRect(-150 * u, 21 * u, 300 * u, 4 * u);
    ctx.font = `400 ${27 * u}px "Bebas Neue", sans-serif`;
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${(2 * u).toFixed(1)}px`;
    ctx.fillStyle = '#1a0b00';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ribbon, 0, 2 * u);
    ctx.restore();
  }

  // --- round sticker, bottom-right, clear of the centred caption ---
  const sticker = (d.sticker || '').trim().toUpperCase();
  if (sticker) {
    const cx = W - 84 * u;
    const cy = H - 132 * u;
    const r = 54 * u;
    const lines = sticker.split(/\s+/).slice(0, 2);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-0.14);
    ctx.fillStyle = '#ff2e88';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(2, 4 * u);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, r - 9 * u, 0, Math.PI * 2);
    ctx.setLineDash([6 * u, 5 * u]);
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = Math.max(1.5, 2 * u);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (lines.length === 1) {
      ctx.font = `400 ${30 * u}px "Bebas Neue", sans-serif`;
      ctx.fillText(lines[0], 0, u);
    } else {
      ctx.font = `400 ${22 * u}px "Bebas Neue", sans-serif`;
      ctx.fillText(lines[0], 0, -13 * u);
      ctx.font = `400 ${32 * u}px "Bebas Neue", sans-serif`;
      ctx.fillText(lines[1], 0, 15 * u);
    }
    ctx.restore();
  }
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
    // The top-right corner panel's note drops to its bottom-left when the
    // dressing ribbon is on, so the ribbon never covers the label.
    const dressingOn = (state.dressing || {}).on !== false;
    const underRibbon = dressingOn && rect.x + rect.w >= W - 1 && rect.y <= 1;
    panelNote(ctx, panel.note, rect, underRibbon);
  });
  posterEffects(ctx, W, H, fx);
  drawCaption(ctx, state, W, H);
  drawDressing(ctx, state, W, H);
}

/** Renders the poster at an exact export size and returns the canvas. */
export function renderExport(state, images, w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  drawPoster(canvas.getContext('2d'), state, images, w, h);
  return canvas;
}
