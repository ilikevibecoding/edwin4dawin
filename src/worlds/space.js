// Deep space: stars, nebula backdrop, distant suns and the standard space
// lighting rig that every orbital sequence starts from.

import * as THREE from 'three';
import { nebulaTexture, starSprite, radialGlow } from '../gfx/textures.js';
import { glowPlane } from '../gfx/materials.js';
import { RNG } from '../util/rng.js';

/** Points-based starfield on a sphere shell. Cheap, and it twinkles. */
export function starfield({ count = 2600, radius = 40000, seed = 5, size = 2.2, spread = 0.25 } = {}) {
  const r = new RNG(seed);
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const p = { x: 0, y: 0, z: 0 };
  for (let i = 0; i < count; i++) {
    r.onSphere(p);
    const d = radius * (1 - r.next() * spread);
    pos[i * 3] = p.x * d;
    pos[i * 3 + 1] = p.y * d;
    pos[i * 3 + 2] = p.z * d;
    const b = r.float(0.3, 1) ** 1.7;
    const tint = r.next();
    const c = tint < 0.12 ? [0.72, 0.82, 1] : tint > 0.9 ? [1, 0.86, 0.72] : [1, 1, 1];
    col[i * 3] = c[0] * b;
    col[i * 3 + 1] = c[1] * b;
    col[i * 3 + 2] = c[2] * b;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const mat = new THREE.PointsMaterial({
    size,
    map: starSprite(),
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: false,
    toneMapped: false,
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  pts.renderOrder = -10;
  return pts;
}

/** Inside-out sky sphere carrying the painted nebula. */
export function nebulaSky({ radius = 60000, seed = 77, opacity = 1, hueA, hueB, density = 1 } = {}) {
  const tex = nebulaTexture({ seed, hueA, hueB, density });
  const geo = new THREE.SphereGeometry(radius, 32, 20);
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    transparent: opacity < 1,
    opacity,
    toneMapped: false,
  });
  const sky = new THREE.Mesh(geo, mat);
  sky.renderOrder = -20;
  sky.frustumCulled = false;
  return sky;
}

/** A distant sun: bright disc plus a soft halo, always facing the camera. */
export function sunBillboard({ color = 0xfff0d0, size = 900, glowSize = 5, distance = 30000, dir = [0.4, 0.2, -1] } = {}) {
  const g = new THREE.Group();
  const d = new THREE.Vector3(dir[0], dir[1], dir[2]).normalize().multiplyScalar(distance);
  g.position.copy(d);
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(size, 32),
    new THREE.MeshBasicMaterial({ color, toneMapped: false, fog: false, depthWrite: false }),
  );
  const halo = new THREE.Mesh(
    new THREE.PlaneGeometry(size * glowSize, size * glowSize),
    glowPlane({ color, opacity: 0.75 }),
  );
  halo.material.fog = false;
  g.add(halo, disc);
  g.renderOrder = -5;
  g.onBeforeRender = (renderer, scene, camera) => g.quaternion.copy(camera.quaternion);
  return g;
}

/** Key/fill/rim rig used by the space sequences. */
export function spaceLights(scene, { key = 0xfff1dd, keyIntensity = 2.4, fill = 0x35507a, fillIntensity = 0.65, ambient = 0x1a2434, ambientIntensity = 1.0, keyDir = [1, 0.65, 0.55], fillDir = [-1, -0.2, -0.7] } = {}) {
  const amb = new THREE.AmbientLight(ambient, ambientIntensity);
  const k = new THREE.DirectionalLight(key, keyIntensity);
  k.position.set(...keyDir).normalize().multiplyScalar(1000);
  const f = new THREE.DirectionalLight(fill, fillIntensity);
  f.position.set(...fillDir).normalize().multiplyScalar(1000);
  scene.add(amb, k, f);
  return { amb, key: k, fill: f };
}

/**
 * Debris field / asteroid dust used after the station goes up: instanced chunks
 * with per-instance tumble.
 */
export function debrisField({ count = 260, radius = 900, seed = 3, size = [1, 8], material }) {
  const r = new RNG(seed);
  const geo = new THREE.IcosahedronGeometry(1, 0);
  const mesh = new THREE.InstancedMesh(geo, material, count);
  const dummy = new THREE.Object3D();
  const spin = [];
  const pos = [];
  for (let i = 0; i < count; i++) {
    const p = r.onSphere({});
    const d = radius * (0.2 + r.next() ** 0.6);
    pos.push([p.x * d, p.y * d * 0.6, p.z * d]);
    spin.push([r.float(-1, 1), r.float(-1, 1), r.float(-1, 1), r.float(size[0], size[1])]);
  }
  mesh.userData.update = (t) => {
    for (let i = 0; i < count; i++) {
      dummy.position.set(pos[i][0], pos[i][1], pos[i][2]);
      dummy.rotation.set(spin[i][0] * t, spin[i][1] * t, spin[i][2] * t);
      dummy.scale.setScalar(spin[i][3]);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  };
  mesh.userData.update(0);
  mesh.frustumCulled = false;
  return mesh;
}
