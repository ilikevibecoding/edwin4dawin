import * as THREE from 'three';
import { Kit, bolt, cylUV, rbox, tube } from '../lib/geo.js';
import { treadMaps } from '../textures/vehicle.js';
import { SPEC as S } from './spec.js';

// ---------------------------------------------------------------------------
// Wheels, tyres and the live axles.
//
// The tyre is a revolved profile with the tread block pattern pushed into the
// geometry, so the silhouette against the sky is genuinely lumpy instead of a
// normal-mapped circle. Wheel local space has the axle along X.
// ---------------------------------------------------------------------------

/** Cross-section of the carcass, from one bead to the other: [x, radius]. */
function tyreProfilePoints() {
  const R = S.wheelRadius;
  const w = S.wheelWidth;
  const rim = S.rimRadius;
  return [
    [-w * 0.5, rim + 0.004],
    [-w * 0.5 - 0.014, rim + 0.05],
    [-w * 0.52 - 0.012, R * 0.7],
    [-w * 0.55, R * 0.86],
    [-w * 0.5, R - 0.055],
    [-w * 0.4, R - 0.012],
    [-w * 0.3, R],
    [0, R + 0.007],
    [w * 0.3, R],
    [w * 0.4, R - 0.012],
    [w * 0.5, R - 0.055],
    [w * 0.55, R * 0.86],
    [w * 0.52 + 0.012, R * 0.7],
    [w * 0.5 + 0.014, rim + 0.05],
    [w * 0.5, rim + 0.004],
  ];
}

/**
 * Revolve the carcass and displace the crown by the tread height field.
 * radialSeg controls silhouette quality; 128 is plenty at screen size.
 */
function buildTyreGeometry({ radialSeg = 128, profileSeg = 44, treadDepth = 0.021 } = {}) {
  const pts = tyreProfilePoints().map((p) => new THREE.Vector2(p[0], p[1]));
  const curve = new THREE.SplineCurve(pts);
  const profile = curve.getSpacedPoints(profileSeg);
  const tread = treadMaps();
  const { height, w: tw, h: th } = tread;
  const halfW = S.wheelWidth * 0.5;

  const cols = radialSeg + 1;
  const rows = profile.length;
  const position = new Float32Array(cols * rows * 3);
  const uv = new Float32Array(cols * rows * 2);
  const index = [];

  const sampleTread = (u, xNorm) => {
    // xNorm: -1..1 across the tyre width. Only the crown carries blocks.
    const s = Math.abs(xNorm);
    if (s > 0.92) return 0;
    const shoulder = 1 - Math.max(0, (s - 0.6) / 0.32);
    const tx = Math.floor(((u % 1) + 1) % 1 * tw) % tw;
    const ty = Math.floor(((xNorm * 0.5 + 0.5) % 1 + 1) % 1 * th) % th;
    return height[ty * tw + tx] * shoulder;
  };

  for (let i = 0; i < cols; i++) {
    const u = i / radialSeg;
    const a = u * Math.PI * 2;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    for (let j = 0; j < rows; j++) {
      const p = profile[j];
      const xNorm = p.x / halfW;
      const d = sampleTread(u, xNorm) * treadDepth;
      const r = p.y + d;
      const k = (i * rows + j) * 3;
      position[k] = p.x;
      position[k + 1] = ca * r;
      position[k + 2] = sa * r;
      const k2 = (i * rows + j) * 2;
      uv[k2] = u * 6;
      uv[k2 + 1] = j / (rows - 1);
    }
  }
  for (let i = 0; i < radialSeg; i++) {
    for (let j = 0; j < rows - 1; j++) {
      const a = i * rows + j;
      const b = (i + 1) * rows + j;
      index.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(position, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(index);
  g.computeVertexNormals();
  return g;
}

/** Beadlock-style rim: barrel, ring of bolts, spokes, hub. */
function buildRim(k) {
  const rim = S.rimRadius;
  const hw = S.wheelWidth * 0.5;

  // barrel
  const barrel = new THREE.CylinderGeometry(rim, rim, S.wheelWidth * 0.92, 40, 1, true);
  k.add('alu', cylUV(barrel, 6, 1), { rot: [0, 0, Math.PI / 2] });
  // inner and outer flanges
  for (const sx of [-1, 1]) {
    k.add('alu', new THREE.TorusGeometry(rim + 0.012, 0.016, 8, 36), {
      pos: [sx * hw * 0.94, 0, 0],
      rot: [0, Math.PI / 2, 0],
    });
  }
  // beadlock ring
  k.add('steelDark', new THREE.TorusGeometry(rim + 0.004, 0.022, 8, 40), {
    pos: [hw * 0.88, 0, 0],
    rot: [0, Math.PI / 2, 0],
  });
  const lockBolts = 24;
  for (let i = 0; i < lockBolts; i++) {
    const a = (i / lockBolts) * Math.PI * 2;
    k.add('steel', bolt(0.011, 0.012), {
      pos: [hw * 0.93, Math.cos(a) * (rim + 0.004), Math.sin(a) * (rim + 0.004)],
      rot: [0, 0, -Math.PI / 2],
    });
  }

  // spoke face, dished inward
  const faceX = hw * 0.55;
  k.add('alu', new THREE.CylinderGeometry(0.085, 0.075, 0.05, 20), {
    pos: [faceX, 0, 0],
    rot: [0, 0, Math.PI / 2],
  });
  const spokes = 6;
  for (let i = 0; i < spokes; i++) {
    const a = (i / spokes) * Math.PI * 2;
    const len = rim - 0.06;
    const mid = 0.075 + len * 0.5;
    // tapered spoke leaning outward toward the rim
    k.add('alu', rbox(0.055, 0.115, len, 0.014), {
      pos: [faceX - 0.02, Math.cos(a) * mid, Math.sin(a) * mid],
      rot: [-a + Math.PI / 2, 0, 0],
    });
    k.add('alu', rbox(0.075, 0.06, 0.1, 0.016), {
      pos: [faceX + 0.005, Math.cos(a) * (rim - 0.035), Math.sin(a) * (rim - 0.035)],
      rot: [-a + Math.PI / 2, 0, 0],
    });
    // machined pocket highlight between spokes
    const ab = a + Math.PI / spokes;
    k.add('steelDark', rbox(0.03, 0.06, len * 0.8, 0.01), {
      pos: [faceX - 0.045, Math.cos(ab) * mid, Math.sin(ab) * mid],
      rot: [-ab + Math.PI / 2, 0, 0],
    });
  }

  // hub face, lug nuts, centre cap
  k.add('alu', new THREE.CylinderGeometry(0.1, 0.1, 0.03, 22), {
    pos: [faceX + 0.02, 0, 0],
    rot: [0, 0, Math.PI / 2],
  });
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.3;
    k.add('steel', bolt(0.016, 0.018), {
      pos: [faceX + 0.035, Math.cos(a) * 0.062, Math.sin(a) * 0.062],
      rot: [0, 0, -Math.PI / 2],
    });
  }
  k.add('trimGloss', new THREE.CylinderGeometry(0.038, 0.042, 0.024, 16), {
    pos: [faceX + 0.045, 0, 0],
    rot: [0, 0, Math.PI / 2],
  });
  k.add('paintAccent', new THREE.CylinderGeometry(0.026, 0.026, 0.006, 14), {
    pos: [faceX + 0.058, 0, 0],
    rot: [0, 0, Math.PI / 2],
  });
  // valve stem
  k.add('trim', new THREE.CylinderGeometry(0.008, 0.008, 0.045, 8), {
    pos: [hw * 0.75, rim * 0.86, 0.05],
    rot: [0, 0, 0.4],
  });
}

/** Vented disc + caliper sitting behind the spokes. */
function buildBrakes(k) {
  const hw = S.wheelWidth * 0.5;
  const discR = S.rimRadius - 0.045;
  k.add('brakeDisc', new THREE.CylinderGeometry(discR, discR, 0.026, 32), {
    pos: [-hw * 0.1, 0, 0],
    rot: [0, 0, Math.PI / 2],
  });
  k.add('steelDark', new THREE.CylinderGeometry(discR * 0.45, discR * 0.45, 0.06, 20), {
    pos: [-hw * 0.05, 0, 0],
    rot: [0, 0, Math.PI / 2],
  });
  // drilled rotor holes
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2;
    const r = discR * 0.78;
    k.add('steelDark', new THREE.CylinderGeometry(0.012, 0.012, 0.03, 6), {
      pos: [-hw * 0.1, Math.cos(a) * r, Math.sin(a) * r],
      rot: [0, 0, Math.PI / 2],
    });
  }
  k.add('caliper', rbox(0.06, 0.09, 0.14, 0.018), { pos: [-hw * 0.12, discR * 0.82, -0.02] });
}

/**
 * One complete corner. Returns { group, spin } where `spin` is the child that
 * should be rotated about X for wheel rotation.
 */
export function buildWheel(materials, { side = 1 } = {}) {
  const group = new THREE.Group();

  const spinKit = new Kit('wheel');
  spinKit.add('tread', buildTyreGeometry());
  buildRim(spinKit);
  const spin = spinKit.build(materials, { receiveShadow: true });
  // mirror so the dish and beadlock face outward on both sides
  if (side < 0) spin.scale.x = -1;
  group.add(spin);

  const staticKit = new Kit('brakes');
  buildBrakes(staticKit);
  const brakes = staticKit.build(materials);
  if (side < 0) brakes.scale.x = -1;
  group.add(brakes);

  return { group, spin };
}

/** Helical coil spring. */
function coil(radius, height, turns, wire) {
  const pts = [];
  const steps = Math.max(24, turns * 14);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = t * Math.PI * 2 * turns;
    pts.push(new THREE.Vector3(Math.cos(a) * radius, t * height, Math.sin(a) * radius));
  }
  return tube(pts, wire, 7, 0.5);
}

/** Solid front/rear axle assembly, links, springs and shocks. */
export function buildAxles(materials) {
  const k = new Kit('axles');
  const th = S.trackHalf;
  const y = S.axleY;

  for (const [z, isFront] of [
    [S.frontAxleZ, true],
    [S.rearAxleZ, false],
  ]) {
    // axle tube + pumpkin
    k.add('steelDark', new THREE.CylinderGeometry(0.058, 0.058, th * 2 - 0.16, 14), {
      pos: [0, y, z],
      rot: [0, 0, Math.PI / 2],
    });
    k.add('steelDark', new THREE.SphereGeometry(0.15, 16, 12), { pos: [isFront ? 0.13 : -0.11, y, z] });
    k.add('steelDark', new THREE.CylinderGeometry(0.075, 0.11, 0.2, 14), {
      pos: [isFront ? 0.13 : -0.11, y, z + (isFront ? 0.14 : -0.14)],
      rot: [Math.PI / 2, 0, 0],
    });
    // diff cover bolts
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      k.add('steel', bolt(0.011, 0.01), {
        pos: [isFront ? 0.13 : -0.11, y + Math.sin(a) * 0.13, z + (isFront ? 0.2 : -0.2) + 0.0],
        rot: [isFront ? -Math.PI / 2 : Math.PI / 2, 0, 0],
      });
    }
    // hub ends
    k.addMirrored('steel', new THREE.CylinderGeometry(0.085, 0.075, 0.11, 14), {
      pos: [th - 0.06, y, z],
      rot: [0, 0, Math.PI / 2],
    });
    // spring perches, coils, shocks
    k.addMirrored('paintAccent', coil(0.075, 0.3, 5.5, 0.017), { pos: [th - 0.4, y + 0.02, z] });
    k.addMirrored('steelDark', new THREE.CylinderGeometry(0.026, 0.026, 0.34, 10), {
      pos: [th - 0.28, y + 0.18, z + 0.1],
      rot: [0.12, 0, 0.16],
    });
    k.addMirrored('alu', new THREE.CylinderGeometry(0.034, 0.034, 0.16, 10), {
      pos: [th - 0.3, y + 0.02, z + 0.08],
      rot: [0.12, 0, 0.16],
    });
    // trailing / control arms
    k.addMirrored('steelDark', rbox(0.05, 0.06, 0.62, 0.014), {
      pos: [th - 0.34, y - 0.05, z + (isFront ? -0.34 : 0.34)],
      rot: [isFront ? 0.08 : -0.08, 0, 0],
    });
    // brake lines
    k.addMirrored('trim', tube(
      [
        [th - 0.1, y + 0.08, z],
        [th - 0.35, y + 0.16, z - 0.02],
        [th - 0.5, y + 0.1, z - 0.05],
      ],
      0.008,
    ));
    if (isFront) {
      // tie rod + drag link
      k.add('steel', new THREE.CylinderGeometry(0.024, 0.024, th * 2 - 0.24, 10), {
        pos: [0, y + 0.11, z - 0.16],
        rot: [0, 0, Math.PI / 2],
      });
      k.add('steel', new THREE.CylinderGeometry(0.02, 0.02, th * 1.2, 10), {
        pos: [0.2, y + 0.17, z - 0.24],
        rot: [0, 0, Math.PI / 2 + 0.06],
      });
    }
  }
  return k.build(materials);
}
