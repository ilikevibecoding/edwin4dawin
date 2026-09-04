# Review rubric

Every review (visual critic or technical) scores against this list. A "maybe" is a fail. Reviews cite
the screenshot file and the exact defect so a fix can be made without re-deriving it.

## Visual — exterior (score at 50 m, 500 m and 3 km)
1. Silhouette: reads as an Imperial-class Star Destroyer from every preset (wedge, terraces, tower,
   domes, mast, engine block, reactor bulb).
2. Scale: the ship reads as enormous — detail density increases as the camera approaches; no single
   texture tile is recognisable as a repeat; greebles have sub-greebles at close range.
3. Layered armour: plate seams, raised/recessed plates, trench detail, hatches, sensor arrays,
   turbolasers, antennas; nothing is a flat sheet at 50 m.
4. Lighting: raking sun with real shadows from the tower and terraces; engines glow; window rows and
   running lights read at night side; nothing blown out, nothing pure black except space.
5. Weathering: soot near the engines, paint variation between plates, scorch marks; subtle.
6. No defects: z-fighting, floating pieces, holes, inverted faces, seams between hull pieces.

## Visual — interior (every registered view)
7. Purpose at a glance: you can name the room from the screenshot without the HUD label.
8. Imperial design language: light-grey panels + black ribs + recessed light bands (or the dark
   bridge/hangar variants), indicator grids, tactical screens, stencils; consistent across rooms but
   each room has its own lighting mood and accent colour.
9. Density: no bare wall within 3 m of where the player stands; props at human scale; secondary
   detail (bolts, seams, cables, labels) on every prop within 2 m.
10. Lighting: a key, fills and accents; readable shadows; light fixtures visible where light comes
    from; no blown highlights on panels; screens/grids readable.
11. Believable connections: doors lead somewhere; corridors have destinations; the room's doors match
    its purpose (blast doors on hangars/reactor, keypads on restricted rooms).
12. Bridge and hangar: recognisably the film archetypes (pits + walkway + windows; well + racks +
    gantries + fighters), cinematic from the main views.
13. No defects: z-fighting, floating props, props intersecting walls, missing faces, black voids,
    duplicated rooms, obviously random placement.

## Technical (measured with tools/review.mjs)
14. Launches: no page errors; load time and per-phase build times recorded.
15. Budgets: every view ≤ 400 draw calls and ≤ 1.5M triangles; hero rooms ≤ 60 own draw calls;
    programs (shader compiles) stable after warm-up; heap recorded.
16. Navigation: every door traversed by the walk test; every locked door opens after the keypad;
    turbolift ride arrives on the right deck; player never falls out of the world; stairs/pits work.
17. Camera transitions: board (fly-in → fade → interior) and leave (fade → exterior stand-off) never
    show a broken frame; near/far/FOV correct in both modes.
18. Streaming: only the current cluster's rooms are visible inside; the exterior camera streams
    clusters in/out without pops; door portal culling hides rooms behind closed doors.
19. Extensibility: fighter pilot hook, sync snapshots, flight/landing stubs exist and are documented.
