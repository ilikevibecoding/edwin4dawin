import * as THREE from 'three';
import { MeshBuilder } from '../core/meshbuilder';
import { clamp01, lerp, Rng } from '../core/math';
import { getMaps, texturedMaterial } from '../core/textures';
import { barrelGeometry, chestGeometry, paint, transformed } from '../world/props';

/**
 * Sloop dimensions, in metres, in ship-local space:
 *   +X forward (bow)   +Y up   +Z starboard
 * The waterline sits at y = 0.
 */
export const SHIP = {
  bow: 9.6,
  stern: -9.4,
  beam: 3.35,
  deckY: 1.05,
  upperDeckY: 2.45,
  upperDeckX: -4.3,
  holdFloorY: -1.35,
  mastX: 0.4,
  mastTop: 13.2,
  yardY: 8.6,
  yardHalf: 4.2,
  sailTop: 8.35,
  sailBottom: 3.05,
  crowsNestY: 9.8,
  hatch: { minX: 1.4, maxX: 3.2, minZ: -0.95, maxZ: 0.95 },
} as const;

const HULL_STATIONS = 44;
const HULL_LEVELS = 9;

type Table = readonly (readonly [number, number])[];

function tableAt(table: Table, t: number): number {
  if (t <= table[0][0]) return table[0][1];
  const last = table[table.length - 1];
  if (t >= last[0]) return last[1];
  for (let i = 0; i < table.length - 1; i++) {
    const [t0, v0] = table[i];
    const [t1, v1] = table[i + 1];
    if (t >= t0 && t <= t1) {
      const k = (t - t0) / (t1 - t0);
      // Smooth interpolation keeps the hull free of visible creases.
      return lerp(v0, v1, k * k * (3 - 2 * k));
    }
  }
  return last[1];
}

/** Half-beam multiplier along the hull, 0 = transom, 1 = bow. */
const BEAM_TABLE: Table = [
  [0, 0.6],
  [0.1, 0.82],
  [0.26, 0.95],
  [0.42, 1.0],
  [0.58, 0.97],
  [0.72, 0.85],
  [0.85, 0.6],
  [0.94, 0.3],
  [1, 0.05],
];

const KEEL_TABLE: Table = [
  [0, -1.35],
  [0.12, -1.85],
  [0.3, -2.05],
  [0.5, -2.1],
  [0.68, -2.0],
  [0.82, -1.68],
  [0.92, -1.0],
  [1, 0.2],
];

/** Height of the bulwark cap (top of the hull side). */
const SHEER_TABLE: Table = [
  [0, 2.15],
  [0.15, 1.8],
  [0.35, 1.62],
  [0.5, 1.6],
  [0.65, 1.68],
  [0.8, 1.9],
  [0.92, 2.2],
  [1, 2.7],
];

export interface HullShape {
  /** 0 at the transom, 1 at the bow tip. */
  halfBeam(t: number): number;
  keelY(t: number): number;
  sheerY(t: number): number;
  /** Half-width of the hull at a given x and height y. */
  widthAt(x: number, y: number): number;
  tFromX(x: number): number;
  xFromT(t: number): number;
}

export const hullShape: HullShape = {
  halfBeam: (t) => SHIP.beam * tableAt(BEAM_TABLE, t),
  keelY: (t) => tableAt(KEEL_TABLE, t),
  sheerY: (t) => tableAt(SHEER_TABLE, t),
  tFromX: (x) => clamp01((x - SHIP.stern) / (SHIP.bow - SHIP.stern)),
  xFromT: (t) => lerp(SHIP.stern, SHIP.bow, t),
  widthAt(x, y) {
    const t = this.tFromX(x);
    const keel = this.keelY(t);
    const sheer = this.sheerY(t);
    const v = clamp01((y - keel) / (sheer - keel));
    return this.halfBeam(t) * Math.pow(Math.sin(v * Math.PI * 0.5), 0.55);
  },
};

export interface WalkSurface {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  /** Height at minX. */
  y0: number;
  /** Height at maxX (differs from y0 for stairs and ramps). */
  y1: number;
  /** Interior surfaces are below deck - used for flooding and audio. */
  interior?: boolean;
  /** Rectangular openings the player falls through, e.g. the deck hatch. */
  holes?: { minX: number; maxX: number; minZ: number; maxZ: number }[];
}

export interface Blocker {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

export interface Ladder {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  bottomY: number;
  topY: number;
}

export interface ShipCollision {
  surfaces: WalkSurface[];
  blockers: Blocker[];
  ladders: Ladder[];
}

export interface CannonMount {
  index: number;
  side: -1 | 1;
  /** Yaw pivot, parented to the ship. */
  pivot: THREE.Object3D;
  /** Pitch pivot, child of `pivot`. */
  elevation: THREE.Object3D;
  /** Muzzle marker, child of `elevation`. */
  muzzle: THREE.Object3D;
  /** Where the player stands to man it. */
  stand: THREE.Vector3;
  restYaw: number;
}

export interface ShipModel {
  group: THREE.Group;
  hullMesh: THREE.Mesh;
  yard: THREE.Object3D;
  sail: THREE.Mesh;
  sailMaterial: THREE.ShaderMaterial;
  jib: THREE.Mesh;
  jibMaterial: THREE.ShaderMaterial;
  flag: THREE.Mesh;
  flagMaterial: THREE.ShaderMaterial;
  wheel: THREE.Object3D;
  capstan: THREE.Object3D;
  /** The anchor itself, slid up and down by `anchorRaise`. */
  anchorGroup: THREE.Object3D;
  /** Instanced chain links, laid along the hawse-to-anchor line each frame. */
  chainLinks: THREE.InstancedMesh;
  /** Rudder on the sternpost, swung by the helm. */
  rudder: THREE.Object3D;
  cannons: CannonMount[];
  holdWater: THREE.Mesh;
  holdWaterMaterial: THREE.ShaderMaterial;
  lanternLight: THREE.PointLight;
  holdLight: THREE.PointLight;
  collision: ShipCollision;
  anchors: Record<string, THREE.Object3D>;
}

export interface SloopOptions {
  hullColor?: number;
  sailColor?: number;
  trimColor?: number;
  emblem?: 'none' | 'skull';
  /** Skeleton ships get tattered sails and rotten planks. */
  ghostly?: boolean;
}

const WOOD_LIGHT = 0x7a5834;
const WOOD_MID = 0x654828;
const WOOD_DARK = 0x4a3520;
const WOOD_TAR = 0x2b2116;
const IRON = 0x40403f;
const ROPE = 0x8a7550;

/** Thin cylinder between two points - used for spars, ropes and rails. */
function strut(
  builder: MeshBuilder,
  from: THREE.Vector3,
  to: THREE.Vector3,
  radius: number,
  color: number,
  segments = 6,
): void {
  const dir = new THREE.Vector3().subVectors(to, from);
  const length = dir.length();
  if (length < 1e-4) return;
  const geometry = new THREE.CylinderGeometry(radius, radius, length, segments, 1);
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  matrix.compose(new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5), quaternion, new THREE.Vector3(1, 1, 1));
  // UVs in metres: around the circumference, then along the length.
  builder.addGeometry(geometry, color, matrix, [radius * Math.PI * 2, length]);
  geometry.dispose();
}

/**
 * Canvas that billows with the wind; `uFurl` slides the sail up its yard.
 * `billowAxis` is the direction out of the canvas in the mesh's local space -
 * +X for the square mainsail lofted onto YZ, +Z for the fore-and-aft jib.
 */
function sailMaterial(color: number, ghostly: boolean, billowAxis = new THREE.Vector3(1, 0, 0)): THREE.ShaderMaterial {
  const canvasMaps = getMaps('canvas');
  return new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    transparent: ghostly,
    uniforms: {
      uTime: { value: 0 },
      uFurl: { value: 0 },
      uBillow: { value: 0.6 },
      uColor: { value: new THREE.Color(color) },
      uShade: { value: new THREE.Color(color).multiplyScalar(0.62) },
      uWindSide: { value: 1 },
      uOpacity: { value: ghostly ? 0.82 : 1 },
      uBillowAxis: { value: billowAxis.clone() },
      uSunDir: { value: new THREE.Vector3(0.3, 0.8, 0.4) },
      uSunColor: { value: new THREE.Color(0xfff0cf) },
      uAmbient: { value: new THREE.Color(0x88a4b8) },
      uCanvasMap: { value: canvasMaps.map },
      uCanvasNormal: { value: canvasMaps.normalMap },
      uWeaveTiles: { value: new THREE.Vector2(3.5, 2.5) },
    },
    vertexShader: /* glsl */ `
      uniform float uTime;
      uniform float uFurl;
      uniform float uBillow;
      uniform float uWindSide;
      uniform vec3 uBillowAxis;
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vTangent;
      varying vec3 vBitangent;
      varying float vBillow;

      void main() {
        vUv = uv;
        vec3 p = position;

        // Furling gathers the canvas up towards the yard (uv.y = 1 at the top).
        float drop = 1.0 - uFurl;
        p.y = mix(position.y * 0.0, position.y, drop) + (1.0 - drop) * 0.0;
        p.y = position.y * drop;

        // Bulge: strongest mid-sail, pinned at the edges and corners.
        float bulge = sin(uv.x * 3.14159) * sin(uv.y * 3.14159) * uBillow * drop;
        float flap = sin(uv.y * 7.0 + uTime * 2.6) * 0.06 + sin(uv.x * 5.0 - uTime * 1.9) * 0.045;
        float amount = bulge + flap * drop * (0.35 + uBillow);
        p += uBillowAxis * (amount * uWindSide * 1.6);

        // Slack canvas sags a little when the sail is not drawing.
        p.y -= (1.0 - uBillow) * sin(uv.x * 3.14159) * 0.18 * drop;

        vBillow = amount;
        // Normal of the bulged canvas: the billow axis, tilted by the bulge slope.
        vec3 across = normalize(cross(uBillowAxis, vec3(0.0, 1.0, 0.0)));
        vec3 localNormal = normalize(
          uBillowAxis * uWindSide
          + across * (-cos(uv.x * 3.14159) * uBillow * uWindSide)
          + vec3(0.0, -cos(uv.y * 3.14159) * uBillow * 0.4, 0.0)
        );
        vNormal = normalize((modelMatrix * vec4(localNormal, 0.0)).xyz);
        // Tangent frame for the woven detail: across the cloth and up it.
        vTangent = normalize((modelMatrix * vec4(across, 0.0)).xyz);
        vBitangent = normalize(cross(vNormal, vTangent));
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform vec3 uShade;
      uniform vec3 uSunDir;
      uniform vec3 uSunColor;
      uniform vec3 uAmbient;
      uniform float uOpacity;
      uniform float uBillow;
      uniform sampler2D uCanvasMap;
      uniform sampler2D uCanvasNormal;
      uniform vec2 uWeaveTiles;
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vTangent;
      varying vec3 vBitangent;
      varying float vBillow;

      void main() {
        vec2 weaveUv = vUv * uWeaveTiles;
        vec3 weave = texture2D(uCanvasMap, weaveUv).rgb;

        // Woven detail perturbs the surface normal, so the cloth catches light
        // across the threads instead of reading as a flat sheet.
        vec3 packed = texture2D(uCanvasNormal, weaveUv).rgb * 2.0 - 1.0;
        vec3 geoNormal = normalize(vNormal);
        vec3 worldNormal = normalize(
          geoNormal + (vTangent * packed.x + vBitangent * packed.y) * 0.55
        );
        if (!gl_FrontFacing) worldNormal = -worldNormal;

        // Slack canvas wrinkles: creases run diagonally from the corners and fade
        // out as the sail fills and takes up.
        float slack = 1.0 - clamp(uBillow * 1.4, 0.0, 1.0);
        float crease =
          sin((vUv.x * 6.0 + vUv.y * 9.0) * 3.14159) * 0.5 +
          sin((vUv.x * 11.0 - vUv.y * 7.0) * 3.14159) * 0.5;
        worldNormal = normalize(worldNormal + vTangent * crease * slack * 0.35);

        float lambert = abs(dot(worldNormal, uSunDir));
        // Canvas is thin, so sunlight bleeds warmly through from behind.
        float back = clamp(-dot(geoNormal, uSunDir), 0.0, 1.0);
        float transmit = pow(back, 1.3) * 0.7;
        vec3 base = mix(uShade, uColor, 0.35 + 0.65 * clamp(vBillow * 0.6 + 0.6, 0.0, 1.0));
        base *= 0.86 + weave.r * 0.3;

        // Reinforced panel seams and a bolt rope round the edge.
        float seam = smoothstep(0.02, 0.0, abs(fract(vUv.y * 4.0) - 0.5) - 0.47);
        base *= 1.0 - seam * 0.2;
        float edge = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
        base *= 1.0 - smoothstep(0.022, 0.0, edge) * 0.35;
        base *= 1.0 - crease * slack * 0.08;

        // Grazing light picks out the weave with a faint sheen.
        float sheen = pow(1.0 - abs(dot(worldNormal, normalize(vec3(0.0, 1.0, 0.0)))), 3.0) * 0.06;

        vec3 skyTint = mix(vec3(1.0), uAmbient, 0.55);
        vec3 lit = base * (0.3 + skyTint * 0.3 + uSunColor * (lambert * 0.88 + transmit * 1.1 + sheen));
        float edgeWear = smoothstep(0.0, 0.05, min(vUv.x, 1.0 - vUv.x));
        gl_FragColor = vec4(lit, uOpacity * mix(0.6, 1.0, edgeWear));
      }
    `,
  });
}

function flagMaterial(color: number, emblem: boolean): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(color) },
      uWind: { value: 0.6 },
      uEmblem: { value: emblem ? 1 : 0 },
      uSunColor: { value: new THREE.Color(0xfff0cf) },
    },
    vertexShader: /* glsl */ `
      uniform float uTime;
      uniform float uWind;
      varying vec2 vUv;
      varying float vShade;
      void main() {
        vUv = uv;
        vec3 p = position;
        float t = uv.x;
        float wave = sin(t * 9.0 - uTime * 7.0 * (0.4 + uWind)) * 0.16
                   + sin(t * 15.0 - uTime * 11.0) * 0.06;
        p.z += wave * t * (0.4 + uWind);
        p.y += sin(t * 6.0 - uTime * 5.0) * 0.05 * t;
        vShade = 0.55 + 0.45 * cos(t * 9.0 - uTime * 7.0);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uEmblem;
      uniform vec3 uSunColor;
      varying vec2 vUv;
      varying float vShade;

      float skull(vec2 uv) {
        vec2 p = (uv - vec2(0.42, 0.5)) * vec2(2.6, 2.2);
        float head = smoothstep(0.42, 0.34, length(p * vec2(1.0, 1.15)));
        float jaw = smoothstep(0.2, 0.13, length((p - vec2(0.0, 0.32)) * vec2(1.5, 1.0)));
        float eyes = smoothstep(0.12, 0.07, length(abs(p - vec2(0.0, -0.06)) - vec2(0.15, 0.0)));
        float nose = smoothstep(0.07, 0.03, length((p - vec2(0.0, 0.12)) * vec2(1.4, 1.0)));
        return clamp(max(head, jaw) - eyes - nose, 0.0, 1.0);
      }

      void main() {
        vec3 col = uColor * vShade;
        if (uEmblem > 0.5) col = mix(col, vec3(0.92, 0.9, 0.84) * vShade, skull(vUv));
        gl_FragColor = vec4(col * (0.5 + 0.5 * uSunColor), 1.0);
      }
    `,
  });
}

/**
 * Subdivided triangular sail patch spanning head/tack/clew, carrying UVs so the
 * canvas shader can bulge and shade it like any other sail.
 */
function triangularSail(
  head: THREE.Vector3,
  tack: THREE.Vector3,
  clew: THREE.Vector3,
  segments: number,
): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const p = new THREE.Vector3();

  for (let i = 0; i <= segments; i++) {
    const u = i / segments;
    a.lerpVectors(head, tack, u);
    b.lerpVectors(head, clew, u);
    for (let j = 0; j <= segments; j++) {
      const v = j / segments;
      p.lerpVectors(a, b, v);
      positions.push(p.x, p.y, p.z);
      uvs.push(u, 1 - v);
    }
  }
  const stride = segments + 1;
  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < segments; j++) {
      const i0 = i * stride + j;
      indices.push(i0, i0 + stride, i0 + 1, i0 + 1, i0 + stride, i0 + stride + 1);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** Water sloshing in the hold - rises as the ship floods. */
function holdWaterMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(0x2c6068) },
    },
    vertexShader: /* glsl */ `
      uniform float uTime;
      varying vec2 vUv;
      varying float vRipple;
      void main() {
        vUv = uv;
        vec3 p = position;
        float r = sin(p.x * 1.6 + uTime * 2.1) * 0.05 + sin(p.z * 2.3 - uTime * 1.7) * 0.04;
        p.y += r;
        vRipple = r;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      varying vec2 vUv;
      varying float vRipple;
      void main() {
        vec3 col = uColor * (0.75 + vRipple * 3.0);
        float foam = smoothstep(0.03, 0.0, abs(vRipple) - 0.035);
        col = mix(col, vec3(0.7, 0.85, 0.85), foam * 0.25);
        gl_FragColor = vec4(col, 0.86);
      }
    `,
  });
}

/**
 * Builds the whole sloop: lofted hull, planked decks, rigging, sails, cannons
 * and the below-deck hold, plus the collision volumes the player walks on and
 * the anchor points every interaction hangs off.
 */
export function buildSloop(options: SloopOptions = {}): ShipModel {
  const hullColor = options.hullColor ?? WOOD_MID;
  const sailColor = options.sailColor ?? 0xe8dcc0;
  const trimColor = options.trimColor ?? 0x7d3b2a;
  const ghostly = options.ghostly ?? false;

  const group = new THREE.Group();
  group.name = 'sloop';
  const builder = new MeshBuilder();
  // The generated wood/iron textures carry the real albedo, so the palette
  // colours only nudge each part's tone.
  builder.setTint(0.42);
  const anchors: Record<string, THREE.Object3D> = {};
  const rng = new Rng(1234);

  const addAnchor = (name: string, x: number, y: number, z: number): THREE.Object3D => {
    const marker = new THREE.Object3D();
    marker.position.set(x, y, z);
    marker.name = `anchor-${name}`;
    group.add(marker);
    anchors[name] = marker;
    return marker;
  };

  // ------------------------------------------------------------------ hull

  const cannonXs = [2.9, -1.7];
  const portHalf = 0.52;
  const portMinY = SHIP.deckY + 0.22;
  const portMaxY = SHIP.deckY + 1.0;

  const isGunPort = (x: number, y: number): boolean => {
    if (y < portMinY || y > portMaxY) return false;
    return cannonXs.some((cx) => Math.abs(x - cx) < portHalf);
  };

  /**
   * Lofts one skin of the hull between two heights. The band limits follow the
   * live keel/sheer curves, so the pitch below the waterline and the planking
   * above it meet along a level line rather than a station line - which is how a
   * real boot-top is painted.
   */
  const buildHullSurface = (opts: {
    inset: number;
    flip: boolean;
    colorScale: number;
    interior?: boolean;
    /** Height limits in metres; null means "all the way to the keel/sheer". */
    yFrom?: number | null;
    yTo?: number | null;
  }): void => {
    const { inset, flip, colorScale, interior = false } = opts;
    const rows: THREE.Vector3[][] = [];
    const meta: { x: number; y: number; level: number }[][] = [];

    for (let i = 0; i < HULL_STATIONS; i++) {
      const t = i / (HULL_STATIONS - 1);
      const x = hullShape.xFromT(t);
      const keel = hullShape.keelY(t);
      const sheer = hullShape.sheerY(t);
      const half = Math.max(0.02, hullShape.halfBeam(t) - inset);
      const span = Math.max(0.001, sheer - keel);
      const vLo = opts.yFrom == null ? 0 : clamp01((opts.yFrom - keel) / span);
      const vHi = opts.yTo == null ? 1 : clamp01((opts.yTo - keel) / span);
      const row: THREE.Vector3[] = [];
      const metaRow: { x: number; y: number; level: number }[] = [];

      for (let c = 0; c <= HULL_LEVELS * 2; c++) {
        const side = c < HULL_LEVELS ? -1 : 1;
        const level = c < HULL_LEVELS ? HULL_LEVELS - c : c - HULL_LEVELS;
        const v = lerp(vLo, vHi, level / HULL_LEVELS);
        const y = lerp(keel + inset * 0.5, sheer, v);
        const width = half * Math.pow(Math.sin(v * Math.PI * 0.5), 0.55);
        row.push(new THREE.Vector3(x, y, side * width));
        metaRow.push({ x, y, level });
      }
      rows.push(row);
      meta.push(metaRow);
    }

    builder.addSurface(
      rows,
      (r, c) => {
        const { y, level } = meta[r][c];
        // The boot-top stripe is painted just above the waterline.
        if (!interior && y > 0.05 && y < 0.62) {
          return new THREE.Color(trimColor).multiplyScalar(colorScale).getHex();
        }
        if (!interior && y <= 0.05) return new THREE.Color(0x6a6055).multiplyScalar(colorScale).getHex();
        const plank = level % 2 === 0 ? WOOD_LIGHT : hullColor;
        const weathered = new THREE.Color(plank).multiplyScalar(colorScale * (0.94 + rng.float(0, 0.1)));
        return weathered.getHex();
      },
      flip,
      (r, c) => {
        // Cut openings for the gun ports on both hull skins.
        const a = meta[r][c];
        const b = meta[r + 1]?.[c + 1] ?? a;
        return isGunPort((a.x + b.x) * 0.5, (a.y + b.y) * 0.5);
      },
      // Strakes must stay straight, so U counts levels at a fixed board width
      // rather than following arc length (which wobbles station to station).
      (_r, c, _arcU, arcV) => [Math.abs(c - HULL_LEVELS) * 0.34, arcV],
    );
  };

  // The station loop runs port -> keel -> starboard, which winds the outer skin
  // clockwise, so the outer surface is the flipped one and the inner skin is not.
  builder.setMaterial(SHIP_MAT.tar);
  buildHullSurface({ inset: 0, flip: true, colorScale: 1, yFrom: null, yTo: 0.34 });
  builder.setMaterial(SHIP_MAT.hull);
  buildHullSurface({ inset: 0, flip: true, colorScale: 1, yFrom: 0.24, yTo: null });
  buildHullSurface({ inset: 0.16, flip: false, colorScale: 0.92, interior: true });

  // Bulwark cap: closes the gap between the outer and inner skins.
  builder.setMaterial(SHIP_MAT.deck);
  {
    const capOuter: THREE.Vector3[] = [];
    const capInner: THREE.Vector3[] = [];
    for (const side of [-1, 1] as const) {
      capOuter.length = 0;
      capInner.length = 0;
      for (let i = 0; i < HULL_STATIONS; i++) {
        const t = i / (HULL_STATIONS - 1);
        const x = hullShape.xFromT(t);
        const sheer = hullShape.sheerY(t);
        const half = hullShape.halfBeam(t);
        capOuter.push(new THREE.Vector3(x, sheer, side * half));
        capInner.push(new THREE.Vector3(x, sheer, side * Math.max(0.02, half - 0.16)));
      }
      const rows = side < 0 ? [capInner.slice(), capOuter.slice()] : [capOuter.slice(), capInner.slice()];
      builder.addSurface(rows, () => 0x8a6b40);
    }
  }

  // Transom (stern face) and its cabin windows.
  builder.setMaterial(SHIP_MAT.hull);
  {
    const t = 0;
    const keel = hullShape.keelY(t);
    const sheer = hullShape.sheerY(t);
    const half = hullShape.halfBeam(t);
    const rows: THREE.Vector3[][] = [];
    for (let l = 0; l <= 6; l++) {
      const v = l / 6;
      const y = lerp(keel, sheer, v);
      const w = half * Math.pow(Math.sin(v * Math.PI * 0.5), 0.55);
      rows.push([new THREE.Vector3(SHIP.stern, y, -w), new THREE.Vector3(SHIP.stern, y, w)]);
    }
    builder.addSurface(rows, (r) => (r < 2 ? WOOD_TAR : r % 2 === 0 ? WOOD_DARK : hullColor), true);
    for (const z of [-0.85, 0.85]) {
      builder.setMaterial(SHIP_MAT.brass);
      builder.addBox({ x: SHIP.stern - 0.06, y: 1.55, z }, { x: 0.12, y: 0.6, z: 0.7 }, 0x8fb2bb, 0.05);
      builder.setMaterial(SHIP_MAT.hull);
      builder.addBox({ x: SHIP.stern - 0.12, y: 1.55, z }, { x: 0.06, y: 0.7, z: 0.82 }, 0x6b4a28, 0.1);
    }
  }

  // ------------------------------------------------------------------ decks

  /** Planked deck grid between two x bounds at a fixed height. */
  const addDeck = (
    minX: number,
    maxX: number,
    y: number,
    inset: number,
    holes: { minX: number; maxX: number; minZ: number; maxZ: number }[] = [],
  ): void => {
    const stations = 26;
    const across = 15;
    const rows: THREE.Vector3[][] = [];
    const meta: { x: number; z: number }[][] = [];
    for (let i = 0; i < stations; i++) {
      const x = lerp(minX, maxX, i / (stations - 1));
      const half = Math.max(0.05, hullShape.widthAt(x, y) - inset);
      const row: THREE.Vector3[] = [];
      const metaRow: { x: number; z: number }[] = [];
      for (let c = 0; c < across; c++) {
        const z = lerp(-half, half, c / (across - 1));
        row.push(new THREE.Vector3(x, y, z));
        metaRow.push({ x, z });
      }
      rows.push(row);
      meta.push(metaRow);
    }
    builder.addSurface(
      rows,
      (r, c) => {
        const { z } = meta[r][c];
        const plank = Math.floor((z + 20) / 0.42);
        const shade = plank % 2 === 0 ? 0.98 : 0.88;
        const grain = 0.96 + ((plank * 37) % 7) * 0.012;
        return new THREE.Color(WOOD_LIGHT).multiplyScalar(shade * grain).getHex();
      },
      false,
      (r, c) => {
        const a = meta[r][c];
        const b = meta[r + 1][c + 1];
        const cx = (a.x + b.x) * 0.5;
        const cz = (a.z + b.z) * 0.5;
        return holes.some((h) => cx > h.minX && cx < h.maxX && cz > h.minZ && cz < h.maxZ);
      },
    );
  };

  builder.setMaterial(SHIP_MAT.deck);
  addDeck(SHIP.upperDeckX, 8.9, SHIP.deckY, 0.18, [SHIP.hatch]);
  addDeck(SHIP.stern + 0.2, SHIP.upperDeckX, SHIP.upperDeckY, 0.18);
  addDeck(SHIP.stern + 0.3, 7.0, SHIP.holdFloorY, 0.24);

  // Hatch surround and the wall carrying the raised stern deck.
  {
    const h = SHIP.hatch;
    builder.addBox({ x: h.minX - 0.09, y: SHIP.deckY + 0.06, z: 0 }, { x: 0.18, y: 0.22, z: 2.1 }, 0x8a6b40);
    builder.addBox({ x: h.maxX + 0.09, y: SHIP.deckY + 0.06, z: 0 }, { x: 0.18, y: 0.22, z: 2.1 }, 0x8a6b40);
    for (const z of [h.minZ - 0.09, h.maxZ + 0.09]) {
      builder.addBox({ x: (h.minX + h.maxX) / 2, y: SHIP.deckY + 0.06, z }, { x: 2.0, y: 0.22, z: 0.18 }, 0x8a6b40);
    }

    const wallHalf = hullShape.widthAt(SHIP.upperDeckX, SHIP.upperDeckY) - 0.2;
    for (const side of [-1, 1] as const) {
      const zMin = side < 0 ? -wallHalf : 1.35;
      const zMax = side < 0 ? -1.35 : wallHalf;
      builder.addBox(
        { x: SHIP.upperDeckX - 0.12, y: (SHIP.deckY + SHIP.upperDeckY) / 2, z: (zMin + zMax) / 2 },
        { x: 0.24, y: SHIP.upperDeckY - SHIP.deckY + 0.1, z: zMax - zMin },
        WOOD_DARK,
      );
    }

    // Stairs up to the helm.
    const steps = 4;
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const y = lerp(SHIP.deckY + 0.18, SHIP.upperDeckY, t + 1 / steps);
      const x = lerp(SHIP.upperDeckX - 0.25, SHIP.upperDeckX + 1.35, 1 - t);
      builder.addBox({ x, y: y - 0.09, z: 0 }, { x: 0.42, y: 0.18, z: 2.5 }, i % 2 ? WOOD_LIGHT : WOOD_MID);
    }
  }

  // Gun port frames.
  builder.setMaterial(SHIP_MAT.deck);
  for (const cx of cannonXs) {
    for (const side of [-1, 1] as const) {
      const z = side * (hullShape.widthAt(cx, (portMinY + portMaxY) / 2) - 0.08);
      builder.addBox({ x: cx, y: portMinY, z }, { x: portHalf * 2.1, y: 0.1, z: 0.34 }, 0x8a6b40);
      builder.addBox({ x: cx, y: portMaxY, z }, { x: portHalf * 2.1, y: 0.1, z: 0.34 }, 0x8a6b40);
      for (const dx of [-portHalf, portHalf]) {
        builder.addBox({ x: cx + dx, y: (portMinY + portMaxY) / 2, z }, { x: 0.1, y: portMaxY - portMinY, z: 0.34 }, 0x8a6b40);
      }
    }
  }

  // Bowsprit, figurehead and bow rails.
  builder.setMaterial(SHIP_MAT.hull);
  const bowspritTip = new THREE.Vector3(12.2, 3.1, 0);
  strut(builder, new THREE.Vector3(8.2, 2.25, 0), bowspritTip, 0.13, WOOD_MID, 7);
  builder.addBox({ x: 8.9, y: 2.05, z: 0 }, { x: 0.7, y: 0.34, z: 0.34 }, 0x8a6b40);
  {
    // A crude carved mermaid: body, tail and outstretched arms.
    const body = new THREE.CapsuleGeometry(0.16, 0.5, 3, 6);
    builder.addGeometry(
      body,
      0xb9945a,
      new THREE.Matrix4().compose(
        new THREE.Vector3(9.55, 1.75, 0),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, -0.7)),
        new THREE.Vector3(1, 1, 1),
      ),
    );
    body.dispose();
    const tail = new THREE.ConeGeometry(0.22, 0.7, 5);
    builder.addGeometry(
      tail,
      0x7fa06a,
      new THREE.Matrix4().compose(
        new THREE.Vector3(9.05, 1.35, 0),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 1.9)),
        new THREE.Vector3(1, 1, 1),
      ),
    );
    tail.dispose();
  }

  // ------------------------------------------------- mast, spars and rigging

  builder.setMaterial(SHIP_MAT.hull);
  const mastBase = new THREE.Vector3(SHIP.mastX, SHIP.deckY - 0.1, 0);
  const mastTop = new THREE.Vector3(SHIP.mastX, SHIP.mastTop, 0);
  strut(builder, mastBase, new THREE.Vector3(SHIP.mastX, SHIP.crowsNestY, 0), 0.25, WOOD_MID, 8);
  strut(builder, new THREE.Vector3(SHIP.mastX, SHIP.crowsNestY, 0), mastTop, 0.17, WOOD_MID, 7);

  // Crow's nest platform and railing.
  {
    const platform = new THREE.CylinderGeometry(1.15, 1.25, 0.16, 12);
    builder.addGeometry(
      platform,
      WOOD_LIGHT,
      new THREE.Matrix4().makeTranslation(SHIP.mastX, SHIP.crowsNestY, 0),
    );
    platform.dispose();
    const posts = 10;
    for (let i = 0; i < posts; i++) {
      const a = (i / posts) * Math.PI * 2;
      const x = SHIP.mastX + Math.cos(a) * 1.05;
      const z = Math.sin(a) * 1.05;
      strut(
        builder,
        new THREE.Vector3(x, SHIP.crowsNestY + 0.08, z),
        new THREE.Vector3(x, SHIP.crowsNestY + 0.72, z),
        0.045,
        WOOD_DARK,
        4,
      );
    }
    const rail = new THREE.TorusGeometry(1.06, 0.04, 4, 14);
    builder.addGeometry(
      rail,
      WOOD_DARK,
      new THREE.Matrix4().compose(
        new THREE.Vector3(SHIP.mastX, SHIP.crowsNestY + 0.72, 0),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)),
        new THREE.Vector3(1, 1, 1),
      ),
    );
    rail.dispose();
  }

  // Standing rigging: forestay, backstay, shrouds and climbable ratlines.
  builder.setMaterial(SHIP_MAT.rope);
  strut(builder, mastTop, bowspritTip, 0.035, ROPE, 4);
  // Twin quarter backstays, led to the corners of the transom so they clear the
  // helm - a single centreline stay would run straight through the wheel.
  for (const side of [-1, 1] as const) {
    strut(builder, mastTop, new THREE.Vector3(SHIP.stern + 0.7, SHIP.upperDeckY + 1.1, side * 2.2), 0.032, ROPE, 4);
  }
  for (const side of [-1, 1] as const) {
    const anchorZ = side * 2.9;
    const top = new THREE.Vector3(SHIP.mastX, SHIP.crowsNestY - 0.3, 0);
    const a = new THREE.Vector3(SHIP.mastX - 1.5, SHIP.deckY + 0.35, anchorZ);
    const b = new THREE.Vector3(SHIP.mastX + 1.5, SHIP.deckY + 0.35, anchorZ);
    strut(builder, top, a, 0.032, ROPE, 4);
    strut(builder, top, b, 0.032, ROPE, 4);
    // Ratlines: horizontal rungs between the two shrouds.
    for (let i = 1; i < 11; i++) {
      const t = i / 12;
      const p0 = new THREE.Vector3().lerpVectors(a, top, t);
      const p1 = new THREE.Vector3().lerpVectors(b, top, t);
      strut(builder, p0, p1, 0.022, ROPE, 3);
    }
  }

  // ------------------------------------------------------- deck furnishings

  builder.setMaterial(SHIP_MAT.hull);

  // Capstan for the anchor.
  const capstan = new THREE.Group();
  capstan.position.set(5.4, SHIP.deckY, 0);
  {
    const capBuilder = new MeshBuilder();
      capBuilder.setTint(0.42);
    const drum = new THREE.CylinderGeometry(0.34, 0.42, 0.95, 10);
    capBuilder.addGeometry(drum, WOOD_MID, new THREE.Matrix4().makeTranslation(0, 0.48, 0));
    drum.dispose();
    capBuilder.setMaterial(SHIP_MAT.iron);
    const head = new THREE.CylinderGeometry(0.46, 0.4, 0.16, 10);
    capBuilder.addGeometry(head, 0x8d8f92, new THREE.Matrix4().makeTranslation(0, 1.0, 0), [2.9, 0.16]);
    head.dispose();
    capBuilder.setMaterial(SHIP_MAT.hull);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      capBuilder.addBox(
        { x: Math.cos(a) * 0.62, y: 0.86, z: Math.sin(a) * 0.62 },
        { x: 0.12, y: 0.12, z: 0.12 },
        WOOD_DARK,
      );
      strut(
        capBuilder,
        new THREE.Vector3(0, 0.86, 0),
        new THREE.Vector3(Math.cos(a) * 0.85, 0.86, Math.sin(a) * 0.85),
        0.055,
        WOOD_DARK,
        4,
      );
    }
    const capMesh = new THREE.Mesh(capBuilder.build(), shipMaterials());
    capMesh.castShadow = true;
    capstan.add(capMesh);
  }
  group.add(capstan);

  // Anchor: a stock anchor on the starboard bow, hanging on a chain that pays out
  // through the hawse. `anchorRaise` slides it between stowed and down deep.
  const anchorGroup = new THREE.Group();
  {
    const anchorBuilder = new MeshBuilder();
    anchorBuilder.setTint(0.42);
    anchorBuilder.setMaterial(SHIP_MAT.iron);
    strut(anchorBuilder, new THREE.Vector3(0, 1.25, 0), new THREE.Vector3(0, -0.55, 0), 0.075, 0x8f9296, 7);
    for (const side of [-1, 1] as const) {
      const arm = new THREE.Vector3(side * 0.62, -0.02, 0);
      strut(anchorBuilder, new THREE.Vector3(0, -0.5, 0), arm, 0.055, 0x8f9296, 6);
      const fluke = new THREE.ConeGeometry(0.2, 0.42, 4);
      anchorBuilder.addGeometry(
        fluke,
        0x9a9da1,
        new THREE.Matrix4().compose(
          new THREE.Vector3(side * 0.72, 0.14, 0),
          new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, side * -0.5)),
          new THREE.Vector3(1, 0.5, 1),
        ),
      );
      fluke.dispose();
    }
    // Stock across the top, and the ring the chain shackles to.
    strut(anchorBuilder, new THREE.Vector3(0, 1.02, -0.62), new THREE.Vector3(0, 1.02, 0.62), 0.05, 0x82858a, 6);
    const ring = new THREE.TorusGeometry(0.16, 0.035, 6, 14);
    anchorBuilder.addGeometry(
      ring,
      0x9a9da1,
      new THREE.Matrix4().compose(
        new THREE.Vector3(0, 1.36, 0),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)),
        new THREE.Vector3(1, 1, 1),
      ),
      [1.0, 0.22],
    );
    ring.dispose();

    const anchorMesh = new THREE.Mesh(anchorBuilder.build(), shipMaterials());
    anchorMesh.castShadow = true;
    anchorGroup.add(anchorMesh);
    anchorGroup.position.set(8.2, 1.1, 2.75);
  }
  group.add(anchorGroup);

  // Chain: instanced links laid along the hawse-to-ring line every frame.
  const chainLinkGeometry = new THREE.TorusGeometry(0.075, 0.024, 5, 10);
  const chainLinks = new THREE.InstancedMesh(chainLinkGeometry, shipMaterials()[SHIP_MAT.iron], 52);
  chainLinks.castShadow = true;
  chainLinks.frustumCulled = false;
  group.add(chainLinks);

  // Hawse pipe the chain runs out through.
  builder.setMaterial(SHIP_MAT.iron);
  {
    const hawse = new THREE.TorusGeometry(0.17, 0.06, 6, 12);
    builder.addGeometry(
      hawse,
      0x8f9296,
      new THREE.Matrix4().compose(
        new THREE.Vector3(8.0, 1.66, 2.6),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0.35, Math.PI / 2)),
        new THREE.Vector3(1, 1, 1),
      ),
      [1.1, 0.4],
    );
    hawse.dispose();
  }
  builder.setMaterial(SHIP_MAT.hull);

  // Rudder on the sternpost, which swings with the helm.
  const rudder = new THREE.Group();
  rudder.position.set(SHIP.stern + 0.15, 0, 0);
  {
    const rudderBuilder = new MeshBuilder();
    rudderBuilder.setTint(0.42);
    rudderBuilder.setMaterial(SHIP_MAT.tar);
    rudderBuilder.addBox({ x: -0.45, y: -0.95, z: 0 }, { x: 1.1, y: 2.5, z: 0.16 }, 0x6a6055);
    rudderBuilder.addBox({ x: -0.2, y: 0.35, z: 0 }, { x: 0.6, y: 0.7, z: 0.18 }, 0x6a6055);
    rudderBuilder.setMaterial(SHIP_MAT.iron);
    for (const y of [-1.7, -0.8, 0.1]) {
      rudderBuilder.addBox({ x: -0.35, y, z: 0 }, { x: 0.9, y: 0.1, z: 0.2 }, 0x82858a);
    }
    const rudderMesh = new THREE.Mesh(rudderBuilder.build(), shipMaterials());
    rudderMesh.castShadow = true;
    rudder.add(rudderMesh);
  }
  group.add(rudder);

  // Ship's wheel on the raised deck: a proper eight-spoke helm with turned
  // handles, mounted in a binnacle frame so it reads clearly from behind.
  const wheel = new THREE.Group();
  wheel.position.set(-7.15, SHIP.upperDeckY + 1.02, 0);
  {
    const wheelBuilder = new MeshBuilder();
    wheelBuilder.setTint(0.42);

    // Outer rim, built from arc segments so the grain follows the curve.
    const rimRadius = 0.56;
    const rimSegments = 24;
    for (let i = 0; i < rimSegments; i++) {
      const a0 = (i / rimSegments) * Math.PI * 2;
      const a1 = ((i + 1) / rimSegments) * Math.PI * 2;
      strut(
        wheelBuilder,
        new THREE.Vector3(0, Math.cos(a0) * rimRadius, Math.sin(a0) * rimRadius),
        new THREE.Vector3(0, Math.cos(a1) * rimRadius, Math.sin(a1) * rimRadius),
        0.055,
        WOOD_LIGHT,
        5,
      );
    }

    // Spokes, each continuing past the rim into a handle.
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const dir = new THREE.Vector3(0, Math.cos(a), Math.sin(a));
      strut(
        wheelBuilder,
        dir.clone().multiplyScalar(0.15),
        dir.clone().multiplyScalar(rimRadius + 0.02),
        0.042,
        WOOD_LIGHT,
        5,
      );
      // Handle beyond the rim, thicker at the tip like a turned grip.
      const handleBase = dir.clone().multiplyScalar(rimRadius + 0.02);
      const handleTip = dir.clone().multiplyScalar(rimRadius + 0.24);
      strut(wheelBuilder, handleBase, handleTip, 0.05, WOOD_MID, 5);
      const knob = new THREE.SphereGeometry(0.06, 7, 5);
      wheelBuilder.addGeometry(knob, WOOD_MID, new THREE.Matrix4().makeTranslation(handleTip.x, handleTip.y, handleTip.z));
      knob.dispose();
    }

    // Turned wooden hub with small brass bosses on the ends.
    const hub = new THREE.CylinderGeometry(0.15, 0.15, 0.26, 12);
    wheelBuilder.addGeometry(
      hub,
      WOOD_DARK,
      new THREE.Matrix4().compose(
        new THREE.Vector3(),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, Math.PI / 2)),
        new THREE.Vector3(1, 1, 1),
      ),
      [0.88, 0.26],
    );
    hub.dispose();
    wheelBuilder.setMaterial(SHIP_MAT.brass);
    for (const dx of [-0.15, 0.15]) {
      const boss = new THREE.SphereGeometry(0.07, 8, 6);
      wheelBuilder.addGeometry(boss, 0xd8b45c, new THREE.Matrix4().makeTranslation(dx, 0, 0));
      boss.dispose();
    }

    const wheelMesh = new THREE.Mesh(wheelBuilder.build(), shipMaterials());
    wheelMesh.castShadow = true;
    wheel.add(wheelMesh);
  }
  group.add(wheel);

  // Wheel mount: two uprights and a cross beam either side of the helm.
  builder.setMaterial(SHIP_MAT.hull);
  for (const z of [-0.52, 0.52]) {
    strut(
      builder,
      new THREE.Vector3(-7.15, SHIP.upperDeckY, z),
      new THREE.Vector3(-7.15, SHIP.upperDeckY + 1.02, z),
      0.075,
      WOOD_DARK,
      6,
    );
  }
  strut(
    builder,
    new THREE.Vector3(-7.15, SHIP.upperDeckY + 1.02, -0.52),
    new THREE.Vector3(-7.15, SHIP.upperDeckY + 1.02, 0.52),
    0.055,
    WOOD_DARK,
    6,
  );

  // Binnacle ahead of the wheel, where the helmsman can see the compass card.
  builder.addBox({ x: -6.5, y: SHIP.upperDeckY + 0.45, z: 0 }, { x: 0.46, y: 0.9, z: 0.46 }, WOOD_MID);
  builder.setMaterial(SHIP_MAT.brass);
  builder.addBox({ x: -6.5, y: SHIP.upperDeckY + 0.93, z: 0 }, { x: 0.4, y: 0.07, z: 0.4 }, 0xd8b45c);
  builder.setMaterial(SHIP_MAT.hull);

  // Stern rail.
  for (const side of [-1, 1] as const) {
    const posts = 5;
    for (let i = 0; i < posts; i++) {
      const x = lerp(SHIP.stern + 0.5, SHIP.upperDeckX + 0.2, i / (posts - 1));
      const half = hullShape.widthAt(x, SHIP.upperDeckY) - 0.25;
      strut(
        builder,
        new THREE.Vector3(x, SHIP.upperDeckY, side * half),
        new THREE.Vector3(x, SHIP.upperDeckY + 0.85, side * half),
        0.05,
        WOOD_DARK,
        4,
      );
    }
    const railPoints: THREE.Vector3[] = [];
    for (let i = 0; i <= 8; i++) {
      const x = lerp(SHIP.stern + 0.5, SHIP.upperDeckX + 0.2, i / 8);
      const half = hullShape.widthAt(x, SHIP.upperDeckY) - 0.25;
      railPoints.push(new THREE.Vector3(x, SHIP.upperDeckY + 0.85, side * half));
    }
    for (let i = 0; i < railPoints.length - 1; i++) strut(builder, railPoints[i], railPoints[i + 1], 0.05, 0x8a6b40, 4);
  }

  // Ladder down through the hatch.
  {
    const x = SHIP.hatch.minX + 0.28;
    for (const z of [-0.42, 0.42]) {
      strut(
        builder,
        new THREE.Vector3(x, SHIP.holdFloorY, z),
        new THREE.Vector3(x, SHIP.deckY + 0.12, z),
        0.06,
        WOOD_DARK,
        5,
      );
    }
    for (let i = 0; i < 7; i++) {
      const y = lerp(SHIP.holdFloorY + 0.25, SHIP.deckY, i / 6);
      strut(builder, new THREE.Vector3(x, y, -0.42), new THREE.Vector3(x, y, 0.42), 0.045, 0x8a6b40, 4);
    }
  }

  // Boarding ladders on the outside of the hull, aft of midships.
  for (const side of [-1, 1] as const) {
    const x = -6.0;
    const outer = hullShape.widthAt(x, SHIP.deckY) + 0.06;
    for (const dz of [-0.3, 0.3]) {
      strut(
        builder,
        new THREE.Vector3(x + dz, -1.5, side * outer),
        new THREE.Vector3(x + dz, SHIP.deckY + 0.5, side * outer),
        0.055,
        WOOD_DARK,
        5,
      );
    }
    for (let i = 0; i < 7; i++) {
      const y = lerp(-1.3, SHIP.deckY + 0.35, i / 6);
      const width = hullShape.widthAt(x, Math.max(y, -1.0)) + 0.1;
      strut(
        builder,
        new THREE.Vector3(x - 0.3, y, side * width),
        new THREE.Vector3(x + 0.3, y, side * width),
        0.045,
        0x8a6b40,
        4,
      );
    }
  }

  // ------------------------------------------------------------- below deck

  {
    // Support beams under the main deck.
    for (let i = 0; i < 9; i++) {
      const x = lerp(SHIP.stern + 1.2, 6.4, i / 8);
      const half = hullShape.widthAt(x, SHIP.deckY) - 0.2;
      builder.addBox({ x, y: SHIP.deckY - 0.16, z: 0 }, { x: 0.22, y: 0.2, z: half * 2 }, WOOD_DARK);
    }
    // Hold ceiling so the sky does not show through the planking from below.
    const rows: THREE.Vector3[][] = [];
    for (let i = 0; i < 20; i++) {
      const x = lerp(SHIP.stern + 0.4, 6.9, i / 19);
      const half = Math.max(0.05, hullShape.widthAt(x, SHIP.deckY) - 0.2);
      rows.push([new THREE.Vector3(x, SHIP.deckY - 0.04, -half), new THREE.Vector3(x, SHIP.deckY - 0.04, half)]);
    }
    builder.addSurface(
      rows,
      () => 0x574026,
      true,
      (r) => {
        const x = lerp(SHIP.stern + 0.4, 6.9, r / 19);
        return x > SHIP.hatch.minX - 0.2 && x < SHIP.hatch.maxX + 0.2;
      },
    );

    // Map table with a candle at the stern end of the hold.
    builder.addBox({ x: -7.4, y: SHIP.holdFloorY + 0.75, z: 0 }, { x: 1.5, y: 0.1, z: 1.9 }, WOOD_LIGHT);
    for (const [dx, dz] of [
      [0.6, 0.8],
      [0.6, -0.8],
      [-0.6, 0.8],
      [-0.6, -0.8],
    ]) {
      builder.addBox(
        { x: -7.4 + dx, y: SHIP.holdFloorY + 0.37, z: dz },
        { x: 0.12, y: 0.75, z: 0.12 },
        WOOD_DARK,
      );
    }
    builder.addBox({ x: -7.4, y: SHIP.holdFloorY + 0.82, z: 0 }, { x: 1.1, y: 0.03, z: 1.4 }, 0xd8c9a0);
  }

  // Resource barrels in the hold, colour-coded by what they hold.
  const barrelSpots: { name: string; x: number; z: number; color: number }[] = [
    { name: 'cannonballs', x: -4.6, z: -1.2, color: 0x4a4a52 },
    { name: 'planks', x: -4.6, z: 1.2, color: 0x8a6b40 },
    { name: 'bananas', x: -2.6, z: -1.3, color: 0xd8b83a },
  ];
  for (const spot of barrelSpots) {
    const barrel = barrelGeometry();
    const mesh = new THREE.Mesh(barrel, shipMaterials());
    mesh.position.set(spot.x, SHIP.holdFloorY + 0.56, spot.z);
    mesh.castShadow = true;
    group.add(mesh);
    const lid = new THREE.Mesh(
      paint(new THREE.CylinderGeometry(0.3, 0.3, 0.06, 10), spot.color),
      shipMaterial(),
    );
    lid.position.set(spot.x, SHIP.holdFloorY + 1.12, spot.z);
    group.add(lid);
    addAnchor(`barrel-${spot.name}`, spot.x, SHIP.holdFloorY + 0.85, spot.z);
  }

  // A chest sitting in the hold at the start, for flavour.
  {
    const chest = new THREE.Mesh(chestGeometry(false), shipMaterials());
    chest.position.set(4.6, SHIP.holdFloorY, -1.1);
    chest.rotation.y = 0.6;
    chest.castShadow = true;
    group.add(chest);
  }

  // ---------------------------------------------------------------- cannons

  const cannons: CannonMount[] = [];
  let cannonIndex = 0;
  for (const cx of cannonXs) {
    for (const side of [-1, 1] as const) {
      const z = side * (hullShape.widthAt(cx, portMinY + 0.3) - 0.45);
      const pivot = new THREE.Group();
      pivot.position.set(cx, SHIP.deckY, z);
      // Barrels are modelled pointing along local +Z, so starboard guns need no
      // yaw and port guns swing right round.
      const restYaw = side > 0 ? 0 : Math.PI;
      pivot.rotation.y = restYaw;

      const carriage = new MeshBuilder();
      carriage.setTint(0.42);
      carriage.setMaterial(SHIP_MAT.hull);
      carriage.addBox({ x: 0, y: 0.22, z: 0 }, { x: 0.6, y: 0.3, z: 0.9 }, WOOD_DARK);
      carriage.addBox({ x: 0, y: 0.45, z: -0.18 }, { x: 0.5, y: 0.2, z: 0.4 }, WOOD_MID);
      for (const wx of [-0.28, 0.28]) {
        for (const wz of [-0.34, 0.34]) {
          const wheelGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.09, 8);
          carriage.addGeometry(
            wheelGeo,
            0x53381f,
            new THREE.Matrix4().compose(
              new THREE.Vector3(wx, 0.14, wz),
              new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, Math.PI / 2)),
              new THREE.Vector3(1, 1, 1),
            ),
          );
          wheelGeo.dispose();
        }
      }
      const carriageMesh = new THREE.Mesh(carriage.build(), shipMaterials());
      carriageMesh.castShadow = true;
      pivot.add(carriageMesh);

      const elevation = new THREE.Group();
      elevation.position.set(0, 0.62, 0);
      pivot.add(elevation);

      const barrel = new MeshBuilder();
      barrel.setTint(0.42);
      barrel.setMaterial(SHIP_MAT.iron);
      const tube = new THREE.CylinderGeometry(0.11, 0.15, 1.5, 10);
      barrel.addGeometry(
        tube,
        IRON,
        new THREE.Matrix4().compose(
          new THREE.Vector3(0, 0, 0.45),
          new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)),
          new THREE.Vector3(1, 1, 1),
        ),
      );
      tube.dispose();
      const breech = new THREE.SphereGeometry(0.17, 8, 6);
      barrel.addGeometry(breech, 0x35352f, new THREE.Matrix4().makeTranslation(0, 0, -0.32));
      breech.dispose();
      const band = new THREE.TorusGeometry(0.14, 0.03, 4, 10);
      barrel.addGeometry(
        band,
        0x2a2a26,
        new THREE.Matrix4().compose(
          new THREE.Vector3(0, 0, 0.72),
          new THREE.Quaternion(),
          new THREE.Vector3(1, 1, 1),
        ),
      );
      band.dispose();
      const barrelMesh = new THREE.Mesh(barrel.build(), shipMaterials());
      barrelMesh.castShadow = true;
      elevation.add(barrelMesh);

      const muzzle = new THREE.Object3D();
      muzzle.position.set(0, 0, 1.25);
      elevation.add(muzzle);

      group.add(pivot);
      const standZ = z - side * 0.95;
      cannons.push({
        index: cannonIndex,
        side,
        pivot,
        elevation,
        muzzle,
        stand: new THREE.Vector3(cx, SHIP.deckY, standZ),
        restYaw,
      });
      addAnchor(`cannon-${cannonIndex}`, cx, SHIP.deckY + 0.7, z);
      cannonIndex++;
    }
  }

  // ------------------------------------------------------------------ sails

  const yard = new THREE.Group();
  yard.position.set(SHIP.mastX, 0, 0);
  group.add(yard);
  {
    const yardBuilder = new MeshBuilder();
      yardBuilder.setTint(0.42);
    strut(
      yardBuilder,
      new THREE.Vector3(0, SHIP.yardY, -SHIP.yardHalf),
      new THREE.Vector3(0, SHIP.yardY, SHIP.yardHalf),
      0.11,
      WOOD_MID,
      6,
    );
    strut(
      yardBuilder,
      new THREE.Vector3(0, SHIP.sailBottom - 0.12, -SHIP.yardHalf * 0.92),
      new THREE.Vector3(0, SHIP.sailBottom - 0.12, SHIP.yardHalf * 0.92),
      0.09,
      WOOD_MID,
      6,
    );
    // Lifts from the yard tips up to the masthead.
    yardBuilder.setMaterial(SHIP_MAT.rope);
    for (const side of [-1, 1] as const) {
      strut(
        yardBuilder,
        new THREE.Vector3(0, SHIP.yardY, side * SHIP.yardHalf),
        new THREE.Vector3(0, SHIP.mastTop - 0.4, 0),
        0.028,
        ROPE,
        4,
      );
    }
    const yardMesh = new THREE.Mesh(yardBuilder.build(), shipMaterials());
    yardMesh.castShadow = true;
    yard.add(yardMesh);
  }

  const sailHeight = SHIP.sailTop - SHIP.sailBottom;
  const sailGeometry = new THREE.PlaneGeometry(SHIP.yardHalf * 1.86, sailHeight, 14, 10);
  sailGeometry.translate(0, -sailHeight / 2, 0);
  sailGeometry.rotateY(Math.PI / 2);
  const sailMat = sailMaterial(sailColor, ghostly);
  const sail = new THREE.Mesh(sailGeometry, sailMat);
  sail.position.set(0, SHIP.sailTop, 0);
  sail.renderOrder = 2;
  yard.add(sail);

  // Jib: a triangular staysail set fore-and-aft between forestay and bowsprit.
  const jibMat = sailMaterial(sailColor, ghostly, new THREE.Vector3(0, 0, 1));
  jibMat.uniforms.uBillow.value = 0.35;
  const jib = new THREE.Mesh(
    triangularSail(
      new THREE.Vector3(3.9, 8.0, 0), // head, up the forestay
      new THREE.Vector3(11.6, 3.1, 0), // tack, out on the bowsprit
      new THREE.Vector3(6.6, 2.6, 0), // clew, sheeted to the foredeck
      8,
    ),
    jibMat,
  );
  jib.renderOrder = 2;
  group.add(jib);

  // Flag at the masthead.
  const flagGeometry = new THREE.PlaneGeometry(1.7, 1.0, 12, 4);
  flagGeometry.translate(0.85, 0, 0);
  const flagMat = flagMaterial(ghostly ? 0x2f4a34 : 0x8f2b25, options.emblem === 'skull');
  const flag = new THREE.Mesh(flagGeometry, flagMat);
  flag.position.set(SHIP.mastX + 0.1, SHIP.mastTop - 0.5, 0);
  group.add(flag);

  // ---------------------------------------------------------- lights, water

  const lanternLight = new THREE.PointLight(0xffb861, 0, 22, 1);
  lanternLight.position.set(-6.4, SHIP.upperDeckY + 1.6, 0);
  group.add(lanternLight);
  builder.setMaterial(SHIP_MAT.iron);
  builder.addBox({ x: -6.4, y: SHIP.upperDeckY + 1.72, z: 0 }, { x: 0.3, y: 0.1, z: 0.3 }, 0x9a9c9f);
  const lanternGlass = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.32, 0.26), glowMaterial(0xffd9a0));
  lanternGlass.position.set(-6.4, SHIP.upperDeckY + 1.5, 0);
  group.add(lanternGlass);
  strut(
    builder,
    new THREE.Vector3(-6.4, SHIP.upperDeckY + 1.77, 0),
    new THREE.Vector3(-6.4, SHIP.upperDeckY + 2.1, 0),
    0.03,
    0x9a9c9f,
    4,
  );
  builder.setMaterial(SHIP_MAT.hull);

  // Two swinging lanterns light the hold: one over the map table, one by the ladder.
  // Decay 1 rather than physical inverse-square: a lantern has to light a
  // 15 m hold without blowing out whatever is standing next to it.
  const holdLight = new THREE.PointLight(0xffb04a, 7, 20, 1);
  holdLight.position.set(-5.2, SHIP.deckY - 0.55, 0);
  group.add(holdLight);
  const holdLightForward = new THREE.PointLight(0xffb04a, 5, 16, 1);
  holdLightForward.position.set(2.6, SHIP.deckY - 0.55, 0);
  group.add(holdLightForward);
  for (const lampX of [-5.2, 2.6]) {
    const glass = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.2, 0.15), glowMaterial(0xffcf94));
    glass.position.set(lampX, SHIP.deckY - 0.55, 0);
    group.add(glass);
    builder.addBox({ x: lampX, y: SHIP.deckY - 0.36, z: 0 }, { x: 0.24, y: 0.09, z: 0.24 }, IRON);
  }

  const holdWaterGeometry = new THREE.PlaneGeometry(15, 4.4, 24, 8);
  holdWaterGeometry.rotateX(-Math.PI / 2);
  const holdWaterMat = holdWaterMaterial();
  const holdWater = new THREE.Mesh(holdWaterGeometry, holdWaterMat);
  holdWater.position.set(-1.0, SHIP.holdFloorY, 0);
  holdWater.visible = false;
  holdWater.renderOrder = 3;
  group.add(holdWater);

  // -------------------------------------------------------------- assembly

  const hullGeometry = builder.build();
  const hullMesh = new THREE.Mesh(hullGeometry, shipMaterials());
  hullMesh.castShadow = true;
  hullMesh.receiveShadow = true;
  hullMesh.name = 'hull';
  group.add(hullMesh);

  // Interaction anchors sit at roughly chest height so the player can see them.
  addAnchor('helm', -7.15, SHIP.upperDeckY + 0.95, 0);
  addAnchor('sails', SHIP.mastX, SHIP.deckY + 1.2, 0);
  addAnchor('capstan', 5.4, SHIP.deckY + 0.7, 0);
  addAnchor('maptable', -7.4, SHIP.holdFloorY + 0.9, 0);
  addAnchor('crowsnest', SHIP.mastX, SHIP.crowsNestY, 0);
  addAnchor('spawn', 2.0, SHIP.deckY, -1.6);

  const collision = buildCollision();

  return {
    group,
    hullMesh,
    yard,
    sail,
    sailMaterial: sailMat,
    jib,
    jibMaterial: jibMat,
    flag,
    flagMaterial: flagMat,
    wheel,
    capstan,
    anchorGroup,
    chainLinks,
    rudder,
    cannons,
    holdWater,
    holdWaterMaterial: holdWaterMat,
    lanternLight,
    holdLight,
    collision,
    anchors,
  };
}

/** Unlit warm material for lantern glass, so it reads as a light source (and blooms). */
export function glowMaterial(color: number): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({ color });
}

/**
 * Material slots used by ship geometry. The builder emits one geometry group per
 * slot, so a single merged hull mesh carries planking, pitch, iron and brass -
 * each with its own procedurally generated PBR texture set.
 */
export const SHIP_MAT = {
  hull: 0,
  deck: 1,
  tar: 2,
  iron: 3,
  rope: 4,
  brass: 5,
} as const;

/** The material array matching `SHIP_MAT`, shared by every ship in the world. */
let sharedShipMaterials: THREE.MeshStandardMaterial[] | null = null;

export function shipMaterials(): THREE.MeshStandardMaterial[] {
  if (!sharedShipMaterials) {
    sharedShipMaterials = [
      texturedMaterial('hull', { roughness: 0.94, normalScale: 1.1 }),
      texturedMaterial('deck', { roughness: 0.92, normalScale: 1.0 }),
      texturedMaterial('tar', { roughness: 0.8, normalScale: 1.3 }),
      texturedMaterial('iron', { roughness: 0.85, metalness: 0.72, normalScale: 1.2 }),
      texturedMaterial('rope', { roughness: 1, normalScale: 1.3 }),
      texturedMaterial('gold', { roughness: 0.62, metalness: 0.5, normalScale: 0.9 }),
    ];
  }
  return sharedShipMaterials;
}

/** Single-slot wood material, for small props built on their own. */
export function shipMaterial(): THREE.MeshStandardMaterial {
  return shipMaterials()[SHIP_MAT.hull];
}

function buildCollision(): ShipCollision {
  const deckY = SHIP.deckY;
  const upper = SHIP.upperDeckY;

  const surfaces: WalkSurface[] = [
    // Main deck, with the open hatch cut out of it.
    {
      minX: SHIP.upperDeckX,
      maxX: 6.6,
      minZ: -2.95,
      maxZ: 2.95,
      y0: deckY,
      y1: deckY,
      holes: [SHIP.hatch],
    },
    { minX: 6.6, maxX: 8.5, minZ: -1.7, maxZ: 1.7, y0: deckY, y1: deckY },
    // Raised stern deck with the helm.
    { minX: SHIP.stern + 0.4, maxX: SHIP.upperDeckX, minZ: -2.6, maxZ: 2.6, y0: upper, y1: upper },
    // Stairs between the two.
    { minX: SHIP.upperDeckX, maxX: SHIP.upperDeckX + 1.6, minZ: -1.25, maxZ: 1.25, y0: upper, y1: deckY },
    // Hold floor.
    {
      minX: SHIP.stern + 0.6,
      maxX: 6.6,
      minZ: -1.95,
      maxZ: 1.95,
      y0: SHIP.holdFloorY,
      y1: SHIP.holdFloorY,
      interior: true,
    },
    // Crow's nest.
    { minX: SHIP.mastX - 1.0, maxX: SHIP.mastX + 1.0, minZ: -1.0, maxZ: 1.0, y0: SHIP.crowsNestY + 0.1, y1: SHIP.crowsNestY + 0.1 },
  ];

  const blockers: Blocker[] = [
    // Bulwarks.
    { minX: -9.4, maxX: 8.8, minY: deckY, maxY: deckY + 1.6, minZ: 2.75, maxZ: 3.6 },
    { minX: -9.4, maxX: 8.8, minY: deckY, maxY: deckY + 1.6, minZ: -3.6, maxZ: -2.75 },
    // Stern deck bulwarks are further in.
    { minX: -9.6, maxX: SHIP.upperDeckX, minY: upper, maxY: upper + 1.2, minZ: 2.35, maxZ: 3.4 },
    { minX: -9.6, maxX: SHIP.upperDeckX, minY: upper, maxY: upper + 1.2, minZ: -3.4, maxZ: -2.35 },
    // Transom and bow.
    { minX: -10.2, maxX: -9.1, minY: -2, maxY: upper + 1.2, minZ: -3.6, maxZ: 3.6 },
    { minX: 8.4, maxX: 10.5, minY: deckY, maxY: deckY + 2, minZ: -2, maxZ: 2 },
    // Wall under the raised deck (split around the stairs).
    { minX: SHIP.upperDeckX - 0.3, maxX: SHIP.upperDeckX + 0.05, minY: deckY, maxY: upper, minZ: 1.25, maxZ: 3.2 },
    { minX: SHIP.upperDeckX - 0.3, maxX: SHIP.upperDeckX + 0.05, minY: deckY, maxY: upper, minZ: -3.2, maxZ: -1.25 },
    // Mast, capstan and the helm.
    { minX: SHIP.mastX - 0.34, maxX: SHIP.mastX + 0.34, minY: -2, maxY: SHIP.mastTop, minZ: -0.34, maxZ: 0.34 },
    { minX: 4.9, maxX: 5.9, minY: deckY, maxY: deckY + 1.1, minZ: -0.55, maxZ: 0.55 },
    { minX: -7.55, maxX: -6.75, minY: upper, maxY: upper + 1.8, minZ: -0.6, maxZ: 0.6 },
    // Hold walls.
    { minX: -9.0, maxX: 7.2, minY: SHIP.holdFloorY, maxY: deckY, minZ: 1.9, maxZ: 2.6 },
    { minX: -9.0, maxX: 7.2, minY: SHIP.holdFloorY, maxY: deckY, minZ: -2.6, maxZ: -1.9 },
    { minX: 6.6, maxX: 7.4, minY: SHIP.holdFloorY, maxY: deckY, minZ: -2.6, maxZ: 2.6 },
    { minX: -9.4, maxX: -8.7, minY: SHIP.holdFloorY, maxY: deckY, minZ: -2.6, maxZ: 2.6 },
  ];

  const ladders: Ladder[] = [
    // Hatch ladder into the hold.
    { minX: SHIP.hatch.minX, maxX: SHIP.hatch.minX + 0.75, minZ: -0.7, maxZ: 0.7, bottomY: SHIP.holdFloorY, topY: deckY + 0.3 },
    // Ratlines up to the crow's nest.
    { minX: SHIP.mastX - 1.7, maxX: SHIP.mastX + 1.7, minZ: 2.6, maxZ: 3.1, bottomY: deckY, topY: SHIP.crowsNestY + 0.3 },
    { minX: SHIP.mastX - 1.7, maxX: SHIP.mastX + 1.7, minZ: -3.1, maxZ: -2.6, bottomY: deckY, topY: SHIP.crowsNestY + 0.3 },
    // Boarding ladders on the outside of the hull, for climbing up out of the sea.
    { minX: -6.7, maxX: -5.3, minZ: 2.7, maxZ: 3.9, bottomY: -1.5, topY: deckY + 0.35 },
    { minX: -6.7, maxX: -5.3, minZ: -3.9, maxZ: -2.7, bottomY: -1.5, topY: deckY + 0.35 },
  ];

  return { surfaces, blockers, ladders };
}

/** Reference points on the hull used for buoyancy sampling. */
export const BUOYANCY_POINTS: THREE.Vector3[] = [
  new THREE.Vector3(7.6, -1.0, 0),
  new THREE.Vector3(3.0, -1.9, -2.4),
  new THREE.Vector3(3.0, -1.9, 2.4),
  new THREE.Vector3(-2.5, -2.0, -2.6),
  new THREE.Vector3(-2.5, -2.0, 2.6),
  new THREE.Vector3(-8.2, -1.4, 0),
];

export { transformed };
