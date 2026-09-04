// Imperial corridor: the long white-panelled passage with the black floor lane, ribs every few
// metres, recessed ceiling light troughs, wall equipment clusters and a blue floor-edge glow.
import * as THREE from "three";
import { PALETTE } from "../materials.js";
import { impRoomShell, impWallGear, impWallLight, lux, Frame } from "./imperial_kit.js";
import { rng } from "../kit.js";
import { IMP_DECAL } from "../textures_imperial.js";

export function buildCorridor(kit, ctx, room) {
  const [w, h, d] = room.size;
  const accentKey = ctx.accentKey ? ctx.accentKey(room) : "emitBlue";
  const rand = rng(room.id.length * 31 + 7);
  const walls = impRoomShell(kit, room, ctx.doors, {
    accentKey,
    wall: { panelW: 2.2, features: { vent: 0.08, equipment: 0.08, conduit: 0.05, light: 0.1, screen: 0.03 }, corniceLight: false, corniceH: 0.2 },
    floor: { laneW: Math.min(1.8, w * 0.45), edgeLight: "emitBlueDim" },
    ceiling: { troughs: 1, troughW: 0.5, beamStep: 4.0, lightKey: "emitWhiteSoft" },
  });
  // angled upper walls: 45° chamfer strips between the wall tops and the (narrower) ceiling spine, with a
  // recessed dim light slot along each — the classic Imperial corridor section
  {
    const chH = 0.85;
    for (const s of [-1, 1]) {
      const o = new THREE.Vector3(s * (w / 2 - 0.08), h - chH - 0.2, s > 0 ? d / 2 : -d / 2);
      const U = new THREE.Vector3(0, 0, s > 0 ? -1 : 1);
      const V = new THREE.Vector3(-s * chH, chH, 0);
      const f = new Frame(kit, o, U, V);
      const L = V.length();
      f.box("impPanel2", d / 2, L / 2, -0.03, d, L, 0.06, { color: PALETTE.impGrey, uv: "world", texel: 1 });
      f.box("impTrim", d / 2, L * 0.5, 0.005, d, 0.16, 0.03, { color: PALETTE.impBlack });
      f.box("emitWhiteDim", d / 2, L * 0.5, 0.012, d - 0.6, 0.06, 0.012, { uv: "keep" });
      for (let z = -d / 2 + 4; z < d / 2; z += 8) f.box("impTrim", z + d / 2, L / 2, 0.02, 0.24, L + 0.02, 0.05, { color: PALETTE.impBlack });
    }
  }
  // structural ribs every 8 m: black frames around the section with a lit inset
  const doorsZ = ctx.doors.map((dd) => dd.lz);
  for (let z = -d / 2 + 4; z < d / 2 - 2; z += 8) {
    if (doorsZ.some((dz) => Math.abs(dz - z) < 2.2)) continue;
    for (const s of [-1, 1]) {
      kit.box("impTrim", s * (w / 2 - 0.12), h / 2, z, 0.24, h, 0.5, { color: PALETTE.impBlack, texel: 1 });
      kit.box("impMetal", s * (w / 2 - 0.25), h * 0.55, z, 0.02, h * 0.5, 0.3, { color: PALETTE.impCharcoal });
      kit.box(accentKey, s * (w / 2 - 0.262), h * 0.55, z, 0.01, h * 0.42, 0.04);
      kit.collider([s > 0 ? w / 2 - 0.26 : -w / 2, 0, z - 0.25], [s > 0 ? w / 2 : -w / 2 + 0.26, h, z + 0.25], "rib");
    }
    kit.box("impTrim", 0, h - 0.14, z, w, 0.28, 0.5, { color: PALETTE.impBlack, texel: 1 });
    kit.box("chevronY", 0, 0.004, z, w - 1.0, 0.008, 0.4, { texel: 1.5 });
  }
  // wall gear + stencils between the doors
  let k = 0;
  for (let z = -d / 2 + 6; z < d / 2 - 3; z += 7, k++) {
    if (doorsZ.some((dz) => Math.abs(dz - z) < 2.6)) continue;
    const side = k % 2 === 0 ? "W" : "E";
    const f = walls[side].frame;
    const u = side === "W" ? d / 2 - z : z + d / 2;
    if (rand() < 0.6) impWallGear(f, u, 1.5, { seed: k + 3, accentKey });
    else impWallLight(f, u, 1.9, { key: accentKey, w: 0.7 });
  }
  // lights: white key every 7 m, blue floor fill
  const n = Math.max(2, Math.round(d / 7));
  for (let i = 0; i < n; i++) {
    const z = -d / 2 + ((i + 0.5) / n) * d;
    kit.light({ type: "point", pos: [0, h - 0.5, z], color: 0xe4ecff, intensity: lux(h - 0.5), distance: 10, priority: 0.5 - i * 0.01 });
  }
  for (let i = 0; i < Math.max(1, Math.round(d / 14)); i++) {
    const z = -d / 2 + ((i + 0.5) / Math.max(1, Math.round(d / 14))) * d;
    kit.light({ type: "point", pos: [0, 0.25, z], color: new THREE.Color(room.accent || "#4f8dff").getHex(), intensity: 2.2, distance: 9, priority: 0.25 });
  }
  // deck sign at the far end
  const end = walls.S.frame;
  end.decal(IMP_DECAL.arrowUp, w / 2 - 1.0, 2.2, 0.03, 0.5);
  end.decal(IMP_DECAL.glyphs3, w / 2 + 1.0, 2.2, 0.03, 0.5);
}
