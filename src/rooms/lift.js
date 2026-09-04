// Turbolift car: a compact panelled cab with a deck selector, a ceiling light and two vertical
// "shaft windows" whose light slats stream past during a ride (driven by LiftSystem via cell.liftAnim).
import * as THREE from "three";
import { PALETTE } from "../materials.js";
import { impRoomShell, lux } from "./imperial_kit.js";
import { IMP_DECAL } from "../textures_imperial.js";
import { DECK_ORDER, DECKS } from "../spec.js";

export function buildLift(kit, ctx, room) {
  const [w, h, d] = room.size;
  const accentKey = ctx.accentKey ? ctx.accentKey(room) : "emitBlue";
  const walls = impRoomShell(kit, room, ctx.doors, {
    accentKey,
    wall: { panelW: 1.1, features: { light: 0.0, vent: 0.0, equipment: 0.0, conduit: 0.0, screen: 0.0 }, corniceLight: false, altChance: 0 },
    floor: { lane: false },
    ceiling: { troughs: 1, troughW: 0.7, beamStep: 3.5, withLights: true },
  });
  // deck selector on the E wall: black column, screen, one button per deck, lit ring
  const f = walls.E.frame;
  const u = d / 2;
  f.box("impTrim", u, 1.35, 0.06, 0.5, 1.5, 0.12, { color: PALETTE.impBlack, texel: 1 });
  f.screen("scrBlue0", u, 1.85, 0.125, 0.4, 0.25);
  for (let i = 0; i < DECK_ORDER.length; i++) {
    const on = DECK_ORDER[i] === room.deck;
    f.box("impGloss", u - 0.08, 1.55 - i * 0.16, 0.125, 0.14, 0.08, 0.02);
    f.box(on ? "emitWhite" : accentKey, u + 0.1, 1.55 - i * 0.16, 0.125, 0.06, 0.06, 0.02);
  }
  f.decal(IMP_DECAL.turbolift, u, 2.35, 0.125, 0.3);
  f.collider(u - 0.3, u + 0.3, 0, 2.6, 0, 0.13, "selector");
  // shaft windows: narrow vertical slots on the N and W walls with slats behind (animated)
  const slats = [];
  for (const side of ["N", "W"]) {
    const wf = walls[side].frame;
    const cu = side === "N" ? w / 2 : d / 2;
    wf.box("impTrim", cu, h / 2, 0.02, 0.5, h - 0.9, 0.06, { color: PALETTE.impBlack });
    wf.box("impGloss", cu, h / 2, 0.052, 0.36, h - 1.05, 0.01);
    for (let i = 0; i < 7; i++) {
      const v = 0.75 + (i / 6) * (h - 1.5);
      const p = wf.pos(cu, v, 0.06);
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, 0.02), ctx.materials.emitWhite);
      m.position.copy(p);
      m.quaternion.copy(wf.q);
      m.visible = false;
      slats.push({ mesh: m, v: (i / 6) });
      kit.attach(m);
    }
  }
  // the LiftSystem toggles this: while riding, a bright band sweeps the slats
  let anim = { on: false, dir: 1, t: 0 };
  kit.onUpdate((dt) => {
    if (!anim.on) return;
    anim.t += dt * 1.6 * anim.dir;
    const band = ((anim.t % 1) + 1) % 1;
    for (const s of slats) {
      const dd = Math.abs(s.v - band);
      s.mesh.visible = Math.min(dd, 1 - dd) < 0.14;
    }
  });
  // expose the control through the kit so the cell can forward it
  kit.liftAnim = (on, dir) => {
    anim = { on, dir, t: 0 };
    if (!on) for (const s of slats) s.mesh.visible = false;
  };
  kit.light({ type: "point", pos: [0, h - 0.5, 0], color: 0xe8f0ff, intensity: lux(h - 0.5), distance: 6, priority: 0.6 });
  kit.light({ type: "point", pos: [0, 0.3, 0], color: new THREE.Color(room.accent || "#4f8dff").getHex(), intensity: 1.5, distance: 4, priority: 0.3 });
}
