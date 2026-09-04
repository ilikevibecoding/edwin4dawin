// Duty office (east end) and utility room (west end). World coordinates; faces passed in from index.js.
import { FLOOR } from "../shared/plan.js";
import { seat } from "../shared/props.js";
import { IMP } from "../shared/palette.js";
import { amberLamp, junctionBox, luminaire, mount, plate, vent, wainscot } from "./lib.js";
import { noticeScreen } from "./corridor.js";

const black = { color: IMP.black, texel: 1 };
const dark = { color: IMP.dark, texel: 1 };
const midM = { color: IMP.mid, texel: 2 };

/** faces { x0, x1, z0, z1 } (x0 = corridor wall), door { z0, z1 } on the west face */
export function buildDutyOffice(kit, faces, door, ceilY) {
  const { x0, x1, z0, z1 } = faces;
  const y = (v) => FLOOR + v;
  wainscot(kit, { axis: "z", at: x0, from: z0, to: z1, n: "+x", gaps: [[door.z0 - 0.3, door.z1 + 0.3]] });
  wainscot(kit, { axis: "z", at: x1, from: z0, to: z1, n: "-x", gaps: [[507.5, 509.5]] });
  wainscot(kit, { axis: "x", at: z0, from: x0, to: x1, n: "+z", gaps: [] });
  wainscot(kit, { axis: "x", at: z1, from: x0, to: x1, n: "-z", gaps: [] });
  // inner door frame + plate + junction box
  kit.boxMM("paintedMetal", [x0, FLOOR, door.z0 - 0.2], [x0 + 0.08, y(2.5), door.z0], black);
  kit.boxMM("paintedMetal", [x0, FLOOR, door.z1], [x0 + 0.08, y(2.5), door.z1 + 0.2], black);
  kit.boxMM("paintedMetal", [x0, y(2.2), door.z0 - 0.2], [x0 + 0.08, y(2.5), door.z1 + 0.2], black);
  plate(kit, [x0, y(1.7), door.z0 - 0.6], "+x", 0.3, 0.3, 9);
  junctionBox(kit, [x0, y(1.45), door.z1 + 0.6], "+x", "emitBlue");

  // desk facing the door, duty officer's chair behind it, visitor chair in front
  const dx0 = 70.6;
  const dx1 = 71.4;
  const dz0 = 507.7;
  const dz1 = 509.7;
  kit.boxMM("darkGloss", [dx0 - 0.02, y(0.72), dz0 - 0.02], [dx1 + 0.02, y(0.755), dz1 + 0.02]);
  kit.boxMM("paintedMetal", [dx0, y(0.7), dz0], [dx1, y(0.72), dz1], black);
  kit.boxMM("paintedMetal", [dx0 + 0.05, y(0.15), dz1 - 0.55], [dx1 - 0.05, y(0.7), dz1 - 0.05], dark);
  kit.boxMM("paintedMetal", [dx0 + 0.05, y(0.15), dz0 + 0.05], [dx1 - 0.05, y(0.7), dz0 + 0.55], dark);
  kit.boxMM("paintedMetal", [dx0 + 0.03, y(0.15), dz0 + 0.55], [dx0 + 0.1, y(0.7), dz1 - 0.55], dark);
  kit.boxMM("paintedMetal", [dx0 + 0.05, FLOOR, dz0 + 0.05], [dx1 - 0.05, y(0.15), dz1 - 0.05], black);
  kit.collider([dx0 - 0.02, FLOOR, dz0 - 0.02], [dx1 + 0.02, y(0.78), dz1 + 0.02], "desk");
  for (const zc of [dz0 + 0.55, dz1 - 0.55]) {
    kit.boxMM("paintedMetal", [dx0 + 0.25, y(0.755), zc - 0.3], [dx0 + 0.32, y(1.15), zc + 0.3], black);
    kit.boxMM("screenImp3", [dx0 + 0.32, y(0.82), zc - 0.26], [dx0 + 0.325, y(1.1), zc + 0.26], { uv: "keep" });
    kit.boxMM("paintedMetal", [dx0 + 0.2, y(0.755), zc - 0.12], [dx0 + 0.4, y(0.77), zc + 0.12], black);
  }
  kit.boxMM("paintedMetal", [dx0 + 0.5, y(0.755), dz0 + 0.75], [dx0 + 0.7, y(0.77), dz1 - 0.75], black);
  for (let i = 0; i < 6; i++) kit.boxMM(i % 2 ? "emitRedImp" : "emitBlue", [dx0 + 0.55, y(0.77), dz0 + 0.8 + i * 0.07], [dx0 + 0.65, y(0.775), dz0 + 0.84 + i * 0.07]);
  kit.boxMM("darkGloss", [dx0 + 0.45, y(0.755), dz1 - 0.35], [dx0 + 0.7, y(0.767), dz1 - 0.15]);
  kit.cyl("metal", dx1 - 0.2, y(0.805), dz0 + 0.25, 0.04, 0.1, "y", midM);
  seat(kit, dx1 + 0.55, FLOOR, (dz0 + dz1) / 2, 1);
  seat(kit, dx0 - 0.7, FLOOR, dz0 + 0.5, 3);

  // duty roster board on the south wall, shelf of data pads under it
  kit.boxMM("paintedMetal", [69.5, y(1.15), z1 - 0.08], [72.9, y(2.45), z1], black);
  kit.boxMM("screenImp0", [69.65, y(1.3), z1 - 0.085], [72.75, y(2.3), z1 - 0.08], { uv: "keep" });
  kit.boxMM("metal", [69.5, y(2.45), z1 - 0.1], [72.9, y(2.48), z1], midM);
  kit.boxMM("emitWhite", [69.6, y(2.32), z1 - 0.086], [72.8, y(2.34), z1 - 0.08]);
  for (let i = 0; i < 8; i++) kit.boxMM(i % 4 === 0 ? "emitRedImp" : "emitBlue", [69.65 + i * 0.12, y(1.2), z1 - 0.086], [69.72 + i * 0.12, y(1.24), z1 - 0.08]);
  mount(kit, "metal", [71.2, y(1.0), z1], "-z", 1.8, 0.03, 0, 0.25, midM);
  for (let i = 0; i < 4; i++) kit.boxMM("darkGloss", [70.4 + i * 0.4, y(1.03), z1 - 0.22], [70.7 + i * 0.4, y(1.045), z1 - 0.04]);
  plate(kit, [73.6, y(1.9), z1], "-z", 0.3, 0.3, 0);
  junctionBox(kit, [74.4, y(1.5), z1], "-z", "emitRedImp");
  mount(kit, "paintedMetal", [68.6, y(1.8), z1], "-z", 0.5, 0.7, 0, 0.05, black);
  mount(kit, "screenImp3", [68.6, y(1.8), z1], "-z", 0.4, 0.6, 0.05, 0.055, { uv: "keep" });

  // weapon locker on the east wall: heavy cabinet, two doors, red band, keypad, caution plate
  kit.boxMM("paintedMetal", [x1 - 0.6, FLOOR, 507.6], [x1, y(2.2), 509.4], dark);
  kit.boxMM("paintedMetal", [x1 - 0.62, FLOOR, 507.55], [x1, y(0.12), 509.45], black);
  kit.boxMM("paintedMetal", [x1 - 0.62, y(2.2), 507.55], [x1, y(2.26), 509.45], black);
  for (const [a, b] of [
    [507.7, 508.45],
    [508.55, 509.3],
  ]) {
    kit.boxMM("paintedMetal", [x1 - 0.615, y(0.2), a], [x1 - 0.6, y(2.1), b], { color: IMP.mid, texel: 1 });
    kit.boxMM("paintedMetal", [x1 - 0.62, y(1.5), a + 0.05], [x1 - 0.615, y(1.58), b - 0.05], { color: IMP.red, texel: 2 });
    kit.boxMM("metal", [x1 - 0.65, y(0.95), (a + b) / 2 - 0.02], [x1 - 0.615, y(1.25), (a + b) / 2 + 0.02], midM);
  }
  kit.boxMM("paintedMetal", [x1 - 0.66, y(1.05), 508.44], [x1 - 0.615, y(1.35), 508.56], black);
  kit.boxMM("emitRedImp", [x1 - 0.665, y(1.28), 508.47], [x1 - 0.66, y(1.31), 508.53]);
  kit.boxMM("emitGreen", [x1 - 0.665, y(1.22), 508.47], [x1 - 0.66, y(1.25), 508.53]);
  plate(kit, [x1 - 0.615, y(1.85), 508.08], "-x", 0.26, 0.26, 1);
  plate(kit, [x1 - 0.615, y(1.85), 508.92], "-x", 0.26, 0.26, 13);
  kit.collider([x1 - 0.66, FLOOR, 507.55], [x1, y(2.26), 509.45], "weapon-locker");
  vent(kit, [x1, y(2.7), 508.5], "-x", 0.8, 0.3);
  amberLamp(kit, [x1, y(2.0), 510.6], "-x", { emit: "emitWhite" });
  plate(kit, [x1, y(1.9), 506.9], "-x", 0.3, 0.3, 5);

  // north wall: file cabinet, bench, deck plan
  kit.boxMM("paintedMetal", [74.2, FLOOR, z0], [75.0, y(1.3), z0 + 0.5], dark);
  for (let i = 0; i < 3; i++) {
    kit.boxMM("paintedMetal", [74.25, y(0.12 + i * 0.4), z0 + 0.5], [74.95, y(0.46 + i * 0.4), z0 + 0.512], { color: IMP.mid, texel: 1 });
    kit.boxMM("metal", [74.5, y(0.36 + i * 0.4), z0 + 0.512], [74.7, y(0.39 + i * 0.4), z0 + 0.54], midM);
  }
  kit.collider([74.2, FLOOR, z0], [75.0, y(1.3), z0 + 0.54], "cabinet");
  kit.boxMM("paintedMetal", [68.6, y(0.1), z0], [70.6, y(0.4), z0 + 0.5], dark);
  kit.boxMM("paintedMetal", [68.7, FLOOR, z0 + 0.05], [70.5, y(0.1), z0 + 0.45], black);
  kit.boxMM("fabric", [68.62, y(0.4), z0 + 0.02], [70.58, y(0.46), z0 + 0.5], { color: IMP.dark, texel: 2 });
  kit.collider([68.6, FLOOR, z0], [70.6, y(0.46), z0 + 0.5], "bench");
  noticeScreen(kit, [72.2, y(1.8), z0], "+z", 1.4, 0.8, "screenImp3");
  plate(kit, [74.0, y(1.9), z0], "+z", 0.3, 0.3, 14);
  junctionBox(kit, [69.4, y(1.5), z0], "+z", "emitBlue");
  luminaire(kit, 70.5, 73.5, 508.3, 508.9, ceilY, { emit: "emitWhite", drop: 0.05 });
}

/** faces { x0, x1, z0, z1 } (x1 = corridor wall), door { z0, z1 } on the east face */
export function buildUtility(kit, faces, door, ceilY) {
  const { x0, x1, z0, z1 } = faces;
  const y = (v) => FLOOR + v;
  // inner door frame + label
  kit.boxMM("paintedMetal", [x1 - 0.08, FLOOR, door.z0 - 0.2], [x1, y(2.5), door.z0], black);
  kit.boxMM("paintedMetal", [x1 - 0.08, FLOOR, door.z1], [x1, y(2.5), door.z1 + 0.2], black);
  kit.boxMM("paintedMetal", [x1 - 0.08, y(2.2), door.z0 - 0.2], [x1, y(2.5), door.z1 + 0.2], black);
  plate(kit, [x1, y(1.7), door.z1 + 0.6], "-x", 0.3, 0.3, 6);
  junctionBox(kit, [x1, y(1.5), door.z0 - 0.6], "-x", "emitRedImp");

  // equipment units along the west wall: three cabinets with vents, readouts and LED status
  const cab = (zc, i) => {
    kit.boxMM("paintedMetal", [x0, FLOOR, zc - 0.45], [x0 + 0.7, y(2.1), zc + 0.45], dark);
    kit.boxMM("paintedMetal", [x0, FLOOR, zc - 0.47], [x0 + 0.72, y(0.1), zc + 0.47], black);
    kit.boxMM("paintedMetal", [x0, y(2.1), zc - 0.47], [x0 + 0.72, y(2.16), zc + 0.47], black);
    kit.boxMM("paintedMetal", [x0 + 0.7, y(0.2), zc - 0.4], [x0 + 0.712, y(1.9), zc + 0.4], { color: IMP.mid, texel: 1 });
    for (let k = 0; k < 5; k++) kit.boxMM("metal", [x0 + 0.712, y(0.35 + k * 0.08), zc - 0.3], [x0 + 0.725, y(0.37 + k * 0.08), zc + 0.3], midM);
    kit.boxMM("paintedMetal", [x0 + 0.712, y(1.35), zc - 0.3], [x0 + 0.75, y(1.75), zc + 0.3], black);
    kit.boxMM("screenImp3", [x0 + 0.75, y(1.5), zc - 0.25], [x0 + 0.755, y(1.7), zc + 0.25], { uv: "keep" });
    const leds = ["emitGreen", "emitGreen", "emitAmber", "emitGreen", "emitRedImp", "emitGreen"];
    for (let k = 0; k < 4; k++) kit.boxMM(leds[(k + i) % leds.length], [x0 + 0.75, y(1.4), zc - 0.22 + k * 0.13], [x0 + 0.755, y(1.43), zc - 0.16 + k * 0.13]);
    kit.boxMM("metal", [x0 + 0.712, y(1.0), zc + 0.3], [x0 + 0.75, y(1.25), zc + 0.34], midM);
    plate(kit, [x0 + 0.712, y(1.95), zc], "+x", 0.2, 0.2, [12, 5, 9][i % 3]);
  };
  cab(504.0, 0);
  cab(505.0, 1);
  cab(506.0, 2);
  kit.collider([x0, FLOOR, 503.5], [x0 + 0.76, y(2.16), 506.5], "equipment");
  // air handler with a duct up to the ceiling and a pipe run
  kit.boxMM("paintedMetal", [x0, FLOOR, 508.0], [x0 + 1.15, y(2.3), 510.5], { color: IMP.mid, texel: 1 });
  kit.boxMM("paintedMetal", [x0, FLOOR, 507.95], [x0 + 1.2, y(0.15), 510.55], black);
  kit.boxMM("paintedMetal", [x0 + 1.15, y(0.4), 508.2], [x0 + 1.18, y(1.6), 510.3], black);
  for (let k = 0; k < 8; k++) kit.boxMM("metal", [x0 + 1.18, y(0.5 + k * 0.14), 508.3], [x0 + 1.2, y(0.54 + k * 0.14), 510.2], midM);
  kit.boxMM("paintedMetal", [x0 + 1.15, y(1.8), 508.4], [x0 + 1.2, y(2.1), 509.2], black);
  kit.boxMM("emitAmber", [x0 + 1.2, y(1.9), 508.5], [x0 + 1.205, y(1.95), 508.7]);
  kit.boxMM("emitGreen", [x0 + 1.2, y(1.9), 508.8], [x0 + 1.205, y(1.95), 509.0]);
  plate(kit, [x0 + 1.15, y(1.95), 509.9], "+x", 0.3, 0.3, 5);
  kit.cyl("metalRough", x0 + 0.6, y(2.3 + (ceilY - FLOOR - 2.3) / 2), 509.25, 0.28, ceilY - FLOOR - 2.3, "y", midM);
  kit.collider([x0, FLOOR, 507.95], [x0 + 1.2, y(2.3), 510.55], "air-handler");
  kit.cyl("metal", x0 + 1.5, ceilY - 0.3, (z0 + z1) / 2, 0.08, z1 - z0 - 0.2, "z", midM);
  kit.cyl("metal", x0 + 1.75, ceilY - 0.3, (z0 + z1) / 2, 0.05, z1 - z0 - 0.2, "z", { color: IMP.amber, texel: 2 });
  for (const zc of [504.5, 507.5, 510.5]) kit.boxMM("paintedMetal", [x0 + 1.35, ceilY - 0.42, zc - 0.03], [x0 + 1.9, ceilY, zc + 0.03], black);
  // amber floor marking in front of the equipment
  kit.boxMM("paintedMetal", [x0 + 0.95, FLOOR, 503.5], [x0 + 1.05, y(0.006), 507.6], { color: IMP.amber, texel: 1 });
  kit.boxMM("paintedMetal", [x0 + 1.4, FLOOR, 507.8], [x0 + 1.5, y(0.006), 510.7], { color: IMP.amber, texel: 1 });

  // shelving with crates along the north wall
  const rx0 = 58.4;
  const rx1 = 63.4;
  const rd = 0.65;
  for (let i = 0; i <= 4; i++) {
    const px = rx0 + i * ((rx1 - rx0) / 4);
    kit.boxMM("metalRough", [px - 0.025, FLOOR, z0], [px + 0.025, y(2.1), z0 + 0.05], midM);
    kit.boxMM("metalRough", [px - 0.025, FLOOR, z0 + rd - 0.05], [px + 0.025, y(2.1), z0 + rd], midM);
  }
  for (const sy of [0.12, 0.85, 1.55]) kit.boxMM("metalRough", [rx0, y(sy), z0], [rx1, y(sy + 0.03), z0 + rd], { color: IMP.mid, texel: 1 });
  kit.collider([rx0 - 0.03, FLOOR, z0], [rx1 + 0.03, y(2.1), z0 + rd], "rack");
  const crates = [
    [58.6, 0.15, 0.55, 0.45, IMP.mid, 11],
    [59.3, 0.15, 0.5, 0.42, IMP.grey, -1],
    [60.1, 0.15, 0.7, 0.5, IMP.mid, 11],
    [61.2, 0.15, 0.45, 0.4, IMP.dark, -1],
    [61.8, 0.15, 0.6, 0.5, IMP.mid, 1],
    [62.6, 0.15, 0.5, 0.45, IMP.grey, 11],
    [58.7, 0.88, 0.5, 0.4, IMP.grey, -1],
    [59.7, 0.88, 0.6, 0.45, IMP.mid, 11],
    [60.9, 0.88, 0.5, 0.42, IMP.dark, 12],
    [62.0, 0.88, 0.7, 0.5, IMP.mid, -1],
    [58.6, 1.58, 0.5, 0.35, IMP.mid, 11],
    [59.5, 1.58, 0.6, 0.4, IMP.grey, -1],
    [61.5, 1.58, 0.55, 0.38, IMP.mid, 5],
    [62.5, 1.58, 0.5, 0.4, IMP.dark, -1],
  ];
  for (const [cx, cy, w, h, color, cell] of crates) {
    kit.boxMM("paintedMetal", [cx, y(cy), z0 + 0.08], [cx + w, y(cy + h), z0 + 0.08 + w * 0.85], { color, texel: 1 });
    kit.boxMM("paintedMetal", [cx + 0.02, y(cy + h * 0.5), z0 + 0.075], [cx + w - 0.02, y(cy + h * 0.5 + 0.02), z0 + 0.08 + w * 0.85 + 0.005], black);
    if (cell >= 0) plate(kit, [cx + w / 2, y(cy + h * 0.72), z0 + 0.08 + w * 0.85], "+z", h * 0.36, h * 0.36, cell);
  }
  for (let k = 0; k < 3; k++) kit.cyl("metal", 60.55 + k * 0.22, y(1.58 + 0.2), z0 + 0.3, 0.09, 0.4, "y", midM);

  // south wall: tool board, hose reel, bucket; floor drain
  kit.boxMM("darkGloss", [58.0, y(1.0), z1 - 0.05], [60.4, y(2.2), z1]);
  kit.boxMM("metal", [58.0, y(0.98), z1 - 0.06], [60.4, y(1.0), z1], midM);
  kit.boxMM("metal", [58.0, y(2.2), z1 - 0.06], [60.4, y(2.22), z1], midM);
  for (let k = 0; k < 6; k++) kit.boxMM("metal", [58.2 + k * 0.38, y(1.2), z1 - 0.12], [58.24 + k * 0.38, y(1.2 + 0.35 + (k % 3) * 0.2), z1 - 0.05], midM);
  for (let k = 0; k < 3; k++) kit.boxMM("paintedMetal", [58.15 + k * 0.76, y(1.85), z1 - 0.1], [58.3 + k * 0.76, y(2.1), z1 - 0.05], black);
  kit.cyl("metalRough", 61.4, y(1.3), z1 - 0.18, 0.28, 0.16, "z", { color: IMP.dark, texel: 1 });
  kit.cyl("metalRough", 61.4, y(1.3), z1 - 0.18, 0.12, 0.2, "z", { color: IMP.amber, texel: 1 });
  kit.boxMM("paintedMetal", [61.2, y(0.9), z1 - 0.1], [61.6, y(1.7), z1], black);
  kit.cyl("paintedMetal", 62.4, y(0.18), z1 - 0.35, 0.16, 0.36, "y", { color: IMP.mid, texel: 1 });
  kit.cyl("paintedMetal", 62.7, y(0.7), z1 - 0.15, 0.015, 1.4, "y", black);
  kit.collider([61.0, FLOOR, z1 - 0.6], [62.9, y(1.7), z1], "tools");
  kit.boxMM("darkGloss", [59.6, y(0.002), 507.0], [60.4, y(0.008), 507.8]);
  vent(kit, [x1, y(2.6), 504.5], "-x", 0.8, 0.3);
  plate(kit, [x1, y(1.9), 504.5], "-x", 0.3, 0.3, 12);
  luminaire(kit, 59.2, 61.6, 506.4, 507.0, ceilY, { emit: "emitWhite", drop: 0.05 });
  luminaire(kit, 59.2, 61.6, 509.4, 510.0, ceilY, { emit: "emitWhite", drop: 0.05 });
  amberLamp(kit, [x1, y(2.0), 510.6], "-x", { emit: "emitWhite" });
}
