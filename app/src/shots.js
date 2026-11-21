// Vice Poster Studio — shots.js: fixed scenes for screenshots. `?shot=cover` shows the
// exported cover alone at its post size; `?shot=editor` shows the full editor with a
// sample photo loaded. `photo` picks the hero sample, `caption` the title, `layout` and
// `grade` the look, `size` the export size. window.__shotReady is set once painted.
import { drawCover } from './poster.js';
import { EXPORT_SIZES } from './state.js';

export async function runShot(shot, query, api) {
  const { state, images, canvas } = api;
  const photo = query.get('photo');
  if (photo) state.panels[0].photo = photo;
  const caption = query.get('caption');
  if (caption) state.title = caption;
  const layout = query.get('layout');
  if (layout) state.layout = layout;
  const grade = query.get('grade');
  if (grade) state.grade = grade;
  const sizeName = query.get('size');
  if (sizeName) {
    const idx = EXPORT_SIZES.findIndex((s) => `${s.w}x${s.h}` === sizeName);
    if (idx >= 0) state.exportSize = idx;
  }
  if (api.syncControls) api.syncControls();
  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
    const size = EXPORT_SIZES[state.exportSize] ?? EXPORT_SIZES[0];
    drawCover(canvas, state, images, size.w, size.h);
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.objectFit = 'contain';
  } else {
    document.body.classList.add('shot-editor');
    api.redraw();
  }
  await document.fonts.ready;
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  window.__shotReady = true;
}
