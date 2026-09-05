// Imperial corridor detailing shared by the hub corridors (d2-cor-w/e/n, d3-cor). Built on the
// shell's face API so x- and z-axis corridors get the identical rhythm: bulkhead frames every 4 m
// (paired ribs + ceiling beam + numbered markers), one housed centre fixture per bay, ceiling-corner
// conduit runs, kick-level light strips, hazard strips + status panels at every door hole and a
// terminal bulkhead on dead-end walls. What sits in the bays is shuffled by the corridor seed —
// service bays (cabinet / crate pair / locker row with door states / rest bench with seat items,
// plus workbench and drum-pair kinds a manifest can order explicitly) alternate sides, the small
// bays draw from junction box, screen, tool board, wall cabinet or vent sets — so no two corridors
// read as the same kit in the same order. The centre 3 m stays clear; nothing goes inside or within
// 1 m of a hole.
// Lighting: the shadow key is a spot inside the first housed fixture from the lobby door, aimed down
// the deck so the ribs and bay props throw their shadows away from the door; fills sit under every
// second fixture, and the two fill bays either side of the corridor's midpoint also carry a downlight
// spot (live and shadow-casting from the middle of the corridor, where the key and the far flood
// lose the spot pool to the neighbours' keys); a far-end flood keeps the last bays readable from the
// far half. Levels are set for the rig's environment capture (the deck no longer borrows a studio
// map's sheen): key 200 cd, fills 36, mid spots 110, far flood 140; the impGrey deck reads 20–30 %
// grey in the views. Motion: one faulty fixture per corridor flickers
// (seeded bay, seeded pattern — descriptor + emitter together), and a rotating beacon (red on
// dead-end bulkheads, amber over the reactor blast door) sweeps the far end.
import * as THREE from "three";
import { rng } from "../../../kit.js";
import { col } from "../_shared/palette.js";
import { WALL_T } from "../_shared/shell.js";
import { pipe, wallScreen, hazardStrip } from "../_shared/props.js";
import { faceYaw, statusPanel, bulkheadMarker, junctionBox, wallVent, serviceBay, tiltedScreen, housedStrip, toolBoard, wallCabinet, dressedCrate, dressedCabinet, bench, cableTray, lockerRow, drumPair, workbench } from "../lobby/props.js";
import { Emitters, flicker, beacon } from "../lobby/motion.js";

const FRAME = 4;
const TRAY_Y = 3.0; // wall cable tray height (junction conduits rise into it)
const BEACON = { red: { mat: "emitRedImp", color: 0xff3a2a }, amber: { mat: "emitAmber", color: 0xffa028 } };

// Bulkhead frame positions along the corridor axis, counted from the lobby door end.
function frameLine(a0, a1, lobbyEnd) {
  const frames = [];
  if (lobbyEnd === "max") for (let a = a1 - FRAME; a > a0 + WALL_T + 0.3; a -= FRAME) frames.push(a);
  else for (let a = a0 + FRAME; a < a1 - WALL_T - 0.3; a += FRAME) frames.push(a);
  return frames.sort((p, q) => p - q);
}

// Centre fixture span of bay i between bounds p..q (null when the bay is too short for one).
function fixtureSpan(p, q, i, last, clearMin, clearMax) {
  const s0 = Math.max(p + (i === 0 ? 0.3 : 0.45), clearMin);
  const s1 = Math.min(q - (last ? 0.3 : 0.45), clearMax);
  return s1 - s0 < 0.8 ? null : [s0, s1];
}

/**
 * @param opts { axis: "x"|"z", lobbyEnd: "min"|"max" (frames count from the lobby door),
 *   accent: emit key for status/floor accents, engineering: heavier pipes + amber kick strips,
 *   seed: shuffles bay kinds/sides, screens: screen keys cycled through the bay screens,
 *   bigKinds: explicit service-bay kit order (default: the seed shuffles cabinet / crates / lockers /
 *   bench; "workbench" and "drums" are the extra kinds),
 *   deadEnd: { screen, kit: "cabinet"|"lockers", beacon: "red"|"amber"|false (rotating beacon on the bulkhead, default red) },
 *   fill: { color, intensity, distance, drop }, farSpot: { intensity, distance, angle, aimY } (long-throw
 *   lamp by the lobby door that lights a dead-end bulkhead; false/null = none), farFlood: { intensity,
 *   distance, back, aim: "deck"|"end" } (wide flood `back` m before the far door, aimed back at the deck
 *   or at the door — for corridors whose far end is a door),
 *   key: { intensity, distance, angle, reach } (shadow key spot in the first fixture; false = none),
 *   midSpot: { bays: [k...], intensity, distance, priority } (downlight spots added to the named fill
 *   bays, whose point fills drop to 60 % — default the one bay nearest the midpoint; false = none),
 *   flickerBay: bay index from the lobby door whose fixture is the faulty one (default: seeded pick
 *   among the bays that carry a fill), farBeacon: "amber"|"red" (ceiling beacon before the far-end door) }
 * The corridor pushes its own fill descriptors (set `shell.lights: false` in the manifest) and returns
 * { update(dt, t) } for its motion lighting.
 */
export function corridorDetail(ctx, shell, room, opts = {}) {
  const { kit, PALETTE } = ctx;
  const { axis = "x", lobbyEnd = "max", accent = "emitBlue", engineering = false, seed = 1, screens = ["screenImp0"], deadEnd = {}, fill = {}, farSpot = null, farFlood = null, key = {}, midSpot = {}, farBeacon = null } = opts;
  const rand = rng(seed * 131 + 7);
  const E = new Emitters(ctx.materials);
  const motion = []; // update(t) closures
  const F = shell.faces;
  const H = shell.H;
  const Y = room.floorY;
  const C = room.ceilY;
  const b = room.bounds;
  const P = (k) => col(PALETTE, k);
  const dark = P("impDark");
  const black = P("impBlack");
  const mid = P("impMid");
  const steel = P("steel");
  const kickMat = engineering ? "emitAmber" : "emitWhite";
  const crateOpts = { bumperMat: "paintedMetal" }; // black painted bumpers: saves the rubber draw call for the motion meshes
  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const longKeys = axis === "x" ? ["n", "s"] : ["w", "e"];
  const endKeys = axis === "x" ? ["w", "e"] : ["n", "s"];
  const ai = axis === "x" ? 0 : 2;
  const ci = axis === "x" ? 2 : 0;
  const a0 = b.min[ai];
  const a1 = b.max[ai];
  const c0 = b.min[ci] + WALL_T;
  const c1 = b.max[ci] - WALL_T;
  const cc = (c0 + c1) / 2;
  const pt = (a, y, c) => (axis === "x" ? [a, y, c] : [c, y, a]);
  const uOf = (f, a) => (axis === "x" ? f.u(a, cc) : f.u(cc, a));
  const box = (f, mat, u, v, n, su, sv, sn, o = {}) => kit.add(mat, new THREE.BoxGeometry(...f.size(su, sv, sn)), { pos: f.world(u, v, n), ...o });
  const aabb = (f, u0, v0, n0, u1, v1, n1, tag) => {
    const p = f.world(u0, v0, n0);
    const q = f.world(u1, v1, n1);
    kit.collider([Math.min(p[0], q[0]), Math.min(p[1], q[1]), Math.min(p[2], q[2])], [Math.max(p[0], q[0]), Math.max(p[1], q[1]), Math.max(p[2], q[2])], tag);
  };
  const holes = (fk) => shell.openings[fk].filter((o) => o.isDoor);
  const nearHole = (fk, u, m) => holes(fk).some((o) => u > o.u0 - m && u < o.u1 + m);
  // end faces with a door hole get a 1 m clear approach: nothing along the side walls there either
  const endHoleMin = holes(endKeys[0]).length > 0;
  const endHoleMax = holes(endKeys[1]).length > 0;
  const clearMin = a0 + WALL_T + (endHoleMin ? 1.0 : 0);
  const clearMax = a1 - WALL_T - (endHoleMax ? 1.0 : 0);
  const inApproach = (ac, hw) => ac - hw < clearMin || ac + hw > clearMax;

  // ---- bulkhead frames ---------------------------------------------------------------------------
  const frames = frameLine(a0, a1, lobbyEnd);
  frames.forEach((a, i) => {
    const num = lobbyEnd === "max" ? frames.length - i : i + 1;
    for (const fk of longKeys) {
      const f = F[fk];
      const u = uOf(f, a);
      if (nearHole(fk, u, 0.5)) continue;
      // rib body and beam in the clean painted panel key (as the shared pillar faces): the worn-metal
      // map on a 4 m dark box reads as blotchy concrete even at texel 2.5
      box(f, "impPanel", u, H / 2, WALL_T + 0.125, 0.4, H, 0.25, { color: dark, uv: "keep" });
      box(f, "impPanel", u, H / 2 + 0.2, WALL_T + 0.27, 0.26, H - 1.2, 0.04, { color: mid, uv: "keep" });
      box(f, "paintedMetal", u, 0.2, WALL_T + 0.28, 0.44, 0.4, 0.06, { color: black });
      bulkheadMarker(kit, PALETTE, f.world(u, 2.75, WALL_T + 0.29), faceYaw(f), num);
      aabb(f, u - 0.22, 0, WALL_T, u + 0.22, H, WALL_T + 0.3, "rib");
    }
    kit.boxMM("impPanel", pt(a - 0.2, C - 0.36, c0), pt(a + 0.2, C - 0.04, c1), { color: dark, uv: "keep" });
    kit.boxMM("impPanel", pt(a - 0.12, C - 0.385, c0 + 0.3), pt(a + 0.12, C - 0.355, c1 - 0.3), { color: mid, uv: "keep" });
  });

  // ---- centre fixtures: one housed strip per bay, a fill light under every other one ------------
  // The pool keeps only the 12 nearest point lights of the active set (§9.4), and a corridor's
  // neighbours put 8–14 lights each within 20 m of its doors. One fill per 4 m bay lost the slots
  // for everything past ~16 m, so the far half went black. Fills under every second fixture (plus
  // the far-end bay) at 12 m range need half the slots, and their priority ramps up away from the
  // lobby door: the far fills out-rank the neighbour rooms' lights when the player is in the
  // corridor, while the fills by the lobby door stay at the lobby's own priority so they do not
  // steal the lobby's slots from inside it. A fill sits 1.5 m under its fixture (no ceiling disc).
  const bounds = [a0 + WALL_T, ...frames, a1 - WALL_T];
  const nBays = bounds.length - 1;
  const fillY = C - (fill.drop ?? 1.5);
  const dir = lobbyEnd === "min" ? 1 : -1; // along the axis, away from the lobby door
  const kOf = (i) => (lobbyEnd === "min" ? i : nBays - 1 - i); // bays counted from the lobby door
  // the faulty fixture: a seeded pick among the fill bays between the key bay and the far end (its
  // own rng so the pick does not reshuffle the bay kit), or the bay the manifest names
  const mrand = rng(seed * 977 + 3);
  const flickerK = opts.flickerBay ?? 2 + 2 * Math.floor(mrand() * Math.max(1, Math.floor((nBays - 4) / 2)));
  // the mid downlights: the fill bays the manifest names (`midSpot.bays`, normally the two either
  // side of the mid view's camera) or, by default, the one nearest the corridor's midpoint carry a
  // spot instead of a point (see below); never the key bay or the faulty one
  const midKs = new Set();
  if (midSpot !== false) {
    if (midSpot.bays) for (const k of midSpot.bays) if (k > 0 && k !== flickerK) midKs.add(k);
    else {
      let best = Infinity;
      let midK = -1;
      for (let i = 0; i < nBays; i++) {
        const k = kOf(i);
        const d = Math.abs((bounds[i] + bounds[i + 1]) / 2 - (a0 + a1) / 2);
        if (k > 0 && k % 2 === 0 && k !== flickerK && d < best) [best, midK] = [d, k];
      }
      if (midK > 0) midKs.add(midK);
    }
  }
  for (let i = 0; i < nBays; i++) {
    const span = fixtureSpan(bounds[i], bounds[i + 1], i, i === nBays - 1, clearMin, clearMax);
    if (!span) continue;
    const k = kOf(i);
    const m = (span[0] + span[1]) / 2;
    const faulty = k === flickerK;
    const pieces = housedStrip(kit, PALETTE, pt(span[0], 0, cc), pt(span[1], 0, cc), C, { w: 0.64, depth: 0.16, emitW: 0.14, mat: "emitWhite", louvre: 0.4, emitTo: faulty ? E : null });
    if (k === 0 && key !== false) {
      // shadow key: a spot 0.3 m under the first fixture's emitter, aimed `reach` m down the deck so
      // the ribs and the bay props throw their shadows away from the door (angle 0.75 keeps the cone
      // off the ceiling behind it); its distance spans the corridor so the shadow camera reaches the far
      // bays; priority 1 so it stays in the spot pool against the neighbour rooms' keys
      ctx.lights.push({
        type: "spot",
        pos: pt(m, C - 0.41, cc),
        target: pt(m + dir * (key.reach ?? 9), Y, cc),
        color: fill.color ?? 0xd6e2ff,
        intensity: key.intensity ?? 200,
        distance: key.distance ?? Math.max(20, a1 - a0),
        angle: key.angle ?? 0.75,
        penumbra: 0.5,
        priority: 1,
        shadow: true,
      });
    }
    const lit = k % 2 === 0 || k === nBays - 1;
    const midBay = midKs.has(k);
    if (midBay) {
      // Mid downlight: a spot inside the fixture aimed straight down (wide cone, soft edge — a pool
      // under the fixture like the point fills, from the spot pool instead). Spots have their own
      // 4-slot pool, so these are live from the middle of the corridor whatever the neighbour rooms'
      // point lights do, and the nearer one casts the shadows there — the key and the long-throw by
      // the lobby door are ~25 m from the mid views and lose the spot slots to the neighbours' keys.
      // The bay keeps its point fill (below, at 60 %): a downlight leaves the ceiling and beam above
      // it black, and the point 1.5 m under the ceiling is what draws them. Priority 0.2 (pool weight
      // d / 0.7 against the key's and long-throw's d / 1.5): from the lobby door the mids at 15–24 m
      // rank behind the two door-end spots (which light the whole deck from there); from the mid views
      // they are 2–6 m away and take the first two slots whatever their priority.
      ctx.lights.push({
        type: "spot",
        pos: pt(m, C - 0.41, cc),
        target: pt(m, Y, cc),
        color: fill.color ?? 0xd6e2ff,
        intensity: midSpot.intensity ?? 110,
        distance: midSpot.distance ?? 14,
        angle: 1.1,
        penumbra: 0.5,
        priority: midSpot.priority ?? 0.2,
      });
    }
    const desc = lit
      ? {
          type: "point",
          pos: pt(m, fillY, cc),
          color: fill.color ?? 0xd6e2ff,
          // the fill under the key fixture only lifts what the key's cone misses behind it; under a
          // mid downlight it is the ceiling wash, the spot carries the deck
          intensity: (fill.intensity ?? 36) * (k === 0 && key !== false ? 0.5 : midBay ? 0.6 : 1),
          distance: fill.distance ?? 12,
          priority: Math.min(1, 0.5 + 0.125 * k),
        }
      : null;
    if (desc) ctx.lights.push(desc);
    if (faulty) {
      // faulty fixture: descriptor and emitter flicker together off the corridor seed (the mapping
      // is picked so all four corridors are caught mid-dropout at the harness's t = 40)
      const nominal = desc ? desc.intensity : 0;
      const fseed = seed * 35 + 122;
      motion.push((t) => {
        const l = flicker(t, fseed);
        for (let p = 0; p < pieces.length; p++) E.level(pieces[p], l);
        if (desc) desc.intensity = nominal * (0.08 + 0.92 * l);
      });
    }
  }
  if (farSpot) {
    // Far-end long-throw (dead-end corridors). Seen from the lobby door the last bays went black: the
    // far fills (35–50 m out) lose the 12-slot point pool to the lobby's own lights whatever their
    // priority, and a flood mounted AT the far end loses the 4-slot spot pool the same way once the
    // neighbour rooms carry keys of their own. The pool ranks by the light's position, not by what it
    // lights — so the lamp that lights the far bulkhead sits at the lobby end, 2 m inside the door
    // beside the first fixture (weight ~3 from the door: always live there), and throws a narrow beam
    // the length of the deck: 0.052 rad with a wide penumbra is a soft 5 m pool on the bulkhead 53 m
    // out (~1 W/m² at its centre from 4000 cd — one fill's worth), whose lower half lands on the last
    // 15 m of deck at grazing incidence. Geometry matters: the bulkhead beams hang to C − 0.36 every
    // 4 m and a beam that clips them paints a blown disc on each face (seen in a test run), so the can
    // hangs below the beam line (C − 0.56) and the cone's half-angle does not exceed its descent to the
    // aim point (1.2 m up the bulkhead: 0.0495 for a 54 m run) by more than the 0.2 m of clearance
    // spread over the run — the top edge stays under every beam and housing, and the cone meets
    // nothing but the far bays before the bulkhead. Not for a corridor whose far end is a door hole:
    // the pool would go through it into the next room. From the far end the lamp is 40+ m behind the
    // player and culled: there the fills and the beacon carry the bulkhead (measured: a flood there
    // added 1 %). Range 1.5× the corridor so the cutoff curve still passes ~70 % at the bulkhead.
    const lobbyA = lobbyEnd === "min" ? clearMin : clearMax;
    const farA = lobbyEnd === "min" ? a1 - WALL_T : a0 + WALL_T;
    const canA = lobbyA + dir * 0.85; // beside the first housed strip (which starts at the clear line)
    const canC = cc + 0.8; // 0.8 m off the centreline: clear of the strip housing and the wall conduits
    const canY = C - 0.56;
    ctx.lights.push({
      type: "spot",
      pos: pt(canA + dir * 0.18, canY, canC),
      target: pt(farA, Y + (farSpot.aimY ?? 1.2), cc),
      color: fill.color ?? 0xd6e2ff,
      intensity: farSpot.intensity ?? 4000,
      distance: farSpot.distance ?? Math.round((a1 - a0) * 1.5),
      angle: farSpot.angle ?? 0.052,
      penumbra: 0.8,
      priority: 1,
    });
    // its fixture (every light needs a visible source): a stemmed spot can under the beam line, dark
    // rim toward the deck and a small emitter disc in the rim — a lit dot looking back from the far
    // end, out of frame from the door itself (above and behind the lobby-end views' camera)
    kit.add("paintedMetal", new THREE.BoxGeometry(0.06, C - canY - 0.1, 0.06), { pos: pt(canA, (C + canY + 0.11) / 2, canC), color: black });
    kit.cyl("paintedMetal", ...pt(canA, canY, canC), 0.11, 0.34, axis, { color: black, texel: 2.5 });
    kit.cyl("impPanel", ...pt(canA + dir * 0.15, canY, canC), 0.125, 0.06, axis, { color: dark, uv: "keep" });
    kit.cyl("emitWhite", ...pt(canA + dir * 0.185, canY, canC), 0.07, 0.02, axis, { segments: 16 });
  }
  if (farFlood) {
    // Far-end flood (door-end corridors, where a long-throw would shine through the door). A wide spot
    // `back` m before the far door: aim "deck" (default, on the far beam) points it 8 m back down the
    // corridor at the deck — for a far end the player stands at (cor-n's pod end, where the escape
    // bay's spots 5–15 m through the door take the rest of the spot pool, so this is the one corridor
    // spot live there: it carries that deck and casts the shadows); aim "end" points it at the door
    // and the bulkhead around it — mounted 9 m short of the door its pool weight from the lobby end
    // beats the neighbour rooms' keys that culled a flood on the far beam (d3-cor: the far end read
    // 17–21 % grey with the flood culled, 32 % in the round it was live).
    const endA = lobbyEnd === "min" ? clearMax : clearMin;
    const floodA = endA - dir * (farFlood.back ?? 0.4);
    const toEnd = farFlood.aim === "end";
    const floodC = farFlood.back > 1 ? cc + 0.8 : cc; // short of the end it hangs beside the strip housings
    const face = toEnd ? dir : -dir; // the emitter faces what the flood lights
    ctx.lights.push({
      type: "spot",
      pos: pt(floodA, C - 0.5, floodC),
      target: toEnd ? pt(lobbyEnd === "min" ? a1 - WALL_T : a0 + WALL_T, Y + 1.2, cc) : pt(floodA - dir * 8, Y, cc),
      color: fill.color ?? 0xd6e2ff,
      intensity: farFlood.intensity ?? 140,
      distance: farFlood.distance ?? 20,
      angle: 0.6,
      penumbra: 0.6,
      priority: 1,
    });
    // its fixture: a bracketed flood box under the ceiling, dark rim and a small emitter on the face
    // toward what it lights — a lit dot from afar, a floodlight up close
    const sz = (sa, sy, sc) => (axis === "x" ? [sa, sy, sc] : [sc, sy, sa]);
    kit.add("paintedMetal", new THREE.BoxGeometry(...sz(0.08, 0.26, 0.08)), { pos: pt(floodA, C - 0.13, floodC), color: black });
    kit.add("impPanel", new THREE.BoxGeometry(...sz(0.5, 0.3, 0.44)), { pos: pt(floodA, C - 0.41, floodC), color: dark, uv: "keep" });
    kit.add("paintedMetal", new THREE.BoxGeometry(...sz(0.04, 0.2, 0.34)), { pos: pt(floodA + face * 0.25, C - 0.43, floodC), color: black });
    kit.add("emitWhite", new THREE.BoxGeometry(...sz(0.02, 0.1, 0.26)), { pos: pt(floodA + face * 0.265, C - 0.43, floodC) });
  }
  if (farBeacon) {
    // rotating beacon hanging from the ceiling 1.2 m before the far-end door, off the centreline on
    // the plain-wall side (clear of the last strip and the heavy pipes), facing back down the corridor
    const b = BEACON[farBeacon] || BEACON.amber;
    const facing = axis === "x" ? Math.atan2(-dir, 0) : Math.atan2(0, -dir);
    const bc = pt((lobbyEnd === "min" ? clearMax : clearMin) - dir * 0.2, C - 0.25 - 0.03 - 0.085, cc - 0.9);
    motion.push(beacon(ctx, kit, PALETTE, bc, { ...b, facing, mount: "ceiling", stem: 0.25 }).update);
  }

  // ---- bay kinds, shuffled by the corridor seed (or in the order the manifest gives) ------------
  const bigKinds = opts.bigKinds ? opts.bigKinds.slice() : shuffle(["cabinet", "crates", "lockers", "bench"]);
  const smallKinds = shuffle(["junction", "screen", "toolboard", "wallcab", "vents"]);
  const phase = Math.floor(rand() * 2);
  let screenIdx = 0;
  let screensPlaced = 0;
  const nextScreen = () => screens[screenIdx++ % screens.length];

  // ---- per long face: conduits, kick strips, bays ------------------------------------------------
  longKeys.forEach((fk, side) => {
    const f = F[fk];
    const L = f.L;
    const yaw = faceYaw(f);
    const hs = holes(fk);
    const bigSide = engineering && fk === "e";
    // this face's u = 0 sits at the corridor's min end when its U points along +axis
    const uZeroAtMin = (axis === "x" ? f.U[0] : f.U[2]) > 0;
    const uLo = WALL_T + 0.02 + ((uZeroAtMin ? endHoleMin : endHoleMax) ? 1.0 : 0);
    const uHi = L - WALL_T - 0.02 - ((uZeroAtMin ? endHoleMax : endHoleMin) ? 1.0 : 0);

    // conduit runs (interrupted around blast doors, whose frames may reach the ceiling)
    let spans = [[uLo, uHi]];
    for (const o of hs) {
      if (o.v1 < 3.5) continue;
      const next = [];
      for (const [s0, s1] of spans) {
        if (o.u1 + 1.0 <= s0 || o.u0 - 1.0 >= s1) next.push([s0, s1]);
        else {
          if (o.u0 - 1.0 > s0) next.push([s0, o.u0 - 1.0]);
          if (o.u1 + 1.0 < s1) next.push([o.u1 + 1.0, s1]);
        }
      }
      spans = next;
    }
    const runs = bigSide
      ? [
          { r: 0.22, n: 0.83, y: 2.75, color: steel, bands: true },
          { r: 0.14, n: 0.75, y: 3.35, color: P("impGrey") },
          { r: 0.08, n: 0.69, y: 3.8, color: steel },
        ]
      : [
          { r: 0.08, n: 0.45, y: H - 0.55, color: steel },
          { r: 0.055, n: 0.68, y: H - 0.55, color: P("impGrey") },
          { r: 0.04, n: 0.86, y: H - 0.55, color: steel },
        ];
    for (const [s0, s1] of spans) {
      if (s1 - s0 < 1) continue;
      for (const run of runs) {
        pipe(kit, PALETTE, f.world(s0, run.y, run.n), f.world(s1, run.y, run.n), run.r, { color: run.color, bracket: FRAME });
        // penetration boxes where a run is cut short of an end wall
        for (const [u, cut] of [[s0, s0 > WALL_T + 0.1], [s1, s1 < L - WALL_T - 0.1]]) {
          if (cut) box(f, "paintedMetal", u, run.y, run.n, 0.3, run.r * 2 + 0.16, run.r * 2 + 0.16, { color: black, texel: 2.5 });
        }
        if (run.bands) {
          for (let u = s0 + 4; u < s1 - 1; u += 8) {
            const p = f.world(u, run.y, run.n);
            kit.cyl("paintedMetal", p[0], p[1], p[2], run.r + 0.012, 0.3, axis, { color: P("impAmber"), segments: 16 });
          }
        }
      }
    }
    if (bigSide) {
      // standoff cradles from the wall to the heavy pipes at every mid-bay
      for (let i = 0; i < bounds.length - 1; i++) {
        const u = uOf(f, (bounds[i] + bounds[i + 1]) / 2);
        if (nearHole(fk, u, 1.5) || spans.every(([s0, s1]) => u < s0 || u > s1)) continue;
        box(f, "paintedMetal", u, 2.75, WALL_T + 0.265, 0.12, 0.14, 0.53, { color: dark, texel: 2.5 });
        box(f, "paintedMetal", u, 3.35, WALL_T + 0.225, 0.1, 0.1, 0.45, { color: dark, texel: 2.5 });
        box(f, "paintedMetal", u, 3.05, WALL_T + 0.33, 0.14, 0.9, 0.08, { color: black, texel: 2.5 });
      }
    }

    // kick-level light strips, broken well clear of every door hole
    let kicks = [[uLo, uHi]];
    for (const o of hs) {
      const next = [];
      for (const [s0, s1] of kicks) {
        if (o.u1 + 0.6 <= s0 || o.u0 - 0.6 >= s1) next.push([s0, s1]);
        else {
          if (o.u0 - 0.6 > s0) next.push([s0, o.u0 - 0.6]);
          if (o.u1 + 0.6 < s1) next.push([o.u1 + 0.6, s1]);
        }
      }
      kicks = next;
    }
    for (const [s0, s1] of kicks) if (s1 - s0 > 0.3) box(f, kickMat, (s0 + s1) / 2, 0.1, WALL_T + 0.035, s1 - s0, 0.03, 0.02);

    // bay contents between frames: service bays on alternating bays per side (phase-shifted per
    // corridor), small kit in the others, each drawn from the shuffled kind lists
    let bi = side * 2;
    let si = side * 3;
    const bayCentres = []; // service bay u positions (the cable tray breaks around them)
    const occupied = []; // u spans taken by wall kit between 1 and 2.6 m (the door flanks avoid them)
    const trayTop = TRAY_Y - 0.02;
    for (let i = 0; i < bounds.length - 1; i++) {
      const p = bounds[i];
      const q = bounds[i + 1];
      const ac = (p + q) / 2;
      const uc = uOf(f, ac);
      const wantBig = (i + side + phase) % 2 === 0;
      const big = q - p >= 3.4 && !nearHole(fk, uc, 2.2) && !inApproach(ac, 1.25);
      const small = !nearHole(fk, uc, 1.3) && !inApproach(ac, 0.4);
      const back = WALL_T + 0.005;
      if (wantBig && big) {
        const kind = bigKinds[bi++ % bigKinds.length];
        bayCentres.push(uc);
        occupied.push([uc - 1.55, uc + 1.55]);
        serviceBay(kit, PALETTE, f.world(uc, 0, WALL_T), yaw, { lightMat: kickMat });
        if (kind === "cabinet") {
          const colr = rand() < 0.5 ? mid : P("impGrey");
          dressedCabinet(kit, PALETTE, f.world(uc - 0.28, 0, back + 0.25), yaw, { w: 1.2, h: 1.8, d: 0.5, color: colr, emit: accent, seed: seed + i * 3 });
          dressedCrate(kit, PALETTE, f.world(uc + 0.6, 0, back + 0.25), yaw, { w: 0.55, h: 0.55, d: 0.5, seed: seed + i, ...crateOpts });
        } else if (kind === "crates") {
          dressedCrate(kit, PALETTE, f.world(uc - 0.43, 0, back + 0.3), yaw, { w: 0.8, h: 1.0, d: 0.6, seed: seed + i, ...crateOpts });
          dressedCrate(kit, PALETTE, f.world(uc + 0.43, 0, back + 0.3), yaw, { w: 0.8, h: 1.0, d: 0.6, seed: seed + i + 1, ...crateOpts });
          if (rand() < 0.7) dressedCrate(kit, PALETTE, f.world(uc - 0.43, 1.0, back + 0.3), yaw, { w: 0.8, h: 0.6, d: 0.6, seed: seed + i + 2, ...crateOpts });
        } else if (kind === "lockers") {
          // the open unit is the one farthest from the lobby door: every corridor camera but the
          // pod-end looks away from the lobby, so that unit is the one seen face-on rather than the
          // one foreshortened or cut by the frame edge (the placer's +x runs along the face)
          const xAlong = axis === "x" ? Math.cos(yaw) : -Math.sin(yaw);
          const openIndex = xAlong * (lobbyEnd === "min" ? 1 : -1) > 0 ? 2 : 0;
          lockerRow(kit, PALETTE, f.world(uc, 0, back + 0.25), yaw, { count: 3, unit: 0.58, h: 2.0, d: 0.5, color: rand() < 0.5 ? mid : P("impGrey"), seed: seed + i * 11, accent, open: "doorless", openIndex });
        } else if (kind === "workbench") {
          workbench(kit, PALETTE, f.world(uc, 0, back), yaw, { len: 1.7, depth: 0.58, accent, seed: seed + i * 5 });
          toolBoard(kit, PALETTE, f.world(uc, 1.95, back), yaw, { w: 1.3, h: 0.7, seed: seed + i * 7, accent });
        } else if (kind === "drums") {
          drumPair(kit, PALETTE, f.world(uc, 0, back), yaw, { seed: seed + i, accent });
          wallCabinet(kit, PALETTE, f.world(uc, 1.8, back), yaw, { w: 0.9, h: 0.7, d: 0.3, accent, seed: seed + i * 7, color: rand() < 0.5 ? mid : P("impGrey") });
        } else {
          bench(kit, PALETTE, f.world(uc, 0, back), yaw, { len: 1.7, accent, items: { seed: seed + i, screenMat: screens[0] } });
          if (screensPlaced < 3) {
            wallScreen(kit, f.world(uc, 2.05, back + 0.08), yaw, 1.2, 0.7, nextScreen(), { accent, tilt: 0.2 });
            screensPlaced++;
          } else toolBoard(kit, PALETTE, f.world(uc, 1.85, back), yaw, { w: 1.2, h: 0.8, seed: seed + i, accent });
        }
        continue;
      }
      if (!small) continue;
      if (wantBig) {
        // a bay that cannot host a service niche still gets a vent so no wall reads blank
        wallVent(kit, PALETTE, f.world(uc, 3.4, WALL_T), yaw, { w: 1.0, h: 0.45 });
        continue;
      }
      let kind = smallKinds[si++ % smallKinds.length];
      if (kind === "screen" && (screensPlaced >= 2 || q - p < 3.4)) kind = "vents";
      if (kind === "junction") {
        junctionBox(kit, PALETTE, f.world(uc, 1.35, WALL_T), yaw, { seed: seed + i, conduitUp: bigSide ? H - 0.05 - 1.7 : trayTop - 1.7, accent });
        wallVent(kit, PALETTE, f.world(uc, 3.4, WALL_T), yaw, { w: 0.7, h: 0.35 });
        occupied.push([uc - 0.25, uc + 0.25]);
      } else if (kind === "screen") {
        wallScreen(kit, f.world(uc, 2.35, WALL_T + 0.08), yaw, 1.6, 0.9, nextScreen(), { accent, tilt: 0.25 });
        screensPlaced++;
        junctionBox(kit, PALETTE, f.world(uc, 1.2, WALL_T), yaw, { w: 0.36, h: 0.5, seed: seed + i + 9, accent });
        wallVent(kit, PALETTE, f.world(uc, 3.45, WALL_T), yaw, { w: 1.0, h: 0.45 });
        occupied.push([uc - 0.8, uc + 0.8]);
      } else if (kind === "toolboard") {
        toolBoard(kit, PALETTE, f.world(uc, 1.55, WALL_T), yaw, { w: 1.2, h: 0.9, seed: seed + i * 5, accent });
        wallVent(kit, PALETTE, f.world(uc, 3.4, WALL_T), yaw, { w: 1.0, h: 0.45 });
        occupied.push([uc - 0.6, uc + 0.6]);
      } else if (kind === "wallcab") {
        wallCabinet(kit, PALETTE, f.world(uc, 1.5, WALL_T), yaw, { w: 0.9, h: 0.8, d: 0.3, accent, seed: seed + i * 7, color: rand() < 0.5 ? mid : P("impGrey") });
        junctionBox(kit, PALETTE, f.world(uc, 2.4, WALL_T), yaw, { w: 0.5, h: 0.4, seed: seed + i + 4, accent, conduitUp: bigSide ? H - 0.05 - 2.6 : trayTop - 2.6 });
        occupied.push([uc - 0.45, uc + 0.45]);
      } else if (q - p >= 3.4) {
        // vent bay: status panel + hazard line with a wall cabinet and its feed conduit beside them,
        // so the 3 × 3 m panel does not read as bare wall with one keypad
        wallVent(kit, PALETTE, f.world(uc, 3.4, WALL_T), yaw, { w: 1.4, h: 0.6 });
        statusPanel(kit, PALETTE, f.world(uc - 0.55, 1.45, WALL_T), yaw, { accent });
        wallCabinet(kit, PALETTE, f.world(uc + 0.4, 1.5, WALL_T), yaw, { w: 0.8, h: 0.8, d: 0.28, accent, seed: seed + i * 7, color: rand() < 0.5 ? mid : P("impGrey") });
        junctionBox(kit, PALETTE, f.world(uc + 0.4, 2.35, WALL_T), yaw, { w: 0.44, h: 0.4, seed: seed + i + 4, accent, conduitUp: bigSide ? H - 0.05 - 2.55 : trayTop - 2.55 });
        box(f, "hazard", uc, 0.62, WALL_T + 0.012, 1.4, 0.08, 0.008, { texel: 2 });
        occupied.push([uc - 0.75, uc + 0.85]);
      } else {
        wallVent(kit, PALETTE, f.world(uc, 3.4, WALL_T), yaw, { w: Math.min(1.4, q - p - 1.0), h: 0.6 });
        statusPanel(kit, PALETTE, f.world(uc, 1.45, WALL_T), yaw, { accent });
        box(f, "hazard", uc, 0.62, WALL_T + 0.012, Math.min(1.0, q - p - 1.0), 0.08, 0.008, { texel: 2 });
        occupied.push([uc - 0.2, uc + 0.2]);
      }
    }

    // flanking panels beside door holes, so no panel next to a door is blank: from the edge of the
    // 1 m clear zone out to the first obstacle (rib, other hole's clear zone, bay kit, corridor end)
    // — a wall cabinet / tool board / vent + junction box in turn where ≥ 1 m is free, a narrow
    // junction-and-vent riser where only 0.5–1 m is (a door edge close to a rib)
    let flankIdx = side;
    const ribUs = frames.map((a) => uOf(f, a)).filter((fu) => !nearHole(fk, fu, 0.5));
    for (const o of hs) {
      for (const dir of [-1, 1]) {
        let edge = dir < 0 ? o.u0 - 1.0 : o.u1 + 1.0;
        for (const fu of ribUs) if (Math.abs(fu - edge) < 0.3) edge = fu + dir * 0.3; // rib straddles the zone edge
        let lim = dir < 0 ? uLo + 0.05 : uHi - 0.05;
        let blocked = false;
        const consider = (e) => {
          if (dir < 0 ? e < edge && e > lim : e > edge && e < lim) lim = e;
        };
        for (const fu of ribUs) consider(fu - dir * 0.3);
        for (const h2 of hs) {
          if (h2 === o) continue;
          if (h2.u0 - 1.0 < edge && h2.u1 + 1.0 > edge) blocked = true;
          consider(dir < 0 ? h2.u1 + 1.0 : h2.u0 - 1.0);
        }
        for (const [s0, s1] of occupied) {
          if (s0 - 0.1 <= edge && s1 + 0.1 >= edge) blocked = true;
          consider(dir < 0 ? s1 + 0.1 : s0 - 0.1);
        }
        const avail = (lim - edge) * dir;
        if (blocked || avail < 0.5) continue;
        if (avail >= 1.0) {
          const cu = edge + dir * 0.45;
          const k = flankIdx++ % 3;
          if (k === 0) wallCabinet(kit, PALETTE, f.world(cu, 1.55, WALL_T), yaw, { w: 0.8, h: 0.8, d: 0.28, accent, seed: seed + Math.round(cu), color: mid });
          else if (k === 1) toolBoard(kit, PALETTE, f.world(cu, 1.6, WALL_T), yaw, { w: 0.9, h: 0.8, seed: seed + Math.round(cu) * 3, accent });
          else {
            wallVent(kit, PALETTE, f.world(cu, 2.35, WALL_T), yaw, { w: 0.8, h: 0.4 });
            junctionBox(kit, PALETTE, f.world(cu, 1.35, WALL_T), yaw, { w: 0.4, h: 0.55, seed: seed + Math.round(cu), accent });
          }
          occupied.push([cu - 0.45, cu + 0.45]);
        } else {
          const cu = edge + (dir * avail) / 2;
          const w = Math.min(0.5, avail - 0.1);
          // sits above the door keypad's row so the two do not read as a doubled panel
          wallVent(kit, PALETTE, f.world(cu, 2.55, WALL_T), yaw, { w, h: 0.3 });
          junctionBox(kit, PALETTE, f.world(cu, 1.75, WALL_T), yaw, { w: Math.min(0.4, avail - 0.14), h: 0.5, seed: seed + Math.round(cu), accent, conduitUp: 0.4 });
          occupied.push([cu - w / 2, cu + w / 2]);
        }
      }
    }

    // wall cable tray at 3 m (the plain side only; the engineering side carries the heavy pipes),
    // broken around door holes and service bay headers, with cables and straps
    if (!bigSide) {
      let trays = [[uLo + 0.2, uHi - 0.2]];
      const cut = (c0, c1) => {
        const next = [];
        for (const [s0, s1] of trays) {
          if (c1 <= s0 || c0 >= s1) next.push([s0, s1]);
          else {
            if (c0 > s0) next.push([s0, c0]);
            if (c1 < s1) next.push([c1, s1]);
          }
        }
        trays = next;
      };
      for (const o of hs) cut(o.u0 - 0.85, o.u1 + 0.85);
      for (const bc of bayCentres) cut(bc - 1.4, bc + 1.4);
      for (const fu of ribUs) cut(fu - 0.32, fu + 0.32); // sections end at each bulkhead rib
      for (const [s0, s1] of trays) {
        if (s1 - s0 < 0.8) continue;
        cableTray(kit, PALETTE, f.world(s0, TRAY_Y, WALL_T + 0.21), f.world(s1, TRAY_Y, WALL_T + 0.21), { w: 0.34, h: 0.07, strap: 2.0 });
        for (const u of [s0 + 0.02, s1 - 0.02]) box(f, "paintedMetal", u, TRAY_Y + 0.025, WALL_T + 0.2, 0.05, 0.13, 0.4, { color: black, texel: 2.5 });
      }
    }
  });

  // ---- door treatments on every face ----------------------------------------------------------
  for (const fk of ["n", "s", "e", "w"]) {
    const f = F[fk];
    const yaw = faceYaw(f);
    for (const o of holes(fk)) {
      const p = f.world(o.u0, 0, WALL_T);
      const q = f.world(o.u1, 0, WALL_T + 0.4);
      hazardStrip(kit, [Math.min(p[0], q[0]), Math.min(p[2], q[2])], [Math.max(p[0], q[0]), Math.max(p[2], q[2])], Y + 0.014);
      // status panel on one flank, room sign plate (accent code + three "text" bars, top aligned with
      // the panel) on the other, so neither panel beside a door is blank
      const flanks = [];
      if (o.u1 + 0.95 <= f.L - WALL_T) flanks.push(o.u1 + 0.75);
      if (o.u0 - 0.95 >= WALL_T) flanks.push(o.u0 - 0.75);
      if (flanks.length) statusPanel(kit, PALETTE, f.world(flanks[0], 1.45, WALL_T), yaw, { accent });
      if (flanks.length > 1) {
        const su = flanks[1];
        box(f, "paintedMetal", su, 1.6, WALL_T + 0.02, 0.5, 0.28, 0.04, { color: black, texel: 2.5 });
        box(f, "darkGloss", su, 1.6, WALL_T + 0.045, 0.44, 0.22, 0.01);
        box(f, accent, su - 0.14, 1.6, WALL_T + 0.055, 0.12, 0.12, 0.008);
        for (let k = 0; k < 3; k++) box(f, "paintedMetal", su + 0.09, 1.66 - k * 0.06, WALL_T + 0.055, 0.22, 0.025, 0.008, { color: P("impGrey") });
      }
      if (o.v1 < H - 0.9) {
        // door header marker (standard doors only; blast holes reach the cornice)
        const v = o.v1 + 0.5;
        box(f, "darkGloss", (o.u0 + o.u1) / 2, v, WALL_T + 0.012, 0.7, 0.24, 0.02);
        box(f, accent, (o.u0 + o.u1) / 2 - 0.2, v, WALL_T + 0.026, 0.16, 0.08, 0.008);
        box(f, "emitWhite", (o.u0 + o.u1) / 2 + 0.12, v, WALL_T + 0.026, 0.3, 0.05, 0.008);
      }
    }
  }

  // ---- dead ends -----------------------------------------------------------------------------
  for (const fk of endKeys) {
    const f = F[fk];
    if (holes(fk).length) continue;
    const yaw = faceYaw(f);
    const uc = f.L / 2;
    box(f, "impPanel", uc, 2.1, WALL_T + 0.03, 3.6, 3.4, 0.06, { color: black, uv: "keep" });
    box(f, "impPanel", uc, 2.1, WALL_T + 0.08, 3.3, 3.1, 0.04, { color: dark, uv: "keep" });
    box(f, "hazard", uc - 1.5, 2.1, WALL_T + 0.11, 0.2, 3.0, 0.02, { texel: 2 });
    box(f, "hazard", uc + 1.5, 2.1, WALL_T + 0.11, 0.2, 3.0, 0.02, { texel: 2 });
    box(f, "emitRedImp", uc - 0.9, 3.1, WALL_T + 0.105, 0.36, 0.06, 0.01);
    box(f, "emitRedImp", uc + 0.9, 3.1, WALL_T + 0.105, 0.36, 0.06, 0.01);
    box(f, "emitAmber", uc, 3.1, WALL_T + 0.105, 0.6, 0.06, 0.01);
    wallVent(kit, PALETTE, f.world(uc, 3.5, WALL_T + 0.12), yaw, { w: 1.4, h: 0.4 });
    // eye-level display tilted 20° down: with the fills 1.3 m under the ceiling, a screen up at
    // 2.75 m sees them near its horizon and mirrors them into the camera (the roughness-0.35 lobe
    // is ~15° wide); at 2.3 m with this tilt every fill sits ≥ 30° off the mirror direction
    const lockers = deadEnd.kit === "lockers";
    tiltedScreen(kit, PALETTE, f.world(uc, 2.3, WALL_T + 0.1), yaw, { w: lockers ? 1.4 : 1.6, h: 1.0, accent, tilt: 0.35, mat: deadEnd.screen || screens[screens.length - 1] });
    if (lockers) {
      // seen head-on from the dead-end view: the door swings 72° so the lit interior shows past it
      // (at 35° the door hid the whole recess and the pair read as two identical closed lockers)
      lockerRow(kit, PALETTE, f.world(uc - 1.2, 0, WALL_T + 0.11 + 0.25), yaw, { count: 2, unit: 0.6, h: 2.0, d: 0.5, seed: seed + 45, accent, openAngle: 1.25 });
      dressedCrate(kit, PALETTE, f.world(uc + 1.15, 0, WALL_T + 0.11 + 0.35), yaw, { w: 0.9, h: 0.9, d: 0.7, seed: seed + 42, ...crateOpts });
      toolBoard(kit, PALETTE, f.world(uc + 1.2, 1.6, WALL_T + 0.12), yaw, { w: 0.9, h: 0.7, seed: seed + 44, accent });
    } else {
      dressedCabinet(kit, PALETTE, f.world(uc - 1.15, 0, WALL_T + 0.11 + 0.25), yaw, { w: 1.2, h: 1.8, d: 0.5, emit: accent, seed: seed + 41 });
      dressedCrate(kit, PALETTE, f.world(uc + 1.15, 0, WALL_T + 0.11 + 0.35), yaw, { w: 1.2, h: 1.2, d: 0.7, seed: seed + 42, ...crateOpts });
      dressedCrate(kit, PALETTE, f.world(uc + 1.25, 1.2, WALL_T + 0.11 + 0.3), yaw, { w: 0.8, h: 0.7, d: 0.6, seed: seed + 43, ...crateOpts });
    }
    // no extra fill here: the last bay's fixture fill (0.8 m out) washes the bulkhead. The rotating
    // beacon above the bulkhead panel (red by default) is the dead end's motion light.
    if (deadEnd.beacon !== false) {
      const b = BEACON[deadEnd.beacon || "red"];
      motion.push(beacon(ctx, kit, PALETTE, f.world(uc, 4.0, WALL_T + 0.35), { ...b, facing: yaw, mount: "wall", back: 0.35 }).update);
    }
  }

  E.build(ctx.group, `${room.id}-emitters`);
  return {
    update(dt, t) {
      for (let i = 0; i < motion.length; i++) motion[i](t);
      E.flush();
    },
  };
}
