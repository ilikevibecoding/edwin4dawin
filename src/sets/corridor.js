import * as THREE from 'three';
import { BrickBuilder, PLATE, BRICK, P, B } from '../lego/brick.js';
import { C, FINISH } from '../lego/palette.js';
import { num, bool, clamp, hash2i, practical } from './common.js';

/*
 * Rebel corvette hallway -- the boarding scene.
 *
 * Runs along Z: the near threshold is at z = 0 and the far blast door closes
 * the corridor at z = -len. The camera lives on the centreline looking at -Z,
 * so everything is built to repeat on a strict rhythm: wall ribs every 2.5
 * studs, ceiling ribs every 5, floor grating every 1. Under perspective those
 * three frequencies are what make the hallway read as deep.
 *
 * Interior clear: 9 studs wide, 10.2 tall, floor surface at y = 0.4.
 */

export const CORRIDOR = {
  halfW: 4.5,        // interior half width
  wallT: 1.2,        // wall thickness
  floorTop: 0.4,
  ceilY: 10.6,       // underside of the ceiling slab
  ceilT: 0.8,
  section: 15,       // module length along Z
};

const { halfW, wallT, floorTop, ceilY, ceilT } = CORRIDOR;
const wallMid = halfW + wallT / 2;   // 5.1
const wallOut = halfW + wallT;       // 5.7

// ---------------------------------------------------------------- module

/** One repeatable corridor module, centred on zc. */
export function corridorSection(bb, zc, len = CORRIDOR.section, idx = 0) {
  const half = len / 2;
  const F = { free: true, studs: false };

  // ------------------------------------------------------------- floor
  bb.brick(0, 0, zc, wallOut * 2, len, { h: floorTop, color: C.darkBluishGray, ...F });
  // Recessed black tray the grating sits in.
  bb.brick(0, floorTop, zc, 5.4, len, { h: 0.12, color: C.trueBlack, ...F });
  // Grating slats, one per stud -- the fastest-repeating rhythm in frame.
  for (let i = 0; i < Math.round(len); i++) {
    bb.tile(0, floorTop + 0.12, zc - half + 0.5 + i, 5.2, 0.6, {
      h: 0.16, color: C.darkGray, ...F,
    });
  }
  // Grating rails, then a plated walkway either side. The walkway keeps its
  // studs: it is the one surface close enough to the lens to read as LEGO.
  for (const s of [-1, 1]) {
    bb.brick(s * 2.65, floorTop, zc, 0.5, len, { h: 0.3, color: C.darkGray, ...F });
    for (let k = 0; k < Math.round(len / 3); k++) {
      const zk = zc - half + (k + 0.5) * 3;
      bb.plate(s * 3.5, floorTop, zk, 2, 3, {
        color: hash2i(k, s, 733) < 0.25 ? C.lightBluishGray : C.veryLightGray, free: true,
      });
    }
  }

  // -------------------------------------------------------------- walls
  // Individual bricks rather than one long slab: the vertical seams are what
  // make a wall read as a LEGO wall, and they reinforce the perspective.
  const course = (b, y0, h, nb, colors, seed) => {
    for (let k = 0; k < nb; k++) {
      const zk = zc - half + (k + 0.5) * (len / nb);
      b.brick(wallMid, y0, zk, wallT, len / nb, {
        h, color: colors[Math.floor(hash2i(k, Math.round(y0 * 10), seed) * colors.length)], ...F,
      });
    }
  };
  const WALL = [C.white, C.white, C.veryLightGray, C.white, C.veryLightGray];

  bb.mirrorX((b) => {
    // Skirting, main courses, and the set-back panel band between them.
    b.brick(wallMid, floorTop, zc, wallT, len, { h: 0.8, color: C.darkBluishGray, ...F });
    course(b, 1.2, 1.2, 5, WALL, 21);
    course(b, 2.4, 1.2, 6, WALL, 47);
    b.brick(wallMid + 0.3, 3.6, zc, wallT - 0.6, len, { h: 3.0, color: C.lightBluishGray, ...F });
    course(b, 6.6, 0.8, 6, WALL, 83);
    course(b, 7.4, 0.8, 5, WALL, 119);

    // Ribs standing proud of the recessed band -- the mid-frequency beat.
    const ribs = Math.round(len / 2.5);
    for (let k = 0; k < ribs; k++) {
      const zr = zc - half + len / ribs * (k + 0.5);
      b.brick(halfW + 0.35, 3.6, zr, 0.7, 0.9, { h: 3.0, color: C.white, ...F });
      b.brick(halfW + 0.25, 3.4, zr, 0.5, 1.3, { h: 0.24, color: C.veryLightGray, ...F });
      b.brick(halfW + 0.25, 6.6, zr, 0.5, 1.3, { h: 0.24, color: C.veryLightGray, ...F });
    }

    // Recessed lighting slot: cowl lips top and bottom, glow strip set back.
    b.tile(halfW + 0.75, 8.0, zc, 1.5, len, { h: 0.2, color: C.white, ...F });
    b.brick(wallMid + 0.3, 8.2, zc, wallT - 0.6, len, { h: 0.8, color: C.veryLightGray, ...F });
    // Held just above the 1.3 bloom threshold. These strips run the entire
    // 120 studs of hallway and converge on the vanishing point, so at full
    // GLOW strength they smear into two bars of white across the frame.
    b.brick(halfW + 0.5, 8.35, zc, 0.35, len - 0.5, {
      h: 0.5, color: C.transLightBlue, finish: FINISH.GLOW, ...F,
      matOpts: { intensity: 1.35 },
    });
    b.tile(halfW + 0.75, 9.0, zc, 1.5, len, { h: 0.3, color: C.white, ...F });
    b.brick(wallMid, 9.3, zc, wallT, len, { h: ceilY - 9.3, color: C.white, ...F });

    // Pipe run along the skirting.
    b.cyl(halfW - 0.35, 1.75, zc, 0.32, len, {
      axis: 'z', color: C.flatSilver, finish: FINISH.METAL, stud: false,
    });
    b.cyl(halfW - 0.32, 2.55, zc, 0.24, len, {
      axis: 'z', color: C.darkBluishGray, stud: false,
    });
    const brackets = Math.round(len / 5);
    for (let k = 0; k < brackets; k++) {
      const zb = zc - half + len / brackets * (k + 0.5);
      b.brick(halfW + 0.05, 1.3, zb, 0.9, 0.7, { h: 1.7, color: C.darkBluishGray, ...F });
    }
  });

  // ------------------------------------------------------------ ceiling
  bb.brick(0, ceilY, zc, wallOut * 2, len, { h: ceilT, color: C.white, ...F });
  const cribs = Math.round(len / 5);
  for (let k = 0; k < cribs; k++) {
    const zr = zc - half + len / cribs * (k + 0.5);
      bb.brick(0, ceilY - 0.34, zr, halfW * 2, 0.9, { h: 0.34, color: C.lightBluishGray, ...F });
    bb.brick(0, ceilY - 0.5, zr, 1.6, 0.7, { h: 0.16, color: C.darkBluishGray, ...F });
    // Ceiling light panels either side of each rib. Emissive rather than
    // FINISH.GLOW: unlit additive panels this large wash the whole frame cyan.
    for (const s of [-1, 1]) {
      bb.brick(s * 2.2, ceilY - 0.18, zr + 2.5, 1.3, 2.6, {
        h: 0.18, color: C.white, ...F,
        matOpts: { emissive: 0xbcdcf4, emissiveIntensity: 0.52, roughness: 0.5 },
      });
    }
  }
  bb.cyl(0, ceilY - 0.75, zc, 0.42, len, { axis: 'z', color: C.lightBluishGray, stud: false });

  // ----------------------------------------------------------- greebles
  // Asymmetric kit so the two walls never look like mirror images.
  const s = idx % 2 === 0 ? 1 : -1;
  const h = hash2i(idx, 3, 6101);
  bb.brick(s * (halfW + 0.3), 4.0, zc - 2.5, 0.6, 2.6, { h: 2.2, color: C.lightBluishGray, ...F });
  bb.brick(s * (halfW + 0.15), 4.4, zc - 2.5, 0.3, 1.8, { h: 1.0, color: C.black, ...F });
  for (let k = 0; k < 4; k++) {
    bb.brick(s * (halfW + 0.12), 4.6 - (k % 2) * 0.45, zc - 3.2 + k * 0.45, 0.24, 0.3, {
      h: 0.3, ...F,
      color: [C.transRed, C.transGreen, C.transYellow, C.transLightBlue][(k + idx) % 4],
      // Just under the bloom threshold: these are indicator lamps, and a pass
      // close to the wall used to wash the whole shot in one of their colours.
      finish: FINISH.GLOW, matOpts: { intensity: 1.15 },
    });
  }
  if (h < 0.5) {
    // Wall locker.
    bb.brick(-s * (halfW + 0.35), 1.2, zc + 3.5, 0.7, 3.2, { h: 3.4, color: C.veryLightGray, ...F });
    bb.brick(-s * (halfW + 0.1), 2.2, zc + 3.5, 0.2, 2.6, { h: 0.24, color: C.darkBluishGray, ...F });
  } else {
    // Bundled conduit climbing the wall.
    for (let k = 0; k < 3; k++) {
      bb.cyl(-s * (halfW + 0.25), 1.2, zc + 3.2 + k * 0.55, 0.22, 7.2, {
        color: k === 1 ? C.darkBluishGray : C.flatSilver,
        finish: k === 1 ? FINISH.SOLID : FINISH.METAL, stud: false,
      });
    }
  }
  return bb;
}

// ------------------------------------------------------------- fittings

/** Structural bulkhead ring that a blast door sits inside. */
function doorFrame(bb, zf) {
  const F = { free: true, studs: false };
  // The piers are deliberately fat: they are the pockets the leaves retract
  // into, so an open door does not leave slabs floating outside the hull.
  bb.mirrorX((b) => {
    b.brick(5.75, floorTop, zf, 3.3, 1.4, { h: 9.2, color: C.darkBluishGray, ...F });
    b.brick(4.35, floorTop, zf, 0.5, 1.9, { h: 9.2, color: C.darkGray, ...F });
    for (let k = 0; k < 5; k++) {
      b.brick(5.9, 1.2 + k * 1.9, zf, 3.0, 0.6, { h: 0.5, color: C.lightBluishGray, ...F });
    }
  });
  bb.brick(0, 9.6, zf, 14.8, 1.4, { h: 1.0, color: C.darkBluishGray, ...F });
  bb.brick(0, 9.4, zf, 8.2, 1.9, { h: 0.4, color: C.darkGray, ...F });
  bb.brick(0, floorTop, zf, 8.2, 1.9, { h: 0.22, color: C.darkGray, ...F });
}

/** One sliding leaf. Origin at the bottom of the meeting edge. */
function doorLeaf(w, h, mirror) {
  const bb = new BrickBuilder({ studs: false, bevel: true, cullStuds: false });
  const s = mirror ? -1 : 1;
  const F = { free: true, studs: false };
  bb.brick(s * w / 2, 0, 0, w, 0.72, { h, color: C.lightBluishGray, ...F });
  // Raised ribs on the face the camera sees.
  for (let k = 0; k < 7; k++) {
    bb.brick(s * w / 2, 0.5 + k * 1.24, 0.44, w - 0.5, 0.24, {
      h: 0.75, color: C.veryLightGray, ...F,
    });
  }
  // Meeting edge and its interlock teeth.
  bb.brick(s * 0.22, 0, 0.1, 0.44, 0.95, { h, color: C.darkBluishGray, ...F });
  for (let k = 0; k < 5; k++) {
    bb.brick(s * 0.7, 0.9 + k * 1.8, 0.1, 0.9, 0.95, { h: 0.9, color: C.darkBluishGray, ...F });
  }
  // Hazard chevrons across the bottom.
  for (let k = 0; k < 6; k++) {
    bb.brick(s * (0.75 + k * 0.62), 0.35, 0.46, 0.42, 0.2, {
      h: 0.9, color: k % 2 ? C.black : C.yellow, ...F,
    });
  }
  bb.brick(s * w / 2, h - 0.5, 0.44, w - 0.5, 0.28, { h: 0.4, color: C.darkBluishGray, ...F });
  const g = bb.build();
  g.name = mirror ? 'leafL' : 'leafR';
  return g;
}

// ------------------------------------------------------------- factories

export function buildCorridorSection(opts = {}) {
  const len = num(opts, 'len', CORRIDOR.section);
  const bb = new BrickBuilder({ studs: bool(opts, 'studs', true), bevel: true, studSeg: 8 });
  corridorSection(bb, 0, len, 0);
  const g = bb.build();
  g.userData.nodes = bb.nodes;
  g.userData.length = len;
  if (bool(opts, 'light', true)) practical(g, 0, 8.6, 0, 0xdfeaff, 55, 34);
  return g;
}

export function buildCorridor(opts = {}) {
  const count = Math.round(num(opts, 'sections', 8));
  const len = num(opts, 'len', CORRIDOR.section);
  const total = count * len;

  const bb = new BrickBuilder({
    studs: bool(opts, 'studs', true), bevel: bool(opts, 'bevel', false), studSeg: 8,
  });
  for (let i = 0; i < count; i++) corridorSection(bb, -(i + 0.5) * len, len, i);

  const zFar = -total + 0.9;
  const zNear = -0.9;
  doorFrame(bb, zFar);
  doorFrame(bb, zNear);

  // Blank bulkhead around the far door, and a lit compartment behind it so
  // opening the door reveals somewhere to walk into.
  const F = { free: true, studs: false };
  bb.brick(0, 0, zFar - 2.6, 14.8, 1.2, { h: 11.4, color: C.darkBluishGray, ...F });
  bb.brick(0, 0, zFar - 8, 9.0, 0.6, { h: 10.4, color: C.darkGray, ...F });
  bb.brick(0, 0, zFar - 7.4, 9.0, 10.6, { h: 0.4, color: C.darkGray, ...F });
  bb.brick(0, 7.6, zFar - 7.7, 7.0, 0.4, { h: 0.6, color: C.transLightBlue, finish: FINISH.GLOW, ...F });

  const group = new THREE.Group();
  group.name = 'corridor';
  group.add(bb.build());

  // ------------------------------------------------------------- doors
  const leafW = 4.1;
  const leafH = 9.2;
  const makeDoor = (z) => {
    const o = new THREE.Object3D();
    o.position.set(0, floorTop, z);
    const r = doorLeaf(leafW, leafH, false);
    const l = doorLeaf(leafW, leafH, true);
    o.add(r, l);
    o.userData.leaves = { r, l };
    return o;
  };

  const doorFar = makeDoor(zFar);
  doorFar.name = 'doorFar';
  const doorNear = makeDoor(zNear);
  doorNear.name = 'doorNear';
  group.add(doorFar, doorNear);

  const slide = (door, v) => {
    const t = clamp(v, 0, 1) * (leafW * 0.8);
    door.userData.leaves.r.position.x = t;
    door.userData.leaves.l.position.x = -t;
  };

  // ------------------------------------------------------------ lights
  // Point lights are the single most expensive thing in a software render, so
  // the hallway gets four spread down its length rather than one per module.
  if (bool(opts, 'light', true)) {
    const nl = Math.max(1, Math.round(num(opts, 'lights', 4)));
    for (let i = 0; i < nl; i++) {
      practical(group, 0, 8.4, -total * (i + 0.5) / nl, 0xdfeaff, 62, 62);
    }
    // Something to walk into when the far door opens.
    practical(group, 0, 5.0, zFar - 6.0, 0x86c8ff, 26, 22);
  }

  let farV = clamp(num(opts, 'door', 0), 0, 1);
  let nearV = clamp(num(opts, 'doornear', 1), 0, 1);
  slide(doorFar, farV);
  slide(doorNear, nearV);

  group.userData.nodes = { ...bb.nodes, doorFar, doorNear };
  group.userData.length = total;
  group.userData.setDoor = (v) => { farV = clamp(+v || 0, 0, 1); slide(doorFar, farV); };
  group.userData.setDoorNear = (v) => { nearV = clamp(+v || 0, 0, 1); slide(doorNear, nearV); };

  /**
   * Stormtrooper entrance: the near leaves come off their rails and tumble
   * into the corridor. a = 0 puts them back.
   */
  group.userData.blowDoor = (a = 1) => {
    const k = clamp(+a || 0, 0, 1);
    const { r, l } = doorNear.userData.leaves;
    r.position.set(1.1 * k, 0.4 * k, 3.2 * k);
    r.rotation.set(-0.5 * k, 0.35 * k, -0.9 * k);
    l.position.set(-1.4 * k, 0.2 * k, 4.6 * k);
    l.rotation.set(-0.8 * k, -0.4 * k, 1.1 * k);
  };

  return group;
}
