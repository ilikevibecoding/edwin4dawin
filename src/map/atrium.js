// Atrium hero treatment (Fable 2): brand feature wall with the Northstar Dynamics star logotype,
// lobby floor inlay banding, architectural planter boxes, and the suspended light feature under
// the skylight. Plants themselves belong to the props domain (Fable 3).
import * as THREE from 'three';

const FEATURE = { x0: 14.25, x1: 19.75, z: 24, h: 3.5 }; // solid F0 wall run, open to the void above

export function buildAtrium(map, kit) {
  featureWall(map, kit);
  floorInlay(kit);
  planters(map, kit);
  suspendedRing(kit);
}

// --- brand feature wall behind reception (faces the vestibule entry axis) ---------
function featureWall(map, kit) {
  const { x0, x1, h } = FEATURE;
  // The x14-20 run of the z24 wall is EXTERIOR (unoccupied notch behind it), so the wall is
  // 0.34 thick — the lobby-side face sits at z=24.17, not 24.08. Build 5mm proud of it.
  const faceZ = FEATURE.z + 0.175;
  const cx = (x0 + x1) / 2;
  // blue field panel
  kit.box('logoField', x1 - x0, h, 0.05, cx, h / 2, faceZ + 0.025, { cast: false });
  // vertical wood slats on the flanks (0.09 wide @ 0.16 pitch)
  for (const [sx0, sx1] of [[x0, x0 + 1.35], [x1 - 1.35, x1]]) {
    for (let x = sx0 + 0.08; x < sx1 - 0.03; x += 0.16) {
      kit.box('woodSlat', 0.09, h - 0.1, 0.055, x, (h - 0.1) / 2, faceZ + 0.055, { cast: false });
    }
  }
  // plinth + cap reveal
  kit.box('trimDark', x1 - x0 + 0.08, 0.12, 0.09, cx, 0.06, faceZ + 0.03, { cast: false });
  kit.box('trimDark', x1 - x0 + 0.08, 0.06, 0.09, cx, h - 0.03, faceZ + 0.03, { cast: false });
  // star emblem + wordmark — the whole lockup rides above reception-desk height (~1.7 with
  // monitors, props domain) so nothing occludes it from the entry axis
  kit.add('logoStar', starGeometry(cx, 2.7, faceZ + 0.075, 0.5), { uv: 0, cast: false });
  const plate = new THREE.BoxGeometry(2.6, 0.42, 0.03);
  plate.translate(cx, 1.98, faceZ + 0.07);
  kit.add('signBrand', plate, { uv: 0, cast: false });
}

// Four-point compass star with an elongated north point (original Northstar Dynamics mark),
// built from triangles with a slight prism depth.
function starGeometry(cx, cy, z, r, depth = 0.04) {
  const pts = [
    [0, r * 1.45], [0.16 * r, 0.16 * r], [r * 0.85, 0], [0.16 * r, -0.16 * r],
    [0, -r * 0.85], [-0.16 * r, -0.16 * r], [-r * 0.85, 0], [-0.16 * r, 0.16 * r],
  ];
  const pos = [];
  for (let i = 0; i < 8; i++) {
    const a = pts[i], b = pts[(i + 1) % 8];
    // front fan (CCW viewed from +z so the face normal points at the viewer)
    pos.push(0, 0, depth, b[0], b[1], depth, a[0], a[1], depth);
    // side band
    pos.push(a[0], a[1], 0, b[0], b[1], depth, a[0], a[1], depth);
    pos.push(a[0], a[1], 0, b[0], b[1], 0, b[0], b[1], depth);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const n = pos.length / 3;
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Array(n * 2).fill(0.5), 2));
  geo.computeVertexNormals();
  geo.translate(cx, cy, z);
  return geo;
}

// --- lobby floor inlay banding ------------------------------------------------------
function floorInlay(kit) {
  const T = 0.006; // overlay thickness above the tile slab (no z-fighting, no nav impact)
  const y = T / 2 + 0.0004;
  const band = (x0, z0, x1, z1) => kit.box('inlayTile', x1 - x0, T, z1 - z0, (x0 + x1) / 2, y, (z0 + z1) / 2, { cast: false });
  // perimeter band in the main lobby rect [6,24,34,32], inset 0.7, width 0.4
  const [a, b, c, d] = [6.7, 24.7, 33.3, 31.3];
  band(a, b, c, b + 0.4); band(a, d - 0.4, c, d);
  band(a, b + 0.4, a + 0.4, d - 0.4); band(c - 0.4, b + 0.4, c, d - 0.4);
  // entry runner from the vestibule doors toward reception
  band(15.6, 31.3, 18.4, 32.0);
  band(15.6, 24.7, 18.4, 25.4);
  // compass medallion on the entry axis
  const ring = new THREE.RingGeometry(1.15, 1.5, 40);
  ring.rotateX(-Math.PI / 2);
  ring.translate(17, T + 0.0008, 28);
  kit.add('inlayTile', ring, { cast: false });
  const inner = new THREE.CircleGeometry(1.15, 40);
  inner.rotateX(-Math.PI / 2);
  inner.translate(17, T + 0.0004, 28);
  kit.add('inlayLight', inner, { cast: false });
  const star = starGeometry(0, 0, 0, 0.62, 0.008);
  star.rotateX(-Math.PI / 2); // prism depth now points up; north point lands at −z (true north)
  star.translate(17, T + 0.0008, 28);
  kit.add('inlayTile', star, { uv: 0, cast: false });
}

// --- architectural planter boxes (collide; plants come from props) -------------------
export const PLANTERS = [
  { x: 15.35, z: 31.62, floor: 0 }, { x: 18.65, z: 31.62, floor: 0 },   // flank the vestibule doors
  { x: 13.1, z: 24.42, floor: 0 }, { x: 21.0, z: 24.42, floor: 0 },     // flank the feature wall
  { x: 16.0, z: 30.75, floor: 1 }, { x: 26.0, z: 30.75, floor: 1 },     // mezz-south rail line
];

function planters(map, kit) {
  for (const p of PLANTERS) {
    const y = p.floor ? 3.6 : 0;
    kit.box('planterShell', 1.25, 0.5, 0.5, p.x, y + 0.25, p.z, { tag: 'planter', material: 'metal' });
    kit.box('trimDark', 1.29, 0.05, 0.54, p.x, y + 0.475, p.z, { cast: false });
    kit.box('planterSoil', 1.15, 0.04, 0.4, p.x, y + 0.44, p.z, { cast: false, receive: true });
    kit.collide(p.x - 0.625, y, p.z - 0.25, p.x + 0.625, y + 0.5, p.z + 0.25,
      { tag: 'planter', material: 'metal', blockSight: false });
  }
}

// --- suspended light feature under the skylight ---------------------------------------
function suspendedRing(kit) {
  const cx = 21, cz = 27; // void center [14,24,28,30]
  const rect = (w, d, y, tube) => {
    kit.box('ringLight', w, tube, tube, cx, y, cz - d / 2, { cast: false, receive: false });
    kit.box('ringLight', w, tube, tube, cx, y, cz + d / 2, { cast: false, receive: false });
    kit.box('ringLight', tube, tube, d + tube, cx - w / 2, y, cz, { cast: false, receive: false });
    kit.box('ringLight', tube, tube, d + tube, cx + w / 2, y, cz, { cast: false, receive: false });
    for (const [ox, oz] of [[-w / 2, -d / 2], [w / 2, -d / 2], [-w / 2, d / 2], [w / 2, d / 2]]) {
      kit.cyl('conduitMetal', 0.008, 0.008, 6.36 - y, cx + ox, y, cz + oz, { cast: false, seg: 5 });
    }
  };
  rect(7.2, 2.4, 5.35, 0.085);
  rect(4.2, 1.2, 5.0, 0.07);
}
