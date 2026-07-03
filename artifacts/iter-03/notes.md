# Iteration 03 — scores & top problems

## Rubric scores (1–10)

| Category | Score | Notes |
|---|---|---|
| (a) Layout fidelity | 8 | All spec elements present and in place on every screen. |
| (b) Sprite quality / consistency | 7.5 | Unit set consistent; chest/rubble fixed. Units read small at 360 px. |
| (c) Palette cohesion | 8 | Consistent. |
| (d) Text/UI readability | 7 | Bars no longer covered; numbers fan out. Tower HP digits still small. |
| (e) Animation / game-feel in stills | 7.5 | Explosion flash + debris captured; deploy rings, floaters visible. |
| (f) "Real mobile game" impression | 7 | Arena still feels flat (no 3/4 depth cue); home midground empty. |

## 5 most damaging visual problems

1. **Arena reads flat** — spec asks for a slight top-down 3/4 perspective. Add a vertical light gradient over the grass (darker top, lighter bottom), soft vignette, and deeper platform shadows to fake depth.
2. **Units are too small** at 360 px — bump battle unit render scale ~1.14× so silhouettes read like a chunky mobile battler.
3. **Tower HP digits too small** — widen tower bars slightly and raise font size so "840" is instantly readable.
4. **Home midground is empty** between the Battle button and the hills — add cartoon trees/bushes on the hills matching the outlined style.
5. **Chest overlay bleeds the home screen through** — the faded "ARENA RUMBLE" title fights the chest for attention mid-burst. Darken the overlay and add a vignette.

## Verification

`after-*.png` re-captured after fixes; confirmed depth gradient, bigger units, readable tower digits, home trees, and darker chest backdrop.
