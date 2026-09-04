// Turbolift lobby: the arrival point on every deck. Two lift cabs off the side walls, a central deck
// directory kiosk, deck numerals, and dressing that tells you which deck you stepped onto (officer
// directory on the bridge deck, duty rosters on the crew deck, tool lockers and pipe runs in
// engineering, flight boards and crates on the hangar deck).
import * as THREE from "three";
import { buildShell, roomWalls, wallOpenings } from "../../shell.js";
import { LiftSystem } from "../../lifts.js";
import { wallFrame } from "../../../core/frame.js";
import { wallScreen, bench, ceilingLight, pointLightDesc, lockers, crate, pipeRun, column, rng } from "../../impKit.js";
import { IMP } from "../../../materials/imperial.js";
import { impDecalRect } from "../../../materials/imperialTextures.js";
import { STD, CLUSTERS } from "../../../config/layout.js";

export function makeLiftLobbyBuilder(lifts) {
  return (kit, ctx) => {
    const id = ctx.id;
    const room = ctx.room;
    const y = ctx.floorY;
    const [x0, z0, x1, z1] = room.box;
    const cx = (x0 + x1) / 2;
    const cz = (z0 + z1) / 2;
    const h = room.h;
    const cluster = room.cluster;
    const rand = rng(id.length * 17 + 3);
    const extra = LiftSystem.openingsFor(id);
    const eng = cluster === "eng";
    const hangar = cluster === "hangar";
    buildShell(kit, ctx, id, room, {
      extraOpenings: extra,
      wall: { pitch: 3.5, styles: { plain: 0.6, control: 0.15, vent: 0.15, hatch: 0.1 }, tone: eng || hangar ? IMP.wallMid : IMP.wallLight, toneAlt: IMP.wallMid, bandMat: eng || hangar ? "lightBandWarm" : "lightBand" },
      ceiling: { lights: false, panelW: 1.6 },
      floor: { strip: false, mat: cluster === "tower" ? "impGloss" : "impDeck", tone: cluster === "tower" ? IMP.white : IMP.wallDark },
    });
    lifts.buildCabs(kit, ctx, id);
    const walls = roomWalls(room);
    const doorWalls = Object.keys(walls).filter((k) => wallOpenings(id, room, k).length > 0);

    // --- central directory kiosk: square column with a screen on each face and a deck numeral band
    {
      const kw = 1.3;
      kit.box("impPaintedMetal", cx, y + 1.1, cz, kw, 2.2, kw, { color: IMP.consoleDark, texel: 1 });
      kit.box("impPaintedMetal", cx, y + 0.08, cz, kw + 0.3, 0.16, kw + 0.3, { color: IMP.trim, texel: 1 });
      kit.box("impPaintedMetal", cx, y + 2.25, cz, kw + 0.2, 0.1, kw + 0.2, { color: IMP.trim, texel: 1 });
      kit.box("emitAmber", cx, y + 2.19, cz, kw + 0.02, 0.03, kw + 0.02);
      for (const [dx, dz, ry] of [
        [0, kw / 2 + 0.005, 0],
        [0, -kw / 2 - 0.005, Math.PI],
        [kw / 2 + 0.005, 0, Math.PI / 2],
        [-kw / 2 - 0.005, 0, -Math.PI / 2],
      ]) {
        const g = new THREE.PlaneGeometry(0.9, 0.6);
        g.rotateY(ry);
        kit.add("screen" + Math.floor(rand() * 3), g, { pos: [cx + dx, y + 1.5, cz + dz], uv: "keep" });
        const d = new THREE.PlaneGeometry(0.42, 0.42);
        d.rotateY(ry);
        kit.add("impDecal", d, { pos: [cx + dx * 1.0, y + 0.75, cz + dz * 1.0], uv: "keep", uvRect: impDecalRect(14) });
        const b = new THREE.PlaneGeometry(0.9, 0.12);
        b.rotateY(ry);
        kit.add("blinkSparse", b, { pos: [cx + dx, y + 1.08, cz + dz], uv: "keep" });
      }
      kit.collider([cx - kw / 2 - 0.15, y, cz - kw / 2 - 0.15], [cx + kw / 2 + 0.15, y + 2.3, cz + kw / 2 + 0.15], "kiosk");
      pointLightDesc(ctx, 0x6fa0ff, 1.4, 4, [cx, y + 2.6, cz], 0);
    }
    // --- deck-number floor decal ring around the kiosk
    for (const [dx, dz, ry] of [
      [0, 2.2, 0],
      [0, -2.2, Math.PI],
      [2.2, 0, Math.PI / 2],
      [-2.2, 0, -Math.PI / 2],
    ]) {
      const g = new THREE.PlaneGeometry(1.2, 1.2);
      g.rotateX(-Math.PI / 2);
      g.rotateY(ry);
      kit.add("impDecal", g, { pos: [cx + dx, y + 0.004, cz + dz], uv: "keep", uvRect: impDecalRect(2) });
    }

    // --- walls without doors carry the deck dressing
    for (const key of ["north", "south"]) {
      const w = walls[key];
      const { frame, length } = wallFrame(kit, w.from, w.to, y);
      const hasDoor = doorWalls.includes(key);
      const mid = length / 2;
      if (cluster === "tower") {
        // officer directory: a bank of screens + insignia; flanking the door if there is one
        const at = hasDoor ? [mid - 5.2, mid + 5.2] : [mid - 3, mid + 3];
        for (const u of at) wallScreen(frame, u, 1.6, 1.8, 1.0, Math.floor(rand() * 3));
        frame.quad("impDecal", hasDoor ? mid - 2.6 : mid, 2.9, 0.062, 0.9, 0.9, { uvRect: impDecalRect(4) });
        if (hasDoor) frame.quad("impDecal", mid + 2.6, 2.9, 0.062, 0.9, 0.9, { uvRect: impDecalRect(4) });
      } else if (cluster === "crew") {
        // duty rosters + a bench and a water dispenser unit
        const at = hasDoor ? [mid - 4.6, mid + 4.6] : [mid - 3, mid + 3];
        for (const u of at) wallScreen(frame, u, 1.55, 1.2, 0.8, 1);
        if (!hasDoor) {
          frame.box("impPaintedMetal", mid, 0.7, 0.28, 0.6, 1.4, 0.5, { color: IMP.consoleDark, texel: 1 });
          frame.box("darkGloss", mid, 1.1, 0.54, 0.3, 0.2, 0.02);
          frame.box("emitBlue", mid, 0.9, 0.54, 0.2, 0.02, 0.01);
          frame.collider(mid - 0.35, mid + 0.35, 0, 1.5, 0, 0.6, "dispenser");
        }
      } else if (eng) {
        // tool lockers + a pipe run with valves along the top of the wall
        if (!hasDoor) lockers(frame, 1.0, Math.min(length - 1, 6.5), 2.1, { seed: id.length + 5, tone: IMP.wallMid });
        else {
          lockers(frame, 0.8, Math.min(mid - 3.2, 5), 2.1, { seed: id.length + 5, tone: IMP.wallMid });
          lockers(frame, Math.max(mid + 3.2, length - 5), length - 0.8, 2.1, { seed: id.length + 9, tone: IMP.wallMid });
        }
      } else if (hangar) {
        // flight board + deck-crew lockers
        const at = hasDoor ? [mid - 5, mid + 5] : [mid];
        for (const u of at) wallScreen(frame, u, 1.7, 2.2, 1.1, 2);
        if (!hasDoor) lockers(frame, 0.8, Math.min(length - 0.8, mid - 1.6), 2.1, { seed: id.length + 7, tone: IMP.wallMid });
      }
    }
    // --- engineering / hangar: exposed pipe runs along both side walls' cornice line
    if (eng || hangar) {
      for (const s of [-1, 1]) {
        const xx = s > 0 ? x1 - 0.55 : x0 + 0.55;
        pipeRun(kit, [[xx, y + h - 0.6, z0 + 0.6], [xx, y + h - 0.6, z1 - 0.6]], 0.09, { color: IMP.steel });
        pipeRun(kit, [[xx + s * 0.22, y + h - 0.85, z0 + 0.6], [xx + s * 0.22, y + h - 0.85, z1 - 0.6]], 0.06, { color: IMP.gunmetal });
      }
    }
    // --- hangar: crate stacks in the corners away from doors; crew deck: benches by the kiosk
    if (hangar) {
      for (const [sx, sz] of [
        [-1, -1],
        [1, -1],
      ]) {
        const px = cx + sx * (x1 - x0) * 0.36;
        const pz = cz + sz * (z1 - z0) * 0.32;
        crate(kit, [px, y, pz], [1.4, 1.1, 1.0], { seed: 3 + sx });
        crate(kit, [px + sx * 0.2, y + 1.1, pz], [1.0, 0.8, 0.9], { seed: 5 + sx, collide: false });
        crate(kit, [px - sx * 1.6, y, pz], [1.1, 0.9, 1.0], { seed: 7 + sx });
      }
    }
    if (cluster === "crew" || cluster === "tower") {
      for (const s of [-1, 1]) bench(kit, [cx + s * 2.4, y, cz], 1.6, s > 0 ? Math.PI / 2 : -Math.PI / 2, { back: true });
    }
    // --- ceiling light bars + deck-tinted glow strip at the base of the lift walls
    const nb = z1 - z0 >= 14 ? 3 : 2;
    for (let i = 0; i < nb; i++) {
      const zz = z0 + ((i + 0.5) / nb) * (z1 - z0);
      ceilingLight(kit, ctx, [cx, y + h, zz], Math.min(x1 - x0 - 3, 9), "x", { mat: eng || hangar ? "lightBandWarm" : "lightBand", color: eng || hangar ? 0xffd9b0 : 0xdfe8ff, intensity: i === Math.floor(nb / 2) ? 5.5 : 3.2, distance: 10, priority: i === Math.floor(nb / 2) ? 2 : 1 });
    }
    const glow = eng || hangar ? "emitAmber" : "emitBlue";
    for (const s of [-1, 1]) kit.boxMM(glow, [s > 0 ? x1 - 0.5 : x0 + 0.3, y + 0.02, z0 + 1], [s > 0 ? x1 - 0.3 : x0 + 0.5, y + 0.04, z1 - 1]);
    pointLightDesc(ctx, eng || hangar ? IMP.amber : IMP.blue, 1.2, 5, [cx, y + 0.4, cz], 0);
    // deck name stencil high on a door wall
    {
      const w = walls[doorWalls[0] || "north"];
      const { frame, length } = wallFrame(kit, w.from, w.to, y);
      frame.quad("impDecal", length / 2 - 2.0, h - 0.7, 0.062, 0.5, 0.5, { uvRect: impDecalRect(CLUSTERS[cluster].deck > 9 ? 14 : 2) });
    }
    ctx.view(id, cx, y + STD.eye, z1 - 1.5, 0, -3);
    ctx.view(id + "_lifts", cx - 3, y + STD.eye, cz + 4, -70, -4);
  };
}
