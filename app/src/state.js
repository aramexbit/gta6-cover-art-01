// state.js — Vice Poster Studio: the state model.
// Everything the cover is made of lives here: the bundled sample photos, the
// five poster layouts, the five sunset grades, the caption fonts and the
// default cover (a photo hero, five panels, dressing on). No DOM, no canvas:
// this module only describes data, so poster.js can render it and main.js
// can edit it.

export const SAMPLES = [
  { id: 'convertible', src: 'samples/vice-convertible.jpg', label: 'SUNSET CONVERTIBLE', kind: 'photo' },
  { id: 'neonstreet', src: 'samples/vice-neonstreet.jpg', label: 'NEON STREET', kind: 'photo' },
  { id: 'fishing', src: 'samples/vice-fishing.jpg', label: 'PIER LIGHT', kind: 'photo' },
  { id: 'portrait', src: 'samples/vice-portrait.jpg', label: 'NEON PORTRAIT', kind: 'art' },
  { id: 'rooftop', src: 'samples/vice-rooftop.jpg', label: 'ROOFTOP DUSK', kind: 'art' },
  { id: 'beach', src: 'samples/vice-beach.jpg', label: 'PALM GOLD', kind: 'art' },
  { id: 'boulevard', src: 'samples/boulevard.jpg', label: 'BOULEVARD', kind: 'kit' },
  { id: 'pier', src: 'samples/pier.jpg', label: 'PIER', kind: 'kit' },
];

export const sampleById = (id) => SAMPLES.find((s) => s.id === id) || null;

// Five layouts. Each entry lists its panel count and a short name for the
// picker; the geometry itself lives in poster.js (layoutRects), so the two
// modules stay in sync through the layout id alone.
export const LAYOUTS = [
  { id: 'hero2', name: 'Hero + 2', panels: 3 },
  { id: 'hero3', name: 'Hero + 3 strip', panels: 4 },
  { id: 'grid', name: 'Grid 2×2', panels: 4 },
  { id: 'bleed', name: 'Full bleed + strip', panels: 3 },
  { id: 'grid5', name: 'Neon Grid 5', panels: 5 },
];

export const layoutById = (id) => LAYOUTS.find((l) => l.id === id) || LAYOUTS[4];

// Five grades. A grade is a wash of colour laid over a photo: two gradient
// stops (top, bottom), a blend mode for the wash, and a small filter shift
// that poster.js folds into the panel's own brightness/contrast/saturation.
export const GRADES = [
  { id: 'sunset', name: 'Sunset', top: '#ff2e88', bottom: '#ff7a18', blend: 'overlay', lift: 0.55 },
  { id: 'neon', name: 'Neon Nights', top: '#7b2fff', bottom: '#00e5ff', blend: 'overlay', lift: 0.6 },
  { id: 'teal', name: 'Vice Teal', top: '#0e7c7b', bottom: '#f2a541', blend: 'soft-light', lift: 0.6 },
  { id: 'noir', name: 'Noir', top: '#20222e', bottom: '#000000', blend: 'multiply', lift: 0.5 },
  { id: 'gold', name: 'Palm Gold', top: '#ffb347', bottom: '#ff5e62', blend: 'soft-light', lift: 0.55 },
];

export const gradeById = (id) => GRADES.find((g) => g.id === id) || GRADES[0];

// Caption fonts, all bundled as WOFF2 under app/fonts/ under the OFL.
export const CAPTION_FONTS = [
  { id: 'bebas', name: 'Bebas Neue', css: '"Bebas Neue", sans-serif' },
  { id: 'anton', name: 'Anton', css: '"Anton", sans-serif' },
  { id: 'oswald', name: 'Oswald', css: '"Oswald", sans-serif' },
];

// The three post sizes the bounty asks for, exact pixels.
export const EXPORT_SIZES = [
  { id: 'square', label: '1080 × 1080', w: 1080, h: 1080 },
  { id: 'story', label: '1080 × 1350', w: 1080, h: 1350 },
  { id: 'wide', label: '1920 × 1080', w: 1920, h: 1080 },
];

export const PANEL_COUNT_WORDS = { 2: 'two', 3: 'three', 4: 'four', 5: 'five' };

export const subtitleFor = (n) => `A sunset story in ${PANEL_COUNT_WORDS[n] || n} panels`;

// One panel: which photo it shows, its mini label, how the photo sits in
// the frame (zoom/pan/rotate/flip), its own light tweaks and its grade.
export function defaultPanel(photoId, tag) {
  return {
    photo: photoId,
    tag: tag || '',
    zoom: 1,
    panX: 0,
    panY: 0,
    rotate: 0,
    flip: false,
    brightness: 1,
    contrast: 1,
    saturation: 1,
    grade: 'sunset',
  };
}

// The cover the app opens with: Neon Grid 5, a photographic hero (the
// convertible at sunset), four small panels, dressing on. Nothing is empty:
// the first screenshot already shows a finished cover.
export function defaultState() {
  return {
    layout: 'grid5',
    title: 'NEON BOULEVARD',
    subtitle: subtitleFor(5),
    subtitleAuto: true,
    captionFont: 'bebas',
    captionSize: 1,
    captionColor: '#ffffff',
    captionOutline: true,
    captionSpacing: 0.06,
    captionPosition: 'bottom',
    panels: [
      defaultPanel('convertible', 'SUNSET CHASE'),
      defaultPanel('neonstreet', 'NEON NIGHTS'),
      defaultPanel('portrait', 'NEON PORTRAIT'),
      defaultPanel('fishing', 'PIER LIGHT'),
      defaultPanel('beach', 'PALM GOLD'),
    ],
    effects: { duotone: false, halftone: false, grain: true, vignette: true },
    dressing: {
      show: true,
      rating: '4.5',
      script: 'neon harbor nights',
      ribbon: 'SAME TROUBLE',
      sticker: 'EST. 2026',
      location: 'SOLMAR BAY',
      skyline: true,
    },
    exportSize: 'square',
    selected: 0,
  };
}

// Keep the panel list in step with the layout: switching layouts keeps the
// photos that still fit and fills new panels from the samples in order.
export function fitPanelsToLayout(state) {
  const want = layoutById(state.layout).panels;
  const photos = ['convertible', 'neonstreet', 'portrait', 'fishing', 'beach', 'rooftop', 'boulevard', 'pier'];
  const tags = ['SUNSET CHASE', 'NEON NIGHTS', 'NEON PORTRAIT', 'PIER LIGHT', 'PALM GOLD', 'ROOFTOP DUSK', 'BOULEVARD', 'PIER'];
  while (state.panels.length < want) {
    const i = state.panels.length;
    state.panels.push(defaultPanel(photos[i % photos.length], tags[i % tags.length]));
  }
  state.panels.length = want;
  if (state.selected >= want) state.selected = 0;
  if (state.subtitleAuto) state.subtitle = subtitleFor(want);
}

export function cloneState(state) {
  return JSON.parse(JSON.stringify(state));
}

// A fresh cover out of thin air: random layout, grade, font, photos and an
// invented title, used by "Surprise me". Dressing stays on — it is the
// cover's signature.
export function surpriseState() {
  const state = defaultState();
  const layouts = ['hero2', 'hero3', 'grid', 'bleed', 'grid5'];
  const titles = ['NEON BOULEVARD', 'MIDNIGHT DRIVE', 'SUNSET CHASE', 'PALM GOLD', 'VICE HEAT', 'GOLDEN HOUR'];
  const grades = GRADES.map((g) => g.id);
  const fonts = CAPTION_FONTS.map((f) => f.id);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  state.layout = pick(layouts);
  fitPanelsToLayout(state);
  state.title = pick(titles);
  state.captionFont = pick(fonts);
  const shuffled = [...SAMPLES].sort(() => Math.random() - 0.5);
  state.panels.forEach((p, i) => {
    p.photo = shuffled[i % shuffled.length].id;
    p.tag = shuffled[i % shuffled.length].label;
    p.grade = pick(grades);
    p.zoom = 1 + Math.random() * 0.25;
  });
  state.effects.halftone = Math.random() < 0.5;
  state.effects.duotone = Math.random() < 0.3;
  // Vary the caption size and the script line too, so two surprises never
  // look like the same poster with different photos.
  state.captionSize = 0.9 + Math.random() * 0.25;
  const scripts = ['neon harbor nights', 'same trouble, new city', 'chasing the golden hour', 'vice after dark'];
  state.dressing.script = pick(scripts);
  return state;
}
