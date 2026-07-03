# Iteration 07 — scores & top problems

## Rubric scores (1–10)

| Category | Score | Notes |
|---|---|---|
| (a) Layout fidelity | 8 | Muzzle flash, deploy splash, river banks all landed. |
| (b) Sprite quality / consistency | 7.5 | Towers look uninhabited — real arena battlers put a defender on top; pairs of archers stack while walking. |
| (c) Palette cohesion | 8 | Sand banks warm up the midfield nicely. |
| (d) Text/UI readability | 8 | Good. |
| (e) Animation / game-feel in stills | 7.5 | Firing towers read now; melee flash still overly white on pale units. |
| (f) "Real mobile game" impression | 7.5 | Bottom hand panel is a flat navy slab; towers feel empty. |

## 5 most damaging visual problems

1. **Towers are uninhabited** — add a tiny hooded defender bust peeking over each side-tower rim and a small crowned king figure on the king tower. Highest-visibility authenticity feature on the whole arena.
2. **Muzzle flash floats at the roof cone** — align the shot origin with the new defender position so the figure appears to shoot.
3. **Bottom hand panel is a flat navy slab** — add a gold trim line + rivets along the panel top edge to match the chunky UI language.
4. **Paired units (archers) stack while walking** — give multi-unit squads a persistent formation offset so pairs walk side by side.
5. **Hit flash still washes out pale units** — drop to brightness(1.28) so steel/white sprites keep their silhouette.

## Verification

`after-*.png`: defenders visible on all towers, flash aligned, panel trim present, archer pair separated, knight keeps silhouette when hit.
