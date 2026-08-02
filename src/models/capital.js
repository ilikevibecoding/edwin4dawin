// Capital ships. Units are metres: the destroyer is 1600 m from nose to engine
// bell, the corvette 150 m, and they are staged at those relative sizes so the
// "it just keeps coming" shot works without cheating the scale.

import * as THREE from 'three';
import { prismoid, box, cyl, dome, greebleField, mergeAll, mat, addMesh, ngonPlate } from '../gfx/build.js';
import { hull, paint, emissive, glowPlane, greebled } from '../gfx/materials.js';
import { radialGlow } from '../gfx/textures.js';
import { RNG } from '../util/rng.js';

const GLOW = () => radialGlow();

/**
 * Imperial Star Destroyer: an arrowhead 1600 m long, a stepped superstructure at
 * the stern, three main engine bells, and enough greeble to sell the scale.
 * Nose points down +Z.
 */
export function starDestroyer({ length = 1600, detail = 1, seed = 42 } = {}) {
  const L = length;
  const W = L * 0.61;
  const H = L * 0.156;
  const g = new THREE.Group();
  g.name = 'starDestroyer';
  const r = new RNG(seed);

  const noseZ = L * 0.5;
  const sternZ = -L * 0.5;
  const halfW = W * 0.5;
  const topShrink = 0.86;
  const noseH = H * 0.03;

  // --- main dart hull -------------------------------------------------------
  const hullGeo = prismoid(
    [[-halfW, sternZ], [halfW, sternZ], [halfW * 0.02, noseZ], [-halfW * 0.02, noseZ]],
    [
      [-halfW * topShrink, sternZ, H],
      [halfW * topShrink, sternZ, H],
      [halfW * 0.015, noseZ, noseH],
      [-halfW * 0.015, noseZ, noseH],
    ],
    H,
    { uvScale: 0.0055, capUV: 0.0055 },
  );
  const hullMat = hull({
    color: 0xffffff,
    base: [148, 152, 158],
    seed: 42,
    repeat: [1, 1],
    emissiveMap: true,
    emissiveIntensity: 0.55,
    windowSeed: 5,
    density: 6,
  });
  const hullMesh = new THREE.Mesh(hullGeo, hullMat);
  g.add(hullMesh);

  // Top surface plane: y and half-width as a function of z.
  const topY = (z) => noseH + (H - noseH) * ((noseZ - z) / L);
  const topHalf = (z) => halfW * topShrink * ((noseZ - z) / L);

  // --- surface greebles -----------------------------------------------------
  const superFrontZ = sternZ + L * 0.06;
  const superBackZ = sternZ + L * 0.3;
  const parts = [];
  const gr = new RNG(seed + 1);
  const count = Math.round(700 * detail);
  for (let i = 0; i < count; i++) {
    const z = gr.float(sternZ + L * 0.02, noseZ - L * 0.06);
    const hw = topHalf(z);
    if (hw < 4) continue;
    const x = gr.float(-hw * 0.96, hw * 0.96);
    // Leave room for the superstructure footprint.
    if (z > superFrontZ && z < superBackZ && Math.abs(x) < W * 0.2) continue;
    const s = gr.float(3, 16) * (0.4 + 0.9 * (1 - (noseZ - z) / L));
    const h = gr.float(1.2, 7);
    const bg = box(s * gr.float(0.5, 2.2), h, s * gr.float(0.7, 3.4));
    bg.translate(x, topY(z) + h / 2 - 1, z);
    parts.push([bg, null]);
  }
  // Two long dorsal trenches flanking the spine.
  for (const s of [-1, 1]) {
    for (let i = 0; i < 34; i++) {
      const z = sternZ + L * 0.08 + (i / 34) * L * 0.78;
      const hw = topHalf(z);
      const tg = box(hw * 0.1, 5, (L * 0.78) / 34 + 1);
      tg.translate(s * hw * 0.52, topY(z) - 1.5, z);
      parts.push([tg, null]);
    }
  }
  if (parts.length) {
    const merged = mergeAll(parts);
    parts.forEach(([p]) => p.dispose());
    g.add(new THREE.Mesh(merged, greebled({ color: 0xffffff, seed: 12, repeat: [3, 3], base: [140, 146, 152], lights: 0.02 })));
  }

  // Underside detail + the ventral hangar mouth.
  const under = greebleField({
    seed: seed + 7,
    count: Math.round(520 * detail),
    width: W * 0.88,
    depth: L * 0.86,
    y: 0,
    sizeMin: 6,
    sizeMax: 42,
    heightMin: 3,
    heightMax: 20,
    mask: (x, z) => Math.abs(x) < topHalf(z) * 1.02,
  });
  under.rotateX(Math.PI); // hang downward
  g.add(new THREE.Mesh(under, greebled({ color: 0xffffff, seed: 19, repeat: [4, 4], base: [126, 130, 136], lights: 0.03 })));

  // Longitudinal trenches down the belly, which is what actually sells the
  // scale when the ship passes overhead.
  const bellyParts = [];
  for (const s2 of [-1, 1]) {
    for (let i = 0; i < 30; i++) {
      const z = sternZ + L * 0.06 + (i / 30) * L * 0.82;
      const hw = topHalf(z);
      if (hw < 20) continue;
      const bg = box(hw * 0.14, 10, (L * 0.82) / 30 + 2);
      bg.translate(s2 * hw * 0.46, -5, z);
      bellyParts.push([bg, null]);
      const bg2 = box(hw * 0.06, 16, (L * 0.82) / 30 + 2);
      bg2.translate(s2 * hw * 0.78, -8, z);
      bellyParts.push([bg2, null]);
    }
  }
  for (let i = 0; i < 18; i++) {
    const z = sternZ + L * 0.05 + (i / 18) * L * 0.8;
    const hw = topHalf(z);
    if (hw < 20) continue;
    const bg = box(hw * 1.5, 7, 12);
    bg.translate(0, -4, z);
    bellyParts.push([bg, null]);
  }
  g.add(new THREE.Mesh(mergeAll(bellyParts), greebled({ color: 0xffffff, seed: 20, repeat: [6, 6], base: [112, 116, 122], lights: 0.02 })));
  bellyParts.forEach(([b]) => b.dispose());

  const bayW = W * 0.13;
  const bayL = L * 0.12;
  const bayZ = sternZ + L * 0.22;
  addMesh(g, box(bayW * 1.25, 12, bayL * 1.25), paint(0x4a4f56), { pos: [0, -5, bayZ] });
  addMesh(g, box(bayW, 1, bayL), emissive(0xffd9a0, { opacity: 0.9, blending: THREE.NormalBlending, depthWrite: true }), { pos: [0, -10.4, bayZ] });
  const bayGlow = addMesh(g, new THREE.PlaneGeometry(bayW * 2.4, bayL * 2.4), glowPlane({ color: 0xffc070, opacity: 0.5 }), { pos: [0, -12, bayZ], rot: [Math.PI / 2, 0, 0] });
  bayGlow.renderOrder = 3;

  // --- superstructure -------------------------------------------------------
  const sup = new THREE.Group();
  sup.position.set(0, topY((superFrontZ + superBackZ) / 2) - 4, (superFrontZ + superBackZ) / 2);
  g.add(sup);
  const supMat = hull({ color: 0xffffff, base: [146, 150, 156], seed: 8, repeat: [2, 2], emissiveMap: true, emissiveIntensity: 0.7, windowSeed: 21, density: 4 });
  const blockW = W * 0.34;
  const blockD = L * 0.2;
  addMesh(sup, prismoid(
    [[-blockW / 2, -blockD / 2], [blockW / 2, -blockD / 2], [blockW / 2, blockD / 2], [-blockW / 2, blockD / 2]],
    [[-blockW * 0.4, -blockD * 0.42], [blockW * 0.4, -blockD * 0.42], [blockW * 0.36, blockD * 0.4], [-blockW * 0.36, blockD * 0.4]],
    H * 0.42, { uvScale: 0.02 }), supMat);
  addMesh(sup, prismoid(
    [[-blockW * 0.36, -blockD * 0.36], [blockW * 0.36, -blockD * 0.36], [blockW * 0.32, blockD * 0.3], [-blockW * 0.32, blockD * 0.3]],
    [[-blockW * 0.3, -blockD * 0.3], [blockW * 0.3, -blockD * 0.3], [blockW * 0.26, blockD * 0.26], [-blockW * 0.26, blockD * 0.26]],
    H * 0.3, { uvScale: 0.02 }), supMat, { pos: [0, H * 0.42, 0] });

  // Bridge tower and the command "head".
  const towerY = H * 0.72;
  addMesh(sup, box(W * 0.1, H * 0.34, L * 0.035), supMat, { pos: [0, towerY + H * 0.17, -L * 0.01] });
  const headY = towerY + H * 0.34;
  addMesh(sup, box(W * 0.17, H * 0.13, L * 0.045), supMat, { pos: [0, headY + H * 0.065, 0] });
  // Bridge windows: a bright band across the front of the head.
  addMesh(sup, box(W * 0.15, H * 0.035, 1.5), emissive(0xffe6b0, { blending: THREE.NormalBlending, depthWrite: true }),
    { pos: [0, headY + H * 0.075, L * 0.0235] });
  // Shield generator domes.
  for (const s of [-1, 1]) {
    addMesh(sup, new THREE.SphereGeometry(W * 0.036, 14, 10), supMat, { pos: [s * W * 0.062, headY + H * 0.15, -L * 0.004] });
    addMesh(sup, cyl(W * 0.014, W * 0.02, H * 0.05, 8), paint(0x8f959d), { pos: [s * W * 0.062, headY + H * 0.11, -L * 0.004] });
  }
  addMesh(sup, cyl(0.6, 1.4, H * 0.2, 6), paint(0x777d85), { pos: [0, headY + H * 0.22, -L * 0.012] });

  // --- engines --------------------------------------------------------------
  const engines = new THREE.Group();
  engines.position.z = sternZ;
  g.add(engines);
  const bellMat = paint(0x5f656d, { flat: false });
  const coreMat = emissive(0x7fb8dd, { blending: THREE.NormalBlending, depthWrite: true });
  const mainR = W * 0.09;
  const layout = [
    [0, H * 0.42, mainR],
    [-mainR * 2.25, H * 0.42, mainR],
    [mainR * 2.25, H * 0.42, mainR],
    [-mainR * 3.9, H * 0.34, mainR * 0.44],
    [mainR * 3.9, H * 0.34, mainR * 0.44],
    [-mainR * 1.15, H * 0.72, mainR * 0.36],
    [mainR * 1.15, H * 0.72, mainR * 0.36],
  ];
  g.userData.engineGlows = [];
  for (const [x, y, rad] of layout) {
    addMesh(engines, cyl(rad, rad * 1.05, 14, 20, { alongZ: true }), bellMat, { pos: [x, y, 6] });
    addMesh(engines, new THREE.CircleGeometry(rad * 0.92, 20), coreMat, { pos: [x, y, -1.2], rot: [0, Math.PI, 0] });
    const halo = addMesh(engines, new THREE.PlaneGeometry(rad * 2.3, rad * 2.3), glowPlane({ color: 0x9fd8ff, opacity: 0.09 }), { pos: [x, y, -5] });
    halo.renderOrder = 4;
    g.userData.engineGlows.push(halo);
  }

  g.userData.length = L;
  g.userData.topY = topY;
  return g;
}

/**
 * Rebel blockade runner: hammerhead command pod, slim spine, and eleven engines
 * that make it look like it is running even when it is standing still.
 * Nose +Z.
 */
export function corvette({ length = 150, seed = 3 } = {}) {
  const g = new THREE.Group();
  g.name = 'corvette';
  const L = length;
  const bodyMat = hull({ color: 0xffffff, base: [186, 180, 166], seed: 3, repeat: [2, 1], density: 4, grime: 0.35 });
  const darkMat = paint(0x6d6a63);
  const trimMat = paint(0x8f2f22);

  // Hammerhead command section.
  const headW = L * 0.29;
  const headD = L * 0.11;
  addMesh(g, prismoid(
    [[-headW / 2, -headD / 2], [headW / 2, -headD / 2], [headW * 0.34, headD / 2], [-headW * 0.34, headD / 2]],
    [[-headW * 0.42, -headD * 0.4], [headW * 0.42, -headD * 0.4], [headW * 0.28, headD * 0.42], [-headW * 0.28, headD * 0.42]],
    L * 0.075, { uvScale: 0.06 }), bodyMat, { pos: [0, -L * 0.037, L * 0.42] });
  // Bridge windows.
  addMesh(g, box(headW * 0.5, L * 0.012, 0.6), emissive(0x9fd8ff, { blending: THREE.NormalBlending, depthWrite: true }),
    { pos: [0, L * 0.012, L * 0.42 + headD * 0.5] });

  // Neck.
  addMesh(g, box(L * 0.075, L * 0.05, L * 0.13), darkMat, { pos: [0, 0, L * 0.3] });

  // Main body: long tapered box with a raised spine.
  const bodyW = L * 0.19;
  addMesh(g, prismoid(
    [[-bodyW / 2, -L * 0.28], [bodyW / 2, -L * 0.28], [bodyW * 0.36, L * 0.26], [-bodyW * 0.36, L * 0.26]],
    [[-bodyW * 0.44, -L * 0.28], [bodyW * 0.44, -L * 0.28], [bodyW * 0.3, L * 0.26], [-bodyW * 0.3, L * 0.26]],
    L * 0.1, { uvScale: 0.05 }), bodyMat, { pos: [0, -L * 0.05, 0] });
  addMesh(g, box(bodyW * 0.5, L * 0.035, L * 0.42), bodyMat, { pos: [0, L * 0.06, -L * 0.02] });
  addMesh(g, box(bodyW * 0.9, L * 0.02, L * 0.1), trimMat, { pos: [0, L * 0.048, L * 0.16] });

  // Greeble the spine so the silhouette is not a smooth loaf.
  const gf = greebleField({ seed: seed + 4, count: 130, width: bodyW * 1.1, depth: L * 0.56, y: L * 0.077, sizeMin: 0.5, sizeMax: 2.6, heightMin: 0.3, heightMax: 1.8 });
  gf.translate(0, -L * 0.05, -L * 0.01);
  g.add(new THREE.Mesh(gf, greebled({ color: 0xffffff, seed: 23, repeat: [6, 6], base: [150, 146, 136] })));

  // Engine block: 11 bells in the classic 3-4-4 stack.
  const eng = new THREE.Group();
  eng.position.z = -L * 0.3;
  g.add(eng);
  addMesh(eng, box(bodyW * 1.25, L * 0.115, L * 0.07), darkMat, { pos: [0, -L * 0.03, 0] });
  const bells = [];
  for (let i = 0; i < 3; i++) bells.push([(i - 1) * bodyW * 0.36, L * 0.012, L * 0.026]);
  for (let i = 0; i < 4; i++) bells.push([(i - 1.5) * bodyW * 0.29, -L * 0.032, L * 0.021]);
  for (let i = 0; i < 4; i++) bells.push([(i - 1.5) * bodyW * 0.29, -L * 0.072, L * 0.018]);
  g.userData.engineGlows = [];
  for (const [x, y, rad] of bells) {
    addMesh(eng, cyl(rad, rad * 1.1, L * 0.03, 14, { alongZ: true }), darkMat, { pos: [x, y, 0] });
    addMesh(eng, new THREE.CircleGeometry(rad * 0.85, 14), emissive(0xcfe9ff, { blending: THREE.NormalBlending, depthWrite: true }), { pos: [x, y, -L * 0.017], rot: [0, Math.PI, 0] });
    const halo = addMesh(eng, new THREE.PlaneGeometry(rad * 4.2, rad * 4.2), glowPlane({ color: 0x9fd0ff, opacity: 0.5 }), { pos: [x, y, -L * 0.03] });
    halo.renderOrder = 4;
    g.userData.engineGlows.push(halo);
  }

  // Dorsal and ventral turret blisters.
  for (const s of [1, -1]) {
    const t = new THREE.Group();
    t.position.set(0, s * L * 0.085, L * 0.05);
    g.add(t);
    addMesh(t, dome(L * 0.022, { segments: 12, rings: 6 }), darkMat, { rot: [s > 0 ? 0 : Math.PI, 0, 0] });
    addMesh(t, cyl(L * 0.006, L * 0.006, L * 0.05, 8, { alongZ: true }), paint(0x50535a), { pos: [0, s * L * 0.008, L * 0.022] });
  }

  g.userData.length = L;
  return g;
}

/**
 * Escape pod: a blunt cone with a burnt heat shield, small enough to be beneath
 * an Imperial gunner's notice. Nose +Z.
 */
export function escapePod({ size = 6 } = {}) {
  const g = new THREE.Group();
  const s = size;
  const shell = paint(0xc9c4b6, { flat: false });
  addMesh(g, cyl(s * 0.34, s * 0.5, s, 10, { alongZ: true }), shell);
  addMesh(g, dome(s * 0.34, { segments: 10, rings: 5 }), shell, { pos: [0, 0, s * 0.5], rot: [Math.PI / 2, 0, 0] });
  addMesh(g, cyl(s * 0.5, s * 0.5, s * 0.12, 10, { alongZ: true }), paint(0x39332e), { pos: [0, 0, -s * 0.52] });
  addMesh(g, new THREE.CircleGeometry(s * 0.18, 10), emissive(0x8fd0ff, { blending: THREE.NormalBlending, depthWrite: true }), { pos: [0, s * 0.16, s * 0.42], rot: [-0.6, 0, 0] });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    addMesh(g, box(s * 0.1, s * 0.1, s * 0.22), paint(0x6c6a63), { pos: [Math.cos(a) * s * 0.42, Math.sin(a) * s * 0.42, -s * 0.4] });
  }
  const thruster = addMesh(g, new THREE.PlaneGeometry(s * 2, s * 2), glowPlane({ color: 0xff9b52, opacity: 0 }), { pos: [0, 0, -s * 0.7] });
  thruster.renderOrder = 4;
  g.userData.thruster = thruster;
  return g;
}
