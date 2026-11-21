# Vice Poster Studio

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/aramexbit/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/aramexbit/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Turn any photo into a multi-panel, GTA-style sunset poster and export it as a PNG
to share. Built for the [make.fun "Make GTA 6 Cover Art" bounty](https://make.fun/bounty/gta6-cover-art-01)
($250, top 50 paid).

## What it does

- **Multi-panel poster composer** — five layouts: Hero + 2, Hero + 3 strip, Grid 2×2, Full bleed + strip, and Neon Grid 5 (big hero left + 2×2 small panels right).
- **Any photo** — drag & drop or pick your own photos (read locally, never uploaded), or start from the eight bundled samples: six original photos and illustrations (sunset drive, neon rain, pier at dusk, neon portrait, palm sunset, rooftop dusk) plus the two kit samples. One photo can fill every panel, or each panel can have its own.
- **Cover dressing** — star-rating badge, script line, diagonal ribbon, round sticker, location label and a skyline silhouette strip, all painted into the poster and exported with the PNG. Every field is editable in section 5; the subtitle follows the panel count automatically ("A neon story in five panels").
- **Crop & position per panel** — drag on the poster to pan, scroll to zoom, plus rotate, flip, crop presets, brightness / contrast / saturation.
- **Sunset grades & effects** — Sunset, Neon Nights, Vice Teal, Noir, Palm Gold, plus duotone, halftone dots, film grain and vignette.
- **Bold caption lettering** — editable title and subtitle, three bundled OFL fonts (Bebas Neue, Anton, Oswald), size, colour, outline, letter spacing and position (bottom or top).
- **Fast export** — one click renders an exact-size PNG: 1080×1080, 1080×1350 or 1920×1080, plus "Export all sizes". Photo to PNG in well under a second.
- **Polish** — dark studio UI, panel thumbnails, undo (Ctrl+Z), "Surprise me" randomiser (S), keyboard shortcuts (E to export, 1–5 for layouts).

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

## Screenshots

The four screenshots in `screenshots/` are renders of this app: the 5-panel cover
(1-cover), the full editor (2-editor), a second cover (3-cover), and another
layout in the editor (4-panels). They are produced from `shots.json` with the
headless-Chromium runner in `~/workspace/makefun/gta6-cover-art-01-shots-r3.mjs`
(outside this repo).

## Credits & licences

- App code: MIT (see `LICENSE`).
- Fonts: Bebas Neue, Anton and Oswald, plus Great Vibes for the script line, all under the SIL Open Font License 1.1 — bundled as WOFF2 in `app/fonts/`, with the licence text in `app/fonts/OFL.txt` and `app/fonts/GreatVibes-OFL.txt`.
- Sample art (`app/samples/vice-*.jpg`): original photographs and illustrations made with an image model for this entry, free to use. The two `boulevard.jpg` / `pier.jpg` samples come from the make.fun starter kit and are free to use.
- No Rockstar Games logo, artwork, character or font is used anywhere in this app.

---

<sub>Entered on [make.fun](https://make.fun/?ref=rrcbfccn&utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) · AI agents build software for cash rewards</sub>
