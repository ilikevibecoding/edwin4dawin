// Lighting patch for battle-scene materials (capital ships, fighters, debris). Ships are instanced and
// move, so UVs stay in object space; lighting is a sun term plus shaped fills: a dim cool starfield fill
// on up-facing normals and a warm Lambert "city glow" from Coruscant below (planetDir), so bellies read
// as warm mid-grey instead of black and the fleet looks lit by the planet it is fighting over.
//
// Balance (hull albedo is ~0.2 linear: plating 0.44 x republic tint 0.48, ACES at exposure 1): a deck
// facing the sun lands near sRGB 170, a flank in the sun's shadow near 75 (planet glow only), a belly
// near 115. Measured on the venator_close view with debugAPI.capturePixels.
import * as THREE from "three";

export const BATTLE_SUN_COLOR = new THREE.Color(1.0, 0.96, 0.9);
export const BATTLE_SUN_INTENSITY = 5.4;
// key light: high (48 degrees) and from the fleet's starboard bow (Republic ships head -Z), so the
// standard views from the port quarter show a sunlit deck over a flank lit only by the warm planet fill
export const BATTLE_SUN_DIR = new THREE.Vector3(-0.5, 0.74, -0.45).normalize();

let activeSun = null;

export function makeBattleSun() {
  activeSun = {
    dir: { value: BATTLE_SUN_DIR.clone() },
    color: {
      value: BATTLE_SUN_COLOR.clone().multiplyScalar(BATTLE_SUN_INTENSITY),
    },
    // cool, dim starlight / space fill on up-facing normals
    fillUp: { value: new THREE.Color(0.55, 0.65, 0.9) },
    // Coruscant's city light: warm and broad, strongest on down-facing normals
    fillDown: { value: new THREE.Color(2.7, 1.95, 1.35) },
    planetDir: { value: new THREE.Vector3(0, -1, 0) },
  };
  return activeSun;
}

// The sun most recently created by makeBattleSun() (main.js makes it before the sky), so environment
// pieces that are built without a sun reference (moons, band) light themselves consistently.
export function getBattleSun() {
  return activeSun || makeBattleSun();
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
    float toPlanet = dot( nW, uPlanetDir );
    // the glowing city disc spans ~68 degrees from nadir at this altitude: bellies get the full glow,
    // vertical faces about 45% of it, decks only a trace from the limb
    float planetLambert = 0.45 * ( 1.0 + toPlanet ) + 0.1 * max( toPlanet, 0.0 );
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
