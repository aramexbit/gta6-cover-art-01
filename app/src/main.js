// Vice Poster Studio — wires the page: photo cache, controls, panel dragging,
// export and the ?shot= scenes (./shots.js). No network request is ever made:
// samples and fonts are files under app/, uploads are read locally.

import { drawPoster, renderExport, GRADES, LAYOUTS, layoutRects, DRESSING_DEFAULT } from './poster.js';
import { SAMPLES, SIZES, defaultState, panelsForLayout, createHistory, surpriseState, subtitleForPanels, isAutoSubtitle } from './state.js';
import { runShot } from './shots.js';

const $ = (id) => document.getElementById(id);
const stage = $('stage');
const ctx = stage.getContext('2d');

let state = defaultState();
let selected = 0;
let uploads = []; // { id, label, url } — object URLs of the user's own photos
const images = new Map(); // photo id -> loaded HTMLImageElement
const history = createHistory();
let toastTimer = 0;

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

async function ensureImage(id) {
  if (!images.has(id)) images.set(id, await loadImage(id));
  return images.get(id);
}

async function preloadAll() {
  const ids = new Set([...SAMPLES.map((s) => s.id), ...state.panels.map((p) => p.photo)]);
  await Promise.all([...ids].map((id) => ensureImage(id).catch(() => null)));
  await document.fonts.ready;
}

function sizeOf() {
  return SIZES.find((s) => `${s.w}x${s.h}` === state.size) || SIZES[0];
}

function redraw() {
  const { w, h } = sizeOf();
  if (stage.width !== w || stage.height !== h) {
    stage.width = w;
    stage.height = h;
  }
  drawPoster(ctx, state, images, w, h);
  drawThumbs();
}

function toast(msg) {
  const el = $('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
}

function commit() {
  history.push(state);
  redraw();
}

/* ---------- panel thumbnails ---------- */

function drawThumbs() {
  const wrap = $('panelThumbs');
  const { w, h } = sizeOf();
  const rects = layoutRects(state.layout, w, h);
  wrap.innerHTML = '';
  rects.forEach((rect, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = i === selected ? 'active' : '';
    b.title = `Panel ${i + 1}${i === 0 ? ' (hero)' : ''}`;
    b.setAttribute('aria-label', `Select panel ${i + 1}`);
    const c = document.createElement('canvas');
    c.width = 148;
    c.height = 112;
    const cctx = c.getContext('2d');
    cctx.fillStyle = '#160b24';
    cctx.fillRect(0, 0, 148, 112);
    const img = state.panels[i] ? images.get(state.panels[i].photo) : null;
    if (img) {
      const s = Math.max(148 / img.naturalWidth, 112 / img.naturalHeight);
      cctx.drawImage(img, (148 - img.naturalWidth * s) / 2, (112 - img.naturalHeight * s) / 2, img.naturalWidth * s, img.naturalHeight * s);
    }
    b.appendChild(c);
    b.addEventListener('click', () => { selected = i; syncPanelControls(); redraw(); });
    wrap.appendChild(b);
  });
}

/* ---------- control panels ---------- */

function buildSamples() {
  const wrap = $('samples');
  wrap.innerHTML = '';
  SAMPLES.forEach((s) => {
    const img = document.createElement('img');
    img.src = s.id;
    img.alt = s.label;
    img.title = s.label;
    img.setAttribute('role', 'option');
    img.addEventListener('click', async () => {
      await ensureImage(s.id);
      state.panels[selected].photo = s.id;
      state.panels[selected].zoom = 1.2;
      state.panels[selected].panX = 0;
      state.panels[selected].panY = 0;
      commit();
      toast(`${s.label} in panel ${selected + 1}`);
    });
    wrap.appendChild(img);
  });
}

function buildLayouts() {
  const wrap = $('layouts');
  wrap.innerHTML = '';
  Object.entries(LAYOUTS).forEach(([key, def]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = def.name;
    b.setAttribute('aria-checked', String(state.layout === key));
    b.addEventListener('click', () => {
      state.layout = key;
      state.panels = panelsForLayout(state, key);
      if (isAutoSubtitle(state.subtitle)) state.subtitle = subtitleForPanels(LAYOUTS[key].panels);
      selected = 0;
      syncLayoutButtons();
      syncPanelControls();
      syncCaptionControls();
      commit();
    });
    wrap.appendChild(b);
  });
}

function syncLayoutButtons() {
  [...$('layouts').children].forEach((b, i) => {
    b.setAttribute('aria-checked', String(Object.keys(LAYOUTS)[i] === state.layout));
  });
}

function buildGrades() {
  const wrap = $('grades');
  wrap.innerHTML = '';
  Object.entries(GRADES).forEach(([key, def]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.grade = key;
    b.title = def.name;
    b.textContent = def.name;
    b.setAttribute('aria-checked', String(state.grade === key));
    b.addEventListener('click', () => {
      state.grade = key;
      syncGradeButtons();
      commit();
    });
    wrap.appendChild(b);
  });
}

function syncGradeButtons() {
  [...$('grades').children].forEach((b) => {
    b.setAttribute('aria-checked', String(b.dataset.grade === state.grade));
  });
}

function syncPanelPhotoOptions() {
  const sel = $('panelPhoto');
  sel.innerHTML = '';
  [...SAMPLES, ...uploads].forEach((s) => {
    const o = document.createElement('option');
    o.value = s.id;
    o.textContent = s.label;
    sel.appendChild(o);
  });
  sel.value = state.panels[selected].photo;
}

function syncPanelControls() {
  const p = state.panels[selected];
  if (!p) return;
  syncPanelPhotoOptions();
  $('zoom').value = p.zoom;
  $('panX').value = p.panX;
  $('panY').value = p.panY;
  $('rot').value = p.rot;
  $('bright').value = p.bright;
  $('contrast').value = p.contrast;
  $('sat').value = p.sat;
  $('panelNote').value = p.note || '';
  $('zoomVal').textContent = `${Math.round(p.zoom * 100)}%`;
  $('panXVal').textContent = p.panX.toFixed(2);
  $('panYVal').textContent = p.panY.toFixed(2);
  $('rotVal').textContent = `${p.rot}°`;
}

function syncCaptionControls() {
  $('title').value = state.title;
  $('subtitle').value = state.subtitle;
  $('font').value = state.font;
  $('titleSize').value = state.titleSize;
  $('titleColor').value = state.titleColor;
  $('outline').value = state.outline;
  $('spacing').value = state.spacing;
  $('captionPos').value = state.captionPos;
}

function syncDressingControls() {
  if (!state.dressing) state.dressing = { ...DRESSING_DEFAULT };
  const d = state.dressing;
  $('dressOn').checked = d.on !== false;
  $('dressRating').value = d.rating || '';
  $('dressScript').value = d.script || '';
  $('dressRibbon').value = d.ribbon || '';
  $('dressSticker').value = d.sticker || '';
  $('dressLocation').value = d.location || '';
  $('dressSkyline').checked = d.skyline !== false;
}

function syncAll() {
  syncLayoutButtons();
  syncGradeButtons();
  syncPanelControls();
  syncCaptionControls();
  syncDressingControls();
  $('fxDuotone').checked = state.fx.duotone;
  $('fxHalftone').checked = state.fx.halftone;
  $('fxGrain').checked = state.fx.grain;
  $('fxVignette').checked = state.fx.vignette;
  [...$('sizes').children].forEach((b) => {
    b.setAttribute('aria-checked', String(b.dataset.size === state.size));
  });
}

/* ---------- uploads ---------- */

async function addUpload(file) {
  if (!file || !file.type.startsWith('image/')) return;
  const url = URL.createObjectURL(file);
  const id = `upload:${Date.now()}-${uploads.length}`;
  const img = await loadImage(url);
  images.set(id, img);
  uploads.push({ id, label: file.name.replace(/\.[^.]+$/, '').slice(0, 18) || 'Your photo', url });
  const wrap = $('uploads');
  const thumb = document.createElement('img');
  thumb.src = url;
  thumb.alt = file.name;
  thumb.title = file.name;
  thumb.addEventListener('click', () => {
    state.panels[selected].photo = id;
    state.panels[selected].zoom = 1.2;
    state.panels[selected].panX = 0;
    state.panels[selected].panY = 0;
    commit();
    toast('Your photo is in the poster');
  });
  wrap.appendChild(thumb);
  state.panels[selected].photo = id;
  syncPanelPhotoOptions();
  commit();
  toast('Photo added — drag it on the poster to position it');
}

$('photoInput').addEventListener('change', async (e) => {
  for (const f of e.target.files) await addUpload(f);
  e.target.value = '';
});
$('dropzone').addEventListener('click', () => $('photoInput').click());
$('dropzone').addEventListener('dragover', (e) => { e.preventDefault(); $('dropzone').classList.add('dragover'); });
$('dropzone').addEventListener('dragleave', () => $('dropzone').classList.remove('dragover'));
$('dropzone').addEventListener('drop', async (e) => {
  e.preventDefault();
  $('dropzone').classList.remove('dragover');
  for (const f of e.dataTransfer.files) await addUpload(f);
});

/* ---------- panel sliders ---------- */

function bindRange(id, get, set, after) {
  $(id).addEventListener('input', (e) => {
    set(Number(e.target.value));
    syncPanelControls();
    redraw();
    if (after) after();
  });
  $(id).addEventListener('change', () => history.push(state));
}
bindRange('zoom', (p) => p.zoom, (v) => { state.panels[selected].zoom = v; });
bindRange('panX', (p) => p.panX, (v) => { state.panels[selected].panX = v; });
bindRange('panY', (p) => p.panY, (v) => { state.panels[selected].panY = v; });
bindRange('rot', (p) => p.rot, (v) => { state.panels[selected].rot = v; });
bindRange('bright', (p) => p.bright, (v) => { state.panels[selected].bright = v; });
bindRange('contrast', (p) => p.contrast, (v) => { state.panels[selected].contrast = v; });
bindRange('sat', (p) => p.sat, (v) => { state.panels[selected].sat = v; });

$('flip').addEventListener('click', () => {
  state.panels[selected].flip = !state.panels[selected].flip;
  commit();
});
$('cropCenter').addEventListener('click', () => {
  Object.assign(state.panels[selected], { panX: 0, panY: 0, zoom: 1.2, rot: 0 });
  syncPanelControls();
  commit();
});
$('cropFace').addEventListener('click', () => {
  Object.assign(state.panels[selected], { panY: -0.22, zoom: 1.5 });
  syncPanelControls();
  commit();
});
$('panelPhoto').addEventListener('change', async (e) => {
  await ensureImage(e.target.value);
  state.panels[selected].photo = e.target.value;
  commit();
});
$('panelNote').addEventListener('input', (e) => {
  state.panels[selected].note = e.target.value;
  redraw();
});
$('panelNote').addEventListener('change', () => history.push(state));

/* ---------- grade + effects ---------- */

[['fxDuotone', 'duotone'], ['fxHalftone', 'halftone'], ['fxGrain', 'grain'], ['fxVignette', 'vignette']].forEach(([id, key]) => {
  $(id).addEventListener('change', (e) => {
    state.fx[key] = e.target.checked;
    commit();
  });
});

/* ---------- caption ---------- */

$('title').addEventListener('input', (e) => { state.title = e.target.value; redraw(); });
$('title').addEventListener('change', () => history.push(state));
$('subtitle').addEventListener('input', (e) => { state.subtitle = e.target.value; redraw(); });
$('subtitle').addEventListener('change', () => history.push(state));
$('font').addEventListener('change', async (e) => {
  state.font = e.target.value;
  await document.fonts.load(`400 100px "${state.font}"`);
  commit();
});
$('titleSize').addEventListener('input', (e) => { state.titleSize = Number(e.target.value); redraw(); });
$('titleSize').addEventListener('change', () => history.push(state));
$('titleColor').addEventListener('input', (e) => { state.titleColor = e.target.value; redraw(); });
$('titleColor').addEventListener('change', () => history.push(state));
$('outline').addEventListener('input', (e) => { state.outline = Number(e.target.value); redraw(); });
$('outline').addEventListener('change', () => history.push(state));
$('spacing').addEventListener('input', (e) => { state.spacing = Number(e.target.value); redraw(); });
$('spacing').addEventListener('change', () => history.push(state));
$('captionPos').addEventListener('change', (e) => { state.captionPos = e.target.value; commit(); });

/* ---------- dressing ---------- */

$('dressOn').addEventListener('change', (e) => {
  state.dressing.on = e.target.checked;
  commit();
});
$('dressSkyline').addEventListener('change', (e) => {
  state.dressing.skyline = e.target.checked;
  commit();
});
[['dressRating', 'rating'], ['dressScript', 'script'], ['dressRibbon', 'ribbon'], ['dressSticker', 'sticker'], ['dressLocation', 'location']].forEach(([id, key]) => {
  $(id).addEventListener('input', (e) => {
    state.dressing[key] = e.target.value;
    redraw();
  });
  $(id).addEventListener('change', () => history.push(state));
});

/* ---------- sizes + export ---------- */

[...$('sizes').children].forEach((b) => {
  b.addEventListener('click', () => {
    state.size = b.dataset.size;
    syncAll();
    redraw();
  });
});

function download(canvas, name) {
  canvas.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }, 'image/png');
}

function exportOne(size, silent) {
  const t0 = performance.now();
  const canvas = renderExport(state, images, size.w, size.h);
  download(canvas, `vice-poster-${size.w}x${size.h}.png`);
  const ms = Math.round(performance.now() - t0);
  $('status').textContent = `Saved vice-poster-${size.w}x${size.h}.png in ${ms} ms`;
  if (!silent) toast(`Exported ${size.w} x ${size.h} PNG in ${ms} ms`);
}

$('export').addEventListener('click', () => exportOne(sizeOf(), false));
$('exportAll').addEventListener('click', () => {
  SIZES.forEach((s, i) => setTimeout(() => exportOne(s, i < SIZES.length - 1), i * 250));
  toast('Exporting all three sizes…');
});

/* ---------- surprise + undo ---------- */

$('surprise').addEventListener('click', async () => {
  state = surpriseState(state);
  selected = 0;
  await preloadAll();
  syncAll();
  commit();
  toast(`Surprise! ${state.layout} layout, ${GRADES[state.grade].name} grade`);
});
$('undo').addEventListener('click', () => {
  const prev = history.undo(state);
  if (prev) {
    state = prev;
    selected = 0;
    syncAll();
    redraw();
    toast('Undone');
  } else {
    toast('Nothing to undo yet');
  }
});

/* ---------- drag to pan, wheel to zoom, click to select ---------- */

function eventPanel(e) {
  const r = stage.getBoundingClientRect();
  const px = ((e.clientX - r.left) / r.width) * stage.width;
  const py = ((e.clientY - r.top) / r.height) * stage.height;
  const rects = layoutRects(state.layout, stage.width, stage.height);
  const i = rects.findIndex((rc) => px >= rc.x && px <= rc.x + rc.w && py >= rc.y && py <= rc.y + rc.h);
  return { i, px, py };
}

let drag = null;
stage.addEventListener('pointerdown', (e) => {
  const { i, px, py } = eventPanel(e);
  if (i < 0) return;
  selected = i;
  syncPanelControls();
  redraw();
  const p = state.panels[i];
  drag = { x: px, y: py, panX: p.panX, panY: p.panY };
  stage.setPointerCapture(e.pointerId);
});
stage.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const r = stage.getBoundingClientRect();
  const px = ((e.clientX - r.left) / r.width) * stage.width;
  const py = ((e.clientY - r.top) / r.height) * stage.height;
  const rects = layoutRects(state.layout, stage.width, stage.height);
  const rc = rects[selected];
  const p = state.panels[selected];
  p.panX = Math.max(-0.5, Math.min(0.5, drag.panX + (px - drag.x) / rc.w));
  p.panY = Math.max(-0.5, Math.min(0.5, drag.panY + (py - drag.y) / rc.h));
  syncPanelControls();
  redraw();
});
stage.addEventListener('pointerup', () => {
  if (drag) { history.push(state); drag = null; }
});
stage.addEventListener('wheel', (e) => {
  e.preventDefault();
  const p = state.panels[selected];
  p.zoom = Math.max(1, Math.min(3, p.zoom * (e.deltaY < 0 ? 1.08 : 0.93)));
  syncPanelControls();
  redraw();
}, { passive: false });

/* ---------- keyboard shortcuts ---------- */

document.addEventListener('keydown', (e) => {
  if (e.target.matches('input[type="text"], select, textarea')) return;
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); $('undo').click(); }
  else if (e.key.toLowerCase() === 'e') { exportOne(sizeOf(), false); }
  else if (e.key.toLowerCase() === 's') { $('surprise').click(); }
  else if (['1', '2', '3', '4', '5'].includes(e.key)) {
    const key = Object.keys(LAYOUTS)[Number(e.key) - 1];
    if (key) [...$('layouts').children][Number(e.key) - 1].click();
  }
});

/* ---------- boot ---------- */

buildSamples();
buildLayouts();
buildGrades();
syncAll();
history.push(state);

const query = new URLSearchParams(location.search);
const shot = query.get('shot');
if (shot) {
  // Fixed scenes for screenshots: ?shot=cover shows the cover alone,
  // ?shot=editor shows the full studio with a sample loaded.
  runShot(shot, query, {
    async apply(nextState) {
      state = nextState;
      selected = 0;
      await preloadAll();
      syncAll();
      redraw();
    },
    setImages(map) { for (const [k, v] of map) images.set(k, v); },
  });
} else {
  preloadAll().then(redraw);
}
