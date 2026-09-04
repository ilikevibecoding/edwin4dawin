// Ventral features: the dark centreline channel with machinery strips along its edges, two flank greeble
// strips, the reactor bulb under the stern, and the keel fittings (secondary bay frame, well throat, the
// proud dark collar around the hangar well with its lit rim, hazard and door decals). Thin features on the
// belly are flat quads with polygonOffset (never raised slivers), so nothing sparkles at grazing angles;
// the bulky machinery is real geometry that casts and receives the sun's shadows.
import * as THREE from "three";
import { HULL, HANGAR } from "../config/shipSpec.js";
import { ventral, surfaceNormal, frameQuat, UP, merge, box, boxMM, atlasQuad, macroTint, macroColor, worldUV, finish, ensureColor, instancedFromList, layerMesh } from "./util.js";

const _q = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _n = new THREE.Vector3();
const _c = new THREE.Color();

// centreline channel: forward run and the short run between the keel block and the bulb
export const VENTRAL_CHANNEL = { halfW: 13, runs: [[-590, HULL.keelPlate.z0 - 14], [HULL.keelPlate.z1 + 14, 640]] };
export const REACTOR = { x: 0, z: 700, R: 44, protrude: 11 };

// Drape a geometry onto the ventral surface: every vertex's y becomes ventral(x, z) shifted by dy.
// The ventral surface is linear in z and |x| (a shallow V), so a quad conforms exactly with one vertex
// row on the centreline and its corners.
function conform(g, dy) {
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setY(i, ventral(pos.getX(i), pos.getZ(i)) + dy);
  g.computeVertexNormals();
  return g;
}

// a down-facing quad draped on the ventral surface, centred at (x, z), sides w (x) by d (z)
function ventralQuad(x, z, w, d, lift = 0.06) {
  const crosses = Math.abs(x) < w / 2;
  const g = new THREE.PlaneGeometry(w, d, crosses ? 2 : 1, 1);
  g.rotateX(Math.PI / 2); // PlaneGeometry faces +z; after +90° about x its normal is -y (down)
  g.translate(x, 0, z);
  return conform(g, -lift);
}

export function buildVentral(ctx) {
  const { rand, mats, group, detail, atlas } = ctx;
  const A = atlas.cells;
  const k = HULL.keelPlate;

  // ---- centreline channel + flank strips: dark flat quads (machinery texture) with polygonOffset
  const darkQuads = [];
  const stripFlanks = [];
  for (const [z0, z1] of VENTRAL_CHANNEL.runs) {
    const zc = (z0 + z1) / 2;
    darkQuads.push(ventralQuad(0, zc, VENTRAL_CHANNEL.halfW * 2, z1 - z0));
    stripFlanks.push({ x: -VENTRAL_CHANNEL.halfW, z0, z1, side: -1 });
    stripFlanks.push({ x: VENTRAL_CHANNEL.halfW, z0, z1, side: 1 });
  }
  // two flank strips at ~56 % of the half-width, one long quad each yawed to follow the wedge edge (each
  // ventral half is a plane, so the draped quad stays flush along its whole length)
  for (const side of [-1, 1]) {
    const z0 = -520;
    const z1 = 700;
    const zc = (z0 + z1) / 2;
    const xa = side * HULL.halfWidthAt(z0) * 0.56;
    const xb = side * HULL.halfWidthAt(z1) * 0.56;
    const len = Math.hypot(xb - xa, z1 - z0);
    const g = new THREE.PlaneGeometry(9, len, 1, 1).rotateX(Math.PI / 2).rotateY(Math.atan2(xb - xa, z1 - z0)).translate((xa + xb) / 2, 0, zc);
    darkQuads.push(conform(g, -0.06));
    stripFlanks.push({ flank: side, z0, z1 });
  }
  const channelGeo = merge(darkQuads);
  worldUV(channelGeo, 1 / 12);
  macroColor(channelGeo, { base: 1.0 });
  const flats = [channelGeo]; // every flat dark quad on the belly ends up in one mesh
  const lit = []; // every emissive fitting on the belly shares the well rim's mesh

  // ---- machinery along the channel edges and the flank strips (boxes, drums, pipes), random pitch
  const unitGeo = box(0, 0.5, 0, 1, 1, 1);
  const drumGeo = new THREE.CylinderGeometry(0.5, 0.5, 1, 12).translate(0, 0.5, 0);
  const pipeGeo = new THREE.CylinderGeometry(0.5, 0.5, 1, 10).rotateX(Math.PI / 2);
  const ventGeo = atlasQuad(1, 1, A.vent);
  const L = { units: [], drums: [], pipes: [], vents: [] };
  const tone = () => 0.7 + rand() * 0.35;
  const place = (list, x, z, sx, sy, sz, yaw, t) => {
    surfaceNormal(x, z, false, _n);
    frameQuat(_n, _q);
    _q2.setFromAxisAngle(UP, yaw);
    _q.multiply(_q2);
    _p.set(x, ventral(x, z), z).addScaledVector(_n, 0.02);
    _s.set(sx, sy, sz);
    macroTint(x, _p.y, z, -1, _c);
    _c.multiplyScalar(t);
    list.push({ m: new THREE.Matrix4().compose(_p, _q, _s), c: _c.clone() });
  };
  for (const f of stripFlanks) {
    let z = f.z0 + 4 + rand() * 10;
    while (z < f.z1 - 8) {
      const len = 5 + rand() * 12;
      const zc = z + len / 2;
      let x;
      let yaw = 0;
      if (f.flank) {
        x = f.flank * (HULL.halfWidthAt(zc) * 0.56 + (rand() < 0.5 ? -7.5 : 7.5));
      } else x = f.x + f.side * (2 + rand() * 3);
      const r = rand();
      if (r < 0.5) place(L.units, x, zc, 3 + rand() * 4, 1.5 + rand() * 3, len, yaw, tone());
      else if (r < 0.7) place(L.drums, x, zc, 3 + rand() * 3, 2 + rand() * 4, 3 + rand() * 3, 0, tone());
      else if (r < 0.9) place(L.pipes, x, zc, 1 + rand() * 1.2, 1 + rand() * 1.2, len + 6, 0, 0.75 + rand() * 0.3);
      else place(L.vents, x, zc, 4 + rand() * 4, 1, 3 + rand() * 3, 0, 1);
      z += len + 2 + rand() * 16;
    }
  }
  layerMesh(
    [
      { geo: unitGeo, list: L.units },
      { geo: drumGeo, list: L.drums },
      { geo: pipeGeo, list: L.pipes },
    ],
    mats.greebleDark,
    detail.mid,
    "ventralUnits",
  );
  instancedFromList(ventGeo, mats.atlas, L.vents, detail.near, "ventralVents");

  // ---- reactor bulb: a wide sphere sunk into the stern underside, collar ring, buttresses, dark recess ring
  {
    const { x, z, R, protrude } = REACTOR;
    const yHull = ventral(x, z);
    const cy = yHull + R - protrude;
    const sphere = new THREE.SphereGeometry(R, 56, 32);
    const uv = sphere.attributes.uv;
    const circ = 2 * Math.PI * R;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * circ) / 24, (uv.getY(i) * (Math.PI * R)) / 24);
    sphere.translate(x, cy, z);
    const rBase = Math.sqrt(R * R - (R - protrude - 1.5) * (R - protrude - 1.5));
    // the collar and buttresses hug the shallow V of the hull: drape them by the local surface offset
    const drape = (g) => {
      const pos = g.attributes.position;
      for (let i = 0; i < pos.count; i++) pos.setY(i, pos.getY(i) + ventral(pos.getX(i), pos.getZ(i)) - yHull);
      g.computeVertexNormals();
      return g;
    };
    const collar = drape(new THREE.TorusGeometry(rBase + 1.2, 2.6, 10, 64).rotateX(Math.PI / 2).translate(x, yHull - 0.4, z));
    // a thin lit ring under the collar so the bulb reads as a powered feature from 600 m
    lit.push(drape(new THREE.TorusGeometry(rBase + 1.2, 0.35, 6, 64).rotateX(Math.PI / 2).translate(x, yHull - 3.1, z)));
    const uvParts = [collar];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + 0.2;
      const b = box(0, 0, 0, 3, 6, 9);
      b.translate(0, -1, rBase + 2.5);
      b.rotateY(a);
      b.translate(x, yHull, z);
      const bx = x + Math.sin(a) * (rBase + 2.5);
      const bz = z + Math.cos(a) * (rBase + 2.5);
      b.translate(0, ventral(bx, bz) - yHull, 0);
      uvParts.push(b);
    }
    const uvMerged = merge(uvParts);
    worldUV(uvMerged, 1 / 12);
    const all = merge([sphere, uvMerged]);
    macroColor(all, { base: 0.94 });
    const bulb = new THREE.Mesh(all, mats.hullUv);
    bulb.name = "reactorBulb";
    group.add(bulb);
    // dark ring around the base, draped on the hull
    const ringGeo = conform(new THREE.RingGeometry(rBase + 3.5, rBase + 12, 64).rotateX(Math.PI / 2).translate(x, 0, z).toNonIndexed(), -0.06);
    worldUV(ringGeo, 1 / 12);
    macroColor(ringGeo, { base: 0.42 });
    flats.push(ringGeo);
  }

  // ---- keel fittings (one dark mesh): the proud frame of the reserved secondary bay door, the well
  // throat lining through the plate thickness plus a 0.25 m curb above the hangar deck, and a dark collar
  // standing 0.5 m proud around the well mouth that carries the lit rim, so the well reads as a bay opening
  {
    const w = HANGAR.well;
    const cx = (w.x0 + w.x1) / 2;
    const cz = (w.z0 + w.z1) / 2;
    const ww = w.x1 - w.x0;
    const wd = w.z1 - w.z0;
    const sb = HANGAR.secondaryBayDoor;
    const throatTop = HANGAR.deckY + 0.25;
    const collarW = 7;
    const collarT = 0.5;
    const dark = [
      finish(boxMM([sb.x0 - 1, k.y - 0.7, sb.z0 - 1], [sb.x1 + 1, k.y + 1, sb.z1 + 1]), 1 / 6, { base: 0.6 }),
      finish(
        merge([
          boxMM([w.x0 - 0.6, k.y, w.z0 - 0.6], [w.x0, throatTop, w.z1 + 0.6]),
          boxMM([w.x1, k.y, w.z0 - 0.6], [w.x1 + 0.6, throatTop, w.z1 + 0.6]),
          boxMM([w.x0 - 0.6, k.y, w.z0 - 0.6], [w.x1 + 0.6, throatTop, w.z0]),
          boxMM([w.x0 - 0.6, k.y, w.z1], [w.x1 + 0.6, throatTop, w.z1 + 0.6]),
        ]),
        1 / 6,
        { base: 0.5 },
      ),
      finish(
        merge([
          boxMM([w.x0 - collarW, k.y - collarT, w.z0 - collarW], [w.x1 + collarW, k.y + 0.4, w.z0]),
          boxMM([w.x0 - collarW, k.y - collarT, w.z1], [w.x1 + collarW, k.y + 0.4, w.z1 + collarW]),
          boxMM([w.x0 - collarW, k.y - collarT, w.z0], [w.x0, k.y + 0.4, w.z1]),
          boxMM([w.x1, k.y - collarT, w.z0], [w.x1 + collarW, k.y + 0.4, w.z1]),
        ]),
        1 / 6,
        { base: 0.3 },
      ),
    ];
    const darkGeo = merge(dark);
    darkGeo.computeBoundingSphere();
    const darkMesh = new THREE.Mesh(darkGeo, mats.dark);
    darkMesh.name = "keelDark";
    group.add(darkMesh);
    // lit rim: four bars on the collar's underside 1.6 m outside the mouth, soft cool white (above 1.0 so
    // bloom lifts it gently)
    const t = 0.7;
    const off = 1.6;
    const yr = k.y - collarT - 0.12;
    const rim = merge([
      ...lit,
      box(cx, yr, w.z0 - off, ww + off * 2 + t, 0.3, t),
      box(cx, yr, w.z1 + off, ww + off * 2 + t, 0.3, t),
      box(w.x0 - off, yr, cz, t, 0.3, wd + off * 2 - t),
      box(w.x1 + off, yr, cz, t, 0.3, wd + off * 2 - t),
    ]);
    rim.computeBoundingSphere();
    const rimMesh = new THREE.Mesh(rim, mats.rimLight);
    rimMesh.name = "wellRimLight";
    group.add(rimMesh);
    // hazard band on the hull plate outside the collar, plus the painted door stamp of the reserved
    // secondary bay: the two atlas decals on the keel share one mesh
    const y = k.y - 0.05;
    const door = atlasQuad(sb.x1 - sb.x0, sb.z1 - sb.z0, A.bayDoor).rotateX(Math.PI / 2).translate((sb.x0 + sb.x1) / 2, k.y - 0.75, (sb.z0 + sb.z1) / 2);
    const decals = ensureColor(
      merge([
        atlasQuad(ww + collarW * 2 + 6, 3, A.hazard).rotateX(Math.PI / 2).translate(cx, y, w.z0 - collarW - 1.5),
        atlasQuad(ww + collarW * 2 + 6, 3, A.hazard).rotateX(Math.PI / 2).translate(cx, y, w.z1 + collarW + 1.5),
        atlasQuad(wd + collarW * 2, 3, A.hazard).rotateZ(Math.PI / 2).rotateX(Math.PI / 2).translate(w.x0 - collarW - 1.5, y, cz),
        atlasQuad(wd + collarW * 2, 3, A.hazard).rotateZ(Math.PI / 2).rotateX(Math.PI / 2).translate(w.x1 + collarW + 1.5, y, cz),
        door,
      ]),
    );
    decals.computeBoundingSphere();
    const decalMesh = new THREE.Mesh(decals, mats.atlasFlat);
    decalMesh.name = "ventralDecals";
    group.add(decalMesh);
  }

  const flatGeo = merge(flats);
  flatGeo.computeBoundingSphere();
  const flatMesh = new THREE.Mesh(flatGeo, mats.darkFlat);
  flatMesh.name = "ventralFlats";
  group.add(flatMesh);
}
