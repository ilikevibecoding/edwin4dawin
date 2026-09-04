// d1-observation — observation gallery along the tower's port front face. APERTURE OBSERVATION (§6.2):
// x -78..-50, y 241.5..244.5 in the face plane z 455..458; B owns z ≥ 455.5 inside it.
import * as THREE from "three";
import { BOUNDS, CEIL, FLOOR, doorsFor } from "../shared/plan.js";
import { roomShell, railing, doorReveal } from "../shared/imperial.js";
import { IMP, LIGHT } from "../shared/palette.js";

const ID = "d1-observation";
const B = BOUNDS[ID];
const A = { x0: -78, x1: -50, y0: 241.5, y1: 244.5, zOut: 455.5, zIn: 458 };

const manifest = {
  id: ID,
  name: "Observation Gallery",
  kind: "room",
  deck: 1,
  owner: "B",
  bounds: B,
  doors: doorsFor(ID),
  lift: null,
  spawn: { pos: [-22, FLOOR, 462], yaw: 90 },
  apertures: ["observation"],
  views: {
    "d1-observation-window": { pos: [-64, FLOOR, 464.5], yaw: 0, pitch: -1 },
    "d1-observation-along": { pos: [-24, FLOOR, 462], yaw: 90, pitch: -2 },
    "d1-observation-lounge": { pos: [-44, FLOOR, 460.5], yaw: -120, pitch: -4 },
  },
  build(ctx) {
    const { kit } = ctx;
    const ceilY = CEIL[ID];
    const win = { a0: A.x0, a1: A.x1, y0: A.y0, y1: A.y1, kind: "window" };
    roomShell(kit, manifest, {
      floorY: FLOOR,
      ceilY,
      seed: 53,
      panelW: 2.4,
      strip: "emitWhite",
      extra: { n: [win] },
      ceiling: { axis: "x", inset: 0.25, channels: [{ at: 460.2, w: 0.5, emit: "emitWhite", emitW: 0.14 }, { at: 463.8, w: 0.5, emit: "emitWhite", emitW: 0.14 }] },
    });
    for (const d of manifest.doors) doorReveal(kit, manifest, d, FLOOR);

    // --- window band: reveal lining, mullions every 4 m, glass 0.8 m into the reveal, leaning rail inside
    const zRoom = A.zIn + 0.3;
    const t = 0.1;
    kit.boxMM("metalRough", [A.x0, A.y0, A.zOut], [A.x1, A.y0 + t, zRoom], { color: IMP.mid, texel: 1 });
    kit.boxMM("metalRough", [A.x0, A.y1 - t, A.zOut], [A.x1, A.y1, zRoom], { color: IMP.dark, texel: 1 });
    kit.boxMM("metalRough", [A.x0, A.y0, A.zOut], [A.x0 + t, A.y1, zRoom], { color: IMP.dark, texel: 1 });
    kit.boxMM("metalRough", [A.x1 - t, A.y0, A.zOut], [A.x1, A.y1, zRoom], { color: IMP.dark, texel: 1 });
    const n = 7;
    const pw = (A.x1 - A.x0) / n;
    for (let i = 0; i <= n; i++) {
      const x = A.x0 + i * pw;
      kit.boxMM("paintedMetal", [x - 0.12, A.y0, A.zOut + 0.05], [x + 0.12, A.y1, zRoom + 0.03], { color: IMP.dark, texel: 1 });
    }
    for (let i = 0; i < n; i++) {
      const x = A.x0 + (i + 0.5) * pw;
      kit.add("glass", new THREE.PlaneGeometry(pw - 0.26, A.y1 - A.y0 - 2 * t), { pos: [x, (A.y0 + A.y1) / 2, A.zOut + 0.8], uv: "keep" });
    }
    kit.boxMM("metal", [A.x0 - 0.3, A.y0 - 0.02, zRoom - 0.02], [A.x1 + 0.3, A.y0 + 0.04, zRoom + 0.4], { color: IMP.mid, texel: 1 });
    kit.collider([A.x0 - 0.3, FLOOR, A.zOut], [A.x1 + 0.3, A.y1, zRoom + 0.4], "sill");
    railing(kit, [A.x0 + 0.2, zRoom + 0.9], [A.x1 - 0.2, zRoom + 0.9], FLOOR, { postEvery: 2.0 });

    // --- lounge: benches along the south wall facing the window, low tables, display plinths at the east end
    for (let x = -80; x < -48; x += 6) {
      kit.boxMM("paintedMetal", [x, FLOOR, 464.6], [x + 4.4, FLOOR + 0.42, 465.5], { color: IMP.dark, texel: 1 });
      kit.boxMM("fabric", [x - 0.05, FLOOR + 0.42, 464.5], [x + 4.45, FLOOR + 0.5, 465.55], { color: IMP.mid, texel: 2 });
      kit.boxMM("paintedMetal", [x + 1.4, FLOOR, 462.0], [x + 3.0, FLOOR + 0.55, 462.8], { color: IMP.black, texel: 1 });
      kit.collider([x - 0.05, FLOOR, 464.5], [x + 4.45, FLOOR + 0.6, 465.55], "bench");
      kit.collider([x + 1.4, FLOOR, 462.0], [x + 3.0, FLOOR + 0.6, 462.8], "table");
    }
    for (let x = -44; x < -24; x += 5) {
      kit.boxMM("paintedMetal", [x, FLOOR, 459.0], [x + 1.2, FLOOR + 1.1, 460.2], { color: IMP.dark, texel: 1 });
      kit.boxMM("screenImp" + (Math.abs(Math.round(x / 5)) % 4), [x + 0.1, FLOOR + 1.11, 459.1], [x + 1.1, FLOOR + 1.12, 460.1], { uv: "keep" });
      kit.collider([x, FLOOR, 459.0], [x + 1.2, FLOOR + 1.2, 460.2], "plinth");
    }

    // --- lights: cold star-light through the band (spot outside), warm-white pools over the lounge
    ctx.lights.push({ type: "spot", pos: [-64, 244.2, 455.8], target: [-64, 240, 465], color: LIGHT.coolWhite, intensity: 150, distance: 40, angle: 0.95, penumbra: 0.7, priority: 0.9 });
    for (let x = -76; x <= -28; x += 12) ctx.lights.push({ type: "point", pos: [x, ceilY - 0.5, 462], color: LIGHT.coolWhite, intensity: 24, distance: 14, priority: 0.4 });
    return {};
  },
};
export default manifest;
