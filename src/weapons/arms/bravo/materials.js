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
  // knit / leather normal maps blended by the mask; the rubber pads are smooth (knit relief flattened)
  const normalChunk = THREE.ShaderChunk.normal_fragment_maps
    .split('texture2D( normalMap, vNormalMapUv )')
    .join('mix( texture2D( normalMap, vNormalMapUv ), texture2D( leatherNormalMap, vNormalMapUv * leatherScale ), vMask.x )')
    .replace('mapN.xy *= normalScale;', 'mapN.xy *= normalScale * ( 1.0 - 0.85 * vDetail.x );');

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.leatherMap = { value: leather.map };
    shader.uniforms.leatherNormalMap = { value: leather.normalMap };
    shader.uniforms.leatherScale = { value: leatherScale };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 aMask;\nattribute vec2 aDetail;\nvarying vec4 vMask;\nvarying vec2 vDetail;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvMask = aMask;\nvDetail = aDetail;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform sampler2D leatherMap;\nuniform sampler2D leatherNormalMap;\nuniform float leatherScale;\nvarying vec4 vMask;\nvarying vec2 vDetail;')
      .replace(
        '#include <map_fragment>',
        [
          'vec4 knitCol = texture2D( map, vMapUv );',
          'vec4 leaCol = texture2D( leatherMap, vMapUv * leatherScale );',
          'float leaVar = clamp( ( leaCol.g - 0.002 ) * 300.0, 0.0, 1.0 );',
          // the wrist panel is charcoal neoprene: a touch lighter than the palm leather
          'leaCol.rgb *= 1.0 + 0.9 * vMask.w;',
          'vec4 sampledDiffuseColor = mix( knitCol, leaCol, vMask.x );',
          // rubber knuckle pads: dark olive-black with the leather's grain
          'vec3 padCol = vec3( 0.042, 0.047, 0.036 ) * ( 0.8 + 0.4 * leaVar );',
          'sampledDiffuseColor.rgb = mix( sampledDiffuseColor.rgb, padCol, vDetail.x );',
          // stitched seams where the knit back meets the leather (finger sides, fingertip caps, palm edges):
          // a dashed thread line at the mask's half-way crossing
          'float seamLine = ( 1.0 - smoothstep( 0.0, 0.12, abs( vMask.x - 0.5 ) ) ) * ( 1.0 - vDetail.y ) * ( 1.0 - vDetail.x );',
          'float seamDash = smoothstep( 0.28, 0.5, abs( fract( vMapUv.y * 625.0 ) - 0.5 ) );',
          // ...and where the palm leather is sewn onto the wrist panel (the piping covers that seam on the back)
          'float panelLine = ( 1.0 - smoothstep( 0.0, 0.14, abs( vMask.w - 0.5 ) ) ) * ( 1.0 - vMask.y ) * vMask.x;',
          'float panelDash = smoothstep( 0.28, 0.5, abs( fract( vMapUv.x * 625.0 ) - 0.5 ) );',
          'float seam = seamLine * seamDash + panelLine * panelDash;',
          // the fabric dips into the seam on both sides of the thread
          'sampledDiffuseColor.rgb *= 1.0 - 0.35 * max( seamLine, panelLine );',
          'sampledDiffuseColor.rgb = mix( sampledDiffuseColor.rgb, vec3( 0.4, 0.38, 0.34 ), seam * 0.9 );',
          // grey piping along the cuff seam (aMask.y), woven so it picks up the knit relief
          'sampledDiffuseColor.rgb = mix( sampledDiffuseColor.rgb, vec3( 0.115, 0.12, 0.125 ) * ( 0.6 + 0.8 * knitCol.g / 0.42 ), vMask.y );',
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
          'roughnessFactor = mix( roughnessFactor, 0.62, vDetail.x );',
          'roughnessFactor = mix( roughnessFactor, 0.9, seam );',
        ].join('\n'),
      )
      .replace('#include <normal_fragment_maps>', normalChunk);
  };
  mat.customProgramCacheKey = () => 'bravo_glove_v6';
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

/**
 * Bare forearm skin: unwrapped albedo / normal / roughness maps (see textures.makeSkin), dielectric F0 a little
 * below the default (skin ≈ 0.028) and a soft warm sheen standing in for the peach-fuzz / subsurface glow along
 * grazing angles. Roughness comes from the map (≈ 0.55–0.65 with pore variation).
 */
export function makeSkinMaterial(skin) {
  const mat = new THREE.MeshPhysicalMaterial({
    map: skin.map,
    normalMap: skin.normalMap,
    normalScale: new THREE.Vector2(0.55, 0.55),
    roughnessMap: skin.roughnessMap,
    roughness: 1,
    metalness: 0,
    specularIntensity: 0.45,
    sheen: 0.14,
    sheenRoughness: 0.65,
    sheenColor: new THREE.Color(0.8, 0.55, 0.5),
    envMapIntensity: 0.8,
  });
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
