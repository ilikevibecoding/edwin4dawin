import * as THREE from 'three';
import { MeshBuilder } from '../core/meshbuilder';
import { clamp01, lerp, Rng } from '../core/math';
import { Noise2D } from '../core/noise';
import { getMaps, texturedMaterial } from '../core/textures';
import { barrelGeometry, chestGeometry, paint, transformed } from '../world/props';
import { WAVE_GLSL } from '../world/waves';

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
  sailMaterial: SailMaterial;
  jib: THREE.Mesh;
  jibMaterial: SailMaterial;
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
  /** White water around the hull at the waterline, driven by speed. */
  hullFoamMaterial: THREE.ShaderMaterial;
  /** Daylight falling through the hatch into the hold. */
  lightShaft: THREE.Object3D;
  /** Dust motes turning in the hold. */
  dust: THREE.Points;
  /** Daylight pooling on the hold floor under the hatch. */
  hatchPool: THREE.PointLight;
  lanternLight: THREE.PointLight;
  /** Glass of the stern lantern; dims to dull horn by daylight. */
  sternLampGlass: THREE.Mesh;
  holdLight: THREE.PointLight;
  collision: ShipCollision;
  anchors: Record<string, THREE.Object3D>;
}

export interface SloopOptions {
  /** The shared wave uniforms, so the hull's foam skirt can ride the sea. */
  waveUniforms?: Record<string, THREE.IUniform>;
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
export interface SailMaterial extends THREE.MeshStandardMaterial {
  /** Live controls, shared with the shadow depth material. */
  uniforms: {
    uTime: THREE.IUniform<number>;
    uFurl: THREE.IUniform<number>;
    uBillow: THREE.IUniform<number>;
    uWindSide: THREE.IUniform<number>;
    uSunDir: THREE.IUniform<THREE.Vector3>;
    uSunColor: THREE.IUniform<THREE.Color>;
  };
  /** Matching depth material, so the cast shadow billows with the canvas. */
  depthMaterial: THREE.MeshDepthMaterial;
}

/** The billow and furl displacement, shared by the lit and depth passes. */
function sailVertexGlsl(): { head: string; body: string } {
  return {
    head: /* glsl */ `
      uniform float uTime;
      uniform float uFurl;
      uniform float uBillow;
      uniform float uWindSide;
      uniform vec3 uBillowAxis;
      attribute vec3 aFurled;`,
    body: /* glsl */ `
      // Furling gathers the canvas into a bundle: up to the yard for the square
      // sail, along the stay for the jib. Interpolating towards a per-vertex
      // target keeps the bundle attached to its spar instead of collapsing the
      // sail into a sheet through the middle of the ship.
      float drop = 1.0 - uFurl;
      transformed = mix(aFurled, transformed, drop);

      // Bulge: strongest mid-sail, pinned at the edges and corners.
      float bulge = sin(uv.x * 3.14159) * sin(uv.y * 3.14159) * uBillow * drop;
      float flap = sin(uv.y * 7.0 + uTime * 2.6) * 0.06 + sin(uv.x * 5.0 - uTime * 1.9) * 0.045;
      float amount = bulge + flap * drop * (0.35 + uBillow);
      transformed += uBillowAxis * (amount * uWindSide * 1.6);
      // Slack canvas sags a little when the sail is not drawing.
      transformed.y -= (1.0 - uBillow) * sin(uv.x * 3.14159) * 0.18 * drop;`,
  };
}

/**
 * Canvas that billows with the wind and furls up its spar.
 *
 * This is an ordinary physically based material with the cloth deformation
 * injected into it, which means the sails take the sun, the sky radiance probe
 * and cast shadows like every other surface on the ship - a hand-rolled shader
 * had to fake all three and never agreed with the rest of the scene. The one
 * thing the standard model does not do is let light through thin cloth, so a
 * transmission term is added on top.
 *
 * `billowAxis` is the direction out of the canvas in the mesh's local space:
 * +X for the square mainsail lofted onto YZ, +Z for the fore-and-aft jib.
 */
function sailMaterial(
  color: number,
  ghostly: boolean,
  billowAxis = new THREE.Vector3(1, 0, 0),
  /** Size of the sail in metres, used to tile the weave at life size. */
  size = new THREE.Vector2(6.4, 6.0),
  /** Cloth panels across the sail, seamed and roped like a real one. */
  panels = 5,
): SailMaterial {
  const canvasMaps = getMaps('canvas');
  // The sail's own UVs run 0..1 so the billow maths stays simple, so the weave
  // is tiled by cloning the textures with a repeat in cloth widths.
  const tile = (source: THREE.Texture) => {
    const copy = source.clone();
    copy.repeat.set(size.x / canvasMaps.worldScale, size.y / canvasMaps.worldScale);
    copy.needsUpdate = true;
    return copy;
  };
  const uniforms = {
    uTime: { value: 0 },
    uFurl: { value: 0 },
    uBillow: { value: 0.6 },
    uWindSide: { value: 1 },
    uBillowAxis: { value: billowAxis.clone() },
    uSunDir: { value: new THREE.Vector3(0.3, 0.8, 0.4) },
    uSunColor: { value: new THREE.Color(0xfff0cf) },
    uTransmit: { value: ghostly ? 0.6 : 1.45 },
    uPanels: { value: panels },
  };
  const glsl = sailVertexGlsl();

  const material = new THREE.MeshStandardMaterial({
    color,
    map: tile(canvasMaps.map),
    normalMap: tile(canvasMaps.normalMap),
    roughnessMap: tile(canvasMaps.roughnessMap),
    roughness: 0.92,
    metalness: 0,
    side: THREE.DoubleSide,
    transparent: ghostly,
    opacity: ghostly ? 0.82 : 1,
  }) as SailMaterial;
  material.normalScale.set(0.7, 0.7);
  // Sailcloth is lit by the sky as much as by the sun, but a full mirror of the
  // radiance probe makes it look damp.
  material.envMapIntensity = 0.38;

  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>\n${glsl.head}\nvarying vec3 vSailNormal;\nvarying float vSailBillow;\nvarying vec2 vSailUv;`,
      )
      .replace(
        '#include <beginnormal_vertex>',
        /* glsl */ `#include <beginnormal_vertex>
        // The bulge tilts the surface away from the flat plane of the sail.
        vec3 sailAcross = normalize(cross(uBillowAxis, vec3(0.0, 1.0, 0.0)));
        objectNormal = normalize(
          uBillowAxis * uWindSide
          + sailAcross * (-cos(uv.x * 3.14159) * uBillow * uWindSide)
          + vec3(0.0, -cos(uv.y * 3.14159) * uBillow * 0.4, 0.0)
        );
        vSailNormal = normalize(mat3(modelMatrix) * objectNormal);`,
      )
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n${glsl.body}\nvSailBillow = amount;\nvSailUv = uv;`);

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        /* glsl */ `#include <common>
        uniform vec3 uSunDir;
        uniform vec3 uSunColor;
        uniform float uTransmit;
        uniform float uBillow;
        uniform float uPanels;
        varying vec3 vSailNormal;
        varying float vSailBillow;
        varying vec2 vSailUv;`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        /* glsl */ `#include <emissivemap_fragment>
        // Thin cloth glows where the sun is behind it.
        float sailBack = clamp(-dot(normalize(vSailNormal), uSunDir), 0.0, 1.0);
        totalEmissiveRadiance += diffuseColor.rgb * uSunColor * pow(sailBack, 1.2) * uTransmit;

        // A sail is sewn from cloths a yard or so wide: darker double-stitched
        // seams between panels, a bolt rope round the edge, and reef bands.
        float sailSeam = smoothstep(0.035, 0.0, abs(fract(vSailUv.y * uPanels) - 0.5) - 0.46);
        float sailEdge = 1.0 - smoothstep(0.0, 0.02,
          min(min(vSailUv.x, 1.0 - vSailUv.x), min(vSailUv.y, 1.0 - vSailUv.y)));
        diffuseColor.rgb *= 1.0 - sailSeam * 0.12 - sailEdge * 0.22;

        // Slack canvas creases; taut canvas is smooth. Darkening the creases
        // slightly is enough to read as cloth rather than card.
        // Slack canvas hangs in creases that run from the corners; taut canvas
        // pulls them out. Three incommensurate bands avoid an obvious grid.
        float sailSlack = 1.0 - clamp(uBillow * 1.4, 0.0, 1.0);
        float sailCrease =
          sin((vSailUv.x * 4.0 + vSailUv.y * 7.0) * 3.14159) * 0.4 +
          sin((vSailUv.x * 9.3 - vSailUv.y * 5.1) * 3.14159) * 0.32 +
          sin((vSailUv.x * 2.1 + vSailUv.y * 13.7) * 3.14159) * 0.28;
        diffuseColor.rgb *= 1.0 - sailCrease * sailSlack * 0.055;`,
      );
  };

  // Shadow pass: the same displacement, so the shadow on the deck matches the
  // sail that is actually drawing.
  const depthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  depthMaterial.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${glsl.head}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n${glsl.body}`);
  };
  depthMaterial.customProgramCacheKey = () => 'sail-depth';

  material.uniforms = uniforms as unknown as SailMaterial['uniforms'];
  material.depthMaterial = depthMaterial;
  material.customProgramCacheKey = () => `sail-${ghostly ? 'ghost' : 'plain'}`;
  return material;
}

/**
 * The band of churned white water a hull drags around with it. It is a skirt of
 * geometry in the ship's own frame sitting at the waterline, so it heels and
 * pitches with the hull instead of sliding about on the sea, and it fades in
 * with speed. Without it a ship looks like it is resting on the water rather
 * than pushing through it.
 */
function buildHullFoam(waveUniforms: Record<string, THREE.IUniform>): {
  mesh: THREE.Mesh;
  material: THREE.ShaderMaterial;
} {
  const stations = 44;
  // The skirt starts clear of the planking: a hull flares above the waterline,
  // so foam drawn tight against it is hidden from anyone looking on.
  const inset = 0.22;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  // The waterline as one closed polygon - starboard bow-wards, then port back
  // aft. Treating the two sides as separate strips leaves the stem open, and
  // the offset rings there fan out into a visible sheet of white card.
  const outline: THREE.Vector2[] = [];
  for (let i = 0; i <= stations; i++) {
    const x = lerp(SHIP.stern + 0.1, SHIP.bow - 0.05, i / stations);
    outline.push(new THREE.Vector2(x, Math.max(0.12, hullShape.widthAt(x, 0))));
  }
  for (let i = stations; i >= 0; i--) {
    const x = lerp(SHIP.stern + 0.1, SHIP.bow - 0.05, i / stations);
    outline.push(new THREE.Vector2(x, -Math.max(0.12, hullShape.widthAt(x, 0))));
  }

  const count = outline.length;
  let along = 0;
  for (let i = 0; i < count; i++) {
    const p = outline[i];
    const prev = outline[(i - 1 + count) % count];
    const next = outline[(i + 1) % count];
    if (i > 0) along += p.distanceTo(prev);
    // Outward normal: perpendicular to the averaged tangent of the closed loop.
    const tangent = next.clone().sub(prev).normalize();
    const n = new THREE.Vector2(tangent.y, -tangent.x);
    if (n.dot(p) < 0) n.negate();
    // Wider forward, because that is where the hull is actually shouldering
    // water aside; the quarters only trail a thin streak. The width is also
    // tied to the local beam, or the ring fans out into a sheet of white card
    // where the two sides converge on the stem.
    const bow = clamp01((p.x - SHIP.stern) / (SHIP.bow - SHIP.stern));
    const outer = Math.min(lerp(0.7, 1.7, bow * bow), 0.28 + Math.abs(p.y) * 0.85);
    positions.push(p.x + n.x * inset, 0, p.y + n.y * inset, p.x + n.x * outer, 0, p.y + n.y * outer);
    uvs.push(along, 0, along, 1);
    const a = i * 2;
    const b = ((i + 1) % count) * 2;
    indices.push(a, b, a + 1, a + 1, b, b + 1);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: {
      ...waveUniforms,
      uTime: { value: 0 },
      uSpeed: { value: 0 },
      uColor: { value: new THREE.Color(0xf4fbff) },
    },
    vertexShader: /* glsl */ `
      ${WAVE_GLSL}
      varying vec2 vUv;
      varying vec3 vLocal;
      void main() {
        vUv = uv;
        vLocal = position;
        // The skirt is authored in the hull's frame but has to lie on the sea,
        // so each vertex is lifted onto the live wave surface rather than onto
        // the ship's own waterline plane, which pitches with the hull.
        vec4 world = modelMatrix * vec4(position, 1.0);
        vec3 waveNormal;
        vec3 disp = gerstnerSurface(world.xz, waveNormal);
        world.y = disp.y + 0.04;
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uSpeed;
      uniform vec3 uColor;
      varying vec2 vUv;
      varying vec3 vLocal;

      float hash21(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }
      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float a = hash21(i);
        float b = hash21(i + vec2(1.0, 0.0));
        float c = hash21(i + vec2(0.0, 1.0));
        float d = hash21(i + vec2(1.0, 1.0));
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
      }

      void main() {
        if (uSpeed <= 0.01) discard;
        // Densest against the planking, trailing away outboard.
        float across = 1.0 - vUv.y;
        // The bow throws the most water; the quarters trail a thinner streak.
        float bow = smoothstep(-3.0, 8.0, vLocal.x);
        float band = pow(across, mix(3.4, 1.5, bow));

        // Churn: three noise fields sliding aft at different rates, multiplied
        // rather than added so the mask breaks into filaments and holes instead
        // of shading smoothly to a sheet.
        vec2 flow = vec2(vUv.x * 1.9 - uTime * 2.6, vUv.y * 3.4);
        float churn = noise(flow) * 0.55 + noise(flow * 2.7 + 4.1) * 0.3 + noise(flow * 6.1 - 2.3) * 0.15;
        float lace = smoothstep(0.34, 0.78, churn);
        float mask = band * mix(0.25, 1.0, lace);
        mask *= smoothstep(0.02, 0.22, mask);

        float alpha = mask * uSpeed * (0.4 + bow * 0.6);
        if (alpha < 0.012) discard;
        gl_FragColor = vec4(uColor, clamp(alpha, 0.0, 0.55));
      }
    `,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.renderOrder = 3;
  mesh.frustumCulled = false;
  return { mesh, material };
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
  // Where each vertex ends up when the sail is furled: bundled along the luff,
  // which is the stay the sail hoists on.
  const furled: number[] = [];
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
      furled.push(a.x, a.y, a.z);
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
  geometry.setAttribute('aFurled', new THREE.Float32BufferAttribute(furled, 3));
  return geometry;
}

/**
 * Volumetric-looking shaft of daylight. Additive, with the alpha falling off
 * both along the shaft and towards its edges, so it reads as dusty air rather
 * than a solid cone.
 */
function shaftMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uStrength: { value: 0 },
      uColor: { value: new THREE.Color(0xffe6b8) },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vViewDir;
      varying vec3 vNormalW;
      void main() {
        vUv = uv;
        vec4 world = modelMatrix * vec4(position, 1.0);
        vViewDir = normalize(cameraPosition - world.xyz);
        vNormalW = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uStrength;
      uniform vec3 uColor;
      varying vec2 vUv;
      varying vec3 vViewDir;
      varying vec3 vNormalW;

      void main() {
        if (uStrength <= 0.001) discard;
        // Fade along the shaft: brightest just under the hatch.
        float along = pow(clamp(1.0 - vUv.y, 0.0, 1.0), 1.6);
        // How much dusty air a ray crosses is greatest straight down the middle
        // of the shaft and falls to nothing at its silhouette. Brightening the
        // grazing angles instead - the usual rim trick, which is right for a
        // glow but wrong for a volume - is what made this read as a solid slab
        // with hard edges hanging under the hatch.
        float facing = abs(dot(normalize(vNormalW), normalize(vViewDir)));
        float body = smoothstep(0.02, 0.62, facing) * 0.26;
        // Slow drifting streaks of denser dust.
        float streak = 0.82 + 0.18 * sin(vUv.x * 26.0 + uTime * 0.7) * sin(vUv.y * 9.0 - uTime * 0.4);
        gl_FragColor = vec4(uColor * uStrength * along * body * streak, 1.0);
      }
    `,
  });
}

/** Dust motes turning in the hold, brightest where the light shaft catches them. */
function dustMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uStrength: { value: 0 },
      uShaftX: { value: 2.3 },
      uColor: { value: new THREE.Color(0xffe9c4) },
    },
    vertexShader: /* glsl */ `
      uniform float uTime;
      uniform float uShaftX;
      attribute float aSeed;
      varying float vFade;
      void main() {
        vec3 p = position;
        // Motes drift and settle, then loop back to the top.
        p.x += sin(uTime * 0.21 + aSeed) * 0.5;
        p.z += cos(uTime * 0.17 + aSeed * 1.7) * 0.4;
        p.y += sin(uTime * 0.12 + aSeed * 0.7) * 0.35;
        // Brightest inside the light shaft, dim elsewhere.
        float inShaft = exp(-pow((p.x - uShaftX) / 1.3, 2.0));
        vFade = 0.1 + inShaft * 0.55;
        vec4 view = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * view;
        gl_PointSize = (1.5 + 2.2 * inShaft) * (7.0 / max(1.0, -view.z));
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uStrength;
      varying float vFade;
      void main() {
        if (uStrength <= 0.001) discard;
        vec2 d = gl_PointCoord - 0.5;
        float mote = smoothstep(0.5, 0.0, length(d));
        gl_FragColor = vec4(uColor * vFade * uStrength, mote * vFade * uStrength);
      }
    `,
  });
}

/** Water sloshing in the hold - rises as the ship floods. */
function holdWaterMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(0x1b3c40) },
      uLampColor: { value: new THREE.Color(0xffb04a) },
      uLampPos: { value: new THREE.Vector3(-5.2, SHIP.deckY - 0.55, 0) },
    },
    vertexShader: /* glsl */ `
      uniform float uTime;
      varying vec2 vUv;
      varying float vRipple;
      varying vec3 vWorldPos;
      varying vec3 vSlope;
      void main() {
        vUv = uv;
        vec3 p = position;
        // Two crossing swells plus a faster chop, so the bilge slops about.
        float r =
          sin(p.x * 1.5 + uTime * 2.0) * 0.045 +
          sin(p.z * 2.4 - uTime * 1.7) * 0.03 +
          sin(p.x * 5.5 + p.z * 3.0 + uTime * 3.4) * 0.012;
        p.y += r;
        vRipple = r;
        vSlope = vec3(
          cos(p.x * 1.5 + uTime * 2.0) * 1.5 * 0.045,
          1.0,
          cos(p.z * 2.4 - uTime * 1.7) * 2.4 * 0.03
        );
        vec4 world = modelMatrix * vec4(p, 1.0);
        vWorldPos = world.xyz;
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform vec3 uLampColor;
      uniform vec3 uLampPos;
      varying vec2 vUv;
      varying float vRipple;
      varying vec3 vWorldPos;
      varying vec3 vSlope;

      void main() {
        vec3 normal = normalize(vec3(-vSlope.x, 1.0, -vSlope.z));
        vec3 view = normalize(cameraPosition - vWorldPos);

        // Dirty bilge water: dark, with a Fresnel sheen that picks up the lantern.
        float fresnel = pow(1.0 - clamp(dot(normal, view), 0.0, 1.0), 3.0);
        vec3 col = uColor * (0.5 + vRipple * 2.2);

        vec3 toLamp = normalize(uLampPos - vWorldPos);
        vec3 halfway = normalize(toLamp + view);
        float spec = pow(clamp(dot(normal, halfway), 0.0, 1.0), 90.0);
        col += uLampColor * spec * 1.4;
        col += uLampColor * 0.1 * max(0.0, dot(normal, toLamp));
        col = mix(col, uLampColor * 0.35 + uColor * 0.4, fresnel * 0.5);

        // Scum and foam collect where the water meets the frames.
        float edge = min(vUv.y, 1.0 - vUv.y);
        float foam = smoothstep(0.09, 0.0, edge) * 0.5 + smoothstep(0.02, 0.0, abs(vRipple) - 0.04) * 0.25;
        col = mix(col, vec3(0.55, 0.6, 0.52), foam * 0.4);

        gl_FragColor = vec4(col, mix(0.9, 0.98, fresnel));
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
  const sailColor = options.sailColor ?? 0xf2e4c4;
  const trimColor = options.trimColor ?? 0x7d3b2a;
  const ghostly = options.ghostly ?? false;

  const group = new THREE.Group();
  group.name = 'sloop';
  const builder = new MeshBuilder();
  // The generated wood/iron textures carry the real albedo, so the palette
  // colours only nudge each part's tone.
  builder.setTint(0.42);
  const anchors: Record<string, THREE.Object3D> = {};
  /** Slow salt-and-weather staining down the hull sides. */
  const hullNoise = new Noise2D(5521);

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
        const { x, y } = meta[r][c];
        // The boot-top stripe is painted just above the waterline; below it is
        // the tarred, fouled bottom that never sees air.
        if (!interior && y > 0.06 && y < 0.62) {
          return new THREE.Color(trimColor).multiplyScalar(colorScale).getHex();
        }
        if (!interior && y <= 0.06) return new THREE.Color(0x4d4b42).multiplyScalar(colorScale).getHex();
        // Fake ambient occlusion below deck: whatever light gets in comes down
        // through the hatch, so the bilge is much darker than the beam shelf.
        const ao = interior
          ? clamp01(0.34 + ((y - SHIP.holdFloorY) / (SHIP.deckY - SHIP.holdFloorY)) * 0.8)
          : 1;
        // Vertex colour carries only slow, coherent weathering; the strakes and
        // their caulking come from the texture. Randomising per vertex, or
        // banding by plank level, turns the whole side into brickwork because
        // the two rhythms beat against each other.
        const bleach = interior ? 1 : lerp(0.86, 1.08, clamp01((y - 0.62) / 1.5));
        const stain = 1 - 0.12 * clamp01(hullNoise.fbm(x * 0.55, y * 0.14, 3) * 1.6);
        const weathered = new THREE.Color(interior ? WOOD_MID : hullColor).multiplyScalar(
          colorScale * ao * bleach * stain,
        );
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
  // One continuous outer skin: splitting it into a pitch band and a planking band
  // left a seam you could see straight through from inside the hold.
  builder.setMaterial(SHIP_MAT.hull);
  buildHullSurface({ inset: 0, flip: true, colorScale: 1 });
  builder.setMaterial(SHIP_MAT.hullDark);
  buildHullSurface({ inset: 0.16, flip: false, colorScale: 0.78, interior: true });
  builder.setMaterial(SHIP_MAT.hull);

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
  // The hold floor is dimmer planking: barely any daylight gets down there.
  builder.setMaterial(SHIP_MAT.hullDark);
  addDeck(SHIP.stern + 0.3, 7.0, SHIP.holdFloorY, 0.24);
  builder.setMaterial(SHIP_MAT.deck);

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

  // Working clutter round the mast: a pin rail with belaying pins for the
  // running rigging, coils of line, and a deck bucket. A bare deck is the
  // quickest way to make a ship look like a model of one.
  {
    const mx = SHIP.mastX;
    const deck = SHIP.deckY;
    for (const side of [-1, 1] as const) {
      const railZ = side * 1.0;
      builder.addBox({ x: mx, y: deck + 0.92, z: railZ }, { x: 1.5, y: 0.09, z: 0.13 }, WOOD_DARK);
      for (const dz of [-0.28, 0.28] as const) {
        strut(
          builder,
          new THREE.Vector3(mx + dz * 2.3, deck, railZ),
          new THREE.Vector3(mx + dz * 2.3, deck + 0.94, railZ),
          0.05,
          WOOD_DARK,
          5,
        );
      }
      for (let i = 0; i < 5; i++) {
        const px = mx - 0.6 + i * 0.3;
        strut(
          builder,
          new THREE.Vector3(px, deck + 1.04, railZ),
          new THREE.Vector3(px, deck + 0.8, railZ),
          0.022,
          WOOD_LIGHT,
          4,
        );
      }
      // Line coiled and hung off the pins.
      builder.setMaterial(SHIP_MAT.rope);
      for (const px of [mx - 0.3, mx + 0.6]) {
        for (let i = 0; i < 3; i++) {
          const ring = new THREE.TorusGeometry(0.11 - i * 0.015, 0.022, 4, 9);
          builder.addGeometry(
            ring,
            ROPE,
            new THREE.Matrix4().compose(
              new THREE.Vector3(px, deck + 0.66 - i * 0.05, railZ + side * 0.06),
              new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0)),
              new THREE.Vector3(1, 1, 0.4),
            ),
          );
          ring.dispose();
        }
      }
      builder.setMaterial(SHIP_MAT.hull);
    }

    // Flemished coil of heavy line on the deck itself.
    builder.setMaterial(SHIP_MAT.rope);
    for (let i = 0; i < 5; i++) {
      const ring = new THREE.TorusGeometry(0.18 + i * 0.07, 0.045, 5, 12);
      builder.addGeometry(
        ring,
        ROPE,
        new THREE.Matrix4().compose(
          new THREE.Vector3(mx - 2.2, deck + 0.05, -1.9),
          new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)),
          new THREE.Vector3(1, 1, 1),
        ),
      );
      ring.dispose();
    }
    builder.setMaterial(SHIP_MAT.hull);

    // Deck bucket, and a water butt lashed against the bulwark.
    const bucket = new THREE.CylinderGeometry(0.15, 0.12, 0.26, 9, 1);
    builder.addGeometry(bucket, WOOD_MID, new THREE.Matrix4().makeTranslation(mx + 1.9, deck + 0.13, 1.8), [1, 0.26]);
    bucket.dispose();
    builder.setMaterial(SHIP_MAT.iron);
    const bucketHoop = new THREE.TorusGeometry(0.15, 0.012, 4, 10);
    builder.addGeometry(
      bucketHoop,
      IRON,
      new THREE.Matrix4().compose(
        new THREE.Vector3(mx + 1.9, deck + 0.2, 1.8),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)),
        new THREE.Vector3(1, 1, 1),
      ),
    );
    bucketHoop.dispose();
    builder.setMaterial(SHIP_MAT.hull);
  }

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
    // A sloop's wheel is about waist to chest high, not taller than the man on
    // it: 1.0 m across the rim, 1.4 m over the handle tips.
    const rimRadius = 0.5;
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
        dir.clone().multiplyScalar(0.13),
        dir.clone().multiplyScalar(rimRadius + 0.02),
        0.036,
        WOOD_LIGHT,
        5,
      );
      // Handle beyond the rim, thicker at the tip like a turned grip.
      const handleBase = dir.clone().multiplyScalar(rimRadius + 0.02);
      const handleTip = dir.clone().multiplyScalar(rimRadius + 0.2);
      strut(wheelBuilder, handleBase, handleTip, 0.042, WOOD_MID, 5);
      const knob = new THREE.SphereGeometry(0.05, 7, 5);
      wheelBuilder.addGeometry(knob, WOOD_MID, new THREE.Matrix4().makeTranslation(handleTip.x, handleTip.y, handleTip.z));
      knob.dispose();
    }

    // Turned wooden hub with small brass bosses on the ends.
    const hub = new THREE.CylinderGeometry(0.13, 0.13, 0.24, 12);
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
    for (const dx of [-0.13, 0.13]) {
      const boss = new THREE.SphereGeometry(0.06, 8, 6);
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

  // Binnacle ahead of the wheel: a turned pedestal carrying the compass, with
  // its card tilted up towards the helmsman.
  {
    const bx = -6.6;
    const bz = -0.95;
    const base = SHIP.upperDeckY;
    // Painted, not bare plank: at this size a wood texture just reads as bark.
    builder.setMaterial(SHIP_MAT.tar);
    const plinth = new THREE.CylinderGeometry(0.17, 0.2, 0.07, 12, 1);
    builder.addGeometry(plinth, 0x3b3129, new THREE.Matrix4().makeTranslation(bx, base + 0.035, bz), [1.6, 0.08]);
    plinth.dispose();
    const column = new THREE.CylinderGeometry(0.075, 0.105, 0.78, 12, 1);
    builder.addGeometry(column, 0x4a3b2c, new THREE.Matrix4().makeTranslation(bx, base + 0.45, bz), [0.9, 0.8]);
    column.dispose();
    // Two turned collars break the shaft up so it is not one plain pole.
    for (const y of [0.24, 0.62]) {
      const collar = new THREE.CylinderGeometry(0.098, 0.098, 0.035, 12, 1);
      builder.addGeometry(collar, 0x2f2822, new THREE.Matrix4().makeTranslation(bx, base + y, bz), [0.9, 0.04]);
      collar.dispose();
    }

    builder.setMaterial(SHIP_MAT.brass);
    // Binnacle head: a brass drum with a domed hood over the card.
    const bowl = new THREE.CylinderGeometry(0.15, 0.115, 0.16, 14, 1);
    builder.addGeometry(bowl, 0xa88b52, new THREE.Matrix4().makeTranslation(bx, base + 0.9, bz), [1.0, 0.16]);
    bowl.dispose();
    const hood = new THREE.SphereGeometry(0.155, 14, 7, 0, Math.PI * 2, 0, Math.PI * 0.42);
    builder.addGeometry(hood, 0x9c7f49, new THREE.Matrix4().makeTranslation(bx, base + 0.96, bz), [1.0, 0.2]);
    hood.dispose();
    // Compass card, tilted aft so it faces whoever is on the wheel.
    const card = new THREE.CylinderGeometry(0.115, 0.115, 0.012, 16, 1);
    const tilt = new THREE.Matrix4()
      .makeTranslation(bx, base + 0.985, bz)
      .multiply(new THREE.Matrix4().makeRotationZ(0.34));
    builder.setMaterial(SHIP_MAT.deck);
    builder.addGeometry(card, 0xe8dcc0, tilt, [1.1, 0.02]);
    card.dispose();
    builder.setMaterial(SHIP_MAT.iron);
    const needle = new THREE.BoxGeometry(0.15, 0.007, 0.014);
    builder.addGeometry(
      needle,
      0x2a2a2e,
      new THREE.Matrix4().makeTranslation(bx, base + 0.997, bz).multiply(new THREE.Matrix4().makeRotationY(0.7)),
    );
    needle.dispose();
  }
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
    // A flat cap rail along the top of the posts, with a moulding under it -
    // a round bar reads as scaffolding, a capped rail reads as a ship.
    const railRows: THREE.Vector3[][] = [];
    const mouldRows: THREE.Vector3[][] = [];
    for (let i = 0; i <= 10; i++) {
      const x = lerp(SHIP.stern + 0.42, SHIP.upperDeckX + 0.3, i / 10);
      const half = hullShape.widthAt(x, SHIP.upperDeckY) - 0.25;
      const y = SHIP.upperDeckY + 0.85;
      railRows.push([
        new THREE.Vector3(x, y + 0.05, side * (half - 0.09)),
        new THREE.Vector3(x, y + 0.06, side * half),
        new THREE.Vector3(x, y + 0.05, side * (half + 0.09)),
      ]);
      mouldRows.push([
        new THREE.Vector3(x, y + 0.05, side * (half - 0.09)),
        new THREE.Vector3(x, y - 0.02, side * (half - 0.06)),
        new THREE.Vector3(x, y - 0.02, side * (half + 0.06)),
        new THREE.Vector3(x, y + 0.05, side * (half + 0.09)),
      ]);
    }
    builder.addSurface(railRows, () => 0x8a6b40, side < 0);
    builder.addSurface(mouldRows, () => 0x6f5433, side > 0);
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
    // Deck beams, with knees bracing them into the frames, and stringers running
    // fore and aft: this is most of what you see when you look up in the hold.
    builder.setMaterial(SHIP_MAT.hullDark);
    for (let i = 0; i < 11; i++) {
      const x = lerp(SHIP.stern + 1.0, 6.5, i / 10);
      const half = hullShape.widthAt(x, SHIP.deckY) - 0.18;
      builder.addBox({ x, y: SHIP.deckY - 0.2, z: 0 }, { x: 0.26, y: 0.26, z: half * 2 }, WOOD_MID);
      // Knees: angled braces from the beam ends down into the side planking.
      for (const side of [-1, 1] as const) {
        strut(
          builder,
          new THREE.Vector3(x, SHIP.deckY - 0.3, side * (half - 0.05)),
          new THREE.Vector3(x, SHIP.deckY - 0.72, side * (half + 0.16)),
          0.075,
          WOOD_MID,
          5,
        );
      }
    }
    for (const z of [-1.55, 0, 1.55]) {
      builder.addBox({ x: -1.2, y: SHIP.deckY - 0.36, z }, { x: 15.2, y: 0.14, z: 0.16 }, WOOD_MID);
    }

    // Frames (ribs) standing proud of the inner planking. They are stepped up
    // the hull in short sections so each one hugs the curve of the side; a
    // single straight timber from the sole to the deckhead cuts the corner and
    // reads as a shelf sticking out into the hold.
    for (let i = 0; i < 16; i++) {
      const x = lerp(SHIP.stern + 1.0, 6.6, i / 15);
      for (const side of [-1, 1] as const) {
        const steps = 5;
        let previous: THREE.Vector3 | null = null;
        for (let s = 0; s <= steps; s++) {
          const y = lerp(SHIP.holdFloorY + 0.02, SHIP.deckY - 0.3, s / steps);
          const half = Math.max(0.2, hullShape.widthAt(x, y) - 0.11);
          const point = new THREE.Vector3(x, y, side * half);
          if (previous) strut(builder, previous, point, 0.07, WOOD_MID, 5);
          previous = point;
        }
      }
    }

    // Hold ceiling so the sky does not show through the planking from below.
    // It runs slightly wide of the inner planking so no crack of daylight
    // survives where the deckhead meets the side.
    const rows: THREE.Vector3[][] = [];
    for (let i = 0; i < 20; i++) {
      const x = lerp(SHIP.stern + 0.4, 6.9, i / 19);
      const half = Math.max(0.05, hullShape.widthAt(x, SHIP.deckY) + 0.05);
      rows.push([new THREE.Vector3(x, SHIP.deckY - 0.06, -half), new THREE.Vector3(x, SHIP.deckY - 0.06, half)]);
    }
    builder.addSurface(
      rows,
      () => 0x6a5334,
      true,
      (r) => {
        const x = lerp(SHIP.stern + 0.4, 6.9, r / 19);
        return x > SHIP.hatch.minX - 0.2 && x < SHIP.hatch.maxX + 0.2;
      },
    );

    // Chart table with a candle at the stern end of the hold.
    builder.setMaterial(SHIP_MAT.deck);
    builder.addBox({ x: -7.4, y: SHIP.holdFloorY + 0.75, z: 0 }, { x: 1.5, y: 0.1, z: 1.9 }, WOOD_LIGHT);
    builder.setMaterial(SHIP_MAT.hullDark);
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

    // --- cargo and dressing, so the hold reads as a working ship's belly

    // Crates stacked against the frames.
    const crate = (x: number, y: number, z: number, size: number, yaw: number): void => {
      const half = size * 0.5;
      const b = new MeshBuilder();
      b.setTint(0.42);
      b.setMaterial(SHIP_MAT.hull);
      b.addBox({ x: 0, y: 0, z: 0 }, { x: size, y: size * 0.86, z: size }, WOOD_MID);
      // Batten frame around the crate.
      for (const sz of [-half, half]) {
        b.addBox({ x: 0, y: 0, z: sz }, { x: size + 0.02, y: 0.07, z: 0.03 }, WOOD_DARK);
      }
      for (const sx of [-half, half]) {
        b.addBox({ x: sx, y: 0, z: 0 }, { x: 0.03, y: 0.07, z: size + 0.02 }, WOOD_DARK);
      }
      const mesh = new THREE.Mesh(b.build(), shipMaterials());
      mesh.position.set(x, y, z);
      mesh.rotation.y = yaw;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
    };
    crate(-6.0, SHIP.holdFloorY + 0.36, -1.25, 0.72, 0.2);
    crate(-6.1, SHIP.holdFloorY + 1.0, -1.15, 0.6, -0.35);
    crate(-6.2, SHIP.holdFloorY + 0.32, 1.3, 0.64, 0.5);
    crate(3.4, SHIP.holdFloorY + 0.34, 1.25, 0.68, -0.2);
    crate(3.5, SHIP.holdFloorY + 0.94, 1.2, 0.5, 0.4);
    crate(1.2, SHIP.holdFloorY + 0.3, -1.4, 0.6, 0.15);

    // Sacks: slumped, gathered at the neck and tied off. A plain squashed
    // sphere is a cotton ball; the tie and the shoulder under it are what make
    // it read as something heavy sitting on a deck.
    builder.setMaterial(SHIP_MAT.canvas);
    for (const [sx, sz, r, yaw] of [
      [-3.4, 1.35, 0.34, 0.4],
      [-3.0, 1.5, 0.28, -1.1],
      [5.0, -1.2, 0.32, 2.2],
      [5.3, -1.45, 0.26, 0.9],
    ] as const) {
      const sackColor = 0x9d906f;
      const belly = new THREE.SphereGeometry(r, 9, 7);
      builder.addGeometry(
        belly,
        sackColor,
        new THREE.Matrix4().compose(
          new THREE.Vector3(sx, SHIP.holdFloorY + r * 0.68, sz),
          new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0.12)),
          new THREE.Vector3(1.06, 0.74, 0.92),
        ),
        [r * 4, r * 3],
      );
      belly.dispose();
      // Shoulder narrowing to the throat, then the gathered top above the tie.
      const neck = new THREE.CylinderGeometry(r * 0.28, r * 0.82, r * 0.72, 9, 1);
      builder.addGeometry(
        neck,
        sackColor,
        new THREE.Matrix4().compose(
          new THREE.Vector3(sx + Math.cos(yaw) * r * 0.1, SHIP.holdFloorY + r * 1.18, sz + Math.sin(yaw) * r * 0.1),
          new THREE.Quaternion().setFromEuler(new THREE.Euler(0.16, yaw, 0.2)),
          new THREE.Vector3(1, 1, 1),
        ),
        [r * 3, r * 2],
      );
      neck.dispose();
      const ruff = new THREE.SphereGeometry(r * 0.3, 7, 5);
      builder.addGeometry(
        ruff,
        0x8a7d5f,
        new THREE.Matrix4().compose(
          new THREE.Vector3(sx + Math.cos(yaw) * r * 0.16, SHIP.holdFloorY + r * 1.6, sz + Math.sin(yaw) * r * 0.16),
          new THREE.Quaternion(),
          new THREE.Vector3(1.2, 0.8, 1.2),
        ),
        [r * 2, r * 2],
      );
      ruff.dispose();
      builder.setMaterial(SHIP_MAT.rope);
      const tie = new THREE.TorusGeometry(r * 0.3, r * 0.045, 4, 9);
      builder.addGeometry(
        tie,
        ROPE,
        new THREE.Matrix4().compose(
          new THREE.Vector3(sx + Math.cos(yaw) * r * 0.13, SHIP.holdFloorY + r * 1.42, sz + Math.sin(yaw) * r * 0.13),
          new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)),
          new THREE.Vector3(1, 1, 1),
        ),
      );
      tie.dispose();
      builder.setMaterial(SHIP_MAT.canvas);
    }

    // Coils of rope on the floor and hanging from the beams.
    builder.setMaterial(SHIP_MAT.rope);
    for (const [cx, cz] of [
      [-1.9, 1.5],
      [4.2, 1.4],
    ] as const) {
      for (let i = 0; i < 3; i++) {
        const coil = new THREE.TorusGeometry(0.3 - i * 0.05, 0.055, 5, 14);
        builder.addGeometry(
          coil,
          ROPE,
          new THREE.Matrix4().compose(
            new THREE.Vector3(cx, SHIP.holdFloorY + 0.06 + i * 0.1, cz),
            new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, i * 0.4, 0)),
            new THREE.Vector3(1, 1, 1),
          ),
          [1.9, 0.35],
        );
        coil.dispose();
      }
    }

    // Cannonball rack: a timber with hollows, filled with shot.
    builder.setMaterial(SHIP_MAT.hullDark);
    builder.addBox({ x: 0.4, y: SHIP.holdFloorY + 0.1, z: -1.6 }, { x: 1.5, y: 0.2, z: 0.4 }, WOOD_DARK);
    builder.setMaterial(SHIP_MAT.iron);
    for (let i = 0; i < 6; i++) {
      const ball = new THREE.SphereGeometry(0.11, 8, 6);
      builder.addGeometry(
        ball,
        0x53565a,
        new THREE.Matrix4().makeTranslation(-0.2 + i * 0.24, SHIP.holdFloorY + 0.26, -1.6),
        [0.7, 0.35],
      );
      ball.dispose();
    }

    // Hammock slung between two frames.
    builder.setMaterial(SHIP_MAT.canvas);
    {
      const hammockRows: THREE.Vector3[][] = [];
      const x0 = -0.2;
      const x1 = 1.7;
      for (let i = 0; i <= 10; i++) {
        const t = i / 10;
        const x = lerp(x0, x1, t);
        // Catenary sag, pinched at the ends where it is lashed to the frames.
        const sag = Math.sin(t * Math.PI) * 0.26;
        const width = 0.08 + Math.sin(t * Math.PI) * 0.28;
        const y = SHIP.deckY - 1.0 - sag;
        hammockRows.push([
          new THREE.Vector3(x, y, 1.3 - width),
          new THREE.Vector3(x, y + 0.03, 1.3),
          new THREE.Vector3(x, y, 1.3 + width),
        ]);
      }
      // Slack canvas has folds running from the head-lashing to the foot. A
      // single flat colour across the whole cloth is what made this read as a
      // sheet of corrugated iron when the hatch light caught it.
      builder.addSurface(hammockRows, (r, col) => {
        const t = r / 10;
        const fold = Math.sin(t * 11.0 + (col === 1 ? 0.6 : 0)) * 0.5 + 0.5;
        const shade = 0.78 + fold * 0.14 + (col === 1 ? 0.08 : 0);
        return new THREE.Color(0x8a7d61).multiplyScalar(shade).getHex();
      }, false);
      builder.setMaterial(SHIP_MAT.rope);
      // Clews: the cloth gathers into a bunch of nettles at each end and those
      // go up to a lashing on the beam.
      for (const [x, dir] of [
        [x0, -1],
        [x1, 1],
      ] as const) {
        const y = SHIP.deckY - 1.0;
        for (const dz of [-0.09, -0.03, 0.03, 0.09]) {
          strut(
            builder,
            new THREE.Vector3(x - dir * 0.02, y + 0.02, 1.3 + dz),
            new THREE.Vector3(x + dir * 0.22, y + 0.18, 1.3),
            0.009,
            ROPE,
            4,
          );
        }
        strut(
          builder,
          new THREE.Vector3(x + dir * 0.22, y + 0.18, 1.3),
          new THREE.Vector3(x + dir * 0.34, SHIP.deckY - 0.34, 1.44),
          0.018,
          ROPE,
          4,
        );
      }
      // A rolled blanket lying in the belly of it.
      builder.setMaterial(SHIP_MAT.canvas);
      const roll = new THREE.CylinderGeometry(0.1, 0.11, 0.72, 8, 1);
      builder.addGeometry(
        roll,
        0x6b5642,
        new THREE.Matrix4().compose(
          new THREE.Vector3(0.85, SHIP.deckY - 1.16, 1.3),
          new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, Math.PI / 2)),
          new THREE.Vector3(1, 1, 1),
        ),
        [1.2, 0.4],
      );
      roll.dispose();
    }
    builder.setMaterial(SHIP_MAT.hull);
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
    // A wooden head with a painted stencil on it. A full-width disc in the
    // cargo colour reads as a bright plank floating in mid-air, because the
    // barrel under it is in shadow and the lid is not.
    const lid = new THREE.Mesh(
      paint(new THREE.CylinderGeometry(0.32, 0.33, 0.055, 12), 0x5d4126),
      shipMaterial(),
    );
    lid.position.set(spot.x, SHIP.holdFloorY + 1.11, spot.z);
    group.add(lid);
    const stencil = new THREE.Mesh(
      paint(new THREE.CylinderGeometry(0.16, 0.16, 0.012, 10), spot.color),
      shipMaterial(),
    );
    stencil.position.set(spot.x, SHIP.holdFloorY + 1.142, spot.z);
    group.add(stencil);
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
  {
    // Furling hauls the canvas up into a bundle along the yard at y = 0.
    const pos = sailGeometry.attributes.position;
    const furled = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      furled[i * 3] = pos.getX(i);
      furled[i * 3 + 1] = 0;
      furled[i * 3 + 2] = pos.getZ(i);
    }
    sailGeometry.setAttribute('aFurled', new THREE.BufferAttribute(furled, 3));
  }
  const sailMat = sailMaterial(
    sailColor,
    ghostly,
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector2(SHIP.yardHalf * 1.86, sailHeight),
    6,
  );
  const sail = new THREE.Mesh(sailGeometry, sailMat);
  sail.position.set(0, SHIP.sailTop, 0);
  sail.castShadow = true;
  sail.receiveShadow = true;
  sail.customDepthMaterial = sailMat.depthMaterial;
  yard.add(sail);

  // Jib: a triangular staysail set fore-and-aft between forestay and bowsprit.
  const jibMat = sailMaterial(sailColor, ghostly, new THREE.Vector3(0, 0, 1), new THREE.Vector2(6.0, 5.4), 4);
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
  jib.castShadow = true;
  jib.receiveShadow = true;
  jib.customDepthMaterial = jibMat.depthMaterial;
  group.add(jib);

  // Flag at the masthead.
  const flagGeometry = new THREE.PlaneGeometry(1.7, 1.0, 12, 4);
  flagGeometry.translate(0.85, 0, 0);
  const flagMat = flagMaterial(ghostly ? 0x2f4a34 : 0x8f2b25, options.emblem === 'skull');
  const flag = new THREE.Mesh(flagGeometry, flagMat);
  flag.position.set(SHIP.mastX + 0.1, SHIP.mastTop - 0.5, 0);
  group.add(flag);

  // ---------------------------------------------------------- lights, water

  // Stern lantern on the taffrail, well clear of the helmsman's sightline.
  const lx = SHIP.stern + 0.62;
  const ly = SHIP.upperDeckY + 1.34;
  const lanternLight = new THREE.PointLight(0xffb861, 0, 22, 1);
  lanternLight.position.set(lx, ly, 0);
  group.add(lanternLight);
  let sternLampGlass: THREE.Mesh;
  {
    // An iron cage with a domed cap, corner bars and a horn-glass body, stood
    // on a short post. A glowing box reads as a bug, not a lamp.
    builder.setMaterial(SHIP_MAT.iron);
    const cap = new THREE.ConeGeometry(0.135, 0.1, 8);
    builder.addGeometry(cap, 0x6f7276, new THREE.Matrix4().makeTranslation(lx, ly + 0.235, 0), [1.2, 0.1]);
    cap.dispose();
    const collar = new THREE.CylinderGeometry(0.105, 0.105, 0.028, 8);
    builder.addGeometry(collar, 0x6f7276, new THREE.Matrix4().makeTranslation(lx, ly + 0.176, 0), [0.9, 0.03]);
    collar.dispose();
    const foot = new THREE.CylinderGeometry(0.105, 0.12, 0.04, 8);
    builder.addGeometry(foot, 0x6f7276, new THREE.Matrix4().makeTranslation(lx, ly - 0.17, 0), [0.9, 0.05]);
    foot.dispose();
    // Four corner bars plus a waist band: the cage is what makes it a lantern.
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const bx = lx + Math.cos(a) * 0.088;
      const bz = Math.sin(a) * 0.088;
      strut(builder, new THREE.Vector3(bx, ly - 0.17, bz), new THREE.Vector3(bx, ly + 0.18, bz), 0.011, 0x6f7276, 4);
    }
    const band = new THREE.TorusGeometry(0.088, 0.009, 4, 10);
    builder.addGeometry(
      band,
      0x6f7276,
      new THREE.Matrix4().compose(
        new THREE.Vector3(lx, ly, 0),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)),
        new THREE.Vector3(1, 1, 1),
      ),
    );
    band.dispose();
    // Post down to the taffrail.
    strut(
      builder,
      new THREE.Vector3(lx, SHIP.upperDeckY + 0.86, 0),
      new THREE.Vector3(lx, ly - 0.16, 0),
      0.026,
      0x6f7276,
      5,
    );
    sternLampGlass = new THREE.Mesh(new THREE.CylinderGeometry(0.082, 0.09, 0.33, 8), glowMaterial(0xffd9a0));
    sternLampGlass.position.set(lx, ly, 0);
    group.add(sternLampGlass);
  }
  builder.setMaterial(SHIP_MAT.hull);

  // Two swinging lanterns light the hold: one over the map table, one by the ladder.
  // Decay 1 rather than physical inverse-square: a lantern has to light a
  // 15 m hold without blowing out whatever is standing next to it.
  const holdLight = new THREE.PointLight(0xffb257, 10, 22, 1);
  holdLight.position.set(-5.2, SHIP.deckY - 0.55, 0);
  group.add(holdLight);
  const holdLightForward = new THREE.PointLight(0xffb257, 8, 18, 1);
  holdLightForward.position.set(2.6, SHIP.deckY - 0.55, 0);
  group.add(holdLightForward);
  for (const lampX of [-5.2, 2.6]) {
    // Caged storm lanterns hung off the deck beams. These were bare glowing
    // boxes: unlit cream cubes a metre in front of your face read as a missing
    // texture, not as a light, and they are the first thing you see below.
    const ly2 = SHIP.deckY - 0.55;
    builder.setMaterial(SHIP_MAT.iron);
    // Eye bolt in the beam, and the ring the lamp hangs off.
    builder.addBox({ x: lampX, y: SHIP.deckY - 0.14, z: 0 }, { x: 0.1, y: 0.06, z: 0.1 }, IRON);
    const hoop = new THREE.TorusGeometry(0.055, 0.011, 4, 10);
    builder.addGeometry(
      hoop,
      IRON,
      new THREE.Matrix4().compose(
        new THREE.Vector3(lampX, ly2 + 0.29, 0),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI / 2, 0)),
        new THREE.Vector3(1, 1, 1),
      ),
    );
    hoop.dispose();
    strut(
      builder,
      new THREE.Vector3(lampX, SHIP.deckY - 0.16, 0),
      new THREE.Vector3(lampX, ly2 + 0.26, 0),
      0.012,
      IRON,
      4,
    );
    // Domed cap with a vent finial, then the cage round the glass.
    const cap2 = new THREE.ConeGeometry(0.115, 0.085, 8);
    builder.addGeometry(cap2, IRON, new THREE.Matrix4().makeTranslation(lampX, ly2 + 0.2, 0), [1.2, 0.09]);
    cap2.dispose();
    const collar2 = new THREE.CylinderGeometry(0.088, 0.088, 0.024, 8);
    builder.addGeometry(collar2, IRON, new THREE.Matrix4().makeTranslation(lampX, ly2 + 0.152, 0), [0.8, 0.03]);
    collar2.dispose();
    const foot2 = new THREE.CylinderGeometry(0.09, 0.1, 0.038, 8);
    builder.addGeometry(foot2, IRON, new THREE.Matrix4().makeTranslation(lampX, ly2 - 0.155, 0), [0.8, 0.04]);
    foot2.dispose();
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const bx = lampX + Math.cos(a) * 0.074;
      const bz = Math.sin(a) * 0.074;
      strut(builder, new THREE.Vector3(bx, ly2 - 0.15, bz), new THREE.Vector3(bx, ly2 + 0.15, bz), 0.01, IRON, 4);
    }
    const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.07, 0.27, 8), glowMaterial(0xffcf94));
    glass.position.set(lampX, ly2, 0);
    group.add(glass);
  }
  builder.setMaterial(SHIP_MAT.hull);

  // Shaft of daylight falling through the open hatch, with dust turning in it.
  // The shaft leans with the sun, so at noon it drops straight onto the hold
  // floor and towards evening it rakes across the crates.
  const lightShaft = new THREE.Group();
  {
    const hatchWidth = SHIP.hatch.maxX - SHIP.hatch.minX;
    const hatchDepth = SHIP.hatch.maxZ - SHIP.hatch.minZ;
    const length = 4.6;
    // Open at both ends: the sides are what you actually see. Eight facets
    // rather than four, so the fade round the silhouette is smooth instead of
    // stepping at every corner.
    const geometry = new THREE.CylinderGeometry(
      Math.min(hatchWidth, hatchDepth) * 0.55,
      Math.min(hatchWidth, hatchDepth) * 0.95,
      length,
      8,
      1,
      true,
    );
    geometry.rotateY(Math.PI / 8);
    geometry.scale(hatchWidth / hatchDepth, 1, 1);
    geometry.translate(0, -length * 0.5, 0);
    const shaftMesh = new THREE.Mesh(geometry, shaftMaterial());
    shaftMesh.renderOrder = 6;
    lightShaft.add(shaftMesh);
    lightShaft.position.set((SHIP.hatch.minX + SHIP.hatch.maxX) * 0.5, SHIP.deckY - 0.12, 0);
  }
  group.add(lightShaft);

  // Dust motes drifting through the hold.
  const dust = (() => {
    const count = 150;
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    const dustRng = new Rng(77);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = dustRng.float(SHIP.stern + 1.0, 6.4);
      positions[i * 3 + 1] = dustRng.float(SHIP.holdFloorY + 0.1, SHIP.deckY - 0.2);
      positions[i * 3 + 2] = dustRng.float(-1.8, 1.8);
      seeds[i] = dustRng.float(0, 100);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
    const points = new THREE.Points(geometry, dustMaterial());
    points.frustumCulled = false;
    points.renderOrder = 7;
    return points;
  })();
  group.add(dust);

  // Bilge water, cut to the hold's plan so it never pokes out through the hull.
  // Sampling the hull a little above the floor gives the surface room to rise.
  // Light pooling on the hold floor under the hatch, so the shaft actually lands
  // on something instead of hanging in the air.
  const hatchPool = new THREE.PointLight(0xffe2ad, 0, 9, 2);
  hatchPool.position.set((SHIP.hatch.minX + SHIP.hatch.maxX) * 0.5, SHIP.holdFloorY + 0.9, 0);
  group.add(hatchPool);

  const holdWaterGeometry = (() => {
    const stations = 26;
    const across = 9;
    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    for (let i = 0; i < stations; i++) {
      const x = lerp(SHIP.stern + 0.7, 6.5, i / (stations - 1));
      const half = Math.max(0.08, hullShape.widthAt(x, SHIP.holdFloorY + 0.55) - 0.2);
      for (let c = 0; c < across; c++) {
        const z = lerp(-half, half, c / (across - 1));
        positions.push(x, 0, z);
        uvs.push(i / (stations - 1), c / (across - 1));
      }
    }
    for (let i = 0; i < stations - 1; i++) {
      for (let c = 0; c < across - 1; c++) {
        const a = i * across + c;
        indices.push(a, a + across, a + across + 1, a, a + across + 1, a + 1);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
  })();
  const holdWaterMat = holdWaterMaterial();
  const holdWater = new THREE.Mesh(holdWaterGeometry, holdWaterMat);
  holdWater.position.set(0, SHIP.holdFloorY, 0);
  holdWater.visible = false;
  holdWater.renderOrder = 3;
  group.add(holdWater);

  const hullFoam = buildHullFoam(options.waveUniforms ?? {});
  group.add(hullFoam.mesh);

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
    hullFoamMaterial: hullFoam.material,
    lightShaft,
    dust,
    hatchPool,
    lanternLight,
    sternLampGlass,
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
  /** Dimmer planking for the hold, where little daylight reaches. */
  hullDark: 6,
  /** Sailcloth for sacks, hammocks and awnings. */
  canvas: 7,
} as const;

/** The material array matching `SHIP_MAT`, shared by every ship in the world. */
let sharedShipMaterials: THREE.MeshStandardMaterial[] | null = null;

export function shipMaterials(): THREE.MeshStandardMaterial[] {
  if (!sharedShipMaterials) {
    sharedShipMaterials = [
      texturedMaterial('hull', { roughness: 0.94, normalScale: 1.1 }),
      texturedMaterial('deck', { roughness: 0.92, normalScale: 1.0 }),
      texturedMaterial('tar', { roughness: 0.8, normalScale: 1.3 }),
      texturedMaterial('iron', { roughness: 0.8, metalness: 0.5, normalScale: 1.0 }),
      texturedMaterial('rope', { roughness: 1, normalScale: 1.3 }),
      // Its own texture set rather than the gold one: gold's tarnish blotches
      // are a metre across and land one or two to a compass hood, which is
      // what had the binnacle reading as a mossy stone. Metalness is kept
      // short of full so the fitting still has a lit body of its own when the
      // radiance probe has nothing bright to give it.
      texturedMaterial('brass', { roughness: 0.46, metalness: 0.55, normalScale: 0.4, envMapIntensity: 1.15 }),
      // Below deck is lit by lanterns, not sky: hold back the ambient there.
      texturedMaterial('hullDark', { roughness: 1, normalScale: 0.3, envMapIntensity: 0.08 }),
      texturedMaterial('canvas', { roughness: 0.95, normalScale: 1.1, side: THREE.DoubleSide }),
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
