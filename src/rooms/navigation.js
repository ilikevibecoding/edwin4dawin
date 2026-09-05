// Navigation & Flight Control (deck A): an astrogation pit. A circular well 0.4 m deep sunk into the
// deck holds the star-map projector: a big translucent planet with a lat/long wire overlay, two tilted
// orbit rings and a moon, a starfield of point-glyphs and a plotted hyperlane with a ship glyph moving
// along it. Steps lead down into the well from the door side; two curved navigator desks hug the E and W
// rim with three seats each (star-chart and plot screens angled to the seated navigator); a ring of
// recessed fixtures overhead. The S wall is the chart wall (one big star chart, stacked plot screens, a
// plotting ledge and grid on the deck, the hyperspace jump-lever pedestal); the E and W walls carry
// ranks of framed star-map screens; the astrogation computer column stands by the W wall. Two standing
// chart stations flank the entry lane. Accent amber; hologram blue (holo / holoBright / emitBlueDim).
import * as THREE from "three";
import { PALETTE, setDomain } from "../materials.js";
import { rng } from "../kit.js";
import { impChair, impPillar, impWallGear, impWallLight, lux } from "./imperial_kit.js";
import { IMP_DECAL, impDecalRect } from "../textures_imperial.js";
import { deckASetup, yawToward, yawFrame, station, dataBank, sealedCabinet, wallScreen, indicatorRow, conduitRun, projectorColumn, projectorCone, wireSphereGeometry, wireGraphGeometry, wireDestroyerGeometry, mergedLines, lineSegments, mergedMesh, datapad, cup, helmet, datapadRack, ceilingRingLight, segRailing } from "./deck_a_kit.js";
import { shellNoFloor, deckFloor } from "./deck_d_kit.js";

/** Extruded slab of an XZ shape between y0 and y1 (shape x -> world x, shape y -> world z). */
function slab(kit, mat, shape, y0, y1, opts = {}) {
  const g = new THREE.ExtrudeGeometry(shape, { depth: y1 - y0, bevelEnabled: false, curveSegments: opts.curveSegments || 64 });
  g.rotateX(Math.PI / 2); // (x, y, e) -> (x, -e, y): the shape lies flat, extrusion runs downward
  g.translate(0, y1, 0);
  const { curveSegments, ...rest } = opts;
  return kit.add(mat, g, { pos: [0, 0, 0], ...rest });
}
/** Full annulus r0..r1 about (cx, cz). */
function annulusSlab(kit, mat, cx, cz, r0, r1, y0, y1, opts = {}) {
  const s = new THREE.Shape();
  s.absarc(cx, cz, r1, 0, Math.PI * 2, false);
  const hole = new THREE.Path();
  hole.absarc(cx, cz, r0, 0, Math.PI * 2, true);
  s.holes.push(hole);
  return slab(kit, mat, s, y0, y1, opts);
}
/** Annulus segment r0..r1 from angle a0 to a1 (atan2(z, x) convention, counter-clockwise). */
function arcSlab(kit, mat, cx, cz, r0, r1, a0, a1, y0, y1, opts = {}) {
  const s = new THREE.Shape();
  s.moveTo(cx + Math.cos(a0) * r1, cz + Math.sin(a0) * r1);
  s.absarc(cx, cz, r1, a0, a1, false);
  s.lineTo(cx + Math.cos(a1) * r0, cz + Math.sin(a1) * r0);
  s.absarc(cx, cz, r0, a1, a0, true);
  s.closePath();
  return slab(kit, mat, s, y0, y1, { curveSegments: 48, ...opts });
}

export function buildNavigation(kit, ctx, room) {
  const [w, h, d] = room.size;
  const hx = w / 2;
  const hz = d / 2;
  const M = ctx.materials;
  deckASetup(kit);
  const accentKey = "emitAmber";
  const dimKey = "emitAmberDim";
  const BLUE = "emitBlueDim";
  const amber = new THREE.Color(room.accent || "#ffb347").getHex();
  const WARM = 0xffd9b0; // fixture colour: warm amber-white
  if (!M.deckA_navSlot) {
    // recessed ceiling slot emitter in the room's warm temperature (the dim white slot's level)
    const m = M.emitWhiteDim.clone();
    m.emissive = new THREE.Color("#ffd2a0");
    M.deckA_navSlot = setDomain(m, "interior");
    // single-sided planet globe: the double-sided holo sphere reads as a solid ball
    const g = M.holo.clone();
    g.side = THREE.FrontSide;
    g.name = "deckA_navGlobe";
    M.deckA_navGlobe = g;
  }
  kit.noShadowKeys.add("deckA_navGlobe");

  // ---- the well: geometry ------------------------------------------------------------------------
  const CZ = 2.0; // pit centre z (the rim stays 1 m clear of the QA's 6.6 m spawn walk)
  const R = 3.4; // well radius
  const DEPTH = 0.4;
  const SQ = 3.7; // half-size of the deck cut-out square around the well
  const PIT_Y = -DEPTH;

  // ---- shell without the kit floor; deck plates with the square cut-out, the cut-out filled by a
  // slab with the circular hole (its hole wall is the well wall) -----------------------------------
  const walls = shellNoFloor(kit, room, ctx.doors, {
    accentKey,
    seed: 5150,
    wall: { panelW: 1.35, features: { vent: 0.07, equipment: 0.1, conduit: 0.04, light: 0.0, screen: 0.1 }, altChance: 0.2 },
    walls: { S: { features: { vent: 0.05, equipment: 0.0, conduit: 0.0, light: 0.0, screen: 0.0 }, corniceLight: false } },
    ceiling: { troughs: 2, troughW: 0.5, beamStep: 3.4, lightKey: "deckA_navSlot" },
  });
  deckFloor(kit, -hx, -hz, hx, hz, [{ x0: -SQ, z0: CZ - SQ, x1: SQ, z1: CZ + SQ }], { texel: 0.5 });
  {
    const s = new THREE.Shape();
    s.moveTo(-SQ, CZ - SQ);
    s.lineTo(SQ, CZ - SQ);
    s.lineTo(SQ, CZ + SQ);
    s.lineTo(-SQ, CZ + SQ);
    s.closePath();
    const hole = new THREE.Path();
    hole.absarc(0, CZ, R, 0, Math.PI * 2, true);
    s.holes.push(hole);
    slab(kit, "impDeck", s, PIT_Y, 0, { color: PALETTE.impGrey, texel: 0.5, curveSegments: 72 });
  }
  // well floor disc, black liner with a blue service strip at its foot, rim nosing with a blue hairline
  kit.cyl("impDeck", 0, PIT_Y - 0.07, CZ, R + 0.1, 0.14, "y", { segments: 72, color: PALETTE.impGreyDark, texel: 0.5 });
  annulusSlab(kit, "impTrim", 0, CZ, R - 0.05, R + 0.002, PIT_Y, -0.03, { color: PALETTE.impBlack, texel: 1, curveSegments: 72 });
  annulusSlab(kit, BLUE, 0, CZ, R - 0.062, R - 0.049, PIT_Y + 0.04, PIT_Y + 0.09, { curveSegments: 72 });
  annulusSlab(kit, "impMetal", 0, CZ, R - 0.03, R + 0.18, 0, 0.025, { color: PALETTE.impGreyDark, texel: 2, curveSegments: 72 });
  annulusSlab(kit, BLUE, 0, CZ, R + 0.05, R + 0.09, 0.025, 0.036, { curveSegments: 72 });
  // plotting rose on the well floor: blue rings, four lit cardinal radials, eight dark minor radials
  for (const rr of [1.0, 1.8, 2.6]) kit.add(BLUE, new THREE.RingGeometry(rr - 0.012, rr + 0.012, 96).rotateX(-Math.PI / 2), { pos: [0, PIT_Y + 0.004, CZ], uv: "keep" });
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const major = i % 3 === 0;
    const r0 = 0.72;
    const r1 = R - 0.2;
    kit.add(major ? BLUE : "impTrim", new THREE.BoxGeometry(r1 - r0, 0.006, major ? 0.024 : 0.016).translate((r0 + r1) / 2, 0, 0), { pos: [0, PIT_Y + 0.004, CZ], rot: [0, -a, 0], color: PALETTE.impBlack });
  }
  // steps down from the door side: one intermediate tread (two 0.2 m risers), blue step lights
  {
    const z0 = CZ - R - 0.3;
    const z1 = CZ - R + 0.5;
    kit.boxMM("impMetal", [-1.4, PIT_Y, z0], [1.4, -0.2, z1], { color: PALETTE.impGreyDark, texel: 1.5 });
    kit.boxMM("impTrim", [-1.38, -0.2, z1 - 0.04], [1.38, -0.194, z1], { color: PALETTE.impBlack });
    for (const s of [-1, 1]) kit.box(BLUE, s * 0.9, -0.3, z1 + 0.004, 0.24, 0.03, 0.008);
    kit.floor(-1.4, z0, 1.4, z1, -0.2, "pitstep");
  }

  // ---- walkable floors: the deck at 0 (room minus the well, the well's outside corners as angle
  // bands in both orientations), the well floor at -0.4 ----------------------------------------------
  kit.skipDefaultFloor = true;
  kit.floor(-hx - 0.5, -hz - 0.5, hx + 0.5, CZ - SQ, 0, "deckN");
  kit.floor(-hx - 0.5, CZ + SQ, hx + 0.5, hz + 0.5, 0, "deckS");
  kit.floor(-hx - 0.5, CZ - SQ, -SQ, CZ + SQ, 0, "deckW");
  kit.floor(SQ, CZ - SQ, hx + 0.5, CZ + SQ, 0, "deckE");
  {
    const n = 8;
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        kit.floor(0, CZ + sz * R, sx * SQ, CZ + sz * SQ, 0, "rim");
        kit.floor(sx * R, CZ, sx * SQ, CZ + sz * SQ, 0, "rim");
        for (let i = 0; i < n; i++) {
          const p0 = (i / n) * (Math.PI / 2);
          const p1 = ((i + 1) / n) * (Math.PI / 2);
          kit.floor(sx * R * Math.cos(p0), CZ + sz * R * Math.sin(p0), sx * SQ, CZ + sz * R * Math.sin(p1), 0, "rim");
          kit.floor(sx * R * Math.sin(p0), CZ + sz * R * Math.cos(p0), sx * R * Math.sin(p1), CZ + sz * SQ, 0, "rim");
        }
      }
    }
  }
  kit.floor(-R, CZ - R, R, CZ + R, PIT_Y, "pit");

  // ---- the projector and its hologram ----------------------------------------------------------
  {
    projectorColumn(kit, 0, CZ, 0.5, 0.66, { accentKey: BLUE, rings: 2, y: PIT_Y });
    kit.cyl("impTrim", 0, PIT_Y + 0.003, CZ, 0.95, 0.006, "y", { segments: 48, color: PALETTE.impBlack });
    const yTop = PIT_Y + 0.66 + 0.08;
    const PY = 2.35; // planet centre height
    const PR = 1.1;
    projectorCone(kit, 0, yTop, CZ, PY - PR + 0.1, 0.1, 0.95, "holo");
    // planet: single-sided globe + lat/long wire, two tilted orbit rings, a moon on the outer ring
    const planet = new THREE.Group();
    planet.position.set(0, PY, CZ);
    const globe = new THREE.Mesh(new THREE.SphereGeometry(PR, 36, 22), M.deckA_navGlobe);
    globe.castShadow = globe.receiveShadow = false;
    planet.add(globe);
    const wire = lineSegments(wireSphereGeometry(PR + 0.015, 7, 14, 56), M.deckA_holoLine);
    planet.add(wire);
    // a brighter polar cap and equatorial band so the globe reads as a world, not a bubble
    planet.add(mergedMesh([new THREE.TorusGeometry(PR + 0.02, 0.01, 6, 72).rotateX(Math.PI / 2), new THREE.SphereGeometry(PR * 0.4, 16, 8, 0, Math.PI * 2, 0, 0.5).translate(0, PR * 0.62, 0)], M.holoBright));
    const rings = new THREE.Group();
    const ringA = mergedMesh([new THREE.TorusGeometry(1.6, 0.009, 6, 96).rotateX(Math.PI / 2)], M.holoBright);
    ringA.rotation.z = 0.32;
    rings.add(ringA);
    const ringB = new THREE.Group();
    ringB.rotation.z = -0.18;
    ringB.add(mergedMesh([new THREE.TorusGeometry(2.05, 0.007, 6, 112).rotateX(Math.PI / 2)], M.holoBright));
    const moon = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 10), M.holoBright);
    moon.castShadow = moon.receiveShadow = false;
    moon.position.set(2.05, 0, 0);
    ringB.add(moon);
    rings.add(ringB);
    planet.add(rings);
    kit.attach(planet);
    // starfield: point glyphs in a shell around the planet, kept inside the well's column
    const stars = [];
    const rand = rng(77);
    for (let i = 0; i < 220; i++) {
      const rr = 1.45 + rand() * 1.55;
      const th = rand() * Math.PI * 2;
      const ph = Math.acos(2 * rand() - 1);
      const x = rr * Math.sin(ph) * Math.cos(th);
      const y = rr * Math.cos(ph) * 0.75;
      const z = rr * Math.sin(ph) * Math.sin(th);
      if (Math.hypot(x, z) > 3.0 || PY + y < 0.45 || PY + y > 4.1) continue;
      stars.push(new THREE.OctahedronGeometry(0.018 + rand() * 0.022).translate(x, y, z));
    }
    const field = mergedMesh(stars, M.holoBright);
    field.position.set(0, PY, CZ);
    kit.attach(field);
    // plotted hyperlane: a bezier from the planet out to a destination star, waypoint glyphs, the ship
    const A = new THREE.Vector3(-0.9, -0.55, 0.75);
    const B = new THREE.Vector3(2.55, 0.25, -1.35);
    const C = new THREE.Vector3(1.1, 1.35, -0.1);
    const pts = [];
    for (let i = 0; i <= 56; i++) {
      const t = i / 56;
      pts.push(new THREE.Vector3().copy(A).multiplyScalar((1 - t) * (1 - t)).addScaledVector(C, 2 * (1 - t) * t).addScaledVector(B, t * t));
    }
    const lane = [wireGraphGeometry(pts.map((p) => [p.x, p.y, p.z]), pts.slice(0, -1).map((_, i) => [i, i + 1]))];
    lane.push(wireSphereGeometry(0.16, 4, 8, 16).translate(B.x, B.y, B.z));
    const alt = [];
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      alt.push([-1.2 + t * 0.9, -0.9 + 0.5 * Math.sin(t * Math.PI), 1.0 + t * 1.6]);
    }
    lane.push(wireGraphGeometry(alt, alt.slice(0, -1).map((_, i) => [i, i + 1])));
    lane.push(wireSphereGeometry(0.11, 4, 8, 16).translate(alt[20][0], alt[20][1], alt[20][2]));
    const laneObj = mergedLines(lane, M.deckA_holoLine);
    laneObj.position.set(0, PY, CZ);
    kit.attach(laneObj);
    const marks = mergedMesh([14, 28, 42].map((i) => new THREE.OctahedronGeometry(0.05).translate(pts[i].x, pts[i].y, pts[i].z)), M.holoBright);
    marks.position.set(0, PY, CZ);
    kit.attach(marks);
    const ship = lineSegments(wireDestroyerGeometry(0.55), M.deckA_holoLineBright);
    ship.position.set(0, PY, CZ);
    kit.attach(ship);
    kit.onUpdate((dt, t) => {
      globe.rotation.y = t * 0.12;
      wire.rotation.y = t * 0.12;
      ringA.rotation.y = t * 0.2;
      ringB.rotation.y = -t * 0.11;
      field.rotation.y = t * 0.02;
      const s = (t * 0.06) % 1;
      const i = Math.min(55, Math.floor(s * 56));
      const p = new THREE.Vector3().lerpVectors(pts[i], pts[i + 1], s * 56 - i);
      ship.position.set(p.x, PY + p.y, CZ + p.z);
      const dir = new THREE.Vector3().subVectors(pts[i + 1], pts[i]);
      ship.rotation.y = Math.atan2(dir.x, dir.z) + Math.PI;
    });
  }

  // ---- navigator desks: two curved consoles on the E and W rim, three seats each -----------------
  {
    const r0 = R + 0.14;
    const r1 = R + 0.92;
    const rm = (r0 + r1) / 2;
    const H = 0.8;
    const seatSets = [["deckA_starChart", "scrBlue0"], ["scrAmber1", "deckA_starChart"], ["deckA_starChart", "scrWhite1"], ["scrBlue2", "deckA_starChart"], ["deckA_starChart", "scrAmber3"], ["scrWhite2", "deckA_starChart"]];
    let k = 0;
    for (const centre of [0, Math.PI]) {
      const a0 = centre - THREE.MathUtils.degToRad(56);
      const a1 = centre + THREE.MathUtils.degToRad(56);
      // skirt (charcoal), grey kick, gloss top plate, amber hairline along the navigators' face
      arcSlab(kit, "impTrim", 0, CZ, r0, r1, a0, a1, 0.12, H - 0.04, { color: PALETTE.impCharcoal, texel: 1 });
      arcSlab(kit, "impMetal", 0, CZ, r0 - 0.02, r1 + 0.02, a0, a1, 0, 0.12, { color: PALETTE.impGreyDark, texel: 1 });
      arcSlab(kit, "impMetal", 0, CZ, r0 - 0.03, r1 + 0.03, a0 - 0.006, a1 + 0.006, H - 0.04, H - 0.01, { color: PALETTE.impGreyDark, texel: 2 });
      arcSlab(kit, "impGloss", 0, CZ, r0 - 0.02, r1 + 0.02, a0 - 0.004, a1 + 0.004, H - 0.01, H + 0.03);
      arcSlab(kit, dimKey, 0, CZ, r1 + 0.006, r1 + 0.016, a0 + 0.02, a1 - 0.02, 0.2, 0.225);
      // collider chain along the arc
      const steps = 14;
      for (let i = 0; i <= steps; i++) {
        const a = a0 + ((a1 - a0) * i) / steps;
        const cx = Math.cos(a) * rm;
        const cz = CZ + Math.sin(a) * rm;
        kit.collider([cx - 0.46, 0, cz - 0.46], [cx + 0.46, H + 0.3, cz + 0.46], "navdesk");
      }
      for (const off of [-34, 0, 34]) {
        const a = centre + THREE.MathUtils.degToRad(off);
        const px = Math.cos(a) * rm;
        const pz = CZ + Math.sin(a) * rm;
        const yaw = yawToward(px, pz, 0, CZ); // local -z toward the well, +z toward the seated navigator
        const f = yawFrame(kit, px, H + 0.03, pz, yaw);
        // instrument housing on the inner half of the desk, two screens angled to the navigator, hood
        f.box("impTrim", 0, 0.11, -0.16, 1.0, 0.22, 0.42, { color: PALETTE.impCharcoal, texel: 1 });
        f.box("impMetal", 0, 0.005, -0.16, 1.06, 0.01, 0.48, { color: PALETTE.impGreyDark });
        const keys = seatSets[k % seatSets.length];
        f.add(keys[0], new THREE.PlaneGeometry(0.5, 0.3).rotateX(-Math.PI / 2 + 0.62), -0.22, 0.24, -0.06, { uv: "keep" });
        f.add(keys[1], new THREE.PlaneGeometry(0.34, 0.24).rotateX(-Math.PI / 2 + 0.62), 0.24, 0.225, -0.06, { uv: "keep" });
        f.box("impTrim", 0, 0.26, -0.3, 1.0, 0.04, 0.22, { color: PALETTE.impBlack });
        f.box(dimKey, 0, 0.245, -0.19, 0.9, 0.008, 0.01);
        // key strip on the outer half, a lit indicator pair, a dark wrist pad
        for (let j = 0; j < 7; j++) f.box(j === 3 ? accentKey : j === 6 ? "emitWhite" : "impGloss", -0.3 + j * 0.1, 0.012, 0.18, 0.07, 0.02, 0.06);
        f.box("rubber", 0, 0.01, 0.32, 0.9, 0.02, 0.1, { color: PALETTE.impBlack, texel: 2 });
        f.box(k % 2 ? accentKey : BLUE, 0.42, 0.012, 0.18, 0.05, 0.02, 0.05);
        // the chair on the deck facing the well
        const cr = R + 1.72;
        const cx = Math.cos(a) * cr;
        const cz = CZ + Math.sin(a) * cr;
        impChair(kit, cx, 0, cz, yawToward(cx, cz, 0, CZ));
        if (k === 1) datapad(kit, ...f.pos(0.46, 0.0, 0.32).toArray(), yaw + 0.3, { screen: "scrAmber2", accentKey });
        if (k === 4) cup(kit, ...f.pos(-0.46, 0.0, 0.3).toArray());
        k++;
      }
    }
    // faint amber ring on the deck behind the seats, four lit plot markers on the deck diagonals
    annulusSlab(kit, dimKey, 0, CZ, R + 2.46, R + 2.5, 0.003, 0.011, { curveSegments: 96 });
    for (const a of [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4]) kit.add(accentKey, new THREE.RingGeometry(0.16, 0.2, 24).rotateX(-Math.PI / 2), { pos: [Math.cos(a) * (R + 2.48), 0.012, CZ + Math.sin(a) * (R + 2.48)], uv: "keep" });
  }

  // ---- overhead: a ring of recessed fixtures above the well ---------------------------------------
  ceilingRingLight(kit, 0, CZ, R + 1.0, h, 16, { key: "deckA_navSlot", w: 0.46, accentKey: dimKey, drop: 0.22 });

  // ---- entry lane: a compass rose etched in the deck, two lit rails leading to the steps, a low
  // chart station either side ------------------------------------------------------------------------
  {
    const cx = 0;
    const cz = -5.8;
    const rr = 1.6;
    kit.add("impMetal", new THREE.RingGeometry(rr - 0.06, rr, 72).rotateX(-Math.PI / 2), { pos: [cx, 0.004, cz], color: PALETTE.impCharcoal, uv: "keep" });
    kit.add(dimKey, new THREE.RingGeometry(rr - 0.1, rr - 0.075, 72).rotateX(-Math.PI / 2), { pos: [cx, 0.006, cz], uv: "keep" });
    kit.add("impMetal", new THREE.RingGeometry(0.5, 0.56, 48).rotateX(-Math.PI / 2), { pos: [cx, 0.004, cz], color: PALETTE.impCharcoal, uv: "keep" });
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const major = i % 4 === 0;
      const l = major ? 0.42 : 0.18;
      kit.add(major ? accentKey : "impMetal", new THREE.BoxGeometry(l, 0.006, major ? 0.04 : 0.025).translate(rr - 0.14 - l / 2, 0, 0), { pos: [cx, 0.005, cz], rot: [0, -a, 0], color: PALETTE.impCharcoal });
    }
    // four-point star: two long crossed bars and the glyph at the centre
    for (const a of [0, Math.PI / 2]) kit.add(dimKey, new THREE.BoxGeometry(2 * (rr - 0.62), 0.006, 0.03), { pos: [cx, 0.006, cz], rot: [0, a, 0] });
    kit.add("decalImp", new THREE.PlaneGeometry(0.7, 0.7).rotateX(-Math.PI / 2).rotateY(Math.PI), { pos: [cx, 0.008, cz], uv: "keep", uvRect: impDecalRect(IMP_DECAL.cog) });
    for (const s of [-1, 1]) {
      segRailing(kit, [s * 2.1, -4.3], [s * 2.1, -1.9], 0, { h: 1.0, postStep: 1.2, light: dimKey });
      station(kit, s * 4.9, 0, -5.3, 1.2, 0.75, { yaw: Math.PI, seed: 33 + (s > 0 ? 1 : 0), screens: s < 0 ? ["deckA_starChart", "scrAmber2"] : ["scrAmber0", "deckA_starChart"], accentKey, hoodKey: dimKey, height: 0.92, conduits: 1 });
    }
  }

  // ---- star-chart wall (S): one black surround, centre chart + two stacked flanking screens ------
  {
    const f = walls.S.frame;
    const u = hx;
    f.box("impTrim", u, 2.6, 0.12, 12.8, 3.4, 0.16, { color: PALETTE.impBlack, texel: 1 });
    f.box("impMetal", u, 4.42, 0.14, 12.8, 0.24, 0.05, { color: PALETTE.impCharcoal, texel: 2 });
    f.box(accentKey, u, 4.42, 0.17, 12.2, 0.03, 0.012);
    for (let k = 0; k < 6; k++) f.box(k % 3 === 0 ? accentKey : k % 3 === 1 ? "emitWhite" : "impGloss", u - 5.6 + k * 0.16, 4.42, 0.172, 0.08, 0.08, 0.012);
    f.decal(IMP_DECAL.glyphs3, u + 5.2, 4.42, 0.172, 0.2);
    // centre: the star chart
    f.box("impGloss", u, 2.55, 0.205, 5.34, 2.74, 0.01);
    f.screen("deckA_starChart", u, 2.55, 0.216, 5.2, 2.6);
    f.box(accentKey, u, 1.1, 0.205, 4.6, 0.03, 0.012);
    f.decal(IMP_DECAL.glyphs2, u - 2.3, 3.98, 0.212, 0.14);
    // flanks: blue plot above, white telemetry below, indicator row at the foot
    for (const s of [-1, 1]) {
      const fu = u + s * 4.35;
      f.box("impGloss", fu, 3.25, 0.205, 2.5, 1.3, 0.01);
      f.screen("scrBlue1", fu, 3.25, 0.216, 2.4, 1.2);
      f.box("impGloss", fu, 1.85, 0.205, 2.5, 1.3, 0.01);
      f.screen(s < 0 ? "scrWhite0" : "scrWhite1", fu, 1.85, 0.216, 2.4, 1.2);
      f.box("impTrim", fu, 2.55, 0.207, 2.5, 0.06, 0.012, { color: PALETTE.impBlack });
      indicatorRow(f, fu, 1.08, 0.205, 12, { accentKey, seed: s < 0 ? 31 : 32, step: 0.14, size: 0.05 });
      f.decal(IMP_DECAL.glyphs1, fu - 1.0, 3.98, 0.212, 0.14);
    }
    for (const [bu, bv] of [[-6.2, 1.1], [6.2, 1.1], [-6.2, 4.1], [6.2, 4.1]]) f.cylN("impMetal", u + bu, bv, 0.205, 0.02, 0.02, { color: PALETTE.impGreyDark, segments: 8 });
    // plotting ledge under the wall: a black shelf with keys and toggles
    f.box("impTrim", u, 0.95, 0.3, 12.4, 0.1, 0.5, { color: PALETTE.impBlack, texel: 1 });
    f.box("impGloss", u, 1.005, 0.3, 12.2, 0.02, 0.44);
    for (let k = 0; k < 40; k++) f.box(k % 8 === 0 ? accentKey : k % 8 === 4 ? "emitWhite" : "impGloss", u - 5.85 + k * 0.3, 1.025, 0.44, 0.09, 0.02, 0.07);
    for (let k = 0; k < 5; k++) f.cylV("impMetal", u - 4.8 + k * 2.4, 1.045, 0.24, 0.035, 0.05, { color: PALETTE.impGrey, segments: 10 });
    f.collider(u - 6.4, u + 6.4, 0, 4.6, 0, 0.56, "chartwall");
    f.decal(IMP_DECAL.cog, u - 9.0, 2.2, 0.09, 0.45);
    f.decal(IMP_DECAL.cog, u + 9.0, 2.2, 0.09, 0.45);
    impWallLight(f, u - 9.0, 3.6, { key: accentKey, w: 0.8 });
    impWallLight(f, u + 9.0, 3.6, { key: accentKey, w: 0.8 });
  }

  // ---- plotting grid on the deck in front of the chart wall -----------------------------------
  {
    const x0 = -6.0;
    const x1 = 6.0;
    const z0 = 6.4;
    const z1 = 8.8;
    kit.boxMM("impMetalRough", [x0, 0, z0], [x1, 0.01, z1], { color: PALETTE.impGreyDark, texel: 0.7 });
    for (let i = 0; i <= 20; i++) {
      const x = x0 + i * 0.6;
      const major = i % 5 === 0;
      kit.boxMM(major ? accentKey : "impTrim", [x - 0.01, 0.01, z0], [x + 0.01, major ? 0.018 : 0.016, z1], { color: PALETTE.impBlack });
    }
    for (let i = 0; i <= 4; i++) {
      const z = z0 + i * 0.6;
      const major = i === 0 || i === 4;
      kit.boxMM(major ? accentKey : "impTrim", [x0, 0.01, z - 0.01], [x1, major ? 0.018 : 0.016, z + 0.01], { color: PALETTE.impBlack });
    }
    for (const [x, z] of [[-3.6, 7.6], [3.6, 7.0]]) kit.add(accentKey, new THREE.RingGeometry(0.16, 0.2, 24).rotateX(-Math.PI / 2), { pos: [x, 0.02, z], uv: "keep" });
  }

  // ---- hyperspace jump-lever pedestal between the well and the chart wall (operator faces the wall)
  {
    const f = yawFrame(kit, 0, 0, 7.4, Math.PI);
    f.box("impTrim", 0, 0.5, 0, 1.1, 1.0, 0.7, { color: PALETTE.impBlack, texel: 1 });
    f.box("impMetal", 0, 0.06, 0, 1.16, 0.12, 0.76, { color: PALETTE.impCharcoal, texel: 1 });
    f.box("impMetal", 0, 0.5, 0.36, 0.9, 0.5, 0.02, { color: PALETTE.impGreyDark, texel: 1 });
    f.box(accentKey, 0, 0.18, 0.376, 0.8, 0.025, 0.01);
    f.decal(IMP_DECAL.hazard, 0, 0.55, 0.376, 0.3);
    f.box("impGloss", 0, 1.02, 0, 1.14, 0.04, 0.74);
    f.box("impTrim", 0, 1.16, -0.16, 1.0, 0.24, 0.36, { color: PALETTE.impBlack, texel: 1 });
    f.screen("scrAmber1", 0, 1.17, 0.03, 0.6, 0.16);
    f.box("emitRedImp", -0.4, 1.17, 0.03, 0.08, 0.08, 0.012);
    f.box(accentKey, 0.4, 1.17, 0.03, 0.08, 0.08, 0.012);
    f.box(accentKey, 0, 1.045, 0.355, 0.9, 0.012, 0.02);
    for (const k of [-1, 0, 1]) f.box(k === 0 ? "emitWhite" : "impGloss", k * 0.46, 1.052, 0.28, 0.08, 0.024, 0.06);
    // two levers in slots: one pulled back toward the operator, one pushed forward
    for (const [su, tilt] of [[-0.22, 0.55], [0.22, -0.25]]) {
      f.box("impMetal", su, 1.046, 0.12, 0.06, 0.012, 0.34, { color: PALETTE.impGreyDark });
      const shaft = new THREE.CylinderGeometry(0.016, 0.02, 0.4, 10).translate(0, 0.2, 0).rotateX(tilt);
      f.add("impMetal", shaft, su, 1.05, 0.12, { color: PALETTE.impGrey, uv: "scale", uvScale: [0.1, 0.4] });
      const knob = new THREE.SphereGeometry(0.038, 12, 8).translate(0, 0.4 * Math.cos(tilt), 0.4 * Math.sin(tilt));
      f.add("impGloss", knob, su, 1.05, 0.12);
      f.add(accentKey, new THREE.TorusGeometry(0.034, 0.008, 6, 16).rotateX(Math.PI / 2), su, 1.062, 0.12);
    }
    f.collider(-0.6, 0.6, 0, 1.3, -0.4, 0.4, "jump");
    kit.box("chevronY", 0, 0.02, 6.55, 1.2, 0.008, 0.5, { texel: 1.5 });
  }

  // ---- astrogation computer column (W side) ----------------------------------------------------
  {
    const x = -9.4;
    const z = 3.6;
    const r = 0.75;
    kit.cyl("impTrim", x, h / 2, z, r, h, "y", { color: PALETTE.impBlack, segments: 24, texel: 1 });
    kit.cyl("impMetal", x, 0.1, z, r + 0.17, 0.2, "y", { color: PALETTE.impCharcoal, segments: 24, texel: 1 });
    kit.cyl("impMetal", x, h - 0.3, z, r + 0.11, 0.5, "y", { color: PALETTE.impCharcoal, segments: 24, texel: 1 });
    for (const ry of [1.1, 1.9, 2.7, 3.5]) {
      kit.cyl("impMetal", x, ry, z, r + 0.03, 0.16, "y", { color: PALETTE.impGreyDark, segments: 24 });
      kit.add(accentKey, new THREE.TorusGeometry(r + 0.045, 0.01, 6, 48).rotateX(Math.PI / 2), { pos: [x, ry - 0.06, z] });
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        const key = i % 5 === 2 ? "emitWhite" : i % 7 === 3 ? "impGloss" : accentKey;
        kit.box(key, x + Math.cos(a) * (r + 0.045), ry + 0.02, z + Math.sin(a) * (r + 0.045), 0.02, 0.05, 0.05, { rot: [0, -a, 0] });
      }
    }
    // readout strip facing the well
    const yawFace = Math.atan2(0 - x, CZ - z);
    const f = yawFrame(kit, x, 0, z, yawFace);
    f.box("impGloss", 0, 2.3, r + 0.02, 0.36, 1.6, 0.03);
    f.screen("scrAmber0", 0, 2.78, r + 0.04, 0.3, 0.22);
    f.screen("scrAmber1", 0, 2.36, r + 0.04, 0.3, 0.36);
    f.screen("scrWhite0", 0, 1.94, r + 0.04, 0.3, 0.22);
    for (let k = 0; k < 3; k++) f.box(k === 1 ? accentKey : "emitWhite", -0.1 + k * 0.1, 1.62, r + 0.042, 0.06, 0.05, 0.012);
    f.decal(IMP_DECAL.glyphs3, 0, 3.32, r + 0.012, 0.28);
    f.decal(IMP_DECAL.power, 0, 0.55, r + 0.012, 0.26);
    // rotating indicator ring under a static bracket ring
    kit.add("impMetal", new THREE.TorusGeometry(r + 0.24, 0.03, 8, 48).rotateX(Math.PI / 2), { pos: [x, 4.3, z], color: PALETTE.impGreyDark, uv: "scale", uvScale: [0.4, 6] });
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      kit.box("impMetal", x + Math.cos(a) * (r + 0.12), 4.3, z + Math.sin(a) * (r + 0.12), 0.26, 0.04, 0.06, { rot: [0, -a, 0], color: PALETTE.impGreyDark });
    }
    const ringGeos = [new THREE.TorusGeometry(r + 0.24, 0.018, 6, 48).rotateX(Math.PI / 2)];
    for (const a of [0, 2.1, 4.2]) ringGeos.push(new THREE.BoxGeometry(0.1, 0.07, 0.06).translate(Math.cos(a) * (r + 0.24), 0, Math.sin(a) * (r + 0.24)));
    const ring = mergedMesh(ringGeos, M.emitAmber);
    ring.position.set(x, 4.16, z);
    kit.attach(ring);
    kit.onUpdate((dt, t) => {
      ring.rotation.y = t * 0.6;
    });
    kit.collider([x - r - 0.17, 0, z - r - 0.17], [x + r + 0.17, h, z + r + 0.17], "astrogation");
    // cable bundle from the column top to the W wall
    for (let k = 0; k < 3; k++) kit.cyl("impMetal", (x - r - 0.11 + (-hx + 0.06)) / 2, 4.42 + k * 0.1, z + (k - 1) * 0.14, 0.035, x - r - 0.11 - (-hx + 0.06), "x", { color: [PALETTE.impGreyDark, PALETTE.impCharcoal, PALETTE.impGrey][k], segments: 8 });
    kit.box("impTrim", -hx + 0.14, 4.52, z, 0.16, 0.5, 0.6, { color: PALETTE.impBlack, texel: 1 });
  }

  // ---- N wall (door): helmet shelf, datapad rack, charts locker, gear ------------------------
  {
    const f = walls.N.frame;
    const su = hx + 4.5;
    f.box("impTrim", su, 1.45, 0.28, 1.5, 0.05, 0.4, { color: PALETTE.impBlack, texel: 1 });
    for (const s of [-1, 1]) f.box("impMetal", su + s * 0.6, 1.25, 0.12, 0.05, 0.4, 0.08, { color: PALETTE.impGreyDark });
    for (const s of [-1, 1]) f.box("impMetal", su + s * 0.6, 1.4, 0.28, 0.05, 0.05, 0.4, { color: PALETTE.impGreyDark });
    helmet(kit, 4.15, 1.475, -hz + 0.28, Math.PI);
    helmet(kit, 4.85, 1.475, -hz + 0.28, Math.PI + 0.2);
    f.decal(IMP_DECAL.glyphs1, su, 2.05, 0.09, 0.3);
    f.collider(su - 0.8, su + 0.8, 1.2, 1.9, 0.08, 0.5, "shelf");
    datapadRack(f, hx + 7.0, 1.5, { n: 4, accentKey });
    sealedCabinet(f, hx - 4.8, { w: 1.4, h: 2.3, accentKey, decal: IMP_DECAL.cog });
    impWallGear(f, hx - 8.6, 1.5, { seed: 41, accentKey });
    f.decal(IMP_DECAL.arrowRight, hx - 2.6, 2.3, 0.09, 0.5);
    f.decal(IMP_DECAL.glyphs2, hx + 2.6, 2.3, 0.09, 0.5);
    impWallLight(f, hx - 6.6, 3.7, { key: accentKey, w: 0.8 });
    impWallLight(f, hx + 9.6, 3.7, { key: accentKey, w: 0.8 });
  }

  // ---- E and W walls: ranks of framed star-map screens (sector charts over blue plot boards) ----
  const chartRank = (f, u, seed) => {
    f.box("impTrim", u, 2.45, 0.1, 3.0, 2.7, 0.08, { color: PALETTE.impBlack, texel: 1 });
    f.box("impMetal", u, 3.86, 0.12, 3.0, 0.1, 0.05, { color: PALETTE.impCharcoal, texel: 2 });
    f.box(accentKey, u, 3.86, 0.15, 2.6, 0.02, 0.01);
    f.box("impGloss", u, 3.0, 0.145, 2.74, 1.44, 0.01);
    f.screen("deckA_starChart", u, 3.0, 0.155, 2.6, 1.3);
    for (const s of [-1, 1]) {
      f.box("impGloss", u + s * 0.68, 1.75, 0.145, 1.3, 0.8, 0.01);
      f.screen(s < 0 ? "scrBlue1" : "scrBlue3", u + s * 0.68, 1.75, 0.155, 1.2, 0.7);
    }
    indicatorRow(f, u, 1.22, 0.145, 14, { accentKey, seed, step: 0.16, size: 0.05 });
    f.decal(IMP_DECAL.glyphs1, u - 1.2, 4.2, 0.09, 0.18);
    f.collider(u - 1.5, u + 1.5, 0.9, 3.9, 0, 0.16, "chartrank");
  };
  {
    const f = walls.E.frame;
    dataBank(f, hz - 8.4, { w: 1.2, h: 2.3, accentKey, screen: "scrAmber0", seed: 53, practical: dimKey });
    chartRank(f, hz - 4.6, 51);
    chartRank(f, hz - 0.2, 52);
    chartRank(f, hz + 4.2, 54);
    impWallGear(f, hz + 7.6, 1.5, { seed: 55, accentKey });
    conduitRun(f, 1.0, 2 * hz - 1.0, h - 0.8, { n: 0.16, pipes: 2, seed: 56, clampStep: 2.2 });
    f.decal(IMP_DECAL.cog, hz - 6.8, 3.6, 0.09, 0.45);
    impWallLight(f, hz - 6.7, 3.7, { key: accentKey, w: 0.8 });
    impWallLight(f, hz + 7.6, 3.7, { key: accentKey, w: 0.8 });
  }
  {
    const f = walls.W.frame;
    sealedCabinet(f, hz + 8.2, { w: 1.4, h: 2.3, accentKey, decal: IMP_DECAL.glyphs3 });
    chartRank(f, hz + 5.0, 61);
    chartRank(f, hz + 0.6, 62);
    dataBank(f, hz - 6.6, { w: 1.2, h: 2.3, accentKey, screen: "scrWhite0", seed: 63, decal: IMP_DECAL.glyphs3, practical: dimKey });
    datapadRack(f, hz - 8.2, 1.5, { n: 5, accentKey });
    f.decal(IMP_DECAL.cog, hz - 2.6, 3.5, 0.09, 0.45);
    f.decal(IMP_DECAL.glyphs2, hz + 7.4, 4.1, 0.09, 0.4);
    impWallLight(f, hz - 4.6, 3.7, { key: accentKey, w: 0.8 });
    impWallLight(f, hz + 7.4, 3.7, { key: accentKey, w: 0.8 });
  }
  // pillars framing the entry
  impPillar(kit, -7.6, -7.2, h, { w: 0.5, accentKey });
  impPillar(kit, 7.6, -7.2, h, { w: 0.5, accentKey });

  // ---- lights (9): warm key over the well, the hologram's blue glow, warm fills at the entry and
  // over both desks, amber at the chart wall and the astrogation column, two wall-rank fills --------
  kit.light({ type: "spot", pos: [0, h - 0.3, CZ], target: [0, PIT_Y, CZ], color: WARM, intensity: lux(h - 0.3 - PIT_Y, 3.4), distance: 13, angle: 0.9, penumbra: 0.5, shadow: true, priority: 0.95 });
  kit.light({ type: "point", pos: [0, 2.35, CZ], color: 0x8fc0ff, intensity: 11.0, distance: 9, priority: 0.62 });
  kit.light({ type: "point", pos: [0, h - 0.6, -6.4], color: WARM, intensity: lux(h - 0.6, 3.4), distance: 14, priority: 0.5 });
  kit.light({ type: "point", pos: [-6.6, h - 0.6, CZ], color: WARM, intensity: lux(h - 0.6, 3.0), distance: 13, priority: 0.48 });
  kit.light({ type: "point", pos: [6.6, h - 0.6, CZ], color: WARM, intensity: lux(h - 0.6, 3.0), distance: 13, priority: 0.47 });
  kit.light({ type: "point", pos: [0, 2.8, hz - 2.2], color: amber, intensity: 15.0, distance: 13, priority: 0.58 });
  kit.light({ type: "point", pos: [-7.8, 2.4, 3.6], color: amber, intensity: 8.0, distance: 9, priority: 0.42 });
  kit.light({ type: "point", pos: [-9.6, 3.4, -4.6], color: WARM, intensity: lux(3.4, 1.7), distance: 9, priority: 0.4 });
  kit.light({ type: "point", pos: [9.6, 3.4, -4.6], color: WARM, intensity: lux(3.4, 1.7), distance: 9, priority: 0.4 });
}
