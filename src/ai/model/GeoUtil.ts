/**
 * Procedural mesh construction primitives.
 *
 * Everything the soldier is made of is built from four operations: a lofted tube
 * along a polyline (limbs, straps, barrels), a swept superelliptical profile (the
 * torso, the plate carrier that wraps it, and every pouch), a revolved ellipsoid
 * shell (helmet, skull, dome) and a box (receivers, magazines, plates). That is
 * deliberately a small set — the shapes that matter live in the *profiles*, not in
 * the number of generators.
 *
 * Generators write into a `Part` in their own natural space; a transform stack on
 * the part places them, so the same rounded-profile code makes a torso, a mag
 * pouch on a chest rig and a boot without any of them knowing where they are.
 *
 * Buffers are plain number arrays during construction and are copied into typed
 * arrays exactly once, in `assemble`. Vertex colours are written per part so a
 * whole squad's worth of material variation costs no extra draw calls.
 */
import * as THREE from 'three';

/**
 * Texture repeats per metre.
 *
 * The procgen fabrics are authored for roughly 1 m tiles with five camo blobs
 * across them. At one repeat per metre the disruptive pattern comes out at 20 cm
 * and reads as cow hide on a 45 cm torso, so the whole set is packed tighter: at
 * this rate a blob is about 7 cm, which is what a real uniform looks like at the
 * distances the player fights at.
 */
const UV_PER_METRE = 2.7;

export interface Tint {
  r: number;
  g: number;
  b: number;
}

export const tint = (hex: number, scale = 1): Tint => ({
  r: (((hex >> 16) & 0xff) / 255) * scale,
  g: (((hex >> 8) & 0xff) / 255) * scale,
  b: ((hex & 0xff) / 255) * scale,
});

/**
 * One material slot's worth of geometry, plus the bones its vertices may bind to.
 *
 * Restricting the bone set per part is what keeps skinning clean without any
 * hand-authored weights: a glove can only ever be influenced by the hand and the
 * forearm, so no amount of proximity lets a thigh drag it around.
 */
export class Part {
  readonly position: number[] = [];
  readonly normal: number[] = [];
  readonly uv: number[] = [];
  readonly color: number[] = [];
  readonly index: number[] = [];

  private readonly stack: THREE.Matrix4[] = [];
  private current: THREE.Matrix4 | null = null;
  private readonly normalMatrix = new THREE.Matrix3();
  private readonly v = new THREE.Vector3();
  private readonly n = new THREE.Vector3();

  constructor(
    readonly slot: number,
    readonly bones: readonly number[],
  ) {}

  get vertexCount(): number {
    return this.position.length / 3;
  }

  get triangleCount(): number {
    return this.index.length / 3;
  }

  /** Pushes a placement transform. Generators below it work in local space. */
  push(matrix: THREE.Matrix4): void {
    const next = new THREE.Matrix4();
    if (this.current) next.multiplyMatrices(this.current, matrix);
    else next.copy(matrix);
    this.stack.push(next);
    this.current = next;
    this.normalMatrix.setFromMatrix4(next);
  }

  pop(): void {
    this.stack.pop();
    this.current = this.stack.length > 0 ? this.stack[this.stack.length - 1] : null;
    if (this.current) this.normalMatrix.setFromMatrix4(this.current);
  }

  /** Convenience: position + euler rotation + uniform or per-axis scale. */
  pushTRS(position: THREE.Vector3, rotation?: THREE.Euler, scale?: THREE.Vector3): void {
    TRS_M.identity();
    if (rotation) TRS_M.makeRotationFromEuler(rotation);
    if (scale) TRS_M.scale(scale);
    TRS_M.setPosition(position);
    this.push(TRS_M);
  }

  vertex(
    x: number,
    y: number,
    z: number,
    nx: number,
    ny: number,
    nz: number,
    u: number,
    v: number,
    c: Tint,
  ): number {
    const i = this.position.length / 3;
    if (this.current) {
      this.v.set(x, y, z).applyMatrix4(this.current);
      this.n.set(nx, ny, nz).applyMatrix3(this.normalMatrix).normalize();
      this.position.push(this.v.x, this.v.y, this.v.z);
      this.normal.push(this.n.x, this.n.y, this.n.z);
    } else {
      this.position.push(x, y, z);
      const len = Math.max(1e-6, Math.hypot(nx, ny, nz));
      this.normal.push(nx / len, ny / len, nz / len);
    }
    this.uv.push(u, v);
    this.color.push(c.r, c.g, c.b);
    return i;
  }

  triangle(a: number, b: number, c: number): void {
    this.index.push(a, b, c);
  }

  quad(a: number, b: number, c: number, d: number): void {
    this.index.push(a, b, c, a, c, d);
  }
}

const TRS_M = /* @__PURE__ */ new THREE.Matrix4();
const UNIT_Z = /* @__PURE__ */ new THREE.Vector3(0, 0, 1);

// ---------------------------------------------------------------------------
// Lofted tube
// ---------------------------------------------------------------------------

const tubeScratch = {
  dir: new THREE.Vector3(),
  up: new THREE.Vector3(),
  right: new THREE.Vector3(),
  ref: new THREE.Vector3(),
};

export interface TubeOptions {
  sides: number;
  /** Per-ring radius, one entry per path point. */
  radii: readonly number[];
  /** Per-ring lateral squash, 1 = circular. */
  flatten?: readonly number[];
  capStart?: boolean;
  capEnd?: boolean;
  tint: Tint;
  /** Seeds the cross-section frame, so a squashed limb faces the right way. */
  reference?: THREE.Vector3;
}

/**
 * Lofts a tube along `path`, transporting the cross-section frame from ring to
 * ring so a bent limb does not twist. `radii` is sampled per ring, which is what
 * gives a forearm its taper and a shoulder its deltoid bulge.
 */
export function addTube(part: Part, path: readonly THREE.Vector3[], opts: TubeOptions): void {
  const rings = path.length;
  if (rings < 2) return;
  const sides = Math.max(3, opts.sides);
  const base = part.vertexCount;
  const s = tubeScratch;

  s.ref.copy(opts.reference ?? UNIT_Z);
  let accumulated = 0;

  for (let r = 0; r < rings; r++) {
    const point = path[r];
    // Forward difference at the ends, central in between, so a ring at a joint
    // splits the bend instead of shearing across it.
    if (r === 0) s.dir.subVectors(path[1], path[0]);
    else if (r === rings - 1) s.dir.subVectors(path[rings - 1], path[rings - 2]);
    else s.dir.subVectors(path[r + 1], path[r - 1]);
    if (s.dir.lengthSq() < 1e-10) s.dir.set(0, 1, 0);
    s.dir.normalize();

    if (r > 0) accumulated += point.distanceTo(path[r - 1]);

    if (Math.abs(s.ref.dot(s.dir)) > 0.94) s.ref.set(s.dir.y, s.dir.z, s.dir.x);
    s.right.crossVectors(s.dir, s.ref).normalize();
    s.up.crossVectors(s.right, s.dir).normalize();
    s.ref.copy(s.up);

    const radius = opts.radii[Math.min(r, opts.radii.length - 1)];
    const flat = opts.flatten ? opts.flatten[Math.min(r, opts.flatten.length - 1)] : 1;
    const v = accumulated * UV_PER_METRE;

    for (let i = 0; i <= sides; i++) {
      const a = (i / sides) * Math.PI * 2;
      const ca = Math.cos(a) * flat;
      const sa = Math.sin(a);
      const nx = s.right.x * ca + s.up.x * sa;
      const ny = s.right.y * ca + s.up.y * sa;
      const nz = s.right.z * ca + s.up.z * sa;
      part.vertex(
        point.x + nx * radius,
        point.y + ny * radius,
        point.z + nz * radius,
        nx,
        ny,
        nz,
        (i / sides) * radius * Math.PI * 2 * UV_PER_METRE,
        v,
        opts.tint,
      );
    }
  }

  const stride = sides + 1;
  for (let r = 0; r < rings - 1; r++) {
    for (let i = 0; i < sides; i++) {
      const a = base + r * stride + i;
      part.quad(a, a + stride, a + stride + 1, a + 1);
    }
  }

  if (opts.capStart) addFan(part, path[0], path[1], opts.radii[0], sides, opts.tint, true);
  if (opts.capEnd) {
    addFan(
      part,
      path[rings - 1],
      path[rings - 2],
      opts.radii[Math.min(rings - 1, opts.radii.length - 1)],
      sides,
      opts.tint,
      false,
    );
  }
}

/** Domed cap for a tube end. Rounded rather than flat: silhouettes read better. */
function addFan(
  part: Part,
  centre: THREE.Vector3,
  towards: THREE.Vector3,
  radius: number,
  sides: number,
  colour: Tint,
  invert: boolean,
): void {
  const s = tubeScratch;
  s.dir.subVectors(centre, towards).normalize();
  if (invert) s.dir.negate();
  s.ref.set(0, 0, 1);
  if (Math.abs(s.ref.dot(s.dir)) > 0.94) s.ref.set(1, 0, 0);
  s.right.crossVectors(s.dir, s.ref).normalize();
  s.up.crossVectors(s.right, s.dir).normalize();

  const rows = 2;
  const base = part.vertexCount;
  for (let row = 0; row <= rows; row++) {
    const t = row / rows;
    const ringRadius = Math.cos((t * Math.PI) / 2) * radius;
    const push = Math.sin((t * Math.PI) / 2) * radius * 0.72;
    for (let i = 0; i <= sides; i++) {
      const a = (i / sides) * Math.PI * 2;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      const rx = s.right.x * ca + s.up.x * sa;
      const ry = s.right.y * ca + s.up.y * sa;
      const rz = s.right.z * ca + s.up.z * sa;
      part.vertex(
        centre.x + rx * ringRadius + s.dir.x * push,
        centre.y + ry * ringRadius + s.dir.y * push,
        centre.z + rz * ringRadius + s.dir.z * push,
        rx * (1 - t) + s.dir.x * t,
        ry * (1 - t) + s.dir.y * t,
        rz * (1 - t) + s.dir.z * t,
        (i / sides) * radius * 6.28 * UV_PER_METRE,
        t * radius * UV_PER_METRE,
        colour,
      );
    }
  }
  const stride = sides + 1;
  for (let row = 0; row < rows; row++) {
    for (let i = 0; i < sides; i++) {
      const a = base + row * stride + i;
      if (invert) part.quad(a, a + 1, a + stride + 1, a + stride);
      else part.quad(a, a + stride, a + stride + 1, a + 1);
    }
  }
}

// ---------------------------------------------------------------------------
// Swept superelliptical profile — torsos, carriers, pouches, boots
// ---------------------------------------------------------------------------

export interface Section {
  y: number;
  /** Half width and half depth of the cross-section. */
  rx: number;
  rz: number;
  /** Superellipse exponent: 2 is an ellipse, 6 is nearly a rounded box. */
  power?: number;
  /** Lateral and forward offset, which is what gives a spine its curve. */
  z?: number;
  x?: number;
  tint?: Tint;
}

/**
 * Sweeps a stack of superellipse cross-sections up the local Y axis.
 *
 * A torso is not a cylinder and not a box; it is a rounded rectangle whose aspect
 * ratio and exponent change as it rises. Sweeping the profile gets the shoulders
 * wide, the waist narrow and the ribcage boxy without authoring a vertex — and the
 * same generator, with a high exponent and four sections, is a webbing pouch whose
 * edges catch light like fabric instead of like a plastic cube.
 */
export function addSweep(
  part: Part,
  sections: readonly Section[],
  sides: number,
  defaultTint: Tint,
  capBottom = true,
  capTop = true,
): void {
  const rings = sections.length;
  if (rings < 2) return;
  const base = part.vertexCount;
  const stride = sides + 1;

  for (let r = 0; r < rings; r++) {
    const sec = sections[r];
    const power = sec.power ?? 2.4;
    const colour = sec.tint ?? defaultTint;
    const below = sections[Math.max(0, r - 1)];
    const above = sections[Math.min(rings - 1, r + 1)];
    const dy = Math.max(1e-4, above.y - below.y);
    const dRx = (above.rx - below.rx) / dy;
    const dRz = (above.rz - below.rz) / dy;

    for (let i = 0; i <= sides; i++) {
      const a = (i / sides) * Math.PI * 2;
      const px = superCos(Math.cos(a), power);
      const pz = superCos(Math.sin(a), power);
      const nx = px / Math.max(0.01, sec.rx);
      const nz = pz / Math.max(0.01, sec.rz);
      // Tilt the normal with the taper, or a tapering sweep lights like a stack
      // of cylinders.
      const ny = -(px * dRx + pz * dRz) * 0.6;

      part.vertex(
        (sec.x ?? 0) + px * sec.rx,
        sec.y,
        (sec.z ?? 0) + pz * sec.rz,
        nx,
        ny,
        nz,
        (i / sides) * (sec.rx + sec.rz) * 3.14 * UV_PER_METRE,
        sec.y * UV_PER_METRE,
        colour,
      );
    }
  }

  for (let r = 0; r < rings - 1; r++) {
    for (let i = 0; i < sides; i++) {
      const a = base + r * stride + i;
      part.quad(a, a + stride, a + stride + 1, a + 1);
    }
  }

  if (capBottom) addSectionCap(part, sections[0], sides, defaultTint, -1);
  if (capTop) addSectionCap(part, sections[rings - 1], sides, defaultTint, 1);
}

function addSectionCap(
  part: Part,
  sec: Section,
  sides: number,
  defaultTint: Tint,
  dir: number,
): void {
  const power = sec.power ?? 2.4;
  const colour = sec.tint ?? defaultTint;
  const centre = part.vertex(sec.x ?? 0, sec.y, sec.z ?? 0, 0, dir, 0, 0.5, 0.5, colour);
  const base = part.vertexCount;
  for (let i = 0; i <= sides; i++) {
    const a = (i / sides) * Math.PI * 2;
    const px = superCos(Math.cos(a), power);
    const pz = superCos(Math.sin(a), power);
    part.vertex(
      (sec.x ?? 0) + px * sec.rx,
      sec.y,
      (sec.z ?? 0) + pz * sec.rz,
      0,
      dir,
      0,
      0.5 + px * 0.5,
      0.5 + pz * 0.5,
      colour,
    );
  }
  for (let i = 0; i < sides; i++) {
    if (dir > 0) part.triangle(centre, base + i, base + i + 1);
    else part.triangle(centre, base + i + 1, base + i);
  }
}

/** Signed superellipse coordinate: |cos|^(2/p) with the sign preserved. */
function superCos(v: number, power: number): number {
  const s = v < 0 ? -1 : 1;
  return s * Math.pow(Math.abs(v), 2 / power);
}

/**
 * Rounded box centred on the origin of the current transform.
 *
 * Built as a four-section sweep with a high superellipse exponent, so the
 * vertical edges are chamfered and the top and bottom are slightly inset. Used
 * for every pouch, plate and magazine on the model.
 */
export function addRoundedBox(
  part: Part,
  half: THREE.Vector3,
  colour: Tint,
  opts: { sides?: number; power?: number; topScale?: number; bottomScale?: number } = {},
): void {
  const sides = opts.sides ?? 10;
  const power = opts.power ?? 5;
  const top = opts.topScale ?? 1;
  const bottom = opts.bottomScale ?? 1;
  const inset = 0.82;
  addSweep(
    part,
    [
      { y: -half.y, rx: half.x * bottom * inset, rz: half.z * bottom * inset, power },
      { y: -half.y * 0.78, rx: half.x * bottom, rz: half.z * bottom, power },
      { y: half.y * 0.78, rx: half.x * top, rz: half.z * top, power },
      { y: half.y, rx: half.x * top * inset, rz: half.z * top * inset, power },
    ],
    sides,
    colour,
  );
}

// ---------------------------------------------------------------------------
// Revolved ellipsoid shell — helmets, skulls, domes, kneepads
// ---------------------------------------------------------------------------

export interface DomeOptions {
  centre: THREE.Vector3;
  /** Radii along x, y, z. */
  radius: THREE.Vector3;
  segments: number;
  rings: number;
  /** Polar angle the shell starts and stops at, radians from +Y. */
  from?: number;
  to?: number;
  tint: Tint;
  /** Scales the +Z (behind) and -Z (in front) halves independently. */
  backScale?: number;
  frontScale?: number;
}

/** Ellipsoid shell section. `from`/`to` cut it into a dome, a band or a ball. */
export function addDome(part: Part, opts: DomeOptions): void {
  const from = opts.from ?? 0;
  const to = opts.to ?? Math.PI;
  const rings = Math.max(2, opts.rings);
  const segments = Math.max(3, opts.segments);
  const base = part.vertexCount;
  const stride = segments + 1;
  const back = opts.backScale ?? 1;
  const front = opts.frontScale ?? 1;
  const r = opts.radius;

  for (let ring = 0; ring <= rings; ring++) {
    const polar = from + ((to - from) * ring) / rings;
    const sp = Math.sin(polar);
    const cp = Math.cos(polar);
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      // +Z is behind the character; it faces -Z.
      const depth = sa > 0 ? back : front;
      const ux = sp * ca;
      const uy = cp;
      const uz = sp * sa * depth;
      const nx = ux / r.x;
      const ny = uy / r.y;
      const nz = uz / r.z;
      part.vertex(
        opts.centre.x + ux * r.x,
        opts.centre.y + uy * r.y,
        opts.centre.z + uz * r.z,
        nx,
        ny,
        nz,
        (i / segments) * 2,
        (ring / rings) * 2,
        opts.tint,
      );
    }
  }

  for (let ring = 0; ring < rings; ring++) {
    for (let i = 0; i < segments; i++) {
      const a = base + ring * stride + i;
      part.quad(a, a + 1, a + stride + 1, a + stride);
    }
  }
}

// ---------------------------------------------------------------------------
// Box
// ---------------------------------------------------------------------------

const BOX_FACES: ReadonlyArray<{
  n: readonly [number, number, number];
  c: ReadonlyArray<readonly [number, number, number]>;
}> = [
  { n: [0, 0, -1], c: [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1]] },
  { n: [0, 0, 1], c: [[1, -1, 1], [-1, -1, 1], [-1, 1, 1], [1, 1, 1]] },
  { n: [1, 0, 0], c: [[1, -1, -1], [1, -1, 1], [1, 1, 1], [1, 1, -1]] },
  { n: [-1, 0, 0], c: [[-1, -1, 1], [-1, -1, -1], [-1, 1, -1], [-1, 1, 1]] },
  { n: [0, 1, 0], c: [[-1, 1, -1], [1, 1, -1], [1, 1, 1], [-1, 1, 1]] },
  { n: [0, -1, 0], c: [[-1, -1, 1], [1, -1, 1], [1, -1, -1], [-1, -1, -1]] },
];

/** Flat-shaded box centred on the current transform's origin. */
export function addBox(
  part: Part,
  half: THREE.Vector3,
  colour: Tint,
  taper: { top?: number; front?: number } = {},
): void {
  const top = taper.top ?? 1;
  const front = taper.front ?? 1;
  for (const face of BOX_FACES) {
    const ids: number[] = [];
    for (let i = 0; i < 4; i++) {
      const [sx, sy, sz] = face.c[i];
      const scale = sy > 0 ? top : 1;
      const depth = sz < 0 ? front : 1;
      ids.push(
        part.vertex(
          sx * half.x * scale * depth,
          sy * half.y,
          sz * half.z * scale,
          face.n[0],
          face.n[1],
          face.n[2],
          (i === 1 || i === 2 ? 1 : 0) * half.x * 4 * UV_PER_METRE,
          (i >= 2 ? 1 : 0) * half.y * 4 * UV_PER_METRE,
          colour,
        ),
      );
    }
    part.quad(ids[0], ids[1], ids[2], ids[3]);
  }
}

// ---------------------------------------------------------------------------
// Assembly
// ---------------------------------------------------------------------------

export interface BoneSegment {
  /** Bind-space start of the bone, i.e. its own joint. */
  start: THREE.Vector3;
  /** Bind-space end, i.e. the joint below it. */
  end: THREE.Vector3;
}

export interface AssembledGeometry {
  geometry: THREE.BufferGeometry;
  triangles: number;
  vertices: number;
  /** Material slot per geometry group, in group order. */
  slots: number[];
}

/**
 * Concatenates parts without skinning attributes, for props that are parented to
 * a bone rather than deformed by one — which is every weapon. Same grouping rule,
 * so a rifle is two draw calls (metal, polymer) no matter how many pieces it has.
 */
export function assembleStatic(parts: readonly Part[]): AssembledGeometry {
  const slots = [...new Set(parts.map((p) => p.slot))].sort((a, b) => a - b);

  let vertexTotal = 0;
  let indexTotal = 0;
  for (const part of parts) {
    vertexTotal += part.vertexCount;
    indexTotal += part.index.length;
  }

  const position = new Float32Array(vertexTotal * 3);
  const normal = new Float32Array(vertexTotal * 3);
  const uv = new Float32Array(vertexTotal * 2);
  const color = new Float32Array(vertexTotal * 3);
  const index = vertexTotal > 65535 ? new Uint32Array(indexTotal) : new Uint16Array(indexTotal);

  const geometry = new THREE.BufferGeometry();
  let vertexCursor = 0;
  let indexCursor = 0;
  const groupSlots: number[] = [];

  for (const slot of slots) {
    const groupStart = indexCursor;
    for (const part of parts) {
      if (part.slot !== slot) continue;
      const localBase = vertexCursor;
      position.set(part.position, vertexCursor * 3);
      normal.set(part.normal, vertexCursor * 3);
      uv.set(part.uv, vertexCursor * 2);
      color.set(part.color, vertexCursor * 3);
      for (let i = 0; i < part.index.length; i++) {
        index[indexCursor + i] = localBase + part.index[i];
      }
      indexCursor += part.index.length;
      vertexCursor += part.vertexCount;
    }
    geometry.addGroup(groupStart, indexCursor - groupStart, groupSlots.length);
    groupSlots.push(slot);
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(position, 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(normal, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geometry.setAttribute('color', new THREE.BufferAttribute(color, 3));
  geometry.setIndex(new THREE.BufferAttribute(index, 1));
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();

  return { geometry, triangles: indexTotal / 3, vertices: vertexTotal, slots: groupSlots };
}

/**
 * Concatenates parts into one geometry, computing skin weights as it goes.
 *
 * Parts are emitted grouped by material slot so the result is one draw call per
 * material rather than one per part, and the groups are contiguous, which is what
 * lets three render them without rebinding vertex buffers.
 *
 * Weights come from inverse-power distance to each candidate bone *segment*, not
 * to the bone's origin: a vertex halfway down a thigh must be dominated by the
 * thigh, and measuring to the hip joint would hand it to the pelvis. Four
 * influences, normalised, so a limb deforms smoothly rather than creasing.
 */
export function assemble(
  parts: readonly Part[],
  segments: readonly BoneSegment[],
  falloff = 2.6,
  /**
   * Collapses every part into one group, and so onto one material.
   *
   * For the far level of detail only. Slot count is draw-call count in both the
   * camera pass and every shadow cascade, so a soldier who is forty pixels tall
   * costs four of them for a distinction between kevlar and webbing that is
   * smaller than a pixel. The vertex colours survive the merge, which is what
   * carries the read at that range anyway.
   */
  mergeSlots = false,
): AssembledGeometry {
  const slots = mergeSlots
    ? [parts[0]?.slot ?? 0]
    : [...new Set(parts.map((p) => p.slot))].sort((a, b) => a - b);

  let vertexTotal = 0;
  let indexTotal = 0;
  for (const part of parts) {
    vertexTotal += part.vertexCount;
    indexTotal += part.index.length;
  }

  const position = new Float32Array(vertexTotal * 3);
  const normal = new Float32Array(vertexTotal * 3);
  const uv = new Float32Array(vertexTotal * 2);
  const color = new Float32Array(vertexTotal * 3);
  const skinIndex = new Uint16Array(vertexTotal * 4);
  const skinWeight = new Float32Array(vertexTotal * 4);
  const index = vertexTotal > 65535 ? new Uint32Array(indexTotal) : new Uint16Array(indexTotal);

  const geometry = new THREE.BufferGeometry();
  let vertexCursor = 0;
  let indexCursor = 0;
  const groupSlots: number[] = [];

  const candidateDist: number[] = [];
  const candidateBone: number[] = [];

  for (const slot of slots) {
    const groupStart = indexCursor;
    for (const part of parts) {
      if (!mergeSlots && part.slot !== slot) continue;
      const localBase = vertexCursor;
      const count = part.vertexCount;

      position.set(part.position, vertexCursor * 3);
      normal.set(part.normal, vertexCursor * 3);
      uv.set(part.uv, vertexCursor * 2);
      color.set(part.color, vertexCursor * 3);

      for (let v = 0; v < count; v++) {
        const px = part.position[v * 3];
        const py = part.position[v * 3 + 1];
        const pz = part.position[v * 3 + 2];

        candidateDist.length = 0;
        candidateBone.length = 0;
        for (const bone of part.bones) {
          const segment = segments[bone];
          if (!segment) continue;
          candidateDist.push(distanceToSegment(px, py, pz, segment));
          candidateBone.push(bone);
        }

        let sum = 0;
        for (let k = 0; k < 4; k++) {
          let best = -1;
          let bestValue = Infinity;
          for (let c = 0; c < candidateDist.length; c++) {
            if (candidateDist[c] < bestValue) {
              bestValue = candidateDist[c];
              best = c;
            }
          }
          const out = (vertexCursor + v) * 4 + k;
          if (best < 0) {
            skinIndex[out] = 0;
            skinWeight[out] = 0;
            continue;
          }
          const w = Math.pow(1 / (bestValue + 0.012), falloff);
          skinIndex[out] = candidateBone[best];
          skinWeight[out] = w;
          sum += w;
          candidateDist[best] = Infinity;
        }
        if (sum > 0) {
          const inv = 1 / sum;
          for (let k = 0; k < 4; k++) skinWeight[(vertexCursor + v) * 4 + k] *= inv;
        } else {
          skinWeight[(vertexCursor + v) * 4] = 1;
        }
      }

      for (let i = 0; i < part.index.length; i++) {
        index[indexCursor + i] = localBase + part.index[i];
      }
      indexCursor += part.index.length;
      vertexCursor += count;
    }
    geometry.addGroup(groupStart, indexCursor - groupStart, groupSlots.length);
    groupSlots.push(slot);
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(position, 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(normal, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geometry.setAttribute('color', new THREE.BufferAttribute(color, 3));
  geometry.setAttribute('skinIndex', new THREE.BufferAttribute(skinIndex, 4));
  geometry.setAttribute('skinWeight', new THREE.BufferAttribute(skinWeight, 4));
  geometry.setIndex(new THREE.BufferAttribute(index, 1));
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  // Skinning moves vertices outside the bind bounds; a generous sphere is far
  // cheaper than a limb popping in and out of view at the frustum edge.
  if (geometry.boundingSphere) geometry.boundingSphere.radius *= 1.7;

  return { geometry, triangles: indexTotal / 3, vertices: vertexTotal, slots: groupSlots };
}

function distanceToSegment(x: number, y: number, z: number, seg: BoneSegment): number {
  const ax = seg.start.x;
  const ay = seg.start.y;
  const az = seg.start.z;
  const bx = seg.end.x - ax;
  const by = seg.end.y - ay;
  const bz = seg.end.z - az;
  const lenSq = bx * bx + by * by + bz * bz;
  let t = 0;
  if (lenSq > 1e-9) {
    t = ((x - ax) * bx + (y - ay) * by + (z - az) * bz) / lenSq;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
  }
  const dx = x - (ax + bx * t);
  const dy = y - (ay + by * t);
  const dz = z - (az + bz * t);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}
