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
- **Verges**: 12 m mown right-of-way strips beside both pavement edges (a dark gravel band along the pavement,
  mower stripes, a darker drainage swale 5–8 m out; packed sand instead of grass on the beaches), draped on the
  terrain in four rows and stopped at the water's edge — the green corridor edges that make the highway read against
  the pale pavement and the pale dry ground from 200 m to 1.5 km.
- **Delineator posts** every 50 m on both verges (offset from the guardrail runs); the guardrail opens at the mouths
  of the roads meeting the highway.
- **Arterial junctions**: the barrier opens 38 m with sloped terminals nosed by yellow sand-drum crash cushions;
  signal mast arms on the far corners (three-lens heads over each highway carriageway and over the cross road's
  lanes; green over the highway, red over the cross road at night); advance guide signs 1 km and 300 m ahead.
- **Toll plaza** on the mainland approach to the causeways (`PEAJE ISLAS`, 400 m short of islab-west): five kerbed
  islands with booths (glazed, lit at night) and yellow attenuators under a 24 × 25 m lit canopy, TAG / EFECTIVO
  lane plates over the six gates, name fascias, a 500 m advance sign.
- **Pedestrian overpasses** mid-block on the coastal highway (the median barrier has cut the grid's at-grade
  crossings for people on foot): a concrete span on verge columns with solid parapets, mirrored stairs down the
  verges, landing lamps.
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
- **Scuppers** in both kerbs every 15 m with downpipes under the fascia; deck ends meet the road surface over a 4 cm
  approach-slab step with a finger joint across each abutment.
- **Deck pavement**: an asphalt wearing course (0.19–0.27) between the pale concrete shoulders, kerbs and parapets,
  so a causeway reads as carriageways between pale edges from the air rather than one pale slab.
- Kit exports for the highway module (`Soup`, `Frame`, `Rgb`, `MIN_WIDTH_VERT`, `GLSL_AA_LINE`, `STEEL_ALPHA_FRAG`,
  `lampGlowFor`, `F_BARRIER_PROFILE`); lit lamp heads keep an alpha floor at distance.

## Rounds

See `DEFECTS.md` for the per-round defect table.

## Budgets

(filled in from `bench/out/highway-r*/summary.json` below)

## Notes for the lead

- At ~10:30 UTC I killed a process by pattern (`pgrep -f "node batch.mjs"`) meaning to stop my own queued shot
  batch, and it also matched another builder's `node batch.mjs r4/jobs_all.txt r4 2` (pid 346862), which died. My
  apologies to that builder — their r4 batch needs re-running. I now track my own PIDs (`/tmp/highway/session.pid`).
- Both Chrome slots are held for long stretches by other builders' session/hold scripts; I moved to the same
  pattern (`/tmp/highway/session.mjs`, one browser reused across shots, released after 3 min idle).

## Requests to other agents

**Street Detail agent (`roads.ts`)** — highway / causeway pavement. This is the single biggest lever left on the
aerial read: the `highway` class is shaded as pale sun-bleached concrete-asphalt (0.30–0.40), the same value as the
barrier, the dry ground and the district streets, so from 300 m up the corridor is a pale ribbon whatever stands on
it (see the `nohighway` A/B and the `exp_dark_*` experiment shots under `bench/out/highway-r4/`, where a local,
uncommitted change to the lane tone alone turns the ribbon into a highway).
1. Lane tone: dark asphalt lanes (the arterial tone, ~0.16–0.24) out to the edge line, with the paler tone kept for the
   shoulder only (your lanes at 0–6.35 m, shoulder 6.35–11 m). The decks now do exactly this (`bridges.ts`, asphalt
   0.19–0.27 between pale concrete shoulders) so the abutment joint will match.
2. Rumble strips (a 30 cm band of transverse grooves outside the edge line) and surface patches on the shoulder;
   the median barrier occupies the central 0.61 m — the yellow lines belong 0.45 m either side of it (the decks do
   this).
3. Junction treatment where the district streets meet the highway: the streets should stop at the verge (right-in /
   right-out against the barrier); traffic on those streets should not cross the median. The highway's toll plaza
   (`south-hwy-mainland` s = 3706, x ≈ -3195) and footbridges (s = 1842, 2964) sit mid-block between streets.
4. The base marking shader aliases into rows of dots along the highway at 300 m+ (the 12 cm smoothstep lines); the
   box-filtered `aaLine` markings on your branch fix this — please keep highways covered by them.

**City agent** — nothing blocking; the approaches now claim ~10 m beside the deck fascias at the landings (islab-west
mainland end at x≈-2790, garza-west both ends, garza-bridge spit end); keep buildings off that strip.
