import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { getDetailTexture, applyGunDetail } from '../materials.js';

/**
 * Shared modelling helpers for the procedural attachments. Convention: every helper takes sizes and
 * positions in MILLIMETRES and returns geometry in METRES (gunRoot space: forward -Z, up +Y, right +X).
 */
export const MM = 0.001;

/* ------------------------------------------------------------------------------------ rail data */

/**
 * Measured from public/assets/models/weapons/M4A1.glb (see tools notes in index.js). All values in metres,
 * gunRoot space. The GLB is offset 0.75 mm to the left of x = 0, so mounts are centred on `x`.
 */
export const RAIL = {
  x: -0.00075,
  topY: 0.0512, // receiver + handguard top rail surface
  receiverZ: [-0.0974, 0.0732], // extent of the receiver rail top face
  handguardZ: [-0.295, -0.124], // handguard rail section
  bottomY: -0.0106, // handguard bottom rail surface
  sideX: 0.03085, // |x| of the handguard side rail faces
  sideY: 0.0203, // centre height of the side rails
};

/**
 * Cross-section of a picatinny clamp (the mount's base plate + two jaws hugging the rail "T").
 * Built in a frame where the rail surface is y = 0 and the rail body extends toward -y. `flip` mirrors
 * it for a rail whose body extends toward +y (the handguard bottom rail). Extrude along z for the mount length.
 */
export function railClampShape({
  halfWidth = 13,
  height = 8,
  flangeHalf = 8.95, // flange half-width incl. clearance
  hookDepth = 5.4, // where the jaw starts to angle in under the flange
  jawDepth = 6.0, // jaw bottom (must stay above the receiver shoulders)
  jawInner = 6.6, // jaw bottom inner x
  sunk = 0.5, // the plate reaches this far into the rail so no face is coplanar
  flip = false,
} = {}) {
  const pts = [
    [-halfWidth, -jawDepth],
    [-jawInner, -jawDepth],
    [-flangeHalf, -hookDepth],
    [-flangeHalf, -sunk],
    [flangeHalf, -sunk],
    [flangeHalf, -hookDepth],
    [jawInner, -jawDepth],
    [halfWidth, -jawDepth],
    [halfWidth, height],
    [-halfWidth, height],
  ];
  if (flip) {
    for (const p of pts) p[1] = -p[1];
    pts.reverse();
  }
  const s = new THREE.Shape();
  s.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]);
  s.closePath();
  return s;
}

/* ----------------------------------------------------------------------------------- geometry */

/** Rounded box (mm). */
export function rbox(w, h, d, r = 0.6, seg = 2) {
  const rad = Math.max(0.05, Math.min(r, Math.min(w, h, d) * 0.5 - 0.01));
  return new RoundedBoxGeometry(w * MM, h * MM, d * MM, seg, rad * MM);
}

/** Cylinder along +Y (mm). */
export function cylY(r, h, seg = 28, rTop = r) {
  return new THREE.CylinderGeometry(rTop * MM, r * MM, h * MM, seg);
}
/** Cylinder along +X. */
export function cylX(r, h, seg = 28, rTop = r) {
  return cylY(r, h, seg, rTop).rotateZ(-Math.PI / 2);
}
/** Cylinder along +Z (rTop faces -Z / forward). */
export function cylZ(r, h, seg = 28, rTop = r) {
  return cylY(r, h, seg, rTop).rotateX(-Math.PI / 2);
}

/** Knurled cylinder along +Y: alternating radii around the rim, faceted normals. */
export function knurlY(r, h, teeth = 24, depth = 0.4) {
  const g = new THREE.CylinderGeometry(r * MM, r * MM, h * MM, teeth * 2, 1, false);
  const pos = g.attributes.position;
  const step = (Math.PI * 2) / (teeth * 2);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const rad = Math.hypot(x, z);
    if (rad < 1e-9) continue;
    const k = Math.round(Math.atan2(z, x) / step);
    if ((((k % 2) + 2) % 2) === 1) {
      const s = (rad - depth * MM) / rad;
      pos.setX(i, x * s);
      pos.setZ(i, z * s);
    }
  }
  const ng = g.toNonIndexed();
  ng.computeVertexNormals();
  return ng;
}
export function knurlX(r, h, teeth, depth) {
  return knurlY(r, h, teeth, depth).rotateZ(-Math.PI / 2);
}
export function knurlZ(r, h, teeth, depth) {
  return knurlY(r, h, teeth, depth).rotateX(-Math.PI / 2);
}

/** Torus (mm) with its axis along +Z. */
export function torusZ(R, tube, radial = 10, tubular = 32) {
  return new THREE.TorusGeometry(R * MM, tube * MM, radial, tubular);
}

/**
 * Rounded rectangle path (mm) centred on (cx, cy). `radii` = number or [tl, tr, br, bl].
 * Returns the given THREE.Shape/Path (counter-clockwise).
 */
export function roundedRect(w, h, radii, out = new THREE.Shape(), cx = 0, cy = 0) {
  const [tl, tr, br, bl] = Array.isArray(radii) ? radii : [radii, radii, radii, radii];
  const x0 = cx - w / 2;
  const x1 = cx + w / 2;
  const y0 = cy - h / 2;
  const y1 = cy + h / 2;
  out.moveTo(x0 + bl, y0);
  out.lineTo(x1 - br, y0);
  if (br > 0) out.absarc(x1 - br, y0 + br, br, -Math.PI / 2, 0, false);
  out.lineTo(x1, y1 - tr);
  if (tr > 0) out.absarc(x1 - tr, y1 - tr, tr, 0, Math.PI / 2, false);
  out.lineTo(x0 + tl, y1);
  if (tl > 0) out.absarc(x0 + tl, y1 - tl, tl, Math.PI / 2, Math.PI, false);
  out.lineTo(x0, y0 + bl);
  if (bl > 0) out.absarc(x0 + bl, y0 + bl, bl, Math.PI, Math.PI * 1.5, false);
  out.closePath();
  return out;
}

/**
 * Extrude a shape (mm) along +Z to a total length `length` (mm, centred on z = 0), with an optional
 * chamfer/bevel that stays inside the shape outline. UVs are rescaled so a texture tile spans `uvTile` mm.
 */
export function extrude(shape, length, { bevel = 0, bevelSeg = 2, curveSegments = 10, uvTile = 8 } = {}) {
  let b = Math.min(bevel, length * 0.45);
  const build = (bb) =>
    new THREE.ExtrudeGeometry(shape, {
      depth: Math.max(0.01, length - 2 * bb),
      steps: 1,
      curveSegments,
      bevelEnabled: bb > 0,
      bevelThickness: bb,
      bevelSize: bb,
      bevelOffset: -bb,
      bevelSegments: bevelSeg,
    });
  let g = build(b);
  if (b > 0) {
    // ExtrudeGeometry triangulates the caps from the inset (bevelOffset) contour. A corner whose radius is
    // smaller than the bevel inverts when inset and earcut then fills holes with stray triangles (the window
    // of a bezel becomes a solid diagonal). Detect it from the cap area and back the bevel off until it is sane.
    const ref = shapeArea(shape, curveSegments);
    for (let i = 0; i < 4; i++) {
      const cap = capArea(g);
      if (cap < ref * 1.001 && cap > ref * 0.2) break;
      b = i === 3 ? 0 : b * 0.5;
      g.dispose();
      g = build(b);
      if (b === 0) console.warn('[attachments] extrude(): bevel disabled for a profile with corner radii smaller than the bevel');
    }
  }
  g.translate(0, 0, b - length / 2);
  scaleUV(g, 1 / uvTile);
  g.scale(MM, MM, MM);
  return g;
}

/** Area of a shape (outer − holes) from its extracted points, same units as the shape. */
export function shapeArea(shape, curveSegments = 10) {
  const poly = (pts) => {
    let a = 0;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const q = pts[(i + 1) % pts.length];
      a += p.x * q.y - q.x * p.y;
    }
    return Math.abs(a) * 0.5;
  };
  const pts = shape.extractPoints(curveSegments);
  return poly(pts.shape) - pts.holes.reduce((s, h) => s + poly(h), 0);
}

/** Summed area of the triangles lying on the min-z cap of a (non-indexed) extrusion. */
function capArea(g) {
  const p = g.attributes.position;
  let zmin = Infinity;
  for (let i = 0; i < p.count; i++) zmin = Math.min(zmin, p.getZ(i));
  let a = 0;
  for (let i = 0; i + 2 < p.count; i += 3) {
    if (Math.abs(p.getZ(i) - zmin) > 1e-7 || Math.abs(p.getZ(i + 1) - zmin) > 1e-7 || Math.abs(p.getZ(i + 2) - zmin) > 1e-7) continue;
    const ax = p.getX(i + 1) - p.getX(i);
    const ay = p.getY(i + 1) - p.getY(i);
    const bx = p.getX(i + 2) - p.getX(i);
    const by = p.getY(i + 2) - p.getY(i);
    a += Math.abs(ax * by - ay * bx) * 0.5;
  }
  return a;
}

/** Flat shape (mm) in the XY plane facing +Z. */
export function flatShape(shape, curveSegments = 12) {
  const g = new THREE.ShapeGeometry(shape, curveSegments);
  g.scale(MM, MM, MM);
  return g;
}

/** Plane (mm) facing +Z with optional UV sub-rectangle [u0, v0, u1, v1]. */
export function plane(w, h, uv = null) {
  const g = new THREE.PlaneGeometry(w * MM, h * MM);
  if (uv) {
    const a = g.attributes.uv;
    for (let i = 0; i < a.count; i++) {
      a.setXY(i, THREE.MathUtils.lerp(uv[0], uv[2], a.getX(i)), THREE.MathUtils.lerp(uv[1], uv[3], a.getY(i)));
    }
  }
  return g;
}

export function scaleUV(g, s) {
  const a = g.attributes.uv;
  if (!a) return g;
  for (let i = 0; i < a.count; i++) a.setXY(i, a.getX(i) * s, a.getY(i) * s);
  return g;
}

/**
 * Bake "edge wear" into a colour attribute: vertices whose normal is not axis-aligned (bevels, fillets)
 * get a lighter tint so worn anodising catches the light. Returns the geometry.
 *
 * This normal heuristic is only a placeholder: it also fires on every curved surface (cylinders, the holo's
 * arched hood). The load-time bake (aoBake.js) rewrites the tint from real geometry — per-triangle distance to
 * the nearest sharp convex edge, gated by exposure (AO) — using the per-part `amount` stored in `aGunWearAmt`.
 */
export function bakeEdgeWear(geo, amount = 0.45, lo = 0.05, hi = 0.3) {
  const n = geo.attributes.normal;
  const col = new Float32Array(n.count * 3);
  const amt = new Float32Array(n.count).fill(amount);
  for (let i = 0; i < n.count; i++) {
    const edge = 1 - Math.max(Math.abs(n.getX(i)), Math.abs(n.getY(i)), Math.abs(n.getZ(i)));
    const c = 1 + amount * THREE.MathUtils.smoothstep(edge, lo, hi);
    col[i * 3] = c;
    col[i * 3 + 1] = c;
    col[i * 3 + 2] = c;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('aGunWearAmt', new THREE.BufferAttribute(amt, 1));
  return geo;
}

/** Ribbon (flat strap with thickness) swept along a curve (metres). Wide face normal ≈ ±refAxis. */
export function ribbon(curve, width, thickness, segments = 80, refAxis = new THREE.Vector3(1, 0, 0)) {
  const pts = curve.getSpacedPoints(segments);
  const hw = width / 2;
  const ht = thickness / 2;
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];
  const t = new THREE.Vector3();
  const w = new THREE.Vector3();
  const nrm = new THREE.Vector3();
  const corners = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ];
  let length = 0;
  for (let i = 0; i <= segments; i++) {
    const p = pts[i];
    if (i > 0) length += p.distanceTo(pts[i - 1]);
    if (i < segments) t.subVectors(pts[i + 1], p);
    else t.subVectors(p, pts[i - 1]);
    t.normalize();
    w.crossVectors(t, refAxis);
    if (w.lengthSq() < 1e-6) w.crossVectors(t, new THREE.Vector3(0, 1, 0));
    w.normalize();
    nrm.crossVectors(w, t).normalize();
    // four sides, each with its own vertices (hard edges)
    for (let side = 0; side < 4; side++) {
      const c0 = corners[side];
      const c1 = corners[(side + 1) % 4];
      const sn = side % 2 === 0 ? nrm.clone().multiplyScalar(c0[1]) : w.clone().multiplyScalar(c0[0]);
      for (const c of [c0, c1]) {
        positions.push(p.x + w.x * c[0] * hw + nrm.x * c[1] * ht, p.y + w.y * c[0] * hw + nrm.y * c[1] * ht, p.z + w.z * c[0] * hw + nrm.z * c[1] * ht);
        normals.push(sn.x, sn.y, sn.z);
        uvs.push(length / width, c === c0 ? 0 : 1);
      }
    }
  }
  for (let i = 0; i < segments; i++) {
    for (let side = 0; side < 4; side++) {
      const a = i * 8 + side * 2;
      const b = a + 1;
      const c = a + 8;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(indices);
  return g;
}

/** Frame (position, tangent, width dir, face normal) at parameter u of a curve — for placing buckles etc. */
export function curveFrame(curve, u, refAxis = new THREE.Vector3(1, 0, 0)) {
  const p = curve.getPointAt(u);
  const t = curve.getTangentAt(u).normalize();
  const w = new THREE.Vector3().crossVectors(t, refAxis).normalize();
  const n = new THREE.Vector3().crossVectors(w, t).normalize();
  const m = new THREE.Matrix4().makeBasis(n, t, w); // local x = face normal, y = along strap, z = across
  m.setPosition(p);
  return { position: p, tangent: t, width: w, normal: n, matrix: m };
}

/* ------------------------------------------------------------------------------------ builder */

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();

/** Collects geometries per material and merges them into one mesh per material. */
export class PartsBuilder {
  constructor(name = 'Parts') {
    this.name = name;
    this.byMat = new Map();
    this.meshes = [];
  }

  /**
   * Add `geo` (metres) transformed by pos (mm), rot (Euler radians) or quat, scale. `wear` bakes edge
   * lightening (only meaningful for boxy/extruded parts); the material must use vertexColors.
   */
  add(geo, material, { pos = null, rot = null, quat = null, scale = null, matrix = null, wear = null } = {}) {
    if (matrix) {
      _m.copy(matrix);
    } else {
      _p.set(0, 0, 0);
      if (pos) _p.set(pos[0] * MM, pos[1] * MM, pos[2] * MM);
      _q.identity();
      if (rot) _q.setFromEuler(_e.set(rot[0], rot[1], rot[2]));
      if (quat) _q.copy(quat);
      _s.set(1, 1, 1);
      if (scale) _s.set(scale[0], scale[1], scale[2]);
      _m.compose(_p, _q, _s);
    }
    geo.applyMatrix4(_m);
    if (wear != null && wear > 0) bakeEdgeWear(geo, wear);
    if (!this.byMat.has(material)) this.byMat.set(material, []);
    this.byMat.get(material).push(geo);
    return geo;
  }

  build(parent, { castShadow = true } = {}) {
    for (const [mat, geos] of this.byMat) {
      const prepared = geos.map((g) => {
        const ng = g.index ? g.toNonIndexed() : g;
        for (const key of Object.keys(ng.attributes)) {
          if (key !== 'position' && key !== 'normal' && key !== 'uv' && key !== 'color' && key !== 'aGunWearAmt') ng.deleteAttribute(key);
        }
        if (mat.vertexColors) {
          if (!ng.attributes.color) {
            const c = new Float32Array(ng.attributes.position.count * 3).fill(1);
            ng.setAttribute('color', new THREE.BufferAttribute(c, 3));
          }
          if (!ng.attributes.aGunWearAmt) {
            ng.setAttribute('aGunWearAmt', new THREE.BufferAttribute(new Float32Array(ng.attributes.position.count), 1));
          }
        } else {
          if (ng.attributes.color) ng.deleteAttribute('color');
          if (ng.attributes.aGunWearAmt) ng.deleteAttribute('aGunWearAmt');
        }
        if (!ng.attributes.uv) {
          ng.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(ng.attributes.position.count * 2), 2));
        }
        return ng;
      });
      const merged = prepared.length === 1 ? prepared[0] : mergeGeometries(prepared, false);
      if (!merged) {
        console.warn('[attachments] merge failed for', mat.name);
        continue;
      }
      merged.computeBoundingSphere();
      const mesh = new THREE.Mesh(merged, mat);
      mesh.name = `${this.name}_${mat.name}`;
      mesh.castShadow = castShadow;
      mesh.receiveShadow = true;
      parent.add(mesh);
      this.meshes.push(mesh);
    }
    return this.meshes;
  }
}

/** Force a mesh to never cast shadows even if a later traversal sets castShadow = true (glass, reticle). */
export function neverCastShadow(mesh) {
  Object.defineProperty(mesh, 'castShadow', { get: () => false, set: () => {}, configurable: true });
  return mesh;
}

/* ----------------------------------------------------------------------------------- materials */

/** Clone of the shared grain normal texture with its own repeat. */
export function grainNormal(game, repeat = 6) {
  const t = getDetailTexture(game).clone();
  t.repeat.set(repeat, repeat);
  t.needsUpdate = true;
  return t;
}

/**
 * Matte hard-anodised aluminium (holo housing, sight bodies, PEQ): near-black, low metalness (a dielectric
 * oxide layer over the metal), fine grain, mottled roughness, worn to a lighter grey along bevels. The bevel
 * vertex tint from bakeEdgeWear() is turned into real wear by the shared surface hook.
 */
export function anodisedMaterial(game, { color = 0x2b2b2a, roughness = 0.65, metalness = 0.1, name = 'anodised', wear = 0.75, grain = 0.35, repeat = 6 } = {}) {
  const m = new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness,
    normalMap: grainNormal(game, repeat),
    normalScale: new THREE.Vector2(grain, grain),
    envMapIntensity: 0.28,
    vertexColors: true,
  });
  m.name = name;
  applyGunDetail(m, game, {
    objectUv: true,
    grainRepeat: 14,
    grainScale: 0.3,
    macroRepeat: 1.0,
    surfRepeat: 1.0,
    roughVar: 0.55,
    toneVar: 0.16,
    edgeWear: wear,
    cavity: 0.7,
    aoDirect: 0.5,
    scratch: 0.35,
    wearColor: [0.13, 0.13, 0.135],
    wearRough: 0.34,
    wearMetal: 0.7,
  });
  return m;
}

/** Matte textured polymer (grip shells, buttons). */
export function polymerMaterial(game, { color = 0x232322, roughness = 0.82, name = 'polymer', repeat = 5, grain = 0.6 } = {}) {
  const m = new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness: 0.0,
    normalMap: grainNormal(game, repeat),
    normalScale: new THREE.Vector2(grain, grain),
    envMapIntensity: 0.6,
    vertexColors: true,
  });
  m.name = name;
  applyGunDetail(m, game, {
    objectUv: true,
    grainRepeat: 20,
    grainScale: 0.45,
    macroRepeat: 1.0,
    surfRepeat: 1.0,
    roughVar: 0.35,
    toneVar: 0.1,
    edgeWear: 0.3,
    cavity: 0.6,
    aoDirect: 0.5,
    scratch: 0.3,
    wearColor: [0.09, 0.09, 0.088], // polished polymer: lighter, glossier, never metallic
    wearRough: 0.5,
    wearMetal: 0.0,
  });
  return m;
}

/** Black-oxide steel hardware (bolts, screws, pins): dark with bright, tight highlights. */
export function steelMaterial(game, { color = 0x555860, roughness = 0.4, metalness = 0.9, name = 'steel' } = {}) {
  const m = new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness,
    normalMap: grainNormal(game, 4),
    normalScale: new THREE.Vector2(0.25, 0.25),
    envMapIntensity: 0.8,
    vertexColors: true,
  });
  m.name = name;
  applyGunDetail(m, game, {
    objectUv: true,
    grainRepeat: 14,
    grainScale: 0.2,
    macroRepeat: 1.0,
    surfRepeat: 1.0,
    roughVar: 0.5,
    toneVar: 0.08,
    edgeWear: 0.5,
    cavity: 0.5,
    aoDirect: 0.5,
    scratch: 0.4,
    wearColor: [0.5, 0.5, 0.52],
    wearRough: 0.3,
    wearMetal: 1.0,
  });
  return m;
}

/** Soft black rubber (button caps, pressure pads). */
export function rubberMaterial(game, { color = 0x161617, name = 'rubber' } = {}) {
  const m = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.9,
    metalness: 0.0,
    normalMap: grainNormal(game, 3),
    normalScale: new THREE.Vector2(0.45, 0.45),
    envMapIntensity: 0.5,
    vertexColors: true,
  });
  m.name = name;
  applyGunDetail(m, game, { objectUv: true, grainRepeat: 12, grainScale: 0.4, macroRepeat: 1.0, surfRepeat: 1.0, roughVar: 0.2, toneVar: 0.08, edgeWear: 0.25, cavity: 0.5, aoDirect: 0.5, scratch: 0.15, wearColor: [0.06, 0.06, 0.06], wearRough: 0.55, wearMetal: 0.0 });
  return m;
}

/** Dark glass-fibre / matte interior black (hood interior, lens barrels). */
export function matteBlackMaterial(game, { name = 'matteBlack' } = {}) {
  const m = new THREE.MeshStandardMaterial({
    color: 0x0b0b0c,
    roughness: 0.95,
    metalness: 0.0,
    normalMap: grainNormal(game, 3),
    normalScale: new THREE.Vector2(0.2, 0.2),
    envMapIntensity: 0.3,
    vertexColors: true,
  });
  m.name = name;
  applyGunDetail(m, game, { objectUv: true, grainRepeat: 14, grainScale: 0.2, macroRepeat: 1.0, surfRepeat: 1.0, roughVar: 0.1, toneVar: 0.05, edgeWear: 0.0, cavity: 0.3, aoDirect: 0.5, scratch: 0.0 });
  return m;
}

/**
 * Optical glass: physically layered blend (specular added on top, background attenuated by alpha, faint
 * coating tint) so it reads as clear coated glass instead of a grey sheet. Custom blending = premultiplied.
 */
export function glassMaterial(game, { opacity = 0.1, tint = [0.1, 0.27, 0.28], name = 'holoGlass' } = {}) {
  const m = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(tint[0], tint[1], tint[2]),
    roughness: 0.05,
    metalness: 0.0,
    transparent: true,
    opacity,
    side: THREE.DoubleSide,
    depthWrite: false,
    envMapIntensity: 0.85,
    ior: 1.52,
    specularIntensity: 0.9,
    specularColor: new THREE.Color(0.8, 0.95, 1.0),
    iridescence: 0.12,
    iridescenceIOR: 1.35,
    iridescenceThicknessRange: [140, 380],
    blending: THREE.CustomBlending,
    blendEquation: THREE.AddEquation,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
    blendSrcAlpha: THREE.OneFactor,
    blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
  });
  m.name = name;
  m.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      'vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;',
      'vec3 outgoingLight = ( totalDiffuse + totalEmissiveRadiance ) * diffuseColor.a + totalSpecular;',
    );
  };
  m.customProgramCacheKey = () => 'holoGlass1';
  return m;
}

/** Nylon webbing (sling) with a procedural weave normal map. */
export function nylonMaterial(game, { color = 0x6b5d43, name = 'nylon' } = {}) {
  const m = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.96,
    metalness: 0.0,
    normalMap: weaveNormalTexture(game),
    normalScale: new THREE.Vector2(0.9, 0.9),
    envMapIntensity: 0.3,
    vertexColors: false,
  });
  m.name = name;
  // geometry UVs (the weave normal map must keep tiling along the strap); fill + baked AO like the hardware
  applyGunDetail(m, game, { grainScale: 0, macroRepeat: 0.4, surfRepeat: 0.5, roughVar: 0.25, toneVar: 0.12, edgeWear: 0, cavity: 0.5, aoDirect: 0.5, scratch: 0 });
  return m;
}

let _weave = null;
/** Tileable herringbone weave normal map (1 tile ≈ one strap width). */
export function weaveNormalTexture(game) {
  if (_weave) return _weave;
  const size = 128;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  const h = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const band = Math.floor((y / size) * 8); // 8 diagonal bands across the width
      const dir = band % 2 === 0 ? 1 : -1;
      const v = Math.sin(((x + dir * y) / size) * Math.PI * 2 * 12);
      const groove = Math.abs(((y / size) * 8) % 1 - 0.5) < 0.06 ? -0.6 : 0;
      h[y * size + x] = v * 0.5 + groove;
    }
  }
  const at = (x, y) => h[((y + size) % size) * size + ((x + size) % size)];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * 1.6;
      const dy = (at(x, y + 1) - at(x, y - 1)) * 1.6;
      const len = Math.hypot(dx, dy, 1);
      const o = (y * size + x) * 4;
      img.data[o] = Math.round((-dx / len * 0.5 + 0.5) * 255);
      img.data[o + 1] = Math.round((dy / len * 0.5 + 0.5) * 255);
      img.data[o + 2] = Math.round((1 / len * 0.5 + 0.5) * 255);
      img.data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = game.assets.canvasTexture(c, { srgb: false, repeat: [1, 1] });
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  _weave = tex;
  return tex;
}

/* -------------------------------------------------------------------------------- label atlas */

/**
 * One canvas shared by all etched labels / decals; each label gets a UV rectangle and a plane geometry.
 * Text is drawn light-grey on a transparent background so the plane acts as a decal over the base material.
 */
export class LabelAtlas {
  constructor(game, width = 1024, height = 512, pxPerMm = 8) {
    this.game = game;
    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx = this.canvas.getContext('2d');
    this.pxPerMm = pxPerMm;
    this.shelfY = 0;
    this.shelfH = 0;
    this.cursorX = 0;
    this.texture = null;
    this.material = null;
    this.opaqueMaterial = null;
  }

  /** Reserve a wMm × hMm region and call draw(ctx, x, y, wPx, hPx). Returns a UV rect [u0,v0,u1,v1]. */
  region(wMm, hMm, draw) {
    const pad = 4;
    const w = Math.ceil(wMm * this.pxPerMm);
    const h = Math.ceil(hMm * this.pxPerMm);
    if (this.cursorX + w + pad > this.canvas.width) {
      this.shelfY += this.shelfH + pad;
      this.shelfH = 0;
      this.cursorX = 0;
    }
    const x = this.cursorX;
    const y = this.shelfY;
    this.cursorX += w + pad;
    this.shelfH = Math.max(this.shelfH, h);
    if (y + h > this.canvas.height) console.warn('[attachments] label atlas full');
    const ctx = this.ctx;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.translate(x, y);
    draw(ctx, w, h, this.pxPerMm);
    ctx.restore();
    const W = this.canvas.width;
    const H = this.canvas.height;
    // inset by half a pixel so bilinear filtering never bleeds the neighbouring region
    return [(x + 0.5) / W, 1 - (y + h - 0.5) / H, (x + w - 0.5) / W, 1 - (y + 0.5) / H];
  }

  /**
   * Etched text label: returns a plane geometry (mm, facing +Z) carrying the text.
   * opts: font (px at pxPerMm scale is handled: size in mm), color, align, weight, bg (optional fill).
   */
  text(wMm, hMm, lines, { size = 2.2, color = '#b9bcc0', weight = 'bold', family = 'Arial, Helvetica, sans-serif', bg = null, align = 'center', letterSpacing = 0 } = {}) {
    const uv = this.region(wMm, hMm, (ctx, w, h, ppm) => {
      if (bg) {
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, w, h);
      }
      const arr = Array.isArray(lines) ? lines : [lines];
      ctx.fillStyle = color;
      ctx.textBaseline = 'middle';
      ctx.textAlign = align;
      const px = size * ppm;
      ctx.font = `${weight} ${px}px ${family}`;
      if (letterSpacing && 'letterSpacing' in ctx) ctx.letterSpacing = `${letterSpacing * ppm}px`;
      const lineH = px * 1.15;
      const total = lineH * arr.length;
      const x = align === 'center' ? w / 2 : align === 'left' ? px * 0.25 : w - px * 0.25;
      arr.forEach((t, i) => ctx.fillText(t, x, h / 2 - total / 2 + lineH * (i + 0.5)));
    });
    return plane(wMm, hMm, uv);
  }

  /** Arbitrary decal: draw(ctx, wPx, hPx, pxPerMm). */
  decal(wMm, hMm, draw) {
    return plane(wMm, hMm, this.region(wMm, hMm, draw));
  }

  /** Finalise the texture and the decal materials (call once after all regions are drawn). */
  finish({ roughness = 0.55, metalness = 0.25 } = {}) {
    if (this.texture) return this;
    const tex = this.game.assets.canvasTexture(this.canvas, { srgb: true });
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.needsUpdate = true;
    this.texture = tex;
    this.material = new THREE.MeshStandardMaterial({
      map: tex,
      transparent: true,
      depthWrite: false,
      roughness,
      metalness,
      envMapIntensity: 0.3,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -2,
    });
    this.material.name = 'labels';
    // same view-model fill / macro roughness as the surfaces the decals sit on (no wear, no scratches)
    applyGunDetail(this.material, this.game, { objectUv: true, grainScale: 0, roughVar: 0.25, toneVar: 0, edgeWear: 0, cavity: 0.3, aoDirect: 0, scratch: 0 });
    return this;
  }
}
