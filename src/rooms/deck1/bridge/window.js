// Bridge window band: APERTURE BRIDGE (§6.2) is the hole A leaves in the tower face, x ±19, y 241.2..245.4,
// through z 455..458. B owns z ≥ 455.5 inside it: reveal lining, heavy structural mullions with chamfered caps,
// transom, glass, sill ledge with an instrument bar per pane, red status lamps at the mullion feet and a head
// channel with thin frame lighting so the band reads as armour glazing rather than a hole.
import * as THREE from "three";
import { IMP } from "../shared/palette.js";
import { prismY, shade, IND, SCUFF } from "./props.js";

// Frame/reveal surfaces are painted (dielectric) steel: bare `metal` has metalness 1 and only mirrors the dim
// room, which made the whole band read as a black silhouette in the first pass.
const FRAME = shade(IMP.grey, 1.1);

export const APERTURE = { x0: -19, x1: 19, y0: 241.2, y1: 245.4, zOut: 455.5, zIn: 458 };
export const MULLIONS = 10; // panes across the band

export function buildWindowWall(kit, ctx, manifest) {
  const A = APERTURE;
  const zRoom = A.zIn + 0.3; // inner wall face
  const w = A.x1 - A.x0;
  const paneW = w / MULLIONS;

  // reveal lining: four plates just inside the hole, running the full depth (dark cast metal, worn)
  const t = 0.12;
  kit.boxMM("paintedMetal", [A.x0, A.y0, A.zOut], [A.x1, A.y0 + t, zRoom], { color: IMP.mid, texel: 1 }); // sill / bottom
  kit.boxMM("paintedMetal", [A.x0, A.y1 - t, A.zOut], [A.x1, A.y1, zRoom], { color: IMP.mid, texel: 1 }); // head
  kit.boxMM("paintedMetal", [A.x0, A.y0, A.zOut], [A.x0 + t, A.y1, zRoom], { color: IMP.mid, texel: 1 });
  kit.boxMM("paintedMetal", [A.x1 - t, A.y0, A.zOut], [A.x1, A.y1, zRoom], { color: IMP.mid, texel: 1 });
  // structural mullions: deep blades running the reveal depth; on the room side a stepped profile — a wide base
  // plate flush with the wall, a 0.05 m dark reveal line, then a chamfered front blade standing 0.3 m proud
  // between the sill shelf and the head beam, with a lit hairline down its nose, bolt pairs and a red status
  // lamp housing at the foot of each interior mullion
  const yBlade0 = A.y0 + 0.05; // sill shelf top
  const yBlade1 = A.y1 - 0.1; // head beam underside
  for (let i = 0; i <= MULLIONS; i++) {
    const x = A.x0 + i * paneW;
    const hw = i === 0 || i === MULLIONS ? 0.2 : 0.16;
    kit.boxMM("paintedMetal", [x - hw, A.y0, A.zOut + 0.05], [x + hw, A.y1, zRoom - 0.22], { color: IMP.dark, texel: 1 });
    kit.boxMM("paintedMetal", [x - hw - 0.1, yBlade0, zRoom - 0.3], [x + hw + 0.1, yBlade1, zRoom + 0.02], { color: FRAME, texel: 1 });
    kit.boxMM("paintedMetal", [x - hw - 0.02, yBlade0, zRoom + 0.02], [x + hw + 0.02, yBlade1, zRoom + 0.07], { color: IMP.black, texel: 1 });
    prismY(
      kit,
      "paintedMetal",
      [
        [x - hw, zRoom + 0.07],
        [x + hw, zRoom + 0.07],
        [x + hw, zRoom + 0.24],
        [x + hw - 0.08, zRoom + 0.32],
        [x - hw + 0.08, zRoom + 0.32],
        [x - hw, zRoom + 0.24],
      ],
      yBlade0,
      yBlade1,
      { color: FRAME, texel: 1 }
    );
    // dark seam down the nose + a lit hairline (thin frame lighting)
    kit.boxMM("paintedMetal", [x - 0.012, yBlade0 + 0.25, zRoom + 0.315], [x + 0.012, yBlade1 - 0.25, zRoom + 0.33], { color: IMP.black, texel: 2 });
    kit.boxMM("emitWhite", [x - 0.004, yBlade0 + 0.35, zRoom + 0.322], [x + 0.004, yBlade1 - 0.35, zRoom + 0.332], { uv: "keep" });
    if (i > 0 && i < MULLIONS) {
      kit.box("paintedMetal", x, yBlade0 + 0.07, zRoom + 0.35, 0.16, 0.12, 0.1, { color: FRAME, texel: 2 });
      kit.box("emitRedImp", x, yBlade0 + 0.085, zRoom + 0.402, 0.05, 0.035, 0.01);
    }
    // bolt pair on the nose at sill and head height (scale cue on the 4 m blades)
    for (const yy of [yBlade0 + 0.55, yBlade1 - 0.55]) for (const s of [-1, 1]) kit.box("metal", x + s * (hw - 0.105), yy, zRoom + 0.325, 0.035, 0.035, 0.01, { color: IMP.steel, texel: 2 });
  }
  // transom: one horizontal member at 2/3 height with a lighter room-side cap
  const yT = A.y0 + (A.y1 - A.y0) * 0.68;
  kit.boxMM("paintedMetal", [A.x0, yT - 0.08, A.zOut + 0.3], [A.x1, yT + 0.08, zRoom - 0.3], { color: IMP.dark, texel: 1 });
  kit.boxMM("paintedMetal", [A.x0 + 0.2, yT - 0.1, zRoom - 0.32], [A.x1 - 0.2, yT + 0.1, zRoom - 0.27], { color: FRAME, texel: 1 });

  // glass panes, set 0.9 m into the reveal
  const zGlass = A.zOut + 0.9;
  for (let i = 0; i < MULLIONS; i++) {
    const x = A.x0 + (i + 0.5) * paneW;
    const g = new THREE.PlaneGeometry(paneW - 0.32, A.y1 - A.y0 - 2 * t - 0.02);
    kit.add("glass", g, { pos: [x, (A.y0 + A.y1) / 2, zGlass], uv: "keep" });
  }

  // head beam over the band: heavy painted member 0.6 m tall and 0.36 m proud, a dark shadow line under its
  // nose and one continuous blue strip along its underside, bolt heads over every mullion
  const beamTone = shade(IMP.mid, 0.9);
  kit.boxMM("paintedMetal", [A.x0 - 0.4, A.y1 - 0.1, zRoom - 0.02], [A.x1 + 0.4, A.y1 + 0.5, zRoom + 0.36], { color: beamTone, texel: 1 });
  kit.boxMM("paintedMetal", [A.x0 - 0.4, A.y1 - 0.1, zRoom + 0.36], [A.x1 + 0.4, A.y1 - 0.02, zRoom + 0.4], { color: IMP.black, texel: 1 });
  kit.boxMM("paintedMetal", [A.x0 - 0.4, A.y1 + 0.42, zRoom + 0.36], [A.x1 + 0.4, A.y1 + 0.5, zRoom + 0.4], { color: shade(IMP.mid, 1.1), texel: 1 });
  kit.boxMM("emitBlue", [A.x0 - 0.2, A.y1 - 0.11, zRoom + 0.2], [A.x1 + 0.2, A.y1 - 0.1, zRoom + 0.32], { uv: "keep" });
  for (let i = 0; i <= MULLIONS; i++) {
    const x = A.x0 + i * paneW;
    for (const s of [-1, 1]) kit.box("metal", x + s * 0.12, A.y1 + 0.2, zRoom + 0.365, 0.05, 0.05, 0.012, { color: IMP.steel, texel: 2 });
  }

  // interior sill: 0.4 m shelf at 1.2 m with a 0.1 m lip carrying a white hairline (1.2 cm: the 2 cm band at 1.7
  // emissive bloomed into a 6 px bar from 5 m), black kick recess below
  kit.boxMM("paintedMetal", [A.x0 - 0.4, A.y0 - 0.02, zRoom - 0.02], [A.x1 + 0.4, A.y0 + 0.05, zRoom + 0.4], { color: FRAME, texel: 1 });
  kit.boxMM("paintedMetal", [A.x0 - 0.4, A.y0 - 0.1, zRoom + 0.35], [A.x1 + 0.4, A.y0 - 0.02, zRoom + 0.4], { color: FRAME, texel: 1 });
  kit.boxMM("emitWhite", [A.x0 - 0.2, A.y0 - 0.066, zRoom + 0.4], [A.x1 + 0.2, A.y0 - 0.054, zRoom + 0.406], { uv: "keep" });
  kit.boxMM("paintedMetal", [A.x0 - 0.4, A.y0 - 0.3, zRoom], [A.x1 + 0.4, A.y0 - 0.1, zRoom + 0.3], { color: IMP.black, texel: 1 });
  kit.boxMM("paintedMetal", [A.x0 - 0.4, A.y0 - 0.3, zRoom + 0.28], [A.x1 + 0.4, A.y0 - 0.12, zRoom + 0.32], { color: SCUFF, texel: 1 });

  // sill instrument bar per pane on the shelf: black bar, four small indicators, a readout strip and a red
  // status lamp at each end, facing the room
  for (let i = 0; i < MULLIONS; i++) {
    const x = A.x0 + (i + 0.5) * paneW;
    const bw = paneW - 0.9;
    kit.box("paintedMetal", x, A.y0 + 0.15, zRoom + 0.16, bw, 0.2, 0.16, { color: IMP.black, texel: 1 });
    for (let k = 0; k < 4; k++) kit.box(IND[(k * 5 + i * 3) % IND.length], x - 0.85 + k * 0.2, A.y0 + 0.205, zRoom + 0.25, 0.06, 0.03, 0.006);
    kit.box("screenImp" + (i % 4), x + 0.5, A.y0 + 0.16, zRoom + 0.25, 1.0, 0.1, 0.006, { uv: "keep" });
    for (const s of [-1, 1]) kit.box("emitRedImp", x + s * (bw / 2 - 0.08), A.y0 + 0.15, zRoom + 0.245, 0.04, 0.06, 0.006);
  }
  kit.collider([A.x0 - 0.4, 240, A.zOut], [A.x1 + 0.4, A.y1 + 0.5, zRoom + 0.41], "sill");
}
