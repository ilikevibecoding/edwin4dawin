# accockpit — defect log (cockpit + pilot + propeller gauntlet)

Categories 4 (propeller), 6 (cockpit and pilot), cockpit half of 7 (materials). Views: cockpit-city, glass-sun,
plane-front-quarter, plane-rear-quarter and the dev cameras in `tools/mkspec.py` (panel, hands, pilot, head, prop,
propfast, cockpit-idle, cockpit-sun, cockpit-night). Stills come from `tools/session.mjs` (one gated Chrome per
batch; specs from `tools/mkspec.py`), 1920x1080, `quality=high`, seed 20260904, frozen.

Severity: **hard** (breaks the illusion at a glance) / **strong** / **medium** / **minor**. Status: open / fixed
(round) / residual (left with a reason).

| # | View(s) | Defect | Severity | Status |
|---|---------|--------|----------|--------|
| D1 | plane-front-quarter, prop, glass-sun | Propeller shows no blades while turning at idle: the blades were faded to 12 % by 980 RPM and a uniform translucent disc stood in front of the cowl | hard | fixed R1: blades stay crisp below ~1050 RPM, a motion-smear sector trails each one (length = angle swept in 1/60 s, density = chord / (r sweep)), the disc takes over across 1050–1650 RPM |
| D2 | prop, aircraft_front | Blur disc a flat charcoal ellipse: no radial structure, no dependence on the sun | strong | fixed R1: polar map (blade coverage by radius, tip band, hairline streaks) + a polar normal map tilted by the blade angle, so the disc's lit side follows the sun |
| D3 | prop (any) | Blade twist inverted: chord rotated by the blade angle from the flight axis, i.e. a near-feathered tip and a flat shank; from ahead the blades read as slivers | strong | fixed R1 |
| D4 | cockpit-city, hands | Pilot's hands are smooth tan mitts with fused fingers | hard | fixed R2: palm slab, four tapered fingers curled round the grip with joint bulges, thumb over the top to the switches, wrist into the cuff, watch |
| D5 | glass-sun, pilot, head | Face a featureless skin oval; no nose, jaw, glasses, hair; headset a torus and two drums | strong | fixed R3: cranium + jaw ellipsoids, nose, wrapped sunglasses, hair under the cap, cups with domed backs, boom mic with windscreen, cable to the sidewall jack |
| D6 | glass-sun, pilot | Torso a box; arms straight tubes; no elbows; belts float 8 cm ahead of the chest | medium | fixed R3: lofted shirt torso leaning to the yoke (chest under the harness), shoulders, collar, buttons, pocket; elbows; boots on the pedals |
| D7 | cockpit-city, panel | Instrument panel a flat decal: painted bezels, no relief, digits float; dial glow flattens the shading by day | hard | fixed R4: lathe bezels 7 mm proud with screws, recessed dials, glass lenses, needle shadows, switch/knob/breaker/key parts, checklist clip; daytime glow cut to a third |
| D8 | cockpit-city, cockpit-sun | Windshield invisible from the seat: nothing catches the sun, no film | strong | fixed R5: forward-scatter sun haze through the dirt film from the cabin side (sun-ahead legs), on top of the existing Fresnel sky reflection, glare-shield mirror image and seals |
| D9 | cockpit-city | Prop disc invisible from the seat at cruise | medium | fixed R1 (disc coverage 3 chord / 2 pi r, tip band arcs) — verify |
| D10 | panel, cockpit-city | Every face of the new lathe bezels culled from the seat: the profile ran from the inner wall outward, so the lathe's normals pointed into the axis and the rings were visible only from inside the panel (found with the offline rasteriser) | hard (would have undone R4) | fixed R4b: profile reversed (outer foot up, over the crest, down the inner wall) |
| D11 | prop, aircraft_front | Blades inside-out: the section winding put 351 of 384 faces toward the blade's interior, so the blade was culled from outside and lit through the far surface (found with a numerical winding check) | hard (no blades again) | fixed R1b: winding reversed for the side quads and the tip cap |
| D12 | panel (dial faces) | ASI numerals 180/200/40 piled up under the legend; VSI legend on the numerals; engine dials without minor graduations; GPS a bare screen with digits printed on the panel | medium | fixed R4c: ASI 35 deg / 20 kt with the numerals on their own ring, VSI legend moved, minor ticks, GNS-style GPS bezel with lit boxed fields |
| D13 | pilot, head | Head on a 15 cm neck, shoulder line 6 cm low; nose a cone; small flat glasses | medium | fixed R7a: shoulder line 0.715 (seated acromion), torso leaning into the harness, neck into the jaw, wrapped glasses in a frame, rounded nose tip, mouth |
| D14 | pedestal, hands | Propeller and mixture levers painted whole in the knob colour (the arm re-tagged by the batch), round sticks on a bare box, no quadrant | medium | fixed R6: housing with a slotted plate on a rounded pedestal, flat arms about an inner pivot, ball / crown / ball knobs, friction lock |
| D15 | glass-sun, pilot, rear-quarter | Seats are plain slabs (a box cushion and a box back) | medium | fixed R7: bucket cushion with bolsters and a front roll, padded back with pleats and lumbar bolsters, piping (over the cabin's slabs, from pilot.ts) |
| D16 | cockpit-city | Compass a box with a decal on the glare shield | minor | fixed R8: rounded bowl housing on a bracket and base plate, framed card window, compensator screws, light hood |
| D17 | cockpit-city, hands, pilot | Both hands on the yoke (symmetric, no hand on the throttle) | minor | fixed R9: right hand closed round the throttle ball as part of the lever mesh, a two-bone right arm aimed at it every frame; the yoke keeps the left hand |
