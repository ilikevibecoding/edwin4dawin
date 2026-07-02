# Iteration 06 — scores & top problems

## Rubric scores (1–10)

| Category | Score | Notes |
|---|---|---|
| (a) Layout fidelity | 8 | Stable, all spec elements present. |
| (b) Sprite quality / consistency | 8 | Bushes fixed, glow clipping gone, flash softened. |
| (c) Palette cohesion | 8 | Good. |
| (d) Text/UI readability | 8 | Decluttered combat, brighter Next card. |
| (e) Animation / game-feel in stills | 7 | Towers fire with zero visible feedback; deploys have no elixir flavor; river banks are hard color cuts. |
| (f) "Real mobile game" impression | 7.5 | Battle stills need more "juice" moments. |

## 5 most damaging visual problems

1. **Towers fire with no visible feedback** — bolts just appear. Add a muzzle flash sprite + brief glow at the tower top on every shot.
2. **Deploys don't read as "spending elixir"** — add a magenta droplet splash at the deploy point (ties the elixir economy to the board).
3. **River banks are hard color cuts** — soften with a light sand/stone edging strip along both banks.
4. **Elixir bar gives no feedback when spent** — add a white flash sweep on the bar at the moment of payment.
5. **Artifact 4 undersells the destruction moment** (harness) — kill the tower with an actual Fireball cast so the arc + explosion + rubble all appear in the still.

## Verification

`after-*.png`: muzzle flash visible on firing tower, magenta deploy splash present, river edging in place, elixir flash triggered, shot 4 captures fireball explosion at the dying tower.
