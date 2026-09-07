import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';

// ---------------------------------------------------------------------------
// Geometry helpers shared by every kit-bashed asset.
//
// Rule of thumb for the whole project: nothing gets a hard 90 degree edge.
// Real objects have a 1-3mm chamfer that catches a highlight, and that single
// highlight is most of the difference between "render" and "photo".
// ---------------------------------------------------------------------------

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _v = new THREE.Vector3();

/** Chamfered box. Radius is clamped so thin plates still work. */
export function rbox(w, h, d, r = 0.02, seg = 2) {
  const rr = Math.max(0.0015, Math.min(r, Math.min(w, h, d) * 0.49));
  return new RoundedBoxGeometry(w, h, d, seg, rr);
}

/** Cylinder with the ends chamfered by a torus-free trick (cheap bevel). */
export function cyl(rTop, rBottom, h, radial = 20, opts = {}) {
  const g = new THREE.CylinderGeometry(rTop, rBottom, h, radial, opts.heightSeg || 1, opts.open || false);
  return g;
}

/** Hex-head bolt, merged in bulk for greebling. */
export function bolt(r = 0.012, h = 0.01) {
  const head = new THREE.CylinderGeometry(r, r * 1.05, h, 6);
  head.translate(0, h * 0.5, 0);
  const dome = new THREE.SphereGeometry(r * 0.94, 6, 3, 0, Math.PI * 2, 0, Math.PI * 0.5);
  dome.scale(1, 0.35, 1);
  dome.translate(0, h, 0);
  return BufferGeometryUtils.mergeGeometries([head, dome]);
}

/** Flat Phillips-ish screw / rivet dome. */
export function rivet(r = 0.01, h = 0.005) {
  const g = new THREE.SphereGeometry(r, 8, 4, 0, Math.PI * 2, 0, Math.PI * 0.5);
  g.scale(1, h / r, 1);
  return g;
}

/**
 * Extrude a 2D profile (array of [x,y]) along Z with a bevel.
 * Used for fender flares, bumper sections, dash mouldings.
 */
export function profile(points, depth, { bevel = 0.012, steps = 1, curveSegments = 8, close = true } = {}) {
  const shape = new THREE.Shape();
  shape.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) shape.lineTo(points[i][0], points[i][1]);
  if (close) shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, {
    depth,
    steps,
    curveSegments,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
  });
  g.translate(0, 0, -depth * 0.5);
  return g;
}

/** Smooth pipe / conduit / roll-bar tube through a list of points. */
export function tube(points, radius = 0.03, radial = 10, tension = 0.4) {
  const curve = new THREE.CatmullRomCurve3(
    points.map((p) => (p.isVector3 ? p : new THREE.Vector3(p[0], p[1], p[2]))),
    false,
    'catmullrom',
    tension,
  );
  const seg = Math.max(12, Math.round(curve.getLength() * 14));
  return new THREE.TubeGeometry(curve, seg, radius, radial, false);
}

/** Torus section, for bent tubing corners and grab handles. */
export function bend(radius, tubeR, arc = Math.PI / 2, seg = 12) {
  return new THREE.TorusGeometry(radius, tubeR, 8, seg, arc);
}

export function transform(geo, { pos, rot, scale, quat } = {}) {
  _m.identity();
  const q = quat || (rot ? _q.setFromEuler(_e.set(rot[0] || 0, rot[1] || 0, rot[2] || 0)) : _q.identity());
  const p = pos ? _v.set(pos[0], pos[1], pos[2]) : _v.set(0, 0, 0);
  const s = scale
    ? Array.isArray(scale)
      ? new THREE.Vector3(scale[0], scale[1], scale[2])
      : new THREE.Vector3(scale, scale, scale)
    : new THREE.Vector3(1, 1, 1);
  _m.compose(p, q, s);
  geo.applyMatrix4(_m);
  return geo;
}

/**
 * Accumulates geometry per material key and emits one merged mesh per key.
 * Keeps hundreds of bolts and greebles at a handful of draw calls.
 */
export class Kit {
  constructor(name = 'kit') {
    this.name = name;
    this.buckets = new Map();
  }

  /** add(materialKey, geometry, { pos, rot, scale }) — geometry is cloned. */
  add(key, geo, xform) {
    const g = xform ? transform(geo.clone(), xform) : geo.clone();
    if (!this.buckets.has(key)) this.buckets.set(key, []);
    this.buckets.get(key).push(g);
    return this;
  }

  /** Mirror the same geometry to +X and -X. */
  addMirrored(key, geo, xform = {}) {
    this.add(key, geo, xform);
    const pos = xform.pos ? [-xform.pos[0], xform.pos[1], xform.pos[2]] : [0, 0, 0];
    const rot = xform.rot ? [xform.rot[0], -xform.rot[1], -xform.rot[2]] : undefined;
    const sc = xform.scale
      ? Array.isArray(xform.scale)
        ? [-xform.scale[0], xform.scale[1], xform.scale[2]]
        : [-xform.scale, xform.scale, xform.scale]
      : [-1, 1, 1];
    this.add(key, geo, { ...xform, pos, rot, scale: sc });
    return this;
  }

  build(materials, { castShadow = true, receiveShadow = true, group = new THREE.Group() } = {}) {
    group.name = this.name;
    for (const [key, list] of this.buckets) {
      const mat = materials[key];
      if (!mat) {
        console.warn(`[Kit ${this.name}] missing material "${key}"`);
        continue;
      }
      const geos = list.map((g) => {
        const c = g.clone();
        // merging requires a consistent attribute set
        if (!c.attributes.uv) {
          const count = c.attributes.position.count;
          c.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(count * 2), 2));
        }
        if (c.attributes.uv1) c.deleteAttribute('uv1');
        if (c.attributes.uv2) c.deleteAttribute('uv2');
        return c.index ? c.toNonIndexed() : c;
      });

      this.emit(group, key, mat, geos, {
        castShadow,
        receiveShadow,
        finish: (g) => g.computeVertexNormals(),
      });
    }
    return group;
  }

  /**
   * Turn one material bucket into meshes. Shared by the subclasses in
   * `body.js` and `details.js`, which differ only in how they prepare geometry.
   *
   * A material flagged `userData.sortPieces` gets one mesh per piece instead of
   * one merged mesh. That is for overlapping transparent panes: there is no
   * sorting *inside* a mesh, so merged glass blends in whatever order the
   * triangles happen to sit in the buffer.
   *
   * Splitting alone is not enough. Three sorts transparent objects by the
   * object's origin, not by its geometry, and these kits bake every placement
   * into the vertices — so every split pane would share the truck's origin,
   * tie, and sort arbitrarily again. Each piece is therefore moved onto its own
   * origin with the offset put on the mesh.
   */
  emit(group, key, mat, geos, { castShadow = true, receiveShadow = true, finish, prefix = this.name } = {}) {
    const make = (geo, name, recentre) => {
      if (finish) finish(geo, key);
      const mesh = new THREE.Mesh(geo, mat);
      if (recentre) {
        geo.computeBoundingSphere();
        // Copy, not reference. `boundingSphere.center` is the same Vector3 the
        // recompute below writes into, so holding a reference to it and then
        // recomputing read back as zero — and every sorted pane on the truck
        // rendered at its origin, inside the chassis, for a whole iteration.
        // The windscreen the game shipped with was the interior dust film.
        const c = geo.boundingSphere ? geo.boundingSphere.center.clone() : null;
        if (c) {
          geo.translate(-c.x, -c.y, -c.z);
          geo.computeBoundingSphere();
          mesh.position.copy(c);
        }
      }
      mesh.name = name;
      mesh.castShadow = castShadow;
      mesh.receiveShadow = receiveShadow;
      group.add(mesh);
    };

    if (mat.userData?.sortPieces) {
      for (let i = 0; i < geos.length; i++) make(geos[i], `${prefix}_${key}_${i}`, true);
      return;
    }
    const merged = BufferGeometryUtils.mergeGeometries(geos, false);
    if (!merged) {
      console.warn(`[Kit ${this.name}] merge failed for "${key}"`);
      return;
    }
    make(merged, `${prefix}_${key}`, false);
  }
}

/** Box UVs projected from the dominant axis, so tiling textures do not smear. */
export function boxUV(geo, scale = 1, offset = [0, 0]) {
  geo.computeVertexNormals();
  const pos = geo.attributes.position;
  const nor = geo.attributes.normal;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const nx = Math.abs(nor.getX(i));
    const ny = Math.abs(nor.getY(i));
    const nz = Math.abs(nor.getZ(i));
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    let u;
    let v;
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
    uv[i * 2] = u * scale + offset[0];
    uv[i * 2 + 1] = v * scale + offset[1];
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geo;
}

/** Cylindrical UVs around Y, used for tyres and trunks. */
export function cylUV(geo, repeatU = 1, repeatV = 1) {
  const pos = geo.attributes.position;
  const uv = new Float32Array(pos.count * 2);
  geo.computeBoundingBox();
  const bb = geo.boundingBox;
  const hy = bb.max.y - bb.min.y || 1;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    uv[i * 2] = ((Math.atan2(z, x) / (Math.PI * 2)) + 0.5) * repeatU;
    uv[i * 2 + 1] = ((y - bb.min.y) / hy) * repeatV;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geo;
}

export { BufferGeometryUtils };
