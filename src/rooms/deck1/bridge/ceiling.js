// Bridge ceiling: near-black slab carried on deep transverse beams, two longitudinal beams framing the walkway,
// recessed light channels (cold white over the walkway, blue over the pits) segmented by the beams, downlight
// housings over the walkway/platform pools, cable trays with hangers, service pipes, vents, junction boxes and a
// lit canopy frame over the command dais. Nothing here lights the room; the descriptors in index.js do.
import { IMP } from "../shared/palette.js";
import { shade } from "./props.js";

export function buildCeiling(kit, { xIn, z0, z1, ceilY, beamsZ, walkwayLightsZ, pendantDrop = 1.9, platformLights, daisZ }) {
  const xo = xIn + 0.05; // into the wall backing so no slit can open at the cornice
  const top = ceilY + 0.24;
  const near = shade(IMP.black, 0.9);
  const beam = shade(IMP.dark, 0.85);
  // flanges / trays / pipes are painted steel (dielectric): bare `metal` only mirrors the near-black ceiling
  const flange = shade(IMP.mid, 0.85);

  // top slab (seen through the channels) and the hanging panels between channels
  kit.boxMM("paintedMetal", [-xo, top, z0 - 0.05], [xo, top + 0.14, z1 + 0.05], { color: IMP.black, texel: 0.5 });
  const chans = [
    { at: -11.5, w: 0.5, emit: "emitBlue", ew: 0.1 },
    { at: -1.9, w: 0.42, emit: "emitCoolSoft", ew: 0.14 },
    { at: 1.9, w: 0.42, emit: "emitCoolSoft", ew: 0.14 },
    { at: 11.5, w: 0.5, emit: "emitBlue", ew: 0.1 },
  ];
  let cur = -xo;
  for (const c of chans) {
    kit.boxMM("paintedMetal", [cur, ceilY - 0.02, z0 - 0.05], [c.at - c.w / 2, top, z1 + 0.05], { color: near, texel: 0.5 });
    kit.boxMM("paintedMetal", [c.at - c.w / 2 - 0.05, ceilY - 0.02, z0], [c.at - c.w / 2 + 0.03, top, z1], { color: IMP.mid, texel: 1 });
    kit.boxMM("paintedMetal", [c.at + c.w / 2 - 0.03, ceilY - 0.02, z0], [c.at + c.w / 2 + 0.05, top, z1], { color: IMP.mid, texel: 1 });
    cur = c.at + c.w / 2;
  }
  kit.boxMM("paintedMetal", [cur, ceilY - 0.02, z0 - 0.05], [xo, top, z1 + 0.05], { color: near, texel: 0.5 });

  // channel emitters, one segment per bay between beams (the beams cross the channels)
  const bays = [z0 + 0.3, ...beamsZ, z1 - 0.3];
  for (const c of chans) {
    for (let i = 0; i < bays.length - 1; i++) {
      const a = bays[i] + (i === 0 ? 0 : 0.45);
      const b = bays[i + 1] - (i === bays.length - 2 ? 0 : 0.45);
      if (b - a < 0.6) continue;
      kit.boxMM(c.emit, [c.at - c.ew / 2, top - 0.05, a], [c.at + c.ew / 2, top - 0.02, b], { uv: "keep" });
    }
  }

  // transverse beams: web + lighter bottom flange + a dark rivet line
  for (const z of beamsZ) {
    kit.boxMM("paintedMetal", [-xo, ceilY - 0.46, z - 0.18], [xo, ceilY - 0.02, z + 0.18], { color: beam, texel: 1 });
    kit.boxMM("paintedMetal", [-xo, ceilY - 0.52, z - 0.27], [xo, ceilY - 0.46, z + 0.27], { color: flange, texel: 1 });
    kit.boxMM("paintedMetal", [-xo + 0.3, ceilY - 0.525, z - 0.02], [xo - 0.3, ceilY - 0.52, z + 0.02], { color: IMP.black, texel: 1 });
    // junction box + lamp on alternate beams, port and starboard
    for (const s of [-1, 1]) {
      const bx = s * (beamsZ.indexOf(z) % 2 ? 8.2 : 14.6);
      kit.box("metalRough", bx, ceilY - 0.32, z - 0.26, 0.36, 0.26, 0.16, { color: IMP.mid, texel: 2 });
      kit.box(beamsZ.indexOf(z) % 3 ? "emitAmber" : "emitRedImp", bx + 0.1, ceilY - 0.28, z - 0.345, 0.04, 0.04, 0.012);
    }
  }
  // longitudinal beams framing the walkway (under the transverse ones, so no coplanar faces)
  for (const s of [-1, 1]) {
    kit.boxMM("paintedMetal", [s * 3.9 - 0.15, ceilY - 0.4, z0], [s * 3.9 + 0.15, ceilY - 0.02, z1], { color: beam, texel: 1 });
    kit.boxMM("paintedMetal", [s * 3.9 - 0.22, ceilY - 0.45, z0], [s * 3.9 + 0.22, ceilY - 0.4, z1], { color: flange, texel: 1 });
  }

  // downlight housings: dark box, metal bezel ring, bright diffuser disc (the pool itself is a descriptor)
  const housing = (x, z, w = 0.7) => {
    kit.box("paintedMetal", x, ceilY - 0.16, z, w, 0.28, w, { color: shade(IMP.dark, 0.7), texel: 1 });
    kit.box("metal", x, ceilY - 0.315, z, w - 0.08, 0.03, w - 0.08, { color: IMP.mid, texel: 2 });
    kit.box("emitWhite", x, ceilY - 0.33, z, w - 0.22, 0.012, w - 0.22, { uv: "keep" });
  };
  // walkway pendants: housing hung `pendantDrop` below the ceiling on two rods from a canopy plate, so the
  // pool descriptor sits 6 m over the deck instead of washing the ceiling
  const pendant = (x, z) => {
    const y = ceilY - pendantDrop;
    kit.box("metal", x, ceilY - 0.03, z, 0.5, 0.06, 0.5, { color: IMP.mid, texel: 2 });
    for (const s of [-1, 1]) kit.box("metal", x + s * 0.28, (y + 0.15 + ceilY - 0.06) / 2, z, 0.03, ceilY - 0.06 - (y + 0.15), 0.03, { color: IMP.mid, texel: 2 });
    kit.box("paintedMetal", x, y, z, 0.9, 0.3, 0.9, { color: shade(IMP.dark, 0.7), texel: 1 });
    kit.box("metal", x, y - 0.165, z, 0.82, 0.03, 0.82, { color: IMP.mid, texel: 2 });
    kit.box("emitWhite", x, y - 0.185, z, 0.66, 0.012, 0.66, { uv: "keep" });
    for (const s of [-1, 1]) kit.box("emitRedImp", x + s * 0.4, y + 0.1, z, 0.06, 0.03, 0.12);
  };
  for (const z of walkwayLightsZ) pendant(0, z);
  for (const [x, z] of platformLights) housing(x, z, 0.6);

  // cable trays over the pits: tray, lips, three cable bundles, hangers at every beam
  for (const x of [-15.2, -8.4, 8.4, 15.2]) {
    const yT = ceilY - 0.66;
    kit.boxMM("paintedMetal", [x - 0.24, yT, z0 + 6], [x + 0.24, yT + 0.04, z1 - 6], { color: IMP.mid, texel: 1 });
    for (const s of [-1, 1]) kit.boxMM("paintedMetal", [x + s * 0.24 - 0.015, yT, z0 + 6], [x + s * 0.24 + 0.015, yT + 0.12, z1 - 6], { color: IMP.mid, texel: 1 });
    kit.boxMM("paintedMetal", [x - 0.16, yT + 0.04, z0 + 6.2], [x - 0.06, yT + 0.11, z1 - 6.2], { color: IMP.black, texel: 2 });
    kit.boxMM("paintedMetal", [x - 0.04, yT + 0.04, z0 + 6.2], [x + 0.05, yT + 0.1, z1 - 6.2], { color: 0x2a2320, texel: 2 });
    kit.boxMM("paintedMetal", [x + 0.07, yT + 0.04, z0 + 6.2], [x + 0.17, yT + 0.12, z1 - 6.2], { color: shade(IMP.dark, 0.6), texel: 2 });
    for (const z of beamsZ) {
      if (z < z0 + 6 || z > z1 - 6) continue;
      kit.box("metal", x, (yT + 0.12 + ceilY - 0.52) / 2, z, 0.04, ceilY - 0.52 - (yT + 0.12), 0.04, { color: IMP.mid, texel: 2 });
    }
  }
  // service pipes near the outer walls with brackets at the beams
  for (const s of [-1, 1]) {
    const x = s * 17.6;
    kit.cyl("paintedMetal", x, ceilY - 0.2, (z0 + z1) / 2, 0.09, z1 - z0 - 1.0, "z", { color: shade(IMP.mid, 1.1), segments: 10, texel: 1 });
    kit.cyl("paintedMetal", x + s * 0.32, ceilY - 0.14, (z0 + z1) / 2, 0.05, z1 - z0 - 1.0, "z", { color: shade(IMP.dark, 1.2), segments: 8, texel: 1 });
    for (const z of beamsZ) kit.box("paintedMetal", x + s * 0.12, ceilY - 0.18, z + 0.35, 0.7, 0.3, 0.1, { color: IMP.black, texel: 2 });
  }
  // vents between beams
  for (const [x, z] of [
    [-14, 467],
    [14, 467],
    [-7, 479],
    [7, 485],
  ]) {
    kit.box("paintedMetal", x, ceilY - 0.06, z, 1.4, 0.08, 0.7, { color: shade(IMP.dark, 0.7), texel: 1 });
    for (let k = 0; k < 4; k++) kit.box("metal", x, ceilY - 0.105, z - 0.24 + k * 0.16, 1.25, 0.015, 0.05, { color: IMP.mid, texel: 2 });
  }
  // canopy frame over the dais: a lit square ring
  const cz = daisZ;
  const half = 1.7;
  for (const s of [-1, 1]) {
    kit.boxMM("paintedMetal", [-half, ceilY - 0.6, cz + s * half - 0.08], [half, ceilY - 0.34, cz + s * half + 0.08], { color: beam, texel: 1 });
    kit.boxMM("paintedMetal", [s * half - 0.08, ceilY - 0.6, cz - half], [s * half + 0.08, ceilY - 0.34, cz + half], { color: beam, texel: 1 });
    kit.boxMM("emitWhite", [-half + 0.2, ceilY - 0.52, cz + s * (half - 0.085) - 0.006], [half - 0.2, ceilY - 0.42, cz + s * (half - 0.085) + 0.006], { uv: "keep" });
    kit.boxMM("emitWhite", [s * (half - 0.085) - 0.006, ceilY - 0.52, cz - half + 0.2], [s * (half - 0.085) + 0.006, ceilY - 0.42, cz + half - 0.2], { uv: "keep" });
  }
}
