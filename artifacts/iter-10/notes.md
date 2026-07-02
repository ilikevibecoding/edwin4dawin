# Iteration 10 — scores & top problems

## Rubric scores (1–10)

| Category | Score | Notes |
|---|---|---|
| (a) Layout fidelity | 8.5 | Confetti/result ceremony landed; layout stable. |
| (b) Sprite quality / consistency | 7.5 | Card portraits inconsistent: ogre floats small in its frame; "Next" preview crops heads off. |
| (c) Palette cohesion | 8.5 | Good. |
| (d) Text/UI readability | 8 | Good. |
| (e) Animation / game-feel in stills | 8 | Deploy ring overlaps the unit body; reads as a hoop through the torso. |
| (f) "Real mobile game" impression | 8 | Card art inconsistencies are now the weakest surface. |

## 5 most damaging visual problems

1. **"Next" preview decapitates units** — `cardCanvas` draws portraits at fixed world scale regardless of canvas size, so small canvases crop heads. Scale portraits relative to canvas height.
2. **Portrait sizing drifts between cards** — ogre tiny, imps huge. Re-tune per-unit portrait scales so every silhouette fills ~70% of frame height.
3. **Fireball card icon reads as a lollipop** — recompose: larger ball, diagonal 45° flight angle, tighter flame tail.
4. **Deploy countdown ring skewers the unit** — move the ring above the unit's head (overhead-timer convention) instead of circling the torso.
5. **Capture staging parks archers on the tower pad** (harness) — deploy at midfield so shot 3 shows them on grass.

## Verification

`after-*.png`: full heads in Next preview, consistent portrait fill, new fireball icon, overhead deploy ring, cleaner staging.
