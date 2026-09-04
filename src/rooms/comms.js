// Communications & Sensor Control (deck A): two arcs of operator stations (lit control surfaces under
// cyan hood practicals) facing a raised supervisor platform whose rectangular sensor emitter projects a
// spinning tri-plane radar cone, a second row of relay stations and free-standing processor racks in
// the foreground by the door, tall signal towers with blade rows and blinking lamps along the back
// wall, overhead cable trays, scrolling waveform wall screens. Accent cyan; one fixture temperature
// (cyan-tinted cool white) for the recessed slots, the key and the fills; no floor lane — two standing
// console pods hold the centreline between the door and the platform steps.
import * as THREE from "three";
import { PALETTE, setDomain } from "../materials.js";
import { impRoomShell, impChair, impRailing, impWallGear, impWallLight, lux } from "./imperial_kit.js";
import { IMP_DECAL } from "../textures_imperial.js";
import { deckASetup, yawToward, behind, yawFrame, station, dataBank, sealedCabinet, wallScreen, indicatorRow, cableTray, conduitRun, projectorCone, triPlaneRadar, mergedMesh, stepBlock, frameGeo, datapad, cup } from "./deck_a_kit.js";

export function buildComms(kit, ctx, room) {
  const [w, h, d] = room.size;
  const hx = w / 2;
  const hz = d / 2;
  const M = ctx.materials;
  deckASetup(kit);
  const accentKey = "emitCyan";
  const dimKey = "deckA_emitCyanDim";
  const cyan = new THREE.Color(room.accent || "#5fd0ff").getHex();
  const COOL = 0xd8ecff; // fixture colour: cyan-tinted cool white
  if (!M.deckA_commsSlot) {
    // recessed ceiling slot emitter in the room's cool temperature, a notch under the dim white slot
    const m = M.emitWhiteDim.clone();
    m.emissive = new THREE.Color("#cfe6f6");
    m.emissiveIntensity = 0.75;
    M.deckA_commsSlot = setDomain(m, "interior");
  }

  // ---- shell: wide panels split by a high band (tall lower fields + a clerestory strip) --------------
  const walls = impRoomShell(kit, room, ctx.doors, {
    accentKey,
    seed: 6311,
    wall: { panelW: 2.15, bands: [2.35], features: { vent: 0.08, equipment: 0.1, conduit: 0.0, light: 0.0, screen: 0.1 }, altChance: 0.2 },
    walls: { W: { features: { vent: 0.1, equipment: 0.0, conduit: 0.0, light: 0.0, screen: 0.0 }, corniceLight: false } },
    floor: { lane: false },
    ceiling: { troughs: 2, troughW: 0.5, beamStep: 3.6, lightKey: "deckA_commsSlot" },
  });
  // floor ring marking the operator arcs' inner boundary (dim)
  kit.add(dimKey, new THREE.RingGeometry(5.62, 5.67, 96).rotateX(-Math.PI / 2), { pos: [-3, 0.006, 0], uv: "keep" });

  // ---- supervisor platform --------------------------------------------------------------------------
  const cx = -3;
  const cz = 0;
  // two standing console pods on the centreline between the door and the platform steps, both worked
  // from the door side facing the platform (their sloped control surfaces read from the door)
  station(kit, 8.6, 0, 0, 1.6, 0.85, { yaw: yawToward(8.6, 0, cx, cz), seed: 53, screens: ["scrGreen2", "scrBlue1"], accentKey, hoodKey: dimKey, height: 1.05, conduits: 1 });
  station(kit, 4.2, 0, 0, 1.6, 0.85, { yaw: yawToward(4.2, 0, cx, cz), seed: 54, screens: ["scrBlue0", "scrGreen3"], accentKey, hoodKey: dimKey, height: 1.05, conduits: 1 });
  const P = { x0: -5.2, x1: -0.8, z0: -2.2, z1: 2.2, y: 0.42 };
  kit.boxMM("impTrim", [P.x0, 0, P.z0], [P.x1, 0.36, P.z1], { color: PALETTE.impBlack, texel: 1 });
  kit.boxMM("impDeck", [P.x0 - 0.05, 0.36, P.z0 - 0.05], [P.x1 + 0.05, P.y, P.z1 + 0.05], { color: PALETTE.impGrey, texel: 0.7 });
  kit.boxMM(dimKey, [P.x0 - 0.06, 0.32, P.z0 - 0.06], [P.x1 + 0.06, 0.345, P.z0 - 0.02]);
  kit.boxMM(dimKey, [P.x0 - 0.06, 0.32, P.z1 + 0.02], [P.x1 + 0.06, 0.345, P.z1 + 0.06]);
  kit.boxMM(dimKey, [P.x0 - 0.06, 0.32, P.z0 - 0.06], [P.x0 - 0.02, 0.345, P.z1 + 0.06]);
  kit.floor(P.x0 + 0.1, P.z0 + 0.1, P.x1 + 0.05, P.z1 - 0.1, P.y, "platform");
  stepBlock(kit, "x", 0.45, P.x1 + 0.05, -1.3, 1.3, 0, P.y, 2, { accentKey: dimKey });
  impRailing(kit, [P.x0, P.z0], [P.x1, P.z0], P.y);
  impRailing(kit, [P.x0, P.z1], [P.x1, P.z1], P.y);
  impRailing(kit, [P.x0, P.z0], [P.x0, P.z1], P.y);
  impRailing(kit, [P.x1, P.z0], [P.x1, -1.3], P.y);
  impRailing(kit, [P.x1, 1.3], [P.x1, P.z1], P.y);
  // sensor emitter housing: stepped rectangular plinth (no round pedestal), cyan slots, gloss emitter top
  {
    kit.box("impMetal", cx, P.y + 0.06, cz, 1.72, 0.12, 1.72, { color: PALETTE.impCharcoal, texel: 1 });
    kit.box("impTrim", cx, P.y + 0.34, cz, 1.6, 0.56, 1.6, { color: PALETTE.impBlack, texel: 1 });
    kit.box("impMetal", cx, P.y + 0.62, cz, 1.64, 0.05, 1.64, { color: PALETTE.impGreyDark, texel: 1 });
    kit.box("impTrim", cx, P.y + 0.8, cz, 1.2, 0.32, 1.2, { color: PALETTE.impBlack, texel: 1 });
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      kit.box("impMetal", cx + dx * 0.805, P.y + 0.34, cz + dz * 0.805, dx ? 0.01 : 1.2, 0.4, dz ? 0.01 : 1.2, { color: PALETTE.impCharcoal, texel: 2 });
      kit.box(accentKey, cx + dx * 0.812, P.y + 0.22, cz + dz * 0.812, dx ? 0.01 : 0.7, 0.03, dz ? 0.01 : 0.7);
      kit.box("impGloss", cx + dx * 0.606, P.y + 0.84, cz + dz * 0.606, dx ? 0.01 : 0.5, 0.16, dz ? 0.01 : 0.5);
      kit.add(dx || dz > 0 ? "scrGreen2" : "scrBlue3", new THREE.PlaneGeometry(0.42, 0.1), { pos: [cx + dx * 0.612, P.y + 0.84, cz + dz * 0.612], rot: [0, dx ? (dx > 0 ? Math.PI / 2 : -Math.PI / 2) : dz > 0 ? 0 : Math.PI, 0], uv: "keep" });
    }
    kit.box("impGloss", cx, P.y + 0.98, cz, 1.26, 0.04, 1.26);
    kit.add(accentKey, new THREE.TorusGeometry(0.44, 0.012, 6, 48).rotateX(Math.PI / 2), { pos: [cx, P.y + 1.005, cz] });
    kit.cyl("impGloss", cx, P.y + 1.02, cz, 0.12, 0.04, "y", { segments: 16, r2: 0.08 });
    kit.collider([cx - 0.86, P.y, cz - 0.86], [cx + 0.86, P.y + 1.02, cz + 0.86], "emitter");
  }
  // tri-plane radar cone hologram above the emitter
  {
    const baseY = P.y + 1.3;
    projectorCone(kit, cx, P.y + 1.04, cz, baseY, 0.1, 0.55, "deckA_holoCyanDim");
    const { blades, blips } = triPlaneRadar(M, 1.05, 1.75);
    blades.position.set(cx, baseY, cz);
    blips.position.set(cx, baseY, cz);
    kit.attach(blades);
    kit.attach(blips);
    kit.onUpdate((dt, t) => {
      blades.rotation.y = t * 0.9;
      blips.rotation.y = -t * 0.15;
    });
  }
  // supervisor standing stations on the platform's N and S edges, facing the arcs
  for (const s of [-1, 1]) {
    const yaw = s < 0 ? 0 : Math.PI;
    station(kit, cx, P.y, s * 1.62, 1.8, 0.6, { yaw, seed: s < 0 ? 51 : 52, screens: s < 0 ? ["scrGreen1", "scrBlue2"] : ["scrBlue0", "scrGreen3"], accentKey, hoodKey: dimKey, height: 1.0, conduits: 0 });
  }

  // ---- operator arcs --------------------------------------------------------------------------------
  const R = 7.0;
  const angles = [205, 237.5, 270, 302.5, 335];
  const screenSets = [["scrBlue0", "scrGreen1", "scrBlue2"], ["scrGreen2", "scrBlue1", "scrGreen0"], ["scrBlue3", "scrGreen3", "scrBlue1"], ["scrGreen0", "scrBlue2", "scrGreen1"]];
  let k = 0;
  for (const side of [-1, 1]) {
    for (let i = 0; i < angles.length; i++) {
      const a = THREE.MathUtils.degToRad(side < 0 ? angles[i] : 360 - angles[i]);
      const x = cx + Math.cos(a) * R;
      const z = cz + Math.sin(a) * R;
      const yaw = yawToward(x, z, cx, cz);
      const tall = i % 2 === 1;
      station(kit, x, 0, z, 2.6, 0.95, { yaw, seed: 60 + k, screens: screenSets[k % 4], accentKey, hoodKey: dimKey, tall, conduits: 2 });
      const [ox, oz] = behind(x, z, yaw, 1.05);
      impChair(kit, ox, 0, oz, yaw);
      if (i === 2 || i === 0) {
        const [dx, dz] = behind(x + Math.cos(yaw) * 0.95, z - Math.sin(yaw) * 0.95, yaw, 0.42);
        datapad(kit, dx, 0.954, dz, yaw + 0.2, { screen: i === 2 ? "scrGreen0" : "scrBlue3", accentKey });
      }
      if (i === 4) {
        const [ux, uz] = behind(x - Math.cos(yaw) * 1.0, z + Math.sin(yaw) * 1.0, yaw, 0.42);
        cup(kit, ux, 0.954, uz);
      }
      k++;
    }
  }

  // ---- foreground by the door: relay stations facing the platform, processor rack islands -------------
  for (const s of [-1, 1]) {
    const x = 7.6;
    const z = s * 3.4;
    const yaw = yawToward(x, z, cx, z);
    station(kit, x, 0, z, 2.4, 0.9, { yaw, seed: 70 + (s > 0 ? 1 : 0), screens: s < 0 ? ["scrGreen3", "scrBlue0", "scrGreen2"] : ["scrBlue1", "scrGreen0", "scrBlue3"], accentKey, hoodKey: dimKey, tall: s > 0, conduits: 2 });
    const [ox, oz] = behind(x, z, yaw, 1.05);
    impChair(kit, ox, 0, oz, yaw);
    // two free-standing racks side by side, faces toward the door
    for (let j = 0; j < 2; j++) {
      const f = yawFrame(kit, 6.4, 0, s * (5.6 + j * 1.3), Math.PI / 2);
      dataBank(f, 0, { w: 1.2, h: 2.3, accentKey, screen: ["scrGreen1", "scrBlue2", "scrBlue0", "scrGreen3"][j + (s > 0 ? 2 : 0)], seed: 75 + j + (s > 0 ? 4 : 0), decal: j ? IMP_DECAL.glyphs3 : IMP_DECAL.power, cables: "floor", practical: dimKey });
    }
  }

  // ---- back wall (W): signal / server towers with blade rows and blinking lamps ---------------------
  const blink = [[], [], []];
  {
    const f = walls.W.frame;
    const towerZ = [-7.5, -5.0, -2.5, 0, 2.5, 5.0, 7.5];
    const tw = 1.0;
    const th = 2.9;
    const depth = 0.8;
    const n0 = 0.08;
    const front = n0 + depth;
    for (let ti = 0; ti < towerZ.length; ti++) {
      const u = hz - towerZ[ti];
      f.box("impTrim", u, th / 2, n0 + depth / 2, tw, th, depth, { color: PALETTE.impBlack, texel: 1 });
      f.box("impMetal", u, 0.08, n0 + depth / 2, tw + 0.06, 0.16, depth + 0.06, { color: PALETTE.impCharcoal, texel: 1 });
      f.box("impMetal", u, th + 0.04, n0 + depth / 2, tw + 0.06, 0.08, depth + 0.06, { color: PALETTE.impGreyDark, texel: 1 });
      f.box("impMetal", u, th / 2 + 0.1, front + 0.005, tw - 0.14, th - 0.5, 0.01, { color: PALETTE.impCharcoal, texel: 2 });
      for (const s of [-1, 1]) f.box("impTrim", u + s * (tw / 2 - 0.1), th / 2 + 0.1, front + 0.012, 0.012, th - 0.5, 0.006, { color: PALETTE.impBlack });
      // blade rows: alternating grey blades with a wide handle bar, three lamps (static dark backs + attached blinking fronts)
      for (let r = 0; r < 9; r++) {
        const v = 0.55 + r * 0.26;
        f.box("impMetal", u, v, front + 0.015, tw - 0.24, 0.2, 0.012, { color: r % 2 ? PALETTE.impGreyDark : PALETTE.impGrey, texel: 2 });
        f.box("impTrim", u - 0.12, v, front + 0.028, 0.46, 0.03, 0.014, { color: PALETTE.impBlack });
        f.box("impTrim", u, v - 0.115, front + 0.012, tw - 0.2, 0.02, 0.008, { color: PALETTE.impBlack });
        for (let l = 0; l < 3; l++) {
          const lu = u + 0.16 + l * 0.1;
          f.box("impTrim", lu, v, front + 0.024, 0.05, 0.035, 0.006, { color: PALETTE.impBlack });
          blink[(r + l + ti) % 3].push(frameGeo(f, new THREE.BoxGeometry(0.045, 0.03, 0.012), lu, v, front + 0.03));
        }
        if (r % 3 === 1) f.box(accentKey, u - 0.4, v, front + 0.028, 0.02, 0.18, 0.008);
        if ((r + ti) % 4 === 2) f.decal(IMP_DECAL.glyphs2, u - 0.02, v + 0.06, front + 0.028, 0.1);
      }
      // vent at the foot, readout at the top, stencil
      for (let s = 0; s < 4; s++) f.box("impMetal", u, 0.22 + s * 0.05, front + 0.012, tw - 0.3, 0.02, 0.012, { color: PALETTE.impGreyDark });
      f.box("impGloss", u, th - 0.22, front + 0.016, tw - 0.32, 0.26, 0.01);
      f.screen(["scrGreen0", "scrBlue1", "scrGreen2", "scrBlue3"][ti % 4], u, th - 0.22, front + 0.024, tw - 0.4, 0.2);
      f.decal(ti % 2 ? IMP_DECAL.glyphs1 : IMP_DECAL.power, u, 0.42, front + 0.02, 0.2);
      // cable bundle from the tower top to the tray overhead
      for (let c = 0; c < 3; c++) f.cylV("impMetal", u - 0.25 + c * 0.25, (th + 0.08 + (h - 0.67)) / 2, n0 + depth * 0.5 + (c - 1) * 0.12, 0.035, h - 0.67 - th - 0.08, { color: [PALETTE.impGreyDark, PALETTE.impCharcoal, PALETTE.impGrey][c], segments: 8 });
      f.collider(u - tw / 2 - 0.03, u + tw / 2 + 0.03, 0, th + 0.1, n0, front + 0.05, "tower");
    }
    f.decal(IMP_DECAL.glyphs3, hz, h - 0.7, 0.09, 0.6);
    f.decal(IMP_DECAL.hazard, hz - 9.4, h - 0.8, 0.09, 0.5);
    f.decal(IMP_DECAL.hazard, hz + 9.4, h - 0.8, 0.09, 0.5);
    impWallLight(f, hz - 8.75, 3.6, { key: accentKey, w: 0.7 });
    impWallLight(f, hz + 8.75, 3.6, { key: accentKey, w: 0.7 });
  }
  const blinkMeshes = blink.map((geos) => {
    const m = mergedMesh(geos, M[accentKey]);
    kit.attach(m);
    return m;
  });
  // overhead cable trays: two runs from the tower wall toward the platform, one cross run
  const trayY = h - 0.65;
  const tx = cx - 1.6;
  cableTray(kit, [-12.55, -4.6], [tx, -4.6], trayY, { ceilingY: h - 0.02, conduits: 5, seed: 71 });
  cableTray(kit, [-12.55, 4.6], [tx, 4.6], trayY, { ceilingY: h - 0.02, conduits: 5, seed: 72 });
  cableTray(kit, [tx, -4.85], [tx, 4.85], trayY, { ceilingY: h - 0.02, conduits: 4, seed: 73 });
  cableTray(kit, [tx + 0.25, -4.6], [8.5, -4.6], trayY + 0.14, { ceilingY: h - 0.02, conduits: 3, seed: 74, w: 0.36 });
  // conduit drops from the tray ends into floor junction pedestals
  for (const s of [-1, 1]) {
    kit.cyl("impMetal", tx, (0.9 + trayY) / 2, s * 4.85, 0.04, trayY - 0.9, "y", { color: PALETTE.impCharcoal, segments: 8 });
    kit.box("impTrim", tx, 0.45, s * 4.85, 0.34, 0.9, 0.34, { color: PALETTE.impBlack, texel: 1 });
    kit.box("impMetal", tx, 0.06, s * 4.85, 0.4, 0.12, 0.4, { color: PALETTE.impCharcoal, texel: 1 });
    kit.box(accentKey, tx + 0.175, 0.6, s * 4.85, 0.01, 0.08, 0.08);
    kit.collider([tx - 0.2, 0, s * 4.85 - 0.2], [tx + 0.2, 0.95, s * 4.85 + 0.2], "junction");
  }

  // ---- N / S walls: waveform screens with indicator rows, an equipment bay near the door end ---------
  for (const side of ["N", "S"]) {
    const f = walls[side].frame;
    const toU = (x) => (side === "N" ? x + hx : hx - x);
    const keys = side === "N" ? ["deckA_waveform", "scrGreen2", "deckA_waveform"] : ["scrBlue3", "deckA_waveform", "scrGreen0"];
    let i = 0;
    for (const x of [-8.5, -3.0, 2.5]) {
      wallScreen(f, toU(x), 2.7, 2.2, 1.0, keys[i], { accentKey, n0: 0.08 });
      indicatorRow(f, toU(x), 1.85, 0.1, 10, { accentKey, seed: 80 + i + (side === "N" ? 0 : 5), step: 0.12, size: 0.05 });
      i++;
    }
    wallScreen(f, toU(7.0), 2.5, 1.5, 0.85, side === "N" ? "scrBlue2" : "scrGreen3", { accentKey, n0: 0.08 });
    indicatorRow(f, toU(7.0), 1.8, 0.1, 8, { accentKey, seed: side === "N" ? 86 : 87, step: 0.12, size: 0.05 });
    sealedCabinet(f, toU(10.6), { w: 1.4, h: 2.3, accentKey, decal: side === "N" ? IMP_DECAL.glyphs3 : IMP_DECAL.hazard });
    conduitRun(f, toU(side === "N" ? 4.0 : 12.2), toU(side === "N" ? 12.2 : 4.0), h - 0.95, { n: 0.16, pipes: 2, seed: side === "N" ? 88 : 89, clampStep: 2.0 });
    f.decal(IMP_DECAL.glyphs2, toU(-0.2), 3.9, 0.09, 0.5);
    f.decal(IMP_DECAL.arrowRight, toU(5.0), 3.7, 0.09, 0.5);
    impWallGear(f, toU(8.8), 1.5, { seed: side === "N" ? 91 : 92, accentKey });
  }
  // ---- E wall (door): signal status board and a gear cluster --------------------------------------
  {
    const f = walls.E.frame;
    wallScreen(f, hz + 4.5, 2.2, 1.6, 0.9, "scrGreen0", { accentKey, n0: 0.08 });
    indicatorRow(f, hz + 4.5, 1.5, 0.1, 8, { accentKey, seed: 95, step: 0.12, size: 0.05 });
    impWallGear(f, hz - 5.0, 1.5, { seed: 96, accentKey });
    f.decal(IMP_DECAL.glyphs1, hz - 2.4, 2.2, 0.09, 0.5);
    f.decal(IMP_DECAL.cog, hz + 2.4, 2.2, 0.09, 0.5);
    impWallLight(f, hz - 8.0, 3.5, { key: accentKey, w: 0.8 });
    impWallLight(f, hz + 8.0, 3.5, { key: accentKey, w: 0.8 });
  }

  // ---- animation: blink patterns + waveform scroll (allocation-free) -----------------------------
  const scroll = M.deckA_waveform.userData.scroll;
  kit.onUpdate((dt, t) => {
    blinkMeshes[0].visible = Math.sin(t * 3.1) > -0.3;
    blinkMeshes[1].visible = Math.sin(t * 5.3 + 1.0) > 0.35;
    blinkMeshes[2].visible = (t * 1.7) % 1 < 0.55;
    if (scroll) scroll.offset.x = (t * 0.07) % 1;
  });

  // ---- lights -----------------------------------------------------------------------------------
  kit.light({ type: "spot", pos: [cx, h - 0.25, cz], target: [cx, P.y + 1.0, cz], color: COOL, intensity: lux(h - 0.25 - P.y - 1.0, 3.4), distance: 12, angle: 0.62, penumbra: 0.5, shadow: true, priority: 0.95 });
  // fills (the slots' temperature) over the middle of each arc, the foreground pods and the tower wall
  kit.light({ type: "point", pos: [-6.8, h - 0.6, -6.0], color: COOL, intensity: lux(h - 0.6, 4.6), distance: 17, priority: 0.55 });
  kit.light({ type: "point", pos: [-6.8, h - 0.6, 6.0], color: COOL, intensity: lux(h - 0.6, 4.6), distance: 17, priority: 0.54 });
  kit.light({ type: "point", pos: [7.0, h - 0.6, 0], color: COOL, intensity: lux(h - 0.6, 5.0), distance: 17, priority: 0.5 });
  kit.light({ type: "point", pos: [-11.0, h - 1.2, 0], color: COOL, intensity: lux(h - 1.2, 3.0), distance: 13, priority: 0.46 });
  kit.light({ type: "point", pos: [cx, P.y + 2.4, cz], color: cyan, intensity: 7.0, distance: 10, priority: 0.62 });
  // cyan console practicals: low over the arcs' middle stations so the grey control surfaces read
  kit.light({ type: "point", pos: [-3.0, 1.7, -5.6], color: cyan, intensity: 7.0, distance: 9, priority: 0.36 });
  kit.light({ type: "point", pos: [-3.0, 1.7, 5.6], color: cyan, intensity: 7.0, distance: 9, priority: 0.35 });
}
