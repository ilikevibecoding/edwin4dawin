// Crew Briefing Room (Deck B): a small lecture theatre. Three seating tiers rise toward the aft
// (E) wall, each with a continuous readout desk and a row of operator chairs; a central stepped
// aisle leads down to the front. At the front (W wall, either side of the door) a raised dais
// carries the lectern console under a ceiling projector whose cone lands on a rotating tactical
// hologram; a 4 x 2.2 m holo screen is framed on the wall behind it. The foreground between the door
// and the tiers is worked: a dark runner from the door to the aisle steps, two technicians' consoles
// flanking it (screens toward the door), a holo plinth with a rotating deck map of the ship's tower
// and a rank of three standing displays on the S side. Blue-white lighting, step lights.
import * as THREE from "three";
import { PALETTE } from "../materials.js";
import { impRoomShell, impConsole, impWallGear, impWallLight, lux } from "./imperial_kit.js";
import { IMP_DECAL } from "../textures_imperial.js";
import { wallScreen, chairInstance, projector, holoShip, holoTowerMap, cableRun, ensureDeckBMaterials } from "./deck_b_props.js";
import { yawFrame, yawToward, projectorColumn, projectorCone } from "./deck_a_kit.js";

/** Free-standing display board: foot plate, post, framed screen at 1.6 m facing local +z, lit strip. */
function standingDisplay(kit, x, z, yaw, screenKey, accentKey, opts = {}) {
  const { leds = 3 } = opts;
  const f = yawFrame(kit, x, 0, z, yaw);
  f.box("impTrim", 0, 0.03, -0.06, 0.8, 0.06, 0.56, { color: PALETTE.impBlack, texel: 1 });
  f.box("impMetal", 0, 0.7, -0.1, 0.18, 1.3, 0.12, { color: PALETTE.impCharcoal, texel: 1 });
  f.box("impTrim", 0, 1.62, -0.02, 1.24, 0.9, 0.08, { color: PALETTE.impBlack, texel: 1 });
  f.box("impGloss", 0, 1.64, 0.025, 1.12, 0.74, 0.01);
  f.screen(screenKey, 0, 1.64, 0.032, 1.04, 0.66);
  f.box(accentKey, 0, 1.2, 0.025, 0.8, 0.02, 0.012);
  for (let i = 0; i < leds; i++) f.box(i === 1 ? "emitRedImp" : i === 2 ? "emitWhite" : accentKey, 0.46 - i * 0.12, 1.2, 0.025, 0.05, 0.03, 0.012);
  f.box("impMetal", 0, 2.12, -0.02, 0.5, 0.08, 0.05, { color: PALETTE.impGreyDark });
  f.decal(IMP_DECAL.glyphs2, 0, 2.12, 0.006, 0.07);
  f.collider(-0.64, 0.64, 0, 2.2, -0.36, 0.1, "display");
}

export function buildBriefing(kit, ctx, room) {
  const [w, h, d] = room.size;
  const hx = w / 2;
  const hz = d / 2;
  const accentKey = ctx.accentKey ? ctx.accentKey(room) : "emitBlue";
  const M = ctx.materials;
  ensureDeckBMaterials(M);
  for (const k of ["deckB_holoDim", "deckB_holoMid", "holo", "holoBright"]) kit.noShadowKeys.add(k);
  const walls = impRoomShell(kit, room, ctx.doors, {
    seed: 6307,
    accentKey,
    wall: { panelW: 1.8, features: { vent: 0.06, conduit: 0.04, light: 0.12, screen: 0.03 } },
    walls: { W: { features: { light: 0.15, equipment: 0.05 }, altChance: 0.1 } },
    floor: { lane: false },
    ceiling: { troughs: 4, troughW: 0.5, beamStep: 3.6 },
  });

  // --- tiers rising to the east: x extents and heights
  const tiers = [
    { x0: -1.5, x1: 2.0, y: 0.35 },
    { x0: 2.0, x1: 5.5, y: 0.7 },
    { x0: 5.5, x1: hx, y: 1.05 },
  ];
  const aisle = 1.3; // half width of the central aisle
  let yPrev = 0;
  for (let i = 0; i < tiers.length; i++) {
    const t = tiers[i];
    // solid block with a deck top; walkable floor over the whole tier
    kit.boxMM("impDeck", [t.x0, 0.01, -hz], [t.x1, t.y, hz], { color: PALETTE.impGrey, texel: 0.5 });
    kit.floor(t.x0, -hz, t.x1, hz, t.y, "tier");
    // riser face: black plate with a light strip under the nosing, split at the aisle
    for (const [za, zb] of [[-hz, -aisle], [aisle, hz]]) {
      kit.boxMM("impTrim", [t.x0 - 0.04, yPrev, za], [t.x0, t.y - 0.02, zb], { color: PALETTE.impBlack, texel: 1 });
      kit.boxMM("impTrim", [t.x0 - 0.05, t.y - 0.03, za], [t.x0 + 0.1, t.y + 0.012, zb], { color: PALETTE.impBlack, texel: 1 });
      kit.boxMM(accentKey, [t.x0 - 0.052, t.y - 0.1, za + 0.2], [t.x0 - 0.04, t.y - 0.06, zb - 0.2]);
      kit.collider([t.x0 - 0.06, yPrev, za], [t.x0 + 0.05, t.y, zb], "riser");
    }
    // aisle steps: two 0.175 m steps in front of the riser
    const s0 = t.x0 - 0.7;
    kit.stairs(s0, -aisle, t.x0, aisle, "x", s0, t.x0, yPrev, t.y, 2);
    for (let k = 0; k < 2; k++) {
      const xa = s0 + k * 0.35;
      const yk = yPrev + (t.y - yPrev) * ((k + 1) / 2);
      kit.boxMM("impDeck", [xa, 0.01, -aisle], [xa + 0.35, yk, aisle], { color: PALETTE.impGreyDark, texel: 0.5 });
      kit.boxMM("impTrim", [xa - 0.02, yk - 0.03, -aisle], [xa + 0.08, yk + 0.012, aisle], { color: PALETTE.impBlack });
      kit.boxMM(accentKey, [xa - 0.03, yk - 0.08, -aisle + 0.1], [xa - 0.02, yk - 0.05, aisle - 0.1]);
    }
    // readout desk and chairs on both sides of the aisle (the aisle is marked by the riser and
    // step nosing lights only — no glowing edge strips on the tier tops)
    for (const s of [-1, 1]) {
      const za = s * (aisle + 0.3);
      const zb = s * (hz - 0.5);
      desk(kit, t.x0 + 0.9, t.y, Math.min(za, zb), Math.max(za, zb), accentKey, i);
      for (let k = 0; k < 8; k++) chairInstance(kit, t.x0 + 2.05, s * (aisle + 0.75 + k * 1.15), Math.PI / 2, { y: t.y });
    }
    yPrev = t.y;
  }
  // ground-level front row on the flat floor ahead of the first tier (fills the deck between the
  // door and the tiers; same desk and chair pattern at y = 0)
  for (const s of [-1, 1]) {
    const za = s * (aisle + 0.3);
    const zb = s * (hz - 0.5);
    desk(kit, -5.4, 0, Math.min(za, zb), Math.max(za, zb), accentKey, 1);
    for (let k = 0; k < 8; k++) chairInstance(kit, -4.25, s * (aisle + 0.75 + k * 1.15), Math.PI / 2);
  }
  // step lights along the side walls at each tier height (small wall lamps)
  for (const t of tiers) {
    impWallLight(walls.N.frame, t.x0 + hx + 1.6, t.y + 0.5, { key: accentKey, w: 0.5 });
    impWallLight(walls.S.frame, hx - (t.x0 + 1.6), t.y + 0.5, { key: accentKey, w: 0.5 });
  }
  // the top tier's rear zone: comms station facing the room and a rack of displays on the E wall
  const top = tiers[2];
  impConsole(kit, 11.2, top.y, 0, 2.6, 1.0, { yaw: Math.PI / 2, seed: 21, screens: ["scrBlue0", "scrWhite0", "scrBlue1"], accentKey });
  const E = walls.E.frame; // u = z + hz
  wallScreen(E, hz - 5.5, 2.75, 2.2, 1.3, "scrBlue0", { accentKey });
  wallScreen(E, hz, 2.95, 2.6, 1.5, "scrWhite0", { accentKey });
  wallScreen(E, hz + 5.5, 2.75, 2.2, 1.3, "scrBlue1", { accentKey });
  cableRun(E, hz - 6.8, hz + 6.8, 3.7, { n: 3, seed: 33, r: 0.03 });
  E.decal(IMP_DECAL.glyphs3, hz - 8.6, 2.6, 0.034, 0.5);
  E.decal(IMP_DECAL.glyphs1, hz + 8.6, 2.6, 0.034, 0.5);

  // --- foreground between the door and the first row ---------------------------------------------
  // dark runner from the door to the aisle steps with blue hairlines, a cross band at the threshold
  kit.boxMM("impDeck", [-hx + 0.3, 0.004, -aisle], [-2.25, 0.014, aisle], { color: PALETTE.impGreyDark, texel: 0.7 });
  for (const s of [-1, 1]) kit.boxMM(accentKey, [-hx + 0.4, 0.006, s * (aisle + 0.02) - 0.012], [-2.3, 0.017, s * (aisle + 0.02) + 0.012]);
  kit.boxMM("impTrim", [-hx + 1.7, 0.006, -aisle - 0.06], [-hx + 1.76, 0.016, aisle + 0.06], { color: PALETTE.impBlack });
  // technicians' consoles either side of the runner, sloped tops toward the door, a chair each (the
  // N one sits just clear of the dais steps, the S one a little further in to leave the plinth room)
  for (const s of [-1, 1]) {
    const cx = s < 0 ? -7.0 : -6.6;
    const cz = s < 0 ? -2.7 : 2.85;
    impConsole(kit, cx, 0, cz, 1.8, 0.9, { yaw: -Math.PI / 2, seed: 44 + (s > 0 ? 1 : 0), screens: s < 0 ? ["scrBlue0", "scrWhite1"] : ["scrBlue1", "scrBlue2"], accentKey, height: 0.9 });
    chairInstance(kit, cx - 1.0, cz, -Math.PI / 2);
  }
  // holo plinth on the S side of the runner, inside the spawn's view cone: projector column, faint
  // cone, rotating deck map of the tower
  {
    const px = -8.9;
    const pz = 2.7;
    const ph = 0.92;
    projectorColumn(kit, px, pz, 0.36, ph, { accentKey, rings: 2 });
    projectorCone(kit, px, ph + 0.08, pz, ph + 0.5, 0.08, 0.62, "holo");
    const map = holoTowerMap(M, 1.15);
    map.group.position.set(px, ph + 0.34, pz);
    kit.attach(map.group);
    kit.onUpdate((dt, t) => {
      map.group.rotation.y = t * 0.35;
      map.blip.visible = Math.sin(t * 5) > -0.2;
    });
    kit.light({ type: "point", pos: [px, ph + 1.1, pz], color: 0x8fc0ff, intensity: 3.0, distance: 5, priority: 0.32 });
  }
  // rank of three standing displays in front of the S half of the front-row desk, turned toward the door
  {
    const keys = ["scrBlue0", "scrWhite1", "scrBlue1"];
    [4.3, 5.6, 6.9].forEach((z, i) => standingDisplay(kit, -6.4, z, yawToward(-6.4, z, -12, 0) + Math.PI, keys[i], accentKey));
  }

  // --- front: dais with the lectern and the hologram, screens either side of the door
  const W = walls.W.frame; // u = hz - z
  const dz0 = -7.0;
  const dz1 = -2.2;
  const dx0 = -hx + 1.3;
  const dx1 = -8.6;
  const dy = 0.3;
  kit.boxMM("impDeck", [dx0, 0.01, dz0], [dx1, dy, dz1], { color: PALETTE.impGreyDark, texel: 0.5 });
  kit.boxMM("impTrim", [dx0 - 0.03, 0.01, dz0 - 0.03], [dx1 + 0.03, 0.08, dz1 + 0.03], { color: PALETTE.impBlack, texel: 1 });
  kit.boxMM(accentKey, [dx1 + 0.031, 0.1, dz0 + 0.2], [dx1 + 0.045, 0.14, dz1 - 0.2]);
  kit.floor(dx0, dz0, dx1, dz1, dy, "dais");
  // two shallow steps on the E side of the dais
  kit.stairs(dx1, dz0 + 0.8, dx1 + 0.7, dz1 - 0.8, "x", dx1 + 0.7, dx1, 0, dy, 2);
  for (let k = 0; k < 2; k++) {
    const xa = dx1 + 0.35 * (1 - k);
    const yk = dy * ((k + 1) / 2);
    kit.boxMM("impDeck", [xa, 0.01, dz0 + 0.8], [xa + 0.35, yk, dz1 - 0.8], { color: PALETTE.impGreyDark, texel: 0.5 });
    kit.boxMM(accentKey, [xa + 0.35 - 0.002, yk - 0.07, dz0 + 0.9], [xa + 0.35 + 0.012, yk - 0.04, dz1 - 0.9]);
  }
  kit.collider([dx0, 0, dz0], [dx1, dy, dz0 + 0.8], "dais");
  kit.collider([dx0, 0, dz1 - 0.8], [dx1, dy, dz1], "dais");
  kit.collider([dx0, 0, dz0], [dx0 + 0.1, dy, dz1], "dais");
  // lectern console at the south end of the dais, speaker stands west of it facing the room
  impConsole(kit, -10.2, dy, -3.1, 1.6, 0.8, { yaw: -Math.PI / 2, seed: 17, screens: ["scrBlue1"], accentKey, height: 0.95 });
  // hologram over the north half of the dais + projector on the ceiling (the emitter sits 0.6 m
  // clear of the QA walker's dais target at z -6.0)
  const holoPos = [-10.2, dy + 1.35, -4.9];
  kit.cyl("impTrim", holoPos[0], dy + 0.03, holoPos[2], 0.5, 0.06, "y", { color: PALETTE.impBlack, segments: 24 });
  kit.cyl("impGloss", holoPos[0], dy + 0.07, holoPos[2], 0.44, 0.02, "y", { segments: 24 });
  kit.cyl(accentKey, holoPos[0], dy + 0.055, holoPos[2], 0.505, 0.02, "y", { segments: 24 });
  kit.collider([holoPos[0] - 0.5, dy, holoPos[2] - 0.5], [holoPos[0] + 0.5, dy + 0.1, holoPos[2] + 0.5], "emitter");
  // projector housing only: the beam is the spot light below, the blue cone mesh is hidden
  projector(kit, -5.2, h, -4.6, [holoPos[0], dy + 0.1, holoPos[2]], { accentKey, spread: 0.7, cone: false });
  const ship = holoShip(ctx.materials, 2.6);
  ship.position.set(holoPos[0], holoPos[1], holoPos[2]);
  ship.rotation.z = 0.12;
  kit.attach(ship);
  kit.onUpdate((dt) => {
    ship.rotation.y -= dt * 0.3;
  });
  // the big holo screen behind the dais, a second screen left of the door, cog emblem, wall gear
  wallScreen(W, hz + 4.6, 2.65, 4.0, 2.2, "scrBlue1", { accentKey, bezel: 0.18 });
  wallScreen(W, hz - 5.0, 2.4, 2.4, 1.4, "scrBlue0", { accentKey });
  W.decal(IMP_DECAL.cog, hz - 2.7, 2.5, 0.036, 1.1);
  W.decal(IMP_DECAL.restricted, hz - 8.6, 1.6, 0.034, 0.6);
  impWallGear(W, hz - 9.6, 1.6, { seed: 5, accentKey });
  for (const s of [-1, 1]) {
    W.box("impTrim", hz + 4.6 + s * 2.55, 2.65, 0.07, 0.24, 2.6, 0.08, { color: PALETTE.impBlack });
    W.box("emitWhiteSoft", hz + 4.6 + s * 2.55, 2.65, 0.115, 0.08, 2.4, 0.012, { uv: "keep" });
  }

  // --- lights: foreground fills doubled (dais side, plinth side, over the runner), tier keys, the
  // projector spot on the dais hologram
  kit.light({ type: "point", pos: [-9.6, h - 1.0, -4.6], color: 0xdfe8ff, intensity: lux(h - 1.0, 5.6), distance: 14, priority: 0.55 });
  kit.light({ type: "point", pos: [-8.0, h - 1.0, 4.4], color: 0xdfe8ff, intensity: lux(h - 1.0, 5.6), distance: 14, priority: 0.5 });
  kit.light({ type: "point", pos: [-9.6, h - 1.0, 0], color: 0xdfe8ff, intensity: lux(h - 1.0, 4.6), distance: 13, priority: 0.47 });
  for (const s of [-1, 1]) kit.light({ type: "point", pos: [1.5, h - 1.0, s * 5.5], color: 0xdfe8ff, intensity: lux(h - 1.0, 5.0), distance: 15, priority: 0.45 });
  for (const s of [-1, 1]) kit.light({ type: "point", pos: [10.0, h - 1.0, s * 4.5], color: 0xdfe8ff, intensity: lux(h - 1.0, 3.6), distance: 13, priority: 0.4 - (s + 1) * 0.005 });
  kit.light({ type: "spot", pos: [-5.2, h - 0.6, -4.6], target: [holoPos[0], dy, holoPos[2]], color: 0x9fd0ff, intensity: lux(4.2, 1.1), distance: 10, angle: 0.42, penumbra: 0.6, priority: 0.48 });
}

/** Continuous readout desk on a tier: black top, charcoal front with a blue strip, tilted readouts. */
function desk(kit, x, y, z0, z1, accentKey, tierIdx) {
  const len = z1 - z0;
  const top = y + 0.78;
  kit.boxMM("impMetal", [x - 0.25, y + 0.02, z0], [x + 0.25, top - 0.04, z1], { color: PALETTE.impCharcoal, texel: 1 });
  kit.boxMM("impTrim", [x - 0.3, top - 0.04, z0 - 0.04], [x + 0.3, top, z1 + 0.04], { color: PALETTE.impBlack, texel: 1 });
  // matte top plate (a gloss plate reflects the environment as a hot blob from the spawn view)
  kit.boxMM("impMetalRough", [x - 0.24, top, z0 + 0.03], [x + 0.24, top + 0.01, z1 - 0.03], { color: PALETTE.impCharcoal, texel: 1 });
  kit.boxMM(accentKey, [x - 0.31, y + 0.2, z0 + 0.1], [x - 0.3, y + 0.23, z1 - 0.1]);
  // legs / kick
  kit.boxMM("impTrim", [x - 0.2, y + 0.01, z0 + 0.02], [x + 0.2, y + 0.12, z1 - 0.02], { color: PALETTE.impBlack, texel: 1 });
  // tilted readouts, one per seat, facing east (the seated crew)
  const n = Math.round(len / 1.15);
  for (let k = 0; k < n; k++) {
    const z = z0 + 0.45 + k * 1.15;
    // readouts tilt up toward +x: the seated crew looks west over them
    const g = new THREE.PlaneGeometry(0.36, 0.2);
    g.rotateX(-Math.PI / 2);
    g.rotateZ(-0.5);
    kit.add(k % 3 === tierIdx % 3 ? "scrBlue1" : "scrBlue0", g, { pos: [x + 0.02, top + 0.09, z], uv: "keep" });
    // matte housing: a gloss plate here throws a specular hot spot back at the spawn view
    const b = new THREE.BoxGeometry(0.4, 0.03, 0.24);
    b.rotateZ(-0.5);
    kit.add("impTrim", b, { pos: [x + 0.03, top + 0.07, z], color: PALETTE.impBlack, texel: 1 });
    kit.box(accentKey, x - 0.17, top + 0.015, z + 0.1, 0.06, 0.01, 0.06);
    kit.box("emitRedImp", x - 0.17, top + 0.015, z - 0.1, 0.06, 0.01, 0.06);
  }
  kit.collider([x - 0.32, y, z0 - 0.04], [x + 0.32, top + 0.02, z1 + 0.04], "desk");
}
