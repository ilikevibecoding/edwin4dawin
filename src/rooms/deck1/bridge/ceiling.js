// Bridge ceiling: near-black slab carried on deep transverse beams, two longitudinal beams framing the walkway,
// recessed light channels (cold white over the walkway, blue over the pits) segmented by the beams, downlight
// housings over the walkway/platform pools, cable trays with hangers, service pipes, vents, junction boxes and a
// lit canopy frame over the command dais. Nothing here lights the room; the descriptors in index.js do.
import { IMP } from "../shared/palette.js";
import { shade } from "./props.js";

export function buildCeiling(kit, { xIn, z0, z1, ceilY, beamsZ, walkwayLightsZ, aftPendants, pendantDrop = 1.9, platformLights, daisZ }) {
  const xo = xIn + 0.05; // into the wall backing so no slit can open at the cornice
  const top = ceilY + 0.24;
  const near = shade(IMP.black, 0.9);
  const beam = shade(IMP.dark, 0.85);
  // flanges / trays / pipes are painted steel (dielectric): bare `metal` only mirrors the near-black ceiling
  const flange = shade(IMP.mid, 0.85);

  // top slab (seen through the channels) and the hanging panels between channels
  // slab and panels in the module-local bridgeFloor (no map): paintedMetal's chips read as dirt specks on a ceiling
  kit.boxMM("bridgeFloor", [-xo, top, z0 - 0.05], [xo, top + 0.14, z1 + 0.05], { color: IMP.black, texel: 0.5 });
  const chans = [
    { at: -11.5, w: 0.5, emit: "emitBlue", ew: 0.1 },
    { at: -1.9, w: 0.42, emit: "emitWhite", ew: 0.1 },
    { at: 1.9, w: 0.42, emit: "emitWhite", ew: 0.1 },
    { at: 11.5, w: 0.5, emit: "emitBlue", ew: 0.1 },
  ];
  // The panel between the two white walkway channels is the bridgeSeam dielectric (F90 capped at 0.25), not the
  // deck's bridgeFloor: seen from the centreline cameras at 10–20° grazing, that panel mirrored each pendant's
  // point light as a warm/white patch 1.8 m below its housing (the aft pendant's patch sat right over the aft
  // door in d1-bridge-aft — critic round 3, "hot lamp above the door"). The side panels keep the sheen.
  let cur = -xo;
  for (const c of chans) {
    const centre = Math.abs(cur) < 2 && Math.abs(c.at - c.w / 2) < 2;
    kit.boxMM(centre ? "bridgeSeam" : "bridgeFloor", [cur, ceilY - 0.02, z0 - 0.05], [c.at - c.w / 2, top, z1 + 0.05], { color: near, texel: 0.5 });
    kit.boxMM("paintedMetal", [c.at - c.w / 2 - 0.05, ceilY - 0.02, z0], [c.at - c.w / 2 + 0.03, top, z1], { color: IMP.mid, texel: 1 });
    kit.boxMM("paintedMetal", [c.at + c.w / 2 - 0.03, ceilY - 0.02, z0], [c.at + c.w / 2 + 0.05, top, z1], { color: IMP.mid, texel: 1 });
    cur = c.at + c.w / 2;
  }
  kit.boxMM("bridgeFloor", [cur, ceilY - 0.02, z0 - 0.05], [xo, top, z1 + 0.05], { color: near, texel: 0.5 });

  // channel emitters, one segment per bay between beams (the beams cross the channels). The strip sits 6 cm up
  // inside the 0.24 m channel, not at its back: at the back (0.19 m up) the channel's own side wall hid it
  // beyond ~24° off the vertical, so from the aft corner camera the white walkway channels 12–16 m to the side
  // showed only their dim lit walls and read dull blue (critic round 2); at 6 cm they show from anywhere in the room.
  const bays = [z0 + 0.3, ...beamsZ, z1 - 0.3];
  for (const c of chans) {
    for (let i = 0; i < bays.length - 1; i++) {
      const a = bays[i] + (i === 0 ? 0 : 0.45);
      const b = bays[i + 1] - (i === bays.length - 2 ? 0 : 0.45);
      if (b - a < 0.6) continue;
      kit.boxMM(c.emit, [c.at - c.ew / 2, ceilY + 0.05, a], [c.at + c.ew / 2, ceilY + 0.08, b], { uv: "keep" });
    }
  }

  // transverse beams: web + lighter bottom flange + a dark rivet line. Webs and flanges in the module-local
  // bridgeSeam (flat dielectric, F90 capped at 0.25, roughness 0.55): in paintedMetal the flange underside 3 m
  // from each pendant (E ≈ 7) mirrored the pendant's point light toward every centreline camera — seen at
  // NdotV ≈ 0.2 the grazing Fresnel and the map's roughness-0.4 spots made a 20 × 6 px clipped glint over the
  // walkway in the walkway / dais / command shots, the last "white blob" left after the fixtures were fixed
  // (bridge-r2). Tints × 0.33 = the worn-metal map's mean albedo (0.39) × (1 − metalness 0.15) the flat
  // material no longer carries, so the beams stay as dark as the longitudinal paintedMetal pair beside them.
  const beamFlat = shade(beam, 0.33);
  const flangeFlat = shade(flange, 0.33);
  for (const z of beamsZ) {
    kit.boxMM("bridgeSeam", [-xo, ceilY - 0.46, z - 0.18], [xo, ceilY - 0.02, z + 0.18], { color: beamFlat, texel: 1 });
    kit.boxMM("bridgeSeam", [-xo, ceilY - 0.52, z - 0.27], [xo, ceilY - 0.46, z + 0.27], { color: flangeFlat, texel: 1 });
    kit.boxMM("paintedMetal", [-xo + 0.3, ceilY - 0.525, z - 0.02], [xo - 0.3, ceilY - 0.52, z + 0.02], { color: IMP.black, texel: 1 });
    // junction box + lamp on alternate beams, port and starboard
    for (const s of [-1, 1]) {
      const bx = s * (beamsZ.indexOf(z) % 2 ? 8.2 : 14.6);
      kit.box("paintedMetal", bx, ceilY - 0.32, z - 0.26, 0.36, 0.26, 0.16, { color: IMP.mid, texel: 2 });
      kit.box(beamsZ.indexOf(z) % 3 ? "emitAmber" : "emitRedImp", bx + 0.1, ceilY - 0.28, z - 0.345, 0.04, 0.04, 0.012);
    }
  }
  // longitudinal beams framing the walkway (under the transverse ones, so no coplanar faces)
  for (const s of [-1, 1]) {
    kit.boxMM("paintedMetal", [s * 3.9 - 0.15, ceilY - 0.4, z0], [s * 3.9 + 0.15, ceilY - 0.02, z1], { color: beam, texel: 1 });
    kit.boxMM("paintedMetal", [s * 3.9 - 0.22, ceilY - 0.45, z0], [s * 3.9 + 0.22, ceilY - 0.4, z1], { color: flange, texel: 1 });
  }

  // Fixtures. There is no shadowing, so any surface within ~0.5 m of a 30–60 cd point that faces it renders
  // white (E ≥ 200 even on black paint), which is why the first fixtures — open housings and louvres around
  // their own light — read as clipped white blobs from anywhere in the room. Every fixture here is a CLOSED dark
  // box with the pool light descriptor INSIDE it, just under its top (index.js): every outer face then points
  // away from the light (N·L < 0, unlit), the lit interior is sealed, and the only lit geometry is the lamp on the
  // underside: a flat bridgeLamp diffuser (module-local, emissive 1.05 ≈ 226 sRGB, under the bloom threshold — the
  // shared emitWhite at 1.35 still clipped and haloed from every camera) in a black 6 cm lip, split by a black
  // egg-crate 0.3 m under the light (E ≈ 150 on black paint → 0.2, dark grey fins). From below the fixture reads
  // as a louvred lamp in a dark housing; from across the room as a small lit square.
  const dark = shade(IMP.dark, 0.7);
  // lamp on the underside of a closed housing whose bottom face is at yb: `w` × `d` diffuser, black lip, fins
  const lamp = (x, yb, z, w, d, nx = 3, nz = 3) => {
    kit.box("bridgeLamp", x, yb - 0.006, z, w, 0.012, d, { uv: "keep" });
    for (const s of [-1, 1]) {
      kit.box("paintedMetal", x + s * (w / 2 + 0.02), yb - 0.03, z, 0.04, 0.06, d + 0.08, { color: IMP.black, texel: 1 });
      kit.box("paintedMetal", x, yb - 0.03, z + s * (d / 2 + 0.02), w, 0.06, 0.04, { color: IMP.black, texel: 1 });
    }
    for (let k = 1; k < nx; k++) kit.box("paintedMetal", x - w / 2 + (w / nx) * k, yb - 0.037, z, 0.012, 0.05, d, { color: IMP.black, texel: 1 });
    for (let k = 1; k < nz; k++) kit.box("paintedMetal", x, yb - 0.037, z - d / 2 + (d / nz) * k, w, 0.05, 0.012, { color: IMP.black, texel: 1 });
  };
  // recessed downlight housing on the ceiling: closed 0.3 m box under the slab with the lamp on its underside
  const housing = (x, z, w = 0.9) => {
    kit.box("paintedMetal", x, ceilY - 0.17, z, w, 0.3, w, { color: dark, texel: 1 });
    lamp(x, ceilY - 0.32, z, w - 0.4, w - 0.4);
  };
  // walkway / aft pendants: closed 0.9 × 0.3 × 0.9 housing hung `pendantDrop` below the ceiling on two rods
  // from a canopy plate, red side lamps, 0.5 m lamp on the underside. The canopy is black, not IMP.dark: its
  // underside faces the pendant's own point 1.75 m below (E ≈ 23, no shadowing) and at IMP.dark it was a lit
  // square on the ceiling over every pendant.
  const pendant = (x, z) => {
    const y = ceilY - pendantDrop;
    kit.box("paintedMetal", x, ceilY - 0.03, z, 0.5, 0.06, 0.5, { color: IMP.black, texel: 2 });
    for (const s of [-1, 1]) kit.box("paintedMetal", x + s * 0.28, (y + 0.15 + ceilY - 0.06) / 2, z, 0.03, ceilY - 0.06 - (y + 0.15), 0.03, { color: IMP.black, texel: 2 });
    kit.box("paintedMetal", x, y, z, 0.9, 0.3, 0.9, { color: dark, texel: 1 });
    for (const s of [-1, 1]) kit.box("emitRedImp", x + s * 0.453, y + 0.06, z, 0.012, 0.03, 0.12);
    lamp(x, y - 0.15, z, 0.5, 0.5);
  };
  for (const z of walkwayLightsZ) pendant(0, z);
  for (const [x, z] of aftPendants) pendant(x, z);
  for (const [x, z] of platformLights) housing(x, z, 0.9);

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
  // canopy frame over the dais: a square ring with thin blue strips on its inner faces (instrument blue, not a lamp)
  const cz = daisZ;
  const half = 1.7;
  for (const s of [-1, 1]) {
    kit.boxMM("paintedMetal", [-half, ceilY - 0.6, cz + s * half - 0.08], [half, ceilY - 0.34, cz + s * half + 0.08], { color: beam, texel: 1 });
    kit.boxMM("paintedMetal", [s * half - 0.08, ceilY - 0.6, cz - half], [s * half + 0.08, ceilY - 0.34, cz + half], { color: beam, texel: 1 });
    kit.boxMM("emitBlue", [-half + 0.2, ceilY - 0.5, cz + s * (half - 0.085) - 0.006], [half - 0.2, ceilY - 0.46, cz + s * (half - 0.085) + 0.006], { uv: "keep" });
    kit.boxMM("emitBlue", [s * (half - 0.085) - 0.006, ceilY - 0.5, cz - half + 0.2], [s * (half - 0.085) + 0.006, ceilY - 0.46, cz + half - 0.2], { uv: "keep" });
  }
}
