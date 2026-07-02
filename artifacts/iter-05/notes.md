# Iteration 05 — scores & top problems

(Scored from the iter-04 `after-*` captures, which are this iteration's "before".)

## Rubric scores (1–10)

| Category | Score | Notes |
|---|---|---|
| (a) Layout fidelity | 8 | Stable. |
| (b) Sprite quality / consistency | 7.5 | Bush sprite reads as a stack of green pancakes; rest consistent. |
| (c) Palette cohesion | 8 | Good. |
| (d) Text/UI readability | 7.5 | Combat now decluttered. "Next:" preview card is too dark/small to read. |
| (e) Animation / game-feel in stills | 7.5 | Impact stars + explosion visible. Hit flash whites out entire units. |
| (f) "Real mobile game" impression | 7.5 | Chest glow shows square clipping edges in home slots and result screen. |

## 5 most damaging visual problems

1. **Hit flash whites units out** — `brightness(1.75)` erases the sprite for a frame. Reduce to ~1.4 so the silhouette stays readable during the flash.
2. **Chest glow clips into visible square edges** — the radial glow inside `chestCanvas` exceeds the canvas bounds (home slots + result chest). Fit the glow radius to the canvas.
3. **Bush sprite silhouette** — three flat stacked ellipses read as pancakes. Redraw as one blob with lobed top, matching the tree canopy language.
4. **"Next:" preview card too dark and small** — raise size to 46 px, brighten the label, and give the frame a lighter border so it reads at a glance.
5. **Capture staging still one-sided** (harness) — knight dies before the shot. Spread the scripted deploys across lanes and fast-forward 4.5 s so both pushes are alive in shot 3.

## Verification

`after-*.png`: flash softened, glow clean (no square edge), rounder bush, readable Next card, two live pushes in shot 3.
