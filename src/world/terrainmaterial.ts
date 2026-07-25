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
        varying vec3 vSplat;
        varying vec2 vGroundXZ;
        varying vec3 vGroundWorld;`,
      )
      .replace(
        '#include <begin_vertex>',
        /* glsl */ `#include <begin_vertex>
        vSplat = aSplat;
        vGroundWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;
        vGroundXZ = vGroundWorld.xz;`,
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
        ${skyUniforms ? ATMOSPHERE_GLSL : ''}

        /** Close-up detail mixed with a wide sample of the same texture. */
        vec4 groundSample(sampler2D tex, float scale, float macro) {
          vec2 uv = vGroundXZ * scale;
          vec4 near = texture2D(tex, uv);
          vec4 far = texture2D(tex, uv * 0.14 + vec2(0.37, 0.11));
          return mix(near, far, macro);
        }`,
      )
      .replace(
        '#include <map_fragment>',
        /* glsl */ `
        vec3 splat = vSplat / max(vSplat.x + vSplat.y + vSplat.z, 0.0001);
        // Distant ground loses its close-up detail: mixing towards the wide
        // sample there is what stops a hillside from strobing as you sail past.
        float groundFar = smoothstep(40.0, 260.0, length(vViewPosition));
        float macro = 0.28 + groundFar * 0.5;
        vec3 groundAlbedo =
          groundSample(map, uLayerScale.x, macro).rgb * splat.x +
          groundSample(uGrassMap, uLayerScale.y, macro).rgb * splat.y +
          groundSample(uRockMap, uLayerScale.z, macro).rgb * splat.z;
        diffuseColor.rgb *= groundAlbedo;`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        /* glsl */ `
        float roughnessFactor = roughness * (
          groundSample(roughnessMap, uLayerScale.x, macro).g * splat.x +
          groundSample(uGrassRough, uLayerScale.y, macro).g * splat.y +
          groundSample(uRockRough, uLayerScale.z, macro).g * splat.z);`,
      )
      .replace(
        '#include <normal_fragment_maps>',
        /* glsl */ `
        vec3 mapN =
          groundSample(normalMap, uLayerScale.x, macro).xyz * splat.x +
          groundSample(uGrassNormal, uLayerScale.y, macro).xyz * splat.y +
          groundSample(uRockNormal, uLayerScale.z, macro).xyz * splat.z;
        mapN = mapN * 2.0 - 1.0;
        mapN.xy *= normalScale * (1.0 - groundFar * 0.85);
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
