import * as THREE from 'three';
import { getMaps } from '../core/textures';
import { ATMOSPHERE_GLSL } from './atmosphere.glsl';

/**
 * Ground shading for the islands.
 *
 * Three generated material sets - sand, grass and rock - are blended per pixel
 * using weights baked into the mesh as an `aSplat` attribute (see
 * `IslandField.buildTerrainMesh`, which derives them from height and slope).
 * Each set is sampled twice, once at its natural size and once at roughly a
 * seventh of it; mixing in the wide sample breaks the tiling that otherwise
 * turns a hillside into visible wallpaper. Normal and roughness detail fade out
 * with distance, where they would only shimmer.
 *
 * It is a `MeshStandardMaterial` underneath, so terrain still takes shadows,
 * fog and the sky radiance probe like everything else.
 */
export function terrainMaterial(skyUniforms?: Record<string, THREE.IUniform>): THREE.MeshStandardMaterial {
  const sand = getMaps('sand');
  const grass = getMaps('grass');
  const rock = getMaps('rock');

  const material = new THREE.MeshStandardMaterial({
    // The sand set is bound normally so three compiles in the map, normal-map
    // and roughness-map code paths; the injected code below does the sampling.
    map: sand.map,
    normalMap: sand.normalMap,
    roughnessMap: sand.roughnessMap,
    vertexColors: true,
    roughness: 1,
    metalness: 0,
  });
  material.normalScale.set(1, 1);

  material.onBeforeCompile = (shader) => {
    if (skyUniforms) Object.assign(shader.uniforms, skyUniforms);
    shader.uniforms.uGrassMap = { value: grass.map };
    shader.uniforms.uGrassNormal = { value: grass.normalMap };
    shader.uniforms.uGrassRough = { value: grass.roughnessMap };
    shader.uniforms.uRockMap = { value: rock.map };
    shader.uniforms.uRockNormal = { value: rock.normalMap };
    shader.uniforms.uRockRough = { value: rock.roughnessMap };
    shader.uniforms.uLayerScale = {
      value: new THREE.Vector3(1 / sand.worldScale, 1 / grass.worldScale, 1 / rock.worldScale),
    };

    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        /* glsl */ `#include <common>
        attribute vec3 aSplat;
        attribute float aShore;
        varying vec3 vSplat;
        varying vec2 vGroundXZ;
        varying vec3 vGroundWorld;
        varying float vGroundSlope;
        varying float vShore;`,
      )
      .replace(
        '#include <begin_vertex>',
        /* glsl */ `#include <begin_vertex>
        vSplat = aSplat;
        vGroundWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;
        vGroundXZ = vGroundWorld.xz;
        // Metres seaward of the waterline; negative up the beach.
        vShore = aShore;
        // Terrain is only ever translated, so the object normal is the world
        // normal. Rise over run, used to size the swash in metres of beach.
        vGroundSlope = clamp(length(objectNormal.xz) / max(objectNormal.y, 0.05), 0.004, 2.0);`,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        /* glsl */ `#include <common>
        uniform sampler2D uGrassMap;
        uniform sampler2D uGrassNormal;
        uniform sampler2D uGrassRough;
        uniform sampler2D uRockMap;
        uniform sampler2D uRockNormal;
        uniform sampler2D uRockRough;
        uniform vec3 uLayerScale;
        varying vec3 vSplat;
        varying vec2 vGroundXZ;
        varying vec3 vGroundWorld;
        varying float vGroundSlope;
        varying float vShore;
        ${skyUniforms ? ATMOSPHERE_GLSL : ''}

        /** Close-up detail mixed with a wide sample of the same texture. */
        vec4 groundSample(sampler2D tex, float scale, float macro) {
          vec2 uv = vGroundXZ * scale;
          vec4 near = texture2D(tex, uv);
          vec4 far = texture2D(tex, uv * 0.14 + vec2(0.37, 0.11));
          return mix(near, far, macro);
        }

        /**
         * How wet the sand is and how much foam is lying on it, as a function of
         * distance up the beach from the waterline.
         *
         * Measured in metres of beach, which is the whole point: the swash runs a
         * few metres up the sand and no further, whatever the sand is doing
         * underneath. Sized by height above sea level instead - which is what
         * this used to do - the same figure is a tight line on a steep cove and a
         * wash halfway up a flat one, and the flat case is what put a soft grey
         * band ten metres deep along every shore in the game.
         *
         * The set timing is shared verbatim with the ocean's breaker line just
         * offshore, so the two halves of the tideline move together.
         */
        vec2 tideline(float up) {
          float lace = fbm2Cheap(vGroundXZ * 0.42 + vec2(uTime * 0.05, 0.0));
          float sets = 0.55 + 0.45 * sin(uTime * 0.43 + lace * 6.3);
          // How far up the sand this set has thrown its sheet of water. Steep
          // beaches take it less far, since the water is climbing harder.
          float reach = mix(4.5, 1.6, smoothstep(0.05, 0.5, vGroundSlope)) * (0.45 + 0.75 * sets + lace * 0.35);
          // Wet sand stays dark long after the sheet has drained off it, and the
          // high-water mark of the biggest set of the last few minutes is the
          // line it dries back to.
          float wet = 1.0 - smoothstep(reach * 0.9, reach * 2.0, up);
          // A bright line at the top of the run with torn lace lying behind it,
          // and nothing at all above it.
          float band = reach * 0.22;
          float edge = exp(-pow((up - reach) / band, 2.0));
          float behind = 1.0 - smoothstep(reach - band, reach, up);
          float lacy = smoothstep(0.4, 0.74, fbm2Cheap(vGroundXZ * 1.15 + vec2(uTime * 0.35, uTime * 0.12)));
          // Below the waterline the sea is drawing its own foam over this, so
          // hand the job over rather than doubling it up.
          float own = smoothstep(-0.6, 0.4, up);
          return vec2(
            clamp(wet, 0.0, 1.0),
            clamp(edge * 0.75 + behind * lacy * 0.45, 0.0, 1.0) * own);
        }`,
      )
      .replace(
        '#include <map_fragment>',
        /* glsl */ `
        // Ground cover is decided per vertex, and the mesh has a vertex every five
        // metres, so a linear blend between two covers puts a five-metre sawtooth
        // along the top of every beach. Pushing the weights about with a fine
        // noise field first turns that boundary into a ragged, organic edge with
        // sand running up into the grass in tongues, at no cost in vertices.
        vec3 splat = vSplat;
        float ragged = fbm2Cheap(vGroundXZ * 0.55) + fbm2Cheap(vGroundXZ * 2.3) * 0.4;
        splat.x = max(0.0, splat.x + (ragged - 0.65) * 0.55);
        splat.y = max(0.0, splat.y + (0.68 - ragged) * 0.55);
        splat = splat / max(splat.x + splat.y + splat.z, 0.0001);
        // Distant ground loses its close-up detail: mixing towards the wide
        // sample there is what stops a hillside from strobing as you sail past.
        float groundFar = smoothstep(40.0, 260.0, length(vViewPosition));
        float macro = 0.28 + groundFar * 0.5;
        vec3 groundAlbedo =
          groundSample(map, uLayerScale.x, macro).rgb * splat.x +
          groundSample(uGrassMap, uLayerScale.y, macro).rgb * splat.y +
          groundSample(uRockMap, uLayerScale.z, macro).rgb * splat.z;
        // Tideline. Only the bare ground at the water's edge takes it, so the
        // swash never climbs into the scrub behind the beach. The cutoff is well
        // past the furthest any set can reach, so the branch cannot draw a line
        // of its own across the sand.
        vec2 tide = -vShore < 16.0
          ? tideline(-vShore) * (splat.x + splat.z * 0.5)
          : vec2(0.0);
        // Wet sand is darker and more saturated than dry, and the film of water
        // on it is what makes a beach glare when the sun is low.
        groundAlbedo *= mix(1.0, 0.56, tide.x);
        groundAlbedo = mix(groundAlbedo, vec3(0.88, 0.93, 0.95), tide.y * 0.8);
        diffuseColor.rgb *= groundAlbedo;`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        /* glsl */ `
        float roughnessFactor = roughness * (
          groundSample(roughnessMap, uLayerScale.x, macro).g * splat.x +
          groundSample(uGrassRough, uLayerScale.y, macro).g * splat.y +
          groundSample(uRockRough, uLayerScale.z, macro).g * splat.z);
        // A wet beach is a mirror; foam on top of it is not.
        roughnessFactor = mix(roughnessFactor, 0.16, tide.x * 0.85);
        roughnessFactor = mix(roughnessFactor, 0.7, tide.y);`,
      )
      .replace(
        '#include <normal_fragment_maps>',
        /* glsl */ `
        vec3 mapN =
          groundSample(normalMap, uLayerScale.x, macro).xyz * splat.x +
          groundSample(uGrassNormal, uLayerScale.y, macro).xyz * splat.y +
          groundSample(uRockNormal, uLayerScale.z, macro).xyz * splat.z;
        mapN = mapN * 2.0 - 1.0;
        // The film of water fills in the ripples it is running over.
        mapN.xy *= normalScale * (1.0 - groundFar * 0.85) * (1.0 - tide.x * 0.55);
        normal = normalize(tbn * mapN);`,
      );

    if (skyUniforms) {
      // The same cloud field that is drawn overhead also shades the ground, so
      // an island darkens as a cumulus drifts across it.
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <lights_fragment_end>',
        /* glsl */ `#include <lights_fragment_end>
        float groundCloud = cloudShadow(vGroundWorld);
        reflectedLight.directDiffuse *= groundCloud;
        reflectedLight.directSpecular *= groundCloud;`,
      );
    }
  };

  // Any change to the injected code needs a fresh program.
  material.customProgramCacheKey = () => `terrain-splat-${skyUniforms ? 'sky' : 'plain'}`;
  return material;
}
