// Navigation & Flight Control (deck A): a wide curved navigator's bank (five stations on an arc, lit
// grey control surfaces under amber hood practicals, a chair at every seat) facing a forward star-chart
// wall of three big framed screens, a second row of plotting stations and two astrogation racks by the
// entry, a plotting grid on the deck, an astrogation computer column ringed with amber lamps, a
// hyperspace jump-lever pedestal, a plotting table with a hyperlane hologram (a blip travels the lane).
// Accent amber; one fixture temperature (warm amber-white) for the recessed ceiling slots, the key
// over the arc and the fills, amber instrument practicals everywhere else; no floor lane — two
// standing console pods hold the centreline between the door and the arc.
import * as THREE from "three";
import { PALETTE, setDomain } from "../materials.js";
import { impRoomShell, impChair, impPillar, impWallGear, impWallLight, lux } from "./imperial_kit.js";
import { IMP_DECAL } from "../textures_imperial.js";
import { deckASetup, yawToward, behind, yawFrame, station, dataBank, sealedCabinet, wallScreen, indicatorRow, conduitRun, holoTable, projectorCone, wireSphereGeometry, wireGridGeometry, wireGraphGeometry, wireDestroyerGeometry, mergedLines, mergedMesh, datapad, cup, helmet, datapadRack } from "./deck_a_kit.js";

export function buildNavigation(kit, ctx, room) {
  const [w, h, d] = room.size;
  const hx = w / 2;
  const hz = d / 2;
  const M = ctx.materials;
  deckASetup(kit);
  const accentKey = "emitAmber";
  const dimKey = "emitAmberDim";
  const amber = new THREE.Color(room.accent || "#ffb347").getHex();
  const WARM = 0xffd9b0; // fixture colour: warm amber-white
  if (!M.deckA_navSlot) {
    // recessed ceiling slot emitter in the room's warm temperature (the dim white slot's level)
    const m = M.emitWhiteDim.clone();
    m.emissive = new THREE.Color("#ffd2a0");
    M.deckA_navSlot = setDomain(m, "interior");
  }

  // ---- shell: narrow panel columns; recessed warm slots in two troughs ----------------------------
  const walls = impRoomShell(kit, room, ctx.doors, {
    accentKey,
    seed: 5150,
    wall: { panelW: 1.35, features: { vent: 0.07, equipment: 0.1, conduit: 0.04, light: 0.0, screen: 0.1 }, altChance: 0.2 },
    walls: { S: { features: { vent: 0.05, equipment: 0.0, conduit: 0.0, light: 0.0, screen: 0.0 }, corniceLight: false } },
    floor: { lane: false },
    ceiling: { troughs: 2, troughW: 0.5, beamStep: 3.4, lightKey: "deckA_navSlot" },
  });
  // faint amber floor line along the chart wall
  kit.boxMM(dimKey, [-7.0, 0.002, hz - 0.72], [7.0, 0.014, hz - 0.68]);

  // ---- two standing console pods on the centreline between the door and the arc, both worked from
  // the entry side facing the chart wall (their sloped control surfaces read from the door) -------
  station(kit, 0, 0, -5.6, 1.6, 0.85, { yaw: yawToward(0, -5.6, 0, 3), seed: 33, screens: ["scrAmber3", "scrWhite2"], accentKey, hoodKey: dimKey, height: 1.05, conduits: 1 });
  station(kit, 0, 0, -1.4, 1.6, 0.85, { yaw: yawToward(0, -1.4, 0, 3), seed: 34, screens: ["scrAmber0", "scrBlue3"], accentKey, hoodKey: dimKey, height: 1.05, conduits: 1 });

  // ---- star-chart wall (S): one black surround, centre chart + two stacked flanking screens ------
  {
    const f = walls.S.frame;
    const u = hx;
    f.box("impTrim", u, 2.6, 0.12, 12.8, 3.4, 0.16, { color: PALETTE.impBlack, texel: 1 });
    f.box("impMetal", u, 4.42, 0.14, 12.8, 0.24, 0.05, { color: PALETTE.impCharcoal, texel: 2 });
    f.box(accentKey, u, 4.42, 0.17, 12.2, 0.03, 0.012);
    for (let k = 0; k < 6; k++) f.box(k % 3 === 0 ? accentKey : k % 3 === 1 ? "emitWhite" : "impGloss", u - 5.6 + k * 0.16, 4.42, 0.172, 0.08, 0.08, 0.012);
    f.decal(IMP_DECAL.glyphs3, u + 5.2, 4.42, 0.172, 0.2);
    // centre: the star chart
    f.box("impGloss", u, 2.55, 0.205, 5.34, 2.74, 0.01);
    f.screen("deckA_starChart", u, 2.55, 0.216, 5.2, 2.6);
    f.box(accentKey, u, 1.1, 0.205, 4.6, 0.03, 0.012);
    f.decal(IMP_DECAL.glyphs2, u - 2.3, 3.98, 0.212, 0.14);
    // flanks: blue plot above, white telemetry below, indicator row at the foot
    for (const s of [-1, 1]) {
      const fu = u + s * 4.35;
      f.box("impGloss", fu, 3.25, 0.205, 2.5, 1.3, 0.01);
      f.screen("scrBlue1", fu, 3.25, 0.216, 2.4, 1.2);
      f.box("impGloss", fu, 1.85, 0.205, 2.5, 1.3, 0.01);
      f.screen(s < 0 ? "scrWhite0" : "scrWhite1", fu, 1.85, 0.216, 2.4, 1.2);
      f.box("impTrim", fu, 2.55, 0.207, 2.5, 0.06, 0.012, { color: PALETTE.impBlack });
      indicatorRow(f, fu, 1.08, 0.205, 12, { accentKey, seed: s < 0 ? 31 : 32, step: 0.14, size: 0.05 });
      f.decal(IMP_DECAL.glyphs1, fu - 1.0, 3.98, 0.212, 0.14);
    }
    for (const [bu, bv] of [[-6.2, 1.1], [6.2, 1.1], [-6.2, 4.1], [6.2, 4.1]]) f.cylN("impMetal", u + bu, bv, 0.205, 0.02, 0.02, { color: PALETTE.impGreyDark, segments: 8 });
    // plotting ledge under the wall: a black shelf with keys and toggles
    f.box("impTrim", u, 0.95, 0.3, 12.4, 0.1, 0.5, { color: PALETTE.impBlack, texel: 1 });
    f.box("impGloss", u, 1.005, 0.3, 12.2, 0.02, 0.44);
    for (let k = 0; k < 40; k++) f.box(k % 8 === 0 ? accentKey : k % 8 === 4 ? "emitWhite" : "impGloss", u - 5.85 + k * 0.3, 1.025, 0.44, 0.09, 0.02, 0.07);
    for (let k = 0; k < 5; k++) f.cylV("impMetal", u - 4.8 + k * 2.4, 1.045, 0.24, 0.035, 0.05, { color: PALETTE.impGrey, segments: 10 });
    f.collider(u - 6.4, u + 6.4, 0, 4.6, 0, 0.56, "chartwall");
    f.decal(IMP_DECAL.cog, u - 9.0, 2.2, 0.09, 0.45);
    f.decal(IMP_DECAL.cog, u + 9.0, 2.2, 0.09, 0.45);
    impWallLight(f, u - 9.0, 3.6, { key: accentKey, w: 0.8 });
    impWallLight(f, u + 9.0, 3.6, { key: accentKey, w: 0.8 });
  }

  // ---- plotting grid on the deck in front of the chart wall -----------------------------------
  {
    const x0 = -6.0;
    const x1 = 6.0;
    const z0 = 4.6;
    const z1 = 8.8;
    kit.boxMM("impMetalRough", [x0, 0, z0], [x1, 0.01, z1], { color: PALETTE.impGreyDark, texel: 0.7 });
    for (let i = 0; i <= 20; i++) {
      const x = x0 + i * 0.6;
      const major = i % 5 === 0;
      kit.boxMM(major ? accentKey : "impTrim", [x - 0.01, 0.01, z0], [x + 0.01, major ? 0.018 : 0.016, z1], { color: PALETTE.impBlack });
    }
    for (let i = 0; i <= 7; i++) {
      const z = z0 + i * 0.6;
      const major = i === 0 || i === 7;
      kit.boxMM(major ? accentKey : "impTrim", [x0, 0.01, z - 0.01], [x1, major ? 0.018 : 0.016, z + 0.01], { color: PALETTE.impBlack });
    }
    for (const [x, z] of [[-3.6, 6.4], [1.2, 7.6], [3.6, 5.2]]) kit.add(accentKey, new THREE.RingGeometry(0.16, 0.2, 24).rotateX(-Math.PI / 2), { pos: [x, 0.02, z], uv: "keep" });
  }

  // ---- navigator's bank (five stations on an arc) facing the chart wall, a chair at every seat ----
  const cz0 = -4.2;
  const Ra = 7.2;
  {
    let k = 0;
    const screenSets = [["scrAmber0", "scrBlue2", "scrAmber1"], ["scrAmber2", "scrWhite0", "scrAmber3"], ["scrAmber1", "scrBlue0", "scrWhite2"], ["scrAmber3", "scrWhite1", "scrAmber0"], ["scrAmber2", "scrBlue3", "scrAmber1"]];
    for (const deg of [-34, -17, 0, 17, 34]) {
      const th = THREE.MathUtils.degToRad(deg);
      const x = Math.sin(th) * Ra;
      const z = cz0 + Math.cos(th) * Ra;
      const yaw = yawToward(x, z, 2 * x, 2 * z - cz0);
      station(kit, x, 0, z, 2.0, 0.9, { yaw, seed: 20 + k, screens: screenSets[k], accentKey, hoodKey: dimKey, height: 0.85, conduits: 2 });
      const [ox, oz] = behind(x, z, yaw, 1.05);
      impChair(kit, ox, 0, oz, yaw);
      if (deg === 0 || deg === 34) {
        const [dx, dz] = behind(x + Math.cos(yaw) * 0.66, z - Math.sin(yaw) * 0.66, yaw, 0.42);
        datapad(kit, dx, 0.854, dz, yaw + (deg === 0 ? 0.25 : -0.2), { screen: deg === 0 ? "scrAmber2" : "scrAmber0", accentKey });
      }
      if (deg === -34) {
        const [ux, uz] = behind(x - Math.cos(yaw) * 0.64, z + Math.sin(yaw) * 0.64, yaw, 0.42);
        cup(kit, ux, 0.854, uz);
      }
      k++;
    }
    // faint amber instrument line on the deck along the operators' side of the arc, black trim outside
    kit.add(dimKey, new THREE.RingGeometry(Ra - 0.6, Ra - 0.56, 64, 1, -2.443, 1.745).rotateX(-Math.PI / 2), { pos: [0, 0.006, cz0], uv: "keep" });
    kit.add("impTrim", new THREE.RingGeometry(Ra + 0.5, Ra + 0.7, 64, 1, -2.443, 1.745).rotateX(-Math.PI / 2), { pos: [0, 0.005, cz0], color: PALETTE.impBlack });
  }

  // ---- second row by the entry: two plotting stations facing the chart wall, astrogation racks ----
  for (const s of [-1, 1]) {
    const x = s * 3.2;
    const z = -4.7;
    const yaw = yawToward(x, z, x, z + 1);
    station(kit, x, 0, z, 2.2, 0.9, { yaw, seed: 26 + (s > 0 ? 1 : 0), screens: s < 0 ? ["scrAmber1", "scrWhite3", "scrAmber2"] : ["scrAmber3", "scrBlue1", "scrAmber0"], accentKey, hoodKey: dimKey, height: 0.85, tall: s < 0, conduits: 2 });
    const [ox, oz] = behind(x, z, yaw, 1.05);
    impChair(kit, ox, 0, oz, yaw);
    // free-standing astrogation rack, face toward the entry
    const f = yawFrame(kit, s * 5.3, 0, -1.55, Math.PI);
    dataBank(f, 0, { w: 1.2, h: 2.3, accentKey, screen: s < 0 ? "scrAmber2" : "scrWhite3", seed: 28 + (s > 0 ? 1 : 0), decal: s < 0 ? IMP_DECAL.glyphs3 : IMP_DECAL.cog, cables: "floor", practical: dimKey });
  }

  // ---- hyperspace jump-lever pedestal (E of the arc, operator faces the chart wall) -------------
  {
    const f = yawFrame(kit, 6.4, 0, 1.6, Math.PI);
    f.box("impTrim", 0, 0.5, 0, 1.1, 1.0, 0.7, { color: PALETTE.impBlack, texel: 1 });
    f.box("impMetal", 0, 0.06, 0, 1.16, 0.12, 0.76, { color: PALETTE.impCharcoal, texel: 1 });
    f.box("impMetal", 0, 0.5, 0.36, 0.9, 0.5, 0.02, { color: PALETTE.impGreyDark, texel: 1 });
    f.box(accentKey, 0, 0.18, 0.376, 0.8, 0.025, 0.01);
    f.decal(IMP_DECAL.hazard, 0, 0.55, 0.376, 0.3);
    f.box("impGloss", 0, 1.02, 0, 1.14, 0.04, 0.74);
    f.box("impTrim", 0, 1.16, -0.16, 1.0, 0.24, 0.36, { color: PALETTE.impBlack, texel: 1 });
    f.screen("scrAmber1", 0, 1.17, 0.03, 0.6, 0.16);
    f.box("emitRedImp", -0.4, 1.17, 0.03, 0.08, 0.08, 0.012);
    f.box(accentKey, 0.4, 1.17, 0.03, 0.08, 0.08, 0.012);
    f.box(accentKey, 0, 1.045, 0.355, 0.9, 0.012, 0.02);
    for (const k of [-1, 0, 1]) f.box(k === 0 ? "emitWhite" : "impGloss", k * 0.46, 1.052, 0.28, 0.08, 0.024, 0.06);
    // two levers in slots: one pulled back toward the operator, one pushed forward
    for (const [su, tilt] of [[-0.22, 0.55], [0.22, -0.25]]) {
      f.box("impMetal", su, 1.046, 0.12, 0.06, 0.012, 0.34, { color: PALETTE.impGreyDark });
      const shaft = new THREE.CylinderGeometry(0.016, 0.02, 0.4, 10).translate(0, 0.2, 0).rotateX(tilt);
      f.add("impMetal", shaft, su, 1.05, 0.12, { color: PALETTE.impGrey, uv: "scale", uvScale: [0.1, 0.4] });
      const knob = new THREE.SphereGeometry(0.038, 12, 8).translate(0, 0.4 * Math.cos(tilt), 0.4 * Math.sin(tilt));
      f.add("impGloss", knob, su, 1.05, 0.12);
      f.add(accentKey, new THREE.TorusGeometry(0.034, 0.008, 6, 16).rotateX(Math.PI / 2), su, 1.062, 0.12);
    }
    f.collider(-0.6, 0.6, 0, 1.3, -0.4, 0.4, "jump");
    kit.box("chevronY", 6.4, 0.004, 0.75, 1.2, 0.008, 0.5, { texel: 1.5 });
  }

  // ---- plotting table with the hyperlane hologram (W of the entry lane) -----------------------
  {
    const tx = -6.4;
    const tz = -3.4;
    const th = 0.82;
    holoTable(kit, tx, tz, 2.4, 1.6, th, { accentKey });
    datapad(kit, tx + 0.95, th + 0.04, tz + 0.55, 0.4, { screen: "scrAmber1", accentKey });
    cup(kit, tx - 1.0, th + 0.04, tz - 0.55);
    const baseY = th + 0.5;
    projectorCone(kit, tx, th + 0.07, tz, baseY, 0.1, 0.62, "deckA_holoAmber");
    const holo = new THREE.Group();
    holo.position.set(tx, baseY, tz);
    const staticLines = [wireGridGeometry(1.5, 5, 0)];
    // the active lane: quadratic bezier A -> B; a secondary lane behind it
    const A = new THREE.Vector3(-0.62, 0.12, 0.28);
    const B = new THREE.Vector3(0.66, 0.2, -0.3);
    const C = new THREE.Vector3(0.05, 0.62, 0.05);
    const pts = [];
    for (let i = 0; i <= 48; i++) {
      const t = i / 48;
      const p = new THREE.Vector3().copy(A).multiplyScalar((1 - t) * (1 - t)).addScaledVector(C, 2 * (1 - t) * t).addScaledVector(B, t * t);
      pts.push(p);
    }
    const laneEdges = [];
    for (let i = 0; i < 48; i++) laneEdges.push([i, i + 1]);
    staticLines.push(wireGraphGeometry(pts.map((p) => [p.x, p.y, p.z]), laneEdges));
    const alt = [];
    for (let i = 0; i <= 16; i++) {
      const t = i / 16;
      alt.push([-0.5 + t * 1.1, 0.1 + 0.25 * Math.sin(t * Math.PI), -0.45 + t * 0.2]);
    }
    staticLines.push(wireGraphGeometry(alt, alt.slice(0, -1).map((_, i) => [i, i + 1])));
    // star nodes at both ends, waypoint markers, a tiny ship at the origin star
    staticLines.push(wireSphereGeometry(0.09, 4, 8, 16).translate(A.x, A.y, A.z));
    staticLines.push(wireSphereGeometry(0.07, 4, 8, 16).translate(B.x, B.y, B.z));
    const shipYaw = Math.atan2(B.x - A.x, B.z - A.z) + Math.PI;
    staticLines.push(wireDestroyerGeometry(0.26).rotateY(shipYaw).translate(A.x, A.y + 0.14, A.z));
    holo.add(mergedLines(staticLines, M.deckA_holoLineAmber));
    holo.add(mergedMesh([12, 24, 36].map((i) => new THREE.OctahedronGeometry(0.03).translate(pts[i].x, pts[i].y, pts[i].z)), M.deckA_holoAmberBright));
    const blip = new THREE.Mesh(new THREE.OctahedronGeometry(0.035), M.deckA_holoAmberBright);
    blip.castShadow = blip.receiveShadow = false;
    holo.add(blip);
    kit.attach(holo);
    kit.onUpdate((dt, t) => {
      holo.rotation.y = t * 0.1;
      const s = (t * 0.22) % 1;
      const i = Math.min(47, Math.floor(s * 48));
      blip.position.lerpVectors(pts[i], pts[i + 1], s * 48 - i);
      blip.rotation.y = t * 2;
    });
  }

  // ---- astrogation computer column (W side) ----------------------------------------------------
  {
    const x = -9.0;
    const z = 3.6;
    const r = 0.75;
    kit.cyl("impTrim", x, h / 2, z, r, h, "y", { color: PALETTE.impBlack, segments: 24, texel: 1 });
    kit.cyl("impMetal", x, 0.1, z, r + 0.17, 0.2, "y", { color: PALETTE.impCharcoal, segments: 24, texel: 1 });
    kit.cyl("impMetal", x, h - 0.3, z, r + 0.11, 0.5, "y", { color: PALETTE.impCharcoal, segments: 24, texel: 1 });
    for (const ry of [1.1, 1.9, 2.7, 3.5]) {
      kit.cyl("impMetal", x, ry, z, r + 0.03, 0.16, "y", { color: PALETTE.impGreyDark, segments: 24 });
      kit.add(accentKey, new THREE.TorusGeometry(r + 0.045, 0.01, 6, 48).rotateX(Math.PI / 2), { pos: [x, ry - 0.06, z] });
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        const key = i % 5 === 2 ? "emitWhite" : i % 7 === 3 ? "impGloss" : accentKey;
        kit.box(key, x + Math.cos(a) * (r + 0.045), ry + 0.02, z + Math.sin(a) * (r + 0.045), 0.02, 0.05, 0.05, { rot: [0, -a, 0] });
      }
    }
    // readout strip facing the room
    const yawFace = Math.atan2(0 - x, 0 - z);
    const f = yawFrame(kit, x, 0, z, yawFace);
    f.box("impGloss", 0, 2.3, r + 0.02, 0.36, 1.6, 0.03);
    f.screen("scrAmber0", 0, 2.78, r + 0.04, 0.3, 0.22);
    f.screen("scrAmber1", 0, 2.36, r + 0.04, 0.3, 0.36);
    f.screen("scrWhite0", 0, 1.94, r + 0.04, 0.3, 0.22);
    for (let k = 0; k < 3; k++) f.box(k === 1 ? accentKey : "emitWhite", -0.1 + k * 0.1, 1.62, r + 0.042, 0.06, 0.05, 0.012);
    f.decal(IMP_DECAL.glyphs3, 0, 3.32, r + 0.012, 0.28);
    f.decal(IMP_DECAL.power, 0, 0.55, r + 0.012, 0.26);
    // rotating indicator ring under a static bracket ring
    kit.add("impMetal", new THREE.TorusGeometry(r + 0.24, 0.03, 8, 48).rotateX(Math.PI / 2), { pos: [x, 4.3, z], color: PALETTE.impGreyDark, uv: "scale", uvScale: [0.4, 6] });
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      kit.box("impMetal", x + Math.cos(a) * (r + 0.12), 4.3, z + Math.sin(a) * (r + 0.12), 0.26, 0.04, 0.06, { rot: [0, -a, 0], color: PALETTE.impGreyDark });
    }
    const ringGeos = [new THREE.TorusGeometry(r + 0.24, 0.018, 6, 48).rotateX(Math.PI / 2)];
    for (const a of [0, 2.1, 4.2]) ringGeos.push(new THREE.BoxGeometry(0.1, 0.07, 0.06).translate(Math.cos(a) * (r + 0.24), 0, Math.sin(a) * (r + 0.24)));
    const ring = mergedMesh(ringGeos, M.emitAmber);
    ring.position.set(x, 4.16, z);
    kit.attach(ring);
    kit.onUpdate((dt, t) => {
      ring.rotation.y = t * 0.6;
    });
    kit.collider([x - r - 0.17, 0, z - r - 0.17], [x + r + 0.17, h, z + r + 0.17], "astrogation");
    // cable bundle from the column top to the W wall
    for (let k = 0; k < 3; k++) kit.cyl("impMetal", (x - r - 0.11 + (-hx + 0.06)) / 2, 4.42 + k * 0.1, z + (k - 1) * 0.14, 0.035, x - r - 0.11 - (-hx + 0.06), "x", { color: [PALETTE.impGreyDark, PALETTE.impCharcoal, PALETTE.impGrey][k], segments: 8 });
    kit.box("impTrim", -hx + 0.14, 4.52, z, 0.16, 0.5, 0.6, { color: PALETTE.impBlack, texel: 1 });
  }

  // ---- N wall (door): helmet shelf, datapad rack, charts locker, gear ------------------------
  {
    const f = walls.N.frame;
    const su = hx + 4.5;
    f.box("impTrim", su, 1.45, 0.28, 1.5, 0.05, 0.4, { color: PALETTE.impBlack, texel: 1 });
    for (const s of [-1, 1]) f.box("impMetal", su + s * 0.6, 1.25, 0.12, 0.05, 0.4, 0.08, { color: PALETTE.impGreyDark });
    for (const s of [-1, 1]) f.box("impMetal", su + s * 0.6, 1.4, 0.28, 0.05, 0.05, 0.4, { color: PALETTE.impGreyDark });
    helmet(kit, 4.15, 1.475, -hz + 0.28, Math.PI);
    helmet(kit, 4.85, 1.475, -hz + 0.28, Math.PI + 0.2);
    f.decal(IMP_DECAL.glyphs1, su, 2.05, 0.09, 0.3);
    f.collider(su - 0.8, su + 0.8, 1.2, 1.9, 0.08, 0.5, "shelf");
    datapadRack(f, hx + 7.0, 1.5, { n: 4, accentKey });
    sealedCabinet(f, hx - 4.8, { w: 1.4, h: 2.3, accentKey, decal: IMP_DECAL.cog });
    impWallGear(f, hx - 8.6, 1.5, { seed: 41, accentKey });
    f.decal(IMP_DECAL.arrowRight, hx - 2.6, 2.3, 0.09, 0.5);
    f.decal(IMP_DECAL.glyphs2, hx + 2.6, 2.3, 0.09, 0.5);
    impWallLight(f, hx - 6.6, 3.7, { key: accentKey, w: 0.8 });
    impWallLight(f, hx + 9.6, 3.7, { key: accentKey, w: 0.8 });
  }

  // ---- E wall: flight-control boards, computers, gear ---------------------------------------
  {
    const f = walls.E.frame;
    wallScreen(f, hz - 6.0, 2.5, 2.0, 1.0, "scrAmber1", { accentKey, n0: 0.08 });
    wallScreen(f, hz - 1.5, 2.5, 2.0, 1.0, "scrBlue2", { accentKey, n0: 0.08 });
    indicatorRow(f, hz - 6.0, 1.7, 0.1, 10, { accentKey, seed: 51, step: 0.12, size: 0.05 });
    indicatorRow(f, hz - 1.5, 1.7, 0.1, 10, { accentKey, seed: 52, step: 0.12, size: 0.05 });
    dataBank(f, hz + 3.0, { w: 1.2, h: 2.3, accentKey, screen: "scrAmber0", seed: 53, practical: dimKey });
    dataBank(f, hz + 4.3, { w: 1.2, h: 2.3, accentKey, screen: "scrWhite0", seed: 54, decal: IMP_DECAL.glyphs3, practical: dimKey });
    impWallGear(f, hz + 7.4, 1.5, { seed: 55, accentKey });
    conduitRun(f, 1.0, 2 * hz - 1.0, h - 0.8, { n: 0.16, pipes: 2, seed: 56, clampStep: 2.2 });
    f.decal(IMP_DECAL.cog, hz - 3.8, 3.6, 0.09, 0.45);
    f.decal(IMP_DECAL.glyphs1, hz + 6.0, 3.6, 0.09, 0.45);
    impWallLight(f, hz - 8.0, 3.7, { key: accentKey, w: 0.8 });
    impWallLight(f, hz + 8.0, 3.7, { key: accentKey, w: 0.8 });
  }

  // ---- W wall: status readout, chart locker, datapad rack, gear -----------------------------
  {
    const f = walls.W.frame;
    wallScreen(f, hz + 0.5, 2.5, 1.6, 0.9, "scrWhite3", { accentKey, n0: 0.08 });
    indicatorRow(f, hz + 0.5, 1.75, 0.1, 8, { accentKey, seed: 61, step: 0.12, size: 0.05 });
    sealedCabinet(f, hz + 4.6, { w: 1.4, h: 2.3, accentKey, decal: IMP_DECAL.glyphs3 });
    datapadRack(f, hz + 7.6, 1.5, { n: 5, accentKey });
    impWallGear(f, hz - 7.4, 1.5, { seed: 62, accentKey });
    f.decal(IMP_DECAL.cog, hz - 1.6, 3.5, 0.09, 0.45);
    f.decal(IMP_DECAL.glyphs2, hz + 2.6, 3.5, 0.09, 0.45);
    impWallLight(f, hz - 4.6, 3.7, { key: accentKey, w: 0.8 });
    impWallLight(f, hz + 6.0, 3.7, { key: accentKey, w: 0.8 });
  }
  // pillars framing the entry
  impPillar(kit, -7.6, -7.2, h, { w: 0.5, accentKey });
  impPillar(kit, 7.6, -7.2, h, { w: 0.5, accentKey });

  // ---- lights: one temperature (warm amber-white) for the key and the fills, amber practicals ----
  kit.light({ type: "spot", pos: [0, h - 0.3, 2.0], target: [0, 0.85, 2.0], color: WARM, intensity: lux(h - 0.3 - 0.85, 4.0), distance: 12, angle: 0.85, penumbra: 0.5, shadow: true, priority: 0.95 });
  kit.light({ type: "point", pos: [0, h - 0.6, -6.0], color: WARM, intensity: lux(h - 0.6, 3.4), distance: 14, priority: 0.5 });
  kit.light({ type: "point", pos: [-6.5, h - 0.6, -2.0], color: WARM, intensity: lux(h - 0.6, 3.0), distance: 13, priority: 0.48 });
  kit.light({ type: "point", pos: [6.5, h - 0.6, -2.0], color: WARM, intensity: lux(h - 0.6, 3.0), distance: 13, priority: 0.47 });
  kit.light({ type: "point", pos: [0, 2.6, hz - 2.2], color: amber, intensity: 16.0, distance: 14, priority: 0.6 });
  kit.light({ type: "point", pos: [-7.6, 2.4, 3.6], color: amber, intensity: 8.0, distance: 9, priority: 0.42 });
  kit.light({ type: "point", pos: [-6.4, 1.9, -3.4], color: amber, intensity: 6.0, distance: 7, priority: 0.4 });
  // amber console practical low over the bank's centre so the grey control surfaces read
  kit.light({ type: "point", pos: [0, 1.8, 1.6], color: amber, intensity: 6.0, distance: 8, priority: 0.44 });
}
