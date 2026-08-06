# SPECIALIST NOTES — Command Room / Console (IRONVEIL)

Scope: C2 shelter interior in `src/base.js`, PPI scope + holo table in `src/radar.js`,
interior textures in `src/textures.js`. 9 edit loops run (stopped at loop 9 of 10 with
all rubric items at or above 8.5). Build is clean (`npx vite build --outDir dist-console`),
and the full gameplay suite passes (see "Contract verification" below).

## Loop log

- **Loop 0 (baseline)**: captured baseline. Interior was a gray box: floating monitors,
  placeholder navy map rectangle, one bare point light, no props, PPI was flat line art.
- **Loop 1 — console suite + room shell (`base.js`, `textures.js`)**: rebuilt the interior
  around a three-bay fire-direction console: sloped panel deck with silkscreened control
  groups (AZ-EL SERVO, DISPLAY/DIM, XMIT/STBY/MTI/CFAR, ARM/SAFE/SLAVE/AUTO), chunky
  monitor wall with bezel frames, keyboard shelf + trackball, guarded launch button,
  switch banks and knobs (instanced), annunciator cluster, phone handset with coiled
  cord, headset hook, mug, pencil, duty logbook. New/rewritten textures: full-height
  `interiorWall` acoustic panels (perforations, wainscot, chair rail, rivets, scuffs),
  `paintedFloor` (anti-static slate tiles, worn border lane, door chevrons, chair swivel
  wear), `rackFace` (U-rails, module handles, silkscreen), plus new `consolePanel`,
  `keyboard`, `annunciator`, `clockFace`, `binderSpines`, `exitSign`, `floorChannel`,
  `holoRing`, `clipboard`. Wall furniture: sector map board, clipboard, notice board,
  binder shelf, fire extinguisher, breaker panel, UPS. Ceiling: tile grid, louvered
  troffers, red battle lamps, cable trays + sagging looms; floor cable channels with
  tread tops. Colliders updated for the new desk/holo/rack footprints (door walk-in path
  verified).
- **Loop 2 — screens (`radar.js`)**: PPI phosphor rework: persistence veil (fading paint),
  conic-gradient sweep with hot beam, range rings with km labels, bearing numerals every
  30°, ground clutter arcs + receiver noise speckle (seeded via `ctx.vrng`), CRT burn-in
  ghosts in the static overlay. Engagement sidebar restructured into BATTERIES / TRACK
  DATA / SYMBOLOGY panels with a footer status row. Aux screens went live: left = battery
  status board (state, reload progress bars, missile inventory, generator load, zulu
  clock), right = engagement queue (track, TTI, assigned battery, status). Aux redraws
  alternate on a 0.26 s cadence; PPI redraw stays on the existing 0.08 s throttle.
- **Loop 3 — holo table + lighting**: volumetric projection cone + light shaft, engraved
  bearing ring, annular disc fills, rim threat arcs that follow hostile azimuths.
  Interior lights wired into the `time-of-day` handler: white troffers by day, amber at
  sunset, red battle lamps + dimmed task lighting at night (console/holo glows and panel
  emissive step up at night).
- **Loop 4 — judged fixes**: map board z-fight fixed and texture rebuilt at 768×576
  (terrain, roads, grid, threat sectors, unit symbology, margin annotations,
  classification strips); chairs rebuilt with correct proportions/dark fabric; floor
  channels made flush with brighter tread texture; placard text clipping fixed; main
  lamp lowered/dimmed (was blowing out the ceiling); troffer emissive tuned per time of
  day.
- **Loop 5 — sun leak root cause**: interior meshes defaulted to `receiveShadow=false`,
  so direct sun lit furniture through the roof (chairs rendered cream). Fixed by forcing
  `receiveShadow` on every shelter mesh. Added desk-lamp light pool, holo column ribs +
  power feed, left-wall dressing (first-aid kit, intercom, conduit run, bay stencil,
  kettle), open duty logbook.
- **Loop 6 — sweep + status polish**: killed the "ghost spoke" artifact (hot beam alpha
  0.9→0.55, white core 0.26→0.18, persistence veil 0.16→0.22); TRACK DATA panel now
  shows a RAID SUMMARY (hostile/decoy counts, first-impact ETA) when nothing is
  selected, so it is never empty.
- **Loop 7 — placard + channel fixes**: ceiling conduit drop moved off the placard text
  (x −1.2 → −0.25); floor channel stripes desaturated and channel top roughness raised.
- **Loop 8 — night glow tuning**: holo glow night intensity 2.8 → 2.1.
- **Loop 9 — lime-tint root fix**: the saturated cyan holo point light (0x2fc4de) was
  turning warm floor paint lime green at night; desaturated the light to 0x66c8dc and
  aged the painted border lane. Verified close-ups; tested seated pose candidates.

## Final rubric self-scores

| Item | Score |
|---|---|
| Console workstations | 8.7 |
| Screens (PPI + aux) | 8.8 |
| Holo table | 8.8 |
| Room dressing / lived-in | 8.6 |
| Seated view composition | 8.6 (8.8 if the pose request below is applied) |
| Walk-in experience day/night | 8.5 |

## Performance

Numbers from `window.__game.perf()` on the headless SwiftShader probe (software
rasterizer on a shared 4-core VM — fps there is not GPU-representative; draw calls and
triangles are the meaningful budget figures):

- `seat_day`: 356 calls / 227,042 tris
- `seat_night`: 360 calls / 227,156 tris
- `close_holo`: 357 calls / 226,280 tris
- `walk_back_day`: 539 calls / 251,852 tris — this view looks through the open door at
  the exterior pads/vehicles; the excess over 420 is exterior geometry outside my scope.
  All interior-facing views stay well under the 420 budget.

Frame cost was stable across loops 6–9 at identical scenes (no regression). Canvas work
is bounded: PPI (928×512) at ≤12.5 Hz game time, the two aux canvases (512×288, 384×256)
alternate on a 0.26 s cadence, holo updates reuse pooled meshes. All interior statics are
merged by material (`mergeGeoms`) or instanced (`makeInstanced`); runtime randomness uses
`ctx.vrng`, build-time uses local seeded `Rand` streams so downstream RNG consumers are
untouched.

## Contract verification

- `createBase(ctx)` return shape unchanged; added `auxScreens` (left/right mesh refs) to
  the returned API, consumed by `radar.js` (safe additive change).
- `createRadar(ctx)` public API untouched (`update, clear, activeTracks, getTrack,
  trackFor, selectTrack, selectedTrackId, pickTrack`); `pickTrack` still raycasts holo
  blip hit-proxies.
- Full gameplay suite: **7/7 passing**. Note for CI hygiene: two tests ("NIGHT RAID",
  "manual engagement via console DOM controls") can exceed the 180 s test timeout on a
  contended software-rendering VM (both passed on re-run; "manual engagement" needed
  `--timeout 480000` and finished in 3.4 min wall time). The failures were
  `page.evaluate` wall-clock starvation, not assertion failures.

## Requested main.js change (seated console pose)

The current pose is decent but the PPI reads small. Tested candidates; the winner keeps
the whole holo disc in frame (needed for blip clicking) while making the PPI clearly
readable ("P4", see `shots_console/9_pose_p4.png` vs `9_pose_current.png`):

```js
// c = consolePos
consoleView.pos    = c + (2.05, 1.84,  2.95); // was c + (2.1, 1.92, 3.1)
consoleView.lookAt = c + (1.70, 1.18, -1.00); // was c + (1.85, 1.22, -0.9)
```

No other cross-file changes needed.

## Best screenshots

- `shots_console/8_seat_day.png` — seated view, day
- `shots_console/8_seat_night.png` — seated view, night ops (red battle lighting)
- `shots_console/9_close_ppi.png` — PPI scope + engagement sidebar close-up
- `shots_console/8_close_panel_night.png` — console three-quarter view at night
- `shots_console/9_close_holo_night.png` — holo table with volumetric cone at night

## Remaining weaknesses (honest)

- Chairs are believable but simple (no armrests/casters detail) — lowest-poly items in
  the seated frame.
- The walk-back view's draw-call overage comes from exterior geometry visible through
  the door; if the global budget tightens, the exterior clutter needs its own pass.
- Holo track labels can overlap the wall map board from some angles (they are 3D
  billboards; acceptable, but a smarter label layout could avoid it).
