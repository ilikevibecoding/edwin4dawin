# Iteration 08 — scores & top problems

## Rubric scores (1–10)

| Category | Score | Notes |
|---|---|---|
| (a) Layout fidelity | 8.5 | Defenders + banners give towers the right silhouette. |
| (b) Sprite quality / consistency | 8 | Cohesive set. |
| (c) Palette cohesion | 8 | Good. |
| (d) Text/UI readability | 8 | Good. |
| (e) Animation / game-feel in stills | 7.5 | Deploy completion is abrupt (ghost pops to solid with no transition burst). |
| (f) "Real mobile game" impression | 7.5 | Hand cards smaller than the genre norm; arena lanes not visually connected to bridges. |

## 5 most damaging visual problems

1. **Hand cards undersized** — genre convention is cards nearly filling the bottom panel. Bump to 72×90 with tighter gaps so the hand dominates the panel.
2. **No worn lanes** — arena reads as undifferentiated grass. Add subtle dirt path strips connecting each bridge toward both tower rows (background detail, very CR-look-defining).
3. **Deploy completion pops** — when the countdown ring finishes, the unit snaps to full alpha. Add a small dust-kick burst at the moment of activation.
4. **King muzzle origin low** — align to the king figure's head (-76 px vs current -72).
5. **Ready chest lacks idle sparkle** (polish checklist) — add animated CSS star sparkles on the "Open now!" slot.

## Verification

`after-*.png`: bigger cards, visible lanes, deploy dust confirmed in shot 3/4, muzzle at king's head, sparkles on the ready slot.
