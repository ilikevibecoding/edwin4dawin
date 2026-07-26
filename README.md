# Sea of Scoundrels

A browser-based pirate sailing game in the spirit of Sea of Thieves: crew a sloop
on a living ocean, weigh anchor, trim your sails to the wind, dig up buried
treasure, and trade broadsides with the skeleton fleet.

Everything you see and hear is generated at runtime — the hull is lofted from
station curves, every texture (wood grain, sailcloth weave, hammered iron) is
painted pixel by pixel at load time along with its normal and roughness maps, the
islands come out of a noise field, the sails and sea are custom shaders, the sky
doubles as the scene's image-based light, and the shanty is synthesised with
WebAudio. There are no art or audio files in the repository.

> A fan-made parody. Not affiliated with, endorsed by, or connected to Sea of
> Thieves, Rare Ltd. or Microsoft.

## Play it

`play/index.html` is a single self-contained file — the whole game, Three.js and
all, inlined into 0.9 MB of HTML with no external requests. Three ways to run it:

**1. Download and open it.** Nothing to install, works offline:

```bash
curl -L -o sea-of-scoundrels.html \
  https://raw.githubusercontent.com/ilikevibecoding/edwin4dawin/cursor/sea-of-thieves-clone-27f5/play/index.html
open sea-of-scoundrels.html      # or xdg-open / double-click it
```

**2. From a raw CDN**, no download:

- [htmlpreview.github.io](https://htmlpreview.github.io/?https://github.com/ilikevibecoding/edwin4dawin/blob/cursor/sea-of-thieves-clone-27f5/play/index.html)
- [raw.githack.com](https://raw.githack.com/ilikevibecoding/edwin4dawin/cursor/sea-of-thieves-clone-27f5/play/index.html)
  (fast, but rate-limits under load)

GitHub's own raw URLs and jsDelivr both serve `.html` as `text/plain`, so those
show you the source instead of running it — hence the proxies above.

**3. GitHub Pages**, for a permanent URL: set Settings → Pages → Source to
"GitHub Actions" once, and `.github/workflows/pages.yml` publishes the file to
`https://<owner>.github.io/<repo>/` on every push to `main`.

Regenerate the single-file build after changing anything under `src/`:

```bash
npm run build:play
```

Add `?quality=low` to the URL on a weak GPU (drops bloom, shadows, multisampling
and ocean tessellation, halves texture resolution and marches the clouds in a
third of the steps), or `?quality=high` to force the full pipeline.

## Running it from source

```bash
npm install
npm run dev      # http://127.0.0.1:5173
```

Other scripts:

| Script | What it does |
| --- | --- |
| `npm run build` | Typecheck and bundle to `dist/` |
| `npm run build:play` | Build, then inline everything into `play/index.html` |
| `npm run preview` | Serve the production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run smoke` | Headless gameplay test (needs `npm run dev` running, and Playwright) |

The quality override described above works here too; the headless tests always
pass `?quality=low`.

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

**Every texture is painted at load time.** `core/textures.ts` generates the
material library in code: planked wood for decks and hull strakes, tarred
planking, sailcloth, hammered iron, tarnished brass, laid rope, ground detail and
seabed sand. Each generator paints an albedo layer plus a height field, and the
height field is Sobel-filtered into a tangent-space normal map, with a matching
roughness map. That is why wood grain, canvas weave and pitted iron catch light
instead of reading as flat colour. Texture resolution follows the quality tier.

**UVs are authored in metres.** `MeshBuilder` measures each quad and each lofted
surface in world units, and every texture's `repeat` is set from the metres it
covers, so one board is the same width on a deck, a crate and a hull strake. On
the hull the U axis counts planking levels at a fixed board width rather than
following arc length, which keeps the strakes straight instead of wobbling from
station to station. The builder also emits geometry groups, so a single merged
mesh carries planking, pitch, iron, rope and brass at once.

**The sky lights the scene.** The sky dome is rendered into a pre-filtered
radiance map and used as `scene.environment`, so shaded timbers pick up bounce
light and iron and brass have something to reflect. It is rebuilt only when the
sun has moved appreciably. Below deck, materials hold their ambient back
(`envMapIntensity`) so lantern light dominates the hold rather than the sky
leaking through the planking, and daylight arrives as a dust-filled shaft through
the hatch that leans with the sun.

**The clouds are marched, not painted on.** `world/atmosphere.glsl.ts` holds a
slab of air between 900 m and 3 km and raymarches a noise field through it, with
a short march towards the sun at each step for self-shadowing and a powder term
for the dark rim on thin edges. That is what gives cumulus bright tops over
shaded bases and silhouettes that turn as you sail past them, which a cloud
texture projected onto the dome cannot do. The same density function is sampled
once per pixel by the sea and the islands as `cloudShadow`, so cloud shadows
drift across the water and darken a hillside as they pass over it. Step count is
a quality setting; the sea reflects the sky with a quarter of the steps and the
radiance probe with fewer still.

**Ground cover is blended per pixel.** Islands carry a three-way splat weight per
vertex (sand, grass, rock) derived from height and slope, with a noise-warped
tideline so vegetation advances and retreats along the shore instead of stopping
at a contour. `world/terrainmaterial.ts` injects the blend into a standard
material, samples each set at two scales to break up tiling, and fades the
close-up normal detail out with distance so hillsides do not shimmer.

**Sails are lit like everything else.** The canvas is a standard physically based
material with the billow, furl and flutter injected into its vertex stage, plus a
matching depth material so the shadow it throws on the deck billows with it. The
one thing the standard model cannot do is pass light through cloth, so a
transmission term is added on top and sailcloth glows warmly when the sun is
behind it. The weave is tiled in cloth widths from the sail's real size, and the
panel seams and bolt rope are drawn from the sail's own UVs rather than baked
into the texture.

**Hulls drag white water with them.** Each ship carries a skirt of geometry
around its waterline whose vertices are lifted onto the live Gerstner surface in
the vertex shader, so the foam lies on the sea rather than on the ship's own
waterline plane as she pitches. Density is churned by scrolling noise, weighted
towards the bow, and faded in with speed.

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
but the hold stays dry (apart from your own bilge water). The volume reaches well
above the deck, because with the ship down in a trough the crest alongside sits
higher than the deck and would otherwise cut through the hold at chest height.

**Furling gathers canvas onto its spar.** Each sail carries a second position
attribute holding where every vertex ends up when furled: up on the yard for the
square mainsail, bundled along the stay for the jib. Scaling the sail's height
towards zero instead (the obvious approach) collapses a triangular sail into a
flat sheet through the middle of the ship.

**Post-processing is a multisampled composer plus one grade pass.** The composer
renders into a multisampled target, because rigging lines alias badly against a
bright sky, and the final pass applies a filmic lift, a vignette, mild chromatic
aberration, an unsharp mask and the screen shake — shaking the image is steadier
than jittering the camera and costs nothing.

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

`tests/tour.mjs` is the harness used to look at the game while working on how it
looks: it boots once, then walks a list of set-piece cameras (the helm, the hold,
a beach, a broadside, dusk) and writes a PNG for each, so a whole critique sheet
comes out of one page load.

```bash
node tests/tour.mjs --out=artifacts/tour --views=hero,helm-first,hold
```

WebGL2 runs in headless Chromium through SwiftShader, which is why the tests use
`?quality=low` and freeze the render loop before capturing a frame.
