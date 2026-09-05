// Lighting patch for battle-scene materials (capital ships, fighters, debris). Ships are instanced and
// move, so UVs stay in object space; lighting is a sun term plus shaped fills: a dim cool starfield fill
// on up-facing normals and a warm Lambert "city glow" from Coruscant below (planetDir), so bellies read
// as warm mid-grey instead of black and the fleet looks lit by the planet it is fighting over.
//
// Balance (film-like key/fill ratio; ACES at exposure 1, bloom threshold 0.85 linear). With the hull
// albedos the ship models aim for (plating 0.62 x cream deck tint 0.95 -> ~0.55 luminance; x dark
// belly tint 0.34 -> ~0.21), measured on the Venator: a deck facing the sun lands at sRGB 198-208 with
// the brightest plates at 215-223 (no clipping), a cream vertical face in the sun's shadow at 67
// (planet glow only, bloom off; a mid-grey plate ~50) and a belly at 82-88, hue 30 degrees. The planet
// fill is shaped like the real thing: the city disc spans ~68 degrees from nadir at 120 km, so a
// vertical face receives 31 % of a belly's irradiance and a deck none.
import * as THREE from "three";

export const BATTLE_SUN_COLOR = new THREE.Color(1.0, 0.96, 0.9);
export const BATTLE_SUN_INTENSITY = 4.8;
// key light: high (48 degrees) and off the fleet's bow, so the standard views from the quarter show a
// sunlit deck over a flank lit only by the warm planet fill. Shared with the cinematic camera (imported
// there to pick a hull's sunlit side): keep this export stable.
export const BATTLE_SUN_DIR = new THREE.Vector3(-0.5, 0.74, -0.45).normalize();

let activeSun = null;

export function makeBattleSun() {
  activeSun = {
    dir: { value: BATTLE_SUN_DIR.clone() },
    color: {
      value: BATTLE_SUN_COLOR.clone().multiplyScalar(BATTLE_SUN_INTENSITY),
    },
    // faint cool starlight / space fill on up-facing normals
    fillUp: { value: new THREE.Color(0.17, 0.2, 0.28) },
    // Coruscant's city light: warm gold, strongest on down-facing normals. Saturated enough that a
    // belly still measures hue ~33 degrees after the cool shadow lift of the final pass
    // warm city fill, kept low-saturation so shadow sides read cream-grey rather than khaki
    fillDown: { value: new THREE.Color(1.15, 0.95, 0.7) },
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
    // irradiance from the glowing city disc (68 degrees from nadir at this altitude): a belly gets
    // the full glow, a vertical face 31 % of it (the integral of the half disc it sees), a deck none
    float planetLambert = 0.38 * max( toPlanet, 0.0 ) + 0.31 * ( 1.0 + toPlanet );
    vec3 fill = uFillUp * ( 0.35 + 0.65 * up ) + uFillDown * planetLambert;
    // soft cavity term: vertical faces sit between the two fills and read flat without it; a little
    // darkening there gives the shadow side a key/fill edge against the deck and the belly
    fill *= 1.0 - 0.15 * ( 1.0 - abs( nW.y ) );
    reflectedLight.indirectDiffuse += fill * BRDF_Lambert( diffuseColor.rgb );
  }`,
      );
  };
  mat.customProgramCacheKey = () => "battlepatch";
  mat.fog = false;
  if (opts.emissiveBoost) mat.emissiveIntensity *= opts.emissiveBoost;
  return mat;
}
