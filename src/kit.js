// Kit-bash helper: accumulates primitive geometry per material, assigns vertex colors and
// consistent texel density UVs, then merges into one mesh per material (few draw calls).
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _v = new THREE.Vector3();
const _n = new THREE.Vector3();

export class Kit {
  constructor(materials) {
    this.materials = materials;
    this.groups = new Map();
    this.colliders = [];
    this.meshes = [];
  }

  /**
   * Add a geometry.
   * @param {string} mat material key
   * @param {THREE.BufferGeometry} geo geometry (consumed)
   * @param {object} opts { pos:[x,y,z], rot:[rx,ry,rz] | quat, scale, color: THREE.Color|number, uv:'world'|'keep'|'scale', uvScale:[su,sv], texel: number }
   */
  add(mat, geo, opts = {}) {
    const { pos = [0, 0, 0], rot = null, quat = null, color = 0xffffff, uv = "world", texel = 1.0, uvScale = null, uvRect = null } = opts;
    if (quat) _q.copy(quat);
    else if (rot) _q.setFromEuler(new THREE.Euler(rot[0], rot[1], rot[2]));
    else _q.identity();
    _m.compose(_v.set(pos[0], pos[1], pos[2]), _q, _n.set(1, 1, 1));
    geo.applyMatrix4(_m);
    if (geo.index) geo = geo.toNonIndexed();
    if (uv === "world") worldUVs(geo, texel);
    else if (uv === "scale" && uvScale) scaleUVs(geo, uvScale[0], uvScale[1]);
    if (uvRect) rectUVs(geo, uvRect);
    setVertexColor(geo, color);
    // drop attributes that would break merging
    for (const key of Object.keys(geo.attributes)) {
      if (!["position", "normal", "uv", "color"].includes(key)) geo.deleteAttribute(key);
    }
    if (!geo.attributes.normal) geo.computeVertexNormals();
    if (!this.groups.has(mat)) this.groups.set(mat, []);
    this.groups.get(mat).push(geo);
    return geo;
  }

  // Axis-aligned box convenience: center + size
  box(mat, cx, cy, cz, sx, sy, sz, opts = {}) {
    return this.add(mat, new THREE.BoxGeometry(sx, sy, sz), { pos: [cx, cy, cz], ...opts });
  }

  // Box from min/max corners
  boxMM(mat, min, max, opts = {}) {
    const sx = max[0] - min[0];
    const sy = max[1] - min[1];
    const sz = max[2] - min[2];
    return this.box(mat, min[0] + sx / 2, min[1] + sy / 2, min[2] + sz / 2, sx, sy, sz, opts);
  }

  // Cylinder along an axis. axis: 'x'|'y'|'z'
  cyl(mat, cx, cy, cz, r, len, axis = "y", opts = {}) {
    const g = new THREE.CylinderGeometry(r, r, len, opts.segments || 12, 1, opts.open || false);
    const rot = axis === "x" ? [0, 0, Math.PI / 2] : axis === "z" ? [Math.PI / 2, 0, 0] : [0, 0, 0];
    const circ = 2 * Math.PI * r;
    const texel = opts.texel || 1;
    return this.add(mat, g, { pos: [cx, cy, cz], rot, uv: "scale", uvScale: [circ * texel, len * texel], ...opts, rot: opts.rot || rot });
  }

  collider(min, max, tag = "") {
    const c = { min: new THREE.Vector3(...min), max: new THREE.Vector3(...max), tag };
    this.colliders.push(c);
    return c;
  }

  // Register a ready-made Object3D (dynamic / animated / instanced) to be parented at build time.
  object(obj) {
    if (!this.objects) this.objects = [];
    this.objects.push(obj);
    return obj;
  }

  /**
   * Instanced copies of one geometry: transforms is an array of { pos, rot | quat, scale, color }.
   * One draw call regardless of count. Returns the InstancedMesh (added at build()).
   */
  instanced(mat, geo, transforms, opts = {}) {
    const material = this.materials[mat];
    if (!material) throw new Error("Unknown material " + mat);
    if (opts.uv === "world") worldUVs(geo, opts.texel || 1);
    else if (opts.uv === "scale" && opts.uvScale) scaleUVs(geo, opts.uvScale[0], opts.uvScale[1]);
    if (!geo.attributes.normal) geo.computeVertexNormals();
    // instanced meshes can't use per-vertex colour attributes from the merge path; give them a
    // uniform white vertex colour so materials with vertexColors:true still shade correctly
    if (material.vertexColors && !geo.attributes.color) setVertexColor(geo, 0xffffff);
    const mesh = new THREE.InstancedMesh(geo, material, transforms.length);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const p = new THREE.Vector3();
    const s = new THREE.Vector3();
    const col = new THREE.Color();
    let hasColor = false;
    transforms.forEach((t, i) => {
      p.set(...(t.pos || [0, 0, 0]));
      if (t.quat) q.copy(t.quat);
      else if (t.rot) q.setFromEuler(new THREE.Euler(t.rot[0], t.rot[1], t.rot[2]));
      else q.identity();
      const sc = t.scale === undefined ? 1 : t.scale;
      if (Array.isArray(sc)) s.set(sc[0], sc[1], sc[2]);
      else s.setScalar(sc);
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
      if (t.color !== undefined) {
        hasColor = true;
        mesh.setColorAt(i, col.set(t.color));
      }
    });
    if (hasColor && mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.instanceMatrix.needsUpdate = true;
    mesh.name = "inst_" + mat;
    mesh.castShadow = opts.castShadow !== false;
    mesh.receiveShadow = opts.receiveShadow !== false;
    mesh.frustumCulled = opts.frustumCulled !== false;
    mesh.computeBoundingSphere();
    return this.object(mesh);
  }

  build(parent, { castShadow = true, receiveShadow = true, noShadow = null } = {}) {
    const skipShadow = (key) => (noShadow ? noShadow.has(key) : key.startsWith("emit") || key === "glass" || key === "decal" || key === "grate");
    for (const [key, geos] of this.groups) {
      const merged = mergeGeometries(geos, false);
      if (!merged) continue;
      merged.computeBoundingSphere();
      merged.computeBoundingBox();
      const material = this.materials[key];
      if (!material) throw new Error("Unknown material " + key);
      const mesh = new THREE.Mesh(merged, material);
      mesh.name = "kit_" + key;
      mesh.castShadow = castShadow && !skipShadow(key);
      mesh.receiveShadow = receiveShadow && key !== "glass" && key !== "decal" && key !== "impDecal";
      parent.add(mesh);
      this.meshes.push(mesh);
    }
    if (this.objects) {
      for (const o of this.objects) {
        parent.add(o);
        this.meshes.push(o);
      }
      this.objects = null;
    }
    this.groups.clear();
    return this.meshes;
  }
}

// ---------------------------------------------------------------------------
// Lofted hull geometry: stations are { z, points: [[x, y], ...] } with the same point count, listed
// counter-clockwise as seen from +Z (looking toward -Z), z increasing station to station. Consecutive
// stations are joined by quads with outward normals; optional caps close the ends.
// Output is non-indexed with flat face normals (hard-edged armour facets).
// ---------------------------------------------------------------------------
export function loft(stations, { capStart = false, capEnd = false, flip = false, open = false } = {}) {
  const n = stations[0].points.length;
  const pos = [];
  const push = (a, b, c) => {
    if (flip) pos.push(...a, ...c, ...b);
    else pos.push(...a, ...b, ...c);
  };
  const P = (s, i) => {
    const p = s.points[((i % n) + n) % n];
    return [p[0], p[1], s.z];
  };
  const segs = open ? n - 1 : n;
  for (let k = 0; k < stations.length - 1; k++) {
    const a = stations[k];
    const b = stations[k + 1];
    for (let i = 0; i < segs; i++) {
      const a0 = P(a, i);
      const a1 = P(a, i + 1);
      const b0 = P(b, i);
      const b1 = P(b, i + 1);
      push(a0, b1, b0);
      push(a0, a1, b1);
    }
  }
  const cap = (s, towardMinusZ) => {
    const c = [0, 0, s.z];
    for (const p of s.points) {
      c[0] += p[0] / n;
      c[1] += p[1] / n;
    }
    for (let i = 0; i < n; i++) {
      const p0 = P(s, i);
      const p1 = P(s, i + 1);
      if (towardMinusZ) push(c, p1, p0);
      else push(c, p0, p1);
    }
  };
  if (capStart) cap(stations[0], true);
  if (capEnd) cap(stations[stations.length - 1], false);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.computeVertexNormals();
  return geo;
}

// Extrude a closed 2D outline ([[x,y],...]) along +Z by depth, centred on z = 0. Flat normals.
export function prism(outline, depth, { holes = [] } = {}) {
  const shape = new THREE.Shape(outline.map(([x, y]) => new THREE.Vector2(x, y)));
  for (const h of holes) shape.holes.push(new THREE.Path(h.map(([x, y]) => new THREE.Vector2(x, y))));
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
  geo.translate(0, 0, -depth / 2);
  return geo;
}

// Frustum-like box: bottom rectangle (bw x bd) to top rectangle (tw x td), height h, centred on the
// bottom face at the origin. Sloped-sided blocks are the basic vocabulary of the superstructure.
export function taperedBox(bw, bd, tw, td, h, { shearX = 0, shearZ = 0 } = {}) {
  const stations = [
    { z: -bd / 2, points: [[-bw / 2, 0], [bw / 2, 0], [tw / 2 + shearX, h], [-tw / 2 + shearX, h]] },
    { z: bd / 2, points: [[-bw / 2, 0], [bw / 2, 0], [tw / 2 + shearX, h], [-tw / 2 + shearX, h]] },
  ];
  // the loft runs along z; for a differing top depth build it as a generic 8-vertex hull instead
  if (Math.abs(td - bd) > 1e-6) {
    const g = new THREE.BufferGeometry();
    const v = [
      [-bw / 2, 0, -bd / 2],
      [bw / 2, 0, -bd / 2],
      [bw / 2, 0, bd / 2],
      [-bw / 2, 0, bd / 2],
      [-tw / 2 + shearX, h, -td / 2 + shearZ],
      [tw / 2 + shearX, h, -td / 2 + shearZ],
      [tw / 2 + shearX, h, td / 2 + shearZ],
      [-tw / 2 + shearX, h, td / 2 + shearZ],
    ];
    const faces = [
      [0, 1, 5, 4], // front (-z)
      [1, 2, 6, 5], // right
      [2, 3, 7, 6], // back
      [3, 0, 4, 7], // left
      [4, 5, 6, 7], // top
      [3, 2, 1, 0], // bottom
    ];
    const pos = [];
    for (const [a, b, c, d] of faces) {
      pos.push(...v[a], ...v[c], ...v[b], ...v[a], ...v[d], ...v[c]);
    }
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.computeVertexNormals();
    return g;
  }
  return loft(stations, { capStart: true, capEnd: true });
}

// World-space planar UVs picked by dominant normal axis => uniform texel density.
export function worldUVs(geo, texel = 1.0) {
  const pos = geo.attributes.position;
  const nor = geo.attributes.normal;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i),
      y = pos.getY(i),
      z = pos.getZ(i);
    const nx = Math.abs(nor.getX(i)),
      ny = Math.abs(nor.getY(i)),
      nz = Math.abs(nor.getZ(i));
    let u, v;
    if (nx >= ny && nx >= nz) {
      u = z;
      v = y;
    } else if (ny >= nx && ny >= nz) {
      u = x;
      v = z;
    } else {
      u = x;
      v = y;
    }
    uv[i * 2] = u * texel;
    uv[i * 2 + 1] = v * texel;
  }
  geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
}

export function scaleUVs(geo, su, sv) {
  const uv = geo.attributes.uv;
  if (!uv) return;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
}

// Remap shape-space UVs of a w×h plate centred on the origin (as ExtrudeGeometry emits them) to [0,1],
// so a per-panel texture (bevel, edge chips) lines up with the plate's edges.
export function fitUVs(geo, w, h) {
  const uv = geo.attributes.uv;
  if (!uv) return;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / w + 0.5, uv.getY(i) / h + 0.5);
}

// Remap [0,1] UVs into a sub-rectangle [u0, v0, u1, v1] of an atlas.
export function rectUVs(geo, [u0, v0, u1, v1]) {
  const uv = geo.attributes.uv;
  if (!uv) return;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, u0 + uv.getX(i) * (u1 - u0), v0 + uv.getY(i) * (v1 - v0));
}

// Turn a geometry inside out (flip winding + normals) so a tube reads from within.
export function insideOut(geo) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const attrs = ["position", "normal", "uv"].map((k) => g.attributes[k]).filter(Boolean);
  const count = g.attributes.position.count;
  for (let i = 0; i + 2 < count; i += 3) {
    for (const a of attrs) {
      for (let k = 0; k < a.itemSize; k++) {
        const t = a.getComponent(i + 1, k);
        a.setComponent(i + 1, k, a.getComponent(i + 2, k));
        a.setComponent(i + 2, k, t);
      }
    }
  }
  const n = g.attributes.normal;
  if (n) for (let i = 0; i < n.count; i++) n.setXYZ(i, -n.getX(i), -n.getY(i), -n.getZ(i));
  return g;
}

export function setVertexColor(geo, color) {
  const c = color instanceof THREE.Color ? color : new THREE.Color(color);
  const n = geo.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    arr[i * 3] = c.r;
    arr[i * 3 + 1] = c.g;
    arr[i * 3 + 2] = c.b;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(arr, 3));
}

// Rectangle with rectangular / circular holes, extruded along +Z (local), centred on origin in XY.
export function panelWithHoles(w, h, depth, holes) {
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2, -h / 2);
  shape.lineTo(w / 2, -h / 2);
  shape.lineTo(w / 2, h / 2);
  shape.lineTo(-w / 2, h / 2);
  shape.closePath();
  for (const hole of holes) {
    const p = new THREE.Path();
    if (hole.r !== undefined) {
      p.absarc(hole.x, hole.y, hole.r, 0, Math.PI * 2, true);
    } else {
      const { x, y, w: hw, h: hh } = hole;
      p.moveTo(x - hw / 2, y - hh / 2);
      p.lineTo(x - hw / 2, y + hh / 2);
      p.lineTo(x + hw / 2, y + hh / 2);
      p.lineTo(x + hw / 2, y - hh / 2);
      p.closePath();
    }
    shape.holes.push(p);
  }
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 24 });
  geo.translate(0, 0, -depth / 2);
  return geo;
}

// Simple seeded RNG for deterministic kit-bash variation
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
