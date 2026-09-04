// Command tower: stepped neck blocks with deck bands / pilasters / windows and ledge machinery, the bridge
// block built as a hollow shell so the two glazing slots stay open from the inside (the bridge looks
// straight out), a bevelled sill, brow above the glazing, side fairings, shield generator globes with panel
// lines, the comms mast with dishes and antennae.
import * as THREE from "three";
import { IMP } from "../core/palette.js";
import { TOWER } from "../core/layout.js";
import { prism } from "../core/kit.js";
import { boxBlocked, faceMatrix } from "./common.js";
import { dressWall } from "./greebles.js";
import { recessPanels } from "./city.js";

const _c = new THREE.Color();
const B = TOWER.bridge;
const FACE = B.z0 - 1.2; // outer face of the forward wall (z = 168.8)
const WALL_IN = B.z0 + 1.0; // inner face of the forward wall (z = 171, room keep-out boundary)

function boxMM(kit, mat, min, max, opts) {
  if (opts && opts.check && boxBlocked(min, max)) console.warn("exterior: tower piece intersects a keep-out volume", min, max);
  return kit.boxMM(mat, min, max, opts);
}

export function buildTower(kit, tiers, rand) {
  const walls = [];
  // ---- neck blocks
  TOWER.neck.forEach((n, i) => {
    const c = _c.copy(IMP.hullMid).lerp(IMP.hullLight, 0.1 + i * 0.04).clone();
    kit.boxMM("hull", [-n.x, n.y0, n.z0], [n.x, n.y1, n.z1], { color: c, texel: 1 / 32 });
    // dark deck band at the base, light cornice at the top
    kit.boxMM("hullDark", [-n.x - 0.9, n.y0 + 0.2, n.z0 - 0.9], [n.x + 0.9, n.y0 + 2.6, n.z1 + 0.9], { color: IMP.hullShadow, texel: 1 / 12 });
    kit.boxMM("hull", [-n.x - 1.1, n.y1 - 1.3, n.z0 - 1.1], [n.x + 1.1, n.y1, n.z1 + 1.1], { color: c.clone().lerp(IMP.hullLight, 0.2), texel: 1 / 12 });
    const y0 = n.y0 + 2.8;
    const y1 = n.y1 - 1.4;
    walls.push({ ax: -n.x, az: n.z0, bx: n.x, bz: n.z0, y0, y1, nx: 0, nz: -1 });
    walls.push({ ax: n.x, az: n.z0, bx: n.x, bz: n.z1, y0, y1, nx: 1, nz: 0 });
    walls.push({ ax: n.x, az: n.z1, bx: -n.x, bz: n.z1, y0, y1, nx: 0, nz: 1 });
    walls.push({ ax: -n.x, az: n.z1, bx: -n.x, bz: n.z0, y0, y1, nx: -1, nz: 0 });
    // ledge machinery on the step outside the next block
    const next = TOWER.neck[i + 1] || { x: B.x, z0: B.z0, z1: B.z1 };
    const ledgeY = n.y1;
    const nx = next.x;
    for (let side = -1; side <= 1; side += 2) {
      if (nx + 3 < n.x - 2) {
        for (let z = n.z0 + 3; z < n.z1 - 3; z += 4 + rand() * 5) {
          const x = side * (nx + 2 + rand() * Math.max(1, n.x - nx - 5));
          const k = rand();
          const s = [2 + rand() * 4, 1 + rand() * 3, 2 + rand() * 5];
          if (k < 0.6) tiers.mid.place(rand() < 0.7 ? "box" : "boxDark", { pos: [x, ledgeY, z], scale: s, color: _c.copy(IMP.hullMid).lerp(rand() < 0.5 ? IMP.hullLight : IMP.hullShadow, rand() * 0.3) });
          else if (k < 0.8) tiers.near.place("vent", { pos: [x, ledgeY, z], scale: [2 + rand() * 2, 1.5, 2 + rand() * 2], color: IMP.hullShadow });
          else tiers.near.place("tank", { pos: [x, ledgeY, z], scale: [1.2, 1.2, 2 + rand() * 3], color: c });
        }
      }
    }
    for (const z of [n.z0, n.z1]) {
      if (next.z0 - n.z0 > 4 || n.z1 - next.z1 > 4) {
        for (let x = -n.x + 4; x < n.x - 4; x += 5 + rand() * 6) {
          const zz = z === n.z0 ? n.z0 + 1.5 + rand() * Math.max(0.5, next.z0 - n.z0 - 3) : next.z1 + 1.5 + rand() * Math.max(0.5, n.z1 - next.z1 - 3);
          if (zz < n.z0 || zz > n.z1) continue;
          tiers.mid.place("box", { pos: [x, ledgeY, zz], scale: [2 + rand() * 3, 1 + rand() * 2.5, 1.5 + rand() * 2], color: _c.copy(IMP.hullMid).lerp(IMP.hullLight, rand() * 0.3) });
        }
      }
    }
  });

  // ---- bridge block: hollow shell (rooms live inside), forward wall with open glazing slots
  const cB = _c.copy(IMP.hullLight).lerp(IMP.hullMid, 0.25).clone();
  const T = 1.6; // shell thickness
  boxMM(kit, "hull", [-B.x, B.y0, WALL_IN], [B.x, B.y0 + 4, B.z1], { color: cB, texel: 1 / 32, check: true }); // floor slab
  boxMM(kit, "hull", [-B.x, B.y1 - 3, WALL_IN], [B.x, B.y1, B.z1], { color: cB, texel: 1 / 32, check: true }); // roof slab
  boxMM(kit, "hull", [-B.x, B.y0, WALL_IN], [-B.x + T, B.y1, B.z1], { color: cB, texel: 1 / 32, check: true }); // port wall
  boxMM(kit, "hull", [B.x - T, B.y0, WALL_IN], [B.x, B.y1, B.z1], { color: cB, texel: 1 / 32, check: true }); // starboard wall
  boxMM(kit, "hull", [-B.x, B.y0, B.z1 - 1.0], [B.x, B.y1, B.z1 + 0.6], { color: cB, texel: 1 / 32, check: true }); // aft wall
  // forward wall pieces (z FACE..WALL_IN): below the glazing, jambs, upper band. The slots are cut taller
  // than the interior glass (208.6..217 vs 211..216.5) so the line of sight over the interior sill leaves
  // the tower unobstructed: from the eye (y ≈ 211.7, z 176) the limiting ray over the sill passes the
  // outer face at y ≈ 210.4.
  const wins = TOWER.windows;
  const sillTop = 208.6;
  const yTopBand = 217.0;
  boxMM(kit, "hull", [-B.x, B.y0, FACE], [B.x, sillTop, WALL_IN], { color: cB, texel: 1 / 32, check: true });
  // segments at window height where there is no slot
  const spans = [];
  let xs = -B.x;
  for (const w of [...wins].sort((a, b) => a.x0 - b.x0)) {
    spans.push([xs, w.x0 - 1.0]);
    xs = w.x1 + 1.0;
  }
  spans.push([xs, B.x]);
  for (const [x0, x1] of spans) boxMM(kit, "hull", [x0, sillTop, FACE], [x1, yTopBand, WALL_IN], { color: cB, texel: 1 / 32, check: true });
  for (const w of wins) {
    // dark jambs (1 m either side of the slot), sill plate and head plate lining the opening
    boxMM(kit, "hullDark", [w.x0 - 1.0, sillTop, FACE], [w.x0, yTopBand, WALL_IN], { color: IMP.hullShadow, texel: 1 / 10 });
    boxMM(kit, "hullDark", [w.x1, sillTop, FACE], [w.x1 + 1.0, yTopBand, WALL_IN], { color: IMP.hullShadow, texel: 1 / 10 });
    boxMM(kit, "hullDark", [w.x0 - 1.0, sillTop - 0.4, FACE - 0.02], [w.x1 + 1.0, sillTop, WALL_IN], { color: IMP.hullShadow, texel: 1 / 10 });
    boxMM(kit, "hullDark", [w.x0 - 1.0, yTopBand, FACE - 0.02], [w.x1 + 1.0, yTopBand + 0.4, WALL_IN], { color: IMP.hullShadow, texel: 1 / 10 });
    // glazing pane + slim mullions on the outer face; dark backdrop facing outward only (culled from inside)
    kit.boxMM("glass", [w.x0, sillTop + 0.3, FACE + 0.7], [w.x1, yTopBand - 0.3, FACE + 0.8]);
    for (let x = w.x0 + 4.25; x < w.x1 - 1; x += 4.25) kit.boxMM("hullDark", [x - 0.13, sillTop, FACE], [x + 0.13, yTopBand, FACE + 0.55], { color: IMP.hullShadow });
    const back = new THREE.PlaneGeometry(w.x1 - w.x0, yTopBand - sillTop);
    back.rotateY(Math.PI); // faces −z (outward)
    kit.add("hullDark", back, { pos: [(w.x0 + w.x1) / 2, (sillTop + yTopBand) / 2, WALL_IN - 0.1], color: new THREE.Color(0x0b0d12), uv: "keep" });
  }
  // shuttered starboard slot (mirrors the observation gallery on the port side)
  {
    const o = wins[1];
    const x0 = -o.x1;
    const x1 = -o.x0;
    kit.boxMM("hullDark", [x0, o.y0, FACE - 0.05], [x1, o.y1, FACE + 0.3], { color: IMP.hullShadow, texel: 1 / 6 });
    for (let y = o.y0 + 0.5; y < o.y1; y += 0.9) kit.boxMM("hullDark", [x0 + 0.3, y, FACE - 0.2], [x1 - 0.3, y + 0.35, FACE], { color: IMP.hullDark });
  }
  // lintel band and brow (overhang) above the glazing
  boxMM(kit, "hull", [-B.x, yTopBand, FACE], [B.x, 217.4, WALL_IN], { color: cB, texel: 1 / 32, check: true });
  kit.boxMM("hull", [-B.x - 0.4, 217.4, FACE - 1.7], [B.x + 0.4, 220.6, WALL_IN], { color: cB.clone().lerp(IMP.hullLight, 0.2), texel: 1 / 20 });
  kit.boxMM("hullDark", [-B.x, 217.4, FACE - 1.7], [B.x, 218.0, FACE - 0.2], { color: IMP.hullShadow, texel: 1 / 10 });
  boxMM(kit, "hull", [-B.x, 220.6, FACE], [B.x, B.y1, WALL_IN], { color: cB, texel: 1 / 32, check: true });
  // forward face detail above the brow (sensor bands) and the dark base band
  kit.boxMM("hullDark", [-B.x - 0.9, B.y0 + 0.2, FACE - 0.9], [B.x + 0.9, B.y0 + 2.6, B.z1 + 0.9], { color: IMP.hullShadow, texel: 1 / 12 });
  kit.boxMM("hull", [-B.x - 1.1, B.y1 - 1.3, FACE - 1.1], [B.x + 1.1, B.y1, B.z1 + 1.1], { color: cB.clone().lerp(IMP.hullLight, 0.2), texel: 1 / 12 });
  walls.push({ ax: -B.x, az: FACE, bx: B.x, bz: FACE, y0: 222, y1: B.y1 - 1.4, nx: 0, nz: -1, sparse: true });
  walls.push({ ax: -B.x, az: FACE, bx: B.x, bz: FACE, y0: B.y0 + 2.8, y1: 207.5, nx: 0, nz: -1, sparse: true });
  walls.push({ ax: B.x, az: FACE, bx: B.x, bz: B.z1, y0: B.y0 + 2.8, y1: B.y1 - 1.4, nx: 1, nz: 0 });
  walls.push({ ax: B.x, az: B.z1, bx: -B.x, bz: B.z1, y0: B.y0 + 2.8, y1: B.y1 - 1.4, nx: 0, nz: 1 });
  walls.push({ ax: -B.x, az: B.z1, bx: -B.x, bz: FACE, y0: B.y0 + 2.8, y1: B.y1 - 1.4, nx: -1, nz: 0 });

  // side fairings under the bridge block overhang (neck x ±70 → block x ±120)
  {
    const n3 = TOWER.neck[2];
    for (const side of [-1, 1]) {
      const pts = [
        [side * n3.x, n3.y1 - 26],
        [side * (B.x - 0.4), B.y0 + 0.1],
        [side * n3.x, B.y0 + 0.1],
      ];
      const g = prism(pts, B.z1 - B.z0 - 4);
      kit.add("hull", g, { pos: [0, 0, (B.z0 + B.z1) / 2], color: cB.clone().lerp(IMP.hullDark, 0.2), uv: "world", texel: 1 / 24 });
      // ribs on the fairing face
      for (let z = B.z0 + 4; z < B.z1 - 4; z += 7) {
        const x0 = side * n3.x;
        const x1 = side * (B.x - 1);
        const y0 = n3.y1 - 25;
        const y1 = B.y0 - 0.6;
        const len = Math.hypot(x1 - x0, y1 - y0);
        const ang = Math.atan2(y1 - y0, x1 - x0);
        kit.add("hullDark", new THREE.BoxGeometry(len, 1.2, 1.6), { pos: [(x0 + x1) / 2, (y0 + y1) / 2 - 0.4, z], rot: [0, 0, ang], color: IMP.hullDark, texel: 1 / 8 });
      }
    }
  }

  for (const w of walls) dressWall(tiers, rand, w, { nx: w.nx, nz: w.nz, rows: 6, occupancy: w.sparse ? 0.14 : 0.22, pilasterEvery: 10, warm: 0.1 });
  // recessed shuttered openings on the neck fronts / sides and the bridge block flanks
  for (const w of walls) {
    const len = Math.hypot(w.bx - w.ax, w.bz - w.az);
    if (w.sparse || len < 60 || w.y1 - w.y0 < 14) continue;
    recessPanels(tiers, rand, w, 1 + Math.floor(rand() * 2));
  }
  // forward face relief: recessed deck bands (flush, inside the wall thickness) above and below the glazing
  for (const [y0, y1] of [
    [B.y0 + 4.6, B.y0 + 5.6],
    [206.2, 207.2],
    [224.0, 225.0],
    [B.y1 - 6.2, B.y1 - 5.2],
  ]) kit.boxMM("hullDark", [-B.x + 2, y0, FACE - 0.01], [B.x - 2, y1, FACE + 0.8], { color: IMP.hullShadow, texel: 1 / 8 });
  // sensor clusters on the upper forward face and the brow ends (dishes + blister domes on the wall)
  for (const side of [-1, 1]) {
    for (const [x, y, s] of [
      [side * (B.x - 14), 228, 3.2],
      [side * (B.x - 30), 230, 2.2],
      [side * 52, 227.5, 2.6],
    ]) {
      const m = faceMatrix(x, y, FACE - 0.02, 0, 0, -1, rand() * 0.6 - 0.3, s);
      tiers.mid.placeM(rand() < 0.5 ? "dish" : "sensorBall", m, IMP.hullLight);
    }
    tiers.mid.place("wallBoxDark", { pos: [side * (B.x - 22), 229, FACE - 0.01], rot: [0, Math.PI, 0], scale: [22, 5.5, 0.4], color: IMP.hullShadow });
    // wing-tip sensor blisters at the brow ends
    kit.add("hull", new THREE.SphereGeometry(2.6, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), { pos: [side * (B.x - 6), 220.6, FACE - 1.2], color: IMP.hullLight, uv: "scale", uvScale: [4, 2] });
  }

  // ---- shield generator globes with panel lines
  for (const side of [-1, 1]) {
    const g = TOWER.globes;
    const cx = side * g.x;
    kit.add("hull", new THREE.SphereGeometry(g.r, 40, 26), { pos: [cx, g.y, g.z], color: IMP.hullLight, uv: "scale", uvScale: [12, 6] });
    // collar where the globe meets the roof
    const rc = Math.sqrt(Math.max(1, g.r * g.r - (g.y - B.y1) * (g.y - B.y1)));
    kit.add("hullDark", new THREE.TorusGeometry(rc + 0.6, 1.4, 8, 40), { pos: [cx, B.y1 + 0.6, g.z], rot: [Math.PI / 2, 0, 0], color: IMP.hullDark, uv: "scale", uvScale: [20, 1] });
    kit.add("hull", new THREE.CylinderGeometry(rc + 2.5, rc + 3.5, 1.6, 32), { pos: [cx, B.y1 + 0.8, g.z], color: IMP.hullMid, uv: "scale", uvScale: [12, 1] });
    for (const h of [-9, 0, 9, 16]) {
      const rr = Math.sqrt(g.r * g.r - h * h) + 0.15;
      kit.add("hullDark", new THREE.TorusGeometry(rr, 0.32, 6, 48), { pos: [cx, g.y + h, g.z], rot: [Math.PI / 2, 0, 0], color: IMP.hullDark, uv: "scale", uvScale: [24, 1] });
    }
    for (let k = 0; k < 4; k++) {
      // one arc = a meridian over the top from −50° to 230° (down to the roof collar on both sides)
      const arc = new THREE.TorusGeometry(g.r + 0.15, 0.3, 6, 40, Math.PI * 1.56);
      arc.rotateZ(-Math.PI * 0.278);
      kit.add("hullDark", arc, { pos: [cx, g.y, g.z], rot: [0, (k / 4) * Math.PI, 0], color: IMP.hullDark, uv: "scale", uvScale: [16, 1] });
    }
    // cap, antenna, panels
    kit.add("hull", new THREE.CylinderGeometry(3.2, 4.2, 1.6, 16), { pos: [cx, g.y + g.r + 0.4, g.z], color: IMP.hullMid, uv: "scale", uvScale: [4, 1] });
    kit.add("hullDark", new THREE.CylinderGeometry(0.25, 0.4, 7, 6), { pos: [cx, g.y + g.r + 4.5, g.z], color: IMP.hullDark, uv: "scale", uvScale: [1, 2] });
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + 0.3;
      const lat = -0.35 + rand() * 0.5;
      const px = cx + Math.cos(a) * g.r * Math.cos(lat);
      const pz = g.z + Math.sin(a) * g.r * Math.cos(lat);
      const py = g.y + Math.sin(lat) * g.r;
      const m = new THREE.Matrix4().lookAt(new THREE.Vector3(px, py, pz), new THREE.Vector3(cx, g.y, g.z), new THREE.Vector3(0, 1, 0));
      const q = new THREE.Quaternion().setFromRotationMatrix(m);
      const s = 1.5 + rand() * 2;
      tiers.mid.place("wallHatch", { pos: [px, py, pz], quat: q, scale: [s, s, 1], color: IMP.hullDark });
    }
  }

  // ---- comms mast: stepped column, cross bars, dishes, antennae
  {
    const m = TOWER.mast;
    const steps = [
      { w: m.w, y0: m.y0, y1: m.y0 + 26 },
      { w: m.w * 0.72, y0: m.y0 + 26, y1: m.y0 + 44 },
      { w: m.w * 0.48, y0: m.y0 + 44, y1: m.y1 },
    ];
    for (const s of steps) {
      kit.boxMM("hull", [m.x - s.w / 2, s.y0, m.z - s.w / 2], [m.x + s.w / 2, s.y1, m.z + s.w / 2], { color: IMP.hullMid, texel: 1 / 10 });
      kit.boxMM("hullDark", [m.x - s.w / 2 - 0.6, s.y1 - 1.6, m.z - s.w / 2 - 0.6], [m.x + s.w / 2 + 0.6, s.y1, m.z + s.w / 2 + 0.6], { color: IMP.hullDark, texel: 1 / 6 });
      for (let y = s.y0 + 4; y < s.y1 - 2; y += 5) {
        for (const side of [-1, 1]) {
          tiers.mid.place("box", { pos: [m.x + side * (s.w / 2), y, m.z], scale: [1.2, 0.9, s.w * 0.8], color: IMP.hullDark });
          tiers.mid.place("box", { pos: [m.x, y, m.z + side * (s.w / 2)], scale: [s.w * 0.8, 0.9, 1.2], color: IMP.hullDark });
        }
      }
    }
    // main dish (forward-up), secondary dish (aft), a rack of whip antennae and the tip pole
    const dish = new THREE.CylinderGeometry(m.dishR, m.dishR * 0.22, 2.6, 36, 1, true);
    kit.add("hullDark", dish, { pos: [m.x, m.y1 - 6, m.z - m.w * 0.24 - 4], rot: [-0.85, 0, 0], color: IMP.hullDark, uv: "scale", uvScale: [8, 1] });
    kit.add("hull", new THREE.CylinderGeometry(0.45, 0.45, 8, 8), { pos: [m.x, m.y1 - 6 + 3.2, m.z - m.w * 0.24 - 4 - 4.5], rot: [-0.85, 0, 0], color: IMP.hullLight, uv: "scale", uvScale: [1, 2] });
    kit.add("hull", new THREE.CylinderGeometry(1.6, 1.6, 2, 8), { pos: [m.x, m.y1 - 6 - 1, m.z - m.w * 0.24 - 4 + 1], rot: [-0.85, 0, 0], color: IMP.hullLight, uv: "scale", uvScale: [1, 2] });
    const dish2 = new THREE.CylinderGeometry(4.5, 1, 1.4, 24, 1, true);
    kit.add("hullDark", dish2, { pos: [m.x + 3, m.y0 + 34, m.z + m.w * 0.36 + 4], rot: [1.2, 0, 0], color: IMP.hullDark, uv: "scale", uvScale: [6, 1] });
    kit.add("hull", new THREE.CylinderGeometry(0.5, 0.8, m.tipY - m.y1, 8), { pos: [m.x, (m.tipY + m.y1) / 2, m.z], color: IMP.hullLight, uv: "scale", uvScale: [1, 4] });
    for (const y of [m.y1 + 4, m.y1 + 9, m.tipY - 3]) kit.box("hullDark", m.x, y, m.z, 7 - (y - m.y1) * 0.25, 0.35, 0.35, { color: IMP.hullDark });
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2;
      const r = steps[2].w / 2 + 0.5;
      tiers.mid.place("antenna", { pos: [m.x + Math.cos(a) * r, m.y1 - 1, m.z + Math.sin(a) * r], scale: [1.2, 5 + rand() * 9, 1.2], color: IMP.hullDark });
    }
    // sensor / antenna farm on the roof around the mast
    for (let i = 0; i < 26; i++) {
      const a = rand() * Math.PI * 2;
      const r = 12 + rand() * 40;
      const x = m.x + Math.cos(a) * r;
      const z = m.z + Math.sin(a) * r * 0.55;
      if (Math.abs(x) > B.x - 6 || z < B.z0 + 4 || z > B.z1 - 4) continue;
      if (Math.abs(Math.abs(x) - TOWER.globes.x) < TOWER.globes.r + 4) continue;
      const k = rand();
      if (k < 0.35) tiers.mid.place("box", { pos: [x, B.y1, z], scale: [2 + rand() * 5, 1.5 + rand() * 4, 2 + rand() * 5], color: _c.copy(IMP.hullMid).lerp(IMP.hullLight, rand() * 0.3) });
      else if (k < 0.55) tiers.mid.place("dish", { pos: [x, B.y1, z], rot: [0, rand() * 6.28, 0], scale: 2 + rand() * 3, color: IMP.hullLight });
      else if (k < 0.75) tiers.mid.place("dome", { pos: [x, B.y1, z], scale: 1.5 + rand() * 3, color: IMP.hullLight });
      else if (k < 0.9) tiers.mid.place("mastSmall", { pos: [x, B.y1, z], scale: [1.5, 6 + rand() * 10, 1.5], color: IMP.hullDark });
      else tiers.near.place("radiator", { pos: [x, B.y1, z], scale: [3 + rand() * 3, 2, 3], color: IMP.hullShadow });
    }
  }
  return { walls };
}
