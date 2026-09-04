// Command bridge of the ISD Vindicator. Classic Imperial layout on three levels:
//   * aft vestibule (y 0) behind the blast door, under a low soffit;
//   * two sunken crew pits (y 0) flanking a raised command walkway (y 1.8) that runs from the
//     vestibule stairs to the forward command platform at the nine armoured viewports;
//   * outer decks (y 1.8) with equipment banks, tactical wall displays and a comms alcove.
// Room-local frame: origin at the floor centre, +x starboard, +y up, -z forward (bow).
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { PALETTE, setDomain } from "../materials.js";
import { rng } from "../kit.js";
import { Frame, wallFrame, roomWalls, openingsFor, impWall, impConsole, impChair, impRailing, impPillar, impWallGear, lux, UP } from "./imperial_kit.js";
import { IMP_DECAL, impDecalRect } from "../textures_imperial.js";
import { TOWER } from "../spec.js";
import { makeTacticalMap, makeStatusBoard } from "../textures_bridge.js";

const X_AXIS = new THREE.Vector3(1, 0, 0);
const Z_AXIS = new THREE.Vector3(0, 0, 1);
const BLACK = PALETTE.impBlack;
const CHAR = PALETTE.impCharcoal;
const GREYD = PALETTE.impGreyDark;
const GREY = PALETTE.impGrey;

// ---------------------------------------------------------------------------
// materials owned by this room (prefix bridge_)
// ---------------------------------------------------------------------------
function ensureMaterials(M) {
  if (!M.bridge_tacScreen) {
    const m = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: makeTacticalMap(1024, 512, 7), emissiveIntensity: 1.35, roughness: 0.6, metalness: 0 });
    M.bridge_tacScreen = setDomain(m, "interior");
  }
  if (!M.bridge_statusBoard) {
    const m = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: makeStatusBoard(512, 1024, 3), emissiveIntensity: 1.3, roughness: 0.6, metalness: 0 });
    M.bridge_statusBoard = setDomain(m, "interior");
  }
}

// ---------------------------------------------------------------------------
// small geometry helpers
// ---------------------------------------------------------------------------
/** Cylinder between two room-local points. */
function tube(kit, mat, a, b, r, opts = {}) {
  const d = new THREE.Vector3().subVectors(b, a);
  const len = d.length();
  const q = new THREE.Quaternion().setFromUnitVectors(UP, d.clone().normalize());
  const g = new THREE.CylinderGeometry(r, r, len, opts.segments || 10);
  const mid = a.clone().add(b).multiplyScalar(0.5);
  kit.add(mat, g, { pos: [mid.x, mid.y, mid.z], quat: q, uv: "scale", uvScale: [2 * Math.PI * r, len], color: opts.color || 0xffffff });
}
/** Yaw quaternion + placement helper for props built in a local frame (local +z = front / operator side). */
function placer(cx, cy, cz, yaw) {
  const q = new THREE.Quaternion().setFromAxisAngle(UP, yaw);
  const o = new THREE.Vector3(cx, cy, cz);
  const place = (lx, ly, lz) => new THREE.Vector3(lx, ly, lz).applyQuaternion(q).add(o);
  return { q, place };
}
function aabbOf(place, hw, hd, y0, y1, pad = 0) {
  const cs = [place(-hw, 0, -hd), place(hw, 0, -hd), place(-hw, 0, hd), place(hw, 0, hd)];
  let x0 = Infinity,
    x1 = -Infinity,
    z0 = Infinity,
    z1 = -Infinity;
  for (const c of cs) {
    x0 = Math.min(x0, c.x);
    x1 = Math.max(x1, c.x);
    z0 = Math.min(z0, c.z);
    z1 = Math.max(z1, c.z);
  }
  return [[x0 - pad, y0, z0 - pad], [x1 + pad, y1, z1 + pad]];
}

// ---------------------------------------------------------------------------
// the builder
// ---------------------------------------------------------------------------
export function buildBridge(kit, ctx, room) {
  const M = ctx.materials;
  ensureMaterials(M);
  const [W, H, D] = room.size; // 64 × 12 × 30
  const hx = W / 2;
  const hz = D / 2;
  const L = 1.8; // upper deck level (walkway, platform, outer decks); pits and vestibule are at 0
  const SOF = 6.6; // vestibule soffit height
  const PIT = { x0: 4, x1: 14, z0: -9, z1: 9 };
  const VZ = 9; // vestibule forward edge
  const STAIR = { x0: 19, x1: 22 }; // side stairwells (mirrored)
  const accentKey = "emitBlue";
  const rand = rng(9001);
  const crewSpots = [];
  const blink = { red: [], blue: [], amber: [] };
  const alertStrips = [];
  const state = { alert: false };
  let holoUpdate = null; // set by buildHoloTable (called below; declared here to avoid the TDZ)
  const addBlink = (group, x, y, z, sx = 0.06, sy = 0.04, sz = 0.02) => blink[group].push([x, y, z, sx, sy, sz]);

  // viewport strip (spec) in room-local coordinates
  const vp = TOWER.viewports;
  const WY0 = vp.y0 - room.origin[1]; // 1.6
  const WY1 = vp.y1 - room.origin[1]; // 5.4
  const vw = (vp.hw * 2 - vp.pillar * (vp.count - 1)) / vp.count;
  const winX = (i) => -vp.hw + vw / 2 + i * (vw + vp.pillar);

  const walls = roomWalls(kit, room);

  // =========================================================================
  // 1. Shell: side and aft walls (panelled), forward wall with the viewports, ceiling, soffit
  // =========================================================================
  {
    // E / W walls: bridge run (base at deck level, z -15..9) + vestibule run (base 0, z 9..15)
    const feats = { vent: 0.09, equipment: 0.12, conduit: 0.06, light: 0.1, screen: 0.06 };
    for (const s of [-1, 1]) {
      const x = s * hx;
      const run1 = s > 0 ? wallFrame(kit, [x, -hz], [x, VZ], L) : wallFrame(kit, [x, VZ], [x, -hz], L);
      impWall(run1.frame, run1.length, H - L, { panelW: 2.4, seed: 41 + s * 7, bands: [2.7, 5.8, 8.0], features: feats, accentKey, tag: "bridgeSide", kickH: 0.36, corniceH: 0.36 });
      const run2 = s > 0 ? wallFrame(kit, [x, VZ], [x, hz], 0) : wallFrame(kit, [x, hz], [x, VZ], 0);
      impWall(run2.frame, run2.length, SOF, { panelW: 2.0, seed: 61 + s * 3, bands: [3.9], features: feats, accentKey, tag: "bridgeVest", corniceH: 0.36 });
      // upper ledge above the tactical displays (structural band with a light channel underneath)
      const f = run1.frame;
      f.box("impTrim", run1.length / 2, 7.75, 0.34, run1.length, 0.3, 0.4, { color: BLACK, texel: 1 });
      f.box("impMetal", run1.length / 2, 7.56, 0.3, run1.length - 0.4, 0.08, 0.3, { color: CHAR });
      f.box("emitWhiteSoft", run1.length / 2, 7.55, 0.2, run1.length - 1.0, 0.03, 0.12, { uv: "keep" });
    }
    // S wall (vestibule): blast door opening from the spec, low cornice under the soffit
    impWall(walls.S.frame, W, SOF, { openings: openingsFor(room, ctx.doors, "S"), panelW: 2.3, seed: 77, bands: [3.9], features: { vent: 0.08, equipment: 0.12, conduit: 0.05, light: 0.12, screen: 0.1 }, accentKey, tag: "bridgeS", corniceH: 0.36 });
    buildForwardWall();
    buildCeiling();
  }

  function buildForwardWall() {
    // frame 6 cm proud of the exterior face plate's inner surface (z = -15) so nothing is coplanar
    const nf = new Frame(kit, new THREE.Vector3(-hx, 0, -hz + 0.06), X_AXIS, UP);
    // panelled wall above the viewports
    const nfUp = new Frame(kit, new THREE.Vector3(-hx, WY1 + 0.2, -hz + 0.06), X_AXIS, UP);
    impWall(nfUp, W, H - WY1 - 0.2, { panelW: 2.4, seed: 23, bands: [2.9], kickH: 0.36, corniceH: 0.4, features: { vent: 0.16, equipment: 0.1, conduit: 0.06, light: 0.1, screen: 0.04 }, panelColor: GREY, panelColorAlt: GREYD, altChance: 0.25, accentKey, collide: false });
    // continuous head trim over the window band and a kerb at deck level
    nf.box("impTrim", hx, WY1 + 0.11, 0.03, W, 0.26, 0.1, { color: BLACK, texel: 1 });
    nf.box("impMetal", hx, WY1 + 0.02, 0.09, W, 0.04, 0.03, { color: GREYD });
    nf.box("impTrim", hx, L + 0.07, 0.05, W, 0.14, 0.14, { color: BLACK, texel: 1 });
    nf.box("impMetal", hx, L + 0.13, 0.13, W, 0.02, 0.02, { color: GREYD });
    // pillars between the viewports (grey inset, a short blue lamp, brackets and a glyph plate)
    for (let i = 0; i < vp.count - 1; i++) {
      const px = winX(i) + vw / 2 + vp.pillar / 2 + hx;
      nf.box("impTrim", px, (L + WY1 + 0.24) / 2, 0.04, vp.pillar, WY1 + 0.24 - L, 0.12, { color: BLACK, texel: 1 });
      nf.box("impMetal", px, (L + WY1) / 2 + 0.1, 0.13, 0.5, WY1 - L - 0.5, 0.06, { color: CHAR, texel: 1 });
      nf.box("impTrim", px, (L + WY1) / 2 + 0.3, 0.165, 0.12, 1.0, 0.02, { color: BLACK });
      nf.box("emitBlueSoft", px, (L + WY1) / 2 + 0.3, 0.178, 0.03, 0.9, 0.01, { uv: "keep" });
      for (const dv of [-1, 1]) nf.box("impMetal", px, (L + WY1) / 2 + 0.1 + dv * (WY1 - L - 0.6) / 2, 0.16, 0.36, 0.06, 0.02, { color: GREYD });
      nf.decal(IMP_DECAL.glyphs1, px, L + 0.42, 0.161, 0.3);
      const p = nf.pos(px, WY1 - 0.35, 0.17);
      addBlink(i % 2 ? "red" : "amber", p.x, p.y, p.z, 0.05, 0.05, 0.02);
    }
    // tactical ticker readouts over every viewport (long thin screens in a dark housing band)
    for (let i = 0; i < vp.count; i++) {
      const a = Math.max(-hx + 0.3, winX(i) - vw / 2 + 0.3);
      const b = Math.min(hx - 0.3, winX(i) + vw / 2 - 0.3);
      const w = b - a;
      if (w < 1.5) continue;
      const c = (a + b) / 2 + hx;
      nf.box("impTrim", c, WY1 + 0.95, 0.1, w + 0.3, 0.9, 0.18, { color: BLACK, texel: 1 });
      nf.box("impGloss", c, WY1 + 0.95, 0.2, w, 0.6, 0.02);
      nf.screen(["scrBlue1", "scrRed0", "scrBlue0", "scrAmber0", "scrBlue1", "scrGreen0", "scrBlue0", "scrRed1", "scrBlue1"][i], c, WY1 + 0.95, 0.215, w - 0.1, 0.5);
      nf.box("impMetal", c, WY1 + 1.36, 0.16, w + 0.1, 0.04, 0.06, { color: GREYD });
    }
    // 1 m deep armoured window tunnels lining the exterior cut-outs (z -15 … -16); no glass here,
    // the exterior provides the viewGlass plane at z = -15
    const ang = Math.atan(0.25 / (WY1 - WY0));
    const hwB = vw / 2 - 0.25;
    const hwT = vw / 2;
    const hwM = (hwB + hwT) / 2;
    for (let i = 0; i < vp.count; i++) {
      const xc = winX(i);
      kit.boxMM("impMetal", [xc - hwB + 0.02, WY0 - 0.02, -hz - 1.0], [xc + hwB - 0.02, L + 0.04, -hz], { color: GREYD, texel: 1 });
      kit.boxMM("impTrim", [xc - hwT + 0.02, WY1 - 0.03, -hz - 1.0], [xc + hwT - 0.02, WY1 + 0.2, -hz], { color: BLACK, texel: 1 });
      // sill groove light (a cool strip along the inner sill, reads as reflected starlight)
      kit.boxMM("emitWhiteSoft", [xc - hwB + 0.3, L + 0.04, -hz - 0.62], [xc + hwB - 0.3, L + 0.055, -hz - 0.56], { uv: "keep" });
      for (const s of [-1, 1]) {
        const jx = xc + s * (hwM - 0.06);
        if (Math.abs(jx) > hx) continue;
        const q = new THREE.Quaternion().setFromAxisAngle(Z_AXIS, -s * ang);
        kit.add("impTrim", new THREE.BoxGeometry(0.08, WY1 - WY0 + 0.04, 1.0), { pos: [jx, (WY0 + WY1) / 2, -hz - 0.5], quat: q, color: BLACK, texel: 1 });
        // bolt row down the jamb
        for (let k = 0; k < 4; k++) kit.cyl("impMetal", jx - s * 0.05, WY0 + 0.5 + k * 0.95, -hz - 0.5, 0.02, 0.02, "x", { color: GREYD, segments: 8 });
      }
    }
    // the outermost viewports run past the side walls: close them with an end jamb at the wall and a
    // dark backing inside the exterior cut-out so they read closed from outside
    for (const s of [-1, 1]) {
      kit.boxMM("impTrim", [Math.min(s * (hx - 0.1), s * (hx + 0.44)), WY0 - 0.2, -hz - 1.0], [Math.max(s * (hx - 0.1), s * (hx + 0.44)), WY1 + 0.25, -hz + 0.06], { color: BLACK, texel: 1 });
      kit.boxMM("impTrim", [Math.min(s * (hx + 0.44), s * (vp.hw + 0.6)), WY0 - 0.2, -hz - 0.08], [Math.max(s * (hx + 0.44), s * (vp.hw + 0.6)), WY1 + 0.25, -hz], { color: BLACK, texel: 1 });
    }
    kit.collider([-hx, 0, -hz - 0.6], [hx, H, -hz + 0.1], "bridgeN");
  }

  function troughSpans(axis, c, y, w, spans, key = "emitWhiteSoft") {
    const mm = (a0, a1, o0, o1, y0, y1) => (axis === "z" ? [[c + o0, y0, a0], [c + o1, y1, a1]] : [[a0, y0, c + o0], [a1, y1, c + o1]]);
    const all0 = spans[0][0];
    const all1 = spans[spans.length - 1][1];
    kit.boxMM("impTrim", ...mm(all0, all1, -w / 2 - 0.1, w / 2 + 0.1, y - 0.03, y + 0.02), { color: BLACK, texel: 1 });
    for (const [a0, a1] of spans) {
      if (a1 - a0 < 0.8) continue;
      kit.boxMM("impMetal", ...mm(a0, a1, -w / 2, w / 2, y - 0.1, y - 0.03), { color: CHAR, texel: 1 });
      kit.boxMM(key, ...mm(a0 + 0.12, a1 - 0.12, -w / 2 + 0.1, w / 2 - 0.1, y - 0.115, y - 0.095), { uv: "keep" });
      for (let f = a0 + 0.3; f < a1 - 0.2; f += 0.32) kit.boxMM("impTrim", ...mm(f, f + 0.025, -w / 2 + 0.05, w / 2 - 0.05, y - 0.15, y - 0.115), { color: BLACK });
    }
  }
  function downlight(x, z, y, w = 1.2) {
    kit.box("impTrim", x, y - 0.13, z, w, 0.26, 0.5, { color: BLACK, texel: 1 });
    kit.box("impMetal", x, y - 0.27, z, w - 0.1, 0.03, 0.4, { color: CHAR });
    kit.box("emitWhiteSoft", x, y - 0.29, z, w - 0.3, 0.02, 0.18, { uv: "keep" });
  }

  function buildCeiling() {
    // coffer field (mid grey so the beams read against it), black beams, light troughs over the pits
    kit.boxMM("impTrim", [-hx, H, -hz], [hx, H + 0.4, hz], { color: GREYD, texel: 0.4 });
    kit.boxMM("impPanel2", [-hx + 0.3, H - 0.02, -hz + 0.3], [hx - 0.3, H, VZ - 0.3], { color: GREYD, uv: "world", texel: 1 });
    const beamsZ = [-13.5, -9, -4.5, 0, 4.5];
    for (const z of beamsZ) kit.boxMM("impTrim", [-hx, H - 0.55, z - 0.2], [hx, H + 0.02, z + 0.2], { color: BLACK, texel: 1 });
    for (const x of [-24, -14.6, -4.6, 4.6, 14.6, 24]) kit.boxMM("impTrim", [x - 0.15, H - 0.4, -hz], [x + 0.15, H + 0.02, VZ - 0.22], { color: BLACK, texel: 1 });
    // two long light troughs over the crew pits, segmented by the cross beams
    const spans = [];
    let prev = -hz + 0.4;
    for (const z of [...beamsZ, VZ]) {
      spans.push([prev, z - 0.3]);
      prev = z + 0.3;
    }
    for (const s of [-1, 1]) troughSpans("z", s * 9, H, 0.9, spans);
    // walkway downlights (white, dim) between the beams
    for (const z of [-11.4, -6.8, -2.3, 2.3, 6.8]) downlight(0, z, H, 1.2);
    // coffer detail: vents over the outer decks, blue accent strips near the walls
    for (const s of [-1, 1]) {
      for (let i = 0; i < spans.length; i++) {
        const [a0, a1] = spans[i];
        const zc = (a0 + a1) / 2;
        if (i % 2 === 0) {
          kit.box("impTrim", s * 19.3, H - 0.06, zc, 1.6, 0.1, 0.7, { color: BLACK });
          for (let k = 0; k < 7; k++) kit.box("impMetal", s * 19.3, H - 0.12, zc - 0.3 + k * 0.1, 1.3, 0.02, 0.03, { color: GREYD });
        } else {
          kit.box("impTrim", s * 19.3, H - 0.05, zc, 0.8, 0.08, 0.2, { color: BLACK });
          kit.box(accentKey, s * 19.3, H - 0.095, zc, 0.6, 0.02, 0.06);
        }
        kit.box("impTrim", s * 28.5, H - 0.05, zc, 0.6, 0.08, a1 - a0 - 0.8, { color: BLACK });
        kit.box("emitBlueSoft", s * 28.5, H - 0.095, zc, 0.12, 0.02, a1 - a0 - 1.0, { uv: "keep" });
      }
      // round fixture for the outer-deck point light
      kit.cyl("impTrim", s * 23, H - 0.15, -3, 0.7, 0.3, "y", { color: BLACK, segments: 20 });
      kit.cyl("emitWhiteSoft", s * 23, H - 0.31, -3, 0.5, 0.02, "y", { segments: 20, uv: "keep" });
    }
    // key spot housings (forward, over the platform; aft, over the walkway)
    for (const [z, tilt] of [[-13.2, 0.5], [7.5, -0.4]]) {
      kit.box("impTrim", 0, H - 0.5, z, 0.9, 0.6, 0.9, { color: BLACK, texel: 1 });
      kit.add("impMetal", new THREE.CylinderGeometry(0.3, 0.36, 0.5, 16), { pos: [0, H - 0.98, z + (tilt > 0 ? 0.25 : -0.25)], quat: new THREE.Quaternion().setFromAxisAngle(X_AXIS, tilt), color: CHAR, uv: "scale", uvScale: [2, 0.5] });
      kit.add("emitWhite", new THREE.CylinderGeometry(0.26, 0.26, 0.04, 16), { pos: [0, H - 1.22, z + (tilt > 0 ? 0.36 : -0.36)], quat: new THREE.Quaternion().setFromAxisAngle(X_AXIS, tilt) });
    }
    // fascia above the vestibule opening (seen from the bridge) with the cog and glyph plates
    kit.boxMM("impTrim", [-hx, SOF, VZ - 0.22], [hx, H + 0.02, VZ + 0.02], { color: BLACK, texel: 0.5 });
    kit.boxMM("impMetal", [-hx + 0.4, SOF + 0.06, VZ - 0.26], [hx - 0.4, SOF + 0.14, VZ - 0.22], { color: CHAR });
    kit.boxMM("emitWhiteSoft", [-hx + 1, SOF + 0.08, VZ - 0.27], [hx - 1, SOF + 0.12, VZ - 0.26], { uv: "keep" });
    for (let x = -28; x <= 28; x += 8) kit.boxMM("impMetal", [x - 0.18, SOF + 0.2, VZ - 0.32], [x + 0.18, H, VZ - 0.22], { color: CHAR, texel: 1 });
    kit.boxMM("impPanel2", [-3.0, SOF + 0.9, VZ - 0.27], [3.0, H - 0.6, VZ - 0.22], { color: GREY, uv: "world", texel: 1 });
    kit.add("decalImp", new THREE.PlaneGeometry(3.4, 3.4).rotateY(Math.PI), { pos: [0, (SOF + H) / 2 + 0.15, VZ - 0.275], uv: "keep", uvRect: impDecalRect(IMP_DECAL.cog) });
    for (const s of [-1, 1]) {
      kit.boxMM("impPanel1", [s * 6 - 1.6, SOF + 1.4, VZ - 0.27], [s * 6 + 1.6, SOF + 3.4, VZ - 0.22], { color: GREY, uv: "world", texel: 1 });
      kit.add("decalImp", new THREE.PlaneGeometry(1.6, 1.6).rotateY(Math.PI), { pos: [s * 6, SOF + 2.4, VZ - 0.275], uv: "keep", uvRect: impDecalRect(s > 0 ? IMP_DECAL.glyphs3 : IMP_DECAL.glyphs2) });
      kit.boxMM("emitRedImp", [s * 10 - 0.6, SOF + 2.3, VZ - 0.27], [s * 10 + 0.6, SOF + 2.5, VZ - 0.22]);
    }
    // soffit over the vestibule with two light troughs across it
    kit.boxMM("impTrim", [-hx, SOF, VZ], [hx, SOF + 0.4, hz + 0.4], { color: GREYD, texel: 0.4 });
    for (const z of [10.6, 13.4]) troughSpans("x", z, SOF, 0.6, [[-30, -10.5], [-9.5, 9.5], [10.5, 30]]);
    for (const x of [-20, 0, 20]) kit.boxMM("impTrim", [x - 0.15, SOF - 0.3, VZ], [x + 0.15, SOF + 0.02, hz], { color: BLACK, texel: 1 });
    // red alert strips along the beams (hidden until kit.api.setAlert(true))
    for (const z of beamsZ) alertStrips.push([-30, H - 0.57, z, 60, 0.03, 0.08]);
  }

  // =========================================================================
  // 2. Levels: deck slabs, pit and vestibule floors, stairs, pit walls, railings
  // =========================================================================
  const slab = (x0, z0, x1, z1) => {
    kit.boxMM("impTrim", [x0, -0.14, z0], [x1, L - 0.14, z1], { color: BLACK, texel: 0.5 });
    kit.boxMM("impDeck", [x0, L - 0.14, z0], [x1, L, z1], { color: GREY, texel: 0.5 });
  };
  slab(-hx - 0.1, -hz, hx + 0.1, PIT.z0); // forward strip (platform + outer forward decks)
  slab(-4, PIT.z0, 4, 6); // walkway
  for (const s of [-1, 1]) {
    const m = (a, b) => [Math.min(s * a, s * b), Math.max(s * a, s * b)];
    let [a, b] = m(3.3, 4);
    slab(a, 6, b, VZ); // stair parapet
    [a, b] = m(PIT.x1, STAIR.x0);
    slab(a, PIT.z0, b, VZ);
    [a, b] = m(STAIR.x0, STAIR.x1);
    slab(a, PIT.z0, b, 6);
    [a, b] = m(STAIR.x1, hx + 0.1);
    slab(a, PIT.z0, b, VZ);
    kit.floor(...[Math.min(s * PIT.x1, s * STAIR.x0), PIT.z0, Math.max(s * PIT.x1, s * STAIR.x0), VZ], L);
    kit.floor(...[Math.min(s * STAIR.x0, s * STAIR.x1), PIT.z0, Math.max(s * STAIR.x0, s * STAIR.x1), 6], L);
    kit.floor(...[Math.min(s * STAIR.x1, s * (hx + 0.5)), PIT.z0, Math.max(s * STAIR.x1, s * (hx + 0.5)), VZ], L);
    kit.floor(...[Math.min(s * 3.3, s * 4), 6, Math.max(s * 3.3, s * 4), VZ], L);
  }
  kit.floor(-hx - 0.5, -hz - 0.5, hx + 0.5, PIT.z0, L);
  kit.floor(-4, PIT.z0, 4, 6, L);
  // walkway lane + edge lights on the ledges outside the railings
  kit.boxMM("impDeck", [-1.5, L, PIT.z0 + 0.3], [1.5, L + 0.012, 5.8], { color: GREYD, texel: 0.5 });
  for (const s of [-1, 1]) {
    kit.boxMM("impTrim", [s * 1.5 - 0.03, L, PIT.z0 + 0.3], [s * 1.5 + 0.03, L + 0.014, 5.8], { color: BLACK });
    kit.boxMM("emitBlue", [s * 3.85 - 0.03, L + 0.002, PIT.z0 - 0.3], [s * 3.85 + 0.03, L + 0.012, VZ - 0.2]);
    kit.boxMM("impTrim", [Math.min(s * 3.94, s * 4.0), L + 0.001, PIT.z0], [Math.max(s * 3.94, s * 4.0), L + 0.02, VZ], { color: BLACK });
    // pit rims on the outer decks and the forward strip
    kit.boxMM("emitBlue", [s * 14.2 - 0.03, L + 0.002, PIT.z0 - 0.3], [s * 14.2 + 0.03, L + 0.012, PIT.z1 - 0.3], { color: 0xffffff });
    kit.boxMM("emitBlue", [Math.min(s * 4.3, s * 13.7), L + 0.002, PIT.z0 - 0.23], [Math.max(s * 4.3, s * 13.7), L + 0.012, PIT.z0 - 0.17]);
    kit.boxMM("chevronY", [Math.min(s * 14.35, s * 14.95), L + 0.003, PIT.z0], [Math.max(s * 14.35, s * 14.95), L + 0.011, PIT.z1], { texel: 1.5 });
    kit.boxMM("impTrim", [Math.min(s * 14.0, s * 14.06), L + 0.001, PIT.z0 - 0.06], [Math.max(s * 14.0, s * 14.06), L + 0.02, PIT.z1], { color: BLACK });
    // outer deck lane between the computer bank and the wall stations
    kit.boxMM("impDeck", [Math.min(s * 23.4, s * 25.6), L, -hz + 0.6], [Math.max(s * 23.4, s * 25.6), L + 0.012, VZ - 1.0], { color: GREYD, texel: 0.5 });
    for (const e of [23.4, 25.6]) kit.boxMM("impTrim", [s * e - 0.03, L, -hz + 0.6], [s * e + 0.03, L + 0.014, VZ - 1.0], { color: BLACK });
    // aft-edge warning strip (outer decks over the vestibule)
    kit.boxMM("chevronY", [Math.min(s * PIT.x1, s * (hx - 0.4)), L + 0.003, VZ - 0.6], [Math.max(s * PIT.x1, s * (hx - 0.4)), L + 0.011, VZ - 0.02], { texel: 1.5 });
  }
  kit.boxMM("chevronY", [-9.8, L + 0.003, PIT.z0 - 0.7], [9.8, L + 0.011, PIT.z0 - 0.3], { texel: 1.5 });

  // pit floors: deck plates with grated cable trenches along both walls
  for (const s of [-1, 1]) {
    const x0 = Math.min(s * PIT.x0, s * PIT.x1);
    const x1 = Math.max(s * PIT.x0, s * PIT.x1);
    kit.boxMM("impDeck", [x0 + 0.7, -0.14, PIT.z0], [x1 - 0.7, 0, PIT.z1], { color: GREY, texel: 0.5 });
    kit.boxMM("impDeck", [x0 + 2.2, 0, PIT.z0 + 0.4], [x1 - 2.2, 0.01, PIT.z1 - 0.4], { color: GREYD, texel: 0.5 });
    for (const [ta, tb] of [[x0, x0 + 0.7], [x1 - 0.7, x1]]) {
      kit.boxMM("impTrim", [ta, -0.5, PIT.z0], [tb, -0.44, PIT.z1], { color: BLACK, texel: 1 });
      kit.boxMM("impTrim", [ta, -0.5, PIT.z0], [ta + 0.03, 0.0, PIT.z1], { color: BLACK });
      kit.boxMM("impTrim", [tb - 0.03, -0.5, PIT.z0], [tb, 0.0, PIT.z1], { color: BLACK });
      // cables in the trench
      for (let k = 0; k < 3; k++) kit.cyl("impMetal", ta + 0.15 + k * 0.2, -0.32 + (k % 2) * 0.08, 0, 0.035, PIT.z1 - PIT.z0 - 0.2, "z", { color: [GREYD, CHAR, GREY][k], segments: 8 });
      for (let z = PIT.z0 + 1; z < PIT.z1; z += 2.4) kit.boxMM("impTrim", [ta + 0.05, -0.42, z - 0.04], [tb - 0.05, -0.2, z + 0.04], { color: BLACK });
      const g = new THREE.PlaneGeometry(tb - ta, PIT.z1 - PIT.z0).rotateX(-Math.PI / 2);
      kit.add("grate", g, { pos: [(ta + tb) / 2, 0.0, (PIT.z0 + PIT.z1) / 2], uv: "scale", uvScale: [(tb - ta) / 1.24, (PIT.z1 - PIT.z0) / 0.9] });
      for (const e of [ta, tb]) kit.boxMM("impMetal", [e - 0.025, -0.02, PIT.z0], [e + 0.025, 0.012, PIT.z1], { color: GREYD });
    }
  }
  // vestibule floor: plates, lane from the door to the stair, chevrons at the stair feet
  kit.boxMM("impDeck", [-hx - 0.1, -0.14, VZ], [hx + 0.1, 0, hz], { color: GREY, texel: 0.5 });
  kit.boxMM("impDeck", [-1.8, 0, VZ + 0.7], [1.8, 0.012, hz - 0.3], { color: GREYD, texel: 0.5 });
  for (const s of [-1, 1]) kit.boxMM("impTrim", [s * 1.8 - 0.03, 0, VZ + 0.7], [s * 1.8 + 0.03, 0.014, hz - 0.3], { color: BLACK });
  kit.boxMM("chevronY", [-3.3, 0.003, VZ + 0.02], [3.3, 0.011, VZ + 0.42], { texel: 1.5 });
  for (const s of [-1, 1]) kit.boxMM("chevronY", [Math.min(s * STAIR.x0, s * STAIR.x1), 0.003, VZ + 0.02], [Math.max(s * STAIR.x0, s * STAIR.x1), 0.011, VZ + 0.42], { texel: 1.5 });

  // stairs: kit floors + stepped blocks with metal nosings and blue riser lights
  function stairBlock(x0, x1, zBot, zTop, y0, y1) {
    const n = 10;
    const run = (zBot - zTop) / n;
    for (let i = 0; i < n; i++) {
      const zb = zBot - run * i;
      const zt = zb - run;
      const y = y0 + ((y1 - y0) * (i + 1)) / n;
      kit.boxMM("impTrim", [x0, y0 - 0.14, zt], [x1, y - 0.03, zb], { color: BLACK, texel: 0.5 });
      kit.boxMM("impDeck", [x0 + 0.02, y - 0.03, zt + 0.02], [x1 - 0.02, y, zb - 0.02], { color: GREY, texel: 1 });
      kit.boxMM("impMetal", [x0 + 0.02, y - 0.012, zb - 0.09], [x1 - 0.02, y + 0.008, zb - 0.02], { color: GREYD, texel: 2 });
      kit.boxMM("emitBlueSoft", [x0 + 0.35, y - 0.16, zb], [x1 - 0.35, y - 0.135, zb + 0.012], { uv: "keep" });
    }
  }
  kit.stairs(-3.3, 6, 3.3, VZ, "z", VZ, 6, 0, L);
  stairBlock(-3.3, 3.3, VZ, 6, 0, L);
  for (const s of [-1, 1]) {
    const a = Math.min(s * STAIR.x0, s * STAIR.x1);
    const b = Math.max(s * STAIR.x0, s * STAIR.x1);
    kit.stairs(a, 6, b, VZ, "z", VZ, 6, 0, L);
    stairBlock(a, b, VZ, 6, 0, L);
  }
  // sloped handrails on the stair side walls (tube + brackets)
  function slopedRail(x, side) {
    const a = new THREE.Vector3(x, 0.95, VZ - 0.15);
    const b = new THREE.Vector3(x, L + 0.95, 6.15);
    tube(kit, "impMetal", a, b, 0.025, { color: GREYD });
    for (let k = 0; k <= 3; k++) {
      const p = a.clone().lerp(b, k / 3);
      kit.box("impTrim", p.x + side * 0.06, p.y - 0.05, p.z, 0.12, 0.05, 0.05, { color: BLACK });
    }
  }
  slopedRail(3.16, 1);
  slopedRail(-3.16, -1);
  slopedRail(STAIR.x0 + 0.14, -1);
  slopedRail(STAIR.x1 - 0.14, 1);
  slopedRail(-STAIR.x0 - 0.14, 1);
  slopedRail(-STAIR.x1 + 0.14, -1);

  // vertical faces of the upper deck (panelled, lit rim strip, colliders)
  function pitWall(frame, length, opts = {}) {
    const { seed = 1, screens = false, h = L, panelColor = GREY } = opts;
    const r = rng(seed);
    frame.box("impTrim", length / 2, h / 2, 0.01, length, h, 0.02, { color: BLACK, texel: 1 });
    frame.box("impTrim", length / 2, 0.14, 0.04, length, 0.28, 0.06, { color: BLACK, texel: 1 });
    // skirting light on top of the kick (the pits glow from below) and the rim strip along the top
    frame.box("emitBlueSoft", length / 2, 0.295, 0.05, length - 0.16, 0.03, 0.04, { uv: "keep" });
    frame.box("impMetal", length / 2, h - 0.17, 0.04, length, 0.34, 0.06, { color: CHAR, texel: 1 });
    frame.box("emitBlueSoft", length / 2, h - 0.1, 0.075, length - 0.16, 0.05, 0.012, { uv: "keep" });
    const n = Math.max(1, Math.round(length / 1.6));
    const mw = length / n;
    for (let k = 0; k <= n; k++) frame.box("impTrim", Math.min(length - 0.04, Math.max(0.04, k * mw)), 0.88, 0.045, 0.08, 1.2, 0.05, { color: BLACK });
    for (let k = 0; k < n; k++) {
      const u = (k + 0.5) * mw;
      frame.box("impPanel1", u, 0.87, 0.04, mw - 0.14, 1.12, 0.04, { color: panelColor, uv: "world", texel: 1 });
      const t = r();
      if (screens && t < 0.5) {
        frame.box("impGloss", u, 1.22, 0.07, 0.96, 0.46, 0.03);
        frame.screen(["scrBlue0", "scrBlue1", "scrAmber0", "scrRed1"][Math.floor(r() * 4)], u, 1.22, 0.09, 0.88, 0.38);
      } else if (t < 0.65) {
        frame.box("impTrim", u, 1.0, 0.065, mw - 0.4, 0.6, 0.02, { color: CHAR });
        for (let sI = 0; sI < 5; sI++) frame.box("impMetal", u, 0.8 + sI * 0.1, 0.085, mw - 0.6, 0.03, 0.03, { color: GREYD, tilt: 0.5 });
      } else if (t < 0.8) {
        frame.decal([IMP_DECAL.glyphs1, IMP_DECAL.glyphs2, IMP_DECAL.hazard, IMP_DECAL.power][Math.floor(r() * 4)], u, 1.0, 0.062, 0.4);
      } else {
        frame.box("impTrim", u, 1.2, 0.07, 0.5, 0.2, 0.02, { color: BLACK });
        frame.box("leds", u, 1.2, 0.082, 0.42, 0.06, 0.006, { uv: "keep" });
        const p = frame.pos(u - 0.15, 1.1, 0.085);
        addBlink(r() < 0.5 ? "red" : "blue", p.x, p.y, p.z);
      }
    }
    frame.cylU("impMetal", length / 2, 0.36, 0.09, 0.03, length - 0.1, { color: GREYD, segments: 8 });
    frame.cylU("impMetal", length / 2, 0.45, 0.09, 0.02, length - 0.1, { color: CHAR, segments: 8 });
    frame.collider(0, length, 0, h, -0.5, 0.1, "deckface");
  }
  for (const s of [-1, 1]) {
    // pit inner face (walkway side), outer face, forward face
    const inner = s > 0 ? wallFrame(kit, [4, VZ], [4, PIT.z0]) : wallFrame(kit, [-4, PIT.z0], [-4, VZ]);
    pitWall(inner.frame, inner.length, { seed: 11 + s, screens: true });
    const outer = s > 0 ? wallFrame(kit, [PIT.x1, PIT.z0], [PIT.x1, PIT.z1]) : wallFrame(kit, [-PIT.x1, PIT.z1], [-PIT.x1, PIT.z0]);
    pitWall(outer.frame, outer.length, { seed: 21 + s, screens: true });
    const fwd = s > 0 ? wallFrame(kit, [PIT.x0, PIT.z0], [PIT.x1, PIT.z0]) : wallFrame(kit, [-PIT.x1, PIT.z0], [-PIT.x0, PIT.z0]);
    pitWall(fwd.frame, fwd.length, { seed: 31 + s });
    // stair parapet inner faces (stair side)
    const par = s > 0 ? wallFrame(kit, [3.3, 6], [3.3, VZ]) : wallFrame(kit, [-3.3, VZ], [-3.3, 6]);
    pitWall(par.frame, par.length, { seed: 41 + s, panelColor: PALETTE.impWhite });
    // vestibule-facing faces of the outer decks (either side of the stairwell) and the stairwell sides
    const v1 = s > 0 ? wallFrame(kit, [PIT.x1, VZ], [STAIR.x0, VZ]) : wallFrame(kit, [-STAIR.x0, VZ], [-PIT.x1, VZ]);
    pitWall(v1.frame, v1.length, { seed: 51 + s });
    const v2 = s > 0 ? wallFrame(kit, [STAIR.x1, VZ], [hx, VZ]) : wallFrame(kit, [-hx, VZ], [-STAIR.x1, VZ]);
    pitWall(v2.frame, v2.length, { seed: 61 + s, screens: true });
    const w1 = s > 0 ? wallFrame(kit, [STAIR.x0, VZ], [STAIR.x0, 6]) : wallFrame(kit, [-STAIR.x0, 6], [-STAIR.x0, VZ]);
    pitWall(w1.frame, w1.length, { seed: 71 + s, panelColor: PALETTE.impWhite });
    const w2 = s > 0 ? wallFrame(kit, [STAIR.x1, 6], [STAIR.x1, VZ]) : wallFrame(kit, [-STAIR.x1, VZ], [-STAIR.x1, 6]);
    pitWall(w2.frame, w2.length, { seed: 81 + s, panelColor: PALETTE.impWhite });
    // parapet aft faces (small, toward the vestibule)
    const pa = s > 0 ? wallFrame(kit, [3.3, VZ], [4, VZ]) : wallFrame(kit, [-4, VZ], [-3.3, VZ]);
    pitWall(pa.frame, pa.length, { seed: 91 + s });
  }

  // railings (blue rail light) along every upper edge
  const rail = (a, b) => impRailing(kit, a, b, L, { h: 1.05, postStep: 1.5, light: "emitBlue", color: GREYD });
  for (const s of [-1, 1]) {
    rail([s * 3.6, VZ], [s * 3.6, PIT.z0 - 0.6]);
    rail([s * 3.6, PIT.z0 - 0.6], [s * 14.6, PIT.z0 - 0.6]);
    rail([s * 14.6, PIT.z0 - 0.6], [s * 14.6, VZ - 0.6]);
    rail([s * 14.6, VZ - 0.6], [s * (STAIR.x0 - 0.3), VZ - 0.6]);
    rail([s * (STAIR.x0 - 0.3), VZ - 0.6], [s * (STAIR.x0 - 0.3), 6.2]);
    rail([s * (STAIR.x1 + 0.3), 6.2], [s * (STAIR.x1 + 0.3), VZ - 0.6]);
    rail([s * (STAIR.x1 + 0.3), VZ - 0.6], [s * (hx - 0.4), VZ - 0.6]);
  }

  // =========================================================================
  // 3. Stations (consoles + chairs + crew spots)
  // =========================================================================
  function station(cx, cy, cz, w, d, yaw, o = {}) {
    impConsole(kit, cx, cy, cz, w, d, { yaw, seed: o.seed || 3, screens: o.screens || ["scrBlue0", "scrBlue1"], accentKey: o.accentKey || accentKey, tall: !!o.tall });
    const fx = Math.sin(yaw);
    const fz = Math.cos(yaw);
    const seated = o.chair !== false;
    const off = d / 2 + (seated ? 0.62 : 0.5);
    const px = cx + fx * off;
    const pz = cz + fz * off;
    if (seated) impChair(kit, px, cy, pz, yaw);
    crewSpots.push({ id: o.label || `station${crewSpots.length}`, x: +px.toFixed(2), y: cy, z: +pz.toFixed(2), yaw: +yaw.toFixed(3), seated });
  }
  const scr = {
    blue: ["scrBlue0", "scrBlue1"],
    mix: ["scrBlue1", "scrAmber0"],
    red: ["scrRed0", "scrBlue0"],
    green: ["scrGreen0", "scrBlue1"],
    white: ["scrWhite0", "scrBlue0"],
  };
  // --- crew pits
  for (const s of [-1, 1]) {
    const side = s > 0 ? "stbd" : "port";
    const zRow = [-6.4, -3.2, 0, 3.2, 6.4];
    zRow.forEach((zc, i) => {
      station(s * 4.6, 0, zc, 2.6, 0.9, s > 0 ? Math.PI / 2 : -Math.PI / 2, { seed: 100 + i + s, screens: [scr.blue, scr.mix, scr.green, scr.blue, scr.white][i], label: `${side}-pit-inner-${i}` });
      station(s * 13.4, 0, zc, 2.6, 0.9, s > 0 ? -Math.PI / 2 : Math.PI / 2, { seed: 120 + i - s, screens: [scr.mix, scr.blue, scr.blue, scr.red, scr.blue][i], label: `${side}-pit-outer-${i}` });
    });
    // forward row: tall stations (their upright displays face aft, down the length of the pit);
    // aft row: low consoles so the pit stays readable from its aft entrance
    for (const [xc, k] of [[7.7, 0], [10.3, 1]]) {
      station(s * xc, 0, -4.6, 2.4, 0.9, 0, { seed: 140 + k + s, screens: k ? scr.mix : scr.blue, tall: true, label: `${side}-pit-fwd-${k}` });
      station(s * xc, 0, 5.0, 2.4, 0.9, 0, { seed: 150 + k - s, screens: k ? scr.blue : scr.green, label: `${side}-pit-aft-${k}` });
    }
    // pit supervisor's plotting table (octagonal, screen top, standing spot)
    const px = s * 9;
    kit.cyl("impTrim", px, 0.45, 0.2, 0.85, 0.9, "y", { segments: 8, color: BLACK, texel: 1 });
    kit.cyl("impMetal", px, 0.06, 0.2, 0.95, 0.12, "y", { segments: 8, color: CHAR });
    kit.cyl("impGloss", px, 0.93, 0.2, 0.98, 0.06, "y", { segments: 8 });
    kit.add("scrBlue1", new THREE.CircleGeometry(0.82, 8).rotateX(-Math.PI / 2), { pos: [px, 0.965, 0.2], uv: "keep" });
    kit.cyl("emitBlueSoft", px, 0.7, 0.2, 0.87, 0.03, "y", { segments: 8, uv: "keep" });
    kit.collider([px - 0.98, 0, 0.2 - 0.98], [px + 0.98, 1.0, 0.2 + 0.98], "plot");
    crewSpots.push({ id: `${side}-pit-supervisor`, x: px, y: 0, z: 1.55, yaw: 0, seated: false });
    // status lamps on the plot table rim
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + Math.PI / 8;
      addBlink(k % 2 ? "blue" : "amber", px + Math.cos(a) * 0.9, 0.86, 0.2 + Math.sin(a) * 0.9, 0.05, 0.04, 0.05);
    }
  }
  // --- forward sensor / gunnery bank under the viewports (full width), commander's spot at the centre
  for (let k = 0; k < 9; k++) {
    for (const s of [-1, 1]) {
      const xc = s * (1.75 + 3.4 * k);
      const isCmd = k === 0;
      station(xc, L, -hz + 0.95, 3.2, 0.9, 0, { seed: 200 + k * 2 + (s > 0 ? 1 : 0), screens: isCmd ? scr.red : [scr.blue, scr.mix, scr.white, scr.green][k % 4], chair: false, label: `fwd-bank-${s > 0 ? "s" : "p"}${k}`, accentKey: isCmd ? "emitRedImp" : accentKey });
    }
  }
  crewSpots.push({ id: "commander", x: 0, y: L, z: -hz + 2.1, yaw: 0, seated: false });
  // --- command platform: holo table, flag officers' tall consoles, tactical display columns
  const HZ = -11.4;
  buildHoloTable(0, L, HZ);
  for (const s of [-1, 1]) {
    station(s * 4.8, L, -12.7, 2.2, 0.9, 0, { seed: 240 + s, screens: s > 0 ? scr.red : scr.mix, tall: true, chair: false, label: s > 0 ? "executive-officer" : "flag-officer" });
    displayColumn(s * 8.8, L, -12.4, 0, 260 + s);
  }
  // --- outer decks: tactical wall display + standing stations, equipment banks, comms alcove, pillars
  let k2 = 0;
  for (const s of [-1, 1]) {
    const f = (s > 0 ? walls.E : walls.W).frame;
    const uOf = (z) => (s > 0 ? z + hz : hz - z);
    // tactical wall display (bridge_tacScreen), header light, ledge, standing stations beneath
    const uc = uOf(0.6);
    f.box("impTrim", uc, L + 3.6, 0.22, 9.2, 4.6, 0.16, { color: BLACK, texel: 1 });
    f.box("impGloss", uc, L + 3.65, 0.31, 8.5, 4.05, 0.02);
    f.screen("bridge_tacScreen", uc, L + 3.65, 0.325, 8.2, 3.9);
    f.box("impMetal", uc, L + 5.98, 0.31, 8.8, 0.12, 0.04, { color: CHAR });
    f.box(accentKey, uc, L + 5.98, 0.335, 8.4, 0.04, 0.01);
    f.box("impMetal", uc, L + 1.5, 0.36, 9.0, 0.12, 0.32, { color: CHAR, texel: 1 });
    f.box("emitWhiteSoft", uc, L + 1.46, 0.44, 8.4, 0.03, 0.1, { uv: "keep" });
    for (let k = 0; k < 6; k++) f.box("impGloss", uc - 3.5 + k * 1.4, L + 1.3, 0.34, 0.9, 0.16, 0.02);
    f.collider(uc - 4.7, uc + 4.7, L, L + 6.2, 0, 0.4, "tacscreen");
    for (const [zc, k] of [[-2.4, 0], [0.6, 1], [3.6, 2]]) station(s * 31.2, L, zc, 2.6, 0.9, s > 0 ? -Math.PI / 2 : Math.PI / 2, { seed: 300 + k + s, screens: [scr.blue, scr.mix, scr.white][k], chair: false, label: `${s > 0 ? "stbd" : "port"}-tactical-${k}` });
    // equipment banks forward along the side wall
    for (let k = 0; k < 4; k++) cabinet(s * 31.55, L, -13.2 + k * 1.75, s > 0 ? -Math.PI / 2 : Math.PI / 2, 320 + k * 3 + s);
    impWallGear(f, uOf(-6.2), L + 3.3, { seed: 7 + s, accentKey });
    // comms alcove at the aft corner: wall board, two consoles, relay mast
    const uc2 = uOf(6.6);
    f.box("impTrim", uc2, L + 2.6, 0.2, 3.6, 2.2, 0.12, { color: BLACK, texel: 1 });
    f.box("impMetal", uc2, L + 2.6, 0.27, 3.4, 2.0, 0.02, { color: CHAR, texel: 2 });
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const u = uc2 - 1.35 + c * 0.9;
        const v = L + 3.3 - r * 0.45;
        if ((r + c) % 3 === 0) f.screen(["scrAmber0", "scrBlue0", "scrGreen0"][(r + c) % 3], u, v, 0.285, 0.7, 0.32);
        else {
          f.box("impGloss", u, v, 0.28, 0.72, 0.34, 0.01);
          f.box("leds", u, v + 0.08, 0.29, 0.6, 0.05, 0.005, { uv: "keep" });
          const p = f.pos(u - 0.2 + (c % 2) * 0.4, v - 0.08, 0.295);
          addBlink(["red", "amber", "blue"][(r * 4 + c) % 3], p.x, p.y, p.z, 0.05, 0.04, 0.02);
        }
      }
    }
    f.decal(IMP_DECAL.glyphs3, uc2 + 1.4, L + 3.85, 0.21, 0.5);
    station(s * 31.2, L, 6.4, 2.4, 0.9, s > 0 ? -Math.PI / 2 : Math.PI / 2, { seed: 340 + s, screens: scr.mix, label: `${s > 0 ? "stbd" : "port"}-comms-0` });
    station(s * 27.6, L, VZ - 1.1, 2.4, 0.9, Math.PI, { seed: 343 + s, screens: scr.green, label: `${s > 0 ? "stbd" : "port"}-comms-1` });
    commsMast(s * 30.4, L, VZ - 1.3);
    // computer bank island: two rows of cabinets back to back (fronts to the pit / to the wall lane)
    // with a cable-tray spine on top, between the pit railing and the wall lane
    const BANK = { z0: -5.6, z1: 4.3, n: 7 };
    for (let k = 0; k < BANK.n; k++) {
      const zc = BANK.z0 + 0.8 + k * 1.5;
      cabinet(s * 19.2, L, zc, s > 0 ? -Math.PI / 2 : Math.PI / 2, 500 + k * 2 + s, 1.4, 2.3, 0.7);
      cabinet(s * 19.94, L, zc, s > 0 ? Math.PI / 2 : -Math.PI / 2, 501 + k * 2 + s, 1.4, 2.3, 0.7);
    }
    {
      const a = Math.min(s * 18.7, s * 20.44);
      const b = Math.max(s * 18.7, s * 20.44);
      const zm = (BANK.z0 + BANK.z1) / 2;
      kit.boxMM("impTrim", [a, L + 2.4, BANK.z0], [b, L + 2.62, BANK.z1], { color: BLACK, texel: 1 });
      kit.boxMM("impMetal", [a + 0.1, L + 2.62, BANK.z0 + 0.1], [b - 0.1, L + 2.66, BANK.z1 - 0.1], { color: CHAR });
      for (let k = 0; k < 3; k++) kit.cyl("impMetal", s * (19.2 + k * 0.35), L + 2.72, zm, 0.045, BANK.z1 - BANK.z0 - 0.4, "z", { color: [GREYD, CHAR, GREY][k], segments: 8 });
      for (const zc of [BANK.z0 + 0.2, zm, BANK.z1 - 0.2]) kit.boxMM("impTrim", [a + 0.2, L + 2.62, zc - 0.05], [b - 0.2, L + 2.82, zc + 0.05], { color: BLACK });
      for (const e of [a, b]) kit.boxMM("emitBlueSoft", [e - 0.01, L + 2.46, BANK.z0 + 0.2], [e + 0.01, L + 2.5, BANK.z1 - 0.2], { uv: "keep" });
      // end plates: grey inset panel, header lamp, status readout, stencil, indicator lamps
      for (const [ze, dz] of [[BANK.z0, -1], [BANK.z1, 1]]) {
        const z0 = Math.min(ze, ze + dz * 0.08);
        const z1 = Math.max(ze, ze + dz * 0.08);
        const zf = ze + dz * 0.08; // face plane
        kit.boxMM("impTrim", [a, L, z0], [b, L + 2.4, z1], { color: BLACK, texel: 1 });
        kit.boxMM("impPanel1", [a + 0.12, L + 0.3, Math.min(zf, zf + dz * 0.03)], [b - 0.12, L + 2.1, Math.max(zf, zf + dz * 0.03)], { color: GREY, uv: "world", texel: 1 });
        kit.boxMM("impTrim", [a + 0.2, L + 2.12, Math.min(zf, zf + dz * 0.06)], [b - 0.2, L + 2.3, Math.max(zf, zf + dz * 0.06)], { color: BLACK });
        kit.boxMM("emitWhiteSoft", [a + 0.3, L + 2.18, Math.min(zf + dz * 0.06, zf + dz * 0.07)], [b - 0.3, L + 2.24, Math.max(zf + dz * 0.06, zf + dz * 0.07)], { uv: "keep" });
        kit.boxMM("impGloss", [s * 19.57 - 0.5, L + 1.55, Math.min(zf + dz * 0.03, zf + dz * 0.05)], [s * 19.57 + 0.5, L + 1.95, Math.max(zf + dz * 0.03, zf + dz * 0.05)]);
        kit.add(k2 % 2 ? "scrAmber0" : "scrBlue0", new THREE.PlaneGeometry(0.9, 0.3).rotateY(dz > 0 ? 0 : Math.PI), { pos: [s * 19.57, L + 1.75, zf + dz * 0.055], uv: "keep" });
        kit.add("decalImp", new THREE.PlaneGeometry(0.6, 0.6).rotateY(dz > 0 ? 0 : Math.PI), { pos: [s * 19.57, L + 0.95, zf + dz * 0.035], uv: "keep", uvRect: impDecalRect(IMP_DECAL.power) });
        for (let k = 0; k < 3; k++) addBlink(["blue", "red", "amber"][k], s * 19.57 - 0.4 + k * 0.4, L + 0.45, zf + dz * 0.04, 0.06, 0.04, 0.02);
        kit.collider([a, L, z0], [b, L + 2.4, z1], "bankEnd");
        k2++;
      }
    }
    // standing stations on the open deck between the bank and the wall (operators face forward)
    for (const [zc, k] of [[-6.4, 0], [-2.6, 1], [1.2, 2]]) station(s * 27.4, L, zc, 2.6, 0.9, 0, { seed: 360 + k + s, screens: [scr.mix, scr.blue, scr.white][k], chair: false, label: `${s > 0 ? "stbd" : "port"}-deck-${k}` });
    // structural columns with ribs to the side wall
    for (const zc of [-5.6, 3.4]) {
      impPillar(kit, s * 16.2, zc, H - L, { w: 0.8, y: L, accentKey: "emitBlueSoft" });
      kit.boxMM("impTrim", [Math.min(s * 16.2, s * hx), H - 0.75, zc - 0.22], [Math.max(s * 16.2, s * hx), H - 0.35, zc + 0.22], { color: BLACK, texel: 1 });
      kit.boxMM("impMetal", [Math.min(s * 16.2, s * (hx - 0.2)), H - 0.72, zc - 0.05], [Math.max(s * 16.2, s * (hx - 0.2)), H - 0.62, zc + 0.05], { color: CHAR });
    }
  }
  // --- vestibule: cog plate + directory boards + guard alcoves on the aft wall, lockers, bench, pilasters
  {
    const f = walls.S.frame; // u = hx - x
    f.box("impTrim", hx, 5.05, 0.16, 3.2, 2.7, 0.06, { color: BLACK, texel: 1 });
    f.box("impMetal", hx, 5.05, 0.2, 3.0, 2.5, 0.02, { color: CHAR, texel: 2 });
    f.decal(IMP_DECAL.cog, hx, 5.05, 0.215, 2.3);
    for (const s of [-1, 1]) {
      const u = hx - s * 7;
      f.box("impTrim", u, 1.95, 0.22, 1.7, 3.3, 0.16, { color: BLACK, texel: 1 });
      f.box("impGloss", u, 2.0, 0.31, 1.44, 2.9, 0.02);
      f.screen("bridge_statusBoard", u, 2.0, 0.325, 1.32, 2.64);
      f.box(accentKey, u, 3.66, 0.31, 1.3, 0.04, 0.02);
      f.box("impMetal", u, 0.2, 0.35, 1.5, 0.1, 0.3, { color: CHAR });
      f.collider(u - 0.85, u + 0.85, 0, 3.6, 0, 0.36, "directory");
      guardAlcove(f, hx - s * 12.5);
      // deck plates + arrows toward the lifts on the aft wall
      f.decal(IMP_DECAL.turbolift, hx - s * 4.4, 3.95, 0.16, 0.5);
      f.decal(s > 0 ? IMP_DECAL.arrowRight : IMP_DECAL.arrowRight, hx - s * 3.6, 3.95, 0.16, 0.45);
      // lockers and a bench along the outer decks' aft faces
      for (let k = 0; k < 3; k++) cabinet(s * (24.2 + k * 1.6), 0, VZ + 0.4, 0, 400 + k + s, 1.4, 2.1, 0.7);
      kit.boxMM("impTrim", [Math.min(s * 15.2, s * 18.4), 0, VZ + 0.05], [Math.max(s * 15.2, s * 18.4), 0.46, VZ + 0.7], { color: BLACK, texel: 1 });
      kit.boxMM("rubber", [Math.min(s * 15.3, s * 18.3), 0.46, VZ + 0.1], [Math.max(s * 15.3, s * 18.3), 0.54, VZ + 0.66], { color: GREYD });
      kit.collider([Math.min(s * 15.2, s * 18.4), 0, VZ], [Math.max(s * 15.2, s * 18.4), 0.6, VZ + 0.72], "bench");
      impPillar(kit, s * 14.7, VZ + 0.6, SOF, { w: 0.9, accentKey: "emitBlueSoft" });
      impPillar(kit, s * 29.5, VZ + 0.6, SOF, { w: 0.7, accentKey: "emitBlueSoft" });
    }
    // door surround: hazard kick plates and two guard posts flanking the blast door
    for (const s of [-1, 1]) {
      const px = s * 2.5;
      kit.box("impTrim", px, 0.8, hz - 0.4, 0.5, 1.6, 0.5, { color: BLACK, texel: 1 });
      kit.box("impMetal", px, 1.4, hz - 0.66, 0.36, 0.5, 0.02, { color: CHAR });
      kit.box("emitRedImp", px, 1.52, hz - 0.675, 0.12, 0.06, 0.01);
      kit.box("impGloss", px, 1.3, hz - 0.675, 0.24, 0.16, 0.01);
      kit.collider([px - 0.25, 0, hz - 0.65], [px + 0.25, 1.7, hz], "post");
    }
  }

  // =========================================================================
  // 4. Prop builders
  // =========================================================================
  function displayColumn(x, y, z, yaw, seed) {
    const { q, place } = placer(x, y, z, yaw);
    const add = (mat, lx, ly, lz, sx, sy, sz, extra = {}) => {
      const p = place(lx, ly, lz);
      kit.add(mat, new THREE.BoxGeometry(sx, sy, sz), { pos: [p.x, p.y, p.z], quat: q, ...extra });
    };
    add("impTrim", 0, 1.6, 0, 0.9, 3.2, 0.5, { color: BLACK, texel: 1 });
    add("impMetal", 0, 0.15, 0, 1.0, 0.3, 0.6, { color: CHAR, texel: 1 });
    add("impMetal", 0, 3.1, 0, 1.0, 0.2, 0.6, { color: CHAR, texel: 1 });
    add("impGloss", 0, 1.75, 0.245, 0.78, 2.34, 0.02);
    const p = place(0, 1.75, 0.257);
    kit.add(seed % 2 ? "scrBlue1" : "scrBlue0", new THREE.PlaneGeometry(0.7, 2.24), { pos: [p.x, p.y, p.z], quat: q, uv: "keep" });
    for (const s of [-1, 1]) add("emitWhiteSoft", s * 0.455, 1.6, 0, 0.01, 2.6, 0.06, { uv: "keep" });
    add("impMetal", 0, 0.42, 0.26, 0.7, 0.14, 0.03, { color: CHAR });
    for (let k = 0; k < 3; k++) {
      const b = place(-0.25 + k * 0.25, 2.98, 0.26);
      addBlink(["red", "amber", "blue"][k], b.x, b.y, b.z, 0.08, 0.04, 0.02);
    }
    const g = new THREE.PlaneGeometry(0.3, 0.3);
    const dp = place(0, 0.42, 0.28);
    kit.add("decalImp", g, { pos: [dp.x, dp.y, dp.z], quat: q, uv: "keep", uvRect: impDecalRect(IMP_DECAL.glyphs2) });
    const [mn, mx] = aabbOf(place, 0.5, 0.3, y, y + 3.3);
    kit.collider(mn, mx, "column");
  }

  function cabinet(x, y, z, yaw, seed, w = 1.4, h = 2.4, d = 0.7) {
    const r = rng(seed);
    const { q, place } = placer(x, y, z, yaw);
    const add = (mat, lx, ly, lz, sx, sy, sz, extra = {}) => {
      const p = place(lx, ly, lz);
      kit.add(mat, new THREE.BoxGeometry(sx, sy, sz), { pos: [p.x, p.y, p.z], quat: q, ...extra });
    };
    add("impTrim", 0, h / 2, 0, w, h, d, { color: BLACK, texel: 1 });
    add("impMetal", 0, 0.08, 0, w + 0.04, 0.16, d + 0.04, { color: CHAR, texel: 1 });
    // two door panels, vents on one, LED readout on the other
    for (const s of [-1, 1]) {
      add("impMetalRough", s * (w / 4), h / 2 + 0.05, d / 2 + 0.01, w / 2 - 0.1, h - 0.4, 0.02, { color: GREYD, uv: "world", texel: 1 });
      add("impTrim", s * (w / 4), h / 2 + 0.05, d / 2 + 0.025, 0.05, h - 0.6, 0.01, { color: BLACK });
    }
    const nv = 5 + Math.floor(r() * 4);
    for (let k = 0; k < nv; k++) add("impTrim", -w / 4, 0.5 + k * 0.1, d / 2 + 0.028, w / 2 - 0.3, 0.03, 0.02, { color: BLACK });
    add("impGloss", w / 4, h - 0.55, d / 2 + 0.028, w / 2 - 0.3, 0.26, 0.02);
    add("leds", w / 4, h - 0.5, d / 2 + 0.04, w / 2 - 0.4, 0.05, 0.005, { uv: "keep" });
    const p = place(w / 4 - 0.15, h - 0.63, d / 2 + 0.04);
    addBlink(r() < 0.5 ? "blue" : "amber", p.x, p.y, p.z, 0.05, 0.04, 0.02);
    const p2 = place(w / 4 + 0.15, h - 0.63, d / 2 + 0.04);
    addBlink("red", p2.x, p2.y, p2.z, 0.05, 0.04, 0.02);
    const g = new THREE.PlaneGeometry(0.34, 0.34);
    const dp = place(-w / 4, h - 0.5, d / 2 + 0.031);
    kit.add("decalImp", g, { pos: [dp.x, dp.y, dp.z], quat: q, uv: "keep", uvRect: impDecalRect([IMP_DECAL.power, IMP_DECAL.glyphs1, IMP_DECAL.bay02, IMP_DECAL.hazard][Math.floor(r() * 4)]) });
    add("impMetal", 0, h + 0.05, 0, w - 0.2, 0.1, d - 0.2, { color: CHAR });
    const [mn, mx] = aabbOf(place, w / 2, d / 2, y, y + h + 0.1);
    kit.collider(mn, mx, "cabinet");
  }

  function guardAlcove(f, u) {
    // proud niche on the aft wall: side posts, lintel, dark back panel, red light, weapon rack, floor pad
    for (const s of [-1, 1]) f.box("impTrim", u + s * 1.15, 1.6, 0.36, 0.3, 3.2, 0.72, { color: BLACK, texel: 1 });
    f.box("impTrim", u, 3.05, 0.36, 2.6, 0.3, 0.72, { color: BLACK, texel: 1 });
    f.box("impMetalRough", u, 1.5, 0.15, 2.0, 2.9, 0.02, { color: CHAR, texel: 1 });
    f.box("emitRedImp", u, 2.86, 0.4, 1.6, 0.03, 0.3);
    f.box("impMetal", u, 2.86, 0.6, 1.9, 0.05, 0.2, { color: CHAR });
    f.box("impTrim", u, 1.7, 0.2, 1.7, 0.08, 0.1, { color: BLACK });
    for (let k = 0; k < 4; k++) {
      const ru = u - 0.6 + k * 0.4;
      f.box("impTrim", ru, 1.0, 0.24, 0.06, 1.0, 0.1, { color: BLACK, tilt: 0.06 });
      f.cylV("impMetal", ru, 1.55, 0.24, 0.018, 0.45, { color: GREYD, segments: 8 });
      f.box("impGloss", ru, 0.7, 0.29, 0.1, 0.22, 0.05);
    }
    f.decal(IMP_DECAL.restricted, u, 0.5, 0.17, 0.45);
    f.box("chevronR", u, 0.005, 0.5, 2.0, 0.01, 0.9, { texel: 1.5 });
    f.collider(u - 1.3, u - 1.0, 0, 3.2, 0, 0.75, "alcove");
    f.collider(u + 1.0, u + 1.3, 0, 3.2, 0, 0.75, "alcove");
    f.collider(u - 1.0, u + 1.0, 0, 3.2, 0, 0.18, "alcove");
  }

  function commsMast(x, y, z) {
    kit.box("impTrim", x, y + 0.2, z, 0.9, 0.4, 0.9, { color: BLACK, texel: 1 });
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) kit.box("impMetal", x + dx * 0.3, y + 1.8, z + dz * 0.3, 0.06, 2.8, 0.06, { color: GREYD });
    for (let k = 0; k < 4; k++) {
      const yy = y + 0.9 + k * 0.7;
      kit.box("impMetal", x, yy, z, 0.68, 0.04, 0.04, { color: CHAR });
      kit.box("impMetal", x, yy, z, 0.04, 0.04, 0.68, { color: CHAR });
    }
    kit.cyl("impMetal", x, y + 3.5, z, 0.05, 0.7, "y", { color: GREYD, segments: 8 });
    kit.add("impMetal", new THREE.CylinderGeometry(0.45, 0.1, 0.25, 16, 1, true), { pos: [x, y + 3.6, z], rot: [-0.9, 0, 0], color: GREY, uv: "scale", uvScale: [2, 0.3] });
    kit.box("impTrim", x, y + 1.6, z + 0.36, 0.5, 0.5, 0.08, { color: BLACK });
    kit.box("leds", x, y + 1.6, z + 0.405, 0.4, 0.06, 0.006, { uv: "keep" });
    addBlink("red", x, y + 3.9, z, 0.06, 0.06, 0.06);
    addBlink("amber", x + 0.2, y + 1.48, z + 0.41, 0.05, 0.04, 0.02);
    kit.collider([x - 0.45, y, z - 0.45], [x + 0.45, y + 3.7, z + 0.45], "mast");
  }

  // =========================================================================
  // 5. Holo table with the animated hologram (kit.attach + kit.onUpdate) and the interactable top
  // =========================================================================
  function buildHoloTable(x, y, z) {
    kit.cyl("impTrim", x, y + 0.26, z, 1.15, 0.52, "y", { segments: 8, color: BLACK, texel: 1 });
    kit.cyl("impMetal", x, y + 0.63, z, 1.4, 0.24, "y", { segments: 8, color: CHAR, texel: 1 });
    kit.cyl("impTrim", x, y + 0.81, z, 1.32, 0.12, "y", { segments: 8, color: BLACK, texel: 1 });
    kit.cyl("emitBlueSoft", x, y + 0.05, z, 1.17, 0.03, "y", { segments: 8, uv: "keep" });
    kit.add("emitBlue", new THREE.TorusGeometry(1.24, 0.025, 8, 48).rotateX(Math.PI / 2), { pos: [x, y + 0.9, z] });
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + Math.PI / 8;
      const sx = x + Math.cos(a) * 1.08;
      const sz = z + Math.sin(a) * 1.08;
      kit.box("impMetal", sx, y + 0.95, sz, 0.14, 0.09, 0.14, { color: GREYD });
      kit.box("emitCyan", sx, y + 1.0, sz, 0.06, 0.02, 0.06);
    }
    // control pads on two sides of the rim
    for (const s of [-1, 1]) {
      kit.box("impGloss", x + s * 1.05, y + 0.92, z + 0.55, 0.3, 0.02, 0.2);
      for (let k = 0; k < 3; k++) kit.box(k === 1 ? "emitRedImp" : accentKey, x + s * (0.98 + k * 0.07), y + 0.935, z + 0.6, 0.04, 0.01, 0.04);
    }
    kit.collider([x - 1.45, y, z - 1.45], [x + 1.45, y + 1.0, z + 1.45], "holotable");

    // --- hologram group
    const group = new THREE.Group();
    group.position.set(x, y + 0.92, z);
    const lineMat = new THREE.LineBasicMaterial({ color: 0x9fd0ff, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false });
    const gridMat = new THREE.LineBasicMaterial({ color: 0x4f8dff, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false });
    const pts = [];
    const seg = (a, b) => pts.push(new THREE.Vector3(...a), new THREE.Vector3(...b));
    const boxEdges = (x0, x1, y0, y1, z0, z1) => {
      const c = [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]];
      for (let i = 0; i < 4; i++) {
        seg(c[i], c[(i + 1) % 4]);
        seg(c[4 + i], c[4 + ((i + 1) % 4)]);
        seg(c[i], c[4 + i]);
      }
    };
    const poly = (cx, cy, cz, r, n, axis) => {
      for (let i = 0; i < n; i++) {
        const a0 = (i / n) * Math.PI * 2;
        const a1 = ((i + 1) / n) * Math.PI * 2;
        const p = (a) => (axis === "y" ? [cx + Math.cos(a) * r, cy, cz + Math.sin(a) * r] : [cx + Math.cos(a) * r, cy + Math.sin(a) * r, cz]);
        seg(p(a0), p(a1));
      }
    };
    // hull wedge (bow at -z), 3.2 m long
    const Lh = 3.2;
    const bow = [0, 0.02, -Lh / 2];
    const sl = [-1.0, 0.02, Lh / 2];
    const sr = [1.0, 0.02, Lh / 2];
    const bowB = [0, -0.1, -Lh / 2 + 0.1];
    const slB = [-0.94, -0.16, Lh / 2];
    const srB = [0.94, -0.16, Lh / 2];
    seg(bow, sl);
    seg(bow, sr);
    seg(sl, sr);
    seg(bowB, slB);
    seg(bowB, srB);
    seg(slB, srB);
    seg(bow, bowB);
    seg(sl, slB);
    seg(sr, srB);
    seg([0, 0.02, -Lh / 2], [0, 0.02, Lh / 2]);
    // trench lines along the flanks
    seg([-0.5, -0.06, -0.2], [-0.97, -0.06, Lh / 2]);
    seg([0.5, -0.06, -0.2], [0.97, -0.06, Lh / 2]);
    // superstructure terraces, neck, bridge head, domes, engines
    boxEdges(-0.36, 0.36, 0.02, 0.16, -0.3, Lh / 2);
    boxEdges(-0.24, 0.24, 0.16, 0.28, 0.1, Lh / 2);
    boxEdges(-0.08, 0.08, 0.28, 0.5, 0.95, 1.2);
    boxEdges(-0.28, 0.28, 0.5, 0.6, 0.85, 1.3);
    poly(-0.17, 0.66, 1.15, 0.07, 8, "y");
    poly(0.17, 0.66, 1.15, 0.07, 8, "y");
    for (const ex of [-0.42, 0, 0.42]) poly(ex, -0.06, Lh / 2, 0.1, 8, "z");
    const ship = new THREE.Group();
    ship.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), lineMat));
    // translucent body
    const body = new THREE.BufferGeometry();
    const v = (p) => p;
    const tri = (a, b, c) => [...v(a), ...v(b), ...v(c)];
    body.setAttribute("position", new THREE.Float32BufferAttribute([...tri(bow, sr, sl), ...tri(bowB, slB, srB), ...tri(bow, sl, slB), ...tri(bow, slB, bowB), ...tri(bow, bowB, srB), ...tri(bow, srB, sr), ...tri(sl, sr, srB), ...tri(sl, srB, slB)], 3));
    ship.add(new THREE.Mesh(body, M.holo));
    const tower = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.14, 1.9), M.holo);
    tower.position.set(0, 0.09, 0.65);
    ship.add(tower);
    ship.position.y = 0.62;
    group.add(ship);
    // polar grid on the table top
    const gp = [];
    const gseg = (a, b) => gp.push(new THREE.Vector3(...a), new THREE.Vector3(...b));
    for (const r of [0.4, 0.8, 1.15]) for (let i = 0; i < 48; i++) gseg([Math.cos((i / 48) * Math.PI * 2) * r, 0, Math.sin((i / 48) * Math.PI * 2) * r], [Math.cos(((i + 1) / 48) * Math.PI * 2) * r, 0, Math.sin(((i + 1) / 48) * Math.PI * 2) * r]);
    for (let i = 0; i < 12; i++) gseg([Math.cos((i / 12) * Math.PI * 2) * 0.2, 0, Math.sin((i / 12) * Math.PI * 2) * 0.2], [Math.cos((i / 12) * Math.PI * 2) * 1.15, 0, Math.sin((i / 12) * Math.PI * 2) * 1.15]);
    const grid = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(gp), gridMat);
    grid.position.y = 0.03;
    group.add(grid);
    const glow = new THREE.Mesh(new THREE.CircleGeometry(1.12, 40).rotateX(-Math.PI / 2), M.holo);
    glow.position.y = 0.015;
    group.add(glow);
    // scan ring sweeping up through the hologram
    const scan = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.012, 6, 64).rotateX(Math.PI / 2), M.holoBright);
    group.add(scan);
    // alternate mode: sector plot (planet, orbit rings, contacts)
    const sector = new THREE.Group();
    const wire = M.holo.clone();
    wire.wireframe = true;
    sector.add(new THREE.Mesh(new THREE.SphereGeometry(0.45, 18, 12), wire));
    for (const [r, tilt] of [[0.7, 0.3], [0.95, -0.2]]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.008, 6, 72).rotateX(Math.PI / 2 + tilt), M.holoBright);
      sector.add(ring);
    }
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      const c = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.09), M.holoBright);
      c.position.set(Math.cos(a) * (0.7 + (k % 2) * 0.25), 0.05 * (k % 3), Math.sin(a) * (0.7 + (k % 2) * 0.25));
      sector.add(c);
    }
    sector.position.y = 0.75;
    sector.visible = false;
    group.add(sector);
    kit.attach(group);
    // interactable glossy top (its own material so the hover tint does not touch the shared gloss)
    const topMat = setDomain(M.impGloss.clone(), "interior");
    const top = new THREE.Mesh(new THREE.CylinderGeometry(1.26, 1.26, 0.05, 8), topMat);
    top.position.set(x, y + 0.885, z);
    kit.attach(top);
    let mode = 0;
    kit.interactable({
      object: top,
      material: topMat,
      id: "bridge_holo",
      label: "Holo-display: cycle plot",
      key: "E",
      onActivate: async ({ hud }) => {
        mode = (mode + 1) % 2;
        ship.visible = mode === 0;
        sector.visible = mode === 1;
        hud.setStatus(mode === 0 ? "Holo-display: ISD Vindicator — ship status." : "Holo-display: sector plot — six contacts tracked.");
      },
    });
    holoUpdate = (dt, t) => {
      ship.rotation.y = t * 0.22;
      ship.position.y = 0.62 + Math.sin(t * 0.7) * 0.03;
      grid.rotation.y = -t * 0.05;
      sector.rotation.y = t * 0.12;
      scan.position.y = 0.06 + ((t * 0.16) % 1) * 1.3;
      lineMat.opacity = 0.74 + 0.08 * Math.sin(t * 17.3) * Math.sin(t * 3.1);
    };
  }

  // =========================================================================
  // 6. Animated overlays: blinking status lamps (3 merged groups), tactical screen sweep bars, alert
  // =========================================================================
  const blinkMeshes = {};
  for (const [name, list] of Object.entries(blink)) {
    if (!list.length) continue;
    const geos = list.map(([x, y, z, sx, sy, sz]) => new THREE.BoxGeometry(sx, sy, sz).translate(x, y, z));
    const mesh = new THREE.Mesh(mergeGeometries(geos, false), { red: M.emitRedImp, blue: M.emitBlue, amber: M.emitAmber }[name]);
    mesh.name = "bridge_blink_" + name;
    blinkMeshes[name] = kit.attach(mesh);
  }
  const alertMesh = new THREE.Mesh(mergeGeometries(alertStrips.map(([x, y, z, sx, sy, sz]) => new THREE.BoxGeometry(sx, sy, sz).translate(x + sx / 2, y, z)), false), M.emitRedImp);
  alertMesh.visible = false;
  kit.attach(alertMesh);
  const sweeps = [];
  for (const s of [-1, 1]) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.02, 3.8, 0.05), M.holoBright);
    bar.position.set(s * (hx - 0.35), L + 3.65, 0.6);
    sweeps.push(kit.attach(bar));
  }
  kit.onUpdate((dt, t) => {
    if (holoUpdate) holoUpdate(dt, t);
    const rate = state.alert ? 2.2 : 1;
    if (blinkMeshes.red) blinkMeshes.red.visible = (t * 0.9 * rate) % 1 < 0.55;
    if (blinkMeshes.blue) blinkMeshes.blue.visible = (t * 0.6 * rate + 0.3) % 1 < 0.7;
    if (blinkMeshes.amber) blinkMeshes.amber.visible = (t * 1.3 * rate + 0.6) % 1 < 0.45;
    for (let i = 0; i < sweeps.length; i++) sweeps[i].position.z = 0.6 - 3.9 + ((t * 0.09 + i * 0.5) % 1) * 7.8;
  });

  // =========================================================================
  // 7. Lights (8 declarations; the shadow-casting key spot is the starlight over the platform)
  // =========================================================================
  const alertDim = (t) => (state.alert ? 0.7 + 0.3 * Math.sin(t * 5) : 1);
  // key: cool starlight from the viewports, over the platform, aimed down the walkway (casts shadows)
  kit.light({ type: "spot", pos: [0, H - 1.3, -13.2], target: [0, L, -1], color: 0xd6e4ff, intensity: 230, distance: 36, angle: 0.62, penumbra: 0.5, shadow: true, priority: 1.0, dim: alertDim });
  // aft spot from the fascia housing, lighting the walkway and the pits' inner rows from behind
  kit.light({ type: "spot", pos: [0, H - 1.3, 7.5], target: [0, L, -5], color: 0xe6ecff, intensity: 210, distance: 36, angle: 0.58, penumbra: 0.55, priority: 0.9 });
  for (const s of [-1, 1]) {
    // pit fill (blue-white, as if from the console banks), high enough to reach both rows
    kit.light({ type: "point", pos: [s * 9, 5.6, -1.5], color: 0xa4c4ff, intensity: lux(5.6, 3.2), distance: 28, priority: 0.85 - (s > 0 ? 0.01 : 0) });
    // outer decks: white, from the round ceiling fixtures
    kit.light({ type: "point", pos: [s * 23, 7.4, -2.5], color: 0xdfe8ff, intensity: lux(7.4, 2.3), distance: 34, priority: 0.7 - (s > 0 ? 0.01 : 0) });
  }
  // vestibule (under the soffit) and a centre fill over the walkway
  kit.light({ type: "point", pos: [0, SOF - 0.7, 11.2], color: 0xe4ecff, intensity: lux(5.9, 2.0), distance: 26, priority: 0.75 });
  kit.light({ type: "point", pos: [0, 6.5, 0], color: 0xcfdcff, intensity: lux(6.5, 2.0), distance: 30, priority: 0.8, dim: alertDim });

  // =========================================================================
  // 8. Runtime hooks
  // =========================================================================
  kit.api = {
    crewSpots,
    setAlert(on) {
      state.alert = !!on;
      alertMesh.visible = state.alert;
    },
    get alert() {
      return state.alert;
    },
  };
  void rand;
}
