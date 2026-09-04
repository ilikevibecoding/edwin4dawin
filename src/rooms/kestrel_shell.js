// Exterior shell of the Kestrel (the original freighter interior) so it reads as a parked ship on
// the hangar deck: chamfered hull plating around the cabin volume, cockpit nose, engine pods, a
// door surround with a hood overhanging the ramp head (soffit lamp), the boarding ramp with chevron
// treads and hydraulic rams, four landing-gear legs on pads with chocks, umbilical cables to deck
// sockets and a fuel line from the deck reel. The Imperial ground kit staged at the ramp foot
// (crates, bollards, droid) and the warm door-spill light are placed by the hangar builder
// (hangar.js), which owns the deck and the light budget.
// Built in the Kestrel's local frame (aft door at z = 0, bow at -z, cabin floor at y = 0, deck at
// y = -clearance). The kit here is the ship's: kit.light() is not collected by buildShip.
import * as THREE from "three";
import { PALETTE } from "../materials.js";
import { KESTREL } from "../spec.js";
import { decalRect } from "../textures.js";
import { ensureHangarMaterials } from "../textures_hangar.js";
import { tube, hose, tiltedBox, hgChocks } from "./hangar_kit.js";

const V = (x, y, z) => new THREE.Vector3(x, y, z);

export function buildKestrelShell(kit) {
  ensureHangarMaterials(kit.materials); // hangar_tread / hangar_spillWarm, whichever cell builds first
  const L = KESTREL.local; // x0 -5.5, x1 5.2, z0 -25.5, z1 0.3, h 3.0
  const clr = KESTREL.clearance; // deck is at y = -clr
  const yD = -clr;
  const t = 0.35; // hull skin thickness
  const yB = -0.55; // belly (below the cabin deck slab)
  const yT = L.h + 0.45; // roof
  const x0 = L.x0 - t - 0.6;
  const x1 = L.x1 + t + 0.6;
  const zFwd = L.z0 + 3.0; // the cockpit nose already exists forward of -22.6
  const zAft = L.z1 + 0.4;
  const zMid = (zFwd + zAft) / 2;
  const len = zAft - zFwd;

  // --- main body: side plates, roof, belly (painted, cream/slate like the interior palette)
  kit.boxMM("painted1", [x0, yB, zFwd], [x0 + t, yT, zAft], { color: PALETTE.creamDark, uv: "world", texel: 0.35 });
  kit.boxMM("painted1", [x1 - t, yB, zFwd], [x1, yT, zAft], { color: PALETTE.creamDark, uv: "world", texel: 0.35 });
  kit.boxMM("painted2", [x0, yT - t, zFwd], [x1, yT, zAft], { color: PALETTE.cream, uv: "world", texel: 0.35 });
  kit.boxMM("metal", [x0, yB, zFwd], [x1, yB + t, zAft], { color: PALETTE.gunmetal, uv: "world", texel: 0.5 });
  // chamfered roof edges and belly chines: the slab reads as a hull, not a container
  for (const s of [-1, 1]) {
    const xe = s < 0 ? x0 : x1;
    kit.box("painted2", xe - s * 0.42, yT - 0.42, zMid, 1.25, 0.32, len - 0.4, { color: PALETTE.creamDark, uv: "world", texel: 0.35, rot: [0, 0, s * Math.PI / 4] });
    kit.box("metal", xe - s * 0.36, yB + 0.36, zMid, 1.05, 0.28, len - 0.4, { color: PALETTE.gunmetal, uv: "world", texel: 0.5, rot: [0, 0, -s * Math.PI / 4] });
  }
  // aft face around the door opening (door at x -0.85..0.85, y 0..2.35)
  kit.boxMM("painted1", [x0, yB, zAft - t], [-0.95, yT, zAft], { color: PALETTE.creamDark, uv: "world", texel: 0.35 });
  kit.boxMM("painted1", [0.95, yB, zAft - t], [x1, yT, zAft], { color: PALETTE.creamDark, uv: "world", texel: 0.35 });
  kit.boxMM("painted1", [-0.95, 2.45, zAft - t], [0.95, yT, zAft], { color: PALETTE.creamDark, uv: "world", texel: 0.35 });
  kit.boxMM("painted1", [-0.95, yB, zAft - t], [0.95, 0, zAft], { color: PALETTE.creamDark, uv: "world", texel: 0.35 });
  // door surround: proud dark jambs and header, threshold sill plate, hazard bands on the jambs
  for (const s of [-1, 1]) {
    kit.box("metal", s * 1.25, 1.15, zAft + 0.12, 0.6, 3.5, 0.24, { color: PALETTE.darkMetal, uv: "world", texel: 0.5 });
    kit.box("hazard", s * 1.25, 0.35, zAft + 0.25, 0.4, 0.5, 0.02, { texel: 3 });
    kit.box("emitAmber", s * 1.25, 2.2, zAft + 0.25, 0.1, 0.4, 0.02);
  }
  kit.box("metal", 0, 2.75, zAft + 0.12, 3.1, 0.6, 0.24, { color: PALETTE.darkMetal, uv: "world", texel: 0.5 });
  kit.box("metal", 0, -0.12, zAft + 0.14, 2.6, 0.24, 0.28, { color: PALETTE.steel, uv: "world", texel: 0.5 });
  // hood: the upper hull carries on 3.6 m over the ramp head (a cantilevered tail with a dark chamfered lip,
  // cheek plates either side and a warm soffit lamp) — long enough that its lip and cheeks are in frame
  // from the door camera looking down the ramp, so the ramp view reads as leaving a ship
  const hz1 = zAft + 3.6;
  const hw = 3.2;
  kit.boxMM("painted2", [-hw, yT - 0.45, zAft], [hw, yT, hz1], { color: PALETTE.cream, uv: "world", texel: 0.35 });
  kit.boxMM("metal", [-hw, yT - 0.55, hz1 - 0.5], [hw, yT - 0.4, hz1], { color: PALETTE.darkMetal, uv: "world", texel: 0.5 });
  kit.box("painted2", 0, yT - 0.22, hz1 - 0.02, hw * 2, 0.3, 0.3, { color: PALETTE.creamDark, uv: "world", texel: 0.35, rot: [Math.PI / 4, 0, 0] }); // chamfered lip
  kit.boxMM("painted", [-hw + 0.4, yT - 0.35, hz1 - 0.28], [hw - 0.4, yT - 0.05, hz1 - 0.24], { color: PALETTE.orange, uv: "keep" }); // cheat line across the lip
  for (const s of [-1, 1]) {
    kit.boxMM("painted1", [Math.min(s * hw, s * (hw - 0.15)), 2.0, zAft], [Math.max(s * hw, s * (hw - 0.15)), yT - 0.4, hz1 - 0.2], { color: PALETTE.creamDark, uv: "world", texel: 0.35 });
    kit.boxMM("metal", [Math.min(s * hw, s * (hw - 0.2)), 1.85, zAft], [Math.max(s * hw, s * (hw - 0.2)), 2.05, hz1 - 0.2], { color: PALETTE.darkMetal, uv: "world", texel: 0.5 }); // cheek bottom rail
    kit.box("emitAmber", s * (hw - 0.08), 2.25, hz1 - 0.5, 0.02, 0.1, 0.4);
    kit.box("hazard", s * (hw - 0.09), 2.6, zAft + 0.7, 0.02, 0.5, 0.5, { texel: 3 });
  }
  kit.box("metal", 0, yT - 0.52, zAft + 1.6, 1.9, 0.14, 0.5, { color: PALETTE.darkMetal });
  kit.box("hangar_spillWarm", 0, yT - 0.6, zAft + 1.6, 1.7, 0.02, 0.36, { uv: "keep" });
  for (let i = 0; i < 5; i++) kit.box("metal", -0.68 + i * 0.34, yT - 0.63, zAft + 1.6, 0.02, 0.08, 0.4, { color: PALETTE.darkMetal }); // louvres
  kit.collider([-hw, 1.85, zAft], [-hw + 0.2, yT, hz1], "hoodCheek");
  kit.collider([hw - 0.2, 1.85, zAft], [hw, yT, hz1], "hoodCheek");
  // orange cheat line and hull number
  kit.boxMM("painted", [x0 - 0.01, 1.6, zFwd + 1], [x0 + t + 0.01, 1.9, zAft - 0.5], { color: PALETTE.orange, uv: "keep" });
  kit.boxMM("painted", [x1 - t - 0.01, 1.6, zFwd + 1], [x1 + 0.01, 1.9, zAft - 0.5], { color: PALETTE.orange, uv: "keep" });
  for (const s of [-1, 1]) {
    const g = new THREE.PlaneGeometry(1.6, 1.6);
    g.rotateY(s > 0 ? Math.PI / 2 : -Math.PI / 2);
    kit.add("decal", g, { pos: [s > 0 ? x1 + 0.012 : x0 - 0.012, 1.0, -6], uv: "keep", uvRect: decalRect(1) });
  }
  // raised armour plates + greebles along the flanks
  for (let z = zFwd + 2; z < zAft - 2; z += 3.1) {
    for (const s of [-1, 1]) {
      const xf = s > 0 ? x1 : x0;
      kit.box("painted2", xf + s * 0.06, 0.6, z, 0.12, 1.0, 2.2, { color: PALETTE.cream, uv: "world", texel: 0.5 });
      kit.box("metal", xf + s * 0.1, 2.5, z + 0.8, 0.2, 0.5, 0.9, { color: PALETTE.darkMetal });
      kit.cyl("metal", xf + s * 0.16, 2.2, z - 0.6, 0.06, 1.4, "z", { color: PALETTE.steel, segments: 8 });
    }
  }
  // belly detail: keel strake, vent grilles, a retracted-turret dome, the ventral hatch line
  kit.boxMM("paintedMetal", [-0.9, yB - 0.3, zFwd + 2], [0.9, yB, zAft - 3], { color: PALETTE.gunmetal, uv: "world", texel: 0.5 });
  for (const z of [-17, -11, -5]) for (const s of [-1, 1]) kit.box("metal", s * 3.6, yB - 0.08, z, 1.6, 0.16, 0.9, { color: PALETTE.steel, uv: "world", texel: 1 });
  kit.add("metal", new THREE.SphereGeometry(0.9, 16, 8, 0, Math.PI * 2, Math.PI * 0.55, Math.PI * 0.45), { pos: [2.2, yB, -14], color: PALETTE.gunmetal, uv: "world", texel: 1 });
  // dorsal spine: sensor mast, twin comms dishes, a hatch
  kit.boxMM("metal", [-0.8, yT, -18], [0.8, yT + 0.5, -3], { color: PALETTE.gunmetal, uv: "world", texel: 0.5 });
  kit.cyl("metal", 0, yT + 1.4, -14, 0.08, 1.8, "y", { color: PALETTE.steel, segments: 8 });
  kit.box("emitRed", 0, yT + 2.4, -14, 0.12, 0.12, 0.12);
  kit.add("metal", new THREE.SphereGeometry(0.7, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.4), { pos: [1.6, yT + 0.4, -8], color: PALETTE.steel, uv: "world", texel: 1 });
  kit.boxMM("painted", [-0.7, yT + 0.5, -10.5], [0.7, yT + 0.58, -9.0], { color: PALETTE.orange, uv: "keep" });
  // engine pods on the aft quarters (the corridor's z=0 end is the stern)
  for (const s of [-1, 1]) {
    const px = s * (x1 + 1.3);
    // pod barrel in painted steel (diffuse): as a gunmetal pure metal it was a featureless black cylinder
    // from the deck camera; the nozzle, rings and greebles stay bare metal
    kit.cyl("paintedMetal", px, 1.2, -6, 1.35, 12, "z", { color: PALETTE.gunmetal, segments: 20, texel: 0.5 });
    kit.cyl("metal", px, 1.2, -0.5, 1.45, 1.6, "z", { color: PALETTE.darkMetal, segments: 20, r2: 1.2 });
    // pod plating seams: three dark rings along the barrel
    for (const z of [-9.5, -6, -2.5]) kit.cyl("metal", px, 1.2, z, 1.39, 0.12, "z", { color: PALETTE.darkMetal, segments: 20 });
    // idle engines: dim blue glow discs recessed in the nozzles (the old full emitCool disc blew out the deck view)
    kit.add("emitBlueDim", new THREE.CircleGeometry(1.0, 24), { pos: [px, 1.2, 0.2], uv: "keep" });
    kit.add("metal", new THREE.RingGeometry(1.0, 1.25, 24), { pos: [px, 1.2, 0.36], color: PALETTE.darkMetal, uv: "keep" });
    kit.cyl("metal", px, 1.2, -12.5, 0.9, 1.4, "z", { color: PALETTE.steel, segments: 16, r2: 1.3 });
    // pylon to the body
    kit.boxMM("painted1", [Math.min(px, s * x1), 0.6, -9], [Math.max(px, s * x1), 1.8, -3], { color: PALETTE.creamDark, uv: "world", texel: 0.5 });
    kit.collider([px - 1.5, -clr, -13], [px + 1.5, 2.8, 0.4], "enginePod");
  }
  // --- landing gear: four legs (oleo strut in a housing, drag brace, scissor link) on wide pads, chocked
  for (const [sx, sz] of [[x0 + 1.6, -19], [x1 - 1.6, -19], [x0 + 1.6, -3.5], [x1 - 1.6, -3.5]]) {
    const s = sx < 0 ? -1 : 1;
    kit.box("paintedMetal", sx, yB - 0.3, sz, 0.9, 0.6, 1.0, { color: PALETTE.gunmetal, uv: "world", texel: 1 }); // housing
    kit.cyl("metal", sx, (yB - 0.6 + yD + 0.5) / 2, sz, 0.2, yB - 0.6 - (yD + 0.5), "y", { color: PALETTE.steel, segments: 12 }); // strut
    kit.cyl("metal", sx, yD + 0.75, sz, 0.28, 0.5, "y", { color: PALETTE.darkMetal, segments: 12 }); // oleo collar
    tube(kit, "metal", V(sx, yD + 0.55, sz), V(sx, yB - 0.2, sz + 1.6), 0.07, { color: PALETTE.steel, segments: 8 }); // drag brace
    tube(kit, "metal", V(sx - s * 0.25, yD + 0.9, sz), V(sx - s * 0.25, yB - 0.3, sz - 0.9), 0.05, { color: PALETTE.darkMetal, segments: 8 }); // scissor link
    kit.box("metal", sx, yD + 0.36, sz, 0.9, 0.2, 0.9, { color: PALETTE.gunmetal }); // pad ball housing
    kit.box("metal", sx, yD + 0.13, sz, 2.0, 0.26, 1.5, { color: PALETTE.darkMetal, uv: "world", texel: 1 }); // pad
    kit.box("hazard", sx, yD + 0.13, sz, 2.02, 0.12, 1.52, { texel: 3 });
    hgChocks(kit, sx, sz, 0, 1.0, yD);
    kit.collider([sx - 1.0, yD, sz - 0.75], [sx + 1.0, yD + 0.4, sz + 0.75], "gearPad");
    kit.collider([sx - 0.35, yD + 0.4, sz - 0.35], [sx + 0.35, 0, sz + 0.35], "strut");
  }
  // --- boarding ramp from the aft threshold (y 0, z 0.3) down to the deck (y -clr, z 0.3 + length)
  const rl = KESTREL.ramp.length;
  const rw = KESTREL.ramp.width;
  const rz0 = zAft;
  const rz1 = zAft + rl;
  const ang = Math.atan2(clr, rl);
  const slant = Math.hypot(clr, rl);
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), ang);
  const rampMid = [0, -clr / 2 - 0.07, (rz0 + rz1) / 2];
  // dark slab with #c8781e-on-#1a1a1a chevron treads (≈ 40 % coverage), black edge trims underneath
  kit.add("hangar_tread", new THREE.BoxGeometry(rw, 0.14, slant), { pos: rampMid, quat: q, color: 0xffffff, uv: "world", texel: 1.6 });
  kit.add("metal", new THREE.BoxGeometry(rw + 0.16, 0.1, slant), { pos: [0, rampMid[1] - 0.05, rampMid[2]], quat: q, color: PALETTE.darkMetal, uv: "world", texel: 1 });
  for (const s of [-1, 1]) {
    // side rails: rail tube + posts, with a dim amber landing-light strip along the kick plate
    const px = s * (rw / 2 + 0.05);
    const rail = new THREE.CylinderGeometry(0.025, 0.025, slant, 8).rotateX(Math.PI / 2);
    kit.add("metal", rail, { pos: [px, -clr / 2 + 0.95, (rz0 + rz1) / 2], quat: q, color: PALETTE.steel, uv: "scale", uvScale: [0.2, 7] });
    kit.add("metal", new THREE.BoxGeometry(0.06, 0.16, slant - 0.2), { pos: [px, -clr / 2 + 0.06, (rz0 + rz1) / 2], quat: q, color: PALETTE.darkMetal, uv: "world", texel: 1 });
    kit.add("emitAmberDim", new THREE.BoxGeometry(0.02, 0.04, slant - 0.6), { pos: [px + s * 0.035, -clr / 2 + 0.1, (rz0 + rz1) / 2], quat: q, uv: "keep" });
    for (let i = 0; i <= 3; i++) {
      const k = i / 3;
      kit.cyl("metal", px, -clr * k + 0.5, rz0 + rl * k, 0.02, 1.0, "y", { color: PALETTE.gunmetal, segments: 8 });
    }
    kit.collider([px - 0.05, -clr, rz0], [px + 0.05, 1.2, rz1], "ramprail");
    // hinge brackets at the ramp head and the hydraulic ram: cylinder from a belly hardpoint, piston to the ramp
    kit.box("metal", s * (rw / 2 + 0.25), -0.08, rz0 + 0.1, 0.3, 0.36, 0.5, { color: PALETTE.darkMetal });
    const hard = V(s * 1.15, yB - 0.1, rz0 + 0.3);
    const foot = V(s * 0.75, -clr * 0.5 - 0.22, rz0 + rl * 0.5);
    const mid = hard.clone().lerp(foot, 0.55);
    tube(kit, "metal", hard, mid, 0.11, { color: PALETTE.darkMetal, segments: 10 });
    tube(kit, "metal", mid, foot, 0.06, { color: PALETTE.steel, segments: 8 });
    kit.box("metal", s * 1.15, yB - 0.15, rz0 + 0.3, 0.4, 0.3, 0.5, { color: PALETTE.gunmetal });
    // upper rams outside the rails: from a jamb hardpoint down to an outrigger bracket at the ramp's
    // mid-length (these are the ones in frame from the door camera)
    const uHard = V(s * 1.62, 1.45, rz0 + 0.35);
    const uFoot = V(s * (rw / 2 + 0.32), -clr * 0.45 - 0.05, rz0 + rl * 0.45);
    const uMid = uHard.clone().lerp(uFoot, 0.5);
    kit.box("metal", uHard.x, uHard.y, uHard.z - 0.05, 0.34, 0.5, 0.4, { color: PALETTE.gunmetal });
    tube(kit, "metal", uHard, uMid, 0.1, { color: PALETTE.darkMetal, segments: 10 });
    tube(kit, "metal", uMid, uFoot, 0.055, { color: PALETTE.steel, segments: 8 });
    kit.box("metal", uFoot.x, uFoot.y - 0.02, uFoot.z, 0.28, 0.2, 0.36, { color: PALETTE.darkMetal });
    kit.box("hazard", uFoot.x + s * 0.145, uFoot.y - 0.02, uFoot.z, 0.01, 0.18, 0.34, { texel: 3 });
  }
  // deck foot plate where the ramp lands, and its two amber deck lamps
  kit.box("metal", 0, yD + 0.03, rz1 + 0.15, rw + 0.4, 0.06, 0.7, { color: PALETTE.darkMetal, uv: "world", texel: 1 });
  for (const s of [-1, 1]) kit.box("emitAmber", s * (rw / 2 + 0.35), yD + 0.05, rz1 + 0.3, 0.16, 0.04, 0.16);
  kit.ramp(-rw / 2, rz0, rw / 2, rz1, "z", rz0, rz1, 0, -clr, "kestrel-ramp");
  // --- deck-side services: fuel reel with the line up to the port fuel receptacle, two power umbilicals
  //     from belly sockets to deck junction boxes, a maintenance cart on the starboard side
  const reel = V(x1 + 1.2, yD + 0.45, -16);
  kit.cyl("metal", reel.x, reel.y, reel.z, 0.45, 0.4, "x", { color: PALETTE.darkMetal, segments: 16 });
  kit.box("metal", reel.x, yD + 0.2, reel.z, 0.5, 0.4, 1.1, { color: PALETTE.gunmetal });
  kit.box("hazard", reel.x, yD + 0.24, reel.z, 0.52, 0.12, 1.12, { texel: 3 });
  kit.collider([x1 + 0.6, yD, -16.6], [x1 + 1.8, yD + 1, -15.4], "reel");
  kit.cyl("metal", x1 + 0.05, 0.35, -14.2, 0.2, 0.16, "x", { color: PALETTE.darkMetal, segments: 12 }); // fuel receptacle ring
  kit.box("hazard", x1 + 0.12, 0.35, -14.2, 0.02, 0.7, 0.7, { texel: 3 });
  hose(kit, "rubber", V(reel.x - 0.4, reel.y + 0.1, reel.z), V(x1 + 0.9, yD + 0.08, -15.0), 0.1, 0.06, 4, { color: PALETTE.rubber });
  hose(kit, "rubber", V(x1 + 0.9, yD + 0.08, -15.0), V(x1 + 0.22, 0.35, -14.2), -0.25, 0.06, 6, { color: PALETTE.rubber });
  const socket = (sx, sz) => {
    kit.box("metal", sx, yD + 0.22, sz, 0.6, 0.44, 0.5, { color: PALETTE.gunmetal, uv: "world", texel: 1 });
    kit.box("hazard", sx, yD + 0.24, sz, 0.62, 0.1, 0.52, { texel: 3 });
    kit.box("emitAmber", sx, yD + 0.36, sz + 0.26, 0.2, 0.05, 0.01);
    kit.collider([sx - 0.3, yD, sz - 0.25], [sx + 0.3, yD + 0.45, sz + 0.25], "socket");
  };
  for (const [bx, bz, dx, dz] of [
    [-2.8, -7.5, x0 - 1.4, -6.2],
    [3.2, -12.5, x1 + 1.6, -11.0],
  ]) {
    kit.cyl("metal", bx, yB - 0.12, bz, 0.16, 0.24, "y", { color: PALETTE.darkMetal, segments: 10 }); // belly socket
    socket(dx, dz);
    hose(kit, "rubber", V(bx, yB - 0.24, bz), V(dx, yD + 0.44, dz), 0.35, 0.05, 7, { color: PALETTE.rubber });
  }
  kit.box("painted", x0 - 1.6, yD + 0.45, -8.5, 1.0, 0.9, 1.6, { color: PALETTE.orange, uv: "keep" });
  kit.box("metal", x0 - 1.6, yD + 0.95, -8.5, 1.0, 0.1, 1.6, { color: PALETTE.steel });
  for (const [dx, dz] of [[-0.4, -0.65], [0.4, -0.65], [-0.4, 0.65], [0.4, 0.65]]) kit.cyl("rubber", x0 - 1.6 + dx, yD + 0.12, -8.5 + dz, 0.12, 0.08, "x", { color: PALETTE.rubber, segments: 10 });
  kit.collider([x0 - 2.2, yD, -9.4], [x0 - 1.0, yD + 1.1, -7.6], "cart");
}
