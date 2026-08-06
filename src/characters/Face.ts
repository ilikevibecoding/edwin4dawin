/**
 * Facial features on top of the sculpted head: eyes with rotating lid shells,
 * brows, ears, a dental arch, tongue, the android temple LED, and card hair.
 */
import * as THREE from 'three';
import {
  makeBrowMaterial,
  makeCorneaMaterial,
  makeEyeMaterial,
  makeHairMaterial,
  makeLedMaterial,
} from './CharacterMaterials';
import { FACE_RATIOS, headLandmarks, type HeadShape } from './Head';
import { Rng, clamp, lerp } from '../engine/Noise';

// ---------------------------------------------------------------------------
// Eyes
// ---------------------------------------------------------------------------

// Lid rotations about X. Positive moves the front rim downward.
const LID_UPPER_OPEN = THREE.MathUtils.degToRad(-19);
const LID_UPPER_CLOSED = THREE.MathUtils.degToRad(36);
const LID_LOWER_OPEN = THREE.MathUtils.degToRad(23);
const LID_LOWER_CLOSED = THREE.MathUtils.degToRad(11);

export interface EyeAssembly {
  group: THREE.Group;
  /** Rotates to aim the gaze. */
  globe: THREE.Group;
  lidUpper: THREE.Group;
  lidLower: THREE.Group;
  radius: number;
  side: 1 | -1;
}

function lidCap(radius: number, upper: boolean, skinMaterial: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  const shell = new THREE.SphereGeometry(radius * 1.055, 26, 14, 0, Math.PI * 2, upper ? 0 : Math.PI / 2, Math.PI / 2);
  const mesh = new THREE.Mesh(shell, skinMaterial);
  mesh.receiveShadow = true;
  // Almond rather than spherical
  mesh.scale.set(1.14, 1, 1.02);
  g.add(mesh);

  // Dark lash line hugging the lid rim
  const bandWidth = upper ? 0.13 : 0.08;
  const band = new THREE.SphereGeometry(
    radius * 1.075,
    26,
    3,
    0,
    Math.PI * 2,
    upper ? Math.PI / 2 - bandWidth : Math.PI / 2,
    bandWidth
  );
  const bandMesh = new THREE.Mesh(
    band,
    new THREE.MeshStandardMaterial({
      color: upper ? 0x120e10 : 0x2a1c1c,
      roughness: 0.55,
      metalness: 0,
      side: THREE.DoubleSide,
    })
  );
  bandMesh.scale.copy(mesh.scale);
  g.add(bandMesh);
  return g;
}

export function buildEye(shape: HeadShape, side: 1 | -1, skinMaterial: THREE.Material): EyeAssembly {
  const group = new THREE.Group();
  const r = shape.eye.radius;
  group.position.set(shape.eye.x * side, shape.eye.y, shape.eye.z);

  const globe = new THREE.Group();
  const eyeMesh = new THREE.Mesh(new THREE.SphereGeometry(r, 40, 28), makeEyeMaterial(shape.irisColor));
  // u = 0.5 of the equirect texture lands on +X for a three SphereGeometry, so
  // rotate the globe to bring the iris round to +Z.
  eyeMesh.rotation.y = -Math.PI / 2;
  globe.add(eyeMesh);

  const cornea = new THREE.Mesh(
    new THREE.SphereGeometry(r * 1.035, 32, 22, 0, Math.PI * 2, 0, Math.PI * 0.42),
    makeCorneaMaterial()
  );
  cornea.rotation.x = Math.PI / 2;
  cornea.renderOrder = 2;
  globe.add(cornea);
  group.add(globe);

  const lidUpper = lidCap(r, true, skinMaterial);
  const lidLower = lidCap(r, false, skinMaterial);
  lidUpper.rotation.x = LID_UPPER_OPEN;
  lidLower.rotation.x = LID_LOWER_OPEN;
  group.add(lidUpper, lidLower);

  return { group, globe, lidUpper, lidLower, radius: r, side };
}

/** 0 = fully open, 1 = fully closed. */
export function setEyeLids(eye: EyeAssembly, closed: number, gazePitch = 0) {
  const c = clamp(closed);
  // Lids track vertical gaze a little, as real lids do
  eye.lidUpper.rotation.x = lerp(LID_UPPER_OPEN, LID_UPPER_CLOSED, c) - gazePitch * 0.45;
  eye.lidLower.rotation.x = lerp(LID_LOWER_OPEN, LID_LOWER_CLOSED, c) - gazePitch * 0.16;
}

// ---------------------------------------------------------------------------
// Brows and ears
// ---------------------------------------------------------------------------

export function buildBrow(shape: HeadShape, side: 1 | -1): THREE.Mesh {
  const seg = 16;
  const positions: number[] = [];
  const indices: number[] = [];
  const th = shape.brow.thickness;
  const L = headLandmarks(shape);
  const h = shape.height;

  for (let i = 0; i <= seg; i++) {
    const t = i / seg;
    // Sweep from the inner end outward along the brow ridge
    const xAbs = shape.halfWidth * (0.17 + t * 0.62);
    const x = xAbs * side;
    const y = shape.brow.y + Math.sin(t * Math.PI) * shape.brow.arch - t * h * 0.026;
    // Follow the skull, then lift clear of the surface
    const z = L.front(FACE_RATIOS.browY, xAbs)[2] + h * 0.004 - t * t * h * 0.01;
    const halfH = th * (0.55 + 0.45 * Math.sin(t * Math.PI)) * (1 - t * 0.45);
    positions.push(x, y + halfH, z, x, y - halfH, z);
    if (i < seg) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return new THREE.Mesh(g, makeBrowMaterial(shape.brow.color));
}

export function buildEar(shape: HeadShape, side: 1 | -1, skinMaterial: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  const k = shape.height / 0.235;
  const outer = new THREE.Mesh(new THREE.SphereGeometry(0.019 * k, 20, 16), skinMaterial);
  outer.scale.set(0.42, 1.35, 0.92);
  outer.castShadow = true;
  g.add(outer);
  const concha = new THREE.Mesh(new THREE.SphereGeometry(0.011 * k, 16, 12), skinMaterial);
  concha.scale.set(0.5, 1.15, 0.8);
  concha.position.set(side * 0.004 * k, -0.002 * k, 0.004 * k);
  g.add(concha);
  const lobe = new THREE.Mesh(new THREE.SphereGeometry(0.0075 * k, 14, 10), skinMaterial);
  lobe.position.set(0, -0.024 * k, 0.002 * k);
  lobe.scale.set(0.6, 1, 0.9);
  g.add(lobe);

  g.position.set(side * shape.earPos[0], shape.earPos[1], shape.earPos[2]);
  g.rotation.z = side * THREE.MathUtils.degToRad(-8);
  g.rotation.y = side * THREE.MathUtils.degToRad(16);
  return g;
}

// ---------------------------------------------------------------------------
// Mouth interior — without this an open mouth is a hole into the skull
// ---------------------------------------------------------------------------

export interface MouthAssembly {
  group: THREE.Group;
  /** Rotates with the jawOpen morph so the lower teeth follow. */
  jaw: THREE.Group;
}

function dentalArch(width: number, depth: number, radius: number, material: THREE.Material): THREE.Mesh {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= 18; i++) {
    const a = lerp(Math.PI * 0.18, Math.PI * 0.82, i / 18);
    pts.push(new THREE.Vector3(Math.cos(a) * width, 0, Math.sin(a) * depth));
  }
  return new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 22, radius, 8, false), material);
}

export function buildMouth(shape: HeadShape): MouthAssembly {
  const group = new THREE.Group();
  const k = shape.height / 0.235;
  const [mx, my, mz] = shape.mouthCenter;

  const cavity = new THREE.Mesh(
    new THREE.SphereGeometry(0.028 * k, 20, 14),
    new THREE.MeshStandardMaterial({ color: 0x2a0d10, roughness: 0.55, metalness: 0, side: THREE.BackSide })
  );
  cavity.scale.set(1, 0.62, 0.72);
  cavity.position.set(mx, my, mz - 0.026 * k);
  group.add(cavity);

  const teethMat = new THREE.MeshPhysicalMaterial({
    color: 0xf2ebe2,
    roughness: 0.22,
    metalness: 0,
    clearcoat: 0.7,
    clearcoatRoughness: 0.1,
  });
  const upper = dentalArch(0.021 * k, 0.017 * k, 0.0042 * k, teethMat);
  upper.position.set(mx, my + 0.008 * k, mz - 0.021 * k);
  upper.rotation.x = THREE.MathUtils.degToRad(-6);
  group.add(upper);

  const jaw = new THREE.Group();
  jaw.position.set(shape.jawPivot[0], shape.jawPivot[1], shape.jawPivot[2]);
  const lower = dentalArch(0.019 * k, 0.0155 * k, 0.0038 * k, teethMat);
  lower.position.set(mx, my - 0.007 * k - shape.jawPivot[1], mz - 0.023 * k - shape.jawPivot[2]);
  lower.rotation.x = THREE.MathUtils.degToRad(4);
  jaw.add(lower);

  const tongue = new THREE.Mesh(
    new THREE.SphereGeometry(0.014 * k, 16, 12),
    new THREE.MeshPhysicalMaterial({ color: 0x9b4a4e, roughness: 0.4, metalness: 0, clearcoat: 0.4 })
  );
  tongue.scale.set(0.82, 0.42, 1.15);
  tongue.position.set(mx, my - 0.009 * k - shape.jawPivot[1], mz - 0.032 * k - shape.jawPivot[2]);
  jaw.add(tongue);
  group.add(jaw);

  return { group, jaw };
}

// ---------------------------------------------------------------------------
// Android temple LED — the most recognisable android signifier
// ---------------------------------------------------------------------------

export type LedState = 'blue' | 'yellow' | 'red' | 'off';

export const LED_COLORS: Record<LedState, number> = {
  blue: 0x35c4ff,
  yellow: 0xffc637,
  red: 0xff2e3c,
  off: 0x1a2028,
};

export interface LedAssembly {
  group: THREE.Group;
  material: THREE.MeshBasicMaterial;
  glowMaterial: THREE.MeshBasicMaterial;
  light: THREE.PointLight;
}

export function buildLed(shape: HeadShape): LedAssembly {
  const group = new THREE.Group();
  const side = shape.ledSide;

  const housing = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0105, 0.0105, 0.0016, 24),
    new THREE.MeshStandardMaterial({ color: 0x0d1116, roughness: 0.35, metalness: 0.6 })
  );
  housing.rotation.z = Math.PI / 2;
  group.add(housing);

  const material = makeLedMaterial(LED_COLORS.blue);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.0072, 0.0022, 10, 28), material);
  ring.rotation.y = Math.PI / 2;
  ring.position.x = side * 0.0012;
  group.add(ring);

  const glowMaterial = new THREE.MeshBasicMaterial({
    color: LED_COLORS.blue,
    transparent: true,
    opacity: 0.4,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: true,
  });
  const glow = new THREE.Mesh(new THREE.CircleGeometry(0.017, 24), glowMaterial);
  glow.rotation.y = side * (Math.PI / 2);
  glow.position.x = side * 0.0022;
  group.add(glow);

  const light = new THREE.PointLight(LED_COLORS.blue, 0.05, 0.16, 2);
  light.position.set(side * 0.006, 0, 0);
  group.add(light);

  group.position.set(side * shape.ledPos[0], shape.ledPos[1], shape.ledPos[2]);
  group.rotation.y = side * THREE.MathUtils.degToRad(-14);
  return { group, material, glowMaterial, light };
}

export function setLed(led: LedAssembly, state: LedState, intensity = 1) {
  const c = new THREE.Color(LED_COLORS[state]);
  led.material.color.copy(c);
  led.glowMaterial.color.copy(c);
  led.glowMaterial.opacity = state === 'off' ? 0 : 0.34 * intensity;
  led.light.color.copy(c);
  led.light.intensity = state === 'off' ? 0 : 0.05 * intensity;
}

// ---------------------------------------------------------------------------
// Hair
// ---------------------------------------------------------------------------

export type HairStyle = 'short' | 'bob' | 'long' | 'ponytail' | 'buzz' | 'sweptBack' | 'bun';

export interface HairOptions {
  style: HairStyle;
  color: THREE.ColorRepresentation;
  gloss?: number;
  /** Scales card count for lower quality tiers. */
  density?: number;
}

function hairCardTexture(): THREE.Texture {
  const w = 128;
  const h = 256;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d')!;
  g.clearRect(0, 0, w, h);
  const rng = new Rng(7);
  // Strands run the length of the card and fade out at the tip
  for (let i = 0; i < 70; i++) {
    const x = rng.range(0, w);
    const len = rng.range(0.55, 1);
    const alpha = rng.range(0.5, 1);
    const grad = g.createLinearGradient(0, 0, 0, h * len);
    grad.addColorStop(0, `rgba(255,255,255,${alpha})`);
    grad.addColorStop(0.7, `rgba(255,255,255,${alpha * 0.85})`);
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.strokeStyle = grad;
    g.lineWidth = rng.range(0.8, 3.2);
    g.beginPath();
    g.moveTo(x, 0);
    let px = x;
    for (let s = 1; s <= 6; s++) {
      px += rng.range(-4, 4);
      g.lineTo(px, (h * len * s) / 6);
    }
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace;
  t.needsUpdate = true;
  return t;
}

let cachedHairAlpha: THREE.Texture | null = null;

interface CardSpec {
  theta0: number;
  phi0: number;
  thetaSpan: number;
  phiDrift: number;
  fallLength: number;
  width: number;
  lift: number;
  sway: number;
  twist: number;
}

/**
 * Cards are grown in the scalp's spherical parameterisation, so they follow the
 * skull exactly, then fall freely once they run past it. Growing them along the
 * surface normal instead makes hair shoot out like a sea urchin.
 */
function buildCardGeometry(spec: CardSpec, scalpCenter: THREE.Vector3, scalpRadii: THREE.Vector3) {
  const rows = 9;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const scalpEnd = 0.68;

  const onScalp = (theta: number, phi: number, lift: number, out: THREE.Vector3) => {
    const st = Math.sin(theta);
    out.set(
      scalpCenter.x + st * Math.sin(phi) * scalpRadii.x * (1 + lift),
      scalpCenter.y + Math.cos(theta) * scalpRadii.y * (1 + lift),
      scalpCenter.z + st * Math.cos(phi) * scalpRadii.z * (1 + lift)
    );
    return out;
  };

  const p = new THREE.Vector3();
  const prev = new THREE.Vector3();
  const tangent = new THREE.Vector3();
  const sideDir = new THREE.Vector3();
  const outward = new THREE.Vector3();

  for (let r = 0; r <= rows; r++) {
    const t = r / rows;
    if (t <= scalpEnd) {
      const s = t / scalpEnd;
      onScalp(spec.theta0 + spec.thetaSpan * s, spec.phi0 + spec.phiDrift * s * s, spec.lift * (0.35 + 0.65 * s), p);
    } else {
      // Free hanging: continue along the last tangent, sagging with gravity
      const s = (t - scalpEnd) / (1 - scalpEnd);
      onScalp(spec.theta0 + spec.thetaSpan, spec.phi0 + spec.phiDrift, spec.lift, p);
      p.addScaledVector(tangent.clone().normalize(), spec.fallLength * s);
      p.y -= spec.fallLength * s * s * 0.55;
      p.x *= 1 - 0.1 * s;
    }

    if (r === 0) {
      prev.copy(p);
      const probe = onScalp(
        spec.theta0 + spec.thetaSpan / (rows * scalpEnd),
        spec.phi0,
        spec.lift * 0.35,
        new THREE.Vector3()
      );
      tangent.copy(probe).sub(p);
    } else {
      tangent.copy(p).sub(prev);
      prev.copy(p);
    }
    if (tangent.lengthSq() < 1e-10) tangent.set(0, -1, 0);

    outward.set(
      (p.x - scalpCenter.x) / scalpRadii.x,
      (p.y - scalpCenter.y) / scalpRadii.y,
      (p.z - scalpCenter.z) / scalpRadii.z
    );
    if (outward.lengthSq() < 1e-10) outward.set(0, 1, 0);
    outward.normalize();
    sideDir.crossVectors(tangent, outward).normalize();
    if (sideDir.lengthSq() < 1e-10) sideDir.set(1, 0, 0);
    sideDir.applyAxisAngle(tangent.clone().normalize(), spec.twist * t);

    const wob = Math.sin(t * 4.1 + spec.twist * 3) * spec.sway * t;
    const halfW = spec.width * (1 - t * 0.42) * 0.5;
    const a = p.clone().addScaledVector(sideDir, -halfW).addScaledVector(outward, wob);
    const b = p.clone().addScaledVector(sideDir, halfW).addScaledVector(outward, wob);
    positions.push(a.x, a.y, a.z, b.x, b.y, b.z);
    uvs.push(0, 1 - t, 1, 1 - t);
    if (r < rows) {
      const i0 = r * 2;
      indices.push(i0, i0 + 1, i0 + 2, i0 + 1, i0 + 3, i0 + 2);
    }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}

/** Dome whose lower rim follows a per-azimuth hairline. */
function buildScalpCap(
  center: THREE.Vector3,
  radii: THREE.Vector3,
  hairlineTheta: (phi: number) => number,
  material: THREE.Material
): THREE.Mesh {
  const su = 40;
  const sv = 10;
  const positions: number[] = [];
  const indices: number[] = [];
  for (let iv = 0; iv <= sv; iv++) {
    for (let iu = 0; iu <= su; iu++) {
      const phi = (iu / su) * Math.PI * 2;
      // Stop short of the hairline so cards always cover the rim
      const theta = (iv / sv) * hairlineTheta(phi) * 0.94;
      const st = Math.sin(theta);
      positions.push(
        center.x + st * Math.sin(phi) * radii.x * 0.985,
        center.y + Math.cos(theta) * radii.y * 0.985,
        center.z + st * Math.cos(phi) * radii.z * 0.985
      );
    }
  }
  for (let iv = 0; iv < sv; iv++) {
    for (let iu = 0; iu < su; iu++) {
      const a = iv * (su + 1) + iu;
      indices.push(a, a + su + 1, a + 1, a + 1, a + su + 1, a + su + 2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, material);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function buildHair(shape: HeadShape, opts: HairOptions): THREE.Group {
  const group = new THREE.Group();
  const scalpCenter = new THREE.Vector3(0, shape.height * 0.5, -shape.halfDepth * 0.04);
  const scalpRadii = new THREE.Vector3(shape.halfWidth * 1.04, shape.height * 0.5 * 1.015, shape.halfDepth * 1.03);

  if (opts.style === 'buzz') {
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(1, 32, 24, 0, Math.PI * 2, 0, Math.PI * 0.56),
      new THREE.MeshPhysicalMaterial({
        color: opts.color,
        roughness: 0.85,
        metalness: 0,
        sheen: 0.5,
        sheenColor: new THREE.Color(0x8899aa),
      })
    );
    cap.scale.copy(scalpRadii);
    cap.position.copy(scalpCenter);
    cap.castShadow = true;
    group.add(cap);
    return group;
  }

  if (!cachedHairAlpha) cachedHairAlpha = hairCardTexture();
  const mat = makeHairMaterial(opts.color, opts.gloss ?? 0.45);
  mat.alphaMap = cachedHairAlpha;
  // alphaTest rather than blending: correct depth, no sorting artefacts
  mat.transparent = false;
  mat.alphaTest = 0.45;

  const styleParams: Record<
    Exclude<HairStyle, 'buzz'>,
    { count: number; thetaEnd: [number, number]; fall: [number, number]; lift: number; sway: number; drift: number }
  > = {
    short: { count: 220, thetaEnd: [1.05, 1.35], fall: [0.004, 0.016], lift: 0.055, sway: 0.003, drift: 0.16 },
    sweptBack: { count: 230, thetaEnd: [1.15, 1.5], fall: [0.01, 0.03], lift: 0.07, sway: 0.004, drift: 0.1 },
    bob: { count: 300, thetaEnd: [1.35, 1.62], fall: [0.03, 0.075], lift: 0.06, sway: 0.005, drift: 0.14 },
    long: { count: 330, thetaEnd: [1.45, 1.7], fall: [0.12, 0.24], lift: 0.055, sway: 0.008, drift: 0.12 },
    ponytail: { count: 240, thetaEnd: [1.1, 1.4], fall: [0.008, 0.026], lift: 0.05, sway: 0.003, drift: 0.2 },
    bun: { count: 230, thetaEnd: [1.05, 1.35], fall: [0.006, 0.02], lift: 0.048, sway: 0.003, drift: 0.22 },
  };
  const sp = styleParams[opts.style];
  const rng = new Rng(shape.android ? 31 : 17);
  const count = Math.max(40, Math.round(sp.count * (opts.density ?? 1)));

  // The hairline sits high at the front of the head and low at the back
  const hairlineTheta = (phi: number) => {
    const frontness = Math.cos(phi) * 0.5 + 0.5;
    return ((sp.thetaEnd[0] + sp.thetaEnd[1]) * 0.5) * (1 - frontness * 0.42);
  };

  // Solid shell beneath the cards hides gaps and the hard crown rim
  group.add(
    buildScalpCap(
      scalpCenter,
      scalpRadii,
      hairlineTheta,
      new THREE.MeshPhysicalMaterial({
        color: opts.color,
        roughness: 0.78,
        metalness: 0,
        sheen: 0.3,
        sheenColor: new THREE.Color(0x8a7a68),
      })
    )
  );

  for (let i = 0; i < count; i++) {
    const phi0 = rng.range(0, Math.PI * 2);
    const theta0 = Math.pow(rng.next(), 1.5) * 0.62;
    const frontness = Math.cos(phi0) * 0.5 + 0.5;
    const limit = rng.range(sp.thetaEnd[0], sp.thetaEnd[1]) * (1 - frontness * 0.42);
    const mesh = new THREE.Mesh(
      buildCardGeometry(
        {
          theta0,
          phi0,
          thetaSpan: Math.max(0.25, limit - theta0),
          phiDrift: rng.range(-sp.drift, sp.drift),
          fallLength: rng.range(sp.fall[0], sp.fall[1]) * (0.4 + 0.6 * (1 - frontness)),
          width: rng.range(0.018, 0.036),
          lift: sp.lift * rng.range(0.7, 1.3),
          sway: sp.sway,
          twist: rng.range(-0.5, 0.5),
        },
        scalpCenter,
        scalpRadii
      ),
      mat
    );
    mesh.castShadow = true;
    group.add(mesh);
  }

  if (opts.style === 'ponytail' || opts.style === 'bun') {
    const solid = mat.clone();
    solid.alphaMap = null;
    solid.alphaTest = 0;
    if (opts.style === 'ponytail') {
      const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.028, 0.16, 8, 16), solid);
      tail.position.set(0, shape.height * 0.56, -shape.halfDepth * 1.14);
      tail.rotation.x = THREE.MathUtils.degToRad(24);
      tail.castShadow = true;
      group.add(tail);
    } else {
      const bun = new THREE.Mesh(new THREE.SphereGeometry(0.045, 20, 16), solid);
      bun.scale.set(1, 0.85, 0.85);
      bun.position.set(0, shape.height * 0.68, -shape.halfDepth * 1.04);
      bun.castShadow = true;
      group.add(bun);
    }
  }

  return group;
}
