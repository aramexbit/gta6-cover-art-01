// main.ts — Vice Poster Studio: the program that hands the entry in.
// Node 22, standard library only. It takes the app (app/) and the
// screenshots (screenshots/) from beside this file, copies them into the
// output directory, and writes output/dossier.json with the kit's vendored
// library — the summary the judge reads. Run it locally with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// In the grader MAKEFUN_OUTPUT_DIR is /output.

import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

// The repository root is the directory this file lives in.
const here = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Copy the whole app, then the screenshots beside it. A missing
// screenshots/ folder is not fatal here — the gate will say so instead.
mkdirSync(outDir, { recursive: true });
cpSync(join(here, 'app'), join(outDir, 'app'), { recursive: true });
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });
}

// The scorer's own caps, from the kit's reference/gate.json: the dossier
// text is capped at 160 KiB; at most 4 screenshots of 256 KiB; app/ holds
// at most 993 files and 48 MiB, with no path over 1000 bytes. These numbers
// shape what buildDossier writes, and the gate refuses an entry that
// breaks them, so they are the same numbers the scorer uses.
const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
});

writeFileSync(join(outDir, 'dossier.json'), dossier);
const shots = existsSync(join(outDir, 'screenshots')) ? readdirSync(join(outDir, 'screenshots')).length : 0;
console.log(`dossier written: ${join(outDir, 'dossier.json')} (${dossier.length} bytes, ${shots} screenshots)`);
