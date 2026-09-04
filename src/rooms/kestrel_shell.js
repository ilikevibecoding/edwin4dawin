// Exterior shell of the Kestrel (the original freighter interior) so it reads as a parked ship on
// the hangar deck: hull plating around the cabin volume, cockpit nose, engine pods, landing struts,
// the boarding ramp down from the aft blast door, and a few deck-side service props.
// Built in the Kestrel's local frame (aft door at z = 0, bow at -z, cabin floor at y = 0).
import * as THREE from "three";
import { PALETTE } from "../materials.js";
import { KESTREL } from "../spec.js";
import { decalRect } from "../textures.js";

export function buildKestrelShell(kit) {
  const L = KESTREL.local; // x0 -5.5, x1 5.2, z0 -25.5, z1 0.3, h 3.0
  const clr = KESTREL.clearance; // deck is at y = -clr
  const t = 0.35; // hull skin thickness
  const yB = -0.55; // belly (below the cabin deck slab)
  const yT = L.h + 0.45; // roof
  const x0 = L.x0 - t - 0.6;
  const x1 = L.x1 + t + 0.6;
  const zFwd = L.z0 + 3.0; // the cockpit nose already exists forward of -22.6
  const zAft = L.z1 + 0.4;
  // --- main body: side plates, roof, belly (painted, cream/slate like the interior palette)
  kit.boxMM("painted1", [x0, yB, zFwd], [x0 + t, yT, zAft], { color: PALETTE.creamDark, uv: "world", texel: 0.35 });
  kit.boxMM("painted1", [x1 - t, yB, zFwd], [x1, yT, zAft], { color: PALETTE.creamDark, uv: "world", texel: 0.35 });
  kit.boxMM("painted2", [x0, yT - t, zFwd], [x1, yT, zAft], { color: PALETTE.cream, uv: "world", texel: 0.35 });
  kit.boxMM("metal", [x0, yB, zFwd], [x1, yB + t, zAft], { color: PALETTE.gunmetal, uv: "world", texel: 0.5 });
  // aft face around the door opening (door at x -0.85..0.85, y 0..2.35)
  kit.boxMM("painted1", [x0, yB, zAft - t], [-0.95, yT, zAft], { color: PALETTE.creamDark, uv: "world", texel: 0.35 });
  kit.boxMM("painted1", [0.95, yB, zAft - t], [x1, yT, zAft], { color: PALETTE.creamDark, uv: "world", texel: 0.35 });
  kit.boxMM("painted1", [-0.95, 2.45, zAft - t], [0.95, yT, zAft], { color: PALETTE.creamDark, uv: "world", texel: 0.35 });
  kit.boxMM("painted1", [-0.95, yB, zAft - t], [0.95, 0, zAft], { color: PALETTE.creamDark, uv: "world", texel: 0.35 });
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
  // dorsal spine: sensor mast, twin comms dishes, a hatch
  kit.boxMM("metal", [-0.8, yT, -18], [0.8, yT + 0.5, -3], { color: PALETTE.gunmetal, uv: "world", texel: 0.5 });
  kit.cyl("metal", 0, yT + 1.4, -14, 0.08, 1.8, "y", { color: PALETTE.steel, segments: 8 });
  kit.box("emitRed", 0, yT + 2.4, -14, 0.12, 0.12, 0.12);
  kit.add("metal", new THREE.SphereGeometry(0.7, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.4), { pos: [1.6, yT + 0.4, -8], color: PALETTE.steel, uv: "world", texel: 1 });
  kit.boxMM("painted", [-0.7, yT + 0.5, -10.5], [0.7, yT + 0.58, -9.0], { color: PALETTE.orange, uv: "keep" });
  // engine pods on the aft quarters (the corridor's z=0 end is the stern)
  for (const s of [-1, 1]) {
    const px = s * (x1 + 1.3);
    kit.cyl("metal", px, 1.2, -6, 1.35, 12, "z", { color: PALETTE.gunmetal, segments: 20, texel: 0.5 });
    kit.cyl("metal", px, 1.2, -0.5, 1.45, 1.6, "z", { color: PALETTE.darkMetal, segments: 20, r2: 1.2 });
    kit.add("emitCool", new THREE.CircleGeometry(1.1, 24), { pos: [px, 1.2, 0.35], uv: "keep" });
    kit.cyl("metal", px, 1.2, -12.5, 0.9, 1.4, "z", { color: PALETTE.steel, segments: 16, r2: 1.3 });
    // pylon to the body
    kit.boxMM("painted1", [Math.min(px, s * x1) , 0.6, -9], [Math.max(px, s * x1), 1.8, -3], { color: PALETTE.creamDark, uv: "world", texel: 0.5 });
    kit.collider([px - 1.5, -clr, -13], [px + 1.5, 2.8, 0.4], "enginePod");
  }
  // landing struts (4) + skids
  for (const [sx, sz] of [[x0 + 1.4, -20], [x1 - 1.4, -20], [x0 + 1.4, -3.5], [x1 - 1.4, -3.5]]) {
    kit.cyl("metal", sx, (yB - clr) / 2 + yB / 2, sz, 0.16, clr + yB * 0 + 0.55, "y", { color: PALETTE.steel, segments: 10 });
    kit.box("metal", sx, -clr + 0.12, sz, 1.3, 0.24, 0.9, { color: PALETTE.darkMetal });
    kit.box("metal", sx, yB - 0.25, sz, 0.7, 0.5, 0.7, { color: PALETTE.gunmetal });
    kit.collider([sx - 0.65, -clr, sz - 0.45], [sx + 0.65, 0, sz + 0.45], "strut");
  }
  // --- boarding ramp from the aft threshold (y 0, z 0.3) down to the deck (y -clr, z 0.3 + length)
  const rl = KESTREL.ramp.length;
  const rw = KESTREL.ramp.width;
  const rz0 = zAft;
  const rz1 = zAft + rl;
  const ang = Math.atan2(clr, rl);
  const slab = new THREE.BoxGeometry(rw, 0.12, Math.hypot(clr, rl));
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), ang);
  kit.add("deck", slab, { pos: [0, -clr / 2 - 0.06, (rz0 + rz1) / 2], quat: q, color: PALETTE.slate, uv: "world", texel: 0.7 });
  // anti-slip treads and hazard edges
  for (let i = 1; i < 12; i++) {
    const k = i / 12;
    const tz = rz0 + rl * k;
    const ty = -clr * k;
    kit.add("hazard", new THREE.BoxGeometry(rw - 0.1, 0.03, 0.08), { pos: [0, ty + 0.015, tz], quat: q, texel: 3 });
  }
  for (const s of [-1, 1]) {
    // side rails: rail tube + posts
    const px = s * (rw / 2 + 0.05);
    const rail = new THREE.CylinderGeometry(0.025, 0.025, Math.hypot(clr, rl), 8).rotateX(Math.PI / 2);
    kit.add("metal", rail, { pos: [px, -clr / 2 + 0.95, (rz0 + rz1) / 2], quat: q, color: PALETTE.steel, uv: "scale", uvScale: [0.2, 7] });
    for (let i = 0; i <= 3; i++) {
      const k = i / 3;
      kit.cyl("metal", px, -clr * k + 0.5, rz0 + rl * k, 0.02, 1.0, "y", { color: PALETTE.gunmetal, segments: 8 });
    }
    kit.collider([px - 0.05, -clr, rz0], [px + 0.05, 1.2, rz1], "ramprail");
  }
  kit.ramp(-rw / 2, rz0, rw / 2, rz1, "z", rz0, rz1, 0, -clr, "kestrel-ramp");
  // hydraulic rams under the ramp
  for (const s of [-1, 1]) kit.cyl("metal", s * 0.6, -clr / 2 - 0.4, rz0 + 1.8, 0.07, 2.2, "z", { color: PALETTE.steel, segments: 8 });
  // deck-side props: fuel line reel, wheel chocks, a maintenance cart
  kit.cyl("metal", x1 + 1.2, -clr + 0.45, -16, 0.45, 0.4, "x", { color: PALETTE.darkMetal, segments: 16 });
  kit.box("metal", x1 + 1.2, -clr + 0.2, -16, 0.5, 0.4, 1.1, { color: PALETTE.gunmetal });
  kit.cyl("rubber", x1 + 0.4, -clr + 0.6, -16, 0.05, 2.0, "x", { color: PALETTE.rubber, segments: 8 });
  kit.collider([x1 + 0.6, -clr, -16.6], [x1 + 1.8, -clr + 1, -15.4], "reel");
  kit.box("painted", x0 - 1.6, -clr + 0.45, -8, 1.0, 0.9, 1.6, { color: PALETTE.orange, uv: "keep" });
  kit.box("metal", x0 - 1.6, -clr + 0.95, -8, 1.0, 0.1, 1.6, { color: PALETTE.steel });
  for (const [dx, dz] of [[-0.4, -0.65], [0.4, -0.65], [-0.4, 0.65], [0.4, 0.65]]) kit.cyl("rubber", x0 - 1.6 + dx, -clr + 0.12, -8 + dz, 0.12, 0.08, "x", { color: PALETTE.rubber, segments: 10 });
  kit.collider([x0 - 2.2, -clr, -8.9], [x0 - 1.0, -clr + 1.1, -7.1], "cart");
}
