// Shared helpers for the exterior modules: fog-free exterior material set, a Kit subclass that keeps
// per-vertex tints and places pre-built matrices, wedge (s,u) ray coordinates, surface bases for placing
// instances on the curved hull, tint/weathering helpers, keep-out tests and the LOD tier registry.
import * as THREE from "three";
import { Kit, rng, setVertexColor } from "../core/kit.js";
import { IMP } from "../core/palette.js";
import { HULL, ROOMS, BAYS, TOWER, halfWidth, sternZAt, topY, ventralY } from "../core/layout.js";

export { rng };
export const BOW = HULL.bowZ;
export const STERN = HULL.sternZ;
export const LEN = HULL.length;
export const HW = HULL.halfWidthStern;
export const TR = HULL.trench;

// LOD tier reach (metres from the camera to the nearest point of a set's bounding sphere)
export const LOD_NEAR = 400;
export const LOD_MID = 1500;

const _v = new THREE.Vector3();
const _n = new THREE.Vector3();
const _f = new THREE.Vector3();
const _r = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _m = new THREE.Matrix4();
const _c = new THREE.Color();

// ---------------------------------------------------------------------------------------------------
// Materials: the exterior is seen from inside through the bridge glazing, so nothing here may take the
// interior fog. Shared hull materials are cloned (textures shared), emissives are exterior-specific.
// ---------------------------------------------------------------------------------------------------

// Faux ambient for the armour. main.js gives the hull materials a space capture as env map (near black apart
// from the planet), so image-based fill is gone and the 0.35 hemisphere alone leaves the shadow side black.
// This adds a flat albedo-weighted term (~ what a neutral room environment at 0.25 × envMapIntensity gave)
// to the exterior clones only. Exposed as `exterior.fill`; set it to 0 if the global fill is raised instead.
export const EXT_FILL = { value: new THREE.Vector3(0.13, 0.14, 0.165) };

function withFill(mat, scale) {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uExtFill = EXT_FILL;
    shader.uniforms.uExtFillScale = { value: scale };
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform vec3 uExtFill;\nuniform float uExtFillScale;")
      .replace("#include <lights_fragment_end>", "#include <lights_fragment_end>\n\treflectedLight.indirectDiffuse += uExtFill * uExtFillScale * diffuseColor.rgb;");
  };
  mat.customProgramCacheKey = () => `extfill:${scale}`;
  return mat;
}

export function makeExteriorMaterials(materials) {
  const clone = (m, extra = {}) => {
    const c = m.clone();
    c.fog = false;
    Object.assign(c, extra);
    return c;
  };
  const emit = (color, intensity, extra = {}) => new THREE.MeshStandardMaterial({ color: 0x06070a, emissive: new THREE.Color(color), emissiveIntensity: intensity, roughness: 0.55, metalness: 0, fog: false, ...extra });
  const M = {
    ...materials,
    hull: withFill(clone(materials.hull), 1.0),
    hullDark: withFill(clone(materials.hullDark), 0.7),
    glass: clone(materials.glass),
    // window rows: dim, slightly cold; a few warm decks
    emitWin: emit("#d6e2ff", 0.7),
    emitWinWarm: emit("#ffd9a6", 0.62),
    emitWinDim: emit("#9fb4d8", 0.36),
    emitBay: emit("#ffb547", 2.0),
    emitPort: emit("#ff5a3c", 1.6),
    emitBlueCold: emit("#6fa8ff", 1.8),
    engineGlow: makeEngineGlowMaterial(),
    runLight: makeRunLightMaterial(),
  };
  M.__shared = materials;
  return M;
}

/** Keep env maps in step with the shared hull materials (main.js assigns a space capture after build). */
export function syncSharedMaterials(M) {
  const S = M.__shared;
  if (!S) return;
  for (const k of ["hull", "hullDark", "glass"]) {
    const c = M[k];
    const s = S[k];
    if (!c || !s) continue;
    if (c.envMap !== s.envMap || c.envMapIntensity !== s.envMapIntensity) {
      c.envMap = s.envMap;
      c.envMapIntensity = s.envMapIntensity;
      c.needsUpdate = true;
    }
  }
}

/** Engine throat: radial/longitudinal gradient (uv.y = 0 deep core, 1 at the lip) with a soft flicker. */
export function makeEngineGlowMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, core: { value: new THREE.Color("#c9dcff") }, rim: { value: new THREE.Color("#2c6cff") }, power: { value: 0.55 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform float time; uniform vec3 core; uniform vec3 rim; uniform float power;
      varying vec2 vUv;
      void main() {
        float depth = 1.0 - vUv.y;                 // 1 deep inside, 0 at the lip
        float fl = 0.92 + 0.08 * sin(time * 9.0 + vUv.x * 12.566) * sin(time * 3.1);
        float k = pow(depth, 2.2);
        vec3 col = mix(rim, core, k);
        float e = (0.18 + 1.9 * k) * power * fl;
        gl_FragColor = vec4(col * e, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    side: THREE.DoubleSide,
    fog: false,
  });
}

/** Running / navigation lights: instanced spheres, per-instance colour and blink phase, GPU blink. */
export function makeRunLightMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 } },
    vertexShader: /* glsl */ `
      attribute float phase;
      attribute float rate;
      uniform float time;
      varying vec3 vColor;
      varying float vOn;
      void main() {
        #ifdef USE_INSTANCING_COLOR
          vColor = instanceColor;
        #else
          vColor = vec3(1.0);
        #endif
        float k = sin(time * rate + phase);
        vOn = rate < 0.01 ? 1.0 : smoothstep(0.05, 0.35, k);
        vec4 mv = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vColor; varying float vOn;
      void main() {
        if (vOn < 0.02) discard;
        gl_FragColor = vec4(vColor * (1.2 + 3.0 * vOn), 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    fog: false,
  });
}

// ---------------------------------------------------------------------------------------------------
// Kit subclass: keeps existing per-vertex colours, adds geometry by matrix, places instances by matrix.
// ---------------------------------------------------------------------------------------------------
export class ExtKit extends Kit {
  /**
   * Kit.proto strips the colour attribute, but every `std` material has vertexColors on, so an instanced
   * prototype without one reads GL's default attribute value (0,0,0) and renders black. Give protos a
   * white colour attribute so per-instance colours come through unchanged.
   */
  proto(name, mat, geo, opts) {
    super.proto(name, mat, geo, opts);
    const p = this.protos.get(name);
    if (p && !p.geo.attributes.color) setVertexColor(p.geo, 0xffffff);
  }

  add(mat, geo, opts = {}) {
    const keep = opts.keepColor ? geo.getAttribute("color") : null;
    const g = super.add(mat, geo, opts);
    if (keep && g.attributes.position.count === keep.count) g.setAttribute("color", keep);
    return g;
  }

  /** Add a local-space geometry transformed by `matrix`. */
  addAt(mat, geo, matrix, opts = {}) {
    geo.applyMatrix4(matrix);
    return this.add(mat, geo, opts);
  }

  /** Place an instance with a ready matrix (see surfaceMatrix). */
  placeM(name, m, color = 0xffffff) {
    const p = this.protos.get(name);
    if (!p) throw new Error("unknown proto " + name);
    p.items.push({ m: m.clone(), color: color instanceof THREE.Color ? color.clone() : new THREE.Color(color) });
    this.triangles += p.geo.index.count / 3;
  }

  hasProto(name) {
    return this.protos.has(name);
  }
}

// ---------------------------------------------------------------------------------------------------
// Wedge ray coordinates: s = across (−1 port edge … +1 starboard edge), u = along (0 bow apex … 1 trailing edge)
// ---------------------------------------------------------------------------------------------------
export function rayPoint(s, u) {
  const xe = s * HW;
  const zEnd = sternZAt(xe);
  return [u * xe, BOW + u * (zEnd - BOW)];
}
export function sOf(x, z) {
  const hw = halfWidth(z);
  return hw < 1e-3 ? 0 : x / hw;
}
export function uOf(z) {
  return (z - BOW) / (STERN - BOW);
}

/** Surface height with the trench lip: dorsal (sign +1) or ventral (sign −1). */
export function surfY(sign, x, z) {
  return sign > 0 ? topY(x, z) : ventralY(x, z);
}

/** Outward unit normal of the dorsal (+1) or ventral (−1) surface at (x, z). */
export function surfaceNormal(sign, x, z, out = new THREE.Vector3()) {
  const e = 1.5;
  const fn = sign > 0 ? topY : ventralY;
  const dx = (fn(x + e, z) - fn(x - e, z)) / (2 * e);
  const dz = (fn(x, z + e) - fn(x, z - e)) / (2 * e);
  return out.set(-dx * sign, sign, -dz * sign).normalize();
}

/**
 * Matrix placing a local object (origin at its base, +Y up, −Z forward) onto a surface point with the given
 * outward normal, yaw about the normal and scale [sx, sy, sz]; `lift` moves it along the normal.
 */
export function basisMatrix(px, py, pz, normal, yaw = 0, scale = 1, lift = 0, out = new THREE.Matrix4()) {
  _n.copy(normal);
  _f.set(0, 0, -1);
  _f.addScaledVector(_n, -_n.dot(_f));
  if (_f.lengthSq() < 1e-6) _f.set(1, 0, 0).addScaledVector(_n, -_n.dot(_v.set(1, 0, 0)));
  _f.normalize();
  _r.crossVectors(_f, _n).normalize();
  // columns X = right, Y = normal, Z = −forward
  _f.negate();
  out.makeBasis(_r, _n, _f);
  if (yaw) out.multiply(_m.makeRotationY(yaw));
  if (typeof scale === "number") _s.set(scale, scale, scale);
  else _s.set(scale[0], scale[1], scale[2]);
  out.scale(_s);
  out.setPosition(px + _n.x * lift, py + _n.y * lift, pz + _n.z * lift);
  return out;
}

/** Matrix for an object standing on the dorsal/ventral surface at (x, z). */
export function surfaceMatrix(sign, x, z, yaw = 0, scale = 1, lift = 0, out = new THREE.Matrix4()) {
  const y = surfY(sign, x, z);
  surfaceNormal(sign, x, z, _v);
  return basisMatrix(x, y, z, _v, yaw, scale, lift, out);
}

/** Matrix for an object standing on a flat face with normal `n` (e.g. a wall), yaw about the normal. */
export function faceMatrix(px, py, pz, nx, ny, nz, yaw = 0, scale = 1, out = new THREE.Matrix4()) {
  return basisMatrix(px, py, pz, _v.set(nx, ny, nz), yaw, scale, 0, out);
}

/** Yaw of the side edge (plan-view angle of the wedge edge on the given side, about +Y). */
export function edgeYaw(side) {
  // edge direction from bow to the stern corner: (side*HW, 0, sternCornerZ - bowZ). A yaw of θ about +Y
  // maps local +Z to (sin θ, 0, cos θ), so θ = atan2(dx, dz) aligns a box's long (Z) axis with the edge.
  return Math.atan2(side * HW, HULL.sternCornerZ - BOW);
}

// ---------------------------------------------------------------------------------------------------
// Tints & weathering (vertex colours; low contrast so distance reads as smooth grey)
// ---------------------------------------------------------------------------------------------------
export const HEAT = new THREE.Color("#5d4d44");
export const SOOT = new THREE.Color("#2e3034");
export const DUST = new THREE.Color("#a9aaa6");

/** Per-plate armour tint: mostly hullMid with slight lighter/darker/bluer plates. */
export function plateTint(rand, out = new THREE.Color()) {
  out.copy(IMP.hullMid);
  const k = rand();
  if (k < 0.55) out.lerp(IMP.hullLight, 0.08 + rand() * 0.22);
  else if (k < 0.8) out.lerp(IMP.hullDark, 0.08 + rand() * 0.2);
  else if (k < 0.9) out.lerp(IMP.hullBlue, 0.3 + rand() * 0.4);
  else out.lerp(IMP.hullLight, 0.3 + rand() * 0.2);
  return out;
}

/** Weathering applied to a tint at a hull position: soot aft, heat near the stern, dust toward the bow. */
export function weather(color, x, z, y = 0) {
  const u = uOf(z);
  // soot: aft third darkens, strongest in the last 120 m and around the engine deck line
  const soot = smooth01((u - 0.72) / 0.28) * (0.22 + 0.18 * smooth01((Math.abs(y) - 20) / 60));
  if (soot > 0) color.lerp(SOOT, Math.min(0.45, soot));
  // dust / bleaching toward the bow
  const dust = smooth01((0.28 - u) / 0.28) * 0.18;
  if (dust > 0) color.lerp(DUST, dust);
  return color;
}

export function smooth01(t) {
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return t * t * (3 - 2 * t);
}

export function lerpColor(a, b, k, out = new THREE.Color()) {
  return out.copy(a).lerp(b, k);
}

export function tint(base, light = 0, dark = 0, out = new THREE.Color()) {
  out.copy(base);
  if (light) out.lerp(IMP.hullLight, light);
  if (dark) out.lerp(IMP.hullShadow, dark);
  return out;
}

export function packColor(c) {
  _c.copy(c);
  return _c.getHex();
}

// ---------------------------------------------------------------------------------------------------
// Keep-out volumes: room boxes (+1 m), bay shafts, the boarding flight corridor in front of the glazing
// ---------------------------------------------------------------------------------------------------
const ROOM_BOXES = ROOMS.map((r) => ({ x0: r.box[0] - 1, x1: r.box[1] + 1, z0: r.box[2] - 1, z1: r.box[3] + 1, y0: r.floor - 1, y1: r.floor + r.h + 1 }));
const SHAFTS = Object.values(BAYS).map((b) => ({ x0: b.x0 - 0.01, x1: b.x1 + 0.01, z0: b.z0 - 0.01, z1: b.z1 + 0.01, y0: b.bellyY - 2, y1: b.deckY }));
// ends at the outer face of the bridge's forward wall (bridge.z0 − 1.2); the wall itself frames the glazing
export const FLIGHT_CORRIDOR = { x0: -40, x1: 40, y0: 205, y1: 225, z0: 100, z1: TOWER.bridge.z0 - 1.25 };

export function inBox(b, x, y, z) {
  return x > b.x0 && x < b.x1 && y > b.y0 && y < b.y1 && z > b.z0 && z < b.z1;
}
/** True when the point lies inside a room volume (camera indoors → only the glazing shows the exterior). */
export function insideRooms(x, y, z) {
  for (const b of ROOM_BOXES) if (inBox(b, x, y, z)) return true;
  return false;
}
/** True when the point must stay free of exterior geometry. */
export function blocked(x, y, z) {
  if (inBox(FLIGHT_CORRIDOR, x, y, z)) return true;
  for (const b of SHAFTS) if (inBox(b, x, y, z)) return true;
  for (const b of ROOM_BOXES) if (inBox(b, x, y, z)) return true;
  return false;
}
/** True when an axis-aligned box [min,max] intersects any keep-out volume. */
export function boxBlocked(min, max) {
  const hit = (b) => min[0] < b.x1 && max[0] > b.x0 && min[1] < b.y1 && max[1] > b.y0 && min[2] < b.z1 && max[2] > b.z0;
  if (hit(FLIGHT_CORRIDOR)) return true;
  for (const b of SHAFTS) if (hit(b)) return true;
  for (const b of ROOM_BOXES) if (hit(b)) return true;
  return false;
}

// ---------------------------------------------------------------------------------------------------
// LOD registry: groups with a bounding sphere and a reach; update() toggles visibility from the camera.
// ---------------------------------------------------------------------------------------------------
export class LodSets {
  constructor() {
    this.sets = [];
    this.stats = { near: 0, mid: 0 };
  }
  /** Register a group after its meshes exist; reach = max camera distance to the sphere surface. */
  add(group, reach, tier) {
    const box = new THREE.Box3();
    group.traverse((o) => {
      if (!o.isMesh) return;
      let sp;
      if (o.isInstancedMesh) {
        if (!o.boundingSphere) o.computeBoundingSphere();
        sp = o.boundingSphere;
      } else {
        if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
        sp = o.geometry.boundingSphere;
      }
      if (!sp) return;
      box.expandByPoint(_v.set(sp.center.x - sp.radius, sp.center.y - sp.radius, sp.center.z - sp.radius));
      box.expandByPoint(_v.set(sp.center.x + sp.radius, sp.center.y + sp.radius, sp.center.z + sp.radius));
    });
    if (box.isEmpty()) return;
    const center = box.getCenter(new THREE.Vector3());
    const radius = box.getSize(new THREE.Vector3()).length() / 2;
    this.sets.push({ group, center, radius, reach, tier });
  }
  /** Toggle sets from the camera position; `nearOn = false` drops the near tier (camera inside a room). */
  update(camPos, nearOn = true) {
    let near = 0;
    let mid = 0;
    for (const s of this.sets) {
      const d = camPos.distanceTo(s.center) - s.radius;
      const on = d < s.reach && (nearOn || s.tier !== "near");
      s.group.visible = on;
      if (on) {
        if (s.tier === "near") near++;
        else mid++;
      }
    }
    this.stats.near = near;
    this.stats.mid = mid;
  }
}

/**
 * A detail tier: instanced protos only, split into z-chunks (each chunk = its own kit/group so the LOD
 * can switch chunks independently). Protos are registered lazily per chunk from `defs`.
 */
export class Tier {
  constructor(materials, defs, { chunks = 1, z0 = BOW, z1 = STERN + 80, name = "tier" } = {}) {
    this.materials = materials;
    this.defs = defs;
    this.chunks = chunks;
    this.z0 = z0;
    this.z1 = z1;
    this.name = name;
    this.kits = [];
    this.groups = [];
    for (let i = 0; i < chunks; i++) {
      const k = new ExtKit(materials);
      this.kits.push(k);
      const g = new THREE.Group();
      g.name = `${name}_${i}`;
      this.groups.push(g);
    }
  }
  kitAt(z) {
    const i = Math.max(0, Math.min(this.chunks - 1, Math.floor(((z - this.z0) / (this.z1 - this.z0)) * this.chunks)));
    return this.kits[i];
  }
  ensure(kit, name) {
    if (!kit.hasProto(name)) {
      const d = this.defs[name];
      if (!d) throw new Error("no proto def " + name);
      kit.proto(name, d.mat, d.geo(), { texel: d.texel || 1 / 10, uv: d.uv || "world" });
    }
  }
  /** Place with pos/rot|quat/scale/color like kit.place. */
  place(name, opts) {
    const kit = this.kitAt(opts.pos[2]);
    this.ensure(kit, name);
    kit.place(name, opts);
  }
  /** Place with a finished matrix (chunk from the matrix translation). */
  placeM(name, m, color) {
    const kit = this.kitAt(m.elements[14]);
    this.ensure(kit, name);
    kit.placeM(name, m, color);
  }
  build(parent, lod, reach) {
    let tris = 0;
    for (let i = 0; i < this.chunks; i++) {
      // the base tier casts (tower and terraces throw real shadows across the hull); detail tiers only receive
      const meshes = this.kits[i].build(this.groups[i], { castShadow: i === 0, receiveShadow: true });
      if (!meshes.length) continue;
      parent.add(this.groups[i]);
      lod.add(this.groups[i], reach, this.name);
      tris += this.kits[i].triangles;
    }
    return tris;
  }
}
