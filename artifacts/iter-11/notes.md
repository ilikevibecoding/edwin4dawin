# Iteration 11 — scores & top problems

## Rubric scores (1–10)

| Category | Score | Notes |
|---|---|---|
| (a) Layout fidelity | 8.5 | All zones match the spec; mid-battle capture is only ~5 s in where the spec asks ~10 s. |
| (b) Sprite quality / consistency | 8 | Card portraits now consistent; rubble blocks read near-white against the grass. |
| (c) Palette cohesion | 8.5 | Rubble is the one off-palette surface (too bright). |
| (d) Text/UI readability | 8 | Repeated hits on one target still stack damage numbers into an unreadable pile. |
| (e) Animation / game-feel in stills | 8 | Tower muzzle flash floats at the tower's waist, not at the archer defender's bow. |
| (f) "Real mobile game" impression | 8 | Small physicality details (flash origin, rubble tone, chest gap) are the gap now. |

## 5 most damaging visual problems

1. **Damage numbers pile up on busy targets** — the 5-slot fan cycles globally, so rapid hits on the *same* target still overlap (shot 3: "5 56 50" cluster over the left tower badge). Add per-target stacking: successive numbers within ~0.5 s climb upward.
2. **Side-tower muzzle flash sits below the defender** — flash + bolt spawn at y-62, the gold trim line; the archer's bow is at ~y-68. Raise the origin and offset it toward the target so the shot reads as leaving the bow.
3. **Rubble reads as bright white plates** — broken blocks use `stoneLt` (#e9e2d2) plus a strong white highlight; they glow against the grass. Restyle to mid/dark stone with a subtler highlight.
4. **Chest burst leaves a dead vertical gap** — the lid hovers ~84 px above the body; even with motes the column feels empty. Pull the hover height in ~30%.
5. **Mid-battle capture is ~5 s in; spec asks ~10 s** (harness) — restage as two waves (deploy, ff 5 s, deploy, ff 4.5 s) so the clock reads ~2:50 with a fuller two-sided field.

## Verification

`after-*.png`: stacked numbers climb instead of overlap, flash at the bow, palette-true rubble, tighter chest gap, 2:51 two-wave battle scene.
