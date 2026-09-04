// Bridge window band: APERTURE BRIDGE (§6.2) is the hole A leaves in the tower face, x ±19, y 241.2..245.4,
// through z 455..458. B owns z ≥ 455.5 inside it: reveal lining, heavy structural mullions, glass, sill.
import * as THREE from "three";
import { IMP } from "../shared/palette.js";

export const APERTURE = { x0: -19, x1: 19, y0: 241.2, y1: 245.4, zOut: 455.5, zIn: 458 };
export const MULLIONS = 10; // panes across the band

export function buildWindowWall(kit, ctx, manifest) {
  const A = APERTURE;
  const zRoom = A.zIn + 0.3; // inner wall face
  const w = A.x1 - A.x0;
  const paneW = w / MULLIONS;

  // reveal lining: four plates just inside the hole, running the full depth (dark cast metal, worn)
  const t = 0.12;
  kit.boxMM("metalRough", [A.x0, A.y0, A.zOut], [A.x1, A.y0 + t, zRoom], { color: IMP.mid, texel: 1 }); // sill / bottom
  kit.boxMM("metalRough", [A.x0, A.y1 - t, A.zOut], [A.x1, A.y1, zRoom], { color: IMP.dark, texel: 1 }); // head
  kit.boxMM("metalRough", [A.x0, A.y0, A.zOut], [A.x0 + t, A.y1, zRoom], { color: IMP.dark, texel: 1 });
  kit.boxMM("metalRough", [A.x1 - t, A.y0, A.zOut], [A.x1, A.y1, zRoom], { color: IMP.dark, texel: 1 });

  // structural mullions: deep blades running the full reveal depth, with a chamfered inner cap
  for (let i = 0; i <= MULLIONS; i++) {
    const x = A.x0 + i * paneW;
    const hw = i === 0 || i === MULLIONS ? 0.2 : 0.16;
    kit.boxMM("paintedMetal", [x - hw, A.y0, A.zOut + 0.05], [x + hw, A.y1, zRoom + 0.04], { color: IMP.dark, texel: 1 });
    kit.boxMM("metal", [x - hw - 0.03, A.y0 + 0.1, zRoom - 0.25], [x + hw + 0.03, A.y1 - 0.1, zRoom + 0.02], { color: IMP.mid, texel: 2 });
    // small red status lamp at the foot of each mullion (bridge instrument language)
    if (i > 0 && i < MULLIONS) kit.boxMM("emitRedImp", [x - 0.03, A.y0 + t + 0.02, zRoom - 0.02], [x + 0.03, A.y0 + t + 0.06, zRoom + 0.03]);
  }
  // transom: one horizontal member at 2/3 height so the panes read as the classic tall-over-short split
  const yT = A.y0 + (A.y1 - A.y0) * 0.68;
  kit.boxMM("paintedMetal", [A.x0, yT - 0.08, A.zOut + 0.3], [A.x1, yT + 0.08, zRoom - 0.3], { color: IMP.dark, texel: 1 });

  // glass panes, set 0.9 m into the reveal
  const zGlass = A.zOut + 0.9;
  for (let i = 0; i < MULLIONS; i++) {
    const x = A.x0 + (i + 0.5) * paneW;
    const g = new THREE.PlaneGeometry(paneW - 0.32, A.y1 - A.y0 - 2 * t - 0.02);
    kit.add("glass", g, { pos: [x, (A.y0 + A.y1) / 2, zGlass], uv: "keep" });
  }

  // interior sill ledge + kick below the window band
  kit.boxMM("metal", [A.x0 - 0.4, A.y0 - 0.02, zRoom - 0.02], [A.x1 + 0.4, A.y0 + 0.05, zRoom + 0.35], { color: IMP.mid, texel: 1 });
  kit.boxMM("paintedMetal", [A.x0 - 0.4, A.y0 - 0.3, zRoom], [A.x1 + 0.4, A.y0 - 0.02, zRoom + 0.32], { color: IMP.black, texel: 1 });
  kit.collider([A.x0 - 0.4, 240, A.zOut], [A.x1 + 0.4, A.y1, zRoom + 0.35], "sill");
}
