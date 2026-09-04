// Deck 2 security office + detention block: duty desk and monitor wall up front, a corridor of
// barred cells behind a heavy gate. Dark grey, red strips, black doors (§11).
import { defineRoom } from "../_shared/room.js";
import { IMP } from "../_shared/palette.js";

const Y = 40;

export default defineRoom({
  id: "d2-security",
  name: "Security & Detention",
  deck: 2,
  x: [11, 35],
  z: [377.5, 410],
  ceil: 44.6,
  spawn: { pos: [23, Y, 380], yaw: 180 },
  views: {
    "d2-security-door": { pos: [23, Y, 380], yaw: 180, pitch: -2 },
    "d2-security-cells": { pos: [13, Y, 408], yaw: -45, pitch: -2 },
    "d2-security-desk": { pos: [33, Y, 382], yaw: 135, pitch: -3 },
  },
  shell: {
    panelW: 1.6,
    wallColor: IMP.impMid,
    wallAlt: IMP.impGrey,
    corniceColor: IMP.impDark,
    stripMat: "emitRedImp",
    floor: { color: IMP.impDark },
    ceiling: { channels: 4, axis: "z", color: IMP.impDark },
    lights: { count: 6, color: 0xffd0c8, intensity: 24, distance: 13 },
  },
});
