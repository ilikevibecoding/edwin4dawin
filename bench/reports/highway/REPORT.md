# Highway agent — report (rubric 23 Highway realism; supports 29 World density)

Branch `cursor/highway-loop-8213`. Owned: `src/world/bridges.ts`, new `src/world/highway.ts`. Shared-file hunks: `src/game.ts`
(module registration, mirror exclusion of thin steel, `nohighway` debug flag, `props` no longer lights `highway`/`causeway`
segments). No change to `roads.ts`, `props.ts`, `batching.ts`, `culling.ts`, `views.ts`.

## What was built

### `highway.ts` — furniture along the `highway` and `causeway` road classes
Chains `RoadSegment`s of the two classes into continuous alignments (same cross vectors and heights as `roads.ts`, so
everything sits on the pavement it was generated from) and lays out, per ~1 km chunk, one draw per kind:

- **Median F-shape barrier** (81 cm, shared profile with the decks) down the centre of the 4-lane highway, opened
  38 m at arterial junctions with sloped terminals, continuous through the district streets (right-in / right-out).
- **W-beam guardrail** on posts with reflector tabs wherever the ground beside the shoulder is water or low
  (< 0.75 m) or drops more than 1.7 m within 18 m, and on the last 150 m before every causeway; it ties into the
  deck parapets.
- **Compacted-shell verges** (2.6 m) beside both pavement edges: the pale edge band that makes the corridor read from
  altitude; wheel-off track, grass creeping in from the outer edge.
- **Delineator posts** every 50 m on both verges (offset from the guardrail runs).
- **Median lighting**: twin-arm cobra-head poles (11.4 m) every 60 m on the median barrier; the heads glow at night with
  the same sun-driven curve as the causeway lamps, with an alpha floor so the lit dots survive to 5 km.
- **Sign gantries** (truss on two columns) 260 m before each causeway / bridge announcing the map's destinations
  (Isla Garza, Isla Tortuga, Costa Barrera, Bahía Vista, Aeropuerto …) with a `CAUSEWAY 1 KM` / `PUENTE …` tab, and
  150 m before each arterial junction with a side-aware arrow; guide signs 300 m before junctions, round km/h speed
  signs every ~900 m, chevrons around bends sharper than 8 degrees, drainage inlets on the shoulders every 30 m.
- **Materials**: galvanised steel (satin, blotchy spangle), weathered concrete barrier with tyre scuffs and a
  pale cap, retroreflective sign faces from a 2048×1024 canvas atlas (green guide, blue tabs, yellow chevrons,
  red-ring speed discs).
- **Distance behaviour**: a screen-space minimum width (1.75 px, coverage-weighted alpha) for every thin member;
  draw ranges drop posts at 1.5 km and rails at 2.5 km, the lit heads stay to 5 km, gantries and signs to 4 km;
  fat **shadow proxies** (poles, gantry trusses, guardrail walls) cast only into the coarse cascades where the thin
  steel is not drawn, so the pole and gantry shadow strokes survive at altitude.
- **Culling**: chunks tested against every observing camera frustum (main + mirror) and the sun-swept shadow
  frustum, cascade-routed like `bridges.ts`; the thin steel is excluded from the mirror pass.

### `bridges.ts`
- **Approaches**: 2:1 sloped fill embankments (sand or grass tone by zone) wherever the deck stands over land,
  riprap-armoured where the toe reaches the water; **U-abutments** with MSE panel walls flush with the fascia, a
  riprap berm around each, splayed **wing walls** capping the slopes; piers no longer stand inside the fill.
- **F-shape median barrier** on every deck of 4+ lanes and 20 m+ (garza-west, islab-west, tortuga, garza, north-cw).
- **Scuppers** in both kerbs every 15 m with downpipes under the fascia.
- Kit exports for the highway module (`Soup`, `Frame`, `Rgb`, `MIN_WIDTH_VERT`, `GLSL_AA_LINE`, `STEEL_ALPHA_FRAG`,
  `lampGlowFor`, `F_BARRIER_PROFILE`); lit lamp heads keep an alpha floor at distance.

## Rounds

See `DEFECTS.md` for the per-round defect table.

## Budgets

(filled in from `bench/out/highway-r*/summary.json` below)

## Requests to other agents

**Street Detail agent (`roads.ts`)** — highway / causeway pavement:
1. Shoulders and edge lines on the `highway` class: 4 lanes should be ~3.6 m with a ~3.3 m paved shoulder each side
   and a 30 cm white edge line (currently four 5.5 m lanes fill the whole 22 m); the median barrier occupies the
   central 0.61 m — the yellow lines belong 0.45 m either side of it (the decks do this).
2. Rumble strips (a 30 cm band of transverse grooves outside the edge line), surface patches, and a slightly
   different (lighter, coarser) asphalt tone on the shoulders so the lanes read from the air.
3. Junction treatment where the district streets meet the highway: the streets should stop at the verge (right-in /
   right-out against the barrier); traffic on those streets should not cross the median.

**City agent** — nothing blocking; the approaches now claim ~10 m beside the deck fascias at the landings (islab-west
mainland end at x≈-2790, garza-west both ends, garza-bridge spit end); keep buildings off that strip.
