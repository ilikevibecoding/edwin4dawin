// Restricted Intelligence Room (ISB). Clean light-grey panels over a black gloss deck, every light
// source red: red wall bands, two red ceiling troughs, a red planet hologram over the central analysis
// table. Encrypted-terminal desks line the west wall, six sealed data vaults with lock wheels and status
// lights the south wall, a records wall the east. The SE corner is an interrogation cell sealed behind
// red containment fields (post-and-rail bays with emitter strips) with a framed keypad door: one
// restraint chair on a stepped plinth under the room's only hard white spot, an interrogation droid
// drifting beside it. ISB stencils (red cells 5, 11, 12) at the door, the vaults and the cell.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { buildShell, roomWalls } from "../../shell.js";
import { wallFrame } from "../../../core/frame.js";
import { console as impConsole, chair, ceilingLight, pointLightDesc, spotLightDesc, walkable, screenArray, wallScreen, alertBeacon, floorDecal, placard, lockers, column } from "../../impKit.js";
import { IMP, NO_SHADOW_KEYS } from "../../../materials/imperial.js";
import { impDecalRect } from "../../../materials/imperialTextures.js";
import { STD } from "../../../config/layout.js";

export function buildIntel(kit, ctx) {
  const { room, floorY: y } = ctx;
  const [x0, z0, x1, z1] = room.box;
  const h = room.h;
  const cx = (x0 + x1) / 2; // -67: the door axis
  const t = STD.wallT;
  const yc = y + h;
  const RED = IMP.red;

  // the black gloss deck as a semi-gloss dielectric with a red-tinted environment. The deck's roughness
  // map has mirror smears (0.01-0.3) that no scalar factor can lift, and they reflect the room
  // environment's ceiling panels and the point lights as blown white tiles right across the red room;
  // the map is remapped in the shader to 0.32-0.6 (seams rougher still), so the plates and boot-polish
  // smears still vary the sheen without any of them going mirror. The sheen itself is the neutral-grey
  // environment map seen at grazing angles, which is most of what a dark floor shows and goes white
  // whatever the base colour (also for a metal: Fresnel), so it is tinted red and dimmed in the same
  // patch — the material's envMapIntensity is inert, three.js drives that uniform from
  // scene.environmentIntensity for every material without an envMap of its own. The red practicals
  // reflect red on their own.
  if (!ctx.mats.isbFloor) {
    const m = ctx.mats.impGlossSoft.clone();
    m.metalnessMap = null;
    m.metalness = 0.0;
    m.roughness = 0.9; // span of the remapped roughness map (see isbFloorPatch)
    m.needsUpdate = true;
    ctx.mats.isbFloor = isbFloorPatch(m, { roughLo: 0.32, tint: 0xff6050, gain: 0.35 });
  }
  buildShell(kit, ctx, ctx.id, room, {
    wall: { pitch: 3.5, tone: IMP.wallLight, toneAlt: IMP.wallMid, bandMat: "lightBandRed", styles: { plain: 0.6, control: 0.12, vent: 0.08, hatch: 0.08, screen: 0.08, niche: 0.04 } },
    ceiling: { lights: false, tone: IMP.trim, panelW: 2.5 },
    floor: { mat: "isbFloor", tone: new THREE.Color("#5a1412"), strip: false, texel: 0.35 },
  });
  const walls = roomWalls(room);

  // ---- central analysis table with a red planet hologram ---------------------------------------------------
  const tx = cx;
  const tz = 615.5;
  {
    const r = 1.5;
    const th = 0.92;
    kit.add("impPaintedMetal", new THREE.CylinderGeometry(r, r + 0.12, th, 32), { pos: [tx, y + th / 2, tz], color: IMP.consoleDark, uv: "scale", uvScale: [4, 1] });
    kit.add("impMetal", new THREE.CylinderGeometry(r + 0.06, r + 0.06, 0.08, 32), { pos: [tx, y + th, tz], color: IMP.steel, uv: "scale", uvScale: [4, 0.2] });
    kit.add("emitRed", new THREE.TorusGeometry(r - 0.08, 0.02, 8, 48), { pos: [tx, y + th + 0.03, tz], rot: [Math.PI / 2, 0, 0] });
    kit.add("darkGloss", new THREE.CylinderGeometry(r - 0.12, r - 0.12, 0.02, 32), { pos: [tx, y + th + 0.02, tz] });
    kit.add("blinkSparse", new THREE.CylinderGeometry(r + 0.001, r + 0.001, 0.12, 32, 1, true), { pos: [tx, y + th - 0.2, tz], uv: "scale", uvScale: [6, 1] });
    kit.collider([tx - r, y, tz - r], [tx + r, y + th, tz + r], "table");
    // four analyst positions: two seated terminals on the north side, two standing readers south
    for (const s of [-1, 1]) {
      impConsole(kit, ctx, [tx + s * 1.3, y, tz - 3.0], Math.PI, { kind: "station", width: 1.2, screens: 2, seed: 210 + s, light: false });
      chair(kit, [tx + s * 1.3, y, tz - 3.7], Math.PI);
    }
    // hologram: red wireframe planet with two orbit rings and a scan band; own materials, three draws
    const wireMat = new THREE.MeshBasicMaterial({ color: 0xff3a2a, wireframe: true, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false });
    const fillMat = new THREE.MeshBasicMaterial({ color: 0xff2a1a, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const beamMat = new THREE.MeshBasicMaterial({ color: 0xff5a40, transparent: true, opacity: 0.09, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const holo = new THREE.Group();
    holo.position.set(tx, y + th + 1.05, tz);
    const planet = new THREE.SphereGeometry(0.62, 22, 14);
    const ringA = new THREE.TorusGeometry(0.92, 0.006, 6, 72);
    ringA.rotateX(Math.PI / 2 - 0.35);
    const ringB = new THREE.TorusGeometry(1.08, 0.006, 6, 72);
    ringB.rotateX(Math.PI / 2 + 0.2);
    ringB.rotateZ(0.4);
    // target markers on the surface: three small tetrahedra riding the planet, merged into the wire mesh
    const wireParts = [planet.toNonIndexed(), ringA.toNonIndexed(), ringB.toNonIndexed()];
    for (let i = 0; i < 3; i++) {
      const m = new THREE.TetrahedronGeometry(0.075);
      const lat = -0.4 + i * 0.5;
      const lon = i * 2.1;
      m.translate(Math.cos(lat) * Math.cos(lon) * 0.66, Math.sin(lat) * 0.66, Math.cos(lat) * Math.sin(lon) * 0.66);
      wireParts.push(m); // polyhedra are already non-indexed
    }
    const wire = new THREE.Mesh(mergeGeometries(wireParts, false), wireMat);
    holo.add(wire);
    const fill = new THREE.Mesh(new THREE.SphereGeometry(0.6, 22, 14), fillMat);
    holo.add(fill);
    const scan = new THREE.Mesh(new THREE.CylinderGeometry(0.64, 0.64, 0.03, 32, 1, true), fillMat);
    holo.add(scan);
    const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.95, r - 0.2, 1.9, 32, 1, true), beamMat);
    cone.position.set(tx, y + th + 0.95, tz);
    ctx.add(cone);
    ctx.add(holo);
    ctx.animate((dt, tm) => {
      wire.rotation.y += dt * 0.22;
      fill.rotation.y = wire.rotation.y;
      scan.position.y = Math.sin(tm * 0.7) * 0.55;
      holo.position.y = y + th + 1.05 + Math.sin(tm * 0.9) * 0.03;
      fillMat.opacity = 0.14 + 0.04 * Math.sin(tm * 4.3);
      wireMat.opacity = 0.46 + 0.06 * Math.sin(tm * 3.1 + 1);
    });
    pointLightDesc(ctx, RED, 2.8, 7, [tx, y + th + 1.4, tz], 2);
    // recessed ceiling projector ring over the table
    kit.cyl("impPaintedMetal", tx, yc - 0.2, tz, 1.3, 0.4, "y", { color: IMP.consoleDark, segments: 32, texel: 1 });
    kit.add("emitRed", new THREE.TorusGeometry(1.0, 0.02, 8, 48), { pos: [tx, yc - 0.41, tz], rot: [Math.PI / 2, 0, 0] });
    kit.cyl("darkGloss", tx, yc - 0.42, tz, 0.45, 0.04, "y", { segments: 24 });
  }

  // ---- west wall: encrypted-terminal desks -------------------------------------------------------------------
  {
    const w = walls.west;
    const { frame } = wallFrame(kit, w.from, w.to, y);
    const px = x0 + t + 1.35;
    for (const [i, z] of [608.4, 611.6, 614.8, 618.0].entries()) {
      impConsole(kit, ctx, [px, y, z], Math.PI / 2, { kind: "station", width: 1.3, screens: 2, seed: 230 + i, light: false });
      chair(kit, [px + 0.85, y, z], Math.PI / 2);
    }
    // cipher readouts over the desks, sealed hatch, red beacon
    screenArray(frame, w.u(610.0), 2.75, 2, 1, 1.4, 0.8, { seed: 241, variants: [2, 2, 0] });
    screenArray(frame, w.u(616.4), 2.75, 2, 1, 1.4, 0.8, { seed: 243, variants: [2, 1, 2] });
    frame.quad("impDecal", w.u(613.2), 2.9, 0.062, 0.5, 0.5, { uvRect: impDecalRect(5) });
    alertBeacon(frame, ctx, w.u(621.5), 3.2, { mat: "emitRed", color: RED, intensity: 0.9, distance: 5 });
    frame.quad("impDecal", w.u(623.5), 1.6, 0.062, 0.7, 0.7, { uvRect: impDecalRect(12) });
    pointLightDesc(ctx, RED, 1.6, 8, [x0 + 2.6, y + 3.2, 613.2], 1);
  }

  // ---- south wall: six sealed data vaults ---------------------------------------------------------------------
  {
    const w = walls.south;
    const { frame } = wallFrame(kit, w.from, w.to, y);
    const zf = z1 - t; // wall face
    const vw = 2.0;
    const vh = 2.7;
    const vd = 0.9;
    const xs = [-79.6, -76.4, -73.2, -70.0, -66.8, -63.6];
    for (const [i, vx] of xs.entries()) {
      const zc = zf - vd / 2;
      kit.box("impPaintedMetal", vx, y + vh / 2, zc, vw, vh, vd, { color: IMP.consoleDark, texel: 1 });
      kit.box("impPaintedMetal", vx, y + 0.07, zc, vw + 0.08, 0.14, vd + 0.06, { color: IMP.trim, texel: 1 });
      kit.box("impPaintedMetal", vx, y + vh + 0.04, zc, vw + 0.08, 0.08, vd + 0.06, { color: IMP.trim, texel: 1 });
      // heavy door: recessed steel slab, four bolt heads, lock wheel with hub, keypad, status lamps
      const zd = zf - vd - 0.004;
      kit.box("impMetal", vx, y + 1.42, zd - 0.02, vw - 0.36, vh - 0.6, 0.06, { color: IMP.gunmetal, texel: 1 });
      for (const [bx, by] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) kit.cyl("impMetal", vx + bx * (vw / 2 - 0.3), y + 1.42 + by * (vh / 2 - 0.45), zd - 0.06, 0.05, 0.03, "z", { color: IMP.steel, segments: 8 });
      kit.add("impMetal", new THREE.TorusGeometry(0.2, 0.025, 8, 24), { pos: [vx + 0.25, y + 1.3, zd - 0.13], color: IMP.steel });
      kit.cyl("impMetal", vx + 0.25, y + 1.3, zd - 0.1, 0.05, 0.12, "z", { color: IMP.steel, segments: 8 });
      for (const [sw, sh] of [[0.4, 0.03], [0.03, 0.4]]) kit.box("impMetal", vx + 0.25, y + 1.3, zd - 0.13, sw, sh, 0.02, { color: IMP.steel });
      kit.box("blinkSparse", vx - 0.45, y + 1.5, zd - 0.056, 0.32, 0.22, 0.01, { uv: "keep" });
      kit.box(i % 3 === 1 ? "emitAmber" : "emitRed", vx - 0.45, y + 1.78, zd - 0.056, 0.32, 0.05, 0.01);
      kit.box("impPaintedMetal", vx - 0.45, y + 1.5, zd - 0.05, 0.4, 0.5, 0.01, { color: IMP.trim, texel: 1 });
      // vault number plate on a light placard
      kit.box("impPaintedMetal", vx, y + vh - 0.42, zd - 0.05, 0.6, 0.36, 0.01, { color: IMP.trim, texel: 1 });
      kit.box("impPanel", vx, y + vh - 0.42, zd - 0.06, 0.52, 0.28, 0.01, { color: IMP.wallLight, uv: "keep" });
      const g = new THREE.PlaneGeometry(0.26, 0.26);
      g.rotateY(Math.PI);
      kit.add("impDecal", g, { pos: [vx, y + vh - 0.42, zd - 0.07], uv: "keep", uvRect: impDecalRect(i % 2 ? 2 : 6) });
      kit.collider([vx - vw / 2 - 0.05, y, zf - vd - 0.15], [vx + vw / 2 + 0.05, y + vh + 0.1, zf], "vault");
    }
    // red seam light along the vault row's top and an ISB roundel placard over the middle
    kit.box("emitRed", (xs[0] + xs[5]) / 2, y + vh + 0.09, zf - vd - 0.035, xs[5] - xs[0] + vw + 0.08, 0.02, 0.01);
    placard(frame, w.u(-71.6), 3.4, 0.7, 4);
    frame.quad("impDecal", w.u(-64.2), 3.4, 0.062, 0.7, 0.7, { uvRect: impDecalRect(5) });
    frame.quad("impDecal", w.u(-79.0), 3.4, 0.062, 0.7, 0.7, { uvRect: impDecalRect(11) });
    floorDecal(kit, -71.6, y, zf - vd - 1.2, 1.1, 12);
    floorDecal(kit, -66.8, y, zf - vd - 1.2, 1.1, 5);
    pointLightDesc(ctx, RED, 1.5, 7, [-76.4, y + 3.1, zf - 1.6], 0);
    pointLightDesc(ctx, RED, 1.5, 7, [-66.8, y + 3.1, zf - 1.6], 0);
  }

  // ---- interrogation cell (SE corner) behind red containment fields ---------------------------------------------
  {
    if (!ctx.mats.isbField) {
      ctx.mats.isbField = makeFieldMaterial();
      NO_SHADOW_KEYS.add("isbField");
    }
    const gx = -60.0; // west field line
    const gz = 617.5; // north field line
    const cellH = 3.2;
    const SILL = 0.35;
    const DOOR = [-56.6, -54.6]; // doorway span in the north line (frame + pocket wall east of it)
    // field wall from -> to: sill rail with a steel nosing, head rail, a post at every bay boundary with
    // emitter strips facing the bays, a scan-line containment field filling each bay (all one mesh)
    const fieldWall = (from, to, bays, tag) => {
      const dx = to[0] - from[0];
      const dz = to[1] - from[1];
      const L = Math.hypot(dx, dz);
      const ux = dx / L;
      const uz = dz / L;
      const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(-uz, ux));
      const at = (along, dy) => [from[0] + ux * along, y + dy, from[1] + uz * along];
      const add = (mat, along, dy, sx, sy, sz, extra = {}) => kit.add(mat, new THREE.BoxGeometry(sx, sy, sz), { pos: at(along, dy), quat: q, ...extra });
      add("impPaintedMetal", L / 2, SILL / 2, L, SILL, 0.24, { color: IMP.trim, texel: 1 });
      add("impMetal", L / 2, SILL + 0.01, L, 0.02, 0.26, { color: IMP.steel });
      add("impPaintedMetal", L / 2, cellH - 0.1, L, 0.2, 0.24, { color: IMP.trim, texel: 1 });
      add("emitRed", L / 2, cellH - 0.205, L - 0.3, 0.01, 0.06);
      const pitch = L / bays;
      const fv = (cellH - 0.2 + SILL) / 2;
      const fh = cellH - 0.2 - SILL;
      for (let i = 0; i <= bays; i++) {
        const a = Math.min(Math.max(i * pitch, 0.1), L - 0.1);
        add("impPaintedMetal", a, cellH / 2, 0.2, cellH, 0.2, { color: IMP.trim, texel: 1 });
        for (const e of [-1, 1]) if ((i > 0 || e > 0) && (i < bays || e < 0)) add("emitRed", a + e * 0.103, fv, 0.006, fh - 0.2, 0.05);
      }
      for (let i = 0; i < bays; i++) kit.add("isbField", new THREE.PlaneGeometry(pitch - 0.24, fh - 0.06), { pos: at((i + 0.5) * pitch, fv), quat: q, uv: "keep" });
      const pad = 0.14;
      kit.collider([Math.min(from[0], to[0]) - pad, y, Math.min(from[1], to[1]) - pad], [Math.max(from[0], to[0]) + pad, y + cellH, Math.max(from[1], to[1]) + pad], tag);
    };
    fieldWall([gx, gz], [gx, z1 - t], 4, "cellField");
    fieldWall([gx, gz], [DOOR[0], gz], 2, "cellField");
    // door: heavy jambs with steel reveals, lintel, header panel with the ISB roundel, red status lamp in a
    // housing over the opening, keypad on the outer jamb; the leaf stands open, slid into the pocket wall
    // east of the frame (its lit leading edge shows in the reveal)
    const dcx = (DOOR[0] + DOOR[1]) / 2;
    const dw = DOOR[1] - DOOR[0];
    for (const jx of [DOOR[0] + 0.15, DOOR[1] - 0.15]) {
      kit.box("impPaintedMetal", jx, y + 1.3, gz, 0.3, 2.6, 0.3, { color: IMP.trim, texel: 1 });
      kit.box("impMetal", jx + (jx < dcx ? 0.15 : -0.15), y + 1.3, gz, 0.02, 2.5, 0.36, { color: IMP.gunmetal });
    }
    kit.box("impPaintedMetal", dcx, y + 2.75, gz, dw, 0.3, 0.3, { color: IMP.trim, texel: 1 });
    kit.box("impMetal", dcx, y + 2.61, gz, dw - 0.6, 0.02, 0.36, { color: IMP.gunmetal });
    kit.box("impPaintedMetal", dcx, y + (2.9 + cellH) / 2, gz, dw, cellH - 2.9, 0.24, { color: IMP.trim, texel: 1 });
    kit.box("impPaintedMetal", dcx + 0.45, y + 3.02, gz - 0.16, 0.7, 0.16, 0.1, { color: IMP.consoleDark, texel: 1 });
    kit.box("emitRed", dcx + 0.45, y + 3.02, gz - 0.215, 0.5, 0.06, 0.01);
    for (const zs of [gz - 0.121, gz + 0.121]) {
      const g = new THREE.PlaneGeometry(0.3, 0.3);
      if (zs > gz) g.rotateY(Math.PI);
      kit.add("impDecal", g, { pos: [dcx - 0.55, y + 3.03, zs + (zs > gz ? 0.002 : -0.002)], uv: "keep", uvRect: impDecalRect(5) });
    }
    kit.box("impPaintedMetal", DOOR[0] + 0.15, y + 1.35, gz - 0.17, 0.16, 0.26, 0.04, { color: IMP.consoleDark, texel: 1 });
    kit.box("blinkSparse", DOOR[0] + 0.15, y + 1.32, gz - 0.192, 0.11, 0.14, 0.006, { uv: "keep" });
    kit.box("emitRed", DOOR[0] + 0.15, y + 1.44, gz - 0.192, 0.08, 0.02, 0.006);
    // pocket wall east of the door (the leaf slides into it): trim frame, dark panel, warning stencil
    const pk = [DOOR[1], x1 - t];
    kit.boxMM("impPaintedMetal", [pk[0], y, gz - 0.12], [pk[1], y + cellH, gz + 0.12], { color: IMP.trim, texel: 1 });
    for (const zs of [gz - 0.125, gz + 0.125]) kit.boxMM("impPanel1", [pk[0] + 0.12, y + SILL, zs - 0.015], [pk[1] - 0.12, y + cellH - 0.2, zs + 0.015], { color: IMP.wallDark, uv: "keep" });
    kit.box("impMetal", pk[0] + 0.1, y + 1.3, gz, 0.2, 2.5, 0.1, { color: IMP.gunmetal });
    kit.box("emitRed", pk[0] + 0.005, y + 1.3, gz, 0.006, 2.3, 0.05);
    // the pocket wall's room face: a restricted-area placard over a cell-status readout
    {
      const px = (pk[0] + pk[1]) / 2;
      const zp = gz - 0.14;
      kit.box("impPaintedMetal", px, y + 2.05, zp - 0.015, 0.84, 0.84, 0.03, { color: IMP.trim, texel: 1 });
      kit.box("impPanel", px, y + 2.05, zp - 0.025, 0.76, 0.76, 0.03, { color: IMP.wallLight, uv: "keep" });
      const g = new THREE.PlaneGeometry(0.6, 0.6);
      g.rotateY(Math.PI);
      kit.add("impDecal", g, { pos: [px, y + 2.05, zp - 0.042], uv: "keep", uvRect: impDecalRect(12) });
      kit.box("impPaintedMetal", px, y + 1.3, zp - 0.02, 0.8, 0.3, 0.04, { color: IMP.consoleDark, texel: 1 });
      kit.box("blinkSparse", px - 0.08, y + 1.3, zp - 0.042, 0.5, 0.16, 0.006, { uv: "keep" });
      kit.box("emitRed", px + 0.28, y + 1.3, zp - 0.042, 0.06, 0.06, 0.006);
    }
    kit.collider([pk[0], y, gz - 0.14], [pk[1], y + cellH, gz + 0.14], "cellPocket");
    kit.collider([DOOR[0], y, gz - 0.15], [DOOR[0] + 0.3, y + cellH, gz + 0.15], "cellJamb");
    kit.collider([DOOR[1] - 0.3, y, gz - 0.15], [DOOR[1], y + cellH, gz + 0.15], "cellJamb");
    floorDecal(kit, dcx, y, gz - 0.9, 0.9, 11);
    floorDecal(kit, dcx, y, gz + 0.9, 0.9, 5, Math.PI);
    // restraint chair on a two-step plinth, facing the door; a reclined seat with head clamp, wrist and
    // ankle clamps, chest straps, and an instrument arm carrying a monitor at the occupant's side
    const chX = -56.0;
    const chZ = 623.2;
    const yP = y + 0.3;
    kit.cyl("impPaintedMetal", chX, y + 0.09, chZ, 1.35, 0.18, "y", { color: IMP.trim, segments: 32, texel: 1 });
    kit.cyl("impPaintedMetal", chX, y + 0.24, chZ, 1.0, 0.12, "y", { color: IMP.consoleDark, segments: 32, texel: 1 });
    kit.add("emitRed", new THREE.TorusGeometry(1.26, 0.015, 6, 48), { pos: [chX, y + 0.185, chZ], rot: [Math.PI / 2, 0, 0] });
    kit.add("emitRed", new THREE.TorusGeometry(0.92, 0.012, 6, 48), { pos: [chX, y + 0.305, chZ], rot: [Math.PI / 2, 0, 0] });
    walkable(ctx, chX - 0.95, chZ - 0.95, chX + 0.95, chZ + 0.95, yP, "plinth");
    kit.box("impPaintedMetal", chX, yP + 0.2, chZ + 0.05, 0.4, 0.4, 0.5, { color: IMP.consoleDark, texel: 1 });
    kit.box("impRubber", chX, yP + 0.45, chZ + 0.02, 0.66, 0.1, 0.64, { color: IMP.rubber });
    kit.box("impFabric", chX, yP + 0.52, chZ, 0.56, 0.05, 0.52, { color: IMP.fabricBlack, uv: "world", texel: 2 });
    const tilt = 0.3;
    const bz = chZ + 0.3;
    kit.add("impPaintedMetal", new THREE.BoxGeometry(0.72, 1.2, 0.08), { pos: [chX, yP + 1.05, bz + 0.2], rot: [tilt, 0, 0], color: IMP.trim, texel: 1 });
    kit.add("impRubber", new THREE.BoxGeometry(0.6, 1.02, 0.08), { pos: [chX, yP + 1.0, bz + 0.13], rot: [tilt, 0, 0], color: IMP.rubber });
    kit.add("impRubber", new THREE.BoxGeometry(0.3, 0.22, 0.1), { pos: [chX, yP + 1.62, bz + 0.31], rot: [tilt, 0, 0], color: IMP.rubber });
    kit.add("impMetal", new THREE.TorusGeometry(0.19, 0.02, 6, 20, Math.PI), { pos: [chX, yP + 1.62, bz + 0.23], rot: [tilt, 0, 0], color: IMP.steel });
    for (const sy of [0.85, 1.15]) kit.add("impRubber", new THREE.BoxGeometry(0.64, 0.05, 0.02), { pos: [chX, yP + sy, bz + 0.08 + (sy - 1.0) * tilt], rot: [tilt, 0, 0], color: IMP.rubber });
    for (const s of [-1, 1]) {
      kit.box("impPaintedMetal", chX + s * 0.42, yP + 0.74, chZ + 0.02, 0.1, 0.06, 0.56, { color: IMP.trim, texel: 1 });
      kit.box("impPaintedMetal", chX + s * 0.42, yP + 0.6, chZ + 0.22, 0.08, 0.3, 0.08, { color: IMP.trim, texel: 1 });
      kit.add("impMetal", new THREE.TorusGeometry(0.07, 0.014, 6, 16), { pos: [chX + s * 0.42, yP + 0.8, chZ - 0.16], rot: [0, Math.PI / 2, 0], color: IMP.steel });
      kit.add("impMetal", new THREE.TorusGeometry(0.085, 0.014, 6, 16), { pos: [chX + s * 0.2, yP + 0.2, chZ - 0.66], rot: [0, Math.PI / 2, 0], color: IMP.steel });
    }
    kit.add("impPaintedMetal", new THREE.BoxGeometry(0.6, 0.06, 0.44), { pos: [chX, yP + 0.14, chZ - 0.6], rot: [-0.5, 0, 0], color: IMP.trim, texel: 1 });
    kit.box("impPaintedMetal", chX, yP + 0.1, chZ - 0.42, 0.12, 0.2, 0.3, { color: IMP.consoleDark, texel: 1 });
    // instrument arm: post on the plinth, cantilever, monitor angled toward the occupant, indicator block
    kit.box("impPaintedMetal", chX + 0.85, yP + 0.55, chZ - 0.2, 0.12, 1.1, 0.12, { color: IMP.trim, texel: 1 });
    kit.box("impMetal", chX + 0.6, yP + 1.12, chZ - 0.2, 0.5, 0.05, 0.05, { color: IMP.gunmetal });
    kit.add("darkGloss", new THREE.BoxGeometry(0.4, 0.28, 0.03), { pos: [chX + 0.4, yP + 1.22, chZ - 0.2], rot: [0, -0.6, 0] });
    kit.add("screen0", new THREE.PlaneGeometry(0.36, 0.24), { pos: [chX + 0.4 - 0.0093, yP + 1.22, chZ - 0.2 + 0.0136], rot: [0, -0.6, 0], uv: "keep" });
    kit.box("blinkSparse", chX + 0.85, yP + 0.5, chZ - 0.262, 0.1, 0.3, 0.006, { uv: "keep" });
    kit.collider([chX - 0.55, yP, chZ - 0.8], [chX + 0.95, yP + 1.9, chZ + 0.6], "restraintChair");
    // interrogation droid: black sphere, sensor band, injector needle — one dark-gloss mesh, drifts and bobs
    const sphere = new THREE.SphereGeometry(0.3, 20, 14);
    const band = new THREE.TorusGeometry(0.31, 0.025, 8, 36);
    band.rotateX(Math.PI / 2);
    const needle = new THREE.CylinderGeometry(0.008, 0.008, 0.34, 6);
    needle.rotateX(Math.PI / 2);
    needle.translate(0.1, -0.08, -0.4);
    const needle2 = new THREE.CylinderGeometry(0.012, 0.012, 0.22, 6);
    needle2.rotateX(Math.PI / 2);
    needle2.translate(-0.12, -0.12, -0.35);
    const lens = new THREE.CylinderGeometry(0.06, 0.08, 0.05, 12);
    lens.rotateX(Math.PI / 2);
    lens.translate(0, 0.06, -0.3);
    const droidGeo = mergeGeometries([sphere.toNonIndexed(), band.toNonIndexed(), needle.toNonIndexed(), needle2.toNonIndexed(), lens.toNonIndexed()], false);
    const droid = new THREE.Mesh(droidGeo, ctx.mats.darkGloss);
    droid.position.set(chX - 1.0, y + 1.55, chZ - 0.9);
    ctx.add(droid);
    const fieldMat = ctx.mats.isbField;
    ctx.animate((dt, tm) => {
      const a = tm * 0.18;
      droid.position.set(chX + Math.cos(a) * 1.15, y + 1.55 + Math.sin(tm * 1.1) * 0.07, chZ - 0.5 + Math.sin(a) * 0.9);
      droid.rotation.y = Math.atan2(chX - droid.position.x, chZ - droid.position.z) + Math.PI;
      fieldMat.opacity = 0.5 + 0.06 * Math.sin(tm * 7.3) + 0.04 * Math.sin(tm * 23.1 + 1.0);
      fieldMat.map.offset.y = (tm * 0.03) % 1;
    });
    // hard white spot with shadow over the chair: the only non-red light in the room
    spotLightDesc(ctx, 0xfff1dc, 9, 9, [chX, yc - 0.3, chZ - 0.3], [chX, y, chZ], { angle: 0.42, penumbra: 0.45, shadow: true, priority: 2 });
    kit.cyl("impPaintedMetal", chX, yc - 0.12, chZ - 0.3, 0.32, 0.24, "y", { color: IMP.trim, segments: 20, texel: 1 });
    kit.cyl("emitWhite", chX, yc - 0.245, chZ - 0.3, 0.2, 0.01, "y", { segments: 20 });
    // inside the cell: a recorder console against the east wall and a cell-feed screen; outside: the observer's station
    const e = walls.east;
    const { frame: ef } = wallFrame(kit, e.from, e.to, y);
    impConsole(kit, ctx, [x1 - t - 0.62, y, 626.0], -Math.PI / 2, { kind: "wall", width: 1.6, seed: 251, light: false });
    ef.quad("impDecal", e.u(621.5), 2.9, 0.062, 0.5, 0.5, { uvRect: impDecalRect(12) });
    wallScreen(ef, e.u(613.5), 3.0, 2.2, 1.2, 2);
    impConsole(kit, ctx, [x1 - t - 0.62, y, 613.5], -Math.PI / 2, { kind: "wall", width: 2.2, seed: 253, light: false });
    lockers(ef, e.u(605.4), e.u(610.2), 2.3, { seed: 255, tone: IMP.wallMid, doorW: 0.8 });
    placard(ef, e.u(607.8), 3.0, 0.5, 3);
    // observer's recording desk and chair outside the glass, facing into the cell
    impConsole(kit, ctx, [gx - 0.95, y, 622.4], -Math.PI / 2, { kind: "station", width: 1.2, screens: 2, seed: 257, light: false });
    chair(kit, [gx - 1.8, y, 622.4], -Math.PI / 2);
    pointLightDesc(ctx, RED, 1.2, 6, [gx - 1.6, y + 3.0, 620.5], 0);
  }

  // ---- north wall: door flanks, ISB stencils, records screens ---------------------------------------------------
  {
    const w = walls.north;
    const { frame } = wallFrame(kit, w.from, w.to, y);
    const ud = w.u(cx);
    frame.quad("impDecal", ud - 2.2, 1.5, 0.062, 0.8, 0.8, { uvRect: impDecalRect(5) });
    frame.quad("impDecal", ud + 2.2, 1.5, 0.062, 0.8, 0.8, { uvRect: impDecalRect(12) });
    frame.quad("impDecal", ud - 2.2, 0.75, 0.062, 0.6, 0.6, { uvRect: impDecalRect(11) });
    frame.quad("impDecal", ud + 2.2, 0.75, 0.062, 0.6, 0.6, { uvRect: impDecalRect(11) });
    placard(frame, ud, 3.55, 0.6, 4);
    alertBeacon(frame, ctx, ud - 4.0, 3.3, { mat: "emitRed", color: RED, intensity: 0.8, distance: 5 });
    alertBeacon(frame, ctx, ud + 4.0, 3.3, { mat: "emitRed", color: RED, intensity: 0 });
    wallScreen(frame, w.u(-76.5), 3.0, 2.0, 1.1, 1);
    wallScreen(frame, w.u(-57.5), 3.0, 2.0, 1.1, 0);
    floorDecal(kit, cx, y, z0 + 2.2, 1.2, 5);
    // columns framing the entry vestibule
    column(kit, cx - 3.6, z0 + 3.6, y, yc, { w: 0.5, d: 0.5, lit: false });
    column(kit, cx + 3.6, z0 + 3.6, y, yc, { w: 0.5, d: 0.5, lit: false });
    for (const s of [-1, 1]) kit.box("emitRed", cx + s * 3.6, y + h / 2, z0 + 3.6 + 0.295, 0.03, h - 0.8, 0.006);
    pointLightDesc(ctx, RED, 1.6, 7, [cx, y + 3.4, z0 + 3.0], 1);
  }

  // ---- ceiling: two long red troughs, transverse beams -----------------------------------------------------------
  {
    for (const s of [-1, 1]) ceilingLight(kit, ctx, [cx + s * 7.5, yc, 616], 20, "z", { mat: "lightBandRed", color: RED, intensity: 2.0, distance: 9, priority: 1, w: 0.3 });
    for (const bz of [609.5, 622.0]) kit.box("impPaintedMetal", cx, yc - 0.22, bz, x1 - x0 - 0.6, 0.44, 0.4, { color: IMP.trim, texel: 1 });
  }

  // ---- camera views -----------------------------------------------------------------------------------------------
  const eye = y + STD.eye;
  ctx.view("intel", cx, eye, z0 + 2.2, 180, -5);
  ctx.view("intel_vaults", -75.5, eye, 618.5, 158, -4);
  ctx.view("intel_cell", -55.8, eye, 614.0, -178, -4);
  ctx.view("intel_desks", -62.0, eye, 610.5, 104, -4);
}

// ISB deck shader patch for a MeshStandardMaterial: (1) the roughness map is remapped to
// roughLo + texel * material.roughness instead of scaling material.roughness, so a near-mirror map
// keeps its plate/smear variation above a floor; (2) the image-based (scene.environment) specular is
// multiplied by `tint * gain`. Chunk includes are expanded here because onBeforeCompile sees the
// directives unresolved. Direct lights are untouched.
function isbFloorPatch(material, { roughLo, tint, gain }) {
  const c = new THREE.Color(tint).multiplyScalar(gain);
  const iblLine = "radiance += getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );";
  const maps = THREE.ShaderChunk.lights_fragment_maps.replace(iblLine, iblLine.slice(0, -1) + " * uEnvTint;");
  const roughLine = "roughnessFactor *= texelRoughness.g;";
  const rough = THREE.ShaderChunk.roughnessmap_fragment.replace(roughLine, "roughnessFactor = uRoughLo + texelRoughness.g * roughness;");
  if (maps === THREE.ShaderChunk.lights_fragment_maps || rough === THREE.ShaderChunk.roughnessmap_fragment) console.warn("isbFloorPatch: shader chunk changed, patch inert");
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uEnvTint = { value: c };
    shader.uniforms.uRoughLo = { value: roughLo };
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform vec3 uEnvTint;\nuniform float uRoughLo;")
      .replace("#include <lights_fragment_maps>", maps)
      .replace("#include <roughnessmap_fragment>", rough);
  };
  material.customProgramCacheKey = () => "isbFloor";
  return material;
}

// Red containment-field material for the cell bays: additive scan lines over a dark red base, scrolled
// and flickered by the room animator (same construction as the detention block's blue fields).
function makeFieldMaterial() {
  const c = document.createElement("canvas");
  c.width = 16;
  c.height = 64;
  const g = c.getContext("2d");
  g.fillStyle = "#2a0507";
  g.fillRect(0, 0, 16, 64);
  g.fillStyle = "#8c1a16";
  for (let v = 0; v < 64; v += 8) g.fillRect(0, v, 16, 2);
  g.fillStyle = "#ff8a72";
  for (let v = 1; v < 64; v += 8) g.fillRect(0, v, 16, 1);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1, 3);
  t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshBasicMaterial({ color: 0xffffff, map: t, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
}
