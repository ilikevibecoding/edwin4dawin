// Deck 3 reactor chamber: an 88 m vertical volume around the main reactor column. The player walks a
// ring catwalk at y 12 (8 m wide), four radial bridges lead to the core service platform, and the pit
// below drops to y 4. Amber/orange, heavy machinery, deep vertical volume (§11).
import { defineRoom } from "../../deck2/_shared/room.js";
import { IMP } from "../../deck2/_shared/palette.js";
import { rail, WALL_T } from "../../deck2/_shared/shell.js";
import { REACTOR_WINDOW } from "../engctl/index.js";

const Y = 12;
const PIT_Y = 4;
const CEIL = 100;
const CZ = 651.25; // chamber centre
const CORE_R = 9;
const PLAT_R = 13;
const WALK = 8; // catwalk ring width

export default defineRoom({
  id: "d3-reactor",
  name: "Reactor Chamber",
  deck: 3,
  x: [-36, 36],
  z: [612.5, 690],
  y0: PIT_Y,
  ceil: CEIL,
  openings: [{ face: "n", ...REACTOR_WINDOW, glass: true, id: "reactor-engctl-window" }],
  spawn: { pos: [6.5, Y, 616], yaw: 180 },
  views: {
    "d3-reactor-entry": { pos: [6.5, Y, 616], yaw: 180, pitch: 8 },
    "d3-reactor-core": { pos: [-24, Y, CZ], yaw: -90, pitch: 14 },
    "d3-reactor-bridge": { pos: [0, Y, 684], yaw: 0, pitch: 10 },
  },
  shell: {
    panelW: 3.2,
    rows: [0, 0.4, 2.05, 2.27, 6, 12, 20, 30, 42, 56, 70, 84, 87.45, 88],
    wallColor: IMP.impMid,
    wallAlt: IMP.impDark,
    stripMat: "emitAmber",
    floor: false,
    ceiling: { channels: 0, color: IMP.impBlack, panelW: 6 },
    lights: false,
  },
  detail(ctx, shell, room) {
    const { kit, PALETTE } = ctx;
    const x0 = -36 + WALL_T;
    const x1 = 36 - WALL_T;
    const z0 = 612.5 + WALL_T;
    const z1 = 690 - WALL_T;

    // pit floor and pit walls (the shell's walls start at the catwalk level)
    kit.boxMM("impFloor", [x0, PIT_Y, z0], [x1, PIT_Y + 0.5, z1], { color: IMP.impDark, texel: 0.5 });
    kit.boxMM("paintedMetal", [-36, PIT_Y, 612.5], [36, Y, z0], { color: IMP.impBlack, texel: 0.5 });
    kit.boxMM("paintedMetal", [-36, PIT_Y, z1], [36, Y, 690], { color: IMP.impBlack, texel: 0.5 });
    kit.boxMM("paintedMetal", [-36, PIT_Y, z0], [x0, Y, z1], { color: IMP.impBlack, texel: 0.5 });
    kit.boxMM("paintedMetal", [x1, PIT_Y, z0], [36, Y, z1], { color: IMP.impBlack, texel: 0.5 });

    // ring catwalk
    const ix0 = x0 + WALK;
    const ix1 = x1 - WALK;
    const iz0 = z0 + WALK;
    const iz1 = z1 - WALK;
    const deck = (a, b) => kit.boxMM("impFloor", [a[0], Y - 0.5, a[1]], [b[0], Y, b[1]], { color: IMP.impMid, texel: 0.5 });
    deck([x0, z0], [x1, iz0]);
    deck([x0, iz1], [x1, z1]);
    deck([x0, iz0], [ix0, iz1]);
    deck([ix1, iz0], [x1, iz1]);
    // inner-edge rails, broken where the bridges land
    const bw = 3.0;
    rail(kit, PALETTE, [ix0, Y, iz0], [-bw / 2, Y, iz0], Y);
    rail(kit, PALETTE, [bw / 2, Y, iz0], [ix1, Y, iz0], Y);
    rail(kit, PALETTE, [ix0, Y, iz1], [-bw / 2, Y, iz1], Y);
    rail(kit, PALETTE, [bw / 2, Y, iz1], [ix1, Y, iz1], Y);
    rail(kit, PALETTE, [ix0, Y, iz0], [ix0, Y, CZ - bw / 2], Y);
    rail(kit, PALETTE, [ix0, Y, CZ + bw / 2], [ix0, Y, iz1], Y);
    rail(kit, PALETTE, [ix1, Y, iz0], [ix1, Y, CZ - bw / 2], Y);
    rail(kit, PALETTE, [ix1, Y, CZ + bw / 2], [ix1, Y, iz1], Y);

    // core column with emissive bands, service platform ring
    kit.cyl("paintedMetal", 0, (PIT_Y + 0.5 + CEIL - 2) / 2, CZ, CORE_R, CEIL - 2 - PIT_Y - 0.5, "y", { color: IMP.impDark, segments: 48, texel: 0.3 });
    for (let y = PIT_Y + 3; y < CEIL - 4; y += 8) {
      kit.cyl("emitAmber", 0, y, CZ, CORE_R + 0.12, 0.35, "y", { segments: 48 });
    }
    kit.cyl("impFloor", 0, Y - 0.25, CZ, PLAT_R, 0.5, "y", { color: IMP.impMid, segments: 48, texel: 0.5 });
    kit.collider([-CORE_R, Y, CZ - CORE_R], [CORE_R, Y + 3, CZ + CORE_R], "core");

    // radial bridges
    kit.boxMM("impFloor", [PLAT_R - 0.5, Y - 0.5, CZ - bw / 2], [ix1, Y, CZ + bw / 2], { color: IMP.impMid, texel: 0.5 });
    kit.boxMM("impFloor", [ix0, Y - 0.5, CZ - bw / 2], [-PLAT_R + 0.5, Y, CZ + bw / 2], { color: IMP.impMid, texel: 0.5 });
    kit.boxMM("impFloor", [-bw / 2, Y - 0.5, PLAT_R - 0.5 + CZ], [bw / 2, Y, iz1], { color: IMP.impMid, texel: 0.5 });
    kit.boxMM("impFloor", [-bw / 2, Y - 0.5, iz0], [bw / 2, Y, CZ - PLAT_R + 0.5], { color: IMP.impMid, texel: 0.5 });
    for (const s of [-1, 1]) {
      rail(kit, PALETTE, [PLAT_R, Y, CZ + (s * bw) / 2], [ix1, Y, CZ + (s * bw) / 2], Y);
      rail(kit, PALETTE, [ix0, Y, CZ + (s * bw) / 2], [-PLAT_R, Y, CZ + (s * bw) / 2], Y);
      rail(kit, PALETTE, [(s * bw) / 2, Y, CZ + PLAT_R], [(s * bw) / 2, Y, iz1], Y);
      rail(kit, PALETTE, [(s * bw) / 2, Y, iz0], [(s * bw) / 2, Y, CZ - PLAT_R], Y);
    }
    // platform edge posts (octagonal ring of short rails)
    const n = 16;
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2;
      const a1 = ((i + 1) / n) * Math.PI * 2;
      const mid = (a0 + a1) / 2;
      if (Math.abs(Math.sin(mid)) < 0.2 || Math.abs(Math.cos(mid)) < 0.2) continue; // bridge landings
      const p0 = [Math.cos(a0) * PLAT_R, Y, CZ + Math.sin(a0) * PLAT_R];
      const p1 = [Math.cos(a1) * PLAT_R, Y, CZ + Math.sin(a1) * PLAT_R];
      kit.cyl("metal", (p0[0] + p1[0]) / 2, Y + 1.02, (p0[2] + p1[2]) / 2, 0.03, Math.hypot(p1[0] - p0[0], p1[2] - p0[2]), "x", {
        color: IMP.steel,
        segments: 8,
        rot: [0, -Math.atan2(p1[2] - p0[2], p1[0] - p0[0]), Math.PI / 2],
      });
      kit.box("paintedMetal", p0[0], Y + 0.51, p0[2], 0.06, 1.02, 0.06, { color: IMP.impDark });
    }

    // lights: amber pools around the core, cool fill on the catwalk corners
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      ctx.lights.push({ type: "point", pos: [dx * (PLAT_R + 4), Y + 5, CZ + dz * (PLAT_R + 4)], color: 0xffa040, intensity: 90, distance: 40, priority: 0.8 });
    }
    for (const [x, z] of [[x0 + 4, z0 + 4], [x1 - 4, z0 + 4], [x0 + 4, z1 - 4], [x1 - 4, z1 - 4]]) {
      ctx.lights.push({ type: "point", pos: [x, Y + 6, z], color: 0xcfd8ff, intensity: 50, distance: 30, priority: 0.5 });
    }
    ctx.lights.push({ type: "point", pos: [0, CEIL - 10, CZ], color: 0xffb060, intensity: 200, distance: 80, priority: 0.4 });
    return {};
  },
});
