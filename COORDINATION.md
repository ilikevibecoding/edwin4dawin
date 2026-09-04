# STAR DESTROYER BUILD — TEAM COORDINATION

STATUS: `PLAN PUBLISHED` — scaffold code (registry, kit extraction, light pool, camera modes) lands
on this branch next; watch this line. It becomes `SCAFFOLD READY` when `src/core/registry.js` exists.

Integration branch: `cursor/star-destroyer-ship-9544` (this file lives here, at the repo root).
Base of everything: the Kestrel demo, commit `ad511782` on `cursor/spaceship-interior-demo-ad4e`.
Playable build (integrator publishes after every merge):
`https://raw.githack.com/ilikevibecoding/edwin4dawin/cursor/star-destroyer-play-9544/index.html`

Four cloud agents work on this in parallel. There is no chat between agents. **Git is the only
channel.** Everything below exists so that four agents (and up to six subagents each) can build one
coherent ship without ever editing the same file.

---

## 1. Mission (the user's brief, condensed)

Transform the existing Kestrel first-person ship interior into an **Imperial Star Destroyer-inspired
capital ship**: a complete 3D object with exterior and interior, at recognisable scale, believable,
enormous, fully explorable. Do **not** add NPCs, missions, planets, combat, or landing gameplay. Do
prepare hooks for them.

Must-haves (acceptance criteria):
- Existing game still launches; existing systems (player, interactions, post, lighting, shots
  harness) keep working.
- Exterior: massive wedge hull, layered armour plating, panel seams, hatches, sensor arrays, antennas,
  turbolaser emplacements, shield-generator domes, engines/reactor, greebles, structural supports,
  windows, service points, docking/landing areas reserved for later, weathering + manufacturing
  variation, scale references. Excellent at close, medium and far range. LOD, instancing, culling.
- Interior: at least 10, target 20+ distinct connected rooms (list in §6). Each with purpose, identity,
  believable connections, correct scale, real access routes, dense designed detail.
- Bridge and hangar get the highest detail. Bridge: cinematic, intimidating, multiple stations,
  animated displays, layered platforms, big forward windows, low-key light, red/blue/amber
  instruments. Hangar: TIE-style fighter traffic (scripted paths, no NPCs), racks, gantries, cranes,
  blast doors, warning lights, control tower, tractor-beam-style docking effect, moving machinery.
- Player can: orbit/zoom/fly the exterior, transition inside, walk connected rooms, use doors,
  lifts, corridors, stairs; see interior/exterior relationship; return outside cleanly.
- Performance measured, not asserted: fps, frame ms, draw calls, triangles, memory, load time,
  visible objects.
- Everything original and procedural. **No downloaded models or textures, no copied proprietary
  assets, no trademarked insignia.** "Star Wars-inspired", not copied.

---

## 2. Team and roles

| Letter | Cloud agent run id | Workstream | Branch |
|---|---|---|---|
| **A** | `bc-9d2cb83f-2d3e-4297-b3dd-83035c529544` | **Integrator.** Architecture + scale, exterior hull + silhouette + LOD, camera + exterior/interior transitions, shared kit/materials/lighting/post, audio + network placeholders, performance, merges, gauntlet reviews, playable-build publishing | `cursor/star-destroyer-ship-9544` |
| **B** | `bc-624cbbb1-95b2-4ce5-82bb-455f2d92e845` | **Command tower — Deck 1.** Main bridge (flagship room), secondary navigation, tactical/holo planning, comms + sensors, restricted intelligence room, officers' quarters, observation gallery, Deck 1 corridors + lift lobby | `cursor/sd-command-tower-<your-suffix>` |
| **C** | `bc-5c9df309-dc4c-491e-8f9c-0acd3054f9bd` | **Crew + engineering — Decks 2 and 3.** Deck 2: briefing room, armory, security/detention, medbay, crew quarters, mess hall + galley, recreation lounge, escape-pod bay, life support (air/water/waste). Deck 3: engineering control, reactor chamber, hyperdrive room. Corridors + lift lobbies for both decks | `cursor/sd-crew-engineering-<your-suffix>` |
| **D** | `bc-27044d48-9403-4636-af76-59d715aec071` | **Hangar + ship systems — Deck 4 and infrastructure.** Doors system (auto-opening, all kinds), turbolift system, corridor kit, main hangar, fighter maintenance + refuel bay, shuttle bay, cargo + logistics bay, maintenance/repair bay, hangar flight-control tower, TIE-style traffic system with AI hooks, tractor-beam effect, blast doors, cranes/machinery | `cursor/sd-hangar-systems-<your-suffix>` |

Find your letter: call the `cursor-cloud` MCP tool `run-info` and match `bcId`. If that fails, ask
the user which letter you are. **Never guess** — two agents on one workstream is the failure mode
this document exists to prevent.

`<your-suffix>` is the 4-character suffix your own environment requires on branch names (the
digits/letters after the last dash in the branch-name template your system prompt gives you).

---

## 3. Protocol (read twice)

1. **Branch from the integration branch, never from `main` or the Kestrel branch:**
   ```sh
   git fetch origin cursor/star-destroyer-ship-9544
   git checkout -b cursor/sd-<area>-<your-suffix> origin/cursor/star-destroyer-ship-9544
   ```
2. **Edit only files you own** (§5). Shared files (`src/main.js`, `src/materials.js`,
   `src/textures.js`, `src/kit*`, `src/player.js`, `src/post.js`, `src/hud.js`, `src/space.js`,
   `index.html`, `src/style.css`, `package.json`, `tools/*`, this file) are A's. If you need a change
   there, write it under **Requests for integrator** in your status file and, if you are blocked,
   make the change **locally and uncommitted** to keep testing. Never commit it.
3. **Commit small, push often**: after every finished room/system, and at least every ~45 minutes of
   work. Unpushed work is invisible to the team.
4. **Before every push, merge the integration branch** so you pick up scaffold and contract updates:
   ```sh
   git fetch origin cursor/star-destroyer-ship-9544 && git merge origin/cursor/star-destroyer-ship-9544
   ```
   Re-read this file and `docs/review/` for your area after each merge.
5. **Status file is your voice.** Keep `docs/status/<letter>-<area>.md` current (template in
   `docs/status/TEMPLATE.md`). The integrator reads every status file on every integration pass.
6. **Open a draft PR** from your branch **against `cursor/star-destroyer-ship-9544`** (not `main`).
   Title `[SD] <Letter>: <area>`. Keep the PR body a copy of your status file's summary.
7. **No force-push, no amend of pushed commits, no rebase of pushed history, no history rewrites.**
8. **Contracts (§7–§9) do not change unilaterally.** Propose changes in your status file. A decides
   and announces in §13 "Decisions log". Until announced, build to the contract as written.
9. **No screenshots in git.** Keep them local and as run artifacts. Only A commits review images
   (compressed, under `docs/review/`).
10. **Do not publish builds.** Only A publishes to the play branch. One link for the user.
11. **Subagents**: run up to six in parallel, each with a disjoint file list inside your area, each
    reporting what changed / what was tested / what remains. Prefer isolated worktrees. Give each one
    a unique Vite port (`npx vite --host 127.0.0.1 --port 51xx --strictPort`) and pass that URL as the
    second argument to `tools/shots.mjs`. Run screenshot harnesses **serially** (4-CPU VM, software
    GL) — parallel Chrome instances thrash and produce garbage frame times.
12. **Report evidence, not adjectives.** Every claim of "done" comes with: harness run, stats numbers,
    view names screenshotted, and what a critic subagent said was still wrong.

---

## 4. Machine facts every agent must know

- Node 22, npm 10, Vite 8, three r185, `n8ao`, `playwright-core` driving system Chrome at
  `/usr/local/bin/google-chrome` (already used by `tools/shots.mjs`).
- **No GPU.** WebGL runs on SwiftShader. Frame times from the harness are software numbers — use
  them only for relative comparisons. Budget on draw calls, triangles, lights, texture memory.
- 4 CPUs, 15 GB RAM. Chrome + Vite + one `npm run build` at a time is fine; three Chromes is not.
- `npm install` once; `npm run dev` serves `http://127.0.0.1:5173`.
- Harness: `SHOT_QUICK=1 SHOT_VIEWS=<view,view> node tools/shots.mjs <tag> http://127.0.0.1:<port>/`
  writes `shots/iter_<tag>/<view>.png` + `results.json` (calls, tris, frame ms per view). After the
  scaffold lands, `SHOT_VIEWS` accepts any view name a module registers (§7 `views`).

---

## 5. Repository layout and ownership

```
COORDINATION.md                 A   this file
docs/status/<letter>-<area>.md  each agent, own file only
docs/status/TEMPLATE.md         A
docs/review/*                   A   integrator's review notes + compressed review images per area
docs/plan/*                     A   deck plans, measurements, baseline data
src/main.js                     A   bootstrap, module loading, loop, debug API
src/core/*                      A   registry (module discovery), streaming/culling, light pool,
                                    camera modes + transitions, audio + network placeholders, contracts
src/kit.js, src/kit/*           A   Kit (merge-per-material), Frame/panelGrid/porthole (extracted from
                                    ship.js), Imperial shared props (consoles, strips, rails, crates)
src/materials.js src/textures.js A  shared PBR library + procedural textures (+ Imperial palette)
src/space.js player.js post.js hud.js interact.js lighting.js style.css index.html  A
src/ship.js                     A   legacy Kestrel interior (kept for regression, `?ship=kestrel`)
src/exterior/**                 A   hull, plating, tower, domes, engines, weapons, greebles, LOD
src/camera/**                   A   orbit / fly / interior modes, transitions
src/rooms/deck1/**              B   one folder per room: rooms/deck1/<room>/index.js (+ helpers)
src/rooms/deck2/**              C
src/rooms/deck3/**              C
src/hangar/**                   D   hangar/<space>/index.js, hangar/traffic/index.js (system)
src/systems/doors/**            D   doors system (manifest kind "system")
src/systems/lifts/**            D   turbolift system (manifest kind "system")
src/systems/corridor/**         D   corridor kit helper for all decks (plain module, no manifest)
tools/*                         A   shots harness, perf tools, publish script
```

Rule of thumb: **you may create any file inside your folders; you may not touch anything outside
them.** Module-local materials/textures go in your own folder (`<area>/shared/materials.js`) and are
merged into your Kit (§8); never into `src/materials.js`.

---

## 6. World architecture

### 6.1 Coordinate system, units, scale
- Metres. **1:1 with the exterior.** The interior is built *inside* the exterior hull at true world
  positions, so bridge windows really look down the hull and TIEs really fly from space through the
  ventral aperture into the hangar. This is what makes it one ship instead of a set of rooms.
- Right-handed three.js: **+X starboard, +Y up, -Z forward (bow).** Player yaw 0 looks toward -Z.
- Ship origin (0,0,0): hull centreline, mid-length, at the side trench ("equator") height.
- Bow at **z = -800**, stern at **z = +800**. Stern half-width **470**.

### 6.2 Exterior envelope (A builds; numbers are for placing interiors — apertures are contracts)
| Element | Volume / position |
|---|---|
| Upper hull | shallow pyramid; centreline ridge y=0 at bow → **y=+75** at stern; y=0 at side edges |
| Lower hull | y from 0 down to **-95** (deepest z +100..+500), flat **keel plate at y = -85** for x ±120, z -80..+200 |
| Superstructure block | z +120..+760, x ±110, terraced up to **y=+135** |
| Command-tower neck | z +480..+560, x ±38, y +135..+232 |
| Bridge module ("head") | **z +455..+545, x ±90, y +232..+268**; front face z=+455 |
| Shield domes | centres (±62, +286, +500), r 20 |
| Engines | three main nozzles r 48 at (0,+20,+800), (±165,+12,+800); four auxiliaries r 16 at (±70,+45,+800), (±260,+5,+800) |
| **APERTURE BRIDGE** (A↔B contract) | tower front face, plane z +455..+458: **x ∈ [-19, +19], y ∈ [241.2, 245.4]**. A leaves the hole and builds the exterior surround; B owns everything at z ≥ 455.5 inside it (mullions, glass, sills) |
| **APERTURE OBSERVATION** (A↔B) | same face: **x ∈ [-78, -50], y ∈ [241.5, 244.5]** |
| **APERTURE HANGAR** (A↔D contract) | keel plate y=-85, hole **x ∈ [-36, +36], z ∈ [-30, +94]**, through y -85..-72. A owns y ≤ -85 (exterior); D owns y > -85 (lip, rails, warning lights, bay-door machinery) |

### 6.3 Decks (interior envelopes; deck owner controls layout inside, publishes exact bounds in manifests)
| Deck | Owner | Floor y | Envelope (x, z) | Lift lobby room id / anchor (§9.2) |
|---|---|---|---|---|
| 1 Command tower | B | **+240** | x ±88, z +458..+542, ceiling ≤ +264 | `d1-lobby`, anchor (0, 240, +522) dir (0,0,-1) |
| 2 Crew & operations | C | **+40** | x ±70, z +300..+470, ceiling ≤ +56 | `d2-lobby`, anchor (0, 40, +385) dir (0,0,-1) |
| 3 Engineering | C | **+12** | x ±80, z +540..+760, ceiling ≤ +60 (reactor may go to +110) | `d3-lobby`, anchor (0, 12, +565) dir (0,0,-1) |
| 4 Hangar | D | **-72** | x ±150, z -80..+270, ceiling ≤ -10; main hangar volume x ±80, z -70..+170 with the floor aperture of §6.2 | `d4-lobby`, anchor (0, -72, +181) dir (0,0,-1) |

Deck 1 suggested plan (B may adjust inside the envelope; the two apertures and the lift anchor are fixed):
- `bridge` x ±20, z +458..+512, walkway floor +240, crew pits floor **+237.6**, ceiling +249. Window
  wall at z=+458 fills APERTURE BRIDGE. Aft door to the spine corridor.
- Spine corridor `d1-spine` z +512..+516, x -80..+80. `d1-lobby` z +516..+526 around x 0.
- `nav` x -45..-22, z +460..+485 · `tactical` x +22..+45, z +460..+485 · `comms` x -45..-22,
  z +488..+510 · `intel` x +22..+45, z +488..+510 · `officers` x +48..+84, z +460..+510 (cabins off a
  private corridor) · `observation` x -84..-48, z +458..+510 (window band fills APERTURE OBSERVATION).

Deck 2/3/4 layouts are the owners' call inside their envelopes; publish them in manifests and in your
status file (a small ASCII plan is enough). Keep the reserved lift-cabin volume (§9.2) free.

Room ids are globally unique kebab-case and prefixed by deck: `d1-…`, `d2-…`, `d3-…`, `d4-…`
(the bridge is `d1-bridge`, the hangar is `d4-hangar`).

### 6.4 Why 1:1 works for rendering (A handles this; know it exists)
Camera near/far switch per mode (interior 0.05/6000, exterior 1/20000). **Avoid coplanar surfaces:**
offset ≥ 2 cm inside, ≥ 0.5 m on the exterior. Rooms are closed volumes so the streaming manager can
hide everything except the current room, its door-neighbours, and the exterior LOD when the room has
an aperture.

---

## 7. Module contract (the registry consumes exactly this)

Every room, hangar space, system and the exterior is a folder with an `index.js` whose **default
export is a manifest**. The registry discovers `src/{rooms,hangar,systems,exterior}/**/index.js`
automatically — **adding a room never requires editing a shared file.**

```js
// src/rooms/deck1/bridge/index.js
export default {
  id: "d1-bridge",              // globally unique kebab-case, deck-prefixed
  name: "Main Bridge",
  kind: "room",                 // "room" | "system" | "exterior"
  deck: 1,
  owner: "B",
  // World-space AABB this module builds inside. Nothing may be placed outside it.
  bounds: { min: [-22, 236, 458], max: [22, 250, 514] },
  // Openings on the bounds faces. The doors system (D) builds the door assembly; the room leaves a
  // clean rectangular hole. Both rooms sharing a door declare it with the SAME id.
  doors: [
    { id: "d1-bridge-aft", pos: [0, 240, 514], dir: [0, 0, 1], kind: "blast", to: "d1-spine" },
    //        pos = opening centre at FLOOR level on the bounds face; dir = outward normal
    //        kind: "standard" 2.4w×3.0h | "blast" 4.0w×4.0h | "hatch" 1.2w×2.0h | "bay" custom {w,h}
  ],
  // Optional: this room contains a lift cabin door (lobby rooms only; see §9.2)
  lift: null,
  // Player spawn used by ?spawn=d1-bridge, by lifts and by the exterior→interior transition
  spawn: { pos: [0, 240, 508], yaw: 0 },
  // Rooms with exterior windows: the streaming manager keeps the exterior LOD visible while inside
  apertures: ["bridge"],        // names from §6.2, or []
  // Deterministic views for the screenshot harness. pos = feet; yaw/pitch degrees.
  views: {
    "d1-bridge-walkway": { pos: [0, 240, 505], yaw: 0, pitch: -3 },
    "d1-bridge-pit":     { pos: [-6, 237.6, 480], yaw: 90, pitch: 4 },
  },
  // Build once. Return optional update/dispose/api.
  build(ctx) {
    // ... kit-bash into ctx.kit, push light descriptors, register interactables ...
    return {
      update(dt, t) {},         // optional per-frame (only called while the room is active)
      dispose() {},             // optional
      api: {},                  // systems expose their API here (doors, lifts, traffic)
    };
  },
};
```

Views for exterior/camera shots use `{ mode: "exterior", camPos: [x,y,z], lookAt: [x,y,z] }`.

Systems (`kind: "system"`) are built **after all rooms and the exterior**, and receive `ctx.world`
(§8) so they can read every room manifest (doors, lift anchors, apertures).

The registry validates manifests on load and prints `[registry]` warnings for: bounds outside the
deck envelope, doors whose `to` room does not declare the same door id, duplicate ids, duplicate view
names, missing spawn. Treat warnings as failures.

---

## 8. Build context `ctx`

```js
ctx = {
  THREE,
  kit,            // fresh Kit for this module: kit.box/boxMM/cyl/add/collider, merged per material at the end
  materials,      // shared library (§10) — pass extra local materials via manifest.materials(shared) → {key: Material}
  PALETTE,        // shared colours incl. Imperial set (§10)
  group,          // THREE.Group for this module (world-positioned at origin). Add non-kit objects here
                  // (Reflector, animated meshes, InstancedMesh, sprites).
  lights: [],     // push DESCRIPTORS, not THREE lights (light pool, §9.4):
                  // { type: "point"|"spot", pos: [x,y,z], color: 0xRRGGBB, intensity, distance,
                  //   target?: [x,y,z], angle?: rad, penumbra?: 0..1, shadow?: false, priority?: 0..1 }
  interactables: [], // { id, key: "E", label, object, material } (same shape as Kestrel's Interactions)
  audio,          // placeholders: audio.play(name, pos), audio.loop(name, pos) → handle, audio.ambient(name, gain)
  hud,            // showPrompt/hidePrompt/setStatus/fadeIn/fadeOut/showFadeText (lifts and doors only)
  player,         // read-only: player.position (feet), player.yaw, player.eye
  teleport,       // teleport(roomId) or teleport({pos, yaw}) — moves the player and updates streaming
  world,          // systems only: { rooms: Map<id, {manifest, group, result}>, get(id), apertures, envelopes }
  seed,           // deterministic per-module seed for kit.rng
  quality,        // { tier: "high"|"medium"|"low" } for optional detail scaling (default "high")
  time,           // () => seconds since start (frozen by the harness for deterministic shots)
};
```

Kit usage is unchanged from Kestrel: `kit.box(mat, cx, cy, cz, sx, sy, sz, {color, texel, uv})`,
`kit.boxMM(mat, min, max, opts)`, `kit.cyl(mat, cx, cy, cz, r, len, axis, opts)`, `kit.add(mat, geo,
opts)`, `kit.collider(min, max, tag)`. Frame/panelGrid/porthole move to `src/kit/frame.js` and
`src/kit/panels.js` with the scaffold and keep their current signatures (see `src/ship.js` today).
Until then, read them in `src/ship.js`; do not commit copies.

---

## 9. Systems contracts

### 9.1 Doors (D) — `src/systems/doors/index.js`, id `sys-doors`
- After all rooms are built, read every room's `doors[]`, pair entries by `id`, and build one door
  assembly per pair: frame, threshold, two sliding leaves (standard/hatch: sideways into wall pockets;
  blast: split vertically or four-way), status light (blue-white open, red locked, amber cycling),
  tunnel lining through the wall gap between the two rooms' inner faces (computed from both `pos`).
- **Auto-open**: leaves open when `player.position` is within 2.6 m of the opening centre (either
  side); ease 0.6 s; close 1.5 s after clear. `ctx.audio.play("door-open"|"door-close", pos)`.
- Unpaired door (`to` unknown or the neighbour never declares it): build it **locked** (red light,
  never opens) — this is how "future expansion" doors are shown. Log a `[doors]` warning.
- API: `api.setLocked(id, bool)`, `api.getState(id)` → `{open: 0..1, locked}`, `api.forceOpen(id)`,
  `api.serialize()` / `api.apply(state)` for future network sync (state = per-door `{open,locked,t}`).
- Also exports a plain helper for room authors: `import { doorHole } from "../../systems/doors/helper.js"`
  that returns the exact opening rect for a door kind so walls can be cut identically everywhere.

### 9.2 Turbolifts (D) — `src/systems/lifts/index.js`, id `sys-lifts`
- A lobby room manifest carries `lift: { id: "T1", pos: [x, floorY, z], dir: [dx,0,dz] }` where `pos`
  is the lift **door centre at floor level on the lobby wall** and `dir` points from the cabin
  **into the lobby**. The lobby owner keeps free a box **4.0 (across) × 4.0 (deep) × 3.6 (high)**
  behind that wall (opposite `dir`), centred on `pos`.
- D builds the cabin prefab in that volume (interior 3.2 × 3.6 × 3.0, deck-select panel, light
  strips, ride effects), a call panel in the lobby beside the door, and wires all cabins into one
  network: `d1-lobby`, `d2-lobby`, `d3-lobby`, `d4-lobby`.
- Ride: player enters cabin, presses `E` on the panel → HUD deck picker (`1`–`4`) → doors close →
  3–6 s ride (light-strip sweep, low hum via `audio.loop("lift-ride")`, gentle camera shake via
  `player.shake(amp, seconds)` — A adds this) → `ctx.teleport({pos: targetCabinSpawn, yaw})` → doors
  open. No physical shaft alignment is required between decks; travel is a teleport with theatre.
- API: `api.callTo(deck)`, `api.state()`, `api.serialize()/apply()`.

### 9.3 Corridor kit (D, early deliverable) — `src/systems/corridor/corridor.js`
```js
corridorSegment(kit, { from: [x,z], to: [x,z], floorY, width = 3.0, height = 3.2, style = "imperial",
                       openings = [], seed, lights = ctx.lights, collide = true })
```
Straight segment with Imperial styling (§11): dark floor with centre strip, light-grey wall panels
with black seams, ceiling light channel, wall light strips at 2.1 m, ribs every 4 m. Deck owners
build their corridors with this once it lands (target: first 60–90 min after GO); before that,
greybox with `panelGrid`. Also `corridorJunction(kit, {center, floorY, arms: ["N","S","E","W"]})`.

### 9.4 Light pool (A) — why modules push descriptors
three.js recompiles every material's shader when the number of lights changes and slows down with
every added light. A keeps a **fixed pool (12 point + 4 spot, 1 shadow-casting spot)** and each frame
assigns the highest-priority/nearest descriptors of the active rooms to pool lights. Modules never
create `THREE.Light`. Budget per room: **≤ 14 descriptors** (bridge, hangar: ≤ 28). Do the visual
work with emissive strips + bloom; use lights for pools of colour and key fills.

### 9.5 Streaming / culling (A)
Active set = room containing the player + rooms sharing a door with it + rooms flagged
`alwaysWithNeighbours` + exterior LOD if the current room has apertures or the camera is outside.
Inactive rooms are `visible = false` and their colliders/interactables/updates are skipped. Rooms are
built in chunks during load with a progress bar; **keep `build()` under ~250 ms** on this VM (measure
with `performance.now()` around your build; the registry logs each module's build time).

### 9.6 Fighter traffic (D) — `src/hangar/traffic/index.js`, id `sys-traffic`
- Fighter model: original TIE-*style* craft (spherical cockpit, two large hexagonal solar panels on
  short pylons), ~2–3k tris, `InstancedMesh` for racked ones. Also one shuttle-style craft (folding
  wings) for the shuttle bay.
- Paths: world-space Catmull-Rom splines. Arrivals start 3–5 km out, pass through APERTURE HANGAR
  centre **(0, -85, +32)** heading +Y, decelerate to a hover in the hangar, then translate to a rack
  slot. Launches reverse. Patrol loops circle the ship at 1–3 km so the exterior view always has
  traffic. Motion is **time-parametric**: state per fighter `{pathId, t0, duration, from, to}` so
  a future server can replicate it.
- Effects: tractor-beam cone (additive, animated) from the aperture rim while a craft is inside it;
  engine glow sprites; landing-light flicker; rack clamps animate.
- AI hooks (must exist, may be trivial): `api.spawn({type, path})`, `api.list()`,
  `api.setController(id, fn(dt, fighter))` (default = scripted), `api.on("launch"|"dock"|"depart"|
  "arrive", cb)`, `api.setSchedule({arrivalsPerMinute, launchesPerMinute})`,
  `api.serialize()/apply()`.
- Reserve, as documented no-op stubs in `src/hangar/traffic/hooks.js`: `flightControl`, `atmosphericEntry`,
  `landingGear`, `docking`, `surfaceContact`, `hangarDeploy`, `cameraOrbitToGround`, `landingZones`.

### 9.7 Camera modes + transitions (A) — `src/camera/*`
`interior` (Kestrel Player), `orbit` (damped orbit around the ship, min 300 m / max 6000 m), `fly`
(free flight). Start of game: orbit view + "Board" prompt → fade → `teleport("d1-bridge")`. In
interior, `Tab` → fade → orbit camera parked outside the current room's nearest aperture, looking
back at it (so the player sees where they were). Harness views can request either mode.

### 9.8 Audio + network placeholders (A) — `src/core/audio.js`, `src/core/netstub.js`
No-op implementations with the final signatures, logging each distinct event name once. Modules call
them as if they worked. Everything animated is driven by `t` (global time) so state is replayable.

---

## 10. Materials and palette (shared library, A)

Existing keys stay: `painted painted1 painted2 metal metalRough paintedMetal grate deck rubber fabric
hazard emitTeal emitWarm emitOrange emitRed emitCool emitWarmSoft emitCoolSoft darkGloss glass decal
leds screen0..3`. Vertex colour tints everything (`{color: PALETTE.x}`), so most "new materials" are
just new colours.

Added with the scaffold (use these names now; they will exist):
- `PALETTE.impWhite #c9ccd1`, `impGrey #8d9198`, `impMid #5a5e66`, `impDark #33363c`,
  `impBlack #111214`, `impRed #ff2a1a`, `impBlue #3a7bff`, `impAmber #ffa028`, `impGreen #38d67a`,
  `impHullLight #a7abb1`, `impHullDark #6f747c`.
- `blackGloss` (bridge/command floors: roughness 0.18, metalness 0.35, dark reflections),
  `impPanel` (light-grey wall panel, painted, subtle wear), `impFloor` (dark deck, fine grid),
  `emitWhite`, `emitBlue`, `emitRedImp`, `emitAmber`, `emitGreen` (status/instrument emitters),
  `screenImp0..3` (Imperial UI: red/blue wireframes, tactical grids, text columns; animated by
  `lighting`), `holo` (additive, animated scanlines for holo tables).
Module-local extras: `manifest.materials(shared) → {key: Material}`; ≤ 2 canvas textures per module,
each ≤ 1024².

---

## 11. Visual style guide — Imperial design language

Shared language (every room): hard-edged architecture; **dark reflective floors**; **light-grey
panelled walls with black recessed seams**; ceiling light channels; blue-white light strips at
waist/head height; matte-black consoles with dense **red / blue / amber** indicators; recessed doors
with heavy frames; sparse black/yellow hazard chevrons; cable trays, pipes, vents, junction boxes;
railings on every drop; functional wear (scuffs at floor level, hand-polish on rails, heat marks near
machinery) — **clean and maintained, never rusty**. Scale references in every room: a door, a rail at
1.02 m, a console at 0.9 m, a crate at 1.2 m.

Per-area accent (make rooms distinct):
| Area | Accent |
|---|---|
| Bridge / command | black gloss floor, near-black ceiling, cold white key from the windows, red+blue instruments, low-key |
| Nav / comms / tactical | blue displays, amber status, holo cyan |
| Intel room | very dark, red only, heavy locked door |
| Officers' quarters | warmer grey, single amber lamp, dark panelling |
| Crew quarters / mess / rec | neutral grey, warm white, stacked bunks, long tables |
| Medbay | white panels, cool blue, green vitals |
| Armory / security / detention | dark grey, red strips, barred cells, black doors |
| Engineering / reactor / hyperdrive | amber + orange, thick pipes, big machinery, heat discolouration, deep vertical volumes |
| Life support | teal + white, tanks, filters, ducting |
| Hangar complex | mid-grey deck plating, white + yellow landing markings, red beacons, harsh white floods, blast-door black/yellow |
| Exterior | two hull greys (`impHullLight`/`impHullDark`) with per-plate variation, black window slots, dim blue-white window glow, engine blue |

---

## 12. Performance budgets (hard numbers)

| Scope | Budget |
|---|---|
| Per room | ≤ 120k triangles, ≤ 16 draw calls (one per material), ≤ 14 light descriptors, ≤ 400 colliders, build ≤ 250 ms |
| Bridge, hangar | ≤ 300k tris, ≤ 24 draw calls, ≤ 28 descriptors |
| Exterior LOD0 (< 400 m) | ≤ 700k tris total through instancing (greebles as `InstancedMesh`), ≤ 60 draw calls |
| Exterior LOD1 (400–2000 m) | ≤ 150k tris |
| Exterior LOD2 (> 2000 m) | ≤ 25k tris |
| Traffic | ≤ 16 active fighters, ≤ 40k tris, ≤ 6 draw calls |
| Whole frame | ≤ 450 draw calls, ≤ 1.5 M tris, ≤ 16 pool lights, ≤ 256 MB texture memory, load ≤ 12 s on this VM |

Measure with `debugAPI.getStats()` (A extends it: memory, active rooms, visible objects, build times)
and the harness `results.json`. Put the numbers in your status file. **Nobody writes "optimised"
without a before/after table.**

---

## 13. Decisions log (A appends; agents re-read after each merge)

- 2026-09-04 05:50 UTC — Plan published. Roles fixed as in §2. Apertures and lift anchors fixed as in
  §6. Light-pool descriptor model chosen over live `THREE.Light`s. Screenshots stay out of git.

---

## 14. Working loop for every agent

1. Phase 0 (immediately): read `src/kit.js`, `src/ship.js` (Frame, panelGrid, porthole, a room
   builder), `src/materials.js`, `src/main.js`, `tools/shots.mjs`. Create your branch. Create your
   status file with your room list, bounds plan, subagent split. Push. Reply to the user
   `ACK <letter>: branch <name> pushed`.
2. Phase 1 (greybox, target ≤ 60 min of work): every room/system as a manifest with bounds, doors,
   spawn, views, floors/walls/ceilings at the right scale. Push. Integrator merges → first playable
   build on the CDN link.
3. Phase 2 (detail): props, consoles, machinery, emissives, decals, wear; per-room lighting; animated
   elements. Screenshot every view. Run a **critic subagent** on the images (blind: it only sees
   images + the brief) and fix what it flags. Push after each room.
4. Phase 3 (polish + perf): budgets met, warnings zero, harness clean, status file complete.
5. After each integration merge: read `docs/review/<letter>-*.md`, fix, push.

Definition of done for a room: manifest valid (zero registry warnings) · reachable via doors from its
lobby · floor/ceiling/walls closed (no light leaks) · scale references present · ≥ 3 harness views ·
budgets met · critic pass with no "empty", "repetitive", "placeholder" or "wrong scale" findings.
