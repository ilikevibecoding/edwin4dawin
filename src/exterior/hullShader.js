// Exterior lighting and texturing patch for MeshStandardMaterial.
//
// The exterior never uses scene lights: every exterior material carries its own sun term (so the interior
// receives no stray sunlight and no shadow map is needed) plus a faint cool fill so shadowed faces read
// as dark grey instead of pitch black. Hull materials optionally sample their textures with planar UVs
// derived from the *world* position (chosen per dominant world normal) so the plating runs continuously
// across the base hull, the instanced armour plates and the superstructure blocks with no per-instance
// repetition, and blend in a fine detail tile so close range stays crisp.
import * as THREE from "three";

export function makeSun() {
  return {
    dir: { value: new THREE.Vector3(-0.46, 0.38, 0.8).normalize() },
    color: { value: new THREE.Color(1.0, 0.965, 0.915).multiplyScalar(3.2) },
    // cool starfield fill from above, faint planet-shine from below, a whisper of bounce opposite the sun
    // (irradiance values; a fully shadowed face ends up around sRGB 60, never pitch black)
    fillUp: { value: new THREE.Color(0.13, 0.15, 0.2) },
    fillDown: { value: new THREE.Color(0.08, 0.09, 0.12) },
    fillBack: { value: new THREE.Color(0.045, 0.045, 0.05) },
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
    float sky = wN.y * 0.5 + 0.5;
    vec3 fill = mix( uFillDown, uFillUp, sky );
    fill += uFillBack * clamp( dot( wN, -uSunDir ) * 0.5 + 0.5, 0.0, 1.0 );
    reflectedLight.indirectDiffuse += fill * BRDF_Lambert( material.diffuseColor );
  }`;

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
    let pars = "uniform vec3 uSunDir;\nuniform vec3 uSunColor;\nuniform vec3 uFillUp;\nuniform vec3 uFillDown;\nuniform vec3 uFillBack;\n";
    if (world) {
      shader.uniforms.uHullTexel = { value: opts.worldTexel };
      pars += "uniform float uHullTexel;\nvarying vec3 vHullPos;\nvarying vec3 vHullNormal;\n";
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
    frag = frag.replace("#include <common>", "#include <common>\n" + pars).replace("#include <lights_fragment_begin>", "#include <lights_fragment_begin>" + FILL_GLSL);
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
