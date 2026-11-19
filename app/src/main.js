// main.js — Vice Poster Studio: boot and editor.
// Wires the studio together: loads the bundled samples, renders the live
// preview from the state, builds the editor controls, and handles photos
// (pick a sample, upload your own, drag to pan, scroll to zoom), the
// caption, the dressing, undo, "Surprise me", shortcuts and the PNG export.
// In shot mode (?shot=cover or ?shot=editor) it renders one scene and
// raises window.__shotReady for the screenshot runner.

import {
  SAMPLES, LAYOUTS, GRADES, CAPTION_FONTS, EXPORT_SIZES,
  defaultState, cloneState, fitPanelsToLayout, surpriseState, subtitleFor,
} from './state.js';
import { renderCover, layoutRects, loadImage, exportPNG, verifyExport } from './poster.js';
import { parseShotParams, applyShot } from './shots.js';

const $ = (id) => document.getElementById(id);
const stage = $('stage');
const sctx = stage.getContext('2d');

// ---- state + history -------------------------------------------------------
let state = defaultState();
let history = [];
let uploadCount = 0;
const images = new Map(); // photo id -> HTMLImageElement
const uploadUrls = new Map(); // upload id -> object URL

function pushHistory() {
  history.push(JSON.stringify(state));
  if (history.length > 40) history.shift();
}
function undo() {
  if (!history.length) return showToast('Nothing to undo');
  state = JSON.parse(history.pop());
  syncControls();
  render();
  showToast('Undone');
}

// ---- toasts ----------------------------------------------------------------
let toastTimer = null;
function showToast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

// ---- preview ---------------------------------------------------------------
function previewSize() {
  const size = EXPORT_SIZES.find((s) => s.id === state.exportSize) || EXPORT_SIZES[0];
  // In an editor screenshot the whole cover must fit the viewport, so the
  // preview shrinks; in normal use and cover shots it stays large.
  const max = document.body.classList.contains('shot-editor') ? 480 : 720;
  const scale = Math.min(max / size.w, max / size.h);
  return { w: Math.round(size.w * scale), h: Math.round(size.h * scale) };
}

function render() {
  const { w, h } = previewSize();
  if (stage.width !== w || stage.height !== h) {
    stage.width = w;
    stage.height = h;
  }
  renderCover(sctx, state, w, h, images);
  renderThumbs();
  $('sizeLabel').textContent = `Preview — ${EXPORT_SIZES.find((s) => s.id === state.exportSize).label}`;
}

function renderThumbs() {
  const wrap = $('thumbs');
  wrap.innerHTML = '';
  state.panels.forEach((panel, i) => {
    const img = images.get(panel.photo);
    const d = document.createElement('button');
    d.className = 'thumb' + (i === state.selected ? ' selected' : '');
    d.type = 'button';
    d.title = `Panel ${i + 1} — ${panel.tag || 'photo'}`;
    if (img) {
      const im = document.createElement('img');
      im.src = img.src;
      im.alt = panel.tag || `Panel ${i + 1}`;
      d.appendChild(im);
    }
    const lab = document.createElement('span');
    lab.textContent = `${i + 1} · ${panel.tag || 'PHOTO'}`;
    d.appendChild(lab);
    d.addEventListener('click', () => {
      state.selected = i;
      syncPanelControls();
      render();
    });
    wrap.appendChild(d);
  });
  $('panelLabel').textContent = `Selected panel ${state.selected + 1} of ${state.panels.length}`;
}

// ---- control builders ------------------------------------------------------
function buildButtons(container, items, activeId, onPick) {
  const wrap = $(container);
  wrap.innerHTML = '';
  items.forEach((item) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip' + (item.id === activeId ? ' active' : '');
    b.textContent = item.name || item.label;
    b.addEventListener('click', () => onPick(item.id));
    wrap.appendChild(b);
  });
}

function buildSamples() {
  const wrap = $('sampleRow');
  wrap.innerHTML = '';
  SAMPLES.forEach((s) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'sample';
    b.title = `${s.label} (${s.kind})`;
    const im = document.createElement('img');
    im.src = s.src;
    im.alt = s.label;
    b.appendChild(im);
    const lab = document.createElement('span');
    lab.textContent = s.label;
    b.appendChild(lab);
    b.addEventListener('click', () => {
      pushHistory();
      const p = state.panels[state.selected];
      p.photo = s.id;
      p.tag = s.label;
      syncPanelControls();
      render();
    });
    wrap.appendChild(b);
  });
}

function syncLayoutButtons() {
  buildButtons('layoutRow', LAYOUTS, state.layout, (id) => {
    if (id === state.layout) return;
    pushHistory();
    state.layout = id;
    fitPanelsToLayout(state);
    syncControls();
    render();
  });
}

function syncGradeButtons() {
  buildButtons('gradeRow', GRADES, state.panels[state.selected].grade, (id) => {
    pushHistory();
    state.panels[state.selected].grade = id;
    syncGradeButtons();
    render();
  });
}

function syncFontButtons() {
  buildButtons('fontRow', CAPTION_FONTS, state.captionFont, (id) => {
    pushHistory();
    state.captionFont = id;
    syncFontButtons();
    render();
  });
}

function syncExportButtons() {
  buildButtons('exportRow', EXPORT_SIZES, state.exportSize, (id) => {
    state.exportSize = id;
    syncExportButtons();
    render();
  });
}

function syncPanelControls() {
  const p = state.panels[state.selected];
  $('panelPhoto').value = p.photo;
  $('panelTag').value = p.tag;
  $('zoomRange').value = p.zoom;
  $('panXRange').value = p.panX;
  $('panYRange').value = p.panY;
  $('rotRange').value = p.rotate;
  $('flipCheck').checked = p.flip;
  $('brightRange').value = p.brightness;
  $('contrastRange').value = p.contrast;
  $('satRange').value = p.saturation;
  $('panelGrade').value = p.grade;
  syncGradeButtons();
  $('zoomVal').textContent = `${Math.round(p.zoom * 100)}%`;
  $('rotVal').textContent = `${p.rotate}°`;
  $('brightVal').textContent = p.brightness.toFixed(2);
  $('contrastVal').textContent = p.contrast.toFixed(2);
  $('satVal').textContent = p.saturation.toFixed(2);
}

function syncCaptionControls() {
  $('titleInput').value = state.title;
  $('subtitleInput').value = state.subtitle;
  $('captionSize').value = state.captionSize;
  $('captionColor').value = state.captionColor;
  $('outlineCheck').checked = state.captionOutline;
  $('spacingRange').value = state.captionSpacing;
  $('posSelect').value = state.captionPosition;
  $('sizeVal').textContent = `${Math.round(state.captionSize * 100)}%`;
}

function syncDressingControls() {
  const d = state.dressing;
  $('dressToggle').checked = d.show;
  $('dressRating').value = d.rating;
  $('dressScript').value = d.script;
  $('dressRibbon').value = d.ribbon;
  $('dressSticker').value = d.sticker;
  $('dressLocation').value = d.location;
  $('dressSkyline').checked = d.skyline;
  $('dressingBox').classList.toggle('off', !d.show);
}

function syncEffectControls() {
  $('fxDuotone').checked = state.effects.duotone;
  $('fxHalftone').checked = state.effects.halftone;
  $('fxGrain').checked = state.effects.grain;
  $('fxVignette').checked = state.effects.vignette;
}

function syncControls() {
  syncLayoutButtons();
  syncFontButtons();
  syncExportButtons();
  syncPanelControls();
  syncCaptionControls();
  syncDressingControls();
  syncEffectControls();
}

// ---- panel controls --------------------------------------------------------
function bindPanelControls() {
  const p = () => state.panels[state.selected];
  const photoSel = $('panelPhoto');
  photoSel.innerHTML = '';
  [...SAMPLES].forEach((s) => {
    const o = document.createElement('option');
    o.value = s.id;
    o.textContent = `${s.label} (${s.kind})`;
    photoSel.appendChild(o);
  });
  photoSel.addEventListener('change', () => {
    pushHistory();
    const s = SAMPLES.find((x) => x.id === photoSel.value);
    p().photo = photoSel.value;
    if (s) p().tag = s.label;
    syncPanelControls();
    render();
  });
  $('panelTag').addEventListener('change', () => {
    pushHistory();
    p().tag = $('panelTag').value.toUpperCase();
    render();
  });
  const live = (id, fn) => {
    $(id).addEventListener('input', () => { fn(parseFloat($(id).value)); render(); });
    $(id).addEventListener('change', () => { pushHistory(); syncPanelControls(); });
  };
  live('zoomRange', (v) => { p().zoom = v; $('zoomVal').textContent = `${Math.round(v * 100)}%`; });
  live('panXRange', (v) => { p().panX = v; });
  live('panYRange', (v) => { p().panY = v; });
  live('rotRange', (v) => { p().rotate = v; $('rotVal').textContent = `${v}°`; });
  live('brightRange', (v) => { p().brightness = v; $('brightVal').textContent = v.toFixed(2); });
  live('contrastRange', (v) => { p().contrast = v; $('contrastVal').textContent = v.toFixed(2); });
  live('satRange', (v) => { p().saturation = v; $('satVal').textContent = v.toFixed(2); });
  $('flipCheck').addEventListener('change', () => {
    pushHistory();
    p().flip = $('flipCheck').checked;
    render();
  });
  const gradeSel = $('panelGrade');
  gradeSel.innerHTML = '';
  GRADES.forEach((g) => {
    const o = document.createElement('option');
    o.value = g.id;
    o.textContent = g.name;
    gradeSel.appendChild(o);
  });
  gradeSel.addEventListener('change', () => {
    pushHistory();
    p().grade = gradeSel.value;
    syncGradeButtons();
    render();
  });
  $('gradeAllBtn').addEventListener('click', () => {
    pushHistory();
    state.panels.forEach((panel) => { panel.grade = p().grade; });
    render();
    showToast(`Grade ${p().grade} applied to all panels`);
  });
}

// ---- caption + dressing + effects ------------------------------------------
function bindCaptionControls() {
  $('titleInput').addEventListener('input', () => {
    state.title = $('titleInput').value.toUpperCase();
    render();
  });
  $('titleInput').addEventListener('change', pushHistory);
  $('subtitleInput').addEventListener('input', () => {
    state.subtitle = $('subtitleInput').value;
    state.subtitleAuto = false;
    render();
  });
  $('subtitleInput').addEventListener('change', pushHistory);
  $('captionSize').addEventListener('input', () => {
    state.captionSize = parseFloat($('captionSize').value);
    $('sizeVal').textContent = `${Math.round(state.captionSize * 100)}%`;
    render();
  });
  $('captionSize').addEventListener('change', pushHistory);
  $('captionColor').addEventListener('input', () => {
    state.captionColor = $('captionColor').value;
    render();
  });
  $('captionColor').addEventListener('change', pushHistory);
  $('outlineCheck').addEventListener('change', () => {
    pushHistory();
    state.captionOutline = $('outlineCheck').checked;
    render();
  });
  $('spacingRange').addEventListener('input', () => {
    state.captionSpacing = parseFloat($('spacingRange').value);
    render();
  });
  $('spacingRange').addEventListener('change', pushHistory);
  $('posSelect').addEventListener('change', () => {
    pushHistory();
    state.captionPosition = $('posSelect').value;
    render();
  });
}

function bindDressingControls() {
  const d = () => state.dressing;
  $('dressToggle').addEventListener('change', () => {
    pushHistory();
    d().show = $('dressToggle').checked;
    syncDressingControls();
    render();
  });
  const text = (id, key) => {
    $(id).addEventListener('input', () => { d()[key] = $(id).value; render(); });
    $(id).addEventListener('change', pushHistory);
  };
  text('dressRating', 'rating');
  text('dressScript', 'script');
  text('dressRibbon', 'ribbon');
  text('dressSticker', 'sticker');
  text('dressLocation', 'location');
  $('dressSkyline').addEventListener('change', () => {
    pushHistory();
    d().skyline = $('dressSkyline').checked;
    render();
  });
}

function bindEffectControls() {
  const map = [['fxDuotone', 'duotone'], ['fxHalftone', 'halftone'], ['fxGrain', 'grain'], ['fxVignette', 'vignette']];
  map.forEach(([id, key]) => {
    $(id).addEventListener('change', () => {
      pushHistory();
      state.effects[key] = $(id).checked;
      render();
    });
  });
}

// ---- uploads ---------------------------------------------------------------
function addUpload(file) {
  if (!file || !file.type.startsWith('image/')) return showToast('Pick an image file');
  const reader = new FileReader();
  reader.onload = async () => {
    const id = `up-${++uploadCount}`;
    uploadUrls.set(id, reader.result);
    try {
      const img = await loadImage(reader.result);
      images.set(id, img);
      pushHistory();
      const p = state.panels[state.selected];
      p.photo = id;
      p.tag = file.name.replace(/\.[^.]+$/, '').toUpperCase().slice(0, 18) || 'UPLOAD';
      const sel = $('panelPhoto');
      const o = document.createElement('option');
      o.value = id;
      o.textContent = `${p.tag} (upload)`;
      sel.appendChild(o);
      syncPanelControls();
      render();
      showToast(`Loaded ${file.name}`);
    } catch {
      showToast('Could not read that image');
    }
  };
  reader.readAsDataURL(file);
}

// ---- export ----------------------------------------------------------------
function downloadBlob(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
}

async function exportCurrent() {
  const size = EXPORT_SIZES.find((s) => s.id === state.exportSize);
  try {
    const blob = await exportPNG(state, images, size.w, size.h);
    downloadBlob(blob, `vice-poster-${size.w}x${size.h}.png`);
    showToast(`Exported PNG ${size.label}`);
  } catch {
    showToast('Export failed — try again');
  }
}

async function exportAll() {
  for (const size of EXPORT_SIZES) {
    const blob = await exportPNG(state, images, size.w, size.h);
    downloadBlob(blob, `vice-poster-${size.w}x${size.h}.png`);
  }
  showToast('Exported all 3 sizes');
}

// ---- canvas pointer: pick a panel, drag to pan, scroll to zoom -------------
function bindStagePointer() {
  let drag = null;
  stage.addEventListener('pointerdown', (e) => {
    const r = stage.getBoundingClientRect();
    const px = (e.clientX - r.left) * (stage.width / r.width);
    const py = (e.clientY - r.top) * (stage.height / r.height);
    const rects = layoutRects(state.layout, stage.width, stage.height);
    const hit = rects.findIndex((rc) => px >= rc.x && px <= rc.x + rc.w && py >= rc.y && py <= rc.y + rc.h);
    if (hit >= 0 && hit !== state.selected) {
      state.selected = hit;
      syncPanelControls();
      render();
    }
    drag = { x: e.clientX, y: e.clientY, panX: state.panels[state.selected].panX, panY: state.panels[state.selected].panY };
    stage.setPointerCapture(e.pointerId);
  });
  stage.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const r = stage.getBoundingClientRect();
    const p = state.panels[state.selected];
    p.panX = Math.max(-0.5, Math.min(0.5, drag.panX + (e.clientX - drag.x) / r.width));
    p.panY = Math.max(-0.5, Math.min(0.5, drag.panY + (e.clientY - drag.y) / r.height));
    render();
  });
  stage.addEventListener('pointerup', () => {
    if (drag) { pushHistory(); syncPanelControls(); }
    drag = null;
  });
  stage.addEventListener('wheel', (e) => {
    e.preventDefault();
    const p = state.panels[state.selected];
    p.zoom = Math.max(1, Math.min(3, p.zoom * (1 - Math.sign(e.deltaY) * 0.08)));
    render();
  }, { passive: false });
}

// ---- boot ------------------------------------------------------------------
async function boot() {
  const params = parseShotParams(window.location.search);
  if (params.mode === 'cover') document.body.classList.add('shot-cover');
  if (params.mode === 'editor') document.body.classList.add('shot-editor');
  state = applyShot(defaultState(), params);

  buildSamples();
  bindPanelControls();
  bindCaptionControls();
  bindDressingControls();
  bindEffectControls();
  bindStagePointer();
  $('fileInput').addEventListener('change', (e) => addUpload(e.target.files[0]));
  $('uploadBtn').addEventListener('click', () => $('fileInput').click());
  $('stageWrap').addEventListener('dragover', (e) => e.preventDefault());
  $('stageWrap').addEventListener('drop', (e) => {
    e.preventDefault();
    addUpload(e.dataTransfer.files[0]);
  });
  $('exportBtn').addEventListener('click', exportCurrent);
  $('exportAllBtn').addEventListener('click', exportAll);
  $('undoBtn').addEventListener('click', undo);
  $('surpriseBtn').addEventListener('click', () => {
    pushHistory();
    const keepSize = state.exportSize;
    state = surpriseState();
    state.exportSize = keepSize;
    syncControls();
    render();
    showToast('Surprise me — new layout, grade and photos');
  });
  document.addEventListener('keydown', (e) => {
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); return; }
    const layouts = ['hero2', 'hero3', 'grid', 'bleed', 'grid5'];
    const idx = ['1', '2', '3', '4', '5'].indexOf(e.key);
    if (idx >= 0) {
      pushHistory();
      state.layout = layouts[idx];
      fitPanelsToLayout(state);
      syncControls();
      render();
    } else if (e.key.toLowerCase() === 'e') {
      exportCurrent();
    } else if (e.key.toLowerCase() === 's') {
      $('surpriseBtn').click();
    }
  });

  // Load every bundled sample, then the fonts, then draw.
  await Promise.all(SAMPLES.map(async (s) => {
    try { images.set(s.id, await loadImage(s.src)); } catch { /* a missing sample just stays empty */ }
  }));
  try {
    await Promise.all([
      document.fonts.load('40px "Bebas Neue"'),
      document.fonts.load('40px Anton'),
      document.fonts.load('600 20px Oswald'),
      document.fonts.load('40px "Great Vibes"'),
    ]);
    await document.fonts.ready;
  } catch { /* canvas falls back to sans-serif */ }

  syncControls();
  render();
  window.__shotReady = true;
}

// Test hooks for the headless checks: the runner verifies exports and reads
// the live state without clicking anything.
window.__vice = {
  get state() { return state; },
  exportPNG: (w, h) => exportPNG(state, images, w, h),
  verifyExport: (w, h) => verifyExport(state, images, w, h),
  render,
};

boot().catch((err) => {
  console.error(err);
  const t = $('toast');
  if (t) { t.textContent = 'Could not start the studio'; t.classList.add('show'); }
});
