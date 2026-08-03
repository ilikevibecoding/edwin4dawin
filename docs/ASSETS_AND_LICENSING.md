# Assets and licensing statement

## Summary

**Starfall: The Stolen Design** is an original, non-commercial fan work. It is not associated with,
endorsed by, or sponsored by Lucasfilm Ltd., The Walt Disney Company, or any of their affiliates.
*Star Wars* and all related names, marks and characters are the property of their respective
owners.

**No proprietary asset of any kind is used, embedded, reproduced or approximated from source.**

## What is in this repository, and where it came from

| Asset class | Origin |
| --- | --- |
| All 3D geometry | Generated at runtime by `src/assets/**` from lofted profiles, primitives and a seeded RNG. There are no model files in this project — no `.glb`, `.fbx`, `.obj`, or any other mesh format. |
| All textures | Drawn at runtime on a 2D canvas (`src/assets/textures.ts`): hull plating, weathering, scorch, windows, control panels, the desert planet, dust bands, smoke puffs, glows, the schematic grid. No image files ship with this project. |
| All animation | Closed-form functions of the master clock. No motion capture, no imported animation clips. |
| Music | Original composition written for this project in `src/audio/Music.ts` and synthesised live with the Web Audio API. Three original motifs (Courier, Iron, Ember). No melody, harmony or rhythmic figure is taken from, or written to resemble, any existing score. |
| Sound effects | Synthesised from oscillators and generated noise at playback time (`src/audio/Sfx.ts`). Nothing is sampled from any film, game or commercial sound library. |
| Respirator rhythm | An original construction: band-limited generated noise gated by a slow asymmetric envelope with a swept filter. It is not, and does not contain, any recording. |
| Narration script | Written for this project (`src/content/narration.json`). It does not quote the *Star Wars* screenplay, the opening crawl, or any film dialogue. |
| Narration audio | Rendered locally by `scripts/generate_narration.py` with [Piper](https://github.com/OHF-Voice/piper1-gpl), an open, offline text-to-speech engine, using generic community voices, then mastered with ffmpeg. No performer's voice is imitated, cloned or referenced. |
| Typography | System font stack. No logo, wordmark or title card from any film is reproduced. |
| Character designs | Original stylised interpretations built from primitives. They are designed to be *recognisable by silhouette, colour and posture* — a white-armoured trooper, a figure in black with a flared helmet, a white-gowned princess with side buns, a blue-and-white astromech, a gold protocol droid — without copying any specific model, mesh, texture or costume. |

## Deliberate non-reproduction

The brief for this project explicitly required avoiding copies of official material, and the
following were treated as hard constraints throughout:

- The prologue is **original text**, not the film's opening crawl, and it is presented as restrained
  receding typography rather than a recreation of the crawl's format. No logo appears.
- The stolen plans are shown as an **abstract volumetric schematic** — a wireframe sphere with a
  polar emplacement, an equatorial trench and orbital analysis rings — not a recreation of any
  hologram from the films.
- Ship designs follow the *described* silhouettes (hammerhead bow, clustered engines; triangular
  hull, stacked superstructure, ventral hangar) as original geometry solved from proportions, not
  as traced or measured reproductions.
- Individual shots are composed to reproduce the *dramatic relationship* between the two ships,
  not to match any specific frame of the film.
- No character line is quoted. The three spoken character lines in this piece were written for it.

## Third-party dependencies

| Package | Licence | Use |
| --- | --- | --- |
| [three](https://github.com/mrdoob/three.js) | MIT | Rendering |
| [vite](https://vitejs.dev) | MIT | Dev server and build |
| [typescript](https://www.typescriptlang.org) | Apache-2.0 | Type checking |
| [playwright](https://playwright.dev) | Apache-2.0 | Automated visual tour (dev only) |
| [piper-tts](https://github.com/OHF-Voice/piper1-gpl) | MIT (voices: CC BY 4.0 / public domain, per voice) | Offline narration rendering (build-time only, not shipped) |
| [ffmpeg](https://ffmpeg.org) | LGPL/GPL | Narration mastering and video encoding (build-time only, not shipped) |

Piper and ffmpeg are **build-time tools only**. Neither is bundled or invoked at runtime; the
committed MP3s are served from the app's own origin.

## Secrets

There are no API keys, tokens or credentials in this repository, and none are required. Narration
is produced locally and committed. The application makes no third-party network requests at
runtime — everything it loads comes from its own origin.

## Use of this project's own work

The original code, geometry, textures, music, sound design and narration in this repository are
provided for personal, non-commercial use as a fan work. Because the subject matter is derived from
a third party's intellectual property, this project is not offered under an open-source licence and
should not be used commercially.
