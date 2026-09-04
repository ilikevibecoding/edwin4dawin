# Exterior critic — round 1 (independent reviewer, shots/iter_m2a)

| # | Item | Verdict | Reason |
|---|---|---|---|
| 1 | Silhouette | PASS | Wedge, terraces, T-head with domes and mast unmistakable; but terraces read as a stepped ziggurat ending in a blunt 84 m cliff at z=-420, and the head is a thin slab on a truss-braced stick rather than the films' chunky stepped tower. |
| 2 | Scale reads as km-class | FAIL | ~20 m high-contrast tile patchwork on the flanks, rivet-dot seams on the head plates, dark greeble scatter that reads as gravel, trench only ~16 m tall, far shots show a clean uniformly lit wedge. Only ext_tower gives real scale cues. |
| 3 | Medium-range detail | FAIL | Plating is a quilt of light/dark squares; greebles are same-shape dark boxes scattered uniformly; trench city is a thin dark strip with a metronomic row of white lights every 80 m; turbolaser batteries unidentifiable; ext_stern engines/housing pure black except glow discs. |
| 4 | Close range | FAIL | Bridge face is a flat tiled box: no plating steps around the viewports, windows dark, two LED-strip rows of 0.7 m floodlight boxes dominate; brow ends mid-tile. Belly is noise with random white pinpoints; reactor bulb is a black hemisphere with a UFO ring of lights. |
| 5 | Lighting | FAIL | ext_stern black silhouette with the sun in frame; hero/far front-lit so no shadow side; engine cores clip to hard white; belly/hangar ~5% grey; night-side moons render as a black disc / floating orange ring. |
| 6 | Materials | FAIL | Matte light-grey plastic with a stencilled grid; no roughness variation across plates, no streaking, no grime in recesses; stern soot invisible. |
| 7 | Composition | FAIL | Ship 32% of frame in hero, 16% in far, wedged between two planets; bow preset is a bull's-eye in the ocean planet; stern back-lit; belly clips planets; trench aims at open space. Only ext_tower and ext_hangar_mouth frame well. |
| 8 | Star Wars feel | FAIL | Missing the studio-model look: single hard key with deep shadow side, greebles in hull grey read by shadow not albedo, deep canyon trenches, layered tower with a chin, glowing bell interiors, weathering. |

## Prioritized fixes
1. Key/fill rig: per-preset `time` so the sun sits 45–60° off the camera axis, 25–35° up; sun sprite out of frame. (Hemisphere raised to 0.8 by the orchestrator; SHINE in hull_util may go back toward 0x3c4048.) Shadow side 15–20% grey, never below 8%.
2. Greeble tone/distribution: albedo = plate tone ±10%; dark only for vents/recesses/pipe undersides; per-instance base-darkening gradient; cluster along terrace bases, seams, districts; halve count on open plating.
3. Hull plating texture: per-tile variance ±5%, add low-frequency (150–400 m) tone layer, seams as 0.3 m dark gaps not dotted lines, delete rivet dots, faint fore–aft streaks, per-plate roughness 0.45–0.7.
4. Tower massing: stepped plinth under the head (hw 40→75→105), neck hw ~60 with draft 0.15, replace truss gussets with solid sloped fairings, 2–3 layered plate steps framing the viewport strip.
5. Terrace forward faces: split each terrace front into 2–3 setbacks (t0 yTop 40 at z=-420 stepping to 84 by z=-260), 0.25 draft, window rows / hatch clusters / pipe runs on them.
6. Trench: widen to v 0.28..0.62, depth 0.09·hw, darken floor/wall to ~0.35 albedo, cityLights strips on the inner wall, vary building heights, drop the every-80-m white dots (PD turrets dark with one red light).
7. Bridge viewports: emissive glow behind viewGlass or brighter interior so the strip glows; 3–4 recessed floods per row with exta_pool wash; extend the brow to the pilasters.
8. Engines: engineCore 0xdfeeff at ~60% with radial falloff; inner-bell blue emissive so walls read lit; plume cone ~2 L at 0.01; blue emissive gradient on the housing around each nozzle.
9. Belly: running lights in pairs along rails with 2–3 m additive glow quads; bulb floodlight ring → dim emissive collar; bulb albedo to hull tone; containment-field plane at the mouth (additive 0x4f8fff, ~0.15).
10. Weapons legibility: heavy turrets r≈18 with ~30 m barrels, hull-tone albedo, dark base ring; roof dishes with a distinct silhouette.
11. Far LOD aliasing: mipmaps + anisotropy on hull textures, far-LOD albedo with pre-blurred seams, far greeble roughness ≥ 0.6. (SMAA already in post.js.)
12. Presets: ext_hero pos [-1150,260,-1250] look [0,60,-100] fov 45; ext_far pos [-3000,1000,-2600] fov 30; ext_bow pos [-300,-10,-1450] look [0,40,-350]; ext_stern pos [850,240,1250] look [0,10,350] fov 50 + time with sun forward-starboard; ext_belly pos [-650,-480,-450] look [0,-60,-50] fov 55; ext_trench pos [-430,12,-260] look [-320,-2,120] fov 50; ext_bridge_close pos [-50,250,125]. (Night-side planet floor and HUD toggle done by the orchestrator: SHOT_NOHUD=1.)
