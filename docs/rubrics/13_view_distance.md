# Rubric 13 — View distance 32 with a far-LOD layer

Goal: the view-distance selector goes up to 32 chunks (512 blocks) like Minecraft's maximum, without the memory and
meshing cost of 4,000 full chunks: full chunks stream to a near radius, and a far-LOD layer draws the rest.

## Acceptance criteria

| # | Criterion | Measure |
| --- | --- | --- |
| 1 | `VIEW_DISTANCES` offers 4, 6, 8, 10, 12, 16, 24, 32; `?rd=32` works; the setting persists | Panel test |
| 2 | Near ring: full chunks stream to `min(rd, nearCap)` where `nearCap` is 12 (Light), 16 (Balanced), 20 (Cinematic); beyond it the far layer takes over seamlessly (no gap, no double-draw seam wider than 1 block) | Screenshots at the seam |
| 3 | Far terrain: a heightmap mesh built from `worldgen` surface heights at 4-block cells with top-block colours (grass, sand, stone, snow, water), lit by sun and fogged like chunks; rivers and the coast visible; regenerated in 64×64-cell tiles as the player moves | Screenshot frontier at rd 32 |
| 4 | Far city: the Coruscant skyline impostor layer already covers towers and landmarks; add the boulevard decks (dark slabs) and skybridges as boxes so the far city has its street lattice | Screenshot Coruscant at rd 32 |
| 5 | Far trees/town: frontier town buildings as coloured boxes (from the town layout), forests as a darker green tint on the heightmap | Screenshot |
| 6 | Memory: heap at rd 32 ≤ heap at rd 12 + 120 MB; far tiles ≤ 40 MB total | Bench |
| 7 | Frame time: rd 32 Light in the town ≤ rd 12 Light + 4 ms JS; ≤ +12 draw calls; the far layer is ≤ 3 draw calls | Bench JSON |
| 8 | Streaming: moving at 20 blocks/s never shows a hole between the near ring and the far layer; far tiles build off the main thread's budget (≤ 2 ms/frame) | Recording |
| 9 | Disasters: the far layer ignores disaster edits (documented); the near ring is unchanged | Test suite green |
| 10 | Determinism/multiplayer untouched | `npm test`, mp-test green |

## Design notes

- `src/render/farlod.js`: `FarLOD` owns a grid of tiles (256×256 blocks each, 64×64 cells of 4 blocks); each tile is
  one indexed mesh (grid + skirt) with per-vertex colour; heights via `worldgen.sampleHeight`/`surfaceInfo` (add a
  cheap column sampler if only full column generation exists); tiles inside the near ring are skipped; a shared
  material with the shading chunk (sun, fog, shadows off).
- `terrain.js` exposes `nearRadius` and reports it to the sky/fog so the fog end follows the far layer instead of the
  near ring.
