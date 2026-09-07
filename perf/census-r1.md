# Scene census r1

Build `ad7ef04+` (2026-09-04 12:34Z), quality `fast`, 1280x720, renderer `WebKit WebGL` (WebGL 2.0 (OpenGL ES 3.0 Chromium)). Measured 2026-09-04T13:42:48.714Z from `http://127.0.0.1:5186/?quality=fast` by `tools/census.mjs`.

Every number below is measured: from a hook on `renderer.renderBufferDirect` during one rendered frame per view, from `renderer.info`, from `renderer.properties`, or from the objects themselves. The only estimates are GPU texture bytes (width x height x bytes/texel x 4/3 when mipmapped) and geometry bytes (attribute byte lengths), and they are labelled. Frame times are not reported: this machine rasterises in software.

Groups are the top-level scene children and the module that built them: `terrain`, `forest`, `vehicle` (the truck), `camp`, `fleet`, `wildlife`, `roadside`, `sky` (dome, headlamp beams, light shafts and dust motes from sky.js), `dust` (wheel dust), `post` (compositor passes), `shadow` (the renderer's own depth materials).

## Headline

| view | draw calls (renderer.info) | beauty calls | shadow calls | AO G-buffer calls | post calls | triangles (renderer.info) | beauty tris | instanced tris | regular tris | beauty tris inside frustum | shadow tris | AO G-buffer tris | programs (cumulative) | textures | geometries | visible objects | visible instances |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| hero | 396 | 252 | 144 | 157 | 23 | 2,153,302 | 1,510,768 | 414,026 | 1,096,742 | 649,248 (43%) | 642,534 | 1,158,098 | 277 | 275 | 319 | 240 | 26,540 |
| mainroad | 491 | 301 | 190 | 203 | 23 | 2,802,248 | 1,851,592 | 414,400 | 1,437,192 | 852,843 (46%) | 950,656 | 1,496,554 | 278 | 285 | 330 | 289 | 26,849 |
| forest | 396 | 252 | 144 | 157 | 23 | 2,153,302 | 1,510,768 | 414,026 | 1,096,742 | 876,086 (58%) | 642,534 | 1,158,098 | 278 | 285 | 330 | 240 | 26,540 |
| camp | 614 | 439 | 175 | 241 | 23 | 2,858,772 | 1,926,998 | 423,454 | 1,503,544 | 1,445,860 (75%) | 931,774 | 1,571,148 | 279 | 287 | 356 | 381 | 26,898 |
| lions | 296 | 164 | 132 | 100 | 23 | 1,931,436 | 1,383,470 | 398,634 | 984,836 | 389,917 (28%) | 547,966 | 1,051,180 | 284 | 296 | 366 | 153 | 26,495 |

`renderer.info` counts the shadow-map pass together with the beauty pass; that is the number `debugAPI.stats()` and the perf reports quote (beauty + shadow = renderer.info in every row above). The AO G-buffer is the scene drawn a third time through `MeshNormalMaterial` as `scene.overrideMaterial`; the composer issues that render separately so it is not in `renderer.info`. The GPU therefore rasterises beauty + shadow + G-buffer triangles per frame: hero 3,311,400, mainroad 4,298,802, forest 3,311,400, camp 4,429,920, lions 2,982,616. SSR is off at this quality tier, so its reflector-mask pass does not appear.

Programs: 284 compiled, of which 124 are canvas variants (tone mapping on) that no frame uses because the scene is always drawn into the composer's render target; 160 do the work. JS heap: 363.1 MB after boot, 439.8 MB after the 5 views, reset loops 333.7 / 333.6 / 333.6 MB, 333.6 MB after a forced GC. Textures: 267 objects, est. 268.24 MB. Geometries: 380, est. 150.09 MB.

Note that `hero` and `forest` draw exactly the same set of objects from different cameras: culling in this scene is by whole-object bounding sphere, and nearly every object (terrain, route-long stone mesh, forest-wide instanced meshes, the truck) is large enough to intersect any frustum near the truck. What changes between views is only which camp/fleet/wildlife objects fall inside.

## 1. Shader programs

284 compiled programs after all views (277 straight after boot). 235 are used by exactly one material, 8 by two, 34 by three or more, 7 could not be linked to any material this census could reach (the renderer's own shadow depth materials, PMREM scratch; their `type` says what they are).

### Canvas variants: the boot-time double compile

Three keys a program on `toneMapping` and `outputColorSpace`, which it takes from the *currently bound render target* at compile time: no target bound means the canvas (ACES, sRGB); the composer's target means (none, linear). `main.js` calls `renderer.compile(scene, camera)` with no target bound and then `post.render()`, which draws into the composer's target — so 124 programs are compiled for the canvas, never used by a frame (`currentProgram` for 0 materials), and kept alive in each material's program map; then the same materials compile again for the target. 183 of 199 scene materials carry exactly two programs for this reason. The fix is one line in `main.js` (bind the composer's read buffer before `renderer.compile`, or drop the `compile` and let the warm-up `render` do it) and halves the "Compiling shaders" stage.

| group | programs | canvas variants (unused) | render-target programs | never current | would remain with material names out of cache keys |
| --- | --- | --- | --- | --- | --- |
| terrain | 11 | 4 | 7 | 6 | 7 |
| forest | 16 | 7 | 9 | 10 | 9 |
| vehicle | 115 | 57 | 58 | 61 | 51 |
| camp | 34 | 17 | 17 | 17 | 17 |
| fleet | 64 | 32 | 32 | 36 | 24 |
| wildlife | 11 | 5 | 6 | 5 | 6 |
| roadside | 4 | 2 | 2 | 2 | 2 |
| sky | 8 | 3 | 5 | 3 | 5 |
| dust | 2 | 1 | 1 | 1 | 1 |
| post | 22 | 0 | 22 | 3 | 22 |
| shadow | 4 | 0 | 4 | 4 | 4 |
| unattributed | 3 | 0 | 3 | 3 | 3 |

The last column applies one rule to the 160 working programs: take the material *name* out of every `tag:name:...` segment of `customProgramCacheKey` (the vehicle family's `bw:`, `dirt:`, `cb:`, `cl:`, `gf:`, the fleet's `fleetDirt:`/`sway:`, the tyres' `loadedTyre_name_`) and keep everything else — the numbers those patches bake into GLSL, the map set, the flags. Programs whose keys then agree compile identical GLSL and would be one program: 160 → 145.

Groups of programs that differ only by the material name in the key:

| # | type | programs | groups | materials (names) | shared key after stripping |
| --- | --- | --- | --- | --- | --- |
| 1 | MeshStandardMaterial | 6 | fleet | fleet_rust, fleet_rubber, fleet_tread, fleet_fabric, fleet_vinyl, fleet_vinylFaded | `function(e,t){d&&d.call(this,e,t),Object.assign(e.uniforms,u),e.vertex` |
| 2 | MeshPhysicalMaterial | 3 | vehicle | paint, paintDark, paintAccent | `function(e,t){r&&r.call(this,e,t),n(e,t)}\|bw::0:full:0:true:true:true\|` |
| 3 | MeshStandardMaterial | 2 | vehicle | chrome, alu | `function(e,t){r&&r.call(this,e,t),n(e,t)}\|dirt::1:false\|bw::0:false:0:` |
| 4 | MeshStandardMaterial | 2 | vehicle | decalName, decalNumber | `function(e,t){r&&r.call(this,e,t),n(e,t)}\|dirt::1:false` |
| 5 | MeshStandardMaterial | 2 | vehicle | interiorPlastic, interiorFaded | `function(e,t){r&&r.call(this,e,t),n(e,t)}\|dirt::0:false\|cb::0\|cl::0:0.` |
| 6 | MeshStandardMaterial | 2 | vehicle | tyreCarcass, tyreLug | `loadedTyre_0.05` |
| 7 | MeshStandardMaterial | 2 | vehicle | brakeRotor, caliper | `function(e,t){r&&r.call(this,e,t),n(e,t)}\|bw::0.5:false:0:false:false:` |
| 8 | MeshPhysicalMaterial | 2 | fleet | fleet_paint, fleet_paintOld | `function(e,t){d&&d.call(this,e,t),Object.assign(e.uniforms,u),e.vertex` |
| 9 | MeshPhysicalMaterial | 2 | fleet | fleet_glass, fleet_glassDusty | `function(e,t){r&&r.call(this,e,t),n(e,t)}\|bw::0:true:0.9:false:false:f` |
| 10 | MeshPhysicalMaterial | 2 | fleet | fleet_glass, fleet_glassDusty | `function(e,t){r&&r.call(this,e,t),n(e,t)}\|bw::0:true:0.9:false:false:f` |

### Programs per group

A program shared by materials in two groups is counted in both; `exclusive` is the number only that group uses.

| group | programs | exclusive | material links | by material type |
| --- | --- | --- | --- | --- |
| terrain | 11 | 11 | 11 | MeshStandardMaterial 7, ShaderMaterial 4 |
| forest | 16 | 13 | 54 | MeshStandardMaterial 10, MeshBasicMaterial 6 |
| vehicle | 115 | 106 | 151 | MeshStandardMaterial 86, MeshPhysicalMaterial 24, MeshBasicMaterial 5 |
| camp | 34 | 30 | 98 | MeshStandardMaterial 28, ShaderMaterial 6 |
| fleet | 64 | 63 | 78 | MeshStandardMaterial 40, MeshPhysicalMaterial 22, MeshBasicMaterial 2 |
| wildlife | 11 | 9 | 23 | MeshStandardMaterial 10, MeshPhysicalMaterial 1 |
| roadside | 4 | 4 | 20 | MeshStandardMaterial 4 |
| sky | 8 | 8 | 22 | ShaderMaterial 8 |
| dust | 2 | 2 | 2 | ShaderMaterial 2 |
| post | 22 | 22 | 22 | ShaderMaterial 17, MeshNormalMaterial 4, RawShaderMaterial 1 |
| shadow | 4 | 4 | 0 | MeshDepthMaterial 4 |
| unattributed | 3 | 3 | 0 | MeshBasicMaterial 2, ShaderMaterial 1 |

### Programs by shader and material type

| material type / shader | programs | canvas variants | materials | groups |
| --- | --- | --- | --- | --- |
| MeshStandardMaterial / physical | 179 | 88 | 315 | terrain, forest, vehicle, wildlife, camp, fleet, roadside |
| MeshPhysicalMaterial / physical | 47 | 23 | 47 | vehicle, fleet, wildlife |
| MeshBasicMaterial / basic | 11 | 4 | 25 | forest, vehicle, fleet |
| ShaderMaterial / custom(32,33) | 5 | 0 | 5 | post |
| MeshDepthMaterial / depth | 4 | 0 | 0 | - |
| MeshNormalMaterial / normal | 4 | 0 | 4 | post |
| ShaderMaterial / custom(2,3) | 2 | 1 | 2 | sky |
| ShaderMaterial / custom(5,6) | 2 | 1 | 2 | terrain |
| ShaderMaterial / custom(7,8) | 2 | 1 | 2 | terrain |
| ShaderMaterial / custom(9,10) | 2 | 1 | 2 | camp |
| ShaderMaterial / custom(11,12) | 2 | 1 | 2 | camp |
| ShaderMaterial / custom(13,14) | 2 | 1 | 2 | camp |
| ShaderMaterial / custom(15,16) | 2 | 1 | 16 | sky |
| ShaderMaterial / custom(17,18) | 2 | 1 | 2 | sky |
| ShaderMaterial / custom(19,20) | 2 | 1 | 2 | dust |
| ShaderMaterial / custom(24,25) | 2 | 0 | 2 | post |
| ShaderMaterial / custom(0,1) | 1 | 0 | 1 | sky |
| ShaderMaterial / 2 | 1 | 0 | 0 | - |
| ShaderMaterial / custom(0,4) | 1 | 0 | 1 | sky |
| ShaderMaterial / custom(21,22) | 1 | 0 | 1 | post |
| ShaderMaterial / custom(21,23) | 1 | 0 | 1 | post |
| ShaderMaterial / custom(26,27) | 1 | 0 | 1 | post |
| ShaderMaterial / custom(28,29) | 1 | 0 | 1 | post |
| ShaderMaterial / custom(30,31) | 1 | 0 | 1 | post |
| ShaderMaterial / custom(32,34) | 1 | 0 | 1 | post |
| RawShaderMaterial / custom(35,36) | 1 | 0 | 1 | post |
| ShaderMaterial / custom(28,37) | 1 | 0 | 1 | post |
| ShaderMaterial / custom(38,39) | 1 | 0 | 1 | post |
| ShaderMaterial / custom(40,41) | 1 | 0 | 1 | post |
| ShaderMaterial / custom(42,43) | 1 | 0 | 1 | post |

### Top 20 most-duplicated variants (working programs only)

Programs are clustered by material type plus their `customProgramCacheKey` with every number and uuid blanked out, so programs whose *only* difference is an id inside the key land together, and so do programs with identical `onBeforeCompile` source that differ in a define. `custom keys` is how many distinct custom keys the cluster has (more than one with one head = an id in the key is forking the program: avoidable, that is a uniform), `heads` how many distinct built-in parameter sets (a real define difference; the differing fields are named). `#` in a preview is a blanked number.

| # | type | programs | materials | groups | custom keys | heads | differing params | differing flags | defines | key preview / names |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | MeshStandardMaterial (physical) | 29 | 87 | terrain,forest,vehicle,camp,wildlife,fleet,roadside | 1 | 29 | mapUv aoMapUv normalMapUv roughnessMapUv metalnessMapUv emissiveMapUv | vertexColors dithering instancing instancingColor normalMapTangentSpace alphaTest doubleSided opaque skinning | - | `onBeforeCompile(){}` — headlight, taillight, decalBadge, rimMachined, wheelVoid, canvas |
| 2 | ShaderMaterial (custom(0,1)) | 28 | 35 | sky,terrain,camp,dust,post | 1 | 28 | outputColorSpace toneMapping fogExp2 numDirLights numPointLights numSpotLights numHemiLights numDirLightShadows precision envMapMode envMapCubeUVHeight mapUv alphaMapUv lightMapUv aoMapUv bumpMapUv normalMapUv displacementMapUv emissiveMapUv metalnessMapUv roughnessMapUv anisotropyMapUv clearcoatMapUv clearcoatNormalMapUv clearcoatRoughnessMapUv iridescenceMapUv iridescenceThicknessMapUv sheenColorMapUv sheenRoughnessMapUv specularMapUv specularColorMapUv specularIntensityMapUv transmissionMapUv thicknessMapUv combine sizeAttenuation morphTargetsCount morphAttributeCount numSpotLightMaps numRectAreaLights numPointLightShadows numSpotLightShadows numSpotLightShadowsWithMaps numLightProbes shadowMapType numClippingPlanes numClipIntersection depthPacking rendererColorSpace | hasPositionAttribute vertexNormals fog shadowMapEnabled flipSided opaque premultipliedAlpha useFog doubleSided | GGX_SAMPLES CUBEUV_TEXEL_WIDTH CUBEUV_TEXEL_HEIGHT CUBEUV_MAX_MIP PERSPECTIVE_CAMERA SAMPLES NORMAL_VECTOR_TYPE DEPTH_SWIZZLING SCREEN_SPACE_RADIUS SCREEN_SPACE_RADIUS_SCALE SCENE_CLIP_BOX SAMPLE_VECTORS  0 vec3(6.123233995736766e-17  0.14285714285714285) KERNEL_RADIUS NUM_MIPS SMAA_THRESHOLD SMAA_MAX_SEARCH_STEPS SMAA_AREATEX_MAX_DISTANCE SMAA_AREATEX_PIXEL_SIZE  560.0 ) ) | `onBeforeCompile(){}` — EquirectangularToCubeUV, PMREMGGXConvolution, ProceduralSky, sunShaft, SanitizeShader, GradeShader |
| 3 | MeshStandardMaterial (physical) | 13 | 13 | fleet | 13 | 4 | mapUv normalMapUv roughnessMapUv | normalMapTangentSpace alphaTest doubleSided | - | `function(e,t){d&&d.call(this,e,t),Object.assign(e.uniforms,u` — fleet_steel, fleet_alu, fleet_plate, fleet_rust, fleet_trim, fleet_trimGloss |
| 4 | MeshBasicMaterial (basic) | 5 | 16 | forest,vehicle,fleet | 1 | 5 | envMapMode envMapCubeUVHeight | flipSided envMap opaque | - | `onBeforeCompile(){}` — fleet_pool |
| 5 | MeshNormalMaterial (normal) | 4 | 4 | post | 1 | 4 | - | instancing instancingColor skinning | - | `onBeforeCompile(){}` |
| 6 | MeshPhysicalMaterial (physical) | 3 | 3 | wildlife,fleet,vehicle | 1 | 3 | outputColorSpace toneMapping normalMapUv | skinning clearcoat normalMapTangentSpace | - | `onBeforeCompile(){}` — lion-cornea, fleet_lensClear, lensClear |
| 7 | MeshPhysicalMaterial (physical) | 2 | 2 | fleet | 2 | 1 | - | - | - | `function(e,t){d&&d.call(this,e,t),Object.assign(e.uniforms,u` — fleet_paint, fleet_paintOld |
| 8 | MeshStandardMaterial (physical) | 2 | 2 | fleet | 2 | 2 | - | doubleSided | - | `function(e,t){i&&i.call(this,e,t),Object.assign(e.uniforms,r` — fleet_whip, fleet_canvas |
| 9 | MeshPhysicalMaterial (physical) | 2 | 2 | fleet | 1 | 2 | - | flipSided | - | `function(e,t){r&&r.call(this,e,t),n(e,t)}\|bw:fleetGlass:0:tr` — fleet_glass |
| 10 | MeshPhysicalMaterial (physical) | 2 | 2 | fleet | 1 | 2 | - | flipSided | - | `function(e,t){r&&r.call(this,e,t),n(e,t)}\|bw:fleetGlassCrack` — fleet_glassCracked |
| 11 | MeshPhysicalMaterial (physical) | 2 | 2 | fleet | 1 | 2 | - | flipSided | - | `function(e,t){r&&r.call(this,e,t),n(e,t)}\|bw:fleetGlassDusty` — fleet_glassDusty |
| 12 | MeshPhysicalMaterial (physical) | 2 | 2 | fleet | 1 | 2 | - | flipSided | - | `function(e,t){r&&r.call(this,e,t),n(e,t)}\|bw:fleetGlassDark:` — fleet_glassDark |
| 13 | MeshPhysicalMaterial (physical) | 2 | 2 | vehicle | 1 | 2 | - | flipSided | - | `function(e,t){r&&r.call(this,e,t),n(e,t)}\|bw:glassDark:0:tru` — glassDark |
| 14 | MeshPhysicalMaterial (physical) | 2 | 2 | vehicle | 1 | 2 | - | flipSided | - | `function(e,t){r&&r.call(this,e,t),n(e,t)}\|bw:glassSide:0:tru` — glassSide |
| 15 | MeshPhysicalMaterial (physical) | 2 | 2 | vehicle | 1 | 2 | - | flipSided | - | `function(e,t){r&&r.call(this,e,t),n(e,t)}\|bw:glass:0:true:1.` — glass |

Reading the columns: three builds a program cache key from (a) the built-in shader id, (b) `material.defines`, (c) ~50 parameters (which maps are present and their UV channel, light counts, tone mapping, fog...), (d) two bitmasks of booleans (instancing, vertexColors, alphaTest, doubleSided, flipSided, skinning, `opaque` i.e. `!transparent`, dithering, premultipliedAlpha...), (e) `customProgramCacheKey()`, which defaults to `onBeforeCompile.toString()`. Any difference in (a)-(e) is a separate compile. A different *uniform value* never is — so when two programs in a cluster differ only in (e) and the difference is a name or a number that is only ever read through a uniform, the material author has put a per-instance value into the key and is paying one compile per material for it. When they differ in (c)/(d) the fix is to make the materials agree: same set of maps (a shared 1x1 white/flat texture keeps the define on), same `side`, same `transparent`, same `vertexColors`. `flipSided` pairs on the glass materials are legitimate: a pane drawn back-face-first then front needs both.

### Every program

| id | type | shader | name | materials | groups | canvas variant | flags | maps | lights | custom key | key len |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 77 | MeshStandardMaterial | physical | alu | 1 | camp | yes | - | normal roughness | d2 p5 s4 h1 ds1 | default | 258 |
| 192 | MeshStandardMaterial | physical | alu | 1 | camp |  | - | normal roughness | d2 p5 s4 h1 ds1 | default | 265 |
| 87 | MeshStandardMaterial | physical | bulb | 1 | camp | yes | instancing | - | d2 p5 s4 h1 ds1 | default | 264 |
| 195 | MeshStandardMaterial | physical | bulb | 1 | camp |  | instancing | - | d2 p5 s4 h1 ds1 | default | 271 |
| 88 | MeshStandardMaterial | physical | campFlag | 1 | camp | yes | doubleSided | mapUv | d2 p5 s4 h1 ds1 | default | 261 |
| 198 | MeshStandardMaterial | physical | campFlag | 1 | camp |  | doubleSided | mapUv | d2 p5 s4 h1 ds1 | default | 268 |
| 188 | MeshStandardMaterial | physical | canvas | 8 | camp |  | doubleSided | mapUv normal roughness | d2 p5 s4 h1 ds1 | default | 262 |
| 76 | MeshStandardMaterial | physical | chairCloth | 8 | camp | yes | doubleSided | mapUv normal roughness | d2 p5 s4 h1 ds1 | default | 255 |
| 82 | MeshStandardMaterial | physical | deadwood | 1 | camp | yes | - | mapUv ao normal roughness | d2 p5 s4 h1 ds1 | default | 252 |
| 194 | MeshStandardMaterial | physical | deadwood | 1 | camp |  | - | mapUv ao normal roughness | d2 p5 s4 h1 ds1 | default | 259 |
| 75 | MeshStandardMaterial | physical | galv | 1 | camp | yes | doubleSided | mapUv normal metalness roughness | d2 p5 s4 h1 ds1 | default | 252 |
| 190 | MeshStandardMaterial | physical | galv | 1 | camp |  | doubleSided | mapUv normal metalness roughness | d2 p5 s4 h1 ds1 | default | 259 |
| 83 | MeshStandardMaterial | physical | grass | 1 | camp | yes | instancing alphaTest doubleSided | mapUv emissive | d2 p5 s4 h1 ds1 | default | 258 |
| 197 | MeshStandardMaterial | physical | grass | 1 | camp |  | instancing alphaTest doubleSided | mapUv emissive | d2 p5 s4 h1 ds1 | default | 265 |
| 79 | MeshStandardMaterial | physical | lampGlass | 1 | camp | yes |  transparent | - | d2 p5 s4 h1 ds1 | default | 264 |
| 241 | MeshStandardMaterial | physical | lampGlass | 1 | camp |  |  transparent | - | d2 p5 s4 h1 ds1 | default | 271 |
| 74 | MeshStandardMaterial | physical | rock | 15 | camp | yes | - | mapUv normal roughness | d2 p5 s4 h1 ds1 | default | 255 |
| 81 | MeshStandardMaterial | physical | rope | 1 | camp | yes | - | mapUv normal | d2 p5 s4 h1 ds1 | default | 258 |
| 193 | MeshStandardMaterial | physical | rope | 1 | camp |  | - | mapUv normal | d2 p5 s4 h1 ds1 | default | 265 |
| 80 | MeshStandardMaterial | physical | signOffice | 8 | camp | yes | - | mapUv | d2 p5 s4 h1 ds1 | default | 261 |
| 196 | MeshStandardMaterial | physical | solar | 8 | camp |  | - | mapUv | d2 p5 s4 h1 ds1 | default | 268 |
| 78 | MeshStandardMaterial | physical | steel | 1 | camp | yes | - | mapUv normal metalness roughness | d2 p5 s4 h1 ds1 | default | 252 |
| 191 | MeshStandardMaterial | physical | steel | 1 | camp |  | - | mapUv normal metalness roughness | d2 p5 s4 h1 ds1 | default | 259 |
| 189 | MeshStandardMaterial | physical | timber | 15 | camp |  | - | mapUv normal roughness | d2 p5 s4 h1 ds1 | default | 262 |
| 84 | ShaderMaterial | custom(9,10) |  | 1 | camp | yes |  transparent | - | d2 p5 s4 h1 ds1 | default | 242 |
| 85 | ShaderMaterial | custom(11,12) |  | 1 | camp | yes |  transparent | - | d2 p5 s4 h1 ds1 | default | 243 |
| 86 | ShaderMaterial | custom(13,14) |  | 1 | camp | yes |  transparent | - | d2 p5 s4 h1 ds1 | default | 243 |
| 243 | ShaderMaterial | custom(9,10) |  | 1 | camp |  |  transparent | - | d2 p5 s4 h1 ds1 | default | 249 |
| 245 | ShaderMaterial | custom(11,12) |  | 1 | camp |  |  transparent | - | d2 p5 s4 h1 ds1 | default | 250 |
| 246 | ShaderMaterial | custom(13,14) |  | 1 | camp |  |  transparent | - | d2 p5 s4 h1 ds1 | default | 250 |
| 130 | ShaderMaterial | custom(19,20) |  | 1 | dust | yes | doubleSided transparent | - | d2 p5 s4 h1 ds1 | default | 243 |
| 247 | ShaderMaterial | custom(19,20) |  | 1 | dust |  | doubleSided transparent | - | d2 p5 s4 h1 ds1 | default | 250 |
| 117 | MeshBasicMaterial | basic | fleet_pool | 1 | fleet | yes |  transparent | mapUv | d2 p5 s4 h1 ds1 | default | 249 |
| 91 | MeshPhysicalMaterial | physical | fleet_glass | 1 | fleet | yes | clearcoat flipSided transparent | mapUv emissive roughness | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|bw:fleetGlass:0:true:0.9:false:false:false` | 330 |
| 92 | MeshPhysicalMaterial | physical | fleet_glass | 1 | fleet | yes | clearcoat transparent | mapUv emissive roughness | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|bw:fleetGlass:0:true:0.9:false:false:false` | 330 |
| 225 | MeshPhysicalMaterial | physical | fleet_glass | 1 | fleet |  | clearcoat flipSided transparent | mapUv emissive roughness | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|bw:fleetGlass:0:true:0.9:false:false:false` | 337 |
| 226 | MeshPhysicalMaterial | physical | fleet_glass | 1 | fleet |  | clearcoat transparent | mapUv emissive roughness | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|bw:fleetGlass:0:true:0.9:false:false:false` | 337 |
| 95 | MeshPhysicalMaterial | physical | fleet_glassCracked | 1 | fleet | yes | clearcoat flipSided transparent | mapUv emissive roughness | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|bw:fleetGlassCracked:0:true:1.2:false:false:false` | 337 |
| 96 | MeshPhysicalMaterial | physical | fleet_glassCracked | 1 | fleet | yes | clearcoat transparent | mapUv emissive roughness | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|bw:fleetGlassCracked:0:true:1.2:false:false:false` | 337 |
| 227 | MeshPhysicalMaterial | physical | fleet_glassCracked | 1 | fleet |  | clearcoat flipSided transparent | mapUv emissive roughness | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|bw:fleetGlassCracked:0:true:1.2:false:false:false` | 344 |
| 228 | MeshPhysicalMaterial | physical | fleet_glassCracked | 1 | fleet |  | clearcoat transparent | mapUv emissive roughness | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|bw:fleetGlassCracked:0:true:1.2:false:false:false` | 344 |
| 93 | MeshPhysicalMaterial | physical | fleet_glassDark | 1 | fleet | yes | clearcoat flipSided transparent | mapUv emissive roughness | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|bw:fleetGlassDark:0:true:1:false:false:false` | 332 |
| 94 | MeshPhysicalMaterial | physical | fleet_glassDark | 1 | fleet | yes | clearcoat transparent | mapUv emissive roughness | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|bw:fleetGlassDark:0:true:1:false:false:false` | 332 |
| 232 | MeshPhysicalMaterial | physical | fleet_glassDark | 1 | fleet |  | clearcoat flipSided transparent | mapUv emissive roughness | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|bw:fleetGlassDark:0:true:1:false:false:false` | 339 |
| 233 | MeshPhysicalMaterial | physical | fleet_glassDark | 1 | fleet |  | clearcoat transparent | mapUv emissive roughness | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|bw:fleetGlassDark:0:true:1:false:false:false` | 339 |
| 89 | MeshPhysicalMaterial | physical | fleet_glassDusty | 1 | fleet | yes | clearcoat flipSided transparent | mapUv emissive roughness | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|bw:fleetGlassDusty:0:true:0.9:false:false:false` | 335 |
| 90 | MeshPhysicalMaterial | physical | fleet_glassDusty | 1 | fleet | yes | clearcoat transparent | mapUv emissive roughness | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|bw:fleetGlassDusty:0:true:0.9:false:false:false` | 335 |
| 230 | MeshPhysicalMaterial | physical | fleet_glassDusty | 1 | fleet |  | clearcoat flipSided transparent | mapUv emissive roughness | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|bw:fleetGlassDusty:0:true:0.9:false:false:false` | 342 |
| 231 | MeshPhysicalMaterial | physical | fleet_glassDusty | 1 | fleet |  | clearcoat transparent | mapUv emissive roughness | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|bw:fleetGlassDusty:0:true:0.9:false:false:false` | 342 |
| 108 | MeshPhysicalMaterial | physical | fleet_lensClear | 1 | fleet | yes | clearcoat transparent | - | d2 p5 s4 h1 ds1 | default | 274 |
| 229 | MeshPhysicalMaterial | physical | fleet_lensClear | 1 | fleet |  | clearcoat transparent | - | d2 p5 s4 h1 ds1 | default | 281 |
| 99 | MeshPhysicalMaterial | physical | fleet_paint | 1 | fleet | yes | clearcoat vertexColors | mapUv normal roughness clearcoatNormal | d2 p5 s4 h1 ds1 | `fn{Object.assign(e.uniforms,u),e.vertexShader=e.vertexShader` | 6,368 |
| 199 | MeshPhysicalMaterial | physical | fleet_paint | 1 | fleet |  | clearcoat vertexColors | mapUv normal roughness clearcoatNormal | d2 p5 s4 h1 ds1 | `fn{Object.assign(e.uniforms,u),e.vertexShader=e.vertexShader` | 6,375 |
| 104 | MeshPhysicalMaterial | physical | fleet_paintOld | 1 | fleet | yes | clearcoat vertexColors | mapUv normal roughness clearcoatNormal | d2 p5 s4 h1 ds1 | `fn{Object.assign(e.uniforms,u),e.vertexShader=e.vertexShader` | 6,374 |
| 200 | MeshPhysicalMaterial | physical | fleet_paintOld | 1 | fleet |  | clearcoat vertexColors | mapUv normal roughness clearcoatNormal | d2 p5 s4 h1 ds1 | `fn{Object.assign(e.uniforms,u),e.vertexShader=e.vertexShader` | 6,381 |
| 114 | MeshStandardMaterial | physical | fleet_alu | 1 | fleet | yes | vertexColors | normal roughness | d2 p5 s4 h1 ds1 | `fn{Object.assign(e.uniforms,u),e.vertexShader=e.vertexShader` | 6,363 |
| 203 | MeshStandardMaterial | physical | fleet_alu | 1 | fleet |  | vertexColors | normal roughness | d2 p5 s4 h1 ds1 | `fn{Object.assign(e.uniforms,u),e.vertexShader=e.vertexShader` | 6,370 |
| 109 | MeshStandardMaterial | physical | fleet_amberOn | 5 | fleet | yes | vertexColors | normal | d2 p5 s4 h1 ds1 | default | 261 |
| 118 | MeshStandardMaterial | physical | fleet_canvas | 1 | fleet | yes | vertexColors doubleSided | mapUv normal roughness | d2 p5 s4 h1 ds1 | `fn{Object.assign(e.uniforms,r),e.vertexShader=e.vertexShader` | 896 |
| 212 | MeshStandardMaterial | physical | fleet_canvas | 1 | fleet |  | vertexColors doubleSided | mapUv normal roughness | d2 p5 s4 h1 ds1 | `fn{Object.assign(e.uniforms,r),e.vertexShader=e.vertexShader` | 903 |
| 101 | MeshStandardMaterial | physical | fleet_chrome | 1 | fleet | yes | vertexColors | normal roughness | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|bw:fleetChrome:0:false:0:false:true:false` | 322 |
| 205 | MeshStandardMaterial | physical | fleet_chrome | 1 | fleet |  | vertexColors | normal roughness | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|bw:fleetChrome:0:false:0:false:true:false` | 329 |
| 115 | MeshStandardMaterial | physical | fleet_decal | 1 | fleet | yes | alphaTest vertexColors doubleSided | mapUv | d2 p5 s4 h1 ds1 | `fn{Object.assign(e.uniforms,u),e.vertexShader=e.vertexShader` | 6,329 |
| 216 | MeshStandardMaterial | physical | fleet_decal | 1 | fleet |  | alphaTest vertexColors doubleSided | mapUv | d2 p5 s4 h1 ds1 | `fn{Object.assign(e.uniforms,u),e.vertexShader=e.vertexShader` | 6,336 |
| 110 | MeshStandardMaterial | physical | fleet_fabric | 1 | fleet | yes | vertexColors | mapUv normal roughness | d2 p5 s4 h1 ds1 | `fn{Object.assign(e.uniforms,u),e.vertexShader=e.vertexShader` | 6,324 |
| 213 | MeshStandardMaterial | physical | fleet_fabric | 1 | fleet |  | vertexColors | mapUv normal roughness | d2 p5 s4 h1 ds1 | `fn{Object.assign(e.uniforms,u),e.vertexShader=e.vertexShader` | 6,331 |
| 100 | MeshStandardMaterial | physical | fleet_gap | 1 | fleet | yes | vertexColors | - | d2 p5 s4 h1 ds1 | `fn{Object.assign(e.uniforms,u),e.vertexShader=e.vertexShader` | 6,372 |
| 211 | MeshStandardMaterial | physical | fleet_gap | 1 | fleet |  | vertexColors | - | d2 p5 s4 h1 ds1 | `fn{Object.assign(e.uniforms,u),e.vertexShader=e.vertexShader` | 6,379 |
| 218 | MeshStandardMaterial | physical | fleet_headOff | 2 | fleet |  | vertexColors | - | d2 p5 s4 h1 ds1 | default | 271 |
| 107 | MeshStandardMaterial | physical | fleet_headOn | 2 | fleet | yes | vertexColors | - | d2 p5 s4 h1 ds1 | default | 264 |
| 120 | MeshStandardMaterial | physical | fleet_mesh | 1 | fleet | yes | alphaTest vertexColors doubleSided | mapUv | d2 p5 s4 h1 ds1 | default | 261 |
| 278 | MeshStandardMaterial | physical | fleet_mesh | 1 | fleet |  | alphaTest vertexColors doubleSided | mapUv | d2 p5 s4 h1 ds1 | default | 268 |
| 113 | MeshStandardMaterial | physical | fleet_plate | 1 | fleet | yes | vertexColors | mapUv normal roughness | d2 p5 s4 h1 ds1 | `fn{Object.assign(e.uniforms,u),e.vertexShader=e.vertexShader` | 6,363 |
| 204 | MeshStandardMaterial | physical | fleet_plate | 1 | fleet |  | vertexColors | mapUv normal roughness | d2 p5 s4 h1 ds1 | `fn{Object.assign(e.uniforms,u),e.vertexShader=e.vertexShader` | 6,370 |
| 106 | MeshStandardMaterial | physical | fleet_reflector | 1 | fleet | yes | vertexColors doubleSided | mapUv normal roughness | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|bw:fleetRefl:0:false:0:false:false:false` | 318 |
| 217 | MeshStandardMaterial | physical | fleet_reflector | 1 | fleet |  | vertexColors doubleSided | mapUv normal roughness | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|bw:fleetRefl:0:false:0:false:false:false` | 325 |
| 97 | MeshStandardMaterial | physical | fleet_rubber | 1 | fleet | yes | vertexColors | mapUv normal roughness | d2 p5 s4 h1 ds1 | `fn{Object.assign(e.uniforms,u),e.vertexShader=e.vertexShader` | 6,324 |
| 209 | MeshStandardMaterial | physical | fleet_rubber | 1 | fleet |  | vertexColors | mapUv normal roughness | d2 p5 s4 h1 ds1 | `fn{Object.assign(e.uniforms,u),e.vertexShader=e.vertexShader` | 6,331 |
| 103 | MeshStandardMaterial | physical | fleet_rust | 1 | fleet | yes | vertexColors | mapUv normal roughness | d2 p5 s4 h1 ds1 | `fn{Object.assign(e.uniforms,u),e.vertexShader=e.vertexShader` | 6,322 |
| 206 | MeshStandardMaterial | physical | fleet_rust | 1 | fleet |  | vertexColors | mapUv normal roughness | d2 p5 s4 h1 ds1 | `fn{Object.assign(e.uniforms,u),e.vertexShader=e.vertexShader` | 6,329 |
| 102 | MeshStandardMaterial | physical | fleet_steel | 1 | fleet | yes | vertexColors | mapUv normal roughness | d2 p5 s4 h1 ds1 | `fn{Object.assign(e.uniforms,u),e.vertexShader=e.vertexShader` | 6,366 |
| 201 | MeshStandardMaterial | physical | fleet_steel | 1 | fleet |  | vertexColors | mapUv normal roughness | d2 p5 s4 h1 ds1 | `fn{Object.assign(e.uniforms,u),e.vertexShader=e.vertexShader` | 6,373 |
| 219 | MeshStandardMaterial | physical | fleet_tailOff | 5 | fleet |  | vertexColors | normal | d2 p5 s4 h1 ds1 | default | 268 |
| 98 | MeshStandardMaterial | physical | fleet_tread | 1 | fleet | yes | vertexColors | mapUv normal roughness | d2 p5 s4 h1 ds1 | `fn{Object.assign(e.uniforms,u),e.vertexShader=e.vertexShader` | 6,323 |
| 210 | MeshStandardMaterial | physical | fleet_tread | 1 | fleet |  | vertexColors | mapUv normal roughness | d2 p5 s4 h1 ds1 | `fn{Object.assign(e.uniforms,u),e.vertexShader=e.vertexShader` | 6,330 |
| 105 | MeshStandardMaterial | physical | fleet_trim | 1 | fleet | yes | vertexColors | mapUv normal roughness | d2 p5 s4 h1 ds1 | `fn{Object.assign(e.uniforms,u),e.vertexShader=e.vertexShader` | 6,363 |
| 207 | MeshStandardMaterial | physical | fleet_trim | 1 | fleet |  | vertexColors | mapUv normal roughness | d2 p5 s4 h1 ds1 | `fn{Object.assign(e.uniforms,u),e.vertexShader=e.vertexShader` | 6,370 |
| 119 | MeshStandardMaterial | physical | fleet_trimGloss | 1 | fleet | yes | vertexColors | mapUv normal roughness | d2 p5 s4 h1 ds1 | `fn{Object.assign(e.uniforms,u),e.vertexShader=e.vertexShader` | 6,374 |
| 208 | MeshStandardMaterial | physical | fleet_trimGloss | 1 | fleet |  | vertexColors | mapUv normal roughness | d2 p5 s4 h1 ds1 | `fn{Object.assign(e.uniforms,u),e.vertexShader=e.vertexShader` | 6,381 |
| 111 | MeshStandardMaterial | physical | fleet_vinyl | 1 | fleet | yes | vertexColors | mapUv normal roughness | d2 p5 s4 h1 ds1 | `fn{Object.assign(e.uniforms,u),e.vertexShader=e.vertexShader` | 6,323 |
| 214 | MeshStandardMaterial | physical | fleet_vinyl | 1 | fleet |  | vertexColors | mapUv normal roughness | d2 p5 s4 h1 ds1 | `fn{Object.assign(e.uniforms,u),e.vertexShader=e.vertexShader` | 6,330 |
| 112 | MeshStandardMaterial | physical | fleet_vinylFaded | 1 | fleet | yes | vertexColors | mapUv normal roughness | d2 p5 s4 h1 ds1 | `fn{Object.assign(e.uniforms,u),e.vertexShader=e.vertexShader` | 6,328 |
| 215 | MeshStandardMaterial | physical | fleet_vinylFaded | 1 | fleet |  | vertexColors | mapUv normal roughness | d2 p5 s4 h1 ds1 | `fn{Object.assign(e.uniforms,u),e.vertexShader=e.vertexShader` | 6,335 |
| 116 | MeshStandardMaterial | physical | fleet_whip | 1 | fleet | yes | vertexColors | mapUv normal roughness | d2 p5 s4 h1 ds1 | `fn{Object.assign(e.uniforms,r),e.vertexShader=e.vertexShader` | 877 |
| 202 | MeshStandardMaterial | physical | fleet_whip | 1 | fleet |  | vertexColors | mapUv normal roughness | d2 p5 s4 h1 ds1 | `fn{Object.assign(e.uniforms,r),e.vertexShader=e.vertexShader` | 884 |
| 16 | MeshBasicMaterial | basic |  | 3 | forest | yes | flipSided transparent | mapUv | d2 p5 s4 h1 ds1 | default | 247 |
| 17 | MeshBasicMaterial | basic |  | 4 | forest,vehicle | yes |  transparent | mapUv | d2 p5 s4 h1 ds1 | default | 247 |
| 222 | MeshBasicMaterial | basic |  | 3 | forest |  | flipSided transparent | mapUv | d2 p5 s4 h1 ds1 | default | 254 |
| 223 | MeshBasicMaterial | basic |  | 4 | forest,vehicle |  |  transparent | mapUv | d2 p5 s4 h1 ds1 | default | 254 |
| 275 | MeshBasicMaterial | basic |  | 3 | forest |  | flipSided transparent | mapUv | d2 p5 s4 h1 ds1 | default | 256 |
| 244 | MeshBasicMaterial | basic | fleet_pool | 5 | forest,vehicle,fleet |  |  transparent | mapUv | d2 p5 s4 h1 ds1 | default | 256 |
| 11 | MeshStandardMaterial | physical |  | 4 | forest | yes | instancing instancingColor | mapUv ao normal roughness | d2 p5 s4 h1 ds1 | `wind\|bark-standing-v1` | 254 |
| 12 | MeshStandardMaterial | physical |  | 7 | forest | yes | instancing instancingColor alphaTest doubleSided | mapUv | d2 p5 s4 h1 ds1 | `wind\|foliage-v2` | 257 |
| 13 | MeshStandardMaterial | physical |  | 2 | forest | yes | instancing instancingColor | mapUv ao normal roughness | d2 p5 s4 h1 ds1 | default | 252 |
| 14 | MeshStandardMaterial | physical |  | 2 | forest | yes | instancing instancingColor | mapUv ao normal roughness | d2 p5 s4 h1 ds1 | `wind\|bark-deadfall-v1` | 254 |
| 15 | MeshStandardMaterial | physical |  | 1 | forest | yes | - | mapUv roughness | d2 p5 s4 h1 ds1 | default | 258 |
| 139 | MeshStandardMaterial | physical |  | 4 | forest |  | instancing instancingColor | mapUv ao normal roughness | d2 p5 s4 h1 ds1 | `wind\|bark-standing-v1` | 261 |
| 140 | MeshStandardMaterial | physical |  | 2 | forest |  | instancing instancingColor | mapUv ao normal roughness | d2 p5 s4 h1 ds1 | `wind\|bark-deadfall-v1` | 261 |
| 141 | MeshStandardMaterial | physical |  | 7 | forest |  | instancing instancingColor alphaTest doubleSided | mapUv | d2 p5 s4 h1 ds1 | `wind\|foliage-v2` | 264 |
| 142 | MeshStandardMaterial | physical |  | 2 | forest |  | instancing instancingColor | mapUv ao normal roughness | d2 p5 s4 h1 ds1 | default | 259 |
| 143 | MeshStandardMaterial | physical |  | 1 | forest |  | - | mapUv roughness | d2 p5 s4 h1 ds1 | default | 265 |
| 250 | MeshNormalMaterial | normal |  | 1 | post |  |  transparent | - | d2 p5 s4 h1 ds1 | default | 257 |
| 251 | MeshNormalMaterial | normal |  | 1 | post |  | instancing instancingColor transparent | - | d2 p5 s4 h1 ds1 | default | 257 |
| 252 | MeshNormalMaterial | normal |  | 1 | post |  | instancing transparent | - | d2 p5 s4 h1 ds1 | default | 257 |
| 283 | MeshNormalMaterial | normal |  | 1 | post |  | skinning transparent | - | d2 p5 s4 h1 ds1 | default | 257 |
| 266 | RawShaderMaterial | custom(35,36) | OutputShader | 1 | post |  | - | - | - | default | 66 |
| 253 | ShaderMaterial | custom(21,22) |  | 1 | post |  |  transparent | - | d0 p0 s0 h0 ds0 | default | 390 |
| 254 | ShaderMaterial | custom(21,23) |  | 1 | post |  | - | - | - | default | 718 |
| 255 | ShaderMaterial | custom(24,25) |  | 1 | post |  |  transparent | - | d0 p0 s0 h0 ds0 | default | 251 |
| 256 | ShaderMaterial | custom(26,27) |  | 1 | post |  |  transparent | - | d0 p0 s0 h0 ds0 | default | 251 |
| 258 | ShaderMaterial | custom(30,31) |  | 1 | post |  | - | - | d0 p0 s0 h0 ds0 | default | 251 |
| 259 | ShaderMaterial | custom(32,33) |  | 1 | post |  | - | - | d0 p0 s0 h0 ds0 | default | 267 |
| 260 | ShaderMaterial | custom(32,33) |  | 1 | post |  | - | - | d0 p0 s0 h0 ds0 | default | 268 |
| 261 | ShaderMaterial | custom(32,33) |  | 1 | post |  | - | - | d0 p0 s0 h0 ds0 | default | 268 |
| 262 | ShaderMaterial | custom(32,33) |  | 1 | post |  | - | - | d0 p0 s0 h0 ds0 | default | 268 |
| 263 | ShaderMaterial | custom(32,33) |  | 1 | post |  | - | - | d0 p0 s0 h0 ds0 | default | 268 |
| 264 | ShaderMaterial | custom(32,34) |  | 1 | post |  | - | - | d0 p0 s0 h0 ds0 | default | 262 |
| 265 | ShaderMaterial | custom(24,25) |  | 1 | post |  | premultipliedAlpha transparent | - | d0 p0 s0 h0 ds0 | default | 251 |
| 268 | ShaderMaterial | custom(38,39) |  | 1 | post |  | - | - | d0 p0 s0 h0 ds0 | default | 270 |
| 269 | ShaderMaterial | custom(40,41) |  | 1 | post |  | - | - | - | default | 398 |
| 270 | ShaderMaterial | custom(42,43) |  | 1 | post |  | - | - | d0 p0 s0 h0 ds0 | default | 244 |
| 267 | ShaderMaterial | custom(28,37) | GradeShader | 1 | post |  | - | - | d0 p0 s0 h0 ds0 | default | 251 |
| 257 | ShaderMaterial | custom(28,29) | SanitizeShader | 1 | post |  | - | - | d0 p0 s0 h0 ds0 | default | 251 |
| 126 | MeshStandardMaterial | physical |  | 4 | roadside | yes | dithering | mapUv | d2 p5 s4 h1 ds1 | default | 261 |
| 127 | MeshStandardMaterial | physical |  | 6 | roadside | yes | dithering | - | d2 p5 s4 h1 ds1 | default | 264 |
| 220 | MeshStandardMaterial | physical |  | 4 | roadside |  | dithering | mapUv | d2 p5 s4 h1 ds1 | default | 268 |
| 221 | MeshStandardMaterial | physical |  | 6 | roadside |  | dithering | - | d2 p5 s4 h1 ds1 | default | 271 |
| 129 | ShaderMaterial | custom(17,18) |  | 1 | sky | yes |  transparent | - | d2 p5 s4 h1 ds1 | default | 243 |
| 249 | ShaderMaterial | custom(17,18) |  | 1 | sky |  |  transparent | - | d2 p5 s4 h1 ds1 | default | 250 |
| 0 | ShaderMaterial | custom(0,1) | EquirectangularToCubeUV | 1 | sky |  | - | - | d0 p0 s0 h0 ds0 | default | 236 |
| 4 | ShaderMaterial | custom(0,4) | PMREMGGXConvolution | 1 | sky |  |  transparent | - | d0 p0 s0 h0 ds0 | default | 358 |
| 5 | ShaderMaterial | custom(2,3) | ProceduralSky | 1 | sky | yes | flipSided | - | d2 p5 s4 h1 ds1 | default | 247 |
| 135 | ShaderMaterial | custom(2,3) | ProceduralSky | 1 | sky |  | flipSided | - | d2 p5 s4 h1 ds1 | default | 254 |
| 128 | ShaderMaterial | custom(15,16) | sunShaft | 8 | sky | yes | doubleSided transparent | - | d2 p5 s4 h1 ds1 | default | 249 |
| 248 | ShaderMaterial | custom(15,16) | sunShaft | 8 | sky |  | doubleSided transparent | - | d2 p5 s4 h1 ds1 | default | 256 |
| 6 | MeshStandardMaterial | physical |  | 1 | terrain |  | - | - | - | - | 256 |
| 7 | MeshStandardMaterial | physical |  | 1 | terrain | yes | vertexColors dithering | - | d2 p5 s4 h1 ds1 | default | 264 |
| 10 | MeshStandardMaterial | physical |  | 1 | terrain | yes | dithering | mapUv | d2 p5 s4 h1 ds1 | `e=>{e.vertexShader=e.vertexShader.replace(`#include <common>` | 1,339 |
| 136 | MeshStandardMaterial | physical |  | 1 | terrain |  | - | - | - | - | 263 |
| 137 | MeshStandardMaterial | physical |  | 1 | terrain |  | vertexColors dithering | - | d2 p5 s4 h1 ds1 | default | 271 |
| 138 | MeshStandardMaterial | physical |  | 1 | terrain |  | dithering | mapUv | d2 p5 s4 h1 ds1 | `e=>{e.vertexShader=e.vertexShader.replace(`#include <common>` | 1,346 |
| 271 | MeshStandardMaterial | physical |  | 1 | terrain |  | dithering | mapUv normal | d2 p5 s4 h1 ds1 | `terrain-relief-v1\|tod` | 267 |
| 8 | ShaderMaterial | custom(5,6) |  | 1 | terrain | yes | premultipliedAlpha transparent | - | d2 p5 s4 h1 ds1 | default | 241 |
| 9 | ShaderMaterial | custom(7,8) |  | 1 | terrain | yes |  transparent | - | d2 p5 s4 h1 ds1 | default | 241 |
| 242 | ShaderMaterial | custom(5,6) |  | 1 | terrain |  | premultipliedAlpha transparent | - | d2 p5 s4 h1 ds1 | default | 248 |
| 277 | ShaderMaterial | custom(7,8) |  | 1 | terrain |  |  transparent | - | d2 p5 s4 h1 ds1 | default | 248 |
| 64 | MeshBasicMaterial | basic |  | 1 | vehicle | yes | - | mapUv | d2 p5 s4 h1 ds1 | default | 247 |
| 273 | MeshBasicMaterial | basic |  | 1 | vehicle |  | - | mapUv | d2 p5 s4 h1 ds1 | default | 256 |
| 59 | MeshPhysicalMaterial | physical | cabinGlass | 1 | vehicle | yes | clearcoat transparent | - | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|bw:cabinGlass:0.5:true:0.8:false:false:false\|cl:c` | 367 |
| 276 | MeshPhysicalMaterial | physical | cabinGlass | 1 | vehicle |  | clearcoat transparent | - | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|bw:cabinGlass:0.5:true:0.8:false:false:false\|cl:c` | 374 |
| 37 | MeshPhysicalMaterial | physical | glass | 1 | vehicle | yes | clearcoat flipSided transparent | mapUv roughness | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|bw:glass:0:true:1.2:false:false:false\|gf:glass:sc` | 344 |
| 38 | MeshPhysicalMaterial | physical | glass | 1 | vehicle | yes | clearcoat transparent | mapUv roughness | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|bw:glass:0:true:1.2:false:false:false\|gf:glass:sc` | 344 |
| 239 | MeshPhysicalMaterial | physical | glass | 1 | vehicle |  | clearcoat flipSided transparent | mapUv roughness | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|bw:glass:0:true:1.2:false:false:false\|gf:glass:sc` | 351 |
| 240 | MeshPhysicalMaterial | physical | glass | 1 | vehicle |  | clearcoat transparent | mapUv roughness | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|bw:glass:0:true:1.2:false:false:false\|gf:glass:sc` | 351 |
| 40 | MeshPhysicalMaterial | physical | glassDark | 1 | vehicle | yes | clearcoat flipSided transparent | mapUv | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|bw:glassDark:0:true:1.1:false:false:false\|gf:glas` | 353 |
| 41 | MeshPhysicalMaterial | physical | glassDark | 1 | vehicle | yes | clearcoat transparent | mapUv | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|bw:glassDark:0:true:1.1:false:false:false\|gf:glas` | 353 |
| 235 | MeshPhysicalMaterial | physical | glassDark | 1 | vehicle |  | clearcoat flipSided transparent | mapUv | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|bw:glassDark:0:true:1.1:false:false:false\|gf:glas` | 360 |
| 236 | MeshPhysicalMaterial | physical | glassDark | 1 | vehicle |  | clearcoat transparent | mapUv | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|bw:glassDark:0:true:1.1:false:false:false\|gf:glas` | 360 |
| 42 | MeshPhysicalMaterial | physical | glassSide | 1 | vehicle | yes | clearcoat flipSided transparent | mapUv | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|bw:glassSide:0:true:1.2:false:false:false\|gf:glas` | 353 |
| 43 | MeshPhysicalMaterial | physical | glassSide | 1 | vehicle | yes | clearcoat transparent | mapUv | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|bw:glassSide:0:true:1.2:false:false:false\|gf:glas` | 353 |
| 237 | MeshPhysicalMaterial | physical | glassSide | 1 | vehicle |  | clearcoat flipSided transparent | mapUv | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|bw:glassSide:0:true:1.2:false:false:false\|gf:glas` | 360 |
| 238 | MeshPhysicalMaterial | physical | glassSide | 1 | vehicle |  | clearcoat transparent | mapUv | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|bw:glassSide:0:true:1.2:false:false:false\|gf:glas` | 360 |
| 35 | MeshPhysicalMaterial | physical | lensClear | 1 | vehicle | yes | clearcoat transparent | normal | d2 p5 s4 h1 ds1 | default | 271 |
| 234 | MeshPhysicalMaterial | physical | lensClear | 1 | vehicle |  | clearcoat transparent | normal | d2 p5 s4 h1 ds1 | default | 278 |
| 26 | MeshPhysicalMaterial | physical | paint | 1 | vehicle | yes | clearcoat | mapUv normal roughness clearcoatNormal | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|bw:paint1921860:0:full:0:true:true:true\|dirt:pain` | 349 |
| 144 | MeshPhysicalMaterial | physical | paint | 1 | vehicle |  | clearcoat | mapUv normal roughness clearcoatNormal | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|bw:paint1921860:0:full:0:true:true:true\|dirt:pain` | 356 |
| 36 | MeshPhysicalMaterial | physical | paintAccent | 1 | vehicle | yes | clearcoat | mapUv normal roughness clearcoatNormal | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|bw:paintaccent:0:full:0:true:true:true\|dirt:paint` | 347 |
| 147 | MeshPhysicalMaterial | physical | paintAccent | 1 | vehicle |  | clearcoat | mapUv normal roughness clearcoatNormal | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|bw:paintaccent:0:full:0:true:true:true\|dirt:paint` | 354 |
| 27 | MeshPhysicalMaterial | physical | paintDark | 1 | vehicle | yes | clearcoat | mapUv normal roughness clearcoatNormal | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|bw:paintdark:0:full:0:true:true:true\|dirt:paintda` | 343 |
| 146 | MeshPhysicalMaterial | physical | paintDark | 1 | vehicle |  | clearcoat | mapUv normal roughness clearcoatNormal | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|bw:paintdark:0:full:0:true:true:true\|dirt:paintda` | 350 |
| 45 | MeshPhysicalMaterial | physical | paintRoof | 1 | vehicle | yes | clearcoat | mapUv normal roughness clearcoatNormal | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|bw:paintroof:0:full:0:true:true:true\|dirt:paintro` | 344 |
| 145 | MeshPhysicalMaterial | physical | paintRoof | 1 | vehicle |  | clearcoat | mapUv normal roughness clearcoatNormal | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|bw:paintroof:0:full:0:true:true:true\|dirt:paintro` | 351 |
| 56 | MeshStandardMaterial | physical |  | 1 | vehicle | yes | - | mapUv normal roughness | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|cl:rubber:1:0.86:1.42` | 299 |
| 57 | MeshStandardMaterial | physical |  | 1 | vehicle | yes | - | normal | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|cl:paper:0:0.86:1.42` | 304 |
| 62 | MeshStandardMaterial | physical |  | 1 | vehicle | yes | - | mapUv normal roughness | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|cl:cardVinyl:0:0.86:1.42` | 302 |
| 65 | MeshStandardMaterial | physical |  | 1 | vehicle | yes | vertexColors | - | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|ndlemi` | 293 |
| 178 | MeshStandardMaterial | physical |  | 1 | vehicle |  | - | normal | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|cl:paper:0:0.86:1.42` | 311 |
| 179 | MeshStandardMaterial | physical |  | 1 | vehicle |  | - | mapUv normal roughness | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|cl:cardVinyl:0:0.86:1.42` | 309 |
| 180 | MeshStandardMaterial | physical |  | 1 | vehicle |  | - | mapUv normal roughness | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|cl:rubber:1:0.86:1.42` | 306 |
| 274 | MeshStandardMaterial | physical |  | 1 | vehicle |  | vertexColors | - | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|ndlemi` | 300 |
| 20 | MeshStandardMaterial | physical | alu | 1 | vehicle | yes | - | normal roughness | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|dirt:alu:1:false\|bw:alu:0:false:0:false:true:fals` | 350 |
| 152 | MeshStandardMaterial | physical | alu | 1 | vehicle |  | - | normal roughness | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|dirt:alu:1:false\|bw:alu:0:false:0:false:true:fals` | 357 |
| 32 | MeshStandardMaterial | physical | amber | 5 | vehicle | yes | - | normal | d2 p5 s4 h1 ds1 | default | 261 |
| 46 | MeshStandardMaterial | physical | bedLiner | 1 | vehicle | yes | - | mapUv normal roughness | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|dirt:liner:0.45:false\|bw:liner:0.5:false:0:false:` | 337 |
| 158 | MeshStandardMaterial | physical | bedLiner | 1 | vehicle |  | - | mapUv normal roughness | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|dirt:liner:0.45:false\|bw:liner:0.5:false:0:false:` | 344 |
| 71 | MeshStandardMaterial | physical | brakeRotor | 1 | vehicle | yes | vertexColors | mapUv normal roughness | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|bw:brakeRotor:0.5:false:0:false:false:true` | 320 |
| 185 | MeshStandardMaterial | physical | brakeRotor | 1 | vehicle |  | vertexColors | mapUv normal roughness | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|bw:brakeRotor:0.5:false:0:false:false:true` | 327 |
| 50 | MeshStandardMaterial | physical | cabinPanel | 1 | vehicle | yes | - | mapUv normal emissive roughness | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|cb:cabinPanel:0\|cl:cabinPanel:0:0.86:1.42` | 316 |
| 171 | MeshStandardMaterial | physical | cabinPanel | 1 | vehicle |  | - | mapUv normal emissive roughness | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|cb:cabinPanel:0\|cl:cabinPanel:0:0.86:1.42` | 323 |
| 72 | MeshStandardMaterial | physical | caliper | 1 | vehicle | yes | vertexColors | mapUv normal roughness | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|bw:caliper:0.5:false:0:false:false:true` | 317 |
| 186 | MeshStandardMaterial | physical | caliper | 1 | vehicle |  | vertexColors | mapUv normal roughness | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|bw:caliper:0.5:false:0:false:false:true` | 324 |
| 224 | MeshStandardMaterial | physical | campWear | 2 | vehicle,camp |  |  transparent | mapUv | d2 p5 s4 h1 ds1 | default | 268 |
| 47 | MeshStandardMaterial | physical | canvasKhaki | 1 | vehicle | yes | - | normal | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|dirt:canvasKhaki:0:false\|bw:canvasKhaki:0.5:false` | 351 |
| 176 | MeshStandardMaterial | physical | canvasKhaki | 1 | vehicle |  | - | normal | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|dirt:canvasKhaki:0:false\|bw:canvasKhaki:0.5:false` | 358 |
| 66 | MeshStandardMaterial | physical | castIron | 1 | vehicle | yes | vertexColors | mapUv normal metalness roughness | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|bw:castIron:0.5:false:0:false:false:true` | 315 |
| 184 | MeshStandardMaterial | physical | castIron | 1 | vehicle |  | vertexColors | mapUv normal metalness roughness | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|bw:castIron:0.5:false:0:false:false:true` | 322 |
| 28 | MeshStandardMaterial | physical | chrome | 1 | vehicle | yes | - | normal roughness | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|dirt:chrome:1:false\|bw:chrome:0:false:0:false:tru` | 359 |
| 150 | MeshStandardMaterial | physical | chrome | 1 | vehicle |  | - | normal roughness | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|dirt:chrome:1:false\|bw:chrome:0:false:0:false:tru` | 366 |
| 73 | MeshStandardMaterial | physical | contactDust | 2 | vehicle,camp | yes |  transparent | mapUv | d2 p5 s4 h1 ds1 | default | 261 |
| 31 | MeshStandardMaterial | physical | decalBadge | 4 | vehicle,wildlife | yes | alphaTest doubleSided | mapUv | d2 p5 s4 h1 ds1 | default | 261 |
| 165 | MeshStandardMaterial | physical | decalBadge | 4 | vehicle,wildlife |  | alphaTest doubleSided | mapUv | d2 p5 s4 h1 ds1 | default | 268 |
| 30 | MeshStandardMaterial | physical | decalName | 1 | vehicle | yes | alphaTest doubleSided | mapUv | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|dirt:decalName:1:false` | 306 |
| 164 | MeshStandardMaterial | physical | decalName | 1 | vehicle |  | alphaTest doubleSided | mapUv | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|dirt:decalName:1:false` | 313 |
| 29 | MeshStandardMaterial | physical | decalNumber | 1 | vehicle | yes | alphaTest doubleSided | mapUv | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|dirt:decalNumber:1:false` | 308 |
| 166 | MeshStandardMaterial | physical | decalNumber | 1 | vehicle |  | alphaTest doubleSided | mapUv | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|dirt:decalNumber:1:false` | 315 |
| 58 | MeshStandardMaterial | physical | fabric | 1 | vehicle | yes | - | mapUv normal roughness | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|dirt:seat:0:false\|cb:fabric:0\|cl:fabric:0:0.56:1.` | 328 |
| 167 | MeshStandardMaterial | physical | fabric | 1 | vehicle |  | - | mapUv normal roughness | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|dirt:seat:0:false\|cb:fabric:0\|cl:fabric:0:0.56:1.` | 335 |
| 52 | MeshStandardMaterial | physical | floorMat | 1 | vehicle | yes | - | mapUv normal roughness | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|dirt:floor:0:false\|cb:floorMat:0\|cl:floorMat:0:0.` | 333 |
| 174 | MeshStandardMaterial | physical | floorMat | 1 | vehicle |  | - | mapUv normal roughness | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|dirt:floor:0:false\|cb:floorMat:0\|cl:floorMat:0:0.` | 340 |
| 49 | MeshStandardMaterial | physical | fridgeCase | 1 | vehicle | yes | - | normal roughness | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|dirt:fridgeCase:0:false\|bw:fridgeCase:0.35:false:` | 347 |
| 177 | MeshStandardMaterial | physical | fridgeCase | 1 | vehicle |  | - | normal roughness | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|dirt:fridgeCase:0:false\|bw:fridgeCase:0.35:false:` | 354 |
| 22 | MeshStandardMaterial | physical | gap | 1 | vehicle | yes | - | - | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|dirt:gap:1:false\|bw:gap:0.55:false:0:false:false:` | 368 |
| 159 | MeshStandardMaterial | physical | gap | 1 | vehicle |  | - | - | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|dirt:gap:1:false\|bw:gap:0.55:false:0:false:false:` | 375 |
| 39 | MeshStandardMaterial | physical | glassEdge | 1 | vehicle | yes | - | - | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|bw:glassEdge:0.3:false:0:false:false:false` | 329 |
| 160 | MeshStandardMaterial | physical | glassEdge | 1 | vehicle |  | - | - | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|bw:glassEdge:0.3:false:0:false:false:false` | 336 |
| 34 | MeshStandardMaterial | physical | headlight | 4 | vehicle,camp | yes | - | - | d2 p5 s4 h1 ds1 | default | 264 |
| 162 | MeshStandardMaterial | physical | headlight | 4 | vehicle,camp |  | - | - | d2 p5 s4 h1 ds1 | default | 271 |
| 63 | MeshStandardMaterial | physical | headliner | 1 | vehicle | yes | - | mapUv normal roughness | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|cb:headliner:0\|cl:headliner:0:0.86:1.42` | 317 |
| 175 | MeshStandardMaterial | physical | headliner | 1 | vehicle |  | - | mapUv normal roughness | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|cb:headliner:0\|cl:headliner:0:0.86:1.42` | 324 |
| 53 | MeshStandardMaterial | physical | interiorFaded | 1 | vehicle | yes | - | mapUv normal roughness | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|dirt:cabinTop:0:false\|cb:interiorFaded:0\|cl:inter` | 347 |
| 169 | MeshStandardMaterial | physical | interiorFaded | 1 | vehicle |  | - | mapUv normal roughness | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|dirt:cabinTop:0:false\|cb:interiorFaded:0\|cl:inter` | 354 |
| 51 | MeshStandardMaterial | physical | interiorPlastic | 1 | vehicle | yes | - | mapUv normal roughness | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|dirt:cabin:0:false\|cb:interiorPlastic:0\|cl:interi` | 348 |
| 168 | MeshStandardMaterial | physical | interiorPlastic | 1 | vehicle |  | - | mapUv normal roughness | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|dirt:cabin:0:false\|cb:interiorPlastic:0\|cl:interi` | 355 |
| 55 | MeshStandardMaterial | physical | louvre | 1 | vehicle | yes | alphaTest doubleSided | mapUv | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|cb:louvre:0.3\|cl:louvre:1:0.86:1.42` | 319 |
| 172 | MeshStandardMaterial | physical | louvre | 1 | vehicle |  | alphaTest doubleSided | mapUv | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|cb:louvre:0.3\|cl:louvre:1:0.86:1.42` | 326 |
| 44 | MeshStandardMaterial | physical | mirrorGlass | 1 | vehicle | yes | - | normal roughness | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|bw:mirrorGlass:0:false:0:false:false:false` | 323 |
| 151 | MeshStandardMaterial | physical | mirrorGlass | 1 | vehicle |  | - | normal roughness | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|bw:mirrorGlass:0:false:0:false:false:false` | 330 |
| 25 | MeshStandardMaterial | physical | plate | 1 | vehicle | yes | - | mapUv normal roughness | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|dirt:plate:1:false\|bw:plate:0:false:0:false:true:` | 331 |
| 153 | MeshStandardMaterial | physical | plate | 1 | vehicle |  | - | mapUv normal roughness | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|dirt:plate:1:false\|bw:plate:0:false:0:false:true:` | 338 |
| 33 | MeshStandardMaterial | physical | reflector | 1 | vehicle | yes | doubleSided | mapUv normal roughness | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|bw:refl:0:false:0:false:false:false` | 313 |
| 161 | MeshStandardMaterial | physical | reflector | 1 | vehicle |  | doubleSided | mapUv normal roughness | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|bw:refl:0:false:0:false:false:false` | 320 |
| 67 | MeshStandardMaterial | physical | rimMachined | 3 | vehicle | yes | vertexColors | mapUv normal roughness | d2 p5 s4 h1 ds1 | default | 255 |
| 183 | MeshStandardMaterial | physical | rimMachined | 3 | vehicle |  | vertexColors | mapUv normal roughness | d2 p5 s4 h1 ds1 | default | 262 |
| 24 | MeshStandardMaterial | physical | rubber | 1 | vehicle | yes | - | mapUv normal roughness | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|dirt:rubber:1:false\|bw:rubber:0.6:false:0:false:f` | 336 |
| 154 | MeshStandardMaterial | physical | rubber | 1 | vehicle |  | - | mapUv normal roughness | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|dirt:rubber:1:false\|bw:rubber:0.6:false:0:false:f` | 343 |
| 21 | MeshStandardMaterial | physical | steel | 1 | vehicle | yes | - | mapUv normal metalness roughness | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|dirt:steel:1:false\|bw:steel:0:false:0:false:true:` | 328 |
| 148 | MeshStandardMaterial | physical | steel | 1 | vehicle |  | - | mapUv normal metalness roughness | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|dirt:steel:1:false\|bw:steel:0:false:0:false:true:` | 335 |
| 18 | MeshStandardMaterial | physical | steelDark | 1 | vehicle | yes | - | mapUv normal roughness | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|dirt:steelDark:1:false\|bw:steelDark:0.25:false:0:` | 384 |
| 149 | MeshStandardMaterial | physical | steelDark | 1 | vehicle |  | - | mapUv normal roughness | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|dirt:steelDark:1:false\|bw:steelDark:0.25:false:0:` | 391 |
| 54 | MeshStandardMaterial | physical | stitch | 1 | vehicle | yes | - | mapUv normal roughness | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|cb:stitch:0\|cl:stitch:0:0.56:1.2` | 310 |
| 170 | MeshStandardMaterial | physical | stitch | 1 | vehicle |  | - | mapUv normal roughness | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|cb:stitch:0\|cl:stitch:0:0.56:1.2` | 317 |
| 163 | MeshStandardMaterial | physical | taillight | 5 | vehicle |  | - | normal | d2 p5 s4 h1 ds1 | default | 268 |
| 48 | MeshStandardMaterial | physical | tread | 1 | vehicle | yes | - | mapUv ao normal roughness | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|dirt:tread:1:false` | 293 |
| 155 | MeshStandardMaterial | physical | tread | 1 | vehicle |  | - | mapUv ao normal roughness | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|dirt:tread:1:false` | 300 |
| 19 | MeshStandardMaterial | physical | trim | 1 | vehicle | yes | - | mapUv normal roughness | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|dirt:trim:1:false\|bw:trim:0.4:false:0:false:true:` | 361 |
| 156 | MeshStandardMaterial | physical | trim | 1 | vehicle |  | - | mapUv normal roughness | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|dirt:trim:1:false\|bw:trim:0.4:false:0:false:true:` | 368 |
| 23 | MeshStandardMaterial | physical | trimGloss | 1 | vehicle | yes | - | mapUv normal roughness | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|dirt:trimGloss:1:false\|bw:trimGloss:0.45:false:0:` | 385 |
| 157 | MeshStandardMaterial | physical | trimGloss | 1 | vehicle |  | - | mapUv normal roughness | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|dirt:trimGloss:1:false\|bw:trimGloss:0.45:false:0:` | 392 |
| 70 | MeshStandardMaterial | physical | tyreCarcass | 1 | vehicle | yes | vertexColors | mapUv normal roughness | d2 p5 s4 h1 ds1 | `loadedTyre_tyreCarcass_0.05` | 263 |
| 181 | MeshStandardMaterial | physical | tyreCarcass | 1 | vehicle |  | vertexColors | mapUv normal roughness | d2 p5 s4 h1 ds1 | `loadedTyre_tyreCarcass_0.05` | 270 |
| 68 | MeshStandardMaterial | physical | tyreLug | 1 | vehicle | yes | vertexColors | mapUv normal roughness | d2 p5 s4 h1 ds1 | `loadedTyre_tyreLug_0.05` | 259 |
| 182 | MeshStandardMaterial | physical | tyreLug | 1 | vehicle |  | vertexColors | mapUv normal roughness | d2 p5 s4 h1 ds1 | `loadedTyre_tyreLug_0.05` | 266 |
| 61 | MeshStandardMaterial | physical | wheelRim | 1 | vehicle | yes | - | mapUv normal roughness | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|bw:rimMould:0.45:false:0:false:false:false\|cb:whe` | 358 |
| 272 | MeshStandardMaterial | physical | wheelRim | 1 | vehicle |  | - | mapUv normal roughness | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|bw:rimMould:0.45:false:0:false:false:false\|cb:whe` | 365 |
| 69 | MeshStandardMaterial | physical | wheelVoid | 1 | vehicle | yes | vertexColors doubleSided | - | d2 p5 s4 h1 ds1 | default | 264 |
| 187 | MeshStandardMaterial | physical | wheelVoid | 1 | vehicle |  | vertexColors doubleSided | - | d2 p5 s4 h1 ds1 | default | 271 |
| 60 | MeshStandardMaterial | physical | wheelWorn | 1 | vehicle | yes | - | mapUv normal roughness | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|bw:rimWorn:0.3:false:0:false:false:false\|cb:wheel` | 361 |
| 173 | MeshStandardMaterial | physical | wheelWorn | 1 | vehicle |  | - | mapUv normal roughness | d2 p5 s4 h1 ds1 | `fn{n(e,t)}\|bw:rimWorn:0.3:false:0:false:false:false\|cb:wheel` | 368 |
| 123 | MeshPhysicalMaterial | physical | lion-cornea | 1 | wildlife |  | skinning transparent | - | d2 p5 s4 h1 ds1 | default | 274 |
| 121 | MeshStandardMaterial | physical | lion-coat | 4 | wildlife | yes | vertexColors skinning | mapUv normal | d2 p5 s4 h1 ds1 | default | 258 |
| 280 | MeshStandardMaterial | physical | lion-coat | 4 | wildlife |  | vertexColors skinning | mapUv normal | d2 p5 s4 h1 ds1 | default | 265 |
| 124 | MeshStandardMaterial | physical | lion-mane-base | 1 | wildlife | yes | skinning | mapUv | d2 p5 s4 h1 ds1 | default | 261 |
| 281 | MeshStandardMaterial | physical | lion-mane-base | 1 | wildlife |  | skinning | mapUv | d2 p5 s4 h1 ds1 | default | 268 |
| 125 | MeshStandardMaterial | physical | lion-mane-shells | 1 | wildlife | yes | vertexColors skinning doubleSided | mapUv | d2 p5 s4 h1 ds1 | `lionshell\|MeshStandardMaterial\|` | 273 |
| 282 | MeshStandardMaterial | physical | lion-mane-shells | 1 | wildlife |  | vertexColors skinning doubleSided | mapUv | d2 p5 s4 h1 ds1 | `lionshell\|MeshStandardMaterial\|` | 280 |
| 122 | MeshStandardMaterial | physical | lion-strands | 1 | wildlife | yes | alphaTest skinning doubleSided | mapUv | d2 p5 s4 h1 ds1 | default | 261 |
| 279 | MeshStandardMaterial | physical | lion-strands | 1 | wildlife |  | alphaTest skinning doubleSided | mapUv | d2 p5 s4 h1 ds1 | default | 268 |
| 3 | MeshBasicMaterial | basic |  | 0 | unattributed |  | - | - | - | - | 258 |
| 1 | MeshBasicMaterial | basic | PMREM.Background | 0 | unattributed |  | - | - | - | - | 258 |
| 131 | MeshDepthMaterial | depth |  | 0 | shadow |  | - | - | - | - | 257 |
| 132 | MeshDepthMaterial | depth |  | 0 | shadow |  | - | - | - | - | 257 |
| 133 | MeshDepthMaterial | depth |  | 0 | shadow |  | - | - | - | - | 257 |
| 134 | MeshDepthMaterial | depth |  | 0 | shadow |  | - | - | - | - | 257 |
| 2 | ShaderMaterial | 2 | ProceduralSky | 0 | unattributed |  | - | - | - | - | 255 |

## 2. Triangles per frame

Beauty pass only (the shadow pass and the AO G-buffer are broken out in the group tables). `instanced` triangles are `instanceCount x triangles per instance` for `InstancedMesh`; `regular` is everything else.

### hero

Camera at (-30.98, 3.38, 5.94) fov 36, truck at (-36.57, 2.66, 1.47). Beauty 1,510,768 tris in 252 calls (414,026 instanced in 63 calls, 1,096,742 regular); shadow pass 642,534 tris in 144 calls. 243 objects drawn, 3 of them outside the frustum (`frustumCulled = false`) costing 144 tris / 3 calls.

| group | beauty calls | beauty tris | of which instanced | tris inside frustum (measured) | objects | programs touched | shadow calls | shadow tris | G-buffer calls | G-buffer tris |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| terrain | 4 | 509,602 | 0 | 34,307 (7%) | 4 | 4 | 0 | 0 | 3 | 490,924 |
| forest | 70 | 416,906 | 414,026 | 30,681 (7%) | 67 | 6 | 31 | 146,968 | 23 | 104,244 |
| vehicle | 161 | 562,752 | 0 | 562,752 (100%) | 155 | 54 | 99 | 404,280 | 129 | 560,062 |
| camp | 4 | 16,544 | 0 | - | 4 | 4 | 9 | 84,884 | 0 | 0 |
| roadside | 2 | 2,868 | 0 | - | 2 | 1 | 5 | 6,402 | 2 | 2,868 |
| sky | 10 | 976 | 0 | - | 10 | 3 | 0 | 0 | 0 | 0 |
| dust | 1 | 1,120 | 0 | - | 1 | 1 | 0 | 0 | 0 | 0 |

"Tris inside frustum" is measured per triangle centroid for every regular mesh of 20k+ triangles and per instance bounding sphere for every InstancedMesh; smaller regular meshes are counted whole. It is the ceiling on what finer-grained culling can remove for this camera. Whole frame: 649,248 of 1,510,768 beauty triangles (43%) are inside the frustum.

Top 20 objects by triangles:

| object | group | type | material | instances | calls | tris | inside frustum | frustumCulled |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| terrain | terrain | Mesh | MeshStandardMaterial | - | 1 | 264,548 | 8,396 tris (3%) | yes |
| roadStones | terrain | Mesh | MeshStandardMaterial | - | 1 | 222,328 | 3,185 tris (1%) | yes |
| grass_1 | forest | Mesh | MeshStandardMaterial | 1,865 | 1 | 37,300 | 73/1865 instances | no |
| body_trimGloss | vehicle | Mesh | trimGloss | - | 1 | 36,768 | 36,768 tris (100%) | yes |
| body_trim | vehicle | Mesh | trim | - | 1 | 32,592 | 32,592 tris (100%) | yes |
| body_steelDark | vehicle | Mesh | steelDark | - | 1 | 29,964 | 29,964 tris (100%) | yes |
| body_gap | vehicle | Mesh | gap | - | 1 | 28,096 | 28,096 tris (100%) | yes |
| tree_umbrella_trunk | forest | Mesh | MeshStandardMaterial | 41 | 1 | 26,076 | 1/41 instances | yes |
| cabin_gap | vehicle | Mesh | gap | - | 1 | 25,544 | 25,544 tris (100%) | yes |
| grass_2 | forest | Mesh | MeshStandardMaterial | 1,867 | 1 | 22,404 | 84/1867 instances | no |
| cabin_trimGloss | vehicle | Mesh | trimGloss | - | 1 | 22,184 | 22,184 tris (100%) | yes |
| grass_0 | forest | Mesh | MeshStandardMaterial | 1,839 | 1 | 22,068 | 71/1839 instances | no |
| grass_3 | forest | Mesh | MeshStandardMaterial | 1,816 | 1 | 21,792 | 68/1816 instances | no |
| gear_steelDark | vehicle | Mesh | steelDark | - | 1 | 19,576 | sphere yes | yes |
| tree_umbrella_trunk | forest | Mesh | MeshStandardMaterial | 24 | 1 | 18,864 | 6/24 instances | yes |
| roadStoneShadows | terrain | Mesh | ShaderMaterial | - | 1 | 18,678 | sphere yes | yes |
| grass_4 | forest | Mesh | MeshStandardMaterial | 1,801 | 1 | 18,010 | 66/1801 instances | no |
| body_chrome | vehicle | Mesh | chrome | - | 1 | 17,672 | sphere yes | yes |
| campWear | camp | Mesh | campWear | - | 1 | 16,400 | sphere yes | yes |
| gear_trim | vehicle | Mesh | trim | - | 1 | 16,264 | sphere yes | yes |

Beauty pass by object-name prefix (top 15; `body_`, `cabin_`, `gear_`, `tyre_` are the truck kits):

| group/prefix | objects | calls | tris | tris inside frustum |
| --- | --- | --- | --- | --- |
| terrain/terrain | 1 | 1 | 264,548 | 8,396 |
| terrain/roadStones | 1 | 1 | 222,328 | 3,185 |
| vehicle/body | 40 | 46 | 209,308 | 209,308 |
| forest/grass | 12 | 12 | 181,474 | 7,080 |
| vehicle/cabin | 27 | 27 | 146,676 | 146,676 |
| vehicle/tyre | 24 | 24 | 99,016 | 99,016 |
| forest/tree | 10 | 10 | 90,460 | 9,186 |
| vehicle/gear | 21 | 21 | 81,652 | 81,652 |
| forest/litter | 4 | 4 | 51,104 | 2,816 |
| forest/forb | 5 | 5 | 22,514 | 1,440 |
| forest/scrub | 8 | 8 | 19,196 | 1,782 |
| terrain/roadStoneShadows | 1 | 1 | 18,678 | 18,678 |
| camp/campWear | 1 | 1 | 16,400 | 16,400 |
| vehicle/axles | 5 | 5 | 15,568 | 15,568 |
| forest/log | 3 | 3 | 11,408 | 744 |

Shadow pass, by name prefix (top 12) and top 10 casters:

| group/prefix | casters | shadow calls | shadow tris |
| --- | --- | --- | --- |
| vehicle/body | 21 | 21 | 197,820 |
| vehicle/tyre | 24 | 24 | 99,016 |
| forest/tree | 10 | 10 | 90,460 |
| camp/camp | 9 | 9 | 84,884 |
| vehicle/gear | 21 | 21 | 81,652 |
| forest/scrub | 8 | 8 | 19,196 |
| vehicle/axles | 5 | 5 | 15,568 |
| forest/log | 3 | 3 | 11,408 |
| forest/kopje | 3 | 3 | 10,260 |
| vehicle/brakes | 28 | 28 | 10,224 |
| forest/termite | 3 | 3 | 8,464 |
| forest/rock | 4 | 4 | 7,180 |

| caster | group | instances | calls | shadow tris |
| --- | --- | --- | --- | --- |
| body_trimGloss | vehicle | - | 1 | 36,768 |
| body_trim | vehicle | - | 1 | 32,592 |
| body_steelDark | vehicle | - | 1 | 29,964 |
| camp_timber | camp | - | 1 | 28,120 |
| body_gap | vehicle | - | 1 | 28,096 |
| tree_umbrella_trunk | forest | 41 | 1 | 26,076 |
| camp_deadwood | camp | - | 1 | 21,294 |
| gear_steelDark | vehicle | - | 1 | 19,576 |
| tree_umbrella_trunk | forest | 24 | 1 | 18,864 |
| body_chrome | vehicle | - | 1 | 17,672 |

Drawn while outside the frustum (`frustumCulled = false`):

| object | group | type | instances | calls | tris |
| --- | --- | --- | --- | --- | --- |
| fireEmbers | camp | Mesh | - | 1 | 60 |
| fireFlames | camp | Mesh | - | 1 | 48 |
| fireSmoke | camp | Mesh | - | 1 | 36 |

### mainroad

Camera at (25.67, 5.07, 9.6) fov 44, truck at (34.91, 2.11, 11.57). Beauty 1,851,592 tris in 301 calls (414,400 instanced in 65 calls, 1,437,192 regular); shadow pass 950,656 tris in 190 calls. 292 objects drawn, 3 of them outside the frustum (`frustumCulled = false`) costing 144 tris / 3 calls.

| group | beauty calls | beauty tris | of which instanced | tris inside frustum (measured) | objects | programs touched | shadow calls | shadow tris | G-buffer calls | G-buffer tris |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| terrain | 5 | 509,842 | 0 | 110,375 (22%) | 5 | 5 | 0 | 0 | 3 | 490,924 |
| forest | 71 | 413,536 | 410,656 | 51,695 (13%) | 68 | 6 | 30 | 142,308 | 23 | 100,090 |
| vehicle | 161 | 562,752 | 0 | 562,752 (100%) | 155 | 54 | 99 | 404,280 | 129 | 560,062 |
| camp | 16 | 104,050 | 3,744 | 55,777 (54%) | 16 | 11 | 31 | 145,334 | 12 | 87,506 |
| fleet | 24 | 248,082 | 0 | 58,914 (24%) | 24 | 21 | 20 | 247,308 | 23 | 246,738 |
| wildlife | 4 | 8 | 0 | - | 4 | 1 | 0 | 0 | 4 | 8 |
| roadside | 9 | 11,226 | 0 | - | 9 | 2 | 10 | 11,426 | 9 | 11,226 |
| sky | 10 | 976 | 0 | - | 10 | 3 | 0 | 0 | 0 | 0 |
| dust | 1 | 1,120 | 0 | - | 1 | 1 | 0 | 0 | 0 | 0 |

"Tris inside frustum" is measured per triangle centroid for every regular mesh of 20k+ triangles and per instance bounding sphere for every InstancedMesh; smaller regular meshes are counted whole. It is the ceiling on what finer-grained culling can remove for this camera. Whole frame: 852,843 of 1,851,592 beauty triangles (46%) are inside the frustum.

Top 20 objects by triangles:

| object | group | type | material | instances | calls | tris | inside frustum | frustumCulled |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| terrain | terrain | Mesh | MeshStandardMaterial | - | 1 | 264,548 | 44,956 tris (17%) | yes |
| roadStones | terrain | Mesh | MeshStandardMaterial | - | 1 | 222,328 | 42,453 tris (19%) | yes |
| fleet_steel | fleet | Mesh | fleet_steel | - | 1 | 45,824 | 0 tris (0%) | yes |
| fleet_rubber | fleet | Mesh | fleet_rubber | - | 1 | 44,224 | 0 tris (0%) | yes |
| fleet_trim | fleet | Mesh | fleet_trim | - | 1 | 41,888 | 0 tris (0%) | yes |
| grass_1 | forest | Mesh | MeshStandardMaterial | 1,865 | 1 | 37,300 | 252/1865 instances | no |
| body_trimGloss | vehicle | Mesh | trimGloss | - | 1 | 36,768 | 36,768 tris (100%) | yes |
| body_trim | vehicle | Mesh | trim | - | 1 | 32,592 | 32,592 tris (100%) | yes |
| body_steelDark | vehicle | Mesh | steelDark | - | 1 | 29,964 | 29,964 tris (100%) | yes |
| fleet_paint | fleet | Mesh | fleet_paint | - | 1 | 29,056 | 0 tris (0%) | yes |
| fleet_chrome | fleet | Mesh | fleet_chrome | - | 1 | 28,176 | 0 tris (0%) | yes |
| camp_timber | camp | Mesh | timber | - | 1 | 28,120 | 0 tris (0%) | yes |
| body_gap | vehicle | Mesh | gap | - | 1 | 28,096 | 28,096 tris (100%) | yes |
| tree_umbrella_trunk | forest | Mesh | MeshStandardMaterial | 41 | 1 | 26,076 | 3/41 instances | yes |
| cabin_gap | vehicle | Mesh | gap | - | 1 | 25,544 | 25,544 tris (100%) | yes |
| grass_2 | forest | Mesh | MeshStandardMaterial | 1,867 | 1 | 22,404 | 256/1867 instances | no |
| cabin_trimGloss | vehicle | Mesh | trimGloss | - | 1 | 22,184 | 22,184 tris (100%) | yes |
| grass_0 | forest | Mesh | MeshStandardMaterial | 1,839 | 1 | 22,068 | 247/1839 instances | no |
| grass_3 | forest | Mesh | MeshStandardMaterial | 1,816 | 1 | 21,792 | 237/1816 instances | no |
| camp_deadwood | camp | Mesh | deadwood | - | 1 | 21,294 | 4,729 tris (22%) | yes |

Beauty pass by object-name prefix (top 15; `body_`, `cabin_`, `gear_`, `tyre_` are the truck kits):

| group/prefix | objects | calls | tris | tris inside frustum |
| --- | --- | --- | --- | --- |
| terrain/terrain | 1 | 1 | 264,548 | 44,956 |
| fleet/fleet | 24 | 24 | 248,082 | 58,914 |
| terrain/roadStones | 1 | 1 | 222,328 | 42,453 |
| vehicle/body | 40 | 46 | 209,308 | 209,308 |
| forest/grass | 12 | 12 | 181,474 | 32,100 |
| vehicle/cabin | 27 | 27 | 146,676 | 146,676 |
| vehicle/tyre | 24 | 24 | 99,016 | 99,016 |
| forest/tree | 11 | 11 | 87,090 | 4,218 |
| camp/camp | 11 | 11 | 83,762 | 39,077 |
| vehicle/gear | 21 | 21 | 81,652 | 81,652 |
| forest/litter | 4 | 4 | 51,104 | 5,256 |
| forest/forb | 5 | 5 | 22,514 | 1,720 |
| forest/scrub | 8 | 8 | 19,196 | 622 |
| terrain/roadStoneShadows | 1 | 1 | 18,678 | 18,678 |
| camp/campWear | 1 | 1 | 16,400 | 16,400 |

Shadow pass, by name prefix (top 12) and top 10 casters:

| group/prefix | casters | shadow calls | shadow tris |
| --- | --- | --- | --- |
| fleet/fleet | 20 | 20 | 247,308 |
| vehicle/body | 21 | 21 | 197,820 |
| camp/camp | 31 | 31 | 145,334 |
| vehicle/tyre | 24 | 24 | 99,016 |
| forest/tree | 9 | 9 | 85,800 |
| vehicle/gear | 21 | 21 | 81,652 |
| forest/scrub | 8 | 8 | 19,196 |
| vehicle/axles | 5 | 5 | 15,568 |
| roadside/roadside | 10 | 10 | 11,426 |
| forest/log | 3 | 3 | 11,408 |
| forest/kopje | 3 | 3 | 10,260 |
| vehicle/brakes | 28 | 28 | 10,224 |

| caster | group | instances | calls | shadow tris |
| --- | --- | --- | --- | --- |
| fleet_steel | fleet | - | 1 | 45,824 |
| fleet_rubber | fleet | - | 1 | 44,224 |
| fleet_trim | fleet | - | 1 | 41,888 |
| body_trimGloss | vehicle | - | 1 | 36,768 |
| body_trim | vehicle | - | 1 | 32,592 |
| body_steelDark | vehicle | - | 1 | 29,964 |
| fleet_paint | fleet | - | 1 | 29,056 |
| fleet_chrome | fleet | - | 1 | 28,176 |
| camp_timber | camp | - | 1 | 28,120 |
| body_gap | vehicle | - | 1 | 28,096 |

Drawn while outside the frustum (`frustumCulled = false`):

| object | group | type | instances | calls | tris |
| --- | --- | --- | --- | --- | --- |
| fireEmbers | camp | Mesh | - | 1 | 60 |
| fireFlames | camp | Mesh | - | 1 | 48 |
| fireSmoke | camp | Mesh | - | 1 | 36 |

### forest

Camera at (-36.02, 6.51, -9.01) fov 46, truck at (-36.58, 2.66, 1.45). Beauty 1,510,768 tris in 252 calls (414,026 instanced in 63 calls, 1,096,742 regular); shadow pass 642,534 tris in 144 calls. 243 objects drawn, 3 of them outside the frustum (`frustumCulled = false`) costing 144 tris / 3 calls.

| group | beauty calls | beauty tris | of which instanced | tris inside frustum (measured) | objects | programs touched | shadow calls | shadow tris | G-buffer calls | G-buffer tris |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| terrain | 4 | 509,602 | 0 | 150,990 (30%) | 4 | 4 | 0 | 0 | 3 | 490,924 |
| forest | 70 | 416,906 | 414,026 | 140,836 (34%) | 67 | 6 | 31 | 146,968 | 23 | 104,244 |
| vehicle | 161 | 562,752 | 0 | 562,752 (100%) | 155 | 54 | 99 | 404,280 | 129 | 560,062 |
| camp | 4 | 16,544 | 0 | - | 4 | 4 | 9 | 84,884 | 0 | 0 |
| roadside | 2 | 2,868 | 0 | - | 2 | 1 | 5 | 6,402 | 2 | 2,868 |
| sky | 10 | 976 | 0 | - | 10 | 3 | 0 | 0 | 0 | 0 |
| dust | 1 | 1,120 | 0 | - | 1 | 1 | 0 | 0 | 0 | 0 |

"Tris inside frustum" is measured per triangle centroid for every regular mesh of 20k+ triangles and per instance bounding sphere for every InstancedMesh; smaller regular meshes are counted whole. It is the ceiling on what finer-grained culling can remove for this camera. Whole frame: 876,086 of 1,510,768 beauty triangles (58%) are inside the frustum.

Top 20 objects by triangles:

| object | group | type | material | instances | calls | tris | inside frustum | frustumCulled |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| terrain | terrain | Mesh | MeshStandardMaterial | - | 1 | 264,548 | 67,964 tris (26%) | yes |
| roadStones | terrain | Mesh | MeshStandardMaterial | - | 1 | 222,328 | 60,300 tris (27%) | yes |
| grass_1 | forest | Mesh | MeshStandardMaterial | 1,865 | 1 | 37,300 | 481/1865 instances | no |
| body_trimGloss | vehicle | Mesh | trimGloss | - | 1 | 36,768 | 36,768 tris (100%) | yes |
| body_trim | vehicle | Mesh | trim | - | 1 | 32,592 | 32,592 tris (100%) | yes |
| body_steelDark | vehicle | Mesh | steelDark | - | 1 | 29,964 | 29,964 tris (100%) | yes |
| body_gap | vehicle | Mesh | gap | - | 1 | 28,096 | 28,096 tris (100%) | yes |
| tree_umbrella_trunk | forest | Mesh | MeshStandardMaterial | 41 | 1 | 26,076 | 22/41 instances | yes |
| cabin_gap | vehicle | Mesh | gap | - | 1 | 25,544 | 25,544 tris (100%) | yes |
| grass_2 | forest | Mesh | MeshStandardMaterial | 1,867 | 1 | 22,404 | 464/1867 instances | no |
| cabin_trimGloss | vehicle | Mesh | trimGloss | - | 1 | 22,184 | 22,184 tris (100%) | yes |
| grass_0 | forest | Mesh | MeshStandardMaterial | 1,839 | 1 | 22,068 | 464/1839 instances | no |
| grass_3 | forest | Mesh | MeshStandardMaterial | 1,816 | 1 | 21,792 | 438/1816 instances | no |
| gear_steelDark | vehicle | Mesh | steelDark | - | 1 | 19,576 | sphere yes | yes |
| tree_umbrella_trunk | forest | Mesh | MeshStandardMaterial | 24 | 1 | 18,864 | 10/24 instances | yes |
| roadStoneShadows | terrain | Mesh | ShaderMaterial | - | 1 | 18,678 | sphere yes | yes |
| grass_4 | forest | Mesh | MeshStandardMaterial | 1,801 | 1 | 18,010 | 422/1801 instances | no |
| body_chrome | vehicle | Mesh | chrome | - | 1 | 17,672 | sphere yes | yes |
| campWear | camp | Mesh | campWear | - | 1 | 16,400 | sphere yes | yes |
| gear_trim | vehicle | Mesh | trim | - | 1 | 16,264 | sphere yes | yes |

Beauty pass by object-name prefix (top 15; `body_`, `cabin_`, `gear_`, `tyre_` are the truck kits):

| group/prefix | objects | calls | tris | tris inside frustum |
| --- | --- | --- | --- | --- |
| terrain/terrain | 1 | 1 | 264,548 | 67,964 |
| terrain/roadStones | 1 | 1 | 222,328 | 60,300 |
| vehicle/body | 40 | 46 | 209,308 | 209,308 |
| forest/grass | 12 | 12 | 181,474 | 45,708 |
| vehicle/cabin | 27 | 27 | 146,676 | 146,676 |
| vehicle/tyre | 24 | 24 | 99,016 | 99,016 |
| forest/tree | 10 | 10 | 90,460 | 43,996 |
| vehicle/gear | 21 | 21 | 81,652 | 81,652 |
| forest/litter | 4 | 4 | 51,104 | 15,608 |
| forest/forb | 5 | 5 | 22,514 | 7,158 |
| forest/scrub | 8 | 8 | 19,196 | 8,518 |
| terrain/roadStoneShadows | 1 | 1 | 18,678 | 18,678 |
| camp/campWear | 1 | 1 | 16,400 | 16,400 |
| vehicle/axles | 5 | 5 | 15,568 | 15,568 |
| forest/log | 3 | 3 | 11,408 | 5,952 |

Shadow pass, by name prefix (top 12) and top 10 casters:

| group/prefix | casters | shadow calls | shadow tris |
| --- | --- | --- | --- |
| vehicle/body | 21 | 21 | 197,820 |
| vehicle/tyre | 24 | 24 | 99,016 |
| forest/tree | 10 | 10 | 90,460 |
| camp/camp | 9 | 9 | 84,884 |
| vehicle/gear | 21 | 21 | 81,652 |
| forest/scrub | 8 | 8 | 19,196 |
| vehicle/axles | 5 | 5 | 15,568 |
| forest/log | 3 | 3 | 11,408 |
| forest/kopje | 3 | 3 | 10,260 |
| vehicle/brakes | 28 | 28 | 10,224 |
| forest/termite | 3 | 3 | 8,464 |
| forest/rock | 4 | 4 | 7,180 |

| caster | group | instances | calls | shadow tris |
| --- | --- | --- | --- | --- |
| body_trimGloss | vehicle | - | 1 | 36,768 |
| body_trim | vehicle | - | 1 | 32,592 |
| body_steelDark | vehicle | - | 1 | 29,964 |
| camp_timber | camp | - | 1 | 28,120 |
| body_gap | vehicle | - | 1 | 28,096 |
| tree_umbrella_trunk | forest | 41 | 1 | 26,076 |
| camp_deadwood | camp | - | 1 | 21,294 |
| gear_steelDark | vehicle | - | 1 | 19,576 |
| tree_umbrella_trunk | forest | 24 | 1 | 18,864 |
| body_chrome | vehicle | - | 1 | 17,672 |

Drawn while outside the frustum (`frustumCulled = false`):

| object | group | type | instances | calls | tris |
| --- | --- | --- | --- | --- | --- |
| fireEmbers | camp | Mesh | - | 1 | 60 |
| fireFlames | camp | Mesh | - | 1 | 48 |
| fireSmoke | camp | Mesh | - | 1 | 36 |

### camp

Camera at (-30.2, 5.85, 32.99) fov 50, truck at (-6.67, 3.64, 23.71). Beauty 1,926,998 tris in 439 calls (423,454 instanced in 69 calls, 1,503,544 regular); shadow pass 931,774 tris in 175 calls. 381 objects drawn, 0 of them outside the frustum (`frustumCulled = false`) costing 0 tris / 0 calls.

| group | beauty calls | beauty tris | of which instanced | tris inside frustum (measured) | objects | programs touched | shadow calls | shadow tris | G-buffer calls | G-buffer tris |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| terrain | 5 | 509,842 | 0 | 297,714 (58%) | 5 | 5 | 0 | 0 | 3 | 490,924 |
| forest | 74 | 419,230 | 416,350 | 150,724 (36%) | 71 | 6 | 31 | 146,968 | 25 | 105,444 |
| vehicle | 161 | 562,752 | 0 | 562,752 (100%) | 155 | 54 | 99 | 404,280 | 129 | 560,062 |
| camp | 47 | 170,394 | 7,104 | 169,890 (100%) | 47 | 17 | 24 | 130,508 | 43 | 153,850 |
| fleet | 127 | 251,250 | 0 | 251,250 (100%) | 78 | 28 | 16 | 243,616 | 27 | 249,434 |
| wildlife | 4 | 8 | 0 | - | 4 | 1 | 0 | 0 | 4 | 8 |
| roadside | 10 | 11,426 | 0 | - | 10 | 2 | 5 | 6,402 | 10 | 11,426 |
| sky | 10 | 976 | 0 | - | 10 | 3 | 0 | 0 | 0 | 0 |
| dust | 1 | 1,120 | 0 | - | 1 | 1 | 0 | 0 | 0 | 0 |

"Tris inside frustum" is measured per triangle centroid for every regular mesh of 20k+ triangles and per instance bounding sphere for every InstancedMesh; smaller regular meshes are counted whole. It is the ceiling on what finer-grained culling can remove for this camera. Whole frame: 1,445,860 of 1,926,998 beauty triangles (75%) are inside the frustum.

Top 20 objects by triangles:

| object | group | type | material | instances | calls | tris | inside frustum | frustumCulled |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| terrain | terrain | Mesh | MeshStandardMaterial | - | 1 | 264,548 | 142,351 tris (54%) | yes |
| roadStones | terrain | Mesh | MeshStandardMaterial | - | 1 | 222,328 | 132,397 tris (60%) | yes |
| fleet_steel | fleet | Mesh | fleet_steel | - | 1 | 45,824 | 45,824 tris (100%) | yes |
| fleet_rubber | fleet | Mesh | fleet_rubber | - | 1 | 44,224 | 44,224 tris (100%) | yes |
| fleet_trim | fleet | Mesh | fleet_trim | - | 1 | 41,888 | 41,888 tris (100%) | yes |
| grass_1 | forest | Mesh | MeshStandardMaterial | 1,865 | 1 | 37,300 | 884/1865 instances | no |
| body_trimGloss | vehicle | Mesh | trimGloss | - | 1 | 36,768 | 36,768 tris (100%) | yes |
| body_trim | vehicle | Mesh | trim | - | 1 | 32,592 | 32,592 tris (100%) | yes |
| body_steelDark | vehicle | Mesh | steelDark | - | 1 | 29,964 | 29,964 tris (100%) | yes |
| fleet_paint | fleet | Mesh | fleet_paint | - | 1 | 29,056 | 29,056 tris (100%) | yes |
| fleet_chrome | fleet | Mesh | fleet_chrome | - | 1 | 28,176 | 28,176 tris (100%) | yes |
| camp_timber | camp | Mesh | timber | - | 1 | 28,120 | 28,120 tris (100%) | yes |
| body_gap | vehicle | Mesh | gap | - | 1 | 28,096 | 28,096 tris (100%) | yes |
| tree_umbrella_trunk | forest | Mesh | MeshStandardMaterial | 41 | 1 | 26,076 | 12/41 instances | yes |
| cabin_gap | vehicle | Mesh | gap | - | 1 | 25,544 | 25,544 tris (100%) | yes |
| grass_2 | forest | Mesh | MeshStandardMaterial | 1,867 | 1 | 22,404 | 901/1867 instances | no |
| cabin_trimGloss | vehicle | Mesh | trimGloss | - | 1 | 22,184 | 22,184 tris (100%) | yes |
| grass_0 | forest | Mesh | MeshStandardMaterial | 1,839 | 1 | 22,068 | 862/1839 instances | no |
| grass_3 | forest | Mesh | MeshStandardMaterial | 1,816 | 1 | 21,792 | 836/1816 instances | no |
| camp_deadwood | camp | Mesh | deadwood | - | 1 | 21,294 | 21,294 tris (100%) | yes |

Beauty pass by object-name prefix (top 15; `body_`, `cabin_`, `gear_`, `tyre_` are the truck kits):

| group/prefix | objects | calls | tris | tris inside frustum |
| --- | --- | --- | --- | --- |
| terrain/terrain | 1 | 1 | 264,548 | 142,351 |
| fleet/fleet | 29 | 29 | 250,786 | 250,786 |
| terrain/roadStones | 1 | 1 | 222,328 | 132,397 |
| vehicle/body | 40 | 46 | 209,308 | 209,308 |
| forest/grass | 12 | 12 | 181,474 | 86,514 |
| vehicle/cabin | 27 | 27 | 146,676 | 146,676 |
| camp/camp | 40 | 40 | 146,602 | 146,602 |
| vehicle/tyre | 24 | 24 | 99,016 | 99,016 |
| forest/tree | 14 | 14 | 92,784 | 19,410 |
| vehicle/gear | 21 | 21 | 81,652 | 81,652 |
| forest/litter | 4 | 4 | 51,104 | 17,904 |
| forest/forb | 5 | 5 | 22,514 | 7,428 |
| forest/scrub | 8 | 8 | 19,196 | 2,302 |
| terrain/roadStoneShadows | 1 | 1 | 18,678 | 18,678 |
| camp/campWear | 1 | 1 | 16,400 | 16,400 |

Shadow pass, by name prefix (top 12) and top 10 casters:

| group/prefix | casters | shadow calls | shadow tris |
| --- | --- | --- | --- |
| fleet/fleet | 16 | 16 | 243,616 |
| vehicle/body | 21 | 21 | 197,820 |
| camp/camp | 24 | 24 | 130,508 |
| vehicle/tyre | 24 | 24 | 99,016 |
| forest/tree | 10 | 10 | 90,460 |
| vehicle/gear | 21 | 21 | 81,652 |
| forest/scrub | 8 | 8 | 19,196 |
| vehicle/axles | 5 | 5 | 15,568 |
| forest/log | 3 | 3 | 11,408 |
| forest/kopje | 3 | 3 | 10,260 |
| vehicle/brakes | 28 | 28 | 10,224 |
| forest/termite | 3 | 3 | 8,464 |

| caster | group | instances | calls | shadow tris |
| --- | --- | --- | --- | --- |
| fleet_steel | fleet | - | 1 | 45,824 |
| fleet_rubber | fleet | - | 1 | 44,224 |
| fleet_trim | fleet | - | 1 | 41,888 |
| body_trimGloss | vehicle | - | 1 | 36,768 |
| body_trim | vehicle | - | 1 | 32,592 |
| body_steelDark | vehicle | - | 1 | 29,964 |
| fleet_paint | fleet | - | 1 | 29,056 |
| fleet_chrome | fleet | - | 1 | 28,176 |
| camp_timber | camp | - | 1 | 28,120 |
| body_gap | vehicle | - | 1 | 28,096 |

### lions

Camera at (103.82, 2.77, -27.19) fov 50, truck at (104.03, 1.15, -26.87). Beauty 1,383,470 tris in 164 calls (398,634 instanced in 59 calls, 984,836 regular); shadow pass 547,966 tris in 132 calls. 157 objects drawn, 4 of them outside the frustum (`frustumCulled = false`) costing 144 tris / 4 calls.

| group | beauty calls | beauty tris | of which instanced | tris inside frustum (measured) | objects | programs touched | shadow calls | shadow tris | G-buffer calls | G-buffer tris |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| terrain | 5 | 509,842 | 0 | 43,264 (8%) | 5 | 5 | 0 | 0 | 3 | 490,924 |
| forest | 66 | 401,514 | 398,634 | 26,874 (7%) | 63 | 6 | 27 | 135,764 | 20 | 90,386 |
| vehicle | 72 | 458,410 | 0 | 306,075 (67%) | 68 | 42 | 99 | 404,280 | 62 | 458,390 |
| camp | 3 | 144 | 0 | - | 3 | 3 | 0 | 0 | 0 | 0 |
| wildlife | 10 | 5,078 | 0 | - | 10 | 4 | 0 | 0 | 10 | 5,078 |
| roadside | 5 | 6,402 | 0 | - | 5 | 2 | 6 | 7,922 | 5 | 6,402 |
| sky | 2 | 960 | 0 | - | 2 | 2 | 0 | 0 | 0 | 0 |
| dust | 1 | 1,120 | 0 | - | 1 | 1 | 0 | 0 | 0 | 0 |

"Tris inside frustum" is measured per triangle centroid for every regular mesh of 20k+ triangles and per instance bounding sphere for every InstancedMesh; smaller regular meshes are counted whole. It is the ceiling on what finer-grained culling can remove for this camera. Whole frame: 389,917 of 1,383,470 beauty triangles (28%) are inside the frustum.

Top 20 objects by triangles:

| object | group | type | material | instances | calls | tris | inside frustum | frustumCulled |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| terrain | terrain | Mesh | MeshStandardMaterial | - | 1 | 264,548 | 12,275 tris (5%) | yes |
| roadStones | terrain | Mesh | MeshStandardMaterial | - | 1 | 222,328 | 8,023 tris (4%) | yes |
| grass_1 | forest | Mesh | MeshStandardMaterial | 1,865 | 1 | 37,300 | 63/1865 instances | no |
| body_trimGloss | vehicle | Mesh | trimGloss | - | 1 | 36,768 | 2,141 tris (6%) | yes |
| body_trim | vehicle | Mesh | trim | - | 1 | 32,592 | 4,075 tris (13%) | yes |
| body_steelDark | vehicle | Mesh | steelDark | - | 1 | 29,964 | 1,453 tris (5%) | yes |
| body_gap | vehicle | Mesh | gap | - | 1 | 28,096 | 2,522 tris (9%) | yes |
| tree_umbrella_trunk | forest | Mesh | MeshStandardMaterial | 41 | 1 | 26,076 | 2/41 instances | yes |
| cabin_gap | vehicle | Mesh | gap | - | 1 | 25,544 | 6,652 tris (26%) | yes |
| grass_2 | forest | Mesh | MeshStandardMaterial | 1,867 | 1 | 22,404 | 55/1867 instances | no |
| cabin_trimGloss | vehicle | Mesh | trimGloss | - | 1 | 22,184 | 5,970 tris (27%) | yes |
| grass_0 | forest | Mesh | MeshStandardMaterial | 1,839 | 1 | 22,068 | 64/1839 instances | no |
| grass_3 | forest | Mesh | MeshStandardMaterial | 1,816 | 1 | 21,792 | 49/1816 instances | no |
| gear_steelDark | vehicle | Mesh | steelDark | - | 1 | 19,576 | sphere yes | yes |
| tree_umbrella_trunk | forest | Mesh | MeshStandardMaterial | 24 | 1 | 18,864 | 0/24 instances | yes |
| roadStoneShadows | terrain | Mesh | ShaderMaterial | - | 1 | 18,678 | sphere yes | yes |
| grass_4 | forest | Mesh | MeshStandardMaterial | 1,801 | 1 | 18,010 | 45/1801 instances | no |
| body_chrome | vehicle | Mesh | chrome | - | 1 | 17,672 | sphere yes | yes |
| gear_trim | vehicle | Mesh | trim | - | 1 | 16,264 | sphere yes | yes |
| grass_7 | forest | Mesh | MeshStandardMaterial | 1,011 | 1 | 16,176 | 97/1011 instances | no |

Beauty pass by object-name prefix (top 15; `body_`, `cabin_`, `gear_`, `tyre_` are the truck kits):

| group/prefix | objects | calls | tris | tris inside frustum |
| --- | --- | --- | --- | --- |
| terrain/terrain | 1 | 1 | 264,548 | 12,275 |
| terrain/roadStones | 1 | 1 | 222,328 | 8,023 |
| vehicle/body | 26 | 30 | 205,314 | 88,085 |
| forest/grass | 12 | 12 | 181,474 | 12,410 |
| vehicle/cabin | 21 | 21 | 144,088 | 108,982 |
| forest/tree | 7 | 7 | 76,540 | 3,242 |
| vehicle/gear | 13 | 13 | 74,964 | 74,964 |
| forest/litter | 4 | 4 | 51,104 | 2,304 |
| forest/forb | 5 | 5 | 22,514 | 632 |
| forest/scrub | 8 | 8 | 19,196 | 298 |
| terrain/roadStoneShadows | 1 | 1 | 18,678 | 18,678 |
| vehicle/tyre | 3 | 3 | 18,476 | 18,476 |
| vehicle/axles | 5 | 5 | 15,568 | 15,568 |
| forest/log | 3 | 3 | 11,408 | 0 |
| forest/swath | 5 | 5 | 11,176 | 1,272 |

Shadow pass, by name prefix (top 12) and top 10 casters:

| group/prefix | casters | shadow calls | shadow tris |
| --- | --- | --- | --- |
| vehicle/body | 21 | 21 | 197,820 |
| vehicle/tyre | 24 | 24 | 99,016 |
| vehicle/gear | 21 | 21 | 81,652 |
| forest/tree | 7 | 7 | 80,728 |
| forest/scrub | 8 | 8 | 19,196 |
| vehicle/axles | 5 | 5 | 15,568 |
| forest/log | 3 | 3 | 11,408 |
| forest/kopje | 3 | 3 | 10,260 |
| vehicle/brakes | 28 | 28 | 10,224 |
| roadside/roadside | 6 | 6 | 7,922 |
| forest/rock | 4 | 4 | 7,180 |
| forest/termite | 2 | 2 | 6,992 |

| caster | group | instances | calls | shadow tris |
| --- | --- | --- | --- | --- |
| body_trimGloss | vehicle | - | 1 | 36,768 |
| body_trim | vehicle | - | 1 | 32,592 |
| body_steelDark | vehicle | - | 1 | 29,964 |
| body_gap | vehicle | - | 1 | 28,096 |
| tree_umbrella_trunk | forest | 41 | 1 | 26,076 |
| gear_steelDark | vehicle | - | 1 | 19,576 |
| tree_umbrella_trunk | forest | 24 | 1 | 18,864 |
| body_chrome | vehicle | - | 1 | 17,672 |
| gear_trim | vehicle | - | 1 | 16,264 |
| body_paint | vehicle | - | 1 | 13,972 |

Drawn while outside the frustum (`frustumCulled = false`):

| object | group | type | instances | calls | tris |
| --- | --- | --- | --- | --- | --- |
| fireEmbers | camp | Mesh | - | 1 | 60 |
| fireFlames | camp | Mesh | - | 1 | 48 |
| fireSmoke | camp | Mesh | - | 1 | 36 |
| Points#737 | sky | Points | - | 1 | 0 |

## 3. Textures

267 texture objects reachable from scene materials, post passes, the sky rig and the shadow map (266 distinct image sources; 267 have a GL texture). `renderer.info.memory.textures` says 296; the difference is textures the renderer owns that nothing in the scene graph points to any more (composer swap buffers' depth attachments, PMREM scratch, textures created and dropped during boot). Estimated GPU memory 268.24 MB (0 compressed). 1 texture(s) are 2048 on a side: (unnamed) 2048x2048 21.33 MB (forest:MeshStandardMaterial.map [tree_umbrella_foliage, tree_flat_foliage +2]); 0 exceed 2048. Canvas-backed textures also keep their canvas alive on the CPU: 32.86 MB of RGBA bitmaps; the DataTextures keep their typed arrays (counted in the JS heap).

| group | textures | sources | est. GPU MB | CPU canvas MB | sizes |
| --- | --- | --- | --- | --- | --- |
| forest | 44 | 44 | 73.5 | 0 | 16x 256x512, 12x 256x256, 5x 1024x1024, 5x 512x512, 3x 1024x256, 2x 128x128, 1x 2048x2048 |
| vehicle | 95 | 95 | 56.76 | 13.88 | 51x 256x256, 16x 128x128, 13x 512x512, 4x 64x64, 3x 1024x1024, 3x 512x320, 2x 512x256, 1x 512x288, 1x 512x128, 1x 256x72 |
| camp | 69 | 68 | 31.32 | 8.08 | 45x 256x256, 6x 128x128, 5x 64x64, 4x 512x512, 3x 512x256, 1x 1200x984, 1x 512x384, 1x 512x192, 1x 512x160, 1x 256x192, 1x 256x160 |
| post:gtao | 6 | 6 | 24.63 | 0 | 4x 1280x720, 1x 64x64, 1x 5x5 |
| post:smaa | 4 | 4 | 14.41 | 0 | 2x 1280x720, 1x 160x560, 1x 66x33 |
| post:bloom | 12 | 12 | 13.47 | 0 | 3x 640x360, 2x 320x180, 2x 160x90, 2x 80x45, 2x 40x23, 1x 1280x720 |
| fleet | 14 | 14 | 13.42 | 4.31 | 8x 256x256, 4x 512x512, 1x 1024x1024, 1x 128x128 |
| sky | 3 | 3 | 12.02 | 0.02 | 2x 768x1024, 1x 64x64 |
| shadow | 2 | 2 | 8 | 0 | 2x 1024x1024 |
| post:sanitize | 1 | 1 | 7.03 | 0 | 1x 1280x720 |
| roadside | 4 | 4 | 6.08 | 4.56 | 2x 256x256, 1x 1024x1024, 1x 128x128 |
| wildlife | 7 | 7 | 3.83 | 2 | 3x 256x256, 2x 512x512, 2x 128x128 |
| terrain | 5 | 5 | 3.52 | 0 | 2x 512x512, 2x 256x256, 1x 512x96 |
| dust | 1 | 1 | 0.25 | 0 | 1x 256x256 |

Top 20 by estimated memory:

| name | class | image | size | format | mips | est. MB | owner (first) | owners |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| (unnamed) | DataTexture | Uint8Array data | 2048x2048 | RGBA/u8 | yes | 21.33 | forest:MeshStandardMaterial.map [tree_umbrella_foliage, tree_flat_foliage +2] | 1 |
| EffectComposer.rt2 | RenderTargetTexture | render target | 1280x720 | RGBA/f16 | no | 7.03 | post:sanitize:uniforms.tDiffuse.value | 5 |
| (unnamed) | RenderTargetTexture | render target | 1280x720 | RGBA/f16 | no | 7.03 | post:gtao:gtaoRenderTarget.texture | 3 |
| (unnamed) | RenderTargetTexture | render target | 1280x720 | RGBA/f16 | no | 7.03 | post:gtao:pdRenderTarget.texture | 3 |
| (unnamed) | RenderTargetTexture | render target | 1280x720 | RGBA/f16 | no | 7.03 | post:gtao:normalRenderTarget.texture | 5 |
| EffectComposer.rt1 | RenderTargetTexture | render target | 1280x720 | RGBA/f16 | no | 7.03 | post:bloom:highPassUniforms.tDiffuse.value | 8 |
| SMAAPass.edges | RenderTargetTexture | render target | 1280x720 | RGBA/f16 | no | 7.03 | post:smaa:_edgesRT.texture | 4 |
| SMAAPass.weights | RenderTargetTexture | render target | 1280x720 | RGBA/f16 | no | 7.03 | post:smaa:_weightsRT.texture | 4 |
| (unnamed) | CanvasTexture | HTMLCanvasElement | 1200x984 | RGBA/u8 | yes | 6.01 | camp:campWear.map [campWear] | 1 |
| PMREM.cubeUv | RenderTargetTexture | render target | 768x1024 | RGBA/f16 | no | 6 | sky:pmrem._pingPongRenderTarget.texture | 3 |
| PMREM.cubeUv | RenderTargetTexture | render target | 768x1024 | RGBA/f16 | no | 6 | sky:envTarget.texture | 181 |
| (unnamed) | DataTexture | Uint8Array data | 1024x1024 | RGBA/u8 | yes | 5.33 | forest:MeshStandardMaterial.map [treeFar_0, treeFar_1 +1] | 1 |
| (unnamed) | DataTexture | Uint8Array data | 1024x1024 | RGBA/u8 | yes | 5.33 | forest:MeshStandardMaterial.map [grass_0, grass_1 +10] | 1 |
| (unnamed) | DataTexture | Uint8Array data | 1024x1024 | RGBA/u8 | yes | 5.33 | forest:MeshStandardMaterial.map [scrub_0, scrub_1 +6] | 1 |
| (unnamed) | DataTexture | Uint8Array data | 1024x1024 | RGBA/u8 | yes | 5.33 | forest:MeshStandardMaterial.map [forb_0, forb_1 +3] | 1 |
| (unnamed) | DataTexture | Uint8Array data | 1024x1024 | RGBA/u8 | yes | 5.33 | forest:MeshStandardMaterial.map [swath_0, swath_1 +3] | 1 |
| (unnamed) | CanvasTexture | HTMLCanvasElement | 1024x1024 | RGBA/u8 | yes | 5.33 | vehicle:cabinPanel.map [gear_cabinPanel, cabin_cabinPanel] | 1 |
| (unnamed) | CanvasTexture | HTMLCanvasElement | 1024x1024 | RGBA/u8 | yes | 5.33 | vehicle:cabinPanel.emissiveMap [gear_cabinPanel, cabin_cabinPanel] | 1 |
| (unnamed) | CanvasTexture | HTMLCanvasElement | 1024x1024 | RGBA/u8 | yes | 5.33 | vehicle:cabinPanel.roughnessMap [gear_cabinPanel, cabin_cabinPanel] | 1 |
| (unnamed) | CanvasTexture | HTMLCanvasElement | 1024x1024 | RGBA/u8 | yes | 5.33 | fleet:fleet_decal.map [fleet_decal] | 1 |

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

Every texture:

| name | class | image | size | format | mips | est. MB | GL | owners |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| (unnamed) | DataTexture | Uint8Array data | 2048x2048 | RGBA/u8 | y | 21.33 | y | forest:MeshStandardMaterial.map [tree_umbrella_foliage, tree_flat_foliage +2] |
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
| (unnamed) | DataTexture | Uint8Array data | 1024x1024 | RGBA/u8 | y | 5.33 | y | forest:MeshStandardMaterial.map [treeFar_0, treeFar_1 +1] |
| (unnamed) | DataTexture | Uint8Array data | 1024x1024 | RGBA/u8 | y | 5.33 | y | forest:MeshStandardMaterial.map [grass_0, grass_1 +10] |
| (unnamed) | DataTexture | Uint8Array data | 1024x1024 | RGBA/u8 | y | 5.33 | y | forest:MeshStandardMaterial.map [scrub_0, scrub_1 +6] |
| (unnamed) | DataTexture | Uint8Array data | 1024x1024 | RGBA/u8 | y | 5.33 | y | forest:MeshStandardMaterial.map [forb_0, forb_1 +3] |
| (unnamed) | DataTexture | Uint8Array data | 1024x1024 | RGBA/u8 | y | 5.33 | y | forest:MeshStandardMaterial.map [swath_0, swath_1 +3] |
| (unnamed) | CanvasTexture | HTMLCanvasElement | 1024x1024 | RGBA/u8 | y | 5.33 | y | vehicle:cabinPanel.map [gear_cabinPanel, cabin_cabinPanel] |
| (unnamed) | CanvasTexture | HTMLCanvasElement | 1024x1024 | RGBA/u8 | y | 5.33 | y | vehicle:cabinPanel.emissiveMap [gear_cabinPanel, cabin_cabinPanel] |
| (unnamed) | CanvasTexture | HTMLCanvasElement | 1024x1024 | RGBA/u8 | y | 5.33 | y | vehicle:cabinPanel.roughnessMap [gear_cabinPanel, cabin_cabinPanel] |
| (unnamed) | CanvasTexture | HTMLCanvasElement | 1024x1024 | RGBA/u8 | y | 5.33 | y | fleet:fleet_decal.map [fleet_decal] |
| (unnamed) | CanvasTexture | HTMLCanvasElement | 1024x1024 | RGBA/u8 | y | 5.33 | y | roadside:MeshStandardMaterial.map [roadside_sign] |
| (unnamed) | RenderTargetTexture | render target | 1024x1024 | RGBA/u8 | n | 4 | y | shadow:DirectionalLight |
| .shadowMap | DepthTexture | Object | 1024x1024 | Depth/u32 | n | 4 | y | shadow:DirectionalLight |
| (unnamed) | DepthTexture | Object | 1280x720 | DepthStencil/u24_8 | n | 3.52 | y | post:gtao:depthTexture; post:gtao:normalRenderTarget.depthTexture; post:gtao:gtaoMaterial.u.tDepth |
| UnrealBloomPass.h0 | RenderTargetTexture | render target | 640x360 | RGBA/f16 | n | 1.76 | y | post:bloom:renderTargetsHorizontal[0].texture; post:bloom:renderTargetsHorizontal[0].textures[0]; post:bloom:copyUniforms.tDiffuse.value |
| UnrealBloomPass.v0 | RenderTargetTexture | render target | 640x360 | RGBA/f16 | n | 1.76 | y | post:bloom:renderTargetsVertical[0].texture; post:bloom:renderTargetsVertical[0].textures[0]; post:bloom:compositeMaterial.u.blurTexture1 |
| UnrealBloomPass.bright | RenderTargetTexture | render target | 640x360 | RGBA/f16 | n | 1.76 | y | post:bloom:renderTargetBright.texture; post:bloom:renderTargetBright.textures[0] |
| (unnamed) | DataTexture | Uint8Array data | 512x512 | RGBA/u8 | y | 1.33 | y | terrain:MeshStandardMaterial.map [terrain] |
| (unnamed) | DataTexture | Uint8Array data | 512x512 | RGBA/u8 | y | 1.33 | y | terrain:MeshStandardMaterial.normalMap [terrain] |
| (unnamed) | DataTexture | Uint8Array data | 512x512 | RGBA/u8 | y | 1.33 | y | forest:MeshStandardMaterial.map [litter_0, litter_1 +2] |
| (unnamed) | DataTexture | Uint8Array data | 512x512 | RGBA/u8 | y | 1.33 | y | forest:MeshStandardMaterial.map [log_1, log_2] |
| (unnamed) | DataTexture | Uint8Array data | 512x512 | RGBA/u8 | y | 1.33 | y | forest:MeshStandardMaterial.aoMap [log_1, log_2] |
| (unnamed) | DataTexture | Uint8Array data | 512x512 | RGBA/u8 | y | 1.33 | y | forest:MeshStandardMaterial.normalMap [log_1, log_2] |
| (unnamed) | DataTexture | Uint8Array data | 512x512 | RGBA/u8 | y | 1.33 | y | forest:MeshStandardMaterial.roughnessMap [log_1, log_2] |
| (unnamed) | DataTexture | Uint8Array data | 1024x256 | RGBA/u8 | y | 1.33 | y | forest:MeshBasicMaterial.map [treeline_0] |
| (unnamed) | DataTexture | Uint8Array data | 1024x256 | RGBA/u8 | y | 1.33 | y | forest:MeshBasicMaterial.map [treeline_1] |
| (unnamed) | DataTexture | Uint8Array data | 1024x256 | RGBA/u8 | y | 1.33 | y | forest:MeshBasicMaterial.map [treeline_2] |
| (unnamed) | DataTexture | Uint8Array data | 512x512 | RGBA/u8 | y | 1.33 | y | vehicle:steelDark.map [body_steelDark, gear_steelDark +1] |
| (unnamed) | DataTexture | Uint8Array data | 512x512 | RGBA/u8 | y | 1.33 | y | vehicle:steelDark.normalMap [body_steelDark, gear_steelDark +1]; fleet:fleet_steel.normalMap [fleet_steel]; fleet:fleet_whip.normalMap [fleet_whip] |
| (unnamed) | DataTexture | Uint8Array data | 512x512 | RGBA/u8 | y | 1.33 | y | vehicle:steelDark.roughnessMap [body_steelDark, gear_steelDark +1]; fleet:fleet_steel.roughnessMap [fleet_steel]; fleet:fleet_whip.roughnessMap [fleet_whip] |
| (unnamed) | DataTexture | Uint8Array data | 512x512 | RGBA/u8 | y | 1.33 | y | vehicle:steel.map [body_steel, gear_steel] |
| (unnamed) | DataTexture | Uint8Array data | 512x512 | RGBA/u8 | y | 1.33 | y | vehicle:steel.metalnessMap [body_steel, gear_steel] |
| (unnamed) | DataTexture | Uint8Array data | 512x512 | RGBA/u8 | y | 1.33 | y | vehicle:steel.normalMap [body_steel, gear_steel]; vehicle:chrome.normalMap [body_chrome, gear_chrome +1]; vehicle:mirrorGlass.normalMap [body_mirrorGlass] |
| (unnamed) | DataTexture | Uint8Array data | 512x512 | RGBA/u8 | y | 1.33 | y | vehicle:steel.roughnessMap [body_steel, gear_steel]; fleet:fleet_rust.roughnessMap [fleet_rust] |
| (unnamed) | DataTexture | Uint8Array data | 512x512 | RGBA/u8 | y | 1.33 | y | vehicle:paint.map [body_paint]; vehicle:paintRoof.map [body_paintRoof] |
| (unnamed) | DataTexture | Uint8Array data | 512x512 | RGBA/u8 | y | 1.33 | y | vehicle:paint.roughnessMap [body_paint]; vehicle:paintDark.roughnessMap [body_paintDark]; vehicle:paintAccent.roughnessMap [body_paintAccent, gear_paintAccent] |
| (unnamed) | DataTexture | Uint8Array data | 512x512 | RGBA/u8 | y | 1.33 | y | vehicle:paintDark.map [body_paintDark] |
| (unnamed) | DataTexture | Uint8Array data | 512x512 | RGBA/u8 | y | 1.33 | y | vehicle:paintAccent.map [body_paintAccent, gear_paintAccent] |
| (unnamed) | DataTexture | Uint8Array data | 512x512 | RGBA/u8 | y | 1.33 | y | vehicle:glass.map [body_glass_0]; vehicle:glassDark.map [body_glassDark_0]; vehicle:glassSide.map [body_glassSide_0, body_glassSide_1 +2] |
| (unnamed) | DataTexture | Uint8Array data | 512x512 | RGBA/u8 | y | 1.33 | y | vehicle:glass.roughnessMap [body_glass_0]; fleet:fleet_glassDusty.roughnessMap [supply-truck_0_glassDusty_0, supply-truck_0_glassDusty_1 +9]; fleet:fleet_glass.roughnessMap [expedition-truck_0_glass_0, expedition-truck_0_glass_1 +19] |
| (unnamed) | DataTexture | Uint8Array data | 512x512 | RGBA/u8 | y | 1.33 | y | camp:steel.map [camp_steel] |
| (unnamed) | DataTexture | Uint8Array data | 512x512 | RGBA/u8 | y | 1.33 | y | camp:steel.metalnessMap [camp_steel] |
| (unnamed) | DataTexture | Uint8Array data | 512x512 | RGBA/u8 | y | 1.33 | y | camp:steel.normalMap [camp_steel] |
| (unnamed) | DataTexture | Uint8Array data | 512x512 | RGBA/u8 | y | 1.33 | y | camp:steel.roughnessMap [camp_steel] |
| (unnamed) | DataTexture | Uint8Array data | 512x512 | RGBA/u8 | y | 1.33 | y | fleet:fleet_glassDusty.emissiveMap [supply-truck_0_glassDusty_0, supply-truck_0_glassDusty_1 +9]; fleet:fleet_glass.emissiveMap [expedition-truck_0_glass_0, expedition-truck_0_glass_1 +19]; fleet:fleet_glassDark.emissiveMap [expedition-truck_0_glassDark_4, expedition-truck_0_glassDark_5 +11] |
| (unnamed) | DataTexture | Uint8Array data | 512x512 | RGBA/u8 | y | 1.33 | y | fleet:fleet_paint.map [fleet_paint]; fleet:fleet_paintOld.map [fleet_paintOld] |
| (unnamed) | DataTexture | Uint8Array data | 512x512 | RGBA/u8 | y | 1.33 | y | fleet:fleet_steel.map [fleet_steel]; fleet:fleet_whip.map [fleet_whip] |
| (unnamed) | DataTexture | Uint8Array data | 512x512 | RGBA/u8 | y | 1.33 | y | fleet:fleet_rust.map [fleet_rust] |
| (unnamed) | CanvasTexture | HTMLCanvasElement | 512x512 | RGBA/u8 | y | 1.33 | y | wildlife:lion-coat.map [lion-body-0, lion-body-1 +1] |
| (unnamed) | CanvasTexture | HTMLCanvasElement | 512x512 | RGBA/u8 | y | 1.33 | y | wildlife:lion-coat-cub.map [lion-body-0, lion-body-1 +1] |
| (unnamed) | CanvasTexture | HTMLCanvasElement | 512x384 | RGBA/u8 | y | 1 | y | camp:mapBoard.map [camp_mapBoard] |
| (unnamed) | DataTexture | Uint8Array data | 512x320 | RGBA/u8 | y | 0.83 | y | vehicle:tyreCarcass.map [tyre_carcass] |
| (unnamed) | DataTexture | Uint8Array data | 512x320 | RGBA/u8 | y | 0.83 | y | vehicle:tyreCarcass.normalMap [tyre_carcass] |
| (unnamed) | DataTexture | Uint8Array data | 512x320 | RGBA/u8 | y | 0.83 | y | vehicle:tyreCarcass.roughnessMap [tyre_carcass] |
| (unnamed) | CanvasTexture | HTMLCanvasElement | 512x288 | RGBA/u8 | y | 0.75 | y | vehicle:MeshBasicMaterial.map [cabin_screenFilm] |
| (unnamed) | DataTexture | Uint8Array data | 256x512 | RGBA/u8 | y | 0.67 | y | forest:MeshStandardMaterial.map [tree_umbrella_trunk, tree_flat_trunk] |
| (unnamed) | DataTexture | Uint8Array data | 256x512 | RGBA/u8 | y | 0.67 | y | forest:MeshStandardMaterial.aoMap [tree_umbrella_trunk, tree_flat_trunk] |
| (unnamed) | DataTexture | Uint8Array data | 256x512 | RGBA/u8 | y | 0.67 | y | forest:MeshStandardMaterial.normalMap [tree_umbrella_trunk, tree_flat_trunk] |
| (unnamed) | DataTexture | Uint8Array data | 256x512 | RGBA/u8 | y | 0.67 | y | forest:MeshStandardMaterial.roughnessMap [tree_umbrella_trunk, tree_flat_trunk] |
| (unnamed) | DataTexture | Uint8Array data | 256x512 | RGBA/u8 | y | 0.67 | y | forest:MeshStandardMaterial.map [tree_round_trunk] |
| (unnamed) | DataTexture | Uint8Array data | 256x512 | RGBA/u8 | y | 0.67 | y | forest:MeshStandardMaterial.aoMap [tree_round_trunk] |
| (unnamed) | DataTexture | Uint8Array data | 256x512 | RGBA/u8 | y | 0.67 | y | forest:MeshStandardMaterial.normalMap [tree_round_trunk] |
| (unnamed) | DataTexture | Uint8Array data | 256x512 | RGBA/u8 | y | 0.67 | y | forest:MeshStandardMaterial.roughnessMap [tree_round_trunk] |
| (unnamed) | DataTexture | Uint8Array data | 256x512 | RGBA/u8 | y | 0.67 | y | forest:MeshStandardMaterial.map [tree_thorn_trunk] |
| (unnamed) | DataTexture | Uint8Array data | 256x512 | RGBA/u8 | y | 0.67 | y | forest:MeshStandardMaterial.aoMap [tree_thorn_trunk] |
| (unnamed) | DataTexture | Uint8Array data | 256x512 | RGBA/u8 | y | 0.67 | y | forest:MeshStandardMaterial.normalMap [tree_thorn_trunk] |
| (unnamed) | DataTexture | Uint8Array data | 256x512 | RGBA/u8 | y | 0.67 | y | forest:MeshStandardMaterial.roughnessMap [tree_thorn_trunk] |
| (unnamed) | DataTexture | Uint8Array data | 256x512 | RGBA/u8 | y | 0.67 | y | forest:MeshStandardMaterial.map [tree_dead_trunk, log_0]; camp:deadwood.map [camp_deadwood] |
| (unnamed) | DataTexture | Uint8Array data | 256x512 | RGBA/u8 | y | 0.67 | y | forest:MeshStandardMaterial.aoMap [tree_dead_trunk, log_0]; camp:deadwood.aoMap [camp_deadwood] |
| (unnamed) | DataTexture | Uint8Array data | 256x512 | RGBA/u8 | y | 0.67 | y | forest:MeshStandardMaterial.normalMap [tree_dead_trunk, log_0]; camp:deadwood.normalMap [camp_deadwood] |
| (unnamed) | DataTexture | Uint8Array data | 256x512 | RGBA/u8 | y | 0.67 | y | forest:MeshStandardMaterial.roughnessMap [tree_dead_trunk, log_0]; camp:deadwood.roughnessMap [camp_deadwood] |
| (unnamed) | CanvasTexture | HTMLCanvasElement | 512x256 | RGBA/u8 | y | 0.67 | y | vehicle:decalNumber.map [body_decalNumber] |
| (unnamed) | CanvasTexture | HTMLCanvasElement | 512x256 | RGBA/u8 | y | 0.67 | y | vehicle:decalBadge.map [body_decalBadge, gear_decalBadge] |
| (unnamed) | CanvasTexture | HTMLCanvasElement | 512x256 | RGBA/u8 | y | 0.67 | y | camp:signFuel.map [camp_signFuel] |
| (unnamed) | CanvasTexture | HTMLCanvasElement | 512x256 | RGBA/u8 | y | 0.67 | y | camp:signGate.map [camp_signGate] |
| (unnamed) | CanvasTexture | HTMLCanvasElement | 512x256 | RGBA/u8 | y | 0.67 | y | camp:signSpeed.map [camp_signSpeed] |
| (unnamed) | CanvasTexture | HTMLCanvasElement | 512x192 | RGBA/u8 | y | 0.5 | y | camp:signLatrine.map [camp_signLatrine] |
| UnrealBloomPass.h1 | RenderTargetTexture | render target | 320x180 | RGBA/f16 | n | 0.44 | y | post:bloom:renderTargetsHorizontal[1].texture; post:bloom:renderTargetsHorizontal[1].textures[0]; post:bloom:separableBlurMaterials[1].u.colorTexture |
| UnrealBloomPass.v1 | RenderTargetTexture | render target | 320x180 | RGBA/f16 | n | 0.44 | y | post:bloom:renderTargetsVertical[1].texture; post:bloom:renderTargetsVertical[1].textures[0]; post:bloom:compositeMaterial.u.blurTexture2 |
| (unnamed) | CanvasTexture | HTMLCanvasElement | 512x160 | RGBA/u8 | y | 0.42 | y | camp:signOffice.map [camp_signOffice] |
| SMAAPass.area | Texture | HTMLImageElement | 160x560 | RGBA/u8 | n | 0.34 | y | post:smaa:_areaTexture; post:smaa:_materialWeights.u.tArea |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | terrain:ShaderMaterial.u.uRipple [roadWater] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | terrain:MeshStandardMaterial.map [farHills] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | forest:MeshStandardMaterial.map [kopje_0, kopje_1 +5] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | forest:MeshStandardMaterial.aoMap [kopje_0, kopje_1 +5] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | forest:MeshStandardMaterial.normalMap [kopje_0, kopje_1 +5] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | forest:MeshStandardMaterial.roughnessMap [kopje_0, kopje_1 +5] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | forest:MeshStandardMaterial.map [termite_0, termite_1 +1] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | forest:MeshStandardMaterial.aoMap [termite_0, termite_1 +1] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | forest:MeshStandardMaterial.normalMap [termite_0, termite_1 +1] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | forest:MeshStandardMaterial.roughnessMap [termite_0, termite_1 +1] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | forest:MeshStandardMaterial.map [logEnd_0, logEnd_1 +1] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | forest:MeshStandardMaterial.aoMap [logEnd_0, logEnd_1 +1] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | forest:MeshStandardMaterial.normalMap [logEnd_0, logEnd_1 +1] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | forest:MeshStandardMaterial.roughnessMap [logEnd_0, logEnd_1 +1] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:trim.map [body_trim, gear_trim +1] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:trim.normalMap [body_trim, gear_trim +1]; fleet:fleet_trim.normalMap [fleet_trim] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:trim.roughnessMap [body_trim, gear_trim +1]; fleet:fleet_trim.roughnessMap [fleet_trim] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:alu.normalMap [body_alu, gear_alu +1]; camp:alu.normalMap [camp_alu]; fleet:fleet_alu.normalMap [fleet_alu] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:alu.roughnessMap [body_alu, gear_alu +1]; camp:alu.roughnessMap [camp_alu]; fleet:fleet_alu.roughnessMap [fleet_alu] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:trimGloss.map [body_trimGloss, gear_trimGloss +1] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:trimGloss.normalMap [body_trimGloss, gear_trimGloss +1]; vehicle:fridgeCase.normalMap [gear_fridgeCase]; fleet:fleet_trimGloss.normalMap [fleet_trimGloss] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:trimGloss.roughnessMap [body_trimGloss, gear_trimGloss +1]; vehicle:fridgeCase.roughnessMap [gear_fridgeCase]; fleet:fleet_trimGloss.roughnessMap [fleet_trimGloss] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:rubber.map [body_rubber, gear_rubber]; vehicle:tread.map [gear_tread]; vehicle:MeshStandardMaterial.map [cabin_rubber] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:rubber.normalMap [body_rubber, gear_rubber]; vehicle:MeshStandardMaterial.normalMap [cabin_rubber]; camp:rubber.normalMap [camp_rubber] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:rubber.roughnessMap [body_rubber, gear_rubber]; vehicle:MeshStandardMaterial.roughnessMap [cabin_rubber]; camp:rubber.roughnessMap [camp_rubber] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:plate.map [body_plate, gear_plate] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:plate.normalMap [body_plate, gear_plate]; fleet:fleet_plate.normalMap [fleet_plate] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:plate.roughnessMap [body_plate, gear_plate]; fleet:fleet_plate.roughnessMap [fleet_plate] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:paint.normalMap [body_paint]; vehicle:paintDark.normalMap [body_paintDark]; vehicle:paintAccent.normalMap [body_paintAccent, gear_paintAccent] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:paint.clearcoatNormalMap [body_paint]; vehicle:paintDark.clearcoatNormalMap [body_paintDark]; vehicle:paintAccent.clearcoatNormalMap [body_paintAccent, gear_paintAccent] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:chrome.roughnessMap [body_chrome, gear_chrome +1]; vehicle:mirrorGlass.roughnessMap [body_mirrorGlass]; fleet:fleet_chrome.roughnessMap [fleet_chrome] |
| (unnamed) | CanvasTexture | HTMLCanvasElement | 512x128 | RGBA/u8 | y | 0.33 | y | vehicle:decalName.map [body_decalName] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:reflector.map [body_reflector, gear_reflector]; fleet:fleet_reflector.map [fleet_reflector] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:reflector.normalMap [body_reflector, gear_reflector]; fleet:fleet_reflector.normalMap [fleet_reflector] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:reflector.roughnessMap [body_reflector, gear_reflector]; fleet:fleet_reflector.roughnessMap [fleet_reflector] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:bedLiner.map [body_bedLiner] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:bedLiner.normalMap [body_bedLiner] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:bedLiner.roughnessMap [body_bedLiner] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:canvasTop.normalMap [gear_canvasTop]; vehicle:canvasKhaki.normalMap [gear_canvasKhaki]; vehicle:fabric.normalMap [cabin_fabric] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:tread.aoMap [gear_tread] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:tread.normalMap [gear_tread] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:tread.roughnessMap [gear_tread] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:cabinPanel.normalMap [gear_cabinPanel, cabin_cabinPanel]; vehicle:interiorPlastic.normalMap [cabin_interiorPlastic]; vehicle:MeshStandardMaterial.normalMap [cabin_cardVinyl] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:interiorPlastic.map [cabin_interiorPlastic]; vehicle:MeshStandardMaterial.map [cabin_cardVinyl] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:interiorPlastic.roughnessMap [cabin_interiorPlastic]; vehicle:MeshStandardMaterial.roughnessMap [cabin_cardVinyl]; fleet:fleet_vinyl.roughnessMap [fleet_vinyl] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:floorMat.map [cabin_floorMat] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:floorMat.normalMap [cabin_floorMat] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:floorMat.roughnessMap [cabin_floorMat] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:interiorFaded.map [cabin_interiorFaded] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:interiorFaded.normalMap [cabin_interiorFaded]; vehicle:MeshStandardMaterial.normalMap [cabin_paper]; fleet:fleet_vinylFaded.normalMap [fleet_vinylFaded] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:interiorFaded.roughnessMap [cabin_interiorFaded]; fleet:fleet_vinylFaded.roughnessMap [fleet_vinylFaded] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:fabric.map [cabin_fabric] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:fabric.roughnessMap [cabin_fabric]; fleet:fleet_fabric.roughnessMap [fleet_fabric]; fleet:fleet_canvas.roughnessMap [fleet_canvas] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:wheelRim.map [cabin_wheelRim] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:wheelRim.normalMap [cabin_wheelRim] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:wheelRim.roughnessMap [cabin_wheelRim] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:castIron.map [axles_cast, brakes_cast]; vehicle:caliper.map [brakes_caliperM] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:castIron.metalnessMap [axles_cast, brakes_cast] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:castIron.normalMap [axles_cast, brakes_cast]; vehicle:caliper.normalMap [brakes_caliperM] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:castIron.roughnessMap [axles_cast, brakes_cast]; vehicle:caliper.roughnessMap [brakes_caliperM] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:rimMachined.map [axles_machined, tyre_machined +1]; vehicle:rimPowdercoat.map [axles_anod, tyre_anod] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:rimMachined.normalMap [axles_machined, tyre_machined +1]; vehicle:rimPowdercoat.normalMap [axles_anod, tyre_anod] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:rimMachined.roughnessMap [axles_machined, tyre_machined +1]; vehicle:rimPowdercoat.roughnessMap [axles_anod, tyre_anod] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:brakeRotor.map [brakes_rotor] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:brakeRotor.normalMap [brakes_rotor] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:brakeRotor.roughnessMap [brakes_rotor] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | camp:rock.map [camp_rock] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | camp:rock.normalMap [camp_rock] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | camp:rock.roughnessMap [camp_rock] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | camp:timber.map [camp_timber]; camp:pole.map [camp_pole] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | camp:timber.normalMap [camp_timber]; camp:pole.normalMap [camp_pole] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | camp:timber.roughnessMap [camp_timber]; camp:pole.roughnessMap [camp_pole] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | camp:timberWarm.map [camp_timberWarm] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | camp:timberWarm.normalMap [camp_timberWarm] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | camp:timberWarm.roughnessMap [camp_timberWarm] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | camp:galv.map [camp_galv] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | camp:galv.metalnessMap [camp_galv] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | camp:galv.normalMap [camp_galv] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | camp:galv.roughnessMap [camp_galv] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | camp:chairCloth.map [camp_chairCloth]; camp:canvasGreen.map [camp_canvasGreen]; camp:canvasChair.map [camp_canvasChair] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | camp:chairCloth.normalMap [camp_chairCloth]; camp:canvasGreen.normalMap [camp_canvasGreen]; camp:canvasChair.normalMap [camp_canvasChair] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | camp:chairCloth.roughnessMap [camp_chairCloth]; camp:canvasGreen.roughnessMap [camp_canvasGreen]; camp:canvasChair.roughnessMap [camp_canvasChair] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | camp:steelBlack.map [camp_steelBlack] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | camp:steelBlack.normalMap [camp_steelBlack] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | camp:steelBlack.roughnessMap [camp_steelBlack] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | camp:steelRed.map [camp_steelRed] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | camp:steelRed.normalMap [camp_steelRed] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | camp:steelRed.roughnessMap [camp_steelRed] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | camp:steelWhite.map [camp_steelWhite] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | camp:steelWhite.normalMap [camp_steelWhite] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | camp:steelWhite.roughnessMap [camp_steelWhite] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | camp:steelGreen.map [camp_steelGreen] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | camp:steelGreen.normalMap [camp_steelGreen] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | camp:steelGreen.roughnessMap [camp_steelGreen] |
| (unnamed) | CanvasTexture | HTMLCanvasElement | 256x256 | RGBA/u8 | y | 0.33 | y | camp:solar.map [camp_solar] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | camp:steelBlue.map [camp_steelBlue] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | camp:steelBlue.normalMap [camp_steelBlue] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | camp:steelBlue.roughnessMap [camp_steelBlue] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | camp:steelYellow.map [camp_steelYellow] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | camp:steelYellow.normalMap [camp_steelYellow] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | camp:steelYellow.roughnessMap [camp_steelYellow] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | camp:canvasSand.map [camp_canvasSand]; camp:tarp.map [camp_tarp] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | camp:canvasSand.normalMap [camp_canvasSand]; camp:tarp.normalMap [camp_tarp] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | camp:canvasSand.roughnessMap [camp_canvasSand]; camp:tarp.roughnessMap [camp_tarp] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | camp:canvas.map [camp_canvas] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | camp:canvas.normalMap [camp_canvas] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | camp:canvas.roughnessMap [camp_canvas] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | camp:canvasOlive.map [camp_canvasOlive] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | camp:canvasOlive.normalMap [camp_canvasOlive] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | camp:canvasOlive.roughnessMap [camp_canvasOlive] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | camp:grass.map [campGrass]; camp:grass.emissiveMap [campGrass] |
| (unnamed) | CanvasTexture | HTMLCanvasElement | 256x256 | RGBA/u8 | y | 0.33 | y | fleet:fleet_glassCracked.emissiveMap [safari-jeep_0_glassCracked_0, safari-jeep_1_glassCracked_0 +2] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | fleet:fleet_rubber.map [fleet_rubber]; fleet:fleet_tread.map [fleet_tread] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | fleet:fleet_trim.map [fleet_trim] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | fleet:fleet_fabric.map [fleet_fabric]; fleet:fleet_canvas.map [fleet_canvas] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | fleet:fleet_vinyl.map [fleet_vinyl] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | fleet:fleet_vinylFaded.map [fleet_vinylFaded] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | fleet:fleet_plate.map [fleet_plate] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | fleet:fleet_trimGloss.map [fleet_trimGloss] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | wildlife:lion-coat.normalMap [lion-body-0, lion-body-1 +1]; wildlife:lion-coat-cub.normalMap [lion-body-0, lion-body-1 +1] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | wildlife:lion-strands.map [lion-strands-0, lion-strands-1 +1] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | wildlife:lion-mane-base.map [lion-mane-0, lion-mane-1 +1]; wildlife:lion-mane-shells.map [lion-mane-shells-0, lion-mane-shells-1 +1] |
| (unnamed) | CanvasTexture | HTMLCanvasElement | 256x256 | RGBA/u8 | y | 0.33 | y | roadside:MeshStandardMaterial.map [roadside_timber] |
| (unnamed) | CanvasTexture | HTMLCanvasElement | 256x256 | RGBA/u8 | y | 0.33 | y | roadside:MeshStandardMaterial.map [roadside_concrete] |
| (unnamed) | CanvasTexture | HTMLCanvasElement | 256x192 | RGBA/u8 | y | 0.25 | y | camp:signRadio.map [camp_signRadio] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | n | 0.25 | y | dust:ShaderMaterial.u.uMap [wheelDust] |
| (unnamed) | CanvasTexture | HTMLCanvasElement | 256x160 | RGBA/u8 | y | 0.21 | y | camp:campFlag.map [campFlag] |
| (unnamed) | DataTexture | Uint8Array data | 512x96 | RGBA/u8 | n | 0.19 | y | terrain:ShaderMaterial.u.uCanopy [roadWater] |
| UnrealBloomPass.h2 | RenderTargetTexture | render target | 160x90 | RGBA/f16 | n | 0.11 | y | post:bloom:renderTargetsHorizontal[2].texture; post:bloom:renderTargetsHorizontal[2].textures[0]; post:bloom:separableBlurMaterials[2].u.colorTexture |
| UnrealBloomPass.v2 | RenderTargetTexture | render target | 160x90 | RGBA/f16 | n | 0.11 | y | post:bloom:renderTargetsVertical[2].texture; post:bloom:renderTargetsVertical[2].textures[0]; post:bloom:compositeMaterial.u.blurTexture3 |
| (unnamed) | CanvasTexture | HTMLCanvasElement | 256x72 | RGBA/u8 | y | 0.09 | y | vehicle:MeshBasicMaterial.map [cabin_mirrorGlass] |
| (unnamed) | DataTexture | Uint8Array data | 128x128 | RGBA/u8 | y | 0.08 | y | forest:MeshStandardMaterial.map [forestSkirt] |
| (unnamed) | DataTexture | Uint8Array data | 128x128 | RGBA/u8 | y | 0.08 | y | forest:MeshStandardMaterial.roughnessMap [forestSkirt] |
| (unnamed) | DataTexture | Uint8Array data | 128x128 | RGBA/u8 | y | 0.08 | y | vehicle:amber.normalMap [body_amber]; vehicle:reflectorRed.normalMap [body_reflectorRed, cabin_reflectorRed]; vehicle:taillight.normalMap [body_taillight] |
| (unnamed) | DataTexture | Uint8Array data | 128x128 | RGBA/u8 | y | 0.08 | y | vehicle:mesh.map [body_mesh, gear_mesh]; fleet:fleet_mesh.map [fleet_mesh] |
| (unnamed) | DataTexture | Uint8Array data | 128x128 | RGBA/u8 | y | 0.08 | y | vehicle:lensClear.normalMap [body_lensClear_0, body_lensClear_1 +9] |
| (unnamed) | DataTexture | Uint8Array data | 128x128 | RGBA/u8 | y | 0.08 | y | vehicle:wheelWorn.map [cabin_wheelWorn] |
| (unnamed) | DataTexture | Uint8Array data | 128x128 | RGBA/u8 | y | 0.08 | y | vehicle:wheelWorn.normalMap [cabin_wheelWorn] |
| (unnamed) | DataTexture | Uint8Array data | 128x128 | RGBA/u8 | y | 0.08 | y | vehicle:wheelWorn.roughnessMap [cabin_wheelWorn] |
| (unnamed) | DataTexture | Uint8Array data | 128x128 | RGBA/u8 | y | 0.08 | y | vehicle:headliner.map [cabin_headliner] |
| (unnamed) | DataTexture | Uint8Array data | 128x128 | RGBA/u8 | y | 0.08 | y | vehicle:headliner.normalMap [cabin_headliner] |
| (unnamed) | DataTexture | Uint8Array data | 128x128 | RGBA/u8 | y | 0.08 | y | vehicle:headliner.roughnessMap [cabin_headliner] |
| (unnamed) | DataTexture | Uint8Array data | 128x128 | RGBA/u8 | y | 0.08 | y | vehicle:tyreLug.map [axles_lugRub, tyre_lugRub +1] |
| (unnamed) | DataTexture | Uint8Array data | 128x128 | RGBA/u8 | y | 0.08 | y | vehicle:tyreLug.normalMap [axles_lugRub, tyre_lugRub +1] |
| (unnamed) | DataTexture | Uint8Array data | 128x128 | RGBA/u8 | y | 0.08 | y | vehicle:tyreLug.roughnessMap [axles_lugRub, tyre_lugRub +1] |
| (unnamed) | DataTexture | Uint8Array data | 128x128 | RGBA/u8 | y | 0.08 | y | vehicle:mudCake.map [axles_mudM, tyre_mudM +1] |
| (unnamed) | DataTexture | Uint8Array data | 128x128 | RGBA/u8 | y | 0.08 | y | vehicle:mudCake.normalMap [axles_mudM, tyre_mudM +1] |
| (unnamed) | DataTexture | Uint8Array data | 128x128 | RGBA/u8 | y | 0.08 | y | vehicle:mudCake.roughnessMap [axles_mudM, tyre_mudM +1] |
| (unnamed) | DataTexture | Uint8Array data | 128x128 | RGBA/u8 | y | 0.08 | y | vehicle:contactDust.map [contact_dust] |
| (unnamed) | DataTexture | Uint8Array data | 128x128 | RGBA/u8 | y | 0.08 | y | camp:polyBlack.map [camp_polyBlack]; camp:poly.map [camp_poly]; camp:polyBlue.map [camp_polyBlue] |
| (unnamed) | DataTexture | Uint8Array data | 128x128 | RGBA/u8 | y | 0.08 | y | camp:polyBlack.normalMap [camp_polyBlack]; camp:poly.normalMap [camp_poly]; camp:polyBlue.normalMap [camp_polyBlue] |
| (unnamed) | DataTexture | Uint8Array data | 128x128 | RGBA/u8 | y | 0.08 | y | camp:polyBlack.roughnessMap [camp_polyBlack]; camp:poly.roughnessMap [camp_poly]; camp:polyBlue.roughnessMap [camp_polyBlue] |
| (unnamed) | DataTexture | Uint8Array data | 128x128 | RGBA/u8 | y | 0.08 | y | camp:ash.map [camp_ash] |
| (unnamed) | DataTexture | Uint8Array data | 128x128 | RGBA/u8 | y | 0.08 | y | camp:ash.normalMap [camp_ash] |
| (unnamed) | DataTexture | Uint8Array data | 128x128 | RGBA/u8 | y | 0.08 | y | camp:ash.roughnessMap [camp_ash] |
| (unnamed) | CanvasTexture | HTMLCanvasElement | 128x128 | RGBA/u8 | y | 0.08 | y | fleet:fleet_pool.map [fleet_pool] |
| (unnamed) | DataTexture | Uint8Array data | 128x128 | RGBA/u8 | y | 0.08 | y | wildlife:lion-card.map [lion-card] |
| (unnamed) | DataTexture | Uint8Array data | 128x128 | RGBA/u8 | y | 0.08 | y | wildlife:lion-card.map [lion-card] |
| (unnamed) | CanvasTexture | HTMLCanvasElement | 128x128 | RGBA/u8 | y | 0.08 | y | roadside:MeshStandardMaterial.map [roadside_steel] |
| UnrealBloomPass.h3 | RenderTargetTexture | render target | 80x45 | RGBA/f16 | n | 0.03 | y | post:bloom:renderTargetsHorizontal[3].texture; post:bloom:renderTargetsHorizontal[3].textures[0]; post:bloom:separableBlurMaterials[3].u.colorTexture |
| UnrealBloomPass.v3 | RenderTargetTexture | render target | 80x45 | RGBA/f16 | n | 0.03 | y | post:bloom:renderTargetsVertical[3].texture; post:bloom:renderTargetsVertical[3].textures[0]; post:bloom:compositeMaterial.u.blurTexture4 |
| (unnamed) | DataTexture | Uint8Array data | 64x64 | RGBA/u8 | y | 0.02 | y | vehicle:stitch.map [cabin_stitch] |
| (unnamed) | DataTexture | Uint8Array data | 64x64 | RGBA/u8 | y | 0.02 | y | vehicle:stitch.normalMap [cabin_stitch] |
| (unnamed) | DataTexture | Uint8Array data | 64x64 | RGBA/u8 | y | 0.02 | y | vehicle:stitch.roughnessMap [cabin_stitch] |
| (unnamed) | DataTexture | Uint8Array data | 64x64 | RGBA/u8 | y | 0.02 | y | vehicle:louvre.map [cabin_louvre] |
| (unnamed) | DataTexture | Uint8Array data | 64x64 | RGBA/u8 | y | 0.02 | y | camp:rope.map [camp_rope] |
| (unnamed) | DataTexture | Uint8Array data | 64x64 | RGBA/u8 | y | 0.02 | y | camp:rope.normalMap [camp_rope] |
| (unnamed) | CanvasTexture | HTMLCanvasElement | 64x64 | RGBA/u8 | y | 0.02 | y | camp:ShaderMaterial.u.uTex [fireSmoke] |
| (unnamed) | CanvasTexture | HTMLCanvasElement | 64x64 | RGBA/u8 | y | 0.02 | y | camp:ShaderMaterial.u.uTex [fireFlames] |
| (unnamed) | CanvasTexture | HTMLCanvasElement | 64x64 | RGBA/u8 | y | 0.02 | y | camp:ShaderMaterial.u.uTex [fireEmbers] |
| (unnamed) | CanvasTexture | HTMLCanvasElement | 64x64 | RGBA/u8 | y | 0.02 | y | sky:ShaderMaterial.u.uMap [Points#737] |
| (unnamed) | DataTexture | Uint8Array data | 64x64 | RGBA/u8 | n | 0.02 | y | post:gtao:pdNoiseTexture; post:gtao:pdMaterial.u.tNoise |
| SMAAPass.search | Texture | HTMLImageElement | 66x33 | RGBA/u8 | n | 0.01 | y | post:smaa:_searchTexture; post:smaa:_materialWeights.u.tSearch |
| UnrealBloomPass.h4 | RenderTargetTexture | render target | 40x23 | RGBA/f16 | n | 0.01 | y | post:bloom:renderTargetsHorizontal[4].texture; post:bloom:renderTargetsHorizontal[4].textures[0]; post:bloom:separableBlurMaterials[4].u.colorTexture |
| UnrealBloomPass.v4 | RenderTargetTexture | render target | 40x23 | RGBA/f16 | n | 0.01 | y | post:bloom:renderTargetsVertical[4].texture; post:bloom:renderTargetsVertical[4].textures[0]; post:bloom:compositeMaterial.u.blurTexture5 |
| (unnamed) | DataTexture | Uint8Array data | 5x5 | RGBA/u8 | n | 0 | y | post:gtao:gtaoNoiseTexture; post:gtao:gtaoMaterial.u.tNoise |

## 4. Geometries

380 geometries in the scene graph (`renderer.info.memory.geometries` = 366; the difference is geometries in the graph that have never been drawn, e.g. hidden LOD tiers, minus the compositor's quads). Estimated 150.09 MB of vertex/index data for 3,634,807 vertices / 1,545,124 triangles, plus 1.95 MB of instance matrices/colours on 71 InstancedMeshes. 249 of the 380 geometries are non-indexed (three vertices stored per triangle). For the 95 non-indexed geometries with 3,000+ vertices the census counted their distinct vertices exactly (all attributes compared at 1e-4): an index buffer would remove 54.22 MB of the 122.56 MB they occupy.

| group | geometries | non-indexed | vertices | unique vertices (measured subset) | est. MB | triangles (one instance each) |
| --- | --- | --- | --- | --- | --- | --- |
| terrain | 5 | 1 | 884,848 | 666,984 of 666,984 | 41.37 | 509,842 |
| forest | 73 | 7 | 15,985 | - | 0.63 | 14,493 |
| vehicle | 113 | 111 | 1,427,405 | 320,495 of 1,383,030 | 44.91 | 480,804 |
| camp | 47 | 41 | 448,391 | 326,836 of 426,456 | 13.78 | 163,244 |
| fleet | 78 | 78 | 753,054 | 209,776 of 739,104 | 43.12 | 251,018 |
| wildlife | 42 | 0 | 69,797 | - | 5.18 | 113,160 |
| roadside | 10 | 10 | 34,278 | 27,271 of 30,540 | 1.05 | 11,426 |
| sky | 11 | 1 | 1,045 | - | 0.03 | 1,135 |
| dust | 1 | 0 | 4 | - | 0.02 | 2 |

Top 20 by bytes:

| geometry / objects | group | vertices | unique | triangles | indexed | attributes | users | est. MB |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| roadStones | terrain | 666,984 | 666,984 | 222,328 | n | position 3x666984, normal 3x666984, color 3x666984 | 1 | 22.9 |
| terrain | terrain | 178,231 | - | 264,548 | y | position 3x178231, normal 3x178231, uv 2x178231, aSide 1x178231, aEdge 1x178231, aAlong 1x | 1 | 17.31 |
| fleet_steel | fleet | 137,472 | 37,091 | 45,824 | n | position 3x137472, normal 3x137472, uv 2x137472, color 3x137472, aWear 4x137472 | 1 | 7.87 |
| fleet_rubber | fleet | 132,672 | 24,164 | 44,224 | n | position 3x132672, uv 2x132672, normal 3x132672, color 3x132672, aWear 4x132672 | 1 | 7.59 |
| fleet_trim | fleet | 125,664 | 30,410 | 41,888 | n | position 3x125664, normal 3x125664, uv 2x125664, color 3x125664, aWear 4x125664 | 1 | 7.19 |
| fleet_paint | fleet | 87,168 | 26,648 | 29,056 | n | position 3x87168, uv 2x87168, normal 3x87168, color 3x87168, aWear 4x87168 | 1 | 4.99 |
| fleet_chrome | fleet | 84,528 | 23,740 | 28,176 | n | position 3x84528, normal 3x84528, uv 2x84528, color 3x84528, aWear 4x84528 | 1 | 4.84 |
| body_trimGloss | vehicle | 110,304 | 20,754 | 36,768 | n | position 3x110304, normal 3x110304, uv 2x110304 | 1 | 3.37 |
| body_trim | vehicle | 97,776 | 19,660 | 32,592 | n | position 3x97776, normal 3x97776, uv 2x97776 | 1 | 2.98 |
| body_steelDark | vehicle | 89,892 | 17,856 | 29,964 | n | position 3x89892, normal 3x89892, uv 2x89892 | 1 | 2.74 |
| camp_timber | camp | 84,360 | 67,717 | 28,120 | n | position 3x84360, normal 3x84360, uv 2x84360 | 1 | 2.57 |
| body_gap | vehicle | 84,288 | 18,342 | 28,096 | n | position 3x84288, normal 3x84288, uv 2x84288 | 1 | 2.57 |
| cabin_gap | vehicle | 76,632 | 18,217 | 25,544 | n | position 3x76632, normal 3x76632, uv 2x76632 | 1 | 2.34 |
| fleet_tread | fleet | 36,540 | 24,360 | 12,180 | n | position 3x36540, normal 3x36540, uv 2x36540, color 3x36540, aWear 4x36540 | 1 | 2.09 |
| fleet_gap | fleet | 35,520 | 16,372 | 11,840 | n | position 3x35520, normal 3x35520, uv 2x35520, color 3x35520, aWear 4x35520 | 1 | 2.03 |
| cabin_trimGloss | vehicle | 66,552 | 11,941 | 22,184 | n | position 3x66552, normal 3x66552, uv 2x66552 | 1 | 2.03 |
| camp_deadwood | camp | 63,882 | 51,613 | 21,294 | n | position 3x63882, normal 3x63882, uv 2x63882 | 1 | 1.95 |
| gear_steelDark | vehicle | 58,728 | 16,460 | 19,576 | n | position 3x58728, normal 3x58728, uv 2x58728 | 1 | 1.79 |
| body_chrome | vehicle | 53,016 | 8,962 | 17,672 | n | position 3x53016, normal 3x53016, uv 2x53016 | 1 | 1.62 |
| fleet_fabric | fleet | 26,568 | 4,592 | 8,856 | n | position 3x26568, normal 3x26568, uv 2x26568, color 3x26568, aWear 4x26568 | 1 | 1.52 |

Instance buffers:

| object | group | instances | est. MB |
| --- | --- | --- | --- |
| litter_3 | forest | 1,950 | 0.14 |
| grass_2 | forest | 1,867 | 0.14 |
| grass_1 | forest | 1,865 | 0.14 |
| grass_0 | forest | 1,839 | 0.13 |
| litter_2 | forest | 1,823 | 0.13 |
| grass_3 | forest | 1,816 | 0.13 |
| grass_4 | forest | 1,801 | 0.13 |
| litter_1 | forest | 1,523 | 0.11 |
| grass_5 | forest | 1,097 | 0.08 |
| litter_0 | forest | 1,092 | 0.08 |
| grass_6 | forest | 1,050 | 0.08 |
| grass_8 | forest | 1,019 | 0.07 |
| grass_7 | forest | 1,011 | 0.07 |
| forb_1 | forest | 770 | 0.06 |
| forb_2 | forest | 756 | 0.05 |
| swath_0 | forest | 600 | 0.04 |
| grass_10 | forest | 532 | 0.04 |
| grass_9 | forest | 505 | 0.04 |
| grass_11 | forest | 505 | 0.04 |
| swath_4 | forest | 295 | 0.02 |

## 5. Draw calls per group per view

Beauty pass calls, with the shadow-map and AO G-buffer calls the same group adds. One `InstancedMesh` is one call however many instances it carries; an object with an array material is one call per material group.

| group | hero beauty | mainroad beauty | forest beauty | camp beauty | lions beauty | hero shadow | mainroad shadow | forest shadow | camp shadow | lions shadow | hero G-buffer | mainroad G-buffer | forest G-buffer | camp G-buffer | lions G-buffer |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| terrain | 4 | 5 | 4 | 5 | 5 | 0 | 0 | 0 | 0 | 0 | 3 | 3 | 3 | 3 | 3 |
| forest | 70 | 71 | 70 | 74 | 66 | 31 | 30 | 31 | 31 | 27 | 23 | 23 | 23 | 25 | 20 |
| vehicle | 161 | 161 | 161 | 161 | 72 | 99 | 99 | 99 | 99 | 99 | 129 | 129 | 129 | 129 | 62 |
| camp | 4 | 16 | 4 | 47 | 3 | 9 | 31 | 9 | 24 | 0 | 0 | 12 | 0 | 43 | 0 |
| fleet | 0 | 24 | 0 | 127 | 0 | 0 | 20 | 0 | 16 | 0 | 0 | 23 | 0 | 27 | 0 |
| wildlife | 0 | 4 | 0 | 4 | 10 | 0 | 0 | 0 | 0 | 0 | 0 | 4 | 0 | 4 | 10 |
| roadside | 2 | 9 | 2 | 10 | 5 | 5 | 10 | 5 | 5 | 6 | 2 | 9 | 2 | 10 | 5 |
| sky | 10 | 10 | 10 | 10 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| dust | 1 | 1 | 1 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

| phase | hero | mainroad | forest | camp | lions |
| --- | --- | --- | --- | --- | --- |
| shadow | 144 | 190 | 144 | 175 | 132 |
| beauty | 252 | 301 | 252 | 439 | 164 |
| override:MeshNormalMaterial | 157 | 203 | 157 | 241 | 100 |
| post | 23 | 23 | 23 | 23 | 23 |

## 6. JS heap

| point | MB |
| --- | --- |
| after boot (first frame drawn) | 363.1 |
| after 5 census views | 439.8 |
| reset loop 1 (setView hero, resetAuto, 2.5 s drive, gc) | 333.7 |
| reset loop 2 (setView hero, resetAuto, 2.5 s drive, gc) | 333.6 |
| reset loop 3 (setView hero, resetAuto, 2.5 s drive, gc) | 333.6 |
| after loops, forced GC | 333.6 |

Growth over the 3 loops: -0.1 MB — no leak. Typed arrays count toward `usedJSHeapSize` in Chromium (checked: a 100 MB Float32Array moves it by 100.0 MB), so of the 333.6 MB steady state, geometry attribute arrays are 152.03 MB (they stay referenced after upload) and DataTexture pixel arrays another 108.8 MB — 78% of the heap is upload-side copies of GPU data. The canvas bitmaps behind the CanvasTextures (32.86 MB) are held by the browser outside the JS heap.

| group | DataTexture pixel MB in heap | geometry MB in heap |
| --- | --- | --- |
| terrain | 2.69 | 41.37 |
| forest | 55.13 | 0.63 |
| vehicle | 28.69 | 44.91 |
| camp | 15.41 | 13.78 |
| fleet | 5.75 | 43.12 |
| wildlife | 0.88 | 5.18 |
| roadside | 0 | 1.05 |
| sky | 0 | 0.03 |
| dust | 0.25 | 0.02 |
| post | 0.02 | 0 |

## 7. Boot stages

Time to first frame 117,533 ms in-page (SwiftShader; shader compilation dominates and is many times slower than on a GPU, but the *number* of programs it compiles is the same: 277, 124 of them for the canvas and unused).

| stage | ms | share |
| --- | --- | --- |
| Compiling noise kernel | 33 | 0.0% |
| Building sky | 203 | 0.2% |
| Grading the road | 17,279 | 14.7% |
| Planting the forest | 7,812 | 6.6% |
| Assembling the truck | 7,082 | 6.0% |
| Pitching camp | 2,664 | 2.3% |
| Parking the fleet | 1,415 | 1.2% |
| Finding the pride | 36,486 | 31.0% |
| Posting the signs | 114 | 0.1% |
| Compiling shaders | 42,422 | 36.1% |

## Top ten cheapest wins

Ordered by saving per line of code changed. Every number is from the tables above (build `ad7ef04+`, `quality=fast`, 1280x720); "per frame" means the beauty pass unless stated, and remember the AO G-buffer draws the scene a second time and the shadow map a third, so a beauty-pass triangle saved on a shadow-casting, depth-writing surface is saved three times.

### 1. main.js boot — the scene is compiled twice; 124 of 284 programs are never used

*Group/module:* boot sequence in `src/main.js` ("Compiling shaders" step).
*What:* `renderer.compile(scene, camera)` runs with no render target bound, so every material is compiled with `toneMapping = ACES, outputColorSpace = sRGB`; the composer then draws the scene into `renderTarget1` (`NoToneMapping`, linear), which is a different cache key, and every material compiles again. Both programs stay in `materialProperties.programs`. Measured: 124 tone-mapped programs are `currentProgram` for zero materials; 183 of 199 scene materials own exactly two programs whose keys differ only in those two fields.
*Change:* bind the composer's target before compiling — `renderer.setRenderTarget(post.composer.renderTarget1); renderer.compile(scene, camera); renderer.setRenderTarget(null);` — or delete the `renderer.compile` line and let the existing warm-up `p.render(1/60)` compile the programs that will actually be used.
*Saving:* −124 programs (284 → 160 after all views; 277 → ~153 at boot), and roughly half of the "Compiling shaders" stage (24.6 s with the box idle, 42.4 s in the loaded run recorded above; the two compile passes are the same shaders; the fraction carries to a GPU even though the seconds do not). Also 124 fewer GL program objects held for the session.
*Confidence:* high — measured, and the mechanism is three's `getParameters` reading `renderer.getRenderTarget()`.

### 2. terrain.js — `terrain` and `roadStones` are one mesh each, so every frame draws the whole route

*Group/module:* `terrain` (`src/terrain.js`, the ground mesh and the scatter bake that becomes `roadStones`).
*What:* `terrain` is 264,548 indexed triangles, `roadStones` is 14,540 baked pieces = 222,328 non-indexed triangles; both are single meshes, so the sphere test passes from anywhere on the route and they are drawn whole in the beauty pass and again in the AO G-buffer (487k + 491k tris per frame, every view). Measured per triangle centroid, the fraction actually inside the frustum is 3% / 1% (hero), 17% / 19% (mainroad), 26% / 27% (forest), 54% / 60% (camp), 5% / 4% (lions).
*Change:* bucket both by route parameter into tiles (12–16 along the trail + mainline, or a 4×4 world grid) and emit one Mesh per tile; keep `frustumCulled = true`. For `roadStones` the bake loop already knows each piece's road `t`, so the bucket is one array index at emit time.
*Saving:* 190k–450k beauty triangles and the same again in the G-buffer per frame — 380k–900k of the ~3.4M triangles the GPU rasterises for a frame today. Cost: ~30 more draw calls. Do **not** also index `roadStones`: its 666,984 vertices were measured 100% unique (per-face colour and normal), so an index buffer saves nothing there.
*Confidence:* high on triangles (measured), medium on wall-clock (how vertex-bound the GPU is was not measurable here).

### 3. fleet (vehicles/kit.js) — merged per material across the whole fleet, so it is drawn when none of it is on screen

*Group/module:* `fleet` (`src/vehicles/kit.js` `emit`, one merged mesh per material for all parked vehicles).
*What:* in the mainroad view the fleet costs 248,082 beauty + 247,308 shadow + 246,738 G-buffer triangles in 24 + 20 + 23 calls, and `fleet_steel`, `fleet_rubber` and `fleet_trim` (132k tris) have **0** triangles inside the frustum; only 58,914 of the 248,082 are. The merged bounding spheres cover the whole parking apron.
*Change:* merge per material *per vehicle* (or per parking slot) instead of per material per fleet. The kit already loops over placements; move the `mergeGeometries` inside that loop.
*Saving:* in views where the fleet is at the edge of the frame (mainroad, and every drive frame approaching the camp) ~190k beauty + ~190k G-buffer + up to 247k shadow triangles per frame. When the whole fleet is in frame nothing changes except draw calls (24 → up to 24 × vehicles, culled).
*Confidence:* high (measured).

### 4. forest.js — species-wide InstancedMeshes defeat culling for the grass, forbs, swaths and scrub

*Group/module:* `forest` (`src/forest.js`, the `grass_N`, `forb_N`, `swath_N`, `scrub_N`, `tree_*` InstancedMeshes).
*What:* the forest draws 414k instanced triangles in every view. Measured per instance bounding sphere, the instances inside the frustum are 31k / 52k / 141k / 151k / 27k triangles' worth (hero / mainroad / forest / camp / lions). `grass_1` alone: 73 of 1,865 instances in frustum (hero), 63 (lions), 884 (camp).
*Change:* when planting, bucket each species' instances into a 3×3 (or 4×4) grid of cells over the forest footprint and make one InstancedMesh per non-empty cell, sharing geometry and material (same program: the material is what keys the program, not the mesh). Trees (41 + 24 instances) can stay as they are.
*Saving:* 260k–385k beauty triangles per frame in the drive views (the shadow pass also culls per object: part of its 147k). Cost: ~8 species × (cells − 1) more InstancedMesh objects, of which only the in-frustum ones become draw calls.
*Confidence:* high on triangles (measured), medium-high on net effect (each extra call is cheap; the vertex work saved is not).

### 5. vehicle + fleet — index the merged kit geometry

*Group/module:* `vehicle` (`src/vehicle/body.js` `emitPieces`, `src/lib/geo.js` merge) and `fleet` (`src/vehicles/kit.js`); both merge with `toNonIndexed()` and `mergeGeometries(list, false)`.
*What:* 111 of the truck's 113 geometries and all 78 fleet geometries are non-indexed. Counted exactly (all attributes at 1e-4): the truck stores 1,427,405 vertices for 320,495 distinct ones (4.45×), the fleet 753,054 for 209,776 (3.6×). 44.9 MB + 43.1 MB of vertex buffers, in the JS heap and on the GPU.
*Change:* `BufferGeometryUtils.mergeVertices(merged)` at the end of each kit emit (or build indexed in the first place). The camp's kit is already 77% unique and not worth it.
*Saving:* 56.9 MB of vertex data (measured across the 95 large non-indexed geometries; ~57 MB off the 335 MB heap and off the GPU), and 3.6–4.5× fewer vertex-shader invocations for the truck and fleet across beauty, shadow and G-buffer (the truck alone is 1.4M vertices × 3 passes today). Cost: a one-off hash of ~2.2M vertices at boot.
*Confidence:* high on bytes (measured), medium on GPU time.

### 6. vehicle — 99 shadow casters, 404k shadow triangles, every frame

*Group/module:* `vehicle` (`src/vehicle/body.js` `UNSHADOWED`, `details.js` `castShadow`).
*What:* the truck's shadow pass is 99 draw calls / 404,280 triangles per frame: body 21 casters / 197,820, tyres 24 / 99,016, gear 21 / 81,652, brakes 28 / 10,224, axles 5 / 15,568. The 28 brake casters are behind wheels; `body_gap` (28,096 tris) and `cabin_gap` are shut-line recess geometry; `body_chrome`/`body_trim*` (87k tris) are fittings on panels that already cast.
*Change:* add `brakes`, `gap`, `trim`, `trimGloss`, `chrome`, `glassEdge`, `reflector`, `decal*` to `UNSHADOWED` (the mechanism exists), and consider a single low-poly caster proxy for the body shell.
*Saving:* −28 to −55 shadow calls and −40k to −150k shadow triangles per frame depending on how far the list goes; nothing in the beauty pass changes.
*Confidence:* medium — the triangle numbers are measured, which casters read on screen is a judgement.

### 7. vehicle/fleet materials — the material *name* is in the program cache key

*Group/module:* `vehicle` (`src/textures/vehicle.js` `extendMaterial` tags `bw:${tag}`, `dirt:${tag}`, `cb:${tag}`, `gf:${tag}`; `src/vehicle/interior.js` `cl:${tag}`; `src/vehicle/wheels.js` `loadedTyre_${mat.name}_`), `fleet` (`src/vehicles/materials.js` `fleetDirt:${tag}`, `sway:${tag}`).
*What:* every patch puts the material name into `customProgramCacheKey`, so materials whose patches receive identical baked parameters and whose built-in parameters agree still compile separately. Measured by stripping only the name and re-keying: `fleet_rust / fleet_rubber / fleet_tread / fleet_fabric / fleet_vinyl / fleet_vinylFaded` are 6 copies of one program; `paint / paintDark / paintAccent` 3; `chrome / alu`, `decalName / decalNumber`, `interiorPlastic / interiorFaded`, `tyreCarcass / tyreLug`, `brakeRotor / caliper`, `fleet_paint / fleet_paintOld`, `fleet_glass / fleet_glassDusty` (×2) 2 each.
*Change:* key on what changes the GLSL (`bw:${fresnel}:${clearcoat}:${pane}:${ccRough}:${flat>0}:${ambient>0}`, `dirt:${arch}:${scratch>0}`, `cb:${spec}`, `cl:${spec>0}:${y0}:${y1}`, `loadedTyre_${bulge}`) and leave the name out; per-material values are already uniforms (`u`).
*Saving:* −15 working programs (160 → 145; vehicle 58 → 51, fleet 32 → 24), −30 today because each also has a canvas twin. A further −24 (vehicle 45, fleet 18) is available if materials in the same class are given the same map set (a shared 1×1 white/flat map keeps `USE_MAP`/`USE_ROUGHNESSMAP` on), which is a bigger edit.
*Confidence:* high for the −15 (measured keys, uniforms verified in source), medium for the map-set −24.

### 8. everything with a DataTexture — 109 MB of pixel arrays kept in the JS heap after upload

*Group/module:* `forest` 55 MB, `vehicle` 29 MB, `camp` 15 MB, `fleet` 6 MB, `terrain` 3 MB (`src/textures/*` build `DataTexture`s from typed arrays).
*What:* 211 of the 267 textures are `DataTexture`s. After `texImage2D` three never reads `image.data` again unless `needsUpdate` is set, but the arrays stay referenced: 108.8 MB of the 335 MB steady-state heap (exact: width × height × bytes/texel per texture).
*Change:* in the texture factory, `tex.onUpdate = () => { tex.image.data = null; }` (three calls `onUpdate` after upload) for textures that are never regenerated; keep the array only where time-of-day rebuilds it. Trade-off: after a WebGL context loss those textures cannot be re-uploaded from the array — acceptable for a page that reloads on context loss, or gate it behind the `capture` flag being absent.
*Saving:* up to 109 MB of JS heap (335 → ~226 MB) and the GC pressure that goes with it. Zero GPU change.
*Confidence:* medium — the byte count is measured; the context-loss trade-off is a product decision.

### 9. post — the AO G-buffer is a third full scene draw and inherits every culling fix

*Group/module:* `post` (`src/post.js` `patchGBufferPass`, three's `GTAOPass` normal/depth override).
*What:* per frame the G-buffer re-issues 157 (hero) to 241 (camp) draw calls and 1.05–1.57M triangles through `MeshNormalMaterial`, including the 490,924 terrain triangles and 129 truck parts. It cannot be cheaper than the beauty pass until items 2–4 land; after them it drops in step. The pass itself is already right-sized: it skips `depthWrite = false` materials and freezes shadow updates.
*Change:* nothing in `post.js` for now; the cheap post-side item is the memory line — 7 full-resolution RGBA16F targets (composer ×2, GTAO ×3, SMAA ×2 = 49 MB at 720p; 2.25× that at `high`'s pixel ratio 1.5), plus 13.5 MB bloom. SMAA's edge/weight targets do not need half-float (RGBA8 is what the reference implementation uses) and GTAO's `pdRenderTarget` does not either: −14 to −21 MB at 720p if the pass options allow it.
*Saving:* triangles: none directly (see 2–4); memory: 14–21 MB at 720p.
*Confidence:* medium on the format change (needs checking that the three passes accept RGBA8 targets without banding in the denoiser).

### 10. what is already cheap and should stay that way

*wildlife:* 10 beauty calls / 5,078 triangles at the pride with the truck beside it (LOD tiers working); 4 working programs, 5 canvas variants that item 1 removes. Nothing to do.
*camp:* 47 objects, 15 working programs for 98 materials (`timber` shared by 15 materials, `canvas` by 8, `solar` by 8) — the sharing the vehicle family should copy. Its only per-frame oddity is three `frustumCulled = false` fire meshes (144 triangles, 3 calls) drawn from anywhere on the map — trivial. Camp shadow casters are 24–31 calls / 130–145k triangles when the sun's shadow frustum covers the site.
*roadside:* 10 objects, 2 working programs, 6 MB of canvas textures. Nothing to do.
*sky/dust:* 12 calls, ~2k triangles. The 6 MB PMREM ping-pong target is retained for time-of-day rebuilds; deliberate.

Out of scope for this round but measured for the record: the camp's lamps put `numPointLights = 5, numSpotLights = 4` into every lit program in the scene, so every lit fragment at 1280×720 evaluates nine local lights whatever the distance to the camp; and the whole vehicle (161 calls, 563k triangles) is drawn in full from the driver's seat in the lions view (72 calls / 458k there, of which 306k inside the frustum). Neither has a one-line fix, and the light count cannot be changed without recompiling every program.
