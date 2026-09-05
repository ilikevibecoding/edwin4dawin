// Fleet: capital ships as instanced models with per-instance LOD, damage tint and hardpoints.
//
// A ship *model* (see ships/*.js) is { id, side, length, parts: [{ geometry, material, lod }], hardpoints:
// [{ pos:[x,y,z], dir:[x,y,z], kind:'heavy'|'light', range }], engines: [{ pos, r }], surface: Float32Array
// of sample points on the hull (for impact placement), bounds: { radius } }. Every part of every LOD is one
// InstancedMesh; each frame ships are bucketed by camera distance into LOD 0/1/2 and their matrices and
// colours written into that LOD's meshes, so a fleet of forty ships costs (parts × lods) draw calls.
//
// Turrets: a model may carry `turretTypes: { heavy: { body, barrels, bodyMaterial, barrelMaterial,
// pivotY, barrelLen, yawLimit, pitchMin, pitchMax, rate } }` (geometries in turret space: up +Y, rest aim
// -Z, body pivot at the origin, barrel elevation pivot at (0, pivotY, 0)) and `turrets: [{ type, pos, up,
// forward }]` in ship space. Bodies and barrels are their own InstancedMeshes (two draw calls per type per
// class) that yaw and pitch toward the ship's target at a limited rate, and hardpoints with `turret: k`
// fire from the barrel tips, so bolts leave the guns that are visibly tracking.
import * as THREE from "three";

export const LOD_RANGES = [2200, 9000, Infinity]; // metres: lod0 < 2.2 km, lod1 < 9 km, lod2 beyond

const _m = new THREE.Matrix4();
const _inv = new THREE.Matrix4();
const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();
const _qy = new THREE.Quaternion();
const _qx = new THREE.Quaternion();
const _c = new THREE.Color();
const _cEm = new THREE.Color();
const _one = new THREE.Vector3(1, 1, 1);
const Y_AXIS = new THREE.Vector3(0, 1, 0);
const X_AXIS = new THREE.Vector3(1, 0, 0);
const TURRET_REST_PITCH = 0.12;
const _euler = new THREE.Euler();

export class Ship {
  constructor(model, opts) {
    this.model = model;
    this.side = model.side;
    this.id = opts.id;
    this.position = new THREE.Vector3(...(opts.position || [0, 0, 0]));
    this.quaternion = new THREE.Quaternion();
    if (opts.euler)
      this.quaternion.setFromEuler(new THREE.Euler(...opts.euler));
    this.velocity = new THREE.Vector3(...(opts.velocity || [0, 0, 0]));
    this.angular = new THREE.Vector3(...(opts.angular || [0, 0, 0])); // rad/s about local axes
    this.tint = new THREE.Color(opts.tint || 0xffffff);
    this.health = 1; // 1 pristine .. 0 dead
    this.damage = 0; // accumulated hits (drives scorch tint and fires)
    this.fires = []; // { local: Vector3, size, t }
    this.matrix = new THREE.Matrix4();
    this.cooldowns = new Float32Array(model.hardpoints.length);
    for (let i = 0; i < this.cooldowns.length; i++)
      this.cooldowns[i] = Math.random() * 3;
    this.target = null;
    this.lod = 0;
    this.alive = true;
    // per-turret yaw/pitch (turret space), driven toward the target by Fleet.update
    const nt = model.turrets ? model.turrets.length : 0;
    this.turretState = new Float32Array(nt * 2);
    for (let k = 0; k < nt; k++)
      this.turretState[k * 2 + 1] = TURRET_REST_PITCH;
    this.updateMatrix();
  }
  updateMatrix() {
    this.matrix.compose(this.position, this.quaternion, _v.set(1, 1, 1));
  }
  localToWorld(local, out) {
    return out.copy(local).applyMatrix4(this.matrix);
  }
  // world pivot and orientation (rest frame) of turret k: outQ = ship rotation × turret basis
  turretFrame(k, outPos, outQ) {
    const t = this.model.turrets[k];
    outPos.set(t.pos[0], t.pos[1], t.pos[2]).applyMatrix4(this.matrix);
    if (outQ) outQ.copy(this.quaternion).multiply(t._basis);
    return outPos;
  }
  // world aim direction of turret k from its current yaw/pitch
  turretAim(k, out) {
    const yaw = this.turretState[k * 2];
    const pitch = this.turretState[k * 2 + 1];
    const t = this.model.turrets[k];
    _q.copy(this.quaternion).multiply(t._basis);
    _qy.setFromAxisAngle(Y_AXIS, yaw);
    _qx.setFromAxisAngle(X_AXIS, pitch);
    _q.multiply(_qy).multiply(_qx);
    return out.set(0, 0, -1).applyQuaternion(_q);
  }
  // world position of hardpoint i and its rest (masking) direction; turret hardpoints fire from the
  // barrel tips wherever the turret is currently pointing
  hardpointWorld(i, outPos, outDir) {
    const h = this.model.hardpoints[i];
    if (h.turret !== undefined && this.model.turrets) {
      const k = h.turret;
      const t = this.model.turrets[k];
      const def = this.model.turretTypes[t.type];
      this.turretFrame(k, outPos, _q2);
      _qy.setFromAxisAngle(Y_AXIS, this.turretState[k * 2]);
      _q2.multiply(_qy);
      outPos.add(_v2.set(0, def.pivotY || 0, 0).applyQuaternion(_q2));
      this.turretAim(k, _v2);
      outPos.addScaledVector(_v2, def.barrelLen || 20);
    } else outPos.set(h.pos[0], h.pos[1], h.pos[2]).applyMatrix4(this.matrix);
    if (outDir)
      outDir
        .set(h.dir[0], h.dir[1], h.dir[2])
        .applyQuaternion(this.quaternion)
        .normalize();
    return outPos;
  }
  // true when a world point lies inside the ship's object-space bounding box (scaled by `margin`)
  containsPoint(worldPoint, margin = 1) {
    const b = this.model.bounds;
    if (!b.half)
      return worldPoint.distanceTo(this.position) < b.radius * 0.5 * margin;
    _inv.copy(this.matrix).invert();
    _v.copy(worldPoint).applyMatrix4(_inv);
    return (
      Math.abs(_v.x - b.centre[0]) < b.half[0] * margin &&
      Math.abs(_v.y - b.centre[1]) < b.half[1] * margin &&
      Math.abs(_v.z - b.centre[2]) < b.half[2] * margin
    );
  }
  // a random point on the hull surface (world), for impacts and fires
  randomSurfacePoint(out, rand = Math.random) {
    const s = this.model.surface;
    if (!s || s.length < 3) return out.copy(this.position);
    const n = s.length / 3;
    const i = Math.min(n - 1, Math.floor(rand() * n)) * 3;
    return out.set(s[i], s[i + 1], s[i + 2]).applyMatrix4(this.matrix);
  }
}

export class Fleet {
  constructor(scene) {
    this.group = new THREE.Group();
    this.group.name = "fleet";
    scene.add(this.group);
    this.classes = new Map(); // model.id -> { model, lods: [[InstancedMesh,...],...], ships: [] }
    this.ships = [];
    this.stats = { drawn: [0, 0, 0] };
  }

  registerModel(model, capacity) {
    if (this.classes.has(model.id)) return this.classes.get(model.id);
    const lods = [[], [], []];
    for (const part of model.parts) {
      const im = new THREE.InstancedMesh(
        part.geometry,
        part.material,
        capacity,
      );
      im.name = `${model.id}_lod${part.lod}_${part.name || "part"}`;
      // unlit parts (windows, engine cores) are emissive: they go dark on a dead hull
      im.userData.emissive = !!part.material.isMeshBasicMaterial;
      im.count = 0;
      im.frustumCulled = false; // instances are spread over kilometres; culling per mesh would be wrong
      im.castShadow = false;
      im.receiveShadow = false;
      this.group.add(im);
      lods[part.lod].push(im);
    }
    const entry = { model, lods, ships: [], capacity, turrets: null };
    if (model.turrets && model.turrets.length && model.turretTypes) {
      // precompute each turret's basis (up +Y, rest aim -Z) and create body/barrel meshes per type
      for (const t of model.turrets) {
        const up = new THREE.Vector3(...(t.up || [0, 1, 0])).normalize();
        const fwd = new THREE.Vector3(...(t.forward || [0, 0, -1]));
        fwd.addScaledVector(up, -fwd.dot(up)).normalize();
        if (fwd.lengthSq() < 1e-6)
          fwd.set(0, 0, -1).addScaledVector(up, -up.z).normalize();
        const right = new THREE.Vector3().crossVectors(fwd, up).normalize();
        const m = new THREE.Matrix4().makeBasis(
          right,
          up,
          fwd.clone().negate(),
        );
        t._basis = new THREE.Quaternion().setFromRotationMatrix(m);
      }
      entry.turrets = {};
      for (const [type, def] of Object.entries(model.turretTypes)) {
        const idx = [];
        model.turrets.forEach((t, k) => t.type === type && idx.push(k));
        if (!idx.length) continue;
        const cap = capacity * idx.length;
        const mk = (geo, mat, name) => {
          const im = new THREE.InstancedMesh(geo, mat, cap);
          im.name = `${model.id}_turret_${type}_${name}`;
          im.count = 0;
          im.frustumCulled = false;
          im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
          this.group.add(im);
          return im;
        };
        entry.turrets[type] = {
          def,
          idx,
          body: def.body ? mk(def.body, def.bodyMaterial, "body") : null,
          barrels: def.barrels
            ? mk(def.barrels, def.barrelMaterial, "barrels")
            : null,
        };
      }
    }
    entry.turretList = entry.turrets ? Object.values(entry.turrets) : [];
    this.classes.set(model.id, entry);
    return entry;
  }

  // Aim every turret of a ship at its target (rate-limited yaw/pitch in turret space), then write the
  // body and barrel instance matrices. Only ships at LOD 0/1 are drawn; aiming runs for all so hardpoints
  // fire from the right place even when the guns are sub-pixel.
  _updateTurrets(entry, s, dt, draw) {
    const model = s.model;
    const target = s.target && s.target.alive ? s.target.position : null;
    for (const T of entry.turretList) {
      const def = T.def;
      const rate = def.rate || 0.6;
      const yawLimit = def.yawLimit ?? Math.PI;
      const pMin = def.pitchMin ?? -0.08;
      const pMax = def.pitchMax ?? 1.25;
      for (const k of T.idx) {
        const t = model.turrets[k];
        s.turretFrame(k, _v, _q2); // pivot + rest orientation
        let goalYaw = 0;
        let goalPitch = TURRET_REST_PITCH;
        if (target) {
          _v2.copy(target).sub(_v).applyQuaternion(_q.copy(_q2).invert());
          const h = Math.hypot(_v2.x, _v2.z);
          goalYaw = Math.atan2(-_v2.x, -_v2.z);
          goalPitch = Math.atan2(_v2.y, h);
          if (yawLimit < Math.PI)
            goalYaw = THREE.MathUtils.clamp(goalYaw, -yawLimit, yawLimit);
          goalPitch = THREE.MathUtils.clamp(goalPitch, pMin, pMax);
        }
        const st = s.turretState;
        let dy = goalYaw - st[k * 2];
        if (yawLimit >= Math.PI) dy = Math.atan2(Math.sin(dy), Math.cos(dy)); // shortest way round
        const step = rate * dt;
        st[k * 2] += THREE.MathUtils.clamp(dy, -step, step);
        if (yawLimit >= Math.PI)
          st[k * 2] = Math.atan2(Math.sin(st[k * 2]), Math.cos(st[k * 2]));
        st[k * 2 + 1] += THREE.MathUtils.clamp(
          goalPitch - st[k * 2 + 1],
          -step,
          step,
        );
        if (!draw) continue;
        _qy.setFromAxisAngle(Y_AXIS, st[k * 2]);
        _q.copy(_q2).multiply(_qy);
        if (T.body) {
          _m.compose(_v, _q, _one);
          T.body.setMatrixAt(T.n, _m);
        }
        if (T.barrels) {
          _v2
            .set(0, def.pivotY || 0, 0)
            .applyQuaternion(_q)
            .add(_v);
          _qx.setFromAxisAngle(X_AXIS, st[k * 2 + 1]);
          _q.multiply(_qx);
          _m.compose(_v2, _q, _one);
          T.barrels.setMatrixAt(T.n, _m);
        }
        T.n++;
      }
    }
  }

  add(model, opts) {
    const entry = this.classes.get(model.id) || this.registerModel(model, 64);
    if (entry.ships.length >= entry.capacity && !entry.warnedCapacity) {
      entry.warnedCapacity = true;
      console.warn(
        `fleet: ${model.id} is over its instance capacity (${entry.capacity}); extra ships are not drawn`,
      );
    }
    const ship = new Ship(model, opts);
    entry.ships.push(ship);
    this.ships.push(ship);
    return ship;
  }

  update(dt, camPos) {
    // motion
    for (const s of this.ships) {
      if (!s.alive) continue;
      s.position.addScaledVector(s.velocity, dt);
      if (s.angular.lengthSq() > 0) {
        _q.setFromEuler(
          _euler.set(s.angular.x * dt, s.angular.y * dt, s.angular.z * dt),
        );
        s.quaternion.multiply(_q);
      }
      s.updateMatrix();
      const d = s.position.distanceTo(camPos) - s.model.bounds.radius;
      // LOD distances scale with the ship: a 140 m courier drops detail far sooner than a 3 km battleship
      const k = THREE.MathUtils.clamp(s.model.bounds.radius / 600, 0.3, 2);
      s.lod = d < LOD_RANGES[0] * k ? 0 : d < LOD_RANGES[1] * k ? 1 : 2;
    }
    // write instances per class per lod
    this.stats.drawn = [0, 0, 0];
    for (const entry of this.classes.values()) {
      const counts = [0, 0, 0];
      if (entry.turrets) for (const T of entry.turretList) T.n = 0;
      for (const s of entry.ships) {
        if (!s.alive) continue;
        const L = s.lod;
        const i = counts[L]++;
        if (i >= entry.capacity) continue;
        if (entry.turrets) this._updateTurrets(entry, s, dt, L < 2);
        // damage darkens the hull tint; a dead hull is a dark wreck and its windows / engine cores go out
        const dead = s.health <= 0;
        const k = dead ? 0.42 : Math.max(0.55, 1 - s.damage * 0.04);
        _c.copy(s.tint).multiplyScalar(k);
        _cEm
          .copy(s.tint)
          .multiplyScalar(dead ? 0.03 : 1 - 0.5 * Math.min(1, s.damage / 12));
        for (const im of entry.lods[L]) {
          im.setMatrixAt(i, s.matrix);
          if (im.instanceColor)
            im.setColorAt(i, im.userData.emissive ? _cEm : _c);
        }
      }
      for (let L = 0; L < 3; L++) {
        for (const im of entry.lods[L]) {
          im.count = counts[L];
          im.instanceMatrix.needsUpdate = true;
          if (im.instanceColor) im.instanceColor.needsUpdate = true;
        }
        this.stats.drawn[L] += counts[L];
      }
      if (entry.turrets)
        for (const T of entry.turretList) {
          for (const im of [T.body, T.barrels]) {
            if (!im) continue;
            im.count = T.n;
            im.instanceMatrix.needsUpdate = true;
          }
        }
    }
  }

  // enable per-instance colour on every mesh (call once after registering)
  enableInstanceColor() {
    for (const entry of this.classes.values())
      for (const lod of entry.lods)
        for (const im of lod)
          if (!im.instanceColor) {
            im.instanceColor = new THREE.InstancedBufferAttribute(
              new Float32Array(entry.capacity * 3).fill(1),
              3,
            );
            im.instanceColor.setUsage(THREE.DynamicDrawUsage);
          }
  }

  serialize() {
    return this.ships.map((s) => ({
      id: s.id,
      cls: s.model.id,
      side: s.side,
      p: s.position.toArray().map((v) => +v.toFixed(1)),
      q: s.quaternion.toArray().map((v) => +v.toFixed(4)),
      health: +s.health.toFixed(3),
      damage: s.damage,
    }));
  }
}

// ---------------------------------------------------------------------------
// helpers for model builders
// ---------------------------------------------------------------------------

// Sample N points on the surface of a (non-indexed or indexed) geometry, area-weighted. Returns Float32Array.
export function sampleSurface(geometry, n, seed = 1) {
  const g = geometry.index ? geometry.toNonIndexed() : geometry;
  const pos = g.attributes.position;
  const triCount = pos.count / 3;
  const areas = new Float32Array(triCount);
  let total = 0;
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  for (let t = 0; t < triCount; t++) {
    a.fromBufferAttribute(pos, t * 3);
    b.fromBufferAttribute(pos, t * 3 + 1);
    c.fromBufferAttribute(pos, t * 3 + 2);
    const ar = b.clone().sub(a).cross(c.clone().sub(a)).length() * 0.5;
    areas[t] = ar;
    total += ar;
  }
  let state = seed >>> 0;
  const rand = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const out = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    let r = rand() * total;
    let t = 0;
    while (t < triCount - 1 && r > areas[t]) {
      r -= areas[t];
      t++;
    }
    a.fromBufferAttribute(pos, t * 3);
    b.fromBufferAttribute(pos, t * 3 + 1);
    c.fromBufferAttribute(pos, t * 3 + 2);
    let u = rand();
    let v = rand();
    if (u + v > 1) {
      u = 1 - u;
      v = 1 - v;
    }
    out[i * 3] = a.x + (b.x - a.x) * u + (c.x - a.x) * v;
    out[i * 3 + 1] = a.y + (b.y - a.y) * u + (c.y - a.y) * v;
    out[i * 3 + 2] = a.z + (b.z - a.z) * u + (c.z - a.z) * v;
  }
  return out;
}

// merge geometries into one non-indexed geometry (positions/normals/uv/color kept)
export function mergeParts(geos) {
  const list = geos.map((g) => (g.index ? g.toNonIndexed() : g));
  for (const g of list) {
    if (!g.attributes.normal) g.computeVertexNormals();
    if (!g.attributes.uv)
      g.setAttribute(
        "uv",
        new THREE.BufferAttribute(
          new Float32Array(g.attributes.position.count * 2),
          2,
        ),
      );
    if (!g.attributes.color)
      g.setAttribute(
        "color",
        new THREE.BufferAttribute(
          new Float32Array(g.attributes.position.count * 3).fill(1),
          3,
        ),
      );
    for (const k of Object.keys(g.attributes))
      if (!["position", "normal", "uv", "color"].includes(k))
        g.deleteAttribute(k);
  }
  let count = 0;
  for (const g of list) count += g.attributes.position.count;
  const pos = new Float32Array(count * 3);
  const nor = new Float32Array(count * 3);
  const uv = new Float32Array(count * 2);
  const col = new Float32Array(count * 3);
  let o = 0;
  for (const g of list) {
    const n = g.attributes.position.count;
    pos.set(g.attributes.position.array, o * 3);
    nor.set(g.attributes.normal.array, o * 3);
    uv.set(g.attributes.uv.array, o * 2);
    col.set(g.attributes.color.array, o * 3);
    o += n;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  out.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  out.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  out.setAttribute("color", new THREE.BufferAttribute(col, 3));
  out.computeBoundingSphere();
  return out;
}

// Object-space planar UVs by dominant normal at `texel` tiles per metre (ships are instanced, so
// object space keeps the plating fixed to the hull as it moves).
export function planarUV(geo, texel) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  if (!g.attributes.normal) g.computeVertexNormals();
  const pos = g.attributes.position;
  const nor = g.attributes.normal;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const nx = Math.abs(nor.getX(i));
    const ny = Math.abs(nor.getY(i));
    const nz = Math.abs(nor.getZ(i));
    let u;
    let v;
    if (ny >= nx && ny >= nz) ((u = x), (v = z));
    else if (nx >= nz) ((u = z), (v = y));
    else ((u = x), (v = y));
    uv[i * 2] = u * texel;
    uv[i * 2 + 1] = v * texel;
  }
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return g;
}

export function tintGeometry(geo, color) {
  const g = geo;
  const n = g.attributes.position.count;
  const arr = new Float32Array(n * 3);
  const c =
    color instanceof THREE.Color
      ? color
      : Array.isArray(color)
        ? new THREE.Color().setRGB(color[0], color[1], color[2]) // [r, g, b] triples (three ignores arrays)
        : new THREE.Color(color);
  for (let i = 0; i < n; i++) {
    arr[i * 3] = c.r;
    arr[i * 3 + 1] = c.g;
    arr[i * 3 + 2] = c.b;
  }
  g.setAttribute("color", new THREE.BufferAttribute(arr, 3));
  return g;
}
