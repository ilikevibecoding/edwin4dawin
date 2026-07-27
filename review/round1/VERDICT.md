# OPERATION BLACKSITE — ROUND 1 VISUAL VERDICT
### Reviewer: AAA art direction pass vs. Call of Duty MW2019 / MWII / MWIII gameplay captures
### Bar: "Could this exact 1080p frame ship in a modern COD?" (10 = indistinguishable, 7 = passes at a glance but pros notice)

**References used (review/refs/, gitignored):** MW2019 daylight urban FP rifle, MW2019 ADS optic, MW2019 night explosion FP, Warzone Verdansk downtown vista, MWIII daylight street FP, MW2019 viewmodel inspect, Warzone rooftop detail, MWIII soldiers in combat.

**Our shots reviewed (all 8, plus zoomed crops of weapon, hands, optic lens, explosion core, enemy, HUD):**
crossroads, market, overview, street_fx_firing, ads, street_fx_explosion, crossroads_fx_airstrike, street_enemyat.

---

## SCORES

| # | Category | Score /10 |
|---|----------|-----------|
| 1 | Lighting & Atmosphere | **3** |
| 2 | Environment Art | **2** |
| 3 | Weapons / Viewmodel | **2** |
| 4 | Effects (VFX) | **2** |
| 5 | Characters | **2** |
| 6 | HUD / UI | **4** |
| 7 | Image Quality | **3** |
| 8 | Overall | **0 of 8 shots pass. None borderline.** |

The scene composition, time-of-day choice, and HUD *language* show the team knows what MW looks like. The execution is at grey-box-with-textures level. Every frame is identifiable as "not COD" in under one second, and the tell is different in each shot — that's the bad news; the good news is most of the top tells are bugs and material passes, not "rebuild the game."

---

## 1. LIGHTING & ATMOSPHERE — 3/10

What works: a committed low-sun time of day, long shadows, warm horizon / cool ambient split. The grade direction is right; everything downstream of it is missing.

Defects:

- **No GI / bounce anywhere.** Shadow sides of the red brick building (firing/ads/enemy shots, left) and the entire crossroads intersection fall to a flat blue-grey with zero warm bounce from the sunlit orange facades opposite. In MW2019 a sunlit wall pours orange fill into the street. Add an ambient/hemisphere term tinted by ground + sky, or per-scene bounce fill lights.
- **No ambient occlusion.** Building bases meet the road with no darkening (crossroads, market); debris, boulders, tires, vehicles, and the enemy have no contact shadows — everything floats. SSAO is either off or invisibly weak; the overview rooftop shows razor-uniform illumination across a 30 m slab.
- **Sky banding + seam.** Smooth vertical gradient sky shows visible 8-bit banding (crossroads, airstrike, overview) and a UV seam/vertical smudge. Dither the sky gradient or use an HDRI.
- **Blank grey dome on the horizon** (crossroads + airstrike + overview, left horizon): an untextured hemisphere sits in the skyline like an unfinished mesh. Either texture it as a stadium/mosque or delete it.
- **Fog is a flat yellow band.** The overview haze is a uniform yellow-brown veil with a visible hard horizontal edge against the sky and no blue aerial-perspective shift with distance. Distant blocks should cool and desaturate, not just get milkier.
- **No sun disc, no glare, no horizon bloom** even though the sun should be in-frame near the horizon in crossroads/airstrike. The brightest thing in the sky is a gradient. Add sun disc + bloom + slight camera glare when looking sun-ward.
- **Shadows have uniform penumbra.** The long pole shadows on the overview roof and the building shadow across the firing-street stay knife-crisp along their entire 20 m run. Penumbra should widen with distance from the caster; even a fake 2-cascade softness would help.
- **Exposure crushes shadow interiors.** Shadowed shopfronts (firing shot, brick building's garage doors) go to near-black holes; MW keeps readable detail in shadow via GI + eye adaption.

## 2. ENVIRONMENT ART — 2/10

The layout (intersection, market, rooftops) is credible. The assets are primitives with tiling textures.

Defects:

- **Facades are painted boxes.** Every window in every shot is a dark rectangle decal flush with the wall — no inset depth, no frames, no glass specular/sky reflection, no interior variation (compare Warzone rooftop ref: each window has depth, dirt streaks, blinds). Add 20–30 cm inset window geo or parallax interior mapping + a glass material.
- **Balconies and fire escapes are flat decals/grids** (crossroads tan building, market center building): zero-thickness dark lattices pasted on the wall, casting no shadow. Need simple 3D railings that catch rim light.
- **Brick and stucco tile visibly** (red brick building, firing shot left: the same brick tile repeats with no color regions, no efflorescence, no damage patches; tan buildings repeat one stucco noise). Add macro variation masks and trim sheets.
- **Sandbags are literal capsules.** The emplacements (market, enemy shot) are stacks of giant smooth tan pills — reads as pool floats at any distance. Replace with a sculpted sandbag stack mesh with fabric normal + per-bag hue shifts.
- **Tires are untextured torus primitives** (enemy shot, in front of barriers). No tread, no sidewall, no dirt.
- **Vehicles are flat-shaded blockouts.** Orange car (crossroads), white sedan and pickup (street shots), burned truck (market): single flat albedo, black boxes for glass, no wheel-well shadow, no trim, plates, or panel lines. MWIII's street ref has readable plates and reflective glass on every parked car. Even 2–3 modular detail passes (glass material, plates, trim strip, grime gradient) would transform these.
- **Rubble reads as chocolate mounds** (crossroads right, enemy shot): smooth low-poly heaps with a muddy brown noise texture and a few planks. Rubble needs chunk silhouettes — brick clusters, rebar, slab pieces — plus dust skirts at the base.
- **Concrete barriers / granite block:** marble-swirl noise at the wrong scale, knife-sharp edges, weird black slot decals near the tops (enemy shot zoom). Need chamfered/damaged edges, chips, rebar, correct texel density.
- **Crosswalks and road paint are factory-fresh** white bars over dark asphalt (crossroads, airstrike). Erode them: 30–60 % paint loss in wheel lanes, edge nibbling.
- **Asphalt is one value.** Uniform dark blue-grey gravel noise everywhere; no tire-wear darkening along lanes, no patch repairs, no oil stains, no puddle variation. Big-scale (10–20 m) albedo/roughness variation masks are the single biggest ground win.
- **Floating props everywhere:** white planks hover near the barricade (firing/ads), pebbles/boulders sit shadowless on the road, a plank pile floats in the market. Ground them with contact shadows or decals.
- **Background skyline is blank cutouts.** Two light-grey monolith towers and flat silhouettes (market, ads, overview) with zero windows or texture, popping against the sky. Texture them or push them into the fog band.
- **Lollipop tree** (overview, right): a dark sphere on a stick above the roofline. Replace with a card/branch tree or cut it.
- **Market canopies are rigid planes on sticks** — no cloth sag, no pole caps, no ropes, flat grey albedo (market). Sag + stripe fabric + rope details.

## 3. WEAPONS / VIEWMODEL — 2/10 (on screen 100 % of the time — highest-leverage art surface in the game)

Zoomed crops confirm:

- **Receiver is a featureless navy-blue box** with a glossy blue-plastic specular. Real M4s are neutral parkerized grey-black with micro-roughness variation. Kill the blue tint, add roughness breakup + edge wear, and give the receiver its landmarks: ejection port, bolt, selector, mag release, stampings (normal map is fine at these angles).
- **Picatinny rail teeth are 3–4× real scale** — the top rail reads as LEGO staircase, and the rear "staircase" blocks in the ADS shot fill a quarter of the screen with flat black steps. Halve the tooth height/pitch and add spec breakup.
- **Barrel is a shiny brown-bronze pipe** with a single white Blinn streak and a white plastic ring where it meets the receiver (firing crop). Should be near-black steel; the white ring must go.
- **Foregrip is a bare wooden dowel** (tan cylinder, rounded cap, zero texture).
- **Hands are bare tan capsules.** The firing/enemy-shot crops show four sausage fingers with no knuckles, nails, glove, or wrist — hovering near the grip rather than wrapping it. This is the most amateur single element in the frame. Replace with a real hand mesh in a tactical glove (fabric weave + leather palm like the MW2019 ref) and pose fingers around grip/handguard.
- **Red dot emitter glows through the housing.** The red dot is visible as a bright red blob from side and rear-oblique angles (firing, explosion, airstrike shots) — a red dot is only visible near boresight. Mask the emissive by view angle.
- **ADS lens renders a fake scene.** In the ADS shot the lens shows a blue-tinted miniature with a huge fuzzy orange-red orb (the "dot" blooming like a sunset) that doesn't match the scene behind the optic; the rim is a light-blue ring. It reads as a snow globe, not glass. Render the actual scene through the lens (or just leave it transparent), draw the reticle as a crisp 2–3 px emissive dot with tiny bloom, and tint the glass neutrally.
- **Focus hierarchy is inverted in ADS:** the lens content is the blurriest part of the frame while the far street stays sharp. MW blurs the housing and the world slightly, never the reticle plane.
- **No self-shadowing or AO on the gun** — rail never shadows the receiver, optic never shadows the rail; the weapon reads as ambient-lit plastic.
- **Stock/grip are flat tan wedges** visible bottom-right in every shot (looks like unfinished pine).

## 4. EFFECTS — 2/10

- **Explosion casts no light.** In street_fx_explosion the fireball erupts 15 m away and the street, barriers, and brick walls show zero orange illumination — the single biggest tell. The MW2019 ref's blast paints every nearby surface orange. Add a 1-second animated point light + surface glow.
- **Fireball is identical orange pom-poms.** A cluster of same-size, same-hue soft round sprites; no white-hot core, no flame texture/flipbook, no licking edges, no internal shadowing. Use a hot core (white→yellow→orange ramp), 2–3 flipbook flame sprites, and sooty self-shadowed smoke lobes.
- **Debris is untextured flying cubes.** The explosion crop shows literal flat-shaded grey/brown boxes mid-air, no motion blur, no rotation streaks, no trailing smoke. Swap in chunk meshes + short smoke/ember trails; even stretched billboards would beat cubes.
- **A dark grey hexagon** (an unlit particle/billboard polygon) is visible inside the fireball — sorting/material bug.
- **Smoke plumes are disconnected smudges.** The market plume is a giant soft blob hard-clipped by the frame top with no source; the firing/ads/enemy street plume floats above the roofline, cut off at its base. Attach emitters to a source (burning car/building), fade in from the base, add turbulence octaves.
- **Billboard rectangles show against fog** (overview: both plumes sit inside visible lighter boxes; also around the market smudge). Classic missing soft-particle/fog-composite: apply scene fog to particles and depth-fade the quads — this one bug breaks three of the eight shots.
- **No muzzle flash in the firing frame** despite 3 rounds fired (27/30) — if flash lifetime is 1–2 frames, add a guaranteed-visible 2-frame flash + muzzle light so captures/gameplay reads "firing."
- **Tracers/brass are giant glowing pills.** Two ~50 cm glowing yellow capsules hang mid-air near the right building (firing shot), aligned with nothing. Tracers should be thin stretched streaks along the shot line; brass should be small, fast, with a glint — decide which these are and fix scale/trajectory/emission accordingly.
- **Airstrike is unreadable** (crossroads_fx_airstrike): four black specks + thin white scratch-arcs in the sky, no aircraft silhouette, no bomb fall, no impact fireballs/dust columns/screen shake evidence at fxt 3.4. An airstrike needs a legible jet flyby, ordnance trails, and ground impacts that light the scene.
- **Zero ground interaction:** no scorch decal, no dust ring/shockwave, no lingering ember field after the blast.

## 5. CHARACTERS — 2/10

From the 11× zoom of street_enemyat (enemy at ~40 m in the barrier gap):

- **Monochrome silhouette:** the entire soldier is one near-black brown mass — no albedo separation between helmet, vest, webbing, uniform, skin. The MWIII ref reads helmet/plate-carrier/pouches/skin at any distance. Give the character 3–4 distinct material zones and lift shadow albedo.
- **No rim or fill light:** he dissolves into the dark rubble behind him. MW rims enemies subtly; add a rim term or an IBL fill so the silhouette pops.
- **Primitive anatomy:** capsule arms/legs, blob feet, ball head — visible even at 40 m in silhouette; elbows/shoulders bend as tubes.
- **Stiff aim pose:** arms extended symmetrically, no shoulder mount, weapon merges with arms into one dark lump; no lean, no weight shift.
- **Floats on the road:** no contact/blob shadow under his feet.
- **The rifle he holds has no read** — no stock/barrel/mag silhouette distinguishable.

## 6. HUD / UI — 4/10 (best category — the language is right, the craft isn't)

- **Right ideas:** top compass strip with heading box, "ELIMINATE HOSTILE FORCES | WEAPONS FREE" objective banner (genuinely MW-flavored copy), top-left tac-map, bottom-right weapon/ammo block. Layout matches MW2019.
- **Minimap render is low-res:** building blobs have pixelated, stair-stepped outlines and read as rounded biscuits; no street lines, no zoom-appropriate detail. Render the map at 2× and simplify footprints.
- **"SCORE 0 | K 0 · D 0" under the minimap** is arcade language — MW campaign/co-op shows no K/D line there. Cut it or move to scoreboard.
- **Killstreak UI:** three rounded-square boxes with clip-art glyphs (the skull especially), tiny padlocks, and a bracketed "[4]" floating below. MW uses distinct killstreak silhouettes with radial charge indicators — replace padlock+bracket with a fill/progress treatment.
- **Cartoon bomb glyph** (round bomb with fuse) for grenades — wrong era; use a frag silhouette icon.
- **Typography:** generic geometric sans with very wide letter-spacing on "M4A1", "GRID D7", "SCORE"; the MW family is condensed, industrial, tighter. Reserve ammo "/180" should be dimmer/smaller than the mag count; secondary chips ("AUTO", "G") need one step lower opacity.
- **Everything is the same white opacity** — no information hierarchy (MW dims everything that isn't ammo count or objective).

## 7. IMAGE QUALITY — 3/10

- **Thin-geometry aliasing:** power lines shimmer, stair-step, and literally break into dashes mid-span (visible in the ads crop — the wire vanishes in segments). Wires need thicker geo/AA'd line rendering or MSAA/TAA.
- **Hard sky banding** in every gradient sky; add dithering.
- **No temporal AA / film response:** raw edges on every roofline and window rectangle; MW's soft filmic look (TAA + grain + slight sharpen) is absent. Even subtle FXAA+grain would close 20 % of the gap.
- **Inverted DOF in ADS** (lens blurriest, world sharp) — see weapons.
- **Bloom nearly absent:** emissives (red dot, horizon) don't bleed; explosion doesn't bloom at all.
- **No motion blur on anything** — flying debris cubes and (presumed) falling brass render frozen-sharp, which reads as screenshot-of-a-diorama.
- **AO absence** reads as an image-quality artifact too — every object boundary is shadowless (see Lighting).
- **Fog/particle compositing boxes** (see Effects) are the most glaring "engine bug on screen" artifact.
- Positive: shadow maps are stable and unpixelated at 1080p; no visible shadow acne; texture filtering is fine.

## 8. OVERALL VERDICT — per shot

| Shot | Pass as AAA at first glance? | The ONE thing most breaking it |
|------|------------------------------|-------------------------------|
| crossroads | **NO** | Facades are painted boxes — flush black window decals + flat balconies read "cardboard model" instantly (plus the blank horizon dome). |
| market | **NO** | The giant sourceless smoke smudge hard-clipped at the top of the frame; second: capsule sandbags. |
| overview | **NO** | Visible billboard rectangles around both smoke plumes against the flat yellow haze band. |
| street_fx_firing | **NO** | Two giant glowing yellow pill "projectiles" mid-air + zero muzzle flash on a firing weapon. |
| ads | **NO** | The optic renders a fake blue snow-globe scene with a fuzzy orange orb instead of transparent glass + crisp dot. |
| street_fx_explosion | **NO** | Explosion casts no light on the scene; orange pom-poms + untextured flying cubes. |
| crossroads_fx_airstrike | **NO** | The "airstrike" is invisible — sky scratches and specks, no ordnance, no impacts, no scene response. |
| street_enemyat | **NO** | Enemy is a featureless black mannequin that melts into the rubble — no material separation, rim light, or contact shadow. |

---

## TOP 12 FIXES — ordered by visual impact per effort

1. **[vfx/engine] Fix particle–fog compositing (soft particles).** Apply scene fog to billboard particles and depth-fade quad edges; attach smoke plumes to real sources and fade them in from the base. One bug fix cleans up overview, market, firing, ads, and enemy shots.
2. **[weapons] Weapon material + proportion pass.** Neutral grey-black PBR with roughness variation and edge wear (kill the glossy navy-blue), rail teeth at 50 % current scale, black steel barrel (remove white collar ring), matte textured foregrip, receiver landmarks (ejection port, selector, markings) via normal map.
3. **[weapons] Real gloved hands.** Replace capsule fingers with a hand mesh in a tactical glove (fabric weave + leather palm), fingers posed around grip and handguard. On screen every frame; currently the single most amateur element.
4. **[vfx] Explosion rebuild + dynamic light.** White-hot core → orange flipbook flames → sooty self-shadowed smoke; spark/ember streaks with motion stretch; textured debris chunks with trails (delete the cubes); scorch decal + ground dust ring; 1 s animated point light that visibly paints nearby walls/road orange.
5. **[vfx] Gunfire readability.** Guaranteed 2-frame muzzle flash + muzzle light when firing; tracers as thin stretched streaks along the shot line; brass ~5 cm with a spec glint and tumble — eliminate the giant glowing pill capsules.
6. **[weapons] ADS optic truthfulness.** Transparent lens showing the real scene, crisp 2–3 px emissive reticle with small bloom, neutral glass tint, red-dot emissive masked off-axis, DOF on housing but never on the reticle plane/world.
7. **[world] Facade depth pass.** Inset window geometry (or parallax interiors) + glass material with sky reflection + per-window lit/blind variation; convert balconies and fire escapes to simple 3D railings that cast shadows.
8. **[world] Ground wear + contact shadows.** 10–20 m macro albedo/roughness masks on asphalt, tire-lane darkening, eroded crosswalk paint, oil stains; blob/SSAO contact shadows under every prop, vehicle, debris pile, and character — nothing floats.
9. **[engine] Lighting upgrade.** Hemisphere/bounce ambient tinted by sunlit surfaces (warm fill in shadowed streets), SSAO, penumbra widening with distance, sun disc + horizon bloom, dithered sky gradient, and delete/texture the blank horizon dome.
10. **[world] Primitive prop replacement.** Sculpted sandbag stacks, treaded tires, vehicle detail pass (glass material, plates, trim, wheel wells, grime), rubble chunk meshes with rebar/brick silhouettes; ground or delete the floating planks and pebbles; replace the lollipop tree; texture the background skyline monoliths or push them into fog.
11. **[ai/characters] Enemy readability.** 3–4 distinct material zones (helmet/vest/uniform/skin), rim or fill light so he separates from background, weighted aim pose with shoulder mount, contact shadow, and a readable weapon silhouette at 40 m.
12. **[ui] HUD craft pass.** Frag-silhouette grenade icon (drop the cartoon bomb), killstreak slots as MW-style silhouettes with radial progress (drop padlocks + "[4]"), remove the SCORE/K·D line, tighten letter-spacing, dim reserve ammo and secondary chips, render the minimap at 2× with clean footprint outlines.

*Verdict: today this reads as a well-organized grey-box with a HUD that knows where it's going. Fixes 1–6 are days-of-work items that would move every single screenshot; 7–12 are the campaign to survive a second glance.*
