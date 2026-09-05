// Motion lighting for the hub modules (lift lobbies + corridors). Light descriptors are live — the rig
// mirrors intensity / colour / pos every frame — so every moving light here is paired with a visible
// emitter that moves the same way. Kit geometry is merged and static, so the animated emitter pieces
// live in ONE extra mesh per room (`Emitters`): a vertex-coloured unlit material whose colour per piece
// is the emissive × intensity of the kit key it stands in for, and update() writes new levels into the
// colour buffer. Flickers, chases and breathing lamps all share that single draw call; the rotating
// beacon drums are the only separate meshes (they turn). Everything is a function of t (seconds) so the
// state is replayable and nothing allocates per frame.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { col } from "../_shared/palette.js";

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3(1, 1, 1);

export class Emitters {
  constructor(materials) {
    this.materials = materials || {};
    this.geos = [];
    this.pieces = []; // { start, count, r, g, b } — vertex range + base colour
    this.total = 0;
    this.mesh = null;
    this.colors = null;
    this.dirty = false;
  }
  // linear colour of the kit emit key (emissive × intensity); white when the key is unknown (node builds)
  baseColor(mat) {
    const m = this.materials[mat];
    const c = new THREE.Color(m && m.emissive ? m.emissive : 0xffffff);
    if (m && m.emissiveIntensity !== undefined) c.multiplyScalar(m.emissiveIntensity);
    return c;
  }
  /** geometry (consumed) at pos with rot (euler array) or quat, coloured as kit key `mat` × level; returns the piece index */
  add(geo, { pos = [0, 0, 0], rot = null, quat = null, mat = "emitWhite", level = 1 } = {}) {
    if (quat) _q.copy(quat);
    else if (rot) _q.setFromEuler(new THREE.Euler(rot[0], rot[1], rot[2]));
    else _q.identity();
    _m.compose(_p.set(pos[0], pos[1], pos[2]), _q, _s);
    geo.applyMatrix4(_m);
    const g = geo.index ? geo.toNonIndexed() : geo;
    for (const k of Object.keys(g.attributes)) if (!["position", "normal", "uv"].includes(k)) g.deleteAttribute(k);
    if (!g.attributes.normal) g.computeVertexNormals();
    const c = this.baseColor(mat);
    const n = g.attributes.position.count;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      arr[i * 3] = c.r * level;
      arr[i * 3 + 1] = c.g * level;
      arr[i * 3 + 2] = c.b * level;
    }
    g.setAttribute("color", new THREE.BufferAttribute(arr, 3));
    this.pieces.push({ start: this.total, count: n, r: c.r, g: c.g, b: c.b });
    this.total += n;
    this.geos.push(g);
    return this.pieces.length - 1;
  }
  box(mat, cx, cy, cz, sx, sy, sz, opts = {}) {
    return this.add(new THREE.BoxGeometry(sx, sy, sz), { pos: [cx, cy, cz], mat, ...opts });
  }
  /** merge every piece into one unlit vertex-coloured mesh under `group` (one draw call) */
  build(group, name = "emitters") {
    if (!this.geos.length) return null;
    const merged = mergeGeometries(this.geos, false);
    merged.computeBoundingSphere();
    this.mesh = new THREE.Mesh(merged, new THREE.MeshBasicMaterial({ vertexColors: true }));
    this.mesh.name = name;
    this.mesh.castShadow = false;
    this.mesh.receiveShadow = false;
    this.colors = merged.attributes.color;
    group.add(this.mesh);
    this.geos = null;
    return this.mesh;
  }
  /** brightness multiplier on a piece's base colour (0 = dark) */
  level(i, k) {
    const p = this.pieces[i];
    const a = this.colors.array;
    const r = p.r * k;
    const g = p.g * k;
    const b = p.b * k;
    for (let v = p.start, e = p.start + p.count; v < e; v++) {
      a[v * 3] = r;
      a[v * 3 + 1] = g;
      a[v * 3 + 2] = b;
    }
    this.dirty = true;
  }
  /** upload once per frame, after all level() writes */
  flush() {
    if (this.dirty && this.colors) {
      this.colors.needsUpdate = true;
      this.dirty = false;
    }
  }
}

// Integer hash → [0, 1): every irregular effect reads it off integer steps of t so it is replayable.
export function hash01(n) {
  let x = Math.imul(n | 0, 0x27d4eb2d);
  x = Math.imul(x ^ (x >>> 15), 0x2c1b3c6d);
  x = Math.imul(x ^ (x >>> 12), 0x297a2d39);
  x ^= x >>> 15;
  return (x >>> 0) / 4294967296;
}

// Faulty-fixture flicker level 0..1: steady with a faint waver, brief dropouts (~1 in 8 steps of
// 125 ms), and about a third of every 3 s window "buzzing" at 28 Hz between dim and bright.
export function flicker(t, seed) {
  const slow = Math.floor(t * 8);
  const buzzing = hash01(Math.floor(t / 3) * 7 + seed * 13) < 0.35;
  if (buzzing) {
    const h = hash01(Math.floor(t * 28) * 5 + seed * 17);
    return h < 0.5 ? 0.12 + 0.5 * h : 0.75 + 0.3 * (h - 0.5);
  }
  if (hash01(slow * 3 + seed) < 0.12) return 0.06 + 0.3 * hash01(slow * 11 + seed);
  return 0.9 + 0.12 * hash01(slow * 17 + seed);
}

// Slow breathing 0..1 (cosine so the peak lands on t = 0 mod period — and on the harness's t = 40
// for periods that divide 40).
export const breath = (t, period, phase = 0) => 0.5 + 0.5 * Math.cos(((t + phase) / period) * Math.PI * 2);

// Two-window emissive map for the beacon drums (shared).
let windowsTex = null;
function windows() {
  if (windowsTex) return windowsTex;
  const n = 64;
  const data = new Uint8Array(n * 4);
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n;
    const lit = (u > 0.04 && u < 0.41) || (u > 0.54 && u < 0.91);
    const v = lit ? 255 : 0;
    data[i * 4] = v;
    data[i * 4 + 1] = v;
    data[i * 4 + 2] = v;
    data[i * 4 + 3] = 255;
  }
  windowsTex = new THREE.DataTexture(data, n, 1, THREE.RGBAFormat);
  windowsTex.wrapS = THREE.RepeatWrapping;
  windowsTex.magFilter = THREE.LinearFilter;
  windowsTex.minFilter = THREE.LinearFilter;
  windowsTex.colorSpace = THREE.SRGBColorSpace;
  windowsTex.needsUpdate = true;
  return windowsTex;
}
const WINDOW_A = 0.225 * Math.PI * 2; // drum angle of the first window's centre (u 0.225)

/**
 * Rotating warning beacon. The kit builds the mount (wall bracket arm or ceiling stem), base disc, cap
 * and a four-bar cage; the drum — a cloned emit material with a two-window emissive map, so two lit
 * quarters sweep round a dark body — is the one mesh that turns (1 call). The paired point descriptor
 * circles the drum axis at `orbit` m and flashes twice per turn, peaking when a window faces `facing`
 * (the room-facing yaw): a pulse in the light with a moving pool, not a steady lamp. The phase is set
 * so a window faces the room at t = 40 (harness time).
 * @param pos world position of the drum centre; mount "wall" (bracket back at `back` along -facing) | "ceiling" (stem up `stem` m)
 * @returns { update(t), desc }
 */
export function beacon(ctx, kit, PALETTE, pos, { mat = "emitAmber", color = 0xffa028, facing = 0, mount = "wall", back = 0.35, stem = 0.25, rpm = 38, orbit = 0.25, intensity = 12, base = 2.5, distance = 9, priority = 0.6 } = {}) {
  const black = col(PALETTE, "impBlack");
  const dark = col(PALETTE, "impDark");
  const steel = col(PALETTE, "steel");
  const [x, y, z] = pos;
  const r = 0.085;
  const h = 0.17;
  if (mount === "wall") {
    // bracket plate on the wall, arm out to the lamp
    const nx = Math.sin(facing);
    const nz = Math.cos(facing);
    kit.add("paintedMetal", new THREE.BoxGeometry(0.22, 0.24, 0.04), { pos: [x - nx * (back - 0.02), y, z - nz * (back - 0.02)], rot: [0, facing, 0], color: black, texel: 2.5 });
    kit.add("paintedMetal", new THREE.BoxGeometry(0.06, 0.06, back - 0.1), { pos: [x - nx * (back / 2 + 0.03), y - 0.12, z - nz * (back / 2 + 0.03)], rot: [0, facing, 0], color: dark });
    kit.cyl("paintedMetal", x, y - h / 2 - 0.03, z, 0.13, 0.03, "y", { color: black, segments: 16 });
  } else {
    kit.cyl("paintedMetal", x, y + h / 2 + 0.03 + stem / 2, z, 0.025, stem, "y", { color: black, segments: 8 });
    kit.cyl("paintedMetal", x, y + h / 2 + 0.03, z, 0.13, 0.03, "y", { color: black, segments: 16 });
  }
  kit.cyl("paintedMetal", x, y + (mount === "wall" ? h / 2 + 0.015 : -h / 2 - 0.015), z, 0.1, 0.02, "y", { color: black, segments: 16 });
  kit.cyl("paintedMetal", x, y, z, 0.06, h - 0.01, "y", { color: black, segments: 12 });
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
    kit.cyl("metal", x + Math.sin(a) * 0.115, y, z + Math.cos(a) * 0.115, 0.008, h + 0.04, "y", { color: steel, segments: 6 });
  }
  // the drum: cloned emit material with the window map (dark body between the windows)
  const m = ctx.materials && ctx.materials[mat] ? ctx.materials[mat].clone() : new THREE.MeshStandardMaterial({ color: 0x0a0b0d, emissive: new THREE.Color(color), emissiveIntensity: 1.5 });
  m.emissiveMap = windows();
  m.needsUpdate = true;
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 24, 1, true), m);
  drum.position.set(x, y, z);
  drum.castShadow = false;
  drum.receiveShadow = false;
  ctx.group.add(drum);
  const omega = (rpm / 60) * Math.PI * 2;
  const theta0 = facing - WINDOW_A - omega * 40; // window A faces the room at t = 40
  const desc = { type: "point", pos: [x, y, z], color, intensity: base + intensity, distance, priority };
  ctx.lights.push(desc);
  return {
    desc,
    drum,
    update(t) {
      const rot = theta0 + omega * t;
      drum.rotation.y = rot;
      const a = rot + WINDOW_A; // world yaw of window A
      desc.pos[0] = x + Math.sin(a) * orbit;
      desc.pos[2] = z + Math.cos(a) * orbit;
      const c = 0.5 + 0.5 * Math.cos(2 * (a - facing)); // two peaks per turn (both windows)
      desc.intensity = base + intensity * c * c * c;
    },
  };
}

/**
 * Row-by-row "refresh" chase for a directory board: the cursor steps down the rows (dwell s each), the
 * row it is on flashes, refreshed rows above it settle back over ~0.5 s, rows still waiting sit dim,
 * then the board holds for `pause` s and starts over. `rows` = [{ leds: [piece...], cursor: piece }]
 * from directoryBoard(..., { anim }). Returns update(t).
 */
export function boardChase(E, rows, { phase = 0, dwell = 0.24, pause = 1.7 } = {}) {
  const N = rows.length;
  const T = N * dwell + pause;
  return (t) => {
    const u = (t + phase) % T;
    const active = u < N * dwell ? Math.floor(u / dwell) : -1;
    for (let r = 0; r < N; r++) {
      const row = rows[r];
      let k;
      if (r === active) k = 1.9;
      else if (active < 0 || r < active) k = 1 + 0.7 * Math.exp(-(u - (r + 1) * dwell) / 0.45);
      else k = 0.55;
      for (let i = 0; i < row.leds.length; i++) E.level(row.leds[i], k);
      if (row.cursor != null) E.level(row.cursor, r === active ? 1.5 : 0);
    }
  };
}
