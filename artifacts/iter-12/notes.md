# Iteration 12 — scores & top problems

## Rubric scores (1–10)

| Category | Score | Notes |
|---|---|---|
| (a) Layout fidelity | 9 | All spec zones present and proportioned; staging shows both lanes active at ~10 s. |
| (b) Sprite quality / consistency | 8.5 | Rubble now tonal; card row consistent. Dead units disappear in a single frame. |
| (c) Palette cohesion | 9 | Cohesive; river is the flattest remaining surface. |
| (d) Text/UI readability | 8 | Tower damage numbers rise INTO the tower HP bar and badge ("50" over the bar in shot 4). |
| (e) Animation / game-feel in stills | 8 | Water shimmer sparse (3 thin dashes); kings' sleep "z" is a tiny ambiguous fleck. |
| (f) "Real mobile game" impression | 8.5 | Micro-detail phase: death anims, water life, ambient depth. |

## 5 most damaging visual problems

1. **Tower damage numbers collide with the tower HP bar** — floaters spawn at `y-46` and drift up into the bar (`y-92` side / `y-60` king), landing exactly on the badge text under stacking. Spawn at the tower body (`y-24`) with a reduced stack lift so they fade before reaching the bar.
2. **Units vanish the instant they die** — `drawUnitItem` returns immediately on `dead`, so the poof appears over bare grass. Draw a 0.3 s corpse fade (squash to the ground + alpha out) under the poof.
3. **Water reads flat in stills** — only 3 faint ripple dashes on a solid band. Add more ripple arcs across the band plus drifting white sparkle glints.
4. **King "sleep" indicator is an ambiguous fleck** — the single 11 px "z" hugs the keep wall and reads as dirt. Larger stepped "Z z" pair floating clear of the silhouette.
5. **Playfield lacks ambient depth** — grass is uniformly lit corner to corner; real arenas have soft light variation. Two very-low-alpha cloud shadows drifting slowly across the field.

## Verification

`after-*.png`: tower numbers stay on the body, corpses fade under the poof, livelier water, readable "Z z", subtle moving shade on the grass.
