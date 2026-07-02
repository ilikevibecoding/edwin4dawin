# Iteration 14 — scores & top problems

## Rubric scores (1–10)

| Category | Score | Notes |
|---|---|---|
| (a) Layout fidelity | 9 | All spec zones stable across shots. |
| (b) Sprite quality / consistency | 8.5 | Close-ups show mini HP bars of clumped units overlapping each other into black slabs. |
| (c) Palette cohesion | 9 | Smoke, rubble, lanes now sit in-palette. |
| (d) Text/UI readability | 8.5 | Overlapping overhead bars at the bridge scrum are the last unreadable spot. |
| (e) Animation / game-feel in stills | 8.5 | Deploy ring reads at feet; melee lacks a lunge — attacker and victim just stand adjacent. |
| (f) "Real mobile game" impression | 8.5 | Ambient polish (edge deco rhythm, king idle) still slightly static. |

## 5 most damaging visual problems

1. **Clumped units' overhead bars overlap into slabs** — at the bridge scrum, three imp bars + a knight bar stack into a single black block (crop of shot 3). Widen the per-target fan by adding a lateral jitter to the badge/bar when several damaged units are within 20 px.
2. **Melee attacks lack a lunge** — attacker squash/stretch exists but the body stays planted; strikes read as two units idling side by side. Add a forward lunge offset (a few px toward the target) during the first half of the attack cycle.
3. **Water band top edge is unnaturally straight against the sand** — a hard ruler line across the whole arena. Scallop the waterline with small alternating arcs.
4. **King defender is frozen** — side archers bob, but the king bust and his crown are static in stills between shots. Give the king a slow breathe (scale-y) and occasional crown glint particle.
5. **Bottom fence posts have no rail** — isolated posts every 24 px read as floating sticks (bottom edge, every shot). Connect them with a horizontal rail plank like a real fence.

## Verification

`after-*.png`: separated bars in the scrum, visible lunge mid-swing, scalloped waterline, breathing king, railed fence.
