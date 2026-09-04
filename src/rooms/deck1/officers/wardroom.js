// Wardroom: long table for twelve, sideboard with service, viewscreen wall, pantry alcove, wainscot,
// ceiling coves and amber wall lamps. World coordinates; faces passed in from index.js.
import { FLOOR } from "../shared/plan.js";
import { seat } from "../shared/props.js";
import { IMP } from "../shared/palette.js";
import { amberLamp, junctionBox, mount, plate, vent, wainscot } from "./lib.js";
import { noticeScreen } from "./corridor.js";

const black = { color: IMP.black, texel: 1 };
const dark = { color: IMP.dark, texel: 1 };
const midM = { color: IMP.mid, texel: 2 };

/** faces: { x0, x1, z0, z1 }; door: { z0, z1 } on the east face; ceilY absolute */
export function buildWardroom(kit, faces, door, ceilY) {
  const { x0, x1, z0, z1 } = faces;
  const wx = (x0 + x1) / 2;
  const wz = (z0 + z1) / 2;
  const H = ceilY - FLOOR;
  const y = (v) => FLOOR + v;

  // --- walls: wainscot, pilasters, pelmet-free (well lit room keeps its corridor strip)
  wainscot(kit, { axis: "z", at: x1, from: z0, to: z1, n: "-x", gaps: [[door.z0 - 0.3, door.z1 + 0.3]] });
  wainscot(kit, { axis: "z", at: x0, from: z0, to: z1, n: "+x", gaps: [[wz - 2.7, wz + 2.7]] });
  wainscot(kit, { axis: "x", at: z0, from: x0, to: x1, n: "+z", gaps: [[46.9, 53.5]] });
  wainscot(kit, { axis: "x", at: z1, from: x0, to: x1, n: "-z", gaps: [[x0, 47.9]] });
  for (const px of [54.2, 59.4]) {
    kit.boxMM("paintedMetal", [px - 0.15, FLOOR, z0], [px + 0.15, y(H - 0.35), z0 + 0.1], dark);
    kit.boxMM("emitWhite", [px - 0.01, y(0.4), z0 + 0.1], [px + 0.01, y(2.6), z0 + 0.105]);
  }
  for (const px of [49, 54.2, 59.4]) {
    kit.boxMM("paintedMetal", [px - 0.15, FLOOR, z1 - 0.1], [px + 0.15, y(H - 0.35), z1], dark);
    kit.boxMM("emitWhite", [px - 0.01, y(0.4), z1 - 0.105], [px + 0.01, y(2.6), z1 - 0.1]);
  }
  // heavy inner door frame on the corridor wall
  kit.boxMM("paintedMetal", [x1 - 0.08, FLOOR, door.z0 - 0.2], [x1, y(2.5), door.z0], black);
  kit.boxMM("paintedMetal", [x1 - 0.08, FLOOR, door.z1], [x1, y(2.5), door.z1 + 0.2], black);
  kit.boxMM("paintedMetal", [x1 - 0.08, y(2.2), door.z0 - 0.2], [x1, y(2.5), door.z1 + 0.2], black);
  junctionBox(kit, [x1, y(1.5), door.z0 - 0.6], "-x", "emitBlue");
  plate(kit, [x1, y(1.7), door.z1 + 0.6], "-x", 0.3, 0.3, 9);
  // coat rail with three coats beside the door
  mount(kit, "metal", [x1, y(1.85), door.z1 + 1.6], "-x", 1.2, 0.03, 0.0, 0.12, midM);
  for (let i = 0; i < 3; i++) {
    mount(kit, "fabric", [x1, y(1.25), door.z1 + 1.2 + i * 0.4], "-x", 0.3, 1.15, 0.06, 0.16, { color: i === 1 ? IMP.mid : IMP.dark, texel: 2 });
  }

  // --- ceiling: perimeter soffit with warm cove line, linear luminaire over the table
  const sy0 = y(H - 0.35);
  const sw = 0.7;
  kit.boxMM("paintedMetal", [x0, sy0, z0], [x1, ceilY, z0 + sw], black);
  kit.boxMM("paintedMetal", [x0, sy0, z1 - sw], [x1, ceilY, z1], black);
  kit.boxMM("paintedMetal", [x0, sy0, z0 + sw], [x0 + sw, ceilY, z1 - sw], black);
  kit.boxMM("paintedMetal", [x1 - sw, sy0, z0 + sw], [x1, ceilY, z1 - sw], black);
  const cy0 = sy0 + 0.04;
  const cy1 = sy0 + 0.14;
  kit.boxMM("emitWarmSoft", [x0 + sw, cy0, z0 + sw], [x1 - sw, cy1, z0 + sw + 0.012]);
  kit.boxMM("emitWarmSoft", [x0 + sw, cy0, z1 - sw - 0.012], [x1 - sw, cy1, z1 - sw]);
  kit.boxMM("emitWarmSoft", [x0 + sw, cy0, z0 + sw], [x0 + sw + 0.012, cy1, z1 - sw]);
  kit.boxMM("emitWarmSoft", [x1 - sw - 0.012, cy0, z0 + sw], [x1 - sw, cy1, z1 - sw]);
  kit.boxMM("paintedMetal", [wx - 4.4, ceilY - 0.14, wz - 0.32], [wx + 4.4, ceilY, wz + 0.32], black);
  kit.boxMM("emitWarmSoft", [wx - 4.2, ceilY - 0.15, wz - 0.26], [wx + 4.2, ceilY - 0.14, wz + 0.26]);
  for (const x of [wx - 6.5, wx + 6.5]) {
    kit.boxMM("paintedMetal", [x - 0.4, ceilY - 0.1, wz - 0.4], [x + 0.4, ceilY, wz + 0.4], black);
    kit.boxMM("emitWarmSoft", [x - 0.3, ceilY - 0.11, wz - 0.3], [x + 0.3, ceilY - 0.1, wz + 0.3]);
  }

  // --- table for twelve: gloss top, black frame, two pedestals, runner, place settings
  kit.boxMM("darkGloss", [wx - 4, y(0.72), wz - 0.7], [wx + 4, y(0.76), wz + 0.7]);
  kit.boxMM("paintedMetal", [wx - 3.9, y(0.66), wz - 0.6], [wx + 3.9, y(0.72), wz + 0.6], black);
  for (const x of [wx - 2.6, wx + 2.6]) {
    kit.boxMM("paintedMetal", [x - 0.3, y(0.02), wz - 0.45], [x + 0.3, y(0.66), wz + 0.45], dark);
    kit.boxMM("paintedMetal", [x - 0.45, FLOOR, wz - 0.55], [x + 0.45, y(0.02), wz + 0.55], black);
    kit.boxMM("paintedMetal", [x - 0.31, y(0.1), wz - 0.46], [x + 0.31, y(0.14), wz + 0.46], black);
  }
  kit.collider([wx - 4, FLOOR, wz - 0.7], [wx + 4, y(0.8), wz + 0.7], "table");
  kit.boxMM("fabric", [wx - 3.8, y(0.76), wz - 0.18], [wx + 3.8, y(0.768), wz + 0.18], { color: IMP.dark, texel: 1 });
  for (let k = 0; k < 6; k++) {
    const x = wx - 3.25 + k * 1.3;
    seat(kit, x, FLOOR, wz - 1.25, 2);
    seat(kit, x, FLOOR, wz + 1.25, 0);
    for (const s of [-1, 1]) {
      const zc = wz + s * 0.42;
      kit.boxMM("darkGloss", [x - 0.13, y(0.76), zc - 0.09], [x + 0.13, y(0.772), zc + 0.09]);
      kit.boxMM("emitBlue", [x - 0.1, y(0.772), zc - 0.06], [x + 0.1, y(0.774), zc + 0.06]);
      kit.cyl("metal", x + 0.3, y(0.805), zc - s * 0.05, 0.04, 0.09, "y", midM);
    }
  }
  for (const x of [wx - 2.2, wx, wx + 2.2]) kit.cyl("darkGloss", x, y(0.9), wz, 0.07, 0.28, "y");
  kit.boxMM("paintedMetal", [wx - 0.35, y(0.76), wz - 0.12], [wx + 0.35, y(0.82), wz + 0.12], black);
  kit.boxMM("emitBlue", [wx - 0.3, y(0.82), wz - 0.02], [wx + 0.3, y(0.825), wz + 0.02]);

  // --- sideboard on the north wall with service items, gloss panel and lamps above
  const sb = { x0: 47.0, x1: 53.4, z1: z0 + 0.6 };
  kit.boxMM("paintedMetal", [sb.x0, FLOOR, z0], [sb.x1, y(0.92), sb.z1], dark);
  kit.boxMM("darkGloss", [sb.x0 - 0.02, y(0.92), z0], [sb.x1 + 0.02, y(0.95), sb.z1 + 0.02]);
  kit.boxMM("paintedMetal", [sb.x0, FLOOR, z0], [sb.x1, y(0.1), sb.z1 - 0.06], black);
  for (let i = 0; i < 4; i++) {
    const dx0 = sb.x0 + 0.1 + i * 1.6;
    kit.boxMM("paintedMetal", [dx0, y(0.2), sb.z1], [dx0 + 1.4, y(0.82), sb.z1 + 0.012], { color: IMP.mid, texel: 1 });
    kit.boxMM("metal", [dx0 + 1.1, y(0.48), sb.z1 + 0.012], [dx0 + 1.3, y(0.52), sb.z1 + 0.04], midM);
  }
  kit.collider([sb.x0, FLOOR, z0], [sb.x1, y(0.95), sb.z1 + 0.02], "sideboard");
  kit.cyl("metal", 48.0, y(1.2), z0 + 0.3, 0.16, 0.5, "y", midM);
  kit.cyl("metal", 48.0, y(1.48), z0 + 0.3, 0.06, 0.06, "y", midM);
  kit.boxMM("emitAmber", [48.14, y(1.05), z0 + 0.27], [48.16, y(1.08), z0 + 0.33]);
  for (let i = 0; i < 6; i++) kit.cyl("metal", 48.6 + i * 0.16, y(0.995), z0 + 0.2 + (i % 2) * 0.16, 0.04, 0.09, "y", midM);
  kit.boxMM("darkGloss", [49.8, y(0.95), z0 + 0.1], [50.6, y(0.965), z0 + 0.5]);
  kit.cyl("metal", 51.0, y(0.98), z0 + 0.3, 0.13, 0.06, "y", midM);
  kit.cyl("metal", 51.0, y(1.04), z0 + 0.3, 0.13, 0.06, "y", midM);
  kit.cyl("darkGloss", 51.6, y(1.09), z0 + 0.25, 0.06, 0.28, "y");
  kit.cyl("darkGloss", 51.8, y(1.09), z0 + 0.4, 0.06, 0.28, "y");
  kit.boxMM("darkGloss", [52.3, y(0.95), z0 + 0.15], [53.2, y(0.97), z0 + 0.45]);
  kit.boxMM("paintedMetal", [sb.x0 + 0.4, y(1.3), z0], [sb.x1 - 0.4, y(2.3), z0 + 0.03], black);
  kit.boxMM("darkGloss", [sb.x0 + 0.5, y(1.4), z0 + 0.03], [sb.x1 - 0.5, y(2.2), z0 + 0.04]);
  kit.boxMM("metal", [sb.x0 + 0.4, y(2.3), z0], [sb.x1 - 0.4, y(2.34), z0 + 0.05], midM);
  amberLamp(kit, [sb.x0 - 0.5, y(2.05), z0], "+z");
  amberLamp(kit, [sb.x1 + 0.5, y(2.05), z0], "+z");
  // fleet status bank + vent + junction boxes on the rest of the north wall
  kit.boxMM("paintedMetal", [55.5, y(1.5), z0], [58.9, y(2.3), z0 + 0.06], black);
  for (let i = 0; i < 3; i++) kit.boxMM("screenImp3", [55.6 + i * 1.12, y(1.6), z0 + 0.06], [56.6 + i * 1.12, y(2.2), z0 + 0.065], { uv: "keep" });
  kit.boxMM("metal", [55.5, y(2.3), z0], [58.9, y(2.33), z0 + 0.07], midM);
  amberLamp(kit, [54.7, y(2.05), z0], "+z");
  amberLamp(kit, [60.2, y(2.05), z0], "+z");
  vent(kit, [61.6, y(2.55), z0], "+z", 0.8, 0.3);
  junctionBox(kit, [61.0, y(1.5), z0], "+z", "emitRedImp");
  junctionBox(kit, [62.2, y(1.5), z0], "+z", "emitBlue");
  plate(kit, [61.6, y(1.9), z0], "+z", 0.3, 0.3, 0);
  noticeScreen(kit, [63.0, y(1.75), z0], "+z", 0.7, 0.6, "screenImp3");

  // --- west wall: viewscreen wall over a credenza, flanked by lamps and pennants
  kit.boxMM("darkGloss", [x0, y(0.95), wz - 2.75], [x0 + 0.12, y(3.0), wz + 2.75]);
  kit.boxMM("screenImp0", [x0 + 0.12, y(1.1), wz - 2.55], [x0 + 0.125, y(2.85), wz + 2.55], { uv: "keep" });
  kit.boxMM("metal", [x0, y(0.93), wz - 2.8], [x0 + 0.14, y(0.96), wz + 2.8], midM);
  kit.boxMM("metal", [x0, y(2.99), wz - 2.8], [x0 + 0.14, y(3.02), wz + 2.8], midM);
  kit.boxMM("paintedMetal", [x0, FLOOR, wz - 2.6], [x0 + 0.5, y(0.85), wz + 2.6], black);
  kit.boxMM("darkGloss", [x0, y(0.85), wz - 2.62], [x0 + 0.52, y(0.88), wz + 2.62]);
  kit.boxMM("emitBlue", [x0 + 0.5, y(0.6), wz - 2.4], [x0 + 0.505, y(0.62), wz + 2.4]);
  for (let i = 0; i < 8; i++) kit.boxMM(i % 3 === 0 ? "emitRedImp" : "emitBlue", [x0 + 0.5, y(0.4), wz - 2.3 + i * 0.6], [x0 + 0.505, y(0.44), wz - 2.2 + i * 0.6]);
  kit.collider([x0, FLOOR, wz - 2.62], [x0 + 0.52, y(0.88), wz + 2.62], "credenza");
  amberLamp(kit, [x0, y(2.0), wz - 3.3], "+x");
  for (const zc of [wz - 4.7, wz - 3.9]) {
    kit.boxMM("fabric", [x0, y(1.0), zc - 0.35], [x0 + 0.04, y(2.7), zc + 0.35], { color: IMP.dark, texel: 2 });
    kit.boxMM("paintedMetal", [x0 + 0.04, y(1.35), zc - 0.35], [x0 + 0.045, y(1.47), zc + 0.35], { color: IMP.red, texel: 2 });
    kit.boxMM("paintedMetal", [x0 + 0.04, y(1.95), zc - 0.22], [x0 + 0.045, y(2.4), zc + 0.22], { color: IMP.grey, texel: 2 });
    kit.boxMM("metal", [x0, y(2.7), zc - 0.4], [x0 + 0.08, y(2.74), zc + 0.4], midM);
  }

  // --- south wall: screen bank, banners, lamps, chrono
  kit.boxMM("paintedMetal", [55.2, y(1.4), z1 - 0.06], [58.7, y(2.35), z1], black);
  for (let i = 0; i < 3; i++) kit.boxMM("screenImp3", [55.35 + i * 1.12, y(1.5), z1 - 0.065], [56.35 + i * 1.12, y(2.25), z1 - 0.06], { uv: "keep" });
  for (let i = 0; i < 6; i++) kit.boxMM(i % 2 ? "emitRedImp" : "emitBlue", [55.4 + i * 0.1, y(1.42), z1 - 0.066], [55.46 + i * 0.1, y(1.45), z1 - 0.06]);
  for (const xc of [50.0, 61.0]) {
    kit.boxMM("fabric", [xc - 0.4, y(0.9), z1 - 0.04], [xc + 0.4, y(2.7), z1], { color: IMP.dark, texel: 2 });
    kit.boxMM("paintedMetal", [xc - 0.4, y(1.3), z1 - 0.045], [xc + 0.4, y(1.42), z1 - 0.04], { color: IMP.red, texel: 2 });
    kit.boxMM("paintedMetal", [xc - 0.25, y(1.95), z1 - 0.045], [xc + 0.25, y(2.4), z1 - 0.04], { color: IMP.grey, texel: 2 });
    kit.boxMM("metal", [xc - 0.45, y(2.7), z1 - 0.08], [xc + 0.45, y(2.74), z1], midM);
  }
  for (const xc of [51.6, 59.9, 62.8]) amberLamp(kit, [xc, y(2.05), z1], "-z");
  noticeScreen(kit, [52.6, y(1.85), z1], "-z", 0.9, 0.5, "screenImp3");
  junctionBox(kit, [63.4, y(1.5), z1], "-z", "emitRedImp");

  // --- pantry alcove in the south-west corner: side screen + header, counter, overhead cabinets, brew unit
  const ax1 = 47.8;
  const az0 = 467.4;
  kit.boxMM("paintedMetal", [ax1 - 0.15, FLOOR, az0], [ax1, y(2.4), z1], dark);
  kit.boxMM("paintedMetal", [ax1 - 0.16, FLOOR, az0 - 0.01], [ax1 + 0.01, y(2.4), az0 + 0.12], black);
  kit.collider([ax1 - 0.16, FLOOR, az0], [ax1 + 0.01, y(2.4), z1], "alcove-wall");
  kit.boxMM("paintedMetal", [x0, y(2.3), az0], [ax1, ceilY, az0 + 0.2], dark);
  kit.boxMM("emitWarmSoft", [x0 + 0.2, y(2.28), az0 + 0.06], [ax1 - 0.3, y(2.3), az0 + 0.14]);
  kit.boxMM("paintedMetal", [x0, FLOOR, z1 - 0.62], [ax1 - 0.2, y(0.88), z1], dark);
  kit.boxMM("darkGloss", [x0, y(0.88), z1 - 0.64], [ax1 - 0.18, y(0.91), z1]);
  kit.boxMM("paintedMetal", [x0, FLOOR, z1 - 0.62], [ax1 - 0.2, y(0.1), z1 - 0.56], black);
  for (let i = 0; i < 3; i++) {
    kit.boxMM("paintedMetal", [x0 + 0.15 + i * 1.05, y(0.2), z1 - 0.632], [x0 + 1.1 + i * 1.05, y(0.8), z1 - 0.62], { color: IMP.mid, texel: 1 });
    kit.boxMM("metal", [x0 + 0.5 + i * 1.05, y(0.72), z1 - 0.66], [x0 + 0.75 + i * 1.05, y(0.75), z1 - 0.63], midM);
  }
  kit.collider([x0, FLOOR, z1 - 0.64], [ax1 - 0.18, y(0.91), z1], "counter");
  kit.boxMM("paintedMetal", [x0 + 0.1, y(1.5), z1 - 0.38], [ax1 - 0.3, y(2.25), z1], dark);
  kit.boxMM("paintedMetal", [x0 + 0.1, y(1.5), z1 - 0.39], [ax1 - 0.3, y(1.52), z1 - 0.38], black);
  kit.boxMM("emitWarmSoft", [x0 + 0.2, y(1.5), z1 - 0.3], [ax1 - 0.4, y(1.51), z1 - 0.1]);
  for (let i = 1; i < 3; i++) kit.boxMM("paintedMetal", [x0 + 0.1 + i * 1.03, y(1.55), z1 - 0.385], [x0 + 0.12 + i * 1.03, y(2.2), z1 - 0.38], black);
  kit.boxMM("darkGloss", [x0 + 0.3, y(0.91), z1 - 0.5], [x0 + 0.9, y(0.912), z1 - 0.15]);
  kit.boxMM("paintedMetal", [x0 + 1.4, y(0.91), z1 - 0.55], [x0 + 1.9, y(1.4), z1 - 0.1], black);
  kit.boxMM("emitAmber", [x0 + 1.55, y(1.2), z1 - 0.552], [x0 + 1.75, y(1.24), z1 - 0.55]);
  kit.boxMM("emitBlue", [x0 + 1.55, y(1.1), z1 - 0.552], [x0 + 1.65, y(1.13), z1 - 0.55]);
  kit.cyl("metal", x0 + 1.65, y(0.96), z1 - 0.7, 0.045, 0.1, "y", midM);
  for (let i = 0; i < 4; i++) kit.cyl("metal", x0 + 2.2 + i * 0.14, y(0.955), z1 - 0.25 - (i % 2) * 0.14, 0.04, 0.09, "y", midM);
  kit.boxMM("paintedMetal", [x0 + 0.2, FLOOR, az0 + 0.4], [x0 + 0.9, y(0.5), az0 + 1.0], { color: IMP.mid, texel: 1 });
  plate(kit, [x0 + 0.55, y(0.3), az0 + 1.0], "+z", 0.16, 0.16, 11);
  kit.collider([x0 + 0.2, FLOOR, az0 + 0.4], [x0 + 0.9, y(0.5), az0 + 1.0], "crate");
  plate(kit, [ax1 - 0.16, y(1.9), (az0 + z1) / 2], "-x", 0.26, 0.26, 12);
  amberLamp(kit, [x0, y(1.9), az0 + 0.8], "+x");
}
