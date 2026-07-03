# Iteration 15 — scores & top problems (final polish pass)

## Rubric scores (1–10)

| Category | Score | Notes |
|---|---|---|
| (a) Layout fidelity | 9 | All spec zones match; loop stable through every capture. |
| (b) Sprite quality / consistency | 9 | Batch-consistent procedural set; bar declumping + lunge landed. |
| (c) Palette cohesion | 9 | In-palette everywhere including smoke/rubble/lanes. |
| (d) Text/UI readability | 9 | No remaining collisions at 360 px. |
| (e) Animation / game-feel in stills | 8.5 | Home CTA and shelf are the most static surfaces left. |
| (f) "Real mobile game" impression | 8.5–9 | Per the loop rules, spend this iteration on micro-detail: shadows, highlights, particles. |

## 5 most damaging visual problems (micro-detail targets)

1. **Battle button has no live sheen** — the primary CTA reads as a static gradient; every mobile game keeps its CTA glinting. Add a periodic diagonal gloss sweep.
2. **Chest shelf is a flat brown band** — no wood grain, seams, or nails; it reads as a color block under detailed slots. Add plank seams + nail heads via CSS texture.
3. **Home hills are untextured** — a single green sweep between the CTA and the shelf; the arena grass got tufts/flowers but home never did. Scatter flower/tuft specks.
4. **Arena edge deco floats** — rocks/shrubs on the outer band have no contact shadows, reading as stickers (visible along both flanks in every battle shot). Paint soft ground shadows first.
5. **Crown counters don't celebrate a score** — after a tower falls the counter just shows "1" in flat white (shot 4). Light the counter up (gold value + crown glow) whenever it's non-zero.

## Verification

`after-*.png`: sheen mid-sweep on the CTA, plank-textured shelf, flowered hills, grounded deco, lit player crown counter in shot 4.
