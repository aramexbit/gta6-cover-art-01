// Vice Poster Studio — main.js: the studio UI. It owns the state, draws the
// preview through poster.js, and wires every control. The same state object
// feeds the export, so what you see is what the PNG is.

import { SAMPLES, LAYOUTS, GRADES, EXPORT_SIZES, defaultState, cloneState, fitPanelsToLayout, layoutById, sampleById, gradeById, sizeById } from './state.js';
import { renderCover, exportPNG, verifyExport, loadImage } from './poster.js';
import { applyShot } from './shots.js';

const $ = (sel) => document.querySelector(sel);
const params = new URLSearchParams(location.search);
const shotMode = params.get('shot') || '';

// A sample's file is either a bundled path under samples/ or a data URL
// from an upload; both are valid image sources.
const sampleSrc = (s) => (s.file.startsWith('data:') ? s.file : 'samples/' + s.file);

let state = defaultState();
let history = [];
let customCount = 0;

function pushHistory() {
  history.push(JSON.stringify(state));
  if (history.length > 50) history.shift();
}

function undo() {
  if (!history.length) return;
  state = JSON.parse(history.pop());
  buildControls();
  drawPreview();
  toast('Undone');
}

function toast(msg) {
  const t = $('#toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('on');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('on'), 1800);
}

function previewDims() {
  const size = sizeById(state.exportSize);
  const max = 960;
  const scale = Math.min(1, max / Math.max(size.w, size.h));
  return { w: Math.round(size.w * scale), h: Math.round(size.h * scale) };
}

async function drawPreview() {
  const canvas = $('#preview');
  if (!canvas) return;
  const { w, h } = previewDims();
  canvas.width = w;
  canvas.height = h;
  const drawn = await renderCover(state, w, h);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(drawn, 0, 0);
  const label = $('#previewLabel');
  if (label) label.textContent = `Preview — ${state.exportSize} (${w} x ${h})`;
  buildThumbs();
}

function buildThumbs() {
  const wrap = $('#thumbs');
  if (!wrap) return;
  wrap.innerHTML = '';
  state.panels.forEach((p, i) => {
    const sample = sampleById(p.photo);
    const b = document.createElement('button');
    b.className = 'thumb' + (i === state.selected ? ' sel' : '');
    b.type = 'button';
    const img = document.createElement('img');
    img.src = sample ? sampleSrc(sample) : '';
    img.alt = sample ? sample.label : '';
    const cap = document.createElement('span');
    cap.textContent = `${i + 1} - ${(sample ? sample.label : '').slice(0, 14)}`;
    b.append(img, cap);
    b.onclick = () => { state.selected = i; buildControls(); drawPreview(); };
    wrap.appendChild(b);
  });
}

function buildControls() {
  // Layout buttons.
  const lb = $('#layoutBtns');
  if (lb) {
    lb.innerHTML = '';
    LAYOUTS.forEach((l, i) => {
      const b = document.createElement('button');
      b.className = 'pill' + (state.layout === l.id ? ' on' : '');
      b.type = 'button';
      b.textContent = l.name;
      b.onclick = () => {
        pushHistory();
        state.layout = l.id;
        fitPanelsToLayout(state);
        buildControls();
        drawPreview();
      };
      b.title = `Shortcut ${i + 1}`;
      lb.appendChild(b);
    });
  }
  // Photo grid.
  const pg = $('#photoGrid');
  if (pg) {
    pg.innerHTML = '';
    SAMPLES.forEach((s) => {
      const b = document.createElement('button');
      b.className = 'photo' + (state.panels[state.selected].photo === s.id ? ' sel' : '');
      b.type = 'button';
      const img = document.createElement('img');
      img.src = sampleSrc(s);
      img.alt = s.label;
      const cap = document.createElement('span');
      cap.textContent = s.label.slice(0, 12);
      b.append(img, cap);
      b.onclick = () => {
        pushHistory();
        state.panels[state.selected].photo = s.id;
        buildControls();
        drawPreview();
      };
      pg.appendChild(b);
    });
  }
  // Selected panel controls.
  const p = state.panels[state.selected];
  const setVal = (id, v) => { const el = $(id); if (el) el.value = v; };
  setVal('#panelPhoto', p.photo);
  setVal('#panelZoom', p.zoom);
  setVal('#panelRotate', p.rotate);
  setVal('#panelBright', p.brightness);
  setVal('#panelContrast', p.contrast);
  setVal('#panelSat', p.saturation);
  setVal('#panelGrade', p.grade);
  const flip = $('#panelFlip');
  if (flip) flip.classList.toggle('on', p.flip);
  const sel = $('#selectedLabel');
  if (sel) sel.textContent = `Selected panel ${state.selected + 1} of ${state.panels.length}`;
  // Caption.
  setVal('#capTitle', state.title);
  setVal('#capFont', state.captionFont);
  setVal('#capSize', state.captionSize);
  setVal('#capColor', state.captionColor);
  setVal('#capPosition', state.captionPosition);
  // Dressing.
  const d = state.dressing;
  const chk = (id, v) => { const el = $(id); if (el) el.checked = v; };
  chk('#dressShow', d.show);
  chk('#dressSkyline', d.skyline);
  setVal('#dressRibbon', d.ribbon);
  setVal('#dressScript', d.script);
  setVal('#dressLocation', d.location);
  setVal('#dressRating', d.rating);
  const rv = $('#ratingVal');
  if (rv) rv.textContent = d.rating.toFixed(1);
  // Effects.
  chk('#fxGrain', state.effects.grain);
  chk('#fxVignette', state.effects.vignette);
  chk('#fxDuotone', state.effects.duotone);
  chk('#fxHalftone', state.effects.halftone);
  setVal('#exportSize', state.exportSize);
}

function bind(id, event, fn) {
  const el = $(id);
  if (el) el.addEventListener(event, fn);
}

function bindControls() {
  bind('#panelPhoto', 'change', (e) => {
    pushHistory();
    state.panels[state.selected].photo = e.target.value;
    buildControls(); drawPreview();
  });
  const range = (id, key) => bind(id, 'input', (e) => {
    state.panels[state.selected][key] = parseFloat(e.target.value);
    drawPreview();
  });
  range('#panelZoom', 'zoom');
  range('#panelBright', 'brightness');
  range('#panelContrast', 'contrast');
  range('#panelSat', 'saturation');
  bind('#panelRotate', 'input', (e) => {
    state.panels[state.selected].rotate = parseFloat(e.target.value);
    drawPreview();
  });
  bind('#panelRotate', 'change', () => pushHistory());
  ['#panelZoom', '#panelBright', '#panelContrast', '#panelSat'].forEach((id) => {
    bind(id, 'change', () => pushHistory());
  });
  bind('#panelFlip', 'click', () => {
    pushHistory();
    state.panels[state.selected].flip = !state.panels[state.selected].flip;
    buildControls(); drawPreview();
  });
  bind('#panelGrade', 'change', (e) => {
    pushHistory();
    state.panels[state.selected].grade = e.target.value;
    drawPreview();
  });
  bind('#capTitle', 'input', (e) => { state.title = e.target.value.toUpperCase(); drawPreview(); });
  bind('#capTitle', 'change', () => pushHistory());
  bind('#capFont', 'change', (e) => { pushHistory(); state.captionFont = e.target.value; drawPreview(); });
  bind('#capSize', 'input', (e) => { state.captionSize = parseFloat(e.target.value); drawPreview(); });
  bind('#capSize', 'change', () => pushHistory());
  bind('#capColor', 'input', (e) => { state.captionColor = e.target.value; drawPreview(); });
  bind('#capPosition', 'change', (e) => { pushHistory(); state.captionPosition = e.target.value; drawPreview(); });
  bind('#dressShow', 'change', (e) => { pushHistory(); state.dressing.show = e.target.checked; drawPreview(); });
  bind('#dressSkyline', 'change', (e) => { pushHistory(); state.dressing.skyline = e.target.checked; drawPreview(); });
  bind('#dressRibbon', 'input', (e) => { state.dressing.ribbon = e.target.value.toUpperCase(); drawPreview(); });
  bind('#dressRibbon', 'change', () => pushHistory());
  bind('#dressScript', 'input', (e) => { state.dressing.script = e.target.value; drawPreview(); });
  bind('#dressScript', 'change', () => pushHistory());
  bind('#dressLocation', 'input', (e) => { state.dressing.location = e.target.value.toUpperCase(); drawPreview(); });
  bind('#dressLocation', 'change', () => pushHistory());
  bind('#dressRating', 'input', (e) => {
    state.dressing.rating = parseFloat(e.target.value);
    const rv = $('#ratingVal');
    if (rv) rv.textContent = state.dressing.rating.toFixed(1);
    drawPreview();
  });
  bind('#dressRating', 'change', () => pushHistory());
  bind('#fxGrain', 'change', (e) => { pushHistory(); state.effects.grain = e.target.checked; drawPreview(); });
  bind('#fxVignette', 'change', (e) => { pushHistory(); state.effects.vignette = e.target.checked; drawPreview(); });
  bind('#fxDuotone', 'change', (e) => { pushHistory(); state.effects.duotone = e.target.checked; drawPreview(); });
  bind('#fxHalftone', 'change', (e) => { pushHistory(); state.effects.halftone = e.target.checked; drawPreview(); });
  bind('#exportSize', 'change', (e) => { state.exportSize = e.target.value; drawPreview(); });
  bind('#undoBtn', 'click', undo);
  bind('#surpriseBtn', 'click', surprise);
  bind('#exportBtn', 'click', () => doExport(state.exportSize));
  bind('#exportAllBtn', 'click', async () => {
    for (const s of EXPORT_SIZES) await doExport(s.id);
    toast('All sizes exported');
  });
  bind('#uploadBtn', 'click', () => { const f = $('#uploadInput'); if (f) f.click(); });
  bind('#uploadInput', 'change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const dataUrl = await new Promise((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.readAsDataURL(file);
    });
    customCount += 1;
    const id = 'custom-' + customCount;
    SAMPLES.push({ id, file: dataUrl, label: file.name.replace(/\.[^.]+$/, '').toUpperCase().slice(0, 14) || 'MY PHOTO', kind: 'photo' });
    pushHistory();
    state.panels[state.selected].photo = id;
    buildControls();
    drawPreview();
    toast('Photo added');
  });
  document.addEventListener('keydown', (e) => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA')) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); return; }
    if (e.key >= '1' && e.key <= '5') {
      const l = LAYOUTS[Number(e.key) - 1];
      if (l) {
        pushHistory();
        state.layout = l.id;
        fitPanelsToLayout(state);
        buildControls(); drawPreview();
      }
    } else if (e.key.toLowerCase() === 'e') {
      doExport(state.exportSize);
    } else if (e.key.toLowerCase() === 's') {
      surprise();
    }
  });
}

async function doExport(sizeId) {
  const size = sizeById(sizeId);
  toast(`Rendering ${size.label}…`);
  const { blob } = await exportPNG(state, sizeId);
  if (!blob) { toast('Export failed'); return; }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `vice-poster-${sizeId}.png`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  toast(`Exported ${size.label} PNG`);
}

const SCRIPTS = ['chasing the last light', 'neon after midnight', 'salt air and static', 'the city never sleeps', 'golden hour runaways'];

function surprise() {
  pushHistory();
  const li = Math.floor(Math.random() * LAYOUTS.length);
  state.layout = LAYOUTS[li].id;
  fitPanelsToLayout(state);
  const g = GRADES[Math.floor(Math.random() * GRADES.length)];
  state.panels.forEach((p) => { p.grade = g.id; });
  state.captionSize = 0.85 + Math.random() * 0.3;
  state.dressing.script = SCRIPTS[Math.floor(Math.random() * SCRIPTS.length)];
  // Shuffle the panel photos.
  const pool = [...SAMPLES].sort(() => Math.random() - 0.5);
  state.panels.forEach((p, i) => { p.photo = pool[i % pool.length].id; });
  buildControls();
  drawPreview();
  toast('Surprise!');
}

// ---- Shot modes (driven by the screenshot runner) ----
async function coverShot() {
  document.body.classList.add('shot-cover');
  const canvas = $('#preview');
  // Exact size from the query (the runner passes w/h): never trust the
  // window size — headless Chrome's innerHeight does not equal the window.
  const w = parseInt(params.get('w') || '', 10) || window.innerWidth;
  const h = parseInt(params.get('h') || '', 10) || window.innerHeight;
  canvas.width = w;
  canvas.height = h;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  const drawn = await renderCover(state, w, h);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(drawn, 0, 0);
  document.title = 'cover';
}

async function verifyShot() {
  const results = await verifyExport(state);
  document.body.textContent = JSON.stringify(results);
  document.title = 'verify done';
}

async function init() {
  // Fill the selects from the catalogues.
  const photoSel = $('#panelPhoto');
  if (photoSel) {
    SAMPLES.forEach((s) => {
      const o = document.createElement('option');
      o.value = s.id;
      o.textContent = `${s.label} (${s.kind})`;
      photoSel.appendChild(o);
    });
  }
  const gradeSel = $('#panelGrade');
  if (gradeSel) {
    GRADES.forEach((g) => {
      const o = document.createElement('option');
      o.value = g.id;
      o.textContent = g.name;
      gradeSel.appendChild(o);
    });
  }
  if (shotMode) {
    applyShot(state, {
      mode: shotMode,
      layout: params.get('layout'),
      grade: params.get('grade'),
      photo: params.get('photo'),
      caption: params.get('caption'),
      size: params.get('size'),
      dressing: params.get('dressing'),
    });
  }
  if (shotMode === 'verify') {
    await verifyShot();
    return;
  }
  bindControls();
  buildControls();
  if (shotMode === 'cover') {
    await coverShot();
    return;
  }
  await drawPreview();
}

init();
