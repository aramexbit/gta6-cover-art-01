// Vice Poster Studio — poster.js: draws the cover on a 2D canvas at any size.
// The preview and the exported PNG are the same drawing: panels, grades, effects and
// the dressing (title, script, ribbon, heat badge, sticker, skyline strip) all live here.
import { panelsForLayout } from './state.js';

/** Grade overlays: a sky gradient, a shadow tint and a highlight tint, each with its strength. */
const GRADES = {
  sunset: { sky: ['#ff2e88', '#ff7a18', '#2a0a3d'], skyAlpha: 0.2, shadow: '#2a0a3d', shadowAlpha: 0.16, hi: '#ffb347', hiAlpha: 0.1 },
  neon: { sky: ['#ff2e88', '#7b2ff7', '#00e5ff'], skyAlpha: 0.2, shadow: '#0b0033', shadowAlpha: 0.2, hi: '#ff5ec4', hiAlpha: 0.12 },
  teal: { sky: ['#00b4a2', '#0e5e6e', '#062a33'], skyAlpha: 0.2, shadow: '#01262e', shadowAlpha: 0.18, hi: '#7ff0d4', hiAlpha: 0.1 },
  noir: { sky: ['#3a3a3a', '#141414', '#000000'], skyAlpha: 0.22, shadow: '#000000', shadowAlpha: 0.22, hi: '#ffffff', hiAlpha: 0.06 },
  palm: { sky: ['#ffd166', '#ff8c42', '#ff5e78'], skyAlpha: 0.2, shadow: '#3d1c02', shadowAlpha: 0.14, hi: '#ffe29a', hiAlpha: 0.14 },
};

/** Duotone pairs: a dark colour multiplied, then a light colour screened over the photos. */
const DUOTONES = {
  sunset: { dark: '#2a0a3d', light: '#ffb347' },
  teal: { dark: '#01262e', light: '#7ff0d4' },
  magenta: { dark: '#2b0033', light: '#ff5ec4' },
};

/** Panel rectangles for each layout, as fractions of the canvas, with a small gutter. */
function panelRects(layout, W, H) {
  const g = Math.round(W * 0.008);
  if (layout === 'hero2') {
    const rw = W * 0.34;
    return [
      { x: 0, y: 0, w: W * 0.66 - g, h: H },
      { x: W * 0.66, y: 0, w: rw, h: (H - g) / 2 },
      { x: W * 0.66, y: (H + g) / 2, w: rw, h: (H - g) / 2 },
    ];
  }
  if (layout === 'hero3') {
    const pw = (W - 2 * g) / 3;
    const sh = H * 0.32;
    return [
      { x: 0, y: 0, w: W, h: H * 0.68 - g },
      { x: 0, y: H * 0.68, w: pw, h: sh },
      { x: pw + g, y: H * 0.68, w: pw, h: sh },
      { x: 2 * (pw + g), y: H * 0.68, w: pw, h: sh },
    ];
  }
  if (layout === 'grid') {
    const pw = (W - g) / 2;
    const ph = (H - g) / 2;
    return [
      { x: 0, y: 0, w: pw, h: ph },
      { x: pw + g, y: 0, w: pw, h: ph },
      { x: 0, y: ph + g, w: pw, h: ph },
      { x: pw + g, y: ph + g, w: pw, h: ph },
    ];
  }
  if (layout === 'fullbleed') {
    const pw = (W - 2 * g) / 3;
    const sh = H * 0.24;
    return [
      { x: 0, y: 0, w: W, h: H },
      { x: 0, y: H * 0.76, w: pw, h: sh },
      { x: pw + g, y: H * 0.76, w: pw, h: sh },
      { x: 2 * (pw + g), y: H * 0.76, w: pw, h: sh },
    ];
  }
  const rw = W * 0.38;
  const sw = (rw - g) / 2;
  const sh = (H - g) / 2;
  return [
    { x: 0, y: 0, w: W * 0.62 - g, h: H },
    { x: W * 0.62, y: 0, w: sw, h: sh },
    { x: W * 0.62 + sw + g, y: 0, w: sw, h: sh },
    { x: W * 0.62, y: sh + g, w: sw, h: sh },
    { x: W * 0.62 + sw + g, y: sh + g, w: sw, h: sh },
  ];
}

/** One photo, cover-fitted into its panel with the panel's crop, pan, rotate, flip and levels. */
function drawPhoto(ctx, img, panel, r, grade) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(r.x, r.y, r.w, r.h);
  ctx.clip();
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const scale = Math.max(r.w / iw, r.h / ih) * panel.zoom;
  const dw = iw * scale;
  const dh = ih * scale;
  ctx.translate(r.x + r.w / 2 + panel.panX * r.w, r.y + r.h / 2 + panel.panY * r.h);
  if (panel.flip) ctx.scale(-1, 1);
  if (panel.rotate) ctx.rotate((panel.rotate * Math.PI) / 180);
  const sat = grade === 'noir' ? Math.round(panel.sat * 0.3) : panel.sat;
  ctx.filter = `brightness(${panel.bright}%) contrast(${panel.contrast}%) saturate(${sat}%)`;
  ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
  ctx.restore();
}

/** The grade's sky wash, shadow and highlight over the whole cover. */
function drawGrade(ctx, grade, W, H) {
  const g = GRADES[grade] ?? GRADES.palm;
  const sky = ctx.createLinearGradient(0, 0, W * 0.25, H);
  sky.addColorStop(0, g.sky[0]);
  sky.addColorStop(0.55, g.sky[1]);
  sky.addColorStop(1, g.sky[2]);
  ctx.save();
  ctx.globalAlpha = g.skyAlpha;
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = g.shadowAlpha;
  ctx.fillStyle = g.shadow;
  ctx.fillRect(0, H * 0.55, W, H * 0.45);
  ctx.globalAlpha = g.hiAlpha;
  ctx.fillStyle = g.hi;
  ctx.fillRect(0, 0, W, H * 0.3);
  ctx.restore();
}

/** A duotone wash: dark multiplied, light screened. */
function drawDuotone(ctx, tone, W, H) {
  const d = DUOTONES[tone];
  if (!d) return;
  ctx.save();
  ctx.globalAlpha = 0.3;
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = d.dark;
  ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = d.light;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

/** A five-point star path, for the heat badge. */
function starPath(ctx, cx, cy, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const x = cx + Math.cos(a) * rad;
    const y = cy + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

/** The title block: two Anton lines, the script line and the location label, over a scrim.
 * Laid out bottom-up from the skyline strip so the script and location never slip under it. */
function drawTitleBlock(ctx, state, W, H) {
  const u = Math.min(W, H) / 1080;
  const boost = Math.min(1.3, Math.max(1, W / H));
  const stripTop = H * 0.92;
  const titleSize = 92 * u * boost;
  const scriptSize = 54 * u * boost;
  const locSize = 26 * u * boost;
  const locBase = stripTop - 14 * u;
  const scriptBase = locBase - 38 * u * boost;
  const line2Base = scriptBase - scriptSize;
  const line1Base = line2Base - titleSize * 0.98;
  const scrim = ctx.createLinearGradient(0, line1Base - titleSize - H * 0.04, 0, stripTop);
  scrim.addColorStop(0, 'rgba(5,0,15,0)');
  scrim.addColorStop(1, 'rgba(5,0,15,0.62)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, line1Base - titleSize - H * 0.04, W, stripTop - line1Base + titleSize + H * 0.04);
  const x = W * 0.045;
  const lines = state.title.split(' ');
  const mid = Math.ceil(lines.length / 2);
  const line1 = lines.slice(0, mid).join(' ');
  const line2 = lines.slice(mid).join(' ');
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `${titleSize}px Anton, 'Bebas Neue', sans-serif`;
  const grad = ctx.createLinearGradient(0, line1Base - titleSize, 0, line2Base);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(1, '#ffd166');
  ctx.fillStyle = grad;
  ctx.strokeStyle = 'rgba(20,0,30,0.9)';
  ctx.lineWidth = Math.max(2, 7 * u);
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = 18 * u;
  ctx.shadowOffsetY = 5 * u;
  ctx.strokeText(line1, x, line1Base);
  ctx.fillText(line1, x, line1Base);
  ctx.strokeText(line2, x, line2Base);
  ctx.fillText(line2, x, line2Base);
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.font = `${scriptSize}px 'Great Vibes', cursive`;
  ctx.fillStyle = '#ffd7ef';
  ctx.fillText(state.script, x + 4 * u, scriptBase);
  ctx.font = `600 ${locSize}px Oswald, sans-serif`;
  try { ctx.letterSpacing = `${6 * u}px`; } catch (e) { /* older canvas: no letter spacing */ }
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`\u2605 ${state.location} \u2605`, x + 4 * u, locBase);
  try { ctx.letterSpacing = '0px'; } catch (e) { /* reset */ }
}

/** The diagonal ribbon across the top-right corner. */
function drawRibbon(ctx, state, W, H) {
  const u = W / 1080;
  ctx.save();
  ctx.translate(W * 0.8, H * 0.1);
  ctx.rotate((22 * Math.PI) / 180);
  const bw = W * 0.56;
  const bh = Math.max(26, H * 0.052);
  const grad = ctx.createLinearGradient(-bw / 2, 0, bw / 2, 0);
  grad.addColorStop(0, '#ff2e63');
  grad.addColorStop(1, '#ff7a18');
  ctx.fillStyle = grad;
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = 12 * u;
  ctx.shadowOffsetY = 4 * u;
  ctx.fillRect(-bw / 2, -bh / 2, bw, bh);
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = Math.max(1, 2 * u);
  ctx.strokeRect(-bw / 2 + 4 * u, -bh / 2 + 4 * u, bw - 8 * u, bh - 8 * u);
  ctx.font = `600 ${Math.max(16, 26 * u)}px Oswald, sans-serif`;
  try { ctx.letterSpacing = `${5 * u}px`; } catch (e) { /* older canvas */ }
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(state.ribbon, 0, 2 * u);
  try { ctx.letterSpacing = '0px'; } catch (e) { /* reset */ }
  ctx.restore();
}

/** The heat badge: a dark pill with stars and the HEAT score, top-left. */
function drawHeatBadge(ctx, state, W, H) {
  const u = W / 1080;
  const pad = 16 * u;
  const starR = 13 * u;
  const bw = 5 * starR * 2 + pad * 2 + 108 * u;
  const bh = Math.max(34, H * 0.048);
  const x = W * 0.03;
  const y = H * 0.03;
  ctx.save();
  ctx.fillStyle = 'rgba(10,0,20,0.8)';
  ctx.strokeStyle = 'rgba(255,209,102,0.9)';
  ctx.lineWidth = Math.max(1, 2 * u);
  ctx.beginPath();
  ctx.roundRect(x, y, bw, bh, bh / 2);
  ctx.fill();
  ctx.stroke();
  const cy = y + bh / 2;
  let sx = x + pad + starR;
  for (let i = 0; i < 5; i++) {
    const fill = Math.max(0, Math.min(1, state.heat - i));
    starPath(ctx, sx, cy, starR);
    ctx.fillStyle = '#3a2b4d';
    ctx.fill();
    if (fill > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(sx - starR, cy - starR, starR * 2 * fill, starR * 2);
      ctx.clip();
      starPath(ctx, sx, cy, starR);
      ctx.fillStyle = '#ffd166';
      ctx.fill();
      ctx.restore();
    }
    sx += starR * 2 + 3 * u;
  }
  ctx.font = `600 ${24 * u}px Oswald, sans-serif`;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`HEAT ${state.heat.toFixed(1)}`, sx + 6 * u, cy + 1 * u);
  ctx.restore();
}

/** The EST. 2026 sticker, bottom-right above the skyline strip. */
function drawEstSticker(ctx, W, H) {
  const u = W / 1080;
  const r = 52 * u;
  const cx = W * 0.93;
  const cy = H * 0.845;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((-12 * Math.PI) / 180);
  ctx.fillStyle = '#ff2e63';
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(1, 3 * u);
  ctx.beginPath();
  ctx.arc(0, 0, r - 6 * u, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `600 ${20 * u}px Oswald, sans-serif`;
  ctx.fillText('EST.', 0, -14 * u);
  ctx.font = `700 ${30 * u}px Oswald, sans-serif`;
  ctx.fillText('2026', 0, 14 * u);
  ctx.restore();
}

/** A deterministic pseudo-random number, for stable grain and skyline shapes. */
function seededRandom(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** The skyline silhouette strip along the bottom: buildings, lit windows and palms. */
function drawSkyline(ctx, W, H) {
  const y0 = H * 0.92;
  const h = H * 0.08;
  ctx.save();
  const band = ctx.createLinearGradient(0, y0, 0, H);
  band.addColorStop(0, '#160a2a');
  band.addColorStop(1, '#05030a');
  ctx.fillStyle = band;
  ctx.fillRect(0, y0, W, h);
  ctx.fillStyle = '#ffd166';
  ctx.globalAlpha = 0.9;
  ctx.fillRect(0, y0, W, Math.max(2, H * 0.004));
  ctx.globalAlpha = 1;
  const rnd = seededRandom(20261121);
  ctx.fillStyle = '#241536';
  let x = 0;
  while (x < W) {
    const bw = W * (0.03 + rnd() * 0.05);
    const bh = h * (0.35 + rnd() * 0.6);
    ctx.fillRect(x, y0 + h - bh, bw, bh);
    if (rnd() > 0.6) ctx.fillRect(x + bw * 0.4, y0 + h - bh - h * 0.12, bw * 0.2, h * 0.12);
    for (let wy = y0 + h - bh + h * 0.08; wy < y0 + h - h * 0.05; wy += h * 0.14) {
      for (let wx = x + bw * 0.14; wx < x + bw - bw * 0.1; wx += bw * 0.3) {
        if (rnd() > 0.45) {
          ctx.fillStyle = '#ffd166';
          ctx.globalAlpha = 0.75;
          ctx.fillRect(wx, wy, Math.max(2, W * 0.003), Math.max(2, H * 0.012));
          ctx.globalAlpha = 1;
          ctx.fillStyle = '#241536';
        }
      }
    }
    x += bw + W * 0.006;
  }
  ctx.strokeStyle = '#12061f';
  ctx.lineWidth = Math.max(2, W * 0.004);
  for (let i = 0; i < 4; i++) {
    const px = W * (0.08 + i * 0.27 + rnd() * 0.05);
    const ph = h * (0.5 + rnd() * 0.25);
    const top = y0 + h - ph;
    ctx.beginPath();
    ctx.moveTo(px, y0 + h);
    ctx.quadraticCurveTo(px + W * 0.008, y0 + h - ph * 0.6, px, top);
    ctx.stroke();
    for (let f = 0; f < 5; f++) {
      const a = -Math.PI * (0.15 + f * 0.18);
      ctx.beginPath();
      ctx.moveTo(px, top);
      ctx.quadraticCurveTo(px + Math.cos(a) * W * 0.02, top + Math.sin(a) * h * 0.3, px + Math.cos(a) * W * 0.035, top + Math.sin(a) * h * 0.45);
      ctx.stroke();
    }
  }
  ctx.restore();
}

/** Print halftone dots over the whole cover, faint. */
function drawHalftone(ctx, W, H) {
  const step = Math.max(6, W / 150);
  ctx.save();
  ctx.fillStyle = '#000000';
  ctx.globalAlpha = 0.07;
  for (let y = step / 2; y < H; y += step) {
    for (let x = step / 2; x < W; x += step) {
      ctx.beginPath();
      ctx.arc(x, y, Math.max(0.8, step * 0.16), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** Film grain: seeded dots, the same on every render of the same cover. */
function drawGrain(ctx, W, H) {
  const rnd = seededRandom(20261121);
  ctx.save();
  for (let i = 0; i < 3500; i++) {
    const v = rnd();
    ctx.fillStyle = v > 0.5 ? '#ffffff' : '#000000';
    ctx.globalAlpha = 0.05;
    ctx.fillRect(rnd() * W, rnd() * H, 1.6, 1.6);
  }
  ctx.restore();
}

/** A dark vignette around the edges. */
function drawVignette(ctx, W, H) {
  const grad = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.75);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.32)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
}

/** A panel's own mini caption, when the panel has one. */
function drawPanelCaption(ctx, panel, r, W) {
  if (!panel.caption) return;
  const u = W / 1080;
  ctx.save();
  ctx.font = `600 ${22 * u}px Oswald, sans-serif`;
  const tw = ctx.measureText(panel.caption).width;
  const pad = 12 * u;
  const bx = r.x + 10 * u;
  const by = r.y + r.h - 40 * u;
  ctx.fillStyle = 'rgba(10,0,20,0.78)';
  ctx.beginPath();
  ctx.roundRect(bx, by, tw + pad * 2, 32 * u, 16 * u);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(panel.caption, bx + pad, by + 17 * u);
  ctx.restore();
}

/**
 * Draws the whole cover on `canvas` at exactly W by H pixels: panels, grade, effects,
 * dressing and print texture, then a white frame with a dark keyline.
 */
export function drawCover(canvas, state, images, W, H) {
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#0d0518';
  ctx.fillRect(0, 0, W, H);
  const rects = panelRects(state.layout, W, H);
  const slots = panelsForLayout(state.layout);
  slots.forEach((slot, i) => {
    const panel = state.panels[slot];
    const img = images[panel.photo];
    if (img) drawPhoto(ctx, img, panel, rects[i], state.grade);
    drawPanelCaption(ctx, panel, rects[i], W);
  });
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = Math.max(2, W * 0.003);
  rects.forEach((r) => ctx.strokeRect(r.x, r.y, r.w, r.h));
  ctx.restore();
  drawGrade(ctx, state.grade, W, H);
  if (state.duotone !== 'none') drawDuotone(ctx, state.duotone, W, H);
  if (state.dressing) {
    drawTitleBlock(ctx, state, W, H);
    drawRibbon(ctx, state, W, H);
    drawHeatBadge(ctx, state, W, H);
    drawEstSticker(ctx, W, H);
    drawSkyline(ctx, W, H);
  }
  if (state.halftone) drawHalftone(ctx, W, H);
  if (state.grain) drawGrain(ctx, W, H);
  if (state.vignette) drawVignette(ctx, W, H);
  ctx.save();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(3, W * 0.007);
  ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, W - ctx.lineWidth, H - ctx.lineWidth);
  ctx.strokeStyle = 'rgba(20,0,30,0.9)';
  ctx.lineWidth = Math.max(1, W * 0.002);
  ctx.strokeRect(W * 0.012, H * 0.012, W * 0.976, H * 0.976);
  ctx.restore();
}
