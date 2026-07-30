import * as THREE from 'three';
import type { MaterialLibrary } from '../core/Contracts';
import { Rng, clamp } from '../core/MathUtils';

/**
 * Blast scars.
 *
 * A shell that lands in a street and leaves the street exactly as it was is the
 * single loudest tell that a map is a set. The terrain shell is merged, batched
 * and already handed to physics, so it cannot be deformed after the fact —
 * instead every large detonation drops a decal quad on the ground and throws a
 * ring of rubble around it. Both live in one instanced mesh apiece and reuse the
 * oldest slot once the pool is full, so a full airstrike chain costs two draw
 * calls and no allocation.
 *
 * The decal carries its own bowl shading in its texture. Ground decals get the
 * scene's directional light like anything else, but a flat quad cannot shade
 * itself into a hole, and it is the dark centre against the pale ejecta rim that
 * reads as depth from across a street.
 */

/** Craters kept before the oldest is recycled. */
const CAPACITY = 16;

/** Rubble chunks thrown around each crater. */
const CHUNKS_PER_CRATER = 9;

/** Blasts smaller than this are scorch marks, not craters. */
const MIN_RADIUS = 1.8;

/** An airburst leaves nothing; the charge has to be near the ground. */
const MAX_HEIGHT = 3.2;

/** Metres between a new crater and an existing one before it is merged instead. */
const MERGE_DISTANCE = 2.4;

export class CraterField {
  private readonly root: THREE.Group;
  private readonly groundAt: (x: number, z: number) => number | null;
  private readonly rng = new Rng(0x0c2a7e);

  private readonly decals: THREE.InstancedMesh;
  private readonly chunks: THREE.InstancedMesh;
  private readonly centres: THREE.Vector3[] = [];
  private next = 0;
  private used = 0;

  constructor(opts: {
    root: THREE.Group;
    materials: MaterialLibrary;
    ground: (x: number, z: number) => number | null;
  }) {
    this.root = opts.root;
    this.groundAt = opts.ground;

    const quad = new THREE.PlaneGeometry(1, 1);
    quad.rotateX(-Math.PI / 2);
    this.decals = new THREE.InstancedMesh(quad, craterMaterial(), CAPACITY);
    this.decals.name = 'crater:decals';
    this.decals.count = 0;
    this.decals.frustumCulled = false;
    this.decals.castShadow = false;
    // Takes the shadow map, so a crater under an awning is not a lit hole.
    this.decals.receiveShadow = true;
    // After the opaque ground, before the additive daylight quads.
    this.decals.renderOrder = 2;
    this.decals.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.root.add(this.decals);

    const rubble = opts.materials.clone('concrete_damaged');
    rubble.name = 'world:crater:rubble';
    rubble.color.setHex(0xffffff);
    this.chunks = new THREE.InstancedMesh(
      chunkGeometry(),
      rubble,
      CAPACITY * CHUNKS_PER_CRATER,
    );
    this.chunks.name = 'crater:rubble';
    this.chunks.count = 0;
    this.chunks.frustumCulled = false;
    this.chunks.castShadow = false;
    this.chunks.receiveShadow = true;
    this.chunks.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.chunks.instanceColor = new THREE.InstancedBufferAttribute(
      new Float32Array(CAPACITY * CHUNKS_PER_CRATER * 3).fill(1),
      3,
    );
    this.root.add(this.chunks);
  }

  get count(): number {
    return this.used;
  }

  /**
   * Marks the ground under a detonation.
   *
   * `radius` is the blast radius the explosion was fired with, not the crater
   * width: the scar is a fraction of the pressure envelope, and a grenade that
   * damages out to nine metres does not dig a nine-metre hole.
   */
  add(point: THREE.Vector3, radius: number): boolean {
    if (radius < MIN_RADIUS) return false;
    const ground = this.groundAt(point.x, point.z);
    if (ground === null || point.y - ground > MAX_HEIGHT) return false;

    // A walked airstrike drops several charges within a couple of metres of each
    // other. Stacking four decals on one spot reads as a single black blob, so
    // near-repeats are dropped and the ejecta is thrown instead.
    for (let i = 0; i < this.centres.length; i++) {
      const centre = this.centres[i];
      if (
        Math.abs(centre.x - point.x) < MERGE_DISTANCE &&
        Math.abs(centre.z - point.z) < MERGE_DISTANCE
      ) {
        this.scatter(i, point.x, ground, point.z, radius);
        return false;
      }
    }

    const slot = this.next;
    const size = craterSize(radius);
    SCRATCH_QUAT.setFromAxisAngle(UP, this.rng.range(0, Math.PI * 2));
    SCRATCH_POS.set(point.x, ground + 0.025, point.z);
    SCRATCH_SCALE.set(size, 1, size * this.rng.range(0.86, 1.16));
    SCRATCH_MATRIX.compose(SCRATCH_POS, SCRATCH_QUAT, SCRATCH_SCALE);
    this.decals.setMatrixAt(slot, SCRATCH_MATRIX);
    this.decals.instanceMatrix.needsUpdate = true;

    const centre = this.centres[slot];
    if (centre) centre.set(point.x, ground, point.z);
    else this.centres[slot] = new THREE.Vector3(point.x, ground, point.z);

    this.scatter(slot, point.x, ground, point.z, radius);

    this.next = (this.next + 1) % CAPACITY;
    this.used = Math.min(this.used + 1, CAPACITY);
    this.decals.count = this.used;
    this.chunks.count = this.used * CHUNKS_PER_CRATER;
    return true;
  }

  dispose(): void {
    for (const mesh of [this.decals, this.chunks]) {
      this.root.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
      mesh.dispose();
    }
    this.centres.length = 0;
    this.used = 0;
  }

  /** Broken road thrown out of the hole, in the annulus around the rim. */
  private scatter(slot: number, x: number, ground: number, z: number, radius: number): void {
    const size = craterSize(radius);
    const colour = this.chunks.instanceColor;
    for (let i = 0; i < CHUNKS_PER_CRATER; i++) {
      const index = slot * CHUNKS_PER_CRATER + i;
      const angle = this.rng.range(0, Math.PI * 2);
      // Just outside the rim, where the material that came out of the hole went.
      const reach = size * this.rng.range(0.42, 0.78);
      const scale = size * this.rng.range(0.035, 0.11);
      SCRATCH_POS.set(
        x + Math.cos(angle) * reach,
        ground + scale * 0.35,
        z + Math.sin(angle) * reach,
      );
      SCRATCH_EULER.set(
        this.rng.range(-0.5, 0.5),
        this.rng.range(0, Math.PI * 2),
        this.rng.range(-0.5, 0.5),
      );
      SCRATCH_QUAT.setFromEuler(SCRATCH_EULER);
      SCRATCH_SCALE.set(scale, scale * this.rng.range(0.4, 0.7), scale * this.rng.range(0.7, 1.2));
      SCRATCH_MATRIX.compose(SCRATCH_POS, SCRATCH_QUAT, SCRATCH_SCALE);
      this.chunks.setMatrixAt(index, SCRATCH_MATRIX);
      if (colour) {
        // Broken carriageway is nearly black; what it was laid on is pale.
        const pale = this.rng.next();
        colour.setXYZ(
          index,
          0.26 + pale * 0.48,
          0.24 + pale * 0.44,
          0.2 + pale * 0.38,
        );
      }
    }
    this.chunks.instanceMatrix.needsUpdate = true;
    if (colour) colour.needsUpdate = true;
  }
}

// ---------------------------------------------------------------------------
// Appearance
// ---------------------------------------------------------------------------

/**
 * Across-the-scar size for a blast radius.
 *
 * Well under the radius: a grenade that hurts out to nine metres digs a hole a
 * man could stand in, not a nine-metre one, and the dark bowl is only the middle
 * third of the quad — the rest is ejecta and dust that has to fade to nothing
 * before the quad's own edge.
 */
function craterSize(radius: number): number {
  return clamp(radius * 0.55, 2.4, 8);
}

function craterMaterial(): THREE.MeshStandardMaterial {
  // Alpha off the map's own channel rather than an `alphaMap`, which three reads
  // from green: the bowl is the darkest part of the scar and the palest part is
  // the ejecta, so green as opacity is the crater exactly inside out.
  const material = new THREE.MeshStandardMaterial({
    map: craterTexture(),
    transparent: true,
    depthWrite: false,
    roughness: 0.94,
    metalness: 0,
    side: THREE.FrontSide,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
  });
  material.name = 'world:crater';
  return material;
}

/**
 * One crater, drawn top-down.
 *
 * Alpha and colour come from the same canvas — the bowl is opaque and dark, the
 * ejecta rays and dust halo fade out, so the quad's own edge never shows.
 */
function craterTexture(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('[world] no 2d context for the crater texture');
  const rng = new Rng(0x4c3a11);
  const c = size / 2;
  const r = size / 2;

  ctx.clearRect(0, 0, size, size);

  // Ejecta: the material that left the hole, thrown radially and thinning out.
  for (let i = 0; i < 64; i++) {
    const angle = rng.range(0, Math.PI * 2);
    const inner = r * rng.range(0.24, 0.34);
    const outer = r * rng.range(0.5, 0.99);
    const spread = rng.range(0.012, 0.05);
    const gradient = ctx.createLinearGradient(
      c + Math.cos(angle) * inner,
      c + Math.sin(angle) * inner,
      c + Math.cos(angle) * outer,
      c + Math.sin(angle) * outer,
    );
    const dark = rng.bool(0.6);
    gradient.addColorStop(0, dark ? 'rgba(38,32,25,0.72)' : 'rgba(150,138,116,0.6)');
    gradient.addColorStop(1, dark ? 'rgba(48,42,34,0)' : 'rgba(160,148,126,0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(c + Math.cos(angle) * inner, c + Math.sin(angle) * inner);
    ctx.lineTo(c + Math.cos(angle + spread) * outer, c + Math.sin(angle + spread) * outer);
    ctx.lineTo(c + Math.cos(angle - spread) * outer, c + Math.sin(angle - spread) * outer);
    ctx.closePath();
    ctx.fill();
  }

  // Dust halo, so the decal has no edge of its own.
  const halo = ctx.createRadialGradient(c, c, r * 0.3, c, c, r);
  halo.addColorStop(0, 'rgba(96,86,70,0.55)');
  halo.addColorStop(0.45, 'rgba(120,109,90,0.3)');
  halo.addColorStop(1, 'rgba(130,120,100,0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(c, c, r, 0, Math.PI * 2);
  ctx.fill();

  // Rim: pale sub-base pushed up out of the hole, lumpy rather than a ring.
  for (let i = 0; i < 150; i++) {
    const angle = rng.range(0, Math.PI * 2);
    const radius = r * rng.range(0.29, 0.4);
    const blob = r * rng.range(0.02, 0.07);
    ctx.fillStyle = `rgba(${196 + rng.int(0, 24)},${182 + rng.int(0, 22)},${152 + rng.int(0, 24)},${rng.range(0.16, 0.44).toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(c + Math.cos(angle) * radius, c + Math.sin(angle) * radius, blob, 0, Math.PI * 2);
    ctx.fill();
  }

  // The bowl. Hard shoulder at the rim and a black centre: the two together are
  // what read as a hole rather than as a stain.
  const bowl = ctx.createRadialGradient(c, c, 0, c, c, r * 0.34);
  bowl.addColorStop(0, 'rgba(12,10,8,0.97)');
  bowl.addColorStop(0.5, 'rgba(26,22,17,0.94)');
  bowl.addColorStop(0.82, 'rgba(52,45,35,0.88)');
  bowl.addColorStop(1, 'rgba(86,76,60,0.3)');
  ctx.fillStyle = bowl;
  ctx.beginPath();
  ctx.arc(c, c, r * 0.34, 0, Math.PI * 2);
  ctx.fill();

  // Fracture lines running out of the rim into the intact surface.
  ctx.lineCap = 'round';
  for (let i = 0; i < 26; i++) {
    let angle = rng.range(0, Math.PI * 2);
    let radius = r * rng.range(0.3, 0.36);
    ctx.beginPath();
    ctx.moveTo(c + Math.cos(angle) * radius, c + Math.sin(angle) * radius);
    const steps = rng.int(3, 6);
    for (let s = 0; s < steps; s++) {
      angle += rng.range(-0.22, 0.22);
      radius += r * rng.range(0.04, 0.1);
      ctx.lineTo(c + Math.cos(angle) * radius, c + Math.sin(angle) * radius);
    }
    ctx.strokeStyle = `rgba(30,25,19,${rng.range(0.3, 0.62).toFixed(3)})`;
    ctx.lineWidth = rng.range(1.2, 3.4);
    ctx.stroke();
  }

  // Grit, inside the bowl and over the rim.
  for (let i = 0; i < 420; i++) {
    const angle = rng.range(0, Math.PI * 2);
    const radius = r * Math.sqrt(rng.next()) * 0.46;
    const pale = radius > r * 0.3;
    ctx.fillStyle = pale
      ? `rgba(210,198,168,${rng.range(0.1, 0.34).toFixed(3)})`
      : `rgba(8,7,5,${rng.range(0.16, 0.5).toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(
      c + Math.cos(angle) * radius,
      c + Math.sin(angle) * radius,
      rng.range(0.8, 3.2),
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.name = 'world:crater';
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

/** An angular lump of broken surfacing. */
function chunkGeometry(): THREE.BufferGeometry {
  const geometry = new THREE.IcosahedronGeometry(0.5, 0);
  const position = geometry.getAttribute('position') as THREE.BufferAttribute;
  const rng = new Rng(0x9a11c3);
  for (let i = 0; i < position.count; i++) {
    position.setXYZ(
      i,
      position.getX(i) * rng.range(0.7, 1.3),
      position.getY(i) * rng.range(0.5, 1.1),
      position.getZ(i) * rng.range(0.7, 1.3),
    );
  }
  geometry.computeVertexNormals();
  return geometry;
}

const UP = new THREE.Vector3(0, 1, 0);
const SCRATCH_MATRIX = new THREE.Matrix4();
const SCRATCH_POS = new THREE.Vector3();
const SCRATCH_QUAT = new THREE.Quaternion();
const SCRATCH_SCALE = new THREE.Vector3();
const SCRATCH_EULER = new THREE.Euler();
