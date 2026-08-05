import * as THREE from 'three';
import { clamp, lerp, smoothstep, fbm } from '../engine/math';
import { crease, mergeGeometries, sculpt, smoothGeometry } from './geom';
import { generate, T } from '../engine/Textures';
import { eyeMaterial, skinMaterial, SkinTone } from './Materials';
import { DEFAULT_FACE, FaceParams } from './FaceParams';
import {
  faceAlbedo,
  faceDetailHeight,
  faceRoughness,
  featureLayout,
  HEAD,
  headDepthAt,
  headWidthAt,
  headZOffsetAt,
  uvToHeadPoint,
} from './FaceMaps';

export { DEFAULT_FACE };
export type { FaceParams };

export const MORPHS = [
  'jawOpen',
  'mouthWide',
  'mouthO',
  'smile',
  'frown',
  'browRaise',
  'browFurrow',
  'squint',
  'sneer',
] as const;
export type MorphName = (typeof MORPHS)[number];

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/** Big forms only - fine detail comes from the face maps. */
function buildSkull(p: FaceParams): THREE.BufferGeometry {
  const geo = new THREE.SphereGeometry(1, 128, 96);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  const L = featureLayout(p);

  // ---- loft the anatomical profile, then bias it toward a real skull shape.
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const yn = clamp(v.y, -1, 1);
    const t = (yn + 1) / 2;
    const y = lerp(HEAD.chinY, HEAD.crownY, t);
    const horiz = Math.hypot(v.x, v.z);
    const dirX = horiz > 1e-6 ? v.x / horiz : 0;
    const dirZ = horiz > 1e-6 ? v.z / horiz : 1;

    let w = headWidthAt(t) * HEAD.halfWidth * p.skullWidth;
    let d = headDepthAt(t) * HEAD.halfDepth;
    const zOff = headZOffsetAt(t);

    // Jaw: squarer or softer, and narrower or wider.
    const jawT = smoothstep(0.38, 0.02, t);
    w *= lerp(1, p.jawWidth, jawT);
    // Square jaws keep their width lower down.
    w *= 1 + jawT * (p.jawSquare - 0.5) * 0.28;

    let x = dirX * w;
    let z = dirZ * d + zOff;

    // Flatten the facial plane and square off the sides of the cranium.
    const front = clamp(dirZ);
    const side = Math.abs(dirX);
    z -= front * front * 0.004;
    x *= lerp(1, 1.03, Math.pow(side, 3) * smoothstep(0.3, 0.75, t));

    // Chin: project forward, and drop slightly for longer chins.
    const chinW = clamp(1 - Math.abs(x) / 0.03);
    const chinT = smoothstep(0.12, 0.0, t);
    z += chinT * chinW * front * 0.016 * p.chinLength;
    const yOut = y - chinT * chinW * 0.006 * (p.chinLength - 1);

    // Brow ridge / forehead slope.
    const browBand = clamp(1 - Math.abs(y - L.browY) / 0.03) * front;
    z += browBand * (0.004 + 0.005 * p.masculinity);
    z -= smoothstep(HEAD.browY + 0.02, HEAD.crownY, y) * front * 0.01 * p.foreheadSlope;

    // Occipital bulge.
    z -= clamp(-dirZ) * smoothstep(0.75, 0.35, t) * 0.004;

    pos.setXYZ(i, x, yOut, z);
  }
  geo.computeVertexNormals();

  const eyeX = L.eyeX;
  const eyeY = L.eyeY;

  // ---- secondary forms.
  for (const s of [-1, 1]) {
    // Eye socket hollow.
    sculpt(geo, V(s * eyeX, eyeY + 0.001, HEAD.faceZ + 0.006), 0.027, V(0, 0, -0.014 * p.eyeDepth), { falloff: 1.15 });
    sculpt(geo, V(s * (eyeX + 0.016), eyeY + 0.004, HEAD.faceZ - 0.006), 0.018, V(0, 0, -0.006), { falloff: 1.3 });
    // Cheekbone, then the hollow under it.
    sculpt(geo, V(s * 0.056, eyeY - 0.026, 0.055), 0.04, V(s * 0.005 * p.cheekbone, 0.001, 0.0055 * p.cheekbone), { falloff: 1.7 });
    sculpt(geo, V(s * 0.05, eyeY - 0.056, 0.046), 0.03, V(-s * 0.005 * p.cheekHollow, 0, -0.005 * p.cheekHollow), { falloff: 1.5 });
    // Jaw corner.
    sculpt(geo, V(s * 0.058, eyeY - 0.07, -0.006), 0.036, V(s * 0.006 * p.jawSquare, -0.002, 0), { falloff: 1.6 });
    // Temple hollow.
    sculpt(geo, V(s * 0.07, eyeY + 0.036, 0.03), 0.03, V(-s * 0.004, 0, 0), { falloff: 1.6 });
    // Nose wing mass.
    sculpt(geo, V(s * L.noseHalf, L.noseBaseY + 0.004, 0.078), 0.015, V(s * 0.003, 0, 0.006), { falloff: 1.4 });
  }

  // Chin pad and jaw underside.
  sculpt(geo, V(0, HEAD.chinY + 0.02, 0.05), 0.032, V(0, -0.002, 0.009), { falloff: 1.5 });

  // Nose: root, bridge, tip, base.
  sculpt(geo, V(0, L.noseRootY + 0.004, 0.074), 0.02, V(0, 0, 0.005 * p.noseBridge), { falloff: 1.5, scaleXYZ: [1.4, 1, 1] });
  sculpt(geo, V(0, (L.noseRootY + L.noseTipY) / 2, 0.078), 0.024, V(0, 0, 0.015 * p.noseBridge), { falloff: 1.25, scaleXYZ: [2.7, 1, 1] });
  sculpt(geo, V(0, L.noseTipY, 0.082), 0.019, V(0, -0.003, 0.021 * p.noseLength), { falloff: 1.1, scaleXYZ: [1.9, 1.15, 1] });
  sculpt(geo, V(0, L.noseBaseY, 0.082), 0.013, V(0, -0.002, 0.007), { falloff: 1.4, scaleXYZ: [1.7, 1, 1] });

  // Mouth mass (the crease itself is in the detail map).
  sculpt(geo, V(0, L.mouthY + 0.008, 0.076), 0.019, V(0, 0.0012, 0.009 * p.lipFullness), {
    falloff: 1.25,
    scaleXYZ: [1.9, 0.7, 1],
  });
  sculpt(geo, V(0, L.mouthY - 0.013, 0.075), 0.018, V(0, -0.0018, 0.0095 * p.lipFullness), {
    falloff: 1.25,
    scaleXYZ: [1.8, 0.75, 1],
  });
  sculpt(geo, V(0, L.mouthY - 0.03, 0.07), 0.016, V(0, 0, -0.003), { falloff: 1.4, scaleXYZ: [1.6, 1, 1] });

  // Jaw shadow line.
  crease(
    geo,
    (t) => {
      const a = lerp(-1.25, 1.25, t);
      return V(Math.sin(a) * 0.058, HEAD.chinY + 0.03 + Math.pow(Math.abs(Math.sin(a)), 2) * 0.032, Math.cos(a) * 0.05 - 0.008);
    },
    0.012,
    -0.0016,
    26,
  );

  smoothGeometry(geo, 1, 0.12);
  geo.computeVertexNormals();
  return geo;
}

type MorphFn = (v: THREE.Vector3, out: THREE.Vector3) => void;

function morphFns(p: FaceParams): Record<MorphName, MorphFn> {
  const L = featureLayout(p);
  const mouthY = L.mouthY;
  const mw = L.mouthHalf;
  const jawPivot = V(0, HEAD.earY + 0.004, -0.05);
  const eyeX = L.eyeX;

  const nearMouth = (v: THREE.Vector3, rx = 0.05, ry = 0.032) => {
    const dx = (v.x - 0) / rx;
    const dy = (v.y - mouthY) / ry;
    const dz = (v.z - 0.07) / 0.06;
    return clamp(1 - Math.sqrt(dx * dx + dy * dy + dz * dz));
  };

  return {
    jawOpen: (v, out) => {
      const w = smoothstep(L.mouthY + 0.03, L.mouthY - 0.03, v.y) * smoothstep(-0.075, 0.02, v.z);
      const ang = 0.34 * w;
      const dy = v.y - jawPivot.y;
      const dz = v.z - jawPivot.z;
      const c = Math.cos(ang);
      const s = Math.sin(ang);
      out.set(v.x * (1 - w * 0.03), jawPivot.y + dy * c - dz * s, jawPivot.z + dy * s + dz * c);
      const lipW = nearMouth(v, 0.04, 0.022);
      out.y -= lipW * 0.005 * smoothstep(mouthY + 0.004, mouthY - 0.004, v.y);
      out.y += lipW * 0.0025 * smoothstep(mouthY - 0.004, mouthY + 0.006, v.y);
    },
    mouthWide: (v, out) => {
      const w = nearMouth(v, 0.055, 0.03);
      out.copy(v);
      out.x += Math.sign(v.x) * w * 0.0075;
      out.y += w * 0.001;
      out.z -= w * 0.0022;
    },
    mouthO: (v, out) => {
      const w = nearMouth(v, 0.05, 0.03);
      out.copy(v);
      out.x -= v.x * w * 0.32;
      out.z += w * 0.006;
      out.y += (mouthY - v.y) * w * 0.16;
    },
    smile: (v, out) => {
      out.copy(v);
      for (const s of [-1, 1]) {
        const dx = (v.x - s * mw) / 0.024;
        const dy = (v.y - (mouthY - 0.002)) / 0.02;
        const dz = (v.z - 0.078) / 0.05;
        const w = clamp(1 - Math.sqrt(dx * dx + dy * dy + dz * dz));
        out.x += s * w * 0.0065;
        out.y += w * 0.009;
        out.z += w * 0.001;
      }
      for (const s of [-1, 1]) {
        const dx = (v.x - s * 0.046) / 0.03;
        const dy = (v.y - (L.eyeY - 0.03)) / 0.025;
        const dz = (v.z - 0.056) / 0.045;
        const w = clamp(1 - Math.sqrt(dx * dx + dy * dy + dz * dz));
        out.y += w * 0.0035;
        out.z += w * 0.0022;
      }
    },
    frown: (v, out) => {
      out.copy(v);
      for (const s of [-1, 1]) {
        const dx = (v.x - s * mw) / 0.026;
        const dy = (v.y - (mouthY - 0.004)) / 0.024;
        const dz = (v.z - 0.076) / 0.05;
        const w = clamp(1 - Math.sqrt(dx * dx + dy * dy + dz * dz));
        out.y -= w * 0.0075;
        out.x += s * w * 0.001;
        out.z -= w * 0.0012;
      }
    },
    browRaise: (v, out) => {
      out.copy(v);
      const w = smoothstep(L.browY - 0.014, L.browY + 0.006, v.y) * smoothstep(L.browY + 0.05, L.browY + 0.012, v.y) * smoothstep(0.03, 0.075, v.z);
      out.y += w * 0.0085;
      out.z += w * 0.001;
    },
    browFurrow: (v, out) => {
      out.copy(v);
      const w = smoothstep(L.browY - 0.016, L.browY + 0.004, v.y) * smoothstep(L.browY + 0.04, L.browY + 0.008, v.y) * smoothstep(0.04, 0.08, v.z);
      const inner = clamp(1 - Math.abs(v.x) / 0.03);
      out.y -= w * 0.005;
      out.x -= Math.sign(v.x) * w * inner * 0.004;
      out.z += w * inner * 0.0018;
    },
    squint: (v, out) => {
      out.copy(v);
      for (const s of [-1, 1]) {
        const dx = (v.x - s * eyeX) / 0.03;
        const dy = (v.y - (L.eyeY - 0.006)) / 0.02;
        const dz = (v.z - 0.072) / 0.05;
        const w = clamp(1 - Math.sqrt(dx * dx + dy * dy + dz * dz));
        out.y += w * 0.0035;
        out.z += w * 0.0012;
      }
    },
    sneer: (v, out) => {
      out.copy(v);
      const w = clamp(1 - Math.hypot((v.x - 0) / 0.03, (v.y - (L.noseBaseY + 0.006)) / 0.016, (v.z - 0.082) / 0.03));
      out.y += w * 0.004;
      out.z += w * 0.0015;
    },
  };
}

function buildMorphAttributes(base: THREE.BufferGeometry, p: FaceParams) {
  const fns = morphFns(p);
  const basePos = base.attributes.position as THREE.BufferAttribute;
  const positions: THREE.BufferAttribute[] = [];
  const normals: THREE.BufferAttribute[] = [];
  const v = new THREE.Vector3();
  const out = new THREE.Vector3();
  for (const name of MORPHS) {
    const arr = new Float32Array(basePos.count * 3);
    const fn = fns[name];
    for (let i = 0; i < basePos.count; i++) {
      v.fromBufferAttribute(basePos, i);
      out.copy(v);
      fn(v, out);
      arr[i * 3] = out.x;
      arr[i * 3 + 1] = out.y;
      arr[i * 3 + 2] = out.z;
    }
    const attr = new THREE.BufferAttribute(arr, 3);
    positions.push(attr);
    const tmpGeo = new THREE.BufferGeometry();
    tmpGeo.setAttribute('position', attr);
    if (base.index) tmpGeo.setIndex(base.index);
    tmpGeo.computeVertexNormals();
    normals.push(tmpGeo.attributes.normal as THREE.BufferAttribute);
    tmpGeo.dispose();
  }
  base.morphAttributes.position = positions;
  base.morphAttributes.normal = normals;
}

const FACE_MAP_SIZE = 768;

/** Bake the face detail height field into a tangent-space normal map. */
function faceNormalMap(key: string, p: FaceParams): THREE.Texture {
  const size = FACE_MAP_SIZE;
  const h = new Float32Array(size * size);
  const pt = new THREE.Vector3();
  for (let y = 0; y < size; y++) {
    const v = 1 - y / (size - 1);
    for (let x = 0; x < size; x++) {
      const u = x / (size - 1);
      pt.copy(uvToHeadPoint(u, v, p));
      h[y * size + x] = faceDetailHeight(p, pt.x, pt.y, pt.z);
    }
  }
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  const d = img.data;
  const at = (x: number, y: number) => h[Math.min(size - 1, Math.max(0, y)) * size + ((x + size) % size)];
  // Metres per texel across the head surface, used to scale the gradient.
  const scale = 1150;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * scale;
      const dy = (at(x, y - 1) - at(x, y + 1)) * scale;
      let nx = -dx;
      let ny = -dy;
      const nz = 1;
      const len = Math.hypot(nx, ny, nz);
      nx /= len;
      ny /= len;
      const i = (y * size + x) * 4;
      d[i] = (nx * 0.5 + 0.5) * 255;
      d[i + 1] = (ny * 0.5 + 0.5) * 255;
      d[i + 2] = (nz / len) * 0.5 * 255 + 127.5;
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.NoColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  tex.name = `faceNormal-${key}`;
  return tex;
}

function faceAlbedoMap(key: string, p: FaceParams, tone: SkinTone): THREE.Texture {
  // generate() writes sRGB-encoded bytes, so convert out of linear working space.
  const base = new THREE.Color(tone.base).convertLinearToSRGB();
  const col = new THREE.Color();
  const pt = new THREE.Vector3();
  return generate(
    `faceAlbedo-${key}`,
    FACE_MAP_SIZE,
    (u, v) => {
      pt.copy(uvToHeadPoint(u, 1 - v, p));
      faceAlbedo(p, base, pt.x, pt.y, pt.z, col);
      return [col.r, col.g, col.b, 1];
    },
    { srgb: true },
  );
}

function faceRoughnessMap(key: string, p: FaceParams): THREE.Texture {
  const pt = new THREE.Vector3();
  return generate(`faceRough-${key}`, FACE_MAP_SIZE / 2, (u, v) => {
    pt.copy(uvToHeadPoint(u, 1 - v, p));
    const r = faceRoughness(p, pt.x, pt.y, pt.z);
    return [r, r, r, 1];
  });
}

function irisTexture(color: THREE.ColorRepresentation, key: string): THREE.Texture {
  const c = new THREE.Color(color);
  const tex = generate(
    `iris-${key}`,
    256,
    (u, v) => {
      // v = 1 at the pupil centre; the iris occupies the polar cap of the eyeball.
      const t = clamp((1 - v) / 0.19, 0, 4);
      const ang = u * Math.PI * 2;
      if (t > 1.0) {
        // Sclera with faint vessels and a shaded upper hemisphere.
        const vein = Math.pow(fbm(u * 26, (1 - v) * 5, 3), 3) * 1.5;
        const shade = 0.9 - clamp((t - 1) * 0.1, 0, 0.18);
        return [shade + vein * 0.18, shade * 0.93 + vein * 0.02, shade * 0.92 + vein * 0.03, 1];
      }
      const pupil = smoothstep(0.4, 0.33, t);
      const limbal = smoothstep(0.84, 1.0, t);
      const fibers = fbm(ang * 11, t * 6, 4);
      const radial = 0.5 + 0.5 * Math.sin(ang * 52 + fibers * 11);
      const detail = lerp(0.6, 1.35, fibers) * lerp(0.82, 1.12, radial);
      const inner = smoothstep(0.33, 0.85, t);
      const shade = clamp(1 - limbal * 1.15) * clamp(1 - pupil);
      return [
        c.r * detail * lerp(0.5, 1.2, inner) * shade,
        c.g * detail * lerp(0.46, 1.14, inner) * shade,
        c.b * detail * lerp(0.55, 1.18, inner) * shade,
        1,
      ];
    },
    { srgb: true },
  );
  tex.flipY = false;
  tex.needsUpdate = true;
  return tex;
}

export interface HeadRig {
  group: THREE.Group;
  face: THREE.Mesh;
  eyes: THREE.Group;
  eyeL: THREE.Mesh;
  eyeR: THREE.Mesh;
  lidUpperL: THREE.Object3D;
  lidUpperR: THREE.Object3D;
  lidLowerL: THREE.Object3D;
  lidLowerR: THREE.Object3D;
  morphIndex: Record<MorphName, number>;
  led?: THREE.Mesh;
  eyeCenterL: THREE.Vector3;
  eyeCenterR: THREE.Vector3;
}

export interface HeadOptions {
  face: Partial<FaceParams>;
  tone: SkinTone;
  hair: 'short' | 'buzz' | 'ponytail' | 'bun' | 'swept' | 'none';
  hairColor: THREE.ColorRepresentation;
  led: boolean;
  key: string;
}

export function buildHead(opts: HeadOptions): HeadRig {
  const p: FaceParams = { ...DEFAULT_FACE, ...opts.face };
  const group = new THREE.Group();

  const skull = buildSkull(p);
  buildMorphAttributes(skull, p);

  const skinMat = skinMaterial(opts.tone, { android: p.android });
  // The face map already carries the tone, so the tint must be neutral.
  skinMat.color.setRGB(1, 1, 1);
  skinMat.map = faceAlbedoMap(opts.key, p, opts.tone);
  skinMat.normalMap = faceNormalMap(opts.key, p);
  skinMat.normalScale = new THREE.Vector2(1.0, 1.0);
  skinMat.roughnessMap = faceRoughnessMap(opts.key, p);
  skinMat.roughness = 1;
  skinMat.needsUpdate = true;

  const face = new THREE.Mesh(skull, skinMat);
  face.castShadow = true;
  face.receiveShadow = true;
  const morphIndex = {} as Record<MorphName, number>;
  MORPHS.forEach((m, i) => (morphIndex[m] = i));
  group.add(face);

  // ------------------------------------------------------------------- eyes
  const layout = featureLayout(p);
  const eyeX = layout.eyeX;
  const eyeRad = 0.0133 * p.eyeSize;
  const eyeY = layout.eyeY;
  // Seat the globe so the cornea just fills the palpebral opening.
  const eyeZ = HEAD.faceZ - 0.0088 - 0.001 * p.eyeDepth;
  const eyes = new THREE.Group();
  const iris = irisTexture(p.eyeColor, opts.key);
  const eyeMat = eyeMaterial(iris);

  const makeEye = (side: number) => {
    const g = new THREE.SphereGeometry(eyeRad, 44, 32);
    const pos = g.attributes.position as THREE.BufferAttribute;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const t = clamp((v.y / eyeRad - 0.5) / 0.5);
      v.multiplyScalar(1 + t * 0.075);
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    g.computeVertexNormals();
    g.rotateX(Math.PI / 2);
    const mesh = new THREE.Mesh(g, eyeMat);
    mesh.position.set(side * eyeX, eyeY, eyeZ);
    return mesh;
  };
  const eyeL = makeEye(-1);
  const eyeR = makeEye(1);
  eyes.add(eyeL, eyeR);
  group.add(eyes);

  // ------------------------------------------------------------------- lids
  const lidMat = skinMaterial(opts.tone, { android: p.android });
  lidMat.color = new THREE.Color(opts.tone.base).multiplyScalar(0.94);
  lidMat.normalMap = null;
  lidMat.map = null;
  lidMat.roughness = 0.55;
  const makeLid = (side: number, upper: boolean) => {
    const pivot = new THREE.Object3D();
    pivot.position.set(side * eyeX, eyeY, eyeZ);
    const r = eyeRad * 1.09;
    const g = new THREE.SphereGeometry(r, 30, 20, 0, Math.PI * 2, 0, upper ? 1.28 : 0.95);
    const pos = g.attributes.position as THREE.BufferAttribute;
    const v = new THREE.Vector3();
    const span = upper ? 1.28 : 0.95;
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const ang = Math.acos(clamp(v.y / r, -1, 1));
      const edge = smoothstep(0.72, 1.0, ang / span);
      // Thicken toward the lid margin so it reads as skin, not a shell.
      v.multiplyScalar(1 + edge * 0.03);
      v.y += edge * (upper ? -0.0012 : 0.0012);
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    g.computeVertexNormals();
    const mesh = new THREE.Mesh(g, lidMat);
    mesh.castShadow = true;
    if (!upper) mesh.rotation.x = Math.PI;
    pivot.add(mesh);
    pivot.rotation.x = upper ? -0.5 : 0.4;
    if (upper) {
      // Lash line.
      const lash = new THREE.Mesh(
        new THREE.SphereGeometry(r * 1.02, 26, 8, 0, Math.PI * 2, 1.16, 0.13),
        new THREE.MeshStandardMaterial({ color: 0x0d0908, roughness: 0.7, metalness: 0 }),
      );
      pivot.add(lash);
    }
    return pivot;
  };
  const lidUpperL = makeLid(-1, true);
  const lidUpperR = makeLid(1, true);
  const lidLowerL = makeLid(-1, false);
  const lidLowerR = makeLid(1, false);
  group.add(lidUpperL, lidUpperR, lidLowerL, lidLowerR);

  // ------------------------------------------------------------------ ears
  for (const side of [-1, 1]) {
    const parts: THREE.BufferGeometry[] = [];
    const shell = new THREE.SphereGeometry(0.021, 20, 16);
    const pos = shell.attributes.position as THREE.BufferAttribute;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      v.x *= 0.26;
      v.y *= 1.22;
      v.z *= 0.72;
      // Concha bowl and helix rim.
      const bowl = clamp(1 - Math.hypot(v.y / 0.014, (v.z + 0.002) / 0.01));
      v.x -= side * bowl * 0.0075;
      const rim = smoothstep(0.55, 1.0, Math.hypot(v.y / 0.024, v.z / 0.015));
      v.x += side * rim * 0.0025;
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    shell.computeVertexNormals();
    parts.push(shell);
    const lobe = new THREE.SphereGeometry(0.008, 12, 8);
    lobe.scale(0.5, 1.0, 0.8);
    lobe.translate(0, -0.021, 0.001);
    parts.push(lobe);
    const geo = mergeGeometries(parts, false)!;
    const ear = new THREE.Mesh(geo, lidMat);
    ear.position.set(side * HEAD.earX * p.skullWidth, HEAD.earY, -0.012);
    ear.rotation.set(0, side * -0.2, side * 0.1);
    ear.castShadow = true;
    group.add(ear);
  }

  // ------------------------------------------------------------------ hair
  if (opts.hair !== 'none') {
    const hairMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(opts.hairColor).lerp(new THREE.Color(0x6a5344), 0.28),
      normalMap: T.metalNormal(),
      normalScale: new THREE.Vector2(0.8, 0.3),
      anisotropy: 0.8,
      anisotropyRotation: Math.PI / 2,
      roughness: 0.5,
      metalness: 0.0,
      clearcoat: 0.3,
      clearcoatRoughness: 0.5,
      sheen: 0.2,
      sheenRoughness: 0.45,
      sheenColor: new THREE.Color(opts.hairColor).lerp(new THREE.Color(0xffffff), 0.2),
    });
    const tight = opts.hair === 'buzz';
    const shells = tight ? 1 : 3;
    const swept = opts.hair === 'swept';
    for (let s = 0; s < shells; s++) {
      const grow = tight ? 0.0035 : 0.009 + s * 0.009;
      const g = new THREE.SphereGeometry(1, 56, 42);
      const pos = g.attributes.position as THREE.BufferAttribute;
      const v = new THREE.Vector3();
      // Single pass: loft onto the skull, then thicken only inside the hairline.
      // Outside it the shell sinks under the scalp, so there is no open edge.
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i);
        const yn = clamp(v.y, -1, 1);
        const t = (yn + 1) / 2;
        const y = lerp(HEAD.chinY, HEAD.crownY, t);
        const horiz = Math.hypot(v.x, v.z);
        const dirX = horiz > 1e-6 ? v.x / horiz : 0;
        const dirZ = horiz > 1e-6 ? v.z / horiz : 1;
        const baseW = headWidthAt(t) * HEAD.halfWidth * p.skullWidth;
        const baseD = headDepthAt(t) * HEAD.halfDepth;
        const zOff = headZOffsetAt(t);

        const frontness = clamp(dirZ * (baseD / HEAD.halfDepth));
        const temple = Math.pow(clamp(Math.abs(dirX)), 2.4);
        let hairline = lerp(HEAD.earY - 0.045, HEAD.hairlineY, smoothstep(-0.3, 0.75, frontness));
        hairline += temple * frontness * 0.03;
        if (swept) hairline += frontness * 0.006;
        if (opts.hair === 'ponytail' || opts.hair === 'bun') hairline -= (1 - frontness) * 0.035;
        const inside = smoothstep(-0.012, 0.03, y - hairline);

        // Clumping only where there is real hair.
        const clump = fbm(dirX * 6 + s * 4.1, dirZ * 6 + y * 14, 3) - 0.45;
        const part = swept ? smoothstep(-0.05, 0.35, dirX) * 0.004 * (s + 1) : 0;
        const thickness = lerp(-0.007, grow + clump * (tight ? 0.001 : 0.005) + part, inside);

        pos.setXYZ(i, dirX * (baseW + thickness), y + Math.max(0, yn) * thickness * 0.6, dirZ * (baseD + thickness) + zOff);
      }
      g.computeVertexNormals();
      // The outermost shell gets an alpha-tested noise mask so the silhouette
      // breaks into clumps instead of reading as a helmet.
      const useMask = !tight && s === shells - 1;
      const mat = useMask ? (hairMat.clone() as THREE.MeshPhysicalMaterial) : hairMat;
      if (useMask) {
        mat.alphaMap = T.hairClumps();
        mat.transparent = false;
        mat.alphaTest = 0.42;
        mat.side = THREE.DoubleSide;
        mat.needsUpdate = true;
      }
      const shell = new THREE.Mesh(g, mat);
      shell.castShadow = true;
      group.add(shell);
    }
    // Sideburns tie the hair into the skin.
    for (const side of [-1, 1]) {
      const burn = new THREE.SphereGeometry(0.012, 10, 8);
      burn.scale(0.45, 1.5, 0.8);
      burn.translate(side * HEAD.earX * p.skullWidth, HEAD.earY + 0.03, -0.004);
      const mesh = new THREE.Mesh(burn, hairMat);
      group.add(mesh);
    }
    if (opts.hair === 'ponytail' || opts.hair === 'bun') {
      const tailGeo =
        opts.hair === 'bun'
          ? new THREE.SphereGeometry(0.038, 24, 18)
          : new THREE.CapsuleGeometry(0.022, 0.11, 12, 16);
      const tail = new THREE.Mesh(tailGeo, hairMat);
      tail.position.set(0, opts.hair === 'bun' ? HEAD.browY + 0.02 : HEAD.earY - 0.02, -0.1);
      if (opts.hair === 'ponytail') tail.rotation.x = -0.22;
      tail.castShadow = true;
      group.add(tail);
      const band = new THREE.Mesh(
        new THREE.TorusGeometry(0.021, 0.005, 8, 20),
        new THREE.MeshStandardMaterial({ color: 0x191919, roughness: 0.7 }),
      );
      band.position.set(0, HEAD.earY + 0.012, -0.096);
      band.rotation.x = Math.PI / 2;
      group.add(band);
    }
  }

  // ------------------------------------------------------------------- LED
  let led: THREE.Mesh | undefined;
  if (opts.led) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.0095, 0.0027, 10, 26),
      new THREE.MeshStandardMaterial({
        color: 0x9fdcff,
        emissive: new THREE.Color(0x3fc8ff),
        emissiveIntensity: 5,
        roughness: 0.25,
        metalness: 0.3,
      }),
    );
    ring.position.set(HEAD.earX * 0.9 * p.skullWidth, HEAD.browY + 0.026, 0.04);
    ring.rotation.set(0, 1.0, 0.1);
    group.add(ring);
    led = ring;
  }

  return {
    group,
    face,
    eyes,
    eyeL,
    eyeR,
    lidUpperL,
    lidUpperR,
    lidLowerL,
    lidLowerR,
    morphIndex,
    led,
    eyeCenterL: V(-eyeX, eyeY, eyeZ),
    eyeCenterR: V(eyeX, eyeY, eyeZ),
  };
}
