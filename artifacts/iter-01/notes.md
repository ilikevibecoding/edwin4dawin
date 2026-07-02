# Iteration 01 — scores & top problems

Screenshots: 1-home, 2-chest-burst, 2b-chest-rewards, 3-battle-mid, 4-battle-towerdown, 5-result

## Rubric scores (1–10)

| Category | Score | Notes |
|---|---|---|
| (a) Layout fidelity | 6 | Battle HUD matches spec (opponent banner, timer, crowns mid-right, hand+elixir). But enemy king tower is cut off at the top edge and the chest overlay layout collides. |
| (b) Sprite quality / consistency | 5 | Units, towers, cards are consistent. Chest lid geometry is broken when opening — reads as a giant rotated capsule. Home shelf chests look cropped/flat. |
| (c) Palette cohesion | 8 | Greens/stone/wood/team blue-red/gold/magenta all in place and consistent. |
| (d) Text/UI readability | 7 | Outlined display font reads well at 360px. "Next:" label small but legible. Reward card counts get covered by the Okay button. |
| (e) Animation / game-feel in stills | 6 | Damage floaters, deploy rings, rays, particles all visible. Explosion smoke a bit sparse; rubble looks like pancakes. |
| (f) "Real mobile game" impression | 5.5 | Home + battle + result almost pass; the chest-opening screen breaks the illusion completely. |

## 5 most damaging visual problems

1. **Chest lid geometry breaks during opening** — at full `open01` the lid rotates into a huge capsule shape that covers the chest. Rework `drawChest`: lid pops OFF and hovers above the open body (always drawn front-facing) instead of hinge-rotating through the body.
2. **Enemy king tower is cut off** by the top of the arena — the spire/flag/crown extend past y=0. Compact the king tower silhouette (shorter keep, no tall spire) and move its anchor down so the full tower + floating crown emblem fit.
3. **Home chest slots read as cropped drawers** — the chest sprite inside the 76×96 slot is flat and clipped. Re-fit `chestCanvas` proportions so the full lid + body silhouette fits the slot.
4. **Chest reward overlay collisions** — the gold row overlaps the chest sprite; the Okay button covers the card count labels. Animate the chest upward when the burst starts, move rewards down, move counts inside the card frames.
5. **Clouds are blobby gradient rectangles** — the CSS radial-gradient clouds have hard edges and a visible rectangular strip. Replace with outlined canvas cloud sprites matching the art style.

## Also queued (quick fixes)

- Fireball card icon sits off-center (tail pushes visual weight left).
- Tower rubble reads as pancakes; add contrast, chunkier stone pieces.
