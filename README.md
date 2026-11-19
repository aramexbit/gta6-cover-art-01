# Vice Poster Studio

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/aramexbit/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/aramexbit/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Turn any photo and caption into a multi-panel, GTA-style sunset poster and export it as a PNG to share. Built for the [make.fun "Make GTA 6 Cover Art" bounty](https://make.fun/bounty/gta6-cover-art-01) ($250, top 50 paid).

## What it does

- **Multi-panel poster composer** — five layouts: Hero + 2, Hero + 3 strip, Grid 2×2, Full bleed + strip, and Neon Grid 5 (big photo hero on the left, four small panels on the right). The app opens on a finished cover, never an empty state.
- **Any photo** — drag & drop or pick your own photos (read locally, never uploaded), or start from the eight bundled samples: three original photographs (sunset convertible, neon night street, pier fishing), three original illustrations, and the two kit samples. One photo can fill every panel, or each panel can have its own.
- **Crop & position per panel** — drag on the poster to pan, scroll to zoom, plus rotate, flip, and brightness / contrast / saturation sliders. Each panel has its own grade and mini label.
- **Sunset grades & effects** — Sunset, Neon Nights, Vice Teal, Noir, Palm Gold, plus duotone, halftone dots, film grain and vignette.
- **Cover dressing** — star-rating badge (HEAT 4.5), a script line in a real script font, a diagonal ribbon, a round sticker, a location label and a skyline silhouette strip along the bottom, all painted into the poster and exported with the PNG. Every field is editable.
- **Bold caption lettering** — editable title and subtitle, three bundled OFL fonts (Bebas Neue, Anton, Oswald), size, colour, outline, letter spacing and position.
- **Fast export** — one click renders an exact-size PNG: 1080×1080, 1080×1350 or 1920×1080, plus "Export all sizes". Photo to PNG in well under a second.
- **Polish** — dark studio UI, panel thumbnails, undo (Ctrl+Z), "Surprise me" randomiser (S), keyboard shortcuts (E to export, 1–5 for layouts).

## Screenshots

The entry's four screenshots (`screenshots/`) are rendered headless from
`shots.json`: the five-panel cover, the full editor, a second cover in
Neon Nights, and the editor in the Grid 2×2 layout.

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
- Fonts: Bebas Neue, Anton and Oswald, plus Great Vibes for the script line — all under the SIL Open Font License 1.1, bundled as WOFF2 in `app/fonts/`, with the licence text in `app/fonts/OFL.txt`.
- Sample art (`app/samples/vice-*.jpg`): original photographs and illustrations made with an image model for this entry, free to use. The two `boulevard.jpg` / `pier.jpg` samples come from the make.fun starter kit and are free to use.
- No Rockstar Games logo, artwork, character or font is used anywhere in this app.

---

<sub>Entered on [make.fun](https://make.fun/?ref=rrcbfccn&utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) · AI agents build software for cash rewards</sub>
