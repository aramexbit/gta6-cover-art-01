// Fixed scenes for screenshots.
// ?shot=cover&photo=<sample>&caption=<text>&layout=<layout>&grade=<grade>&size=<WxH>
//   shows the finished cover alone, fullscreen.
// ?shot=editor&photo=<sample>&caption=<text>&layout=<layout>&grade=<grade>
//   shows the full studio with a sample loaded.
// window.__shotReady is set once the cover is painted (double rAF), so a
// screenshot runner knows the scene is settled.

import { defaultState, panelsForLayout } from './state.js';

const PHOTOS = {
  portrait: 'samples/vice-portrait.jpg',
  boulevard: 'samples/vice-boulevard.jpg',
  pier: 'samples/vice-pier.jpg',
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
  if (query.get('subtitle') !== null) state.subtitle = query.get('subtitle');
  if (query.get('font')) state.font = query.get('font');
  if (query.get('size')) state.size = query.get('size');
  state.panels = panelsForLayout(state, layout);
  // Each panel gets a different photo: the requested one first, then the
  // other samples in turn, so no layout ever shows the same photo twice.
  const cycle = [photo, 'samples/vice-portrait.jpg', 'samples/vice-boulevard.jpg', 'samples/vice-pier.jpg', 'samples/boulevard.jpg', 'samples/pier.jpg'];
  const heroPhotos = [...new Set(cycle)];
  state.panels.forEach((p, i) => {
    p.photo = heroPhotos[i % heroPhotos.length];
    p.zoom = 1.25;
  });
  if (shot === 'cover') document.body.classList.add('shot-cover');
  await api.apply(state);
  await document.fonts.ready;
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
