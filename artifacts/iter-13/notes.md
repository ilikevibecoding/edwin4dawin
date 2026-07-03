# Iteration 13 — scores & top problems

## Rubric scores (1–10)

| Category | Score | Notes |
|---|---|---|
| (a) Layout fidelity | 9 | Stable. AI deploys can land visually ON the tower pad, off-spec for ground units. |
| (b) Sprite quality / consistency | 8.5 | Overhead deploy rings from units behind a tower read as goggles ON the tower. |
| (c) Palette cohesion | 8.5 | Explosion smoke is a flat near-black mass; worn-lane patches read as scattered brown blobs. |
| (d) Text/UI readability | 9 | Floater stacking + tower spawn point fixed the pile-ups. |
| (e) Animation / game-feel in stills | 8.5 | Corpse fade + water life landed; deploy telegraph still awkward. |
| (f) "Real mobile game" impression | 8.5 | Remaining issues are small compositing collisions and texture quality. |

## 5 most damaging visual problems

1. **Deploy countdown rings float over tower bodies** — the overhead ring is drawn ~40 px above small units, so squads deployed behind a tower paint two dark circles on the tower face like goggles (shot 3, right enemy tower). Replace with a flattened progress ring on the ground around the unit's feet.
2. **Worn-lane "footworn patches" read as droppings** — discrete round blobs in a vertical line over the grass (shot 3, above each bridge). Make the lane a continuous soft strip: stronger core gradient + elongated, overlapping smudges.
3. **Enemy AI deploys on the tower pad** — deploy y range [150, 205] intersects the tower platform at y=142; units spawn standing on stone. Clamp AI deploys to y ≥ 170.
4. **Explosion smoke is a flat near-black mass** — uniform `#6b6478` discs at 0.75 alpha merge into a silhouette hole over the grass (shot 4). Two-tone the smoke (warm lighter core, dark rim) and drop peak alpha.
5. **King sleep "Z z" reads muddy over grass** — the gray-blue fill at 0.75–0.9 alpha over midfield grass has poor contrast (shot 3, right of enemy keep). Brighten fill, thicken outline, nudge clear of the keep.

## Verification

`after-*.png`: ground-level deploy rings, continuous dirt lanes, AI units on grass, layered smoke, legible Zz.
