# A Stolen Secret

An original, procedurally generated browser cinematic inspired by the opening
situation of *Star Wars: A New Hope* — a corvette running above a desert world,
the capital ship that catches it, and the two droids who leave with the thing
everybody is looking for.

Roughly five and three-quarter minutes, built entirely from code: every mesh,
texture, animation, sound effect, music cue and line of narration in this
repository is generated at runtime or produced by the tools in `tools/`. No
film assets of any kind are used. See [Assets and licensing](#assets-and-licensing).

Two modes:

- **Cinematic** — the piece plays itself: directed shots, animation, an original
  score, spatialised effects, narration and subtitles.
- **Explore** — pause anywhere, fly the camera, click a ship or a character, read
  what it is, follow it, inspect it, then drop back into the show.

## Requirements

- Node.js 20 or newer (developed on 22)
- A browser with WebGL 2

## Install and run

```bash
npm install
npm run dev            # http://127.0.0.1:5173/
```

Click **Enter the galaxy** on the loading gate. That click is what unlocks the
Web Audio context; browsers will not let a page make noise before one.

### Production build

```bash
npm run build          # type-checks, then writes dist/
npm run preview        # serves dist/ on http://127.0.0.1:4173/
```

`dist/` is fully self-contained. It makes no network requests at runtime other
than for its own bundle and the narration audio in `public/audio/`.

### Other commands

| Command | What it does |
| --- | --- |
| `npm run typecheck` | `tsc --noEmit` over the whole project |
| `npm run qa` | Automated visual tour + control test against the dev server |
| `npm run qa:build` | The same tour against `dist/` via `vite preview` |
| `npm run narration` | Regenerates the narration audio from `narration/script.json` |

Three development tools sit alongside those, all driving the running app
through `window.__show`:

```bash
node tools/frames.mjs --out=qa/output/look --t=44,112:1.2,220:2.4   # still frames, with preroll
node tools/clip.mjs --from=246 --to=250 --fps=15 --out=qa/clips/a.mp4  # a span of show time as video
node tools/bounds.mjs                                               # bounding boxes of a preview asset
```

`clip.mjs` advances the show by exactly 1/fps between captures rather than
recording in real time, so it produces a smooth clip even on a machine that
renders at two frames a second.

There is also a development-only asset viewer at `/preview.html`:

```
/preview.html?asset=runner&view=three-quarter&dist=0.9&env=space
/preview.html?asset=vader&view=front&state=march
```

`asset` accepts `runner`, `destroyer`, `pod`, `corridor`, `blast-door`, `data`,
`lineup`, or any character name. It is not part of the production bundle.

## Controls

### Cinematic mode

| Control | Action |
| --- | --- |
| `Space` | Play / pause |
| `Backspace` | Restart from the top |
| `,` / `.` | Previous / next chapter |
| `1`–`8` | Jump to chapter |
| `←` / `→` | Scrub 5 s |
| `C` | Subtitles on / off |
| `H` | Help panel |
| `G` | Diagnostics overlay |
| `F` | Fullscreen |
| `U` | Hide / show the interface |
| `Tab` | Toggle Explore mode |
| `Esc` | Close the inspector or help panel |

The transport bar carries a chapter selector, a scrubbable timeline with chapter
marks, an audio mixer (master / narration / music / effects), a settings popover
(quality, subtitles, diagnostics overlay, grain, depth cueing) and a help panel.

### Explore mode

| Control | Action |
| --- | --- |
| Drag | Look |
| `W` `A` `S` `D` | Move |
| `Q` / `E` | Down / up |
| `Shift` | Boost |
| Scroll | Dolly |
| Click a subject | Open the inspector |
| `R` | Return to the cinematic camera |

Hovering a ship or character rims it in cyan and shows its name. The inspector
offers **Follow**, **Inspect** and **Return to cinematic camera**. Movement is
clamped to a bounding volume around the action and the camera is pushed out of
corridor walls, so it is not possible to get lost or end up inside geometry.

## The story, in eight chapters

| # | Chapter | Time | What happens |
| --- | --- | --- | --- |
| 1 | Prologue | 0:00 | Gold cards recede into the dark: a stolen design, a ship running. |
| 2 | The desert world | 0:34 | Tatooine, twin suns, silence. |
| 3 | The pursuit | 1:06 | The corvette, then the wedge that overtakes it. Turbolasers, shields, failing drives. |
| 4 | Capture | 2:30 | A tractor beam, the corvette drawn alongside, and a cut inside. |
| 5 | The corridor | 3:06 | Defenders, a cut door, a breach, a firefight, and what walks in afterwards. |
| 6 | The plans | 4:12 | Leia, the station schematic, and a courier nobody will search. |
| 7 | The pod | 4:48 | Two droids, a boarding ramp, and a hatch onto vacuum. |
| 8 | Epilogue | 5:22 | The pod falling toward the desert, and one closing line. |

## Documentation

- [`docs/architecture.md`](docs/architecture.md) — how the systems fit together
- [`docs/qa.md`](docs/qa.md) — the QA loop, the checkpoint manifest and the
  sanity checks
- [`docs/limitations.md`](docs/limitations.md) — known limitations

## Assets and licensing

Everything in this repository is original work, released under the MIT licence
in [`LICENSE`](LICENSE). Specifically:

- **Geometry** is constructed in TypeScript from primitives, lofts, prisms and
  seeded greeble fields (`src/assets/geometry.ts`, `src/ships/`, `src/interior/`,
  `src/characters/`). Nothing is imported from a model file.
- **Textures** are painted into `<canvas>` at load time from seeded noise
  (`src/assets/textures.ts`). No image files ship with the application.
- **Music** is synthesised live through the Web Audio API from an original
  chord plan and three original motifs (`src/audio/music.ts`). It is not a
  transcription or pastiche of any existing cue.
- **Sound effects** are synthesised from noise and oscillators at runtime
  (`src/audio/sfx.ts`). No recordings are used, including for the respirator
  rhythm, which is filtered noise shaped by an envelope.
- **Narration** is original prose written for this project
  (`narration/script.json`, about 500 words) and rendered to audio by
  `tools/generate-narration.mjs` with a neutral synthetic voice. It does not
  quote the screenplay or the opening crawl, and it does not imitate any
  performer. If the audio files are missing, the application falls back to the
  browser's own speech synthesis and reports it in the diagnostics overlay.
- **Third-party code**: [three.js](https://threejs.org) (MIT), plus Vite,
  TypeScript and Playwright as development dependencies.

The ships and characters are *designed to evoke* the shapes an audience
associates with this story — a white hammerhead corvette, a grey wedge, an
astromech, a figure in black — but they are new models with different
proportions, panelling and detail, and they carry their own names in the
inspector. No trademarked logo, no crawl text and no dialogue from the film
appears anywhere in the project.

## Performance

Three quality tiers (`src/core/quality.ts`) control pixel ratio, particle and
crowd counts, sphere tessellation, star count, greeble density, shadows and the
post-processing chain. A short GPU benchmark runs while the loading gate is up
and pre-selects a tier; the settings popover overrides it at any time. Expensive
animation is suspended while the tab is hidden, and GPU resources are disposed
through a tracked registry (`src/core/disposal.ts`).
