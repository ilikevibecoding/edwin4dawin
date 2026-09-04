# Interior critic — round 1 (independent reviewer, shots/iter_m2a + iter_m2b)

Luminance (mean / % pixels < 24): reactor 67/6.6, corridor_a 58/36, tactical 53/30, navigation 51/26, lounge 51/25,
hyperdrive 50/40, comms 47/27, escape_pods 43/39, bridge 42/41, lobby_a 38/35, observation 25/70, intel 20/76.

Ranking strongest → weakest: tactical, reactor, escape_pods, bridge, hyperdrive, navigation, comms, corridor_a, lounge, intel, observation, lobby_a.

## Per-room verdicts (A purpose · B coherence · C lighting · D density · E scale · F clean · G Imperial feel)
- bridge: A pass, B fail (blue used as edge-LED on every nosing; office downlight grid), C fail (ceiling brightest surface, pits/lower deck silhouettes, viewports light nothing), D fail (lower deck bare tile, far wall repeated module, white blob in the centre viewport), E pass, F pass, G fail (topology inverted: crew stations up top, command position 25 m aft of the windows, descending centre stair instead of an elevated spine over sunken pits; flat rectangular viewports).
- observation: A fail (dark lobby with a logo; windows peripheral/small/unlit), B pass, C fail (mean 25; only key is the emblem backlight; holo blown to white; stray ceiling hotspot), D fail (40% empty floor; one prop), E pass, F fail (beige untextured quad visible through the right viewport; holo clipped white), G fail (generic gear; letterbox windows).
- tactical: A pass, B pass, C pass (but the ring outshines the holotable), D fail (empty lower half; boxy consoles without legs/cables/seats), E pass, F pass, G fail (ring = retail fixture; kiosk consoles; LCD graphs).
- navigation: A pass, B pass, C fail (console bank a black silhouette; six cool-white ceiling panels fight the amber; bright runway leads nowhere), D fail (half the frame empty tile; plain side walls; cabinets = boxes with dots), E pass, F pass, G fail (TV control room).
- comms: A pass, B pass (same template as navigation), C fail (runway brightest; hologram pedestal invisible), D fail (empty foreground; right wall a featureless slab; racks = boxes with dots), E pass, F pass, G fail (wireframe globe = Star Trek icon; LCD graphs).
- intel: A fail (reads as a dim server room with the comms globe), B pass (strongest identity: red key, heavy door, hazard mat, glazed bays), C fail (mean 20, 76% black), D fail, E pass, F pass, G pass (most film-like doorway; only the globe breaks it).
- lounge: A pass, B pass, C fail (eight cool-white ceiling panels fight the amber; booths in shadow; one bloom hotspot), D fail (central 40% empty; booths flat blocks; bar counter a slab), E pass, F pass, G fail (nightclub runway; chess pawns).
- escape_pods: A pass, B pass, C pass, D fail (centre floor half the frame with only paint; far end one small box), E pass, F pass, G pass.
- corridor_a: A pass, B pass, C pass, D pass (though every module identical), E fail (6 m wide hospital hall; doors indistinguishable from panels), F pass, G pass (nearest to the films; blue floor LEDs and width are the tells).
- lobby_a: A fail (nothing says turbolift lobby), B fail, C fail (evenly-lit box), D fail, E pass, F pass, G fail.
- reactor: A pass, B pass, C fail (no hierarchy: rails, pillar tubes, gantry edges and core all the same white; fog flattens), D pass, E pass, F fail (two diagonal white bars read as floating rods; light pipes end in detached rings), G fail (Tron power core; Imperial engineering = dark void + one glowing source).
- hyperdrive: A pass, B pass, C fail (four bare lamps brightest with bloom; drive aperture a flat pale-blue disc like a porthole), D fail (identical side walls; plain cylinder with dot bolts), E pass, F pass (stripe edges aliased), G fail (generic engine room).

## Prioritised fixes
1. Ship-wide ceiling: dark ribbed ceilings with recessed 0.15 m slot lights at ~30% — DONE centrally in imperial_kit (impCeiling dark + emitWhiteDim slots, impWall cornice slots dim). Rooms that build their own ceilings must follow.
2. Bridge topology: central walkway at platform level from the aft door to the viewports, crew pits sunk ~1.5–1.8 m on both sides with narrow side stairs, no 10 m centre stair; spawn at the aft end of the walkway with the viewports ahead. (cells.js now supports `kit.skipDefaultFloor = true`.)
3. Bridge viewports as key light: taller feel (frame the openings with angled jambs), starlight/emissive raised so it lights the walkway floor; remove downlights over the walkway; decide what the white ship silhouette is (dim non-emissive exterior vessel or remove).
4. Intel exposure: dim red area light (~0.3 equivalent) + a small cool practical per rack → mean luma ~35; replace the wireframe globe with a room-specific prop (surveillance monitor bank or a navicomp-styled data core).
5. Observation gallery: continuous viewport band — spec now gives 3 wide bays per side (TOWER.galleryViewports count 3, y 233.0–235.6); delete/texture the beige quad; holo emissive ~0.6 with interior detail; viewing rail with standing scopes.
6. Emblem: crest redesigned centrally (6 wedge spokes, inner ring, notched outer ring) — IMP_DECAL.cog; repeat it on the bridge floor and lobby wall.
7. Reactor hierarchy: core the only warm emissive; rails and pillar tubes to ~20% (or dim amber); delete or attach the diagonal ceiling bars; fog 0.012 → ~0.006 (spec) — orchestrator will lower the spec fog to 0.007.
8. Hyperdrive: recess the four lamps into shrouds aimed at the drive at ~50%; aperture → dark ring with a pulsing blue core and rotor/coil geometry; cable trays and pipework drive→walls; recessed hex bolts instead of dot bolts.
9. Tactical ring: recess into a cove or thin to 0.1 m at ~30% + one downlight over the dais so the holotable is the brightest object; consoles get kick recess, conduit, stools.
10. Console silhouettes (navigation, comms): downward practical under each screen hood (small amber/cyan light); chairs at the navigation bank.
11. Floor runways: keep only in tactical (dais approach); delete in the lounge; downgrade in comms/navigation to a dark inlay with a 0.2 edge. (Kit lanes are now dark deck inlays without emissive edges by default.)
12. Empty floors (lounge, lobby, navigation, comms, escape pods): lounge → tables in 3–4 clusters + bar stools; lobby → benches, droid alcove, deck-number floor inlay; comms/navigation → a second console row or floor racks in the foreground; escape pods → far-end content.
13. Lobby turbolift doors: two leaves with a centre seam (they exist but read black — door leaves are now painted grey), lit frame in the deck accent, call panel, deck indicator above.
14. Corridor proportions: DONE centrally (4 m wide, 45° chamfered upper walls, dim floor LEDs, door frames proud of the panels).
15. Wall screen textures: DONE centrally — four distinct layouts per scheme (scrBlue0..3 etc.: 0 tactical plot, 1 systems bars, 2 star chart, 3 status grid); rooms should use different indexes per screen and the right scheme.

## Duplication to break up
Same ceiling fixture (fixed), same floor runway in 4 rooms, one blue graph texture on 15+ screens (fixed at the source; rooms must pick variants), wireframe globe in comms/intel/navigation, one recoloured vertical light tube everywhere, round holotable pedestal ×4, boxy console block ×5, white LED handrail ×5, identical wall panel module everywhere (vary panel widths/features per room), the navigation/comms/tactical layout template.
