// Vice Poster Studio — state: the catalogues (samples, layouts, grades) and the
// default poster state. Everything the app renders comes from here; the UI in
// main.js only edits this state, and poster.js only draws it.

export const SAMPLES = [
  { id: 'sunset-drive', file: 'vice-sunset-drive.jpg', label: 'SUNSET DRIVE', kind: 'photo' },
  { id: 'neon-rain', file: 'vice-neon-rain.jpg', label: 'NEON RAIN', kind: 'photo' },
  { id: 'pier-dusk', file: 'vice-pier-dusk.jpg', label: 'PIER DUSK', kind: 'photo' },
  { id: 'neon-portrait', file: 'vice-neon-portrait.jpg', label: 'NEON PORTRAIT', kind: 'illustration' },
  { id: 'palm-sunset', file: 'vice-palm-sunset.jpg', label: 'PALM SUNSET', kind: 'illustration' },
  { id: 'rooftop-dusk', file: 'vice-rooftop-dusk.jpg', label: 'ROOFTOP DUSK', kind: 'illustration' },
  { id: 'boulevard', file: 'boulevard.jpg', label: 'BOULEVARD', kind: 'kit' },
  { id: 'pier', file: 'pier.jpg', label: 'PIER', kind: 'kit' },
];

export function sampleById(id) {
  return SAMPLES.find((s) => s.id === id) || null;
}

// Layouts: rects are fractions of the cover (x, y, w, h). The first rect is
// always the hero. grid5 is the default: a big hero left, four small right.
export const LAYOUTS = [
  { id: 'hero2', name: 'Hero + 2', panels: 3 },
  { id: 'hero3', name: 'Hero + 3 strip', panels: 4 },
  { id: 'grid2', name: 'Grid 2x2', panels: 4 },
  { id: 'bleed', name: 'Full bleed + strip', panels: 4 },
  { id: 'grid5', name: 'Neon Grid 5', panels: 5 },
];

export function layoutById(id) {
  return LAYOUTS.find((l) => l.id === id) || LAYOUTS[4];
}

// Rects for a layout on a cover of size w x h (gutter g in pixels).
export function layoutRects(layoutId, w, h, g = 6) {
  const r = (x, y, rw, rh) => ({ x: x * w, y: y * h, w: rw * w, h: rh * h });
  const gx = g / w, gy = g / h;
  switch (layoutId) {
    case 'hero2':
      return [r(0, 0, 0.62 - gx, 1), r(0.62, 0, 0.38, 0.5 - gy), r(0.62, 0.5, 0.38, 0.5)];
    case 'hero3':
      return [
        r(0, 0, 0.58 - gx, 1),
        r(0.58, 0, 0.42, 0.333 - gy), r(0.58, 0.333, 0.42, 0.333 - gy), r(0.58, 0.666, 0.42, 0.334),
      ];
    case 'grid2':
      return [
        r(0, 0, 0.5 - gx, 0.5 - gy), r(0.5, 0, 0.5, 0.5 - gy),
        r(0, 0.5, 0.5 - gx, 0.5), r(0.5, 0.5, 0.5, 0.5),
      ];
    case 'bleed':
      return [
        r(0, 0, 1, 0.76 - gy),
        r(0, 0.76, 0.333 - gx, 0.24), r(0.333, 0.76, 0.333 - gx, 0.24), r(0.666, 0.76, 0.334, 0.24),
      ];
    case 'grid5':
    default:
      return [
        r(0, 0, 0.58 - gx, 1),
        r(0.58, 0, 0.42, 0.5 - gy), r(0.58, 0.5, 0.42, 0.5),
        r(0.58, 0, 0, 0), // placeholder, replaced below
        r(0.58, 0, 0, 0),
      ].slice(0, 1).concat([
        r(0.58, 0, 0.21 - gx / 2, 0.5 - gy), r(0.79, 0, 0.21, 0.5 - gy),
        r(0.58, 0.5, 0.21 - gx / 2, 0.5), r(0.79, 0.5, 0.21, 0.5),
      ]);
  }
}

// Grades: a tint painted over the photo plus a CSS-filter tweak. Each grade
// is a sunset mood; Neon Nights is the default for this build.
export const GRADES = [
  { id: 'sunset', name: 'Sunset', tint: 'rgba(255,110,40,0.16)', filter: 'saturate(1.25) contrast(1.06)' },
  { id: 'neon', name: 'Neon Nights', tint: 'rgba(255,45,149,0.14)', filter: 'saturate(1.35) contrast(1.10)' },
  { id: 'teal', name: 'Vice Teal', tint: 'rgba(0,200,190,0.13)', filter: 'saturate(1.20) contrast(1.05)' },
  { id: 'noir', name: 'Noir', tint: 'rgba(10,10,30,0.20)', filter: 'saturate(0.55) contrast(1.14)' },
  { id: 'gold', name: 'Palm Gold', tint: 'rgba(255,190,40,0.15)', filter: 'saturate(1.30) contrast(1.04)' },
];

export function gradeById(id) {
  return GRADES.find((g) => g.id === id) || GRADES[1];
}

export const EXPORT_SIZES = [
  { id: '1080x1080', w: 1080, h: 1080, label: '1080 x 1080' },
  { id: '1080x1350', w: 1080, h: 1350, label: '1080 x 1350' },
  { id: '1920x1080', w: 1920, h: 1080, label: '1920 x 1080' },
];

export function sizeById(id) {
  return EXPORT_SIZES.find((s) => s.id === id) || EXPORT_SIZES[0];
}

const WORDS = ['one', 'two', 'three', 'four', 'five', 'six'];

export function subtitleFor(count) {
  return `A neon story in ${WORDS[count - 1] || count} panels`;
}

function panel(photo, grade) {
  return {
    photo, grade,
    zoom: 1, cx: 0.5, cy: 0.5, rotate: 0, flip: false,
    brightness: 1, contrast: 1, saturation: 1,
  };
}

export function defaultState() {
  return {
    layout: 'grid5',
    exportSize: '1080x1080',
    title: 'VICE CITY NIGHTS',
    subtitle: subtitleFor(5),
    captionFont: 'bebas',
    captionSize: 1,
    captionColor: '#ffffff',
    captionPosition: 'bottom',
    selected: 0,
    panels: [
      panel('sunset-drive', 'neon'),
      panel('neon-rain', 'neon'),
      panel('neon-portrait', 'sunset'),
      panel('pier-dusk', 'teal'),
      panel('palm-sunset', 'gold'),
    ],
    dressing: {
      show: true, skyline: true,
      ribbon: 'NO WAY OUT',
      script: 'chasing the last light',
      location: 'VICE CITY',
      rating: 4.5,
      sticker: 'EST. 2026',
    },
    effects: { grain: true, vignette: true, duotone: false, halftone: false },
  };
}

// Keep panels in step with the layout's panel count when the layout changes.
export function fitPanelsToLayout(state) {
  const n = layoutById(state.layout).panels;
  const pool = ['sunset-drive', 'neon-rain', 'neon-portrait', 'pier-dusk', 'palm-sunset', 'boulevard', 'pier', 'rooftop-dusk'];
  const grades = ['neon', 'sunset', 'teal', 'gold', 'neon'];
  while (state.panels.length < n) {
    const i = state.panels.length;
    state.panels.push(panel(pool[i % pool.length], grades[i % grades.length]));
  }
  state.panels.length = n;
  state.subtitle = subtitleFor(n);
  if (state.selected >= n) state.selected = 0;
}

export function cloneState(state) {
  return JSON.parse(JSON.stringify(state));
}
