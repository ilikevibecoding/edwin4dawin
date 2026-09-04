// Turbolift lobby: a wider vestibule with the two lift doors on the aft wall, a deck directory
// panel, a bench, floor markings pointing at the lifts and a red/blue call indicator per shaft.
import * as THREE from "three";
import { PALETTE } from "../materials.js";
import { impRoomShell, impWallGear, lux } from "./imperial_kit.js";
import { IMP_DECAL } from "../textures_imperial.js";
import { DECKS, DECK_ORDER } from "../spec.js";

export function buildLobby(kit, ctx, room) {
  const [w, h, d] = room.size;
  const accentKey = ctx.accentKey ? ctx.accentKey(room) : "emitBlue";
  const walls = impRoomShell(kit, room, ctx.doors, {
    accentKey,
    wall: { panelW: 1.9, features: { vent: 0.05, equipment: 0.08, conduit: 0.03, light: 0.14, screen: 0.06 } },
    floor: { lane: false },
    ceiling: { troughs: 2, troughW: 0.5, beamStep: 3.0 },
  });
  // lift call posts beside each lift door on the S wall
  const lifts = ctx.doors.filter((dd) => dd.type === "lift");
  for (const lf of lifts) {
    const x = lf.lx;
    for (const s of [-1, 1]) {
      const px = x + s * (lf.w / 2 + 0.5);
      kit.box("impTrim", px, 0.7, d / 2 - 0.25, 0.28, 1.4, 0.3, { color: PALETTE.impBlack, texel: 1 });
      kit.box("impMetal", px, 1.25, d / 2 - 0.41, 0.2, 0.22, 0.02, { color: PALETTE.impCharcoal });
      kit.box(s < 0 ? accentKey : "emitRedImp", px, 1.3, d / 2 - 0.425, 0.08, 0.08, 0.01);
      kit.box("impGloss", px, 1.16, d / 2 - 0.425, 0.14, 0.05, 0.01);
      kit.collider([px - 0.14, 0, d / 2 - 0.4], [px + 0.14, 1.4, d / 2], "post");
    }
    // shaft number and deck directory above the door
    walls.S.frame.decal(IMP_DECAL.turbolift, w / 2 - x, lf.h + 0.5, 0.03, 0.5);
    // floor marking leading to the door
    kit.box("chevronY", x, 0.005, d / 2 - 1.8, lf.w + 0.4, 0.008, 1.4, { texel: 1.2 });
  }
  // deck directory: a lit display column on the N wall beside the corridor door
  const dir = walls.N.frame;
  const du = w / 2 - 6.5;
  dir.box("impTrim", du, 1.5, 0.1, 1.4, 2.2, 0.2, { color: PALETTE.impBlack, texel: 1 });
  dir.box("impGloss", du, 1.6, 0.21, 1.2, 1.6, 0.02);
  dir.screen("scrBlue1", du, 1.6, 0.225, 1.1, 1.4);
  dir.box(accentKey, du, 2.55, 0.21, 1.1, 0.04, 0.02);
  for (let i = 0; i < DECK_ORDER.length; i++) {
    const on = DECK_ORDER[i] === room.deck;
    dir.box(on ? "emitWhite" : accentKey, du - 0.45, 0.65 + i * 0.16, 0.225, 0.08, 0.06, 0.01);
  }
  dir.collider(du - 0.7, du + 0.7, 0, 2.6, 0, 0.22, "directory");
  // bench along the E wall + wall gear on W
  kit.box("impTrim", w / 2 - 0.5, 0.25, 0, 0.7, 0.5, 3.0, { color: PALETTE.impBlack, texel: 1 });
  kit.box("rubber", w / 2 - 0.5, 0.52, 0, 0.62, 0.06, 2.9, { color: PALETTE.impGreyDark });
  kit.collider([w / 2 - 0.85, 0, -1.5], [w / 2, 0.6, 1.5], "bench");
  impWallGear(walls.W.frame, d * 0.5, 1.5, { seed: 9, accentKey });
  // lights
  kit.light({ type: "point", pos: [-w / 4, h - 0.5, 0], color: 0xe4ecff, intensity: lux(h - 0.5), distance: 12, priority: 0.5 });
  kit.light({ type: "point", pos: [w / 4, h - 0.5, 0], color: 0xe4ecff, intensity: lux(h - 0.5), distance: 12, priority: 0.49 });
  kit.light({ type: "point", pos: [0, 1.6, d / 2 - 1.0], color: new THREE.Color(room.accent || "#4f8dff").getHex(), intensity: 3.0, distance: 8, priority: 0.3 });
}
