// Tessaru: dunes, two suns, and a lot of empty sky.

import * as THREE from 'three';
import { sandTexture, radialGlow } from '../gfx/textures.js';
import { glowPlane, paint } from '../gfx/materials.js';
import { makeNoise2D, RNG } from '../util/rng.js';
import { clamp, lerp } from '../util/math.js';

/** Displaced ground plane. Returns the mesh plus a height() sampler. */
export function dunes({
  size = 4000,
  segments = 150,
  seed = 12,
  amplitude = 34,
  ridge = 1,
  base = [206, 170, 120],
} = {}) {
  const n = makeNoise2D(seed);
  const height = (x, z) => {
    const big = n.fbm(x * 0.0009, z * 0.0009, 4) * amplitude * 2.2;
    const dune = Math.sin(x * 0.0042 + n.fbm(x * 0.0016, z * 0.0016, 3) * 3.4) * amplitude * 0.55 * ridge;
    const fine = n.fbm(x * 0.012, z * 0.012, 3) * amplitude * 0.1;
    return big + dune + fine;
  };
  const geo = new THREE.PlaneGeometry(size, size, segments, segments);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    pos.setY(i, height(pos.getX(i), pos.getZ(i)));
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  const map = sandTexture({ seed: seed + 1, base });
  map.repeat.set(18, 18);
  const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map }));
  mesh.userData.height = height;
  return mesh;
}

/** Vertical gradient sky. `stops` run from horizon (0) to zenith (1). */
export function skyDome({ radius = 9000, stops = [[0, '#f0c48a'], [0.18, '#c9a276'], [0.45, '#6e86a8'], [1, '#1e3350']] } = {}) {
  const c = document.createElement('canvas');
  c.width = 8;
  c.height = 512;
  const g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 512, 0, 0);
  for (const [p, col] of stops) grd.addColorStop(p, col);
  g.fillStyle = grd;
  g.fillRect(0, 0, 8, 512);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.62),
    new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, depthWrite: false, fog: false, toneMapped: false }),
  );
  mesh.renderOrder = -20;
  mesh.frustumCulled = false;
  return mesh;
}

/**
 * A sun: disc, bloom halo, and an optional flare streak. Positioned by
 * azimuth/elevation so scenes can just say "low and to the left".
 */
export function sun({
  color = 0xffe0a8, size = 120, halo = 7, distance = 7000, azimuth = 0, elevation = 0.2, intensity = 1,
} = {}) {
  const g = new THREE.Group();
  const y = Math.sin(elevation) * distance;
  const r = Math.cos(elevation) * distance;
  g.position.set(Math.sin(azimuth) * r, y, -Math.cos(azimuth) * r);
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(size, 28),
    new THREE.MeshBasicMaterial({ color, toneMapped: false, fog: false, depthWrite: false }),
  );
  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(size * halo, size * halo),
    glowPlane({ color, opacity: 0.85 * intensity }),
  );
  glow.material.fog = false;
  const wide = new THREE.Mesh(
    new THREE.PlaneGeometry(size * halo * 3.4, size * halo * 3.4),
    glowPlane({ color, opacity: 0.22 * intensity }),
  );
  wide.material.fog = false;
  g.add(wide, glow, disc);
  g.renderOrder = -6;
  g.onBeforeRender = (renderer, scene, camera) => g.quaternion.copy(camera.quaternion);
  g.userData.disc = disc;
  g.userData.glow = glow;
  g.userData.wide = wide;
  return g;
}

/** The pair, with the classic size/colour offset. */
export function twinSuns({ azimuth = 0.2, elevation = 0.22, separation = 0.055, distance = 7000, scale = 1, intensity = 1 } = {}) {
  const g = new THREE.Group();
  const a = sun({ color: 0xfff0c8, size: 150 * scale, halo: 7, distance, azimuth: azimuth - separation, elevation, intensity });
  const b = sun({ color: 0xffb887, size: 96 * scale, halo: 6, distance, azimuth: azimuth + separation * 1.5, elevation: elevation - separation * 0.55, intensity: intensity * 0.85 });
  g.add(a, b);
  g.userData.a = a;
  g.userData.b = b;
  return g;
}

/** Sun-coloured key + sky fill + warm ground bounce. */
export function desertLights(scene, { azimuth = 0.2, elevation = 0.35, keyColor = 0xffdcaa, keyIntensity = 3.0, skyColor = 0x8fb0d8, skyIntensity = 1.1, bounceColor = 0xd8a878, bounceIntensity = 0.8 } = {}) {
  const key = new THREE.DirectionalLight(keyColor, keyIntensity);
  const y = Math.sin(elevation);
  const r = Math.cos(elevation);
  key.position.set(Math.sin(azimuth) * r, y, -Math.cos(azimuth) * r).multiplyScalar(1000);
  const sky = new THREE.HemisphereLight(skyColor, bounceColor, skyIntensity);
  const bounce = new THREE.DirectionalLight(bounceColor, bounceIntensity);
  bounce.position.set(-Math.sin(azimuth) * r, -0.6, Math.cos(azimuth) * r).multiplyScalar(1000);
  scene.add(key, sky, bounce);
  return { key, sky, bounce };
}

/** Blowing sand: a slab of points that drifts and recycles. */
export function sandDrift({ count = 900, area = 500, height = 26, seed = 4, color = 0xe8ceac, size = 1.1 } = {}) {
  const r = new RNG(seed);
  const pos = new Float32Array(count * 3);
  const speed = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = r.float(-area, area);
    pos[i * 3 + 1] = r.float(0, height);
    pos[i * 3 + 2] = r.float(-area, area);
    speed[i] = r.float(6, 26);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({
    size, color, map: radialGlow(), transparent: true, opacity: 0.5, depthWrite: false, sizeAttenuation: true, toneMapped: false,
  }));
  pts.frustumCulled = false;
  pts.userData.update = (dt, windX = 1, windZ = 0.2) => {
    const p = geo.attributes.position.array;
    for (let i = 0; i < count; i++) {
      p[i * 3] += speed[i] * windX * dt;
      p[i * 3 + 2] += speed[i] * windZ * dt;
      if (p[i * 3] > area) p[i * 3] -= area * 2;
      if (p[i * 3 + 2] > area) p[i * 3 + 2] -= area * 2;
    }
    geo.attributes.position.needsUpdate = true;
  };
  return pts;
}

/** Scatters rocks and scrub over the dunes. */
export function scatterRocks(parent, heightFn, { count = 40, seed = 6, area = 900, scale = 1, avoid = null } = {}) {
  const r = new RNG(seed);
  const geo = new THREE.IcosahedronGeometry(1, 0);
  const mat = new THREE.MeshLambertMaterial({ color: 0x9c7448, flatShading: true });
  const inst = new THREE.InstancedMesh(geo, mat, count);
  const d = new THREE.Object3D();
  let n = 0;
  for (let i = 0; i < count; i++) {
    const x = r.float(-area, area);
    const z = r.float(-area, area);
    if (avoid && avoid(x, z)) continue;
    const s = r.float(0.6, 3.4) * scale;
    d.position.set(x, heightFn(x, z) + s * 0.3, z);
    d.rotation.set(r.float(0, 3), r.float(0, 6), r.float(0, 3));
    d.scale.set(s * r.float(0.7, 1.6), s * r.float(0.4, 1), s * r.float(0.7, 1.6));
    d.updateMatrix();
    inst.setMatrixAt(n++, d.matrix);
  }
  inst.count = n;
  inst.instanceMatrix.needsUpdate = true;
  parent.add(inst);
  return inst;
}
