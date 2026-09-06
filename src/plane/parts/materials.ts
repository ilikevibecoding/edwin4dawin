import * as THREE from 'three';
import { partsMaterial } from '../geometry';
import { cabinMaps, floatMaps, fuselageMaps, glassDirtTexture, instrumentAtlas, LIVERY, panelTexture, wingMaps, type FuselageLayout } from '../textures';
import { CABIN_FRONT, CABIN_REAR, FLOOR, N_CHANNELS, SILL, WIN_TOP } from './context';

/** Uniforms the model owns and drives per frame (see parts/animate.ts); the shaders below only reference them. */
export interface MaterialUniforms {
  /** hull-local y of the wet line on each float: port bow, port stern, starboard bow, starboard stern (setWaterline) */
  readonly wetLine: { value: THREE.Vector4 };
  /** live instrument channels: rotation (radians CCW) and shift per channel */
  readonly instAngle: { value: Float32Array };
  readonly instShift: { value: Float32Array };
  /** the moving-map canvas (GpsScreen) */
  readonly gpsTexture: THREE.Texture;
}

/**
 * The material table the part builders draw from. Created in this order (three.js sorts opaque objects by material
 * id, so the order is part of the rendered result); the parts that need their own material (propeller blades and
 * blur disc, navigation lights, glow sprites) create it themselves and register it in `PlaneModel.materials`.
 */
export interface Materials {
  /** fuselage paint: livery, clear coat with orange peel */
  paint: THREE.MeshPhysicalMaterial;
  /** wings, stabiliser, fin and the control surfaces */
  wingPaint: THREE.MeshPhysicalMaterial;
  /** float hulls with the live wet line */
  floatPaint: THREE.MeshPhysicalMaterial;
  /** cockpit glazing */
  glass: THREE.MeshPhysicalMaterial;
  /** cabin glow seen in / through the glass after dusk (0 by day .. 1 at night) */
  glassUniforms: { uCabinGlow: { value: number } };
  /** plain upper-body white (scoop, cowl flaps, wing root fairing) */
  plainPaint: THREE.MeshPhysicalMaterial;
  /** vertex-coloured parts material (fittings, struts, cabin kit ...), see partsMaterial */
  parts: THREE.MeshStandardMaterial;
  /** cabin lining */
  cabinMat: THREE.MeshStandardMaterial;
  /** instrument panel face, glare shield, placards */
  panelMat: THREE.MeshStandardMaterial;
  /** live instrument parts (needles, cards) */
  instMat: THREE.MeshStandardMaterial;
  /** moving-map screen */
  gpsMat: THREE.MeshStandardMaterial;
}

// Upwelling light from the water: the environment probe's lower half is a neutral fill, so a surface facing
// the bay saw almost nothing from it and the belly, wing underside and float flanks in the aircraft's own
// shadow went navy. The sun-lit water returns ~10 % of the sun's irradiance, blue-green, over the half of the
// hemisphere below the horizon: (1 - n.y) / 2 of it reaches a surface with world normal n.
export const withWaterBounce = <T extends THREE.Material>(mat: T): T => {
  const prev = mat.onBeforeCompile, prevKey = mat.customProgramCacheKey();
  mat.onBeforeCompile = (shader, renderer) => {
    prev.call(mat, shader, renderer);
    shader.fragmentShader = shader.fragmentShader.replace('#include <lights_fragment_end>', /* glsl */ `
      #if NUM_DIR_LIGHTS > 0
      { vec3 bounceN = inverseTransformDirection(geometryNormal, viewMatrix);
        irradiance += directionalLights[0].color * vec3(0.055, 0.095, 0.105) * (0.5 - 0.5 * bounceN.y); }
      #endif
      #include <lights_fragment_end>`);
  };
  mat.customProgramCacheKey = () => prevKey + '|water-bounce-v1';
  return mat;
};

/** Builds the material table (and pushes it into `materials` in creation order). `layout` is the fuselage loft's texture layout. */
export function buildMaterials(layout: FuselageLayout, u: MaterialUniforms, materials: THREE.Material[]): Materials {
  // ------------------------------------------------------------ materials
  const fus = fuselageMaps(layout), wing = wingMaps(), flt = floatMaps();
  // clearcoat roughness comes from the texture: the cowl is a little glossier than the body, the glare panel is dull.
  // Clear-coat amount, base roughness and metalness come packed in one map (R / G / B): the nose bowl is bare
  // polished aluminium (metal, no coat), the anti-glare panel a flat lacquer, the rest clear-coated livery paint.
  const paint = new THREE.MeshPhysicalMaterial({
    map: fus.map, roughnessMap: fus.roughnessMap, metalnessMap: fus.metalnessMap, clearcoatMap: fus.clearcoatMap, normalMap: fus.normalMap, normalScale: new THREE.Vector2(0.55, 0.55),
    color: 0xffffff, roughness: 1.0, metalness: 1.0, clearcoat: 0.7, clearcoatRoughness: 1.0, clearcoatRoughnessMap: fus.clearcoatRoughnessMap, envMapIntensity: 1.0,
    // orange peel: the sharp clear-coat lobe wobbles over a tiled dimple normal while the base coat stays smooth
    clearcoatNormalMap: fus.clearcoatNormalMap, clearcoatNormalScale: new THREE.Vector2(0.45, 0.45),
  });
  // the shadow pass normally records back faces, which for a closed hull is the belly: the cabin inside it
  // would count as lit. Recording both sides puts the roof and window frames into the map so the cockpit
  // is shaded except where the sun comes through the glass (the texel-sized normal bias covers the acne).
  paint.shadowSide = THREE.DoubleSide;
  // vertexColors: wingPanel() shades the faces inside the hinge gaps dark so the gap reads as a line; the packed map
  // carries the chipped-to-metal leading edges (metalness) and the uncoated walkway (clear-coat amount)
  const wingPaint = new THREE.MeshPhysicalMaterial({
    map: wing.map, roughnessMap: wing.roughnessMap, metalnessMap: wing.metalnessMap, clearcoatMap: wing.clearcoatMap, normalMap: wing.normalMap, normalScale: new THREE.Vector2(0.5, 0.5),
    color: 0xffffff, roughness: 1.0, metalness: 1.0, clearcoat: 0.65, clearcoatRoughness: 1.0, clearcoatRoughnessMap: wing.clearcoatRoughnessMap, envMapIntensity: 1.0, vertexColors: true,
    clearcoatNormalMap: wing.clearcoatNormalMap, clearcoatNormalScale: new THREE.Vector2(0.45, 0.45),
  });
  // floats: painted aluminium hull (metalness 0, clear-coated, scuffed, glossier wet band) with a bare anodised deck
  // and an anti-slip walkway; the whole split lives in one packed texture (clearcoatMap R, roughnessMap G,
  // metalnessMap B). The old uniform metalness 0.55 made the hulls read as chrome mirroring the water.
  const floatPaint = new THREE.MeshPhysicalMaterial({
    map: flt.map, roughnessMap: flt.roughnessMap, metalnessMap: flt.metalnessMap, clearcoatMap: flt.clearcoatMap,
    normalMap: flt.normalMap, normalScale: new THREE.Vector2(0.6, 0.6),
    color: 0xffffff, roughness: 1.0, metalness: 1.0, clearcoat: 0.45, clearcoatRoughness: 0.22, envMapIntensity: 1.0,
  });
  // Live waterline: the hull below the water (and the film it leaves as it rises) is darker and glossy, from the
  // immersion the flight model reports per float (setWaterline), so a float driven under at touchdown reads wet
  // to the deck and a planing float runs with a dry bow; the painted band in the texture is only the scum stain.
  const wetLine = u.wetLine;
  floatPaint.onBeforeCompile = (shader) => {
    shader.uniforms.uWetLine = wetLine;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vHullLocal;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvHullLocal = position;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec4 uWetLine;\nvarying vec3 vHullLocal;')
      .replace('#include <roughnessmap_fragment>', /* glsl */ `
        #include <roughnessmap_fragment>
        // wet line (hull-local y) interpolated from the bow (x 2.6) to the stern (x -2.3) of this float
        float hullU = clamp((2.6 - vHullLocal.x) / 4.9, 0.0, 1.0);
        vec2 wetEnds = vHullLocal.z > 0.0 ? uWetLine.zw : uWetLine.xy;
        float wetLineY = mix(wetEnds.x, wetEnds.y, hullU);
        float hullWet = 1.0 - smoothstep(wetLineY - 0.01, wetLineY + 0.025, vHullLocal.y);
        // a darker meniscus line where the water meets the paint
        float hullMeniscus = exp(-pow((vHullLocal.y - wetLineY) * 60.0, 2.0));
        roughnessFactor = mix(roughnessFactor, 0.10, 0.85 * hullWet);
        diffuseColor.rgb *= 1.0 - 0.36 * hullWet - 0.2 * hullMeniscus;
      `)
      .replace('#include <lights_physical_fragment>', '#include <lights_physical_fragment>\nmaterial.clearcoatRoughness = mix(material.clearcoatRoughness, 0.06, 0.8 * hullWet);\nmaterial.clearcoat = max(material.clearcoat, 0.9 * hullWet);');
  };
  floatPaint.customProgramCacheKey = () => 'float-paint-wetline-v1';
  // Thin glass: a faint cool tint at low alpha; the reflection comes from the physically based specular terms and
  // is composited on top with premultiplied blending so it does not depend on the opacity. The Fresnel term also
  // reduces the transmitted background. Front faces only: the outer pane is seen from outside, the inner (flipped)
  // pane from the pilot seat, so no back faces are ever drawn. Every pane carries its own [0,1]^2 UV and physical
  // size (`aPane`, see paneGeometry) from which the shader draws a rubber seal of constant width, a soft vignette
  // toward the frame and a faint smudge film that only shows where the sun catches it.
  // Roughness 0.06: the panes are a near mirror, so the sky / sun reflection is a sharp streak and not a milky
  // sheet (the previous 0.25 spread the environment probe over the whole pane, which read as frosting).
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0x9fc3d2, transparent: true, opacity: 0.05, roughness: 0.06, metalness: 0.0, envMapIntensity: 1.0,
    side: THREE.FrontSide, depthWrite: false, specularIntensity: 1.0, ior: 1.52, premultipliedAlpha: true,
  });
  const glassUniforms = { uDirt: { value: glassDirtTexture() }, uEnvGain: { value: 2.2 }, uDirtAmount: { value: 0.16 }, uCabinGlow: { value: 0 } };
  glass.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, glassUniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 aPane;\nvarying vec4 vPane;\nvarying vec2 vPaneUv;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvPane = aPane;\nvPaneUv = uv;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform sampler2D uDirt;\nuniform float uEnvGain;\nuniform float uDirtAmount;\nuniform float uCabinGlow;\nvarying vec4 vPane;\nvarying vec2 vPaneUv;')
      // acrylic panes are never optically flat: a gentle low-frequency wobble of the shading normal bends the
      // mirrored sky / sun streak across the pane (the "slight distortion" of real light-aircraft glazing); the
      // windshield (vPane.z) also carries a slow cylindrical bow across its width so the sun's image travels
      .replace('#include <normal_fragment_maps>', /* glsl */ `
        #include <normal_fragment_maps>
        vec2 glassWob = vec2(sin(vPaneUv.x * 13.0 + vPaneUv.y * 9.0) + 0.5 * sin(vPaneUv.x * 29.0 - vPaneUv.y * 17.0), cos(vPaneUv.y * 11.0 - vPaneUv.x * 7.0) + 0.5 * cos(vPaneUv.y * 23.0 + vPaneUv.x * 5.0)) * 0.008;
        if (vPane.z > 0.5) glassWob += vec2(sin(vPaneUv.x * 6.3) * 0.008, sin(vPaneUv.y * 12.6) * 0.010);
        normal = normalize(normal + vec3(glassWob, 0.0));
      `)
      .replace('#include <opaque_fragment>', /* glsl */ `
        // distance to the nearest pane edge in metres (and to the centre post seal on the windshield)
        vec2 dm = vec2(min(vPaneUv.x, 1.0 - vPaneUv.x) * vPane.x, min(vPaneUv.y, 1.0 - vPaneUv.y) * vPane.y);
        float dEdge = min(dm.x, dm.y);
        if (vPane.z > 0.5) dEdge = min(dEdge, abs(vPaneUv.y - 0.5) * vPane.y - 0.006);
        float seal = 1.0 - smoothstep(0.008, 0.019, dEdge);
        // a narrow darkening against the seal only (the old 26 cm vignette covered a whole side pane and veiled it)
        float vig = 1.0 - smoothstep(0.0, 0.07, dEdge);
        // the cabin side of the glass carries half the smudge film and catches no sun (the roof shades it)
        float inner = vPane.w;
        float dirt = texture2D(uDirt, vPaneUv * vPane.xy * 1.6).r * uDirtAmount * (1.0 - 0.3 * inner);
        vec3 glassN = normalize(normal), glassV = normalize(vViewPosition);
        float glassNdv = saturate(dot(glassN, glassV));
        // Fresnel: 4 % head-on rising to a mirror at grazing angles. The rim is widened a little over Schlick
        // (pow 3.5 mixed in) so the sky reflection reads on the side panes at the 40-60 degree views the stills
        // use; a thin pane seen against a lit cabin needs that to register as glass at all.
        float glassF = 0.04 + 0.96 * pow(1.0 - glassNdv, 5.0);
        float glassFr = 0.05 + 0.95 * mix(pow(1.0 - glassNdv, 5.0), pow(1.0 - glassNdv, 3.5), 0.6);
        // Fresnel-weighted mirror image of the sky / environment probe, sharp (the panes are near-specular)
        vec3 skyRefl = vec3(0.0);
        #ifdef USE_ENVMAP
          skyRefl = getIBLRadiance(glassV, glassN, 0.05) * glassFr * uEnvGain;
        #endif
        // smudge film: a broad glossy lobe around the sun's mirror direction (the haze a dirty windshield shows
        // around the sun), strongest where the film is thick; plus the sun's own mirror image as a tight lobe
        // with a small halo (the GGX term at roughness 0.06 is a sub-pixel spike that the wobble breaks up)
        vec3 filmSheen = vec3(0.0), sunGlint = vec3(0.0);
        #if NUM_DIR_LIGHTS > 0
          vec3 sunL = directionalLights[0].direction;
          float sunNdh = saturate(dot(glassN, normalize(sunL + glassV)));
          float sunFacing = saturate(dot(glassN, sunL) * 4.0);
          filmSheen = directionalLights[0].color * pow(sunNdh, 12.0) * (0.03 + dirt * 0.5) * sunFacing * (1.0 - 0.5 * inner);
          sunGlint = directionalLights[0].color * (pow(sunNdh, 2500.0) * 4.0 + pow(sunNdh, 300.0) * 0.35) * sunFacing * (0.6 + 0.4 * glassFr) * (1.0 - 0.6 * inner);
        #endif
        // the film only shows where it scatters light (sun sheen, a little of the sky reflection): as a diffuse
        // haze it would frost the panes and make them glow at night
        vec3 glassSpec = reflectedLight.directSpecular * (1.0 + dirt * 2.0) + filmSheen + sunGlint + skyRefl * (1.0 + dirt * 1.5);
        // soft knee: the sun's mirror image stays bright but never clips to white
        glassSpec = 1.0 - exp(-glassSpec);
        float glassA = clamp(diffuseColor.a + glassF * 0.85 + vig * 0.10 + dirt * 0.06, 0.0, 1.0);
        // the sun's mirror image covers what is behind the pane (alpha blending would otherwise dilute the
        // highlight to a grey smear over the cabin interior)
        float glintL = 1.0 - exp(-max(sunGlint.r, max(sunGlint.g, sunGlint.b)));
        glassA = max(glassA, glintL * 0.9);
        // the tint veil is lit by the sky only: sun on the pane must not fill it with a bright diffuse haze; the
        // dirt film scatters a little skylight (the veil the cabin side shows against the bright bay)
        vec3 glassCol = reflectedLight.indirectDiffuse * 1.5 * (diffuseColor.a + dirt * 0.22) + glassSpec * (1.0 - 0.5 * vig);
        // cabin side of the windshield: a faint mirror image of the glare shield top along the pane's bottom
        // (dark anti-glare vinyl lit by the sky) and, after dusk, the instrument backlight in the same place;
        // from outside the same glow shows through the windshield's lower half as the panel's warm spill
        float wsBottom = (vPane.z > 0.5 ? 1.0 - smoothstep(0.0, 0.5, vPaneUv.x) : 0.0);
        glassCol += inner * wsBottom * (reflectedLight.indirectDiffuse * vec3(0.30, 0.28, 0.26) + vec3(0.9, 0.62, 0.34) * uCabinGlow * 0.10);
        glassCol += (1.0 - inner) * uCabinGlow * (vec3(0.9, 0.62, 0.34) * (0.05 + 0.10 * wsBottom));
        glassA = max(glassA, saturate(uCabinGlow * (0.06 + 0.12 * wsBottom * (1.0 - inner))));
        glassCol = mix(glassCol, totalDiffuse * 0.10, seal);
        glassA = mix(glassA, 1.0, seal);
        gl_FragColor = vec4(glassCol, glassA);
      `)
      .replace('#include <premultiplied_alpha_fragment>', '');
  };
  glass.customProgramCacheKey = () => 'cockpit-glass-v10';
  const plainPaint = new THREE.MeshPhysicalMaterial({ color: LIVERY.upper, roughness: 0.4, metalness: 0.0, clearcoat: 0.6, clearcoatRoughness: 0.15 });
  const parts = partsMaterial();
  for (const m of [paint, wingPaint, floatPaint, plainPaint, parts]) withWaterBounce(m);
  // cabin lining: albedo / roughness in the fuselage layout, a tiled vinyl grain for the normals; the cabin sees
  // less of the sky than the open air, so its ambient is turned down (the sun still comes in through the glass)
  const cab = cabinMaps(layout, { front: CABIN_FRONT, rear: CABIN_REAR, sill: SILL, winTop: WIN_TOP, floor: FLOOR, door: { x0: 1.77, x1: 0.95, yBot: -0.42 }, bows: [1.81, 0.90, -0.47] });
  const cabinMat = new THREE.MeshStandardMaterial({ map: cab.map, roughnessMap: cab.roughnessMap, normalMap: cab.normalMap, normalScale: new THREE.Vector2(0.7, 0.7), roughness: 1.0, metalness: 0.0, envMapIntensity: 0.62 });
  const panelTex = panelTexture();
  const panelMat = new THREE.MeshStandardMaterial({ map: panelTex.map, emissiveMap: panelTex.emissive, emissive: 0xffffff, emissiveIntensity: 0.12, roughness: 0.75, metalness: 0.0 });
  // live instrument parts: the atlas gives the ball / card art and flat colours, the vertex shader rotates each
  // channel about its gauge centre (uInstAngle, radians CCW) after an optional shift (uInstShift, attitude pitch)
  const atlas = instrumentAtlas();
  const instMat = new THREE.MeshStandardMaterial({ map: atlas, emissiveMap: atlas, emissive: 0xffffff, emissiveIntensity: 0.15, roughness: 0.6, metalness: 0.0 });
  instMat.onBeforeCompile = (shader) => {
    shader.uniforms.uInstAngle = u.instAngle;
    shader.uniforms.uInstShift = u.instShift;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\nattribute vec3 aPivot;\nattribute float aChan;\nattribute float aClip;\nvarying vec2 vInstLocal;\nvarying float vInstClip;\nuniform float uInstAngle[${N_CHANNELS}];\nuniform vec2 uInstShift[${N_CHANNELS}];`)
      .replace('#include <begin_vertex>', /* glsl */ `
        int instCh = int(aChan + 0.5);
        float instC = cos(uInstAngle[instCh]), instS = sin(uInstAngle[instCh]);
        vec2 instQ = position.xy + uInstShift[instCh];
        vec3 transformed = vec3(aPivot.x + instC * instQ.x - instS * instQ.y, aPivot.y + instS * instQ.x + instC * instQ.y, aPivot.z + position.z);
        vInstLocal = transformed.xy - aPivot.xy;
        vInstClip = aClip;
      `);
    // dial aperture: the attitude ball is larger than its window so it can shift for pitch; clip it to the bezel
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vInstLocal;\nvarying float vInstClip;')
      .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\nif (vInstClip > 0.0 && dot(vInstLocal, vInstLocal) > vInstClip * vInstClip) discard;');
  };
  instMat.customProgramCacheKey = () => 'cockpit-instruments-v2';
  const gpsMat = new THREE.MeshStandardMaterial({ map: u.gpsTexture, emissiveMap: u.gpsTexture, emissive: 0xffffff, emissiveIntensity: 0.55, roughness: 0.25, metalness: 0.0 });
  materials.push(paint, wingPaint, floatPaint, glass, plainPaint, parts, cabinMat, panelMat, instMat, gpsMat);
  return { paint, wingPaint, floatPaint, glass, glassUniforms, plainPaint, parts, cabinMat, panelMat, instMat, gpsMat };
}
