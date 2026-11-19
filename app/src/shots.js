// Fixed scenes for screenshots.
// ?shot=cover&photo=<sample>&caption=<text>&layout=<layout>&grade=<grade>&size=<WxH>
//   shows the finished cover alone, fullscreen.
// ?shot=editor&photo=<sample>&caption=<text>&layout=<layout>&grade=<grade>
//   shows the full studio with a sample loaded.
// window.__shotReady is set once the cover is painted (double rAF), so a
// screenshot runner knows the scene is settled.

import { defaultState, panelsForLayout, subtitleForPanels } from './state.js';
import { LAYOUTS } from './poster.js';

const PHOTOS = {
  portrait: 'samples/vice-portrait.jpg',
  boulevard: 'samples/vice-boulevard.jpg',
  pier: 'samples/vice-pier.jpg',
  convertible: 'samples/vice-convertible.jpg',
  neonstreet: 'samples/vice-neonstreet.jpg',
  fishing: 'samples/vice-fishing.jpg',
  kitboulevard: 'samples/boulevard.jpg',
  kitpier: 'samples/pier.jpg',
};

export async function runShot(shot, query, api) {
  const state = defaultState();
  const photo = PHOTOS[query.get('photo')] || PHOTOS.portrait;
  const layout = query.get('layout') || 'hero2';
  const grade = query.get('grade') || 'sunset';
  state.layout = layout;
  state.grade = grade;
  state.title = query.get('caption') || 'NEON BOULEVARD';
  // Dynamic subtitle: explicit ?subtitle= wins, otherwise match the panel count.
  if (query.get('subtitle') !== null) state.subtitle = query.get('subtitle');
  else state.subtitle = subtitleForPanels((LAYOUTS[layout] || LAYOUTS.hero2).panels);
  if (query.get('font')) state.font = query.get('font');
  if (query.get('size')) state.size = query.get('size');
  if (query.get('dressing') === 'off') state.dressing.on = false;
  state.panels = panelsForLayout(state, layout);
  // Each panel gets a different photo: the requested one first, then the
  // other samples in turn, so no layout ever shows the same photo twice.
  // The note travels with its photo (the cycle order differs from the
  // default panel order, so reusing the positional notes would mislabel
  // panels — e.g. 'OCEAN DRIVE' on the portrait). The hero keeps no note.
  const NOTE_BY_PHOTO = {
    'samples/vice-portrait.jpg': 'NEON PORTRAIT',
    'samples/vice-boulevard.jpg': 'OCEAN DRIVE',
    'samples/vice-pier.jpg': 'NIGHT PIER',
    'samples/vice-convertible.jpg': 'GOLDEN HOUR',
    'samples/vice-neonstreet.jpg': 'NEON RAIN',
    'samples/vice-fishing.jpg': 'PIER LIFE',
    'samples/boulevard.jpg': 'PALM ROW',
    'samples/pier.jpg': 'OLD PIER',
  };
  const cycle = [photo, 'samples/vice-portrait.jpg', 'samples/vice-boulevard.jpg', 'samples/vice-pier.jpg', 'samples/vice-convertible.jpg', 'samples/vice-neonstreet.jpg', 'samples/vice-fishing.jpg', 'samples/boulevard.jpg', 'samples/pier.jpg'];
  const heroPhotos = [...new Set(cycle)];
  state.panels.forEach((p, i) => {
    p.photo = heroPhotos[i % heroPhotos.length];
    if (i > 0) p.note = NOTE_BY_PHOTO[p.photo] || '';
    p.zoom = 1.25;
  });
  if (shot === 'cover') document.body.classList.add('shot-cover');
  if (shot === 'editor') document.body.classList.add('shot-editor');
  await api.apply(state);
  await document.fonts.ready;
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
