// Communications & Sensor Control (deck A): two arcs of operator stations facing a raised supervisor
// platform that carries the rotating sensor-globe hologram, tall signal / server towers with blinking
// lamp rows along the back wall, overhead cable trays and conduit bundles, scrolling waveform wall
// screens, cyan under-console light. Accent cyan.
import * as THREE from "three";
import { PALETTE } from "../materials.js";
import { impRoomShell, impConsole, impChair, impRailing, impWallGear, impWallLight, lux } from "./imperial_kit.js";
import { IMP_DECAL } from "../textures_imperial.js";
import { deckASetup, yawToward, behind, wallScreen, indicatorRow, cableTray, projectorColumn, wireSphereGeometry, lineSegments, mergedMesh, stepBlock, frameGeo, datapad, cup } from "./deck_a_kit.js";

export function buildComms(kit, ctx, room) {
  const [w, h, d] = room.size;
  const hx = w / 2;
  const hz = d / 2;
  const M = ctx.materials;
  deckASetup(kit);
  const accentKey = "emitCyan";
  const cyan = new THREE.Color(room.accent || "#5fd0ff").getHex();

  // ---- shell ----------------------------------------------------------------------------------------
  const walls = impRoomShell(kit, room, ctx.doors, {
    accentKey,
    seed: 6311,
    wall: { panelW: 1.7, features: { vent: 0.08, equipment: 0.12, conduit: 0.0, light: 0.06, screen: 0.08 }, altChance: 0.2 },
    walls: { W: { features: { vent: 0.1, equipment: 0.0, conduit: 0.0, light: 0.0, screen: 0.0 }, corniceLight: false } },
    floor: { lane: false },
    ceiling: { troughs: 2, troughW: 0.5, beamStep: 3.6 },
  });
  // entry lane from the door to the platform steps, cyan edge lines, chevron at the step foot
  kit.boxMM("impMetalRough", [0.7, 0, -1.2], [hx - 0.4, 0.012, 1.2], { color: PALETTE.impGreyDark, texel: 0.7 });
  for (const s of [-1, 1]) kit.boxMM(accentKey, [0.7, 0.002, s * 1.24 - 0.02], [hx - 0.4, 0.014, s * 1.24 + 0.02]);
  kit.box("chevronY", 0.55, 0.005, 0, 0.3, 0.01, 2.6, { texel: 1.5 });
  // floor ring marking the operator arcs' inner boundary
  kit.add(accentKey, new THREE.RingGeometry(5.62, 5.68, 96).rotateX(-Math.PI / 2), { pos: [-3, 0.006, 0], uv: "keep" });

  // ---- supervisor platform --------------------------------------------------------------------------
  const cx = -3;
  const cz = 0;
  const P = { x0: -5.2, x1: -0.8, z0: -2.2, z1: 2.2, y: 0.42 };
  kit.boxMM("impTrim", [P.x0, 0, P.z0], [P.x1, 0.36, P.z1], { color: PALETTE.impBlack, texel: 1 });
  kit.boxMM("impDeck", [P.x0 - 0.05, 0.36, P.z0 - 0.05], [P.x1 + 0.05, P.y, P.z1 + 0.05], { color: PALETTE.impGrey, texel: 0.7 });
  kit.boxMM(accentKey, [P.x0 - 0.06, 0.32, P.z0 - 0.06], [P.x1 + 0.06, 0.345, P.z0 - 0.02]);
  kit.boxMM(accentKey, [P.x0 - 0.06, 0.32, P.z1 + 0.02], [P.x1 + 0.06, 0.345, P.z1 + 0.06]);
  kit.boxMM(accentKey, [P.x0 - 0.06, 0.32, P.z0 - 0.06], [P.x0 - 0.02, 0.345, P.z1 + 0.06]);
  kit.floor(P.x0 + 0.1, P.z0 + 0.1, P.x1 + 0.05, P.z1 - 0.1, P.y, "platform");
  stepBlock(kit, "x", 0.45, P.x1 + 0.05, -1.3, 1.3, 0, P.y, 2, { accentKey });
  impRailing(kit, [P.x0, P.z0], [P.x1, P.z0], P.y, { light: accentKey });
  impRailing(kit, [P.x0, P.z1], [P.x1, P.z1], P.y, { light: accentKey });
  impRailing(kit, [P.x0, P.z0], [P.x0, P.z1], P.y, { light: accentKey });
  impRailing(kit, [P.x1, P.z0], [P.x1, -1.3], P.y);
  impRailing(kit, [P.x1, 1.3], [P.x1, P.z1], P.y);
  // projector column + sensor globe hologram
  projectorColumn(kit, cx, cz, 0.34, 1.0, { accentKey, y: P.y, rings: 3 });
  kit.add("deckA_holoCyan", new THREE.CylinderGeometry(0.85, 0.2, 0.9, 32, 1, true), { pos: [cx, P.y + 1.55, cz], uv: "keep" });
  {
    const gy = P.y + 2.5;
    const globe = new THREE.Group();
    globe.position.set(cx, gy, cz);
    globe.add(lineSegments(wireSphereGeometry(0.9, 8, 16, 48), M.deckA_holoLineCyan));
    const blips = [];
    for (let i = 0; i < 7; i++) {
      const th = 0.5 + i * 0.8;
      const ph = 0.9 + i * 1.7;
      blips.push(new THREE.OctahedronGeometry(0.04).translate(0.9 * Math.sin(th) * Math.cos(ph), 0.9 * Math.cos(th), 0.9 * Math.sin(th) * Math.sin(ph)));
    }
    globe.add(mergedMesh(blips, M.deckA_holoCyanBright));
    const rings = new THREE.Group();
    rings.position.set(cx, gy, cz);
    rings.add(mergedMesh([new THREE.TorusGeometry(1.02, 0.008, 6, 72).rotateX(Math.PI / 2 + 0.45), new THREE.TorusGeometry(1.1, 0.006, 6, 72).rotateX(Math.PI / 2 - 0.5).rotateY(0.6)], M.deckA_holoCyanBright));
    const sweep = new THREE.Mesh(new THREE.CircleGeometry(0.88, 32, -Math.PI / 2, Math.PI), M.deckA_holoCyan);
    sweep.position.set(cx, gy, cz);
    sweep.castShadow = sweep.receiveShadow = false;
    kit.attach(globe);
    kit.attach(rings);
    kit.attach(sweep);
    kit.onUpdate((dt, t) => {
      globe.rotation.y = t * 0.25;
      rings.rotation.y = -t * 0.12;
      sweep.rotation.y = t * 1.1;
    });
  }
  // supervisor standing consoles on the platform's N and S edges, facing the arcs
  for (const s of [-1, 1]) {
    const yaw = s < 0 ? 0 : Math.PI;
    impConsole(kit, cx, P.y, s * 1.6, 1.8, 0.6, { yaw, seed: s < 0 ? 51 : 52, screens: ["scrGreen1", "scrBlue0", "scrGreen0"], accentKey, height: 1.0 });
  }

  // ---- operator arcs --------------------------------------------------------------------------------
  const R = 7.0;
  const angles = [205, 237.5, 270, 302.5, 335];
  let k = 0;
  for (const side of [-1, 1]) {
    for (let i = 0; i < angles.length; i++) {
      const a = THREE.MathUtils.degToRad(side < 0 ? angles[i] : 360 - angles[i]);
      const x = cx + Math.cos(a) * R;
      const z = cz + Math.sin(a) * R;
      const yaw = yawToward(x, z, cx, cz);
      const tall = i % 2 === 1;
      const screens = k % 2 ? ["scrGreen0", "scrBlue1", "scrGreen1"] : ["scrBlue0", "scrGreen1", "scrBlue1"];
      impConsole(kit, x, 0, z, 2.6, 0.95, { yaw, seed: 60 + k, screens, accentKey, tall });
      const [ox, oz] = behind(x, z, yaw, 1.0);
      impChair(kit, ox, 0, oz, yaw);
      if (i === 2 || i === 0) {
        // a datapad resting on the flat shell top at the operator's edge
        const [dx, dz] = behind(x + Math.cos(yaw) * 0.9, z - Math.sin(yaw) * 0.9, yaw, 0.38);
        datapad(kit, dx, 0.954, dz, yaw + 0.2, { screen: "scrGreen0", accentKey });
      }
      if (i === 4) {
        const [ux, uz] = behind(x - Math.cos(yaw) * 0.95, z + Math.sin(yaw) * 0.95, yaw, 0.38);
        cup(kit, ux, 0.954, uz);
      }
      k++;
    }
  }

  // ---- back wall (W): signal / server towers with blinking lamp rows ------------------------------
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
      // blade rows: handle strip + three lamps (static dark backs + attached blinking fronts)
      for (let r = 0; r < 9; r++) {
        const v = 0.55 + r * 0.26;
        f.box("impTrim", u, v, front + 0.015, tw - 0.24, 0.2, 0.012, { color: PALETTE.impBlack, texel: 1 });
        f.box("impMetal", u - 0.15, v, front + 0.027, 0.36, 0.03, 0.012, { color: PALETTE.impGreyDark });
        for (let l = 0; l < 3; l++) {
          const lu = u + 0.14 + l * 0.1;
          f.box("impTrim", lu, v, front + 0.024, 0.05, 0.035, 0.006, { color: PALETTE.impGreyDark });
          blink[(r + l + ti) % 3].push(frameGeo(f, new THREE.BoxGeometry(0.045, 0.03, 0.012), lu, v, front + 0.03));
        }
        if (r % 3 === 1) f.box(accentKey, u - 0.36, v, front + 0.026, 0.02, 0.16, 0.008);
      }
      // vent at the foot, readout at the top, stencil
      for (let s = 0; s < 4; s++) f.box("impMetal", u, 0.22 + s * 0.05, front + 0.012, tw - 0.3, 0.02, 0.012, { color: PALETTE.impGreyDark });
      f.screen(ti % 2 ? "scrGreen0" : "scrBlue0", u, th - 0.22, front + 0.022, tw - 0.4, 0.2);
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

  // ---- N / S walls: waveform screens with indicator rows -------------------------------------------
  for (const side of ["N", "S"]) {
    const f = walls[side].frame;
    const toU = (x) => (side === "N" ? x + hx : hx - x);
    const keys = side === "N" ? ["deckA_waveform", "deckA_waveform", "scrGreen1"] : ["scrBlue1", "deckA_waveform", "deckA_waveform"];
    let i = 0;
    for (const x of [-8.5, -3.0, 2.5]) {
      wallScreen(f, toU(x), 2.7, 2.2, 1.0, keys[i], { accentKey, n0: 0.08 });
      indicatorRow(f, toU(x), 1.85, 0.1, 10, { accentKey, seed: 80 + i + (side === "N" ? 0 : 5), step: 0.12, size: 0.05 });
      i++;
    }
    f.decal(IMP_DECAL.glyphs2, toU(-0.2), 3.9, 0.09, 0.5);
    f.decal(IMP_DECAL.arrowRight, toU(7.5), 2.4, 0.09, 0.5);
    impWallGear(f, toU(9.5), 1.5, { seed: side === "N" ? 91 : 92, accentKey });
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
  kit.light({ type: "spot", pos: [cx, h - 0.25, cz], target: [cx, P.y, cz], color: 0xdfe8ff, intensity: lux(h - 0.25 - P.y, 1.7), distance: 12, angle: 0.62, penumbra: 0.5, shadow: true, priority: 0.95 });
  kit.light({ type: "point", pos: [cx, h - 0.6, -5.6], color: 0xe4ecff, intensity: lux(h - 0.6, 1.2), distance: 14, priority: 0.55 });
  kit.light({ type: "point", pos: [cx, h - 0.6, 5.6], color: 0xe4ecff, intensity: lux(h - 0.6, 1.2), distance: 14, priority: 0.54 });
  kit.light({ type: "point", pos: [7.5, h - 0.6, 0], color: 0xe4ecff, intensity: lux(h - 0.6, 1.1), distance: 13, priority: 0.5 });
  kit.light({ type: "point", pos: [-11.0, h - 1.2, 0], color: 0xe4ecff, intensity: lux(h - 1.2, 0.9), distance: 12, priority: 0.46 });
  kit.light({ type: "point", pos: [cx, P.y + 2.5, cz], color: cyan, intensity: 7.0, distance: 10, priority: 0.62 });
  kit.light({ type: "point", pos: [cx, 0.45, -5.6], color: cyan, intensity: 5.5, distance: 10, priority: 0.36 });
  kit.light({ type: "point", pos: [cx, 0.45, 5.6], color: cyan, intensity: 5.5, distance: 10, priority: 0.35 });
}
