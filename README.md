# Sea of Scoundrels

A browser-based pirate sailing game in the spirit of Sea of Thieves: crew a sloop
on a living ocean, weigh anchor, trim your sails to the wind, dig up buried
treasure, and trade broadsides with the skeleton fleet.

Everything you see and hear is generated at runtime — the hull is lofted from
station curves, the islands come out of a noise field, the sails and sea are
custom shaders, and the shanty is synthesised with WebAudio. There are no art or
audio files in the repository.

> A fan-made parody. Not affiliated with, endorsed by, or connected to Sea of
> Thieves, Rare Ltd. or Microsoft.

## Running it

```bash
npm install
npm run dev      # http://127.0.0.1:5173
```

Other scripts:

| Script | What it does |
| --- | --- |
| `npm run build` | Typecheck and bundle to `dist/` |
| `npm run preview` | Serve the production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run smoke` | Headless gameplay test (needs `npm run dev` running, and Playwright) |

Add `?quality=low` to the URL to drop bloom, shadows and ocean tessellation
(this is what the headless tests use), or `?quality=high` to force the full
pipeline on a machine that reports a software rasteriser.

## Controls

| Input | Action |
| --- | --- |
| `WASD` / `Shift` / `Space` | Walk, sprint, jump |
| Mouse | Look. Click the canvas to capture the pointer |
| `E` | Interact. Hold it for jobs like digging, repairing and the capstan |
| `1`–`7` / mouse wheel | Cutlass, flintlock, shovel, bucket, planks, banana, spyglass |
| `LMB` | Use the held item, or fire a cannon you are manning |
| `F` | Lantern |
| `V` | First / third person |
| `M` | Open the chart |
| `Ctrl` | Dive, while swimming |

At a station the keys change: `A`/`D` steer at the helm, `W`/`S` raise and lower
the sails at the mast while `A`/`D` trim the yard, and `E` steps away.

## How to play

1. **Weigh anchor.** You start moored at Sandy Shilling Outpost. Turn the capstan
   on the foredeck (hold `E`) until the anchor is up.
2. **Set sail.** At the mast, hold `W` to drop the mainsail, then use `A`/`D` to
   angle the yard. The wind marker on the compass ribbon shows where the wind is
   blowing from — a square rig runs fastest with the wind astern and cannot sail
   into it at all. The **Trim** readout tells you how well the yard is set.
3. **Steer.** Take the helm on the quarterdeck. The rudder only bites when the
   ship is making way.
4. **Find your voyage island.** Open the chart with `M`; the red crosses mark
   buried caches. Watch your depth — running onto a reef will stave in the hull.
5. **Dig.** Ashore, equip the shovel and hold `E` on the disturbed sand. Skeletons
   guard the caches; the cutlass and flintlock will settle that argument.
6. **Haul the loot home.** Carry a chest with `E`, stow it on your ship, then sell
   it at the Gold Hoarders' tent at either outpost.
7. **Fight or flee.** Skeleton sloops roam the map and will come for you. Man a
   cannon (`E`, then `LMB`), and keep your broadside pointed at them.
8. **Damage control.** Cannonballs punch holes below the waterline. Patch them
   with planks (hold `E`) and bail the hold out with the bucket (hold `LMB` while
   standing in the water). Fill the hold and she goes down.

Restock planks, bananas and cannonballs from the barrels in your hold or at any
outpost.

If you end up in the water watching your sloop sail over the horizon without you,
keep swimming: a mermaid will surface and take you back aboard.

## How it is built

```
src/
  core/        engine loop, input, seeded noise, mesh builder, WebAudio synthesis
  world/       wave field, ocean shader, sky/weather, island height field, outposts
  ship/        sloop model, sail and buoyancy physics, cannons, projectiles
  player/      character controller, avatar rig, held items
  ai/          island skeletons, the skeleton fleet
  game/        game loop glue, voyages, loot, particle effects
  ui/          HUD, compass ribbon, parchment chart, styles
```

A few things worth knowing if you want to poke at it:

**One wave definition, two consumers.** `world/waves.ts` holds the Gerstner wave
set and emits both a CPU sampler and the matching GLSL. The ocean shader displaces
vertices with it while ship buoyancy, swimming and floating loot sample the same
function on the CPU, so hulls sit in the water you can actually see. Wave detail
fades with distance, because the camera-centred radial ocean mesh gets coarse near
the horizon and would otherwise alias into rings.

**Water depth comes from a packed height texture.** The island height field is
baked once into an RGBA8 texture (16-bit fixed point across two channels), which
the ocean samples for depth colour, shoreline surf and wave damping in the
shallows.

**The player lives in the ship's reference frame.** While aboard, the character's
position is stored in ship-local space and the deck carries them as it pitches and
rolls; the collision volumes (`ShipCollision`) are authored in the same space.
Stepping off the hull, falling through the open hatch or climbing a boarding
ladder transfers the player between the ship frame and world space, converting
position, velocity and view angles as it goes.

**Sail physics is a square rig.** Thrust is
`cos(relativeWind + yardAngle) · cos(yardAngle)`, which peaks at
`cos²(relativeWind / 2)` when the yard bisects the wind. That single expression is
why you can scream along downwind, crawl on a beam reach with a good trim, and sit
dead in the water pointing at the wind.

**Ships flood rather than having hit points.** A cannonball creates a hole at the
impact point on the hull; how fast it leaks depends on how far below the live water
surface it currently sits, so a rolling ship takes on water in gulps. Flood volume
adds draught and drag until the sloop founders.

**The sea is masked out of ship interiors.** The hold sits below the waterline, so
the ocean surface would otherwise slice straight through it. While the camera is
below deck, the ocean shader is handed that hull's interior volume in local space
and discards any fragment inside it — the sea keeps rendering right up to the hull,
but the hold stays dry (apart from your own bilge water).

## Dropping in real 3D assets

The world is procedural, but every prop is built behind a factory function, so
swapping in GLTF models is a contained change:

- `world/props.ts` — palms, rocks, bushes, barrels, crates, chests, signs, wrecks
- `ship/shipbuilder.ts` — the sloop and its parts
- `player/avatar.ts` and `player/items.ts` — the character rig and held items

Replace a factory's body with a `GLTFLoader` clone of a loaded scene (keeping the
returned object's origin and orientation conventions, which are documented at each
factory) and the rest of the game — collision volumes, interaction anchors,
physics — keeps working unchanged.

## Testing

`tests/smoke.mjs` boots the game in headless Chromium, then drives the simulation
directly (no rendering) to play the whole loop: raise the anchor, set the sails,
prove the ship cannot sail into the wind and does run downwind, steer, fire a
cannon, take a hit, patch and bail, fall overboard and climb back up the ladder,
fight a skeleton, dig up a chest and sell it, and confirm the skeleton fleet is
sailing and the clock is ticking. `tests/shot.mjs` captures screenshots the same
way.

```bash
npm run dev &
node tests/smoke.mjs
node tests/shot.mjs artifacts/shot.png --eval="window.game.begin()"
```

WebGL2 runs in headless Chromium through SwiftShader, which is why the tests use
`?quality=low` and freeze the render loop before capturing a frame.
