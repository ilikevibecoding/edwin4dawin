import * as THREE from 'three';
import { TextureForge, type MaterialMaps } from './TextureForge';
import { QUALITY } from '../core/Config';
import type { SurfaceKind } from '../core/Signals';

/**
 * The surface library.
 *
 * Each entry is a GLSL `surface()` implementation that authors a height field
 * first and then derives everything else from it. The recurring pattern —
 * `cavity = 1 - height` driving darker albedo, higher roughness, and lower AO
 * — is what makes these read as real materials instead of noise: dirt and
 * moisture collect in recesses, wear exposes raised edges, and light behaves
 * accordingly.
 *
 * Three rules the whole library follows:
 *
 *  1. **Everything is authored in metres.** `countOf(0.075)` means "one feature
 *     every 75 mm", so a brick course is a brick course and not a decorative
 *     stripe. The forge knows how many metres a tile covers, so the same GLSL
 *     stays correct if a surface is re-tiled.
 *  2. **Nothing in the height field is finer than about five texels.** Below
 *     that the derived normal is pure aliasing; sub-texel structure belongs in
 *     the shared detail normal (which fades with distance) or in albedo, where
 *     mip-mapping handles it gracefully. Albedo is allowed to run finer.
 *  3. **Roughness carries the material.** Every surface varies its roughness
 *     across itself — polished wheel tracks, damp corners, chalked paint,
 *     glazed tile against porous grout — because that variation is what the eye
 *     reads as "real" long before it notices albedo detail.
 */

const CONCRETE = /* glsl */ `
Surface surface(vec2 uv) {
  Surface s;

  // Poured against plywood shuttering. The panel grid and the tie-rod holes are
  // what let a player read a building's size from thirty metres out; everything
  // else here is surface finish.
  vec2 pn = vec2(countOf(1.22), countOf(2.44));
  vec2 pcell = uv * pn;
  vec2 pf = fract(pcell);
  vec2 pm = uTileMetres / pn;
  vec2 pe = min(pf, 1.0 - pf) * pm;
  // A formwork joint on a wall is a 14 mm ridge of escaped paste; the equivalent
  // line on a floor is a 4 mm saw cut, made two days after the pour to tell the
  // slab where to crack. Same grid, different feature, and running the wall
  // version on a floor drew wide soft bands across every deck in the town.
  float seamW = mix(0.014, 0.004, uParams1.x);
  float seam = 1.0 - smoothstep(0.0, seamW, min(pe.x, pe.y));
  // A pale fringe either side of the joint where cement paste has escaped
  // between the boards. Small, but it is the detail that separates in-situ
  // concrete from a grey box.
  float bleed = (1.0 - smoothstep(0.010, 0.045, min(pe.x, pe.y))) * (1.0 - seam);
  // Two tiers of tone, because a wall is poured a lift at a time: the whole
  // horizontal run cures as one batch and drifts together, and each panel
  // within it drifts a little more. That hierarchy is the strongest cue the
  // material has at twenty metres and beyond, where nothing finer survives.
  float liftTone = hash21(vec2(mod(floor(pcell.y), pn.y), 3.0) + uSeed) - 0.5;
  float panelTone = (hash21(mod(floor(pcell), pn) + uSeed) - 0.5) * 0.55 + liftTone;

  // Tie-rod holes sit on the panel grid, not at random. A floor slab was never
  // poured against vertical shuttering, so it has neither these nor the paste
  // bleed along the joints; uParams1.x switches this material between a wall and
  // a power-floated slab.
  float slab = uParams1.x;
  vec2 tie = abs(pf - 0.5) * pm;
  float tieHole = (1.0 - smoothstep(0.014, 0.026, length(tie))) * (1.0 - slab);
  bleed *= 1.0 - slab;

  // Float marks. A power-floated slab is covered in long overlapping arcs where
  // the trowel swept it, and they are the whole reason a concrete floor has a
  // direction to it. Anisotropic ridged noise gives the same long curved ridges
  // for a fraction of the cost of drawing real arcs.
  vec2 swP = vec2(countOf(0.7), countOf(0.11));
  float swirl = ridged2(uv * swP, swP, 2) * slab;
  // Traffic polishes the routes people actually walk and leaves the corners
  // matte. On an interior floor this is the single most valuable feature there is,
  // because it is a large, soft, roughness-only variation and roughness is what
  // sells a floor.
  float polishN = countOf(1.5);
  float polish = smoothstep(0.40, 0.78, fbm(uv * polishN, polishN, 3, 0.5, 2.0)) * slab;

  float sweepN = countOf(1.4);
  float sweep = fbm(uv * sweepN, sweepN, 3, 0.5, 2.0);
  float grainN = countOf(0.026);
  float grain = gnoise(uv * grainN, grainN);

  // Sawn-board shuttering, and its absence was the whole problem with this
  // material up close. Between the panel grid at a metre and the aggregate at
  // fifty millimetres there was nothing whatsoever, so a lintel, a kerb or a pier
  // cap seen from two metres had no feature in it at any scale a player could
  // see and read as an untextured grey primitive — while the same material on a
  // facade, where the panel grid does the work, read perfectly well.
  //
  // Cheap formwork is boards rather than plywood sheet, and boards leave a
  // record: each one sits a millimetre or two proud of its neighbour because it
  // was a different piece of timber, paste escapes along every joint between
  // them, and the saw grain prints into the face. It is the most recognisable
  // thing about in-situ concrete and it costs three fields.
  vec2 bd = bands(uv.y, 0.16);
  float wall = 1.0 - slab;
  float boardStep = (bd.x - 0.5) * wall;
  float boardJoint = (1.0 - smoothstep(0.0, 0.005, bd.y)) * wall;
  vec2 bgP = vec2(countOf(0.9), countOf(0.035));
  float boardGrain = (ridged2(uv * bgP, bgP, 2) - 0.42) * wall;

  // Cement paste cures in soft patches a hand's width across, according to how
  // the mix segregated and how much water the form drew out of it. This is the
  // band that carries concrete at close range on every surface, boards or not.
  float pasteN = countOf(0.13);
  float paste = fbm(uv * pasteN, pasteN, 3, 0.5, 2.0);

  // Fine aggregate showing through where the paste has weathered off. It is the
  // only thing this material has between the panel grid at a metre and the
  // detail normal at a few millimetres, and a bare kerb or block seen from two
  // metres has nothing else to show — which is why small concrete pieces were
  // reading as untextured primitives while the facades read fine.
  // 18 mm aggregate was the intuitive frequency to ask for and it came out under
  // five texels a cell, so the Worley stopped drawing stones and started drawing
  // its own grid — the same defect that put a herringbone of chevrons across the
  // road. What this density can hold, and what actually reads from two metres, is
  // the patchwork of *where* the paste has gone rather than the individual stones
  // inside it; the stones themselves belong to the shared detail layer.
  float aggN = countOf(0.055);
  vec3 agg = worley(uv * aggN, aggN, 1.0);
  float aggFace = 1.0 - smoothstep(0.2, 0.58, agg.x);
  float aggMask = smoothstep(0.42, 0.68, fbm(uv * countOf(0.22), countOf(0.22), 3, 0.5, 2.0));
  // Almost none of this on a slab. Power floating is the process of bringing paste
  // to the surface and closing it, so a floated floor has no exposed aggregate at
  // all until it wears through — and a Worley cell per 55 mm scattered over the
  // roughness map of every deck read as a rash of blisters, which was the loudest
  // thing on the largest surface in the game.
  float aggregate = aggFace * aggMask * (1.0 - slab * 0.8);

  // Blowholes trapped against the formwork. Real fair-faced concrete has a few
  // per hand-span, covering a couple of per cent of the face — a dense pepper
  // of them reads as cast stone or, worse, as asphalt.
  float bn = countOf(0.04);
  vec3 bug = worley(uv * bn, bn, 1.0);
  // Air is trapped against a *vertical* form face, so a floor slab has none of
  // these. Left switched on, they peppered every roof deck in the town with dark
  // specks that read as scattered dirt rather than as anything structural.
  float bugHole = step(bug.z, 0.11) * (1.0 - smoothstep(0.06, 0.26, bug.x))
                * (1.0 - slab);

  float h = 0.66 + (sweep - 0.5) * 0.24 + (grain - 0.5) * 0.06
            - seam * 0.15 + bleed * 0.05 - tieHole * 0.3 - bugHole * 0.14
            + aggregate * 0.05 + panelTone * 0.05
            + swirl * 0.15
            + boardStep * 0.07 - boardJoint * 0.11 + boardGrain * 0.06
            + (paste - 0.5) * 0.08;

  // Declared here rather than beside the albedo work below, because the patch has
  // to be in the height field before the cavity term is taken from it: a screed
  // laid into a chased slab stands a few millimetres shy of the old surface and
  // the saw cut around it is a genuine groove.
  vec3 scr = rects(uv, vec2(1.9, 1.4), 0.34, 0.35, 0.85);
  float screed = scr.x * smoothstep(0.0, 0.02, scr.y) * slab;
  float screedEdge = scr.x * (1.0 - smoothstep(0.004, 0.02, scr.y)) * slab;
  h -= screed * 0.03 + screedEdge * 0.05;

  // Shrinkage map cracking, only where the pour has dried out hard. Two masks:
  // a coarse one that keeps the network to a fifth of the wall, and a fine one
  // that breaks it into segments. A complete polygonal net over a whole wall is
  // crazed ceramic, not concrete.
  float dryN = countOf(1.8);
  float crack = cellCracks(uv, 0.42, 0.010, 0.95)
              * smoothstep(0.66, 0.88, fbm(uv * dryN, dryN, 3, 0.5, 2.0))
              * smoothstep(0.46, 0.74, fbm(uv * countOf(0.13), countOf(0.13), 2, 0.5, 2.0));
  h -= crack * 0.13;

  // Spalling: a bowl of missing cover exposing paler aggregate.
  float sn = countOf(0.6);
  vec3 sc = worley(uv * sn, sn, 1.0);
  float spall = step(sc.z, 0.13) * (1.0 - smoothstep(0.08, 0.40, sc.x));
  h -= spall * 0.4;

  float cavity = clamp(1.0 - h, 0.0, 1.0);

  // Albedo: cement paste is a low-chroma grey that shifts warm where it has
  // baked and cool where the aggregate shows. The decimetre-scale patchiness
  // here is deliberate — features smaller than about 150 mm are gone by twenty
  // metres, so this band is the only thing keeping the wall from turning into
  // flat paint at range.
  float blotchN = countOf(0.34);
  float blotch = fbm(uv * blotchN, blotchN, 3, 0.5, 2.0);
  vec3 col = mix(uColorA, uColorB, clamp(sweep * 1.3 - 0.15, 0.0, 1.0));
  col *= 0.9 + blotch * 0.22;
  // The lift/panel tone hierarchy, at an amplitude that survives mip-mapping.
  // This was at six per cent, which is below the threshold where a viewer reads
  // it as separate panels at all — the wall baked out at an albedo contrast of
  // 0.08, a third of what brick or timber manages, and looked like flat grey
  // paint from ten metres. A real pour varies far more than that: each plywood
  // panel has a different age, a different release agent and a different suction,
  // and the resulting patchwork is the main thing that makes in-situ concrete
  // legible at range.
  col *= 1.0 + panelTone * 0.30;
  col *= 1.0 - seam * 0.3;
  col *= 1.0 + bleed * 0.1;
  col *= 1.0 + (paste - 0.5) * 0.24;
  col *= 1.0 + boardStep * 0.11 - boardJoint * 0.13 + boardGrain * 0.07;
  // Fine aggregate speckle: too small for the height field, but albedo can
  // carry it and mip-mapping averages it away cleanly.
  float fleckN = countOf(0.011);
  float fleck = gnoise(uv * fleckN, fleckN);
  col *= 0.94 + fleck * 0.13;
  // Exposed aggregate is quartz and limestone: paler and greyer than the paste
  // around it, and glassy rather than chalky. Most of its contribution is in
  // roughness below, because albedo contrast at this scale turns into speckle
  // the moment the wall is more than twenty metres away.
  col = mix(col, uColorB * vec3(1.1, 1.1, 1.12), aggregate * 0.3);
  col = mix(col, uColorB * 1.22, spall * 0.85);
  col = mix(col, uColorC, crack * 0.35);
  col *= 1.0 - bugHole * 0.22;

  // Water sits on the ledge of every horizontal joint and runs off it. v points
  // up on every wall face in the level, so the joint above a texel is at the
  // top of its panel cell and the staining fades downward from there.
  float run = runs(uv, 0.09, 14.0);
  float belowJoint = (1.0 - pf.y) * pm.y;
  float underSeam = 0.45 + 0.55 * (1.0 - smoothstep(0.0, 0.9, belowJoint));
  float stain = smoothstep(0.58, 0.90, run) * underSeam * uParams0.x;
  col *= mix(1.0, 0.74, stain);

  // Rust bleed from corroding reinforcement inside the spalled patches.
  col = mix(col, vec3(0.16, 0.07, 0.035), spall * smoothstep(0.45, 0.85, run) * 0.45);

  // Rust from the tie rods. Every one of these holes was left with a steel snap
  // tie in it and every one of them has been weeping down the wall since. The
  // streaks are strongly coloured against a grey field and they hang off a
  // regular grid, so they read at forty metres and they tell you the panel size
  // while they do it — the highest-value detail on the whole material and it was
  // missing entirely.
  // v points up on every wall face in the level, so below the hole is pf.y under
  // 0.5, and the streak fades out over the first two thirds of a metre.
  float tieDown = (0.5 - pf.y) * pm.y;
  float tieBleedN = countOf(0.16);
  float tieRun = step(0.0, tieDown) * (1.0 - smoothstep(0.0, 0.7, tieDown))
               * smoothstep(0.022, 0.006, tie.x)
               * smoothstep(0.44, 0.80, fbm(uv * tieBleedN, tieBleedN, 3, 0.5, 2.0));
  col = mix(col, vec3(0.13, 0.062, 0.03), clamp(tieHole + tieRun, 0.0, 1.0) * 0.5);

  // Lime bloom creeping out of the joints and cracks. Pale on grey is a smaller
  // step than rust is, but it works in the opposite direction, and having both
  // is what stops the staining from reading as one dirty wash.
  float bloomN = countOf(0.45);
  float bloom = max(seam, crack) * 0.35
              + smoothstep(0.60, 0.86, fbm(uv * bloomN, bloomN, 3, 0.5, 2.0)) * 0.5;
  col = mix(col, vec3(0.42, 0.42, 0.40), clamp(bloom, 0.0, 1.0) * 0.22);

  // Float marks show mostly as a sheen rather than a tone, and a polished traffic
  // route darkens as the pores fill with whatever has been walked into them.
  col *= 1.0 - swirl * 0.05;
  col *= 1.0 - polish * 0.22;
  // A slab has no panel grid to give it tone, and that is why it had none: at a
  // three metre tile the form grid resolves to two panels across and one down, so
  // panelTone is very nearly a constant and the floor measured an albedo contrast
  // of 0.050 — half of the next flattest material and by a wide margin the flattest
  // thing in the game, on the surface a player spends the most time looking at.
  // What a floor has instead is the pour itself: bays laid on different days from
  // different batches, curing blankets, and thirty years of things spilled and
  // trodden across it.
  // Both fields are normalised before they are scaled. Gradient noise sits far
  // closer to its midpoint than its nominal range suggests, so an fbm used raw
  // delivers about a fifth of the amplitude it appears to ask for. Anything above
  // the tile size cannot come from here at all — a three metre tile cannot hold a
  // four metre pour bay — so the rest of a floor's tonal life comes from the
  // world-space macro field.
  float bayN = countOf(1.3);
  float bay = clamp((fbm(uv * bayN, bayN, 3, 0.5, 2.0) - 0.5) * 3.6, -1.0, 1.0);
  float blotWide = clamp((blotch - 0.5) * 2.6, -1.0, 1.0);
  col *= 1.0 + (bay * 0.28 + blotWide * 0.17) * slab;
  // Screed patches. Every slab in a building this age has been dug up and made
  // good — for a drain, for a conduit, or because it blew — and the new screed
  // never matches: different sand, different cement, laid to a straight edge
  // against the old. It is the one feature on a slab with a hard boundary, and a
  // hard boundary is what survives both mip-mapping and the shoulder of the tone
  // curve. A sunlit roof deck sits high enough on that curve that a soft fifteen
  // per cent tonal drift is compressed to almost nothing, which is why the deck
  // kept reading as a blank card whatever was piled into the smooth fields.
  col *= 1.0 + screed * (scr.z - 0.45) * 0.42;
  col *= 1.0 - screedEdge * 0.16;
  // Spills. Hard-edged, dark, and irregular — a floor without them looks swept,
  // and nothing in this town has been swept.
  float spillN = countOf(0.7);
  float spill = smoothstep(0.62, 0.86, fbm(uv * spillN, spillN, 4, 0.5, 2.0)) * slab;
  col *= 1.0 - spill * 0.28;

  s.albedo = col;
  s.height = clamp(h, 0.0, 1.0);
  // Fair-faced concrete is matte but not uniform: the formwork face is closed
  // and slightly smoother, cracks and blowholes are porous and much rougher.
  // Aggregate at a fifth of the roughness range drew a rash of hard-edged dark
  // circles over the whole map — 55 mm Voronoi cells read as spots, not stones,
  // and it was the loudest thing in the channel. Paste variation at a hand's
  // width is both truer and far less recognisable as a pattern.
  s.roughness = clamp(0.80 + cavity * 0.14 + crack * 0.08 + bugHole * 0.1
                      + spall * 0.06 + stain * 0.07 + bleed * 0.08 - seam * 0.04
                      - aggregate * 0.11 + aggMask * 0.05
                      + (paste - 0.5) * 0.28 + boardJoint * 0.08
                      - boardGrain * 0.05
                      - swirl * 0.12 - polish * 0.30 - spill * 0.24
                      - blotch * 0.14 + screed * 0.12 + screedEdge * 0.1,
                      0.30, 1.0);
  s.metalness = 0.0;
  s.ao = clamp(1.0 - crack * 0.28 - seam * 0.2 - spall * 0.22 - tieHole * 0.3
               - aggregate * 0.08 - screedEdge * 0.25, 0.1, 1.0);
  return s;
}
`;

const PLASTER = /* glsl */ `
Surface surface(vec2 uv) {
  Surface s;

  // Sand-cement render over blockwork, floated by hand. The trowel sweep is
  // the only large feature; everything readable comes from how it has failed.
  float sweepN = countOf(0.55);
  float sweep = fbm(uv * sweepN, sweepN, 3, 0.5, 2.1);
  float gritN = countOf(0.024);
  float grit = gnoise(uv * gritN, gritN);

  float h = 0.70 + (sweep - 0.5) * 0.2 + (grit - 0.5) * 0.14;

  // Blown render: the top coat has let go in patches, exposing the rougher
  // scratch coat and, in the worst of them, the blockwork behind. These patches
  // are the load-bearing feature of the material — they are the only thing on a
  // rendered wall big enough to still be there at thirty metres.
  // Frequency matters as much as amplitude here. At one patch per metre a 4.5 m
  // tile holds four of them, and four recognisable blobs repeating every 4.5 m
  // is exactly what the eye locks onto — the wall reads as wallpaper. Eight per
  // tile is small enough that the arrangement stops being memorable, and the
  // metre scale is carried by the world-space macro field instead.
  // Where the render has failed *at all*. This gate is the single most important
  // line in the material. Blown render is a water-ingress failure: it starts
  // under a broken parapet or behind a split downpipe and spreads from there, so
  // it arrives as two or three large zones per elevation with wholly intact wall
  // in between. An ungated threshold on the patch field puts it evenly over
  // forty per cent of every surface, and evenly distributed hard-edged blotches
  // on a pale field is a camouflage scheme, not weathering — it was the most
  // artificial thing left in the level, and worst on the interior columns where
  // there is no rain to have caused it in the first place.
  // The period is deliberately a literal rather than a metric count: countOf
  // floors to 1 at this scale, which would lock the zones to the tile and stamp
  // an obvious grid of damage across the town.
  // Now that the patches are compact areas rather than a tangle of outlines, this
  // gate has to be much tighter. It was opening over about half of every wall, and
  // half a wall's worth of filled, evenly sized, evenly spaced dark blotches on a
  // pale field is a camouflage scheme — the exact failure the gate exists to stop.
  // Two or three failures on an elevation is what a real building has.
  // Gate thresholds throughout this file are set against a field of standard
  // deviation 0.18 about 0.5, which is what fbm actually delivers. A gate at
  // 0.62 opens over roughly a quarter of a surface, one at 0.72 over a tenth.
  float bays = smoothstep(0.63, 0.86, fbm(uv * 2.0, 2.0, 3, 0.5, 2.0));
  float blowN = countOf(0.85);
  // Two octaves, not four, and this is the shape of the damage rather than its
  // amount. A level set taken through a four-octave field is a fractal curve: the
  // regions it encloses are thin sinuous fingers that braid around each other,
  // and since the outer sliver of every one of them falls in the lip band, what
  // actually reached the screen was a tangle of raised outlines with almost no
  // interior — closed loops of light and dark scribbled over the wall, roughly a
  // metre across, which looked like graffiti or lichen and nothing at all like
  // failed render. Blown render is a compact area: water gets behind the coat and
  // a whole panel of it lets go together. Two octaves gives that, and the ragged
  // edge a break really has comes from jittering the *threshold* underneath,
  // where it perturbs the outline without fragmenting the region.
  float blowLow = fbm(uv * blowN, blowN, 2, 0.5, 2.0);
  float ragN = blowN * 5.0;
  float blowField = blowLow + (fbm(uv * ragN, ragN, 2, 0.5, 2.0) - 0.5) * 0.035;
  // These transition bands are narrow on purpose, and it is the single biggest
  // lever on how this material shades. The field varies over its cell — very
  // nearly a metre — so a band of 0.05 field units spreads the edge of a blown
  // patch over 150 mm of wall. Four millimetres of depth ramped over 150 mm is a
  // one-and-a-half degree slope: invisible. That was why a rendered wall baked
  // out at a 2.6-degree RMS slope, the flattest thing in the library, and why the
  // walls of the town looked untextured from five metres however much albedo
  // detail was piled onto them. A real blown patch is a *break*: the top coat is
  // ten or fifteen millimetres thick and it snaps off square. 0.012 field units
  // puts that edge across about eight texels, which is as sharp as this density
  // can carry without aliasing.
  float blown = smoothstep(0.556, 0.568, blowField) * bays * uParams0.x;
  float deep = smoothstep(0.640, 0.652, blowField) * bays * uParams0.x;
  // The raised lip of intact render standing at the rim of the break. It sits
  // wholly *outside* the break — the coat that is still stuck to the wall — and it
  // is two millimetres, not four. Overlapping it with the edge of the patch put a
  // bright ridge and its shadow on the same few texels, and that pair of parallel
  // lines is what drew the outline.
  float lip = (smoothstep(0.540, 0.550, blowField)
               - smoothstep(0.550, 0.562, blowField)) * bays;
  h -= blown * 0.30 + deep * 0.16 - lip * 0.055;

  // 440 x 215 mm dense concrete block. Exposed in the deep patches, and
  // ghosting faintly through the render everywhere else, because a thin coat
  // never quite hides the joints behind it.
  vec2 bn = vec2(countOf(0.44), countOf(0.215));
  vec2 bu = uv * bn;
  float row = floor(bu.y);
  bu.x += mod(row, 2.0) * 0.5;
  vec2 bf = fract(bu);
  vec2 bm = uTileMetres / bn;
  vec2 be = min(bf, 1.0 - bf) * bm;
  float jointLine = 1.0 - smoothstep(0.0, 0.012, min(be.x, be.y));
  // Ghosting only shows where the coat happens to be thin, so its strength has to
  // wander. Held at one level across a whole elevation the grid reads as graph
  // paper — a regular signal at constant amplitude is the one thing the eye will
  // never accept as weathering, however correct its dimensions are.
  float thinN = countOf(1.3);
  float thin = 0.35 + smoothstep(0.44, 0.80, fbm(uv * thinN, thinN, 3, 0.5, 2.0)) * 0.9;
  float ghost = (1.0 - smoothstep(0.0, 0.018, min(be.x, be.y))) * 0.5 * thin;
  // Individual blocks telegraph through at slightly different tones: a block
  // with more suction pulls more water out of the render laid over it, and it
  // cures to a different shade. Now that the damage is confined to a few bays,
  // this ghosting is what has to carry an intact wall from ten to thirty metres
  // — which is most of the range a player ever looks at a facade over — and it
  // survives mip-mapping where noise does not, because a 440 x 215 grid is a
  // regular signal at a scale the mip chain can still resolve.
  float blockId = hash21(mod(floor(bu), bn) + uSeed) - 0.5;
  // The joints telegraph strongly through a blown patch, not only through the
  // deepest ones. A scratch coat is eight or ten millimetres and a mortar joint is
  // the same, so it cannot hide one — and this is what gives a patch some internal
  // structure at the 440 x 215 scale. Without it the patches were flat fields of a
  // slightly different colour, which is why they read as stains at ten metres
  // however much depth was baked into their edges: nothing inside them said you
  // were looking at the layer underneath.
  float joint = jointLine * max(deep, blown * 0.5);
  h -= joint * 0.18 + ghost * (1.0 - deep) * 0.09;
  h += blockId * 0.02 * (1.0 - deep);

  // Craze cracking follows the render's own shrinkage cells. Two masks, because
  // a complete polygonal net across a whole elevation is the signature of a
  // procedural wall: at range a full network mips down to an even grey haze that
  // reads as dirt, and up close it looks like crackle glaze. Real crazing is
  // confined to a few bays and broken into short runs even there.
  float cracks = cellCracks(uv, 0.5, 0.014, 0.9)
               * smoothstep(0.66, 0.88, fbm(uv * countOf(2.2), countOf(2.2), 3, 0.5, 2.0))
               * smoothstep(0.48, 0.74, fbm(uv * countOf(0.16), countOf(0.16), 2, 0.5, 2.0));
  h -= cracks * 0.16;

  // The comb marks in the scratch coat, exposed wherever the top coat has gone.
  //
  // This is the feature that makes a blown patch legible, and its absence was why
  // the patches read as brown stains: nothing inside them said "you are looking
  // at the layer underneath". A plasterer scratches the base coat while it is
  // green so the finish has a key to grip, and those ruled parallel lines at a
  // comb's pitch are unmistakable — no weathering process produces anything like
  // them, so they can only be read as a tooled surface that was meant to be
  // covered up. The gnoise term is the waver in a hand-drawn line; the uv.x
  // coefficient is an integer so the skew still tiles.
  float combN = countOf(0.028);
  vec2 combW = vec2(countOf(0.55));
  float comb = sin((uv.y * combN + uv.x * 3.0
                    + (gnoise2(uv * combW, combW) - 0.5) * 1.2) * 6.2831853) * 0.5 + 0.5;
  comb *= blown;
  h -= comb * 0.07;

  // Patch repairs: someone re-rendered a section and it never matched. These are
  // rectangles because a plasterer works to a straight edge — he screeds up to a
  // batten, or up to the arris of the opening he came to fix. The Worley cells
  // this used to be drew two-metre soft hexagons over a third of every wall,
  // which was the most obvious thing in the roughness map and read as faceting
  // rather than as building maintenance.
  vec3 rc = rects(uv, vec2(2.1, 1.5), 0.32, 0.28, 0.72);
  float repair = rc.x * smoothstep(0.0, 0.02, rc.y);
  h += repair * 0.05;

  float cavity = clamp(1.0 - h, 0.0, 1.0);

  vec3 col = mix(uColorA, uColorB, clamp(sweep * 1.4 - 0.2, 0.0, 1.0));
  // Limewash goes on in overlapping brush loads and burns off unevenly, so the
  // tone drifts in patches a few hand-widths across. This band survives
  // mip-mapping out to twenty-odd metres, which is exactly where a rendered
  // wall otherwise collapses into flat paint.
  float washN = countOf(0.3);
  float wash = fbm(uv * washN, washN, 3, 0.5, 2.0);
  // Normalised before use. Three octaves of gradient noise strays only about six
  // per cent either side of its midpoint, so the nominal 26 per cent band this
  // asked for was delivering under a tenth of that. It is the reason a rendered
  // wall kept measuring flat however much was piled onto it.
  float washN2 = clamp((wash - 0.5) * 2.2, -1.0, 1.0);
  col *= 1.0 + washN2 * 0.19;
  col *= 0.96 + grit * 0.09;
  // Hands, shoulders and furniture burnish a wall wherever people pass close to
  // it, and the polished band is both slightly dirtier and markedly smoother than
  // the chalky limewash around it. This is the only roughness variation an intact
  // interior wall has — the damage terms are all scaled right down indoors, which
  // left plasterInterior with a roughness spread of 0.022, the flattest response
  // to light of anything in the library, on the surface that fills most of every
  // indoor frame.
  float rubN = countOf(1.2);
  float rub = smoothstep(0.54, 0.86, fbm(uv * rubN, rubN, 3, 0.5, 2.0));
  col *= 1.0 - rub * 0.07;
  // The scratch coat is a bare sand-cement mix: warmer, browner and duller than
  // the wash over it, but only slightly darker. A blown patch reads through its
  // lip shadow, its cavity AO and its roughness — not through a big albedo step.
  // Pushing the albedo instead is what turned this wall into desert camouflage:
  // hard-edged dark blotches on a pale field is a paint scheme, not weathering.
  // Bare sand-cement is grey. It was mixed warm-brown here, and a warm-brown
  // blotch on a warm-buff wall is a stain — which is what these patches looked
  // like. Taking the hue out of it is what makes the eye read a different
  // material rather than a discolouration of the same one, and it costs no albedo
  // contrast at all, so the wall does not turn into camouflage.
  vec3 scratch = mix(col, vec3(0.30, 0.295, 0.275), 0.32);
  col = mix(col, scratch, blown);
  col = mix(col, mix(col, uColorC, 0.28), deep);
  col *= 1.0 - comb * 0.11;
  col = mix(col, uColorC * 0.62, joint * 0.8);
  col *= 1.0 - ghost * (1.0 - deep) * 0.15;
  // Per-block tone is the one signal on an intact rendered wall that mip-mapping
  // cannot destroy, because a 440 x 215 grid is still several pixels across at
  // thirty metres. It is doing most of the work of keeping a facade legible at
  // range, so it carries more of the albedo budget than the noise fields do.
  col *= 1.0 + blockId * 0.11 * (1.0 - deep);
  col *= 1.0 - cracks * 0.16;
  // A repair reads as a slightly different batch — usually greyer, and never the
  // same grey twice, which is what rc.z is for.
  col = mix(col, mix(col, vec3(0.30, 0.30, 0.29) * (0.8 + rc.z * 0.5), 0.4), repair);

  // Rain runs and dust lines streak down the face.
  float run = runs(uv, 0.11, 15.0);
  float dribble = smoothstep(0.64, 0.94, run) * uParams1.x;
  col *= mix(1.0, 0.78, dribble);

  s.albedo = col;
  s.height = clamp(h, 0.0, 1.0);
  // Limewash over floated render is chalky but closed; the exposed scratch coat
  // is open, sandy and far more porous. Since the albedo step between them is
  // now small, this roughness step is what actually makes a blown patch read —
  // and it reads best exactly when it matters, with the sun low on the wall.
  s.roughness = clamp(0.84 + blown * 0.13 + deep * 0.04 + cracks * 0.06
                      + cavity * 0.06 - repair * 0.14 + dribble * 0.04
                      + ghost * (1.0 - deep) * 0.05 + comb * 0.05
                      - rub * 0.20 - washN2 * 0.09, 0.4, 1.0);
  s.metalness = 0.0;
  // The break already has eleven millimetres of relief, and the forge's own
  // horizon pass occludes it from that. Adding a flat term per patch on top double
  // counted it and was most of why the patches read as dark shapes rather than as
  // a change of surface.
  s.ao = clamp(1.0 - cracks * 0.2 - joint * 0.5 - blown * 0.06 - deep * 0.1
               - ghost * 0.1, 0.1, 1.0);
  return s;
}
`;

const BRICK = /* glsl */ `
Surface surface(vec2 uv) {
  Surface s;

  // Running bond in real brick: 215 x 65 mm units on a 10 mm bed, so 225 mm by
  // 75 mm on centres. Getting this right is the difference between a wall that
  // tells you how tall a building is and a wall covered in stripes.
  vec2 grid = vec2(countOf(0.225), countOf(0.075));
  vec2 bu = uv * grid;
  float course = floor(bu.y);
  bu.x += mod(course, 2.0) * 0.5;
  vec2 cellId = mod(floor(bu), grid);
  vec2 f = fract(bu);

  vec2 bm = uTileMetres / grid;                 // brick size in metres
  vec2 e = min(f, 1.0 - f) * bm;                // metres to the joint
  float joint = 0.010;
  float brickMask = smoothstep(0.0, joint, min(e.x, e.y));

  float id = hash21(cellId + uSeed);
  float id2 = hash21(cellId + uSeed + 31.7);

  // Each brick bows, pits, and sits a little proud or shy of its neighbours.
  // The 6 mm the face stands in front of the joint is the whole reason a brick
  // wall self-shadows; overdo it and the joints turn into black trenches.
  float faceN = countOf(0.02);
  float face = fbm(uv * faceN + id * 4.0, faceN, 2, 0.5, 2.0);
  // Normalised, because two octaves of gradient noise stray only about a sixth
  // either side of the midpoint and what this asked for was arriving at a fifth of
  // its nominal strength. It is the only within-unit variation the material has, so
  // without it every brick face was one flat colour and a wall read as printed
  // brick paper: correct bond, correct dimensions, no surface.
  float faceV = clamp((face - 0.5) * 3.0, -1.0, 1.0);
  float sink = (id2 - 0.5) * 0.05;
  float h = 0.5 + brickMask * (0.2 + faceV * 0.05 + sink);

  // Struck mortar sits back from the face and is coarse.
  float mortarN = countOf(0.014);
  float mortarNoise = gnoise(uv * mortarN, mortarN);
  h += (1.0 - brickMask) * (mortarNoise - 0.5) * 0.08;

  // Damage: a few bricks are spalled, fewer still are gone.
  float broken = step(0.965, id);
  float chipped = step(0.86, id2)
                * (1.0 - smoothstep(0.012, 0.05, length((f - vec2(id, id2)) * bm)));
  h -= broken * brickMask * 0.42;
  h -= chipped * brickMask * 0.1;

  float cavity = clamp(1.0 - h, 0.0, 1.0);

  // Fired clay varies enormously kiln to kiln and brick to brick, and that
  // variation is the only thing on a brick wall that still reads at forty metres.
  // Crucially it is not independent per brick: a wall goes up a barrow-load at a
  // time, so tone arrives in patches half a metre across. An independent per-unit
  // hash is a white-noise field, and white noise is precisely what mip-mapping is
  // built to destroy — which is why this wall was averaging out into one flat
  // salmon plane by the far side of the street. Clustering the same variance into
  // patches puts its energy at a frequency the mip chain keeps.
  float batchN = countOf(0.85);
  float batch = fbm(uv * batchN, batchN, 3, 0.5, 2.0);
  float tone = clamp(id * 0.6 + batch * 0.4, 0.0, 1.0);
  vec3 brickCol = mix(uColorA, uColorB, smoothstep(0.12, 0.88, tone));
  // Over-fired units come out grey-purple and under-fired ones chalky buff. Both
  // are common enough in a hand-fired kiln to be expected rather than remarkable,
  // and they widen the spread far more than nudging the two base tones could.
  brickCol = mix(brickCol, uColorB * vec3(1.22, 1.13, 0.98), step(0.66, id2) * 0.6);
  brickCol = mix(brickCol, uColorA * vec3(0.62, 0.64, 0.74), step(0.90, id2) * 0.62);
  brickCol *= 1.0 + faceV * 0.15;

  float mortarV = clamp((mortarNoise - 0.5) * 2.6, -1.0, 1.0);
  vec3 mortarCol = uColorC * (1.0 + mortarV * 0.16);
  vec3 col = mix(mortarCol, brickCol, brickMask);
  col = mix(col, mortarCol * 0.6, broken * brickMask);
  col = mix(col, brickCol * 1.15, chipped * brickMask * 0.6);

  // Efflorescence: pale salt bloom creeping out of the joints.
  float bloomN = countOf(0.4);
  float bloom = (1.0 - brickMask * 0.7) * smoothstep(0.62, 0.90, fbm(uv * bloomN, bloomN, 3, 0.5, 2.0));
  col = mix(col, vec3(0.62, 0.61, 0.58), bloom * 0.3);

  // Soot and grime wash down and collect on the top edge of every course.
  float grime = smoothstep(0.58, 0.94, runs(uv, 0.28, 3.2)) * uParams1.x;
  col *= mix(1.0, 0.70, grime);

  s.albedo = col;
  s.height = clamp(h, 0.0, 1.0);
  // Sand-faced brick is fairly rough; lime mortar is rougher still and much
  // more porous, so it never picks up the same sheen at grazing angles.
  s.roughness = clamp(mix(0.94, 0.76, brickMask) + cavity * 0.06
                      + grime * 0.04 + broken * 0.08, 0.45, 1.0);
  s.metalness = 0.0;
  s.ao = clamp(mix(0.55, 1.0, brickMask) - broken * 0.3 - chipped * 0.15, 0.05, 1.0);
  return s;
}
`;

const SAND = /* glsl */ `
Surface surface(vec2 uv) {
  Surface s;

  // Dune form. Deliberately carries almost no slope: the terrain mesh already
  // supplies the metre-scale shape, so all this does is decide where the ripples
  // stretch and which patches read as scoured or as freshly drifted.
  float dunesN = countOf(3.4);
  float dunes = fbm(uv * dunesN, dunesN, 4, 0.55, 2.0);

  // Aeolian ripples, 105 mm crest to crest. Asymmetric: the windward face climbs
  // at seven or eight degrees and the lee face drops at nearly twenty, and that
  // sawtooth is the whole reason sand reads as sand under a low sun.
  //
  // Warping the phase is what separates sand from corrugated iron, and it has to
  // be done at three scales and hard enough to matter. Crests meander around
  // whatever is standing in the wind at the metre scale; they curve again over a
  // third of a metre; and — this is the one that was missing — they wander by an
  // appreciable part of a wavelength at close to the ripple pitch itself, which
  // is what makes them bifurcate. Where that last term's gradient cancels the
  // ripple's own, two crests have to merge, and the Y-junctions that produces are
  // most of what the eye uses to identify a rippled sand surface. With only the
  // gentle long-wave wander this had, the map baked out with eight times as much
  // slope across the crests as along them: a ruled grating, and it looked milled.
  float rp = countOf(0.105);
  vec2 w1 = vec2(countOf(0.95));
  vec2 w2 = vec2(countOf(0.36));
  vec2 w3 = vec2(countOf(0.13));
  float warp = (gnoise2(uv * w1, w1) - 0.5) * 2.1
             + (gnoise2(uv * w2, w2) - 0.5) * 0.9
             + (gnoise2(uv * w3, w3) - 0.5) * 0.45;
  // Two ripple trains, thirty-odd degrees apart, blended by where in the field
  // you are. Warping one train is not enough on its own: it wobbles the crests
  // but they stay globally parallel, so the surface still reads as a grating, and
  // the bake bore that out with five times as much slope across the crests as
  // along them. Real ripples curve where the wind curves — around a wall, a
  // vehicle, the shoulder of a dune — and everywhere the two directions meet, the
  // crests fork and rejoin. Those Y-junctions are the single strongest cue that a
  // surface is wind-blown sand, and interfering two trains is the only cheap way
  // to get them; a single phase field cannot fork.
  //
  // Both coefficients are integers, which is what keeps each train tiling, and
  // the *heights* are blended rather than the phases — mixing the phases would
  // put a non-integer coefficient on uv.x and reopen the seam.
  float tilt = max(1.0, floor(rp * 0.3 + 0.5));
  float pA = fract(uv.y * rp + uv.x * tilt + warp);
  float pB = fract(uv.y * rp - uv.x * tilt + warp * 0.85 + 0.37);
  // Long gentle rise, short steep drop.
  float shapeA = smoothstep(0.0, 0.74, pA) * (1.0 - smoothstep(0.74, 1.0, pA));
  float shapeB = smoothstep(0.0, 0.74, pB) * (1.0 - smoothstep(0.74, 1.0, pB));
  vec2 dirN = vec2(countOf(1.7));
  float ripple = mix(shapeA, shapeB, smoothstep(0.3, 0.7, gnoise2(uv * dirN, dirN)));
  // And the ripples do not cover everything. A field has crisp trains where the
  // sand is deep and mobile, and smeared, near-featureless stretches where it is
  // damp, trafficked or blown out to a hard floor. Constant amplitude everywhere
  // is as artificial as constant wavelength — and it has to vary along a crest as
  // well as between trains, or every crest in a train is the same height.
  float trainN = countOf(1.5);
  float train = smoothstep(0.28, 0.62, fbm(uv * trainN, trainN, 3, 0.5, 2.0));
  vec2 alongN = vec2(countOf(0.55), countOf(0.22));
  float along = fbm2(uv * alongN, alongN, 2, 0.5, 2.0);
  ripple *= (0.25 + train * 0.75) * (0.55 + along * 0.9);

  float grainN = countOf(0.03);
  float grain = gnoise(uv * grainN, grainN);

  float h = 0.5 + (dunes - 0.5) * 0.3 + ripple * 0.20 * uParams0.x
            + (grain - 0.5) * 0.05;

  // Coarse lag gravel where the wind has stripped the fines away, and a
  // wind-packed crust everywhere it has not. These are the two states a desert
  // surface is actually in, they look different, and having only one of them was
  // most of why this material had no variation to speak of.
  float lagN = countOf(1.2);
  float lag = smoothstep(0.52, 0.72, fbm(uv * lagN, lagN, 3, 0.5, 2.0)) * uParams0.z;
  float crustN = countOf(0.75);
  float crust = smoothstep(0.40, 0.68, fbm(uv * crustN, crustN, 3, 0.5, 2.0));
  float pn = countOf(0.055);
  vec3 peb = worley(uv * pn, pn, 1.0);
  float pebble = step(peb.z, 0.3) * (1.0 - smoothstep(0.1, 0.34, peb.x)) * lag;
  h += pebble * 0.07;
  // Crust holds a ripple; loose drift slumps and loses it.
  h = mix(h, h - ripple * 0.06 * uParams0.x, 1.0 - crust);

  float cavity = clamp(1.0 - h, 0.0, 1.0);

  vec3 col = mix(uColorA, uColorB, clamp(dunes * 1.4 - 0.2, 0.0, 1.0));
  // Tonal patchiness at half a metre. Sand is close to uniform in albedo, which
  // is exactly why the little variation it has must be at a frequency that
  // survives mip-mapping — otherwise the surface has no tone at all past ten
  // metres, which is what was happening.
  float patchN = countOf(0.55);
  col *= 0.90 + fbm(uv * patchN, patchN, 3, 0.5, 2.0) * 0.22;
  // Quartz sand sparkles because the grains differ; a fine albedo speckle is the
  // honest way to suggest that at this texel density.
  float fleckN = countOf(0.02);
  col *= 0.94 + gnoise(uv * fleckN, fleckN) * 0.13;
  // Crests are scoured to bare pale quartz; troughs collect the dark heavy
  // minerals and wind-blown dust that the crests have shed.
  col *= 0.88 + ripple * 0.26;
  float damp = smoothstep(0.55, 0.2, h) * uParams0.y;
  col = mix(col, col * vec3(0.62, 0.6, 0.58), damp);
  col = mix(col, uColorC, pebble * 0.8);
  col = mix(col, uColorC * 0.88, lag * 0.34);

  s.albedo = col;
  s.height = clamp(h, 0.0, 1.0);
  // Dry loose sand is about as rough as a surface gets. Damp sand is not — the
  // water film bridges the grains and it goes markedly glossier, which is the
  // whole reason wet sand looks wet. Wind-packed crust and lag gravel sit in
  // between: both are consolidated, so both catch a little more sheen than the
  // drift around them.
  // The crust term carries most of this. A wind-packed desert surface and the
  // loose drift beside it are genuinely different materials — the crust is
  // consolidated and catches a visible sheen at grazing angles where the drift
  // stays dead matte — and that contrast is the only roughness story sand has.
  // At a 0.07 delta it was worth nothing; the whole material measured a roughness
  // standard deviation of 0.006 before this and the ground plane caught light
  // identically everywhere.
  s.roughness = clamp(0.97 - damp * 0.34 - pebble * 0.16 - crust * 0.16
                      - lag * 0.07 + (1.0 - ripple) * 0.02, 0.35, 1.0);
  s.metalness = 0.0;
  s.ao = clamp(1.0 - cavity * 0.2 - pebble * 0.1 - (1.0 - ripple) * 0.06, 0.2, 1.0);
  return s;
}
`;

const RUBBLE = /* glsl */ `
Surface surface(vec2 uv) {
  Surface s;

  // Three overlapping Worley layers give a believable size distribution: broken
  // masonry in a bed of smaller debris under a film of pulverised render.
  float bn = countOf(0.3);
  float sn = countOf(0.12);
  float dn = countOf(0.045);
  vec3 big = worley(uv * bn, bn, 1.0);
  vec3 small = worley(uv * sn, sn, 1.0);
  vec3 dust = worley(uv * dn, dn, 1.0);

  // Broken masonry is *faceted*. A fragment of blockwork has flat fractured faces
  // and sharp arrises, and it lies at whatever angle it landed at. Falling off the
  // Worley distance smoothly gives a dome per cell instead, and three layers of
  // domes is bubble wrap — which is exactly what a pile of debris read as wherever
  // the individual pieces could be resolved.
  //
  // So each chunk gets a plateau at its own height, tilted by a field whose scale
  // is close to the chunk size so the tilt is near-linear across any one piece,
  // and the drop to the bed happens only over the last stretch to the cell wall.
  // The .z channel is the chunk's identity, which is what holds the plateau
  // constant across it.
  // The falloff runs on the distance to the cell *wall*, not on the distance to
  // the cell's seed point. That distinction is the whole thing: an iso-contour of
  // F1 is a circle, so shaping a chunk with it gives a disc however flat its top
  // is — a field of coins. F2 minus F1 goes to zero along the Voronoi wall, which
  // is straight, so the same trick on that gives an angular polygon with a bevel
  // where it meets its neighbours. That is what packed rubble is: flat fracture
  // faces meeting at arrises, with the fines wedged into the gaps between them.
  vec2 tiltN = vec2(countOf(0.22));
  float tilt = (gnoise2(uv * tiltN, tiltN) - 0.5) * 0.55;
  float bigTop = 0.55 + hash21(vec2(big.z * 37.0, 11.0)) * 0.45 + tilt;
  float smallTop = 0.5 + hash21(vec2(small.z * 41.0, 23.0)) * 0.5 + tilt * 0.6;
  // Not every cell is a chunk. A complete tessellation of facets is crazy paving,
  // or dried mud — the pieces have to be scattered on a bed with the fines packed
  // in between them, and leaving gaps is what turns a tiling into a heap. The
  // bevels are generous too: a razor-sharp arris on every joint measured a
  // 49-degree RMS slope, which is more than the map can carry without shimmering
  // at the grazing angles a debris pile is almost always seen at.
  float bigOn = step(hash21(vec2(big.z * 53.0, 7.0)), 0.62);
  float smallOn = step(hash21(vec2(small.z * 59.0, 13.0)), 0.78);
  float bigH = bigTop * bigOn * smoothstep(0.0, 0.26, big.y - big.x) * 0.26;
  float smallH = smallTop * smallOn * smoothstep(0.0, 0.30, small.y - small.x) * 0.18;
  // Pulverised render stays rounded: it genuinely is granular rather than broken.
  float dustH = (1.0 - smoothstep(0.0, 0.4, dust.x)) * 0.06;

  float bedN = countOf(0.9);
  float h = 0.26 + bigH + smallH * 0.8 + dustH + (fbm(uv * bedN, bedN, 3, 0.5, 2.0) - 0.5) * 0.16;

  float cavity = clamp(1.0 - h, 0.0, 1.0);

  // Every chunk gets its own tint, which is what sells scattered debris — a
  // single noise texture always reads as one material broken up.
  vec3 col = mix(uColorA, uColorB, big.z);
  // Keyed to the cell region, like the height is, so a piece's colour stops where
  // the piece stops. Keyed to the seed distance it was a circular blob sitting
  // across several facets at once, and a tint boundary that disagrees with the
  // cavity it is supposed to belong to is what makes debris read as one noisy
  // surface rather than as a pile of separate things.
  col = mix(col, mix(uColorB, uColorC, small.z),
            smoothstep(0.0, 0.13, small.y - small.x) * smallOn * 0.7);
  // Only the genuine gaps between pieces go dark. Starting the ramp at 0.4 caught
  // the average of the surface, so a fifth of the darkest colour in the palette
  // was being mixed into the whole pile before the AO pass had even run.
  col = mix(col, uColorC, smoothstep(0.55, 0.95, cavity) * 0.45);

  float rebar = step(0.955, hash21(mod(floor(uv * bn), bn) + uSeed + 3.3));
  float rebarMask = rebar * (1.0 - smoothstep(0.0, 0.22, big.x));
  col = mix(col, vec3(0.16, 0.075, 0.04), rebarMask * 0.85);

  // Glazed ceramic, window glass and polished stone. A collapsed building does not
  // produce one material: a fraction of every pile is glazed and that fraction is
  // the only thing in it that catches the sun. Leaving it out gave the whole
  // surface a roughness standard deviation of 0.010 — the most uniform material in
  // the library, which for a heap of mixed debris is exactly backwards. big.z is
  // already the nearest chunk's identity, so the class costs nothing to assign.
  float shard = step(0.87, big.z) * smoothstep(0.0, 0.16, big.y - big.x);
  col = mix(col, vec3(0.26, 0.275, 0.27), shard * 0.6);

  // Dust settles on everything that has stopped moving.
  float filmN = countOf(0.5);
  float film = smoothstep(0.32, 0.8, fbm(uv * filmN, filmN, 3, 0.5, 2.0));
  col = mix(col, uColorA * 1.12, film * 0.4);

  s.albedo = col;
  s.height = clamp(h, 0.0, 1.0);
  s.roughness = clamp(0.88 + cavity * 0.09 + film * 0.06
                      - shard * 0.56 - rebarMask * 0.28, 0.22, 1.0);
  s.metalness = clamp(rebarMask * 0.75, 0.0, 1.0);
  // The horizon-based pass in the forge adds its own cavity term on top of this,
  // so a 0.8 multiplier here compounded into a mean occlusion of 0.385 and the
  // pile read as a black mass with a few lit crowns rather than as debris.
  s.ao = clamp(1.0 - cavity * 0.38, 0.06, 1.0);
  return s;
}
`;

const ASPHALT = /* glsl */ `
Surface surface(vec2 uv) {
  Surface s;

  // The single most important thing about asphalt at this texel density (about
  // 5 mm per texel) is that 10 mm aggregate cannot be resolved. Trying anyway
  // is what makes a road look like vibrating gravel: the normal map ends up
  // carrying noise at the Nyquist limit and it boils at every grazing angle.
  // So the height field stops at features it can actually hold, the chip
  // texture lives in albedo and roughness, and the shared detail normal
  // supplies the close-range bite.
  float layN = countOf(1.6);
  float lay = fbm(uv * layN, layN, 3, 0.5, 2.0);

  // Exposed aggregate. At 4.9 mm per texel a 12 mm chipping is two and a half
  // texels across, and a Voronoi asked for cells that small stops drawing chips
  // and starts drawing its own grid. So what this field describes is the
  // *clustering* of worn-through aggregate at 55 mm — a scale the map can
  // actually hold — and the millimetre grain is left to the shared detail layer,
  // which is the only place it can live without aliasing.
  float chipN = countOf(0.055);
  vec3 chip = worley(uv * chipN, chipN, 1.0);
  float chipH = (1.0 - smoothstep(0.18, 0.55, chip.x));

  float h = 0.72 + (lay - 0.5) * 0.18 - chipH * 0.05;

  // Longitudinal joint between paving runs: a slightly sunken, coarser band
  // that every real road has and no procedural road ever does.
  float joints = countOf(3.6);
  float jd = abs(fract(uv.x * joints + 0.37) - 0.5) * uTileMetres / joints;
  float joint = 1.0 - smoothstep(0.02, 0.075, jd);
  h -= joint * 0.09;

  // Alligator cracking where the base has failed — and only where it has
  // failed. Fatigue cracking is a structural symptom: it appears in the wheel
  // path over a soft spot in the subgrade, not evenly across the carriageway. An
  // unrestricted network puts cell walls over the whole surface, and at range
  // that mips down to a grey haze that reads as dirt rather than as damage.
  float fatigueN = countOf(2.4);
  float crack = cellCracks(uv, 0.9, 0.018, 0.95)
              * smoothstep(0.64, 0.88, fbm(uv * fatigueN, fatigueN, 3, 0.5, 2.0));
  h -= crack * 0.2;

  // Bitumen poured into the worst of the cracks: raised, jet black, and
  // glossy. Very characteristic and very cheap.
  float sealed = crack * smoothstep(0.45, 0.62, lay);
  h += sealed * 0.13;

  float potN = countOf(1.5);
  vec3 pot = worley(uv * potN, potN, 1.0);
  float pothole = step(pot.z, 0.1) * (1.0 - smoothstep(0.05, 0.35, pot.x));
  h -= pothole * 0.55;

  // Utility trench reinstatements and skin patches. Nothing tells you a road
  // has been in service longer than the mismatched rectangles of newer, blacker
  // material cut into it, and it is the only feature on tarmac big enough to
  // still read at forty metres.
  //
  // Rectangles, because a reinstatement is bounded by a saw cut and a saw cut is
  // straight. The Worley cells this used to be put soft polygons over a third of
  // the road surface, which read as a hexagonal tiling of the street rather than
  // as roadworks — it was the most obvious procedural tell left on the ground.
  // Coverage is down from a third to about a twentieth, which is roughly how
  // often this actually happens.
  vec3 rep = rects(uv, vec2(2.6, 3.4), 0.34, 0.24, 0.62);
  float patchMask = rep.x * smoothstep(0.006, 0.03, rep.y);
  // The saw cut itself, and the sealant that was run along it afterwards.
  float cut = rep.x * (1.0 - smoothstep(0.004, 0.018, rep.y));
  h += patchMask * 0.03 - cut * 0.05;

  float cavity = clamp(1.0 - h, 0.0, 1.0);

  // Wheel paths. These are worked out before the colour so the silt layer can
  // be keyed off them, because the wheel tracks are the *cause* of the silt
  // pattern rather than an unrelated overlay.
  float lanes = countOf(1.9);
  float wheel = exp(-pow((fract(uv.x * lanes + 0.25) - 0.5) * 4.5, 2.0)) * uParams0.y;
  float centre = 1.0 - wheel;

  vec3 col = mix(uColorA, uColorB, clamp(lay * 1.5 - 0.25, 0.0, 1.0));
  // Fine tonal break-up of the mastic between the chippings. Gradient noise and
  // not a second Worley: those cells were 16 mm, three texels across, so the
  // field contributed nothing but its own lattice and that went straight into
  // the albedo where no amount of filtering downstream could remove it.
  float gritN = countOf(0.06);
  float grit = fbm(uv * gritN, gritN, 3, 0.5, 2.0);
  col *= 0.96 + smoothstep(0.40, 0.76, grit) * 0.20;
  // Worn-through chippings, and this is a deliberately weak effect. The cells
  // are 55 mm because anything finer turns into its own lattice at this texel
  // density, but 55 mm is five times the size of a real chipping, so pushing
  // colour through it hard does not read as exposed aggregate — it reads as pale
  // blobs the size of a fist scattered over the tarmac, which measured as the
  // highest albedo contrast of any material in the library.
  col = mix(col, uColorB * 1.22, chipH * 0.12);
  col = mix(col, uColorC, crack * 0.75);
  col = mix(col, uColorC * 1.5, pothole * 0.8);
  col = mix(col, uColorC * 0.55, sealed * 0.9);
  col = mix(col, uColorB * 0.8, joint * 0.5);
  // A reinstatement is newer bitumen: darker, less oxidised, and with none of
  // the pale exposed chippings the surrounding surface has weathered to. Each
  // one was laid by a different gang on a different day, so rep.z tones them
  // apart; a set of patches all exactly the same shade is its own kind of tell.
  col = mix(col, uColorA * (0.5 + rep.z * 0.3), patchMask * 0.85);
  col = mix(col, uColorC * 0.5, cut * 0.85);

  // Rubber polishes the wheel track, darkens it, and fills the voids.
  col *= mix(1.0, 0.84, wheel);

  // Oil drips, which are the only thing on a road glossier than fresh sealant.
  float oilN = countOf(0.7);
  float oil = smoothstep(0.82, 1.0, fbm(uv * oilN, oilN, 3, 0.5, 2.0)) * uParams0.w;
  col *= mix(1.0, 0.6, oil);

  // Wind-blown sand, and in a desert town this is not a subtle effect. Traffic
  // sweeps the wheel paths and everything else silts up, so a road reads as two
  // darker ribbons on a pale bed — not as the uniform black sheet this was.
  // Sand also has to be a covering layer rather than a multiply: it hides the
  // bitumen underneath, and it is both much paler and much warmer than it.
  // Getting this wrong in the dark direction is the classic tell, because an
  // unlit-looking road is the one surface a player always has in frame.
  float siltN = countOf(0.85);
  float silt = fbm(uv * siltN, siltN, 4, 0.5, 2.0);
  float sand = clamp(smoothstep(0.52, 0.88, silt) * clamp(1.0 - wheel * 1.3, 0.0, 1.0)
                     + crack * 0.45 + joint * 0.55 + cut * 0.4, 0.0, 1.0) * uParams1.x;
  col = mix(col, vec3(0.30, 0.255, 0.175), sand * 0.66);

  s.albedo = col;
  s.height = clamp(h, 0.0, 1.0);
  // Dry aged asphalt is genuinely rough; the polished wheel path, the sealant
  // and the oil are not, and that contrast is most of what makes a road read
  // as a road when the sun is low. Silted sand is rougher than any of it, so it
  // has to come last — a dusted-over oil stain is not glossy.
  float rough = clamp(0.90 + cavity * 0.06 + pothole * 0.05
                      - wheel * 0.3 - sealed * 0.42 - oil * 0.5
                      - patchMask * 0.12 - cut * 0.3
                      + centre * 0.02, 0.22, 1.0);
  s.roughness = mix(rough, 0.97, sand * 0.8);
  s.metalness = 0.0;
  // Sand fills a crack before it fills a plane, so the cavity darkening has to
  // relax wherever the silt has built up or the recesses go on reading as open
  // voids under a surface that is visibly full of dust.
  s.ao = clamp(1.0 - (crack * 0.4 + pothole * 0.5 + joint * 0.2 + cut * 0.25)
               * (1.0 - sand * 0.55), 0.05, 1.0);
  return s;
}
`;

const PAINTED_METAL = /* glsl */ `
Surface surface(vec2 uv) {
  Surface s;

  // Rolled sheet is very nearly flat, but it is never *flat*: thin gauge always
  // oil-cans between its stiffeners in long shallow waves, and that gentle
  // waviness catching the sun at slightly different angles down a panel is most
  // of what tells you a surface is sheet metal rather than a painted plane.
  vec2 millP = vec2(countOf(0.012), countOf(0.4));
  float mill = gnoise2(uv * millP, millP) * 0.03;
  float panN = countOf(0.45);
  float pan = fbm(uv * panN, panN, 3, 0.5, 2.0);
  float h = 0.7 + mill + (pan - 0.5) * 0.3;

  float dentN = countOf(0.28);
  vec3 dentCells = worley(uv * dentN, dentN, 1.0);
  float dent = step(dentCells.z, 0.22) * (1.0 - smoothstep(0.0, 0.4, dentCells.x));
  h -= dent * 0.28;

  // Paint fails where it is proud and where it gets knocked, so the mask is
  // driven by the height field itself rather than by unrelated noise. Wear that
  // ignores the geometry underneath always reads as dirt.
  //
  // uParams0.x moves the *threshold*, it does not scale the result. Scaling was
  // the bug: at a wear amount of 0.4 the whole field topped out below the hard
  // edge that makes a chip a chip, so nothing chipped at all and every painted
  // panel in the game came out showroom-fresh.
  float wearN = countOf(0.3);
  float wearField = fbm(uv * wearN, wearN, 4, 0.55, 2.1);
  float highPoint = smoothstep(0.62, 0.78, h + (pan - 0.5) * 0.3);
  // Thresholds in units of the field's standard deviation, which is 0.18. The
  // low end sits at plus 1.6 sigma so an unworn panel keeps a few knocks on its
  // proudest edges and nothing more; the high end at plus 0.35 sigma opens the
  // mask over about a third of the sheet, which is a hard-used piece of kit and
  // as far as this should ever go. Set against the old, much narrower fbm these
  // ran down to 0.30 — more than a sigma *below* the midpoint — so a worn panel
  // came out chipped over five sixths of its area and measured the highest albedo
  // contrast in the library by a factor of two.
  float edgeWear = smoothstep(mix(0.80, 0.56, uParams0.x),
                              mix(0.95, 0.72, uParams0.x), wearField)
                 * mix(0.35, 1.0, highPoint);
  // Scratches, confined to where a panel actually gets handled and dragged. An
  // ungated ridged field lays a scratch every twenty millimetres across the whole
  // sheet, and that is not wear — it is a combed texture. It measured out at an
  // albedo contrast of 0.64, twice anything else in the library, and it is the
  // exact failure of making wear ignore the geometry it is supposed to follow.
  // Real scoring clusters around handles, hinges, latches and the bottom corners
  // that get kicked, and leaves most of a panel alone.
  // Eight millimetres, not twenty. A scratch is a line, and at a twenty
  // millimetre pitch with a soft threshold each one came out a centimetre wide —
  // a band, not a line, and a quarter of the panel was covered in them.
  vec2 scrP = vec2(countOf(0.008), countOf(0.3));
  float scrZoneN = countOf(0.55);
  float scrZone = smoothstep(0.56, 0.80, fbm(uv * scrZoneN, scrZoneN, 3, 0.5, 2.0));
  float scratches = smoothstep(mix(0.94, 0.74, uParams0.y),
                               mix(1.0, 0.90, uParams0.y), ridged2(uv * scrP, scrP, 2))
                  * scrZone;
  // The scratch term is scaled up rather than down to pay for the gate: the hard
  // smoothstep below is a cliff, so gating the field without restoring its
  // amplitude does not thin the wear out, it deletes it.
  float chipped = clamp(edgeWear + scratches * 1.15, 0.0, 1.0);
  // Chips have hard edges — that is how you can tell paint from staining.
  chipped = smoothstep(0.2, 0.5, chipped);

  // Rust blooms out of the chips and runs downhill with the rain.
  float rustN = countOf(0.25);
  float rustField = fbm(uv * rustN, rustN, 4, 0.5, 2.0);
  float bleed = smoothstep(0.68, 1.0, runs(uv, 0.05, 16.0));
  float rust = clamp(smoothstep(0.54, 0.84, rustField) * chipped
                     + bleed * smoothstep(0.42, 0.78, rustField) * 0.55, 0.0, 1.0) * uParams0.z;

  // Corrosion product occupies more volume than the steel it came from, so a
  // rust scab stands proud of the paint around it.
  h += rust * 0.09 - chipped * 0.015;

  vec3 paint = uColorA;
  vec3 primer = uColorB;
  vec3 bare = vec3(0.32, 0.33, 0.35);
  vec3 rustCol = uColorC;

  // Chalking: the binder at the very surface of an alkyd enamel breaks down
  // under UV and leaves loose pigment behind. The paint goes lighter, less
  // saturated and dramatically rougher, in soft patches metres across. On a
  // desert vehicle it is more of the look than the chipping is, and it is the
  // reason old military paint photographs so much flatter than new.
  float chalkN = countOf(0.8);
  float chalk = smoothstep(0.54, 0.86, fbm(uv * chalkN, chalkN, 3, 0.5, 2.0))
              * uParams1.z;

  vec3 col = paint;
  // Oil-canning shows as tone because each shallow wave takes the light at a
  // slightly different angle, and it is most of what a large clean panel has. The
  // field is normalised first: raw, its six per cent spread made this term worth
  // half of one per cent, and a tan panel measured an albedo contrast of 0.060.
  col *= 1.0 + clamp((pan - 0.5) * 3.0, -1.0, 1.0) * 0.075;
  col = mix(col, mix(paint, vec3(dot(paint, vec3(0.3, 0.59, 0.11))), 0.5) * 1.18, chalk);
  col = mix(col, primer, smoothstep(0.0, 0.55, chipped));
  // Bare steel is four or five times the reflectance of olive drab, so how much
  // of it is showing is the single biggest lever on this material's contrast —
  // and it measured 0.53, three times anything else in the library, because a
  // scratch was being taken straight through to metal. Paint is a system: enamel
  // over primer over phosphate, and a knock usually stops in the primer. Only the
  // deepest chips reach steel, which is why they read as bright *points* on a
  // real panel rather than as silver combing.
  col = mix(col, bare, smoothstep(0.78, 1.0, chipped) * 0.55);
  col = mix(col, rustCol * (0.6 + rustField * 0.8), rust);

  float grimeN = countOf(0.16);
  float grime = smoothstep(0.4, 0.8, fbm(uv * grimeN, grimeN, 3, 0.5, 2.0));
  col *= mix(1.0, 0.8, grime * 0.5 + dent * 0.3);

  // Paint is a dielectric. Only where it has come off is there any metal to
  // reflect — treating painted steel as a metal is a classic tell, and it is
  // why so much game metal looks like foil.
  float bareMetal = smoothstep(0.78, 1.0, chipped) * (1.0 - rust);
  s.albedo = col;
  s.height = clamp(h, 0.0, 1.0);
  // Enamel is semi-gloss when new and chalks off with UV; primer is flat, bare
  // steel is satin, and rust is the roughest thing on the object.
  s.roughness = clamp(mix(uParams1.x, 0.7, smoothstep(0.0, 0.6, chipped))
                      - bareMetal * 0.3 + rust * 0.32 + chalk * 0.4
                      + grime * 0.06 + uParams1.y * (1.0 - chipped), 0.12, 1.0);
  s.metalness = clamp(bareMetal, 0.0, 1.0);
  s.ao = clamp(1.0 - dent * 0.22 - rust * 0.12, 0.1, 1.0);
  return s;
}
`;

const CORRUGATED = /* glsl */ `
Surface surface(vec2 uv) {
  Surface s;

  // Mini-corrugated sheet at 120 mm pitch — the profile a shanty roof and a
  // roller shutter both actually use — with the flat crowns and flat valleys of
  // a rolled trapezoid rather than a sine wave.
  float pitch = countOf(0.12);
  float ph = fract(uv.x * pitch);
  float tri = abs(ph - 0.5) * 2.0;
  float corr = 1.0 - smoothstep(0.28, 0.72, tri);

  float dentN = countOf(0.4);
  float dent = fbm(uv * dentN, dentN, 3, 0.5, 2.0);
  float h = 0.3 + corr * 0.5 + (dent - 0.5) * 0.1;

  // Fixings land on the crowns at 300 mm centres, with a dished washer.
  float rows = countOf(0.3);
  vec2 sc = vec2(ph - 0.5, fract(uv.y * rows) - 0.5);
  vec2 scm = sc * vec2(uTileMetres / pitch, uTileMetres / rows);
  float screw = 1.0 - smoothstep(0.008, 0.016, length(scm));
  float washer = 1.0 - smoothstep(0.014, 0.022, length(scm));
  h -= screw * 0.16 - washer * 0.03;

  // Rust starts at the fixings and the cut edges and streaks down the sheet.
  float rustN = countOf(0.5);
  float rustField = fbm(uv * rustN, rustN, 4, 0.5, 2.0);
  float streak = smoothstep(0.64, 0.98, runs(uv, 0.045, 35.0));
  float rust = clamp(smoothstep(0.54, 0.86, rustField) * uParams1.x
                     + streak * 0.5 * uParams1.x
                     + screw * 0.7 * uParams1.x, 0.0, 1.0);
  h += rust * 0.05;

  float cavity = clamp(1.0 - h, 0.0, 1.0);

  // Hot-dip galvanising crystallises in visible spangles a few centimetres
  // across, then chalks to a dull grey. Both are worth having.
  float spangleN = countOf(0.05);
  vec3 spangle = worley(uv * spangleN, spangleN, 1.0);
  float facet = spangle.z;

  vec3 col = mix(uColorA, uColorB, 0.25 + (1.0 - corr) * 0.35);
  col *= 0.9 + facet * 0.2;
  col *= 0.94 + dent * 0.12;
  col = mix(col, uColorC * (0.6 + rustField * 0.7), rust);
  // Valleys collect grit and rain, and never get wiped clean.
  col *= mix(0.76, 1.0, corr);
  // Dust dulls the galvanising unevenly. Zinc that has weathered under a dust
  // film is not the bright spangled sheet it left the works as, and leaving it
  // bright is what makes procedural metal look like foil.
  float filmN = countOf(0.7);
  float film = smoothstep(0.38, 0.8, fbm(uv * filmN, filmN, 3, 0.5, 2.0));
  col = mix(col, col * vec3(1.1, 1.05, 0.94), film * 0.35);

  s.albedo = col;
  s.height = clamp(h, 0.0, 1.0);
  // Weathered galvanising is satin, not chrome; rust kills the reflection
  // entirely, which is why a rusted roof looks flat and a new one glares.
  s.roughness = clamp(uParams1.y + (1.0 - facet) * 0.1 + rust * 0.45
                      + cavity * 0.08 + (1.0 - corr) * 0.05
                      + film * 0.22, 0.2, 1.0);
  // Zinc is a metal, but weathered galvanising is not zinc — it is a chalky layer
  // of zinc oxide and carbonate sitting on top of the zinc, and that layer is a
  // dielectric. Authoring an old sheet at full metalness gives it no diffuse term
  // at all, so it can only show what it reflects; a roof plane reflects the ground
  // rather than the sky, and every corrugated roof in the town came out as dark
  // slate under an overcast sky that should have lit it up like a mirror of the
  // cloud deck. How far the chalking has gone tracks the rust amount, because both
  // are just how long the sheet has been up there.
  s.metalness = clamp(mix(0.95, 0.34, uParams1.x) - rust * 0.85 - film * 0.28,
                      0.0, 1.0);
  s.ao = clamp(1.0 - (1.0 - corr) * 0.3 - screw * 0.45, 0.15, 1.0);
  return s;
}
`;

const WOOD = /* glsl */ `
Surface surface(vec2 uv) {
  Surface s;

  // Sawn softwood boards. uParams0.x is the board width in metres.
  float planks = countOf(uParams0.x);
  float pv = uv.y * planks;
  float plankId = floor(pv);
  float pid = hash21(vec2(mod(plankId, planks), 3.0) + uSeed);
  float along = uv.x + pid * 0.7;
  vec2 pf = vec2(fract(along), fract(pv));

  // The gap between boards, in metres, so it is a gap and not a stripe.
  float pw = uTileMetres / planks;
  float gapM = min(pf.y, 1.0 - pf.y) * pw;
  float gapMask = 1.0 - smoothstep(0.0, 0.005, gapM);

  // Flat-sawn cathedral figure: 14 mm growth rings distorted along the board.
  float warpN = countOf(0.35);
  float warp = fbm(uv * warpN, warpN, 3, 0.5, 2.0);
  float ringBands = countOf(0.014) / planks;
  float ringPhase = fract((pf.y + (warp - 0.5) * 0.9 + pid * 4.0) * ringBands);
  float rings = smoothstep(0.0, 0.42, ringPhase) * smoothstep(1.0, 0.58, ringPhase);
  // The latewood line. A symmetric plateau across the ring — which is all this had
  // — is a sine wave, and a sine wave at a 14 mm pitch is not wood grain, it is
  // woodgrain-effect laminate: the boards came out as soft wavy bands with nothing
  // in them the eye could catch. The asymmetry between the two halves of a growth
  // ring is the entire signature of sawn timber. Earlywood is wide, pale and soft;
  // latewood is a narrow, dark, dense line with a hard inner edge, and because it
  // is the harder of the two it stands proud on any board that has weathered.
  float lateD = min(ringPhase, 1.0 - ringPhase);
  float late = 1.0 - smoothstep(0.05, 0.14, lateD);

  // Raised grain: weathering erodes the soft earlywood and leaves the latewood
  // standing, which is why old timber feels ribbed. A third of a millimetre of
  // it, not the millimetre and a half this used to carry.
  //
  // The axes were the wrong way round. Boards run along u here, so the fibre must
  // be fine across the board and long along it — cells 8 mm tall and a quarter of
  // a metre wide, not the reverse. Swapped, it drew a 250 mm-long streak every
  // eight millimetres *across* the grain, and combined with the checks below that
  // put a cross-hatch over all the timber in the game. Wood is the one material
  // that is unmistakably directional, and this was running its texture at right
  // angles to its own boards.
  vec2 fibreP = vec2(countOf(0.25), countOf(0.008));
  float fibre = gnoise2(uv * fibreP, fibreP);

  float h = 0.72 + rings * 0.06 + late * 0.07 + (fibre - 0.5) * 0.04 - gapMask * 0.35;

  // Knots. Two things were wrong before: every single board had exactly one, and
  // it was round. Sawn softwood comes in grades — plenty of boards are clear, and
  // a knot cut through by the saw is an ellipse two or three times longer across
  // the grain than along it. One circular dot per board per tile read as polka
  // dots on the crates.
  float knotSeed = hash21(vec2(mod(plankId, planks), 17.0) + uSeed);
  vec2 knotPos = vec2(knotSeed, hash21(vec2(mod(plankId, planks), 23.0) + uSeed));
  float hasKnot = step(0.45, hash21(vec2(mod(plankId, planks), 29.0) + uSeed));
  float knotD = length((pf - knotPos) * vec2(uTileMetres * 0.45, pw));
  float knot = (1.0 - smoothstep(0.010, 0.026, knotD)) * hasKnot;
  h -= knot * 0.12;

  // Checking: splits that open *along* the grain as the board dries, which means
  // long in u and finely spaced in v. This is the defining feature of weathered
  // sawn timber and it was running across the boards, which is a thing no drying
  // split has ever done — a split follows the fibre because that is the weakest
  // path through it.
  vec2 checkP = vec2(countOf(0.85), countOf(0.045));
  float check = smoothstep(0.80, 0.94, ridged2(uv * checkP, checkP, 2));
  h -= check * 0.14;

  float cavity = clamp(1.0 - h, 0.0, 1.0);

  vec3 col = mix(uColorA, uColorB, rings * 0.55 + 0.1);
  col *= 1.0 - late * 0.32;
  col *= 0.92 + fibre * 0.16;
  // Boards come from different trees and different weeks.
  col *= 0.84 + hash21(vec2(mod(plankId, planks), 41.0) + uSeed) * 0.34;
  col = mix(col, uColorC, knot * 0.85);
  // The gap between two boards shows the shadowed edge of the one behind, not a
  // void. Multiplying the darkest colour in the palette by a further 0.3 took it
  // to 0.012 reflectance, and with the cavity AO on top of that every joint in
  // every crate and shutter in the game was a black line.
  col = mix(col, uColorC * 0.55, gapMask * 0.9);
  col *= 1.0 - check * 0.22;

  // Sun and rain grey exposed timber from the surface down.
  float weatherN = countOf(0.45);
  float weather = smoothstep(0.32, 0.78, fbm(uv * weatherN, weatherN, 3, 0.5, 2.0)) * uParams1.x;
  col = mix(col, vec3(0.2, 0.19, 0.18), weather * 0.55);

  // Handling burnishes timber wherever it is gripped, leaned on or walked over,
  // and a scaffold board or a market bench is handled all over. It barely changes
  // the colour of the wood, so it is a roughness-only feature — which is the kind
  // that does the most for realism per unit of effort, and the kind this material
  // had none of. Only unweathered timber takes a polish; once the surface has
  // gone fibrous there is nothing left to burnish.
  float rubN = countOf(0.32);
  float rub = smoothstep(0.56, 0.88, fbm(uv * rubN, rubN, 3, 0.5, 2.0))
            * (1.0 - weather);

  s.albedo = col;
  s.height = clamp(h, 0.0, 1.0);
  // Planed timber holds a slight sheen along the latewood; weathered timber is
  // fibrous and completely matte. That span is wide — 0.65 to nearly 1.0 — and
  // holding it open is what stops every plank in the level from catching the
  // light identically.
  s.roughness = clamp(0.70 + weather * 0.30 + cavity * 0.08 + check * 0.1
                      - rings * 0.04 - late * 0.10 - rub * 0.22, 0.32, 1.0);
  s.metalness = 0.0;
  s.ao = clamp(1.0 - gapMask * 0.75 - knot * 0.25 - check * 0.2, 0.05, 1.0);
  return s;
}
`;

const FABRIC = /* glsl */ `
Surface surface(vec2 uv) {
  Surface s;

  // Plain weave, thread pitch in metres from uParams0.x. Two interleaved sine
  // sets with an over/under checker is enough at any distance a player will be.
  //
  // The amplitudes here are the ones that matter most in the whole library. A
  // thread pitch is millimetres, so it sits within a few texels of the Nyquist
  // limit, and putting real relief on it is fatal: seven millimetres of height
  // on a fourteen millimetre pitch — which is what this used to carry — is a
  // forty-five degree facet per thread, and once mip-mapping starts averaging
  // those normals the shading swings the full range between neighbouring
  // pixels. Hung cloth came out as a black and white chequerboard, and no
  // amount of specular anti-aliasing downstream can fix a diffuse term that is
  // alternating between lit and unlit. Real tarpaulin weave stands about a
  // millimetre proud, so that is what it gets; the crowns are carried by albedo
  // and AO, which mip-map gracefully, and by the shared detail normal.
  float pitch = countOf(uParams0.x);
  vec2 t = uv * pitch;
  // The threads wander. This is not decoration: a thread pitch is millimetres,
  // so on screen it is often close to one cycle per pixel, and a *perfect* grid
  // at that frequency puts all its energy in one place and beats against the
  // pixel grid into coarse moire — hanging cloth came out as a fishnet. Jittering
  // the phase by a fraction of a pitch spreads that energy out, so what is left
  // when the sampler undersamples is fine noise, which mip-mapping then averages
  // away instead of amplifying.
  vec2 wob = vec2(gnoise(uv * countOf(0.05) + 3.1, countOf(0.05)),
                  gnoise(uv * countOf(0.05) + 8.7, countOf(0.05))) - 0.5;
  t += wob * 0.85;
  float warpY = sin(t.y * 6.2831853) * 0.5 + 0.5;
  float weftX = sin(t.x * 6.2831853) * 0.5 + 0.5;
  // Plain weave: the float alternates, so the pattern's true period is *two*
  // threads in each direction, and that is the thing to keep in mind when
  // choosing a pitch. At the eighteen millimetres the tarp used to carry, the
  // repeat was a thirty-six millimetre basket cell — upholstery, not cloth — and
  // a camera half a metre from a hanging sheet resolved it as a chunky knitted
  // chevron. uParams2.w is how much of the weave is that alternating basket and
  // how much is a plain crossed grid: hessian genuinely shows the basket, but a
  // woven tarpaulin, a cotton sheet and a uniform all read as a fine grid whose
  // period is one thread, and halving the visible period is worth more here than
  // any amount of filtering.
  float overUnder = step(0.5, fract(floor(t.x) * 0.5 + floor(t.y) * 0.5));
  float basket = mix(warpY, weftX, overUnder);
  // The alternative to the basket is the *upper* of the two thread sets, which is
  // a connected grid of ridges with a pit in each cell. It must not be the lower of
  // the two: min() peaks only where a warp crosses a weft, so the crowns become
  // isolated points, and a regular lattice of isolated specular points on a dark
  // cloth is a bead curtain. That is exactly how a backlit hanging sheet read —
  // a grid of pinpoint highlights, made worse by the chromatic aberration in the
  // post chain, which has nothing to work with until something gives it a
  // subpixel highlight to fringe.
  float weave = mix(max(warpY, weftX), basket, uParams2.w);
  weave = pow(clamp(weave, 0.0, 1.0), 1.4);

  float slubN = countOf(0.05);
  float slub = gnoise(uv * slubN, slubN);

  // Piece-scale variation. A sandbag wall is not one cloth: every bag was filled
  // on a different day and has rotted for a different length of time, so bag to
  // bag they differ in tone and in how far the fibre has gone. uParams2.z is the
  // size of a piece in metres, so the same field serves a 350 mm bag and a
  // multi-metre tarpaulin. Without it hessian had a roughness spread of 0.021 and
  // a sandbag emplacement read as one continuous sheet of fabric.
  float pieceN = countOf(max(uParams2.z, 0.05));
  float piece = fbm(uv * pieceN, pieceN, 2, 0.5, 2.0) - 0.5;
  // Cloth hangs in folds, and the folds are the only feature here big enough to
  // carry real relief. They are what should be doing the shading work.
  float sagN = countOf(0.4);
  float sag = fbm(uv * sagN, sagN, 4, 0.55, 2.0);
  float creaseN = countOf(0.12);
  float crease = ridged(uv * creaseN, creaseN, 2);

  // Weave relief scales with the pitch, not against it. Halving the thread pitch
  // and keeping the amplitude doubles every thread's slope, which took the tarp
  // from an 11-degree RMS slope to 21 — steeper than blasted steel, on a piece of
  // cloth. A tarpaulin thread stands a few tenths of a millimetre proud and no
  // more; what makes cloth read as cloth is the drape. Jute yarn genuinely is a
  // millimetre and a half thick, so hessian gets its own figure in uParams0.y.
  float h = 0.44 + weave * uParams0.y + (sag - 0.5) * 0.5 + crease * 0.14
            + (slub - 0.5) * 0.05;

  float tearN = countOf(0.3);
  float tear = smoothstep(0.76, 0.94, fbm(uv * tearN, tearN, 3, 0.5, 2.0)) * uParams1.x;
  h -= tear * 0.3;

  float cavity = clamp(1.0 - h, 0.0, 1.0);

  vec3 col = mix(uColorA, uColorB, clamp(sag * 1.3 - 0.15, 0.0, 1.0));
  // The weave's contribution to albedo has to stay small. It is a regular signal
  // at a frequency the mip chain cannot hold, so whatever goes in here is what
  // will still be visible as a pattern when it should have averaged into a tone —
  // and a regular pattern is the one thing a length of cloth must not have.
  col *= 0.94 + weave * 0.11;
  col *= 0.95 + slub * 0.1;
  col *= 1.0 + piece * 0.34;
  col = mix(col, uColorC, tear * 0.7);
  // Folds catch the sun on their crowns and hold dirt in their valleys. Cloth is
  // identified by its drape long before its weave — at three metres a hanging
  // sheet is nothing but folds — so this is where the contrast belongs.
  col *= 0.90 + crease * 0.17;

  // Dust cakes into the weave.
  float dustN = countOf(0.25);
  float dust = smoothstep(0.3, 0.75, fbm(uv * dustN, dustN, 3, 0.5, 2.0));
  col = mix(col, col * vec3(1.2, 1.14, 1.02), dust * uParams1.y * mix(0.4, 1.0, weave));

  // UV degradation, and this is the feature that matters most on this material.
  // Sunlight destroys the surface of any cloth left outdoors: the coating chalks,
  // the dye fades towards grey and the fibre goes fluffy. It happens on the
  // crowns of the folds — the parts that can see the sky — while the sheltered
  // valleys keep both their colour and their sheen. Without that split the whole
  // material had a roughness standard deviation of 0.017, which is to say it was
  // one single roughness everywhere, and no amount of weave detail compensates
  // for a cloth that catches light identically over its entire surface.
  float sun = clamp((sag - 0.42) * 2.6 + crease * 0.5, 0.0, 1.0);
  float bleachN = countOf(0.35);
  float bleach = sun * smoothstep(0.35, 0.80, fbm(uv * bleachN, bleachN, 3, 0.5, 2.0))
               * uParams1.z;
  vec3 grey = vec3(dot(col, vec3(0.32, 0.55, 0.13)));
  col = mix(col, mix(col, grey, 0.6) * 1.45, bleach);

  // Coating that survives in the shade. A PVC-faced tarp is semi-gloss where it
  // has not been cooked, and hessian has no coating at all, so this is per-spec.
  float coat = (1.0 - sun) * uParams2.y;
  // Tide lines: rain runs to the low point of a fold and dries there, leaving a
  // dark, smoother, slightly stiffened band.
  float tide = smoothstep(0.62, 0.88, runs(uv, 0.09, 6.0)) * (1.0 - sun);
  col *= mix(1.0, 0.80, tide * 0.7);

  s.albedo = col;
  s.height = clamp(h, 0.0, 1.0);
  // Woven fibre is uniformly very rough, but the thread crowns are compressed
  // and catch a faint sheen at grazing angles — the reason cloth has a rim.
  s.roughness = clamp(uParams2.x - weave * 0.05 + cavity * 0.04 + tear * 0.05
                      + bleach * 0.09 + dust * uParams1.y * 0.05
                      + piece * 0.16 - coat * 0.40 - tide * 0.16, 0.3, 1.0);
  s.metalness = 0.0;
  // The inter-thread occlusion belongs here rather than in the height field:
  // it is a real effect at a scale the normal map cannot represent, and AO is
  // a scalar so mip-mapping averages it correctly instead of catastrophically.
  s.ao = clamp(0.86 + weave * 0.14 - tear * 0.3, 0.1, 1.0);
  return s;
}
`;

const GUNMETAL = /* glsl */ `
Surface surface(vec2 uv) {
  Surface s;

  // Bead-blasted and phosphated steel. At a third of a millimetre per texel the
  // blast texture itself is sub-texel, so it lives in roughness and in the
  // detail normal; the base map carries the things you can actually see.
  // 2.5 mm at 0.34 mm per texel is seven texels, which is the smallest the
  // Sobel pass can resolve cleanly. The blast pattern proper is a couple of
  // microns deep and belongs entirely in roughness — carrying it as relief was
  // putting a third of a millimetre of bump on a 1.5 mm feature, and a receiver
  // half a metre from the camera during ADS is the last place that survives.
  float blastN = countOf(0.0025);
  float blast = gnoise(uv * blastN, blastN);
  vec2 machP = vec2(countOf(0.0025), countOf(0.02));
  float machining = gnoise2(uv * machP, machP);
  float h = 0.7 + (blast - 0.5) * 0.05 + (machining - 0.5) * 0.03;

  // Handling polishes the finish off high points and edges first, so the mask is
  // keyed to the height field rather than to an unrelated noise — the comment here
  // always claimed this and the code never did it. Burnished steel is very nearly
  // a mirror wherever the phosphate has gone, and that step from a matte 0.5 down
  // past 0.2 is the whole reason a used weapon looks used. The finish measured a
  // roughness spread of 0.024 across the entire receiver before this, which is to
  // say the gun caught light identically everywhere.
  float wearN = countOf(0.02);
  float wearField = fbm(uv * wearN, wearN, 4, 0.55, 2.0);
  float highPoint = smoothstep(0.69, 0.735, h);
  // Widened. A four-octave fbm hardly ever reaches 0.78, so a mask starting there
  // passed on a few per cent of the receiver and the finish measured a roughness
  // spread of 0.036 — a weapon that catches light identically over its whole
  // surface, held in the middle of the screen for the entire game.
  float wear = smoothstep(0.46, 0.66, wearField) * mix(0.22, 1.0, highPoint) * uParams0.x;
  vec2 scrP = vec2(countOf(0.003), countOf(0.02));
  float scratches = smoothstep(0.78, 0.96, ridged2(uv * scrP, scrP, 2)) * uParams0.y;
  float polish = clamp(wear + scratches * 0.9, 0.0, 1.0);
  h += polish * 0.03;

  // Carbon fouling collects in patches, not in a band across the tile — a
  // gradient keyed on uv here would repeat every 350 mm along the receiver.
  float foulN = countOf(0.03);
  float fouling = smoothstep(0.60, 0.90, fbm(uv * foulN, foulN, 3, 0.5, 2.0)) * uParams0.z;

  vec3 col = mix(uColorA, uColorB, polish);
  col *= 0.95 + blast * 0.1;
  col = mix(col, uColorC, fouling);

  s.albedo = col;
  s.height = clamp(h, 0.0, 1.0);
  // Manganese phosphate is a porous conversion coating and reads as a genuinely
  // rough metal; wear burnishes it toward the steel underneath.
  s.roughness = clamp(uParams1.x - polish * 0.40 + (1.0 - blast) * 0.06
                      + fouling * 0.12, 0.08, 1.0);
  s.metalness = clamp(0.9 - fouling * 0.4 + polish * 0.1, 0.0, 1.0);
  s.ao = clamp(1.0 - (1.0 - blast) * 0.08, 0.0, 1.0);
  return s;
}
`;

const POLYMER = /* glsl */ `
Surface surface(vec2 uv) {
  Surface s;

  // Injection-moulded glass-filled nylon: a fine mould stipple plus, where the
  // designer wanted grip, a moulded checker. Both are authored coarse enough to
  // clear the Sobel pass — a 1.2 mm stipple was four texels wide and its derived
  // normal was noise, which is what made polymer furniture sparkle under ADS.
  float stipN = countOf(0.0025);
  float stipple = worley(uv * stipN, stipN, 1.0).x;
  float h = 0.62 + (1.0 - stipple) * 0.05;

  // Moulded grip checker. The pitch is right and the pattern is genuinely a
  // lattice — that is how the part comes out of the tool — but a lattice is the
  // one signal that must never be allowed to produce identical highlights,
  // because identical highlights on a regular grid read as a screen door rather
  // than as a moulding. Held at a fixed height with a 0.36 mm edge ramp and a
  // gloss of 0.5, a black handguard a hand's width from the camera was a
  // perfectly even grid of pinpoint speculars, each one fringed red and blue by
  // the chromatic aberration in the post chain: the single most artificial thing
  // in any frame that had the weapon in it.
  //
  // Three things fix it and all three are also true of the real part. The pads
  // are half a millimetre proud, not six tenths, with a rounded shoulder rather
  // than a cliff; each cavity in a tool this fine fills slightly differently, so
  // the pads vary; and the crowns carry the same matte mould stipple as the rest
  // of the part, so they are marginally rougher than the flanks and cannot throw
  // a mirror highlight at all.
  //
  // It is also confined to panels. No weapon is checkered over its whole surface
  // — the texture is moulded into the places a hand goes and the rest of the part
  // is left plain — and running it edge to edge is what made the grid read as a
  // property of the screen rather than of the object. Panels are rectangles with
  // a raised bead around them, because they are drawn by a tool and not by wear.
  float grip = 0.0;
  float bead = 0.0;
  float zone = 0.0;
  if (uParams0.x > 0.5) {
    vec3 pnl = rects(uv, vec2(0.085, 0.055), 0.55, 0.5, 0.92);
    zone = pnl.x * smoothstep(0.0, 0.0012, pnl.y);
    bead = pnl.x * (1.0 - smoothstep(0.0006, 0.0022, pnl.y));
    float gn = countOf(0.004);
    vec2 gf = abs(fract(uv * gn) - 0.5);
    float gj = hash21(mod(floor(uv * gn), vec2(gn)) + uSeed);
    grip = (1.0 - smoothstep(0.14, 0.44, max(gf.x, gf.y))) * (0.70 + gj * 0.30) * zone;
    h += grip * 0.15 + bead * 0.10;
  }

  vec2 scuffP = vec2(countOf(0.004), countOf(0.03));
  float scuff = smoothstep(0.7, 0.94, ridged2(uv * scuffP, scuffP, 2)) * uParams0.y;
  float wearN = countOf(0.02);
  float wear = smoothstep(0.6, 0.9, fbm(uv * wearN, wearN, 3, 0.5, 2.0)) * uParams0.y;
  float burnish = clamp(scuff * 0.9 + wear * 0.5, 0.0, 1.0);

  vec3 col = uColorA;
  col *= 0.94 + (1.0 - stipple) * 0.1;
  col = mix(col, uColorB, burnish);
  // Dust and skin oil settle between the checker pads, which is only meaningful
  // where there are pads: gated on the whole part instead, this put a flat wash of
  // warm dust over every square millimetre of the weapon.
  col = mix(col, uColorC, (1.0 - grip) * zone * 0.16);

  s.albedo = col;
  s.height = clamp(h, 0.0, 1.0);
  // A matte moulded finish, except where handling has burnished the high spots
  // to a shine. That contrast is the only reason moulded plastic reads as used.
  s.roughness = clamp(uParams1.x + (1.0 - stipple) * 0.1 - burnish * 0.24
                      + grip * 0.04, 0.15, 1.0);
  s.metalness = 0.0;
  s.ao = clamp(1.0 - (1.0 - stipple) * 0.12 - (1.0 - grip) * zone * 0.07, 0.0, 1.0);
  return s;
}
`;

const TILE = /* glsl */ `
Surface surface(vec2 uv) {
  Surface s;

  // 250 mm cement floor tile on a 5 mm grout joint.
  vec2 grid = vec2(countOf(uParams0.x), countOf(uParams0.x));
  vec2 tu = uv * grid;
  vec2 cellId = mod(floor(tu), grid);
  vec2 f = fract(tu);

  vec2 tm = uTileMetres / grid;
  vec2 e = min(f, 1.0 - f) * tm;
  float groutW = uParams0.z;
  float tileMask = smoothstep(0.0, groutW, min(e.x, e.y));

  float id = hash21(cellId + uSeed);
  float bowN = countOf(0.05);
  float bow = fbm(uv * bowN + id, bowN, 2, 0.5, 2.0);
  // Tiles are laid by hand and never quite level with each other.
  float lippage = (hash21(cellId + uSeed + 5.5) - 0.5) * 0.1;
  // Grout on a floor sits two or three millimetres below the tile face, and that
  // number matters: at the previous amplitude the joint was an eight-millimetre
  // drop over a six-millimetre fillet, a fifty-degree wall, and the floor baked
  // out with an 18-degree RMS slope — the highest in the library, on the flattest
  // real surface in the game. It read as a relief carving of a tiled floor.
  float h = 0.42 + tileMask * (0.17 + (bow - 0.5) * 0.05 + lippage);

  // Tiles come away in patches — along a crack, under a leak, where the traffic
  // goes — never as isolated squares scattered over the floor. A per-tile hash
  // on its own gives a chequerboard, which is exactly how this read before: an
  // even 8% of the floor missing, one tile at a time.
  float failN = countOf(0.9);
  float failure = smoothstep(0.60, 0.78, fbm(uv * failN, failN, 3, 0.5, 2.0));
  float broken = step(0.72, id) * failure;
  // A cracked tile has one or two hairline splits running across it. Thirty
  // millimetre ridged noise at two octaves gave a field of pepper instead: its
  // finest detail was fifteen millimetres, seven texels, and it went into albedo,
  // normal and roughness simultaneously across a third of the tiles, which is
  // what turned the floor into a gritty mosaic. Long, sparse ridges at 220 mm
  // draw a split; short ones draw grit.
  vec2 crkP = vec2(countOf(0.22), countOf(0.22));
  float crack = smoothstep(0.88, 0.97, ridged2(uv * crkP + id * 7.0, crkP, 1))
              * step(0.72, id) * tileMask;
  // A tile is 10 mm thick, so its absence is a 10 mm step and not a trench. The
  // deeper version bottomed out the cavity AO and the gaps read as holes
  // punched through the slab.
  h -= broken * tileMask * 0.3 + crack * 0.05;

  float groutN = countOf(0.008);
  float groutNoise = gnoise(uv * groutN, groutN);

  // Tiles come off one production run, so they differ from each other by a few
  // per cent and no more. A wide per-tile spread is the classic mistake and it
  // reads as a mosaic laid from salvage — which, with a metre-scale dirt field
  // sitting on top of it at almost exactly the tile pitch, is what this floor
  // looked like: a chessboard.
  vec3 tileCol = mix(uColorA, uColorB, id * 0.3);
  // Cement tiles are pigmented in the mix, so the colour drifts across a tile.
  tileCol *= 0.95 + bow * 0.09;
  vec3 groutCol = uColorC * (0.85 + groutNoise * 0.3);
  vec3 col = mix(groutCol, tileCol, tileMask);
  // What is under a missing tile is the screed and a scabby film of tile
  // adhesive: grey-brown, matte, and only somewhat darker than the tile. Not a
  // black hole — that reads as a pit in the floor, which is what it looked like.
  vec3 bedCol = mix(uColorC, vec3(0.23, 0.215, 0.19), 0.4)
              * (0.9 + groutNoise * 0.3);
  col = mix(col, bedCol, broken * tileMask);
  col *= 1.0 - crack * 0.4;

  float cavity = clamp(1.0 - h, 0.0, 1.0);
  // Traffic grinds dirt into the grout and into the tile edges first. At 350 mm
  // this field beat against the 250 mm tile pitch and its blotches read as
  // per-tile tone; a metre and a half is grime, which is what it is meant to be.
  float dirtN = countOf(1.5);
  float dirt = smoothstep(0.42, 0.85, fbm(uv * dirtN, dirtN, 3, 0.5, 2.0));
  col *= mix(1.0, 0.72, dirt * 0.5 + (1.0 - tileMask) * 0.45);
  // The walked path. This is the largest feature a floor has and the only one
  // that tells you how the room is used: feet polish a lane through the middle
  // of it and the corners stay dull. Purely a roughness effect with the faintest
  // touch of albedo, because a polished cement tile is not a differently
  // coloured tile — and it is the reason a floor stops reading as graph paper
  // when the joints are too far off to resolve.
  float pathN = countOf(2.6);
  float walk = smoothstep(0.38, 0.70, fbm(uv * pathN, pathN, 3, 0.5, 2.0)) * tileMask;
  col *= 1.0 - walk * 0.04;

  s.albedo = col;
  s.height = clamp(h, 0.0, 1.0);
  // A glazed or sealed tile face against porous grout is one of the largest
  // roughness contrasts in the game, and it is what makes a floor look tiled
  // even when the joints are too far away to resolve.
  s.roughness = clamp(mix(0.92, uParams1.x, tileMask) + dirt * 0.18
                      - walk * 0.12
                      + broken * 0.25 + crack * 0.15, 0.1, 1.0);
  s.metalness = 0.0;
  s.ao = clamp(mix(0.45, 1.0, tileMask) - broken * 0.16 - crack * 0.12 - cavity * 0.1, 0.05, 1.0);
  return s;
}
`;

const DIRT_GROUND = /* glsl */ `
Surface surface(vec2 uv) {
  Surface s;

  float macroN = countOf(2.6);
  float macro = fbm(uv * macroN, macroN, 4, 0.55, 2.0);
  float mesoN = countOf(0.45);
  float meso = fbm(uv * mesoN, mesoN, 3, 0.5, 2.0);

  // Both of these are Worley, and this is a ground plane seen at grazing angles
  // all day, so the cells are kept comfortably above the eight-texels-per-cell
  // floor below which a Voronoi degenerates into a visible lattice.
  float clodN = countOf(0.06);
  float stoneN = countOf(0.085);
  vec3 clod = worley(uv * clodN, clodN, 1.0);
  vec3 stone = worley(uv * stoneN, stoneN, 1.0);

  float stoneMask = step(stone.z, 0.22) * (1.0 - smoothstep(0.1, 0.3, stone.x));
  float clodMask = (1.0 - smoothstep(0.05, 0.36, clod.x)) * 0.5;

  float h = 0.44 + (macro - 0.5) * 0.4 + (meso - 0.5) * 0.16
            + clodMask * 0.1 + stoneMask * 0.14;

  // Dried mud polygons, and only in the hollows. Cracked mud is the record of
  // standing water that has evaporated, so it belongs in the depressions the
  // macro height field already describes and nowhere else.
  //
  // Keyed on distance from that field's midpoint instead, as it was, the mask
  // stood at 0.95 nearly everywhere and laid a complete Voronoi net over the
  // whole ground plane. A closed polygonal network at even density does not read
  // as dried mud — it reads as crazed ceramic, and on the largest surface in the
  // level it was the most obvious procedural tell left anywhere in the town.
  float pond = smoothstep(0.56, 0.30, macro)
             * smoothstep(0.48, 0.74, fbm(uv * countOf(1.6), countOf(1.6), 3, 0.5, 2.0));
  float crack = cellCracks(uv, 0.26, 0.012, 0.9) * pond;
  h -= crack * 0.14;

  // Compaction ruts on 1.7 m centres, which is roughly a light truck.
  float rutRows = countOf(1.7);
  float rut = exp(-pow((fract(uv.y * rutRows) - 0.5) * 4.0, 2.0)) * uParams0.y;
  h -= rut * 0.2;

  float cavity = clamp(1.0 - h, 0.0, 1.0);

  vec3 col = mix(uColorA, uColorB, clamp(macro * 1.35 - 0.18, 0.0, 1.0));
  col *= 0.9 + meso * 0.2;
  float fleckN = countOf(0.01);
  col *= 0.94 + gnoise(uv * fleckN, fleckN) * 0.12;
  col = mix(col, uColorC, stoneMask * 0.85);
  col = mix(col, col * 0.66, crack * 0.7);
  // Traffic compacts the ruts, which darkens them and smooths them.
  col = mix(col, col * 0.78, rut * 0.6);

  float grassN = countOf(0.12);
  float grass = step(0.88, hash21(mod(floor(uv * grassN), grassN) + uSeed))
              * smoothstep(0.42, 0.7, meso) * uParams1.x;
  col = mix(col, vec3(0.13, 0.12, 0.06), grass * 0.6);

  // Wind-blown fines drift over everything, and they are far paler than the soil
  // beneath. This has to be a covering layer rather than a tint: it is the reason
  // bare ground in a desert town reads as pale dust with darker soil cut through
  // it wherever traffic runs, and without it the whole material sat inside a
  // 0.08-to-0.17 reflectance band with nothing anywhere to break it up.
  float driftN = countOf(0.8);
  float drift = smoothstep(0.34, 0.74, fbm(uv * driftN, driftN, 4, 0.5, 2.0))
              * (1.0 - rut * 0.8);
  col = mix(col, vec3(0.30, 0.255, 0.175), drift * uParams1.y * 0.75);

  // Where the ground has been walked and driven flat. Traffic packs the fines
  // into a crust that is darker than loose dust and markedly smoother, and the
  // two together are the only roughness variation bare ground has at a scale a
  // player can see. Without it the largest surface in the level caught the light
  // identically everywhere — a roughness spread of 0.036, which is a painted
  // backdrop, not a floor. Loose drift works the other way and is rougher than
  // anything, so the two ends of the range are a metre or two apart on the
  // ground rather than being averaged into one value.
  float packN = countOf(1.1);
  float pack = max(rut, smoothstep(0.50, 0.86, fbm(uv * packN, packN, 3, 0.5, 2.0))
                        * (1.0 - drift * 0.6));
  col *= 1.0 - pack * 0.1;

  s.albedo = col;
  s.height = clamp(h, 0.0, 1.0);
  s.roughness = clamp(0.92 - stoneMask * 0.16 - pack * 0.28 + cavity * 0.05
                      + drift * uParams1.y * 0.14, 0.42, 1.0);
  s.metalness = 0.0;
  s.ao = clamp(1.0 - crack * 0.35 - cavity * 0.28, 0.1, 1.0);
  return s;
}
`;

export type MaterialKey =
  | 'concrete'
  | 'concreteFloor'
  | 'plaster'
  | 'plasterInterior'
  | 'brick'
  | 'sand'
  | 'rubble'
  | 'asphalt'
  | 'paintedMetalGreen'
  | 'paintedMetalTan'
  | 'paintedMetalRed'
  | 'corrugated'
  | 'wood'
  | 'woodCrate'
  | 'fabricSandbag'
  | 'fabricTarp'
  | 'gunmetal'
  | 'polymerBlack'
  | 'polymerTan'
  | 'tile'
  | 'dirt';

interface MaterialSpec {
  glsl: string;
  surface: SurfaceKind;
  opts: Parameters<TextureForge['bake']>[2];
  /** World-space metres covered by one texture tile. Must match the geometry. */
  tileMetres: number;
  /** Metres covered by one tile of the shared micro-detail normal. */
  detailMetres: number;
  /**
   * Peak-to-valley relief of the micro layer, in metres. Real numbers: a
   * trowelled render is around a millimetre at this scale, sprayed enamel is
   * under two tenths, and blasted steel is a few hundredths.
   */
  detailRelief: number;
  /** How much the detail height modulates albedo and roughness. */
  detailShade: number;
  /** Metres per tile of the world-space macro variation field. */
  macroMetres: number;
  /** Multiplicative tint the macro dirt channel drags the albedo toward. */
  macroTint: THREE.ColorRepresentation;
  /**
   * [albedo tone, dirt tint, roughness, splash zone] amounts for the macro
   * field. Splash is the ground-level grit band and belongs to architecture,
   * not to anything a player carries.
   */
  macroAmount: [number, number, number, number];
  material: Partial<THREE.MeshStandardMaterialParameters>;
}

/**
 * Albedo notes for the palettes below: hex literals are sRGB display values,
 * which `THREE.Color` converts to linear on the way into the uniform. Real
 * measured reflectances are much lower and much less saturated than intuition
 * suggests — aged asphalt is 0.07, red brick is 0.12, and even white plaster
 * rarely passes 0.55 — so these stay deliberately drab. Overly dark or overly
 * colourful albedo is the fastest way to make a PBR surface look like plastic.
 */
const SPECS: Record<MaterialKey, MaterialSpec> = {
  concrete: {
    glsl: CONCRETE,
    surface: 'concrete',
    tileMetres: 4,
    detailMetres: 0.16,
    detailRelief: 0.001,
    detailShade: 0.16,
    macroMetres: 17,
    macroTint: 0xb8a98c,
    // A 4 m tile holds only three panels by two, so the per-panel tone hierarchy
    // baked into the map can never carry more than six distinct values before it
    // repeats. Metre-scale tonal drift therefore has to come from the world-space
    // macro field, which does not repeat, and that is why the tone channel is
    // roughly doubled here rather than pushing the baked panel tone further.
    macroAmount: [0.15, 0.175, 0.07, 0.9],
    opts: {
      seed: 11, params0: [0.8, 0, 0, 0], heightMetres: 0.03,
      aoRadius: 7, aoStrength: 1.0, toksvig: 0.4,
      // Nudged warm off neutral grey. Nothing in a desert town stays neutral —
      // everything carries a film of the same buff dust — and a cool grey lintel
      // next to a warm render wall reads as a different, newer building.
      colorA: 0x85837b, colorB: 0x9e9b90, colorC: 0x4d4c46,
    },
    material: { roughness: 1, metalness: 0 },
  },
  concreteFloor: {
    glsl: CONCRETE,
    surface: 'concrete',
    tileMetres: 3,
    detailMetres: 0.13,
    detailRelief: 0.0008,
    detailShade: 0.14,
    macroMetres: 21,
    macroTint: 0xc2b394,
    macroAmount: [0.15, 0.2, 0.1, 0.7],
    opts: {
      seed: 23, params0: [0.45, 0, 0, 0], params1: [1, 0, 0, 0], heightMetres: 0.028,
      aoRadius: 6, aoStrength: 0.9, toksvig: 0.35,
      colorA: 0x787873, colorB: 0x92928b, colorC: 0x45453f,
    },
    material: { roughness: 1, metalness: 0 },
  },
  plaster: {
    glsl: PLASTER,
    surface: 'concrete',
    tileMetres: 4.5,
    detailMetres: 0.15,
    detailRelief: 0.0011,
    detailShade: 0.18,
    macroMetres: 19,
    macroTint: 0xbfae8e,
    macroAmount: [0.16, 0.2, 0.08, 1],
    opts: {
      seed: 37, params0: [0.85, 0, 0, 0], params1: [0.7, 0, 0, 0], heightMetres: 0.038,
      aoRadius: 7, aoStrength: 1.0, toksvig: 0.4,
      // Limewashed render measures about 0.45 to 0.55 reflectance at its
      // brightest. The previous pale end sat at 0.64, which clipped in sunlight
      // and turned every facade into a white card with dirt on it.
      colorA: 0xaea188, colorB: 0xc1b49a, colorC: 0x877b66,
    },
    material: { roughness: 1, metalness: 0 },
  },
  plasterInterior: {
    glsl: PLASTER,
    surface: 'concrete',
    tileMetres: 3,
    detailMetres: 0.11,
    detailRelief: 0.0008,
    detailShade: 0.16,
    macroMetres: 13,
    macroTint: 0x9c9384,
    // Grime is dialled back well below the exterior figure. An interior wall gets
    // handling, soot and damp, but it does not get rain, and the streak-and-blot
    // field is a weather model.
    macroAmount: [0.13, 0.10, 0.07, 0.5],
    opts: {
      // An interior wall does not get blown render: there is no rain driving into
      // it. What it gets is handling, soot and damp at the skirting, so the damage
      // term is nearly off and the rub, wash and ghosting carry the surface.
      seed: 53, params0: [0.18, 0, 0, 0], params1: [0.35, 0, 0, 0], heightMetres: 0.03,
      aoRadius: 6, aoStrength: 0.85, toksvig: 0.35,
      // Baked out at 0.50 mean luminance with a 0.62 peak, which is brighter than
      // the exterior render and brighter than limewash gets. An interior wall sees
      // less sun bleaching and more soot than an exterior one, so it should sit
      // below it, not above.
      colorA: 0xa9a090, colorB: 0xbbb4a5, colorC: 0x7e7565,
    },
    material: { roughness: 1, metalness: 0 },
  },
  brick: {
    glsl: BRICK,
    surface: 'concrete',
    tileMetres: 2.4,
    detailMetres: 0.1,
    detailRelief: 0.0014,
    detailShade: 0.2,
    macroMetres: 16,
    macroTint: 0xa89a80,
    macroAmount: [0.094, 0.175, 0.07, 0.9],
    opts: {
      seed: 71, params0: [0, 0, 0, 0], params1: [0.5, 0, 0, 0], heightMetres: 0.03,
      aoRadius: 8, aoStrength: 1.15, toksvig: 0.45,
      // The pale end is pushed towards buff rather than towards a lighter red.
      // Two tones of the same hue give a wall one flat colour however far apart
      // their values are; a red-to-buff spread is what actually reads as fired
      // clay, and it drops the average saturation at the same time.
      colorA: 0x78554a, colorB: 0x9a8067, colorC: 0xa39c90,
    },
    material: { roughness: 1, metalness: 0 },
  },
  sand: {
    glsl: SAND,
    surface: 'sand',
    tileMetres: 6,
    detailMetres: 0.2,
    detailRelief: 0.0018,
    detailShade: 0.14,
    macroMetres: 27,
    macroTint: 0xc9b593,
    macroAmount: [0.13, 0.15, 0.06, 0],
    opts: {
      seed: 97, params0: [1.0, 0.22, 0.75, 0], heightMetres: 0.075,
      aoRadius: 6, aoStrength: 0.6, toksvig: 0.3,
      // Dry desert sand measures 0.30 to 0.40 broadband. This palette baked out
      // to a mean luminance of 0.42 with a maximum of 0.49, which is not sand —
      // it is a lightly tinted white card, and it clipped in direct sun.
      colorA: 0xa89474, colorB: 0xbcab8c, colorC: 0x7e7157,
    },
    material: { roughness: 1, metalness: 0 },
  },
  rubble: {
    glsl: RUBBLE,
    surface: 'dirt',
    tileMetres: 2.2,
    detailMetres: 0.09,
    detailRelief: 0.0022,
    detailShade: 0.2,
    macroMetres: 15,
    macroTint: 0xc0b295,
    macroAmount: [0.12, 0.15, 0.06, 0.2],
    opts: {
      seed: 113, heightMetres: 0.14,
      // Faceted chunks throw far more cavity than domed ones did, and at the old
      // strength the pile averaged 46 per cent occluded — a heap of debris in full
      // sun that renders as a hole in the ground.
      // A 35-degree RMS slope is the steepest thing in the library and it is
      // honest — snapped blockwork really is all facet and edge. The answer is
      // therefore not to flatten it but to let the Toksvig term convert that
      // slope variance into roughness as the pile mips down, which is what stops
      // a debris heap from sparkling along every edge at twenty metres.
      aoRadius: 9, aoStrength: 1.05, toksvig: 0.7,
      // Snapped concrete and blockwork is a pale grey-buff and it is coated in the
      // dust it made when it broke. The old palette baked out at 0.17 mean
      // reflectance which, once the cavity occlusion of a faceted pile is applied
      // over it, left the debris around 0.10 — darker than the asphalt beside it.
      colorA: 0xa39c8e, colorB: 0x847d72, colorC: 0x5d574e,
    },
    material: { roughness: 1, metalness: 1 },
  },
  asphalt: {
    glsl: ASPHALT,
    surface: 'concrete',
    tileMetres: 5,
    detailMetres: 0.13,
    detailRelief: 0.0014,
    detailShade: 0.2,
    macroMetres: 23,
    macroTint: 0xbdb49c,
    macroAmount: [0.12, 0.17, 0.09, 0.15],
    opts: {
      seed: 131, params0: [0, 0.45, 0.6, 0.3], params1: [0.75, 0, 0, 0],
      heightMetres: 0.035, aoRadius: 6, aoStrength: 0.9, toksvig: 0.4,
      // Fresh bitumen measures 0.04 to 0.09 reflectance and the previous pale
      // end sat at 0.087, which is defensible for a newly surfaced motorway and
      // completely wrong for this. Nothing in a desert town has been resurfaced
      // in thirty years: the binder has oxidised off the top millimetre, the
      // pale aggregate underneath is exposed, and the measured albedo of that
      // is 0.10 to 0.20. At the old values the road rendered as an unlit hole
      // in the middle of every frame — worst under overcast, where there is no
      // sun angle to rescue it.
      colorA: 0x5c5b57, colorB: 0x716d64, colorC: 0x323230,
    },
    material: { roughness: 1, metalness: 0 },
  },
  paintedMetalGreen: {
    glsl: PAINTED_METAL,
    surface: 'metal',
    tileMetres: 1.0,
    detailMetres: 0.045,
    detailRelief: 0.00015,
    detailShade: 0.08,
    macroMetres: 9,
    macroTint: 0xb0a68c,
    macroAmount: [0.062, 0.14, 0.07, 0.6],
    opts: {
      seed: 149, params0: [0.42, 0.3, 0.75, 0], params1: [0.32, 0.14, 0.75, 0],
      heightMetres: 0.01, aoRadius: 5, aoStrength: 0.6, toksvig: 0.25,
      // Olive drab measures 0.09 to 0.12 reflectance. The old pair baked to 0.061,
      // which is nearer black than green and left every painted fitting in the
      // level as a silhouette once it was out of direct sun.
      colorA: 0x4a563d, colorB: 0x5e5946, colorC: 0x6c4224,
    },
    material: { roughness: 1, metalness: 1 },
  },
  paintedMetalTan: {
    glsl: PAINTED_METAL,
    surface: 'metal',
    tileMetres: 1.4,
    detailMetres: 0.06,
    detailRelief: 0.00015,
    detailShade: 0.08,
    macroMetres: 9,
    macroTint: 0xb0a68c,
    macroAmount: [0.062, 0.15, 0.07, 0.6],
    opts: {
      // Tan had the least wear of the three and, on a pale paint, the chips and
      // primer showing through are the only thing giving it any tonal structure at
      // all — it baked out as the flattest albedo in the library.
      seed: 167, params0: [0.62, 0.42, 0.6, 0], params1: [0.36, 0.16, 0.75, 0],
      heightMetres: 0.01, aoRadius: 5, aoStrength: 0.6, toksvig: 0.25,
      colorA: 0x958a6d, colorB: 0x6d6350, colorC: 0x6c4224,
    },
    material: { roughness: 1, metalness: 1 },
  },
  paintedMetalRed: {
    glsl: PAINTED_METAL,
    surface: 'metal',
    tileMetres: 1.0,
    detailMetres: 0.045,
    detailRelief: 0.00018,
    detailShade: 0.09,
    macroMetres: 8,
    macroTint: 0xb0a68c,
    macroAmount: [0.07, 0.15, 0.08, 0.6],
    opts: {
      seed: 181, params0: [0.5, 0.38, 0.85, 0], params1: [0.28, 0.2, 0.5, 0],
      heightMetres: 0.012, aoRadius: 5, aoStrength: 0.7, toksvig: 0.28,
      colorA: 0x82412f, colorB: 0x66503f, colorC: 0x6f3f22,
    },
    material: { roughness: 1, metalness: 1 },
  },
  corrugated: {
    glsl: CORRUGATED,
    surface: 'metal',
    tileMetres: 1.4,
    detailMetres: 0.055,
    detailRelief: 0.0002,
    detailShade: 0.1,
    macroMetres: 11,
    macroTint: 0xb5aa90,
    macroAmount: [0.078, 0.16, 0.08, 0.8],
    opts: {
      seed: 199, params1: [0.75, 0.5, 0, 0], heightMetres: 0.05,
      aoRadius: 7, aoStrength: 0.8, toksvig: 0.3,
      colorA: 0xb7bbc0, colorB: 0x8d9197, colorC: 0x6d4a2e,
    },
    material: { roughness: 1, metalness: 1 },
  },
  wood: {
    glsl: WOOD,
    surface: 'wood',
    tileMetres: 1.1,
    detailMetres: 0.05,
    detailRelief: 0.0009,
    detailShade: 0.16,
    macroMetres: 8,
    macroTint: 0xb2a68b,
    macroAmount: [0.086, 0.15, 0.07, 0.7],
    opts: {
      seed: 211, params0: [0.16, 0, 0, 0], params1: [0.68, 0, 0, 0],
      heightMetres: 0.016, aoRadius: 6, aoStrength: 1.0, toksvig: 0.35,
      // Weathering takes timber *lighter*, not darker: the lignin at the surface
      // photo-degrades and washes out, and what is left is silver-grey. Sun-bleached
      // softwood measures 0.15 to 0.25 reflectance and this pair was averaging
      // 0.113, which put a rail or a shutter closer to creosote than to old pine.
      colorA: 0xa1927a, colorB: 0x7e6d52, colorC: 0x3a2c20,
    },
    material: { roughness: 1, metalness: 0 },
  },
  woodCrate: {
    glsl: WOOD,
    surface: 'wood',
    tileMetres: 1.1,
    detailMetres: 0.05,
    detailRelief: 0.0009,
    detailShade: 0.18,
    macroMetres: 7,
    macroTint: 0xb2a68b,
    macroAmount: [0.094, 0.15, 0.07, 0.5],
    opts: {
      seed: 227, params0: [0.11, 0, 0, 0], params1: [0.42, 0, 0, 0],
      heightMetres: 0.012, aoRadius: 6, aoStrength: 1.0, toksvig: 0.35,
      // Sawn softwood, not stained joinery. New pine is about this warm; four
      // desert summers take the chroma out of it, which is what params1.x does.
      // The pair averages 0.21 reflectance baked, which is where weathered pine
      // sits. Below about 0.18 a crate stops reading as bare timber and starts
      // reading as something that has been creosoted.
      colorA: 0xac9c82, colorB: 0x8b7a60, colorC: 0x453629,
    },
    material: { roughness: 1, metalness: 0 },
  },
  fabricSandbag: {
    glsl: FABRIC,
    surface: 'fabric',
    tileMetres: 0.9,
    detailMetres: 0.035,
    detailRelief: 0.0009,
    detailShade: 0.14,
    macroMetres: 4.5,
    macroTint: 0xc4b492,
    macroAmount: [0.094, 0.16, 0.05, 0.6],
    opts: {
      // 6 mm thread pitch: coarse for hessian, but at 0.9 mm per texel a
      // 3.5 mm pitch was only four texels across and the Sobel pass had
      // nothing but noise to work with.
      // Hessian is the one cloth in the game whose basket weave you are genuinely
      // meant to see — it is jute, the yarn is a couple of millimetres thick, and
      // it is why a sandbag looks like a sandbag rather than a beanbag.
      seed: 239, params0: [0.005, 0.055, 0, 0], params1: [0.22, 0.7, 0.72, 0],
      params2: [0.9, 0, 0.35, 1], heightMetres: 0.016,
      // Cloth gets the highest Toksvig weighting in the library. A weave is a
      // regular signal at a few texels per cycle, which is exactly the case the
      // compensation exists for: as the mip chain averages those thread normals
      // flat, the roughness has to rise to account for the variation it threw
      // away. Otherwise the surface keeps a coherent specular lobe it has no
      // business having and beats against the pixel grid — a dot lattice with
      // colour fringing, plainly visible along the lit edge of hanging cloth.
      aoRadius: 6, aoStrength: 0.9, toksvig: 0.7,
      colorA: 0x8b7f60, colorB: 0x9e9270, colorC: 0x5e5442,
    },
    material: { roughness: 1, metalness: 0 },
  },
  fabricTarp: {
    glsl: FABRIC,
    surface: 'fabric',
    // 1.2 m rather than 2 m, which is 1.2 mm per texel. A seven-millimetre thread
    // pitch needs about six texels to bake without aliasing into a lattice, and
    // at the old density it would have had three and a half. Nothing is lost by
    // tightening it: no cloth prop in the level is wider than about a metre, so
    // the tile never repeats within one piece anyway.
    tileMetres: 1.2,
    detailMetres: 0.08,
    detailRelief: 0.0007,
    detailShade: 0.1,
    macroMetres: 8,
    macroTint: 0xc0b090,
    macroAmount: [0.078, 0.15, 0.05, 0.4],
    opts: {
      // 7 mm thread pitch on a plain crossed grid rather than a basket, so the
      // visible period is 7 mm and not 36. This material is doing four jobs —
      // tarpaulin, awning, laundry and the soldiers' fatigues — and a basket
      // weave coarse enough to see across a room is wrong for all four of them.
      // Weave relief of 0.01 on a 35 mm height range is a third of a millimetre
      // of thread stand-off, which is what a woven polyethylene tarpaulin
      // actually has. Twice that put the RMS slope at 11 degrees and left a
      // regular lattice of specular crowns on any sheet the sun was behind.
      // params2.y, the surviving coating, is the other half of that: at 0.5 the
      // sheltered valleys fell to 0.48 roughness, which is a glossy lobe narrow
      // enough to alias against a millimetre-scale weave. A four-summer-old
      // tarp is semi-matte at best.
      seed: 251, params0: [0.007, 0.01, 0, 0], params1: [0.35, 0.5, 0.5, 0],
      params2: [0.88, 0.28, 2.2, 0], heightMetres: 0.035,
      aoRadius: 6, aoStrength: 0.75, toksvig: 0.7,
      colorA: 0x545c48, colorB: 0x67705a, colorC: 0x333829,
    },
    material: { roughness: 1, metalness: 0 },
  },
  gunmetal: {
    glsl: GUNMETAL,
    surface: 'metal',
    tileMetres: 0.35,
    detailMetres: 0.012,
    detailRelief: 0.00008,
    detailShade: 0.07,
    macroMetres: 0.9,
    macroTint: 0x9a9a96,
    macroAmount: [0.047, 0.1, 0.05, 0],
    opts: {
      seed: 269, params0: [0.75, 0.4, 0.35, 0], params1: [0.5, 0, 0, 0],
      heightMetres: 0.0025, aoRadius: 4, aoStrength: 0.4, toksvig: 0.2,
      colorA: 0x5e6165, colorB: 0xa9adb2, colorC: 0x2a2b2d,
    },
    material: { roughness: 1, metalness: 1 },
  },
  polymerBlack: {
    glsl: POLYMER,
    surface: 'rubber',
    tileMetres: 0.3,
    detailMetres: 0.01,
    detailRelief: 0.0001,
    detailShade: 0.08,
    macroMetres: 0.8,
    macroTint: 0x8f8b86,
    macroAmount: [0.047, 0.09, 0.05, 0],
    opts: {
      // A moulded matte finish is 0.6 to 0.75 rough; 0.52 is a semi-gloss, which
      // is what an injection-moulded part looks like straight off a polished tool
      // and not what one looks like after a year in a soldier's hands. It is also
      // what turned the grip checker into a grid of specular pinpoints, and
      // roughness is a far cheaper fix for that than any amount of filtering.
      // Toksvig is up with it: a 4 mm lattice is exactly the regular
      // few-texels-per-cycle signal the compensation is for.
      seed: 281, params0: [1, 0.35, 0, 0], params1: [0.63, 0, 0, 0],
      heightMetres: 0.002, aoRadius: 4, aoStrength: 0.5, toksvig: 0.5,
      // 0.021 linear is a light-trap, not a colour. Black glass-filled nylon
      // measures nearer 0.03 to 0.04, and the difference is whether a backlit
      // handguard has any form at all or is a silhouette with sparkles on it.
      colorA: 0x33343a, colorB: 0x4a4d53, colorC: 0x544f45,
    },
    material: { roughness: 1, metalness: 0 },
  },
  polymerTan: {
    glsl: POLYMER,
    surface: 'rubber',
    tileMetres: 0.3,
    detailMetres: 0.01,
    detailRelief: 0.0001,
    detailShade: 0.08,
    macroMetres: 0.8,
    macroTint: 0xa89f8e,
    macroAmount: [0.047, 0.1, 0.05, 0],
    opts: {
      seed: 293, params0: [1, 0.4, 0, 0], params1: [0.66, 0, 0, 0],
      heightMetres: 0.002, aoRadius: 4, aoStrength: 0.5, toksvig: 0.5,
      colorA: 0x7d6c50, colorB: 0x998a6c, colorC: 0x4e4940,
    },
    material: { roughness: 1, metalness: 0 },
  },
  tile: {
    glsl: TILE,
    surface: 'concrete',
    tileMetres: 2,
    detailMetres: 0.07,
    detailRelief: 0.00015,
    detailShade: 0.1,
    macroMetres: 11,
    macroTint: 0xa89f8c,
    macroAmount: [0.078, 0.175, 0.1, 0.35],
    opts: {
      // 0.4 on the tile face, not 0.2. A cement floor tile is polished when it is
      // laid and this one has had a decade of grit walked over it and no cleaner:
      // the whole floor was averaging 0.235 roughness, which is a wet look, and
      // under a desert sky it threw a sheet of sheen across every interior. The
      // face is still far smoother than the grout beside it, which is the contrast
      // that makes a floor read as tiled — that has not changed.
      seed: 307, params0: [0.25, 0, 0.006, 0], params1: [0.4, 0, 0, 0],
      // The 0..1 height range this material actually uses is about 0.45 wide, so
      // 22 mm here is a 10 mm missing tile and a 3.7 mm grout joint — both of
      // which are the real numbers for a cement floor tile on a screed.
      heightMetres: 0.022, aoRadius: 7, aoStrength: 1.0, toksvig: 0.3,
      colorA: 0x9e9583, colorB: 0x867d6c, colorC: 0x6b6559,
    },
    material: { roughness: 1, metalness: 0 },
  },
  dirt: {
    glsl: DIRT_GROUND,
    surface: 'dirt',
    tileMetres: 5,
    detailMetres: 0.16,
    detailRelief: 0.0018,
    detailShade: 0.18,
    macroMetres: 22,
    macroTint: 0xc3b393,
    macroAmount: [0.15, 0.16, 0.06, 0],
    opts: {
      seed: 317, params0: [0, 0.45, 0, 0], params1: [0.55, 0.8, 0, 0],
      heightMetres: 0.055, aoRadius: 7, aoStrength: 1.0, toksvig: 0.4,
      colorA: 0x6f5d44, colorB: 0x9c8b6e, colorC: 0x5c574e,
    },
    material: { roughness: 1, metalness: 0 },
  },
};

/**
 * Shared micro-detail surface, applied on top of every material.
 *
 * The base maps run out of texels long before the camera runs out of distance —
 * at 4 mm per texel a wall is mush from half a metre away — so a single
 * high-frequency map tiled to a few centimetres carries the millimetre scale.
 * Alpha holds the height field so one fetch also gives albedo and roughness
 * modulation, which is what keeps close-ups from looking like a bumpy repaint.
 */
const DETAIL_SURFACE = /* glsl */ `
Surface surface(vec2 uv) {
  Surface s;
  // Applied at DETAIL_TILE_METRES, these frequencies land on features of four
  // to nine millimetres. That is deliberate: at one millimetre the layer is
  // already below a pixel by the time you can stand up, so it mips to nothing
  // and pays for itself in bandwidth alone. Four millimetres still reads at
  // arm's length and through a scope, which is where micro detail earns its
  // keep, and it is coarse enough that mip-mapping retires it gracefully.
  float fine = fbm(uv * 24.0, 24.0, 4, 0.55, 2.0);
  // Granularity, but deliberately not a Worley field. Voronoi F1 is the obvious
  // way to draw packed grains and it is a trap here: a cell grid is a *regular*
  // structure, so once this layer is squeezed into a 130 mm tile and undersampled
  // on a ground plane, what survives is not noise but a coherent beat against
  // the pixel grid. The road came out under a herringbone of chevrons several
  // centimetres across — invisible while the tarmac was nearly black, glaring
  // the moment its albedo was corrected. Gradient noise summed at two
  // incommensurate frequencies gives the same granular feel and degrades into
  // fine noise, which the mip chain averages away instead of amplifying.
  float grain = ridged(uv * 37.0, 37.0, 2) * 0.62
              + gnoise(uv * 53.0, 53.0) * 0.38;
  s.height = clamp(0.5 + (fine - 0.5) * 0.6 + (grain - 0.5) * 0.5, 0.0, 1.0);
  s.albedo = vec3(0.5);
  s.roughness = 0.5;
  s.metalness = 0.0;
  s.ao = 1.0;
  return s;
}
`;

/**
 * The detail layer is baked once, against a one-metre reference tile with this
 * much relief, and then applied at whatever `detailMetres` each material asks
 * for. Squeezing a one-metre tile into 150 mm multiplies every slope in it by
 * six and change, so the shader has to undo that — which is why materials
 * declare relief in metres and the amplitude is computed rather than tuned.
 * A single hand-picked strength cannot be right for a 12 mm tile of gunmetal
 * and a 200 mm tile of sand at the same time, and getting it wrong is what
 * makes fine detail boil at grazing angles.
 */
const DETAIL_BAKE_TILE = 1.0;
const DETAIL_BAKE_RELIEF = 0.012;

/**
 * World-space macro variation field.
 *
 * Every wall segment in the level starts its UVs at zero, so without this the
 * same patch of texture appears in the same corner of every box and the eye
 * locks onto it instantly. Sampling three decorrelated low-frequency fields in
 * object space — at a scale that has nothing to do with the tile — breaks that
 * up and supplies the metre-scale variation that procedural surfaces otherwise
 * lack entirely.
 *
 *   R = broad tonal drift, G = dirt and staining, B = roughness modulation.
 */
const MACRO_SURFACE = /* glsl */ `
Surface surface(vec2 uv) {
  Surface s;

  // R: broad tonal drift — sun bleaching on one elevation, a different batch of
  // render on the next bay, decades of nothing in particular.
  //
  // Two bands rather than one, and both hard-normalised. This channel is the only
  // thing in the whole system that varies at the scale of a building, so it is
  // what has to keep a large flat surface alive between five and thirty metres —
  // and it was not doing it. Three octaves of gradient noise has a standard
  // deviation of about six per cent of full scale, so a field left near its
  // natural spread delivers a couple of per cent of tonal variation however
  // generous the amplitude in the material shader looks. Floors were the extreme
  // case, measuring an albedo contrast of 0.05 against 0.25 for timber, but every
  // large plane in the level was affected: a slab, a facade and a parapet all read
  // as flat paint from ten metres.
  // The gains here are set so the sum lands near a standard deviation of 0.25,
  // which puts two sigma at the ends of the range: a field that uses its span
  // without spending most of its area clamped against the rails. Clamping is not
  // a harmless way to get contrast — it turns a smooth field into flat plateaus
  // of pure black and white, and since this one multiplies into every material in
  // the game those plateaus appear as hard-edged bright and dark zones metres
  // across on every wall at once.
  float tone = fbm(uv * 3.0, 3.0, 4, 0.55, 2.0);
  float toneWide = fbm(uv * 2.0 + 63.1, 2.0, 2, 0.5, 2.0);
  tone = clamp((tone - 0.5) * 0.9 + (toneWide - 0.5) * 1.15 + 0.5, 0.0, 1.0);

  // G: grime, and grime is not isotropic. Water runs *down* a wall, so the
  // field is stretched eight to one along v, which the material shader maps to
  // world up. An isotropic blob field was the single most artificial thing
  // about the previous pass — it read as camouflage paint, because round soft
  // patches are exactly what weathering never produces.
  vec2 sp = vec2(16.0, 2.0);
  float streak = fbm2(uv * sp, sp, 4, 0.55, 2.0);
  // Streaks gather below a broken sill or a blocked gutter, not evenly across a
  // facade, so a low-frequency mask decides where they run at all. The mask is
  // deliberately mean: what makes weathering read as weathering is the contrast
  // between a filthy bay and the clean one next to it. Blanket cover at even
  // density is indistinguishable from a noisy texture, and it was making every
  // wall in the town look uniformly mouldy.
  float where = fbm(uv * 2.0 + 41.7, 2.0, 3, 0.5, 2.0);
  float grime = smoothstep(0.62, 0.86, streak) * smoothstep(0.62, 0.82, where);
  // Splashed mud and wind-blown dust do not run; they sit in hard-edged patches.
  // Both layers are needed — runs alone look like a car wash — but this one has to
  // stay the junior partner. At a metre and a half across it lands in exactly the
  // size range the eye reads as disruptive pattern, so any real strength turns
  // every wall into camouflage, and it was doing precisely that on the interior
  // piers where there is no weather to have put it there.
  float blot = smoothstep(0.74, 0.92, fbm(uv * 9.0 + 11.3, 9.0, 4, 0.5, 2.0));
  grime = clamp(grime + blot * 0.34, 0.0, 1.0);

  // B: dampness and polish, decorrelated from both of the above.
  float damp = fbm(uv * 5.0 + 27.1, 5.0, 3, 0.5, 2.0);

  s.albedo = vec3(tone, grime, contrast(damp, 1.3));
  s.height = 0.5;
  s.roughness = 0.5;
  s.metalness = 0.0;
  s.ao = 1.0;
  return s;
}
`;

export class MaterialLibrary {
  private readonly forge: TextureForge;
  private readonly materials = new Map<string, THREE.MeshStandardMaterial>();
  private readonly mapsCache = new Map<MaterialKey, MaterialMaps>();
  private detailNormal: THREE.Texture | null = null;
  private macroField: THREE.Texture | null = null;
  readonly surfaceOf = new Map<THREE.Material, SurfaceKind>();

  constructor(renderer: THREE.WebGLRenderer) {
    this.forge = new TextureForge(renderer);
  }

  /** Bakes the shared detail and macro fields. Call once during load. */
  init(): void {
    this.detailNormal = this.forge.bake('detail', DETAIL_SURFACE, {
      size: 512,
      seed: 991,
      tileMetres: DETAIL_BAKE_TILE,
      heightMetres: DETAIL_BAKE_RELIEF,
      aoStrength: 0,
      toksvig: 0,
    }).normalMap;

    this.macroField = this.forge.bake('macro', MACRO_SURFACE, {
      size: 256,
      seed: 617,
      tileMetres: 1,
      heightMetres: 0.001,
      albedoLinear: true,
      aoStrength: 0,
      toksvig: 0,
    }).map;
  }

  maps(key: MaterialKey): MaterialMaps {
    let m = this.mapsCache.get(key);
    if (!m) {
      const spec = SPECS[key];
      m = this.forge.bake(key, spec.glsl, {
        size: QUALITY.textureSize,
        tileMetres: spec.tileMetres,
        ...spec.opts,
      });
      this.mapsCache.set(key, m);
    }
    return m;
  }

  /**
   * Returns a shared material for a surface at a given world scale.
   * `scale` multiplies the physical tile size — larger values stretch the
   * texture, smaller values tighten it.
   */
  get(
    key: MaterialKey,
    opts: {
      scale?: number;
      /** Overrides the world-metres-per-tile from the spec. */
      tileMetres?: number;
      color?: THREE.ColorRepresentation;
      roughness?: number;
      metalness?: number;
      normalScale?: number;
      emissive?: THREE.ColorRepresentation;
      emissiveIntensity?: number;
      transparent?: boolean;
      opacity?: number;
      side?: THREE.Side;
      /** Uniform UV repeat override; when set, tileMetres is ignored. */
      repeat?: [number, number];
    } = {},
  ): THREE.MeshStandardMaterial {
    const spec = SPECS[key];
    const cacheKey = `${key}|${JSON.stringify(opts)}`;
    const hit = this.materials.get(cacheKey);
    if (hit) return hit;

    const maps = this.maps(key);
    const mat = new THREE.MeshStandardMaterial({
      map: maps.map,
      normalMap: maps.normalMap,
      roughnessMap: maps.roughnessMap,
      metalnessMap: maps.metalnessMap,
      aoMap: maps.aoMap,
      ...spec.material,
      color: opts.color ?? 0xffffff,
      side: opts.side ?? THREE.FrontSide,
      transparent: opts.transparent ?? false,
      opacity: opts.opacity ?? 1,
      emissive: opts.emissive ?? 0x000000,
      emissiveIntensity: opts.emissiveIntensity ?? 1,
      envMapIntensity: 1,
      dithering: true,
    });

    if (opts.roughness !== undefined) mat.roughness = opts.roughness;
    if (opts.metalness !== undefined) mat.metalness = opts.metalness;
    mat.normalScale.setScalar(opts.normalScale ?? 1);
    mat.aoMapIntensity = 1;

    // Repeat is baked into the material rather than the texture so the same
    // texture object can be shared at many world scales.
    const tile = opts.tileMetres ?? spec.tileMetres;
    const s = (opts.scale ?? 1) / Math.max(tile, 0.01);
    if (opts.repeat) {
      mat.map!.repeat.set(opts.repeat[0], opts.repeat[1]);
    }
    mat.userData.uvScale = s;
    mat.userData.materialKey = key;
    mat.userData.tileMetres = tile;

    this.attachSurfaceShader(mat, spec);

    this.surfaceOf.set(mat, spec.surface);
    this.materials.set(cacheKey, mat);
    return mat;
  }

  /**
   * Everything that cannot be expressed in a baked texture, injected into the
   * stock physical shader:
   *
   *  - the gamma-2.0 decode for the albedo map;
   *  - object-space macro variation, which breaks the per-box UV repeat;
   *  - a tightly tiled detail normal blended with reoriented normal mapping
   *    (Barré-Brisebois & Hill) — naive additive blending flattens the base
   *    normal, RNM rotates the detail into the base's frame and keeps both;
   *  - Tokuyoshi & Kaplanyan specular anti-aliasing, which widens the specular
   *    lobe by however much the shading normal is changing inside the pixel.
   *    Without it every sharp material glitters along its silhouette.
   */
  private attachSurfaceShader(mat: THREE.MeshStandardMaterial, spec: MaterialSpec): void {
    const detail = this.detailNormal;
    const macro = this.macroField;
    if (!detail || !macro) return;

    mat.onBeforeCompile = (shader) => {
      shader.uniforms.tDetailNormal = { value: detail };
      shader.uniforms.tMacroField = { value: macro };
      shader.uniforms.uDetailScale = {
        value: spec.tileMetres / Math.max(spec.detailMetres, 1e-3),
      };
      // Undo the reference tile's slope and impose the material's own.
      shader.uniforms.uDetailStrength = {
        value: Math.min(
          1,
          spec.detailRelief /
            Math.max(spec.detailMetres, 1e-4) /
            (DETAIL_BAKE_RELIEF / DETAIL_BAKE_TILE),
        ),
      };
      shader.uniforms.uDetailShade = { value: spec.detailShade };
      shader.uniforms.uDetailFade = { value: new THREE.Vector2(4.0, 22.0) };
      shader.uniforms.uMacroScale = { value: 1 / Math.max(spec.macroMetres, 0.05) };
      shader.uniforms.uMacroTint = { value: new THREE.Color(spec.macroTint) };
      shader.uniforms.uMacroAmount = {
        value: new THREE.Vector4(...spec.macroAmount),
      };

      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
           varying vec3 obWorldPos;
           varying vec3 obWorldNrm;`,
        )
        .replace(
          '#include <defaultnormal_vertex>',
          `#include <defaultnormal_vertex>
           obWorldNrm = normalize( mat3( modelMatrix ) * objectNormal );`,
        )
        .replace(
          '#include <project_vertex>',
          `#include <project_vertex>
           obWorldPos = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;`,
        );

      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <normalmap_pars_fragment>',
          `#include <normalmap_pars_fragment>
           uniform sampler2D tDetailNormal;
           uniform sampler2D tMacroField;
           uniform float uDetailScale;
           uniform float uDetailStrength;
           uniform float uDetailShade;
           uniform vec2  uDetailFade;
           uniform float uMacroScale;
           uniform vec3  uMacroTint;
           uniform vec4  uMacroAmount;
           varying vec3 obWorldPos;
           varying vec3 obWorldNrm;

           vec3 obBlendRNM( vec3 base, vec3 det ) {
             vec3 t = base + vec3( 0.0, 0.0, 1.0 );
             vec3 u = det * vec3( -1.0, -1.0, 1.0 );
             return normalize( t * dot( t, u ) - u * t.z );
           }

           // Project world position onto whichever plane the surface most
           // faces. World space rather than object space so the field is
           // continuous across separate meshes, and oriented so the field's v
           // axis is world up on every wall — which is what lets the baked
           // streaks actually run downhill.
           vec2 obMacroUv() {
             vec3 an = abs( obWorldNrm );
             if ( an.y >= an.x && an.y >= an.z ) return obWorldPos.xz;
             if ( an.x >= an.z ) return obWorldPos.zy;
             return obWorldPos.xy;
           }`,
        )
        .replace(
          '#include <map_fragment>',
          `vec2 obMUv = obMacroUv() * uMacroScale;
           vec4 obMacro = texture2D( tMacroField, obMUv );
           // A second octave of the same field, three and a half times finer. One
           // octave at the material's macro scale is a nineteen-metre blob on a
           // facade and a twenty-one-metre one on a roof deck, which is to say
           // roughly a constant over anything a player is standing on: a roof came
           // out an even card of grey however much tonal range was authored into
           // it. Drifts of sand across a deck, or the patchiness of a wash down a
           // wall, live between about two and six metres, and that band was simply
           // missing from every surface in the game.
           vec4 obMacro2 = texture2D( tMacroField, obMUv * 3.5 + 0.37 );
           // Only things water can run down get streaked.
           float obVert = 1.0 - abs( obWorldNrm.y );
           float obUp = max( 0.0, obWorldNrm.y );
           // The splash zone: rain coming off the ground throws grit about a
           // metre and a half up every wall there has ever been. Its absence is
           // one of those defects that reads as "untextured" without anyone
           // being able to name it.
           float obSplash = obVert * ( 1.0 - smoothstep( 0.1, 1.6, obWorldPos.y ) )
                            * uMacroAmount.w;
           // Dust settles on everything that faces the sky. Roof decks, ledges
           // and sills are the dirtiest surfaces in a desert town; leaving them
           // the same clean grey as the walls is what made the roof read as a
           // municipal car park.
           // Where the sand has actually collected is a two-to-six metre pattern,
           // so it comes off the fine octave. It is also drift rather than film: a
           // deck is bare in the places the wind scours and heaped where it does
           // not, which is a contrasty mask and not a wash.
           float obDrift = smoothstep( 0.30, 0.72, obMacro2.r * 0.7 + obMacro.g * 0.3 );
           float obDust = obUp * obUp * uMacroAmount.w * ( 0.35 + obDrift * 0.9 );
           float obGrime = clamp( obMacro.g * mix( 0.5, 1.0, obVert )
                                  + ( obMacro2.g - 0.5 ) * 0.7
                                  + obSplash * ( 0.45 + obMacro.g * 0.55 )
                                  + obDust * ( 0.3 + obMacro.g * 0.7 ), 0.0, 1.0 );
           #ifdef USE_MAP
             vec4 obTex = texture2D( map, vMapUv );
             // Albedo is stored gamma-2.0 encoded to keep the darks out of the
             // 8-bit gutter; square it to get back to linear.
             obTex.rgb *= obTex.rgb;
             diffuseColor *= obTex;
           #endif
           diffuseColor.rgb *= 1.0 + ( obMacro.r - 0.5 ) * 2.0 * uMacroAmount.x
                                   + ( obMacro2.r - 0.5 ) * 1.1 * uMacroAmount.x;
           diffuseColor.rgb = mix( diffuseColor.rgb, diffuseColor.rgb * uMacroTint,
                                   obGrime * uMacroAmount.y );
           diffuseColor.rgb *= 1.0 - obSplash * 0.14;
           // Settled dust is a covering layer rather than a stain: it hides what
           // is under it, and it is paler and warmer than most of what it lands
           // on, so it cannot be a multiply like the streaking is.
           // The tint at 0.6 was 0.24 linear, which is what the concrete under it
           // already measured — so the layer covered the slab in something the same
           // brightness as the slab. Wind-blown fines are markedly paler than
           // anything they land on, and that step is the only thing that puts real
           // structure on a horizontal surface once the tone curve has compressed
           // everything above about 0.7 into the same value.
           diffuseColor.rgb = mix( diffuseColor.rgb, uMacroTint * 0.95,
                                   obDust * ( 0.16 + obDrift * 0.42 ) );`,

        )
        .replace(
          '#include <roughnessmap_fragment>',
          `#include <roughnessmap_fragment>
           // Grime is porous: wherever it has collected the surface is rougher,
           // which is what stops the staining from reading as a decal.
           roughnessFactor = clamp( roughnessFactor
             + ( obMacro.b - 0.5 ) * 2.0 * uMacroAmount.z
             + obGrime * uMacroAmount.z * 0.7, 0.04, 1.0 );`,
        )
        .replace(
          'vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;',
          `vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
           {
             // Detail fades out with range: past twenty metres it contributes
             // nothing but aliasing, and it costs a fetch on every pixel.
             float obDist = length( vViewPosition );
             float obFade = 1.0 - smoothstep( uDetailFade.x, uDetailFade.y, obDist );
             if ( obFade > 0.004 ) {
               vec4 obDet = texture2D( tDetailNormal, vNormalMapUv * uDetailScale );
               vec3 obN = obDet.xyz * 2.0 - 1.0;
               obN.xy *= uDetailStrength * obFade;
               mapN = obBlendRNM( mapN, normalize( obN ) );
               // The same height field shades the micro relief, so pits read as
               // darker and rougher rather than merely bumpy.
               float obMicro = ( obDet.a - 0.5 ) * obFade;
               diffuseColor.rgb *= 1.0 + obMicro * uDetailShade;
               roughnessFactor = clamp( roughnessFactor - obMicro * uDetailShade * 0.8,
                                        0.04, 1.0 );
             }
           }`,
        )
        .replace(
          '#include <lights_physical_fragment>',
          `{
             // Tokuyoshi & Kaplanyan: the variance of the shading normal inside
             // a pixel is exactly equivalent to extra roughness, so fold it in
             // instead of letting it alias.
             vec3 obNdx = dFdx( normal );
             vec3 obNdy = dFdy( normal );
             float obVar = 0.25 * ( dot( obNdx, obNdx ) + dot( obNdy, obNdy ) );
             roughnessFactor = min( sqrt( roughnessFactor * roughnessFactor
                                          + min( 2.0 * obVar, 0.28 ) ), 1.0 );
           }
           #include <lights_physical_fragment>`,
        );

      mat.userData.shader = shader;
    };
    // Every material generates identical code and differs only in uniforms, so
    // they can all share one compiled program.
    mat.customProgramCacheKey = () => 'ob-surface-v2';
  }

  surfaceKind(mat: THREE.Material | THREE.Material[] | null | undefined): SurfaceKind {
    if (!mat) return 'concrete';
    const m = Array.isArray(mat) ? mat[0] : mat;
    return this.surfaceOf.get(m) ?? 'concrete';
  }

  dispose(): void {
    for (const m of this.materials.values()) m.dispose();
    this.materials.clear();
    this.forge.dispose();
  }
}
