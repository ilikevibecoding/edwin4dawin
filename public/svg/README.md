# SVG art asset pack

Every logo, crest, insignia, minifigure face and hull decal in **BRICK WARS**
is hand-authored vector art and lives in this directory. Nothing here is
generated at build time and nothing is traced from existing artwork — the
emblems, letterforms and face prints are original geometric designs drawn in
the spirit of the genre.

The engine consumes these two ways, both in `src/engine/svg.js`:

| function        | what it does                                                        |
| --------------- | ------------------------------------------------------------------- |
| `extrudeSVG()`  | three's `SVGLoader` → `Shape`s → `ExtrudeGeometry` → real 3-D solids |
| `svgTexture()`  | rasterises through `<img>` onto a canvas → `CanvasTexture`           |

A file is written for one of those two jobs, and the rules differ. The
**Use** column below says which.

---

## Extrusion assets

Closed, filled paths only. Holes are inner subpaths under
`fill-rule="evenodd"`. No strokes anywhere — a stroke-only shape extrudes to
nothing, because `SVGLoader.createShapes()` only sees fills.

| File                  | viewBox         | Use       | Purpose                                                                            |
| --------------------- | --------------- | --------- | ---------------------------------------------------------------------------------- |
| `logo-brickwars.svg`  | `0 0 1200 520`  | extrusion | The film's title card. "BRICK" over "WARS" in a bold geometric grotesque, both lines letter-spaced to the same 1060-unit measure (x 70→1130). Fill `#f2cd37`. Hero asset: extruded and flown at camera. |
| `episode-plate.svg`   | `0 0 1200 160`  | extrusion | "EPISODE ONE" on one line in a lighter, narrower cut of the same alphabet, optically centred in the box. Fill `#f2cd37`. |
| `rebel-crest.svg`     | `0 0 512 512`   | extrusion | Alliance insignia: a starbird climbing out of a broken ring. Fill `#c91a09`. |
| `imperial-crest.svg`  | `0 0 512 512`   | extrusion | Imperial insignia: a heavy hexagonal cog, eight spokes, solid hub. Fill `#a0a5a9`. |
| `medal-starbird.svg`  | `0 0 512 560`   | extrusion | Medal of the Alliance: suspension loop, 36-boss beaded rim, annular disc, starbird. Fill `#dfc48e`. |

### Letterform grid

Both title lines share one grid so the extruded logo is internally consistent:

* cap height **205**, stem weight **52**, horizontal bar **44**
* line 1 baseline **y = 237**, line 2 baseline **y = 488**
* round letters (`C`, `S`, `O`) overshoot the cap and baseline by **3** units
* both lines span exactly **x 70 → 1130**

`episode-plate.svg` uses the same construction at cap height **96** with
lighter stems, and a **72**-unit word gap against **24–34**-unit letter gaps.

### Shared geometry

The starbird is one master outline reused at four scales, so the crest, the
medal, the banner and the pilot's shoulder patch are the same mark:

| Where                     | Scale  |
| ------------------------- | ------ |
| `rebel-crest.svg`         | 1.00   |
| `medal-starbird.svg`      | 0.53   |
| `alliance-banner.svg`     | 0.52   |
| `torso-pilot.svg` roundel | 0.12   |

---

## Minifigure face decals

Rasterised. Transparent background — the engine composites these over the
head colour, so **the head itself is never drawn**. Features sit inside the
central 60% of the canvas on an eye line at about **y = 210**.

| File                      | viewBox       | Use       | Purpose                                                                 |
| ------------------------- | ------------- | --------- | ----------------------------------------------------------------------- |
| `face-neutral.svg`        | `0 0 512 512` | rasterise | Two oval eyes and a closed smile. The default head.                      |
| `face-determined.svg`     | `0 0 512 512` | rasterise | Brows driving down to the nose, flat set mouth.                          |
| `face-worried.svg`        | `0 0 512 512` | rasterise | Arched brows lifted clear of the eyes, small eyes, open mouth, `#5a93db` sweat drops. |
| `face-leia.svg`           | `0 0 512 512` | rasterise | Lashes at the outer corners, nose dot, calm `#c9808a` lip.               |
| `face-luke.svg`           | `0 0 512 512` | rasterise | Catch-light dots in the eyes, `#8a5a2b` brows, open half-smile.          |
| `face-old-ben.svg`        | `0 0 512 512` | rasterise | `#c8c8c8` beard and moustache over the lower half, crow's feet.          |
| `helmet-stormtrooper.svg` | `0 0 512 512` | rasterise | Trooper helmet front: brow band, angular lenses, vented breather, cheek vents. `#1b2a34` / `#6c6e68`. |
| `helmet-vader.svg`        | `0 0 512 512` | rasterise | Mask front: angular lenses tinted `#2a1416`, ridged triangular grille, cheek panels. `#101418` / `#2a2f36`. |
| `head-threepio.svg`       | `0 0 512 512` | rasterise | Protocol droid: round photoreceptors, barred mouth grille, panel lines. `#aa7f2e` / `#101418`. |
| `head-astromech.svg`      | `0 0 512 512` | rasterise | Astromech dome front: main lens, three sensors, two panels. `#1b2a34` / `#a0a5a9` / `#0055bf`. |
| `face-jawa.svg`           | `0 0 512 512` | rasterise | **Opaque.** Full black field (the inside of a hood) with two glowing `#f2cd37` almond eyes. |

---

## Torso and hull printing

Rasterised, transparent, drawn to fill the canvas and applied to the front
face of a torso or hull panel.

| File                      | viewBox       | Use       | Purpose                                                              |
| ------------------------- | ------------- | --------- | -------------------------------------------------------------------- |
| `torso-rebel-trooper.svg` | `0 0 512 512` | rasterise | Tan flak vest over a light shirt: chest pockets, belt and buckle, shoulder seams. |
| `torso-stormtrooper.svg`  | `0 0 512 512` | rasterise | White armour: chest plate, abdominal segments, black shoulder joints, grey control box. |
| `torso-vader.svg`         | `0 0 512 512` | rasterise | Black chest box of coloured buttons, two silver plates, wide belt with boxes. |
| `torso-leia.svg`          | `0 0 512 512` | rasterise | White robe: soft V neckline, thin grey folds, silver belt with a round buckle. |
| `torso-luke.svg`          | `0 0 512 512` | rasterise | Tan tunic with a wrapped V front, wide brown belt, small pouch.       |
| `torso-pilot.svg`         | `0 0 512 512` | rasterise | Orange flight suit: harness and buckles, life-support box, Alliance roundel on the left shoulder. |
| `torso-officer.svg`       | `0 0 512 512` | rasterise | Grey uniform: high collar, double row of buttons, rank plaque, code cylinders. |
| `hull-warning.svg`        | `0 0 512 512` | rasterise | Imperial hull markings: hazard stripes, panel outline, greebles, an abstract glyph block. `#6c6e68` / `#4a4d4a` with a `#c91a09` accent. |
| `hull-rebel-stripe.svg`   | `0 0 512 512` | rasterise | Corvette identification stripe: red band, 45° chamfered end, darker outline. |

---

## Screens, HUD and graphics

Rasterised. These may stroke freely.

| File                      | viewBox       | Use       | Purpose                                                              |
| ------------------------- | ------------- | --------- | -------------------------------------------------------------------- |
| `deathstar-schematic.svg` | `0 0 800 800` | rasterise | Battle-station readout: concentric circles, offset superlaser dish with crosshairs, equatorial trench, radial ticks, a bracket callout on the port, data blocks. `#7fe8ff` line art. |
| `trench-schematic.svg`    | `0 0 800 500` | rasterise | Trench cross-section: walls in profile, exhaust shaft down to the reactor, dimension arrows, annotation blocks. `#7fe8ff` line art. |
| `hud-targeting.svg`       | `0 0 512 512` | rasterise | Fighter targeting display: square reticle with corner brackets, horizontal scale, two range bars, corner circles, centre crosshair. `#77ff66`. |
| `console-readout.svg`     | `0 0 512 320` | rasterise | **Opaque.** Cockpit screen on a `#050d14` field: data bars, waveform, needle gauge. Accents `#f2cd37` and `#4b9f4a`. |
| `alliance-banner.svg`     | `0 0 300 800` | rasterise | **Opaque.** Hanging banner: `#0a3463` cloth, `#f2cd37` starbird in the upper half, two bars near the foot. |

---

## Authoring rules

The loader is strict. Anything added here must keep to all of the following,
or it will silently render as nothing.

1. An explicit `viewBox`. `width`/`height` unitless or absent — never `px`,
   `mm` or `%`.
2. Only `<path>`, `<polygon>`, `<polyline>`, `<rect>`, `<circle>`,
   `<ellipse>` and `<g>`.
3. **No `<text>`.** `SVGLoader` cannot turn text into shapes, so all lettering
   is drawn as filled paths. Likewise no `<use>`, `<filter>`, `<defs>`,
   gradients, `<style>` blocks, external references or embedded images.
4. `fill="#rrggbb"` or `fill="none"` as a presentation attribute on *every*
   drawable element. Never through a class, and never left to inherit from a
   parent `<g>` — a `<g>` may carry stroke properties, but each child still
   states its own fill.
5. Extrusion assets: closed filled subpaths, `fill-rule="evenodd"` for
   counters and holes, no strokes.
6. Every coordinate inside the viewBox.

Only the three files marked **Opaque** paint a background; everything else
must stay transparent so it can be composited over a part colour.
