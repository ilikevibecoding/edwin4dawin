// Imperial corridors: the long white-panelled passage with the 45° chamfered upper walls. The shell is
// shared; each deck dresses its corridor differently so the four never read as the same tube:
//   A command  — recessed ceiling light channel, inset status screens, black floor lane, cool white
//   B officers — gloss inlay runner with brass rails, pilasters, framed crest panels, warm cans, no troughs
//   C crew     — cable trays and pipe runs along the port wall, numbered bulkhead frames, amber light
//   D engineering — heavy ribs with hazard bands, floor grates over lit trenches, ceiling conduits
import * as THREE from "three";
import { PALETTE } from "../materials.js";
import { impRoomShell, impWallGear, lux, Frame } from "./imperial_kit.js";
import { rng } from "../kit.js";
import { IMP_DECAL } from "../textures_imperial.js";
import { ceilingChannel, insetScreen, glossRunner, pilaster, framedPanel, warmCan, cableTrayWall, pipeWall, bulkheadFrame, heavyRib, gratingStrip, hazardBars, conduitRun, warningLampF } from "./deck_signature.js";

const BLK = PALETTE.impBlack;
const CHR = PALETTE.impCharcoal;

export function buildCorridor(kit, ctx, room) {
  const [w, h, d] = room.size;
  const accentKey = ctx.accentKey ? ctx.accentKey(room) : "emitBlue";
  const deck = room.deck;
  const P = PROFILE[deck] || PROFILE.A;
  const walls = impRoomShell(kit, room, ctx.doors, {
    accentKey,
    wall: { panelW: 2.2, corniceLight: false, corniceH: 0.2, ...P.wall },
    floor: P.floor,
    ceiling: P.ceiling,
  });
  chamfers(kit, w, h, d, P.chamferKey, P.chamferRibStep);
  // door positions along each side wall (u along the wall's frame) with their half-widths
  const doorsZ = ctx.doors.map((dd) => dd.lz);
  const doorsU = { W: [], E: [] };
  for (const dd of ctx.doors) {
    if (dd.side === "W") doorsU.W.push([d / 2 - dd.lz, dd.w / 2]);
    else if (dd.side === "E") doorsU.E.push([dd.lz + d / 2, dd.w / 2]);
  }
  const env = { kit, room, walls, w, h, d, accentKey, doorsZ, doorsU, accent: new THREE.Color(room.accent || "#4f8dff").getHex() };
  P.build(env);
  // deck sign at the far end
  const end = walls.S.frame;
  end.decal(IMP_DECAL.arrowUp, w / 2 - 1.0, 2.2, 0.03, 0.5);
  end.decal(IMP_DECAL.glyphs3, w / 2 + 1.0, 2.2, 0.03, 0.5);
}

/**
 * Angled upper walls: 45° chamfer strips between the wall tops and the (narrower) ceiling spine, with
 * a recessed dim light slot along each — the classic Imperial corridor section.
 */
function chamfers(kit, w, h, d, slotKey, ribStep) {
  const chH = 0.85;
  for (const s of [-1, 1]) {
    const o = new THREE.Vector3(s * (w / 2 - 0.08), h - chH - 0.2, s > 0 ? d / 2 : -d / 2);
    const U = new THREE.Vector3(0, 0, s > 0 ? -1 : 1);
    const V = new THREE.Vector3(-s * chH, chH, 0);
    const f = new Frame(kit, o, U, V);
    const L = V.length();
    f.box("impPanel2", d / 2, L / 2, -0.03, d, L, 0.06, { color: PALETTE.impGrey, uv: "world", texel: 1 });
    f.box("impTrim", d / 2, L * 0.5, 0.005, d, 0.16, 0.03, { color: BLK });
    if (slotKey) f.box(slotKey, d / 2, L * 0.5, 0.012, d - 0.6, 0.06, 0.012, { uv: "keep" });
    for (let z = -d / 2 + ribStep / 2; z < d / 2; z += ribStep) f.box("impTrim", z + d / 2, L / 2, 0.02, 0.24, L + 0.02, 0.05, { color: BLK });
  }
}

/** Free u-intervals along a side wall between the door openings (with a margin), trimmed at the ends. */
function freeSpans(len, doors, margin = 0.7, minLen = 1.6) {
  let spans = [[0.5, len - 0.5]];
  for (const [u, hw] of doors) {
    const a = u - hw - margin;
    const b = u + hw + margin;
    const next = [];
    for (const [s0, s1] of spans) {
      if (b <= s0 || a >= s1) next.push([s0, s1]);
      else {
        if (a > s0) next.push([s0, a]);
        if (b < s1) next.push([b, s1]);
      }
    }
    spans = next;
  }
  return spans.filter(([a, b]) => b - a >= minLen);
}

/** Positions along z every `step`, skipping anything within `clear` of a door. */
function gridZ(d, step, doorsZ, clear, start = null) {
  const out = [];
  for (let z = start === null ? -d / 2 + step / 2 : start; z < d / 2 - 1.5; z += step) {
    if (z < -d / 2 + 1.5) continue;
    if (doorsZ.some((dz) => Math.abs(dz - z) < clear)) continue;
    out.push(z);
  }
  return out;
}

/** Standard structural rib: black frame around the section with a lit inset strip (command corridor). */
function standardRib(kit, z, w, h, accentKey) {
  for (const s of [-1, 1]) {
    kit.box("impTrim", s * (w / 2 - 0.12), h / 2, z, 0.24, h, 0.5, { color: BLK, texel: 1 });
    kit.box("impMetal", s * (w / 2 - 0.25), h * 0.55, z, 0.02, h * 0.5, 0.3, { color: CHR });
    kit.box(accentKey, s * (w / 2 - 0.262), h * 0.55, z, 0.01, h * 0.42, 0.04);
    kit.collider([s > 0 ? w / 2 - 0.26 : -w / 2, 0, z - 0.25], [s > 0 ? w / 2 : -w / 2 + 0.26, h, z + 0.25], "rib");
  }
  kit.box("impTrim", 0, h - 0.14, z, w, 0.28, 0.5, { color: BLK, texel: 1 });
  kit.box("chevronY", 0, 0.004, z, w - 1.0, 0.008, 0.4, { texel: 1.5 });
}

/** Evenly spaced ceiling keys along the corridor axis. */
function keyLights(kit, d, h, n, color, k, opts = {}) {
  const { distance = 11, drop = 0.5, decay = 2 } = opts;
  for (let i = 0; i < n; i++) {
    const z = -d / 2 + ((i + 0.5) / n) * d;
    kit.light({ type: "point", pos: [0, h - drop, z], color, intensity: lux(h - drop, k), distance, decay, priority: 0.5 - i * 0.01 });
  }
}

// ---------------------------------------------------------------------------
// Deck profiles
// ---------------------------------------------------------------------------
const PROFILE = {
  // A — command: recessed ceiling channel instead of troughs, inset status screens, cool white keys
  A: {
    wall: { features: { vent: 0.08, equipment: 0.08, conduit: 0.05, light: 0.06, screen: 0.0 } },
    floor: { lane: true, laneW: 1.8, edgeLight: "emitBlueDim" },
    ceiling: { troughs: 0, beamStep: 4.0 },
    chamferKey: "emitWhiteDim",
    chamferRibStep: 8,
    build({ kit, walls, w, h, d, accentKey, doorsZ, doorsU, accent }) {
      ceilingChannel(kit, -d / 2 + 0.4, d / 2 - 0.4, h, { w: 0.8, key: "emitWhiteDim" });
      for (const z of gridZ(d, 8, doorsZ, 2.2, -d / 2 + 4)) standardRib(kit, z, w, h, accentKey);
      // inset status screens on both walls between the doors, wall gear in the shorter gaps
      const screens = ["scrBlue0", "scrBlue1", "scrBlue2", "scrBlue3"];
      let k = 0;
      for (const side of ["W", "E"]) {
        const F = walls[side].frame;
        for (const [a, b] of freeSpans(d, doorsU[side], 1.0, 3.2)) {
          const n = Math.max(1, Math.floor((b - a) / 7.5));
          for (let i = 0; i < n; i++, k++) {
            const u = a + ((i + 0.5) / n) * (b - a);
            if (k % 3 === 2) impWallGear(F, u, 1.5, { seed: k + 3, accentKey });
            else insetScreen(F, u, 1.8, screens[k % screens.length], { accentKey, w: 1.3, h: 0.8 });
          }
        }
      }
      keyLights(kit, d, h, 6, 0xe4ecff, 1.5, { distance: 11 });
      for (const t of [0.25, 0.75]) kit.light({ type: "point", pos: [0, 0.25, -d / 2 + t * d], color: accent, intensity: 2.2, distance: 9, priority: 0.25 });
    },
  },
  // B — officers: gloss runner with brass rails, pilasters, framed crest panels, warm cans, no troughs
  B: {
    wall: { altChance: 0.04, features: { vent: 0.03, equipment: 0.03, conduit: 0.0, light: 0.0, screen: 0.0 } },
    floor: { lane: false },
    ceiling: { troughs: 0, beamStep: 5.5 },
    chamferKey: "emitAmberDim",
    chamferRibStep: 5.5,
    build({ kit, walls, w, h, d, doorsZ, doorsU }) {
      glossRunner(kit, -0.75, -d / 2 + 0.5, 0.75, d / 2 - 0.5);
      // pilasters where the other decks carry ribs, framed panels between them
      const ribs = gridZ(d, 5.5, doorsZ, 2.0);
      const decals = [IMP_DECAL.cog, IMP_DECAL.glyphs3, IMP_DECAL.bay01, IMP_DECAL.glyphs2, IMP_DECAL.bay02];
      let k = 0;
      for (const side of ["W", "E"]) {
        const F = walls[side].frame;
        // pilasters and picture lights stop under the chamfer (its foot is 1.05 m below the ceiling)
        for (const z of ribs) pilaster(F, side === "W" ? d / 2 - z : z + d / 2, h - 1.05, { w: 0.36 });
        for (const [a, b] of freeSpans(d, doorsU[side], 0.9, 2.6)) {
          const n = Math.max(1, Math.floor((b - a) / 5.5));
          for (let i = 0; i < n; i++, k++) {
            const u = a + ((i + 0.5) / n) * (b - a);
            if (ribs.some((z) => Math.abs((side === "W" ? d / 2 - z : z + d / 2) - u) < 1.0)) continue;
            framedPanel(F, u, 1.7, 1.2, 1.3, { decal: decals[k % decals.length], glow: "emitAmberDim" });
          }
        }
      }
      const n = Math.max(2, Math.round(d / 7.3));
      for (let i = 0; i < n; i++) {
        const z = -d / 2 + ((i + 0.5) / n) * d;
        warmCan(kit, 0, h, z, "emitAmberDim");
        kit.light({ type: "point", pos: [0, h - 0.6, z], color: 0xffd0a0, intensity: lux(h - 0.6, 1.5), distance: 11, priority: 0.5 - i * 0.01 });
      }
    },
  },
  // C — crew: cable trays and pipes along the port wall, numbered bulkhead frames, amber light
  C: {
    wall: { altChance: 0.4, features: { vent: 0.1, equipment: 0.0, conduit: 0.06, light: 0.0, screen: 0.02 } },
    floor: { lane: true, laneW: 1.6, edgeLight: "emitAmberDim" },
    ceiling: { troughs: 1, troughW: 0.4, beamStep: 6.0, lightKey: "emitAmberDim" },
    chamferKey: "emitAmberDim",
    chamferRibStep: 6,
    build({ kit, walls, w, h, d, doorsZ, doorsU }) {
      const W = walls.W.frame;
      let k = 0;
      for (const [a, b] of freeSpans(d, doorsU.W, 0.9, 2.4)) {
        cableTrayWall(W, a, b, 2.38, { seed: 11 + k, cables: 4, accentKey: "emitAmber" });
        pipeWall(W, a, b, 1.95, 0.06, { color: PALETTE.impGreyDark, clampStep: 2.2, flangeStep: 4.4 });
        pipeWall(W, a, b, 1.72, 0.04, { color: PALETTE.impGrey, clampStep: 2.2, flangeStep: 6.6 });
        k++;
      }
      // starboard wall: wall gear in the gaps
      const E = walls.E.frame;
      let g = 0;
      for (const [a, b] of freeSpans(d, doorsU.E, 1.0, 3.2)) {
        const n = Math.max(1, Math.floor((b - a) / 9));
        for (let i = 0; i < n; i++, g++) impWallGear(E, a + ((i + 0.5) / n) * (b - a), 1.5, { seed: g + 7, accentKey: "emitAmber" });
      }
      // numbered bulkhead frames every 6 m
      let idx = 0;
      for (const z of gridZ(d, 6, doorsZ, 2.3)) bulkheadFrame(kit, z, w, h, idx++, { lampKey: "emitAmberDim" });
      keyLights(kit, d, h, 7, 0xffbe70, 1.6, { distance: 11 });
      kit.light({ type: "point", pos: [0, 0.25, 0], color: 0xffb040, intensity: 2.4, distance: 10, priority: 0.25 });
    },
  },
  // D — engineering: heavy ribs, grates over lit trenches, hazard stripes, ceiling conduits, no lane
  D: {
    wall: { panelColor: PALETTE.impGrey, panelColorAlt: PALETTE.impGreyDark, altChance: 0.3, features: { vent: 0.14, equipment: 0.06, conduit: 0.14, light: 0.0, screen: 0.0 } },
    floor: { lane: false },
    ceiling: { troughs: 0, beamStep: 3.5 },
    chamferKey: "emitAmberDim",
    chamferRibStep: 7,
    build({ kit, walls, w, h, d, doorsZ, doorsU }) {
      const rand = rng(43);
      const grid = [];
      for (let z = -d / 2 + 3.5; z < d / 2 - 1.5; z += 7) grid.push(z);
      let k = 0;
      for (const z of grid) {
        if (!doorsZ.some((dz) => Math.abs(dz - z) < 2.4)) heavyRib(kit, z, w, h, { accentKey: "emitAmber", lamp: k % 2 === 1 });
        hazardBars(kit, -1.3, z, 1.3, z, { w: 0.3, bar: 0.4 });
        k++;
      }
      // lit trench gratings between the ribs (and from the ends to the first / last rib)
      const cuts = [-d / 2 + 0.6, ...grid, d / 2 - 0.6];
      for (let i = 0; i < cuts.length - 1; i++) {
        const z0 = cuts[i] + (i === 0 ? 0 : 0.45);
        const z1 = cuts[i + 1] - (i === cuts.length - 2 ? 0 : 0.45);
        if (z1 - z0 > 1.2) gratingStrip(kit, -0.6, z0, 0.6, z1, { glow: "emitAmberDim" });
      }
      conduitRun(kit, [-0.98, -0.82], h - 0.36, -d / 2 + 0.5, d / 2 - 0.5, { rs: [0.06, 0.045], colors: [PALETTE.impGreyDark, CHR], clampStep: 3.5 });
      conduitRun(kit, [0.85, 1.0], h - 0.36, -d / 2 + 0.5, d / 2 - 0.5, { rs: [0.05, 0.075], colors: [PALETTE.impGrey, PALETTE.impGreyDark], clampStep: 3.5 });
      // wall gear and caged warning lamps in the gaps
      let g = 0;
      for (const side of ["W", "E"]) {
        const F = walls[side].frame;
        for (const [a, b] of freeSpans(d, doorsU[side], 1.0, 3.0)) {
          const n = Math.max(1, Math.floor((b - a) / 8));
          for (let i = 0; i < n; i++, g++) {
            const u = a + ((i + 0.5) / n) * (b - a);
            if (rand() < 0.5) impWallGear(F, u, 1.5, { seed: g + 5, accentKey: "emitAmber" });
            else warningLampF(F, u, 2.9, g % 3 === 0 ? "emitRedImp" : "emitAmber", 0.09);
          }
        }
      }
      keyLights(kit, d, h, 7, 0xffd6a0, 1.7, { distance: 13 });
      kit.light({ type: "point", pos: [0, 0.3, 0], color: 0xffb040, intensity: 2.6, distance: 12, priority: 0.25 });
    },
  },
};
