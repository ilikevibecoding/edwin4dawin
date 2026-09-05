# Rubric 5 — Render quality: the "4K Minecraft with shaders" look

The user's words: "up the quality of your blocks, up the quality of how the Minecraft blocks look, the lighting, the
shade, everything needs to look increasingly like 4K." The reference look is Minecraft running a high-resolution
resource pack (Faithful 64x / Patrix style: still pixel art, still readable at block scale, but with real material
detail) under a shader pack (SEUS / BSL style: sun shadows, bloom on emissive blocks, filmic tone mapping, specular
on glass, metal and water, atmospheric sky). It must stay Minecraft: crisp texels, no smooth "realistic" textures, no
photo textures, cube faces still read as cube faces.

## Acceptance criteria

| # | Criterion | Measure |
| --- | --- | --- |
| 1 | HD block textures: every tile is authored at 64x64 (4x the old 16x16) with material-class detail (wood grain, stone chips, brushed metal, panel seams and bevels, glass reflections, fabric weave, leaf clusters); the 16x16 pixel layout stays recognisable (a Minecraft player still identifies each block instantly); NearestFilter preserved, per-tile mipmaps regenerated | Contact-sheet PNG of all tiles at 16 vs 64; critic verdict |
| 2 | Per-pixel material response: normal map (from a height field per tile) and material map (roughness, metalness, emissive) drive lighting; sun/moon direction gives a visible directional bump on stone/wood/plating; chrome/durasteel/steel glass/water show a specular highlight that moves with the camera; emissive blocks (glow panels, lamps, magma, holo signs, lit windows, torch flames) glow without depending on the light map | Screenshots at three times of day; shader compiles on WebGL2 without warnings |
| 3 | Sun shadows: cascaded shadow maps from the sun/moon (2 cascades: 0-48 blocks sharp, 48-160 blocks soft) with PCF filtering; towers cast long shadows across the Coruscant boulevards, the saloon porch shades the boardwalk, NPC/animals/vehicles cast and receive; no acne, no peter-panning larger than 0.15 blocks, no visible cascade seam in motion; shadow strength blends with the sky light so caves and interiors do not double-darken | Recording of a day cycle at 8x speed; critic verdict |
| 4 | HDR post: render to a half-float target; bloom (threshold on emissive/specular highlights, 5 mip blur, max +0.35 brightness contribution); ACES filmic tone mapping with exposure keyed to time of day (night exposure raised so Coruscant reads as a lit city, not black); subtle vignette; optional FXAA when antialias is off. Bloom must not haze the whole screen: a daytime frontier screenshot has < 2% of pixels changed by more than 8/255 outside emissive/specular regions | Screenshot pairs with post on/off; pixel diff numbers |
| 5 | Sky and atmosphere: physically-flavoured gradient (Rayleigh-ish blue at zenith, Mie-ish warm horizon at low sun), sun disc with glow, moon with phase, stars with twinkle, aerial perspective fog tinted toward the sun at dawn/dusk; Coruscant keeps its cloudless haze with a warm city-glow horizon band at night; space stays black | Screenshots at dawn, noon, dusk, midnight in the frontier and in Coruscant |
| 6 | Water: animated normals (two scrolling wave layers), Fresnel-weighted sky reflection, specular sun glint, depth-tinted transparency; the tsunami crest mesh keeps its own look but picks up the same specular | Recording of the shoreline and a flood |
| 7 | Quality presets scale the whole stack: Cinematic = everything on (shadows 2048px per cascade, bloom, HD textures, normal/material maps, FXAA); Balanced = shadows 1024px single cascade, bloom on, HD textures, no FXAA; Light = no shadows, no bloom, HD colour atlas only. Presets switch live without reload; a SwiftShader/llvmpipe renderer string auto-selects Light on first run | Panel toggle recording; `?quality=` URL param |
| 8 | Performance: on a real GPU (not SwiftShader) Cinematic at view distance 10 in the western town holds >= 60 fps at 1080p and >= 45 fps at 1440p; on SwiftShader the Light preset is within 15% of the pre-rubric frame time (measured by `scripts/bench.mjs`); GPU memory added by shadows + HDR + HD atlases <= 160 MB; the shadow pass draws only chunks inside the cascade frusta | Bench JSON before/after per preset committed under `bench/` |
| 9 | No visual regressions: block edits, cracks, selection box, hand item, particles, debris, speech bubbles, HUD, admin panel, F3 overlay all render exactly as before in the Light preset; disasters' sky/fog/flash overrides still work under the new sky and tone mapping | Existing screenshot tests + a critic pass on all three disasters |
| 10 | Determinism/multiplayer untouched: none of this touches the simulation, block data, light propagation results, or the network protocol | `npm test` green; mp-test green |

## Design notes

- Vertex layout in `src/mesher.js` is tight (uint8 light pairs + shade index). Add a face-direction (3 bits) where
  needed for tangent frames rather than full normals; everything else can be derived in the fragment shader.
- Shadow sampling belongs in a shared GLSL chunk used by the world material, water material, entity material,
  voxel-vehicle material and the debris instanced material so every surface agrees on where the shadow falls.
- The light map stays authoritative for interiors: shadow = mix(1, shadowSample, skyLightAtVertex) so a room lit only
  by lamps is not darkened again by the sun's shadow map.
- Emissive: material map B channel. Emissive tiles are not affected by shadows or the sky light, but are still fogged.
- Colored block light (RGB propagation) is explicitly out of scope for this round; note it as a follow-up.
- Everything is procedural and generated at load; no image assets are added to the repo.
