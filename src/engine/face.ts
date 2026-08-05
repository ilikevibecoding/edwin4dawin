/**
 * Eyes, lids, brows and hair.
 *
 * Eyeballs protrude slightly through a deep socket recess, so the visible
 * almond-shaped aperture is produced by the skin surface itself. Lids are
 * slightly larger spherical caps that ride over the eyeball, which makes blinks
 * and squints work without any hand-authored topology.
 */
import * as THREE from 'three';
import { clamp, fbm2, lerp, Rng } from './math';
import type { Dim } from './body';
import { REGION } from './body';
import { extractShell } from './outfit';
import type { HairSpec, HairStyle } from './charspec';

/* ------------------------------------------------------------------- iris */

const irisCache = new Map<string, THREE.Texture>();

export function irisTexture(color: number, size = 256): THREE.Texture {
  const key = `${color}_${size}`;
  const hit = irisCache.get(key);
  if (hit) return hit;
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const ctx = cv.getContext('2d')!;
  const base = new THREE.Color(color);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, size, size);

  const cx = size / 2, cy = size / 2;
  const rOuter = size * 0.5;
  // Iris body with a darker limbal ring and a brighter mid band.
  const grad = ctx.createRadialGradient(cx, cy, size * 0.06, cx, cy, rOuter);
  const c1 = base.clone().multiplyScalar(0.35);
  const c2 = base.clone();
  const c3 = base.clone().multiplyScalar(0.55);
  grad.addColorStop(0.0, `rgb(${c1.r * 255 | 0},${c1.g * 255 | 0},${c1.b * 255 | 0})`);
  grad.addColorStop(0.45, `rgb(${c2.r * 255 | 0},${c2.g * 255 | 0},${c2.b * 255 | 0})`);
  grad.addColorStop(0.82, `rgb(${c3.r * 255 | 0},${c3.g * 255 | 0},${c3.b * 255 | 0})`);
  grad.addColorStop(1.0, '#0a0d10');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, rOuter, 0, Math.PI * 2);
  ctx.fill();

  // Radial fibres.
  const rng = new Rng(color >>> 0);
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 220; i++) {
    const a = rng.next() * Math.PI * 2;
    const r0 = rOuter * rng.range(0.2, 0.35);
    const r1 = rOuter * rng.range(0.6, 0.95);
    const wobble = rng.range(-0.06, 0.06);
    ctx.strokeStyle = `rgba(255,255,255,${rng.range(0.015, 0.07)})`;
    ctx.lineWidth = rng.range(0.6, 2.4);
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
    ctx.quadraticCurveTo(
      cx + Math.cos(a + wobble) * (r0 + r1) * 0.5,
      cy + Math.sin(a + wobble) * (r0 + r1) * 0.5,
      cx + Math.cos(a + wobble * 2) * r1,
      cy + Math.sin(a + wobble * 2) * r1,
    );
    ctx.stroke();
  }
  ctx.globalCompositeOperation = 'source-over';

  // Pupil.
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(cx, cy, rOuter * 0.34, 0, Math.PI * 2);
  ctx.fill();

  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  irisCache.set(key, t);
  return t;
}

/* -------------------------------------------------------------------- eyes */

export type EyeSet = {
  group: THREE.Group;
  /** Rotate these to aim the gaze. */
  pivots: THREE.Object3D[];
  upperLids: THREE.Object3D[];
  lowerLids: THREE.Object3D[];
  pupils: THREE.Mesh[];
  irisMat: THREE.MeshPhysicalMaterial;
};

export function buildEyes(
  d: Dim,
  landmarks: Record<string, THREE.Vector3>,
  skinMat: THREE.Material,
  eyeColor = 0x6b8ba0,
): EyeSet {
  const H = d.H;
  const rEye = 0.0068 * H;
  const group = new THREE.Group();
  group.name = 'eyes';
  const pivots: THREE.Object3D[] = [];
  const upperLids: THREE.Object3D[] = [];
  const lowerLids: THREE.Object3D[] = [];
  const pupils: THREE.Mesh[] = [];

  const scleraMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(0.8, 0.78, 0.77).convertSRGBToLinear(),
    roughness: 0.22,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.04,
    sheen: 0.2,
  });
  const irisMat = new THREE.MeshPhysicalMaterial({
    map: irisTexture(eyeColor),
    roughness: 0.14,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.02,
    emissive: new THREE.Color(eyeColor).multiplyScalar(0.06),
  });
  const corneaMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.16,
    roughness: 0.02,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.01,
    depthWrite: false,
  });
  const lashMat = new THREE.MeshStandardMaterial({ color: 0x0a0708, roughness: 0.55, metalness: 0 });

  for (const side of [-1, 1]) {
    const lm = side < 0 ? landmarks.eyeL : landmarks.eyeR;
    const pivot = new THREE.Object3D();
    // The sculpt already places this landmark at the eyeball centre, sized so
    // the cornea just clears the socket floor.
    pivot.position.copy(lm);
    group.add(pivot);
    pivots.push(pivot);

    const sclera = new THREE.Mesh(new THREE.SphereGeometry(rEye, 24, 18), scleraMat);
    sclera.castShadow = false;
    pivot.add(sclera);

    // The iris must sit *on* the sclera, not inside it: a spherical cap with a
    // planar UV projection so the radial iris texture maps cleanly.
    const irisFrac = 0.56;
    const capAngle = Math.asin(irisFrac);
    const irisGeo = new THREE.SphereGeometry(rEye * 1.004, 28, 18, 0, Math.PI * 2, 0, capAngle);
    irisGeo.rotateX(Math.PI / 2); // pole towards +Z
    {
      const ip = irisGeo.getAttribute('position');
      const iuv = irisGeo.getAttribute('uv');
      const span = rEye * irisFrac;
      for (let i = 0; i < ip.count; i++) {
        iuv.setXY(i, 0.5 + ip.getX(i) / (2 * span), 0.5 + ip.getY(i) / (2 * span));
      }
      iuv.needsUpdate = true;
    }
    const iris = new THREE.Mesh(irisGeo, irisMat);
    pivot.add(iris);
    pupils.push(iris);

    const cornea = new THREE.Mesh(new THREE.SphereGeometry(rEye * 1.035, 20, 14, 0, Math.PI * 2, 0, 0.9), corneaMat);
    cornea.rotation.x = Math.PI / 2;
    cornea.renderOrder = 2;
    pivot.add(cornea);

    /* lids */
    const lidR = rEye * 1.09;
    const upper = new THREE.Object3D();
    upper.position.copy(pivot.position);
    group.add(upper);
    const upperGeo = new THREE.SphereGeometry(lidR, 22, 12, 0, Math.PI * 2, 0, 1.02);
    upperGeo.scale(1.18, 1, 1.02);
    const upperMesh = new THREE.Mesh(upperGeo, skinMat);
    upperMesh.castShadow = false;
    upper.add(upperMesh);
    // Lash line: a dark rim right at the lid edge.
    const lashGeo = new THREE.TorusGeometry(lidR * Math.sin(1.02), lidR * 0.038, 6, 22);
    lashGeo.rotateX(Math.PI / 2);
    lashGeo.translate(0, lidR * Math.cos(1.02), 0);
    lashGeo.scale(1.18, 1, 1.02);
    const lash = new THREE.Mesh(lashGeo, lashMat);
    upper.add(lash);
    upper.rotation.x = 0.3;
    upperLids.push(upper);

    const lower = new THREE.Object3D();
    lower.position.copy(pivot.position);
    group.add(lower);
    const lowerGeo = new THREE.SphereGeometry(lidR, 22, 12, 0, Math.PI * 2, Math.PI - 0.78, 0.78);
    lowerGeo.scale(1.16, 1, 1.02);
    const lowerMesh = new THREE.Mesh(lowerGeo, skinMat);
    lowerMesh.castShadow = false;
    lower.add(lowerMesh);
    lower.rotation.x = -0.3;
    lowerLids.push(lower);
    void side;
  }

  return { group, pivots, upperLids, lowerLids, pupils, irisMat };
}

/* ------------------------------------------------------------------ brows */

export function buildBrows(d: Dim, landmarks: Record<string, THREE.Vector3>, color = 0x120d0c, thickness = 1): THREE.Object3D[] {
  const H = d.H;
  const out: THREE.Object3D[] = [];
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.72, metalness: 0 });
  for (const side of [-1, 1]) {
    const lm = side < 0 ? landmarks.browL : landmarks.browR;
    const pivot = new THREE.Object3D();
    pivot.position.copy(lm);
    const pts: THREE.Vector3[] = [];
    const n = 8;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const x = lerp(-0.019, 0.021, t) * H * side;
      const y = (Math.sin(t * Math.PI) * 0.0055 - t * 0.004) * H;
      const z = -Math.pow(t - 0.35, 2) * 0.05 * H;
      pts.push(new THREE.Vector3(x, y, z));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const geo = new THREE.TubeGeometry(curve, 12, 0.0032 * H * thickness, 6, false);
    geo.scale(1, 0.72, 1);
    const mesh = new THREE.Mesh(geo, mat);
    pivot.add(mesh);
    out.push(pivot);
  }
  return out;
}

/* ------------------------------------------------------------------- hair */

export type HairBuild = { meshes: THREE.Mesh[]; skinnedGeoms: THREE.BufferGeometry[] };

/**
 * Hairline height (in head half-heights, relative to the head centre) as a
 * function of the angle away from straight ahead. The front sits just above the
 * brow, recedes at the temples, and drops to the nape at the back.
 */
function hairlineYn(angleFromFront: number, style: HairStyle): number {
  const table: [number, number][] = [
    [0, 0.36], [0.5, 0.33], [0.95, 0.16], [1.35, -0.05],
    [1.9, -0.24], [2.5, -0.42], [Math.PI, -0.5],
  ];
  let v = table[table.length - 1][1];
  for (let i = 0; i < table.length - 1; i++) {
    const [a0, v0] = table[i];
    const [a1, v1] = table[i + 1];
    if (angleFromFront >= a0 && angleFromFront <= a1) {
      const k = (angleFromFront - a0) / (a1 - a0);
      v = lerp(v0, v1, k * k * (3 - 2 * k));
      break;
    }
  }
  if (style === 'buzz') v += 0.02;
  if (style === 'long' || style === 'bob') v -= 0.06;
  return v;
}

/** Cap that hugs the skull between the hairline and the crown. */
function buildHairCap(d: Dim, spec: HairSpec): THREE.BufferGeometry {
  const W = d.headW, D = d.headD, HH = d.headHi;
  const uSeg = 56, vSeg = 16;
  const style = spec.style;
  const volume = style === 'buzz' ? 0.25 : style === 'short' ? 0.6 : style === 'sidepart' ? 0.85 : 1;
  const pos: number[] = [];
  const uv: number[] = [];
  const index: number[] = [];

  for (let vi = 0; vi <= vSeg; vi++) {
    const tv = vi / vSeg;
    for (let ui = 0; ui <= uSeg; ui++) {
      const tu = ui / uSeg;
      const theta = tu * Math.PI * 2;
      // Angle away from straight ahead (+Z).
      const a = Math.abs(Math.atan2(Math.cos(theta), Math.sin(theta)));
      let hairYn = hairlineYn(a, style);
      // Widow's peak plus a little asymmetry so it is not a clean arc.
      hairYn += Math.exp(-Math.pow(a / 0.22, 2)) * 0.05;
      hairYn += Math.sin(theta * 3.1 + 1.2) * 0.012;

      // Interpolate from the hairline up over the crown.
      const yn = lerp(hairYn, 1.0, Math.pow(tv, 0.85));
      const sec = headSectionApprox(yn);
      const p = 2 / sec.e;
      const ca = Math.cos(theta), sa = Math.sin(theta);
      const sx = sec.w * W * Math.sign(ca) * Math.pow(Math.abs(ca), p);
      const sz = sec.d * D * Math.sign(sa) * Math.pow(Math.abs(sa), p) + sec.cz * D;
      const sy = yn * HH;

      // Thickness: thin at the hairline, fuller over the crown and back.
      const back = clamp((a - 1.2) / 1.9);
      const thick = (0.12 + 0.88 * Math.pow(tv, 0.7)) * (0.6 + 0.5 * back) * volume * 0.0042 * d.H;
      const wob = 1 + fbm2(sx * 45, (sy + sz) * 45, 3) * 0.22;
      const len = Math.hypot(sx, sy * 0.55, sz) || 1;
      const nx = sx / len, ny = (sy * 0.55) / len, nz = sz / len;
      pos.push(sx + nx * thick * wob, sy + ny * thick * wob, sz + nz * thick * wob);
      uv.push(tu * 4, tv * 2);
    }
  }
  for (let vi = 0; vi < vSeg; vi++) {
    for (let ui = 0; ui < uSeg; ui++) {
      const a = vi * (uSeg + 1) + ui;
      const b = a + 1;
      const c = a + (uSeg + 1);
      const dd = c + 1;
      index.push(a, b, c, b, dd, c);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(index);
  geo.computeVertexNormals();
  return geo;
}

/** Local copy of the head cross-section profile, for hair fitting. */
function headSectionApprox(yn: number): { w: number; d: number; cz: number; e: number } {
  const P: [number, number, number, number, number][] = [
    [1.0, 0.1, 0.16, -0.1, 2.0],
    [0.92, 0.38, 0.45, -0.1, 2.0],
    [0.8, 0.6, 0.66, -0.1, 2.05],
    [0.62, 0.83, 0.85, -0.08, 2.1],
    [0.42, 0.95, 0.93, -0.05, 2.15],
    [0.22, 1.0, 0.95, -0.03, 2.2],
    [0.06, 1.0, 0.94, -0.02, 2.25],
    [-0.14, 0.98, 0.93, 0.02, 2.35],
    [-0.32, 0.93, 0.9, 0.05, 2.45],
    [-0.48, 0.86, 0.87, 0.09, 2.5],
    [-0.64, 0.78, 0.83, 0.12, 2.55],
  ];
  if (yn >= P[0][0]) return { w: P[0][1], d: P[0][2], cz: P[0][3], e: P[0][4] };
  const last = P[P.length - 1];
  if (yn <= last[0]) return { w: last[1], d: last[2], cz: last[3], e: last[4] };
  for (let i = 0; i < P.length - 1; i++) {
    const a = P[i], b = P[i + 1];
    if (yn <= a[0] && yn >= b[0]) {
      const k = (a[0] - yn) / (a[0] - b[0]);
      const s = k * k * (3 - 2 * k);
      return { w: lerp(a[1], b[1], s), d: lerp(a[2], b[2], s), cz: lerp(a[3], b[3], s), e: lerp(a[4], b[4], s) };
    }
  }
  return { w: last[1], d: last[2], cz: last[3], e: last[4] };
}

function hairMaterial(spec: HairSpec): THREE.MeshPhysicalMaterial {
  const col = new THREE.Color(spec.color ?? 0x1a1210);
  const grey = spec.greying ?? 0;
  col.lerp(new THREE.Color(0x9aa0a4), grey);
  return new THREE.MeshPhysicalMaterial({
    color: col.convertSRGBToLinear(),
    roughness: lerp(0.62, 0.24, spec.gloss ?? 0.35),
    metalness: 0.03,
    clearcoat: lerp(0.1, 0.75, spec.gloss ?? 0.35),
    clearcoatRoughness: 0.32,
    sheen: 0.6,
    sheenColor: new THREE.Color(0.35, 0.3, 0.28),
    side: THREE.DoubleSide,
  });
}

/**
 * The scalp is extracted from the head geometry itself and inflated, so hair
 * always fits the skull exactly. Longer styles add extra swept volume.
 */
export function buildHair(body: THREE.BufferGeometry, d: Dim, spec: HairSpec): HairBuild {
  const H = d.H;
  const mat = hairMaterial(spec);
  const meshes: THREE.Mesh[] = [];
  const skinnedGeoms: THREE.BufferGeometry[] = [];
  if (spec.style === 'bald') return { meshes, skinnedGeoms };

  const rng = new Rng(0xba1d + (spec.color ?? 0));

  // A purpose-built cap: extracting scalp triangles from the head left a
  // stair-stepped hairline, while a dedicated grid can follow the hairline
  // curve exactly.
  const cap = buildHairCap(d, spec);
  meshes.push(new THREE.Mesh(cap, mat));
  void body;
  void extractShell;
  void REGION;

  const massMat = mat;
  const addMass = (geo: THREE.BufferGeometry, pos: THREE.Vector3, rot?: THREE.Euler) => {
    const m = new THREE.Mesh(geo, massMat);
    m.position.copy(pos);
    if (rot) m.rotation.copy(rot);
    m.castShadow = true;
    meshes.push(m);
  };

  // Hair volumes are sized from the cranium, not from body height, otherwise
  // they drift out of proportion across the cast.
  const HW = d.headW, HD = d.headD, HH = d.headHi;

  switch (spec.style) {
    case 'sidepart': {
      break;
    }
    case 'bob': {
      const g = new THREE.SphereGeometry(1, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.82);
      g.scale(HW * 1.14, HH * 1.1, HD * 1.1);
      const p = g.getAttribute('position');
      for (let i = 0; i < p.count; i++) {
        const y = p.getY(i);
        const t = clamp(-y / (HH * 0.9));
        p.setX(i, p.getX(i) * (1 + t * 0.12));
        p.setZ(i, p.getZ(i) * (1 + t * 0.05) - t * t * HD * 0.1);
        // Chin-length cut: flare then tuck.
        p.setY(i, y - t * t * HH * 0.16);
      }
      g.computeVertexNormals();
      addMass(g, new THREE.Vector3(0, HH * 0.06, -HD * 0.04));
      break;
    }
    case 'long': {
      const g = new THREE.SphereGeometry(1, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.66);
      g.scale(HW * 1.1, HH * 1.06, HD * 1.06);
      addMass(g, new THREE.Vector3(0, HH * 0.1, -HD * 0.02));
      for (const side of [-1, 1]) {
        const pts: THREE.Vector3[] = [];
        const n = 8;
        for (let i = 0; i < n; i++) {
          const t = i / (n - 1);
          pts.push(new THREE.Vector3(
            side * (HW * 0.78 + Math.sin(t * 2.2) * HW * 0.16),
            HH * 0.2 - t * HH * 2.4,
            -HD * 0.35 - t * HD * 0.2 + Math.sin(t * 3) * HD * 0.1,
          ));
        }
        const tubeG = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 14, HW * 0.34, 10, false);
        const tp = tubeG.getAttribute('position');
        for (let i = 0; i < tp.count; i++) {
          const wob = fbm2(tp.getX(i) * 60, tp.getY(i) * 60, 3) * HW * 0.06;
          tp.setX(i, tp.getX(i) + wob);
          tp.setZ(i, tp.getZ(i) + wob);
        }
        tubeG.computeVertexNormals();
        addMass(tubeG, new THREE.Vector3(0, 0, 0));
      }
      break;
    }
    case 'ponytail': {
      const g = new THREE.SphereGeometry(1, 22, 16, 0, Math.PI * 2, 0, Math.PI * 0.64);
      g.scale(HW * 1.06, HH * 1.02, HD * 1.02);
      addMass(g, new THREE.Vector3(0, HH * 0.08, 0));
      const pts: THREE.Vector3[] = [];
      const n = 7;
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1);
        pts.push(new THREE.Vector3(rng.range(-0.06, 0.06) * HW, HH * 0.2 - t * HH * 1.5, -HD * 0.95 - t * HD * 0.25));
      }
      const tubeG = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 12, HW * 0.26, 9, false);
      addMass(tubeG, new THREE.Vector3(0, 0, 0));
      break;
    }
    case 'braid': {
      const g = new THREE.SphereGeometry(1, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.6);
      g.scale(HW * 1.05, HH * 1.0, HD * 1.0);
      addMass(g, new THREE.Vector3(0, HH * 0.08, 0));
      const pts: THREE.Vector3[] = [];
      const n = 9;
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1);
        pts.push(new THREE.Vector3(Math.sin(t * 7) * HW * 0.1, HH * 0.1 - t * HH * 1.9, -HD * 0.9 - t * HD * 0.15));
      }
      const tubeG = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 22, HW * 0.23, 8, false);
      const tp = tubeG.getAttribute('position');
      for (let i = 0; i < tp.count; i++) {
        const y = tp.getY(i);
        const bump = 1 + Math.sin(y * 220) * 0.18;
        tp.setX(i, tp.getX(i) * bump);
        tp.setZ(i, tp.getZ(i) * bump);
      }
      tubeG.computeVertexNormals();
      addMass(tubeG, new THREE.Vector3(0, 0, 0));
      break;
    }
    default:
      break;
  }
  void H;

  return { meshes, skinnedGeoms };
}

export { hairMaterial };
