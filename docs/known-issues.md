# Known issues and limitations

Owner: **Opus 1**. Honest record. Anything listed as a *non-negotiable defect* in
the brief and still present would appear at the top of this file; the
"Non-negotiable defect status" section below states each one explicitly.

## Non-negotiable defect status

| Defect | Status | How it is guarded |
| --- | --- | --- |
| Placeholder geometry | **Clear** | Every mesh is authored; `bevelBox` is the default primitive and sharp boxes appear only in hidden collision proxies and far LODs |
| Missing texture | **Not reachable** | No texture is fetched — all are painted at runtime by `src/art/textures.js` |
| Broken material | **Clear** | `mat()` logs and falls back if an unknown family is requested; no fallback has fired in any run |
| Unregistered production asset | **Clear** | 429 registered, 0 registration warnings, asserted by `smoke.spec.js` and the manifest generator's exit code |
| Copyrighted Counter-Strike asset | **Clear** | Nothing was copied or referenced; see the statement in `README.md` |
| Copied map section | **Clear** | Original plan; different footprint, adjacency graph, sightlines, spawn configuration and identity |
| Console error | **Clear** | Every spec asserts on `page` console errors and `__northstar.errors` |
| Broken startup command | **Clear** | `npm start` verified by the Playwright `webServer` and by every spec |
| Invisible objective | **Clear** | Objective panel, hostage strip, minimap markers and extraction bay markings; `flow.spec.js` walks all five objective states |
| Unusable door | **Clear** | `mission.spec.js` opens, closes, rolls and unlocks doors and asserts collision, passability and text state |
| AI permanently stuck | **Clear** | `ai.spec.js` samples 14 hostiles eight times over 56 s of building-wide alarm; five separate root causes were found and fixed |
| Hostage unable to extract | **Clear** | Both holding rooms produce a valid path; the follow logic has a guaranteed re-snap recovery after three failures |
| Weapon failing to fire or reload | **Clear** | All five firearms fire and reload in `combat.spec.js` |
| Incorrect ammunition state | **Clear** | Reserve loses exactly the rounds spent; asserted numerically |
| Floating prop | **Clear** | Fable 3 re-verified every surface placement against real prop heights |
| Severe mesh intersection | **Clear** | Prop clearance sweep over all 426 prop colliders |
| First-person arm clipping | **Clear** | Arms and weapon render in a separate overlay scene, so world clipping is structurally impossible; the arms themselves were rebuilt to remove self-intersection |
| Stretched UV | **Not reachable for architecture** | World-space box projection; props use authored UVs from primitives |
| Obvious z-fighting | **Clear** | Decals use a normal offset plus polygon offset |
| Light leaking through walls | **Clear** | Two-skin solid walls; point lights are range-bounded and count-capped |
| Unreadably dark combat area | **Clear** | Lighting rebalanced after the first review pass; ambient term added; `low` quality keeps interiors readable without shadows |
| Broken glass without visual feedback | **Clear** | Crack decal, shatter, shard particles and audio; asserted in `combat.spec.js` |
| Menu trapping the player | **Clear** | Esc always backs out; `flow.spec.js` exercises every pause-menu route |
| Pause or restart failure | **Clear** | Pause freezes the simulation; restart resets 12 categories of state, asserted individually |
| Playwright state disagreeing with the render | **Clear** | Every screenshot is written with the `render_game_to_text()` payload captured on the same frame |
| Major frame-rate collapse | **Clear on hardware** | See the software-rendering caveat below |

## Limitations, honestly stated

**1. First load takes about 20 seconds.**
All textures, geometry, the navigation grid and audio buffers are generated in
the browser. The loading screen covers it and the level is built in the
background while the title screen is up, so pressing *Begin Operation* is
instant. There is no way to make this instant without shipping binary assets,
which would break the all-original constraint.

**2. CI performance numbers are not gameplay performance numbers.**
The automated suite runs Chromium with SwiftShader software rasterisation
because the CI machine has no GPU. A single 1080p frame can take tens of
seconds there. The performance spec therefore asserts structural properties
(draw calls, batch counts, triangles submitted, build time) rather than frame
rate. On a real GPU the same views are 350–1 100 draw calls and 85 k–400 k
triangles, which is comfortable at 1920×1080.

**3. Shadow maps refresh on a cadence, not every frame.**
At `high` quality the sun shadow map updates every second frame, at `medium`
every third, and `low` disables sun shadows entirely. Fast-moving characters
therefore have shadows that lag by up to 33 ms. This is invisible in play and
removes a full extra scene pass. `ultra` refreshes every frame.

**4. No point-light shadows below `ultra`.**
A shadow-casting point light costs six extra scene passes. With 14 dynamic
lights that was the single largest cost in the renderer. `ultra` allows two.
Contact shadows in interiors come from the sun through windows plus material
cavity detail rather than from local fixtures.

**5. Animation is procedural, not keyframed.**
Bone transforms are driven by sine-based gaits, additive layers and springs.
This is a deliberate choice — it keeps everything original with no clip files —
but it means poses are a little more uniform than hand-keyed animation would be.
Foot planting is speed-locked so there is no visible skating at the authored
walk and run speeds.

**6. Hit detection uses per-bone spheres.**
Seven hit regions per character with authored radii, not the exact mesh
silhouette. A shot that grazes the very edge of a shoulder pad can miss. The
trade is that a nine-pellet shotgun blast against twenty-two characters stays
cheap and characters never need to enter the static BVH.

**7. The mid-block corridor is only 3 m wide at its narrowest.**
Escorting two hostages through it while fighting can feel cramped. This is a
deliberate chokepoint, and both hostages have an alternate route via the south
service corridor, but it is the tightest space in the escort path.

**8. Navigation cells in a doorway are marked as a "squeeze".**
Where the full 0.36 m agent capsule does not fit on the 0.4 m grid, the bake
falls back to a tighter probe and raises the traversal cost. Agents will still
prefer open ground, so occasionally two hostiles queue at a narrow door rather
than one taking a different route.

**9. Audio is synthesised, so it is stylised.**
Weapon reports, footsteps and voices are built from oscillators, filtered noise
and formant synthesis. They read correctly and carry the right information, but
they do not have the texture of recorded audio. Voice lines always publish a
subtitle so nothing depends on hearing them.

**10. `advanceTime()` is deterministic, real frames are not bit-identical.**
The fixed 120 Hz step makes automated runs reproducible. Live play uses an
accumulator against real frame times, so a live session and an automated session
diverge in the fractional step at the end of each frame. Gameplay-relevant state
is identical; sub-millimetre positions are not.

## Fixed during development (kept for the record)

| Issue | Root cause | Fix |
| --- | --- | --- |
| Recoil did not affect where shots landed | `lookDirection` ignored the recoil spring | Aim direction now includes recoil and hit punch; interaction uses a separate intent direction |
| A single keypress acted several times | One-shot input edges lived for a whole rendered frame, which contains several simulation steps | Edges are consumed after each step; global keys only act on frames that simulate |
| Ceilings blown to flat white | Fluorescent emitters sat 0.14 m below the soffit | Emitters moved to 0.55 m; bloom threshold raised; emissive intensities reduced |
| Executive office read as corrugated cardboard | Walnut veneer had 11 hard rings per 1.6 m tile | Regrained to 4.5 soft rings with a quarter of the contrast |
| Monitors were blank white rectangles | Flat emissive with no content | 13 original screen-content kinds on a shared atlas |
| First-person left arm was a bare skin tube | Arms were authored without sleeves or gloves and the support hand was not solved | Rebuilt with sleeve, cuff, glove, articulated fingers and a two-bone IK support hand on the handguard |
| Hostiles read as flat toy figures | No value separation between clothing layers | Lighter jacket over a darker plate carrier, pouches, webbing, belt, knee pads, radio and armband |
| The whole building alerted on frame one | Lobby guards saw the operator through the exterior curtain wall | Tinted and frosted glazing now block AI sight; only clear interior glass is transparent |
| 2 923 draw calls in the lobby | Merging by material alone produced map-spanning meshes, so frustum culling had nothing to cull | Batching partitions by spatial cell first (353 draw calls in the same view) |
| Tab crashed under software rendering | ~300 MB of texture memory | Normal and roughness maps halved on upload |
| Hostiles appeared permanently stuck | Five separate causes — see the navigation commit | `followPath` distinguishes "no path" from "arrived", sweep states share their path, noise reaction has a cooldown, the graph is pruned to one component, closed doors no longer cut the graph, stair treads are navigable, grid-aligned wall lines no longer punch holes, and both stair heads were walled off by their railings |
| Restrooms were completely impassable | Over-furnished, and a 0.9 m door is narrower than any 0.4 m grid centre can satisfy at 0.36 m radius | Room re-laid, doors widened to 1.0 m, and the bake gained a narrow-doorway fallback |
| Menu order did not match the brief | Loadout came before the briefing | Reordered to difficulty → briefing → loadout → deploy |
