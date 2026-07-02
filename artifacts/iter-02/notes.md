# Iteration 02 — scores & top problems

## Rubric scores (1–10)

| Category | Score | Notes |
|---|---|---|
| (a) Layout fidelity | 7.5 | King tower + crown emblem now fit; HUD complete. Rewards overlay fixed. |
| (b) Sprite quality / consistency | 7 | Chest open/closed states read correctly now; rubble is chunky. Units consistent. |
| (c) Palette cohesion | 8 | Solid. |
| (d) Text/UI readability | 5.5 | Combat becomes unreadable in clumps: overhead HP bars overlap and damage numbers collide into "45642"-style jumbles. |
| (e) Animation / game-feel in stills | 7 | Deploy rings, floaters, smoke, debris all visible. Explosion flash mostly missed by the capture timing. |
| (f) "Real mobile game" impression | 6.5 | Home/chest/result pass; battle mid-fight clutter breaks it. |

## 5 most damaging visual problems

1. **Overhead unit UI gets painted over by neighboring units** — bars/badges are drawn inline with each unit, so a unit drawn later covers the previous unit's HP bar. Move all overhead UI (level badge + HP bar) into a separate pass drawn after every body.
2. **Damage numbers collide** — floaters spawn at nearly the same spot and overlap into garbage. Add per-floater angle jitter, spawn offset cycling, and a slight scale-down.
3. **Units stack into blobs on bridges** — separation force is too weak; three imps + archers occupy the same pixel. Strengthen separation (including cross-team), and reduce imp deploy cluster radius.
4. **Big green field reads empty/flat between towers** — add sparse grass tufts and tiny flowers inside the playfield (background layer, consistent style).
5. **Capture misses the explosion flash** (harness): screenshot at ~140 ms after tower kill instead of 260 ms so the flash + debris are visible in artifact 4.

## Verification

`after-*.png` in this folder re-captured after fixes; bars stay readable in the same scripted clash, numbers no longer collide, field has micro-detail, flash visible in shot 4.
