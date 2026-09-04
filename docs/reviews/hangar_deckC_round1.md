# Critic — hangar complex & deck C, round 1 (independent reviewer, shots/iter_m2b)

Ranking: cargo, armory, detention, mess hall, medbay, crew quarters, hangar, flight control, shuttle bay, fighter bay, Kestrel ramp.

## Verdicts (A purpose · B coherence · C lighting · D density · E scale · F clean · G Imperial)
- hangar: A pass; B FAIL (side walls = 3–4 storeys of backlit pale panels behind lattice → office windows / parking garage; containment field a thick blue-white hex lattice, not the films' near-invisible shimmer); C FAIL (median luma 16, 58% < 20; far end black; brightest = white ceiling strips; no sodium-amber key on the deck; TIE's two glowing pink "headlamps" the only warm highlight); D FAIL (rim holds one TIE + a hazard sign: no carts, hoses, ladders, droids, crates, berth outlines); E pass; F pass (but white rim lane lines merge with the field edge); G FAIL.
- ramp (Kestrel): A FAIL (no hull, gear, hydraulics or interior spill in frame: a hazard-striped gangway to a wall); B FAIL (solid saturated orange treads; wall = same backlit module); C FAIL; D FAIL (deck at the ramp foot empty); E pass; F pass; G FAIL (pale grey tile deck, no glyphs, no amber floods).
- fighter_bay: A FAIL (no fighter, cradle, hoist or fuel line visible: empty warehouse); B pass; C FAIL; D FAIL (~6 props on 4000 m²); E pass; F pass; G FAIL.
- shuttle_bay: A pass; B FAIL (brightest/coolest room; glowing blue cube on a pedestal = placeholder; museum rope stanchions; walls read as lit windows); C FAIL (shuttle gets no key); D FAIL; E pass; F pass; G FAIL.
- cargo: A pass; B pass; C FAIL (central ceiling fixture a near-white blob; top shelves black); D pass; E pass; F pass; G pass marginal (containers read as plywood/cardboard: tan albedo).
- flight_control: A FAIL (office with monitors; hangar not visible); B pass; C FAIL; D pass; E FAIL (window = two 1.3 m panes flanking a door showing black void; the door opens 16 m above the deck with no visible balcony); F pass; G pass.
- crew_quarters: A FAIL (no bunks visible from the spawn); B pass; C FAIL; D FAIL (back half empty); E pass; F pass; G pass.
- mess_hall: A pass; B pass; C FAIL (white panels + galley lamp bloom); D pass; E pass; F pass; G FAIL (industrial-chic canteen; no glyphs / severity).
- medbay: A pass; B pass; C FAIL (pod not self-lit); D FAIL (right half empty); E pass; F pass; G pass.
- armory: A pass; B pass; C FAIL (trooper stands get no key); D pass; E pass; F pass; G pass.
- detention: A pass; B pass; C FAIL (huge near-white ceiling fixture over the desk destroys the red mood); D pass; E pass; F pass; G pass.

## Fixes
1. Hangar field: single translucent plane (#4a7fff, opacity 0.06–0.10, additive), soft fresnel rim glow ≤ 1.5 m around the opening, no white edge lines — DONE centrally for the material (opacity 0.07, faint lattice); the builder must delete the white edge lines.
2. Hangar walls: dark structural bays (#0c0d10 panels, #3a3d44 ribs, black trim) with one row of small amber lamp points per gallery level; backlit glazing ONLY for the flight-control booth (landmark).
3. Hangar deck lighting: 6–8 sodium-amber spots (#ffb45a, ~60° cone) at rack height aimed at the deck rims and TIE berths; ceiling white strips ≤ 30% and warm-tinted; fog slightly amber. Target median luma ≥ 30.
4. Hangar deck material: near-black (#141517, roughness 0.6) with painted white/yellow berth outlines, taxi arrows, chevrons at the blast doors.
5. TIE model: remove the two glowing pink lamps on the ball (viewport = dark octagon with thin grey frame); dark rib lines on the wing faces; each deck berth gets a clamp cradle + ground-crew kit (fuel cart, hose reel, ladder, power droid).
6. Kestrel: frame hull + gear + ramp in a deck-level shot (view `kestrel_deck` added); add umbilical cables, fuel line, chocks, staged crates at the ramp foot; warm interior spill down the ramp; treads #c8781e chevrons on #1a1a1a at ~40% coverage instead of solid orange.
7. Fighter bay: 2–3 TIEs on maintenance cradles (one with a wing panel off, one on a lift), overhead hoist rail with chain hoist, hose reels running to a TIE, tool chests, grated maintenance pit with amber underlight.
8. Shuttle model: solid #c9ccd2 wings with 3–4 dark seams (not glazed); folded wings ~2.3× body height with tapered tips; dorsal fin thinner (~0.3 m) and taller; visible gear struts + lowered ramp with interior spill; two cool-white floods keyed on the shuttle.
9. Shuttle bay: remove the glowing blue cube-on-pedestal and the rope stanchions; painted exclusion outlines + 2–3 hazard bollards; fuel/power carts and crate stacks by the wall.
10. Flight control: full-width glazed strip (sill 0.9, head 3.2, full 14 m) tilted ~12° outward; move the exit door or build a catwalk on the hangar side of it (the hangar builder already has a y=16 catwalk: make it visible from inside); light the hangar below.
11. Ceiling fixtures (all deck C, both bays, FC): emissive ≤ 2.0 with louvre grille; detention: front-centre fixture → dim red; mess hall: kill the galley lamp bloom. (Central kit ceilings are now dark with dim slots — rooms with own ceilings must follow.)
12. Crew quarters: bunks visible from the spawn (3-tier stacks along the back and side walls) — they exist in the builder; re-stage the room so the spawn view shows them, fill the back half.
13. Medbay right half: 2–3 more beds with teal arm lamps, droid stand, glass-front cabinets; pod with internal teal emissive + soft point light as hero.
14. Cargo: containers grey #6d7076 / dark #2b2d31 with hazard stripes and glyph labels (drop the wood tone); dim the central fixture, add a grille.
15. Mess hall: recessed black slot lights with amber bars instead of pendant shades; glyph stencils on pillars; black/grey serving counter; cog roundels; pale-grey galley tiles.

## Duplication
Same wall module everywhere (vary per room: medbay white tile, detention dark ribbed, armory mesh, FC glazing, hangar dark structural); same dirt-speckle runner in crew quarters, mess, medbay, detention, FC (remove in medbay and FC); green arc screen ×3 in FC; no-entry roundel ×3; rope stanchions ×2; identical pillar with light strips; one crate model; "backlit pale panel as window" reused (hangar galleries, fighter-bay and shuttle-bay far walls).
