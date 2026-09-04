// Command Deck Corridor — the 144 m transverse spine of the tower (x −84..60, z 206..212, h 4.5).
// Six 24 m bays separated by octagonal bulkhead rings; recessed computer alcoves, utility cabinets, an open
// maintenance hatch, emergency lamps, deck signage flanking the blast doors and emblems at the bridge door.
import { buildCorridor, emblemPanel, signPlate, props, DECAL } from "./corridor_kit.js";

export const meta = { id: "cmd_corridor", stream: "corridors" };

export function build(ctx) {
  const R = buildCorridor(ctx, {
    axis: "x",
    rings: [-60, -36, -12, 12, 36],
    family: "cool",
    lights: 8,
    lightIntensity: 150,
    pointTo: 0,
    hatch: { bay: 4, side: "lo" },
    seed: 3,
  });
  const kit = ctx.kit;
  // Imperial emblems flanking the bridge blast door (forward wall, x −2..2)
  const fwd = R.walls[R.C.sideLo];
  const bridge = fwd.doors.find((d) => d.other === "bridge");
  if (bridge) {
    emblemPanel(fwd.frame, bridge.u0 - 2.85, 2.55, 0.95);
    emblemPanel(fwd.frame, bridge.u1 + 2.85, 2.55, 0.95);
  }
  // dead ends: a computer wall with a sector plate, so the long sightlines end on something
  for (const side of ["xmin", "xmax"]) {
    const { frame, length } = ctx.wall(side);
    const p = frame.pos(length / 2, 0, 0.6);
    props.computerBank(kit, { pos: [p.x, p.y, p.z], yaw: Math.atan2(frame.N.x, frame.N.z), w: 3.6, h: 2.6, d: 0.6, seed: side === "xmin" ? 31 : 37, accent: "emitWhite" });
    signPlate(frame, 0.7, 2.3, { w: 0.5, h: 0.72, top: DECAL.TEXT_B, bottom: DECAL.NUMBER0 });
    signPlate(frame, length - 0.7, 2.3, { w: 0.5, h: 0.72, top: DECAL.RESTRICTED, bottom: null });
    frame.box("emitWhiteSoft", length / 2, 3.3, 0.04, 3.0, 0.06, 0.02, { uv: "keep" });
  }
}
