# Scene census r2veg

Build `1f95ffa+` (2026-09-04 14:20Z), quality `fast`, 1280x720, renderer `WebKit WebGL` (WebGL 2.0 (OpenGL ES 3.0 Chromium)). Measured 2026-09-04T15:35:05.155Z from `http://127.0.0.1:5208/?quality=fast` by `tools/census.mjs`.

Every number below is measured: from a hook on `renderer.renderBufferDirect` during one rendered frame per view, from `renderer.info`, from `renderer.properties`, or from the objects themselves. The only estimates are GPU texture bytes (width x height x bytes/texel x 4/3 when mipmapped) and geometry bytes (attribute byte lengths), and they are labelled. Frame times are not reported: this machine rasterises in software.

Groups are the top-level scene children and the module that built them: `terrain`, `forest`, `vehicle` (the truck), `camp`, `fleet`, `wildlife`, `roadside`, `sky` (dome, headlamp beams, light shafts and dust motes from sky.js), `dust` (wheel dust), `post` (compositor passes), `shadow` (the renderer's own depth materials).

## Headline

| view | draw calls (renderer.info) | beauty calls | shadow calls | AO G-buffer calls | post calls | triangles (renderer.info) | beauty tris | instanced tris | regular tris | beauty tris inside frustum | shadow tris | AO G-buffer tris | programs (cumulative) | textures | geometries | visible objects | visible instances |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| hero | 544 | 368 | 176 | 159 | 23 | 1,926,448 | 1,278,878 | 203,602 | 1,075,276 | 670,338 (52%) | 647,570 | 1,139,986 | 166 | 296 | 344 | 356 | 7,456 |
| mainroad | 615 | 403 | 212 | 203 | 23 | 2,596,904 | 1,649,266 | 226,786 | 1,422,480 | 870,201 (53%) | 947,638 | 1,485,412 | 166 | 305 | 350 | 391 | 9,600 |
| forest | 626 | 450 | 176 | 159 | 23 | 2,008,580 | 1,361,010 | 285,734 | 1,075,276 | 879,306 (65%) | 647,570 | 1,139,986 | 166 | 305 | 350 | 438 | 14,772 |

`renderer.info` counts the shadow-map pass together with the beauty pass; that is the number `debugAPI.stats()` and the perf reports quote (beauty + shadow = renderer.info in every row above). The AO G-buffer is the scene drawn a third time through `MeshNormalMaterial` as `scene.overrideMaterial`; the composer issues that render separately so it is not in `renderer.info`. The GPU therefore rasterises beauty + shadow + G-buffer triangles per frame: hero 3,066,434, mainroad 4,082,316, forest 3,148,566. SSR is off at this quality tier, so its reflector-mask pass does not appear.

Programs: 166 compiled, of which 0 are canvas variants (tone mapping on) that no frame uses because the scene is always drawn into the composer's render target; 166 do the work. JS heap: 465.5 MB after boot, 320.3 MB after the 3 views, reset loops 253.2 MB, 252.8 MB after a forced GC. Textures: 280 objects, est. 306.1 MB. Geometries: 391, est. 145.58 MB.

Note that `hero` and `forest` draw exactly the same set of objects from different cameras: culling in this scene is by whole-object bounding sphere, and nearly every object (terrain, route-long stone mesh, forest-wide instanced meshes, the truck) is large enough to intersect any frustum near the truck. What changes between views is only which camp/fleet/wildlife objects fall inside.

## 1. Shader programs

166 compiled programs after all views (166 straight after boot). 133 are used by exactly one material, 7 by two, 17 by three or more, 9 could not be linked to any material this census could reach (the renderer's own shadow depth materials, PMREM scratch; their `type` says what they are).

### Canvas variants: the boot-time double compile

Three keys a program on `toneMapping` and `outputColorSpace`, which it takes from the *currently bound render target* at compile time: no target bound means the canvas (ACES, sRGB); the composer's target means (none, linear). `main.js` calls `renderer.compile(scene, camera)` with no target bound and then `post.render()`, which draws into the composer's target — so 0 programs are compiled for the canvas, never used by a frame (`currentProgram` for 0 materials), and kept alive in each material's program map; then the same materials compile again for the target. 14 of 205 scene materials carry exactly two programs for this reason. The fix is one line in `main.js` (bind the composer's read buffer before `renderer.compile`, or drop the `compile` and let the warm-up `render` do it) and halves the "Compiling shaders" stage.

| group | programs | canvas variants (unused) | render-target programs | never current | would remain with material names out of cache keys |
| --- | --- | --- | --- | --- | --- |
| terrain | 7 | 0 | 7 | 1 | 7 |
| forest | 7 | 0 | 7 | 1 | 7 |
| vehicle | 60 | 0 | 60 | 5 | 53 |
| camp | 20 | 0 | 20 | 0 | 20 |
| fleet | 30 | 0 | 30 | 3 | 24 |
| wildlife | 8 | 0 | 8 | 1 | 8 |
| roadside | 2 | 0 | 2 | 0 | 2 |
| sky | 5 | 0 | 5 | 0 | 5 |
| dust | 1 | 0 | 1 | 0 | 1 |
| post | 21 | 0 | 21 | 2 | 21 |
| shadow | 6 | 0 | 6 | 6 | 6 |
| unattributed | 3 | 0 | 3 | 3 | 3 |

The last column applies one rule to the 166 working programs: take the material *name* out of every `tag:name:...` segment of `customProgramCacheKey` (the vehicle family's `bw:`, `dirt:`, `cb:`, `cl:`, `gf:`, the fleet's `fleetDirt:`/`sway:`, the tyres' `loadedTyre_name_`) and keep everything else — the numbers those patches bake into GLSL, the map set, the flags. Programs whose keys then agree compile identical GLSL and would be one program: 166 → 153.

Groups of programs that differ only by the material name in the key:

| # | type | programs | groups | materials (names) | shared key after stripping |
| --- | --- | --- | --- | --- | --- |
| 1 | MeshStandardMaterial | 6 | fleet | fleet_rubber, fleet_tread, fleet_rust, fleet_fabric, fleet_vinyl, fleet_vinylFaded | `function (shader, renderer) { if (prev) prev.call(this, shader, render` |
| 2 | MeshPhysicalMaterial | 3 | vehicle | paint, paintDark, paintAccent | `function (shader, renderer) { if (prev) prev.call(this, shader, render` |
| 3 | MeshStandardMaterial | 2 | vehicle | alu, chrome | `function (shader, renderer) { if (prev) prev.call(this, shader, render` |
| 4 | MeshStandardMaterial | 2 | vehicle | decalNumber, decalName | `function (shader, renderer) { if (prev) prev.call(this, shader, render` |
| 5 | MeshStandardMaterial | 2 | vehicle | interiorPlastic, interiorFaded | `function (shader, renderer) { if (prev) prev.call(this, shader, render` |
| 6 | MeshStandardMaterial | 2 | vehicle | tyreLug, tyreCarcass | `loadedTyre_0.05` |
| 7 | MeshStandardMaterial | 2 | vehicle | brakeRotor, caliper | `function (shader, renderer) { if (prev) prev.call(this, shader, render` |
| 8 | MeshPhysicalMaterial | 2 | fleet | fleet_paint, fleet_paintOld | `function (shader, renderer) { if (prev) prev.call(this, shader, render` |

### Programs per group

A program shared by materials in two groups is counted in both; `exclusive` is the number only that group uses.

| group | programs | exclusive | material links | by material type |
| --- | --- | --- | --- | --- |
| terrain | 7 | 7 | 7 | MeshStandardMaterial 3, ShaderMaterial 2, MeshLambertMaterial 2 |
| forest | 7 | 7 | 22 | MeshStandardMaterial 5, MeshLambertMaterial 2 |
| vehicle | 60 | 56 | 73 | MeshStandardMaterial 44, MeshPhysicalMaterial 12, MeshBasicMaterial 4 |
| camp | 20 | 18 | 51 | MeshStandardMaterial 16, ShaderMaterial 4 |
| fleet | 30 | 29 | 39 | MeshStandardMaterial 20, MeshPhysicalMaterial 9, MeshBasicMaterial 1 |
| wildlife | 8 | 7 | 14 | MeshStandardMaterial 5, MeshBasicMaterial 2, MeshPhysicalMaterial 1 |
| roadside | 2 | 2 | 10 | MeshStandardMaterial 2 |
| sky | 5 | 5 | 12 | ShaderMaterial 5 |
| dust | 1 | 1 | 1 | ShaderMaterial 1 |
| post | 21 | 21 | 21 | ShaderMaterial 17, MeshNormalMaterial 3, RawShaderMaterial 1 |
| shadow | 6 | 6 | 0 | MeshDepthMaterial 6 |
| unattributed | 3 | 3 | 0 | MeshBasicMaterial 2, ShaderMaterial 1 |

### Programs by shader and material type

| material type / shader | programs | canvas variants | materials | groups |
| --- | --- | --- | --- | --- |
| MeshStandardMaterial / physical | 92 | 0 | 160 | terrain, forest, vehicle, wildlife, camp, fleet, roadside |
| MeshPhysicalMaterial / physical | 22 | 0 | 24 | vehicle, fleet, wildlife |
| MeshBasicMaterial / basic | 8 | 0 | 7 | vehicle, fleet, wildlife |
| MeshDepthMaterial / depth | 6 | 0 | 0 | - |
| ShaderMaterial / custom(34,35) | 5 | 0 | 5 | post |
| MeshLambertMaterial / lambert | 4 | 0 | 8 | terrain, forest |
| MeshNormalMaterial / normal | 3 | 0 | 3 | post |
| ShaderMaterial / custom(26,27) | 2 | 0 | 2 | post |
| ShaderMaterial / custom(0,1) | 1 | 0 | 1 | sky |
| ShaderMaterial / 2 | 1 | 0 | 0 | - |
| ShaderMaterial / custom(0,4) | 1 | 0 | 1 | sky |
| ShaderMaterial / custom(2,3) | 1 | 0 | 1 | sky |
| ShaderMaterial / custom(5,6) | 1 | 0 | 1 | terrain |
| ShaderMaterial / custom(7,8) | 1 | 0 | 1 | terrain |
| ShaderMaterial / custom(9,10) | 1 | 0 | 1 | camp |
| ShaderMaterial / custom(11,12) | 1 | 0 | 1 | camp |
| ShaderMaterial / custom(13,14) | 1 | 0 | 1 | camp |
| ShaderMaterial / custom(15,16) | 1 | 0 | 1 | camp |
| ShaderMaterial / custom(17,18) | 1 | 0 | 8 | sky |
| ShaderMaterial / custom(19,20) | 1 | 0 | 1 | sky |
| ShaderMaterial / custom(21,22) | 1 | 0 | 1 | dust |
| ShaderMaterial / custom(23,24) | 1 | 0 | 1 | post |
| ShaderMaterial / custom(23,25) | 1 | 0 | 1 | post |
| ShaderMaterial / custom(28,29) | 1 | 0 | 1 | post |
| ShaderMaterial / custom(30,31) | 1 | 0 | 1 | post |
| ShaderMaterial / custom(32,33) | 1 | 0 | 1 | post |
| ShaderMaterial / custom(34,36) | 1 | 0 | 1 | post |
| RawShaderMaterial / custom(37,38) | 1 | 0 | 1 | post |
| ShaderMaterial / custom(30,39) | 1 | 0 | 1 | post |
| ShaderMaterial / custom(40,41) | 1 | 0 | 1 | post |
| ShaderMaterial / custom(42,43) | 1 | 0 | 1 | post |
| ShaderMaterial / custom(44,45) | 1 | 0 | 1 | post |

### Top 20 most-duplicated variants (working programs only)

Programs are clustered by material type plus their `customProgramCacheKey` with every number and uuid blanked out, so programs whose *only* difference is an id inside the key land together, and so do programs with identical `onBeforeCompile` source that differ in a define. `custom keys` is how many distinct custom keys the cluster has (more than one with one head = an id in the key is forking the program: avoidable, that is a uniform), `heads` how many distinct built-in parameter sets (a real define difference; the differing fields are named). `#` in a preview is a blanked number.

| # | type | programs | materials | groups | custom keys | heads | differing params | differing flags | defines | key preview / names |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | MeshStandardMaterial (physical) | 38 | 38 | vehicle,fleet | 38 | 14 | mapUv metalnessMapUv normalMapUv roughnessMapUv aoMapUv emissiveMapUv | normalMapTangentSpace alphaTest doubleSided vertexColors | - | `function (shader, renderer) { if (prev) prev.call(this, shad` — steelDark, trim, alu, steel, gap, trimGloss |
| 2 | MeshStandardMaterial (physical) | 30 | 82 | terrain,forest,vehicle,wildlife,camp,fleet,roadside | 1 | 30 | mapUv aoMapUv normalMapUv roughnessMapUv metalnessMapUv emissiveMapUv | vertexColors dithering instancing instancingColor normalMapTangentSpace alphaTest doubleSided opaque skinning | - | `onBeforeCompile() {}` — decalBadge, amber, headlight, rimMachined, wheelVoid, contactDust |
| 3 | ShaderMaterial (custom(0,1)) | 29 | 36 | sky,terrain,camp,dust,post | 1 | 29 | outputColorSpace toneMapping fogExp2 numDirLights numPointLights numSpotLights numHemiLights numDirLightShadows precision envMapMode envMapCubeUVHeight mapUv alphaMapUv lightMapUv aoMapUv bumpMapUv normalMapUv displacementMapUv emissiveMapUv metalnessMapUv roughnessMapUv anisotropyMapUv clearcoatMapUv clearcoatNormalMapUv clearcoatRoughnessMapUv iridescenceMapUv iridescenceThicknessMapUv sheenColorMapUv sheenRoughnessMapUv specularMapUv specularColorMapUv specularIntensityMapUv transmissionMapUv thicknessMapUv combine sizeAttenuation morphTargetsCount morphAttributeCount numSpotLightMaps numRectAreaLights numPointLightShadows numSpotLightShadows numSpotLightShadowsWithMaps numLightProbes shadowMapType numClippingPlanes numClipIntersection depthPacking rendererColorSpace | hasPositionAttribute vertexNormals fog shadowMapEnabled flipSided opaque premultipliedAlpha useFog doubleSided | GGX_SAMPLES CUBEUV_TEXEL_WIDTH CUBEUV_TEXEL_HEIGHT CUBEUV_MAX_MIP PERSPECTIVE_CAMERA SAMPLES NORMAL_VECTOR_TYPE DEPTH_SWIZZLING SCREEN_SPACE_RADIUS SCREEN_SPACE_RADIUS_SCALE SCENE_CLIP_BOX SAMPLE_VECTORS  0 vec3(6.123233995736766e-17  0.14285714285714285) KERNEL_RADIUS NUM_MIPS SMAA_THRESHOLD SMAA_MAX_SEARCH_STEPS SMAA_AREATEX_MAX_DISTANCE SMAA_AREATEX_PIXEL_SIZE  560.0 ) ) | `onBeforeCompile() {}` — EquirectangularToCubeUV, PMREMGGXConvolution, ProceduralSky, sunShaft, SanitizeShader, GradeShader |
| 4 | MeshPhysicalMaterial (physical) | 17 | 19 | vehicle,fleet | 11 | 12 | normalMapUv clearcoatNormalMapUv roughnessMapUv mapUv emissiveMapUv | normalMapTangentSpace clearcoat opaque premultipliedAlpha flipSided | - | `function (shader, renderer) { if (prev) prev.call(this, shad` — paint, paintDark, paintAccent, glass, glassDark, glassSide |
| 5 | MeshStandardMaterial (physical) | 15 | 15 | fleet | 15 | 5 | mapUv normalMapUv roughnessMapUv | normalMapTangentSpace alphaTest doubleSided | - | `function (shader, renderer) { if (prev) prev.call(this, shad` — fleet_rubber, fleet_tread, fleet_gap, fleet_steel, fleet_rust, fleet_trim |
| 6 | MeshBasicMaterial (basic) | 6 | 7 | vehicle,fleet,wildlife | 1 | 6 | envMapMode envMapCubeUVHeight | opaque envMap vertexNormals vertexColors vertexAlphas flipSided | - | `onBeforeCompile() {}` — fleet_pool, lion-contact |
| 7 | MeshPhysicalMaterial (physical) | 3 | 3 | vehicle,fleet,wildlife | 1 | 3 | normalMapUv | normalMapTangentSpace clearcoat skinning | - | `onBeforeCompile() {}` — lensClear, fleet_lensClear, lion-cornea |
| 8 | MeshNormalMaterial (normal) | 3 | 3 | post | 1 | 3 | - | instancing instancingColor | - | `onBeforeCompile() {}` |
| 9 | MeshLambertMaterial (lambert) | 2 | 6 | forest | 1 | 2 | - | flipSided | - | `onBeforeCompile() {}` |
| 10 | MeshPhysicalMaterial (physical) | 2 | 2 | fleet | 2 | 1 | - | - | - | `function (shader, renderer) { if (prev) prev.call(this, shad` — fleet_paint, fleet_paintOld |

Reading the columns: three builds a program cache key from (a) the built-in shader id, (b) `material.defines`, (c) ~50 parameters (which maps are present and their UV channel, light counts, tone mapping, fog...), (d) two bitmasks of booleans (instancing, vertexColors, alphaTest, doubleSided, flipSided, skinning, `opaque` i.e. `!transparent`, dithering, premultipliedAlpha...), (e) `customProgramCacheKey()`, which defaults to `onBeforeCompile.toString()`. Any difference in (a)-(e) is a separate compile. A different *uniform value* never is — so when two programs in a cluster differ only in (e) and the difference is a name or a number that is only ever read through a uniform, the material author has put a per-instance value into the key and is paying one compile per material for it. When they differ in (c)/(d) the fix is to make the materials agree: same set of maps (a shared 1x1 white/flat texture keeps the define on), same `side`, same `transparent`, same `vertexColors`. `flipSided` pairs on the glass materials are legitimate: a pane drawn back-face-first then front needs both.

### Every program

| id | type | shader | name | materials | groups | canvas variant | flags | maps | lights | custom key | key len |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 80 | MeshStandardMaterial | physical | alu | 1 | camp |  | - | normal roughness | d3 p5 s4 h1 ds2 | default | 266 |
| 87 | MeshStandardMaterial | physical | ash | 2 | camp |  | - | mapUv normal emissive roughness | d3 p5 s4 h1 ds2 | default | 260 |
| 93 | MeshStandardMaterial | physical | bulb | 1 | camp |  | instancing | - | d3 p5 s4 h1 ds2 | default | 272 |
| 94 | MeshStandardMaterial | physical | campFlag | 1 | camp |  | doubleSided | mapUv | d3 p5 s4 h1 ds2 | default | 269 |
| 79 | MeshStandardMaterial | physical | chairCloth | 7 | camp |  | doubleSided | mapUv normal roughness | d3 p5 s4 h1 ds2 | `function canvasTranslucency(shader) { shader.uniforms.uTrans` | 1,288 |
| 86 | MeshStandardMaterial | physical | deadwood | 1 | camp |  | - | mapUv ao normal roughness | d3 p5 s4 h1 ds2 | default | 260 |
| 78 | MeshStandardMaterial | physical | galv | 1 | camp |  | doubleSided | mapUv normal metalness roughness | d3 p5 s4 h1 ds2 | default | 260 |
| 88 | MeshStandardMaterial | physical | grass | 1 | camp |  | instancing alphaTest doubleSided | mapUv emissive | d3 p5 s4 h1 ds2 | default | 266 |
| 82 | MeshStandardMaterial | physical | lampGlass | 1 | camp |  |  transparent | - | d3 p5 s4 h1 ds2 | default | 272 |
| 77 | MeshStandardMaterial | physical | rock | 15 | camp |  | - | mapUv normal roughness | d3 p5 s4 h1 ds2 | default | 263 |
| 85 | MeshStandardMaterial | physical | rope | 1 | camp |  | - | mapUv normal | d3 p5 s4 h1 ds2 | default | 266 |
| 83 | MeshStandardMaterial | physical | signOffice | 8 | camp |  | - | mapUv | d3 p5 s4 h1 ds2 | default | 269 |
| 81 | MeshStandardMaterial | physical | steel | 1 | camp |  | - | mapUv normal metalness roughness | d3 p5 s4 h1 ds2 | default | 260 |
| 84 | MeshStandardMaterial | physical | steelWhite | 1 | camp |  | doubleSided | mapUv normal roughness | d3 p5 s4 h1 ds2 | default | 263 |
| 89 | ShaderMaterial | custom(9,10) |  | 1 | camp |  |  transparent | - | d3 p5 s4 h1 ds2 | default | 250 |
| 90 | ShaderMaterial | custom(11,12) |  | 1 | camp |  |  transparent | - | d3 p5 s4 h1 ds2 | default | 251 |
| 91 | ShaderMaterial | custom(13,14) |  | 1 | camp |  |  transparent | - | d3 p5 s4 h1 ds2 | default | 251 |
| 92 | ShaderMaterial | custom(15,16) |  | 1 | camp |  |  transparent | - | d3 p5 s4 h1 ds2 | default | 257 |
| 136 | ShaderMaterial | custom(21,22) |  | 1 | dust |  | doubleSided transparent | - | d3 p5 s4 h1 ds2 | default | 251 |
| 95 | MeshPhysicalMaterial | physical | fleet_glassCracked | 1 | fleet |  | clearcoat flipSided transparent | mapUv emissive roughness | d3 p5 s4 h1 ds2 | `function (shader, renderer) { if (prev) prev.call(this, shad` | 444 |
| 96 | MeshPhysicalMaterial | physical | fleet_glassCracked | 1 | fleet |  | clearcoat transparent | mapUv emissive roughness | d3 p5 s4 h1 ds2 | `function (shader, renderer) { if (prev) prev.call(this, shad` | 444 |
| 99 | MeshPhysicalMaterial | physical | fleet_glassDark | 1 | fleet |  | clearcoat flipSided transparent | mapUv | d3 p5 s4 h1 ds2 | `function (shader, renderer) { if (prev) prev.call(this, shad` | 442 |
| 100 | MeshPhysicalMaterial | physical | fleet_glassDark | 1 | fleet |  | clearcoat transparent | mapUv | d3 p5 s4 h1 ds2 | `function (shader, renderer) { if (prev) prev.call(this, shad` | 442 |
| 97 | MeshPhysicalMaterial | physical | fleet_glassDusty | 2 | fleet |  | clearcoat flipSided transparent | mapUv roughness | d3 p5 s4 h1 ds2 | `function (shader, renderer) { if (prev) prev.call(this, shad` | 433 |
| 98 | MeshPhysicalMaterial | physical | fleet_glassDusty | 2 | fleet |  | clearcoat transparent | mapUv roughness | d3 p5 s4 h1 ds2 | `function (shader, renderer) { if (prev) prev.call(this, shad` | 433 |
| 112 | MeshPhysicalMaterial | physical | fleet_lensClear | 1 | fleet |  | clearcoat transparent | - | d3 p5 s4 h1 ds2 | default | 282 |
| 103 | MeshPhysicalMaterial | physical | fleet_paint | 1 | fleet |  | clearcoat vertexColors | mapUv normal roughness clearcoatNormal | d3 p5 s4 h1 ds2 | `function (shader, renderer) { if (prev) prev.call(this, shad` | 6,870 |
| 108 | MeshPhysicalMaterial | physical | fleet_paintOld | 1 | fleet |  | clearcoat vertexColors | mapUv normal roughness clearcoatNormal | d3 p5 s4 h1 ds2 | `function (shader, renderer) { if (prev) prev.call(this, shad` | 6,876 |
| 118 | MeshStandardMaterial | physical | fleet_alu | 1 | fleet |  | vertexColors | normal roughness | d3 p5 s4 h1 ds2 | `function (shader, renderer) { if (prev) prev.call(this, shad` | 6,865 |
| 113 | MeshStandardMaterial | physical | fleet_amberOn | 5 | fleet |  | vertexColors | normal | d3 p5 s4 h1 ds2 | default | 269 |
| 121 | MeshStandardMaterial | physical | fleet_canvas | 1 | fleet |  | vertexColors doubleSided | mapUv normal roughness | d3 p5 s4 h1 ds2 | `function (shader, renderer) { if (prev) prev.call(this, shad` | 1,048 |
| 105 | MeshStandardMaterial | physical | fleet_chrome | 1 | fleet |  | vertexColors | normal roughness | d3 p5 s4 h1 ds2 | `function (shader, renderer) { if (prev) prev.call(this, shad` | 399 |
| 119 | MeshStandardMaterial | physical | fleet_decal | 1 | fleet |  | alphaTest vertexColors doubleSided | mapUv | d3 p5 s4 h1 ds2 | `function (shader, renderer) { if (prev) prev.call(this, shad` | 6,831 |
| 114 | MeshStandardMaterial | physical | fleet_fabric | 1 | fleet |  | vertexColors | mapUv normal roughness | d3 p5 s4 h1 ds2 | `function (shader, renderer) { if (prev) prev.call(this, shad` | 6,826 |
| 104 | MeshStandardMaterial | physical | fleet_gap | 1 | fleet |  | vertexColors | - | d3 p5 s4 h1 ds2 | `function (shader, renderer) { if (prev) prev.call(this, shad` | 6,874 |
| 111 | MeshStandardMaterial | physical | fleet_headOff | 3 | fleet |  | vertexColors | - | d3 p5 s4 h1 ds2 | default | 272 |
| 123 | MeshStandardMaterial | physical | fleet_mesh | 1 | fleet |  | alphaTest vertexColors doubleSided | mapUv | d3 p5 s4 h1 ds2 | default | 269 |
| 117 | MeshStandardMaterial | physical | fleet_plate | 1 | fleet |  | vertexColors | mapUv normal roughness | d3 p5 s4 h1 ds2 | `function (shader, renderer) { if (prev) prev.call(this, shad` | 6,865 |
| 110 | MeshStandardMaterial | physical | fleet_reflector | 1 | fleet |  | vertexColors doubleSided | mapUv normal roughness | d3 p5 s4 h1 ds2 | `function (shader, renderer) { if (prev) prev.call(this, shad` | 395 |
| 101 | MeshStandardMaterial | physical | fleet_rubber | 1 | fleet |  | vertexColors | mapUv normal roughness | d3 p5 s4 h1 ds2 | `function (shader, renderer) { if (prev) prev.call(this, shad` | 6,826 |
| 107 | MeshStandardMaterial | physical | fleet_rust | 1 | fleet |  | vertexColors | mapUv normal roughness | d3 p5 s4 h1 ds2 | `function (shader, renderer) { if (prev) prev.call(this, shad` | 6,824 |
| 106 | MeshStandardMaterial | physical | fleet_steel | 1 | fleet |  | vertexColors | mapUv normal roughness | d3 p5 s4 h1 ds2 | `function (shader, renderer) { if (prev) prev.call(this, shad` | 6,868 |
| 102 | MeshStandardMaterial | physical | fleet_tread | 1 | fleet |  | vertexColors | mapUv normal roughness | d3 p5 s4 h1 ds2 | `function (shader, renderer) { if (prev) prev.call(this, shad` | 6,825 |
| 109 | MeshStandardMaterial | physical | fleet_trim | 1 | fleet |  | vertexColors | mapUv normal roughness | d3 p5 s4 h1 ds2 | `function (shader, renderer) { if (prev) prev.call(this, shad` | 6,865 |
| 122 | MeshStandardMaterial | physical | fleet_trimGloss | 1 | fleet |  | vertexColors | mapUv normal roughness | d3 p5 s4 h1 ds2 | `function (shader, renderer) { if (prev) prev.call(this, shad` | 6,876 |
| 115 | MeshStandardMaterial | physical | fleet_vinyl | 1 | fleet |  | vertexColors | mapUv normal roughness | d3 p5 s4 h1 ds2 | `function (shader, renderer) { if (prev) prev.call(this, shad` | 6,825 |
| 116 | MeshStandardMaterial | physical | fleet_vinylFaded | 1 | fleet |  | vertexColors | mapUv normal roughness | d3 p5 s4 h1 ds2 | `function (shader, renderer) { if (prev) prev.call(this, shad` | 6,830 |
| 120 | MeshStandardMaterial | physical | fleet_whip | 1 | fleet |  | vertexColors | mapUv normal roughness | d3 p5 s4 h1 ds2 | `function (shader, renderer) { if (prev) prev.call(this, shad` | 1,029 |
| 17 | MeshLambertMaterial | lambert |  | 3 | forest |  | alphaTest flipSided transparent | mapUv | d3 p5 s4 h1 ds2 | default | 259 |
| 18 | MeshLambertMaterial | lambert |  | 3 | forest |  | alphaTest transparent | mapUv | d3 p5 s4 h1 ds2 | default | 259 |
| 12 | MeshStandardMaterial | physical |  | 4 | forest |  | instancing instancingColor | mapUv ao normal roughness | d3 p5 s4 h1 ds2 | `wind\|bark-standing-v1` | 261 |
| 13 | MeshStandardMaterial | physical |  | 7 | forest |  | instancing instancingColor alphaTest doubleSided | mapUv | d3 p5 s4 h1 ds2 | `wind\|foliage-v3` | 264 |
| 14 | MeshStandardMaterial | physical |  | 2 | forest |  | instancing instancingColor | mapUv ao normal roughness | d3 p5 s4 h1 ds2 | default | 260 |
| 15 | MeshStandardMaterial | physical |  | 2 | forest |  | instancing instancingColor | mapUv ao normal roughness | d3 p5 s4 h1 ds2 | `wind\|bark-deadfall-v1` | 261 |
| 16 | MeshStandardMaterial | physical |  | 1 | forest |  | - | mapUv roughness | d3 p5 s4 h1 ds2 | default | 266 |
| 143 | MeshNormalMaterial | normal |  | 1 | post |  |  transparent | - | d3 p5 s4 h1 ds2 | default | 258 |
| 144 | MeshNormalMaterial | normal |  | 1 | post |  | instancing instancingColor transparent | - | d3 p5 s4 h1 ds2 | default | 258 |
| 145 | MeshNormalMaterial | normal |  | 1 | post |  | instancing transparent | - | d3 p5 s4 h1 ds2 | default | 258 |
| 159 | RawShaderMaterial | custom(37,38) | OutputShader | 1 | post |  | - | - | - | default | 67 |
| 146 | ShaderMaterial | custom(23,24) |  | 1 | post |  |  transparent | - | d0 p0 s0 h0 ds0 | default | 391 |
| 147 | ShaderMaterial | custom(23,25) |  | 1 | post |  | - | - | - | default | 719 |
| 148 | ShaderMaterial | custom(26,27) |  | 1 | post |  |  transparent | - | d0 p0 s0 h0 ds0 | default | 252 |
| 149 | ShaderMaterial | custom(28,29) |  | 1 | post |  |  transparent | - | d0 p0 s0 h0 ds0 | default | 252 |
| 151 | ShaderMaterial | custom(32,33) |  | 1 | post |  | - | - | d0 p0 s0 h0 ds0 | default | 252 |
| 152 | ShaderMaterial | custom(34,35) |  | 1 | post |  | - | - | d0 p0 s0 h0 ds0 | default | 268 |
| 153 | ShaderMaterial | custom(34,35) |  | 1 | post |  | - | - | d0 p0 s0 h0 ds0 | default | 269 |
| 154 | ShaderMaterial | custom(34,35) |  | 1 | post |  | - | - | d0 p0 s0 h0 ds0 | default | 269 |
| 155 | ShaderMaterial | custom(34,35) |  | 1 | post |  | - | - | d0 p0 s0 h0 ds0 | default | 269 |
| 156 | ShaderMaterial | custom(34,35) |  | 1 | post |  | - | - | d0 p0 s0 h0 ds0 | default | 269 |
| 157 | ShaderMaterial | custom(34,36) |  | 1 | post |  | - | - | d0 p0 s0 h0 ds0 | default | 263 |
| 158 | ShaderMaterial | custom(26,27) |  | 1 | post |  | premultipliedAlpha transparent | - | d0 p0 s0 h0 ds0 | default | 252 |
| 161 | ShaderMaterial | custom(40,41) |  | 1 | post |  | - | - | d0 p0 s0 h0 ds0 | default | 271 |
| 162 | ShaderMaterial | custom(42,43) |  | 1 | post |  | - | - | - | default | 399 |
| 163 | ShaderMaterial | custom(44,45) |  | 1 | post |  | - | - | d0 p0 s0 h0 ds0 | default | 245 |
| 160 | ShaderMaterial | custom(30,39) | GradeShader | 1 | post |  | - | - | d0 p0 s0 h0 ds0 | default | 252 |
| 150 | ShaderMaterial | custom(30,31) | SanitizeShader | 1 | post |  | - | - | d0 p0 s0 h0 ds0 | default | 252 |
| 132 | MeshStandardMaterial | physical |  | 4 | roadside |  | dithering | mapUv | d3 p5 s4 h1 ds2 | default | 269 |
| 133 | MeshStandardMaterial | physical |  | 6 | roadside |  | dithering | - | d3 p5 s4 h1 ds2 | default | 272 |
| 135 | ShaderMaterial | custom(19,20) |  | 1 | sky |  |  transparent | - | d3 p5 s4 h1 ds2 | default | 251 |
| 0 | ShaderMaterial | custom(0,1) | EquirectangularToCubeUV | 1 | sky |  | - | - | d0 p0 s0 h0 ds0 | default | 237 |
| 4 | ShaderMaterial | custom(0,4) | PMREMGGXConvolution | 1 | sky |  |  transparent | - | d0 p0 s0 h0 ds0 | default | 359 |
| 5 | ShaderMaterial | custom(2,3) | ProceduralSky | 1 | sky |  | flipSided | - | d3 p5 s4 h1 ds2 | default | 255 |
| 134 | ShaderMaterial | custom(17,18) | sunShaft | 8 | sky |  | doubleSided transparent | - | d3 p5 s4 h1 ds2 | default | 257 |
| 10 | MeshLambertMaterial | lambert |  | 1 | terrain |  | dithering | mapUv | d3 p5 s4 h1 ds2 | `(shader) => { Object.assign(shader.uniforms, hillUniforms); ` | 1,809 |
| 11 | MeshLambertMaterial | lambert |  | 1 | terrain |  | dithering | - | d3 p5 s4 h1 ds2 | `(shader) => { shader.fragmentShader = shader.fragmentShader.` | 374 |
| 6 | MeshStandardMaterial | physical |  | 1 | terrain |  | - | - | - | - | 263 |
| 7 | MeshStandardMaterial | physical |  | 1 | terrain |  | vertexColors dithering | - | d3 p5 s4 h1 ds2 | default | 272 |
| 164 | MeshStandardMaterial | physical |  | 1 | terrain |  | dithering | mapUv normal | d3 p5 s4 h1 ds2 | `terrain-relief-v1\|tod` | 267 |
| 8 | ShaderMaterial | custom(5,6) |  | 1 | terrain |  | premultipliedAlpha transparent | - | d3 p5 s4 h1 ds2 | default | 249 |
| 9 | ShaderMaterial | custom(7,8) |  | 1 | terrain |  |  transparent | - | d3 p5 s4 h1 ds2 | default | 249 |
| 66 | MeshBasicMaterial | basic |  | 1 | vehicle |  | - | mapUv | d3 p5 s4 h1 ds2 | default | 255 |
| 67 | MeshBasicMaterial | basic |  | 1 | vehicle |  |  transparent | mapUv | d3 p5 s4 h1 ds2 | default | 255 |
| 165 | MeshBasicMaterial | basic |  | 1 | vehicle |  | - | mapUv | d3 p5 s4 h1 ds2 | default | 257 |
| 124 | MeshBasicMaterial | basic | fleet_pool | 2 | vehicle,fleet |  |  transparent | mapUv | d3 p5 s4 h1 ds2 | default | 257 |
| 61 | MeshPhysicalMaterial | physical | cabinGlass | 1 | vehicle |  | clearcoat transparent | - | d3 p5 s4 h1 ds2 | `function (shader, renderer) { if (prev) prev.call(this, shad` | 444 |
| 38 | MeshPhysicalMaterial | physical | glass | 1 | vehicle |  | premultipliedAlpha flipSided transparent | mapUv roughness | d3 p5 s4 h1 ds2 | `function (shader, renderer) { if (prev) prev.call(this, shad` | 420 |
| 39 | MeshPhysicalMaterial | physical | glass | 1 | vehicle |  | premultipliedAlpha transparent | mapUv roughness | d3 p5 s4 h1 ds2 | `function (shader, renderer) { if (prev) prev.call(this, shad` | 420 |
| 42 | MeshPhysicalMaterial | physical | glassDark | 1 | vehicle |  | premultipliedAlpha flipSided transparent | mapUv | d3 p5 s4 h1 ds2 | `function (shader, renderer) { if (prev) prev.call(this, shad` | 429 |
| 43 | MeshPhysicalMaterial | physical | glassDark | 1 | vehicle |  | premultipliedAlpha transparent | mapUv | d3 p5 s4 h1 ds2 | `function (shader, renderer) { if (prev) prev.call(this, shad` | 429 |
| 44 | MeshPhysicalMaterial | physical | glassSide | 1 | vehicle |  | premultipliedAlpha flipSided transparent | mapUv | d3 p5 s4 h1 ds2 | `function (shader, renderer) { if (prev) prev.call(this, shad` | 429 |
| 45 | MeshPhysicalMaterial | physical | glassSide | 1 | vehicle |  | premultipliedAlpha transparent | mapUv | d3 p5 s4 h1 ds2 | `function (shader, renderer) { if (prev) prev.call(this, shad` | 429 |
| 36 | MeshPhysicalMaterial | physical | lensClear | 1 | vehicle |  | clearcoat transparent | normal | d3 p5 s4 h1 ds2 | default | 279 |
| 27 | MeshPhysicalMaterial | physical | paint | 1 | vehicle |  | clearcoat | mapUv normal roughness clearcoatNormal | d3 p5 s4 h1 ds2 | `function (shader, renderer) { if (prev) prev.call(this, shad` | 426 |
| 37 | MeshPhysicalMaterial | physical | paintAccent | 1 | vehicle |  | clearcoat | mapUv normal roughness clearcoatNormal | d3 p5 s4 h1 ds2 | `function (shader, renderer) { if (prev) prev.call(this, shad` | 424 |
| 28 | MeshPhysicalMaterial | physical | paintDark | 1 | vehicle |  | clearcoat | mapUv normal roughness clearcoatNormal | d3 p5 s4 h1 ds2 | `function (shader, renderer) { if (prev) prev.call(this, shad` | 420 |
| 47 | MeshPhysicalMaterial | physical | paintRoof | 1 | vehicle |  | clearcoat | mapUv normal roughness clearcoatNormal | d3 p5 s4 h1 ds2 | `function (shader, renderer) { if (prev) prev.call(this, shad` | 421 |
| 58 | MeshStandardMaterial | physical |  | 1 | vehicle |  | - | mapUv normal roughness | d3 p5 s4 h1 ds2 | `function (shader, renderer) { if (prev) prev.call(this, shad` | 376 |
| 59 | MeshStandardMaterial | physical |  | 1 | vehicle |  | - | normal | d3 p5 s4 h1 ds2 | `function (shader, renderer) { if (prev) prev.call(this, shad` | 381 |
| 64 | MeshStandardMaterial | physical |  | 1 | vehicle |  | - | mapUv normal roughness | d3 p5 s4 h1 ds2 | `function (shader, renderer) { if (prev) prev.call(this, shad` | 379 |
| 68 | MeshStandardMaterial | physical |  | 1 | vehicle |  | vertexColors | - | d3 p5 s4 h1 ds2 | `function (shader, renderer) { if (prev) prev.call(this, shad` | 370 |
| 21 | MeshStandardMaterial | physical | alu | 1 | vehicle |  | - | normal roughness | d3 p5 s4 h1 ds2 | `function (shader, renderer) { if (prev) prev.call(this, shad` | 427 |
| 33 | MeshStandardMaterial | physical | amber | 5 | vehicle |  | - | normal | d3 p5 s4 h1 ds2 | default | 269 |
| 48 | MeshStandardMaterial | physical | bedLiner | 1 | vehicle |  | - | mapUv normal roughness | d3 p5 s4 h1 ds2 | `function (shader, renderer) { if (prev) prev.call(this, shad` | 414 |
| 74 | MeshStandardMaterial | physical | brakeRotor | 1 | vehicle |  | vertexColors | mapUv normal roughness | d3 p5 s4 h1 ds2 | `function (shader, renderer) { if (prev) prev.call(this, shad` | 397 |
| 52 | MeshStandardMaterial | physical | cabinPanel | 1 | vehicle |  | - | mapUv normal emissive roughness | d3 p5 s4 h1 ds2 | `function (shader, renderer) { if (prev) prev.call(this, shad` | 393 |
| 75 | MeshStandardMaterial | physical | caliper | 1 | vehicle |  | vertexColors | mapUv normal roughness | d3 p5 s4 h1 ds2 | `function (shader, renderer) { if (prev) prev.call(this, shad` | 394 |
| 49 | MeshStandardMaterial | physical | canvasKhaki | 1 | vehicle |  | - | normal | d3 p5 s4 h1 ds2 | `function (shader, renderer) { if (prev) prev.call(this, shad` | 428 |
| 69 | MeshStandardMaterial | physical | castIron | 1 | vehicle |  | vertexColors | mapUv normal metalness roughness | d3 p5 s4 h1 ds2 | `function (shader, renderer) { if (prev) prev.call(this, shad` | 392 |
| 29 | MeshStandardMaterial | physical | chrome | 1 | vehicle |  | - | normal roughness | d3 p5 s4 h1 ds2 | `function (shader, renderer) { if (prev) prev.call(this, shad` | 436 |
| 76 | MeshStandardMaterial | physical | contactDust | 2 | vehicle,camp |  |  transparent | mapUv | d3 p5 s4 h1 ds2 | default | 269 |
| 32 | MeshStandardMaterial | physical | decalBadge | 4 | vehicle,wildlife |  | alphaTest doubleSided | mapUv | d3 p5 s4 h1 ds2 | default | 269 |
| 31 | MeshStandardMaterial | physical | decalName | 1 | vehicle |  | alphaTest doubleSided | mapUv | d3 p5 s4 h1 ds2 | `function (shader, renderer) { if (prev) prev.call(this, shad` | 383 |
| 30 | MeshStandardMaterial | physical | decalNumber | 1 | vehicle |  | alphaTest doubleSided | mapUv | d3 p5 s4 h1 ds2 | `function (shader, renderer) { if (prev) prev.call(this, shad` | 385 |
| 60 | MeshStandardMaterial | physical | fabric | 1 | vehicle |  | - | mapUv normal roughness | d3 p5 s4 h1 ds2 | `function (shader, renderer) { if (prev) prev.call(this, shad` | 405 |
| 54 | MeshStandardMaterial | physical | floorMat | 1 | vehicle |  | - | mapUv normal roughness | d3 p5 s4 h1 ds2 | `function (shader, renderer) { if (prev) prev.call(this, shad` | 410 |
| 51 | MeshStandardMaterial | physical | fridgeCase | 1 | vehicle |  | - | normal roughness | d3 p5 s4 h1 ds2 | `function (shader, renderer) { if (prev) prev.call(this, shad` | 424 |
| 23 | MeshStandardMaterial | physical | gap | 1 | vehicle |  | - | - | d3 p5 s4 h1 ds2 | `function (shader, renderer) { if (prev) prev.call(this, shad` | 445 |
| 41 | MeshStandardMaterial | physical | gasket | 1 | vehicle |  | - | normal | d3 p5 s4 h1 ds2 | `function (shader, renderer) { if (prev) prev.call(this, shad` | 411 |
| 40 | MeshStandardMaterial | physical | glassEdge | 1 | vehicle |  | - | - | d3 p5 s4 h1 ds2 | `function (shader, renderer) { if (prev) prev.call(this, shad` | 406 |
| 35 | MeshStandardMaterial | physical | headlight | 3 | vehicle,camp |  | - | - | d3 p5 s4 h1 ds2 | default | 272 |
| 65 | MeshStandardMaterial | physical | headliner | 1 | vehicle |  | - | mapUv normal roughness | d3 p5 s4 h1 ds2 | `function (shader, renderer) { if (prev) prev.call(this, shad` | 394 |
| 55 | MeshStandardMaterial | physical | interiorFaded | 1 | vehicle |  | - | mapUv normal roughness | d3 p5 s4 h1 ds2 | `function (shader, renderer) { if (prev) prev.call(this, shad` | 424 |
| 53 | MeshStandardMaterial | physical | interiorPlastic | 1 | vehicle |  | - | mapUv normal roughness | d3 p5 s4 h1 ds2 | `function (shader, renderer) { if (prev) prev.call(this, shad` | 425 |
| 57 | MeshStandardMaterial | physical | louvre | 1 | vehicle |  | alphaTest doubleSided | mapUv | d3 p5 s4 h1 ds2 | `function (shader, renderer) { if (prev) prev.call(this, shad` | 396 |
| 46 | MeshStandardMaterial | physical | mirrorGlass | 1 | vehicle |  | - | - | d3 p5 s4 h1 ds2 | `function (shader, renderer) { if (prev) prev.call(this, shad` | 378 |
| 26 | MeshStandardMaterial | physical | plate | 1 | vehicle |  | - | mapUv normal roughness | d3 p5 s4 h1 ds2 | `function (shader, renderer) { if (prev) prev.call(this, shad` | 408 |
| 34 | MeshStandardMaterial | physical | reflector | 1 | vehicle |  | doubleSided | mapUv normal roughness | d3 p5 s4 h1 ds2 | `function (shader, renderer) { if (prev) prev.call(this, shad` | 390 |
| 70 | MeshStandardMaterial | physical | rimMachined | 3 | vehicle |  | vertexColors | mapUv normal roughness | d3 p5 s4 h1 ds2 | default | 263 |
| 25 | MeshStandardMaterial | physical | rubber | 1 | vehicle |  | - | mapUv normal roughness | d3 p5 s4 h1 ds2 | `function (shader, renderer) { if (prev) prev.call(this, shad` | 413 |
| 22 | MeshStandardMaterial | physical | steel | 1 | vehicle |  | - | mapUv normal metalness roughness | d3 p5 s4 h1 ds2 | `function (shader, renderer) { if (prev) prev.call(this, shad` | 405 |
| 19 | MeshStandardMaterial | physical | steelDark | 1 | vehicle |  | - | mapUv normal roughness | d3 p5 s4 h1 ds2 | `function (shader, renderer) { if (prev) prev.call(this, shad` | 461 |
| 56 | MeshStandardMaterial | physical | stitch | 1 | vehicle |  | - | mapUv normal roughness | d3 p5 s4 h1 ds2 | `function (shader, renderer) { if (prev) prev.call(this, shad` | 387 |
| 50 | MeshStandardMaterial | physical | tread | 1 | vehicle |  | - | mapUv ao normal roughness | d3 p5 s4 h1 ds2 | `function (shader, renderer) { if (prev) prev.call(this, shad` | 370 |
| 20 | MeshStandardMaterial | physical | trim | 1 | vehicle |  | - | mapUv normal roughness | d3 p5 s4 h1 ds2 | `function (shader, renderer) { if (prev) prev.call(this, shad` | 438 |
| 24 | MeshStandardMaterial | physical | trimGloss | 1 | vehicle |  | - | mapUv normal roughness | d3 p5 s4 h1 ds2 | `function (shader, renderer) { if (prev) prev.call(this, shad` | 462 |
| 73 | MeshStandardMaterial | physical | tyreCarcass | 1 | vehicle |  | vertexColors | mapUv normal roughness | d3 p5 s4 h1 ds2 | `loadedTyre_tyreCarcass_0.05` | 270 |
| 71 | MeshStandardMaterial | physical | tyreLug | 1 | vehicle |  | vertexColors | mapUv normal roughness | d3 p5 s4 h1 ds2 | `loadedTyre_tyreLug_0.05` | 266 |
| 63 | MeshStandardMaterial | physical | wheelRim | 1 | vehicle |  | - | mapUv normal roughness | d3 p5 s4 h1 ds2 | `function (shader, renderer) { if (prev) prev.call(this, shad` | 435 |
| 72 | MeshStandardMaterial | physical | wheelVoid | 1 | vehicle |  | vertexColors doubleSided | - | d3 p5 s4 h1 ds2 | default | 272 |
| 62 | MeshStandardMaterial | physical | wheelWorn | 1 | vehicle |  | - | mapUv normal roughness | d3 p5 s4 h1 ds2 | `function (shader, renderer) { if (prev) prev.call(this, shad` | 438 |
| 128 | MeshBasicMaterial | basic | lion-contact | 1 | wildlife |  | vertexColors vertexAlphas flipSided transparent | mapUv | d3 p5 s4 h1 ds2 | default | 252 |
| 129 | MeshBasicMaterial | basic | lion-contact | 1 | wildlife |  | vertexColors vertexAlphas transparent | mapUv | d3 p5 s4 h1 ds2 | default | 252 |
| 127 | MeshPhysicalMaterial | physical | lion-cornea | 1 | wildlife |  | skinning transparent | - | d3 p5 s4 h1 ds2 | default | 282 |
| 125 | MeshStandardMaterial | physical | lion-coat | 4 | wildlife |  | vertexColors skinning | mapUv normal | d3 p5 s4 h1 ds2 | default | 266 |
| 130 | MeshStandardMaterial | physical | lion-mane-base | 1 | wildlife |  | skinning | mapUv | d3 p5 s4 h1 ds2 | default | 269 |
| 131 | MeshStandardMaterial | physical | lion-mane-shells | 1 | wildlife |  | vertexColors skinning doubleSided | mapUv | d3 p5 s4 h1 ds2 | `lionshell\|MeshStandardMaterial\|` | 280 |
| 126 | MeshStandardMaterial | physical | lion-strands | 1 | wildlife |  | alphaTest skinning doubleSided | mapUv | d3 p5 s4 h1 ds2 | default | 269 |
| 3 | MeshBasicMaterial | basic |  | 0 | unattributed |  | - | - | - | - | 259 |
| 1 | MeshBasicMaterial | basic | PMREM.Background | 0 | unattributed |  | - | - | - | - | 259 |
| 137 | MeshDepthMaterial | depth |  | 0 | shadow |  | - | - | - | - | 258 |
| 138 | MeshDepthMaterial | depth |  | 0 | shadow |  | - | - | - | - | 258 |
| 139 | MeshDepthMaterial | depth |  | 0 | shadow |  | - | - | - | - | 258 |
| 140 | MeshDepthMaterial | depth |  | 0 | shadow |  | - | - | - | - | 258 |
| 141 | MeshDepthMaterial | depth |  | 0 | shadow |  | - | - | - | - | 258 |
| 142 | MeshDepthMaterial | depth |  | 0 | shadow |  | - | - | - | - | 258 |
| 2 | ShaderMaterial | 2 | ProceduralSky | 0 | unattributed |  | - | - | - | - | 256 |

## 2. Triangles per frame

Beauty pass only (the shadow pass and the AO G-buffer are broken out in the group tables). `instanced` triangles are `instanceCount x triangles per instance` for `InstancedMesh`; `regular` is everything else.

### hero

Camera at (-30.99, 3.38, 5.93) fov 36, truck at (-36.57, 2.66, 1.47). Beauty 1,278,878 tris in 368 calls (203,602 instanced in 177 calls, 1,075,276 regular); shadow pass 647,570 tris in 176 calls. 359 objects drawn, 3 of them outside the frustum (`frustumCulled = false`) costing 94 tris / 3 calls.

| group | beauty calls | beauty tris | of which instanced | tris inside frustum (measured) | objects | programs touched | shadow calls | shadow tris | G-buffer calls | G-buffer tris |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| terrain | 5 | 479,690 | 0 | 45,029 (9%) | 5 | 5 | 0 | 0 | 4 | 464,316 |
| forest | 184 | 206,482 | 203,602 | 32,603 (16%) | 181 | 6 | 62 | 138,034 | 23 | 104,244 |
| vehicle | 162 | 571,248 | 0 | 571,248 (100%) | 156 | 55 | 100 | 412,776 | 130 | 568,558 |
| camp | 4 | 16,494 | 0 | - | 4 | 4 | 9 | 90,358 | 0 | 0 |
| roadside | 2 | 2,868 | 0 | - | 2 | 1 | 5 | 6,402 | 2 | 2,868 |
| sky | 10 | 976 | 0 | - | 10 | 3 | 0 | 0 | 0 | 0 |
| dust | 1 | 1,120 | 0 | - | 1 | 1 | 0 | 0 | 0 | 0 |

"Tris inside frustum" is measured per triangle centroid for every regular mesh of 20k+ triangles and per instance bounding sphere for every InstancedMesh; smaller regular meshes are counted whole. It is the ceiling on what finer-grained culling can remove for this camera. Whole frame: 670,338 of 1,278,878 beauty triangles (52%) are inside the frustum.

Top 20 objects by triangles:

| object | group | type | material | instances | calls | tris | inside frustum | frustumCulled |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| terrain | terrain | Mesh | MeshStandardMaterial | - | 1 | 264,548 | 8,390 tris (3%) | yes |
| roadStones | terrain | Mesh | MeshStandardMaterial | - | 1 | 180,520 | 2,017 tris (1%) | yes |
| body_trimGloss | vehicle | Mesh | trimGloss | - | 1 | 36,768 | 36,768 tris (100%) | yes |
| body_trim | vehicle | Mesh | trim | - | 1 | 32,592 | 32,592 tris (100%) | yes |
| body_steelDark | vehicle | Mesh | steelDark | - | 1 | 29,964 | 29,964 tris (100%) | yes |
| body_gap | vehicle | Mesh | gap | - | 1 | 28,096 | 28,096 tris (100%) | yes |
| tree_umbrella_trunk | forest | Mesh | MeshStandardMaterial | 41 | 1 | 26,076 | 1/41 instances | yes |
| cabin_gap | vehicle | Mesh | gap | - | 1 | 25,544 | 25,544 tris (100%) | yes |
| cabin_trimGloss | vehicle | Mesh | trimGloss | - | 1 | 22,184 | 22,184 tris (100%) | yes |
| gear_steelDark | vehicle | Mesh | steelDark | - | 1 | 19,576 | sphere yes | yes |
| tree_umbrella_trunk | forest | Mesh | MeshStandardMaterial | 24 | 1 | 18,864 | 6/24 instances | yes |
| body_chrome | vehicle | Mesh | chrome | - | 1 | 17,672 | sphere yes | yes |
| campWear | camp | Mesh | campWear | - | 1 | 16,400 | sphere yes | yes |
| gear_trim | vehicle | Mesh | trim | - | 1 | 16,264 | sphere yes | yes |
| cabin_fabric | vehicle | Mesh | fabric | - | 1 | 15,720 | sphere yes | yes |
| roadStoneShadows | terrain | Mesh | ShaderMaterial | - | 1 | 15,374 | sphere yes | yes |
| farScrub | terrain | Mesh | MeshLambertMaterial | - | 1 | 15,200 | sphere yes | no |
| cabin_steelDark | vehicle | Mesh | steelDark | - | 1 | 14,736 | sphere yes | yes |
| body_paint | vehicle | Mesh | paint | - | 1 | 13,972 | sphere yes | yes |
| tree_umbrella_foliage | forest | Mesh | MeshStandardMaterial | 41 | 1 | 13,940 | 2/41 instances | yes |

Beauty pass by object-name prefix (top 15; `body_`, `cabin_`, `gear_`, `tyre_` are the truck kits):

| group/prefix | objects | calls | tris | tris inside frustum |
| --- | --- | --- | --- | --- |
| terrain/terrain | 1 | 1 | 264,548 | 8,390 |
| vehicle/body | 41 | 47 | 217,804 | 217,804 |
| terrain/roadStones | 1 | 1 | 180,520 | 2,017 |
| vehicle/cabin | 27 | 27 | 146,676 | 146,676 |
| vehicle/tyre | 24 | 24 | 99,016 | 99,016 |
| forest/tree | 10 | 10 | 90,460 | 9,186 |
| vehicle/gear | 21 | 21 | 81,652 | 81,652 |
| forest/grass | 47 | 47 | 42,500 | 7,782 |
| camp/campWear | 1 | 1 | 16,400 | 16,400 |
| vehicle/axles | 5 | 5 | 15,568 | 15,568 |
| terrain/roadStoneShadows | 1 | 1 | 15,374 | 15,374 |
| terrain/farScrub | 1 | 1 | 15,200 | 15,200 |
| forest/litter | 16 | 16 | 13,648 | 2,776 |
| forest/log | 3 | 3 | 11,408 | 1,240 |
| forest/kopje | 3 | 3 | 10,260 | 0 |

Shadow pass, by name prefix (top 12) and top 10 casters:

| group/prefix | casters | shadow calls | shadow tris |
| --- | --- | --- | --- |
| vehicle/body | 22 | 22 | 206,316 |
| vehicle/tyre | 24 | 24 | 99,016 |
| forest/tree | 10 | 10 | 90,460 |
| camp/camp | 9 | 9 | 90,358 |
| vehicle/gear | 21 | 21 | 81,652 |
| vehicle/axles | 5 | 5 | 15,568 |
| forest/log | 3 | 3 | 11,408 |
| forest/scrub | 39 | 39 | 10,262 |
| forest/kopje | 3 | 3 | 10,260 |
| vehicle/brakes | 28 | 28 | 10,224 |
| forest/termite | 3 | 3 | 8,464 |
| forest/rock | 4 | 4 | 7,180 |

| caster | group | instances | calls | shadow tris |
| --- | --- | --- | --- | --- |
| body_trimGloss | vehicle | - | 1 | 36,768 |
| camp_timber | camp | - | 1 | 33,856 |
| body_trim | vehicle | - | 1 | 32,592 |
| body_steelDark | vehicle | - | 1 | 29,964 |
| body_gap | vehicle | - | 1 | 28,096 |
| tree_umbrella_trunk | forest | 41 | 1 | 26,076 |
| camp_deadwood | camp | - | 1 | 21,920 |
| gear_steelDark | vehicle | - | 1 | 19,576 |
| tree_umbrella_trunk | forest | 24 | 1 | 18,864 |
| body_chrome | vehicle | - | 1 | 17,672 |

Drawn while outside the frustum (`frustumCulled = false`):

| object | group | type | instances | calls | tris |
| --- | --- | --- | --- | --- | --- |
| fireSmoke | camp | Mesh | - | 1 | 36 |
| fireEmbers | camp | Mesh | - | 1 | 32 |
| fireFlames | camp | Mesh | - | 1 | 26 |

### mainroad

Camera at (25.67, 5.05, 9.6) fov 44, truck at (34.91, 2.1, 11.57). Beauty 1,649,266 tris in 403 calls (226,786 instanced in 167 calls, 1,422,480 regular); shadow pass 947,638 tris in 212 calls. 394 objects drawn, 3 of them outside the frustum (`frustumCulled = false`) costing 94 tris / 3 calls.

| group | beauty calls | beauty tris | of which instanced | tris inside frustum (measured) | objects | programs touched | shadow calls | shadow tris | G-buffer calls | G-buffer tris |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| terrain | 6 | 479,930 | 0 | 121,364 (25%) | 6 | 6 | 0 | 0 | 4 | 464,316 |
| forest | 173 | 225,634 | 222,754 | 49,346 (22%) | 170 | 6 | 50 | 128,664 | 23 | 100,090 |
| vehicle | 162 | 571,248 | 0 | 571,248 (100%) | 156 | 55 | 100 | 412,776 | 130 | 568,558 |
| camp | 16 | 110,814 | 4,032 | 55,423 (50%) | 16 | 11 | 32 | 147,764 | 12 | 94,320 |
| fleet | 22 | 248,310 | 0 | 59,490 (24%) | 22 | 21 | 20 | 247,008 | 21 | 246,894 |
| wildlife | 4 | 8 | 0 | - | 4 | 1 | 0 | 0 | 4 | 8 |
| roadside | 9 | 11,226 | 0 | - | 9 | 2 | 10 | 11,426 | 9 | 11,226 |
| sky | 10 | 976 | 0 | - | 10 | 3 | 0 | 0 | 0 | 0 |
| dust | 1 | 1,120 | 0 | - | 1 | 1 | 0 | 0 | 0 | 0 |

"Tris inside frustum" is measured per triangle centroid for every regular mesh of 20k+ triangles and per instance bounding sphere for every InstancedMesh; smaller regular meshes are counted whole. It is the ceiling on what finer-grained culling can remove for this camera. Whole frame: 870,201 of 1,649,266 beauty triangles (53%) are inside the frustum.

Top 20 objects by triangles:

| object | group | type | material | instances | calls | tris | inside frustum | frustumCulled |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| terrain | terrain | Mesh | MeshStandardMaterial | - | 1 | 264,548 | 44,949 tris (17%) | yes |
| roadStones | terrain | Mesh | MeshStandardMaterial | - | 1 | 180,520 | 41,553 tris (23%) | yes |
| fleet_steel | fleet | Mesh | fleet_steel | - | 1 | 46,256 | 0 tris (0%) | yes |
| fleet_rubber | fleet | Mesh | fleet_rubber | - | 1 | 44,224 | 0 tris (0%) | yes |
| fleet_trim | fleet | Mesh | fleet_trim | - | 1 | 41,524 | 0 tris (0%) | yes |
| body_trimGloss | vehicle | Mesh | trimGloss | - | 1 | 36,768 | 36,768 tris (100%) | yes |
| camp_timber | camp | Mesh | timber | - | 1 | 33,856 | 0 tris (0%) | yes |
| body_trim | vehicle | Mesh | trim | - | 1 | 32,592 | 32,592 tris (100%) | yes |
| body_steelDark | vehicle | Mesh | steelDark | - | 1 | 29,964 | 29,964 tris (100%) | yes |
| fleet_paint | fleet | Mesh | fleet_paint | - | 1 | 28,672 | 0 tris (0%) | yes |
| fleet_chrome | fleet | Mesh | fleet_chrome | - | 1 | 28,144 | 0 tris (0%) | yes |
| body_gap | vehicle | Mesh | gap | - | 1 | 28,096 | 28,096 tris (100%) | yes |
| tree_umbrella_trunk | forest | Mesh | MeshStandardMaterial | 41 | 1 | 26,076 | 3/41 instances | yes |
| cabin_gap | vehicle | Mesh | gap | - | 1 | 25,544 | 25,544 tris (100%) | yes |
| cabin_trimGloss | vehicle | Mesh | trimGloss | - | 1 | 22,184 | 22,184 tris (100%) | yes |
| camp_deadwood | camp | Mesh | deadwood | - | 1 | 21,920 | 4,249 tris (19%) | yes |
| gear_steelDark | vehicle | Mesh | steelDark | - | 1 | 19,576 | sphere yes | yes |
| tree_umbrella_trunk | forest | Mesh | MeshStandardMaterial | 24 | 1 | 18,864 | 0/24 instances | yes |
| body_chrome | vehicle | Mesh | chrome | - | 1 | 17,672 | sphere yes | yes |
| campWear | camp | Mesh | campWear | - | 1 | 16,400 | sphere yes | yes |

Beauty pass by object-name prefix (top 15; `body_`, `cabin_`, `gear_`, `tyre_` are the truck kits):

| group/prefix | objects | calls | tris | tris inside frustum |
| --- | --- | --- | --- | --- |
| terrain/terrain | 1 | 1 | 264,548 | 44,949 |
| fleet/fleet | 22 | 22 | 248,310 | 59,490 |
| vehicle/body | 41 | 47 | 217,804 | 217,804 |
| terrain/roadStones | 1 | 1 | 180,520 | 41,553 |
| vehicle/cabin | 27 | 27 | 146,676 | 146,676 |
| vehicle/tyre | 24 | 24 | 99,016 | 99,016 |
| camp/camp | 11 | 11 | 90,288 | 38,761 |
| forest/tree | 11 | 11 | 87,090 | 4,218 |
| vehicle/gear | 21 | 21 | 81,652 | 81,652 |
| forest/grass | 60 | 60 | 72,968 | 28,678 |
| camp/campWear | 1 | 1 | 16,400 | 16,400 |
| vehicle/axles | 5 | 5 | 15,568 | 15,568 |
| terrain/roadStoneShadows | 1 | 1 | 15,374 | 15,374 |
| terrain/farScrub | 1 | 1 | 15,200 | 15,200 |
| forest/litter | 17 | 17 | 15,160 | 5,608 |

Shadow pass, by name prefix (top 12) and top 10 casters:

| group/prefix | casters | shadow calls | shadow tris |
| --- | --- | --- | --- |
| fleet/fleet | 20 | 20 | 247,008 |
| vehicle/body | 22 | 22 | 206,316 |
| camp/camp | 32 | 32 | 147,764 |
| vehicle/tyre | 24 | 24 | 99,016 |
| forest/tree | 9 | 9 | 85,800 |
| vehicle/gear | 21 | 21 | 81,652 |
| vehicle/axles | 5 | 5 | 15,568 |
| roadside/roadside | 10 | 10 | 11,426 |
| forest/log | 3 | 3 | 11,408 |
| forest/kopje | 3 | 3 | 10,260 |
| vehicle/brakes | 28 | 28 | 10,224 |
| forest/termite | 3 | 3 | 8,464 |

| caster | group | instances | calls | shadow tris |
| --- | --- | --- | --- | --- |
| fleet_steel | fleet | - | 1 | 46,256 |
| fleet_rubber | fleet | - | 1 | 44,224 |
| fleet_trim | fleet | - | 1 | 41,524 |
| body_trimGloss | vehicle | - | 1 | 36,768 |
| camp_timber | camp | - | 1 | 33,856 |
| body_trim | vehicle | - | 1 | 32,592 |
| body_steelDark | vehicle | - | 1 | 29,964 |
| fleet_paint | fleet | - | 1 | 28,672 |
| fleet_chrome | fleet | - | 1 | 28,144 |
| body_gap | vehicle | - | 1 | 28,096 |

Drawn while outside the frustum (`frustumCulled = false`):

| object | group | type | instances | calls | tris |
| --- | --- | --- | --- | --- | --- |
| fireSmoke | camp | Mesh | - | 1 | 36 |
| fireEmbers | camp | Mesh | - | 1 | 32 |
| fireFlames | camp | Mesh | - | 1 | 26 |

### forest

Camera at (-36.02, 6.51, -9.01) fov 46, truck at (-36.58, 2.66, 1.45). Beauty 1,361,010 tris in 450 calls (285,734 instanced in 259 calls, 1,075,276 regular); shadow pass 647,570 tris in 176 calls. 441 objects drawn, 3 of them outside the frustum (`frustumCulled = false`) costing 94 tris / 3 calls.

| group | beauty calls | beauty tris | of which instanced | tris inside frustum (measured) | objects | programs touched | shadow calls | shadow tris | G-buffer calls | G-buffer tris |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| terrain | 5 | 479,690 | 0 | 148,556 (31%) | 5 | 5 | 0 | 0 | 4 | 464,316 |
| forest | 266 | 288,614 | 285,734 | 138,044 (48%) | 263 | 6 | 62 | 138,034 | 23 | 104,244 |
| vehicle | 162 | 571,248 | 0 | 571,248 (100%) | 156 | 55 | 100 | 412,776 | 130 | 568,558 |
| camp | 4 | 16,494 | 0 | - | 4 | 4 | 9 | 90,358 | 0 | 0 |
| roadside | 2 | 2,868 | 0 | - | 2 | 1 | 5 | 6,402 | 2 | 2,868 |
| sky | 10 | 976 | 0 | - | 10 | 3 | 0 | 0 | 0 | 0 |
| dust | 1 | 1,120 | 0 | - | 1 | 1 | 0 | 0 | 0 | 0 |

"Tris inside frustum" is measured per triangle centroid for every regular mesh of 20k+ triangles and per instance bounding sphere for every InstancedMesh; smaller regular meshes are counted whole. It is the ceiling on what finer-grained culling can remove for this camera. Whole frame: 879,306 of 1,361,010 beauty triangles (65%) are inside the frustum.

Top 20 objects by triangles:

| object | group | type | material | instances | calls | tris | inside frustum | frustumCulled |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| terrain | terrain | Mesh | MeshStandardMaterial | - | 1 | 264,548 | 67,964 tris (26%) | yes |
| roadStones | terrain | Mesh | MeshStandardMaterial | - | 1 | 180,520 | 45,970 tris (25%) | yes |
| body_trimGloss | vehicle | Mesh | trimGloss | - | 1 | 36,768 | 36,768 tris (100%) | yes |
| body_trim | vehicle | Mesh | trim | - | 1 | 32,592 | 32,592 tris (100%) | yes |
| body_steelDark | vehicle | Mesh | steelDark | - | 1 | 29,964 | 29,964 tris (100%) | yes |
| body_gap | vehicle | Mesh | gap | - | 1 | 28,096 | 28,096 tris (100%) | yes |
| tree_umbrella_trunk | forest | Mesh | MeshStandardMaterial | 41 | 1 | 26,076 | 22/41 instances | yes |
| cabin_gap | vehicle | Mesh | gap | - | 1 | 25,544 | 25,544 tris (100%) | yes |
| cabin_trimGloss | vehicle | Mesh | trimGloss | - | 1 | 22,184 | 22,184 tris (100%) | yes |
| gear_steelDark | vehicle | Mesh | steelDark | - | 1 | 19,576 | sphere yes | yes |
| tree_umbrella_trunk | forest | Mesh | MeshStandardMaterial | 24 | 1 | 18,864 | 10/24 instances | yes |
| body_chrome | vehicle | Mesh | chrome | - | 1 | 17,672 | sphere yes | yes |
| campWear | camp | Mesh | campWear | - | 1 | 16,400 | sphere yes | yes |
| gear_trim | vehicle | Mesh | trim | - | 1 | 16,264 | sphere yes | yes |
| cabin_fabric | vehicle | Mesh | fabric | - | 1 | 15,720 | sphere yes | yes |
| roadStoneShadows | terrain | Mesh | ShaderMaterial | - | 1 | 15,374 | sphere yes | yes |
| farScrub | terrain | Mesh | MeshLambertMaterial | - | 1 | 15,200 | sphere yes | no |
| cabin_steelDark | vehicle | Mesh | steelDark | - | 1 | 14,736 | sphere yes | yes |
| body_paint | vehicle | Mesh | paint | - | 1 | 13,972 | sphere yes | yes |
| tree_umbrella_foliage | forest | Mesh | MeshStandardMaterial | 41 | 1 | 13,940 | 22/41 instances | yes |

Beauty pass by object-name prefix (top 15; `body_`, `cabin_`, `gear_`, `tyre_` are the truck kits):

| group/prefix | objects | calls | tris | tris inside frustum |
| --- | --- | --- | --- | --- |
| terrain/terrain | 1 | 1 | 264,548 | 67,964 |
| vehicle/body | 41 | 47 | 217,804 | 217,804 |
| terrain/roadStones | 1 | 1 | 180,520 | 45,970 |
| vehicle/cabin | 27 | 27 | 146,676 | 146,676 |
| vehicle/tyre | 24 | 24 | 99,016 | 99,016 |
| forest/grass | 81 | 81 | 92,446 | 43,260 |
| forest/tree | 10 | 10 | 90,460 | 43,996 |
| vehicle/gear | 21 | 21 | 81,652 | 81,652 |
| forest/litter | 29 | 29 | 30,264 | 15,600 |
| camp/campWear | 1 | 1 | 16,400 | 16,400 |
| forest/scrub | 56 | 56 | 15,922 | 9,092 |
| vehicle/axles | 5 | 5 | 15,568 | 15,568 |
| terrain/roadStoneShadows | 1 | 1 | 15,374 | 15,374 |
| terrain/farScrub | 1 | 1 | 15,200 | 15,200 |
| forest/forb | 25 | 25 | 13,236 | 7,100 |

Shadow pass, by name prefix (top 12) and top 10 casters:

| group/prefix | casters | shadow calls | shadow tris |
| --- | --- | --- | --- |
| vehicle/body | 22 | 22 | 206,316 |
| vehicle/tyre | 24 | 24 | 99,016 |
| forest/tree | 10 | 10 | 90,460 |
| camp/camp | 9 | 9 | 90,358 |
| vehicle/gear | 21 | 21 | 81,652 |
| vehicle/axles | 5 | 5 | 15,568 |
| forest/log | 3 | 3 | 11,408 |
| forest/scrub | 39 | 39 | 10,262 |
| forest/kopje | 3 | 3 | 10,260 |
| vehicle/brakes | 28 | 28 | 10,224 |
| forest/termite | 3 | 3 | 8,464 |
| forest/rock | 4 | 4 | 7,180 |

| caster | group | instances | calls | shadow tris |
| --- | --- | --- | --- | --- |
| body_trimGloss | vehicle | - | 1 | 36,768 |
| camp_timber | camp | - | 1 | 33,856 |
| body_trim | vehicle | - | 1 | 32,592 |
| body_steelDark | vehicle | - | 1 | 29,964 |
| body_gap | vehicle | - | 1 | 28,096 |
| tree_umbrella_trunk | forest | 41 | 1 | 26,076 |
| camp_deadwood | camp | - | 1 | 21,920 |
| gear_steelDark | vehicle | - | 1 | 19,576 |
| tree_umbrella_trunk | forest | 24 | 1 | 18,864 |
| body_chrome | vehicle | - | 1 | 17,672 |

Drawn while outside the frustum (`frustumCulled = false`):

| object | group | type | instances | calls | tris |
| --- | --- | --- | --- | --- | --- |
| fireSmoke | camp | Mesh | - | 1 | 36 |
| fireEmbers | camp | Mesh | - | 1 | 32 |
| fireFlames | camp | Mesh | - | 1 | 26 |

## 3. Textures

280 texture objects reachable from scene materials, post passes, the sky rig and the shadow map (280 distinct image sources; 275 have a GL texture). `renderer.info.memory.textures` says 305; the difference is textures the renderer owns that nothing in the scene graph points to any more (composer swap buffers' depth attachments, PMREM scratch, textures created and dropped during boot). Estimated GPU memory 306.1 MB (0 compressed). 3 texture(s) are 2048 on a side: (unnamed) 2048x2048 21.33 MB (forest:MeshStandardMaterial.map [tree_umbrella_foliage, tree_flat_foliage +2]), (unnamed) 2048x2048 16 MB (shadow:DirectionalLight), sunFar.shadowMap 2048x2048 16 MB (shadow:DirectionalLight); 0 exceed 2048. Canvas-backed textures also keep their canvas alive on the CPU: 35.86 MB of RGBA bitmaps; the DataTextures keep their typed arrays (counted in the JS heap).

| group | textures | sources | est. GPU MB | CPU canvas MB | sizes |
| --- | --- | --- | --- | --- | --- |
| forest | 44 | 44 | 73.5 | 0 | 16x 256x512, 12x 256x256, 5x 1024x1024, 5x 512x512, 3x 1024x256, 2x 128x128, 1x 2048x2048 |
| vehicle | 95 | 95 | 56.76 | 13.88 | 51x 256x256, 16x 128x128, 13x 512x512, 4x 64x64, 3x 1024x1024, 3x 512x320, 2x 512x256, 1x 512x288, 1x 512x128, 1x 256x72 |
| shadow | 4 | 4 | 40 | 0 | 2x 2048x2048, 2x 1024x1024 |
| camp | 80 | 80 | 37.3 | 11.07 | 49x 256x256, 14x 128x128, 4x 512x512, 4x 64x64, 2x 1024x512, 1x 1200x984, 1x 512x384, 1x 512x256, 1x 512x192, 1x 512x160, 1x 256x192, 1x 256x160 |
| post:gtao | 6 | 6 | 24.63 | 0 | 4x 1280x720, 1x 64x64, 1x 5x5 |
| post:smaa | 4 | 4 | 14.41 | 0 | 2x 1280x720, 1x 160x560, 1x 66x33 |
| post:bloom | 12 | 12 | 13.47 | 0 | 3x 640x360, 2x 320x180, 2x 160x90, 2x 80x45, 2x 40x23, 1x 1280x720 |
| fleet | 13 | 13 | 12.08 | 4.31 | 8x 256x256, 3x 512x512, 1x 1024x1024, 1x 128x128 |
| sky | 3 | 3 | 12.02 | 0.02 | 2x 768x1024, 1x 64x64 |
| post:sanitize | 1 | 1 | 7.03 | 0 | 1x 1280x720 |
| roadside | 4 | 4 | 6.08 | 4.56 | 2x 256x256, 1x 1024x1024, 1x 128x128 |
| wildlife | 8 | 8 | 4.85 | 2.02 | 3x 512x512, 2x 256x256, 2x 128x128, 1x 64x64 |
| terrain | 5 | 5 | 3.71 | 0 | 2x 512x512, 2x 256x256, 1x 512x192 |
| dust | 1 | 1 | 0.25 | 0 | 1x 256x256 |

Top 20 by estimated memory:

| name | class | image | size | format | mips | est. MB | owner (first) | owners |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| (unnamed) | DataTexture | Object | 2048x2048 | RGBA/u8 | yes | 21.33 | forest:MeshStandardMaterial.map [tree_umbrella_foliage, tree_flat_foliage +2] | 1 |
| (unnamed) | RenderTargetTexture | render target | 2048x2048 | RGBA/u8 | no | 16 | shadow:DirectionalLight | 1 |
| sunFar.shadowMap | DepthTexture | Object | 2048x2048 | Depth/u32 | no | 16 | shadow:DirectionalLight | 1 |
| EffectComposer.rt2 | RenderTargetTexture | render target | 1280x720 | RGBA/f16 | no | 7.03 | post:sanitize:uniforms.tDiffuse.value | 5 |
| (unnamed) | RenderTargetTexture | render target | 1280x720 | RGBA/f16 | no | 7.03 | post:gtao:gtaoRenderTarget.texture | 3 |
| (unnamed) | RenderTargetTexture | render target | 1280x720 | RGBA/f16 | no | 7.03 | post:gtao:pdRenderTarget.texture | 3 |
| (unnamed) | RenderTargetTexture | render target | 1280x720 | RGBA/f16 | no | 7.03 | post:gtao:normalRenderTarget.texture | 5 |
| EffectComposer.rt1 | RenderTargetTexture | render target | 1280x720 | RGBA/f16 | no | 7.03 | post:bloom:highPassUniforms.tDiffuse.value | 8 |
| SMAAPass.edges | RenderTargetTexture | render target | 1280x720 | RGBA/f16 | no | 7.03 | post:smaa:_edgesRT.texture | 4 |
| SMAAPass.weights | RenderTargetTexture | render target | 1280x720 | RGBA/f16 | no | 7.03 | post:smaa:_weightsRT.texture | 4 |
| (unnamed) | CanvasTexture | HTMLCanvasElement | 1200x984 | RGBA/u8 | yes | 6.01 | camp:campWear.map [campWear] | 1 |
| PMREM.cubeUv | RenderTargetTexture | render target | 768x1024 | RGBA/f16 | no | 6 | sky:pmrem._pingPongRenderTarget.texture | 3 |
| PMREM.cubeUv | RenderTargetTexture | render target | 768x1024 | RGBA/f16 | no | 6 | sky:envTarget.texture | 186 |
| (unnamed) | DataTexture | Object | 1024x1024 | RGBA/u8 | yes | 5.33 | forest:MeshStandardMaterial.map [treeFar_0, treeFar_1 +1] | 1 |
| (unnamed) | DataTexture | Object | 1024x1024 | RGBA/u8 | yes | 5.33 | forest:MeshStandardMaterial.map [grass_0_b1, grass_0_b2 +175] | 1 |
| (unnamed) | DataTexture | Object | 1024x1024 | RGBA/u8 | yes | 5.33 | forest:MeshStandardMaterial.map [scrub_0_b1, scrub_0_b2 +115] | 1 |
| (unnamed) | DataTexture | Object | 1024x1024 | RGBA/u8 | yes | 5.33 | forest:MeshStandardMaterial.map [forb_0_b11, forb_1_b1 +58] | 1 |
| (unnamed) | DataTexture | Object | 1024x1024 | RGBA/u8 | yes | 5.33 | forest:MeshStandardMaterial.map [swath_0_b0, swath_0_b1 +113] | 1 |
| (unnamed) | CanvasTexture | HTMLCanvasElement | 1024x1024 | RGBA/u8 | yes | 5.33 | vehicle:cabinPanel.map [gear_cabinPanel, cabin_cabinPanel] | 1 |
| (unnamed) | CanvasTexture | HTMLCanvasElement | 1024x1024 | RGBA/u8 | yes | 5.33 | vehicle:cabinPanel.emissiveMap [gear_cabinPanel, cabin_cabinPanel] | 1 |

Render targets:

| owner | size | samples | colour textures | depth |
| --- | --- | --- | --- | --- |
| post:gtao:gtaoRenderTarget | 1280x720 | 0 | 1 | renderbuffer |
| post:gtao:pdRenderTarget | 1280x720 | 0 | 1 | renderbuffer |
| post:gtao:normalRenderTarget | 1280x720 | 0 | 1 | depth texture |
| post:bloom:renderTargetsHorizontal[0] | 640x360 | 0 | 1 | renderbuffer |
| post:bloom:renderTargetsHorizontal[1] | 320x180 | 0 | 1 | renderbuffer |
| post:bloom:renderTargetsHorizontal[2] | 160x90 | 0 | 1 | renderbuffer |
| post:bloom:renderTargetsHorizontal[3] | 80x45 | 0 | 1 | renderbuffer |
| post:bloom:renderTargetsHorizontal[4] | 40x23 | 0 | 1 | renderbuffer |
| post:bloom:renderTargetsVertical[0] | 640x360 | 0 | 1 | renderbuffer |
| post:bloom:renderTargetsVertical[1] | 320x180 | 0 | 1 | renderbuffer |
| post:bloom:renderTargetsVertical[2] | 160x90 | 0 | 1 | renderbuffer |
| post:bloom:renderTargetsVertical[3] | 80x45 | 0 | 1 | renderbuffer |
| post:bloom:renderTargetsVertical[4] | 40x23 | 0 | 1 | renderbuffer |
| post:bloom:renderTargetBright | 640x360 | 0 | 1 | renderbuffer |
| post:smaa:_edgesRT | 1280x720 | 0 | 1 | none |
| post:smaa:_weightsRT | 1280x720 | 0 | 1 | none |
| post:composer:renderTarget1 | 1280x720 | 0 | 1 | renderbuffer |
| post:composer:renderTarget2 | 1280x720 | 0 | 1 | renderbuffer |
| sky:pmrem._pingPongRenderTarget | 768x1024 | 0 | 1 | none |
| sky:envTarget | 768x1024 | 0 | 1 | renderbuffer |
| shadow:DirectionalLight | 1024x1024 | 0 | 1 | depth texture |
| shadow:DirectionalLight | 2048x2048 | 0 | 1 | depth texture |

Every texture:

| name | class | image | size | format | mips | est. MB | GL | owners |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| (unnamed) | DataTexture | Object | 2048x2048 | RGBA/u8 | y | 21.33 | y | forest:MeshStandardMaterial.map [tree_umbrella_foliage, tree_flat_foliage +2] |
| (unnamed) | RenderTargetTexture | render target | 2048x2048 | RGBA/u8 | n | 16 | y | shadow:DirectionalLight |
| sunFar.shadowMap | DepthTexture | Object | 2048x2048 | Depth/u32 | n | 16 | y | shadow:DirectionalLight |
| EffectComposer.rt2 | RenderTargetTexture | render target | 1280x720 | RGBA/f16 | n | 7.03 | y | post:sanitize:uniforms.tDiffuse.value; post:composer:renderTarget2.texture; post:composer:renderTarget2.textures[0] |
| (unnamed) | RenderTargetTexture | render target | 1280x720 | RGBA/f16 | n | 7.03 | y | post:gtao:gtaoRenderTarget.texture; post:gtao:gtaoRenderTarget.textures[0]; post:gtao:pdMaterial.u.tDiffuse |
| (unnamed) | RenderTargetTexture | render target | 1280x720 | RGBA/f16 | n | 7.03 | y | post:gtao:pdRenderTarget.texture; post:gtao:pdRenderTarget.textures[0]; post:gtao:blendMaterial.u.tDiffuse |
| (unnamed) | RenderTargetTexture | render target | 1280x720 | RGBA/f16 | n | 7.03 | y | post:gtao:normalRenderTarget.texture; post:gtao:normalRenderTarget.textures[0]; post:gtao:normalTexture |
| EffectComposer.rt1 | RenderTargetTexture | render target | 1280x720 | RGBA/f16 | n | 7.03 | y | post:bloom:highPassUniforms.tDiffuse.value; post:composer:renderTarget1.texture; post:composer:renderTarget1.textures[0] |
| SMAAPass.edges | RenderTargetTexture | render target | 1280x720 | RGBA/f16 | n | 7.03 | y | post:smaa:_edgesRT.texture; post:smaa:_edgesRT.textures[0]; post:smaa:_uniformsWeights.tDiffuse.value |
| SMAAPass.weights | RenderTargetTexture | render target | 1280x720 | RGBA/f16 | n | 7.03 | y | post:smaa:_weightsRT.texture; post:smaa:_weightsRT.textures[0]; post:smaa:_uniformsBlend.tDiffuse.value |
| (unnamed) | CanvasTexture | HTMLCanvasElement | 1200x984 | RGBA/u8 | y | 6.01 | y | camp:campWear.map [campWear] |
| PMREM.cubeUv | RenderTargetTexture | render target | 768x1024 | RGBA/f16 | n | 6 | y | sky:pmrem._pingPongRenderTarget.texture; sky:pmrem._pingPongRenderTarget.textures[0]; sky:pmrem._ggxMaterial.u.envMap |
| PMREM.cubeUv | RenderTargetTexture | render target | 768x1024 | RGBA/f16 | n | 6 | y | sky:envTarget.texture; sky:envTarget.textures[0]; sky:env |
| (unnamed) | DataTexture | Object | 1024x1024 | RGBA/u8 | y | 5.33 | y | forest:MeshStandardMaterial.map [treeFar_0, treeFar_1 +1] |
| (unnamed) | DataTexture | Object | 1024x1024 | RGBA/u8 | y | 5.33 | y | forest:MeshStandardMaterial.map [grass_0_b1, grass_0_b2 +175] |
| (unnamed) | DataTexture | Object | 1024x1024 | RGBA/u8 | y | 5.33 | y | forest:MeshStandardMaterial.map [scrub_0_b1, scrub_0_b2 +115] |
| (unnamed) | DataTexture | Object | 1024x1024 | RGBA/u8 | y | 5.33 | y | forest:MeshStandardMaterial.map [forb_0_b11, forb_1_b1 +58] |
| (unnamed) | DataTexture | Object | 1024x1024 | RGBA/u8 | y | 5.33 | y | forest:MeshStandardMaterial.map [swath_0_b0, swath_0_b1 +113] |
| (unnamed) | CanvasTexture | HTMLCanvasElement | 1024x1024 | RGBA/u8 | y | 5.33 | y | vehicle:cabinPanel.map [gear_cabinPanel, cabin_cabinPanel] |
| (unnamed) | CanvasTexture | HTMLCanvasElement | 1024x1024 | RGBA/u8 | y | 5.33 | y | vehicle:cabinPanel.emissiveMap [gear_cabinPanel, cabin_cabinPanel] |
| (unnamed) | CanvasTexture | HTMLCanvasElement | 1024x1024 | RGBA/u8 | y | 5.33 | y | vehicle:cabinPanel.roughnessMap [gear_cabinPanel, cabin_cabinPanel] |
| (unnamed) | CanvasTexture | HTMLCanvasElement | 1024x1024 | RGBA/u8 | y | 5.33 | y | fleet:fleet_decal.map [fleet_decal] |
| (unnamed) | CanvasTexture | HTMLCanvasElement | 1024x1024 | RGBA/u8 | y | 5.33 | y | roadside:MeshStandardMaterial.map [roadside_sign] |
| (unnamed) | RenderTargetTexture | render target | 1024x1024 | RGBA/u8 | n | 4 | y | shadow:DirectionalLight |
| sun.shadowMap | DepthTexture | Object | 1024x1024 | Depth/u32 | n | 4 | y | shadow:DirectionalLight |
| (unnamed) | DepthTexture | Object | 1280x720 | DepthStencil/u24_8 | n | 3.52 | y | post:gtao:depthTexture; post:gtao:normalRenderTarget.depthTexture; post:gtao:gtaoMaterial.u.tDepth |
| (unnamed) | CanvasTexture | HTMLCanvasElement | 1024x512 | RGBA/u8 | y | 2.67 | n | camp:signGate.map [camp_signGate] |
| (unnamed) | CanvasTexture | HTMLCanvasElement | 1024x512 | RGBA/u8 | y | 2.67 | n | camp:signSpeed.map [camp_signSpeed] |
| UnrealBloomPass.h0 | RenderTargetTexture | render target | 640x360 | RGBA/f16 | n | 1.76 | y | post:bloom:renderTargetsHorizontal[0].texture; post:bloom:renderTargetsHorizontal[0].textures[0]; post:bloom:copyUniforms.tDiffuse.value |
| UnrealBloomPass.v0 | RenderTargetTexture | render target | 640x360 | RGBA/f16 | n | 1.76 | y | post:bloom:renderTargetsVertical[0].texture; post:bloom:renderTargetsVertical[0].textures[0]; post:bloom:compositeMaterial.u.blurTexture1 |
| UnrealBloomPass.bright | RenderTargetTexture | render target | 640x360 | RGBA/f16 | n | 1.76 | y | post:bloom:renderTargetBright.texture; post:bloom:renderTargetBright.textures[0] |
| (unnamed) | DataTexture | Object | 512x512 | RGBA/u8 | y | 1.33 | y | terrain:MeshStandardMaterial.map [terrain] |
| (unnamed) | DataTexture | Object | 512x512 | RGBA/u8 | y | 1.33 | y | terrain:MeshStandardMaterial.normalMap [terrain] |
| (unnamed) | DataTexture | Object | 512x512 | RGBA/u8 | y | 1.33 | y | forest:MeshStandardMaterial.map [litter_0_b1, litter_0_b2 +57] |
| (unnamed) | DataTexture | Object | 512x512 | RGBA/u8 | y | 1.33 | y | forest:MeshStandardMaterial.map [log_1, log_2] |
| (unnamed) | DataTexture | Object | 512x512 | RGBA/u8 | y | 1.33 | y | forest:MeshStandardMaterial.aoMap [log_1, log_2] |
| (unnamed) | DataTexture | Object | 512x512 | RGBA/u8 | y | 1.33 | y | forest:MeshStandardMaterial.normalMap [log_1, log_2] |
| (unnamed) | DataTexture | Object | 512x512 | RGBA/u8 | y | 1.33 | y | forest:MeshStandardMaterial.roughnessMap [log_1, log_2] |
| (unnamed) | DataTexture | Object | 1024x256 | RGBA/u8 | y | 1.33 | y | forest:MeshLambertMaterial.map [treeline_0] |
| (unnamed) | DataTexture | Object | 1024x256 | RGBA/u8 | y | 1.33 | y | forest:MeshLambertMaterial.map [treeline_1] |
| (unnamed) | DataTexture | Object | 1024x256 | RGBA/u8 | y | 1.33 | y | forest:MeshLambertMaterial.map [treeline_2] |
| (unnamed) | DataTexture | Object | 512x512 | RGBA/u8 | y | 1.33 | y | vehicle:steelDark.map [body_steelDark, gear_steelDark +1] |
| (unnamed) | DataTexture | Object | 512x512 | RGBA/u8 | y | 1.33 | y | vehicle:steelDark.normalMap [body_steelDark, gear_steelDark +1]; fleet:fleet_steel.normalMap [fleet_steel]; fleet:fleet_whip.normalMap [fleet_whip] |
| (unnamed) | DataTexture | Object | 512x512 | RGBA/u8 | y | 1.33 | y | vehicle:steelDark.roughnessMap [body_steelDark, gear_steelDark +1]; fleet:fleet_steel.roughnessMap [fleet_steel]; fleet:fleet_whip.roughnessMap [fleet_whip] |
| (unnamed) | DataTexture | Object | 512x512 | RGBA/u8 | y | 1.33 | y | vehicle:steel.map [body_steel, gear_steel] |
| (unnamed) | DataTexture | Object | 512x512 | RGBA/u8 | y | 1.33 | y | vehicle:steel.metalnessMap [body_steel, gear_steel] |
| (unnamed) | DataTexture | Object | 512x512 | RGBA/u8 | y | 1.33 | y | vehicle:steel.normalMap [body_steel, gear_steel]; vehicle:chrome.normalMap [body_chrome, gear_chrome +1]; fleet:fleet_chrome.normalMap [fleet_chrome] |
| (unnamed) | DataTexture | Object | 512x512 | RGBA/u8 | y | 1.33 | y | vehicle:steel.roughnessMap [body_steel, gear_steel]; fleet:fleet_rust.roughnessMap [fleet_rust] |
| (unnamed) | DataTexture | Object | 512x512 | RGBA/u8 | y | 1.33 | y | vehicle:paint.map [body_paint]; vehicle:paintRoof.map [body_paintRoof] |
| (unnamed) | DataTexture | Object | 512x512 | RGBA/u8 | y | 1.33 | y | vehicle:paint.roughnessMap [body_paint]; vehicle:paintDark.roughnessMap [body_paintDark]; vehicle:paintAccent.roughnessMap [body_paintAccent, gear_paintAccent] |
| (unnamed) | DataTexture | Object | 512x512 | RGBA/u8 | y | 1.33 | y | vehicle:paintDark.map [body_paintDark] |
| (unnamed) | DataTexture | Object | 512x512 | RGBA/u8 | y | 1.33 | y | vehicle:paintAccent.map [body_paintAccent, gear_paintAccent] |
| (unnamed) | DataTexture | Object | 512x512 | RGBA/u8 | y | 1.33 | y | vehicle:glass.map [body_glass_0]; vehicle:glassDark.map [body_glassDark_0]; vehicle:glassSide.map [body_glassSide_0, body_glassSide_1 +2] |
| (unnamed) | DataTexture | Object | 512x512 | RGBA/u8 | y | 1.33 | y | vehicle:glass.roughnessMap [body_glass_0]; fleet:fleet_glassCracked.roughnessMap [supply-truck_0_glassCracked_0, safari-jeep_0_glassCracked_0 +1]; fleet:fleet_glassDusty.roughnessMap [supply-truck_0_glassDusty_1, supply-truck_0_glassDusty_2 +13] |
| (unnamed) | DataTexture | Object | 512x512 | RGBA/u8 | y | 1.33 | y | camp:steel.map [camp_steel] |
| (unnamed) | DataTexture | Object | 512x512 | RGBA/u8 | y | 1.33 | y | camp:steel.metalnessMap [camp_steel] |
| (unnamed) | DataTexture | Object | 512x512 | RGBA/u8 | y | 1.33 | y | camp:steel.normalMap [camp_steel] |
| (unnamed) | DataTexture | Object | 512x512 | RGBA/u8 | y | 1.33 | y | camp:steel.roughnessMap [camp_steel] |
| (unnamed) | DataTexture | Object | 512x512 | RGBA/u8 | y | 1.33 | y | fleet:fleet_paint.map [fleet_paint]; fleet:fleet_paintOld.map [fleet_paintOld] |
| (unnamed) | DataTexture | Uint8Array data | 512x512 | RGBA/u8 | y | 1.33 | y | fleet:fleet_steel.map [fleet_steel]; fleet:fleet_whip.map [fleet_whip] |
| (unnamed) | DataTexture | Uint8Array data | 512x512 | RGBA/u8 | y | 1.33 | y | fleet:fleet_rust.map [fleet_rust] |
| (unnamed) | CanvasTexture | HTMLCanvasElement | 512x512 | RGBA/u8 | y | 1.33 | y | wildlife:lion-coat.map [lion-body-0, lion-body-1 +1] |
| (unnamed) | DataTexture | Object | 512x512 | RGBA/u8 | y | 1.33 | y | wildlife:lion-strands.map [lion-strands-0, lion-strands-1 +1] |
| (unnamed) | CanvasTexture | HTMLCanvasElement | 512x512 | RGBA/u8 | y | 1.33 | y | wildlife:lion-coat-cub.map [lion-body-0, lion-body-1 +1] |
| (unnamed) | CanvasTexture | HTMLCanvasElement | 512x384 | RGBA/u8 | y | 1 | y | camp:mapBoard.map [camp_mapBoard] |
| (unnamed) | DataTexture | Object | 512x320 | RGBA/u8 | y | 0.83 | y | vehicle:tyreCarcass.map [tyre_carcass] |
| (unnamed) | DataTexture | Object | 512x320 | RGBA/u8 | y | 0.83 | y | vehicle:tyreCarcass.normalMap [tyre_carcass] |
| (unnamed) | DataTexture | Object | 512x320 | RGBA/u8 | y | 0.83 | y | vehicle:tyreCarcass.roughnessMap [tyre_carcass] |
| (unnamed) | CanvasTexture | HTMLCanvasElement | 512x288 | RGBA/u8 | y | 0.75 | y | vehicle:MeshBasicMaterial.map [cabin_screenFilm] |
| (unnamed) | DataTexture | Object | 256x512 | RGBA/u8 | y | 0.67 | y | forest:MeshStandardMaterial.map [tree_umbrella_trunk, tree_flat_trunk] |
| (unnamed) | DataTexture | Object | 256x512 | RGBA/u8 | y | 0.67 | y | forest:MeshStandardMaterial.aoMap [tree_umbrella_trunk, tree_flat_trunk] |
| (unnamed) | DataTexture | Object | 256x512 | RGBA/u8 | y | 0.67 | y | forest:MeshStandardMaterial.normalMap [tree_umbrella_trunk, tree_flat_trunk] |
| (unnamed) | DataTexture | Object | 256x512 | RGBA/u8 | y | 0.67 | y | forest:MeshStandardMaterial.roughnessMap [tree_umbrella_trunk, tree_flat_trunk] |
| (unnamed) | DataTexture | Object | 256x512 | RGBA/u8 | y | 0.67 | y | forest:MeshStandardMaterial.map [tree_round_trunk] |
| (unnamed) | DataTexture | Object | 256x512 | RGBA/u8 | y | 0.67 | y | forest:MeshStandardMaterial.aoMap [tree_round_trunk] |
| (unnamed) | DataTexture | Object | 256x512 | RGBA/u8 | y | 0.67 | y | forest:MeshStandardMaterial.normalMap [tree_round_trunk] |
| (unnamed) | DataTexture | Object | 256x512 | RGBA/u8 | y | 0.67 | y | forest:MeshStandardMaterial.roughnessMap [tree_round_trunk] |
| (unnamed) | DataTexture | Object | 256x512 | RGBA/u8 | y | 0.67 | y | forest:MeshStandardMaterial.map [tree_thorn_trunk] |
| (unnamed) | DataTexture | Object | 256x512 | RGBA/u8 | y | 0.67 | y | forest:MeshStandardMaterial.aoMap [tree_thorn_trunk] |
| (unnamed) | DataTexture | Object | 256x512 | RGBA/u8 | y | 0.67 | y | forest:MeshStandardMaterial.normalMap [tree_thorn_trunk] |
| (unnamed) | DataTexture | Object | 256x512 | RGBA/u8 | y | 0.67 | y | forest:MeshStandardMaterial.roughnessMap [tree_thorn_trunk] |
| (unnamed) | DataTexture | Object | 256x512 | RGBA/u8 | y | 0.67 | y | forest:MeshStandardMaterial.map [tree_dead_trunk, log_0]; camp:deadwood.map [camp_deadwood] |
| (unnamed) | DataTexture | Object | 256x512 | RGBA/u8 | y | 0.67 | y | forest:MeshStandardMaterial.aoMap [tree_dead_trunk, log_0]; camp:deadwood.aoMap [camp_deadwood] |
| (unnamed) | DataTexture | Object | 256x512 | RGBA/u8 | y | 0.67 | y | forest:MeshStandardMaterial.normalMap [tree_dead_trunk, log_0]; camp:deadwood.normalMap [camp_deadwood] |
| (unnamed) | DataTexture | Object | 256x512 | RGBA/u8 | y | 0.67 | y | forest:MeshStandardMaterial.roughnessMap [tree_dead_trunk, log_0]; camp:deadwood.roughnessMap [camp_deadwood] |
| (unnamed) | CanvasTexture | HTMLCanvasElement | 512x256 | RGBA/u8 | y | 0.67 | y | vehicle:decalNumber.map [body_decalNumber] |
| (unnamed) | CanvasTexture | HTMLCanvasElement | 512x256 | RGBA/u8 | y | 0.67 | y | vehicle:decalBadge.map [body_decalBadge, gear_decalBadge] |
| (unnamed) | CanvasTexture | HTMLCanvasElement | 512x256 | RGBA/u8 | y | 0.67 | y | camp:signFuel.map [camp_signFuel] |
| (unnamed) | CanvasTexture | HTMLCanvasElement | 512x192 | RGBA/u8 | y | 0.5 | y | camp:signLatrine.map [camp_signLatrine] |
| UnrealBloomPass.h1 | RenderTargetTexture | render target | 320x180 | RGBA/f16 | n | 0.44 | y | post:bloom:renderTargetsHorizontal[1].texture; post:bloom:renderTargetsHorizontal[1].textures[0]; post:bloom:separableBlurMaterials[1].u.colorTexture |
| UnrealBloomPass.v1 | RenderTargetTexture | render target | 320x180 | RGBA/f16 | n | 0.44 | y | post:bloom:renderTargetsVertical[1].texture; post:bloom:renderTargetsVertical[1].textures[0]; post:bloom:compositeMaterial.u.blurTexture2 |
| (unnamed) | CanvasTexture | HTMLCanvasElement | 512x160 | RGBA/u8 | y | 0.42 | y | camp:signOffice.map [camp_signOffice] |
| (unnamed) | DataTexture | Object | 512x192 | RGBA/u8 | n | 0.38 | y | terrain:ShaderMaterial.u.uCanopy [roadWater] |
| SMAAPass.area | Texture | HTMLImageElement | 160x560 | RGBA/u8 | n | 0.34 | y | post:smaa:_areaTexture; post:smaa:_materialWeights.u.tArea |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | terrain:ShaderMaterial.u.uRipple [roadWater] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | terrain:MeshLambertMaterial.map [farHills] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | forest:MeshStandardMaterial.map [kopje_0, kopje_1 +5] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | forest:MeshStandardMaterial.aoMap [kopje_0, kopje_1 +5] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | forest:MeshStandardMaterial.normalMap [kopje_0, kopje_1 +5] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | forest:MeshStandardMaterial.roughnessMap [kopje_0, kopje_1 +5] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | forest:MeshStandardMaterial.map [termite_0, termite_1 +1] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | forest:MeshStandardMaterial.aoMap [termite_0, termite_1 +1] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | forest:MeshStandardMaterial.normalMap [termite_0, termite_1 +1] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | forest:MeshStandardMaterial.roughnessMap [termite_0, termite_1 +1] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | forest:MeshStandardMaterial.map [logEnd_0, logEnd_1 +1] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | forest:MeshStandardMaterial.aoMap [logEnd_0, logEnd_1 +1] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | forest:MeshStandardMaterial.normalMap [logEnd_0, logEnd_1 +1] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | forest:MeshStandardMaterial.roughnessMap [logEnd_0, logEnd_1 +1] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:trim.map [body_trim, gear_trim +1] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:trim.normalMap [body_trim, gear_trim +1]; fleet:fleet_trim.normalMap [fleet_trim] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:trim.roughnessMap [body_trim, gear_trim +1]; fleet:fleet_trim.roughnessMap [fleet_trim] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:alu.normalMap [body_alu, gear_alu +1]; camp:alu.normalMap [camp_alu]; fleet:fleet_alu.normalMap [fleet_alu] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:alu.roughnessMap [body_alu, gear_alu +1]; camp:alu.roughnessMap [camp_alu]; fleet:fleet_alu.roughnessMap [fleet_alu] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:trimGloss.map [body_trimGloss, gear_trimGloss +1] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:trimGloss.normalMap [body_trimGloss, gear_trimGloss +1]; vehicle:fridgeCase.normalMap [gear_fridgeCase]; fleet:fleet_trimGloss.normalMap [fleet_trimGloss] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:trimGloss.roughnessMap [body_trimGloss, gear_trimGloss +1]; vehicle:fridgeCase.roughnessMap [gear_fridgeCase]; fleet:fleet_trimGloss.roughnessMap [fleet_trimGloss] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:rubber.map [body_rubber, gear_rubber]; vehicle:tread.map [gear_tread]; vehicle:MeshStandardMaterial.map [cabin_rubber] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:rubber.normalMap [body_rubber, gear_rubber]; vehicle:gasket.normalMap [body_gasket]; vehicle:MeshStandardMaterial.normalMap [cabin_rubber] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:rubber.roughnessMap [body_rubber, gear_rubber]; vehicle:MeshStandardMaterial.roughnessMap [cabin_rubber]; camp:rubber.roughnessMap [camp_rubber] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:plate.map [body_plate, gear_plate] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:plate.normalMap [body_plate, gear_plate]; fleet:fleet_plate.normalMap [fleet_plate] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:plate.roughnessMap [body_plate, gear_plate]; fleet:fleet_plate.roughnessMap [fleet_plate] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:paint.normalMap [body_paint]; vehicle:paintDark.normalMap [body_paintDark]; vehicle:paintAccent.normalMap [body_paintAccent, gear_paintAccent] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:paint.clearcoatNormalMap [body_paint]; vehicle:paintDark.clearcoatNormalMap [body_paintDark]; vehicle:paintAccent.clearcoatNormalMap [body_paintAccent, gear_paintAccent] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:chrome.roughnessMap [body_chrome, gear_chrome +1]; fleet:fleet_chrome.roughnessMap [fleet_chrome] |
| (unnamed) | CanvasTexture | HTMLCanvasElement | 512x128 | RGBA/u8 | y | 0.33 | y | vehicle:decalName.map [body_decalName] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:reflector.map [body_reflector, gear_reflector]; fleet:fleet_reflector.map [fleet_reflector] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:reflector.normalMap [body_reflector, gear_reflector]; fleet:fleet_reflector.normalMap [fleet_reflector] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:reflector.roughnessMap [body_reflector, gear_reflector]; fleet:fleet_reflector.roughnessMap [fleet_reflector] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:bedLiner.map [body_bedLiner] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:bedLiner.normalMap [body_bedLiner] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:bedLiner.roughnessMap [body_bedLiner] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:canvasTop.normalMap [gear_canvasTop]; vehicle:canvasKhaki.normalMap [gear_canvasKhaki]; vehicle:fabric.normalMap [cabin_fabric] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:tread.aoMap [gear_tread] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:tread.normalMap [gear_tread] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:tread.roughnessMap [gear_tread] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:cabinPanel.normalMap [gear_cabinPanel, cabin_cabinPanel]; vehicle:interiorPlastic.normalMap [cabin_interiorPlastic]; vehicle:MeshStandardMaterial.normalMap [cabin_cardVinyl] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:interiorPlastic.map [cabin_interiorPlastic]; vehicle:MeshStandardMaterial.map [cabin_cardVinyl] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:interiorPlastic.roughnessMap [cabin_interiorPlastic]; vehicle:MeshStandardMaterial.roughnessMap [cabin_cardVinyl]; fleet:fleet_vinyl.roughnessMap [fleet_vinyl] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:floorMat.map [cabin_floorMat] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:floorMat.normalMap [cabin_floorMat] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:floorMat.roughnessMap [cabin_floorMat] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:interiorFaded.map [cabin_interiorFaded] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:interiorFaded.normalMap [cabin_interiorFaded]; vehicle:MeshStandardMaterial.normalMap [cabin_paper]; fleet:fleet_vinylFaded.normalMap [fleet_vinylFaded] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:interiorFaded.roughnessMap [cabin_interiorFaded]; fleet:fleet_vinylFaded.roughnessMap [fleet_vinylFaded] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:fabric.map [cabin_fabric] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:fabric.roughnessMap [cabin_fabric]; fleet:fleet_fabric.roughnessMap [fleet_fabric]; fleet:fleet_canvas.roughnessMap [fleet_canvas] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:wheelRim.map [cabin_wheelRim] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:wheelRim.normalMap [cabin_wheelRim] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:wheelRim.roughnessMap [cabin_wheelRim] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:castIron.map [axles_cast, brakes_cast]; vehicle:caliper.map [brakes_caliperM] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:castIron.metalnessMap [axles_cast, brakes_cast] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:castIron.normalMap [axles_cast, brakes_cast]; vehicle:caliper.normalMap [brakes_caliperM] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:castIron.roughnessMap [axles_cast, brakes_cast]; vehicle:caliper.roughnessMap [brakes_caliperM] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:rimMachined.map [axles_machined, tyre_machined +1]; vehicle:rimPowdercoat.map [axles_anod, tyre_anod] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:rimMachined.normalMap [axles_machined, tyre_machined +1]; vehicle:rimPowdercoat.normalMap [axles_anod, tyre_anod] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:rimMachined.roughnessMap [axles_machined, tyre_machined +1]; vehicle:rimPowdercoat.roughnessMap [axles_anod, tyre_anod] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:brakeRotor.map [brakes_rotor] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:brakeRotor.normalMap [brakes_rotor] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:brakeRotor.roughnessMap [brakes_rotor] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | camp:rock.map [camp_rock] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | camp:rock.normalMap [camp_rock] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | camp:rock.roughnessMap [camp_rock] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | camp:timber.map [camp_timber]; camp:pole.map [camp_pole] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | camp:timber.normalMap [camp_timber]; camp:pole.normalMap [camp_pole] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | camp:timber.roughnessMap [camp_timber]; camp:pole.roughnessMap [camp_pole] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | camp:timberWarm.map [camp_timberWarm] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | camp:timberWarm.normalMap [camp_timberWarm] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | camp:timberWarm.roughnessMap [camp_timberWarm] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | camp:galv.map [camp_galv] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | camp:galv.metalnessMap [camp_galv] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | camp:galv.normalMap [camp_galv] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | camp:galv.roughnessMap [camp_galv] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | camp:steelBlack.map [camp_steelBlack] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | camp:steelBlack.normalMap [camp_steelBlack] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | camp:steelBlack.roughnessMap [camp_steelBlack] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | camp:crate.map [camp_crate] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | camp:crate.normalMap [camp_crate] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | camp:crate.roughnessMap [camp_crate] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | camp:steelRed.map [camp_steelRed] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | camp:steelRed.normalMap [camp_steelRed] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | camp:steelRed.roughnessMap [camp_steelRed] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | camp:steelWhite.map [camp_steelWhite] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | camp:steelWhite.normalMap [camp_steelWhite] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | camp:steelWhite.roughnessMap [camp_steelWhite] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | camp:steelGreen.map [camp_steelGreen] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | camp:steelGreen.normalMap [camp_steelGreen] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | camp:steelGreen.roughnessMap [camp_steelGreen] |
| (unnamed) | CanvasTexture | HTMLCanvasElement | 256x256 | RGBA/u8 | y | 0.33 | y | camp:solar.map [camp_solar] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | camp:steelBlue.map [camp_steelBlue] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | camp:steelBlue.normalMap [camp_steelBlue] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | camp:steelBlue.roughnessMap [camp_steelBlue] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | camp:steelYellow.map [camp_steelYellow] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | camp:steelYellow.normalMap [camp_steelYellow] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | camp:steelYellow.roughnessMap [camp_steelYellow] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | camp:canvasSand.map [camp_canvasSand]; camp:tarp.map [camp_tarp] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | camp:canvasSand.normalMap [camp_canvasSand]; camp:tarp.normalMap [camp_tarp] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | camp:canvasSand.roughnessMap [camp_canvasSand]; camp:tarp.roughnessMap [camp_tarp] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | camp:canvasGreen.map [camp_canvasGreen]; camp:canvasChair.map [camp_canvasChair] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | camp:canvasGreen.normalMap [camp_canvasGreen]; camp:canvasChair.normalMap [camp_canvasChair] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | camp:canvasGreen.roughnessMap [camp_canvasGreen]; camp:canvasChair.roughnessMap [camp_canvasChair] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | camp:canvas.map [camp_canvas] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | camp:canvas.normalMap [camp_canvas] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | camp:canvas.roughnessMap [camp_canvas] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | camp:canvasOlive.map [camp_canvasOlive] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | camp:canvasOlive.normalMap [camp_canvasOlive] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | camp:canvasOlive.roughnessMap [camp_canvasOlive] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | camp:grass.map [campGrass]; camp:grass.emissiveMap [campGrass] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | camp:ShaderMaterial.u.uTex [fireFlames] |
| (unnamed) | CanvasTexture | HTMLCanvasElement | 256x256 | RGBA/u8 | y | 0.33 | y | fleet:fleet_glassCracked.emissiveMap [supply-truck_0_glassCracked_0, safari-jeep_0_glassCracked_0 +1] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | fleet:fleet_rubber.map [fleet_rubber]; fleet:fleet_tread.map [fleet_tread] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | fleet:fleet_trim.map [fleet_trim] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | fleet:fleet_fabric.map [fleet_fabric]; fleet:fleet_canvas.map [fleet_canvas] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | fleet:fleet_vinyl.map [fleet_vinyl] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | fleet:fleet_vinylFaded.map [fleet_vinylFaded] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | fleet:fleet_plate.map [fleet_plate] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | fleet:fleet_trimGloss.map [fleet_trimGloss] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | n | wildlife:lion-coat.normalMap [lion-body-0, lion-body-1 +1]; wildlife:lion-coat-cub.normalMap [lion-body-0, lion-body-1 +1] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | n | wildlife:lion-mane-base.map [lion-mane-0, lion-mane-1 +1]; wildlife:lion-mane-shells.map [lion-mane-shells-0, lion-mane-shells-1 +1] |
| (unnamed) | CanvasTexture | HTMLCanvasElement | 256x256 | RGBA/u8 | y | 0.33 | y | roadside:MeshStandardMaterial.map [roadside_timber] |
| (unnamed) | CanvasTexture | HTMLCanvasElement | 256x256 | RGBA/u8 | y | 0.33 | y | roadside:MeshStandardMaterial.map [roadside_concrete] |
| (unnamed) | CanvasTexture | HTMLCanvasElement | 256x192 | RGBA/u8 | y | 0.25 | y | camp:signRadio.map [camp_signRadio] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | n | 0.25 | y | dust:ShaderMaterial.u.uMap [wheelDust] |
| (unnamed) | CanvasTexture | HTMLCanvasElement | 256x160 | RGBA/u8 | y | 0.21 | y | camp:campFlag.map [campFlag] |
| UnrealBloomPass.h2 | RenderTargetTexture | render target | 160x90 | RGBA/f16 | n | 0.11 | y | post:bloom:renderTargetsHorizontal[2].texture; post:bloom:renderTargetsHorizontal[2].textures[0]; post:bloom:separableBlurMaterials[2].u.colorTexture |
| UnrealBloomPass.v2 | RenderTargetTexture | render target | 160x90 | RGBA/f16 | n | 0.11 | y | post:bloom:renderTargetsVertical[2].texture; post:bloom:renderTargetsVertical[2].textures[0]; post:bloom:compositeMaterial.u.blurTexture3 |
| (unnamed) | CanvasTexture | HTMLCanvasElement | 256x72 | RGBA/u8 | y | 0.09 | y | vehicle:MeshBasicMaterial.map [cabin_mirrorGlass] |
| (unnamed) | DataTexture | Object | 128x128 | RGBA/u8 | y | 0.08 | y | forest:MeshStandardMaterial.map [forestSkirt] |
| (unnamed) | DataTexture | Object | 128x128 | RGBA/u8 | y | 0.08 | y | forest:MeshStandardMaterial.roughnessMap [forestSkirt] |
| (unnamed) | DataTexture | Object | 128x128 | RGBA/u8 | y | 0.08 | y | vehicle:amber.normalMap [body_amber]; vehicle:reflectorRed.normalMap [body_reflectorRed, cabin_reflectorRed]; vehicle:taillight.normalMap [body_taillight] |
| (unnamed) | DataTexture | Object | 128x128 | RGBA/u8 | y | 0.08 | y | vehicle:mesh.map [body_mesh, gear_mesh]; fleet:fleet_mesh.map [fleet_mesh] |
| (unnamed) | DataTexture | Object | 128x128 | RGBA/u8 | y | 0.08 | y | vehicle:lensClear.normalMap [body_lensClear_0, body_lensClear_1 +9] |
| (unnamed) | DataTexture | Object | 128x128 | RGBA/u8 | y | 0.08 | y | vehicle:wheelWorn.map [cabin_wheelWorn] |
| (unnamed) | DataTexture | Object | 128x128 | RGBA/u8 | y | 0.08 | y | vehicle:wheelWorn.normalMap [cabin_wheelWorn] |
| (unnamed) | DataTexture | Object | 128x128 | RGBA/u8 | y | 0.08 | y | vehicle:wheelWorn.roughnessMap [cabin_wheelWorn] |
| (unnamed) | DataTexture | Object | 128x128 | RGBA/u8 | y | 0.08 | y | vehicle:headliner.map [cabin_headliner] |
| (unnamed) | DataTexture | Object | 128x128 | RGBA/u8 | y | 0.08 | y | vehicle:headliner.normalMap [cabin_headliner] |
| (unnamed) | DataTexture | Object | 128x128 | RGBA/u8 | y | 0.08 | y | vehicle:headliner.roughnessMap [cabin_headliner] |
| (unnamed) | DataTexture | Object | 128x128 | RGBA/u8 | y | 0.08 | y | vehicle:tyreLug.map [axles_lugRub, tyre_lugRub +1] |
| (unnamed) | DataTexture | Object | 128x128 | RGBA/u8 | y | 0.08 | y | vehicle:tyreLug.normalMap [axles_lugRub, tyre_lugRub +1] |
| (unnamed) | DataTexture | Object | 128x128 | RGBA/u8 | y | 0.08 | y | vehicle:tyreLug.roughnessMap [axles_lugRub, tyre_lugRub +1] |
| (unnamed) | DataTexture | Object | 128x128 | RGBA/u8 | y | 0.08 | y | vehicle:mudCake.map [axles_mudM, tyre_mudM +1] |
| (unnamed) | DataTexture | Object | 128x128 | RGBA/u8 | y | 0.08 | y | vehicle:mudCake.normalMap [axles_mudM, tyre_mudM +1] |
| (unnamed) | DataTexture | Object | 128x128 | RGBA/u8 | y | 0.08 | y | vehicle:mudCake.roughnessMap [axles_mudM, tyre_mudM +1] |
| (unnamed) | DataTexture | Object | 128x128 | RGBA/u8 | y | 0.08 | y | vehicle:contactDust.map [contact_dust] |
| (unnamed) | DataTexture | Object | 128x128 | RGBA/u8 | y | 0.08 | y | camp:polyBlack.map [camp_polyBlack]; camp:poly.map [camp_poly]; camp:polyBlue.map [camp_polyBlue] |
| (unnamed) | DataTexture | Object | 128x128 | RGBA/u8 | y | 0.08 | y | camp:polyBlack.normalMap [camp_polyBlack]; camp:poly.normalMap [camp_poly]; camp:polyBlue.normalMap [camp_polyBlue] |
| (unnamed) | DataTexture | Object | 128x128 | RGBA/u8 | y | 0.08 | y | camp:polyBlack.roughnessMap [camp_polyBlack]; camp:poly.roughnessMap [camp_poly]; camp:polyBlue.roughnessMap [camp_polyBlue] |
| (unnamed) | DataTexture | Object | 128x128 | RGBA/u8 | y | 0.08 | y | camp:chairCloth.map [camp_chairCloth] |
| (unnamed) | DataTexture | Object | 128x128 | RGBA/u8 | y | 0.08 | y | camp:chairCloth.normalMap [camp_chairCloth] |
| (unnamed) | DataTexture | Object | 128x128 | RGBA/u8 | y | 0.08 | y | camp:chairCloth.roughnessMap [camp_chairCloth] |
| (unnamed) | DataTexture | Object | 128x128 | RGBA/u8 | y | 0.08 | y | camp:ash.map [camp_ash] |
| (unnamed) | DataTexture | Object | 128x128 | RGBA/u8 | y | 0.08 | y | camp:ash.emissiveMap [camp_ash] |
| (unnamed) | DataTexture | Object | 128x128 | RGBA/u8 | y | 0.08 | y | camp:ash.normalMap [camp_ash] |
| (unnamed) | DataTexture | Object | 128x128 | RGBA/u8 | y | 0.08 | y | camp:ash.roughnessMap [camp_ash] |
| (unnamed) | DataTexture | Object | 128x128 | RGBA/u8 | y | 0.08 | y | camp:charLog.map [camp_charLog] |
| (unnamed) | DataTexture | Object | 128x128 | RGBA/u8 | y | 0.08 | y | camp:charLog.emissiveMap [camp_charLog] |
| (unnamed) | DataTexture | Object | 128x128 | RGBA/u8 | y | 0.08 | y | camp:charLog.normalMap [camp_charLog] |
| (unnamed) | DataTexture | Object | 128x128 | RGBA/u8 | y | 0.08 | y | camp:charLog.roughnessMap [camp_charLog] |
| (unnamed) | CanvasTexture | HTMLCanvasElement | 128x128 | RGBA/u8 | y | 0.08 | y | fleet:fleet_pool.map [fleet_pool] |
| (unnamed) | DataTexture | Object | 128x128 | RGBA/u8 | y | 0.08 | y | wildlife:lion-card.map [lion-card] |
| (unnamed) | DataTexture | Object | 128x128 | RGBA/u8 | y | 0.08 | y | wildlife:lion-card.map [lion-card] |
| (unnamed) | CanvasTexture | HTMLCanvasElement | 128x128 | RGBA/u8 | y | 0.08 | y | roadside:MeshStandardMaterial.map [roadside_steel] |
| UnrealBloomPass.h3 | RenderTargetTexture | render target | 80x45 | RGBA/f16 | n | 0.03 | y | post:bloom:renderTargetsHorizontal[3].texture; post:bloom:renderTargetsHorizontal[3].textures[0]; post:bloom:separableBlurMaterials[3].u.colorTexture |
| UnrealBloomPass.v3 | RenderTargetTexture | render target | 80x45 | RGBA/f16 | n | 0.03 | y | post:bloom:renderTargetsVertical[3].texture; post:bloom:renderTargetsVertical[3].textures[0]; post:bloom:compositeMaterial.u.blurTexture4 |
| (unnamed) | DataTexture | Object | 64x64 | RGBA/u8 | y | 0.02 | y | vehicle:stitch.map [cabin_stitch] |
| (unnamed) | DataTexture | Object | 64x64 | RGBA/u8 | y | 0.02 | y | vehicle:stitch.normalMap [cabin_stitch] |
| (unnamed) | DataTexture | Object | 64x64 | RGBA/u8 | y | 0.02 | y | vehicle:stitch.roughnessMap [cabin_stitch] |
| (unnamed) | DataTexture | Object | 64x64 | RGBA/u8 | y | 0.02 | y | vehicle:louvre.map [cabin_louvre] |
| (unnamed) | DataTexture | Object | 64x64 | RGBA/u8 | y | 0.02 | y | camp:rope.map [camp_rope] |
| (unnamed) | DataTexture | Object | 64x64 | RGBA/u8 | y | 0.02 | y | camp:rope.normalMap [camp_rope] |
| (unnamed) | CanvasTexture | HTMLCanvasElement | 64x64 | RGBA/u8 | y | 0.02 | y | camp:ShaderMaterial.u.uTex [fireSmoke] |
| (unnamed) | CanvasTexture | HTMLCanvasElement | 64x64 | RGBA/u8 | y | 0.02 | y | camp:ShaderMaterial.u.uTex [fireEmbers] |
| (unnamed) | CanvasTexture | HTMLCanvasElement | 64x64 | RGBA/u8 | y | 0.02 | n | wildlife:lion-contact.map [lion-contact] |
| (unnamed) | CanvasTexture | HTMLCanvasElement | 64x64 | RGBA/u8 | y | 0.02 | y | sky:ShaderMaterial.u.uMap [Points#1244] |
| (unnamed) | DataTexture | Uint8Array data | 64x64 | RGBA/u8 | n | 0.02 | y | post:gtao:pdNoiseTexture; post:gtao:pdMaterial.u.tNoise |
| SMAAPass.search | Texture | HTMLImageElement | 66x33 | RGBA/u8 | n | 0.01 | y | post:smaa:_searchTexture; post:smaa:_materialWeights.u.tSearch |
| UnrealBloomPass.h4 | RenderTargetTexture | render target | 40x23 | RGBA/f16 | n | 0.01 | y | post:bloom:renderTargetsHorizontal[4].texture; post:bloom:renderTargetsHorizontal[4].textures[0]; post:bloom:separableBlurMaterials[4].u.colorTexture |
| UnrealBloomPass.v4 | RenderTargetTexture | render target | 40x23 | RGBA/f16 | n | 0.01 | y | post:bloom:renderTargetsVertical[4].texture; post:bloom:renderTargetsVertical[4].textures[0]; post:bloom:compositeMaterial.u.blurTexture5 |
| (unnamed) | DataTexture | Uint8Array data | 5x5 | RGBA/u8 | n | 0 | y | post:gtao:gtaoNoiseTexture; post:gtao:gtaoMaterial.u.tNoise |

## 4. Geometries

391 geometries in the scene graph (`renderer.info.memory.geometries` = 350; the difference is geometries in the graph that have never been drawn, e.g. hidden LOD tiers, minus the compositor's quads). Estimated 145.58 MB of vertex/index data for 3,486,929 vertices / 1,545,836 triangles, plus 1.91 MB of instance matrices/colours on 565 InstancedMeshes. 232 of the 391 geometries are non-indexed (three vertices stored per triangle). For the 91 non-indexed geometries with 3,000+ vertices the census counted their distinct vertices exactly (all attributes compared at 1e-4): an index buffer would remove 56.62 MB of the 115.87 MB they occupy.

| group | geometries | non-indexed | vertices | unique vertices (measured subset) | est. MB | triangles (one instance each) |
| --- | --- | --- | --- | --- | --- | --- |
| terrain | 6 | 2 | 798,416 | 550,680 of 587,160 | 37.92 | 479,930 |
| forest | 76 | 7 | 16,039 | - | 0.65 | 14,529 |
| vehicle | 114 | 112 | 1,452,893 | 324,815 of 1,408,518 | 45.68 | 489,300 |
| camp | 49 | 22 | 350,027 | 180,756 of 283,314 | 11.07 | 165,734 |
| fleet | 78 | 78 | 753,588 | 211,080 of 741,996 | 43.16 | 251,196 |
| wildlife | 46 | 0 | 80,639 | - | 6 | 132,584 |
| roadside | 10 | 10 | 34,278 | 27,435 of 30,540 | 1.05 | 11,426 |
| sky | 11 | 1 | 1,045 | - | 0.03 | 1,135 |
| dust | 1 | 0 | 4 | - | 0.02 | 2 |

Top 20 by bytes:

| geometry / objects | group | vertices | unique | triangles | indexed | attributes | users | est. MB |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| roadStones | terrain | 541,560 | 541,560 | 180,520 | n | position 3x541560, normal 3x541560, color 3x541560 | 1 | 18.59 |
| terrain | terrain | 178,231 | - | 264,548 | y | position 3x178231, normal 3x178231, uv 2x178231, aSide 1x178231, aEdge 1x178231, aAlong 1x | 1 | 17.31 |
| fleet_steel | fleet | 138,768 | 37,057 | 46,256 | n | position 3x138768, normal 3x138768, uv 2x138768, color 3x138768, aWear 4x138768 | 1 | 7.94 |
| fleet_rubber | fleet | 132,672 | 24,164 | 44,224 | n | position 3x132672, uv 2x132672, normal 3x132672, color 3x132672, aWear 4x132672 | 1 | 7.59 |
| fleet_trim | fleet | 124,572 | 30,132 | 41,524 | n | position 3x124572, normal 3x124572, uv 2x124572, color 3x124572, aWear 4x124572 | 1 | 7.13 |
| fleet_paint | fleet | 86,016 | 26,775 | 28,672 | n | position 3x86016, uv 2x86016, normal 3x86016, color 3x86016, aWear 4x86016 | 1 | 4.92 |
| fleet_chrome | fleet | 84,432 | 23,708 | 28,144 | n | position 3x84432, normal 3x84432, uv 2x84432, color 3x84432, aWear 4x84432 | 1 | 4.83 |
| body_trimGloss | vehicle | 110,304 | 20,754 | 36,768 | n | position 3x110304, normal 3x110304, uv 2x110304 | 1 | 3.37 |
| camp_timber | camp | 101,568 | 78,261 | 33,856 | n | position 3x101568, normal 3x101568, uv 2x101568 | 1 | 3.1 |
| body_trim | vehicle | 97,776 | 19,660 | 32,592 | n | position 3x97776, normal 3x97776, uv 2x97776 | 1 | 2.98 |
| body_steelDark | vehicle | 89,892 | 17,856 | 29,964 | n | position 3x89892, normal 3x89892, uv 2x89892 | 1 | 2.74 |
| body_gap | vehicle | 84,288 | 18,342 | 28,096 | n | position 3x84288, normal 3x84288, uv 2x84288 | 1 | 2.57 |
| cabin_gap | vehicle | 76,632 | 18,217 | 25,544 | n | position 3x76632, normal 3x76632, uv 2x76632 | 1 | 2.34 |
| fleet_tread | fleet | 36,540 | 24,360 | 12,180 | n | position 3x36540, normal 3x36540, uv 2x36540, color 3x36540, aWear 4x36540 | 1 | 2.09 |
| cabin_trimGloss | vehicle | 66,552 | 11,941 | 22,184 | n | position 3x66552, normal 3x66552, uv 2x66552 | 1 | 2.03 |
| fleet_gap | fleet | 35,484 | 16,348 | 11,828 | n | position 3x35484, normal 3x35484, uv 2x35484, color 3x35484, aWear 4x35484 | 1 | 2.03 |
| gear_steelDark | vehicle | 58,728 | 16,460 | 19,576 | n | position 3x58728, normal 3x58728, uv 2x58728 | 1 | 1.79 |
| body_chrome | vehicle | 53,016 | 8,962 | 17,672 | n | position 3x53016, normal 3x53016, uv 2x53016 | 1 | 1.62 |
| fleet_fabric | fleet | 26,568 | 4,592 | 8,856 | n | position 3x26568, normal 3x26568, uv 2x26568, color 3x26568, aWear 4x26568 | 1 | 1.52 |
| fleet_rust | fleet | 26,292 | 6,826 | 8,764 | n | position 3x26292, normal 3x26292, uv 2x26292, color 3x26292, aWear 4x26292 | 1 | 1.5 |

Instance buffers:

| object | group | instances | est. MB |
| --- | --- | --- | --- |
| grass_4_b2 | forest | 329 | 0.02 |
| grass_1_b2 | forest | 319 | 0.02 |
| grass_2_b2 | forest | 318 | 0.02 |
| grass_3_b2 | forest | 303 | 0.02 |
| grass_0_b2 | forest | 284 | 0.02 |
| campGrass | camp | 336 | 0.02 |
| litter_0_b14 | forest | 218 | 0.02 |
| grass_1_b14 | forest | 200 | 0.01 |
| litter_3_b14 | forest | 200 | 0.01 |
| grass_4_b14 | forest | 189 | 0.01 |
| grass_0_b14 | forest | 188 | 0.01 |
| grass_0_b5 | forest | 182 | 0.01 |
| grass_4_b7 | forest | 181 | 0.01 |
| grass_2_b7 | forest | 179 | 0.01 |
| litter_0_b13 | forest | 175 | 0.01 |
| grass_3_b14 | forest | 174 | 0.01 |
| litter_3_b2 | forest | 174 | 0.01 |
| grass_2_b9 | forest | 173 | 0.01 |
| litter_3_b8 | forest | 171 | 0.01 |
| litter_2_b8 | forest | 170 | 0.01 |

## 5. Draw calls per group per view

Beauty pass calls, with the shadow-map and AO G-buffer calls the same group adds. One `InstancedMesh` is one call however many instances it carries; an object with an array material is one call per material group.

| group | hero beauty | mainroad beauty | forest beauty | hero shadow | mainroad shadow | forest shadow | hero G-buffer | mainroad G-buffer | forest G-buffer |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| terrain | 5 | 6 | 5 | 0 | 0 | 0 | 4 | 4 | 4 |
| forest | 184 | 173 | 266 | 62 | 50 | 62 | 23 | 23 | 23 |
| vehicle | 162 | 162 | 162 | 100 | 100 | 100 | 130 | 130 | 130 |
| camp | 4 | 16 | 4 | 9 | 32 | 9 | 0 | 12 | 0 |
| fleet | 0 | 22 | 0 | 0 | 20 | 0 | 0 | 21 | 0 |
| wildlife | 0 | 4 | 0 | 0 | 0 | 0 | 0 | 4 | 0 |
| roadside | 2 | 9 | 2 | 5 | 10 | 5 | 2 | 9 | 2 |
| sky | 10 | 10 | 10 | 0 | 0 | 0 | 0 | 0 | 0 |
| dust | 1 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |

| phase | hero | mainroad | forest |
| --- | --- | --- | --- |
| shadow | 176 | 212 | 176 |
| beauty | 368 | 403 | 450 |
| override:MeshNormalMaterial | 159 | 203 | 159 |
| post | 23 | 23 | 23 |

## 6. JS heap

| point | MB |
| --- | --- |
| after boot (first frame drawn) | 465.5 |
| after 3 census views | 320.3 |
| reset loop 1 (setView hero, resetAuto, 2.5 s drive, gc) | 253.2 |
| after loops, forced GC | 252.8 |

Growth over the 1 loops: n/a — no leak. Typed arrays count toward `usedJSHeapSize` in Chromium (checked: a 100 MB Float32Array moves it by 100.0 MB), so of the 252.8 MB steady state, geometry attribute arrays are 147.49 MB (they stay referenced after upload) and DataTexture pixel arrays another 110.23 MB — 102% of the heap is upload-side copies of GPU data. The canvas bitmaps behind the CanvasTextures (35.86 MB) are held by the browser outside the JS heap.

| group | DataTexture pixel MB in heap | geometry MB in heap |
| --- | --- | --- |
| terrain | 2.88 | 37.92 |
| forest | 55.13 | 0.65 |
| vehicle | 28.69 | 45.68 |
| camp | 16.91 | 11.07 |
| fleet | 4.75 | 43.16 |
| wildlife | 1.63 | 6 |
| roadside | 0 | 1.05 |
| sky | 0 | 0.03 |
| dust | 0.25 | 0.02 |
| post | 0.02 | 0 |

## 7. Boot stages

Time to first frame 64,134 ms in-page (SwiftShader; shader compilation dominates and is many times slower than on a GPU, but the *number* of programs it compiles is the same: 166, 0 of them for the canvas and unused).

| stage | ms | share |
| --- | --- | --- |
| Compiling noise kernel | 12 | 0.0% |
| Building sky | 102 | 0.2% |
| Grading the road | 8,030 | 12.5% |
| Planting the forest | 5,315 | 8.3% |
| Assembling the truck | 7,472 | 11.7% |
| Pitching camp | 3,433 | 5.4% |
| Parking the fleet | 1,895 | 3.0% |
| Finding the pride | 14,698 | 22.9% |
| Posting the signs | 155 | 0.2% |
| Compiling shaders | 20,655 | 32.2% |

## Top ten cheapest wins

_No notes file at `perf/census-r2veg-wins.md`; write the analysis there and re-run (`--from perf/census-r2veg.json` re-renders without measuring)._
