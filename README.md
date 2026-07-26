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
  https://raw.githubusercontent.com/ilikevibecoding/edwin4dawin/cursor/surf-palms-hold-27f5/play/index.html
open sea-of-scoundrels.html      # or xdg-open / double-click it
```

**2. From a raw CDN**, no download:

- [raw.githack.com](https://raw.githack.com/ilikevibecoding/edwin4dawin/cursor/surf-palms-hold-27f5/play/index.html)
  — tracks the branch, so it always serves the latest build. Rate-limits under load.
- [rawcdn.githack.com, pinned to a commit](https://rawcdn.githack.com/ilikevibecoding/edwin4dawin/efe33895b1264dc4474c4bfd162b839c9e661905/play/index.html)
  — cached permanently at the edge and never rate-limited, but frozen at that commit.
- [htmlpreview.github.io](https://htmlpreview.github.io/?https://github.com/ilikevibecoding/edwin4dawin/blob/cursor/surf-palms-hold-27f5/play/index.html)

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
| `Shift` | Swim harder, while swimming |

At a station the keys change: `A`/`D` steer at the helm, `W`/`S` raise and lower
the sails at the halyard bitts on the starboard quarter while `A`/`D` trim the
yard, and `E` steps away. Left to itself the crew brace the yard round for the
wind; take hold of it and you have it until you let go.

## How to play

1. **Weigh anchor.** You start moored at Sandy Shilling Outpost. Turn the capstan
   on the foredeck (hold `E`) until the anchor is up.
2. **Set sail.** At the halyard bitts on the starboard quarter — aft of the mast,
   where you can watch the yard as you work it — hold `W` to drop the mainsail.
   `A`/`D` angle the yard, though the crew will trim it for you if you leave it
   alone. The wind marker on the compass ribbon shows where the wind is blowing
   from: a square rig runs fastest with the wind astern, makes about six knots
   with it on the beam, and cannot sail into it at all. The **Trim** readout tells
   you how well the yard is set.
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

Restock planks, bananas, cannonballs and powder from the barrels in your hold or
at any outpost. The flintlock burns powder and shot, not round iron: that is the
black keg, not the shot locker.

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

Where a lamp hangs matters more than it sounds. The hold's two lanterns used to
hang half a metre under the deckhead and dead astride the keelson, and an
inverse-linear falloff put twenty-odd units of irradiance on timber a hand's breadth
away. That timber was also the one piece of below-decks geometry still wearing the
topside deck material, which carries three times the normal detail and a roughness
map that dips well under the value it multiplies — so the deckhead had a band of
gold glitter running its whole length, the brightest thing below decks by a factor
of ten. They now hang low and outboard of the walkway, where a lamp goes, and the
keelson wears the same below-decks material as everything around it.

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
at a contour. The weights are then pushed about by a fine noise field in the
fragment shader before they are normalised: cover is decided per vertex on a
five-metre grid, and blending two covers linearly across that puts a five-metre
sawtooth along the top of every beach, where noise gives a ragged edge with sand
running up into the grass in tongues and costs no vertices at all.
`world/terrainmaterial.ts` injects the blend into a standard
material, samples each set at two scales to break up tiling, and fades the
close-up normal detail out with distance so hillsides do not shimmer. Scattered
grass reads the same weights back, so tufts only grow where the ground is
painted as grass, and it is placed in clumps: an even scatter dense enough to
read up close is a dot pattern, and one you can afford is bald ground.

**A palm is its outline.** Against a bright sky a frond is a feather, and what says
so is a row of fine teeth down each edge — so each frond carries twenty-four narrow
leaflets a side, one tapered triangle apiece, which is the shape a leaflet actually
is and costs half what a quad does. The count matters far more than the detail of
any one of them: twenty broad blades, which is what this used to be, is a fern, and
the palms on these islands duly read as ferns nailed to poles. The rib is folded, so
basal leaflets stand up out of it in a shallow V and by the tip they hang well
below, which is what makes a crown catch light on one face and fall into shadow on
the other. Crowns are laid out by phyllotaxis rather than by dividing the circle
evenly — that is what makes a procedural palm look like a patio umbrella — and each
frond is pitched by age, so a crown is a fountain: spears standing near-vertical in
the middle, a skirt of old fronds hanging almost straight down round the outside.

Palms get their own material for two reasons. It is double-sided, because a frond is
a sheet one triangle thick and with backface culling on, every leaflet on one side
of each rib is simply absent — half of every crown in the world was being thrown
away. And it sways on a palm's period rather than a grass blade's: stiff at the
foot, limber at the head, several seconds to a cycle, with the leaflets fluttering
faster on top since they have the leverage for it and the trunk has not.

**The shore is laid out in distance from the waterline, not in depth.** Every
island's waterline radius is found per bearing by marching the same height
sampler the player walks on, and the horizontal distance to it is packed into the
spare channel of the height texture and carried onto the terrain as a vertex
attribute. Both halves of the tideline then read the same field, in metres of
beach.

Depth is the obvious coordinate for surf and a thoroughly bad one. It wanders: a
sand flat that stays between one and two metres deep for a hundred metres crosses
any given breaking depth over and over, so bands laid in depth smear across a
whole lagoon. It needs sub-metre precision from terrain that is only defined
every five metres. And it arrives at the ocean shader interpolated across
triangles that are six metres wide by the time the radial mesh reaches a beach —
wider than a line of surf. Distance to the shoreline has none of those problems:
it rises monotonically as you head out to sea, so a band in it is a band that
follows the coast, and it is smooth enough that interpolating between texels five
metres apart is accurate to a couple of decimetres. It is also what the surf zone
width comes from, as the mean bed gradient between the waterline and the point in
question, rather than a local difference that picks up the texel grid and hands
the surf hard-edged polygons of white water.

The bands themselves are a travelling sawtooth in that coordinate, marching
shoreward a couple of metres a second, with the cliff at the wrap facing the
beach. That cliff is the foam front, and a symmetric profile has no way of
expressing one — which was the whole reason the old surf read as a fog bank
parked on the sand rather than as water arriving. Ramping a whole band instead of
just its leading edge is the opposite failure and lays down sheets of flat white
the size of the foreground: a breaker is a line, and what follows one is lace.
Under all of it sits a patchy bed of churn, because inside the break the water
stays aerated between sets; with only the bands the surf averaged an eighth cover,
which at any distance is faint speckle rather than white water.

The islands grew a beach to make any of this possible: the radial falloff used to
run out at the shoreline and leave tens of metres of ground sitting at exactly sea
level, with no slope for surf to break on.

**Under water is its own scene.** A camera-following floor sits at the deep-ocean
height so the world does not simply end between islands, murking out over a few
tens of metres. A dim blue-green hemisphere light fades in as the camera goes
under, because the sun is on the far side of an opaque sea and without it a hull
below the waterline is a black cut-out. Looking up, the surface is drawn as the
mirror it is from below — dark at grazing angles, with Snell's window bright
overhead — rather than as a reflection of the actual sky.

**Ambient is deliberately not the colour of the sky.** A tropical sky is blue on
top and the sea throws cyan up from below, and cream canvas or warm timber
multiplied by that comes out olive. Most of the ambient brightness therefore
comes from a hemisphere light that is desaturated towards daylight above and
mixed with a warm sand bounce below, leaving the radiance probe to supply
direction and reflections at a lower intensity.

**Sails are lit like everything else.** The canvas is a standard physically based
material with the billow, furl and flutter injected into its vertex stage, plus a
matching depth material so the shadow it throws on the deck billows with it. The
one thing the standard model cannot do is pass light through cloth, so a
transmission term is added on top and sailcloth glows warmly when the sun is
behind it. The weave is tiled in cloth widths from the sail's real size, and the
panel seams and bolt rope are drawn from the sail's own UVs rather than baked
into the texture.

**The sea's colour is absorption, not a gradient.** Light goes down through the
water, reflects off the bottom and comes back up, and every metre of that path
eats red about fifteen times faster than blue. `world/ocean.ts` evaluates that
directly — Beer-Lambert extinction over a sand albedo, plus what the water
column itself scatters back — so a sand bar at knee depth is pale gold, four
metres of the same water is turquoise, and forty metres of it is nearly black,
all out of one exponential. Interpolating between three hand-picked blues by
depth, which is what this used to do, cannot produce that relationship and
blew out to white over every shallow. The levels are chosen in scene-linear
against the ACES curve and exposure the renderer applies rather than by eye.

The sun's reflection carries a Fresnel term of its own, evaluated against the
half vector as microfacet theory asks: water reflects two per cent of the light
striking it head on and nearly all of it at a grazing angle, so looking down
into the foreground you should see almost no highlight at all. Its lobe widens
with distance instead of being faded out, because a pixel of near water covers
one wave face and a pixel at the horizon covers thousands — which lets the
glitter path run all the way out without the speckle a sharp highlight aliases
into at that range.

**Ships sit in the water rather than on it.** Every hull reports its footprint
on the water plane — centre, heading and half extents — and the sea puts two
things there: an occlusion term underneath, because a ship shades the water
beneath it and stops sky light reaching it, and a foam band hugging the
waterline that throws forward into a bow wave as she makes way. Positions are
taken into each hull's own frame, so the footprint is an ellipse along the keel
rather than a circle. The occlusion is what does the real work; without
something darkening the water under it, a hull reads as a decal laid on the
surface however good the foam is. This replaced a skirt of geometry carried in
the ship's own frame, which was invisible at most viewing angles and showed its
low-poly outline as hard white polygons at the stem where it was not.

**Reflections are rougher than a mirror on purpose.** The reflected ray has to run
a kilometre up to the cloud slab, and at a grazing angle it is hypersensitive to
surface slope: a hand's width of wind chop swings it across half the sky, and the
cloud deck comes back as a field of hard-edged pale patches corresponding to
nothing actually overhead. That was, for a while, by far the most conspicuous thing
in any view of open water. The same march off the sky dome is perfectly smooth,
which is what says the fault is in the direction and not in the march — so the long
ray reflects off the swell alone, chop left out and leaned back towards the
vertical, which is what a real sea's micro-roughness does to a long reflection. The
march also fades as the mirror flattens, with the plain gradient standing in. The
reflected sky drops the tight solar aureole too: it is effectively a soft sun disk
and was being double-counted against the specular lobe, so every swell facing the
sun came back as a separate ghost sun sitting on the water.

**Fine detail fades by how much sea a pixel covers, not by distance.** A pixel
forty metres out but looked at almost edge-on spans ten metres of surface, while
one the same distance away looked at from above spans a hand's width — so distance
alone leaves the middle distance combed into stripes at any grazing angle. The
footprint is worked out from distance and view angle rather than from screen-space
derivatives, because the derivative of an interpolated varying is discontinuous at
every triangle boundary, and gating detail on it stamps the wave mesh's own facets
onto the sea as hard-edged patches of flat sky reflection.

Each band of wind chop then fades on its own wavelength. Fading them together, or
gating the whole gradient on its finest term, takes the six-metre swell chop away
along with the wavelets — and without it the middle distance is nothing but those
same mesh facets. The chop is not decoration; it is what stops the sea looking
polygonal.

**Caustics are threads, not plateaus.** The surface is a lens, and where it happens
to be convex it focuses sunlight onto the bottom in a thin bright line; those lines
close into a net of cells whose crossings are the brightest points on it. The shape
that matters is the filament, so this rides the midline contour of a single octave
of noise — a contour is inherently a curve of controllable width. Two summed
octaves pile the field up around its own midline, and then the contour is not a
curve any more but most of the plane. Depth sets how tight the threads are and how
much light reaches them, and pointedly not the scale of the domain: scaling a world
coordinate in the hundreds of metres by a factor that moves in the third decimal
place slides the noise a whole cell for a centimetre of extra depth, which shears
the net along the depth contours until the entire sea floor is a mat of hair. The
sand under it carries ripple marks combed across the swell, warped by a fraction of
their own period — displace them by ten times it and the shallows read as
fingerprints, leave the warp out and they read as corduroy.

**One wave definition, two consumers.** `world/waves.ts` holds the Gerstner wave
set and emits both a CPU sampler and the matching GLSL. The ocean shader displaces
vertices with it while ship buoyancy, swimming and floating loot sample the same
function on the CPU, so hulls sit in the water you can actually see. Wave detail
fades with distance, because the camera-centred radial ocean mesh gets coarse near
the horizon and would otherwise alias into rings.

**Water depth comes from a packed height texture.** The island height field is
baked once into an RGBA8 texture — 16-bit fixed point across two channels for the
height, with the distance to the nearest waterline in the third. The ocean reads
both from a single fetch, and reads them *per pixel* rather than per vertex: the
radial mesh is five metres or more between rings by the time it reaches an island,
and interpolating depth across triangles that size facets the water's colour into
blocky patches wherever the bottom is visible.

**Bloom is hand-rolled, and deliberately tight.** A soft-knee bright pass, a
separable blur at half resolution and an additive composite, in `core/engine.ts`.
Three's `UnrealBloomPass` does not survive the multisampled half-float target
this composer renders into: reading it returned colour bearing no relation to
the frame, which showed up as red ghost suns wherever a sparkle crossed the
threshold. Doing it by hand is also several times cheaper, which matters when
the whole frame budget goes on the sky and the water. The threshold sits above
the brightest ordinary surface in the game so only genuine highlights — cloud
tops, sun sparks, lantern flames — reach it, and the radius is kept short
because a wide one takes the warm cast of the glitter path and lays it over the
entire sky as a pink haze.

**The player lives in the ship's reference frame.** While aboard, the character's
position is stored in ship-local space and the deck carries them as it pitches and
rolls; the collision volumes (`ShipCollision`) are authored in the same space.
Stepping off the hull, falling through the open hatch or climbing a boarding
ladder transfers the player between the ship frame and world space, converting
position, velocity and view angles as it goes.

**Sail physics is a square rig, and the crew work the braces.** Thrust is
`cos(relativeWind + yardAngle) · cos(yardAngle)`, which peaks at
`cos²(relativeWind / 2)` when the yard bisects the wind. That single expression is
why you can scream along downwind, hold a fair turn of speed on a beam reach with a
good trim, and sit dead in the water pointing at the wind.

It is also a trap, and the ship fell into it for a long time. A yard left square to
the keel makes *nothing at all* with the wind on the beam — `cos(±90°) = 0` — and
nothing on screen tells you that the yard is the problem rather than the sails, the
anchor or the wind. One hand cannot be at the braces and the wheel at the same time
either. So the yard is now trimmed for you unless you have taken hold of it in the
last few seconds, and trimming it by hand still beats what the crew manage.

Backwinding stalls the rig rather than driving the ship astern. A real
square-rigger can be backed deliberately; in a game, the only thing that achieves
is a player who sets every sail, watches the ship pull steadily backwards, and
reasonably concludes the controls are inverted. Canvas pressed against the mast is
a brake now, not a reverse gear.

Measured from rest at full sail, 40 s each: 9.3 kn dead downwind, 8.5 on a broad
reach, 6.5 on the beam, 3.4 close-hauled, and 0.0 head to wind — never negative.
The beam-reach figure used to be exactly zero.

**Ships flood rather than having hit points.** A cannonball creates a hole at the
impact point on the hull; how fast it leaks depends on how far below the live water
surface it currently sits, so a rolling ship takes on water in gulps. Flood volume
adds draught and drag until the sloop founders.

Grounding is damage too, but only once per grounding, and only on impact above
about eight knots. It used to punch a fresh breach every 1.6 s for as long as *any*
part of the keel was touching, which meant that running a beach — the thing you do
every time you go ashore to dig — stove the hull in half a dozen times over and the
ship filled and sank while you were away with the shovel. The hull has to float
clear before she can take another, and a hull sitting on sand is half out of the
water with the beach packed against the planking, so it barely leaks at all.

**The sea is cut out of ship interiors along the shape of the hull.** The hold sits
below the waterline, so the ocean surface slices straight through it and wins the
depth test looking down: without a cut, standing on deck and looking down the open
hatch showed water, not a hold.

A box will not do this job, which is why this used to be gated to "only while the
camera is already below decks" — so the hold appeared only once you had climbed
into it, which is a strange thing for a ship to do. Made narrow enough to stay
inside the planking amidships, a box leaves a band of unmasked sea between its edge
and the ship's side, and from down in the hold that is a bright turquoise stripe
running along the inside of the hull at waterline height. Made wide enough to reach
the side amidships, it sticks out past the bow — where the hull has narrowed to
nothing — and punches a hole in the open water ahead of the ship.

So the width comes from the hull itself: `hullShape.widthAt` sampled at twenty
stations along the keel, handed to the shader as an array and interpolated per
fragment. 1.85 m of half-beam at the transom, 3.26 amidships, 0.14 at the stem. The
cut stops just short of the deck, so a crest breaking alongside is never eaten.

**Furling gathers canvas onto its spar.** Each sail carries a second position
attribute holding where every vertex ends up when furled: up on the yard for the
square mainsail, bundled along the stay for the jib. Scaling the sail's height
towards zero instead (the obvious approach) collapses a triangular sail into a
flat sheet through the middle of the ship.

**A mesh with an array of materials draws nothing without geometry groups.** This
one cost four cannons and fifteen other fittings, and it is worth writing down
because the failure is completely silent. When a mesh's `material` is an array,
three.js decides which slot each run of indices belongs to by walking
`geometry.groups`; an empty list means no draw calls, whatever the vertices say. The
mesh sits in the scene graph with correct geometry, a correct world transform and
`visible` true, and simply never appears — there is nothing to find from script
except the absence itself.

`MeshBuilder` used to emit groups only when two or more material slots had been
used, on the reasoning that a single-material prop should keep to one draw call. But
a single group *is* one draw call, and anything built wholly in one slot and then
handed the ship's eight-material array vanished: every cannon, and the supply
barrels in the hold. The barrels' lids and painted stencils are separate meshes with
a single plain material, so those still drew — which is why restocking meant walking
up to a painted disc floating in mid-air over nothing at all. Groups are emitted
unconditionally now, and geometry merged outside `MeshBuilder` goes through a
`shipMesh` helper that adds one.

**Held items are framed by projecting them, not by eye.** A single hand transform
cannot present a metre of cutlass and a short flintlock equally well. Sharing one
put the hand at `y = -0.36`, and at 68° the frustum is only about 0.28 units tall at
that depth — so the entire weapon sat *below the bottom of the screen*, which is the
literal reason you could not see your own sword. Each weapon now carries its own
offset and angle, chosen by projecting the grip and the tip into normalised device
coordinates and picking the pose that spans the frame while keeping every vertex
clear of the near plane. The cutlass sits hilt-low-right with the blade sweeping up
and across to the left, receding from 0.54 to 1.35 units so it foreshortens instead
of lying flat.

There is no forearm, either. Anything drawn behind the grip is between the eye and
the weapon, and a forearm running back towards the camera does not read as an arm:
it reads as a flat coloured rectangle in the middle of the screen with the weapon
hidden behind it, because what you are looking at is its end face. A fist closed
round the hilt stays inside the silhouette of the guard.

**A sword stroke is a sweep, driven by a phase.** Every use of every item used to
run off one scalar that decayed towards zero, dipping the wrist and pitching it
back — so the cutlass, the pistol, the shovel and the repair hammer all did the same
small bob, and a sword swing in particular looked like nothing at all. A stroke
needs a phase that runs *forwards* through the motion: wind up across the body for
the first quarter, sweep down and across on a diagonal, follow through past the far
side, recover. That is mostly rotation about the view axis. The pistol has its own
phase — muzzle up hard over an eighth of a second, gun back into the palm, then a
long settle — and the tool thump is still there for digging and patching.

**Rain lands on the lens, not over it.** In a storm the grade pass adds beads that
cling to the glass and then run, plus streaks drawn down it by the airflow, as a
*refraction* of the frame behind rather than as anything painted on top: a drop on
glass bends what is behind it, it does not brighten it. A rim highlight goes where
the offset is steepest. It fades out below decks, where drops would be running down
the inside of a deckhead.

**Swimming is strokes and glides, not walking with the numbers turned down.** It
used to be exactly that — the same yaw-relative move vector damped towards the same
kind of constant target, at 2.5 m/s instead of 3.3 — which is why it felt like
wading. Drive now arrives in pulses: a hard catch through the first third of each
cycle, then nothing but a light drag while the arms recover, so a stroke carries you
and letting go coasts to a stop rather than braking. The head rolls and pitches to
the same phase, which is most of what tells you at a glance that you are in water.

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

`tests/probe.mjs` answers questions about the running game without drawing
anything, which takes seconds rather than the minutes a screenshot costs under
software rasterisation. It is the fastest way to find out what a suspicious
shape on screen actually is:

```bash
node tests/probe.mjs "window.game.islands.heightAt(-180, -160)"
```

`tests/hdrpeak.mjs` looks at a frame the way the post chain does. It reads the
scene back in linear HDR *before* tone mapping and reports the brightest pixels and
where they are, a mean-and-max profile down the frame in bands of ten rows, every
self-lit object in shot with its screen position and ancestry, a raycast of a chosen
pixel saying what geometry is actually under it, and the composited image alongside
the environment state — all in one page load. Bloom operates on raw linear values,
so when a highlight smears across the frame, guessing from the composited PNG will
not tell you whether the source is a bright surface, an overflowed buffer or the
pass itself. Every one of the post-chain bugs above was found with it.

The row profile is for anything that lies in a horizontal band — a tideline, a
horizon, a surf zone. It says where the band is and how strong it is, which is not
something you can read off a picture: a surf zone that measures a mean of 0.13 is
faint speckle and one that measures 0.9 is a solid white wash, and both look like
"a pale band along the shore" on screen.

```bash
node tests/hdrpeak.mjs --setup="__t.surf(2)" --ray=315,127 \
  --post="window.engine.setBloomStrength(0)"
```

`--post` runs after the game's own per-frame update and before *both* the readback
and the draw. It has to be both, or the numbers describe a different frame from the
picture — which they did, and an afternoon went into reading values off the ordinary
scene while looking at a screenshot of a diagnostic channel.

Speaking of which: the ocean shader carries a set of diagnostic channels, selected
by a uniform and off in normal play. Half a dozen noise fields, several of them
warped by other noise fields, are multiplied together to make a square of water, and
working out which one is responsible for a pattern by staring at the composited
frame is not feasible. Rendering each term on its own found the caustic bug in a
single pass after three wrong guesses.

```bash
node tests/hdrpeak.mjs --setup="__t.surf(2)" \
  --post="window.engine.scene.getObjectByName('ocean').material.uniforms.uDebug.value=1"
```

WebGL2 runs in headless Chromium through SwiftShader. `probe.mjs` asks for
`?quality=low` since it never draws anything; the two capture harnesses ask for
`?quality=high` and freeze the render loop before taking a frame, because the low
tier turns off bloom, multisampling and half the mesh density — and reviewing how
the game looks on a tier no player will see is worse than not reviewing it.
