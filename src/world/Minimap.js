import * as THREE from 'three';

/**
 * Top-down minimap: render the world once from an orthographic camera into a render target and copy
 * the pixels onto a canvas. Returns `{ center, size, image }` (size = meters covered by the square
 * canvas), which the HUD and killstreak targeting map world XZ → pixels with.
 *
 * The scene materials carry the CSM shader hooks (cascade splits tied to the player camera), so
 * rendering them from an unrelated ortho camera gives garbage shadows. Instead we build a throwaway
 * scene of clones sharing the same geometry but with plain Lambert materials (albedo map + tint +
 * vertex colors), lit by our own sun + hemisphere light with a single shadow map. The clones are
 * disposed right after the render; only the canvas survives.
 */
export function renderMinimap(game, root, { center, size, resolution = 1024, sunDirection = null } = {}) {
  const renderer = game.render?.renderer;
  const canvas = document.createElement('canvas');
  canvas.width = resolution;
  canvas.height = resolution;
  if (!renderer) return { center: center.clone(), size, image: null };

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a2a3a); // sea-ish fill where nothing is rendered
  const matCache = new Map();
  const disposables = [];

  const convert = (src) => {
    if (!src) return null;
    if (matCache.has(src)) return matCache.get(src);
    const m = new THREE.MeshLambertMaterial({
      map: src.map || null,
      color: src.color ? src.color.clone() : new THREE.Color(0xffffff),
      vertexColors: !!src.vertexColors,
      transparent: !!src.transparent && !src.alphaTest,
      opacity: src.opacity ?? 1,
      alphaTest: src.alphaTest || 0,
      side: src.side ?? THREE.FrontSide,
      depthWrite: src.depthWrite ?? true,
    });
    if (src.emissive && src.emissiveIntensity > 0) m.emissive.copy(src.emissive).multiplyScalar(Math.min(src.emissiveIntensity, 1) * 0.3);
    // Water reads as a flat blue on the map, glass as dark.
    if (src.userData?.minimapColor) m.color.set(src.userData.minimapColor);
    matCache.set(src, m);
    disposables.push(m);
    return m;
  };

  root.updateMatrixWorld(true);
  root.traverse((o) => {
    if (!o.isMesh || !o.visible || o.userData.noMinimap) return;
    let clone;
    if (o.isInstancedMesh) {
      clone = new THREE.InstancedMesh(o.geometry, convert(o.material), o.count);
      clone.instanceMatrix.copy(o.instanceMatrix);
      if (o.instanceColor) clone.instanceColor = o.instanceColor;
    } else {
      const mat = Array.isArray(o.material) ? o.material.map(convert) : convert(o.material);
      clone = new THREE.Mesh(o.geometry, mat);
    }
    clone.matrixAutoUpdate = false;
    clone.matrix.copy(o.matrixWorld);
    clone.matrixWorld.copy(o.matrixWorld);
    clone.castShadow = true;
    clone.receiveShadow = true;
    clone.frustumCulled = false;
    if (o.customDepthMaterial) clone.customDepthMaterial = o.customDepthMaterial;
    scene.add(clone);
  });

  // Lighting: hemisphere for soft fill, one directional sun with a shadow camera covering the map.
  scene.add(new THREE.HemisphereLight(0xbfd6ee, 0x6a5a48, 1.15));
  const sunDir = (sunDirection || new THREE.Vector3(-0.5, 0.75, 0.45)).clone().normalize();
  const sun = new THREE.DirectionalLight(0xfff1dc, 2.1);
  sun.position.copy(sunDir).multiplyScalar(size);
  sun.target.position.set(center.x, 0, center.z);
  sun.position.add(sun.target.position);
  sun.castShadow = !!renderer.shadowMap.enabled;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera;
  sc.left = -size * 0.75;
  sc.right = size * 0.75;
  sc.top = size * 0.75;
  sc.bottom = -size * 0.75;
  sc.near = 1;
  sc.far = size * 2.5;
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.05;
  scene.add(sun, sun.target);

  const cam = new THREE.OrthographicCamera(-size / 2, size / 2, size / 2, -size / 2, 1, 200);
  cam.position.set(center.x, 120, center.z);
  cam.up.set(0, 0, -1); // north (-Z) at the top of the image
  cam.lookAt(center.x, 0, center.z);
  cam.updateMatrixWorld(true);

  const rt = new THREE.WebGLRenderTarget(resolution, resolution, {
    colorSpace: THREE.SRGBColorSpace,
    depthBuffer: true,
    samples: 0,
  });

  const prevTarget = renderer.getRenderTarget();
  const prevAutoClear = renderer.autoClear;
  const prevToneMapping = renderer.toneMapping;
  const prevShadowAutoUpdate = renderer.shadowMap.autoUpdate;
  try {
    renderer.shadowMap.autoUpdate = true;
    renderer.shadowMap.needsUpdate = true;
    renderer.autoClear = true;
    renderer.setRenderTarget(rt);
    renderer.clear();
    renderer.render(scene, cam);

    const px = new Uint8Array(resolution * resolution * 4);
    renderer.readRenderTargetPixels(rt, 0, 0, resolution, resolution, px);
    const ctx = canvas.getContext('2d');
    const img = ctx.createImageData(resolution, resolution);
    const row = resolution * 4;
    for (let y = 0; y < resolution; y++) {
      // WebGL rows are bottom-up; canvas rows top-down.
      img.data.set(px.subarray((resolution - 1 - y) * row, (resolution - y) * row), y * row);
    }
    // Force opaque alpha; the render target alpha is whatever the clear left behind.
    for (let i = 3; i < img.data.length; i += 4) img.data[i] = 255;
    ctx.putImageData(img, 0, 0);
  } catch (err) {
    console.warn('[world] minimap render failed:', err);
  } finally {
    renderer.setRenderTarget(prevTarget);
    renderer.autoClear = prevAutoClear;
    renderer.toneMapping = prevToneMapping;
    renderer.shadowMap.autoUpdate = prevShadowAutoUpdate;
    rt.dispose();
    sun.shadow.dispose?.();
    for (const m of disposables) m.dispose();
  }

  return { center: center.clone(), size, image: canvas };
}
