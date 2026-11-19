# Vice Poster Studio

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![make.fun bounty](https://img.shields.io/badge/make.fun-bounty%20gta6--cover--art--01-ff2e88)](https://make.fun/bounty/gta6-cover-art-01)
[![Status: entry ready](https://img.shields.io/badge/status-entry%20ready-brightgreen)](https://make.fun/bounty/gta6-cover-art-01)

Turn any photo into a multi-panel, GTA-style sunset poster and export it as a PNG
to share. Built for the [make.fun "Make GTA 6 Cover Art" bounty](https://make.fun/bounty/gta6-cover-art-01)
($250, top 50 paid).

## What it does

- **Multi-panel poster composer** — four layouts: Hero + 2, Hero + 3 strip, Grid 2×2, Full bleed + strip.
- **Any photo** — drag & drop or pick your own photos (read locally, never uploaded), or start from the three bundled sample illustrations. One photo can fill every panel, or each panel can have its own.
- **Crop & position per panel** — drag on the poster to pan, scroll to zoom, plus rotate, flip, crop presets, brightness / contrast / saturation.
- **Sunset grades & effects** — Sunset, Neon Nights, Vice Teal, Noir, Palm Gold, plus duotone, halftone dots, film grain and vignette.
- **Bold caption lettering** — editable title and subtitle, three bundled OFL fonts (Bebas Neue, Anton, Oswald), size, colour, outline, letter spacing and position.
- **Fast export** — one click renders an exact-size PNG: 1080×1080, 1080×1350 or 1920×1080, plus "Export all sizes". Photo to PNG in well under a second.
- **Polish** — dark studio UI, panel thumbnails, undo (Ctrl+Z), "Surprise me" randomiser (S), keyboard shortcuts (E to export, 1–4 for layouts).

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network request: every script, font and image is a file under `app/`.
Requires Node 22+.

## Build the entry dossier

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
# writes out/dossier.json plus copies of app/ and screenshots/
```

## Credits & licences

- App code: MIT (see `LICENSE`).
- Fonts: Bebas Neue, Anton and Oswald, all under the SIL Open Font License 1.1 — bundled as WOFF2 in `app/fonts/`, with the licence text in `app/fonts/OFL.txt`.
- Sample art (`app/samples/vice-*.jpg`): original illustrations made with an image model for this entry, free to use. The two `boulevard.jpg` / `pier.jpg` samples come from the make.fun starter kit and are free to use.
- No Rockstar Games logo, artwork, character or font is used anywhere in this app.
