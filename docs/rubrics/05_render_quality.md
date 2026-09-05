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

## Status / decisions (R1)

Branch `cursor/render-shaders-54d6`. R1 owns criteria 2 (shader side), 3-10; criterion 1 (64x tiles) and the
normal/material atlases come from R2 through `setMaterialMaps()` in `src/render/materialMaps.js`. Everything below
was measured on the SwiftShader VM with `scripts/render-measure.mjs`, `scripts/bench.mjs` and `scripts/shots.mjs`.

### Where things live

| Piece | File | Notes |
| --- | --- | --- |
| Face direction attribute | `src/mesher.js` | `aFace` uint8 on every quad path (cube faces, special shapes; cross/diagonal quads pick the nearest axis). Water top faces pack the column depth in bits 3-7 (`dir | depth << 3`, depth 0..31); geometry without the attribute gets 255 in the shadow pass (no alpha test). |
| Shared shading chunk | `src/render/shading.js` | `SHADING_UNIFORMS` (one instance of every uniform), `SKY_GLSL` (`skyGradient`), `SHADING_PARS` (`sunShadow`, `sunLight`, `shadingLight`, `sunSpecular`, `fogColorDir`), `bindShading(material)`, `setShadingDefines()`, `SHADOW_LAYER` / `SHADOW_LAYER_NEAR`. |
| Material maps contract | `src/render/materialMaps.js` | `getMaterialMaps()`, `setMaterialMaps(normal, material)`, `onMaterialMaps(fn)`, `bindMaterialMaps(material)`; 1x1 placeholders (normal 128/128/255, material 230/0/0/255). Dev aids: `?normaltest=1` (raised-square normal atlas for the sign check), `?matdebug=1` (maps derived from the colour atlas + block names). |
| World / water shaders | `src/terrain.js` | `FANCY` define = per-pixel path (tangent frame from `aFace`, material maps, sun + shadows, GGX-lite specular, Schlick Fresnel, sky reflection, emissive `albedo * B * 2.2`, directional fog); `FANCY 0` = the pre-rubric shader byte for byte. Water: two procedural wave layers, Fresnel sky reflection, sun glint, depth tint from `aFace`. |
| Cascaded shadows | `src/render/shadows.js` | Two texel-snapped ortho cascades (48 / 160 blocks; single 64-block cascade on Balanced), depth-only override material alpha-tested through the atlas, exact chunk AABB culling against the view slice swept toward the light, entity casters (near cascade only) discovered every frame from `castShadow` / `userData.shadowCaster` / `material.userData.shadowCaster`. |
| HDR post | `src/render/post.js` | Half-float scene target with a sampleable depth texture, 5-level bloom (bright pass with knee, capped at +0.35), ACES + exposure in linear light (`pow(c, 2.2)` in, `pow(1/2.2)` out so the LinearSRGB-tuned shaders keep their mid-tones), vignette 0.14, depth-gated FXAA. |
| Pipeline | `src/render/pipeline.js` | Per-frame sun/moon/ambient uniforms, cascades, post; `applyPreset(q)`, `setQuality(name)`, `readback()` for the scripts. `game.pipeline` is created after `setupEntities()`; `game.js` only constructs it, calls `render()`, and forwards `setSize()` (6 lines changed). |
| Sky | `src/sky.js` | Rayleigh/Mie-flavoured gradient shared with fog and reflections, HDR sun disc + glow, moon with phase, twinkling stars, 22 degree orbit tilt; `applyRegion` / `applyOverride` kept. |
| Presets | `src/quality.js` | `post`, `shadows`, `shadowRes`, `bloom`, `fxaa`, `materialMaps` per preset; `isSoftwareRenderer()`; `applyQuality()` switches the render stack live through `game.pipeline.applyPreset`. |
| Scripts | `scripts/render-measure.mjs`, `scripts/shots.mjs`, `scripts/bench.mjs` | Luminance ratios / exposure bisection / bloom guard / memory; verification screenshots with console capture; frame bench. |

### Criterion status

| # | Status | Evidence / notes |
| --- | --- | --- |
| 2 | Done (shader side) | Sign convention verified with `?normaltest=1` (sun-facing edge of the raised square lit). With the flat placeholders the world renders with the geometric normal and roughness 0.9, so bumps/specular/emissive appear as soon as R2 calls `setMaterialMaps`. `?matdebug=1` shows the full path today (metal/glass/water highlights, lamp emissive). Shader compiles clean on WebGL2 (0 console warnings in every `shots.mjs` run). |
| 3 | Done | Both cascades verified with a raw-shadow-factor probe; PCF 3x3 soft edges; NPC/animal casters into the near cascade; no acne at noon or at 0.25 / 0.74 (slope-scaled bias + normal offset); cascade blend 80-96 % of each radius. Interiors: `sunLight` is gated by the vertex sky light so lamp-lit rooms are never darkened twice. Not done: an 8x day-cycle recording (SwiftShader runs 2-8 fps; verified from stills at four times instead). |
| 4 | Done | Bloom guard at noon: 0.000 % of pixels outside the dilated (24 px) source regions change by > 8/255 (3 of 805 771; max diff 10). Mean luminance noon Cinematic / Light = 0.989 (sky 1.001, sunlit ground 1.011). Night exposure 1.75 vs day 1.2. FXAA is gated by the depth buffer (see decisions): 2.9 % of pixels change when toggled, all on geometric edges; texels inside a face are untouched. |
| 5 | Done | Frontier at 0.25 / 0.5 / 0.74 / 0.0 and Coruscant noon / night shots; space stays black (`applyRegion` untouched); Coruscant keeps its grey-brown haze with a sodium band on the horizon at night; tornado storm deck, tsunami storm + underwater fog and beam flash verified by forcing `effects.setEnvironment` / `effects.flash` values (the simulation is too slow on SwiftShader for the 10 s shots to show much), and again live: tornado and tsunami started through `game.disasters.command` and left running 90 s (storm deck over the town; player submerged in the flood with the underwater fog, swept NPCs floating). |
| 6 | Done (water) | Wave normals, Fresnel reflection, glint and depth tint in `WATER_FRAG`. The tsunami crest keeps its own shader; the recipe to give it the same specular is below (integrator). |
| 7 | Done | Live switching cinematic -> light -> balanced -> cinematic -> light in one page: 0 exceptions, cascades/res/bloom/FXAA/material maps follow the preset, frame mean within 1 % across presets. Fresh profile on SwiftShader starts on Light (`?quality=` and localStorage still win). Admin panel unchanged (it reads `QUALITY` labels). |
| 8 | Measured (see table) | Light preset draws the same calls as before (146 vs 146) through the legacy path; interleaved A/B numbers below. GPU memory added on Cinematic: 58.6 MB (shadows 40 MB, post 18.6 MB at 1280x713) - the HD atlases are R2's. Shadow pass draws only chunks whose AABB intersects the swept view slice (Cinematic 144 chunk + 59 object draws for 374 loaded chunks). Real-GPU fps could not be measured on this VM. |
| 9 | Done | Light preset is the untouched direct path (`FANCY 0`, no HDR target, HUD drawn after); on Balanced/Cinematic the HUD is still drawn by `game.js` after the pipeline. Disaster overrides verified (criterion 5). |
| 10 | Done | `npm test` green; no changes to block data, light propagation, simulation or network. |

### Measurements

Frame bench (`scripts/bench.mjs`, town `x=-8 z=2 time=0.45`, 25 s, SwiftShader - GPU-side numbers are not
representative, "js" includes the driver stalls of the software rasterizer):

| Preset | Before: frame / js / draw calls | After: frame / js / draw calls |
| --- | --- | --- |
| Light | 224 ms / 6.3 ms / 146 | 134 ms / 3.8 ms / 146 |
| Balanced | 239 ms / 9.0 ms / 175 | 573 ms / 47.8 ms / 327 |
| Cinematic | 256 ms / 15.5 ms / 198 | 574 ms / 13.5 ms / 408 |

The "before" column was taken hours earlier under a different machine load, so the Light row was re-measured as an
interleaved A/B in one session (`bench/r1_ab_light.json`: pre-rubric tree on :5217 vs this branch on :5207, two
rounds each): before 105.3 ms frame / 3.75 ms js / 146.2 draw calls, after 93.5 ms / 3.35 ms / 146.2 - ratio 0.89 /
0.89 / 1.00, i.e. within the run-to-run noise (criterion 8's 15 % bound holds; the Light path is the untouched direct
render). Balanced/Cinematic frame times double on SwiftShader because the shadow pass and the post chain run on the
CPU rasterizer; the comparable figure is the draw-call count (+150 / +210 for the shadow pass and post passes).

Luminance (`bench/r1_measure.json`, ratio Cinematic / Light of the same frame): noon mean 0.989 (sky 1.001, ground
1.011); dawn 0.25 mean 1.09 (sky 1.16, ground patch 0.80 - long shadows); dusk 0.74 mean 1.07. The rubric fixes the
noon figure; dawn/dusk are the deliberate filmic look (brighter sky, longer shadows).

### Decisions

- Lighting budget: the lightmap's sky light is split into an ambient share `uAmbientK` and a directional share
  (`SUN_STRENGTH 0.44`, wrapped N.L with `SUN_WRAP 0.7`). Noon lands on `AMBIENT_K 0.52`; as the directional light
  weakens (low sun, moon at 0.10, storm deck: `skyLightMul * (1 - skyMix)`) the pipeline moves `uAmbientK` toward 1 so
  the frame never darkens twice. Shade is tinted slightly cool (`SHADE_TINT`) against a warm noon sun; the sum stays
  neutral. The vanilla per-face shade is lifted 40 % of the way toward flat on the fancy path (`FACE_FLATTEN`) because
  the sun now does that job per pixel; AO stays.
- Exposure: `dayExposure 1.2` was bisected so the noon town frame matches the pre-rubric mean; `nightExposure 1.75`
  so lit cities read as lit. The sky dome, fog and reflections are pre-divided by the lift (`uSkyGain`) so authored
  night/dusk sky colours come out as authored while the ground gets the full lift.
- Tone mapping runs in linear light on the gamma-shaped shader values (`pow(c, 2.2)`, ACES, `pow(1/2.2)`) and the
  renderer stays on `LinearSRGBColorSpace`: mid-tones keep the old look, only highlights roll off filmically.
- FXAA only touches geometric edges: the scene depth (a `DepthTexture` on the HDR target) gates the filter through its
  second difference, which is ~0 across a flat face and jumps at silhouettes and creases. To keep the world depth for
  that mask the hand is drawn through `gl.depthRange(0, 0.05)` instead of a depth clear (three.js never sets the depth
  range itself); a world pixel would have to be closer than 0.053 blocks (near plane 0.05) to occlude the hand.
- Entities cast only into the near cascade; the far cascade is chunk geometry only (their far shadows are a few texels
  and they are most of the draw calls).
- Coruscant night glow is a band (`exp(-7|y|)`) on the horizon plus a light fog tint; the haze itself stays the old
  grey-brown (ACES already warms it a little).
- Light preset = the exact pre-rubric render path (direct to canvas, `FANCY 0`), so weak machines and the regression
  guarantee of criterion 9 share one code path.

### Integrator wiring (materials R1 could not edit)

All three materials already share `SHARED.uSkyLight / uSkyTint / uFogColor / uFogNear / uFogFar / uFlash` from
`src/entityMaterial.js`; the recipe adds the sun, its shadows and (optionally) specular through the shared chunk.
`src/entityMaterial.js` is the worked example (`#if FANCY` blocks, `bindShading`, `userData.shadowCaster`).

1. `src/disasters/debris.js` (`DebrisSystem.material`, InstancedMesh):
   - vertex shader: add `#if FANCY varying vec3 vWorldPos; varying vec3 vNormal; #endif`; inside `main()` after `n`
     is computed: `#if FANCY vWorldPos = (modelMatrix * instanceMatrix * vec4(position, 1.0)).xyz; vNormal = n; #endif`.
   - fragment shader: declare the same varyings under `#if FANCY` and paste `${SHADING_PARS}` (import
     `SHADING_PARS, bindShading` from `../render/shading.js`) above `main()`; replace
     `vec3 light = max(vec3(sky) * uSkyTint, vec3(blk) * vec3(1.0, 0.9, 0.72));` by
     ```glsl
     #if FANCY
       vec3 light = shadingLight(vec3(sky) * uSkyTint, vec3(blk) * vec3(1.0, 0.9, 0.72), vWorldPos, normalize(vNormal), lightCurve(vLight.x), vDist);
       vec3 fogC = fogColorDir(uFogColor, normalize(vWorldPos - uCamPos));
     #else
       vec3 light = max(vec3(sky) * uSkyTint, vec3(blk) * vec3(1.0, 0.9, 0.72));
       vec3 fogC = uFogColor;
     #endif
     ```
     and fog with `fogC` instead of `uFogColor`.
   - material: `defines: { FANCY: 0 }` in the `ShaderMaterial` options, then `bindShading(this.material)`. The pipeline
     already registers `game.disasters.debris.mesh` as a shadow caster (`shadows.addCaster`), so debris cast as soon
     as the material is bound; nothing else to do. Casting works today even without the shader change.
2. `src/vehicles/voxelMesh.js` (`voxelMaterial(atlas)`): same recipe (no `instanceMatrix`:
   `vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz`). The geometry has no normal attribute; either emit one in
   `buildVoxelGeometry` from `FACES[].n` or derive it per pixel with
   `vec3 N = normalize(cross(dFdx(vWorldPos), dFdy(vWorldPos)));` (flat cube faces, WebGL2 has derivatives). Use
   `lightCurve(uLight.x)` as the `skyVis` argument. Mark every vehicle mesh `mesh.castShadow = true` (or set
   `material.userData.shadowCaster = true` once) - the shadow pass picks the flag up every frame, no reparenting.
   Optional metal highlight: `col += sunSpecular(vWorldPos, N, N, normalize(uCamPos - vWorldPos), 0.35, 0.8, tex.rgb, lightCurve(uLight.x), vDist) * vShade;`.
3. `src/disasters/tsunami/crestMesh.js` (`VoxelCrest.material`): same recipe with `N = vec3(0.0, 1.0, 0.0)` for the
   lit term (the crest is a stepped water surface; `aShade` already darkens its sides) and the water specular:
   `col += sunSpecular(vWorldPos, N, N, V, 0.2, 0.0, vec3(1.0), lightCurve(vLight.x), vDist) * 0.6;` with
   `vec3 V = normalize(uCamPos - vWorldPos)`. Do not flag the crest as a caster (it is translucent and moves every
   tick; a moving 12-block shadow reads as a glitch).
4. Anything else with a `ShaderMaterial` that should be shaded: same three steps (varyings, `shadingLight`,
   `bindShading` + `defines.FANCY`). The `FANCY` define is flipped by `setShadingDefines` for every bound material
   that declares it, so the Light preset never compiles these paths. Materials that only want to cast: set
   `object.castShadow = true` or `userData.shadowCaster = true`; alpha-tested casting through the atlas is automatic for
   chunk geometry only (other casters draw solid).

### Known gaps

- Normal/material atlases: flat placeholders until R2's `setMaterialMaps` call lands; the derived `?matdebug=1` maps
  are a dev aid, not shipping content.
- Real-GPU performance (criterion 8's 60 fps @ 1080p) is unmeasured here (SwiftShader only). Draw calls roughly
  double on Cinematic (shadow pass); the post chain is a bright pass, 4 downsamples and 4 upsamples (half resolution
  and below), the composite and optionally FXAA.
- Shadows on the debris / vehicles / crest surfaces need the wiring above; they already receive nothing and the debris
  already casts.
- Clouds do not cast shadows and are not tone-mapped differently from before; the cloud deck still uses
  `MeshBasicMaterial`.
- The 8x day-cycle recording of criterion 3 and the panel-toggle recording of criterion 7 were replaced by CDP
  stills and a scripted live-switch check because of the software rasterizer.
- Dawn/dusk frames are ~7-9 % brighter in the mean than the pre-rubric look (brighter filmic sky); noon is within 1.1 %.
