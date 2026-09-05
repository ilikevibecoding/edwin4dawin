// Lighting patch for battle-scene materials (capital ships, fighters, debris). Ships are instanced and
// move, so UVs stay in object space; lighting is a sun term plus shaped fills: a dim cool starfield fill
// on up-facing normals and a warm Lambert "city glow" from Coruscant below (planetDir), so bellies read
// as warm mid-grey instead of black and the fleet looks lit by the planet it is fighting over.
import * as THREE from "three";

export const BATTLE_SUN_COLOR = new THREE.Color(1.0, 0.96, 0.9);
export const BATTLE_SUN_INTENSITY = 2.3;

export function makeBattleSun() {
  return {
    dir: { value: new THREE.Vector3(-0.35, 0.55, 0.76).normalize() },
    color: {
      value: BATTLE_SUN_COLOR.clone().multiplyScalar(BATTLE_SUN_INTENSITY),
    },
    fillUp: { value: new THREE.Color(0.06, 0.07, 0.1) },
    // Coruscant's city light: warm and broad, strongest on down-facing normals
    fillDown: { value: new THREE.Color(0.62, 0.44, 0.26) },
    planetDir: { value: new THREE.Vector3(0, -1, 0) },
  };
}

/**
 * Inject the battle lighting into a MeshStandardMaterial. Keeps the material's own maps and UVs.
 * opts.emissiveBoost: multiply emissive by this (engine cores, windows)
 */
export function battlePatch(mat, sun, opts = {}) {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uSunDir = sun.dir;
    shader.uniforms.uSunColor = sun.color;
    shader.uniforms.uFillUp = sun.fillUp;
    shader.uniforms.uFillDown = sun.fillDown;
    shader.uniforms.uPlanetDir = sun.planetDir;
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        "#include <common>\nuniform vec3 uSunDir;\nuniform vec3 uSunColor;\nuniform vec3 uFillUp;\nuniform vec3 uFillDown;\nuniform vec3 uPlanetDir;",
      )
      .replace(
        "#include <lights_fragment_begin>",
        `#include <lights_fragment_begin>
  {
    IncidentLight sunLight;
    sunLight.color = uSunColor;
    sunLight.direction = normalize( ( viewMatrix * vec4( uSunDir, 0.0 ) ).xyz );
    sunLight.visible = true;
    RE_Direct( sunLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
    // shaped ambient: world-space normal for the fills
    vec3 nW = inverseTransformDirection( geometryNormal, viewMatrix );
    float up = clamp( nW.y, 0.0, 1.0 );
    float toPlanet = clamp( dot( nW, uPlanetDir ), 0.0, 1.0 );
    // a touch of glow leaks onto vertical faces too (the planet is huge below)
    float planetLambert = toPlanet * 0.85 + 0.15 * ( 1.0 - abs( nW.y ) );
    vec3 fill = uFillUp * ( 0.35 + 0.65 * up ) + uFillDown * planetLambert;
    reflectedLight.indirectDiffuse += fill * BRDF_Lambert( diffuseColor.rgb );
  }`,
      );
  };
  mat.customProgramCacheKey = () => "battlepatch";
  mat.fog = false;
  if (opts.emissiveBoost) mat.emissiveIntensity *= opts.emissiveBoost;
  return mat;
}
