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
    normalScale: new THREE.Vector2(1.0, 1.0),
    roughness: 1,
    metalness: 0,
    envMapIntensity: 1,
  });
  mat.name = 'bravo_glove';
  // UVs are in metres; tile the knit by its physical size (the leather uses a relative scale in the shader).
  mat.map.repeat.set(1 / knit.size, 1 / knit.size);
  mat.normalMap.repeat.set(1 / knit.size, 1 / knit.size);
  const leatherScale = knit.size / leather.size;
  // knit / leather normal maps blended by the mask (`leather` is declared in the map chunk, which runs first); the
  // knit stretches a little over the finger-back padding
  const normalChunk = THREE.ShaderChunk.normal_fragment_maps
    .split('texture2D( normalMap, vNormalMapUv )')
    .join('mix( texture2D( normalMap, vNormalMapUv ), texture2D( leatherNormalMap, vNormalMapUv * leatherScale ), leather )')
    .replace('mapN.xy *= normalScale;', 'mapN.xy *= normalScale * ( 1.0 - 0.35 * vDetail.x );');

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.leatherMap = { value: leather.map };
    shader.uniforms.leatherNormalMap = { value: leather.normalMap };
    shader.uniforms.leatherScale = { value: leatherScale };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 aMask;\nattribute vec3 aDetail;\nvarying vec4 vMask;\nvarying vec3 vDetail;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvMask = aMask;\nvDetail = aDetail;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform sampler2D leatherMap;\nuniform sampler2D leatherNormalMap;\nuniform float leatherScale;\nvarying vec4 vMask;\nvarying vec3 vDetail;')
      .replace(
        '#include <map_fragment>',
        [
          'vec4 knitCol = texture2D( map, vMapUv );',
          'vec4 leaCol = texture2D( leatherMap, vMapUv * leatherScale );',
          'float leaVar = clamp( ( leaCol.g - 0.002 ) * 300.0, 0.0, 1.0 );',
          // wrist panel / piping / top-stitch drawn from the signed distance to the seam line (aDetail.z, metres)
          // so the lines stay crisp regardless of the mesh density
          'float dCuff = vDetail.z;',
          'float panel = smoothstep( 0.0015, -0.0015, dCuff );',
          'float leather = max( vMask.x, panel );',
          'float piping = vMask.y * exp( -( dCuff * dCuff ) / ( 0.0011 * 0.0011 ) );',
          'float stitch = exp( -pow( ( dCuff + 0.0032 ) / 0.0005, 2.0 ) );',
          // the wrist panel is black nylon like the cuff tube it continues into: a touch lighter than the palm leather
          'leaCol.rgb *= 1.0 + 0.3 * panel;',
          'vec4 sampledDiffuseColor = mix( knitCol, leaCol, leather );',
          // finger-back padding under the knit: the fabric reads a touch darker where it is stretched over the foam
          'sampledDiffuseColor.rgb = mix( sampledDiffuseColor.rgb, knitCol.rgb * 0.8, vDetail.x * 0.35 );',
          // stitched seams where the knit back meets the leather (finger sides, fingertip caps, palm edges):
          // a dashed thread line at the mask's half-way crossing — not along the wrist panel, which has its own
          // piping + top-stitch
          'float seamLine = ( 1.0 - smoothstep( 0.0, 0.12, abs( vMask.x - 0.5 ) ) ) * ( 1.0 - vDetail.y ) * ( 1.0 - vDetail.x ) * ( 1.0 - smoothstep( 0.03, 0.25, panel ) );',
          'float seamDash = smoothstep( 0.28, 0.5, abs( fract( vMapUv.y * 500.0 ) - 0.5 ) );',
          // the top-stitch running round the wrist panel 3 mm below the piping: a coarser dash so it still resolves
          // at arm's length instead of sparkling
          'float panelDash = smoothstep( 0.3, 0.5, abs( fract( vMapUv.x * 400.0 ) - 0.5 ) );',
          'float seam = seamLine * seamDash + stitch * ( 0.3 + 0.25 * panelDash );',
          // the fabric dips into the seam on both sides of the thread
          'sampledDiffuseColor.rgb *= 1.0 - 0.35 * max( seamLine, stitch );',
          'sampledDiffuseColor.rgb = mix( sampledDiffuseColor.rgb, vec3( 0.3, 0.29, 0.26 ), seam * 0.9 );',
          // grey piping along the cuff seam, woven so it picks up a little of the knit relief
          'sampledDiffuseColor.rgb = mix( sampledDiffuseColor.rgb, vec3( 0.09, 0.093, 0.097 ) * ( 0.85 + 0.3 * knitCol.g / 0.32 ), piping );',
          'float gloveAO = 1.0 - 0.7 * ( 1.0 - vMask.z );',
          'sampledDiffuseColor.rgb *= gloveAO;',
          'diffuseColor *= sampledDiffuseColor;',
        ].join('\n'),
      )
      .replace(
        '#include <roughnessmap_fragment>',
        [
          // matte synthetic leather (the reference's black panels show no highlights in overcast light; in the plaza
          // sun a glossier value turned the thumb into a plastic sausage)
          'float leaRough = mix( 0.72 + 0.12 * leaVar, 0.85, panel );',
          'float roughnessFactor = mix( mix( 0.93, leaRough, leather ), 0.8, piping );',
          'roughnessFactor = mix( roughnessFactor, 0.85, vDetail.x );',
          'roughnessFactor = mix( roughnessFactor, 0.9, seam );',
        ].join('\n'),
      )
      .replace('#include <normal_fragment_maps>', normalChunk);
  };
  mat.customProgramCacheKey = () => 'bravo_glove_v12';
  return mat;
}

/** Matte black nylon wrist panel (weave in the normal map). */
export function makeCuffMaterial(cuff) {
  const mat = new THREE.MeshStandardMaterial({
    map: cuff.map,
    normalMap: cuff.normalMap,
    normalScale: new THREE.Vector2(0.6, 0.6),
    roughness: 0.85,
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
    specularIntensity: 0.3,
    sheen: 0.05,
    sheenRoughness: 0.7,
    sheenColor: new THREE.Color(0.8, 0.55, 0.5),
    envMapIntensity: 0.75,
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
