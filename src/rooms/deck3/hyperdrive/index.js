// Deck 3 hyperdrive room: a 28 m high hall around the horizontal hyperdrive motivator — a 9 m
// cylinder on three cradles, six field coils, end caps, a top gantry reached by a switchback stair
// tower, power trunks from the finned coil banks on both walls, and a circular housing in the aft
// bulkhead where the motivator meets the wall. Blue/white key on the machine, amber fills.
import * as THREE from "three";
import { defineRoom } from "../../deck2/_shared/room.js";
import { IMP, col } from "../../deck2/_shared/palette.js";
import { rail, WALL_T } from "../../deck2/_shared/shell.js";
import { console as consoleProp, pipe, duct, tank, stairs, floorLine, cabinet, hazardStrip, indicatorField, placer, wallScreen } from "../../deck2/_shared/props.js";
import { TAU, ring, strut, powerCabinet, cableTray, toolRack, monitorPedestal, junctionBox, ventGrille, valveStation, wallLamp, ceilingFixture, fixtureFaceY, highBay, topScreens, labelCrate } from "../engctl/engprops.js";
import { animKey, faceKey, MODE, buildAnimatedEmitters, anim } from "../engctl/anim.js";

const Y = 12;
const CEIL = 40;
const X0 = -30 + WALL_T;
const X1 = 30 - WALL_T;
const Z0 = 690 + WALL_T;
const Z1 = 752 - WALL_T;
const AX = Y + 8; // motivator axis height
const R = 4.5;
const MZ0 = 698; // motivator body extent along z
const MZ1 = 746;
const COILS = [702, 710, 718, 726, 734, 742];
const CRADLES = [706, 722, 738];
const GANTRY = 26.0; // gantry deck top

export default defineRoom({
  id: "d3-hyperdrive",
  name: "Hyperdrive Room",
  deck: 3,
  x: [-30, 30],
  z: [690, 752],
  ceil: CEIL,
  spawn: { pos: [0, Y, 693], yaw: 180 },
  views: {
    "d3-hyperdrive-door": { pos: [-10.4, Y, 694.2], yaw: -137, pitch: 7 },
    "d3-hyperdrive-side": { pos: [-16.6, Y, 701.1], yaw: -142, pitch: 12 },
    "d3-hyperdrive-housing": { pos: [-9.5, Y, 740.5], yaw: -136, pitch: 14 },
    "d3-hyperdrive-aft": { pos: [13, Y, 748.5], yaw: 30, pitch: 10 },
  },
  shell: {
    panelW: 3.0,
    rows: [0, 0.4, 2.05, 2.27, 5, 9, 14, 20, 27.45, 28],
    wallColor: IMP.impMid,
    wallAlt: new THREE.Color("#474b52"), // between mid and dark: impDark rows showed the panel map's smudges as stains
    stripMat: "emitAmber",
    // same deck tint as the reactor catwalk (0x7a7e86): the deck map is charcoal, so impMid reflected
    // ~1 % of the light and read as black under 28 m of air even from 400 cd floods
    floor: { color: 0x7a7e86 },
    ceiling: { channels: 6, axis: "z", color: IMP.impDark, panelW: 4 },
    lights: false,
    doorDressing: { accent: "emitBlue" },
    serviceBand: { y: 3.4, faces: ["e", "w"] },
  },
  detail(ctx, shell, room) {
    const { kit, PALETTE } = ctx;
    const P = (k) => col(PALETTE, k);
    const black = P("impBlack");
    const dark = P("impDark");
    const mid = P("impMid");
    const steel = P("steel");
    let seed = 500;
    // Animated emitters (one extra mesh, see engctl/anim.js) — the charge sequence: every 12 s the six
    // field-coil rings light fore→aft over 6 s (CHARGE), an energy bead runs along the hull slot strips
    // with the travelling blue light (BEAD), the housing disc and its step rings pulse during the hold
    // (BURST), then everything resets; the coil-bank amber lines flicker faintly (FAINT). The kit's static
    // emitBlue and emitWhite pieces are folded into the same mesh, re-capped (blue 1.1, white 0.95: the
    // shared fallbacks at 1.6 / 1.3 clipped the end-cap rings and the high-bay faces to white bars).
    // Every fixture face (ceiling panels, wall floods, the hull service lamps) is FACE: a steady 0.9
    // emitter shaped by the diffuser map, so a panel peaks at ~88 % and falls off toward its bezel.
    const BLUE = IMP.impBlue;
    const AMBER = IMP.impAmber;
    const WHITE = new THREE.Color("#dfe9ff");
    const WARM = new THREE.Color("#fff0dc");
    const LAMP = new THREE.Color("#ffe8d0");
    const FACE = faceKey(0.9);
    // (BEAD peaks at 1.75 × base at the bead head, BURST at 1.9 × on the pulse crest: the bases keep the
    // steady level ≤ 1.1 so only the moving head / the crest passes the bloom threshold, briefly)
    const SLOT_KEY = animKey(MODE.BEAD, { base: 1.1, aux: [700, 44, 0] });
    const BURST_BLUE = animKey(MODE.BURST, { base: 1.05 });
    const BURST_WHITE = animKey(MODE.BURST, { base: 0.9 });
    // console / pedestal screens: the shared layouts run at 1.1 and their white text clipped in the side
    // view's foreground; room-local clones at 0.95 (same keys, so no extra draw calls)
    for (const k of ["screenImp0", "screenImp1", "screenImp2", "screenImp3"]) {
      if (!ctx.materials[k]) continue;
      ctx.materials[k] = ctx.materials[k].clone();
      ctx.materials[k].emissiveIntensity = 0.95;
    }

    // ---- motivator body, seams, side slots -----------------------------------------------------------
    // hull: matte painted plates (impPanel, roughness 0.62) in 8 bays round × 12 along so the bevels
    // fall on the ribs and seam rings — not paintedMetal: its worn map's roughness sits at 0.4, and under
    // the shadow key the upper port flank mirrored the key toward every port-lane camera as a white
    // band that bloomed over the side view's top-left (GGX at grazing Fresnel; a 3–4 × broader lobe and
    // a dielectric F0 is what takes the band under the bloom threshold together with the key's offset)
    kit.cyl("impPanel", 0, AX, (MZ0 + MZ1) / 2, R, MZ1 - MZ0 + 0.2, "z", { color: dark, segments: 40, uvScale: [8, 12] });
    // hull: seam rings with bolt rows, longitudinal panel seams between the ribs, access hatches
    const onHull = (a, dr) => [Math.cos(a) * (R + dr), AX + Math.sin(a) * (R + dr)];
    for (const z of [708, 712, 716, 724, 728, 736]) {
      kit.cyl("paintedMetal", 0, AX, z, R + 0.04, 0.1, "z", { color: black, segments: 40, open: true });
      for (let k = 0; k < 20; k++) {
        const a = (k / 20) * TAU + Math.PI / 20;
        const [bx, by] = onHull(a, 0.03);
        kit.cyl("metal", bx, by, z + 0.32, 0.06, 0.08, "z", { color: steel, segments: 6, rot: [0, 0, a - Math.PI / 2] });
        kit.cyl("metal", bx, by, z - 0.32, 0.06, 0.08, "z", { color: steel, segments: 6, rot: [0, 0, a - Math.PI / 2] });
      }
    }
    for (const s of [-1, 1]) {
      // slot strips z 700..744: the energy bead runs along them with the charge sequence
      kit.box(SLOT_KEY, s * (R + 0.02), AX, (MZ0 + MZ1) / 2, 0.12, 0.3, MZ1 - MZ0 - 4, { color: BLUE });
      kit.box("paintedMetal", s * (R + 0.01), AX, (MZ0 + MZ1) / 2, 0.14, 0.7, MZ1 - MZ0 - 3.6, { color: black });
    }
    // hull plates: eight shallow longitudinal ribs and eight recessed seam lines between them (the ribs'
    // flat tops share the hull's normal, so they are matte plates too or they streak where the hull did)
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * TAU + Math.PI / 8;
      kit.add("impPanel", new THREE.BoxGeometry(0.5, 0.16, MZ1 - MZ0 - 2), { pos: [Math.cos(a) * (R + 0.02), AX + Math.sin(a) * (R + 0.02), (MZ0 + MZ1) / 2], rot: [0, 0, a - Math.PI / 2], color: black, texel: 0.25 });
      const b = (k / 8) * TAU + Math.PI / 16;
      if (Math.abs(Math.cos(b)) > 0.97) continue; // the side slots run here
      kit.add("paintedMetal", new THREE.BoxGeometry(0.06, 0.03, MZ1 - MZ0 - 2.4), { pos: [Math.cos(b) * (R + 0.005), AX + Math.sin(b) * (R + 0.005), (MZ0 + MZ1) / 2], rot: [0, 0, b - Math.PI / 2], color: black });
    }
    // access hatches: framed dark plates with a latch bar and a status lamp, on the upper hull
    for (const [z, a] of [[704, 1.2], [713, 2.0], [720.5, 0.9], [729, 2.3], [737, 1.1], [744, 1.9], [731.5, 2.7], [739.5, 2.9]]) {
      const [hx, hy] = onHull(a, 0.04);
      const rot = [0, 0, a - Math.PI / 2];
      kit.add("paintedMetal", new THREE.BoxGeometry(1.3, 0.08, 1.0), { pos: [hx, hy, z], rot, color: black, texel: 2.5 });
      const [px, py] = onHull(a, 0.09);
      kit.add("paintedMetal", new THREE.BoxGeometry(1.1, 0.04, 0.8), { pos: [px, py, z], rot, color: mid, texel: 2.5 });
      const [lx, ly] = onHull(a, 0.13);
      kit.add("metal", new THREE.BoxGeometry(0.5, 0.05, 0.06), { pos: [lx, ly, z + 0.3], rot, color: steel });
      kit.add(a > 1.5 ? "emitAmber" : "emitBlue", new THREE.BoxGeometry(0.12, 0.02, 0.05), { pos: [lx, ly, z - 0.3], rot });
    }
    // hull service lamps: housed heads on stand-off brackets along the port lower flank, one just aft
    // of each cradle clamp (the housing view's top-left is this flank at ~7 m and read as a void).
    // Faces are FACE at 0.85 of the hood width (a large dim diffuser inside the hood, not a small
    // 1.3 emitter that bloomed into a 4-ray flare); the 743.5 head (between the 742 coil and the aft
    // cap) throws a spot aft-down onto the housing disc's lower-port quadrant and the deck behind
    // the rail (see the light list) — the other two are faces only. Not 741: there the hood sat
    // inside the coil's forward ring (r 4.73–5.37 at z 741.1) and any aft-going cone hit that ring
    // at < 1 m; not 739: that is forward of the housing camera (z 740.5), so the head left the frame
    // and its cone caught the 738 cradle's black cabling 2 m away as two white streaks.
    for (const z of [709, 725, 743.5]) {
      const [hx, hy] = onHull(3.7, 0.1);
      wallLamp(kit, PALETTE, [hx, hy - 0.12, z], -Math.PI / 2, { w: 0.7, tilt: 1.05, face: 0.85, mat: FACE, faceColor: LAMP });
    }
    // label band behind the forward cap: light painted band with two black pinstripes, a red unit
    // plaque and a white stencil plate on the port flank (toward the door)
    kit.cyl("impPanel", 0, AX, 700.2, R + 0.03, 0.6, "z", { color: col(PALETTE, "impGrey"), segments: 40, open: true, uvScale: [10, 1] });
    for (const z of [699.93, 700.47]) kit.cyl("paintedMetal", 0, AX, z, R + 0.04, 0.05, "z", { color: black, segments: 40, open: true });
    {
      const [px, py] = onHull(2.55, 0.06);
      kit.add("paintedMetal", new THREE.BoxGeometry(1.3, 0.03, 0.42), { pos: [px, py, 700.2], rot: [0, 0, 2.55 - Math.PI / 2], color: col(PALETTE, "impRed") });
      const [qx, qy] = onHull(3.05, 0.06);
      kit.add("impPanel", new THREE.BoxGeometry(1.6, 0.03, 0.4), { pos: [qx, qy, 700.2], rot: [0, 0, 3.05 - Math.PI / 2], color: col(PALETTE, "impWhite"), uv: "keep" });
      for (const dz of [-0.12, 0, 0.12]) kit.add("paintedMetal", new THREE.BoxGeometry(1.2, 0.01, 0.05), { pos: [qx + Math.cos(3.05) * 0.02, qy + Math.sin(3.05) * 0.02, 700.2 + dz], rot: [0, 0, 3.05 - Math.PI / 2], color: black });
    }
    // end caps: stacked discs with an emissive hub; the aft end runs a neck into the wall housing
    const cap = (z, dir) => {
      kit.cyl("paintedMetal", 0, AX, z + dir * 0.4, R + 0.3, 0.8, "z", { color: mid, segments: 40, texel: 0.5 });
      kit.cyl("paintedMetal", 0, AX, z + dir * 1.05, 3.6, 0.5, "z", { color: dark, segments: 32 });
      kit.cyl("paintedMetal", 0, AX, z + dir * 1.55, 2.4, 0.5, "z", { color: black, segments: 32 });
      kit.cyl("emitBlue", 0, AX, z + dir * 1.35, 3.0, 0.08, "z", { segments: 32, open: true });
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * TAU;
        kit.cyl("metal", Math.cos(a) * 4.2, AX + Math.sin(a) * 4.2, z + dir * 0.85, 0.12, 0.1, "z", { color: steel, segments: 8 });
      }
    };
    cap(MZ0 - 0.1, -1);
    cap(MZ1 + 0.1, 1);
    kit.cyl("paintedMetal", 0, AX, MZ0 - 2.1, 1.3, 0.6, "z", { color: dark, segments: 24 });
    kit.cyl("emitBlue", 0, AX, MZ0 - 2.43, 0.9, 0.14, "z", { segments: 24 });
    kit.cyl("paintedMetal", 0, AX, (MZ1 + 1.7 + Z1 - 0.62) / 2, 3.0, Z1 - 0.62 - (MZ1 + 1.7), "z", { color: dark, segments: 32, texel: 0.5 });
    kit.cyl("paintedMetal", 0, AX, MZ1 + 2.1, 3.3, 0.4, "z", { color: black, segments: 32 });

    // ---- field coils: dark tori with a blue inner ring and side lugs -----------------------------------
    // two joints differ: 710 is a doubled coil with 45° lugs, 734 carries a steel sensor collar with
    // red fault lamps and a service cable dropping to the 738 cradle
    for (const [ci, z] of COILS.entries()) {
      const doubled = ci === 1;
      const shrouded = ci === 2;
      const plaque = ci === 3;
      const sensor = ci === 4;
      // inner ring: lights in sequence fore→aft (ring ci comes on at ci seconds of the 12 s cycle);
      // lit level = base, +30 % on the arrival flash only (at 1.6 the lit rings clipped pale in the
      // door view's top-left)
      const chargeKey = animKey(MODE.CHARGE, { phase: ci / 6, base: doubled ? 1.05 : 1.15 });
      // coil casing: matte painted segments (impPanel — dielectric, roughness 0.62 — in 4 m tiles), not
      // paintedMetal: the worn-metal map's roughness sits at 0.4, and a torus under a 2000 cd high-bay
      // mirrored it toward every floor camera as a clipped, bloomed streak along its crown
      ring(kit, "impPanel", [0, AX, z], 5.2, 0.5, "z", { radial: 10, tubular: 40, color: dark, texel: 0.25 });
      ring(kit, chargeKey, [0, AX, z], 4.62, 0.09, "z", { radial: 6, tubular: 40, color: doubled ? AMBER : BLUE });
      if (shrouded) {
        // maintenance shroud: light canvas cover over the top 150° of the ring, cinched by black straps,
        // amber tag at the port edge
        const g = new THREE.CylinderGeometry(5.95, 5.95, 1.5, 40, 1, true, Math.PI - 1.31, 2.62);
        kit.add("impPanel", g, { pos: [0, AX, z], rot: [Math.PI / 2, 0, 0], color: col(PALETTE, "impGrey"), uv: "scale", uvScale: [6, 1] });
        for (const dz of [-0.55, 0.55]) {
          const sg = new THREE.CylinderGeometry(5.98, 5.98, 0.1, 40, 1, true, Math.PI - 1.31, 2.62);
          kit.add("paintedMetal", sg, { pos: [0, AX, z + dz], rot: [Math.PI / 2, 0, 0], color: black });
        }
        for (const a of [Math.PI / 2 - 1.31, Math.PI / 2 + 1.31]) {
          kit.box("paintedMetal", Math.cos(a) * 5.95, AX + Math.sin(a) * 5.95, z, 0.12, 0.3, 1.6, { color: black, rot: [0, 0, a] });
        }
        kit.box("emitAmber", Math.cos(Math.PI / 2 + 1.25) * 6.0, AX + Math.sin(Math.PI / 2 + 1.25) * 6.0, z + 0.85, 0.3, 0.16, 0.02, { rot: [0, 0, Math.PI / 2 + 1.25] });
      }
      if (plaque) {
        // red service plaque bolted to the port side of the ring at eye-catching height, white label
        for (const [a, dz] of [[2.35, 0.55], [2.35, -0.55]]) {
          kit.box("paintedMetal", Math.cos(a) * 5.75, AX + Math.sin(a) * 5.75, z + dz, 1.1, 0.06, 0.7, { color: col(PALETTE, "impRed"), rot: [0, 0, a - Math.PI / 2] });
          kit.box("impPanel", Math.cos(a) * 5.79, AX + Math.sin(a) * 5.79, z + dz, 0.8, 0.02, 0.22, { color: col(PALETTE, "impWhite"), rot: [0, 0, a - Math.PI / 2], uv: "keep" });
        }
        kit.box("emitRedImp", Math.cos(2.35) * 5.79, AX + Math.sin(2.35) * 5.79, z, 0.24, 0.02, 0.1, { rot: [0, 0, 2.35 - Math.PI / 2] });
      }
      ring(kit, "paintedMetal", [0, AX, z], 5.7, 0.08, "z", { radial: 6, tubular: 40, color: black });
      if (doubled) {
        for (const dz of [-0.75, 0.75]) ring(kit, "impPanel", [0, AX, z + dz], 5.05, 0.32, "z", { radial: 8, tubular: 40, color: black, texel: 0.25 });
        for (let k = 1; k < 8; k += 2) {
          const a = (k / 8) * TAU;
          kit.box("paintedMetal", Math.cos(a) * 5.35, AX + Math.sin(a) * 5.35, z, 0.7, 0.7, 1.1, { color: black, rot: [0, 0, a], texel: 2.5 });
        }
      }
      if (sensor) {
        ring(kit, "metal", [0, AX, z + 0.9], 5.45, 0.16, "z", { radial: 8, tubular: 40, color: steel });
        for (let k = 0; k < 8; k++) {
          const a = (k / 8) * TAU + Math.PI / 8;
          kit.box("paintedMetal", Math.cos(a) * 5.45, AX + Math.sin(a) * 5.45, z + 0.9, 0.3, 0.3, 0.4, { color: black, rot: [0, 0, a] });
          kit.box("emitRedImp", Math.cos(a) * 5.45, AX + Math.sin(a) * 5.45, z + 1.11, 0.12, 0.12, 0.01, { rot: [0, 0, a] });
        }
        pipe(kit, PALETTE, [-5.5, AX - 0.8, z + 0.9], [-3.0, Y + 3.9, 738 - 1.2], 0.06, { bracket: 0, color: black });
      }
      for (const s of [-1, 1]) {
        kit.box("paintedMetal", s * 5.4, AX, z, 0.9, 1.4, 1.3, { color: black, texel: 2.5 });
        // lug lamps charge with their ring (the sensor coil's stay red and steady)
        if (sensor) kit.box("emitRedImp", s * 5.87, AX, z, 0.03, 0.6, 0.5);
        else kit.box(chargeKey, s * 5.87, AX, z, 0.03, 0.6, 0.5, { color: doubled ? AMBER : BLUE });
      }
    }

    // ---- cradles: base, saddle, diagonal struts, clamp ring, hazard border -----------------------------
    for (const z of CRADLES) {
      kit.boxMM("paintedMetal", [-6, Y, z - 1.9], [6, Y + 1.4, z + 1.9], { color: dark, texel: 2.5 });
      kit.boxMM("paintedMetal", [-6.1, Y, z - 2.0], [6.1, Y + 0.25, z + 2.0], { color: black });
      kit.boxMM("paintedMetal", [-3.2, Y + 1.4, z - 1.5], [3.2, Y + 4.0, z + 1.5], { color: black, texel: 2.5 });
      for (const s of [-1, 1]) {
        strut(kit, "paintedMetal", [s * 5.4, Y + 1.4, z], [s * 4.0, Y + 7.0, z], 0.5, 0.6, { color: dark });
        kit.box("emitAmber", s * 6.02, Y + 0.5, z, 0.03, 0.06, 3.0);
        indicatorField(placer(kit, [s * 6.03, Y + 1.0, z], s > 0 ? Math.PI / 2 : -Math.PI / 2), 0, 0, 0, 1.6, 0.3, seed++);
        // cabling: from the neighbouring coil lugs down to junction boxes on the cradle base
        for (const dz of [-4, 4]) {
          const foot = [s * 5.0, Y + 1.4, z + dz * 0.4];
          kit.box("paintedMetal", foot[0], foot[1] + 0.2, foot[2], 0.5, 0.4, 0.5, { color: black });
          kit.box(dz < 0 ? "emitGreen" : "emitAmber", foot[0], foot[1] + 0.3, foot[2] + (s > 0 ? 0.256 : -0.256), 0.1, 0.04, 0.01);
          pipe(kit, PALETTE, [s * 5.4, AX - 0.72, z + dz], [foot[0], foot[1] + 0.4, foot[2]], 0.06, { bracket: 0, color: black });
          pipe(kit, PALETTE, [s * 5.25, AX - 0.72, z + dz + (dz < 0 ? 0.5 : -0.5)], [foot[0] - s * 0.15, foot[1] + 0.4, foot[2] + (dz < 0 ? 0.15 : -0.15)], 0.045, { bracket: 0, color: dark });
        }
      }
      // clamp ring: matte painted like the coil casings (the 706 clamp sits 11 m under the shadow key)
      ring(kit, "impPanel", [0, AX, z], 4.9, 0.35, "z", { radial: 8, tubular: 40, color: mid, texel: 0.25 });
      hazardStrip(kit, [-6.7, z - 2.6], [6.7, z - 2.0], Y + 0.005);
      hazardStrip(kit, [-6.7, z + 2.0], [6.7, z + 2.6], Y + 0.005);
      hazardStrip(kit, [-6.7, z - 2.0], [-6.1, z + 2.0], Y + 0.005);
      hazardStrip(kit, [6.1, z - 2.0], [6.7, z + 2.0], Y + 0.005);
      kit.collider([-6.1, Y, z - 2.0], [6.1, Y + 4, z + 2.0], "cradle");
    }

    // ---- top gantry: deck on the cylinder crown, rails, bridge to the stair tower ----------------------
    const GZ0 = 698.5;
    const GZ1 = 745.5;
    kit.boxMM("impFloor", [-1, GANTRY - 0.2, GZ0], [1, GANTRY, GZ1], { color: mid, texel: 0.5 });
    kit.boxMM("paintedMetal", [-1.05, GANTRY - 0.5, GZ0], [-0.85, GANTRY - 0.2, GZ1], { color: black });
    kit.boxMM("paintedMetal", [0.85, GANTRY - 0.5, GZ0], [1.05, GANTRY - 0.2, GZ1], { color: black });
    for (const z of [700, 706, 714, 722, 730, 738, 744]) kit.boxMM("paintedMetal", [-0.35, AX + R - 0.05, z - 0.3], [0.35, GANTRY - 0.2, z + 0.3], { color: dark });
    rail(kit, PALETTE, [-1, GANTRY, GZ0], [-1, GANTRY, GZ1], GANTRY);
    rail(kit, PALETTE, [1, GANTRY, 700.1], [1, GANTRY, GZ1], GANTRY);
    rail(kit, PALETTE, [-1, GANTRY, GZ0], [1, GANTRY, GZ0], GANTRY);
    rail(kit, PALETTE, [-1, GANTRY, GZ1], [1, GANTRY, GZ1], GANTRY);
    kit.boxMM("emitWhite", [-0.9, GANTRY + 0.005, GZ0 + 0.3], [-0.86, GANTRY + 0.012, GZ1 - 0.3]);
    kit.boxMM("emitWhite", [0.86, GANTRY + 0.005, GZ0 + 0.3], [0.9, GANTRY + 0.012, GZ1 - 0.3]);
    // gantry light masts: post + crossbar with two hooded heads aimed down at the hull (the blue-white
    // key lights sit just under them)
    // (masts sit between coils: a key light straight over a coil torus put a clipped specular streak
    // on its crown that read as a blown lamp)
    for (const z of [714, 730]) {
      kit.box("paintedMetal", 0, GANTRY + 1.3, z, 0.14, 2.6, 0.14, { color: black });
      kit.box("paintedMetal", 0, GANTRY + 2.55, z, 2.6, 0.12, 0.14, { color: black });
      for (const s of [-1, 1]) wallLamp(kit, PALETTE, [s * 0.85, GANTRY + 2.08, z], s > 0 ? Math.PI / 2 : -Math.PI / 2, { w: 0.7, tilt: 1.0, mat: "emitBlue", face: 0.55 });
    }
    // fixture row along the gantry: small hooded lamps on the outside of both rails between the masts
    for (const z of [703, 718, 728, 743]) for (const s of [-1, 1]) wallLamp(kit, PALETTE, [s * 1.05, GANTRY + 0.75, z], s > 0 ? Math.PI / 2 : -Math.PI / 2, { w: 0.6, tilt: 1.1, face: 0.7 });
    // bridge from the gantry to the tower's top landing
    kit.boxMM("impFloor", [1, GANTRY - 0.2, 698.5], [6.4, GANTRY, 700.1], { color: mid, texel: 0.5 });
    kit.boxMM("paintedMetal", [1, GANTRY - 0.5, 698.5], [6.4, GANTRY - 0.2, 698.7], { color: black });
    kit.boxMM("paintedMetal", [1, GANTRY - 0.5, 699.9], [6.4, GANTRY - 0.2, 700.1], { color: black });
    rail(kit, PALETTE, [1, GANTRY, 698.5], [6.4, GANTRY, 698.5], GANTRY);
    rail(kit, PALETTE, [1, GANTRY, 700.1], [6.4, GANTRY, 700.1], GANTRY);
    strut(kit, "paintedMetal", [6.4, Y + 0.3, 699.3], [3.7, GANTRY - 0.5, 699.3], 0.3, 0.3, { color: dark });

    // ---- switchback stair tower (x 6.4..9.9, z 696.9..704.6), four flights of 3.5 m -------------------
    const TX0 = 6.4;
    const TX1 = 9.9;
    const flight = (x, y, z, yaw) => stairs(kit, PALETTE, [x, y, z], yaw, { rise: 3.5, run: 4.5, w: 1.4 });
    const landing = (y, z0, z1) => kit.boxMM("impFloor", [TX0, y - 0.2, z0], [TX1, y, z1], { color: mid, texel: 0.5 });
    flight(7.1, Y, 696.9, 0);
    landing(Y + 3.5, 701.4, 703.0);
    flight(9.2, Y + 3.5, 703.0, Math.PI);
    landing(Y + 7.0, 696.9, 698.5);
    flight(7.1, Y + 7.0, 698.5, 0);
    landing(Y + 10.5, 703.0, 704.6);
    flight(9.2, Y + 10.5, 704.6, Math.PI);
    landing(GANTRY, 698.5, 700.1);
    for (const [x, z] of [[TX0, 696.7], [TX1, 696.7], [TX0, 704.8], [TX1, 704.8]]) {
      kit.boxMM("paintedMetal", [x - 0.15, Y, z - 0.15], [x + 0.15, GANTRY + 0.6, z + 0.15], { color: dark, texel: 2.5 });
      kit.collider([x - 0.2, Y, z - 0.2], [x + 0.2, Y + 3, z + 0.2], "tower");
    }
    kit.boxMM("paintedMetal", [TX0 - 0.15, GANTRY + 0.4, 696.55], [TX1 + 0.15, GANTRY + 0.6, 704.95], { color: dark });
    kit.boxMM("paintedMetal", [TX0 - 0.15, Y + 0.1, 704.55], [TX1 + 0.15, Y + 0.3, 704.95], { color: black });
    // landing rails on the open edges
    const R1 = Y + 3.5;
    const R2 = Y + 7.0;
    const R3 = Y + 10.5;
    rail(kit, PALETTE, [TX0, R1, 703.0], [8.5, R1, 703.0], R1);
    rail(kit, PALETTE, [TX0, R1, 701.4], [TX0, R1, 703.0], R1);
    rail(kit, PALETTE, [TX1, R1, 701.4], [TX1, R1, 703.0], R1);
    rail(kit, PALETTE, [TX0, R2, 696.9], [TX1, R2, 696.9], R2);
    rail(kit, PALETTE, [TX0, R2, 696.9], [TX0, R2, 698.5], R2);
    rail(kit, PALETTE, [TX1, R2, 696.9], [TX1, R2, 698.5], R2);
    rail(kit, PALETTE, [TX0, R3, 704.6], [TX1, R3, 704.6], R3);
    rail(kit, PALETTE, [TX0, R3, 703.0], [TX0, R3, 704.6], R3);
    rail(kit, PALETTE, [TX1, R3, 703.0], [TX1, R3, 704.6], R3);
    rail(kit, PALETTE, [TX0, GANTRY, 698.5], [TX1, GANTRY, 698.5], GANTRY);
    rail(kit, PALETTE, [TX1, GANTRY, 698.5], [TX1, GANTRY, 700.1], GANTRY);
    rail(kit, PALETTE, [TX0, GANTRY, 700.1], [8.5, GANTRY, 700.1], GANTRY);
    hazardStrip(kit, [TX0 - 0.1, 696.2], [TX1 + 0.1, 696.55], Y + 0.005);

    // ---- coil banks along both walls (finned, amber glow between fins) + power trunks ----------------
    for (const s of [-1, 1]) {
      for (let k = 0; k < 7; k++) {
        const zc = 698.5 + k * 8;
        const cx = s * 22;
        // (base, top cap and corner posts are matte impPanel like the fins: their aisle faces sit on the
        // same grazing line of sight from the side camera and mirrored the ceiling fixtures as bloomed
        // white streaks when they were paintedMetal)
        kit.boxMM("impPanel", [cx - 3.2, Y, zc - 2.7], [cx + 3.2, Y + 0.4, zc + 2.7], { color: black, texel: 0.25 });
        // dark core with thick fins; the heat glow is a thin amber line recessed in each fin gap
        kit.boxMM("paintedMetal", [cx - 2.6, Y + 0.4, zc - 2.3], [cx + 2.6, Y + 8.8, zc + 2.3], { color: dark, texel: 2.5 });
        // the heat lines flicker faintly (0.9–1.0), each bank on its own phase
        const faint = animKey(MODE.FAINT, { phase: (k + (s > 0 ? 7 : 0)) / 14, base: 1.5 });
        for (let i = 0; i < 9; i++) {
          const fy = Y + 1.0 + i * 0.9;
          // fins: matte impPanel (roughness 0.62), not paintedMetal (0.4). The side camera stands 2 m
          // off the port bank faces and sees the fin fronts 20–35 m down the wall at a 4–6° grazing
          // angle, where Fresnel turns the 0.4 finish into a mirror for the 600 cd fixture behind
          // them: every fin front became a 70 % white bar (the critic's "rack face 60 % white wash").
          kit.boxMM("impPanel", [cx - 3.0, fy, zc - 2.5], [cx + 3.0, fy + 0.36, zc + 2.5], { color: mid, texel: 0.25 });
          if (i < 8) kit.boxMM(faint, [cx - 2.62, fy + 0.58, zc - 2.32], [cx + 2.62, fy + 0.68, zc + 2.32], { color: AMBER });
        }
        kit.boxMM("impPanel", [cx - 3.2, Y + 8.8, zc - 2.7], [cx + 3.2, Y + 9.3, zc + 2.7], { color: black, texel: 0.25 });
        // rack frame: four corner posts and a name plate, so the amber lines sit on a visible rack
        for (const [px, pz] of [[cx - 3.05, zc - 2.55], [cx + 3.05, zc - 2.55], [cx - 3.05, zc + 2.55], [cx + 3.05, zc + 2.55]]) kit.box("impPanel", px, Y + 4.6, pz, 0.24, 8.4, 0.24, { color: black, texel: 0.25 });
        kit.box("impPanel", cx - s * 2.615, Y + 0.72, zc, 0.03, 0.3, 1.2, { color: mid, uv: "keep" });
        kit.box(k % 2 ? "emitGreen" : "emitBlue", cx - s * 2.64, Y + 0.72, zc - 0.75, 0.01, 0.06, 0.16);
        kit.cyl("paintedMetal", cx - s * 1.0, Y + 9.6, zc, 0.55, 0.6, "y", { color: black, segments: 12 });
        kit.box("emitBlue", cx - s * 3.23, Y + 0.65, zc, 0.02, 0.06, 4.0);
        pipe(kit, PALETTE, [cx - s * 1.0, Y + 9.9, zc], [s * 2.6, AX + 3.4, zc], 0.3, { bracket: 4, color: dark, mat: "paintedMetal" });
        kit.collider([cx - 3.2, Y, zc - 2.7], [cx + 3.2, Y + 9.3, zc + 2.7], "coil");
      }
      // service lane behind the banks: wall cabinets in the gaps, a cable tray, vertical feeders
      for (const zc of [702.5, 718.5, 734.5]) cabinet(kit, PALETTE, [s * (X1 - 0.28), Y, zc], s > 0 ? -Math.PI / 2 : Math.PI / 2, { seed: seed++, emit: "emitAmber" });
      for (const zc of [710.5, 726.5, 742.5]) valveStation(kit, PALETTE, [s * (X1 - 0.05), Y, zc], s > 0 ? -Math.PI / 2 : Math.PI / 2);
      cableTray(kit, PALETTE, [s * (X1 - 0.5), Y + 10.5, 694], [s * (X1 - 0.5), Y + 10.5, Z1 - 1.5], { w: 0.8, cables: 4 });
      for (let k = 0; k < 7; k++) pipe(kit, PALETTE, [s * (X1 - 0.5), Y + 10.4, 698.5 + k * 8], [s * 25.2, Y + 9.0, 698.5 + k * 8], 0.12, { bracket: 3, color: black });
      for (const zc of [706, 722, 738]) ventGrille(kit, PALETTE, [s * X1, Y + 12.5, zc], s > 0 ? -Math.PI / 2 : Math.PI / 2, { w: 2.0, h: 0.8 });
      for (const zc of [700, 730, 746]) junctionBox(kit, PALETTE, [s * X1, Y + 11.4, zc], s > 0 ? -Math.PI / 2 : Math.PI / 2, { seed: seed++ });
      // big housed floods at 12 m on each long wall, aimed down at the racks and the lane (only the port
      // aft one carries a fill point; the rest are fixtures only — see the light list)
      for (const zc of [703, 719, 735]) wallLamp(kit, PALETTE, [s * X1, Y + 12, zc], s > 0 ? -Math.PI / 2 : Math.PI / 2, { w: 2.2, tilt: 0.9, face: 0.8, mat: FACE, faceColor: WARM });
    }

    // ---- floor: consoles facing the motivator, rails with openings, safety lines --------------------
    // four console stations per side facing the motivator, each fed by a floor cable duct from its bank
    for (const [zi, z] of [706, 714, 730, 738].entries()) {
      for (const s of [-1, 1]) {
        const mat = ["screenImp1", "screenImp0", "screenImp3", "screenImp1"][(zi + (s > 0 ? 2 : 0)) % 4];
        consoleProp(kit, PALETTE, [s * 11.5, Y, z], (s * Math.PI) / 2, { w: 3, screens: 3, seed: seed++, screenMat: mat });
        topScreens(kit, [s * 11.5, Y, z], (s * Math.PI) / 2, 3, [zi % 2 ? "screenImp3" : "screenImp0", "screenImp1"]);
        kit.boxMM("paintedMetal", [Math.min(s * 12.0, s * 18.7), Y, z - 0.2], [Math.max(s * 12.0, s * 18.7), Y + 0.08, z + 0.2], { color: black, texel: 2.5 });
        kit.boxMM("paintedMetal", [Math.min(s * 12.2, s * 18.5), Y + 0.08, z - 0.12], [Math.max(s * 12.2, s * 18.5), Y + 0.1, z + 0.12], { color: mid });
      }
    }
    for (const s of [-1, 1]) {
      labelCrate(kit, PALETTE, [s * 14.6, Y, 722], s * 0.15, { seed: seed++ });
      labelCrate(kit, PALETTE, [s * 14.6, Y + 1.2, 722], -s * 0.1, { seed: seed++, w: 1.0, d: 1.0, h: 0.8 });
      labelCrate(kit, PALETTE, [s * 13.4, Y, 720.6], s * 0.4, { seed: seed++, w: 0.9, d: 0.9, h: 0.9 });
    }
    labelCrate(kit, PALETTE, [12.5, Y, 744.3], -0.2, { seed: seed++ });
    tank(kit, PALETTE, [13.9, Y, 743.4], 0.3, { r: 0.55, h: 1.3, emit: "emitAmber" });
    for (const [a, b] of [[697, 711], [717, 727], [733, 747]]) rail(kit, PALETTE, [-8, Y, a], [-8, Y, b], Y);
    for (const [a, b] of [[705.5, 711], [717, 727], [733, 747]]) rail(kit, PALETTE, [8, Y, a], [8, Y, b], Y);
    floorLine(kit, [-7.4, Y, 697], [-7.4, Y, 747], 0.12, "emitOrange");
    floorLine(kit, [7.4, Y, 705.5], [7.4, Y, 747], 0.12, "emitOrange");
    floorLine(kit, [-7.4, Y, 747], [7.4, Y, 747], 0.12, "emitOrange");
    floorLine(kit, [-7.4, Y, 697], [6.4, Y, 697], 0.12, "emitOrange");
    for (const s of [-1, 1]) floorLine(kit, [s * 17.5, Y, 694], [s * 17.5, Y, 750], 0.1, "emitAmber");
    monitorPedestal(kit, PALETTE, [-5, Y, 693.8], Math.PI, { screenMat: "screenImp2" });
    monitorPedestal(kit, PALETTE, [5, Y, 693.8], Math.PI, { screenMat: "screenImp2" });

    // ---- forward wall: power cabinets + cables into a tray, racks, crates in the corners --------------
    const trayY = Y + 12;
    for (const x of [-19.3, -17.3, 17.3, 19.3]) {
      powerCabinet(kit, PALETTE, [x, Y, Z0 + 0.42], 0, { seed: seed++ });
      for (const s of [-1, 1]) pipe(kit, PALETTE, [x + s * 0.35, Y + 2.4, Z0 + 0.42], [x + s * 0.35, trayY + 0.02, Z0 + 0.42], 0.08, { bracket: 4, color: s > 0 ? black : dark });
    }
    cableTray(kit, PALETTE, [-24, trayY, Z0 + 0.42], [24, trayY, Z0 + 0.42], { w: 0.7 });
    for (const x of [-7.2, 7.2]) toolRack(kit, PALETTE, [x, Y, Z0 + 0.06], 0, { w: 1.8, seed: seed++ });
    for (const x of [-12.2, -13.6, 14.0, 15.4]) cabinet(kit, PALETTE, [x, Y, Z0 + 0.28], 0, { seed: seed++, emit: x > 0 ? "emitBlue" : "emitAmber" });
    for (const s of [-1, 1]) {
      labelCrate(kit, PALETTE, [s * 27.6, Y, Z0 + 0.72], s * 0.08, { seed: seed++ });
      labelCrate(kit, PALETTE, [s * 27.6, Y + 1.2, Z0 + 0.72], -s * 0.2, { seed: seed++, w: 1.0, d: 1.0, h: 0.8 });
      labelCrate(kit, PALETTE, [s * 26.9, Y, Z0 + 2.2], s * 0.25, { seed: seed++, w: 1.0, d: 1.0, h: 1.0 });
      junctionBox(kit, PALETTE, [s * 15.5, Y + 3.2, Z0], 0, { seed: seed++ });
      ventGrille(kit, PALETTE, [s * 10, Y + (s > 0 ? 5.5 : 4.4), Z0], 0, { w: 1.6, h: 0.6 });
    }
    // sealed blast shutter in the starboard forward-wall bay: from the aft camera the real blast door
    // hides behind the motivator's forward cradle and this bare bay is what reads as the far exit, so it
    // gets a frame, ribbed leaves, a full-width red lintel bar and a hazard band sized to resolve at 58 m
    {
      const sx = 11.4; // bay clear of the stair tower, which hides wall x < ~9.5 from the aft camera
      kit.boxMM("paintedMetal", [sx - 1.7, Y, Z0], [sx + 1.7, Y + 4.0, Z0 + 0.3], { color: dark, texel: 2.5 });
      kit.boxMM("paintedMetal", [sx - 1.45, Y + 0.05, Z0 + 0.1], [sx + 1.45, Y + 3.7, Z0 + 0.22], { color: black, texel: 2.5 });
      kit.boxMM("paintedMetal", [sx - 0.03, Y + 0.05, Z0 + 0.22], [sx + 0.03, Y + 3.7, Z0 + 0.25], { color: dark });
      for (const y of [1.3, 2.5]) kit.boxMM("paintedMetal", [sx - 1.45, Y + y - 0.05, Z0 + 0.22], [sx + 1.45, Y + y + 0.05, Z0 + 0.26], { color: dark });
      kit.boxMM("hazard", [sx - 1.45, Y + 0.3, Z0 + 0.22], [sx + 1.45, Y + 0.75, Z0 + 0.23], { texel: 2 });
      kit.boxMM("paintedMetal", [sx - 1.7, Y + 4.0, Z0], [sx + 1.7, Y + 4.8, Z0 + 0.14], { color: black, texel: 2.5 });
      kit.boxMM("emitRedImp", [sx - 1.35, Y + 4.25, Z0 + 0.14], [sx + 1.35, Y + 4.55, Z0 + 0.155]);
      for (const x of [-1.55, 1.55]) kit.boxMM("emitAmber", [sx + x - 0.1, Y + 4.25, Z0 + 0.14], [sx + x + 0.1, Y + 4.55, Z0 + 0.155]);
      kit.boxMM("paintedMetal", [sx + 1.42, Y + 1.3, Z0 + 0.3], [sx + 1.62, Y + 1.6, Z0 + 0.34], { color: black });
      kit.boxMM("emitRedImp", [sx + 1.46, Y + 1.5, Z0 + 0.34], [sx + 1.58, Y + 1.54, Z0 + 0.345]);
      hazardStrip(kit, [sx - 1.7, Z0 + 0.32], [sx + 1.7, Z0 + 1.5], Y + 0.006);
      kit.collider([sx - 1.7, Y, Z0], [sx + 1.7, Y + 4.0, Z0 + 0.3], "shutter");
    }
    // big lintel sign over the blast door (seen from the spawn / forward end; the motivator hides it from
    // the aft camera): black plate, blue bar, red squares
    kit.boxMM("paintedMetal", [-2.6, Y + 4.75, Z0], [2.6, Y + 5.55, Z0 + 0.12], { color: black, texel: 2.5 });
    kit.boxMM("emitBlue", [-2.2, Y + 5.05, Z0 + 0.12], [2.2, Y + 5.3, Z0 + 0.135]);
    for (const x of [-2.4, 2.4]) kit.boxMM("emitRedImp", [x - 0.1, Y + 5.05, Z0 + 0.12], [x + 0.1, Y + 5.3, Z0 + 0.135]);
    hazardStrip(kit, [-2.6, Z0 + 0.78], [2.6, Z0 + 1.9], Y + 0.006);
    // door flood over the lintel sign: a wide hood facing into the hall, tilted 17° down at the
    // motivator's forward cap (its spot is in the light list). The cap is the door view's top-left
    // fifth and faces the forward wall, where nothing else can light it: the key sits 8 m aft of the
    // cap plane and the fixtures all hang behind it, so it rendered as a 5 % black disc.
    wallLamp(kit, PALETTE, [0, Y + 8.6, Z0], 0, { w: 1.6, tilt: 0.3, face: 0.8, mat: FACE, faceColor: WARM });
    // door status panels either side of the blast door (hole x −2..2; approach kept clear)
    for (const x of [-3.6, 3.6]) {
      const F = placer(kit, [x, 0, Z0], 0);
      F.box("paintedMetal", 0, Y + 1.5, 0.05, 0.7, 0.9, 0.06, { color: black });
      indicatorField(F, 0, Y + 1.6, 0.09, 0.6, 0.5, seed++);
      F.box(x > 0 ? "emitRedImp" : "emitBlue", 0, Y + 1.16, 0.085, 0.4, 0.06, 0.01);
    }

    // ---- aft wall: bulkhead panel with the recessed housing, tanks in the corners, cabinets ----------
    kit.boxMM("paintedMetal", [-8.2, Y + 0.4, Z1 - 0.65], [8.2, Y + 16.2, Z1 - 0.02], { color: black, texel: 2.5 });
    for (const s of [-1, 1]) {
      kit.boxMM("paintedMetal", [s * 8.6 - 0.35, Y + 0.3, Z1 - 0.8], [s * 8.6 + 0.35, Y + 17.4, Z1 - 0.02], { color: dark, texel: 2.5 });
      kit.boxMM("emitAmber", [s * 8.6 - 0.04, Y + 2.0, Z1 - 0.84], [s * 8.6 + 0.04, Y + 15.5, Z1 - 0.82]);
    }
    kit.boxMM("paintedMetal", [-8.95, Y + 16.2, Z1 - 0.8], [8.95, Y + 17.4, Z1 - 0.02], { color: dark, texel: 2.5 });
    kit.boxMM("emitAmber", [-8.4, Y + 16.75, Z1 - 0.84], [8.4, Y + 16.85, Z1 - 0.82]);
    // housing: outer rim, then three stepped layers receding toward the neck, each edged with a blue
    // ring, twelve radial vanes over the steps, and a blue/white glow where the neck enters the wall
    const disc = (r0, r1, z, color, mat = "paintedMetal") => kit.add(mat, new THREE.RingGeometry(r0, r1, 48), { pos: [0, AX, z], rot: [0, Math.PI, 0], color, texel: 2.5 });
    kit.cyl("paintedMetal", 0, AX, Z1 - 0.95, 6.5, 0.6, "z", { color: black, segments: 48, open: true, texel: 2.5 });
    ring(kit, "paintedMetal", [0, AX, Z1 - 1.25], 6.55, 0.22, "z", { radial: 8, tubular: 48, color: mid });
    disc(5.6, 6.5, Z1 - 0.66, dark);
    kit.cyl("paintedMetal", 0, AX, Z1 - 0.79, 5.6, 0.26, "z", { color: black, segments: 48, open: true, texel: 2.5 });
    disc(4.6, 5.62, Z1 - 0.92, dark);
    kit.cyl("paintedMetal", 0, AX, Z1 - 1.05, 4.6, 0.26, "z", { color: black, segments: 48, open: true, texel: 2.5 });
    disc(3.55, 4.62, Z1 - 1.18, mid);
    kit.cyl("paintedMetal", 0, AX, Z1 - 1.31, 3.55, 0.26, "z", { color: black, segments: 48, open: true, texel: 2.5 });
    // (the core disc and the three step rings pulse at the end of each charge sequence)
    disc(3.05, 3.57, Z1 - 1.44, BLUE, BURST_BLUE);
    disc(3.02, 3.14, Z1 - 1.45, WHITE, BURST_WHITE);
    ring(kit, BURST_BLUE, [0, AX, Z1 - 0.72], 6.05, 0.07, "z", { radial: 6, tubular: 48, color: BLUE });
    ring(kit, BURST_BLUE, [0, AX, Z1 - 0.98], 5.1, 0.06, "z", { radial: 6, tubular: 48, color: BLUE });
    ring(kit, BURST_BLUE, [0, AX, Z1 - 1.24], 4.1, 0.06, "z", { radial: 6, tubular: 48, color: BLUE });
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * TAU;
      kit.cyl("metal", Math.cos(a) * 7.1, AX + Math.sin(a) * 7.1, Z1 - 0.71, 0.14, 0.12, "z", { color: steel, segments: 8 });
      if (k % 4 === 0) strut(kit, "paintedMetal", [Math.cos(a) * 3.2, AX + Math.sin(a) * 3.2, Z1 - 1.55], [Math.cos(a) * 6.3, AX + Math.sin(a) * 6.3, Z1 - 0.7], 0.4, 0.3, { color: dark });
      else {
        const vr0 = 3.6;
        const vr1 = 6.3;
        const vm = (vr0 + vr1) / 2;
        kit.add("paintedMetal", new THREE.BoxGeometry(vr1 - vr0, 0.14, 0.42), { pos: [Math.cos(a) * vm, AX + Math.sin(a) * vm, Z1 - 1.12], rot: [0, 0, a], color: black, texel: 2.5 });
      }
    }
    for (const s of [-1, 1]) {
      tank(kit, PALETTE, [s * 27.7, Y, Z1 - 2.05], Math.PI, { r: 1.2, h: 4, emit: "emitBlue" });
      cabinet(kit, PALETTE, [s * 12.4, Y, Z1 - 0.28], Math.PI, { seed: seed++ });
      cabinet(kit, PALETTE, [s * 13.8, Y, Z1 - 0.28], Math.PI, { seed: seed++, emit: "emitAmber" });
      powerCabinet(kit, PALETTE, [s * 20.5, Y, Z1 - 0.42], Math.PI, { seed: seed++ });
      pipe(kit, PALETTE, [s * 20.5 - 0.35, Y + 2.4, Z1 - 0.42], [s * 20.5 - 0.35, Y + 10.35, Z1 - 0.42], 0.08, { bracket: 4, color: black });
      pipe(kit, PALETTE, [s * 20.5 + 0.35, Y + 2.4, Z1 - 0.42], [s * 20.5 + 0.35, Y + 10.35, Z1 - 0.42], 0.08, { bracket: 4, color: dark });
      labelCrate(kit, PALETTE, [s * 16.6, Y, Z1 - 0.72], s * 0.1, { seed: seed++ });
      junctionBox(kit, PALETTE, [s * 10.2, Y + 3.4, Z1], Math.PI, { seed: seed++ });
      cableTray(kit, PALETTE, [s * 9.6, Y + 10.5, Z1 - 0.5], [s * 24, Y + 10.5, Z1 - 0.5], { w: 0.7 });
      // aft wall dressing between the bulkhead ribs and the tanks: two conduit runs on standoff
      // brackets ending in a manifold box, tilted wall screens, vent grilles, a service ladder to the tray
      // (painted, not steel: the port run sits 4 m under the wall-wash spot and its steel finish
      // mirrored the spot as a white bar the housing view saw in the middle of its R wall)
      for (const [py, r, c] of [[Y + 4.6, 0.14, black], [Y + 5.1, 0.1, dark]]) {
        pipe(kit, PALETTE, [s * 9.6, py, Z1 - 0.8], [s * 21.1, py, Z1 - 0.8], r, { bracket: 0, color: c, segments: 10, mat: "paintedMetal" });
      }
      for (const x of [10.6, 14.8, 19.0]) kit.boxMM("paintedMetal", [s * x - 0.12, Y + 4.4, Z1 - 0.8], [s * x + 0.12, Y + 5.3, Z1 - 0.02], { color: dark });
      kit.boxMM("paintedMetal", [Math.min(s * 21.05, s * 21.65), Y + 4.2, Z1 - 1.0], [Math.max(s * 21.05, s * 21.65), Y + 5.5, Z1 - 0.02], { color: black, texel: 2.5 });
      kit.box("emitAmber", s * 21.35, Y + 5.3, Z1 - 1.006, 0.3, 0.05, 0.01);
      for (const [x, m] of [[11.6, "screenImp0"], [15.2, "screenImp3"]]) wallScreen(kit, [s * x, Y + 3.0, Z1 - 0.26], Math.PI, 1.6, 1.0, m, { tilt: 0.25, accent: "emitBlue" });
      for (const x of [12.4, 17.0, 24.6]) ventGrille(kit, PALETTE, [s * x, Y + 7.4, Z1], Math.PI, { w: 1.6, h: 0.7 });
      junctionBox(kit, PALETTE, [s * 23.4, Y + 7.1, Z1], Math.PI, { seed: seed++, w: 0.7, h: 0.6 });
      for (let y = Y + 0.6; y < Y + 10.2; y += 0.35) kit.box("metal", s * 22.1, y, Z1 - 0.3, 0.5, 0.04, 0.04, { color: steel });
      for (const dx of [-0.25, 0.25]) {
        kit.boxMM("metal", [s * 22.1 + dx - 0.03, Y + 0.3, Z1 - 0.33], [s * 22.1 + dx + 0.03, Y + 10.4, Z1 - 0.27], { color: steel });
        for (const y of [Y + 1.5, Y + 4.5, Y + 7.5, Y + 10.0]) kit.boxMM("paintedMetal", [s * 22.1 + dx - 0.05, y - 0.05, Z1 - 0.3], [s * 22.1 + dx + 0.05, y + 0.05, Z1 - 0.02], { color: black });
      }
      kit.collider([s * 22.1 - 0.4, Y, Z1 - 0.4], [s * 22.1 + 0.4, Y + 3, Z1], "ladder");
    }

    // floods on the aft wall around the housing, aimed down the bulkhead: two on the housing plate
    // above the disc rim, two on the wall outside the ribs under the cable tray. The port outer one
    // (x −10.5) carries the wall-wash spot (see the light list); the others are fixtures only. Heights
    // are set by the housing camera (pitch 14°, top edge at 50°): at Y+12.5 / Y+12.8 both port hoods sat
    // just over the frame's top edge, so the 35 %-of-frame R wall was lit by a fixture it never showed;
    // at Y+9 (outer) and Y+11.5 (inner, x ±7.2 so its cheek clears the rim ring) they are in frame.
    for (const x of [-7.2, 7.2]) wallLamp(kit, PALETTE, [x, Y + 11.5, Z1 - 0.65], Math.PI, { w: 2.0, tilt: 1.0, face: 0.8, mat: FACE, faceColor: WARM });
    for (const x of [-10.5, 10.5]) wallLamp(kit, PALETTE, [x, Y + 9.0, Z1], Math.PI, { w: 2.0, tilt: 1.0, face: 0.8, mat: FACE, faceColor: WARM });

    // ---- ceiling: two big ducts along the hall and cross ducts, feeding the coil-bank trays ---------
    for (const s of [-1, 1]) {
      duct(kit, PALETTE, [s * 13, CEIL - 1.0, 692.5], [s * 13, CEIL - 1.0, 749.5], 1.2, 0.8, { color: mid });
      for (const z of [700, 722, 744]) duct(kit, PALETTE, [s * 13.6, CEIL - 1.0, z], [s * (X1 - 0.3), CEIL - 1.0, z], 0.9, 0.6, { color: mid });
    }
    // (the forward cross duct sits over the forward cradle at 706: it carries the shadow-key cluster)
    duct(kit, PALETTE, [-12.4, CEIL - 1.0, 706], [12.4, CEIL - 1.0, 706], 0.9, 0.6, { color: mid });
    duct(kit, PALETTE, [-12.4, CEIL - 1.0, 733], [12.4, CEIL - 1.0, 733], 0.9, 0.6, { color: mid });
    // suspended hall fixtures over the two floor lanes on the cross-duct rhythm: framed housings on
    // 13 m stems hanging just above gantry height, louvred diffuser faces down (FACE: at emitWhite 1.3
    // the three port panels in the side view were flat white rectangles). Their lights sit INSIDE the
    // housings (see the light list). They hang over the lane centres, 9.5 m off the hull flank: at
    // x ±11 the fills were 6.5 m from the flank and mirrored in it as hot streaks in the side and
    // housing views.
    for (const z of [700, 711, 722, 733, 744]) for (const x of [-14, 14]) ceilingFixture(kit, PALETTE, [x, CEIL - 0.02, z], { w: 3.2, d: 1.0, stem: 13, mat: FACE, faceColor: WARM });
    // high-bay clusters: under the three wall-side cross ducts over the coil banks, and under the two
    // central ducts (the only ceiling the floor views see past the motivator). The 706 duct's row spans
    // the forward cradle; its port cluster (x −9, over the port rail) is the room's shadow key.
    for (const z of [700, 722, 744]) for (const s of [-1, 1]) highBay(kit, PALETTE, [s * 23.5, CEIL - 1.3, z], { drop: 1.4 });
    for (const x of [-9, 0, 9]) highBay(kit, PALETTE, [x, CEIL - 1.3, 706], { drop: 1.4 });
    for (const s of [-1, 1]) highBay(kit, PALETTE, [s * 5, CEIL - 1.3, 733], { drop: 1.4 });

    // ---- lights (shell fills off, 14 = 4 spots + 10 points): shadow key over the forward cradle,
    // blue-white keys under the gantry masts, fills inside six of the suspended fixtures, the port aft
    // wall flood, the housing accent (pulses with the disc), the 743.5 service lamp's spot, the aft-wall
    // wash spot and the door flood on the forward cap.
    // The hall is lit by these alone (no studio environment) across 12–24 m of air onto a ~2.5 % deck
    // (≈ 2.5 lx for 20 % grey, 6 lx for 45 %), so the key runs 1800 cd (3 lx on the port lane, ~6 lx on
    // the hull crown 15 m away — a spot lights nothing behind its cone, so its own cluster stays clean)
    // and the fixture lights 300–600 cd, each INSIDE its housing (0.15 m over the face plane: a point
    // hung under a face lit the bezel and louvres to white; inside, every housing face points away from
    // it and the deck gets the same pool) and ≥ 3.6 m off any wall so nothing near them clips. At
    // 3000 cd the key mirrored in the forward coil and the 706 clamp as a bloomed white haze over the
    // side view's top-left; the hull did the same at 1800 until it went matte and the key moved off the
    // axis (see the key).
    // The rig keeps 12 points live and reserves 3 for the door neighbour (the reactor's high-priority
    // core lights take them in every view here), so 9 of these 10 points are live per view: the one
    // dropped is the farthest from that camera (distance / (0.5 + priority)) — the starboard 744
    // fixture in the door and side views, the starboard 711 one in the housing and aft views. -------
    const L = (pos, color, intensity, distance, priority = 0.5) => {
      const d = { type: "point", pos, color, intensity, distance, priority };
      ctx.lights.push(d);
      return d;
    };
    const S = (pos, target, color, intensity, distance, angle, penumbra, priority) => {
      const d = { type: "spot", pos, target, color, intensity, distance, angle, penumbra, priority };
      ctx.lights.push(d);
      return d;
    };
    const FY = fixtureFaceY(CEIL - 0.02, 13) + 0.15; // inside the suspended housings
    // SHADOW KEY: in the port head of the 706 cluster row (x −9, over the port rail; head face y 36.5),
    // aimed at the cradle's port foot (9° toward the axis) with a 49° half-cone: full intensity from the
    // port wall racks to x +5, 70–85 % on the starboard lane. The motivator and its coils cast across the
    // starboard lane, the port rails and consoles cast toward the hull base, the gantry onto the hull
    // crown. Port of the axis rather than over it: with the key straight above the hull, every port-lane
    // camera sat on the mirror direction of the hull's upper port flank (a downlight on a horizontal
    // cylinder always has one), and the flank reflected the key as a bloomed white band; from x −9 the
    // mirror points move down the flank to where the key arrives near-normal, ~6 × dimmer.
    ctx.lights.push({ type: "spot", pos: [-9, CEIL - 3.8, 706], target: [-5, Y, 706.5], color: 0xf4f6ff, intensity: 1800, distance: 64, angle: 0.85, penumbra: 0.5, priority: 1.5, shadow: true });
    L([0, GANTRY + 1.6, 714], 0x8ab0ff, 110, 38, 1.2); // gantry lamps: steady
    L([0, GANTRY + 1.6, 730], 0x8ab0ff, 110, 38, 1.2);
    // six of the ten suspended fixtures carry points, 480 cd → 3 lx on the lane centres 14.6 m down,
    // the key's pool level, so the key still owns the shadows where both reach:
    // – port 711: the side view's rack bank sits 4.8 m off its axis and takes 3 lx on the fins →
    //   ~40 % at the top fins fading to 25 % (the "60 % white wash" the critic saw on that bank was
    //   the wall fill in the fin gap, see below, not this point)
    // – port 733 (over the aft port console pair; ceiling + ducts the door view sees)
    // – port 744 at 600 cd: the housing view's floor behind the rail, the aft wall (its 35 % "R wall"
    //   strip at ~4 lx) and the 742 coil's outer face; the aft view's port rack bank at 742
    // – starboard 700 at 600 cd, priority 1.7 so the aft camera (50 m away) keeps it: the forward
    //   wall it sees past the motivator — the sealed shutter bay at x 11.4 and the wall over it take
    //   1.4–5.5 lx as a wash fading toward the blast door (that wall sat at 8 % lit only by the 711
    //   point's spill), the forward starboard bank's aisle face (5 lx) and the stair tower's upper
    //   flights. It replaces the starboard 703 wall flood, whose wall and fin-top jobs it covers from
    //   15 m at ~2 lx; the hood stays as a fixture.
    // – starboard 711 at 300 cd: the side view's starboard ceiling half (was 5 % black with two
    //   unlit panels) and the starboard lane
    // – starboard 744 at 720 cd: the aft view's foreground deck (its camera stands at x 13, z 748.5
    //   with no other light within 15 m — with the starboard point at 733 that floor sat at 22 %;
    //   at 480 here 24 %) and the starboard aft bank's fins (3 lx)
    L([-14, FY, 711], 0xfff0dc, 480, 40, 1.5);
    L([-14, FY, 733], 0xfff0dc, 480, 40, 1.5);
    L([-14, FY, 744], 0xfff0dc, 600, 42, 1.5);
    L([14, FY, 700], 0xfff0dc, 600, 50, 1.7);
    L([14, FY, 711], 0xfff0dc, 300, 40, 1.0);
    L([14, FY, 744], 0xfff0dc, 720, 40, 1.2);
    // wall flood: 5.5 m off the port wall over the aft coil-bank centreline, level with its hood. It
    // washes the wall behind the aft port banks (8 lx at the hood fading to 3 lx five metres down: the
    // housing view's left edge and the aft view's port bank) and skims the fins' end faces from above.
    // NOT in the 2.6 m fin gaps: there a fill sat 0.8 m from the next bank's end face and lit its fin
    // ends to 70 % white bars — the side view's hot rack. Priority 1.5 keeps it in the aft view's nine.
    // The forward pair went: the port 703 flood's ~1 lx on the near banks' end faces was the last
    // half-stop over the critic's 40 % on the side view's rack (the 711/733 fixtures give them 1 lx),
    // and the starboard one is covered by the 700 fixture above.
    L([-(X1 - 5.5), Y + 12.5, 735], 0xffcf90, 250, 34, 1.5);
    const HOUSING_I = 110;
    const housingLight = L([0, AX + 2, Z1 - 3.5], 0x6a9bff, HOUSING_I, 22, 1.2);
    // port-flank service lamp at 743.5: a 34° spot from just in front of its face, aimed aft-down at
    // the housing disc (25° below horizontal) so its cone washes the disc's lower-port quadrant from
    // 7 m (spots decay at 1.6: ~7.5 lx at 190 cd → ~50 % on the dark step rings, the "coil face" of the
    // housing view; the lower disc measured 26 % mean at 150 cd against 18 % on the unwashed upper
    // half) and its lower half reaches the deck behind the rail (z 747–751, ~2.5 lx). The aft cap's
    // flange (z 746, r 4.5–4.8) is 36–38° off-axis, just outside the cone; the hull flank aft of the
    // head is grazed (≤ 0.1 lx); the hood's cheeks are 36°+ off-axis, its canopy 120°. A point 1 m
    // off the head lit the hood's inside and the coil tube 0.7 m away to a clipped blob with a 4-ray
    // flare; a spot straight down lit only the deck, so the lamp still hit "nothing".
    S([-4.54, AX - 2.68, 743.5], [-4.5, Y + 2, Z1 - 1], 0xffe8d0, 190, 20, 0.6, 0.5, 1.0);
    // aft-wall wash: from the port outer hood (x −10.5, now Y+9 so the hood is in the housing frame),
    // a 40° spot tilted 25° off the wall: the bulkhead 3–6 m under the lamp takes ~1 lx as a fading
    // band (the wall right under the head sits outside the cone — no hot patch), the deck behind the
    // rail (z 745–750) ~8 lx — with the service lamp and the 744 fixture ~13 lx, +0.7 stop on the
    // ~8.5 lx that read 20 % (the deck map is charcoal under its tint). 320 cd, not 400: the spot is
    // 3.5 m nearer the deck than before. The two conduits 4 m under it are black/dark paint.
    S([-10.5, Y + 8.8, Z1 - 0.9], [-10.5, Y, Z1 - 5.0], 0xfff0dc, 320, 26, 0.7, 0.5, 1.3);
    // door flood: from just in front of the hood over the blast door, a 40° half-cone aimed 15° down
    // at the forward cap 5.5 m away (cap plates z 696.1–697.1, r ≤ 4.8 — the hub, the dark disc and the
    // rim inside the cone to within 0.6 m of the top). 60 cd → ~3.5 lx on the cap: the mid rim to
    // ~40 %, the dark disc ~20 %, the black hub ~10 % round its blue ring, which is the "bounce" the
    // door view's top-left needed. The hull body takes nothing (its normals are radial, the lamp sits
    // on the axis height); the cone's lower edge meets the deck at z 698 (~1.5 lx on the cradle base);
    // the gantry end, the lintel sign and the wall behind the hood are outside it, and the door camera
    // (66° off-axis) sees none of it on its own deck.
    S([0, Y + 8.6, Z0 + 0.9], [0, AX - 0.8, MZ0 - 1.4], 0xffe8d0, 60, 16, 0.7, 0.5, 1.2);
    // (the travelling charge light went for the fixture lights: the bead on the slot strip and the
    // coil rings still carry the charge sequence; the descriptors light more of the room)

    const emitters = buildAnimatedEmitters(ctx, { adopt: [["emitBlue", 1.1], ["emitWhite", 0.95]] });

    return {
      update(dt, t) {
        emitters.uniforms.uTime.value = t;
        housingLight.intensity = HOUSING_I * (1 + 1.3 * anim.burst(anim.seq(t)));
      },
    };
  },
});
