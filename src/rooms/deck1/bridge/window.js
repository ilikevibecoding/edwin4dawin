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
  // structural mullions: deep blades running the reveal depth, a chamfered hexagonal cap on the room side,
  // a red status lamp in a small housing at the foot of each interior mullion
  for (let i = 0; i <= MULLIONS; i++) {
    const x = A.x0 + i * paneW;
    const hw = i === 0 || i === MULLIONS ? 0.2 : 0.16;
    kit.boxMM("paintedMetal", [x - hw, A.y0, A.zOut + 0.05], [x + hw, A.y1, zRoom - 0.22], { color: IMP.dark, texel: 1 });
    prismY(
      kit,
      "paintedMetal",
      [
        [x - hw - 0.04, zRoom - 0.26],
        [x + hw + 0.04, zRoom - 0.26],
        [x + hw + 0.04, zRoom - 0.05],
        [x + hw - 0.06, zRoom + 0.06],
        [x - hw + 0.06, zRoom + 0.06],
        [x - hw - 0.04, zRoom - 0.05],
      ],
      A.y0 + t,
      A.y1 - t,
      { color: FRAME, texel: 1 }
    );
    // dark seam down the cap face + a lit hairline (thin frame lighting)
    kit.boxMM("paintedMetal", [x - 0.012, A.y0 + 0.3, zRoom + 0.055], [x + 0.012, A.y1 - 0.3, zRoom + 0.07], { color: IMP.black, texel: 2 });
    kit.boxMM("emitCoolSoft", [x - 0.004, A.y0 + 0.4, zRoom + 0.062], [x + 0.004, A.y1 - 0.4, zRoom + 0.072], { uv: "keep" });
    if (i > 0 && i < MULLIONS) {
      kit.box("paintedMetal", x, A.y0 + t + 0.06, zRoom + 0.02, 0.14, 0.1, 0.1, { color: FRAME, texel: 2 });
      kit.box("emitRedImp", x, A.y0 + t + 0.075, zRoom + 0.072, 0.05, 0.035, 0.01);
    }
    // bolt pair on the cap at sill and head height (scale cue on the 4.2 m blades)
    for (const yy of [A.y0 + 0.55, A.y1 - 0.55]) for (const s of [-1, 1]) kit.box("metal", x + s * (hw - 0.11), yy, zRoom + 0.068, 0.04, 0.04, 0.01, { color: IMP.steel, texel: 2 });
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

  // head channel over the band: black housing with a cool diffuser strip per pane (thin frame lighting)
  kit.boxMM("paintedMetal", [A.x0 - 0.4, A.y1 - 0.02, zRoom - 0.02], [A.x1 + 0.4, A.y1 + 0.18, zRoom + 0.16], { color: IMP.black, texel: 1 });
  for (let i = 0; i < MULLIONS; i++) {
    const x = A.x0 + (i + 0.5) * paneW;
    kit.box("emitCoolSoft", x, A.y1 - 0.025, zRoom + 0.1, paneW - 0.9, 0.012, 0.03, { uv: "keep" });
  }

  // interior sill ledge + kick below the window band
  kit.boxMM("paintedMetal", [A.x0 - 0.4, A.y0 - 0.02, zRoom - 0.02], [A.x1 + 0.4, A.y0 + 0.05, zRoom + 0.35], { color: FRAME, texel: 1 });
  kit.boxMM("paintedMetal", [A.x0 - 0.4, A.y0 - 0.3, zRoom], [A.x1 + 0.4, A.y0 - 0.02, zRoom + 0.32], { color: IMP.black, texel: 1 });
  kit.boxMM("paintedMetal", [A.x0 - 0.4, A.y0 - 0.3, zRoom + 0.3], [A.x1 + 0.4, A.y0 - 0.06, zRoom + 0.34], { color: SCUFF, texel: 1 });

  // sill instrument bar per pane: black bar standing proud of the console housings, five indicators, a readout
  // strip and a red status lamp at each end, facing the room
  for (let i = 0; i < MULLIONS; i++) {
    const x = A.x0 + (i + 0.5) * paneW;
    const bw = paneW - 0.7;
    kit.box("paintedMetal", x, A.y0 + 0.15, zRoom + 0.16, bw, 0.2, 0.16, { color: IMP.black, texel: 1 });
    for (let k = 0; k < 4; k++) kit.box(IND[(k * 5 + i * 3) % IND.length], x - 0.9 + k * 0.2, A.y0 + 0.205, zRoom + 0.25, 0.12, 0.03, 0.006);
    kit.box("screenImp" + (i % 4), x + 0.55, A.y0 + 0.16, zRoom + 0.25, 1.1, 0.1, 0.006, { uv: "keep" });
    for (const s of [-1, 1]) kit.box("emitRedImp", x + s * (bw / 2 - 0.08), A.y0 + 0.15, zRoom + 0.245, 0.04, 0.06, 0.006);
  }
  kit.collider([A.x0 - 0.4, 240, A.zOut], [A.x1 + 0.4, A.y1, zRoom + 0.35], "sill");
}
