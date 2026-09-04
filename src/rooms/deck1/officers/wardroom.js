// Wardroom: long table for twelve under three shaded pendants, sideboard with service, roster board and
// ship-status readout on the back wall, serving hatch on the north wall, locker row + sideboard on the
// south wall under a wall-wash can, pantry alcove, wainscot with a low amber strip, ceiling coves, amber lamps
// and two sconces (the west one carries a real point: periphery fill on the back wall). World coordinates.
import { FLOOR } from "../shared/plan.js";
import { seat } from "../shared/props.js";
import { IMP } from "../shared/palette.js";
import { amberBar, amberLamp, display, junctionBox, mount, plate, sconce, vent, wainscot } from "./lib.js";

const black = { color: IMP.black, texel: 1 };
const dark = { color: IMP.dark, texel: 1 };
const midM = { color: IMP.mid, texel: 2 };
// impPanel tints for the big cabinet / soffit faces that used to be paintedMetal (its chip map reads as stains above
// knee height at room scale; impPanel's base is ~2.1× brighter, so × 0.47 keeps the albedo)
const clean = (c, texel = 1) => ({ color: c.clone().multiplyScalar(0.47), texel });
const cBlack = clean(IMP.black);
const cDark = clean(IMP.dark);
const cMid = clean(IMP.mid);
const STRIP = "emitAmber";

/** faces: { x0, x1, z0, z1 }; door: { z0, z1 } on the east face; ceilY absolute. Returns light anchor points. */
export function buildWardroom(kit, faces, door, ceilY) {
  const { x0, x1, z0, z1 } = faces;
  const wx = (x0 + x1) / 2;
  const wz = (z0 + z1) / 2;
  const H = ceilY - FLOOR;
  const y = (v) => FLOOR + v;

  // --- walls: wainscot with the low amber strip, pilasters with warm slits in housings
  wainscot(kit, { axis: "z", at: x1, from: z0, to: z1, n: "-x", gaps: [[door.z0 - 0.3, door.z1 + 0.3]], strip: STRIP });
  wainscot(kit, { axis: "z", at: x0, from: z0, to: z1, n: "+x", gaps: [[wz - 5.1, wz - 3.5], [wz - 2.1, wz + 2.1]], strip: STRIP });
  wainscot(kit, { axis: "x", at: z0, from: x0, to: x1, n: "+z", gaps: [[46.9, 53.5], [55.3, 59.1]], strip: STRIP });
  wainscot(kit, { axis: "x", at: z1, from: x0, to: x1, n: "-z", gaps: [[x0, 47.9], [49.55, 50.45], [54.9, 59.2], [60.55, 61.45]], strip: STRIP });
  const pilaster = (px, zf, n) => {
    mount(kit, "impPanel", [px, y((H - 0.35) / 2), zf], n, 0.3, H - 0.35, 0, 0.1, cDark);
    mount(kit, "paintedMetal", [px, y(1.5), zf], n, 0.06, 2.3, 0.1, 0.12, black);
    mount(kit, "emitWarmSoft", [px, y(1.5), zf], n, 0.02, 2.2, 0.12, 0.125);
    mount(kit, "metal", [px, y(2.67), zf], n, 0.08, 0.04, 0.1, 0.13, midM);
    mount(kit, "metal", [px, y(0.33), zf], n, 0.08, 0.04, 0.1, 0.13, midM);
  };
  for (const px of [54.2, 59.4]) pilaster(px, z0, "+z");
  for (const px of [49, 54.2, 59.4]) pilaster(px, z1, "-z");
  // heavy inner door frame on the corridor wall + coat rail
  kit.boxMM("paintedMetal", [x1 - 0.08, FLOOR, door.z0 - 0.2], [x1, y(2.5), door.z0], black);
  kit.boxMM("paintedMetal", [x1 - 0.08, FLOOR, door.z1], [x1, y(2.5), door.z1 + 0.2], black);
  kit.boxMM("paintedMetal", [x1 - 0.08, y(2.2), door.z0 - 0.2], [x1, y(2.5), door.z1 + 0.2], black);
  junctionBox(kit, [x1, y(1.5), door.z0 - 0.6], "-x", "emitBlue");
  display(kit, [x1, y(1.5), door.z1 + 0.6], "-x", "plate10", 0.32, { bezel: 0.02, depth: 0.03 });
  mount(kit, "metal", [x1, y(1.85), door.z1 + 1.6], "-x", 1.2, 0.03, 0.0, 0.12, midM);
  for (let i = 0; i < 3; i++) mount(kit, "fabric", [x1, y(1.25), door.z1 + 1.2 + i * 0.4], "-x", 0.3, 1.15, 0.06, 0.16, { color: i === 1 ? IMP.mid : IMP.dark, texel: 2 });

  // --- ceiling: perimeter soffit (clean panel) with warm cove line, two louvred downlights, three pendants
  const sy0 = y(H - 0.35);
  const sw = 0.7;
  kit.boxMM("impPanel", [x0, sy0, z0], [x1, ceilY, z0 + sw], cBlack);
  kit.boxMM("impPanel", [x0, sy0, z1 - sw], [x1, ceilY, z1], cBlack);
  kit.boxMM("impPanel", [x0, sy0, z0 + sw], [x0 + sw, ceilY, z1 - sw], cBlack);
  kit.boxMM("impPanel", [x1 - sw, sy0, z0 + sw], [x1, ceilY, z1 - sw], cBlack);
  const cy0 = sy0 + 0.04;
  const cy1 = sy0 + 0.14;
  kit.boxMM("emitWarmSoft", [x0 + sw, cy0, z0 + sw], [x1 - sw, cy1, z0 + sw + 0.012]);
  kit.boxMM("emitWarmSoft", [x0 + sw, cy0, z1 - sw - 0.012], [x1 - sw, cy1, z1 - sw]);
  kit.boxMM("emitWarmSoft", [x0 + sw, cy0, z0 + sw], [x0 + sw + 0.012, cy1, z1 - sw]);
  kit.boxMM("emitWarmSoft", [x1 - sw - 0.012, cy0, z0 + sw], [x1 - sw, cy1, z1 - sw]);
  for (const x of [wx - 6.5, wx + 6.5]) {
    kit.boxMM("paintedMetal", [x - 0.4, ceilY - 0.1, wz - 0.4], [x + 0.4, ceilY, wz + 0.4], black);
    kit.boxMM("emitWarmSoft", [x - 0.3, ceilY - 0.07, wz - 0.3], [x + 0.3, ceilY - 0.06, wz + 0.3]);
    for (let i = 0; i <= 4; i++) kit.boxMM("metal", [x - 0.3 + i * 0.15 - 0.015, ceilY - 0.1, wz - 0.3], [x - 0.3 + i * 0.15 + 0.015, ceilY - 0.07, wz + 0.3], midM);
  }
  // pendant: deep open-bottomed shade (top + four sides) with the diffuser recessed 0.1 m up inside it behind louvres.
  // The room's spot descriptor sits inside the shade pointing down (index.js): a cone lights the table and floor only,
  // so nothing washes the ceiling (critic round 2: "pendant washes speckled ceiling into a blotchy hotspot").
  const pendants = [wx - 2.5, wx, wx + 2.5];
  const pb = y(2.28);
  const pt = y(2.62);
  for (const x of pendants) {
    kit.cyl("paintedMetal", x, (ceilY + pt) / 2, wz, 0.015, ceilY - pt, "y", black);
    kit.boxMM("paintedMetal", [x - 0.52, pt - 0.03, wz - 0.3], [x + 0.52, pt, wz + 0.3], black);
    for (const s of [-1, 1]) {
      kit.boxMM("paintedMetal", [x - 0.52, pb, wz + Math.min(s * 0.28, s * 0.3)], [x + 0.52, pt, wz + Math.max(s * 0.28, s * 0.3)], black);
      kit.boxMM("paintedMetal", [x + Math.min(s * 0.5, s * 0.52), pb, wz - 0.28], [x + Math.max(s * 0.5, s * 0.52), pt, wz + 0.28], black);
      kit.boxMM("metal", [x - 0.54, pb - 0.012, wz + Math.min(s * 0.28, s * 0.32)], [x + 0.54, pb + 0.012, wz + Math.max(s * 0.28, s * 0.32)], midM);
      kit.boxMM("metal", [x + Math.min(s * 0.5, s * 0.54), pb - 0.012, wz - 0.28], [x + Math.max(s * 0.5, s * 0.54), pb + 0.012, wz + 0.28], midM);
    }
    kit.boxMM("emitWarmSoft", [x - 0.42, pb + 0.1, wz - 0.2], [x + 0.42, pb + 0.11, wz + 0.2], { uv: "keep" });
    for (let i = 0; i <= 4; i++) kit.boxMM("metal", [x - 0.44 + i * 0.22 - 0.012, pb, wz - 0.28], [x - 0.44 + i * 0.22 + 0.012, pb + 0.02, wz + 0.28], midM);
  }
  // wall-wash can over the locker bay: black housing on the ceiling 2 m out from the south wall, warm lens behind two
  // bars. The room's fourth spot sits inside it pointing down (index.js); its wide cone grazes the wall from the
  // soffit down, so the lockers, the sideboard, the banner and the chair backs on that side read instead of
  // dropping into black beyond the pendants (critic round 2: "room is a lit table in a black void").
  const wash = [57.7, ceilY - 0.07, z1 - 2.0];
  kit.boxMM("paintedMetal", [wash[0] - 0.2, ceilY - 0.14, wash[2] - 0.14], [wash[0] + 0.2, ceilY, wash[2] + 0.14], black);
  kit.boxMM("metal", [wash[0] - 0.21, ceilY - 0.15, wash[2] - 0.15], [wash[0] + 0.21, ceilY - 0.14, wash[2] + 0.15], midM);
  kit.boxMM("emitWarmSoft", [wash[0] - 0.14, ceilY - 0.156, wash[2] - 0.08], [wash[0] + 0.14, ceilY - 0.15, wash[2] + 0.08], { uv: "keep" });
  for (const dx of [-0.05, 0.05]) kit.boxMM("metal", [wash[0] + dx - 0.008, ceilY - 0.158, wash[2] - 0.08], [wash[0] + dx + 0.008, ceilY - 0.154, wash[2] + 0.08], midM);

  // --- table for twelve: matte dark top (a gloss top mirrored the near pendant as a clipped white blob under the
  // grazing view from the door), black frame, two pedestals, runner, place settings (trays, cups, plates), holo
  // fabric (roughness ≈ 0.9), not impPanel: at the door camera's grazing angle even the matte panel's Fresnel lobe
  // mirrored the near pendant as a 600-px white patch on the table's near end. Reads as a dark baize cloth.
  kit.boxMM("fabric", [wx - 4, y(0.72), wz - 0.7], [wx + 4, y(0.76), wz + 0.7], { color: IMP.dark.clone().multiplyScalar(0.35), texel: 2 });
  kit.boxMM("paintedMetal", [wx - 3.9, y(0.66), wz - 0.6], [wx + 3.9, y(0.72), wz + 0.6], black);
  for (const x of [wx - 2.6, wx + 2.6]) {
    kit.boxMM("paintedMetal", [x - 0.3, y(0.02), wz - 0.45], [x + 0.3, y(0.66), wz + 0.45], dark);
    kit.boxMM("paintedMetal", [x - 0.45, FLOOR, wz - 0.55], [x + 0.45, y(0.02), wz + 0.55], black);
    kit.boxMM("paintedMetal", [x - 0.31, y(0.1), wz - 0.46], [x + 0.31, y(0.14), wz + 0.46], black);
  }
  kit.collider([wx - 4, FLOOR, wz - 0.7], [wx + 4, y(0.8), wz + 0.7], "table");
  kit.boxMM("fabric", [wx - 3.8, y(0.76), wz - 0.18], [wx + 3.8, y(0.768), wz + 0.18], { color: IMP.dark, texel: 1 });
  const pulled = { "1n": 1, "4s": 1 };
  // place setting: mess tray (dark box on a lighter metal rim) with a plate and a cup; every third place keeps a
  // datapad (bezel + a single status dot) so the readouts no longer form a row of blue dots
  const tray = (x, zc, s) => {
    kit.boxMM("metal", [x - 0.2, y(0.76), zc - 0.14], [x + 0.2, y(0.768), zc + 0.14], midM);
    kit.boxMM("paintedMetal", [x - 0.185, y(0.768), zc - 0.125], [x + 0.185, y(0.785), zc + 0.125], black);
    kit.cyl("metal", x - 0.06, y(0.787), zc + s * 0.01, 0.085, 0.005, "y", midM);
    kit.cyl("darkGloss", x - 0.06, y(0.792), zc + s * 0.01, 0.075, 0.006, "y");
    kit.cyl("metal", x + 0.12, y(0.79), zc - s * 0.06, 0.038, 0.01, "y", midM);
    kit.cyl("metal", x + 0.12, y(0.835), zc - s * 0.06, 0.03, 0.09, "y", midM);
  };
  const pad = (x, zc, s) => {
    kit.boxMM("paintedMetal", [x - 0.13, y(0.76), zc - 0.09], [x + 0.13, y(0.775), zc + 0.09], black);
    kit.boxMM("darkGloss", [x - 0.11, y(0.775), zc - 0.07], [x + 0.11, y(0.779), zc + 0.07]);
    kit.boxMM("emitBlue", [x + 0.07, y(0.779), zc + s * 0.05 - 0.005], [x + 0.09, y(0.781), zc + s * 0.05 + 0.005]);
    kit.cyl("metal", x + 0.3, y(0.765), zc - s * 0.05, 0.055, 0.01, "y", midM);
    kit.cyl("metal", x + 0.3, y(0.815), zc - s * 0.05, 0.04, 0.09, "y", midM);
  };
  for (let k = 0; k < 6; k++) {
    const x = wx - 3.25 + k * 1.3;
    seat(kit, x, FLOOR, wz - 1.25 - (pulled[k + "n"] ? 0.45 : 0), 2);
    seat(kit, x, FLOOR, wz + 1.25 + (pulled[k + "s"] ? 0.45 : 0), 0);
    for (const s of [-1, 1]) {
      const zc = wz + s * 0.42;
      if ((k + (s > 0 ? 1 : 0)) % 3 === 0) pad(x, zc, s);
      else tray(x, zc, s);
    }
  }
  for (const x of [wx - 2.2, wx + 2.2]) kit.cyl("darkGloss", x, y(0.9), wz, 0.07, 0.28, "y");
  // central holoprojector: black puck, blue ring, additive disc + wedge
  kit.cyl("paintedMetal", wx, y(0.79), wz, 0.2, 0.06, "y", black);
  kit.cyl("emitBlue", wx, y(0.825), wz, 0.16, 0.01, "y");
  kit.cyl("holo", wx, y(0.9), wz, 0.26, 0.012, "y");
  kit.boxMM("holo", [wx - 0.16, y(0.95), wz - 0.05], [wx + 0.16, y(0.97), wz + 0.05]);
  kit.boxMM("holo", [wx - 0.05, y(0.97), wz - 0.03], [wx + 0.05, y(1.03), wz + 0.03]);

  // --- sideboard on the north wall with service items, gloss panel and lamps above
  const sb = { x0: 47.0, x1: 53.4, z1: z0 + 0.6 };
  kit.boxMM("impPanel", [sb.x0, FLOOR, z0], [sb.x1, y(0.92), sb.z1], cDark);
  kit.boxMM("darkGloss", [sb.x0 - 0.02, y(0.92), z0], [sb.x1 + 0.02, y(0.95), sb.z1 + 0.02]);
  kit.boxMM("paintedMetal", [sb.x0, FLOOR, z0], [sb.x1, y(0.1), sb.z1 - 0.06], black);
  for (let i = 0; i < 4; i++) {
    const dx0 = sb.x0 + 0.1 + i * 1.6;
    kit.boxMM("impPanel", [dx0, y(0.2), sb.z1], [dx0 + 1.4, y(0.82), sb.z1 + 0.012], cMid);
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
  kit.boxMM("paintedMetal", [sb.x0 + 0.4, y(1.25), z0], [sb.x1 - 0.4, y(1.98), z0 + 0.03], black);
  kit.boxMM("darkGloss", [sb.x0 + 0.5, y(1.33), z0 + 0.03], [sb.x1 - 0.5, y(1.9), z0 + 0.04]);
  kit.boxMM("metal", [sb.x0 + 0.4, y(1.98), z0], [sb.x1 - 0.4, y(2.02), z0 + 0.05], midM);
  amberLamp(kit, [sb.x0 - 0.5, y(2.05), z0], "+z");
  amberLamp(kit, [sb.x1 + 0.5, y(2.05), z0], "+z");
  // serving hatch: dark recess with a half-open shutter, counter with service, its own warm light inside the box
  const hx0 = 55.5;
  const hx1 = 58.9;
  kit.boxMM("impPanel", [hx0 - 0.12, y(0.9), z0], [hx1 + 0.12, y(2.25), z0 + 0.16], cBlack);
  kit.boxMM("paintedMetal", [hx0, y(1.0), z0 + 0.16], [hx1, y(2.1), z0 + 0.17], { color: 0x0a0b0d, texel: 1 });
  for (let i = 0; i < 6; i++) kit.boxMM("metal", [hx0, y(1.62 + i * 0.08), z0 + 0.15], [hx1, y(1.69 + i * 0.08), z0 + 0.18], midM);
  kit.boxMM("paintedMetal", [hx0 - 0.02, y(1.58), z0 + 0.14], [hx1 + 0.02, y(1.62), z0 + 0.2], black);
  kit.boxMM("emitWarmSoft", [hx0 + 0.1, y(1.54), z0 + 0.17], [hx1 - 0.1, y(1.58), z0 + 0.19]);
  kit.boxMM("paintedMetal", [hx0 - 0.12, y(0.9), z0], [hx1 + 0.12, y(0.96), z0 + 0.45], black);
  kit.boxMM("darkGloss", [hx0 - 0.14, y(0.96), z0], [hx1 + 0.14, y(0.99), z0 + 0.47]);
  kit.collider([hx0 - 0.14, FLOOR, z0], [hx1 + 0.14, y(0.99), z0 + 0.47], "counter");
  kit.boxMM("impPanel", [hx0 - 0.12, FLOOR, z0], [hx1 + 0.12, y(0.9), z0 + 0.4], cDark);
  kit.boxMM("paintedMetal", [hx0 - 0.12, FLOOR, z0], [hx1 + 0.12, y(0.1), z0 + 0.36], black);
  for (let i = 0; i < 4; i++) kit.cyl("metal", hx0 + 0.4 + i * 0.16, y(1.035), z0 + 0.22 + (i % 2) * 0.12, 0.04, 0.09, "y", midM);
  kit.boxMM("darkGloss", [hx0 + 1.3, y(0.99), z0 + 0.12], [hx0 + 2.1, y(1.005), z0 + 0.42]);
  kit.cyl("darkGloss", hx1 - 0.6, y(1.13), z0 + 0.28, 0.06, 0.28, "y");
  kit.cyl("metal", hx1 - 0.25, y(1.03), z0 + 0.3, 0.05, 0.08, "y", midM);
  display(kit, [(hx0 + hx1) / 2, y(2.45), z0], "+z", "lblServing", 0.36, { bezel: 0.015, depth: 0.025 });
  amberBar(kit, [hx0 - 0.55, y(1.7), z0], "+z");
  amberBar(kit, [hx1 + 0.22, y(1.7), z0], "+z");
  vent(kit, [61.6, y(2.55), z0], "+z", 0.8, 0.3);
  junctionBox(kit, [61.0, y(1.5), z0], "+z", "emitRedImp");
  junctionBox(kit, [62.2, y(1.5), z0], "+z", "emitBlue");
  plate(kit, [61.6, y(1.9), z0], "+z", 0.3, 0.3, 0);
  display(kit, [63.0, y(1.75), z0], "+z", "deckplan", 0.6, { bezel: 0.03, depth: 0.04 });

  // --- west (back) wall: roster board + ship-status readout over the credenza, sconce and pennants
  kit.boxMM("impPanel", [x0, FLOOR, wz - 2.0], [x0 + 0.5, y(0.85), wz + 2.0], cBlack);
  kit.boxMM("darkGloss", [x0, y(0.85), wz - 2.02], [x0 + 0.52, y(0.88), wz + 2.02]);
  kit.boxMM("emitBlue", [x0 + 0.5, y(0.6), wz - 1.8], [x0 + 0.505, y(0.62), wz + 1.8]);
  for (let i = 0; i < 6; i++) kit.boxMM(i % 3 === 0 ? "emitRedImp" : "emitBlue", [x0 + 0.5, y(0.4), wz - 1.7 + i * 0.6], [x0 + 0.505, y(0.44), wz - 1.6 + i * 0.6]);
  kit.collider([x0, FLOOR, wz - 2.02], [x0 + 0.52, y(0.88), wz + 2.02], "credenza");
  display(kit, [x0, y(1.6), wz - 0.85], "+x", "roster", 1.2, { bezel: 0.05, depth: 0.06 });
  display(kit, [x0, y(1.6), wz + 0.75], "+x", "status", 0.96, { bezel: 0.05, depth: 0.06 });
  kit.boxMM("darkGloss", [x0, y(2.45), wz - 1.6], [x0 + 0.03, y(2.7), wz + 1.4]);
  kit.boxMM("emitWarmSoft", [x0 + 0.03, y(2.55), wz - 1.5], [x0 + 0.035, y(2.58), wz + 1.3]);
  amberBar(kit, [x0, y(1.8), wz - 1.95], "+x");
  amberBar(kit, [x0, y(1.8), wz + 1.75], "+x");
  const westSconce = sconce(kit, [x0, y(2.0), wz - 3.15], "+x");
  for (const zc of [wz - 4.7, wz - 3.9]) {
    kit.boxMM("fabric", [x0, y(1.0), zc - 0.35], [x0 + 0.04, y(2.7), zc + 0.35], { color: IMP.dark, texel: 2 });
    kit.boxMM("paintedMetal", [x0 + 0.04, y(1.35), zc - 0.35], [x0 + 0.045, y(1.47), zc + 0.35], { color: IMP.red, texel: 2 });
    kit.boxMM("paintedMetal", [x0 + 0.04, y(1.95), zc - 0.22], [x0 + 0.045, y(2.4), zc + 0.22], { color: IMP.grey, texel: 2 });
    kit.boxMM("metal", [x0, y(2.7), zc - 0.4], [x0 + 0.08, y(2.74), zc + 0.4], midM);
  }

  // --- south wall: 0.9 m sideboard + locker row between the pilasters, banners, sconce over the lockers, deck plan
  kit.boxMM("impPanel", [55.0, FLOOR, z1 - 0.5], [55.9, y(0.92), z1], cDark);
  kit.boxMM("darkGloss", [54.98, y(0.92), z1 - 0.52], [55.92, y(0.95), z1]);
  kit.boxMM("impPanel", [55.05, y(0.2), z1 - 0.512], [55.85, y(0.82), z1 - 0.5], cMid);
  kit.boxMM("metal", [55.35, y(0.5), z1 - 0.54], [55.55, y(0.53), z1 - 0.51], midM);
  kit.collider([54.98, FLOOR, z1 - 0.52], [55.92, y(0.95), z1], "sideboard-s");
  kit.cyl("darkGloss", 55.25, y(1.09), z1 - 0.25, 0.06, 0.28, "y");
  for (let i = 0; i < 3; i++) kit.cyl("metal", 55.5 + i * 0.13, y(0.995), z1 - 0.2 - (i % 2) * 0.14, 0.035, 0.09, "y", midM);
  for (let i = 0; i < 4; i++) {
    const lx0 = 56.4 + i * 0.66;
    kit.boxMM("impPanel", [lx0, FLOOR, z1 - 0.45], [lx0 + 0.6, y(1.9), z1], cDark);
    kit.boxMM("impPanel", [lx0 + 0.03, y(0.1), z1 - 0.46], [lx0 + 0.57, y(1.82), z1 - 0.45], cMid);
    kit.boxMM("metal", [lx0 + 0.44, y(0.95), z1 - 0.49], [lx0 + 0.48, y(1.2), z1 - 0.46], midM);
    for (let k = 0; k < 3; k++) kit.boxMM("metal", [lx0 + 0.12, y(1.55 + k * 0.08), z1 - 0.465], [lx0 + 0.48, y(1.57 + k * 0.08), z1 - 0.46], midM);
    display(kit, [lx0 + 0.3, y(1.4), z1 - 0.46], "-z", "plate" + (i + 6), 0.24, { bezel: 0.01, depth: 0.012 });
  }
  kit.boxMM("paintedMetal", [56.35, y(1.9), z1 - 0.47], [59.05, y(1.95), z1], black);
  kit.collider([56.4, FLOOR, z1 - 0.5], [59.0, y(1.95), z1], "lockers");
  for (const xc of [50.0, 61.0]) {
    kit.boxMM("fabric", [xc - 0.4, y(0.9), z1 - 0.04], [xc + 0.4, y(2.7), z1], { color: IMP.dark, texel: 2 });
    kit.boxMM("paintedMetal", [xc - 0.4, y(1.3), z1 - 0.045], [xc + 0.4, y(1.42), z1 - 0.04], { color: IMP.red, texel: 2 });
    kit.boxMM("paintedMetal", [xc - 0.25, y(1.95), z1 - 0.045], [xc + 0.25, y(2.4), z1 - 0.04], { color: IMP.grey, texel: 2 });
    kit.boxMM("metal", [xc - 0.45, y(2.7), z1 - 0.08], [xc + 0.45, y(2.74), z1], midM);
  }
  for (const xc of [51.6, 62.8]) amberBar(kit, [xc, y(2.25), z1], "-z");
  const southSconce = sconce(kit, [57.7, y(2.35), z1], "-z", { w: 0.9, h: 0.8 });
  display(kit, [52.6, y(1.8), z1], "-z", "notice", 0.6, { bezel: 0.03, depth: 0.04 });
  junctionBox(kit, [63.4, y(1.5), z1], "-z", "emitRedImp");

  // --- pantry alcove in the south-west corner: side screen + header, counter, overhead cabinets, brew unit
  const ax1 = 47.8;
  const az0 = 467.4;
  kit.boxMM("impPanel", [ax1 - 0.15, FLOOR, az0], [ax1, y(2.4), z1], cDark);
  kit.boxMM("paintedMetal", [ax1 - 0.16, FLOOR, az0 - 0.01], [ax1 + 0.01, y(2.4), az0 + 0.12], black);
  kit.collider([ax1 - 0.16, FLOOR, az0], [ax1 + 0.01, y(2.4), z1], "alcove-wall");
  kit.boxMM("impPanel", [x0, y(2.3), az0], [ax1, ceilY, az0 + 0.2], cDark);
  kit.boxMM("emitWarmSoft", [x0 + 0.2, y(2.28), az0 + 0.06], [ax1 - 0.3, y(2.3), az0 + 0.14]);
  kit.boxMM("impPanel", [x0, FLOOR, z1 - 0.62], [ax1 - 0.2, y(0.88), z1], cDark);
  kit.boxMM("darkGloss", [x0, y(0.88), z1 - 0.64], [ax1 - 0.18, y(0.91), z1]);
  kit.boxMM("paintedMetal", [x0, FLOOR, z1 - 0.62], [ax1 - 0.2, y(0.1), z1 - 0.56], black);
  for (let i = 0; i < 3; i++) {
    kit.boxMM("impPanel", [x0 + 0.15 + i * 1.05, y(0.2), z1 - 0.632], [x0 + 1.1 + i * 1.05, y(0.8), z1 - 0.62], cMid);
    kit.boxMM("metal", [x0 + 0.5 + i * 1.05, y(0.72), z1 - 0.66], [x0 + 0.75 + i * 1.05, y(0.75), z1 - 0.63], midM);
  }
  kit.collider([x0, FLOOR, z1 - 0.64], [ax1 - 0.18, y(0.91), z1], "counter");
  kit.boxMM("impPanel", [x0 + 0.1, y(1.5), z1 - 0.38], [ax1 - 0.3, y(2.25), z1], cDark);
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

  return {
    pendants: pendants.map((x) => [x, y(2.45), wz]),
    wash,
    hatch: [(hx0 + hx1) / 2, y(1.5), z0 + 0.08],
    sconces: [westSconce, southSconce],
  };
}
