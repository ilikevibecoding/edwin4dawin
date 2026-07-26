import * as THREE from 'three';
import { Engine } from './core/Engine';
import { Settings } from './core/Settings';
import { LightingSystem } from './render/Lighting';
import { RenderSystem } from './render/RenderSystem';
import { MaterialLibrary } from './render/textures/MaterialLibrary';
import { isCaptureMode, requestedShot, markReady, settle } from './dev/Capture';
import { SKY_PRESETS } from './render/Sky';

async function boot() {
  const container = document.getElementById('app')!;
  const capture = isCaptureMode();

  const settings = new Settings({
    quality: capture ? 'cinematic' : Settings.autoDetect(),
  });

  const engine = new Engine({ container, settings, capture });
  const materials = new MaterialLibrary(engine.renderer, {
    size: capture ? 1024 : 512,
  });
  engine.provide('materials', materials);

  engine.add(new LightingSystem());
  engine.add(new RenderSystem());

  await engine.init();

  buildTestScene(engine, materials);

  (window as any).__GAME__ = engine;

  if (capture) {
    const shot = requestedShot();
    engine.camera.position.set(6, 2.4, 10);
    engine.camera.lookAt(0, 1.4, 0);
    await settle(engine, 0.5);
    engine.step(1 / 30);
    markReady({
      shot,
      drawCalls: engine.renderer.info.render.calls,
      triangles: engine.renderer.info.render.triangles,
      programs: engine.renderer.info.programs?.length ?? 0,
      textures: materials.stats,
    });
  } else {
    engine.start();
  }
}

/** Temporary material/lighting validation scene — replaced by the real level. */
function buildTestScene(engine: Engine, materials: MaterialLibrary) {
  const scene = engine.scene;

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200, 1, 1),
    materials.get('asphalt')
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  applyUvScale(ground, 200, materials.worldSizeOf('asphalt'));
  scene.add(ground);

  const kinds: Array<Parameters<MaterialLibrary['get']>[0]> = [
    'concrete_cast',
    'brick_clay',
    'metal_rusted',
    'plaster_painted',
    'wood_plank',
    'sandbag',
    'corrugated_metal',
    'metal_painted',
  ];

  kinds.forEach((kind, i) => {
    const col = i % 4;
    const row = Math.floor(i / 4);
    const geo = new THREE.BoxGeometry(2.2, 2.6, 2.2);
    scaleBoxUvs(geo, 2.2, 2.6, 2.2, materials.worldSizeOf(kind));
    const mesh = new THREE.Mesh(geo, materials.get(kind));
    mesh.position.set((col - 1.5) * 3.2, 1.3, row * -3.6);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
  });

  // A tall wall so we can judge shadow quality and grazing-angle normals.
  const wallGeo = new THREE.BoxGeometry(24, 7, 0.6);
  scaleBoxUvs(wallGeo, 24, 7, 0.6, materials.worldSizeOf('brick_clay'));
  const wall = new THREE.Mesh(wallGeo, materials.get('brick_clay'));
  wall.position.set(0, 3.5, -12);
  wall.castShadow = true;
  wall.receiveShadow = true;
  scene.add(wall);

  // A thin pole and a low box give unambiguous ground shadows to judge.
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.09, 5, 12),
    materials.get('metal_painted')
  );
  pole.position.set(-5.5, 2.5, 3);
  pole.castShadow = true;
  scene.add(pole);

  const focusTargets: THREE.Object3D[] = [];
  scene.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) focusTargets.push(o);
  });
  engine.provide('focusTargets', focusTargets);

  const lighting = engine.get<LightingSystem>('lighting');
  lighting.applyPreset(SKY_PRESETS.desert_noon);
  engine.get<RenderSystem>('render').syncToSky();
}

function applyUvScale(mesh: THREE.Mesh, worldSize: number, tileWorldSize: number) {
  const uv = mesh.geometry.getAttribute('uv') as THREE.BufferAttribute;
  const s = worldSize / tileWorldSize;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * s, uv.getY(i) * s);
  uv.needsUpdate = true;
}

/**
 * BoxGeometry UVs are 0..1 per face regardless of face size, which stretches
 * tiled materials. Rescale each face by its real-world dimensions so texel
 * density is uniform across the whole box.
 */
function scaleBoxUvs(
  geo: THREE.BoxGeometry,
  w: number,
  h: number,
  d: number,
  tile: number
) {
  const uv = geo.getAttribute('uv') as THREE.BufferAttribute;
  // BoxGeometry face order: +X, -X, +Y, -Y, +Z, -Z — 4 verts each.
  const spans: Array<[number, number]> = [
    [d, h],
    [d, h],
    [w, d],
    [w, d],
    [w, h],
    [w, h],
  ];
  for (let face = 0; face < 6; face++) {
    const [su, sv] = spans[face];
    for (let i = 0; i < 4; i++) {
      const idx = face * 4 + i;
      uv.setXY(idx, (uv.getX(idx) * su) / tile, (uv.getY(idx) * sv) / tile);
    }
  }
  uv.needsUpdate = true;
}

boot().catch((err) => {
  console.error('[boot] fatal:', err);
  document.body.innerHTML = `<pre style="color:#f66;padding:24px;font:14px monospace;white-space:pre-wrap">${
    err?.stack ?? err
  }</pre>`;
  (window as any).__CAPTURE_READY__ = true;
});
