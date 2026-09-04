// Exterior lighting and texturing patch for MeshStandardMaterial.
//
// Every exterior material carries a sun term plus shaped ambient fills: a dim cool starfield fill on
// up-facing surfaces, a stronger cool planet-shine on down-facing ones (so the belly reads as mid grey,
// never crushed), a whisper of bounce opposite the sun, an analytic soffit occluder under the bridge
// slab overhang and the blue ion wash near the stern. In "exterior" mode (hull.js setMode) the sun term's
// colour is zeroed and a real shadow-casting DirectionalLight of the same colour lights the hull through
// the standard three.js path, so the tower and superstructure cast readable shadows; in "interior" mode
// the light is off and the sun term returns, so the interior never receives it.
// Hull materials optionally sample their textures with planar UVs derived from the *world* position
// (chosen per dominant world normal) so the plating runs continuously across the base hull, the
// instanced armour plates and the superstructure blocks with no per-instance repetition, and blend in a
// fine detail tile so close range stays crisp.
import * as THREE from "three";
import { TOWER } from "../config/shipSpec.js";

export const SUN_COLOR = new THREE.Color(1.0, 0.965, 0.915);
export const SUN_INTENSITY = 3.2;

export function makeSun() {
  return {
    dir: { value: new THREE.Vector3(-0.46, 0.38, 0.8).normalize() },
    color: { value: SUN_COLOR.clone().multiplyScalar(SUN_INTENSITY) },
    // irradiance values: starfield above is nearly black, the planet below is a broad cool source (only
    // clearly down-facing surfaces see it in full, see FILL_GLSL), and a whisper of bounce comes from
    // opposite the sun. A shadowed ventral plate lands around sRGB 85 (#55), never crushed.
    fillUp: { value: new THREE.Color(0.09, 0.1, 0.13) },
    fillDown: { value: new THREE.Color(0.68, 0.74, 0.86) },
    fillBack: { value: new THREE.Color(0.03, 0.03, 0.035) },
    // blue ion wash on aft-facing surfaces near the stern wall
    engineGlow: { value: new THREE.Color(0.5, 0.75, 1.25) },
    // bridge slab footprint for the soffit occluder (x half-width, y bottom, z0, z1)
    slab: { value: new THREE.Vector4(TOWER.slab.halfX, TOWER.slab.y0, TOWER.slab.z0, TOWER.slab.z1) },
  };
}

const FILL_GLSL = /* glsl */ `
  {
    IncidentLight sunLight;
    sunLight.color = uSunColor;
    sunLight.direction = normalize( ( viewMatrix * vec4( uSunDir, 0.0 ) ).xyz );
    sunLight.visible = true;
    RE_Direct( sunLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
    vec3 wN = inverseTransformDirection( geometryNormal, viewMatrix );
    // planet-shine: full on down-facing surfaces, a quarter on vertical faces, none on the dorsal plane
    float down = smoothstep( -0.3, 0.9, -wN.y );
    vec3 fill = mix( uFillUp, uFillDown, down );
    fill += uFillBack * clamp( dot( wN, -uSunDir ) * 0.5 + 0.5, 0.0, 1.0 );
    // soffit: ambient dies under the slab overhang (neck top, terrace decks and the slab underside)
    {
      float dx = max( abs( vHullPos.x ) - uSlab.x, 0.0 );
      float dz = max( max( uSlab.z - vHullPos.z, vHullPos.z - uSlab.w ), 0.0 );
      float below = uSlab.y - vHullPos.y;
      float occl = smoothstep( -3.0, 4.0, below ) * ( 1.0 - smoothstep( 10.0, 110.0, below ) ) * ( 1.0 - smoothstep( 0.0, 34.0, length( vec2( dx, dz ) ) ) );
      hullAO *= 1.0 - 0.8 * occl;
    }
    fill *= hullAO;
    // ion wash: aft-facing surfaces near the stern pick up the engines' blue light
    fill += uEngineGlow * smoothstep( 520.0, 800.0, vHullPos.z ) * clamp( wN.z, 0.0, 1.0 );
    reflectedLight.indirectDiffuse += fill * BRDF_Lambert( material.diffuseColor );
  }`;

// the environment / hemisphere ambient shares the soffit occlusion
const AO_GLSL = /* glsl */ `
  irradiance *= hullAO;
  iblIrradiance *= hullAO;
  radiance *= hullAO;
`;

function chunk(name) {
  return THREE.ShaderChunk[name];
}

/**
 * @param {THREE.MeshStandardMaterial} mat
 * @param {object} sun         shared uniforms from makeSun()
 * @param {object} [opts]
 * @param {number} [opts.worldTexel]  tiles per metre for world-projected UVs (omit to keep geometry UVs)
 * @param {object} [opts.detail]      { map, normalMap, scale (tiles per metre), strength }
 */
export function exteriorPatch(mat, sun, opts = {}) {
  const world = opts.worldTexel !== undefined && opts.worldTexel !== null;
  const detail = opts.detail || null;
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uSunDir = sun.dir;
    shader.uniforms.uSunColor = sun.color;
    shader.uniforms.uFillUp = sun.fillUp;
    shader.uniforms.uFillDown = sun.fillDown;
    shader.uniforms.uFillBack = sun.fillBack;
    let frag = shader.fragmentShader;
    let vert = shader.vertexShader;
    shader.uniforms.uEngineGlow = sun.engineGlow;
    shader.uniforms.uSlab = sun.slab;
    let pars = "uniform vec3 uSunDir;\nuniform vec3 uSunColor;\nuniform vec3 uFillUp;\nuniform vec3 uFillDown;\nuniform vec3 uFillBack;\nuniform vec3 uEngineGlow;\nuniform vec4 uSlab;\n";
    pars += "varying vec3 vHullPos;\nvarying vec3 vHullNormal;\n";
    vert = vert
      .replace("#include <common>", "#include <common>\nvarying vec3 vHullPos;\nvarying vec3 vHullNormal;")
      .replace(
        "#include <worldpos_vertex>",
        `#include <worldpos_vertex>
  {
    vec4 hp = vec4( transformed, 1.0 );
    #ifdef USE_INSTANCING
      hp = instanceMatrix * hp;
    #endif
    hp = modelMatrix * hp;
    vHullPos = hp.xyz;
    vHullNormal = inverseTransformDirection( transformedNormal, viewMatrix );
  }`,
      );
    if (world) {
      shader.uniforms.uHullTexel = { value: opts.worldTexel };
      pars += "uniform float uHullTexel;\n";
      let uvSetup = `
  vec2 hUv;
  {
    vec3 an = abs( normalize( vHullNormal ) );
    if ( an.y >= an.x && an.y >= an.z ) hUv = vHullPos.xz;
    else if ( an.x >= an.z ) hUv = vHullPos.zy;
    else hUv = vHullPos.xy;
    hUv *= uHullTexel;
  }`;
      frag = frag.replace("#include <clipping_planes_fragment>", "#include <clipping_planes_fragment>" + uvSetup);
      frag = frag
        .replace("#include <map_fragment>", chunk("map_fragment").replace("vMapUv", "hUv"))
        .replace("#include <roughnessmap_fragment>", chunk("roughnessmap_fragment").replace("vRoughnessMapUv", "hUv"))
        .replace("#include <metalnessmap_fragment>", chunk("metalnessmap_fragment").replace("vMetalnessMapUv", "hUv"))
        .replace("#include <emissivemap_fragment>", chunk("emissivemap_fragment").replace("vEmissiveMapUv", "hUv"))
        .replace("#include <normal_fragment_begin>", chunk("normal_fragment_begin").replace(/#if defined\( USE_NORMALMAP \)\s*vNormalMapUv/, "#if defined( USE_NORMALMAP )\n\t\t\thUv"))
        .replace("#include <normal_fragment_maps>", chunk("normal_fragment_maps").replace(/vNormalMapUv/g, "hUv"));
    }
    if (detail) {
      shader.uniforms.uDetailMap = { value: detail.map };
      shader.uniforms.uDetailNormal = { value: detail.normalMap };
      shader.uniforms.uDetailScale = { value: detail.scale / (world ? opts.worldTexel : 1) };
      shader.uniforms.uDetailStrength = { value: detail.strength ?? 1 };
      pars += "uniform sampler2D uDetailMap;\nuniform sampler2D uDetailNormal;\nuniform float uDetailScale;\nuniform float uDetailStrength;\n";
      const uvName = world ? "hUv" : "vMapUv";
      if (!world) frag = frag.replace("#include <map_fragment>", chunk("map_fragment")).replace("#include <normal_fragment_maps>", chunk("normal_fragment_maps"));
      frag = frag
        .replace(
          "diffuseColor *= sampledDiffuseColor;",
          `{
    vec3 dC = texture2D( uDetailMap, ${uvName} * uDetailScale ).rgb;
    sampledDiffuseColor.rgb *= mix( vec3( 1.0 ), dC * 2.0, uDetailStrength );
  }
  diffuseColor *= sampledDiffuseColor;`,
        )
        .replace(
          "mapN.xy *= normalScale;",
          `{
    vec3 dN = texture2D( uDetailNormal, ${uvName} * uDetailScale ).xyz * 2.0 - 1.0;
    mapN.xy += dN.xy * uDetailStrength;
  }
  mapN.xy *= normalScale;`,
        );
    }
    frag = frag
      .replace("#include <common>", "#include <common>\n" + pars)
      .replace("#include <lights_fragment_begin>", "float hullAO = 1.0;\n#include <lights_fragment_begin>" + FILL_GLSL)
      .replace("#include <lights_fragment_end>", AO_GLSL + "#include <lights_fragment_end>");
    shader.fragmentShader = frag;
    shader.vertexShader = vert;
  };
  mat.customProgramCacheKey = () => `ext_${world ? "w" : "u"}_${detail ? "d" : "n"}`;
  mat.fog = false;
  return mat;
}

// Backwards-compatible name used by the original hull skeleton.
export function sunPatch(mat, sun) {
  return exteriorPatch(mat, sun);
}
