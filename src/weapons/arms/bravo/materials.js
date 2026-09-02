import * as THREE from 'three';

/**
 * Materials for the bravo arms. The glove is a MeshStandardMaterial whose shader mixes the olive knit and the
 * black leather texture sets by the per-vertex `aMask` attribute (x = leather, z = baked AO), so the knit/leather
 * boundary follows the hand's shape smoothly instead of a triangle-hard material split. Everything stays a
 * MeshStandardMaterial so the render system's cascaded shadows hook in as usual.
 */

export function makeGloveMaterial(knit, leather) {
  const mat = new THREE.MeshStandardMaterial({
    map: knit.map,
    normalMap: knit.normalMap,
    normalScale: new THREE.Vector2(0.75, 0.75),
    roughness: 1,
    metalness: 0,
    envMapIntensity: 1,
  });
  mat.name = 'bravo_glove';
  // UVs are in metres; tile the knit by its physical size (the leather uses a relative scale in the shader).
  mat.map.repeat.set(1 / knit.size, 1 / knit.size);
  mat.normalMap.repeat.set(1 / knit.size, 1 / knit.size);
  const leatherScale = knit.size / leather.size;
  const normalChunk = THREE.ShaderChunk.normal_fragment_maps
    .split('texture2D( normalMap, vNormalMapUv )')
    .join('mix( texture2D( normalMap, vNormalMapUv ), texture2D( leatherNormalMap, vNormalMapUv * leatherScale ), vMask.x )');

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.leatherMap = { value: leather.map };
    shader.uniforms.leatherNormalMap = { value: leather.normalMap };
    shader.uniforms.leatherScale = { value: leatherScale };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 aMask;\nvarying vec4 vMask;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvMask = aMask;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform sampler2D leatherMap;\nuniform sampler2D leatherNormalMap;\nuniform float leatherScale;\nvarying vec4 vMask;')
      .replace(
        '#include <map_fragment>',
        [
          'vec4 knitCol = texture2D( map, vMapUv );',
          'vec4 leaCol = texture2D( leatherMap, vMapUv * leatherScale );',
          'float leaVar = clamp( ( leaCol.g - 0.002 ) * 300.0, 0.0, 1.0 );',
          // the wrist panel is charcoal neoprene: a touch lighter than the palm leather
          'leaCol.rgb *= 1.0 + 0.9 * vMask.w;',
          'vec4 sampledDiffuseColor = mix( knitCol, leaCol, vMask.x );',
          // grey piping along the cuff seam (aMask.y), woven so it picks up the knit relief
          'sampledDiffuseColor.rgb = mix( sampledDiffuseColor.rgb, vec3( 0.17, 0.175, 0.18 ) * ( 0.6 + 0.8 * knitCol.g / 0.42 ), vMask.y );',
          'float gloveAO = 1.0 - 0.7 * ( 1.0 - vMask.z );',
          'sampledDiffuseColor.rgb *= gloveAO;',
          'diffuseColor *= sampledDiffuseColor;',
        ].join('\n'),
      )
      .replace(
        '#include <roughnessmap_fragment>',
        [
          'float leaRough = mix( 0.58 + 0.14 * leaVar, 0.8, vMask.w );',
          'float roughnessFactor = mix( mix( 0.93, leaRough, vMask.x ), 0.8, vMask.y );',
        ].join('\n'),
      )
      .replace('#include <normal_fragment_maps>', normalChunk);
  };
  mat.customProgramCacheKey = () => 'bravo_glove_v4';
  return mat;
}

export function makeCuffMaterial(cuff) {
  const mat = new THREE.MeshStandardMaterial({
    map: cuff.map,
    normalMap: cuff.normalMap,
    normalScale: new THREE.Vector2(0.6, 0.6),
    roughness: 0.8,
    metalness: 0,
  });
  mat.name = 'bravo_cuff';
  return mat;
}

export function makeSkinMaterial(skin) {
  const mat = new THREE.MeshStandardMaterial({
    map: skin.map,
    normalMap: skin.normalMap,
    normalScale: new THREE.Vector2(0.35, 0.35),
    roughness: 0.62,
    metalness: 0,
  });
  mat.map.repeat.set(1 / skin.size, 1 / skin.size);
  mat.normalMap.repeat.set(1 / skin.size, 1 / skin.size);
  mat.name = 'bravo_skin';
  return mat;
}

export function makeSleeveMaterial(camo) {
  const mat = new THREE.MeshStandardMaterial({
    map: camo.map,
    normalMap: camo.normalMap,
    normalScale: new THREE.Vector2(0.9, 0.9),
    roughness: 0.95,
    metalness: 0,
  });
  mat.map.repeat.set(1 / camo.size, 1 / camo.size);
  mat.normalMap.repeat.set(1 / camo.size, 1 / camo.size);
  mat.name = 'bravo_sleeve';
  return mat;
}
