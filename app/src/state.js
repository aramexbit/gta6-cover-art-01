// Vice Poster Studio — poster state, sample catalogue, undo history and the
// "Surprise me" randomiser. State is plain JSON (photos are ids into the image
// cache), so undo is a snapshot stack and export is a pure render of state.

import { GRADES, LAYOUTS, DRESSING_DEFAULT } from './poster.js';

export const SAMPLES = [
  { id: 'samples/vice-portrait.jpg', label: 'Neon portrait' },
  { id: 'samples/vice-boulevard.jpg', label: 'Sunset boulevard' },
  { id: 'samples/vice-pier.jpg', label: 'Neon pier' },
  { id: 'samples/vice-convertible.jpg', label: 'Sunset convertible' },
  { id: 'samples/vice-neonstreet.jpg', label: 'Neon rain street' },
  { id: 'samples/vice-fishing.jpg', label: 'Pier fishing' },
  { id: 'samples/boulevard.jpg', label: 'Boulevard (kit)' },
  { id: 'samples/pier.jpg', label: 'Pier (kit)' },
];

export const SIZES = [
  { label: '1080 x 1080', w: 1080, h: 1080 },
  { label: '1080 x 1350', w: 1080, h: 1350 },
  { label: '1920 x 1080', w: 1920, h: 1080 },
];

export const FONTS = ['Bebas Neue', 'Anton', 'Oswald'];

const SURPRISE_TITLES = [
  'NEON BOULEVARD', 'SUNSET HEIST', 'PALM TREE NIGHTS', 'VICE AFTER DARK',
  'MIDNIGHT DRIVE', 'OCEAN AVENUE', 'GOLDEN HOUR', 'NEON TIDE',
];

function defaultPanel(photo, note) {
  return {
    photo, zoom: 1.2, panX: 0, panY: 0, rot: 0, flip: false,
    bright: 1, contrast: 1.05, sat: 1.15, note: note || '',
  };
}

/** The poster's starting state: a finished cover on first open, never empty. */
export function defaultState() {
  return {
    layout: 'grid5',
    grade: 'sunset',
    fx: { duotone: false, halftone: true, grain: true, vignette: true },
    title: 'NEON BOULEVARD',
    subtitle: subtitleForPanels(5),
    font: 'Bebas Neue',
    titleSize: 118,
    titleColor: '#ffffff',
    outline: 6,
    spacing: 4,
    captionPos: 'bottom',
    size: '1080x1080',
    dressing: { ...DRESSING_DEFAULT },
    panels: [
      defaultPanel('samples/vice-convertible.jpg', ''),
      defaultPanel('samples/vice-boulevard.jpg', 'OCEAN DRIVE'),
      defaultPanel('samples/vice-pier.jpg', 'NIGHT PIER'),
      defaultPanel('samples/vice-portrait.jpg', 'NEON PORTRAIT'),
      defaultPanel('samples/vice-neonstreet.jpg', 'NEON RAIN'),
    ],
  };
}

/** Panel-count word for the automatic subtitle: 3 -> 'three', 4 -> 'four', ... */
export function panelCountWord(n) {
  return { 3: 'three', 4: 'four', 5: 'five' }[n] || String(n);
}

/** The automatic subtitle for a given panel count. */
export function subtitleForPanels(n) {
  return `A sunset story in ${panelCountWord(n)} panels`;
}

/** True when the subtitle is still the automatic one (safe to regenerate). */
export function isAutoSubtitle(sub) {
  return /^a sunset story in (three|four|five|\d+) panels$/i.test((sub || '').trim());
}

/** Keeps the panel list in step when the layout changes panel count. */
export function panelsForLayout(state, layout) {
  const want = LAYOUTS[layout].panels;
  const photos = ['samples/vice-convertible.jpg', 'samples/vice-boulevard.jpg', 'samples/vice-pier.jpg', 'samples/vice-portrait.jpg', 'samples/vice-neonstreet.jpg', 'samples/vice-fishing.jpg', 'samples/boulevard.jpg', 'samples/pier.jpg'];
  const notes = ['', 'OCEAN DRIVE', 'NIGHT PIER', 'NEON PORTRAIT', 'NEON RAIN', 'PIER LIFE', 'PALM ROW', 'OLD PIER'];
  const panels = state.panels.slice(0, want);
  while (panels.length < want) {
    panels.push(defaultPanel(photos[panels.length % photos.length], notes[panels.length % notes.length]));
  }
  return panels;
}

/** A JSON snapshot of the state (for undo), with photos as ids only. */
export function snapshot(state) {
  return JSON.stringify(state);
}

export function restore(stateJson) {
  return JSON.parse(stateJson);
}

/** Bounded undo history of state snapshots. */
export function createHistory(limit = 40) {
  const stack = [];
  return {
    push(state) {
      const s = snapshot(state);
      if (stack[stack.length - 1] !== s) stack.push(s);
      while (stack.length > limit) stack.shift();
    },
    undo(current) {
      if (stack.length < 2) return null;
      stack.pop(); // drop the current state
      return restore(stack[stack.length - 1]);
    },
    get depth() { return stack.length; },
  };
}

function pick(rnd, arr) {
  return arr[Math.floor(rnd() * arr.length)];
}

/** Random layout + grade + lettering, keeping the photos: one-click variety. */
export function surpriseState(state) {
  const rnd = Math.random;
  const next = JSON.parse(JSON.stringify(state));
  next.layout = pick(rnd, Object.keys(LAYOUTS));
  next.panels = panelsForLayout(next, next.layout);
  next.grade = pick(rnd, Object.keys(GRADES));
  next.font = pick(rnd, FONTS);
  next.title = pick(rnd, SURPRISE_TITLES);
  next.titleSize = 96 + Math.floor(rnd() * 70);
  next.titleColor = pick(rnd, ['#ffffff', '#ffe08a', '#2de2c5', '#ffb3d9']);
  next.captionPos = pick(rnd, ['bottom', 'bottom', 'top', 'overlay']);
  next.fx = {
    duotone: rnd() < 0.3,
    halftone: rnd() < 0.7,
    grain: rnd() < 0.7,
    vignette: true,
  };
  // Shuffle which sample sits in the hero panel.
  const heroPhoto = pick(rnd, SAMPLES.map((s) => s.id));
  next.panels[0].photo = heroPhoto;
  next.panels[0].zoom = 1.1 + rnd() * 0.5;
  // Keep the dressing (badge, script, ribbon, sticker, skyline) on: it is
  // part of the cover look now. Regenerate the subtitle if it was automatic.
  if (!next.dressing) next.dressing = { ...DRESSING_DEFAULT };
  if (isAutoSubtitle(next.subtitle)) next.subtitle = subtitleForPanels(LAYOUTS[next.layout].panels);
  return next;
}
