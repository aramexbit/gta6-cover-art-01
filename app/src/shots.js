// shots.js — Vice Poster Studio: screenshot scenes.
// The headless runner opens the app with a query string (?shot=cover or
// ?shot=editor, plus layout/grade/photo/caption) and this module turns it
// into a state the app renders. Cover scenes show only the finished cover,
// full frame; editor scenes show the whole studio with a photo loaded.
// Nothing here touches the network: every photo is a bundled sample.

import { layoutById, gradeById, subtitleFor, fitPanelsToLayout, sampleById } from './state.js';

export const SHOT_MODES = ['cover', 'editor'];

// Read the scene out of the URL. Unknown values fall back to the defaults,
// so a plain visit (no query) just opens the studio.
export function parseShotParams(search) {
  const q = new URLSearchParams(search || '');
  const shot = q.get('shot');
  return {
    mode: SHOT_MODES.includes(shot) ? shot : 'editor',
    layout: q.get('layout') || null,
    grade: q.get('grade') || null,
    photo: q.get('photo') || null,
    caption: q.get('caption') || null,
    size: q.get('size') || null,
    dressing: q.get('dressing') || null,
  };
}

// Apply a scene to a fresh default state and hand it back. The hero photo
// is the one the query names (a photographic sample for the main cover);
// the other panels keep the defaults, and the caption becomes the title
// the query asked for.
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
    state.panels[0].tag = sampleById(params.photo).label;
  }
  if (params.caption) {
    state.title = params.caption.toUpperCase();
  }
  if (params.size) state.exportSize = params.size;
  // ?dressing=off hides the dressing for a clean cover variant.
  if (params.dressing === 'off') {
    state.dressing.show = false;
    state.dressing.skyline = false;
  }
  // A cover scene is the cover alone: dressing on, effects on, no editor.
  if (params.mode === 'cover') {
    state.dressing.show = true;
    state.dressing.skyline = true;
    state.effects.grain = true;
    state.effects.vignette = true;
  }
  return state;
}

// The four scenes the runner screenshots, in the order shots.json lists
// them. The first is the cover: it is the entry's face on the board.
export function shotTitle(params) {
  if (params.mode === 'cover') return `${params.caption || 'Cover'} — exported cover`;
  return `${params.layout || 'grid5'} — editor`;
}

export { subtitleFor };
