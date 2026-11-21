// Vice Poster Studio — shots.js: turns a screenshot URL query into a state.
// The runner drives the app with ?shot=cover|editor|verify plus photo,
// caption, layout and grade, so every screenshot is a reproducible render.

import { layoutById, gradeById, sampleById, fitPanelsToLayout, sizeById } from './state.js';

// The four scenes the runner screenshots, in the order shots.json lists
// them. The first is the cover: it is the entry's face on the board.
export function applyShot(state, params) {
  if (params.layout && layoutById(params.layout)) {
    state.layout = params.layout;
    fitPanelsToLayout(state);
  }
  if (params.grade && gradeById(params.grade)) {
    state.panels.forEach((p) => { p.grade = params.grade; });
  }
  if (params.photo && sampleById(params.photo)) {
    state.panels[0].photo = params.photo;
  }
  if (params.caption) {
    state.title = params.caption.toUpperCase();
  }
  if (params.size) state.exportSize = params.size;
  if (params.dressing === 'off') state.dressing.show = false;
  // A cover scene is the cover alone: dressing on, effects on, no editor.
  if (params.mode === 'cover') {
    state.dressing.show = true;
    state.dressing.skyline = true;
    state.effects.grain = true;
    state.effects.vignette = true;
  }
  return state;
}

export function shotTitle(params) {
  if (params.mode === 'cover') return `${params.caption || 'Cover'} — exported cover`;
  if (params.mode === 'verify') return 'export check';
  return `${params.layout || 'grid5'} — editor`;
}

export { sizeById };
