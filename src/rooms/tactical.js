// Tactical Operations / Holographic Planning (deck A): an octagonal dais with a large circular holo
// tank projecting a wireframe of the Star Destroyer itself with orbiting contact markers, a briefing
// rail around the dais edge, standing stations with stools on the main floor and on two raised side
// galleries (all facing the tank), a huge situation-map wall with a lean rail, pulsing red alert lamps,
// dark ceiling with a thin recessed ring cove and a downlight over the dais, blue key light from the
// tank (the brightest object). Accent blue; the door-to-dais runway is the one kept on this deck.
import * as THREE from "three";
import { PALETTE } from "../materials.js";
import { impRoomShell, impRailing, impPillar, impWallGear, impWallLight, lux } from "./imperial_kit.js";
import { IMP_DECAL } from "../textures_imperial.js";
import { deckASetup, yawToward, behind, station, dataBank, wallScreen, indicatorRow, conduitRun, projectorCone, wireDestroyerGeometry, wireGridGeometry, wireRingGeometry, lineSegments, mergedMesh, stepBlock, alertLamp, ceilingRingLight, downlight, segRailing, datapad, cup } from "./deck_a_kit.js";

export function buildTactical(kit, ctx, room) {
  const [w, h, d] = room.size;
  const hx = w / 2;
  const hz = d / 2;
  const M = ctx.materials;
  deckASetup(kit);
  const accentKey = "emitBlue";
  const dimKey = "emitBlueDim";
  const blue = new THREE.Color(room.accent || "#3fb0ff").getHex();

  // ---- shell: wide panels over a low dado band; dark ceiling without troughs (ring cove + downlight) --
  const walls = impRoomShell(kit, room, ctx.doors, {
    accentKey,
    seed: 7703,
    wall: { panelW: 1.95, bands: [1.25], features: { vent: 0.06, equipment: 0.1, conduit: 0.04, light: 0.02, screen: 0.08 }, altChance: 0.22 },
    walls: { E: { features: { vent: 0.04, equipment: 0.0, conduit: 0.0, light: 0.0, screen: 0.0 } } },
    floor: { lane: false },
    ceiling: { troughs: 0, withLights: false, dark: PALETTE.impBlack, beamStep: 3.7 },
  });
  // thin dim cove line (0.1 m emitter in a 0.3 m channel) instead of the glowing ring; one downlight over the dais
  ceilingRingLight(kit, 0, 0, 5.4, h, 16, { key: "emitWhiteDim", w: 0.3, emitW: 0.1, drop: 0.2 });
  downlight(kit, 0, h, 0, { r: 0.28, key: "emitWhiteSoft" });
  // small blue ceiling markers on a wider ring
  for (let i = 0; i < 8; i++) {
    const a = (i + 0.5) * (Math.PI / 4);
    kit.box("impTrim", Math.cos(a) * 8.2, h - 0.04, Math.sin(a) * 8.2, 0.5, 0.08, 0.5, { color: PALETTE.impBlack });
    kit.box(dimKey, Math.cos(a) * 8.2, h - 0.085, Math.sin(a) * 8.2, 0.3, 0.02, 0.3);
  }

  // ---- floor markings: the door-to-dais runway (kept), a dark inlay from the dais to the map wall,
  // a dim ring around the dais
  const R = 4.4; // dais circumradius (octagon)
  const A = R * Math.cos(Math.PI / 8); // apothem
  const S = R * Math.sin(Math.PI / 8); // half flat
  const daisY = 0.36;
  for (const s of [-1, 1]) {
    const x0 = s < 0 ? -hx + 0.5 : A + 1.05;
    const x1 = s < 0 ? -A - 1.05 : hx - 1.9;
    kit.boxMM(s < 0 ? "impMetalRough" : "impDeck", [x0, 0, -1.3], [x1, 0.012, 1.3], { color: PALETTE.impGreyDark, texel: 0.7 });
    for (const e of [-1, 1]) {
      if (s < 0) kit.boxMM(accentKey, [x0, 0.002, e * 1.34 - 0.02], [x1, 0.014, e * 1.34 + 0.02]);
      else {
        kit.boxMM("impTrim", [x0, 0.002, e * 1.34 - 0.04], [x1, 0.014, e * 1.34 + 0.04], { color: PALETTE.impBlack });
        kit.boxMM(dimKey, [x0, 0.004, e * 1.34 - 0.01], [x1, 0.016, e * 1.34 + 0.01]);
      }
    }
    kit.box("chevronY", s < 0 ? x1 + 0.2 : x0 - 0.2, 0.005, 0, 0.3, 0.01, 2.6, { texel: 1.5 });
  }
  kit.add(dimKey, new THREE.RingGeometry(5.3, 5.35, 96).rotateX(-Math.PI / 2), { pos: [0, 0.006, 0], uv: "keep" });
  kit.add("impTrim", new THREE.RingGeometry(5.36, 5.6, 96).rotateX(-Math.PI / 2), { pos: [0, 0.005, 0], color: PALETTE.impBlack });

  // ---- dais: octagon, two steps up on the W (door) and E (map) sides, rail on the other six flats --
  kit.add("impMetal", new THREE.CylinderGeometry(R + 0.1, R + 0.1, 0.12, 8).rotateY(Math.PI / 8), { pos: [0, 0.06, 0], color: PALETTE.impCharcoal, texel: 1 });
  kit.add("impTrim", new THREE.CylinderGeometry(R, R, 0.34, 8).rotateY(Math.PI / 8), { pos: [0, 0.17, 0], color: PALETTE.impBlack, texel: 1 });
  kit.add(accentKey, new THREE.CylinderGeometry(R + 0.03, R + 0.03, 0.025, 8, 1, true).rotateY(Math.PI / 8), { pos: [0, 0.295, 0], uv: "keep" });
  kit.add("impDeck", new THREE.CylinderGeometry(R + 0.05, R + 0.05, 0.06, 8).rotateY(Math.PI / 8), { pos: [0, daisY - 0.03, 0], color: PALETTE.impGrey, texel: 0.7 });
  kit.add("impTrim", new THREE.RingGeometry(R - 0.25, R - 0.19, 8, 1).rotateX(-Math.PI / 2).rotateY(Math.PI / 8), { pos: [0, daisY + 0.004, 0], color: PALETTE.impBlack });
  // walkable top: five rects approximating the octagon
  kit.floor(-A, -S, A, S, daisY, "dais");
  kit.floor(-S, -A, S, A, daisY, "dais");
  kit.floor(-2.87, -2.87, 2.87, 2.87, daisY, "dais");
  kit.floor(-3.5, -2.2, 3.5, 2.2, daisY, "dais");
  kit.floor(-2.2, -3.5, 2.2, 3.5, daisY, "dais");
  stepBlock(kit, "x", -A - 0.95, -A, -1.5, 1.5, 0, daisY, 2, { accentKey });
  stepBlock(kit, "x", A + 0.95, A, -1.5, 1.5, 0, daisY, 2, { accentKey });
  // briefing rail around the dais edge (six flats; the E/W flats are the step openings). Segmented
  // colliders: a single AABB per diagonal flat would fence off the dais corners.
  for (let k = 0; k < 8; k++) {
    if (k === 0 || k === 4) continue; // E and W flats
    const a0 = -Math.PI / 8 + (k * Math.PI) / 4;
    const a1 = a0 + Math.PI / 4;
    const p0 = [Math.cos(a0) * (R - 0.12), Math.sin(a0) * (R - 0.12)];
    const p1 = [Math.cos(a1) * (R - 0.12), Math.sin(a1) * (R - 0.12)];
    segRailing(kit, p0, p1, daisY, { light: accentKey, postStep: 1.7 });
  }

  // ---- holo tank ----------------------------------------------------------------------------------
  const tr = 1.5;
  const tTop = daisY + 0.8;
  kit.cyl("impMetal", 0, daisY + 0.07, 0, tr + 0.1, 0.14, "y", { color: PALETTE.impCharcoal, segments: 32, texel: 1 });
  kit.cyl("impTrim", 0, daisY + 0.4, 0, tr, 0.8, "y", { color: PALETTE.impBlack, segments: 32, texel: 1 });
  kit.cyl("impMetal", 0, daisY + 0.46, 0, tr + 0.03, 0.26, "y", { color: PALETTE.impGreyDark, segments: 32, texel: 1 });
  kit.cyl(accentKey, 0, daisY + 0.46, 0, tr + 0.055, 0.03, "y", { segments: 32, open: true, uv: "keep" });
  kit.cyl("impGloss", 0, tTop + 0.025, 0, tr + 0.06, 0.05, "y", { segments: 32 });
  kit.cyl("impTrim", 0, tTop + 0.065, 0, 1.15, 0.03, "y", { color: PALETTE.impCharcoal, segments: 32 });
  kit.add(accentKey, new THREE.TorusGeometry(1.0, 0.012, 6, 64).rotateX(Math.PI / 2), { pos: [0, tTop + 0.09, 0] });
  kit.add(accentKey, new THREE.TorusGeometry(0.45, 0.01, 6, 40).rotateX(Math.PI / 2), { pos: [0, tTop + 0.09, 0] });
  kit.cyl("impGloss", 0, tTop + 0.1, 0, 0.12, 0.04, "y", { segments: 16, r2: 0.08 });
  // control strip: keys and four small readouts around the gloss annulus
  for (let i = 0; i < 32; i++) {
    const a = (i / 32) * Math.PI * 2;
    const key = i % 8 === 0 ? accentKey : i % 8 === 3 ? "emitWhite" : i % 8 === 5 ? "emitRedImp" : "impGloss";
    kit.box(key, Math.cos(a) * 1.47, tTop + 0.062, Math.sin(a) * 1.47, 0.07, 0.024, 0.08, { rot: [0, -a, 0] });
  }
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    kit.add(i % 2 ? "scrBlue0" : "scrBlue1", new THREE.PlaneGeometry(0.4, 0.18).rotateX(-Math.PI / 2), { pos: [Math.cos(a) * 1.3, tTop + 0.058, Math.sin(a) * 1.3], rot: [0, -a + Math.PI / 2, 0], uv: "keep" });
  }
  // colliders approximating the round tank (union of five boxes)
  for (const [ex, ez] of [[1.62, 0.5], [0.5, 1.62], [1.14, 1.14], [1.46, 0.86], [0.86, 1.46]]) kit.collider([-ex, daisY, -ez], [ex, tTop + 0.12, ez], "tank");
  cup(kit, Math.cos(3.49) * 1.3, tTop + 0.05, Math.sin(3.49) * 1.3);

  // ---- hologram: the ship, a plotting grid, orbiting contacts -------------------------------------
  {
    const baseY = tTop + 0.55;
    projectorCone(kit, 0, tTop + 0.12, 0, baseY, 0.11, 1.12, "deckA_holoDim");
    const grid = new THREE.Group();
    grid.position.set(0, baseY, 0);
    grid.add(lineSegments(wireGridGeometry(2.3, 8, 0), M.deckA_holoLineDim));
    grid.add(lineSegments(wireRingGeometry(1.15, 64, 0.002), M.deckA_holoLine));
    kit.attach(grid);
    const ship = new THREE.Group();
    ship.position.set(0, baseY + 0.42, 0);
    ship.add(lineSegments(wireDestroyerGeometry(1.5), M.deckA_holoLineBright));
    // faint hull fill so the wedge reads as a solid from a distance
    const wedge = new THREE.BufferGeometry();
    const L = 1.5;
    const nz = (z) => ((z + 200) / 1600) * L;
    const bow = [0, -0.005, nz(-1000)];
    const W = (480 / 1600) * L;
    const yT = (52 / 1600) * L;
    const yB = (-78 / 1600) * L;
    const zS = nz(600);
    wedge.setAttribute("position", new THREE.Float32BufferAttribute([...bow, -W, yT, zS, W, yT, zS, ...bow, W, yB, zS, -W, yB, zS], 3));
    ship.add(new THREE.Mesh(wedge, M.holo));
    kit.attach(ship);
    // contacts: three orbit groups at different radii, tilts and speeds (hostile red, friendly blue)
    const orbits = [];
    const mk = (r, tilt, n, mat, size, ring) => {
      const geos = [];
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + r;
        geos.push(new THREE.BoxGeometry(size, size, size).translate(Math.cos(a) * r, 0.05 * Math.sin(i * 2.1), Math.sin(a) * r));
      }
      const g = new THREE.Group();
      g.position.set(0, baseY + 0.42, 0);
      g.rotation.x = tilt;
      g.add(mergedMesh(geos, mat));
      if (ring) g.add(lineSegments(wireRingGeometry(r, 64, 0), M.deckA_holoLineDim));
      kit.attach(g);
      orbits.push(g);
    };
    mk(1.05, 0.12, 3, M.emitRedImp, 0.055, true);
    mk(0.82, -0.2, 2, M.holoBright, 0.05, false);
    mk(1.25, 0.32, 4, M.holoBright, 0.045, true);
    const sweep = new THREE.Mesh(new THREE.CircleGeometry(1.15, 40, 0, Math.PI * 0.5).rotateX(-Math.PI / 2), M.holo);
    sweep.position.set(0, baseY + 0.004, 0);
    sweep.castShadow = sweep.receiveShadow = false;
    kit.attach(sweep);
    kit.onUpdate((dt, t) => {
      ship.rotation.y = t * 0.18;
      orbits[0].rotation.y = -t * 0.22;
      orbits[1].rotation.y = t * 0.35;
      orbits[2].rotation.y = t * 0.11;
      sweep.rotation.y = -t * 0.9;
    });
  }

  // ---- main-floor standing stations on the diagonals, facing the tank (kick recess, conduits, stools) --
  {
    let k = 0;
    const sets = [["scrBlue0", "scrBlue2", "scrWhite1"], ["scrBlue1", "scrWhite0", "scrBlue3"], ["scrBlue2", "scrWhite3", "scrBlue0"], ["scrBlue3", "scrBlue1", "scrWhite2"]];
    for (const a of [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4]) {
      const x = Math.cos(a) * 7.0;
      const z = Math.sin(a) * 7.0;
      const yaw = yawToward(x, z, 0, 0);
      station(kit, x, 0, z, 2.4, 0.9, { yaw, seed: 40 + k, screens: sets[k], accentKey, hoodKey: dimKey, height: 1.0, stool: true, stoolH: 0.7, conduits: 2 });
      if (k === 1) {
        const [dx, dz] = behind(x + Math.cos(yaw) * 0.85, z - Math.sin(yaw) * 0.85, yaw, 0.42);
        datapad(kit, dx, 1.004, dz, yaw - 0.3, { screen: "scrBlue2", accentKey });
      }
      k++;
    }
  }

  // ---- raised side galleries (N / S) with steps, railings and four consoles each ----------------
  const gY = 0.36;
  const gIn = 7.8;
  for (const s of [-1, 1]) {
    const z0 = s * gIn;
    const z1 = s * (hz - 0.05);
    kit.boxMM("impTrim", [-10.5, 0, Math.min(z0, z1)], [10.5, gY - 0.06, Math.max(z0, z1)], { color: PALETTE.impBlack, texel: 1 });
    kit.boxMM("impDeck", [-10.55, gY - 0.06, Math.min(z0 - s * 0.05, z1)], [10.55, gY, Math.max(z0 - s * 0.05, z1)], { color: PALETTE.impGrey, texel: 0.7 });
    kit.boxMM(accentKey, [-10.56, gY - 0.1, Math.min(z0, z0 - s * 0.07)], [10.56, gY - 0.075, Math.max(z0, z0 - s * 0.07)]);
    kit.boxMM("impTrim", [-10.55, gY + 0.002, Math.min(z0 + s * 0.29, z0 + s * 0.35)], [10.55, gY + 0.008, Math.max(z0 + s * 0.29, z0 + s * 0.35)], { color: PALETTE.impBlack });
    kit.floor(-10.5, Math.min(z0, z1), 10.5, Math.max(z0, z1), gY, "gallery");
    stepBlock(kit, "z", s * (gIn - 0.95), z0, -1.3, 1.3, 0, gY, 2, { accentKey: dimKey });
    impRailing(kit, [-10.5, z0], [-1.45, z0], gY);
    impRailing(kit, [1.45, z0], [10.5, z0], gY);
    impRailing(kit, [-10.5, z0], [-10.5, z1], gY);
    impRailing(kit, [10.5, z0], [10.5, z1], gY);
    let gk = 0;
    for (const x of [-7.9, -3.7, 3.7, 7.9]) {
      const z = s * (gIn + 1.25);
      const yaw = yawToward(x, z, 0, 0);
      station(kit, x, gY, z, 2.5, 0.9, { yaw, seed: 60 + Math.round(x) + (s > 0 ? 20 : 0), screens: [["scrBlue0", "scrWhite2", "scrBlue1"], ["scrBlue3", "scrWhite0", "scrBlue2"], ["scrBlue1", "scrWhite3", "scrBlue0"], ["scrBlue2", "scrWhite1", "scrBlue3"]][(gk + (s > 0 ? 2 : 0)) % 4], accentKey, hoodKey: dimKey, height: 1.0, stool: true, stoolH: 0.7, conduits: 2 });
      gk++;
    }
    // gallery wall: readouts above the consoles, indicator rows, conduits along the cornice
    const f = walls[s < 0 ? "N" : "S"].frame;
    const toU = (x) => (s < 0 ? x + hx : hx - x);
    let i = 0;
    for (const x of [-6.8, 0, 6.8]) {
      wallScreen(f, toU(x), 3.5, 2.2, 1.0, i === 1 ? (s < 0 ? "scrBlue1" : "scrWhite1") : s < 0 ? (i ? "scrBlue2" : "scrBlue0") : i ? "scrBlue3" : "scrWhite2", { accentKey, n0: 0.08 });
      indicatorRow(f, toU(x), 2.7, 0.1, 12, { accentKey, seed: 70 + i + (s > 0 ? 5 : 0), step: 0.12, size: 0.05 });
      i++;
    }
    conduitRun(f, hx - 11.4, hx + 11.4, h - 0.85, { n: 0.16, pipes: 3, seed: s < 0 ? 15 : 16, clampStep: 2.4 });
    f.decal(IMP_DECAL.glyphs2, toU(-3.5), 4.6, 0.09, 0.5);
    f.decal(IMP_DECAL.arrowRight, toU(3.5), 4.6, 0.09, 0.5);
    impWallLight(f, toU(-10.2), 4.4, { key: accentKey, w: 0.8 });
    impWallLight(f, toU(10.2), 4.4, { key: accentKey, w: 0.8 });
  }
  // structural pillars at the gallery corners
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) impPillar(kit, sx * 11.6, sz * 7.2, h, { w: 0.55, accentKey });

  // ---- E wall: situation map with lean rail, flanking readouts, tactical computers ---------------
  {
    const f = walls.E.frame;
    wallScreen(f, hz, 3.2, 4.0, 2.0, "deckA_tacMap", { accentKey, n0: 0.08, frameW: 0.22 });
    for (const s of [-1, 1]) {
      wallScreen(f, hz + s * 3.7, 3.1, 1.8, 1.0, s < 0 ? "scrBlue1" : "scrBlue0", { accentKey, n0: 0.08 });
      indicatorRow(f, hz + s * 3.7, 2.3, 0.1, 10, { accentKey, seed: 80 + s, step: 0.12, size: 0.05 });
      dataBank(f, hz + s * 6.4, { w: 1.2, h: 2.4, accentKey, screen: s < 0 ? "scrBlue0" : "scrBlue3", seed: 90 + s, decal: IMP_DECAL.glyphs1 });
    }
    // header strip over the map + stencils
    f.box("impTrim", hz, 4.62, 0.08, 4.6, 0.16, 0.08, { color: PALETTE.impBlack });
    f.box(accentKey, hz, 4.62, 0.125, 4.2, 0.03, 0.012);
    f.decal(IMP_DECAL.glyphs3, hz, 5.1, 0.09, 0.6);
    f.decal(IMP_DECAL.cog, hz - 5.2, 1.4, 0.09, 0.4);
    f.decal(IMP_DECAL.cog, hz + 5.2, 1.4, 0.09, 0.4);
    impWallLight(f, hz - 8.2, 4.6, { key: accentKey, w: 0.8 });
    impWallLight(f, hz + 8.2, 4.6, { key: accentKey, w: 0.8 });
    // lean rail 1.6 m in front of the map, dim floor line beneath it
    impRailing(kit, [hx - 1.6, -3.3], [hx - 1.6, 3.3], 0, { postStep: 1.65 });
    kit.boxMM("impTrim", [hx - 1.7, 0.002, -3.4], [hx - 1.5, 0.01, 3.4], { color: PALETTE.impBlack });
    kit.boxMM(dimKey, [hx - 1.62, 0.004, -3.3], [hx - 1.58, 0.012, 3.3]);
  }

  // ---- W wall (door): status board, gear cluster, stencils, tactical computers ------------------
  {
    const f = walls.W.frame;
    wallScreen(f, hz - 4.6, 2.3, 1.6, 0.9, "scrBlue0", { accentKey, n0: 0.08 });
    indicatorRow(f, hz - 4.6, 1.6, 0.1, 8, { accentKey, seed: 97, step: 0.12, size: 0.05 });
    impWallGear(f, hz + 4.6, 1.5, { seed: 98, accentKey });
    f.decal(IMP_DECAL.glyphs1, hz - 2.4, 2.2, 0.09, 0.5);
    f.decal(IMP_DECAL.arrowRight, hz + 2.4, 2.2, 0.09, 0.5);
    f.decal(IMP_DECAL.keepClear, hz, 3.5, 0.09, 0.7);
    dataBank(f, hz - 8.6, { w: 1.2, h: 2.4, accentKey, screen: "scrWhite0", seed: 93 });
    dataBank(f, hz + 8.6, { w: 1.2, h: 2.4, accentKey, screen: "scrBlue1", seed: 94 });
    impWallLight(f, hz - 7.0, 4.4, { key: accentKey, w: 0.8 });
    impWallLight(f, hz + 7.0, 4.4, { key: accentKey, w: 0.8 });
  }

  // ---- alert lamps in the four corners (lenses merged, pulsing) ---------------------------------
  {
    const lenses = [];
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) lenses.push(alertLamp(kit, sx * (hx - 0.1), 4.7, sz * 9.7, sx < 0 ? Math.PI / 2 : -Math.PI / 2));
    const lamp = mergedMesh(lenses, M.deckA_emitRedPulse);
    kit.attach(lamp);
    const mat = M.deckA_emitRedPulse;
    kit.onUpdate((dt, t) => {
      mat.emissiveIntensity = 0.5 + 2.2 * (0.5 + 0.5 * Math.sin(t * 1.6));
    });
  }

  // ---- lights -----------------------------------------------------------------------------------
  // downlight over the dais (the fixture is drawn at the ceiling) + the tank's own blue glow: brightest object
  kit.light({ type: "spot", pos: [0, h - 0.3, 0], target: [0, tTop, 0], color: 0xdfe8ff, intensity: lux(h - 0.3 - tTop, 2.6), distance: 13, angle: 0.62, penumbra: 0.5, shadow: true, priority: 0.95 });
  kit.light({ type: "point", pos: [0, tTop + 0.95, 0], color: blue, intensity: 12.0, distance: 14, priority: 0.7 });
  kit.light({ type: "point", pos: [0, h - 0.6, -8.8], color: 0xe4ecff, intensity: lux(h - 0.6 - gY, 1.1), distance: 14, priority: 0.5 });
  kit.light({ type: "point", pos: [0, h - 0.6, 8.8], color: 0xe4ecff, intensity: lux(h - 0.6 - gY, 1.1), distance: 14, priority: 0.49 });
  kit.light({ type: "point", pos: [10.2, h - 0.8, 0], color: 0xe4ecff, intensity: lux(h - 0.8, 1.0), distance: 13, priority: 0.52 });
  kit.light({ type: "point", pos: [-10.2, h - 0.8, 0], color: 0xe4ecff, intensity: lux(h - 0.8, 1.1), distance: 13, priority: 0.51 });
  // blue practicals low over the two door-side floor stations so their control surfaces read
  kit.light({ type: "point", pos: [-5.4, 1.9, -5.4], color: blue, intensity: 5.0, distance: 7, priority: 0.36 });
  kit.light({ type: "point", pos: [-5.4, 1.9, 5.4], color: blue, intensity: 5.0, distance: 7, priority: 0.35 });
}
