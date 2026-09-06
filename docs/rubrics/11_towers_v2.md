# Rubric 11 — Skyscraper crowns and tower families in the Star Wars idiom

Goal: the generic towers stop ending in flat roofs. Crowns and whole families follow the reference images the user
sent: (a) the 500-Republica tiered spire — cylindrical setbacks with lit vertical window strips, rounded caps, a
finial; (b) the spine tower — twin slabs around a glowing blue central spine with cantilevered landing decks and sky
bridges; (c) the Zakuul needle — a tall tapering blade with a lit apex and fins; plus original designs in the same
language. Interiors must keep working (room library floors, lifts, doors) and every crown must be climbable.

## Acceptance criteria

| # | Criterion | Measure |
| --- | --- | --- |
| 1 | ≥ 6 crown styles applied to the existing families by seed: tiered setbacks, rounded cap + finial, antenna crown (3-7 masts with lit tips), lit halo ring, blade spire, cantilevered landing deck with rails and lights, stepped ziggurat top; no flat unadorned roof on any tower ≥ 60 blocks | `scripts/test-coruscant-towers.mjs`: crown present on 100% of towers ≥ 60; ≥ 6 styles used |
| 2 | ≥ 3 new families: `spire` (tiered cylinders, lit vertical strips, 500 Republica look), `spine` (twin slabs + glowing spine + cantilevered decks), `needle` (tapering blade + fins); each with interiors from the room library and lifts to the top | Harness: all rooms reachable + lit as for landmarks |
| 3 | Lit vertical strips: emissive window columns every 4-6 blocks on ≥ 40% of facades above 60 blocks; at night the skyline reads as strips, not random dots | Night skyline screenshot vs before |
| 4 | Cantilevered decks: ≥ 15% of towers ≥ 90 blocks have a landing deck (≥ 9×9) with a parked speeder/ship and rails; decks are walkable from the sky lobby | Screenshot + reachability |
| 5 | Sky bridges between towers get lit undersides and glass tubes on ≥ 30% | Screenshot |
| 6 | Far skyline impostors reflect crowns (tower impostor top uses the crown height and a taper flag) | Screenshot at 200 blocks |
| 7 | Palette: chrome, durasteel, dark panels, steel glass, blue glow strips, white plaster; no wood/wool on exteriors above the podium | Automatic block census |
| 8 | Perf: chunk fill time per tower chunk ≤ +15%; draw calls unchanged (all block-based) | Harness timing |
| 9 | Determinism: identical layout/blueprints across reloads; existing landmark lots untouched | Hash test |
| 10 | Critic verdict against the three reference images: ≥ 2 of 3 looks clearly present in a 200-block skyline view | Critic |
