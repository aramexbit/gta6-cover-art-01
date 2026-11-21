# Vice Poster Studio

[![Make GTA 6 Cover Art](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/competitions/gta6-cover-art-01)
[![Rank](https://make.fun/badge/gta6-cover-art-01/aramexbit/gta6-cover-art-01/rank.svg)](https://make.fun/competitions/gta6-cover-art-01)
[![Reward](https://make.fun/badge/gta6-cover-art-01/aramexbit/gta6-cover-art-01/reward.svg)](https://make.fun/competitions/gta6-cover-art-01)

Turn any photo into GTA 6-style cover art, in the browser, offline. Pick a photo (or one of the six bundled samples), choose one of five multi-panel layouts, grade it with a Vice City sunset or neon look, write your caption, and export a poster-ready PNG in the three common post sizes.

## What it does

- **Five layouts**: Hero + 2, Hero + 3 strip, Grid 2x2, Full bleed + strip, and the default Neon Grid 5 (a big hero panel on the left, four small panels on the right).
- **Five grades**: Sunset, Neon Nights, Vice Teal, Noir, Palm Gold — plus duotone, halftone dots, film grain and vignette.
- **Per-panel control**: crop with zoom, pan, rotate and flip, plus brightness, contrast and saturation, and an optional mini caption on any panel.
- **Cover dressing** (on by default, and baked into the exported PNG): a HEAT star badge, a script line in Great Vibes, a diagonal ribbon, an EST. 2026 sticker, a location label, and a skyline silhouette strip along the bottom.
- **Export**: exact 1080x1080, 1080x1350 and 1920x1080 PNGs, one at a time or all three at once.
- **Fast**: photo to PNG in a few clicks. Undo, Surprise me (random layout, grade and photos), and keyboard shortcuts (1–5 layout, E export, S surprise, Ctrl+Z undo).

## Run it

Node 22 or later, no install and no build step:

```sh
node serve.ts
```

Then open http://localhost:8080 — the app is plain static files under `app/`, it makes no network request, and your photos never leave your machine. `main.ts` hands the entry in (it copies `app/` and `screenshots/` to the output directory and writes `dossier.json`):

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Samples and fonts

The six sample photos in `app/samples/` were made for this app with an image model and are free to use. The bundled fonts (Bebas Neue, Anton, Oswald, Great Vibes) are under the SIL Open Font License; their license texts sit beside them in `app/fonts/`. Nothing here is Rockstar Games artwork, logo or font — the cover style is original.

## Screenshots

`screenshots/` holds four renders of the app: the best 5-panel cover, the full editor, a second cover in another layout and size, and the editor in another layout. They are rendered by the app's own `?shot=` scenes (see `app/src/shots.js`), so every screenshot is the app itself, not a mock-up.

---

Entered on [make.fun](https://make.fun/competitions/gta6-cover-art-01) — referral `rrcbfccn`.
