# Rubric 12 — Spaceport v2 and map growth

Goal: the spaceport becomes a destination in its own right — four times the footprint, a grand train station of its
own, hangars where ships are repaired, a ship dealer, customs, freight — and the plateau grows to make room without
moving anything that exists.

## Acceptance criteria

| # | Criterion | Measure |
| --- | --- | --- |
| 1 | Footprint ≥ 4× today's `SPACEPORT` rect, grown westward/southward onto new plateau ground (`REGIONS.coruscant.half` grows; existing lots, landmarks and Travel coordinates keep their world positions; the frontier and ocean are untouched) | Layout diff: all pre-existing lot rects identical |
| 2 | Terminal: a grand arrivals/departures hall (≥ 60×40, ≥ 12 high) with holo departure boards, check-in counters, security arches, seating, cafs and shops (each with a purpose + vendor), toilets, a viewing gallery over the pads | Walk-through shots; rooms reachable + lit |
| 3 | Train station: a dedicated 4-platform terminus attached to the terminal (concourse, platform screens, stairs + lifts, a rail yard with a parked spare train); the hyperlane extends to it; the route/timetable gains the stop; the old Coruscant stop remains | Ride test frontier → spaceport terminus |
| 4 | Pads: ≥ 12 landing pads of 3 sizes with lit rings, blast walls, fuel bowsers, cargo containers, gantries; ≥ 3 hangars (open front, ≥ 24×16×12) with docked ships under repair (sparks, mechanics); a control tower (≥ 40 high) with a glass cab and radar mast | Screenshot per element |
| 5 | Ship dealer showroom: glass hall with 4 ships on plinths and price holo boards (rubric 08 purchase point) | Screenshot |
| 6 | Freight: container yard, cranes, a cargo hauler dock, conveyor to the terminal | Screenshot |
| 7 | Traffic integration: rubric 09 lanes serve every pad; ≥ 30 ships in the air; boarding works at every pad | Census |
| 8 | Signage and purposes: every hall and shop has a purpose + entrance sign (rubric 07) | Toast walk |
| 9 | Perf: spaceport chunks fill ≤ 8 ms each; draw calls at the terminal ≤ baseline + 30 | Bench |
| 10 | Determinism and tests: `scripts/test-spaceport.mjs` extended (pads, lanes clear, station reachability) | Green |

## Design notes

- Grow the plateau by extending `REGIONS.coruscant` (e.g. `half` 512 → 640 and shifting `cx` so the old rect stays
  put), then place the new spaceport rect on the new ground west of the current one; the current spaceport becomes
  the "old terminal" (domestic pads) connected by a covered walkway.
- The terminus station reuses `stations.js` builders (platform, screens, stair tower) with a 4-track layout; the
  route gets a third stop with the same timetable machinery (pure function of tick).
