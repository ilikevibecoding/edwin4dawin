import * as THREE from 'three';
import { getMaterial } from '../assets/materials';
import { makeCanvas, toTexture } from '../assets/textures/gen';
import { hash2 } from '../core/rng';
import type { Engine } from '../core/engine';
import { registerAsset } from '../assets/registry';

registerAsset({
  id: 'env.exterior',
  name: 'Snowbound exterior (ground, drifts, treeline, sky, snowfall)',
  category: 'architecture',
  agent: 'Fable 2',
  files: 'src/world/snow.ts',
  where: 'courtyard + all window views',
  dims: '300 m ring',
  materials: 'snow, treeline silhouette, gradient sky',
  textures: 'procedural',
  collision: 'none (outside fence/shell)',
  lod: 'billboard-far',
  anim: 'snowfall particle drift',
  audio: 'wind ambience',
  status: 'integrated',
  accept: 'windows never read as voids; overcast blizzard mood; treeline visible from courtyard/windows',
});

/** Exterior environment: snow ground, drifts, treeline ring, overcast sky, snowfall. */
export class SnowEnvironment {
  readonly group = new THREE.Group();
  private snowfall: THREE.Points | null = null;
  private snowVel: Float32Array | null = null;

  constructor() {
    this.group.name = 'exterior';

    // ground
    const snowMat = getMaterial('snow').mat;
    const ground = new THREE.Mesh(new THREE.BoxGeometry(340, 0.5, 340), snowMat);
    ground.position.set(28, -0.27, 16);
    ground.receiveShadow = true;
    this.group.add(ground);

    // soft drifts around the courtyard + against facade (never inside the shell)
    const driftGeo = new THREE.SphereGeometry(1, 12, 8);
    let placed = 0;
    let i = 0;
    while (placed < 26 && i < 200) {
      i++;
      const a = hash2(i, 1) * Math.PI * 2;
      const inCourt = placed < 12;
      // courtyard drifts hug the fence line / building face and stay low (wadeable)
      const x = inCourt ? 2 + hash2(i, 2) * 22 : 28 + Math.cos(a) * (36 + hash2(i, 3) * 22);
      const z = inCourt
        ? (hash2(i, 9) < 0.5 ? 0.35 + hash2(i, 4) * 0.9 : 5.0 + hash2(i, 4) * 0.7)
        : 16 + Math.sin(a) * (30 + hash2(i, 5) * 18);
      // reject anything inside/near the building shell (x 2..56, z 5..40)
      if (!inCourt && x > 0 && x < 58 && z > 4 && z < 42) continue;
      if (inCourt && x > 5 && x < 14.5 && z > 3.2) continue; // keep the entrance path clear
      const d = new THREE.Mesh(driftGeo, snowMat);
      const s = 0.8 + hash2(i, 6) * 2.2;
      d.position.set(x, -0.72 + s * 0.28, z);
      d.scale.set(s * (1 + hash2(i, 7)), inCourt ? Math.min(0.3, s * 0.35) : s * 0.35, s * (1 + hash2(i, 8)));
      d.receiveShadow = true;
      this.group.add(d);
      placed++;
    }

    // treeline ring (billboard cylinder with silhouette texture)
    const tree = treelineTexture();
    const ringGeo = new THREE.CylinderGeometry(120, 120, 26, 48, 1, true);
    const ringMat = new THREE.MeshBasicMaterial({
      map: tree, transparent: true, side: THREE.BackSide, depthWrite: false,
      color: 0x9fb4c6, fog: true,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.set(28, 8, 16);
    this.group.add(ring);

    // far mountains
    const mount = mountainTexture();
    const ring2 = new THREE.Mesh(
      new THREE.CylinderGeometry(150, 150, 60, 48, 1, true),
      new THREE.MeshBasicMaterial({ map: mount, transparent: true, side: THREE.BackSide, depthWrite: false, fog: false }),
    );
    ring2.position.set(28, 18, 16);
    this.group.add(ring2);

    // snowfall
    const COUNT = 2600;
    const pos = new Float32Array(COUNT * 3);
    this.snowVel = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      pos[i * 3] = -20 + hash2(i, 11) * 100;
      pos[i * 3 + 1] = hash2(i, 12) * 22;
      pos[i * 3 + 2] = -25 + hash2(i, 13) * 95;
      this.snowVel[i] = 0.8 + hash2(i, 14) * 1.4;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const flake = flakeTexture();
    const pmat = new THREE.PointsMaterial({
      map: flake, size: 0.09, transparent: true, opacity: 0.85, depthWrite: false,
      color: 0xf4f8fc, sizeAttenuation: true,
    });
    this.snowfall = new THREE.Points(geo, pmat);
    this.snowfall.name = 'snowfall';
    this.group.add(this.snowfall);
  }

  step(dt: number, t: number): void {
    if (!this.snowfall || !this.snowVel) return;
    const attr = this.snowfall.geometry.getAttribute('position') as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    for (let i = 0; i < this.snowVel.length; i++) {
      arr[i * 3 + 1] -= this.snowVel[i] * dt;
      arr[i * 3] += Math.sin(t * 0.7 + i) * dt * 0.5 + dt * 0.65;
      if (arr[i * 3 + 1] < -0.5) {
        arr[i * 3 + 1] = 20 + hash2(i, 17) * 4;
        arr[i * 3] = -20 + hash2(i * 7 + ((t * 10) | 0), 11) * 100;
        arr[i * 3 + 2] = -25 + hash2(i * 3 + ((t * 10) | 0), 13) * 95;
      }
    }
    attr.needsUpdate = true;
  }

  applyTo(engine: Engine): void {
    engine.scene.add(this.group);
    engine.scene.fog = new THREE.Fog(0xb9c9d8, 55, 190);
    engine.scene.background = skyTexture();
    // environment reflections: overcast studio-ish gradient
    const pmrem = new THREE.PMREMGenerator(engine.renderer);
    const envScene = new THREE.Scene();
    envScene.background = new THREE.Color(0xa8bccc);
    const top = new THREE.Mesh(new THREE.SphereGeometry(50, 16, 12), new THREE.MeshBasicMaterial({ color: 0xd5e4f2, side: THREE.BackSide }));
    envScene.add(top);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x5a6470 }));
    floor.position.y = -8;
    envScene.add(floor);
    const warm = new THREE.Mesh(new THREE.SphereGeometry(5, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffe0b0 }));
    warm.position.set(18, 6, -10);
    envScene.add(warm);
    const env = pmrem.fromScene(envScene, 0.04);
    engine.scene.environment = env.texture;
    pmrem.dispose();
  }
}

function skyTexture(): THREE.Texture {
  const { canvas, ctx } = makeCanvas(512, 256);
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, '#8fa8bf');
  g.addColorStop(0.45, '#b6c8d8');
  g.addColorStop(0.72, '#cdd9e4');
  g.addColorStop(1, '#d8e2ea');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 256);
  // soft cloud bands
  for (let i = 0; i < 40; i++) {
    const y = hash2(i, 21) * 170;
    const w = 60 + hash2(i, 22) * 200;
    const h = 6 + hash2(i, 23) * 16;
    ctx.fillStyle = `rgba(226,234,242,${0.05 + hash2(i, 24) * 0.12})`;
    ctx.beginPath();
    ctx.ellipse(hash2(i, 25) * 512, y, w, h, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = toTexture(canvas, { repeat: false });
  tex.mapping = THREE.EquirectangularReflectionMapping;
  return tex;
}

function treelineTexture(): THREE.Texture {
  const { canvas, ctx } = makeCanvas(1024, 256);
  ctx.clearRect(0, 0, 1024, 256);
  // layered conifer silhouettes
  for (const [alpha, yBase, salt] of [[0.5, 150, 1], [0.75, 185, 2], [0.95, 225, 3]] as const) {
    ctx.fillStyle = `rgba(38,52,58,${alpha})`;
    let x = 0;
    while (x < 1024) {
      const w = 26 + hash2(x, salt) * 30;
      const h = 90 + hash2(x, salt + 9) * 110;
      const cx = x + w / 2;
      // triangle stack
      for (let s = 0; s < 3; s++) {
        const sw = w * (1 - s * 0.24);
        const sy = yBase - (h / 3) * s;
        ctx.beginPath();
        ctx.moveTo(cx - sw / 2, sy);
        ctx.lineTo(cx + sw / 2, sy);
        ctx.lineTo(cx, sy - h * 0.55);
        ctx.closePath();
        ctx.fill();
      }
      x += w * (0.6 + hash2(x, salt + 5) * 0.5);
    }
  }
  // snow dusting
  ctx.globalCompositeOperation = 'source-atop';
  for (let i = 0; i < 700; i++) {
    ctx.fillStyle = `rgba(220,232,240,${0.12 + hash2(i, 31) * 0.2})`;
    ctx.fillRect(hash2(i, 32) * 1024, 60 + hash2(i, 33) * 160, 2 + hash2(i, 34) * 5, 1.5);
  }
  ctx.globalCompositeOperation = 'source-over';
  const tex = toTexture(canvas);
  tex.repeat.set(3, 1);
  return tex;
}

function mountainTexture(): THREE.Texture {
  const { canvas, ctx } = makeCanvas(1024, 256);
  ctx.clearRect(0, 0, 1024, 256);
  ctx.fillStyle = 'rgba(150,168,186,0.85)';
  ctx.beginPath();
  ctx.moveTo(0, 256);
  let x = 0;
  let y = 190;
  while (x <= 1024) {
    ctx.lineTo(x, y);
    x += 30 + hash2(x, 41) * 60;
    y = 120 + hash2(x, 42) * 90;
  }
  ctx.lineTo(1024, 256);
  ctx.closePath();
  ctx.fill();
  // snow caps
  ctx.fillStyle = 'rgba(226,236,244,0.9)';
  for (let i = 0; i < 26; i++) {
    const px = hash2(i, 43) * 1024;
    const py = 128 + hash2(i, 44) * 60;
    ctx.beginPath();
    ctx.moveTo(px - 18, py + 16);
    ctx.lineTo(px + 18, py + 16);
    ctx.lineTo(px, py - 12);
    ctx.closePath();
    ctx.fill();
  }
  const tex = toTexture(canvas);
  tex.repeat.set(2, 1);
  return tex;
}

function flakeTexture(): THREE.Texture {
  const { canvas, ctx } = makeCanvas(32);
  const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.5, 'rgba(255,255,255,0.6)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 32, 32);
  return toTexture(canvas, { repeat: false });
}
