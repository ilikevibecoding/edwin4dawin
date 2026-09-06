// Physical shipments you can see (rubric 15 #12): one instanced crate mesh (one draw call) that shows
//   - crate stacks at the cargo terminal's dock and at the loading bays of depots / warehouses, sized by bulk stock,
//   - the cargo of import shipments inside the freighter hold that carries them (drawn from the economy's side at
//     the ship's pose - src/ships/ is not touched), gone the moment the shipment is unloaded,
//   - the unloaded stack on the pad-side service strip riding the conveyor leg to the terminal,
//   - one crate per courier shipment in transit between two businesses.
// Registered with game.vehicles so it gets the per-frame update(dt, alpha, camera) the ships use, and reads the
// same clock (vehicle ticks) so hold crates sit exactly where the hull is drawn. Instances beyond DRAW_DIST or past
// the capacity are skipped; the whole layer is one InstancedMesh, so the draw-call cost is 1 (<= 4 budget).
import * as THREE from 'three';
import { B, BLOCKS } from '../blocks.js';
import { tileUV } from '../textures.js';
import { SHARED } from '../entityMaterial.js';
import { TICK_RATE, DAY_LENGTH_SECONDS } from '../constants.js';
import { pathPoint } from './sim.js';

export const CRATE_CAPACITY = 1200;
export const DRAW_DIST = 260;
const STACK_UNITS = 120;        // bulk units per crate in a stack
const STACK_MAX = 30;           // crates per stack (5 x 3 x 2)
const HOLD_UNITS = 40;          // cargo units per crate in a hold

const VERT = /* glsl */ `
attribute vec2 aLight;
varying vec2 vUv; varying float vShade; varying vec2 vLight; varying float vFogDist;
void main() {
  vUv = uv;
  vLight = aLight;
  vec3 n = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
  vec3 l1 = normalize(vec3(0.2, 1.0, -0.7)), l2 = normalize(vec3(-0.2, 1.0, 0.7));
  float d = max(dot(n, l1), 0.0) + max(dot(n, l2), 0.0);
  vShade = clamp(0.55 + 0.45 * d * 0.7, 0.0, 1.0);
  vec4 mv = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  float fdy = dot(mv.xyz, (viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz);
  vFogDist = sqrt(max(dot(mv.xyz, mv.xyz) - fdy * fdy * 0.7975, 0.0));
  gl_Position = projectionMatrix * mv;
}`;
const FRAG = /* glsl */ `
uniform sampler2D map; uniform float uSkyLight; uniform vec3 uSkyTint; uniform vec3 uFogColor; uniform float uFogNear; uniform float uFogFar;
varying vec2 vUv; varying float vShade; varying vec2 vLight; varying float vFogDist;
float lightCurve(float l) { float c = l / (4.0 - 3.0 * l); return mix(c, l, 0.4); }
float blockCurve(float l) { float c = l / (4.0 - 3.0 * l); return mix(c, l, 0.6); }
void main() {
  vec4 tex = texture2D(map, vUv);
  if (tex.a < 0.5) discard;
  float sky = lightCurve(vLight.x) * uSkyLight;
  vec3 blk = vec3(blockCurve(vLight.y)) * vec3(1.0, 0.9, 0.72);
  vec3 light = max(max(vec3(sky) * uSkyTint, blk), vec3(0.035));
  vec3 col = tex.rgb * light * vShade;
  col = mix(col, uFogColor, smoothstep(uFogNear, uFogFar, vFogDist));
  gl_FragColor = vec4(col, 1.0);
}`;

function crateGeometry() {
  const g = new THREE.BoxGeometry(0.9, 0.9, 0.9);
  const [u0, v0, s] = tileUV(BLOCKS[B.CRATE].tex[0]);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, u0 + uv.getX(i) * s, v0 + uv.getY(i) * s);
  uv.needsUpdate = true;
  return g;
}

export class CrateLayer {
  constructor(game, economy) {
    this.game = game; this.eco = economy;
    this.geometry = crateGeometry();
    this.material = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: { map: { value: game.atlas }, uSkyLight: SHARED.uSkyLight, uSkyTint: SHARED.uSkyTint, uFogColor: SHARED.uFogColor, uFogNear: SHARED.uFogNear, uFogFar: SHARED.uFogFar } });
    this.mesh = new THREE.InstancedMesh(this.geometry, this.material, CRATE_CAPACITY);
    this.mesh.name = 'economy-crates';
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
    this.light = new THREE.InstancedBufferAttribute(new Float32Array(CRATE_CAPACITY * 2), 2);
    this.light.setUsage(THREE.DynamicDrawUsage);
    this.geometry.setAttribute('aLight', this.light);
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._e = new THREE.Euler(0, 0, 0, 'YXZ'); this._p = new THREE.Vector3(); this._s = new THREE.Vector3(1, 1, 1);
    this._pose = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, roll: 0 };
    this._path = { x: 0, y: 0, z: 0 };
    this._cell = { x: 0, y: 0, z: 0 };
    this.stacks = [];            // [{ x, y, z, n, dir }] rebuilt every second from stock
    this.stats = { instances: 0, stacks: 0, holds: 0, couriers: 0, drawCalls: 1 };
    this.stackTick = -1;
  }
  onAdd(game) { game.scene.add(this.mesh); }
  onRemove(game) { game.scene.remove(this.mesh); }
  dispose() { this.geometry.dispose(); this.material.dispose(); }

  // crate stacks at docks and loading bays: terminal + wholesale nodes + producers, sized by their bulk stock
  rebuildStacks() {
    const sim = this.eco.v2;
    this.stacks.length = 0;
    if (!sim) return;
    for (const b of sim.businesses) {
      if (b.role !== 'terminal' && b.role !== 'wholesale' && b.role !== 'producer') continue;
      let units = 0; for (const [g, q] of b.stock) if (g !== 'waste' && g !== 'water') units += q;
      const n = Math.min(STACK_MAX, Math.round(units / STACK_UNITS));
      if (n <= 0) continue;
      const side = b.lot.door ? b.lot.door.side : 'S';
      this.stacks.push({ x: b.bay.x, y: b.bay.y, z: b.bay.z, n, along: side === 'N' || side === 'S' ? 'x' : 'z', id: b.id });
    }
  }
  _put(x, y, z, yaw, pitch, roll) {
    const k = this.mesh.count;
    if (k >= CRATE_CAPACITY) return false;
    this._e.set(pitch || 0, yaw || 0, roll || 0);
    this._q.setFromEuler(this._e);
    this._p.set(x, y, z);
    this._m.compose(this._p, this._q, this._s);
    this.mesh.setMatrixAt(k, this._m);
    const l = this.game.world.sampleLight(x, y + 1, z);
    this.light.setXY(k, l[0], l[1]);
    this.mesh.count = k + 1;
    return true;
  }

  update(dt, alpha, camera) {
    const sim = this.eco.v2;
    this.mesh.count = 0;
    if (!sim) { this.mesh.instanceMatrix.needsUpdate = true; return; }
    const cam = camera.position;
    const near = (x, y, z) => Math.hypot(x - cam.x, y - cam.y, z - cam.z) < DRAW_DIST;
    const vt = this.game.vehicles ? this.game.vehicles.tickCount : 0;
    if (this.stackTick !== (vt / 20 | 0)) { this.stackTick = vt / 20 | 0; this.rebuildStacks(); }
    let stacks = 0, holds = 0, couriers = 0;
    // stacks: rows of 5 along the facade, 3 deep, 2 high
    for (const s of this.stacks) {
      if (!near(s.x, s.y, s.z)) continue;
      stacks++;
      for (let i = 0; i < s.n; i++) {
        const col = i % 5, row = Math.floor(i / 5) % 3, tier = Math.floor(i / 15);
        const ax = s.along === 'x' ? col : row, az = s.along === 'x' ? row : col;
        this._put(s.x + ax - 2, s.y + 0.45 + tier * 0.9, s.z + az - 1, 0, 0, 0);
      }
    }
    // shipments: hold cargo at the ship's pose, conveyor / courier crates along their path
    const t = (vt - 1 + alpha) / TICK_RATE;
    const ships = sim.arrivals.ships();
    const now = this.eco.dayTime() + (alpha - 1) / TICK_RATE / DAY_LENGTH_SECONDS;
    for (const sh of sim.shipments.values()) {
      if (sh.state === 'ordered' || sh.state === 'cancelled' || sh.state === 'delivered') continue;
      if (sh.carrier.kind === 'ship' && sh.loadedAt != null && sh.qty > 0) {
        const C = ships.find((c) => c.index === sh.carrier.id);
        if (!C) continue;
        const pose = C.poseAt(t, this._pose);
        if (!near(pose.x, pose.y, pose.z)) continue;
        const rec = sim.arrivals.shipRecord ? sim.arrivals.shipRecord(C.index) : null;
        const tilt = rec && typeof rec.level === 'number' ? 1 - rec.level : 1;
        const n = Math.min(C.holdCells.length, Math.max(1, Math.ceil(sh.qty / HOLD_UNITS)));
        // crates rotate with the hull: cell offsets go through the full (pitch, yaw, roll) rotation the ship draws with
        this._e.set(pose.pitch * tilt, pose.yaw, pose.roll * tilt); this._q.setFromEuler(this._e);
        for (let i = 0; i < n; i++) {
          const c = C.holdCells[i];
          this._p.set(c[0] + 0.5 - C.origin.x, c[1] + 0.45, c[2] + 0.5 - C.origin.z).applyQuaternion(this._q);
          if (!this._put(pose.x + this._p.x, pose.y + this._p.y, pose.z + this._p.z, pose.yaw, pose.pitch * tilt, pose.roll * tilt)) break;
        }
        holds++;
        continue;
      }
      if (!sh.path) continue;
      let u = 1;
      if (sh.state === 'unloaded' && sh.unloadedAt != null && sh.eta != null) u = Math.min(1, Math.max(0, (now - sh.unloadedAt) / Math.max(1e-6, sh.eta - sh.unloadedAt)));
      else if (sh.state === 'in_transit' && sh.loadedAt != null && sh.eta != null) u = Math.min(1, Math.max(0, (now - sh.loadedAt) / Math.max(1e-6, sh.eta - sh.loadedAt)));
      else if (sh.state === 'loaded') u = 0;
      const { a, b } = sh.path;
      const { x, y, z } = pathPoint(a, b, u, this._path);
      if (!near(x, y, z)) continue;
      if (sh.carrier.kind === 'conveyor') {
        const n = Math.min(12, Math.max(1, Math.ceil(sh.qty / STACK_UNITS)));
        for (let i = 0; i < n; i++) this._put(x + (i % 4) - 1.5, y + 0.45 + Math.floor(i / 8) * 0.9, z + (Math.floor(i / 4) % 2) - 0.5, 0, 0, 0);
        stacks++;
      } else { this._put(x, y + 0.45, z, Math.atan2(b.x - a.x, b.z - a.z), 0, 0); couriers++; }
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    this.light.needsUpdate = true;
    this.stats.instances = this.mesh.count; this.stats.stacks = stacks; this.stats.holds = holds; this.stats.couriers = couriers;
  }
}
