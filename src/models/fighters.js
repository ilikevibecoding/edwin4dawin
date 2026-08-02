// Snubfighters. All of them fly nose-first down +Z and expose
// userData.setThrottle(0..1) so the sequences can flare the engines on a break.

import * as THREE from 'three';
import { box, cyl, dome, ngonPlate, prismoid, addMesh, mergeAll, mirrorPoly } from '../gfx/build.js';
import { hull, paint, emissive, glowPlane, glass, greebled, solarArray } from '../gfx/materials.js';
import { RNG } from '../util/rng.js';

function engineHalo(parent, { pos, size, color = 0xa8dcff }) {
  const halo = addMesh(parent, new THREE.PlaneGeometry(size, size), glowPlane({ color, opacity: 0.5 }), { pos });
  halo.renderOrder = 4;
  return halo;
}

function throttleHook(g, { baseScale = 1 } = {}) {
  const glows = g.userData.engineGlows || [];
  const cores = g.userData.engineCores || [];
  g.userData.setThrottle = (v) => {
    const k = 0.35 + v * 0.85;
    for (const h of glows) {
      h.scale.setScalar(baseScale * k);
      h.material.opacity = 0.18 + v * 0.42;
    }
    for (const c of cores) c.material.opacity = 0.5 + v * 0.5;
  };
  g.userData.setThrottle(0.7);
}

/**
 * X-wing. Four wings on S-foil hinges, four cannons, four engines, and an
 * astromech riding behind the canopy.
 */
export function xwing({ scale = 1, stripe = 0xd0402c, seed = 1, astromechColor = 0x3f7fd8 } = {}) {
  const g = new THREE.Group();
  g.name = 'xwing';
  const s = scale;
  const white = hull({ color: 0xffffff, base: [206, 205, 198], seed: 61, repeat: [3, 3], density: 3, grime: 0.5 });
  const grey = paint(0x8a8d90);
  const dark = paint(0x3a3d42);
  const red = paint(stripe);

  // Fuselage: 12.5 m long, narrow, with a long tapering nose.
  const fl = 12.5 * s;
  const bodyPoly = [
    [-0.52 * s, -fl * 0.5], [0.52 * s, -fl * 0.5],
    [0.52 * s, fl * 0.06], [0.34 * s, fl * 0.3], [-0.34 * s, fl * 0.3], [-0.52 * s, fl * 0.06],
  ];
  addMesh(g, prismoid(bodyPoly, bodyPoly.map(([x, z]) => [x * 0.86, z]), 1.05 * s, { uvScale: 0.16 }),
    white, { pos: [0, -0.5 * s, 0] });
  // Nose: a long shallow wedge, flattened top and bottom.
  addMesh(g, prismoid(
    [[-0.34 * s, 0], [0.34 * s, 0], [0.05 * s, fl * 0.36], [-0.05 * s, fl * 0.36]],
    [[-0.29 * s, 0], [0.29 * s, 0], [0.04 * s, fl * 0.36], [-0.04 * s, fl * 0.36]],
    0.78 * s, { uvScale: 0.16 }), white, { pos: [0, -0.38 * s, fl * 0.3] });
  addMesh(g, box(0.1 * s, 0.1 * s, 0.7 * s), dark, { pos: [0, 0.02 * s, fl * 0.68] });
  // Squadron flashes.
  addMesh(g, box(0.3 * s, 0.06 * s, 2.4 * s), red, { pos: [0, 0.41 * s, fl * 0.4] });
  for (const sx of [-1, 1]) {
    addMesh(g, box(0.05 * s, 0.22 * s, 1.8 * s), red, { pos: [sx * 0.31 * s, -0.02 * s, fl * 0.42] });
    addMesh(g, box(0.05 * s, 0.26 * s, 0.8 * s), red, { pos: [sx * 0.46 * s, -0.16 * s, -fl * 0.34] });
  }

  // Cockpit: low canopy set into the spine.
  addMesh(g, box(1.02 * s, 0.2 * s, 2.7 * s), grey, { pos: [0, 0.5 * s, fl * 0.09] });
  addMesh(g, prismoid(
    [[-0.46 * s, -1.25 * s], [0.46 * s, -1.25 * s], [0.34 * s, 1.3 * s], [-0.34 * s, 1.3 * s]],
    [[-0.3 * s, -1.0 * s], [0.3 * s, -1.0 * s], [0.16 * s, 1.05 * s], [-0.16 * s, 1.05 * s]],
    0.52 * s, { uvScale: 0.2 }), glass(0x121d28, 0.8), { pos: [0, 0.58 * s, fl * 0.09] });

  // Astromech socket behind the canopy.
  const astro = new THREE.Group();
  astro.position.set(0, 0.5 * s, -fl * 0.1);
  g.add(astro);
  addMesh(astro, cyl(0.3 * s, 0.32 * s, 0.3 * s, 12), paint(0xc9cbcc));
  addMesh(astro, dome(0.3 * s, { segments: 12, rings: 6 }), paint(0xdfe1e2), { pos: [0, 0.13 * s, 0] });
  addMesh(astro, box(0.16 * s, 0.13 * s, 0.06 * s), paint(astromechColor), { pos: [0, 0.24 * s, 0.26 * s] });
  addMesh(astro, box(0.34 * s, 0.08 * s, 0.05 * s), paint(astromechColor), { pos: [0, 0.04 * s, 0.3 * s] });

  // Engine + wing assemblies. Each S-foil pivots about the roll axis.
  g.userData.engineGlows = [];
  g.userData.engineCores = [];
  g.userData.wings = [];
  g.userData.cannonTips = [];
  const wingRootZ = -fl * 0.16;
  const span = 5.4 * s;   // per-wing span outboard of the fuselage
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(0, 0, wingRootZ);
      pivot.userData.dir = sx * sy; // sign of the S-foil rotation
      g.add(pivot);
      g.userData.wings.push(pivot);

      // Swept, tapered wing plate. Built for +X then mirrored by polygon so the
      // normals stay outward on both sides.
      const rightPoly = [
        [0.55 * s, -1.9 * s], [span, -1.0 * s], [span, 1.05 * s], [0.55 * s, 1.75 * s],
      ];
      const poly = sx > 0 ? rightPoly : mirrorPoly(rightPoly);
      addMesh(pivot, prismoid(poly, poly, 0.17 * s, { uvScale: 0.16 }),
        white, { pos: [0, sy * 0.33 * s - 0.085 * s, 0] });
      // Red squadron flash near the tip.
      addMesh(pivot, box(1.0 * s, 0.19 * s, 0.42 * s), red, { pos: [sx * span * 0.74, sy * 0.33 * s, 0.35 * s] });
      addMesh(pivot, box(0.14 * s, 0.2 * s, 2.0 * s), grey, { pos: [sx * span * 0.99, sy * 0.33 * s, 0] });

      // Engine nacelle sits on the wing root -- the X-wing's signature.
      const ex = sx * 1.5 * s;
      const ey = sy * 0.72 * s;
      addMesh(pivot, cyl(0.6 * s, 0.66 * s, 4.6 * s, 14, { alongZ: true }), grey, { pos: [ex, ey, -0.5 * s] });
      addMesh(pivot, cyl(0.48 * s, 0.6 * s, 1.0 * s, 14, { alongZ: true }), dark, { pos: [ex, ey, 2.05 * s] });
      addMesh(pivot, cyl(0.66 * s, 0.66 * s, 0.22 * s, 14, { alongZ: true }), dark, { pos: [ex, ey, -0.5 * s] });
      addMesh(pivot, box(0.5 * s, 0.12 * s, 1.5 * s), red, { pos: [ex, ey + 0.6 * s, 0.5 * s] });
      addMesh(pivot, box(0.9 * s, 0.5 * s, 0.9 * s), grey, { pos: [ex * 0.62, ey * 0.55, 0.2 * s] });
      const core = addMesh(pivot, new THREE.CircleGeometry(0.5 * s, 14),
        emissive(0x9fd6f5, { blending: THREE.NormalBlending, depthWrite: true }),
        { pos: [ex, ey, -2.85 * s], rot: [0, Math.PI, 0] });
      g.userData.engineCores.push(core);
      g.userData.engineGlows.push(engineHalo(pivot, { pos: [ex, ey, -3.4 * s], size: 2.3 * s }));

      // Cannon on the wing tip: barrel forward, counterweight aft.
      const cx = sx * span * 1.02;
      const cy = sy * 0.33 * s;
      addMesh(pivot, cyl(0.1 * s, 0.12 * s, 7.2 * s, 8, { alongZ: true }), grey, { pos: [cx, cy, 1.9 * s] });
      addMesh(pivot, cyl(0.15 * s, 0.15 * s, 0.6 * s, 8, { alongZ: true }), dark, { pos: [cx, cy, 5.2 * s] });
      addMesh(pivot, cyl(0.13 * s, 0.16 * s, 1.1 * s, 8, { alongZ: true }), dark, { pos: [cx, cy, -2.2 * s] });
      const tip = new THREE.Object3D();
      tip.position.set(cx, cy, 5.6 * s);
      pivot.add(tip);
      g.userData.cannonTips.push(tip);
    }
  }

  /** 0 = cruise (wings closed), 1 = attack position. */
  g.userData.setSFoils = (open) => {
    const a = open * 0.30;
    for (const w of g.userData.wings) w.rotation.z = w.userData.dir * a;
  };
  g.userData.setSFoils(1);
  throttleHook(g, { baseScale: 1 });
  return g;
}

/** Y-wing style bomber: fills out the rebel formation. */
export function ywing({ scale = 1 } = {}) {
  const g = new THREE.Group();
  const s = scale;
  const body = hull({ color: 0xffffff, base: [188, 182, 164], seed: 71, repeat: [3, 3], density: 3, grime: 0.6 });
  const grey = paint(0x76797e);
  const dark = paint(0x35383c);

  addMesh(g, prismoid(
    [[-0.9 * s, -3 * s], [0.9 * s, -3 * s], [0.62 * s, 5.4 * s], [-0.62 * s, 5.4 * s]],
    [[-0.8 * s, -3 * s], [0.8 * s, -3 * s], [0.5 * s, 5.4 * s], [-0.5 * s, 5.4 * s]],
    1.5 * s, { uvScale: 0.14 }), body, { pos: [0, -0.75 * s, 0] });
  addMesh(g, prismoid(
    [[-0.6 * s, 0], [0.6 * s, 0], [0.16 * s, 2.6 * s], [-0.16 * s, 2.6 * s]],
    [[-0.5 * s, 0], [0.5 * s, 0], [0.12 * s, 2.6 * s], [-0.12 * s, 2.6 * s]],
    1 * s, { uvScale: 0.14 }), body, { pos: [0, -0.5 * s, 5.4 * s] });
  addMesh(g, dome(0.7 * s, { segments: 12, rings: 6 }), glass(0x16222e, 0.7), { pos: [0, 0.72 * s, 3.4 * s] });
  // Exposed engineering spine behind the cockpit.
  const gf = [];
  const r = new RNG(9);
  for (let i = 0; i < 40; i++) {
    const bg = box(r.float(0.2, 0.9) * s, r.float(0.2, 0.7) * s, r.float(0.3, 1.3) * s);
    bg.translate(r.float(-0.7, 0.7) * s, r.float(0.1, 0.7) * s, r.float(-2.6, 1.6) * s);
    gf.push([bg, null]);
  }
  g.add(new THREE.Mesh(mergeAll(gf), greebled({ color: 0xffffff, seed: 44, repeat: [4, 4] })));

  g.userData.engineGlows = [];
  g.userData.engineCores = [];
  for (const sx of [-1, 1]) {
    addMesh(g, box(1.2 * s, 0.5 * s, 1.4 * s), grey, { pos: [sx * 1.9 * s, -0.1 * s, 0.6 * s] });
    addMesh(g, cyl(0.9 * s, 0.95 * s, 11 * s, 12, { alongZ: true }), body, { pos: [sx * 3.1 * s, -0.1 * s, 0.4 * s] });
    addMesh(g, cyl(0.62 * s, 0.9 * s, 2.4 * s, 12, { alongZ: true }), dark, { pos: [sx * 3.1 * s, -0.1 * s, 6.4 * s] });
    addMesh(g, box(1.3 * s, 0.9 * s, 3 * s), grey, { pos: [sx * 3.1 * s, 0.6 * s, -5.4 * s] });
    const core = addMesh(g, new THREE.CircleGeometry(0.72 * s, 12), emissive(0xffc98a, { blending: THREE.NormalBlending, depthWrite: true }), { pos: [sx * 3.1 * s, -0.1 * s, -5.3 * s], rot: [0, Math.PI, 0] });
    g.userData.engineCores.push(core);
    g.userData.engineGlows.push(engineHalo(g, { pos: [sx * 3.1 * s, -0.1 * s, -6 * s], size: 4.4 * s, color: 0xffbf80 }));
  }
  throttleHook(g);
  return g;
}

/**
 * TIE fighter: ball cockpit, two hexagonal solar arrays, and the meanest
 * silhouette in the galaxy.
 */
export function tieFighter({ scale = 1, advanced = false, seed = 2 } = {}) {
  const g = new THREE.Group();
  g.name = advanced ? 'tieAdvanced' : 'tieFighter';
  const s = scale;
  const shell = paint(0x99a1ad, { flat: false });
  const dark = paint(0x2b3038);
  const panelMat = solarArray({ seed: 52, repeat: [1, 1], base: [100, 108, 122] });

  // Cockpit ball.
  const ball = new THREE.Group();
  g.add(ball);
  addMesh(ball, new THREE.SphereGeometry(1.05 * s, 16, 12), shell);
  addMesh(ball, cyl(0.95 * s, 0.95 * s, 0.35 * s, 8, { alongZ: true }), dark, { pos: [0, 0, 0.92 * s], rot: [0, 0, Math.PI / 8] });
  addMesh(ball, ngonPlate(0.8 * s, 8, 0.12 * s, { rotate: Math.PI / 8 }), paint(0x101318), { pos: [0, 0, 1.12 * s], rot: [Math.PI / 2, 0, 0] });
  // Window spider.
  for (let i = 0; i < 4; i++) {
    addMesh(ball, box(1.6 * s, 0.07 * s, 0.06 * s), shell, { pos: [0, 0, 1.19 * s], rot: [0, 0, (i / 4) * Math.PI] });
  }
  addMesh(ball, cyl(0.3 * s, 0.3 * s, 0.2 * s, 8, { alongZ: true }), dark, { pos: [0, 0, 1.2 * s] });
  // Twin blaster cannons under the chin.
  for (const sx of [-1, 1]) {
    addMesh(ball, cyl(0.07 * s, 0.08 * s, 1.5 * s, 6, { alongZ: true }), dark, { pos: [sx * 0.34 * s, -0.86 * s, 0.7 * s] });
  }
  // Rear hatch + ion engine glow.
  addMesh(ball, cyl(0.6 * s, 0.7 * s, 0.3 * s, 10, { alongZ: true }), dark, { pos: [0, 0, -1.0 * s] });
  g.userData.engineCores = [];
  g.userData.engineGlows = [];
  for (const sx of [-1, 1]) {
    const core = addMesh(ball, new THREE.CircleGeometry(0.2 * s, 10), emissive(0xff6a3a, { blending: THREE.NormalBlending, depthWrite: true }), { pos: [sx * 0.3 * s, 0, -1.16 * s], rot: [0, Math.PI, 0] });
    g.userData.engineCores.push(core);
    g.userData.engineGlows.push(engineHalo(ball, { pos: [sx * 0.3 * s, 0, -1.3 * s], size: 1.7 * s, color: 0xff7a44 }));
  }

  // Wing pylons and solar array panels.
  const panelR = 3.0 * s;
  const sides = 6;
  for (const sx of [-1, 1]) {
    addMesh(g, cyl(0.3 * s, 0.34 * s, 1.3 * s, 8), shell, { pos: [sx * 1.4 * s, 0, 0], rot: [0, 0, Math.PI / 2] });
    addMesh(g, box(0.5 * s, 0.9 * s, 0.9 * s), shell, { pos: [sx * 1.9 * s, 0, 0] });
    const wing = new THREE.Group();
    wing.position.set(sx * 2.15 * s, 0, 0);
    if (advanced) wing.rotation.y = sx * 0.18;
    g.add(wing);

    // The array itself: one plate, so nothing z-fights.
    const plate = ngonPlate(panelR, sides, 0.16 * s, { rotate: Math.PI / 2 });
    plate.rotateZ(Math.PI / 2);
    addMesh(wing, plate, panelMat);

    // Frame: one bar per hexagon edge, standing slightly proud of the panel.
    for (let i = 0; i < sides; i++) {
      const a0 = Math.PI / 2 + (i / sides) * Math.PI * 2;
      const a1 = Math.PI / 2 + ((i + 1) / sides) * Math.PI * 2;
      const p0 = [Math.cos(a0) * panelR, Math.sin(a0) * panelR];
      const p1 = [Math.cos(a1) * panelR, Math.sin(a1) * panelR];
      const midY = (p0[0] + p1[0]) / 2;
      const midZ = (p0[1] + p1[1]) / 2;
      const len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
      const ang = Math.atan2(p1[0] - p0[0], p1[1] - p0[1]);
      addMesh(wing, box(0.3 * s, 0.34 * s, len), shell, { pos: [0, midY, midZ], rot: [ang, 0, 0] });
    }
    // Radial ribs across the outer face.
    for (let i = 0; i < 3; i++) {
      addMesh(wing, box(0.24 * s, panelR * 1.52, 0.14 * s), shell, { rot: [(i / 3) * Math.PI + Math.PI / 6, 0, 0] });
    }
    if (advanced) {
      // Bent tips: two angled sub-panels give the Advanced its distinctive Y.
      for (const sy of [-1, 1]) {
        const tip = ngonPlate(panelR * 0.5, 4, 0.14 * s, { rotate: Math.PI / 4 });
        tip.rotateZ(Math.PI / 2);
        addMesh(wing, tip, panelMat, { pos: [0, sy * panelR * 1.16, sx * panelR * 0.16], rot: [0, sx * -0.5, 0] });
      }
    }
  }

  if (advanced) {
    addMesh(g, prismoid(
      [[-0.7 * s, -1.2 * s], [0.7 * s, -1.2 * s], [0.4 * s, 1.4 * s], [-0.4 * s, 1.4 * s]],
      [[-0.5 * s, -1.0 * s], [0.5 * s, -1.0 * s], [0.3 * s, 1.2 * s], [-0.3 * s, 1.2 * s]],
      0.5 * s, { uvScale: 0.2 }), dark, { pos: [0, 0.9 * s, -0.2 * s] });
  }

  throttleHook(g);
  return g;
}
