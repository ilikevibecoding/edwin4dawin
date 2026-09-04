// Exterior hull skeleton: the lofted dagger hull (with the ventral hangar mouth), stern face,
// terraced superstructure, tower neck, bridge module with viewport cut-outs, shield domes, comms
// mast and engine bells. Everything reads from spec.js. Detail layers (plating seams, greebles,
// weapons, sensor arrays) are added by exterior/greebles.js, weapons.js and engines.js on top.
import * as THREE from "three";
import { Kit, panelWithHoles, prism } from "../kit.js";
import { PALETTE } from "../materials.js";
import { HULL, hullSection, hullTopY, hullBottomY, hullHalfWidth, TERRACES, terraceHalfWidth, TOWER, ENGINES, VENTRAL, HANGAR } from "../spec.js";

const HULL_TEXEL = 1 / 26; // one plating tile per 26 m

// Build quads between consecutive sections. sectionAt(z) -> array of {x, y, tag}; segments join point i
// to i+1. skip(tag, z0, z1) may return an x-interval to leave open (the hangar mouth).
function loft(kit, stations, sectionAt, matFor, { mirror = true, mouth = null } = {}) {
  const geosByMat = new Map();
  const push = (mat, a, b, c, d, color) => {
    // quad a-b-c-d (counter-clockwise seen from outside)
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array([a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z, a.x, a.y, a.z, c.x, c.y, c.z, d.x, d.y, d.z]);
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.computeVertexNormals();
    kit.add(mat, g, { uv: "world", texel: HULL_TEXEL, color });
  };
  for (let s = 0; s < stations.length - 1; s++) {
    const z0 = stations[s];
    const z1 = stations[s + 1];
    const A = sectionAt(z0);
    const B = sectionAt(z1);
    for (let i = 0; i < A.length - 1; i++) {
      const tag = A[i].tag;
      const { mat, color } = matFor(tag, z0);
      for (const side of mirror ? [1, -1] : [1]) {
        const P = (p, z) => new THREE.Vector3(p.x * side, p.y, z);
        let a0 = P(A[i], z0),
          a1 = P(A[i + 1], z0),
          b0 = P(B[i], z1),
          b1 = P(B[i + 1], z1);
        // hangar mouth: the bottom plate quad between the mouth's z-edges is cut at |x| = mouth.x1
        if (mouth && tag === "bottom" && z0 >= mouth.z0 - 1e-6 && z1 <= mouth.z1 + 1e-6) {
          const cut = mouth.x1;
          const inner = Math.min(Math.abs(a0.x), Math.abs(a1.x));
          const outer = Math.max(Math.abs(a0.x), Math.abs(a1.x));
          if (outer <= cut) continue; // wholly inside the mouth
          if (inner < cut) {
            // clamp the inner edge to the cut
            const fix = (p) => (Math.abs(p.x) < cut ? new THREE.Vector3(cut * side, p.y, p.z) : p);
            a0 = fix(a0);
            a1 = fix(a1);
            b0 = fix(b0);
            b1 = fix(b1);
          }
        }
        // winding: starboard side as given, port mirrored (flip order)
        if (side > 0) push(mat, a0, b0, b1, a1, color);
        else push(mat, a1, b1, b0, a0, color);
      }
    }
  }
}

export function buildExterior(scene, materials) {
  const group = new THREE.Group();
  group.name = "exterior";
  scene.add(group);
  const kit = new Kit(materials);
  kit.noShadowKeys.add("engineGlow");
  kit.noShadowKeys.add("glowDisc");

  // ---------------- main hull ----------------
  const stations = [];
  for (let z = HULL.zBow; z < HULL.zStern; z += 40) stations.push(z);
  stations.push(HULL.zStern);
  // exact stations at the hangar mouth edges so the opening is a clean cut
  for (const z of [HANGAR.opening.z0, HANGAR.opening.z1]) if (!stations.includes(z)) stations.push(z);
  stations.sort((a, b) => a - b);
  const matFor = (tag, z) => {
    switch (tag) {
      case "trenchWall":
      case "trenchFloor":
        return { mat: "hullGreeble", color: PALETTE.hullTrench };
      case "trenchLip":
        return { mat: "hullPlate1", color: PALETTE.hullDark };
      case "upperSlope":
      case "lowerSlope":
        return { mat: "hullPlate1", color: PALETTE.hullMid };
      case "bottom":
        return { mat: "hullPlate", color: PALETTE.hullMid };
      default:
        return { mat: "hullPlate", color: PALETTE.hullLight };
    }
  };
  loft(kit, stations, (z) => hullSection(Math.max(z, HULL.zBow + 0.5)), matFor, { mouth: { x1: HANGAR.opening.x1, z0: HANGAR.opening.z0, z1: HANGAR.opening.z1 } });
  // stern face: close the hull at z = zStern with the full section polygon
  {
    const sec = hullSection(HULL.zStern);
    const pts = [];
    for (const p of sec) pts.push([p.x, p.y]);
    for (let i = sec.length - 2; i >= 1; i--) pts.push([-sec[i].x, sec[i].y]);
    const g = prism(pts, 2);
    kit.add("hullPlate1", g, { pos: [0, 0, HULL.zStern - 1], color: PALETTE.hullDark, uv: "world", texel: HULL_TEXEL });
  }
  // hangar mouth well: walls from the hull skin up to the hangar floor (double-sided via two boxes)
  {
    const o = HANGAR.opening;
    const yF = HANGAR.floorY;
    const t = 0.6;
    for (const s of [-1, 1]) {
      const x = s > 0 ? o.x1 : o.x0;
      const yB = Math.min(hullBottomY(o.z0), hullBottomY(o.z1)) - 1;
      kit.boxMM("hullGreeble", [x - t / 2, yB, o.z0], [x + t / 2, yF, o.z1], { color: PALETTE.hullTrench, uv: "world", texel: 0.1 });
    }
    for (const z of [o.z0, o.z1]) {
      kit.boxMM("hullGreeble", [o.x0, hullBottomY(z) - 1, z - t / 2], [o.x1, yF, z + t / 2], { color: PALETTE.hullTrench, uv: "world", texel: 0.1 });
    }
    // approach lights along the mouth rim (white / red pairs)
    for (let z = o.z0 + 5; z < o.z1; z += 10) {
      for (const s of [-1, 1]) {
        const x = s * (o.x1 + 1.2);
        kit.box("extEmitWhite", x, hullBottomY(z) - 0.6, z, 1.2, 0.6, 1.2);
      }
    }
    for (const s of [-1, 1]) for (let x = o.x0 + 6; x < o.x1; x += 12) kit.box("extEmitRed", x, hullBottomY(s > 0 ? o.z1 : o.z0) - 0.6, s > 0 ? o.z1 + 1.2 : o.z0 - 1.2, 1.2, 0.6, 1.2);
  }

  // ---------------- superstructure terraces ----------------
  for (const t of TERRACES) {
    const st = [];
    for (let z = t.zFront; z < t.zBack; z += 40) st.push(z);
    st.push(t.zBack);
    const sec = (z) => {
      const yBase = hullTopY(z) - 0.5;
      const hwTop = terraceHalfWidth(t, z);
      const hwBase = hwTop + t.draft * (t.yTop - yBase);
      return [
        { x: 0, y: t.yTop, tag: "roof" },
        { x: hwTop, y: t.yTop, tag: "side" },
        { x: hwBase, y: yBase, tag: "side" },
      ];
    };
    loft(kit, st, sec, (tag) => (tag === "roof" ? { mat: "hullPlate", color: PALETTE.hullLight } : { mat: "hullPlate1", color: PALETTE.hullMid }));
    // front face (sloped back 20°) closing the terrace
    {
      const s0 = sec(t.zFront);
      const pts = [[s0[1].x, s0[1].y], [s0[2].x, s0[2].y], [-s0[2].x, s0[2].y], [-s0[1].x, s0[1].y]];
      const g = prism(pts, 1.5);
      kit.add("hullPlate1", g, { pos: [0, 0, t.zFront + 0.75], color: PALETTE.hullDark, uv: "world", texel: HULL_TEXEL });
    }
    // window light bands along the terrace sides (city lights), a metre proud of the slope
    for (const s of [-1, 1]) {
      for (let z = t.zFront + 30; z < t.zBack - 30; z += 60) {
        const zc = z + 25;
        const hw = terraceHalfWidth(t, zc) + t.draft * (t.yTop - hullTopY(zc)) * 0.5;
        const g = new THREE.PlaneGeometry(50, 5);
        g.rotateY(s > 0 ? Math.PI / 2 : -Math.PI / 2);
        // tilt to match the draft
        g.rotateZ(0);
        const yMid = (t.yTop + hullTopY(zc)) / 2;
        kit.add("cityLights", g, { pos: [s * (hw + 0.4), yMid, zc], uv: "scale", uvScale: [1.25, 1] });
      }
    }
  }

  // ---------------- tower neck ----------------
  {
    const n = TOWER.neck;
    const h = n.yTop - n.yBase;
    const hwBase = n.hw + n.draft * h;
    // frustum: 4-sided, built as a loft along y (use prism-like manual quads)
    const corners = (y) => {
      const hw = n.hw + n.draft * (n.yTop - y);
      const hl = (n.z1 - n.z0) / 2 + n.draft * (n.yTop - y) * 0.5;
      const zc = (n.z0 + n.z1) / 2;
      return [new THREE.Vector3(-hw, y, zc - hl), new THREE.Vector3(hw, y, zc - hl), new THREE.Vector3(hw, y, zc + hl), new THREE.Vector3(-hw, y, zc + hl)];
    };
    const lo = corners(n.yBase - 2);
    const hi = corners(n.yTop + 0.5);
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4;
      const g = new THREE.BufferGeometry();
      const a = lo[i],
        b = lo[j],
        c = hi[j],
        d = hi[i];
      g.setAttribute("position", new THREE.BufferAttribute(new Float32Array([a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z, a.x, a.y, a.z, c.x, c.y, c.z, d.x, d.y, d.z]), 3));
      g.computeVertexNormals();
      kit.add("hullPlate1", g, { uv: "world", texel: HULL_TEXEL, color: PALETTE.hullMid });
      // window bands on the neck faces
      const mid = a.clone().add(b).add(c).add(d).multiplyScalar(0.25);
      const nrm = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(d, a)).normalize();
      for (const yy of [n.yBase + 22, n.yBase + 46, n.yBase + 70]) {
        const pg = new THREE.PlaneGeometry(Math.min(60, a.distanceTo(b) - 10), 4);
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), nrm);
        pg.applyQuaternion(q);
        const p = mid.clone().addScaledVector(nrm, 0.5);
        kit.add("cityLights", pg, { pos: [p.x, yy, p.z], uv: "scale", uvScale: [1.4, 1] });
      }
    }
    void hwBase;
  }

  // ---------------- bridge module ----------------
  {
    const b = TOWER.bridge;
    const w = b.hw * 2;
    const h = b.y1 - b.y0;
    const l = b.z1 - b.z0;
    const cy = (b.y0 + b.y1) / 2;
    const cz = (b.z0 + b.z1) / 2;
    // body: box minus the forward face (built separately with cut-outs); chamfered underside via a
    // slightly smaller lower slab
    // body as five slabs (no forward face): the perforated face slab closes the front, so from outside
    // the viewports look into the bridge / gallery interiors instead of at a wall
    const T = 4;
    kit.boxMM("hullPlate", [-b.hw, b.y1 - T, b.z0 + 1], [b.hw, b.y1, b.z1], { color: PALETTE.hullLight, uv: "world", texel: HULL_TEXEL });
    kit.boxMM("hullPlate", [-b.hw, b.y0, b.z0 + 1], [b.hw, b.y0 + T, b.z1], { color: PALETTE.hullLight, uv: "world", texel: HULL_TEXEL });
    kit.boxMM("hullPlate", [-b.hw, b.y0, b.z0 + 1], [-b.hw + T, b.y1, b.z1], { color: PALETTE.hullLight, uv: "world", texel: HULL_TEXEL });
    kit.boxMM("hullPlate", [b.hw - T, b.y0, b.z0 + 1], [b.hw, b.y1, b.z1], { color: PALETTE.hullLight, uv: "world", texel: HULL_TEXEL });
    kit.boxMM("hullPlate", [-b.hw, b.y0, b.z1 - T], [b.hw, b.y1, b.z1], { color: PALETTE.hullLight, uv: "world", texel: HULL_TEXEL });
    kit.boxMM("hullPlate1", [-b.hw + 8, b.y0 - 6, b.z0 + 12], [b.hw - 8, b.y0 + 0.1, b.z1 - 6], { color: PALETTE.hullMid, uv: "world", texel: HULL_TEXEL });
    // forward face with viewport cut-outs: bridge strip and the two gallery runs
    const holes = [];
    const vp = TOWER.viewports;
    const vw = (vp.hw * 2 - vp.pillar * (vp.count - 1)) / vp.count;
    for (let i = 0; i < vp.count; i++) {
      const x = -vp.hw + vw / 2 + i * (vw + vp.pillar);
      // trapezoid: wider at the top (the classic angular Imperial viewport)
      const yc = (vp.y0 + vp.y1) / 2 - cy;
      const hh = (vp.y1 - vp.y0) / 2;
      holes.push({ points: [[x - vw / 2 + 0.25, yc - hh], [x + vw / 2 - 0.25, yc - hh], [x + vw / 2, yc + hh], [x - vw / 2, yc + hh]] });
    }
    const gv = TOWER.galleryViewports;
    const gw = (gv.x1 - gv.x0) / gv.count;
    for (const s of [-1, 1]) {
      for (let i = 0; i < gv.count; i++) {
        const x = s * (gv.x0 + gw * (i + 0.5));
        holes.push({ x, y: (gv.y0 + gv.y1) / 2 - cy, w: gw - 0.9, h: gv.y1 - gv.y0 });
      }
    }
    // the face slab is only 1 m thick: the bridge and gallery interiors start right behind it (their
    // forward walls sit at z0+1 and z0+3), so nothing of the exterior may reach further aft than z0+1
    const face = panelWithHoles(w, h, 1.0, holes);
    face.rotateY(Math.PI); // extrusion along -z; the outward normal faces -z (forward)
    kit.add("hullPlate1", face, { pos: [0, cy, b.z0 + 0.5], color: PALETTE.hullMid, uv: "world", texel: HULL_TEXEL });
    // brow over the bridge windows and a sill below (forward of the face only)
    kit.boxMM("hullTrim", [-vp.hw - 4, vp.y1 + 0.6, b.z0 - 2.4], [vp.hw + 4, vp.y1 + 2.4, b.z0 + 0.6], { color: PALETTE.hullDark, uv: "world", texel: 0.2 });
    kit.boxMM("hullTrim", [-vp.hw - 4, vp.y0 - 1.6, b.z0 - 1.2], [vp.hw + 4, vp.y0 - 0.4, b.z0 + 0.6], { color: PALETTE.hullDark, uv: "world", texel: 0.2 });
    // viewport glass sits in the middle of the face slab (shared with the bridge / gallery interiors)
    kit.add("viewGlass", new THREE.PlaneGeometry(vp.hw * 2 + 1, vp.y1 - vp.y0 + 0.4), { pos: [0, (vp.y0 + vp.y1) / 2, b.z0 + 0.5], uv: "keep" });
    for (const s of [-1, 1]) kit.add("viewGlass", new THREE.PlaneGeometry(gv.x1 - gv.x0, gv.y1 - gv.y0 + 0.2), { pos: [s * (gv.x0 + gv.x1) / 2, (gv.y0 + gv.y1) / 2, b.z0 + 0.5], uv: "keep" });
    // running lights on the module corners
    for (const s of [-1, 1]) {
      kit.box("extEmitRed", s * (b.hw + 0.4), b.y1 - 2, b.z0 + 8, 0.8, 1.2, 2.5);
      kit.box("extEmitWhite", s * (b.hw + 0.4), b.y0 + 2, b.z1 - 8, 0.8, 1.2, 2.5);
    }
    void l;
  }

  // ---------------- shield generator domes + comms mast ----------------
  for (const d of TOWER.domes) {
    kit.add("hullPlate", new THREE.SphereGeometry(d.r, 40, 28), { pos: [d.x, d.yCenter, d.z], color: PALETTE.hullLight, uv: "world", texel: HULL_TEXEL });
    // equatorial ring + pedestal
    kit.add("hullTrim", new THREE.TorusGeometry(d.r * 0.98, 1.4, 10, 48).rotateX(Math.PI / 2), { pos: [d.x, d.yCenter - 2, d.z], color: PALETTE.hullDark, uv: "world", texel: 0.2 });
    kit.cyl("hullPlate1", d.x, TOWER.bridge.y1 + 6, d.z, d.r * 0.62, 12, "y", { color: PALETTE.hullMid, segments: 32, texel: HULL_TEXEL * 8 });
    kit.cyl("hullTrim", d.x, TOWER.bridge.y1 + 1, d.z, d.r * 0.74, 2, "y", { color: PALETTE.hullDark, segments: 32 });
  }
  {
    const m = TOWER.mast;
    kit.cyl("hullPlate1", m.x, (m.yBase + m.yTop) / 2, m.z, m.r, m.yTop - m.yBase, "y", { color: PALETTE.hullMid, segments: 12, texel: 0.1 });
    kit.cyl("hullTrim", m.x, m.yBase + 3, m.z, m.r * 2.4, 6, "y", { color: PALETTE.hullDark, segments: 16 });
    for (let i = 0; i < 4; i++) {
      const y = m.yBase + 14 + i * 13;
      kit.box("hullGreeble", m.x, y, m.z, 14 - i * 2, 1.2, 1.2, { color: PALETTE.hullDark });
      kit.box("hullGreeble", m.x, y, m.z, 1.2, 1.2, 14 - i * 2, { color: PALETTE.hullDark });
    }
    // dish
    kit.add("hullPlate1", new THREE.SphereGeometry(7, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.35).rotateX(Math.PI / 2), { pos: [m.x, m.yTop - 8, m.z - 4], color: PALETTE.hullMid, uv: "world", texel: 0.1 });
    kit.box("extEmitRed", m.x, m.yTop + 0.6, m.z, 1.0, 1.2, 1.0);
  }

  // ---------------- engines ----------------
  {
    const e = ENGINES;
    const bells = [...e.main, ...e.secondary];
    for (const b of bells) {
      const len = b.r > 30 ? e.length : e.length * 0.6;
      // nozzle: tapered cylinder aft, darker heat-discoloured band at the lip
      kit.cyl("hullPlate1", b.x, b.y, e.z + len / 2, b.r, len, "z", { color: PALETTE.hullMid, segments: 40, r2: b.r * 0.86, texel: HULL_TEXEL * 6 });
      kit.cyl("hullGreeble", b.x, b.y, e.z + len - 3, b.r * 1.04, 6, "z", { color: PALETTE.hullTrench, segments: 40, open: true });
      // inner cone (bright core) + glow disc slightly behind the lip
      const cone = new THREE.CylinderGeometry(b.r * 0.82, b.r * 0.25, len * 0.7, 40, 1, true);
      cone.rotateX(-Math.PI / 2);
      kit.add("engineGlow", cone, { pos: [b.x, b.y, e.z + len * 0.6], uv: "keep" });
      kit.add("engineCore", new THREE.CircleGeometry(b.r * 0.3, 32), { pos: [b.x, b.y, e.z + len * 0.3], uv: "keep" });
      const disc = new THREE.PlaneGeometry(b.r * 2.6, b.r * 2.6);
      kit.add("glowDisc", disc, { pos: [b.x, b.y, e.z + len + 2], uv: "keep", color: PALETTE.engineBlue });
    }
    // engine housing block on the stern face
    kit.boxMM("hullPlate1", [-330, -40, e.z - 30], [330, 34, e.z + 4], { color: PALETTE.hullDark, uv: "world", texel: HULL_TEXEL });
    // heat-discoloured plating around the bells
    for (const b of e.main) kit.add("hullGreeble", new THREE.RingGeometry(b.r * 1.02, b.r * 1.35, 40), { pos: [b.x, b.y, e.z + 4.2], uv: "world", texel: HULL_TEXEL * 4, color: PALETTE.hullTrench });
  }

  // ---------------- ventral reactor bulb + docking recess ----------------
  {
    const r = VENTRAL.reactorBulb;
    kit.add("hullPlate", new THREE.SphereGeometry(r.r, 40, 28), { pos: [r.x, r.yCenter, r.z], color: PALETTE.hullLight, uv: "world", texel: HULL_TEXEL });
    kit.add("hullTrim", new THREE.TorusGeometry(r.r * 0.9, 2.5, 10, 48).rotateX(Math.PI / 2), { pos: [r.x, r.yCenter - r.r * 0.35, r.z], color: PALETTE.hullDark, uv: "world", texel: 0.2 });
    const d = VENTRAL.dockingRecess;
    kit.boxMM("hullGreeble", [d.x - d.hw, hullBottomY(d.z) - 0.5, d.z - d.hl], [d.x + d.hw, hullBottomY(d.z) + d.depth, d.z + d.hl], { color: PALETTE.hullTrench, uv: "world", texel: 0.1 });
    for (let z = d.z - d.hl + 6; z < d.z + d.hl; z += 12) for (const s of [-1, 1]) kit.box("extEmitWhite", s * (d.hw + 1), hullBottomY(z) - 0.5, z, 1, 0.6, 1);
  }

  const meshes = kit.build(group, { castShadow: true, receiveShadow: true });
  // the hull is huge: never frustum-cull the merged chunks away by a stale bounding sphere
  for (const m of meshes) m.frustumCulled = true;

  return {
    group,
    meshes,
    triangles: meshes.reduce((n, m) => n + (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3, 0),
    /** per-frame hook for detail layers (LOD swaps, glow flicker) */
    update(camera, dt, t) {
      for (const fn of group.userData.updaters || []) fn(camera, dt, t);
    },
  };
}

export { hullHalfWidth };
