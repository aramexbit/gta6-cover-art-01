// Vice Poster Studio — main.js: wires the editor. Loads the samples and fonts, draws the
// live preview, binds every control, and exports the cover as a PNG in the three post sizes.
// A `?shot=` query hands control to shots.js for a fixed screenshot scene instead.
import { drawCover } from './poster.js';
import {
  SAMPLES, LAYOUTS, LAYOUT_NAMES, GRADES, GRADE_NAMES, EXPORT_SIZES, SCRIPT_LINES,
  defaultState, cloneState, panelsForLayout, sampleKeys,
} from './state.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const status = document.getElementById('status');
const params = new URLSearchParams(location.search);
const shot = params.get('shot');

let state = defaultState();
let images = {};
let undoStack = [];
let sliderActive = false;
let uploadCount = 0;

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function toast(text) {
  status.textContent = text;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { status.textContent = ''; }, 4000);
}

/** The preview follows the export size the user picked. */
function previewSize() {
  return EXPORT_SIZES[state.exportSize] ?? EXPORT_SIZES[0];
}

function redraw() {
  const size = previewSize();
  drawCover(canvas, state, images, size.w, size.h);
}

/** Records the state before a change, so Undo can bring it back (at most 30 steps). */
function snapshot() {
  undoStack.push(JSON.stringify(state));
  if (undoStack.length > 30) undoStack.shift();
}

function applyChange(fn) {
  snapshot();
  fn(state);
  redraw();
  syncControls();
}

function undo() {
  const prev = undoStack.pop();
  if (!prev) {
    toast('Nothing to undo.');
    return;
  }
  state = JSON.parse(prev);
  redraw();
  syncControls();
  toast('Undid the last change.');
}

/** Shuffles layout, grade, effects, photos and the script line. */
function surprise() {
  snapshot();
  const rnd = Math.random;
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  state.layout = pick(LAYOUTS);
  state.grade = pick(GRADES);
  state.duotone = pick(['none', 'none', 'sunset', 'teal', 'magenta']);
  state.halftone = rnd() > 0.5;
  state.grain = rnd() > 0.3;
  state.vignette = rnd() > 0.2;
  state.script = pick(SCRIPT_LINES);
  const keys = sampleKeys().slice();
  for (let i = keys.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [keys[i], keys[j]] = [keys[j], keys[i]];
  }
  state.panels.forEach((p, i) => {
    p.photo = keys[i % keys.length];
    p.zoom = 1 + rnd() * 0.4;
    p.panX = (rnd() - 0.5) * 0.3;
    p.panY = (rnd() - 0.5) * 0.3;
    p.rotate = Math.round((rnd() - 0.5) * 10);
  });
  redraw();
  syncControls();
  toast('Surprise! New layout, grade and photos.');
}

/** Renders one size to a fresh canvas and downloads it as a PNG. */
function exportSize(index) {
  const size = EXPORT_SIZES[index] ?? EXPORT_SIZES[0];
  const off = document.createElement('canvas');
  drawCover(off, state, images, size.w, size.h);
  off.toBlob((blob) => {
    if (!blob) {
      toast('Export failed.');
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `golden-hour-getaway-${size.w}x${size.h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    toast(`Exported ${size.label} PNG.`);
  }, 'image/png');
}

/** Exports all three post sizes, one file each. */
function exportAll() {
  EXPORT_SIZES.forEach((size, i) => {
    setTimeout(() => exportSize(i), i * 350);
  });
  toast('Exporting all three sizes…');
}

/** Test hook the screenshot runner uses: renders all three sizes and reads each PNG's own
 * width and height back from its header, so the exact sizes can be checked. */
window.__exportAll = () => EXPORT_SIZES.map((size) => {
  const off = document.createElement('canvas');
  drawCover(off, state, images, size.w, size.h);
  const url = off.toDataURL('image/png');
  const bin = atob(url.split(',')[1]);
  const view = new DataView(new ArrayBuffer(32));
  for (let i = 0; i < 32; i++) view.setUint8(i, bin.charCodeAt(i));
  return { asked: [size.w, size.h], png: [view.getUint32(16), view.getUint32(20)], bytes: bin.length };
});

function buildButtons(row, items, names, get, set) {
  row.innerHTML = '';
  items.forEach((item, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.textContent = names[item];
    b.dataset.value = item;
    b.addEventListener('click', () => applyChange((s) => set(s, item)));
    row.appendChild(b);
    void i;
  });
}

function buildSampleThumbs() {
  const row = document.getElementById('sampleRow');
  row.innerHTML = '';
  sampleKeys().forEach((key) => {
    const img = document.createElement('img');
    img.src = SAMPLES[key];
    img.alt = key;
    img.className = 'thumb';
    img.title = `Use ${key} in the selected panel`;
    img.addEventListener('click', () => {
      applyChange((s) => { s.panels[s.selected].photo = key; });
      toast(`Panel ${state.selected + 1} now shows ${key}.`);
    });
    row.appendChild(img);
  });
}

function bindPanelSlider(id, key, scale = 1) {
  const el = document.getElementById(id);
  const label = document.getElementById(`${id}Val`);
  el.addEventListener('input', () => {
    if (!sliderActive) {
      snapshot();
      sliderActive = true;
    }
    state.panels[state.selected][key] = Number(el.value) * scale;
    if (label) label.textContent = el.value;
    redraw();
  });
  el.addEventListener('change', () => {
    sliderActive = false;
    syncControls();
  });
}

function bindControls() {
  buildButtons(document.getElementById('layoutRow'), LAYOUTS, LAYOUT_NAMES, null, (s, v) => { s.layout = v; });
  buildButtons(document.getElementById('gradeRow'), GRADES, GRADE_NAMES, null, (s, v) => { s.grade = v; });
  buildSampleThumbs();

  const duotone = document.getElementById('duotone');
  duotone.addEventListener('change', () => applyChange((s) => { s.duotone = duotone.value; }));
  [['halftone', 'halftone'], ['grain', 'grain'], ['vignette', 'vignette'], ['dressing', 'dressing']].forEach(([id, key]) => {
    document.getElementById(id).addEventListener('change', (e) => applyChange((s) => { s[key] = e.target.checked; }));
  });

  const caption = (id, key) => {
    const el = document.getElementById(id);
    let armed = false;
    el.addEventListener('focus', () => {
      if (!armed) {
        snapshot();
        armed = true;
      }
    });
    el.addEventListener('blur', () => { armed = false; });
    el.addEventListener('input', (e) => {
      state[key] = e.target.value;
      redraw();
    });
  };
  caption('titleInput', 'title');
  caption('scriptInput', 'script');
  caption('locationInput', 'location');
  caption('ribbonInput', 'ribbon');

  const panelSelect = document.getElementById('panelSelect');
  panelSelect.addEventListener('change', () => {
    state.selected = Number(panelSelect.value);
    syncControls();
    redraw();
  });

  bindPanelSlider('zoom', 'zoom');
  bindPanelSlider('panX', 'panX', 0.01);
  bindPanelSlider('panY', 'panY', 0.01);
  bindPanelSlider('rotate', 'rotate');
  bindPanelSlider('bright', 'bright');
  bindPanelSlider('contrast', 'contrast');
  bindPanelSlider('sat', 'sat');
  document.getElementById('flip').addEventListener('change', (e) => applyChange((s) => { s.panels[s.selected].flip = e.target.checked; }));
  const panelCaptionEl = document.getElementById('panelCaption');
  let captionArmed = false;
  panelCaptionEl.addEventListener('focus', () => {
    if (!captionArmed) {
      snapshot();
      captionArmed = true;
    }
  });
  panelCaptionEl.addEventListener('blur', () => { captionArmed = false; });
  panelCaptionEl.addEventListener('input', (e) => {
    state.panels[state.selected].caption = e.target.value;
    redraw();
  });

  document.getElementById('upload').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const url = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });
    const img = await loadImage(url);
    const key = `upload-${++uploadCount}`;
    images[key] = img;
    applyChange((s) => { s.panels[s.selected].photo = key; });
    toast(`Your photo is in panel ${state.selected + 1}.`);
  });

  const sizeSelect = document.getElementById('exportSize');
  EXPORT_SIZES.forEach((size, i) => {
    const opt = document.createElement('option');
    opt.value = String(i);
    opt.textContent = `${size.label} PNG`;
    sizeSelect.appendChild(opt);
  });
  sizeSelect.addEventListener('change', () => {
    state.exportSize = Number(sizeSelect.value);
    redraw();
  });

  document.getElementById('exportBtn').addEventListener('click', () => exportSize(state.exportSize));
  document.getElementById('exportAllBtn').addEventListener('click', exportAll);
  document.getElementById('undoBtn').addEventListener('click', undo);
  document.getElementById('surpriseBtn').addEventListener('click', surprise);

  document.addEventListener('keydown', (e) => {
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      undo();
      return;
    }
    if (e.key >= '1' && e.key <= '5') {
      const layout = LAYOUTS[Number(e.key) - 1];
      if (layout) applyChange((s) => { s.layout = layout; });
    } else if (e.key.toLowerCase() === 'e') {
      exportSize(state.exportSize);
    } else if (e.key.toLowerCase() === 's') {
      surprise();
    }
  });
}

/** Copies the state into every control: buttons, sliders, inputs and the panel picker. */
function syncControls() {
  const mark = (row, value) => {
    row.querySelectorAll('.chip').forEach((b) => b.classList.toggle('active', b.dataset.value === value));
  };
  mark(document.getElementById('layoutRow'), state.layout);
  mark(document.getElementById('gradeRow'), state.grade);
  document.getElementById('duotone').value = state.duotone;
  document.getElementById('halftone').checked = state.halftone;
  document.getElementById('grain').checked = state.grain;
  document.getElementById('vignette').checked = state.vignette;
  document.getElementById('dressing').checked = state.dressing;
  document.getElementById('titleInput').value = state.title;
  document.getElementById('scriptInput').value = state.script;
  document.getElementById('locationInput').value = state.location;
  document.getElementById('ribbonInput').value = state.ribbon;
  document.getElementById('exportSize').value = String(state.exportSize);

  const panelSelect = document.getElementById('panelSelect');
  const slots = panelsForLayout(state.layout);
  panelSelect.innerHTML = '';
  slots.forEach((slot) => {
    const opt = document.createElement('option');
    opt.value = String(slot);
    opt.textContent = slot === 0 ? 'Hero panel' : `Panel ${slot + 1}`;
    panelSelect.appendChild(opt);
  });
  if (!slots.includes(state.selected)) state.selected = slots[0];
  panelSelect.value = String(state.selected);

  const panel = state.panels[state.selected];
  const setSlider = (id, value) => {
    const el = document.getElementById(id);
    el.value = String(value);
    const label = document.getElementById(`${id}Val`);
    if (label) label.textContent = String(value);
  };
  setSlider('zoom', panel.zoom);
  setSlider('panX', Math.round(panel.panX * 100));
  setSlider('panY', Math.round(panel.panY * 100));
  setSlider('rotate', panel.rotate);
  setSlider('bright', panel.bright);
  setSlider('contrast', panel.contrast);
  setSlider('sat', panel.sat);
  document.getElementById('flip').checked = panel.flip;
  document.getElementById('panelCaption').value = panel.caption;
  document.querySelectorAll('#sampleRow .thumb').forEach((img, i) => {
    img.classList.toggle('active', sampleKeys()[i] === panel.photo);
  });
}

async function loadSamples() {
  for (const key of sampleKeys()) {
    images[key] = await loadImage(SAMPLES[key]);
  }
}

async function loadFonts() {
  await Promise.all([
    document.fonts.load('100px Anton'),
    document.fonts.load('100px "Bebas Neue"'),
    document.fonts.load('600 100px Oswald'),
    document.fonts.load('100px "Great Vibes"'),
  ]);
  await document.fonts.ready;
}

await loadFonts();
await loadSamples();
bindControls();
syncControls();
redraw();
window.__ready = true;
if (shot) {
  await runShot(shot, params, { state, images, canvas, redraw, syncControls });
}
