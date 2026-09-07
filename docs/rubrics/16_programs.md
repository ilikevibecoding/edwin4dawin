# Rubric 16 — Building programs, dossiers, the four-differences rule and the building scorer

Acceptance criteria for workstream P3 (docs/ROUND6_PLAN.md, Pass 2). Numbered so tests and the report can cite
them. Sources: docs/overhaul/SPEC.md section 6 (dossiers, repetition), section 7 (the twenty programs and their
completion tests), section 17 (the building rubric) and section 1 (era and material identity).

Everything below is checked offline against blueprints (`node scripts/test-programs.mjs`) unless marked *visual*.

## A. Programs API and host mapping (spec 7, plan contract)

1. `src/coruscant/programs/index.js` exports `programFor(lot, purpose, layout?) -> { id, name, address, owner,
   purpose, staff, customers, circulation, roomGraph, materials, interactions, inputs, outputs }` or `null` for a
   building outside the twenty programs. Pure and deterministic: the same lot and layout seed give the same record.
2. Exactly twenty programs are defined (`PROGRAMS`): senate, delegation_office, jedi_temple, passenger_terminal,
   cargo_terminal, repair_hangar, droid_workshop, diner, cantina_club, opera_house, market_arcade, clinic,
   worker_apartments, affluent_apartments, transit_interchange, security_station, utility_plant, salvage_yard,
   criminal_front, community_hall.
3. `programs/hosts.js` maps every `purposeFor(lot).kind` that belongs to a program to it, maps landmark families
   explicitly, and assigns the programs without a natural host (the criminal-front freight brokerage) to
   deterministic lots in the fitting district. The mapping is a function of the layout only (no `Math.random`).
4. Every program has at least one host lot in the default layout (seed 1337); the report lists the hosts.
5. For every program the record carries: the room list with the functions named in spec 7, public circulation
   (street -> entry -> lobby -> served rooms), service circulation where spec 7 asks for it (service entry -> back of
   house), a room graph (edges), a material identity (palette per program, consistent with the district), player
   interactions per room kind, staff and customers derived from `purpose.roles` (read only), and economic inputs and
   outputs as `GOODS` keys. Goods the economy lacks are listed in `docs/overhaul/goods-requests.md`, never invented
   as keys.

## B. Programs built into the blueprints (spec 7 "apply these programs to existing buildings")

6. The signature rooms of a program exist in the blueprint of every host lot as rooms labelled with the program's
   room kinds (`meta.rooms[].kind`), furnished by templates in `src/coruscant/rooms/programs.js`, dispatched from
   `buildings.js` (towers) or built by the landmark module (landmarks, matched by accepted kind patterns).
7. Room counts follow footprint: each program has a *core* room set every host must have and an *extended* set
   required only of hosts with enough rooms (>= 40 planner rooms); a compact host is reported as the compact variant,
   not failed (spec 7: "a kiosk and a hospital must not be forced into the same template").
8. Every program room is reachable on foot from the public entry (flood fill from the door over slabs, stairs and
   lift shafts, the same rule as `scripts/landmark-stats.mjs`), lit (a light-emitting block in or over the room),
   furnished to at least the landmark bar (furniture density >= 1/6 of floor cells), and offers at least one player
   interaction.
9. The tower generators keep their contracts: `scripts/test-coruscant-towers.mjs`, `scripts/test-rooms.mjs`,
   `node scripts/test-unit.mjs` and `npm test` stay green; W4's `ROOM_FUNCTIONS` kinds stay valid and every new room
   kind infers a sensible staffing function through `roomFunction()` (listed in the report).
10. Blueprint generation time per lot grows by at most 25% against the pass-2 baseline (towers 0.64 ms per lot,
    landmarks 96 ms for all twelve, measured with the timing in `buildings.js`).

## C. Completion tests (spec 7, one script per program)

11. `scripts/programs/<program>.mjs` exists for each of the twenty programs and exits non-zero when any host lot
    misses a core room, has an unreachable, unlit or sparse program room, a served room without an interaction, or
    no sign name (`purposeFor(lot).name`).
12. The Senate test checks the Senate blueprint (P4's) for the rooms spec 7 lists (chamber, public approach,
    security screening, delegation suites, committee rooms, petition office, press gallery, records, reception,
    staff services, maintenance access) by kind pattern and reports the misses without failing the suite while the
    Senate is being rebuilt; the visitor and staff routes are checked by flood fill.
13. Each script accepts `--url http://localhost:PORT/` and then walks one host from the street to its signature
    room in headless Chrome and writes a screenshot (`/tmp/p3-shots/<program>.png`). *visual*

## D. Dossiers (spec 6)

14. `scripts/dossiers.mjs` writes `docs/overhaul/dossiers/<lotId>.md` for every manifested building (433 in
    seed 1337) and `index.md`. Each dossier has: name and address, owner (a deterministic person name from the lot
    seed via `src/npc/coruscant/names.js`), purpose, staff, customers, circulation, room graph as a list of edges,
    material identity, interactions, economic inputs and outputs, a local problem, a connection to another location,
    and "what makes it different from its siblings" produced by the similarity tool.
15. Dossier generation is deterministic (a second run changes no file) and runs in well under a minute.

## E. The four-differences rule (spec 6)

16. `scripts/room-similarity.mjs` compares every pair of same-kind buildings (kind = `purposeFor(lot).kind`) on
    seven axes: room graph shape, palette, signature room, staff roles, interactions, floor count / massing and
    entry arrangement, and counts the axes on which the pair differs meaningfully (thresholds documented in the
    script). Every pair must differ on at least four axes, including at least one spatial axis (graph, massing,
    entry, signature room) and one functional axis (staff, interactions, signature room).
17. The tool reports the number of pairs checked per kind, the closest pair per kind with its differences listed,
    and exits non-zero on any failing pair. Variation axes are added to the generators until every pair passes.

## F. The building rubric scorer (spec 17)

18. `scripts/score-buildings.mjs` scores every manifested playable building in ten categories, 0-5 each, with the
    frozen weights of spec 17: identity 12, floor plan 18, interior 12, interactions 10, NPC behaviour 12, economy
    10, story 8, lighting and sound 8, access 6, technical 4 (total 100). Each rating comes from automated
    evidence documented next to the formula; object counts alone never earn points.
19. Hard failures score 0 overall regardless of category ratings: no furnished interior, broken traversal (the entry
    cannot reach the rooms), a fake transaction (a `sells` item without a `GOODS` entry).
20. Thresholds: ordinary buildings need >= 85 with no category below 3 and >= 4 in floor plan, interactions and NPC
    behaviour; the Senate, the ports (customs, spaceport terminal), the Jedi precinct and the principal explorable
    ships need >= 90 with no category below 4.
21. Output: `docs/overhaul/scores/scores.json` (per-building totals and ratings) and `scores.md` (distribution per
    district and per program, mean, share at threshold, and every building below its threshold with the failing
    categories). At least 90% of ordinary buildings reach 85; the rest are listed with reasons.

## G. Visual proof (spec 17 "visual evidence plus behaviour evidence")

22. Eight to twelve screenshots of signature rooms across programs (diner counter, repair bay with a ship berth,
    droid bench, clinic ward, market arcade, cantina at night, community hall, salvage yard, utility plant,
    delegation office) taken in the running game, saved under `/opt/cursor/artifacts/p3_*.png`. *visual*
