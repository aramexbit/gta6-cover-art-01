// Vice Poster Studio — state: the cover's data model, layouts, grades and sample photos.
// Everything the poster renderer needs lives here; main.js mutates it through applyChange so
// every edit can be undone, and shots.js builds fixed scenes from it for screenshots.

/** Sample photos bundled with the app: keys are short names, values are files under app/samples/. */
export const SAMPLES = {
  hero: 'samples/media-generation-hero-0-a5b7dfcb-a8fb-4c9d-b8ef-6b0d0d143b2d.jpg',
  moto: 'samples/media-generation-moto-0-0d0643f8-5396-4273-9566-1554f862b1b6.jpg',
  beach: 'samples/media-generation-beach-0-d966a31a-e140-4857-b581-ec87237c20b9.jpg',
  skyline: 'samples/media-generation-skyline-0-8a177210-3510-4ddc-a9ae-52e973707a14.jpg',
  palm: 'samples/media-generation-palm-0-82e26861-093a-4eb9-b64d-ae43534800df.jpg',
  car: 'samples/media-generation-car-0-b03c1ed4-9e41-4878-9e1f-368e8e1faa47.jpg',
};

/** The five cover layouts, in the order the 1-5 keyboard shortcuts pick them. */
export const LAYOUTS = ['hero2', 'hero3', 'grid', 'fullbleed', 'neon5'];
export const LAYOUT_NAMES = {
  hero2: 'Hero + 2',
  hero3: 'Hero + 3 strip',
  grid: 'Grid 2 x 2',
  fullbleed: 'Full bleed + strip',
  neon5: 'Neon Grid 5',
};

/** The five colour grades. */
export const GRADES = ['sunset', 'neon', 'teal', 'noir', 'palm'];
export const GRADE_NAMES = {
  sunset: 'Sunset',
  neon: 'Neon Nights',
  teal: 'Vice Teal',
  noir: 'Noir',
  palm: 'Palm Gold',
};

/** The three post sizes the app exports, exactly. */
export const EXPORT_SIZES = [
  { w: 1080, h: 1080, label: '1080 x 1080' },
  { w: 1080, h: 1350, label: '1080 x 1350' },
  { w: 1920, h: 1080, label: '1920 x 1080' },
];

/** Script lines the Surprise button can pick from (the default is the cover's own line). */
export const SCRIPT_LINES = [
  'running on golden light',
  'heat of the night',
  'golden hour, no curfew',
  'sunset never looked back',
  'every light is ours tonight',
];

/** One panel's photo and adjustments. Pan is in fractions of the panel (0 centres the photo). */
export function defaultPanel(photo, caption = '') {
  return {
    photo,
    zoom: 1,
    panX: 0,
    panY: 0,
    rotate: 0,
    flip: false,
    bright: 100,
    contrast: 100,
    sat: 100,
    caption,
  };
}

/** The cover the app opens with: Neon Grid 5, Palm Gold grade, hero photo up front. */
export function defaultState() {
  return {
    layout: 'neon5',
    grade: 'palm',
    duotone: 'none',
    halftone: false,
    grain: true,
    vignette: true,
    dressing: true,
    title: 'GOLDEN HOUR GETAWAY',
    script: 'running on golden light',
    location: 'LEONIDA',
    ribbon: 'NO TURNING BACK',
    heat: 4.5,
    panels: [
      defaultPanel('hero'),
      defaultPanel('moto', 'NIGHT RIDE'),
      defaultPanel('beach'),
      defaultPanel('skyline', 'LEONIDA'),
      defaultPanel('palm'),
    ],
    selected: 0,
    exportSize: 0,
  };
}

/** A deep copy of a state, for the undo stack. */
export function cloneState(state) {
  return JSON.parse(JSON.stringify(state));
}

/** Which panel slots a layout shows, in draw order (slot 0 is the hero). */
export function panelsForLayout(layout) {
  if (layout === 'hero2') return [0, 1, 2];
  if (layout === 'hero3') return [0, 1, 2, 3];
  if (layout === 'grid') return [0, 1, 2, 3];
  if (layout === 'fullbleed') return [0, 1, 2, 3];
  return [0, 1, 2, 3, 4];
}

/** The sample keys in a stable order, for the photo picker and Surprise. */
export function sampleKeys() {
  return Object.keys(SAMPLES);
}
