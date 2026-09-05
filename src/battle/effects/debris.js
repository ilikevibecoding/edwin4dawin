// Debris: one InstancedMesh of tumbling hull fragments thrown by detonations and heavy hits. Every
// fragment is the same jagged low-poly chunk (a jittered icosahedron, 20 triangles) whose faces carry a
// brightness variation, coloured per instance (dark scorched grey by default, or the hull colour a
// detonation passes in so a hulk throws tan / cream / blue-grey plates), made varied by a random plate-like
// non-uniform scale and orientation. Fragments carry velocity and spin, start ember-hot (per-instance
// emissive that cools over a few seconds) and shrink away over the last part of a 20-40 s life, so the
// pool recycles without a pop. Lit by the battle sun + Coruscant fill like hulls.
import * as THREE from "three";
import { battlePatch, makeBattleSun } from "../battleShader.js";

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _v = new THREE.Vector3();
const _e = new THREE.Euler();
const _c = new THREE.Color();

// linear albedo of a scorched dark-grey fragment (what every chunk was before per-instance colour)
export const DEBRIS_DEFAULT_COLOR = new THREE.Color(0.055, 0.055, 0.06);

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randDir(out) {
  const z = Math.random() * 2 - 1;
  const a = Math.random() * Math.PI * 2;
  const r = Math.sqrt(Math.max(0, 1 - z * z));
  return out.set(Math.cos(a) * r, Math.sin(a) * r, z);
}

// jagged chunk: unit icosahedron with every vertex pushed in or out (per position, so shared corners stay
// welded), flat-shaded, faces carrying a brightness variation around 1 (the odd lighter painted plate, the
// odd darker recess) that the per-instance colour multiplies
export function chunkGeometry(seed = 5) {
  const rand = rng(seed);
  let g = new THREE.IcosahedronGeometry(1, 0);
  if (g.index) g = g.toNonIndexed();
  const pos = g.attributes.position;
  const jitter = new Map();
  for (let i = 0; i < pos.count; i++) {
    const key = `${pos.getX(i).toFixed(3)},${pos.getY(i).toFixed(3)},${pos.getZ(i).toFixed(3)}`;
    let k = jitter.get(key);
    if (k === undefined) {
      k = 0.55 + rand() * 0.75;
      jitter.set(key, k);
    }
    pos.setXYZ(i, pos.getX(i) * k, pos.getY(i) * k, pos.getZ(i) * k);
  }
  // per-face multipliers (linear): mostly plain hull, some darker recesses, a few lighter plates
  const palette = [1.0, 1.25, 0.65, 1.1, 1.8, 0.5];
  const col = new Float32Array(pos.count * 3);
  for (let f = 0; f < pos.count / 3; f++) {
    const k = palette[Math.floor(rand() * palette.length)];
    for (let v = 0; v < 3; v++) {
      col[(f * 3 + v) * 3] = k;
      col[(f * 3 + v) * 3 + 1] = k;
      col[(f * 3 + v) * 3 + 2] = k;
    }
  }
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}

export class Debris {
  /**
   * @param scene
   * @param capacity fragments alive at once
   * @param opts { sun } battle sun uniforms (makeBattleSun()) shared with the ship materials
   */
  constructor(scene, capacity = 400, opts = {}) {
    this.capacity = capacity;
    const sun = opts.sun || makeBattleSun();
    const geo = chunkGeometry(opts.seed ?? 5);
    this.iHeat = new THREE.InstancedBufferAttribute(
      new Float32Array(capacity),
      1,
    ).setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute("iHeat", this.iHeat);
    const mat = battlePatch(
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        vertexColors: true,
        roughness: 0.85,
        metalness: 0.35,
        envMapIntensity: 0.1,
      }),
      sun,
    );
    // per-instance ember glow on top of the battle lighting patch
    const patched = mat.onBeforeCompile;
    mat.onBeforeCompile = (shader, renderer) => {
      patched(shader, renderer);
      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          "#include <common>\nattribute float iHeat;\nvarying float vHeat;",
        )
        .replace(
          "#include <begin_vertex>",
          "#include <begin_vertex>\nvHeat = iHeat;",
        );
      shader.fragmentShader = shader.fragmentShader
        .replace("#include <common>", "#include <common>\nvarying float vHeat;")
        .replace(
          "#include <emissivemap_fragment>",
          "#include <emissivemap_fragment>\ntotalEmissiveRadiance += vHeat * vHeat * vec3(1.0, 0.3, 0.06) * 1.5;",
        );
    };
    mat.customProgramCacheKey = () => "battlepatch-debris";
    this.mesh = new THREE.InstancedMesh(geo, mat, capacity);
    this.mesh.name = "debris";
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = false;
    this.mesh.receiveShadow = false;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    // per-instance colour from the start so the program compiles once with instancing colour on
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(
      new Float32Array(capacity * 3).fill(1),
      3,
    ).setUsage(THREE.DynamicDrawUsage);
    scene.add(this.mesh);
    this.list = [];
    this._pool = [];
    this.spawned = 0;
  }

  // the fragment furthest through its life; a full pool recycles it for a fresh burst
  _oldest() {
    const L = this.list;
    let best = 0;
    let k = -1;
    for (let i = 0; i < L.length; i++) {
      const f = L[i];
      const t = f.age / f.life;
      if (t > k) {
        k = t;
        best = i;
      }
    }
    return L[best];
  }

  _alloc() {
    return (
      this._pool.pop() || {
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        quat: new THREE.Quaternion(),
        spinAxis: new THREE.Vector3(0, 1, 0),
        spinRate: 0,
        scale: new THREE.Vector3(1, 1, 1),
        color: new THREE.Color(),
        age: 0,
        life: 30,
        heat: 0,
        cool: 0.2,
      }
    );
  }

  /**
   * Throw fragments from a point.
   * @param pos world Vector3
   * @param count fragments
   * @param speed top speed (m/s); individual pieces get 15-100 % of it
   * @param opts { size: typical fragment size (m), radius: spawn radius, velocity: base velocity (Vector3),
   *   dir: bias direction (world) for the spread, life: [min, max] seconds, heat: initial ember glow 0..1,
   *   evict: when the pool is full recycle the oldest fragments (default true; hits pass false),
   *   color: fragment albedo (THREE.Color or hex, linear-ish hull colour; default scorched dark grey) so a
   *   hulk throws chunks in its own hull colour }
   * Returns the number of fragments thrown.
   */
  burst(pos, count = 60, speed = 80, opts = {}) {
    const size = opts.size ?? 6;
    const radius = opts.radius ?? size * 2;
    const life = opts.life || [20, 40];
    const heat0 = opts.heat ?? 1;
    const evict = opts.evict !== false;
    const color = opts.color;
    if (color === undefined || color === null) _c.copy(DEBRIS_DEFAULT_COLOR);
    else if (typeof color === "number") _c.setHex(color);
    else _c.copy(color);
    let n = 0;
    for (let i = 0; i < count; i++) {
      let f;
      if (this.list.length < this.capacity) {
        f = this._alloc();
        this.list.push(f);
      } else if (evict) {
        f = this._oldest();
      } else break;
      randDir(_v);
      f.pos.copy(pos).addScaledVector(_v, radius * Math.random());
      randDir(_v);
      if (opts.dir) _v.multiplyScalar(0.7).add(opts.dir).normalize();
      const k = Math.random();
      f.vel.copy(_v).multiplyScalar(speed * (0.15 + 0.85 * k * k));
      if (opts.velocity) f.vel.add(opts.velocity);
      randDir(f.spinAxis);
      f.spinRate = (0.4 + Math.random() * 2.6) * (Math.random() < 0.5 ? -1 : 1);
      f.scale.set(
        size * (0.5 + Math.random()),
        size * (0.12 + Math.random() * 0.4),
        size * (0.5 + Math.random()),
      );
      f.quat.setFromEuler(
        _e.set(
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2,
        ),
      );
      f.age = 0;
      f.life = life[0] + Math.random() * (life[1] - life[0]);
      // most pieces are dark hull within a few seconds; a few stay ember-red longer
      f.heat = heat0 * (0.35 + 0.65 * Math.random());
      f.cool = 1 / (1.5 + Math.random() * 3.5);
      // hull colour, a little darker on some pieces (scorched side out)
      f.color.copy(_c).multiplyScalar(0.6 + 0.5 * Math.random());
      n++;
    }
    this.spawned += n;
    return n;
  }

  update(dt) {
    const L = this.list;
    let n = 0;
    for (let i = L.length - 1; i >= 0; i--) {
      const f = L[i];
      f.age += dt;
      if (f.age >= f.life) {
        L[i] = L[L.length - 1];
        L.pop();
        this._pool.push(f);
      }
    }
    for (const f of L) {
      f.pos.addScaledVector(f.vel, dt);
      _q.setFromAxisAngle(f.spinAxis, f.spinRate * dt);
      f.quat.multiply(_q);
      if (f.heat > 0) f.heat = Math.max(0, f.heat - f.cool * dt);
      // shrink away over the last quarter of the life instead of popping out
      const k = f.age / f.life;
      const fade = k > 0.75 ? 1 - (k - 0.75) / 0.25 : 1;
      _s.copy(f.scale).multiplyScalar(fade);
      _m.compose(f.pos, f.quat, _s);
      this.mesh.setMatrixAt(n, _m);
      this.mesh.instanceColor.setXYZ(n, f.color.r, f.color.g, f.color.b);
      this.iHeat.setX(n, f.heat);
      n++;
    }
    this.mesh.count = n;
    this.mesh.instanceMatrix.needsUpdate = true;
    this.mesh.instanceColor.needsUpdate = true;
    this.iHeat.needsUpdate = true;
  }

  get alive() {
    return this.list.length;
  }
}
