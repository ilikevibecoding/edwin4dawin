# NORTHSTAR RESCUE — Progress Log

> **DO NOT OVERWRITE THE ORIGINAL PROMPT BELOW.** Append progress entries in the
> "Progress Entries" section at the bottom of this file.

<details>
<summary><strong>ORIGINAL PROJECT PROMPT (verbatim — recorded 2026-07-26, never overwrite)</strong></summary>

# Master Project: Single-Player Tactical Office FPS

You are the lead developer and integration owner for a team consisting of four Opus 5 agents and four Fable 5 agents.

Build a complete, highly polished, single-player tactical first-person shooter from scratch. It should capture the deliberate movement, weapon handling, visual clarity, tension, and round structure of modern competitive tactical shooters.

This must be an original game. Do not copy Counter-Strike 2 source code, branding, names, logos, UI, sounds, textures, characters, weapon skins, or map layouts. Do not reproduce `cs_office` room-for-room. Create an original snowbound corporate-office setting with its own layout, identity, assets, and visual language.

## Technology constraint

Do not use or migrate the project to Unity, Unreal Engine, or another heavyweight editor-based engine.

Build it as a locally runnable browser game using a capable WebGL or WebGPU-compatible 3D stack and standard web technologies. Use a single primary game canvas.

The finished game must:

- Start through one documented command.
- Load without missing assets or console errors.
- Run in a Chromium-based browser.
- Be controllable and testable with Playwright.
- Support mouse capture and first-person controls.
- Support fullscreen using `F`, with `Esc` exiting fullscreen.
- Resize rendering and input mapping correctly.
- Remain playable at 1920×1080.
- Provide scalable quality settings for weaker hardware.

Choose and document the technical stack at the beginning, then lock it. Do not repeatedly rewrite the engine foundation.

# Product definition

Create one polished single-player vertical slice titled with an original name.

Recommended working concept:

**Northstar Rescue**

A tactical response operator enters a snowbound corporate headquarters occupied by hostile forces. The player must locate and secure two civilian hostages, escort them to an extraction point, and survive the encounter.

## Required game flow

1. Title screen
2. Settings and controls
3. Difficulty selection
4. Mission briefing
5. Loadout selection
6. Level loading screen
7. Player spawn
8. Office infiltration
9. Hostage discovery and interaction
10. Escort or secure-hostage phase
11. Extraction
12. Victory or defeat screen
13. Restart and return-to-menu options

## Scope boundaries

This is not a multiplayer service.

Do not build:

- Matchmaking
- User accounts
- Servers
- Networking
- Voice chat
- Paid cosmetics
- Battle passes
- Multiple maps
- A campaign
- A live-service backend
- An elaborate inventory economy

Invest the saved effort in one exceptionally complete map, strong combat, believable AI, cohesive graphics, excellent visual feedback, and exhaustive asset polish.

# Eight-agent division of responsibility

The lead agent must create an ownership ledger before concurrent work begins. Agents must not modify the same shared files simultaneously.

## Opus 1 — Lead architect and integrator

Own:

- Technical architecture
- Repository organization
- Shared interfaces
- Build and startup commands
- Rendering-loop integration
- Agent coordination
- Asset manifest
- Integration sequencing
- Final decision-making
- Regression management
- Complete-game delivery

Only this agent should make broad, conflicting changes to shared entry points.

## Opus 2 — Player and combat systems

Own:

- First-person controller
- Mouse look and pointer lock
- Movement acceleration and deceleration
- Walking, crouching, jumping, and landing
- Collision behavior
- Camera movement
- Weapon handling
- Aiming
- Firing
- Recoil
- Spread
- Reloading
- Ammunition
- Weapon switching
- Hit detection
- Damage
- Armor
- Death
- Surface penetration only if it can be completed reliably
- Weapon-state integration with animation and sound

## Opus 3 — AI, objectives, and round systems

Own:

- Enemy perception
- Hearing and vision
- Patrols
- Investigation
- Suspicion
- Combat decisions
- Cover selection
- Firing behavior
- Reload behavior
- Searching
- Pathfinding
- Navigation recovery
- Hostage behavior
- Hostage following
- Extraction logic
- Mission timer
- Victory and defeat
- Difficulty scaling
- Round reset
- Checkpoint-free clean retries

## Opus 4 — Testing, performance, tools, and release quality

Own:

- Playwright automation
- Deterministic test hooks
- Screenshot collection
- Console-error monitoring
- Asset-gallery mode
- Repeatable camera locations
- Performance profiling
- Loading behavior
- Quality settings
- Resolution scaling
- Accessibility checks
- Integration test matrix
- Final regression testing

This agent may identify bugs in any system, but coordinate fixes with the responsible owner.

## Fable 1 — Art director, visual bible, and interface

Own:

- Visual target
- Color script
- Shape language
- Lighting references
- Material standards
- Scale standards
- Typography
- HUD
- Menus
- Icons
- Minimap styling
- Mission graphics
- Loading screens
- Original title treatment
- Consistency reviews across all assets

## Fable 2 — Map architecture and environmental composition

Own:

- Original office layout
- Modular architectural kit
- Room composition
- Navigation landmarks
- Doors and windows
- Walls, floors, and ceilings
- Stairways
- Service spaces
- Exterior views
- Snowbound atmosphere
- Environmental lighting placement
- Cover placement
- Sightline composition
- Architectural collision proxies

## Fable 3 — Props, materials, decals, and environmental storytelling

Own:

- Office prop library
- Furniture
- Electronics
- Utility objects
- Surface materials
- Texture sets
- Wear variations
- Decals
- Clutter
- Destruction variants
- Signs
- Environmental storytelling
- Prop collision
- LODs and asset optimization

## Fable 4 — Characters, weapons, animation, and effects

Own:

- First-person arms
- Player equipment
- Enemy characters
- Hostages
- Character variants
- Rigging
- Character animations
- Weapon models
- Weapon animations
- Muzzle effects
- Impact effects
- Smoke
- Glass effects
- Shell casings
- Character feedback
- Integration-ready exports

If the model pool has different strengths than expected, the lead may rebalance bounded tasks, but these eight ownership areas must remain covered.

# Coordination requirements

Create and maintain:

- `progress.md`
- An asset manifest
- A task and ownership ledger
- A visual-quality checklist
- A Playwright scenario checklist
- A known-issues list
- A before-and-after screenshot index

Record the original project prompt at the top of `progress.md` and never overwrite it.

Every asset-manifest entry must include:

- Unique asset ID
- Human-readable name
- Category
- Responsible agent
- File locations
- Intended rooms or game states
- Physical dimensions
- Pivot and orientation
- Material slots
- Texture maps
- Collision type
- LOD requirements
- Animation states, if applicable
- Audio dependencies, if applicable
- Current status
- Acceptance criteria
- Playwright evidence
- Remaining discrepancies

No agent may silently introduce an unregistered production asset.

# Visual direction

Use grounded stylized realism.

The game may retain slightly exaggerated, readable silhouettes, but its materials, lighting, scale, proportions, animation, and environmental detail must feel believable.

The result should resemble a professionally art-directed tactical FPS vertical slice, not:

- Primitive boxes with textures
- A generic asset-store scene
- Unmodified procedural geometry
- Flat-shaded placeholder art
- A collection of mismatched generated images
- A tech demo with gameplay text placed over it
- An excessively dark scene hiding unfinished assets

## Visual palette

Use a deliberate contrast between:

- Cold blue daylight and reflected snow near exterior windows
- Neutral or slightly green fluorescent office lighting
- Warm desk lamps, emergency lights, and occupied rooms
- Darker service corridors with readable navigation lighting
- Restrained red accents for danger and objective information

Maintain sufficient visibility for gameplay. Shadows may be dramatic but must not obscure enemies, doors, objectives, or navigation.

# Original office map

Create an original map called something similar to **Northstar Administrative Center**.

The map must not reproduce `cs_office`. It should use a different footprint, adjacency graph, sightline structure, spawn configuration, and visual identity.

## Required areas

Account for and build each of these areas:

1. Snow-covered employee entrance
2. Security vestibule
3. Reception lobby
4. Visitor waiting area
5. Main open-plan cubicle floor
6. Conference room
7. Executive-office corridor
8. Executive office
9. Records archive
10. Copy and mail room
11. Break room and kitchen
12. IT workspace
13. Server room
14. Restrooms
15. Janitor closet
16. Electrical or mechanical room
17. Central stairwell
18. Service corridor
19. Loading area
20. Extraction garage
21. At least two hostage locations
22. Limited exterior snow area or visible exterior courtyard

The interior should dominate the map so the graphical scope remains achievable.

## Map-design requirements

The layout must provide:

- At least two meaningful routes to each hostage area
- Short and medium-range combat
- One or two carefully controlled long sightlines
- Recognizable landmarks
- Readable room transitions
- Logical architectural flow
- Chokepoints with alternate approaches
- Cover that looks naturally placed
- Doors that support tactical entry
- Windows and interior glass that affect visibility
- Loops that prevent the map from becoming one linear hallway
- Navigation space for the player, enemies, and hostages
- No inaccessible visual promises
- No accidental dead ends
- No objects that appear climbable but behave inconsistently
- No gaps exposing an unfinished void

Every room must have an understandable real-world purpose.

# Comprehensive asset inventory

The following list is the minimum inventory. The lead must expand it whenever the implemented design introduces another visible need.

## Modular architecture

Create:

- Straight wall modules
- Interior and exterior corners
- Doorway modules
- Window modules
- Half walls
- Structural columns
- Ceiling grids
- Intact ceiling tiles
- Stained ceiling tiles
- Missing ceiling tiles
- Carpet floor modules
- Tile floor modules
- Concrete floor modules
- Stair modules
- Landings
- Railings
- Baseboards
- Crown or edge trim
- Thresholds
- Door frames
- Window frames
- Exterior wall modules
- Loading-bay structures
- Garage shutter
- Roof-edge geometry visible from playable areas
- Utility access panels
- Vent and duct modules
- Pipe and conduit modules
- Cable trays
- Floor drains

All frequently viewed architectural edges need believable thickness and beveling. Avoid razor-sharp computer-generated edges.

## Doors and access elements

Create and account for:

- Standard office doors
- Glass office doors
- Fire doors
- Security doors
- Restroom doors
- Server-room door
- Loading-area door
- Door handles
- Push bars
- Hinges
- Locks
- Card readers
- Keypads
- Door closers
- Door signs
- Intact, open, closed, locked, damaged, and moving states where needed

Doors must have correct pivots, collision, sound, interaction range, and AI navigation behavior.

## Windows and glass

Create:

- Clear glass
- Frosted glass
- Tinted exterior glass
- Interior conference-room glass
- Window frames
- Blinds
- Partially open blinds
- Cracked-glass state
- Broken-glass state
- Glass fragments
- Reflection and roughness variation
- Impact effects

Glass must visually read as glass without becoming an opaque blue wall.

## Office furniture and electronics

Create:

- Reception desk
- Standard desks
- Executive desk
- Cubicle panels
- Conference table
- Desk chairs
- Conference chairs
- Waiting-room chairs
- Sofa
- Side tables
- Filing cabinets
- Drawer units
- Shelving
- Archive racks
- Bookcases
- Computer towers
- Monitors
- Dual-monitor setups
- Keyboards
- Mice
- Mouse pads
- Laptops
- Desk phones
- Headsets
- Docking stations
- Printers
- Large copier
- Paper trays
- Projector or conference display
- Whiteboards
- Wall clocks
- Security monitors
- Server racks
- Network equipment
- Uninterruptible power supplies
- Loose cables and cable bundles

Electronics need powered, unpowered, damaged, and emissive-screen treatments where appropriate.

## Break-room assets

Create:

- Kitchen cabinets
- Countertops
- Sink
- Faucet
- Refrigerator
- Microwave
- Coffee machine
- Coffee pot
- Electric kettle
- Vending machine
- Water cooler
- Break-room table
- Chairs
- Cups
- Mugs
- Plates
- Food containers
- Snack packaging
- Trash and recycling bins
- Paper-towel dispenser
- Soap dispenser
- Notice board

## Restroom assets

Create:

- Sinks
- Faucets
- Mirrors
- Toilets
- Urinals if used
- Stall walls
- Stall doors
- Hand dryer
- Paper-towel dispenser
- Soap dispenser
- Trash bin
- Plumbing details
- Restroom signs
- Tile materials
- Dampness and cleaning variations

## Maintenance and loading assets

Create:

- Electrical panels
- Breaker boxes
- Transformers or utility cabinets
- Exposed pipes
- Valves
- HVAC equipment
- Ductwork
- Fire extinguishers
- Fire cabinets
- Sprinkler heads
- Smoke detectors
- Emergency lights
- Exit signs
- Janitor cart
- Mop
- Bucket
- Broom
- Cleaning bottles
- Utility shelving
- Cardboard boxes
- Shipping crates
- Pallets
- Hand truck
- Ladder
- Tool case
- Warning cones
- Floor mats
- Loading barriers
- Garage controls

## Desk clutter and small props

Create enough variation to prevent obvious repetition:

- Paper sheets
- Stacks of paper
- Folders
- Binders
- Notebooks
- Pens
- Pencils
- Staplers
- Tape dispensers
- Scissors
- Sticky notes
- Paper clips
- ID badges
- Key cards
- Calendars
- Photo frames
- Original company brochures
- Coffee cups
- Water bottles
- Cans
- Food wrappers
- Desk organizers
- Plants
- Plant pots
- Coat hooks
- Coats
- Backpacks
- Briefcases
- Umbrellas
- Snow-wet footwear marks

Small props may use atlases, but they must retain convincing material separation and silhouettes.

## Signage and storytelling

All text and branding must be original.

Create:

- Company logo
- Department signs
- Room numbers
- Directional signs
- Safety posters
- Evacuation diagram
- Employee notices
- Security notices
- Meeting notes
- Whiteboard writing
- Bulletin-board materials
- Computer-screen interfaces
- Shipping labels
- Equipment labels
- Emergency instructions

Text should be legible where intended and abstracted where it would otherwise become visual noise.

## Surface materials

Build coherent physically based material families for:

- Painted drywall
- Plaster
- Acoustic ceiling tile
- Commercial carpet
- Vinyl flooring
- Ceramic tile
- Concrete
- Painted metal
- Brushed metal
- Stainless steel
- Aluminum
- Wood veneer
- Laminate
- Clear glass
- Frosted glass
- Rubber
- Hard plastic
- Soft plastic
- Fabric
- Leather or synthetic upholstery
- Paper and cardboard
- Electronics
- Snow
- Ice
- Wet surfaces
- Dirt
- Dust
- Soot
- Damaged surfaces

Each important material should use appropriate combinations of:

- Base color
- Normal information
- Roughness
- Metalness
- Ambient occlusion
- Emissive
- Opacity
- Detail normals
- Decal overlays

Do not bake unrealistic lighting into base-color textures.

## Environmental decals

Create variations for:

- Carpet wear
- Wall scuffs
- Floor dirt
- Water stains
- Ceiling leaks
- Dust accumulation
- Footprints
- Snow tracks
- Fingerprints on glass
- Torn tape
- Removed-sign residue
- Cable marks
- Bullet impacts by surface
- Cracked plaster
- Chipped paint
- Scorch marks
- Broken glass
- Blood effects, with an option to reduce or disable them

Decals must not flicker, z-fight, float, or repeat conspicuously.

# Character assets

Create original, non-branded characters.

## Required characters

- First-person player arms and hands
- Player tactical body visible where technically appropriate
- At least three hostile outfit variants
- At least four reusable hostile head or face variations
- At least two hostage character variations
- Optional additional clothing-color and equipment variations

## Character requirements

Characters need:

- Consistent human scale
- Clean silhouette
- Believable clothing layers
- Original insignia
- Material variation between fabric, armor, skin, rubber, and metal
- Rigging
- Animation-ready topology or an equivalent workable system
- Weapon attachment points
- Correct hand placement
- Collision and hit regions
- Shadow casting
- Distance simplification
- No visible mesh separation during normal movement
- No weapon clipping through faces, arms, or torsos

## Required animations

Account for:

- Idle
- Breathing
- Walking
- Running
- Crouching
- Turning
- Aiming
- Firing
- Reloading
- Flinch
- Taking cover
- Investigating
- Searching
- Death variations
- Hostage idle
- Hostage fear response
- Hostage crouch
- Hostage following
- Hostage stopping
- Hostage extraction

Foot placement, weapon alignment, transitions, and animation timing must receive visual review.

# Weapon assets

Use original fictional manufacturer names and visual treatments. Real-world categories may inspire function, but do not reproduce branded skins or Counter-Strike inventory presentation.

Create at minimum:

- Service pistol
- Compact submachine gun
- Tactical carbine
- Pump or semi-automatic shotgun
- Precision rifle
- Tactical knife
- Flash device
- Smoke device

For each firearm, account for:

- World model
- First-person model
- Magazine
- Chamber or bolt details visible during operation
- Muzzle
- Sights
- Ejection port
- Shell casing
- Ammunition representation
- Pickup presentation
- HUD icon
- Inventory icon
- Muzzle flash
- Smoke
- Tracer treatment
- Recoil behavior
- Sound set

## Weapon animations

Each applicable weapon needs:

- Draw
- Holster
- Idle
- Fire
- Aim transition
- Reload with ammunition remaining
- Empty reload
- Magazine removal
- Magazine insertion
- Chambering
- Recoil recovery
- Dry fire
- Movement sway
- Landing response
- Inspect only if it does not delay core completion

First-person weapons must not intersect walls, disappear through the camera, or dominate the screen.

# VFX requirements

Create and validate:

- Muzzle flashes by weapon family
- Muzzle smoke
- Shell ejection
- Tracers or subtle bullet-path feedback
- Concrete impact
- Drywall impact
- Wood impact
- Metal impact
- Glass impact
- Carpet or fabric impact
- Dust
- Sparks
- Debris
- Glass fracture
- Glass fragments
- Door damage
- Smoke-device volume
- Flash-device effect
- Snow particles near exterior openings
- Breath vapor where appropriate
- Hostage and objective feedback
- Subtle environmental dust
- Victory and defeat transitions

Effects must communicate events clearly without covering the player's view unnecessarily.

# Lighting and rendering requirements

Use a coherent lighting plan rather than placing lights randomly.

Account for:

- Cold exterior daylight
- Snow bounce near windows
- Fluorescent ceiling fixtures
- Warm localized lamps
- Emergency lighting
- Server-room emissive lights
- Exit-sign emissive materials
- Computer-screen glow
- Controlled dark service spaces
- Contact shadows
- Ambient occlusion
- Reflection treatment
- Exposure adaptation only if it remains comfortable
- Physically believable material response
- Stable shadows
- Restrained bloom
- Restrained vignette
- Color grading
- Anti-aliasing
- Resolution scaling
- Optional motion blur disabled by default

Avoid:

- Crushed black areas
- Blown-out windows
- Excessive bloom
- Wet-looking rough materials
- Identical roughness across the environment
- Shimmering shadows
- Light leaking through walls
- Floating highlights
- Unreadable enemies

# Texture and modeling standards

Use real-world units, with one world unit consistently representing one meter or the selected equivalent.

Every significant model must have:

- Correct scale
- Correct orientation
- Useful pivot
- Clean normals
- Appropriate smoothing
- Believable thickness
- Beveled exposed edges
- Organized material slots
- UVs or equivalent mapping
- Collision representation
- Appropriate LOD strategy
- Documented texture dependencies

Suggested texture tiers:

- Hero weapons, hands, and important characters: up to 2K when justified
- Major architectural material sets: up to 2K and tileable
- Standard props: 512 to 1K
- Tiny props: atlased where practical
- UI: resolution-independent or high-density

Optimize based on visible screen size. Do not assign high-resolution textures to assets that remain only a few pixels tall.

# Interface requirements

Create original interface graphics for:

- Title screen
- Main menu
- Mission briefing
- Difficulty selection
- Loadout screen
- Loading screen
- Pause menu
- Settings menu
- Control reference
- Crosshair
- Health
- Armor
- Ammunition
- Active weapon
- Interaction prompt
- Mission timer
- Objective state
- Hostage status
- Damage direction
- Minimal kill or incapacitation feedback
- Optional minimap
- Victory screen
- Defeat screen
- Restart confirmation

The HUD should remain minimal during play. Put detailed control instructions in menus and the mission briefing.

Support:

- Master volume
- Effects volume
- Music volume if music is used
- Mouse sensitivity
- Invert-Y option
- Field of view
- Graphics quality
- Resolution scale
- Crosshair visibility
- Reduced camera motion
- Reduced blood
- Subtitle or text equivalents for essential announcements

# Audio asset accounting

Although visual quality is the priority, no visible action should feel unfinished because its sound is absent.

Account for:

- Weapon fire by weapon family
- Indoor and distant gunshot tails
- Reload sounds
- Dry fire
- Shell casing impacts
- Footsteps by surface
- Crouched footsteps
- Door movement
- Door impact
- Glass damage
- Glass break
- Ricochets
- Bullet impacts by surface
- Clothing movement
- Hostile voices
- Hostage voices
- Objective announcements
- Interaction feedback
- UI navigation
- Victory and defeat
- HVAC ambience
- Fluorescent hum
- Server-room ambience
- Wind near exterior openings
- Distant storm ambience
- Room-dependent reverb or an efficient approximation

Do not use copyrighted Counter-Strike audio.

# Gameplay quality requirements

The finished vertical slice must include:

- Responsive WASD movement
- Mouse aiming
- Crouching
- Jumping if supported by map design
- Sprinting only if it fits the selected tactical pacing
- Weapon selection
- Aiming and firing
- Reloading
- Damage and armor
- Death and restart
- Enemy patrol and combat
- Enemy hearing and vision
- Enemy searching after losing the player
- Hostage interaction
- Hostage following
- Extraction
- Mission timer
- Victory and defeat
- Difficulty settings
- Pause and resume
- Clean restart without reloading stale state

Enemy AI does not need to imitate expert human players, but it must not stand still, see through walls, fire through impossible geometry, become permanently stuck, or ignore obvious combat events.

# Deterministic browser testing interface

Expose:

`window.render_game_to_text()`

It must return concise JSON describing the current player-relevant state, including:

- Coordinate-system convention
- Game mode
- Player position
- Player orientation
- Player velocity
- Health
- Armor
- Active weapon
- Magazine ammunition
- Reserve ammunition
- Current movement state
- Mission timer
- Objective state
- Hostage states
- Visible or relevant enemies
- Nearby doors
- Nearby interactable objects
- Victory or defeat state

Expose:

`window.advanceTime(ms)`

It must advance the simulation deterministically for automated testing.

Create a development-only QA mode that supports:

- Teleporting to named map checkpoints
- Selecting a weapon
- Spawning a specific enemy
- Freezing AI
- Switching lighting scenarios
- Displaying asset IDs
- Opening an asset gallery
- Resetting the mission
- Entering each objective state
- Showing collision and navigation data

The normal player build must not expose intrusive debug UI.

# Mandatory Playwright loop

After every meaningful implementation change:

1. Launch the game.
2. Run the established Playwright game client.
3. Enter gameplay.
4. Use short input bursts.
5. Pause intentionally between bursts.
6. Capture screenshots.
7. Capture `render_game_to_text()` output.
8. Inspect the screenshots visually.
9. Compare the screenshots with the expected state.
10. Review console errors.
11. Fix the first new error.
12. Reset the scenario.
13. Repeat until stable.

Do not validate only the title screen. Reach the affected gameplay state.

Test complete cause-and-effect chains. Examples:

- Firing must reduce ammunition, produce recoil and effects, hit the intended surface or enemy, apply damage, and update state.
- Reloading must transition through the correct animation and restore the correct ammunition.
- Opening a door must change its visual state, collision, navigation, and text-state output.
- Securing a hostage must change behavior, HUD state, objective state, and extraction eligibility.
- Reducing an enemy to zero health must end its combat behavior and update mission state.
- Restarting must reset enemies, hostages, ammunition, timer, doors, effects, and objective state.

# Per-asset production loop

For every asset:

## 1. Specify

Define:

- Purpose
- Location
- Dimensions
- Style target
- Material target
- Required states
- Interaction behavior
- Performance budget
- Screenshot acceptance views

## 2. Create

Model, generate, draw, texture, rig, animate, or program the asset.

## 3. Integrate

Place it in the real game with:

- Correct scale
- Correct lighting
- Correct collision
- Correct interaction
- Correct animation
- Correct audio
- Correct LOD behavior

## 4. Inspect

Use the asset gallery and its real game location.

Capture:

- Neutral-lighting view
- Production-lighting view
- Close view
- Normal gameplay-distance view
- Relevant damaged or animated states

## 5. Score

Score each category from 1 to 5:

- Silhouette
- Proportions
- Materials
- Texture quality
- Lighting response
- Animation
- Environmental integration
- Functional behavior
- Performance
- Consistency with the visual bible

An asset cannot pass with any score below 4.

## 6. Refine

Fix the highest-impact discrepancy and repeat the complete integration and Playwright inspection.

If three revisions fail to improve the asset meaningfully, change the underlying approach instead of making minor variations.

## 7. Accept

Mark the asset complete only after:

- It passes every criterion.
- It is visible in a reviewed gameplay screenshot.
- It has no missing dependencies.
- It causes no new console error.
- It does not regress performance unreasonably.
- The lead or visual director verifies it in context.

# Development phases

## Phase 1 — Foundation

Complete:

- Technical stack
- Repository
- Startup command
- Render loop
- Input
- Pointer lock
- First-person movement
- Collision
- Basic weapon prototype
- Test hooks
- `progress.md`
- Asset manifest
- Playwright baseline

## Phase 2 — Graybox

Complete the entire map using clear graybox geometry.

Validate:

- Scale
- Movement
- Sightlines
- Routes
- Doorways
- Cover
- AI navigation
- Hostage navigation
- Extraction flow
- Complete round flow

Do not produce final art for a layout that has not passed graybox gameplay.

## Phase 3 — Visual vertical slice

Fully finish one representative combat area containing:

- Architecture
- Furniture
- A door
- Glass
- A character
- A weapon
- Lighting
- VFX
- UI
- Audio
- AI interaction

Use this area to lock the quality bar before mass-producing assets.

## Phase 4 — Full asset production

Produce and integrate the complete registered asset inventory.

No placeholders may survive this phase.

## Phase 5 — Gameplay completion

Complete AI, objectives, hostages, difficulty, settings, full round flow, and clean restarts.

## Phase 6 — Visual-remaster passes

Perform distinct full-game passes:

1. Completeness pass
2. Scale and proportion pass
3. Material and texture pass
4. Lighting and color pass
5. Animation and VFX pass
6. Environmental storytelling pass
7. UI and readability pass
8. Performance and LOD pass
9. Collision and clipping pass
10. Final cohesion pass

After these passes, continue ranking and fixing the highest-impact remaining discrepancies.

## Phase 7 — Final validation

Run the complete Playwright matrix and visually inspect every required state.

# Non-negotiable defects

Do not report completion while any of these remain:

- Placeholder geometry
- Missing texture
- Broken material
- Unregistered production asset
- Copyrighted Counter-Strike asset
- Copied map section
- Console error
- Broken startup command
- Invisible objective
- Unusable door
- AI permanently stuck
- Hostage unable to extract
- Weapon failing to fire or reload
- Incorrect ammunition state
- Floating prop
- Severe mesh intersection
- First-person arm clipping
- Stretched UV
- Obvious z-fighting
- Light leaking through walls
- Unreadably dark combat area
- Broken glass without visual feedback
- Menu trapping the player
- Pause or restart failure
- Playwright state disagreeing with the rendered game
- Major frame-rate collapse in normal gameplay

# Continuous improvement rule

Do not stop after the first playable build or the first completed asset pass.

When every registered asset appears complete:

1. Play through the entire mission.
2. Capture a full screenshot matrix.
3. Audit the game room by room.
4. Rank the ten largest remaining visual or functional discrepancies.
5. Assign those discrepancies to the responsible agents.
6. Fix them.
7. Re-run affected scenarios.
8. Repeat the complete mission.
9. Start another audit.

Keep agents working on bounded improvements while useful work remains. Reassign an idle agent to QA, asset refinement, optimization, animation cleanup, environmental storytelling, or regression testing.

Stop only after:

- All required assets are registered and accepted.
- All gameplay flows pass.
- Every required room has been inspected.
- Every weapon and character state has evidence.
- No non-negotiable defect remains.
- At least two consecutive full-game audits uncover no material issue that can reasonably be improved within scope.

# Final deliverables

Provide:

- Complete runnable source
- All original or properly licensed assets
- Asset manifest
- Startup instructions
- Controls
- Architecture summary
- Playwright automation
- Full screenshot evidence
- Performance summary
- Known limitations
- Before-and-after or graybox-to-final comparison
- Final room-by-room checklist
- Final weapon and character checklist
- Final statement confirming that no Counter-Strike or Valve asset was copied

Begin immediately. Do not stop at planning. Establish the architecture and ownership ledger, create the graybox, validate the complete mission loop, and then proceed through the asset-production and continuous-improvement cycles.

</details>

---

## Progress Entries

Newest entries at the bottom. Each entry: date, agent role, what changed, evidence.

### 2026-07-26 — Opus 1 (Lead) — Project bootstrap
- Repository initialized on branch `cursor/northstar-rescue-57a6`.
- Technical stack locked (see `docs/architecture.md`): Vite 8 + TypeScript 7 + Three.js r185 (WebGL2), DOM-overlay UI, WebAudio-synthesized audio, 100% procedural assets (no binary/media files — guarantees originality and zero missing-asset errors), Playwright 1.62 driving system Chrome.
- Coordination documents created: this file, `docs/ownership-ledger.md`, `docs/asset-manifest.md`, `docs/visual-quality-checklist.md`, `docs/playwright-scenarios.md`, `docs/known-issues.md`, `docs/screenshot-index.md`, `docs/architecture.md`, `docs/visual-bible.md`.

### 2026-07-26 — Phase 1 Foundation + Phase 2 Graybox — COMPLETE
- **Opus 1**: engine (ACES, shadow budget, quality tiers, resize/resolution-scale), deterministic 120 Hz clock with `advanceTime`, event bus, settings store, seeded RNG, WebAudio synthesis suite (60+ patches), game state machine with full menu flow.
- **Opus 2**: FPS controller (pointer lock, crouch/jump/step-up, capsule-vs-AABB with axis separation), 8-weapon rig (fire/spread/recoil/reload incl. per-shell shotgun, switching, ADS, throwables), hitscan combat with drywall penetration and glass pass-through.
- **Opus 3**: layered 0.5 m nav grid + A* + LOS smoothing, enemy FSM (patrol/suspicious/investigate/combat/search + cover-seeking reloads + stuck watchdog + navigation recovery), hearing/vision perception with clear-glass LOS and smoke blockers, hostage follow/wait/extract, mission objectives + timer + extraction hold + victory/defeat, 3 difficulty tiers, clean checkpoint-free restart.
- **Opus 4**: `render_game_to_text()`, `advanceTime(ms)`, `__qa` API (teleport/spawn/freeze/lighting/reset/aimAt), 18-scenario Playwright suite (boot, settings persistence, full menu flow, resize, quality switching, determinism hash, movement/collision/stairs, fire/reload/switch chains, enemy & player damage chains, door chain, hostage+extraction→victory, timer defeat, restart reset, patrol/hearing/vision/search/difficulty) — **all passing**.
- **Fable 1**: visual bible, title treatment, HUD (vitals, ammo, objectives, hostage chips, minimap, crosshair w/ spread, hitmarkers, damage direction, announcements, subtitles), all menu screens.
- **Fable 2**: full original two-story annex (22 required areas + security office bonus), wall builder with openings/frames/sills/baseboards/liner finishes, doors (7 kinds, animated, dynamic collision), glass system (clear/frosted/wired, crack→shatter), stairs + guards, courtyard fence, snow environment (ground/drifts/treeline/mountains/sky/snowfall).
- **Fable 3**: 28-material procedural PBR library (world-scale UVs), graybox cover plan at final furniture footprints.
- **Fable 4**: articulated humanoid rig + procedural animations (walk/run/aim/fire/crouch/kneel/fear/flinch/death), 3 Kestrel outfits + 4 head variants + 2 civilians, first-person arms + all 8 view models with full anim states, VFX suite (impacts/sparks/dust/debris/tracers/casings/muzzle/smoke volumes/flash/blood w/ reduce option, bullet-hole decals).
- **Fixed en route**: nav plenum-node bug (ceiling tops sampled as floors — enemies never patrolled), floor-tolerant path goal snapping (elevated noise stimuli), teleported-enemy hit-volume desync, points-shader GLSL redefinition, PCFSoft deprecation, exterior drift leakage into the shell, interior faces of exterior walls showing raw brick.
- Evidence: `artifacts/shots/p2-graybox/*.png` (27 checkpoint views).

### 2026-07-26 — Phase 3 slice + Phase 4 asset production — landed
- **Fable 3**: prop framework (per-material merged batching, ~150 placed props ≈ 35 draw calls), full library: office (desks/chairs/cubicle pods/monitors incl. emissive screen content/copiers/server racks/security console/storage), break room (kitchen, fridge, vending "Polar Bites", coffee, water cooler), restrooms (sinks+mirrors+stalls+urinal+dispensers), maintenance & loading (panels, HVAC, pipes, extinguishers, crates, pallets, ladder, cones, barrels, workbench, hand truck), lobby set (reception desk w/ logo, badge gates, brand wall, standing banners), decal suite (wear/scuffs/stains/snow footprints/papers/cables/ceiling stains + leak pairs), missing-tile plenum glimpses, storytelling (Kestrel banners + materiel crates in occupied zones).
- **Fable 1**: signage/screen texture suite (original Norrsken logo & wordmark, dept signs, posters, evacuation diagram, notice boards, whiteboard writing, screen UIs incl. security cams & lockdown alert), menu-panel fix (software-compositing backdrop-filter defect), UI evidence tooling.
- **Fable 4**: enemy world-model weapons on a torso weapon mount (carry↔aim blend), red-dot ADS for the carbine with rear-part hiding (proper sight picture), casings/tracers refinement, blood pools (reduced-blood honored).
- **Fable 2**: ceiling fixture meshes aligned to every light source (troffers/tubes/pendants/high-bays), exit signs over egress doors, emergency lights, sprinklers/smoke detectors/vents, structural columns, under-balcony soffit + lighting, extraction vehicle on the apron.
- **Opus 4**: QA asset gallery (55 exhibits) + gallery sweep & contact-sheet tools, collision/nav visualization, UI/weapon-state capture tool; found & drove fixes: restroom sink blocking a doorway (S17), objective downgrade on late infiltrate, negative extraction countdown, perf stats measuring only the view-model pass.
- **Opus 1 (perf pass)**: player-following sun shadow frustum (±15 m, texel-snapped), merged door leafs/fence/rail bars/world weapons, accent meshes skip shadow pass; worst-view draw calls 1026 → ~770, typical ~450–600. Post-process bloom evaluated and rejected (HDR blowout + double tonemap) — glow language carried by emissives.
- Full suite: 21/21 scenarios green.
