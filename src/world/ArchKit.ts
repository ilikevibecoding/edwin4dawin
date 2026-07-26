/**
 * Modular architectural kit. Owner: Fable 2.
 *
 * Every piece is authored at real dimensions with chamfered exposed edges and a proper
 * thickness, so nothing in the building reads as an infinitely thin plane. Wall modules carry
 * their own baseboard and, where appropriate, edge trim; door and window modules carry their
 * frames, stops and hardware.
 */
import * as THREE from 'three';
import {
  box, buildMesh, cylinder, extrudeProfile, lathe, meshOf, plainBox, plane,
  rotatedX, rotatedY, rotatedZ, translated, tube, type Part,
} from '../assets/GeomKit';
import { Mat } from '../assets/Materials';
import { drawTexture, FONT_STACK } from '../assets/TextureLab';
import { Palette } from '../art/Palette';
import type { CeilingFinish, FloorFinish, RoomDef } from './MapLayout';

// ---------------------------------------------------------------------------
// Finish resolution
// ---------------------------------------------------------------------------

export function wallMaterial(kind: RoomDef['wall']): THREE.MeshStandardMaterial {
  switch (kind) {
    case 'office-warm-white':
      return Mat.drywall({ color: Palette.wall.warmWhite, seed: 11, wear: 0.3, repeat: 1 });
    case 'office-cool-grey':
      return Mat.drywall({ color: Palette.wall.coolGrey, seed: 23, wear: 0.34, repeat: 1 });
    case 'accent-navy':
      return Mat.drywall({ color: Palette.wall.navy, seed: 31, wear: 0.18, repeat: 1 });
    case 'service-grey':
      return Mat.plaster({ color: Palette.wall.serviceGrey, seed: 47, repeat: 1 });
    case 'restroom-tile':
      return Mat.ceramicTile({
        color: Palette.wall.restroomTile, grout: 0x9aa09e, cells: 6, damp: 0.35, seed: 53, repeat: 1,
      });
    case 'exec-walnut':
      return Mat.woodVeneer({ color: 0x7d5433, dark: 0x3f2716, seed: 67, repeat: 1 });
    case 'exterior':
      return Mat.concrete({ color: Palette.wall.exteriorClad, seed: 71, wear: 0.55, repeat: 1 });
    case 'glass':
    default:
      return Mat.drywall({ color: Palette.wall.warmWhite, seed: 11, wear: 0.3 });
  }
}

export function floorMaterial(kind: FloorFinish): THREE.MeshStandardMaterial {
  switch (kind) {
    case 'carpet-blue':
      return Mat.carpet({ color: Palette.floor.carpetBlue, fleck: Palette.floor.carpetBlueFleck, seed: 101, wear: 0.45 });
    case 'carpet-grey':
      return Mat.carpet({ color: Palette.floor.carpetGrey, fleck: Palette.floor.carpetGreyFleck, seed: 103, wear: 0.5 });
    case 'carpet-exec':
      return Mat.carpet({ color: Palette.floor.carpetExec, fleck: Palette.floor.carpetExecFleck, seed: 107, wear: 0.25 });
    case 'vinyl':
      return Mat.vinyl({ color: Palette.floor.vinyl, seed: 109, wear: 0.5 });
    case 'tile-restroom':
      return Mat.ceramicTile({ color: Palette.floor.tileRestroom, grout: 0x8e938f, cells: 5, damp: 0.45, seed: 113 });
    case 'tile-kitchen':
      return Mat.ceramicTile({ color: Palette.floor.tileKitchen, grout: 0x99958c, cells: 3, damp: 0.2, seed: 127 });
    case 'concrete':
      return Mat.concrete({ color: Palette.floor.concrete, seed: 131, wear: 0.62 });
    case 'concrete-sealed':
      return Mat.concrete({ color: Palette.floor.concreteSealed, seed: 137, wear: 0.4 });
    case 'terrazzo':
      return Mat.terrazzo({ seed: 139 });
    case 'raised-metal':
      return Mat.paintedMetal({ color: Palette.floor.raisedMetal, seed: 149, wear: 0.22 });
    case 'snow':
      return Mat.snow({ seed: 151, trampled: 0.3 });
    case 'asphalt-snow':
      return Mat.concrete({ color: Palette.floor.asphalt, seed: 157, wear: 0.75 });
    default:
      return Mat.concrete();
  }
}

/** Metres of surface per texture repeat, per finish. Keeps texel density uniform. */
export function floorUvScale(kind: FloorFinish): number {
  switch (kind) {
    case 'carpet-blue':
    case 'carpet-grey':
    case 'carpet-exec':
      return 1 / 2.0;
    case 'tile-restroom':
      return 1 / 1.2;
    case 'tile-kitchen':
      return 1 / 1.8;
    case 'terrazzo':
      return 1 / 2.4;
    case 'raised-metal':
      return 1 / 0.6;
    case 'vinyl':
      return 1 / 2.0;
    case 'snow':
      return 1 / 6.0;
    case 'asphalt-snow':
      return 1 / 4.0;
    default:
      return 1 / 3.0;
  }
}

// ---------------------------------------------------------------------------
// Walls
// ---------------------------------------------------------------------------

export interface WallBuildOptions {
  /** Wall runs along X when axis === 'z' (constant Z), along Z when axis === 'x'. */
  axis: 'x' | 'z';
  at: number;
  from: number;
  to: number;
  baseY: number;
  height: number;
  thickness: number;
  material: THREE.Material;
  /** Different material for the far side (exterior cladding). */
  farMaterial?: THREE.Material;
  baseboard?: 'office' | 'service' | 'none';
  crown?: boolean;
  /** Openings expressed as [centre, width, sill, head]. */
  openings?: { center: number; width: number; sill: number; head: number }[];
  uvScale?: number;
}

/**
 * Build one wall run, subdivided around its openings. Returns a mesh group; collision is
 * registered separately by MapBuilder from the same numbers.
 */
export function buildWall(opts: WallBuildOptions): THREE.Group {
  const g = new THREE.Group();
  g.name = `wall-${opts.axis}-${opts.at.toFixed(2)}`;
  const t = opts.thickness;
  const uv = opts.uvScale ?? 0.5;
  const openings = (opts.openings ?? []).slice().sort((a, b) => a.center - b.center);
  const parts: Part[] = [];

  const emitSlab = (from: number, to: number, y0: number, y1: number) => {
    const len = to - from;
    if (len <= 0.001 || y1 - y0 <= 0.001) return;
    const geo = box(
      opts.axis === 'z' ? len : t,
      y1 - y0,
      opts.axis === 'z' ? t : len,
      { bevel: 0.006 },
    );
    const cx = opts.axis === 'z' ? (from + to) / 2 : opts.at;
    const cz = opts.axis === 'z' ? opts.at : (from + to) / 2;
    geo.translate(cx, (y0 + y1) / 2, cz);
    parts.push({ geo, mat: opts.material, uvScale: uv });
  };

  // Solid runs between openings
  let cursor = opts.from;
  for (const o of openings) {
    const a = o.center - o.width / 2;
    const b = o.center + o.width / 2;
    emitSlab(cursor, Math.max(cursor, a), opts.baseY, opts.baseY + opts.height);
    // sill under the opening
    if (o.sill > 0.001) emitSlab(Math.max(cursor, a), b, opts.baseY, opts.baseY + o.sill);
    // lintel over the opening
    if (o.head < opts.height - 0.001) {
      emitSlab(Math.max(cursor, a), b, opts.baseY + o.head, opts.baseY + opts.height);
    }
    cursor = Math.max(cursor, b);
  }
  emitSlab(cursor, opts.to, opts.baseY, opts.baseY + opts.height);

  // Baseboard: a real profile, not a painted stripe.
  if (opts.baseboard && opts.baseboard !== 'none') {
    const bbMat = opts.baseboard === 'service'
      ? Mat.paintedMetal({ color: Palette.trim.baseboardService, seed: 311, wear: 0.4 })
      : Mat.solid(Palette.trim.baseboard, 0.55, 0);
    const bbH = opts.baseboard === 'service' ? 0.1 : 0.12;
    const profile: [number, number][] = [
      [-t / 2 - 0.012, 0],
      [t / 2 + 0.012, 0],
      [t / 2 + 0.012, bbH - 0.02],
      [t / 2 + 0.004, bbH],
      [-t / 2 - 0.004, bbH],
      [-t / 2 - 0.012, bbH - 0.02],
    ];
    const emitBb = (from: number, to: number) => {
      const len = to - from;
      if (len <= 0.02) return;
      const geo = extrudeProfile(profile, len, { bevel: 0.002 });
      // profile lies in XY, extruded along Z -> orient per wall axis
      if (opts.axis === 'z') rotatedY(geo, Math.PI / 2);
      const cx = opts.axis === 'z' ? (from + to) / 2 : opts.at;
      const cz = opts.axis === 'z' ? opts.at : (from + to) / 2;
      translated(geo, cx, opts.baseY, cz);
      parts.push({ geo, mat: bbMat, uvScale: 2 });
    };
    let c2 = opts.from;
    for (const o of openings) {
      const a = o.center - o.width / 2;
      const b = o.center + o.width / 2;
      emitBb(c2, Math.max(c2, a));
      if (o.sill > 0.15) emitBb(Math.max(c2, a), b);
      c2 = Math.max(c2, b);
    }
    emitBb(c2, opts.to);
  }

  if (opts.crown) {
    const crMat = Mat.solid(Palette.trim.crown, 0.6, 0);
    const y = opts.baseY + opts.height;
    const profile: [number, number][] = [
      [-t / 2 - 0.01, -0.07],
      [t / 2 + 0.01, -0.07],
      [t / 2 + 0.01, 0],
      [-t / 2 - 0.01, 0],
    ];
    const len = opts.to - opts.from;
    if (len > 0.05) {
      const geo = extrudeProfile(profile, len, { bevel: 0.002 });
      if (opts.axis === 'z') rotatedY(geo, Math.PI / 2);
      const cx = opts.axis === 'z' ? (opts.from + opts.to) / 2 : opts.at;
      const cz = opts.axis === 'z' ? opts.at : (opts.from + opts.to) / 2;
      translated(geo, cx, y, cz);
      parts.push({ geo, mat: crMat, uvScale: 2 });
    }
  }

  if (parts.length > 0) g.add(buildMesh(parts, 'wall'));

  // Exterior cladding skin on the outward face.
  if (opts.farMaterial) {
    const cladParts: Part[] = [];
    const clad = 0.06;
    const emitClad = (from: number, to: number, y0: number, y1: number) => {
      const len = to - from;
      if (len <= 0.001 || y1 - y0 <= 0.001) return;
      const geo = box(
        opts.axis === 'z' ? len : clad,
        y1 - y0,
        opts.axis === 'z' ? clad : len,
        { bevel: 0.004 },
      );
      const cx = opts.axis === 'z' ? (from + to) / 2 : opts.at;
      const cz = opts.axis === 'z' ? opts.at : (from + to) / 2;
      geo.translate(cx, (y0 + y1) / 2, cz);
      cladParts.push({ geo, mat: opts.farMaterial!, uvScale: 0.5 });
    };
    let c3 = opts.from;
    for (const o of openings) {
      const a = o.center - o.width / 2;
      const b = o.center + o.width / 2;
      emitClad(c3, Math.max(c3, a), opts.baseY, opts.baseY + opts.height);
      if (o.sill > 0.001) emitClad(Math.max(c3, a), b, opts.baseY, opts.baseY + o.sill);
      if (o.head < opts.height - 0.001) emitClad(Math.max(c3, a), b, opts.baseY + o.head, opts.baseY + opts.height);
      c3 = Math.max(c3, b);
    }
    emitClad(c3, opts.to, opts.baseY, opts.baseY + opts.height);
    if (cladParts.length) {
      const m = buildMesh(cladParts, 'wall-clad');
      // push outward by half thickness so it sits proud of the structural core
      const off = (opts.thickness / 2 + clad / 2) * (opts.farMaterial ? 1 : 0);
      if (opts.axis === 'z') m.position.z += opts.at >= 0 ? off : -off;
      else m.position.x += opts.at >= 0 ? off : -off;
      g.add(m);
    }
  }

  return g;
}

// ---------------------------------------------------------------------------
// Door frames, leaves and hardware
// ---------------------------------------------------------------------------

export type DoorVisualKind =
  | 'door-standard' | 'door-glass' | 'door-double-glass' | 'door-fire'
  | 'door-security' | 'door-restroom' | 'door-server' | 'door-loading';

export function doorFrame(width: number, height: number, thickness: number, service: boolean): THREE.Group {
  const g = new THREE.Group();
  const mat = service
    ? Mat.paintedMetal({ color: Palette.trim.doorFrameService, seed: 401, wear: 0.35 })
    : Mat.solid(Palette.trim.doorFrame, 0.55, 0);
  const jw = 0.055;
  const d = thickness + 0.05;
  const parts: Part[] = [];
  // jambs with a rebated stop
  for (const s of [-1, 1]) {
    const geo = box(jw, height, d, { bevel: 0.005, segments: 1 });
    geo.translate(s * (width / 2 + jw / 2), height / 2, 0);
    parts.push({ geo, mat, uvScale: 3 });
    const stop = box(0.016, height, 0.02, { bevel: 0.003 });
    stop.translate(s * (width / 2 - 0.008), height / 2, -d / 2 + 0.03);
    parts.push({ geo: stop, mat, uvScale: 4 });
  }
  const head = box(width + jw * 2, jw, d, { bevel: 0.005 });
  head.translate(0, height + jw / 2, 0);
  parts.push({ geo: head, mat, uvScale: 3 });
  const headStop = box(width, 0.016, 0.02, { bevel: 0.003 });
  headStop.translate(0, height - 0.008, -d / 2 + 0.03);
  parts.push({ geo: headStop, mat, uvScale: 4 });
  // threshold
  const thr = box(width + jw, 0.014, d, { bevel: 0.004 });
  thr.translate(0, 0.007, 0);
  parts.push({ geo: thr, mat: Mat.aluminium({ seed: 403 }), uvScale: 4 });
  g.add(buildMesh(parts, 'door-frame'));
  return g;
}

/**
 * Door leaf pivoted at the origin (hinge edge). Positive X is the leaf direction, the leaf
 * swings about Y.
 */
export function doorLeaf(kind: DoorVisualKind, width: number, height: number): THREE.Group {
  const g = new THREE.Group();
  g.name = `leaf-${kind}`;
  const t = kind === 'door-security' || kind === 'door-server' ? 0.055 : 0.045;
  const parts: Part[] = [];
  let leafMat: THREE.Material;
  switch (kind) {
    case 'door-fire': leafMat = Mat.paintedMetal({ color: Palette.door.fireGrey, seed: 411, wear: 0.4 }); break;
    case 'door-security': leafMat = Mat.paintedMetal({ color: Palette.door.securityDark, seed: 413, wear: 0.25 }); break;
    case 'door-server': leafMat = Mat.paintedMetal({ color: Palette.door.serverBlue, seed: 417, wear: 0.15 }); break;
    case 'door-restroom': leafMat = Mat.paintedMetal({ color: Palette.door.restroom, seed: 419, wear: 0.45 }); break;
    case 'door-loading': leafMat = Mat.paintedMetal({ color: Palette.door.loadingSteel, seed: 421, wear: 0.6 }); break;
    case 'door-glass':
    case 'door-double-glass': leafMat = Mat.aluminium({ seed: 423 }); break;
    default: leafMat = Mat.woodVeneer({ color: Palette.door.officeWood, dark: 0x4a2f18, seed: 427 });
  }

  if (kind === 'door-glass' || kind === 'door-double-glass') {
    // Aluminium stile-and-rail frame with a full glass infill.
    const st = 0.05;
    const rail = 0.11;
    const railBottom = 0.19;
    const frameParts: [number, number, number, number][] = [
      [st / 2, height / 2, st, height],
      [width - st / 2, height / 2, st, height],
      [width / 2, height - rail / 2, width, rail],
      [width / 2, railBottom / 2, width, railBottom],
    ];
    for (const [cx, cy, w, h] of frameParts) {
      const geo = box(w, h, t, { bevel: 0.004 });
      geo.translate(cx, cy, 0);
      parts.push({ geo, mat: leafMat, uvScale: 4 });
    }
    const glassW = width - st * 2;
    const glassH = height - rail - railBottom;
    const glass = box(glassW, glassH, 0.008, { bevel: 0.001 });
    glass.translate(width / 2, railBottom + glassH / 2, 0);
    g.add(meshOf(glass, Mat.clearGlass({ opacity: 0.16 }), { uvScale: 1, name: 'glass', cast: false }));
    // pull handle
    const bar = rotatedX(cylinder(0.014, 0.014, 0.9, 10), Math.PI / 2);
    bar.rotateY(Math.PI / 2);
    translated(bar, width - 0.11, height * 0.48, -t / 2 - 0.05);
    parts.push({ geo: bar, mat: Mat.stainless({ seed: 431 }), uvScale: 6 });
    for (const yy of [height * 0.48 - 0.42, height * 0.48 + 0.42]) {
      const stub = rotatedX(cylinder(0.011, 0.011, 0.05, 8), Math.PI / 2);
      translated(stub, width - 0.11, yy, -t / 2 - 0.025);
      parts.push({ geo: stub, mat: Mat.stainless({ seed: 431 }), uvScale: 6 });
    }
  } else {
    // Solid leaf with a slight face rebate so it does not read as a flat slab.
    const core = box(width, height, t, { bevel: 0.006, segments: 2 });
    core.translate(width / 2, height / 2, 0);
    parts.push({ geo: core, mat: leafMat, uvScale: 1.6 });
    // recessed face panels for wooden office doors
    if (kind === 'door-standard') {
      for (const [cy, h] of [[height * 0.31, height * 0.42], [height * 0.74, height * 0.34]] as [number, number][]) {
        const panel = box(width - 0.2, h, 0.008, { bevel: 0.004 });
        panel.translate(width / 2, cy, -t / 2 - 0.003);
        parts.push({ geo: panel, mat: leafMat, uvScale: 1.6 });
      }
    }
    // vision panel on fire and restroom doors
    if (kind === 'door-fire' || kind === 'door-restroom' || kind === 'door-loading') {
      const vw = Math.min(0.3, width * 0.34);
      const vh = 0.55;
      const surround = box(vw + 0.05, vh + 0.05, t + 0.006, { bevel: 0.004 });
      surround.translate(width / 2, height * 0.71, 0);
      parts.push({ geo: surround, mat: Mat.aluminium({ seed: 433 }), uvScale: 4 });
      const glass = box(vw, vh, 0.008, { bevel: 0.001 });
      glass.translate(width / 2, height * 0.71, 0);
      g.add(meshOf(glass, Mat.clearGlass({ opacity: 0.18 }), { name: 'vision', cast: false }));
    }
    if (kind === 'door-server' || kind === 'door-security') {
      // reinforcing ribs
      for (const yy of [height * 0.25, height * 0.5, height * 0.75]) {
        const rib = box(width - 0.08, 0.03, 0.012, { bevel: 0.003 });
        rib.translate(width / 2, yy, -t / 2 - 0.006);
        parts.push({ geo: rib, mat: leafMat, uvScale: 3 });
      }
    }
  }

  // hinges
  const hingeMat = Mat.stainless({ seed: 437 });
  for (const yy of [height * 0.14, height * 0.5, height * 0.86]) {
    const h = box(0.02, 0.1, t + 0.01, { bevel: 0.002 });
    h.translate(0.012, yy, 0);
    parts.push({ geo: h, mat: hingeMat, uvScale: 8 });
    const pin = rotatedX(cylinder(0.008, 0.008, 0.11, 8), 0);
    translated(pin, 0.004, yy, -t / 2 - 0.006);
    parts.push({ geo: pin, mat: hingeMat, uvScale: 8 });
  }

  // handle / push bar
  if (kind === 'door-loading' || kind === 'door-fire') {
    const bar = rotatedZ(cylinder(0.017, 0.017, width - 0.24, 10), Math.PI / 2);
    translated(bar, width / 2, 1.05, -t / 2 - 0.055);
    parts.push({ geo: bar, mat: Mat.paintedMetal({ color: 0xb5b9bc, seed: 439, wear: 0.5 }), uvScale: 5 });
    for (const s of [-1, 1]) {
      const mount = box(0.05, 0.09, 0.06, { bevel: 0.004 });
      mount.translate(width / 2 + s * (width - 0.3) / 2, 1.05, -t / 2 - 0.03);
      parts.push({ geo: mount, mat: Mat.paintedMetal({ color: 0x8f9498, seed: 441, wear: 0.4 }), uvScale: 6 });
    }
  } else if (kind !== 'door-glass' && kind !== 'door-double-glass') {
    const lever = buildLeverHandle();
    lever.position.set(width - 0.085, 1.04, 0);
    g.add(lever);
    const lever2 = buildLeverHandle();
    lever2.rotation.y = Math.PI;
    lever2.position.set(width - 0.085, 1.04, 0);
    g.add(lever2);
    // escutcheon / lock cylinder
    const esc = rotatedX(cylinder(0.022, 0.022, 0.008, 12), Math.PI / 2);
    translated(esc, width - 0.085, 0.9, -t / 2 - 0.004);
    parts.push({ geo: esc, mat: Mat.stainless({ seed: 443 }), uvScale: 8 });
  }

  if (parts.length) g.add(buildMesh(parts, 'door-leaf'));
  return g;
}

function buildLeverHandle(): THREE.Mesh {
  const mat = Mat.stainless({ seed: 447 });
  const parts: Part[] = [];
  const rose = rotatedX(cylinder(0.032, 0.034, 0.012, 14), Math.PI / 2);
  translated(rose, 0, 0, -0.028);
  parts.push({ geo: rose, mat, uvScale: 10 });
  const neck = rotatedX(cylinder(0.014, 0.016, 0.05, 10), Math.PI / 2);
  translated(neck, 0, 0, -0.05);
  parts.push({ geo: neck, mat, uvScale: 10 });
  const lever = box(0.115, 0.024, 0.026, { bevel: 0.008, segments: 2 });
  lever.translate(-0.05, 0, -0.072);
  parts.push({ geo: lever, mat, uvScale: 8 });
  const tip = box(0.03, 0.02, 0.024, { bevel: 0.008, segments: 2 });
  tip.translate(-0.105, -0.006, -0.072);
  parts.push({ geo: tip, mat, uvScale: 8 });
  return buildMesh(parts, 'lever');
}

/** Overhead door closer arm. */
export function doorCloser(): THREE.Mesh {
  const mat = Mat.paintedMetal({ color: 0x6f7477, seed: 451, wear: 0.3 });
  const parts: Part[] = [];
  const body = box(0.22, 0.06, 0.05, { bevel: 0.006 });
  parts.push({ geo: body, mat, uvScale: 6 });
  const arm = box(0.19, 0.018, 0.014, { bevel: 0.004 });
  arm.translate(0.16, 0, -0.035);
  arm.rotateY(0.35);
  parts.push({ geo: arm, mat: Mat.stainless({ seed: 453 }), uvScale: 8 });
  return buildMesh(parts, 'door-closer');
}

export function cardReader(active = true): THREE.Group {
  const g = new THREE.Group();
  const parts: Part[] = [];
  const body = box(0.08, 0.12, 0.022, { bevel: 0.006, segments: 2 });
  parts.push({ geo: body, mat: Mat.hardPlastic({ color: 0x25282b, seed: 461 }), uvScale: 10 });
  const face = box(0.062, 0.1, 0.004, { bevel: 0.003 });
  face.translate(0, 0.005, 0.012);
  parts.push({ geo: face, mat: Mat.hardPlastic({ color: 0x1a1d20, seed: 463 }), uvScale: 12 });
  g.add(buildMesh(parts, 'card-reader'));
  const led = new THREE.Mesh(
    new THREE.CircleGeometry(0.008, 12),
    Mat.emissive(active ? Palette.light.exitSign : Palette.light.emergency, 3),
  );
  led.position.set(0, 0.038, 0.0155);
  g.add(led);
  return g;
}

export function keypad(): THREE.Group {
  const g = new THREE.Group();
  const parts: Part[] = [];
  const body = box(0.09, 0.13, 0.025, { bevel: 0.006, segments: 2 });
  parts.push({ geo: body, mat: Mat.hardPlastic({ color: 0x2a2d30, seed: 465 }), uvScale: 10 });
  const btnMat = Mat.hardPlastic({ color: 0x4a4e52, seed: 467 });
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 3; c++) {
      const b = box(0.017, 0.014, 0.006, { bevel: 0.002 });
      b.translate(-0.021 + c * 0.021, 0.028 - r * 0.019, 0.014);
      parts.push({ geo: b, mat: btnMat, uvScale: 20 });
    }
  }
  g.add(buildMesh(parts, 'keypad'));
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.055, 0.016), Mat.emissive(0x53d18a, 1.6));
  screen.position.set(0, 0.05, 0.0132);
  g.add(screen);
  return g;
}

/** Wall/door sign with original text. */
export function signPlate(text: string, w = 0.24, h = 0.09, sub?: string): THREE.Mesh {
  const key = `sign:${text}:${sub ?? ''}:${w}x${h}`;
  const tex = drawTexture(key, Math.round(w * 900), Math.round(h * 900), (ctx, cw, ch) => {
    ctx.fillStyle = '#1c2630';
    ctx.fillRect(0, 0, cw, ch);
    ctx.fillStyle = '#e8eef3';
    ctx.font = `600 ${ch * (sub ? 0.34 : 0.42)}px ${FONT_STACK.ui}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, cw / 2, sub ? ch * 0.37 : ch * 0.52, cw * 0.92);
    if (sub) {
      ctx.fillStyle = '#8fa4b4';
      ctx.font = `400 ${ch * 0.22}px ${FONT_STACK.ui}`;
      ctx.fillText(sub, cw / 2, ch * 0.72, cw * 0.92);
    }
    ctx.strokeStyle = '#3d5163';
    ctx.lineWidth = ch * 0.03;
    ctx.strokeRect(ch * 0.05, ch * 0.05, cw - ch * 0.1, ch - ch * 0.1);
  });
  const geo = box(w, h, 0.006, { bevel: 0.002 });
  const mesh = new THREE.Mesh(geo, Mat.printed(key, tex, { roughness: 0.4 }));
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  return mesh;
}

// ---------------------------------------------------------------------------
// Windows and glazing
// ---------------------------------------------------------------------------

export interface WindowOptions {
  width: number;
  height: number;
  thickness: number;
  /** 'exterior' gets a thermally broken aluminium frame, 'interior' a slim office frame. */
  style: 'exterior' | 'interior' | 'curtain' | 'clerestory' | 'passthrough';
  mullions?: number;
  blinds?: number;
  glass?: 'clear' | 'tinted' | 'frosted';
}

/** Frame + glazing, built in local XY with the wall plane at z = 0. */
export function buildWindow(o: WindowOptions): THREE.Group {
  const g = new THREE.Group();
  const parts: Part[] = [];
  const frameMat = o.style === 'interior' || o.style === 'passthrough'
    ? Mat.aluminium({ seed: 471 })
    : Mat.paintedMetal({ color: 0x585d61, seed: 473, wear: 0.28 });
  const fw = o.style === 'curtain' ? 0.07 : o.style === 'interior' ? 0.035 : 0.055;
  const fd = o.thickness + 0.02;

  // outer frame
  const frames: [number, number, number, number][] = [
    [0, o.height / 2 - fw / 2, o.width, fw],
    [0, -o.height / 2 + fw / 2, o.width, fw],
    [-o.width / 2 + fw / 2, 0, fw, o.height - fw * 2],
    [o.width / 2 - fw / 2, 0, fw, o.height - fw * 2],
  ];
  for (const [cx, cy, w, h] of frames) {
    const geo = box(w, h, fd, { bevel: 0.005 });
    geo.translate(cx, cy, 0);
    parts.push({ geo, mat: frameMat, uvScale: 4 });
  }
  // mullions
  const nm = o.mullions ?? (o.width > 2.6 ? Math.floor(o.width / 1.4) : 0);
  for (let i = 1; i <= nm; i++) {
    const x = -o.width / 2 + (o.width * i) / (nm + 1);
    const geo = box(fw * 0.8, o.height - fw * 2, fd * 0.9, { bevel: 0.004 });
    geo.translate(x, 0, 0);
    parts.push({ geo, mat: frameMat, uvScale: 5 });
  }
  // transom on tall curtain wall panels
  if (o.style === 'curtain' && o.height > 2.6) {
    const geo = box(o.width - fw * 2, fw * 0.8, fd * 0.9, { bevel: 0.004 });
    geo.translate(0, o.height / 2 - 0.75, 0);
    parts.push({ geo, mat: frameMat, uvScale: 5 });
  }
  g.add(buildMesh(parts, 'window-frame'));

  // glazing
  const glassMat =
    o.glass === 'frosted' ? Mat.frostedGlass({ seed: 477 })
      : o.glass === 'tinted' ? Mat.tintedGlass()
        : Mat.clearGlass({ opacity: o.style === 'interior' ? 0.1 : 0.14 });
  const pane = new THREE.Mesh(
    plane(Math.max(0.05, o.width - fw * 1.6), Math.max(0.05, o.height - fw * 1.6)),
    glassMat,
  );
  pane.name = 'glass-pane';
  pane.castShadow = false;
  pane.receiveShadow = false;
  g.add(pane);

  // a second, very faint pane offset in depth reads as double glazing at grazing angles
  if (o.style === 'exterior' || o.style === 'curtain') {
    const pane2 = pane.clone();
    pane2.position.z = -o.thickness * 0.5;
    pane2.name = 'glass-pane-outer';
    g.add(pane2);
  }

  // blinds
  if (o.blinds && o.blinds > 0.01) {
    g.add(buildBlinds(o.width - fw * 1.4, o.height - fw * 1.4, o.blinds));
  }
  return g;
}

/** Venetian blinds. `closed` 0..1 controls how far they are lowered. */
export function buildBlinds(width: number, height: number, closed: number): THREE.Group {
  const g = new THREE.Group();
  g.name = 'blinds';
  const mat = Mat.solid(0xd9d6cd, 0.82, 0);
  const slatH = 0.05;
  const drop = height * Math.min(1, Math.max(0, closed));
  const count = Math.max(1, Math.floor(drop / slatH));
  const parts: Part[] = [];
  // head rail
  const rail = box(width + 0.03, 0.05, 0.055, { bevel: 0.004 });
  rail.translate(0, height / 2 - 0.025, 0.03);
  parts.push({ geo: rail, mat: Mat.solid(0xbfbcb4, 0.7, 0), uvScale: 4 });
  for (let i = 0; i < count; i++) {
    const y = height / 2 - 0.06 - i * slatH;
    const slat = box(width, 0.006, 0.046, { bevel: 0.002 });
    slat.translate(0, y, 0.03);
    rotatedX(slat, 0);
    parts.push({ geo: slat, mat, uvScale: 4 });
  }
  // pull cord
  const cord = cylinder(0.0025, 0.0025, drop * 0.8 + 0.1, 6);
  translated(cord, width / 2 - 0.06, height / 2 - (drop * 0.8 + 0.1) / 2 - 0.05, 0.055);
  parts.push({ geo: cord, mat: Mat.solid(0xcfcdc6, 0.9, 0), uvScale: 20 });
  g.add(buildMesh(parts, 'blinds'));
  return g;
}

// ---------------------------------------------------------------------------
// Floors and ceilings
// ---------------------------------------------------------------------------

export function floorSlab(
  x0: number, z0: number, x1: number, z1: number, y: number, finish: FloorFinish,
): THREE.Mesh {
  const w = x1 - x0;
  const d = z1 - z0;
  const geo = plane(w, d);
  rotatedX(geo, -Math.PI / 2);
  translated(geo, (x0 + x1) / 2, y, (z0 + z1) / 2);
  const m = meshOf(geo, floorMaterial(finish), {
    uvScale: floorUvScale(finish), name: 'floor', cast: false, receive: true,
  });
  return m;
}

/** Suspended ceiling: T-bar grid plus individual 600x600 tiles with wear variants. */
export function ceilingGrid(
  x0: number, z0: number, x1: number, z1: number, y: number,
  opts: { missing?: number; stained?: number; seedBase?: number; service?: boolean } = {},
): THREE.Group {
  const g = new THREE.Group();
  g.name = 'ceiling-grid';
  const cell = 0.6;
  const nx = Math.max(1, Math.round((x1 - x0) / cell));
  const nz = Math.max(1, Math.round((z1 - z0) / cell));
  const cw = (x1 - x0) / nx;
  const cd = (z1 - z0) / nz;
  const tileMat = Mat.ceilingTile({ stain: 0.1, seed: 501, repeat: 1 });
  const tileStained = Mat.ceilingTile({ stain: 0.72, seed: 503, repeat: 1 });
  const gridMat = Mat.paintedMetal({ color: Palette.ceiling.grid, seed: 505, wear: 0.2 });
  const deckMat = Mat.concrete({ color: Palette.ceiling.deck, seed: 507, wear: 0.6 });

  // dark plenum backing so a missing tile shows a believable void
  const backing = plane(x1 - x0, z1 - z0);
  rotatedX(backing, Math.PI / 2);
  translated(backing, (x0 + x1) / 2, y + 0.36, (z0 + z1) / 2);
  g.add(meshOf(backing, deckMat, { uvScale: 0.5, name: 'plenum', cast: false }));

  const tileParts: Part[] = [];
  const stainParts: Part[] = [];
  const gridParts: Part[] = [];
  const missing = opts.missing ?? 0.012;
  const stained = opts.stained ?? 0.06;
  const seedBase = opts.seedBase ?? 1;

  for (let iz = 0; iz < nz; iz++) {
    for (let ix = 0; ix < nx; ix++) {
      const h = ((ix * 73856093) ^ (iz * 19349663) ^ (seedBase * 83492791)) >>> 0;
      const r = (h % 1000) / 1000;
      if (r < missing) continue;
      const cx = x0 + cw * (ix + 0.5);
      const cz = z0 + cd * (iz + 0.5);
      const geo = box(cw - 0.024, 0.016, cd - 0.024, { bevel: 0.003 });
      geo.translate(cx, y + 0.008, cz);
      if (r < missing + stained) stainParts.push({ geo, mat: tileStained, uvScale: 1 / 0.6 });
      else tileParts.push({ geo, mat: tileMat, uvScale: 1 / 0.6 });
    }
  }
  // T-bar grid
  for (let ix = 0; ix <= nx; ix++) {
    const x = x0 + cw * ix;
    const geo = box(0.024, 0.03, z1 - z0, { bevel: 0.003 });
    geo.translate(x, y + 0.015, (z0 + z1) / 2);
    gridParts.push({ geo, mat: gridMat, uvScale: 3 });
  }
  for (let iz = 0; iz <= nz; iz++) {
    const z = z0 + cd * iz;
    const geo = box(x1 - x0, 0.03, 0.024, { bevel: 0.003 });
    geo.translate((x0 + x1) / 2, y + 0.015, z);
    gridParts.push({ geo, mat: gridMat, uvScale: 3 });
  }
  const all = [...tileParts, ...stainParts, ...gridParts];
  if (all.length) {
    const m = buildMesh(all, 'ceiling');
    m.castShadow = false;
    m.receiveShadow = true;
    g.add(m);
  }
  return g;
}

/** Exposed structural soffit for service spaces and the lobby. */
export function exposedCeiling(
  x0: number, z0: number, x1: number, z1: number, y: number, beamAxis: 'x' | 'z' = 'x',
): THREE.Group {
  const g = new THREE.Group();
  const deck = plane(x1 - x0, z1 - z0);
  rotatedX(deck, Math.PI / 2);
  translated(deck, (x0 + x1) / 2, y, (z0 + z1) / 2);
  g.add(meshOf(deck, Mat.concrete({ color: Palette.ceiling.deck, seed: 511, wear: 0.55 }), {
    uvScale: 0.35, name: 'soffit', cast: false,
  }));
  const beamMat = Mat.paintedMetal({ color: 0x5a5f63, seed: 513, wear: 0.35 });
  const parts: Part[] = [];
  const span = beamAxis === 'x' ? z1 - z0 : x1 - x0;
  const n = Math.max(1, Math.floor(span / 2.4));
  for (let i = 1; i <= n; i++) {
    const t = i / (n + 1);
    if (beamAxis === 'x') {
      const z = z0 + span * t;
      const web = box(x1 - x0, 0.32, 0.02, { bevel: 0.004 });
      web.translate((x0 + x1) / 2, y - 0.18, z);
      parts.push({ geo: web, mat: beamMat, uvScale: 2 });
      for (const yy of [y - 0.02, y - 0.34]) {
        const fl = box(x1 - x0, 0.02, 0.14, { bevel: 0.003 });
        fl.translate((x0 + x1) / 2, yy, z);
        parts.push({ geo: fl, mat: beamMat, uvScale: 2 });
      }
    } else {
      const x = x0 + span * t;
      const web = box(0.02, 0.32, z1 - z0, { bevel: 0.004 });
      web.translate(x, y - 0.18, (z0 + z1) / 2);
      parts.push({ geo: web, mat: beamMat, uvScale: 2 });
      for (const yy of [y - 0.02, y - 0.34]) {
        const fl = box(0.14, 0.02, z1 - z0, { bevel: 0.003 });
        fl.translate(x, yy, (z0 + z1) / 2);
        parts.push({ geo: fl, mat: beamMat, uvScale: 2 });
      }
    }
  }
  if (parts.length) {
    const m = buildMesh(parts, 'beams');
    m.castShadow = true;
    g.add(m);
  }
  return g;
}

export function ceilingFor(
  room: RoomDef, rectIndex: number, kind: CeilingFinish,
  x0: number, z0: number, x1: number, z1: number,
): THREE.Object3D | null {
  const y = room.ceilingY;
  switch (kind) {
    case 'grid':
      return ceilingGrid(x0, z0, x1, z1, y, { seedBase: rectIndex + room.id.length, missing: 0.01, stained: 0.07 });
    case 'grid-service':
      return ceilingGrid(x0, z0, x1, z1, y, { seedBase: rectIndex + 7, missing: 0.04, stained: 0.16, service: true });
    case 'exposed':
      return exposedCeiling(x0, z0, x1, z1, y, (x1 - x0) > (z1 - z0) ? 'x' : 'z');
    case 'concrete': {
      const deck = plane(x1 - x0, z1 - z0);
      rotatedX(deck, Math.PI / 2);
      translated(deck, (x0 + x1) / 2, y, (z0 + z1) / 2);
      return meshOf(deck, Mat.concrete({ color: Palette.ceiling.concrete, seed: 517, wear: 0.4 }), {
        uvScale: 0.35, name: 'ceiling', cast: false,
      });
    }
    case 'open':
    case 'none':
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Stairs, landings, railings
// ---------------------------------------------------------------------------

export interface StairOptions {
  /** Number of risers. */
  steps: number;
  totalRise: number;
  totalRun: number;
  width: number;
  /** Direction the flight ascends: +x, -x, +z, -z. */
  dir: '+x' | '-x' | '+z' | '-z';
  treadFinish?: 'concrete' | 'rubber' | 'terrazzo';
  stringer?: boolean;
}

/** Stair flight with its base at the origin, ascending in `dir`. */
export function stairFlight(o: StairOptions): { group: THREE.Group; brushes: THREE.Box3[] } {
  const g = new THREE.Group();
  const brushes: THREE.Box3[] = [];
  const rise = o.totalRise / o.steps;
  const run = o.totalRun / o.steps;
  const treadMat = o.treadFinish === 'rubber'
    ? Mat.rubber({ color: 0x33363a, seed: 521 })
    : o.treadFinish === 'terrazzo'
      ? Mat.terrazzo({ seed: 523 })
      : Mat.concrete({ color: 0x8a8c8b, seed: 527, wear: 0.35 });
  const riserMat = Mat.concrete({ color: 0x82858a, seed: 529, wear: 0.3 });
  const noseMat = Mat.paintedMetal({ color: 0xb9a03a, seed: 531, wear: 0.55 });
  const parts: Part[] = [];

  const axis = o.dir === '+x' || o.dir === '-x' ? 'x' : 'z';
  const sign = o.dir === '+x' || o.dir === '+z' ? 1 : -1;

  for (let i = 0; i < o.steps; i++) {
    const y = rise * (i + 1);
    const along = run * (i + 0.5) * sign;
    const treadW = axis === 'x' ? run : o.width;
    const treadD = axis === 'x' ? o.width : run;
    const tread = box(treadW, 0.05, treadD, { bevel: 0.006 });
    const px = axis === 'x' ? along : 0;
    const pz = axis === 'x' ? 0 : along;
    tread.translate(px, y - 0.025, pz);
    parts.push({ geo: tread, mat: treadMat, uvScale: 1.6 });

    // riser face
    const riserBack = run * i * sign;
    const rW = axis === 'x' ? 0.03 : o.width;
    const rD = axis === 'x' ? o.width : 0.03;
    const riser = box(rW, rise, rD, { bevel: 0.004 });
    riser.translate(axis === 'x' ? riserBack : 0, y - rise / 2, axis === 'x' ? 0 : riserBack);
    parts.push({ geo: riser, mat: riserMat, uvScale: 2 });

    // anti-slip nosing - a real safety detail and a strong readability cue
    const nW = axis === 'x' ? 0.04 : o.width - 0.05;
    const nD = axis === 'x' ? o.width - 0.05 : 0.04;
    const nose = box(nW, 0.008, nD, { bevel: 0.002 });
    nose.translate(
      axis === 'x' ? riserBack + 0.03 * sign : 0,
      y + 0.004,
      axis === 'x' ? 0 : riserBack + 0.03 * sign,
    );
    parts.push({ geo: nose, mat: noseMat, uvScale: 6 });

    // collision: one box per step
    const bx = axis === 'x' ? Math.min(riserBack, riserBack + run * sign) : -o.width / 2;
    const bx2 = axis === 'x' ? Math.max(riserBack, riserBack + run * sign) : o.width / 2;
    const bz = axis === 'x' ? -o.width / 2 : Math.min(riserBack, riserBack + run * sign);
    const bz2 = axis === 'x' ? o.width / 2 : Math.max(riserBack, riserBack + run * sign);
    brushes.push(new THREE.Box3(new THREE.Vector3(bx, 0, bz), new THREE.Vector3(bx2, y, bz2)));
  }

  if (o.stringer !== false) {
    const strMat = Mat.paintedMetal({ color: 0x6a6f73, seed: 533, wear: 0.3 });
    for (const s of [-1, 1]) {
      const len = Math.hypot(o.totalRun, o.totalRise);
      const geo = box(axis === 'x' ? len : 0.05, 0.28, axis === 'x' ? 0.05 : len, { bevel: 0.005 });
      const ang = Math.atan2(o.totalRise, o.totalRun);
      if (axis === 'x') geo.rotateZ(ang * sign);
      else geo.rotateX(-ang * sign);
      geo.translate(
        axis === 'x' ? (o.totalRun / 2) * sign : s * (o.width / 2 + 0.03),
        o.totalRise / 2 - 0.1,
        axis === 'x' ? s * (o.width / 2 + 0.03) : (o.totalRun / 2) * sign,
      );
      parts.push({ geo, mat: strMat, uvScale: 2 });
    }
  }

  g.add(buildMesh(parts, 'stair-flight'));
  return { group: g, brushes };
}

/** Guard rail with top rail, mid rail and posts. Points are XZ in world space. */
export function railing(
  points: [number, number][], y: number, height = 1.05,
  style: 'steel' | 'glass' = 'steel',
): THREE.Group {
  const g = new THREE.Group();
  const parts: Part[] = [];
  const railMat = Mat.stainless({ seed: 541 });
  const postMat = Mat.paintedMetal({ color: 0x3d4246, seed: 543, wear: 0.2 });

  for (let i = 0; i < points.length - 1; i++) {
    const [x0, z0] = points[i];
    const [x1, z1] = points[i + 1];
    const dx = x1 - x0;
    const dz = z1 - z0;
    const len = Math.hypot(dx, dz);
    if (len < 0.05) continue;
    const ang = Math.atan2(dz, dx);
    const cx = (x0 + x1) / 2;
    const cz = (z0 + z1) / 2;

    for (const yy of style === 'steel' ? [height, height * 0.52] : [height]) {
      const geo = cylinder(0.022, 0.022, len, 10);
      rotatedZ(geo, Math.PI / 2);
      rotatedY(geo, -ang);
      translated(geo, cx, y + yy, cz);
      parts.push({ geo, mat: railMat, uvScale: 8 });
    }
    if (style === 'glass') {
      const panel = box(len - 0.12, height - 0.16, 0.012, { bevel: 0.002 });
      rotatedY(panel, -ang);
      translated(panel, cx, y + height * 0.52, cz);
      g.add(meshOf(panel, Mat.clearGlass({ opacity: 0.14 }), { name: 'rail-glass', cast: false }));
    }
    // posts
    const n = Math.max(1, Math.round(len / 1.3));
    for (let p = 0; p <= n; p++) {
      const t = p / n;
      const px = x0 + dx * t;
      const pz = z0 + dz * t;
      const post = box(0.045, height, 0.045, { bevel: 0.005 });
      post.translate(px, y + height / 2, pz);
      parts.push({ geo: post, mat: postMat, uvScale: 6 });
      const base = box(0.09, 0.012, 0.09, { bevel: 0.003 });
      base.translate(px, y + 0.006, pz);
      parts.push({ geo: base, mat: postMat, uvScale: 8 });
    }
  }
  if (parts.length) g.add(buildMesh(parts, 'railing'));
  return g;
}

/** Wall-mounted handrail for the enclosed stair. */
export function wallHandrail(
  x0: number, z0: number, x1: number, z1: number, y0: number, y1: number,
): THREE.Mesh {
  const len = Math.hypot(x1 - x0, z1 - z0, y1 - y0);
  const geo = cylinder(0.024, 0.024, len, 10);
  const dir = new THREE.Vector3(x1 - x0, y1 - y0, z1 - z0).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  geo.applyQuaternion(q);
  geo.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  return meshOf(geo, Mat.stainless({ seed: 547 }), { uvScale: 6, name: 'handrail' });
}

// ---------------------------------------------------------------------------
// Structure and services
// ---------------------------------------------------------------------------

export function column(x: number, z: number, y0: number, y1: number, size: number, service = false): THREE.Group {
  const g = new THREE.Group();
  const parts: Part[] = [];
  const h = y1 - y0;
  const mat = service
    ? Mat.concrete({ color: 0x8b8e90, seed: 551, wear: 0.5 })
    : Mat.drywall({ color: Palette.wall.warmWhite, seed: 553, wear: 0.4 });
  const shaft = box(size, h - 0.16, size, { bevel: 0.012, segments: 2 });
  shaft.translate(x, y0 + 0.08 + (h - 0.16) / 2, z);
  parts.push({ geo: shaft, mat, uvScale: 1.2 });
  // base and cap
  const base = box(size + 0.06, 0.08, size + 0.06, { bevel: 0.006 });
  base.translate(x, y0 + 0.04, z);
  parts.push({ geo: base, mat: Mat.solid(Palette.trim.baseboard, 0.6, 0), uvScale: 3 });
  const cap = box(size + 0.05, 0.08, size + 0.05, { bevel: 0.006 });
  cap.translate(x, y1 - 0.04, z);
  parts.push({ geo: cap, mat, uvScale: 3 });
  // corner guards on service columns
  if (service) {
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as [number, number][]) {
      const guard = box(0.05, 1.1, 0.05, { bevel: 0.008 });
      guard.translate(x + sx * size / 2, y0 + 0.6, z + sz * size / 2);
      parts.push({ geo: guard, mat: Mat.paintedMetal({ color: 0xc9a12b, seed: 557, wear: 0.6 }), uvScale: 5 });
    }
  }
  g.add(buildMesh(parts, 'column'));
  return g;
}

/** Rectangular HVAC duct run. */
export function duct(
  from: THREE.Vector3, to: THREE.Vector3, w = 0.5, h = 0.35,
): THREE.Group {
  const g = new THREE.Group();
  const parts: Part[] = [];
  const mat = Mat.aluminium({ seed: 561 });
  const d = new THREE.Vector3().subVectors(to, from);
  const len = d.length();
  const axis = Math.abs(d.x) > Math.abs(d.z) ? 'x' : 'z';
  const body = box(axis === 'x' ? len : w, h, axis === 'x' ? w : len, { bevel: 0.008 });
  body.translate((from.x + to.x) / 2, (from.y + to.y) / 2, (from.z + to.z) / 2);
  parts.push({ geo: body, mat, uvScale: 1.6 });
  // flange joints every 1.2 m
  const n = Math.max(1, Math.floor(len / 1.2));
  for (let i = 1; i < n; i++) {
    const t = i / n;
    const fl = box(axis === 'x' ? 0.03 : w + 0.05, h + 0.05, axis === 'x' ? w + 0.05 : 0.03, { bevel: 0.004 });
    fl.translate(
      from.x + d.x * t, from.y + d.y * t, from.z + d.z * t,
    );
    parts.push({ geo: fl, mat, uvScale: 3 });
  }
  // hanger straps
  for (let i = 0; i <= n; i++) {
    const t = i / Math.max(1, n);
    const hx = from.x + d.x * t;
    const hz = from.z + d.z * t;
    for (const s of [-1, 1]) {
      const rod = cylinder(0.006, 0.006, 0.3, 6);
      rod.translate(
        hx + (axis === 'x' ? 0 : s * (w / 2)),
        from.y + h / 2 + 0.15,
        hz + (axis === 'x' ? s * (w / 2) : 0),
      );
      parts.push({ geo: rod, mat: Mat.paintedMetal({ color: 0x74797d, seed: 563, wear: 0.4 }), uvScale: 10 });
    }
  }
  g.add(buildMesh(parts, 'duct'));
  return g;
}

/** Round duct / pipe run with brackets and valves. */
export function pipeRun(
  from: THREE.Vector3, to: THREE.Vector3, radius = 0.05, color = 0x8d9194, valves = 0,
): THREE.Group {
  const g = new THREE.Group();
  const parts: Part[] = [];
  const mat = Mat.paintedMetal({ color, seed: 571, wear: 0.45 });
  const d = new THREE.Vector3().subVectors(to, from);
  const len = d.length();
  const geo = cylinder(radius, radius, len, 12);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
  geo.applyQuaternion(q);
  geo.translate((from.x + to.x) / 2, (from.y + to.y) / 2, (from.z + to.z) / 2);
  parts.push({ geo, mat, uvScale: 4 });
  const n = Math.max(1, Math.floor(len / 2.0));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const br = box(radius * 2.6, 0.03, radius * 2.6, { bevel: 0.003 });
    br.translate(from.x + d.x * t, from.y + d.y * t + radius + 0.015, from.z + d.z * t);
    parts.push({ geo: br, mat: Mat.paintedMetal({ color: 0x6f7477, seed: 573, wear: 0.4 }), uvScale: 8 });
  }
  for (let i = 0; i < valves; i++) {
    const t = (i + 1) / (valves + 1);
    const hub = cylinder(radius * 1.7, radius * 1.7, 0.09, 10);
    hub.applyQuaternion(q);
    hub.translate(from.x + d.x * t, from.y + d.y * t, from.z + d.z * t);
    parts.push({ geo: hub, mat: Mat.paintedMetal({ color: 0x9a4a3a, seed: 575, wear: 0.4 }), uvScale: 8 });
    const wheel = cylinder(radius * 2.4, radius * 2.4, 0.014, 12);
    wheel.translate(from.x + d.x * t, from.y + d.y * t + radius * 2.2, from.z + d.z * t);
    parts.push({ geo: wheel, mat: Mat.paintedMetal({ color: 0xb03a2e, seed: 577, wear: 0.5 }), uvScale: 8 });
    const stem = cylinder(0.008, 0.008, radius * 2.2, 6);
    stem.translate(from.x + d.x * t, from.y + d.y * t + radius * 1.1, from.z + d.z * t);
    parts.push({ geo: stem, mat: Mat.stainless({ seed: 579 }), uvScale: 10 });
  }
  g.add(buildMesh(parts, 'pipes'));
  return g;
}

/** Cable tray with bundled cables. */
export function cableTray(from: THREE.Vector3, to: THREE.Vector3, width = 0.3): THREE.Group {
  const g = new THREE.Group();
  const parts: Part[] = [];
  const mat = Mat.paintedMetal({ color: 0x8b9195, seed: 581, wear: 0.35 });
  const d = new THREE.Vector3().subVectors(to, from);
  const len = d.length();
  const axis = Math.abs(d.x) > Math.abs(d.z) ? 'x' : 'z';
  // side rails
  for (const s of [-1, 1]) {
    const rail = box(axis === 'x' ? len : 0.014, 0.06, axis === 'x' ? 0.014 : len, { bevel: 0.002 });
    rail.translate(
      (from.x + to.x) / 2 + (axis === 'x' ? 0 : s * width / 2),
      (from.y + to.y) / 2,
      (from.z + to.z) / 2 + (axis === 'x' ? s * width / 2 : 0),
    );
    parts.push({ geo: rail, mat, uvScale: 4 });
  }
  // rungs
  const n = Math.max(2, Math.floor(len / 0.3));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const rung = box(axis === 'x' ? 0.012 : width, 0.008, axis === 'x' ? width : 0.012, { bevel: 0.002 });
    rung.translate(from.x + d.x * t, from.y + d.y * t - 0.026, from.z + d.z * t);
    parts.push({ geo: rung, mat, uvScale: 8 });
  }
  g.add(buildMesh(parts, 'cable-tray'));
  // cable bundles
  const bundleMats = [Mat.softPlastic({ color: 0x1f2226, seed: 583 }), Mat.softPlastic({ color: 0x2b4a6b, seed: 585 })];
  for (let b = 0; b < 2; b++) {
    const off = (b - 0.5) * width * 0.45;
    const a = from.clone();
    const bb = to.clone();
    if (axis === 'x') { a.z += off; bb.z += off; } else { a.x += off; bb.x += off; }
    a.y += 0.01; bb.y += 0.01;
    const geo = cylinder(0.035, 0.035, len, 8);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
    geo.applyQuaternion(q);
    geo.translate((a.x + bb.x) / 2, (a.y + bb.y) / 2, (a.z + bb.z) / 2);
    g.add(meshOf(geo, bundleMats[b], { uvScale: 6, name: 'cable-bundle' }));
  }
  return g;
}

/** Wall or ceiling supply/extract grille. */
export function ventGrille(w = 0.4, h = 0.25): THREE.Mesh {
  const parts: Part[] = [];
  const mat = Mat.paintedMetal({ color: 0xbcc0c3, seed: 591, wear: 0.3 });
  const frame = box(w, h, 0.02, { bevel: 0.004 });
  parts.push({ geo: frame, mat, uvScale: 5 });
  const n = Math.max(3, Math.floor(h / 0.035));
  for (let i = 0; i < n; i++) {
    const y = -h / 2 + (h * (i + 0.5)) / n;
    const blade = box(w - 0.05, 0.014, 0.02, { bevel: 0.002 });
    blade.rotateX(-0.5);
    blade.translate(0, y, 0.012);
    parts.push({ geo: blade, mat, uvScale: 8 });
  }
  return buildMesh(parts, 'vent');
}

export function accessPanel(w = 0.6, h = 0.6): THREE.Mesh {
  const parts: Part[] = [];
  const mat = Mat.paintedMetal({ color: 0xa8acb0, seed: 593, wear: 0.4 });
  const p = box(w, h, 0.016, { bevel: 0.004 });
  parts.push({ geo: p, mat, uvScale: 3 });
  const lip = box(w + 0.03, h + 0.03, 0.008, { bevel: 0.003 });
  lip.translate(0, 0, -0.008);
  parts.push({ geo: lip, mat, uvScale: 3 });
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as [number, number][]) {
    const screw = cylinder(0.008, 0.008, 0.006, 8);
    rotatedX(screw, Math.PI / 2);
    translated(screw, sx * (w / 2 - 0.03), sy * (h / 2 - 0.03), 0.01);
    parts.push({ geo: screw, mat: Mat.stainless({ seed: 595 }), uvScale: 20 });
  }
  return buildMesh(parts, 'access-panel');
}

export function floorDrain(): THREE.Mesh {
  const parts: Part[] = [];
  const mat = Mat.stainless({ seed: 597 });
  const rim = cylinder(0.11, 0.12, 0.014, 16);
  parts.push({ geo: rim, mat, uvScale: 8 });
  const grate = cylinder(0.095, 0.095, 0.008, 16);
  translated(grate, 0, 0.004, 0);
  parts.push({ geo: grate, mat: Mat.paintedMetal({ color: 0x4a4e51, seed: 599, wear: 0.7 }), uvScale: 10 });
  for (let i = 0; i < 5; i++) {
    const slot = box(0.16, 0.01, 0.012, { bevel: 0.002 });
    slot.translate(0, 0.009, -0.05 + i * 0.025);
    parts.push({ geo: slot, mat: Mat.solid(0x111315, 0.9, 0), uvScale: 10 });
  }
  return buildMesh(parts, 'floor-drain');
}

/** Roller shutter; `open` 0..1 raises the curtain. */
export function garageShutter(width: number, height: number, open: number): THREE.Group {
  const g = new THREE.Group();
  g.name = 'shutter';
  const mat = Mat.paintedMetal({ color: Palette.door.shutter, seed: 601, wear: 0.5 });
  const parts: Part[] = [];
  const visible = height * (1 - Math.min(1, Math.max(0, open)));
  const slatH = 0.11;
  const n = Math.max(0, Math.floor(visible / slatH));
  for (let i = 0; i < n; i++) {
    const y = height - visible + slatH * (i + 0.5);
    const slat = box(width, slatH * 0.98, 0.03, { bevel: 0.008, segments: 2 });
    slat.translate(0, y, 0);
    parts.push({ geo: slat, mat, uvScale: 2 });
  }
  // guides and head box are always present
  for (const s of [-1, 1]) {
    const guide = box(0.09, height, 0.1, { bevel: 0.006 });
    guide.translate(s * (width / 2 + 0.045), height / 2, 0);
    parts.push({ geo: guide, mat: Mat.paintedMetal({ color: 0x6d7276, seed: 603, wear: 0.5 }), uvScale: 3 });
  }
  const headBox = box(width + 0.24, 0.34, 0.34, { bevel: 0.01 });
  headBox.translate(0, height + 0.17, 0);
  parts.push({ geo: headBox, mat: Mat.paintedMetal({ color: 0x6d7276, seed: 605, wear: 0.45 }), uvScale: 2.5 });
  if (parts.length) g.add(buildMesh(parts, 'shutter'));
  return g;
}

/** Wall-mounted shutter control station. */
export function shutterControls(): THREE.Group {
  const g = new THREE.Group();
  const parts: Part[] = [];
  const body = box(0.16, 0.24, 0.08, { bevel: 0.008, segments: 2 });
  parts.push({ geo: body, mat: Mat.paintedMetal({ color: 0xc9a12b, seed: 607, wear: 0.35 }), uvScale: 6 });
  const btnUp = cylinder(0.022, 0.022, 0.02, 12);
  rotatedX(btnUp, Math.PI / 2);
  translated(btnUp, 0, 0.06, 0.05);
  parts.push({ geo: btnUp, mat: Mat.hardPlastic({ color: 0x2f7d3f, seed: 609 }), uvScale: 12 });
  const btnDown = cylinder(0.022, 0.022, 0.02, 12);
  rotatedX(btnDown, Math.PI / 2);
  translated(btnDown, 0, -0.005, 0.05);
  parts.push({ geo: btnDown, mat: Mat.hardPlastic({ color: 0x9c2b24, seed: 611 }), uvScale: 12 });
  const stop = cylinder(0.026, 0.026, 0.022, 12);
  rotatedX(stop, Math.PI / 2);
  translated(stop, 0, -0.075, 0.05);
  parts.push({ geo: stop, mat: Mat.hardPlastic({ color: 0xb5241c, seed: 613 }), uvScale: 12 });
  g.add(buildMesh(parts, 'shutter-controls'));
  return g;
}

/** Parapet / roof edge visible from the courtyard. */
export function roofEdge(
  x0: number, z0: number, x1: number, z1: number, y: number, parapet = 0.75,
): THREE.Group {
  const g = new THREE.Group();
  const parts: Part[] = [];
  const mat = Mat.concrete({ color: 0x6c7175, seed: 621, wear: 0.6 });
  const capMat = Mat.paintedMetal({ color: 0x585d61, seed: 623, wear: 0.5 });
  const snowMat = Mat.snow({ seed: 625, trampled: 0 });
  const t = 0.28;
  const edges: [number, number, number, number][] = [
    [x0, z0, x1, z0],
    [x0, z1, x1, z1],
    [x0, z0, x0, z1],
    [x1, z0, x1, z1],
  ];
  for (const [ax, az, bx, bz] of edges) {
    const len = Math.hypot(bx - ax, bz - az);
    const horiz = Math.abs(bx - ax) > Math.abs(bz - az);
    const w = horiz ? len : t;
    const d = horiz ? t : len;
    const geo = box(w, parapet, d, { bevel: 0.01 });
    geo.translate((ax + bx) / 2, y + parapet / 2, (az + bz) / 2);
    parts.push({ geo, mat, uvScale: 0.6 });
    const cap = box(w + 0.08, 0.06, d + 0.08, { bevel: 0.008 });
    cap.translate((ax + bx) / 2, y + parapet + 0.03, (az + bz) / 2);
    parts.push({ geo: cap, mat: capMat, uvScale: 2 });
    const snowCap = box(w + 0.06, 0.05, d + 0.06, { bevel: 0.02, segments: 2 });
    snowCap.translate((ax + bx) / 2, y + parapet + 0.08, (az + bz) / 2);
    parts.push({ geo: snowCap, mat: snowMat, uvScale: 0.5 });
  }
  // Roof deck is a solid slab, not a plane: a single-sided plane casts no shadow, which would
  // let the sun straight through the roof and light the rooms below through the ceiling.
  const deck = plainBox(x1 - x0, 0.34, z1 - z0);
  deck.translate((x0 + x1) / 2, y - 0.15, (z0 + z1) / 2);
  const deckMesh = meshOf(deck, Mat.concrete({ color: 0x6f7478, seed: 627, wear: 0.5 }), {
    uvScale: 0.4, name: 'roof-deck',
  });
  deckMesh.castShadow = true;
  deckMesh.receiveShadow = true;
  g.add(deckMesh);
  const snowLayer = plainBox(x1 - x0 - 0.1, 0.07, z1 - z0 - 0.1);
  snowLayer.translate((x0 + x1) / 2, y + 0.035, (z0 + z1) / 2);
  g.add(meshOf(snowLayer, snowMat, { uvScale: 1 / 5, name: 'roof-snow', cast: false }));
  g.add(buildMesh(parts, 'roof-edge'));
  return g;
}

/** Rooftop plant visible from the courtyard, so the massing reads as a real building. */
export function rooftopUnit(x: number, z: number, y: number, w = 2.2, d = 1.6, h = 1.1): THREE.Group {
  const g = new THREE.Group();
  const parts: Part[] = [];
  const mat = Mat.paintedMetal({ color: 0x9aa0a4, seed: 631, wear: 0.65 });
  const body = box(w, h, d, { bevel: 0.02, segments: 2 });
  body.translate(x, y + h / 2, z);
  parts.push({ geo: body, mat, uvScale: 1 });
  const lid = box(w + 0.08, 0.06, d + 0.08, { bevel: 0.01 });
  lid.translate(x, y + h + 0.03, z);
  parts.push({ geo: lid, mat: Mat.snow({ seed: 633, trampled: 0 }), uvScale: 1 });
  const fan = cylinder(Math.min(w, d) * 0.28, Math.min(w, d) * 0.28, 0.16, 14);
  fan.translate(x + w * 0.24, y + h + 0.08, z);
  parts.push({ geo: fan, mat, uvScale: 3 });
  const louvre = box(0.03, h * 0.55, d * 0.7, { bevel: 0.004 });
  louvre.translate(x - w / 2 - 0.01, y + h * 0.5, z);
  parts.push({ geo: louvre, mat: Mat.paintedMetal({ color: 0x71767a, seed: 635, wear: 0.6 }), uvScale: 4 });
  g.add(buildMesh(parts, 'rooftop-unit'));
  return g;
}

export { plainBox, tube, lathe };
