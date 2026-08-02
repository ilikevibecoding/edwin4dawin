import * as THREE from 'three';
import { BrickBuilder, PLATE, P, B } from '../lego/brick.js';
import { C, FINISH } from '../lego/palette.js';
import { num, bool, hash2i, q, GREY_PANEL, greebleRect, practical } from './common.js';

/*
 * The trench run.
 *
 * A canyon of battle-station wall running along Z: 40 studs wide, 30 deep,
 * 600 long by default. The camera flies down it toward -Z, so everything is
 * authored in segments of `SEG` studs that butt together without a seam --
 * a scene can loop three of them forever and nobody will notice.
 *
 * Floor at y = 0, walls at x = +/- W/2, and the exhaust port sits in the floor
 * near the far (-Z) end as `group.userData.exhaustPort`.
 */

export const SEG = 60;
const WIDTH = 40;
const DEPTH = 30;

// ---------------------------------------------------------------- segment

/**
 * One segment, centred on z = 0, spanning [-SEG/2, SEG/2].
 *
 * `index` seeds the greebles: pass the same index twice and you get the same
 * segment, which is exactly what a looping scene wants.
 */
export function trenchSegment(bb, {
  index = 0, width = WIDTH, depth = DEPTH, len = SEG, seed = 4477,
  braces = true, lights = true, z0 = 0,
} = {}) {
  const hw = width / 2;
  const s = seed + index * 7919;
  const z0m = z0 - len / 2, z1m = z0 + len / 2;

  // ------------------------------------------------------------- floor
  // Dark plating with a lighter service strip down the middle, so the eye has
  // a vanishing line to follow.
  bb.brick(0, -B(1), z0, width, len, { h: B(1), color: C.darkBluishGray, free: true, studs: false });
  const tiles = Math.round(len / 5);
  for (let k = 0; k < tiles; k++) {
    const z = z0m + (k + 0.5) * (len / tiles);
    const h = hash2i(index, k, s + 3);
    bb.brick(0, -PLATE, z, width - 0.4, len / tiles - 0.4, {
      h: PLATE, color: h < 0.3 ? C.darkGray : (h < 0.8 ? C.darkBluishGray : C.black),
      free: true, studs: false,
    });
    if (h > 0.62) {
      bb.brick((h - 0.5) * width * 0.7, 0, z, q(3 + h * 4, 0.1), q(len / tiles * 0.5, 0.1), {
        h: P(1), color: C.darkGray, free: true, studs: false,
      });
    }
  }
  bb.brick(0, 0, z0, 3.2, len - 0.4, { h: P(1), color: C.darkBluishGray, free: true, studs: false });
  for (let k = 0; k < tiles; k += 2) {
    bb.brick(0, P(1), z0m + (k + 0.5) * (len / tiles), 1.2, 2.4, {
      h: P(0.5), color: C.darkGray, free: true, studs: false,
    });
  }

  // ------------------------------------------------------------- walls
  for (const side of [-1, 1]) {
    const x = side * hw;
    // Wall slab, 2 studs thick, sitting outside the clear width.
    bb.brick(x + side * 1, 0, z0, 2, len, { h: depth, color: C.lightBluishGray, free: true, studs: false });

    // A skirt of darker plating at the bottom and a capping lip at the top.
    bb.brick(x - side * 0.6, 0, z0, 1.2, len, { h: B(2), color: C.darkBluishGray, free: true, studs: false });
    bb.brick(x - side * 1.1, depth - B(2), z0, 2.2, len, { h: B(2), color: C.darkBluishGray, free: true, studs: false });
    bb.brick(x + side * 2.5, depth, z0, 5, len, { h: P(2), color: C.lightBluishGray, free: true, studs: false });

    // Heavy greebling over the clear face.
    greebleRect(bb, {
      axis: 'x', at: x, dir: -side,
      u0: z0m + 0.5, u1: z1m - 0.5, v0: B(2), v1: depth - B(2),
      cell: 7, seed: s + (side > 0 ? 101 : 907),
      colors: GREY_PANEL, dMin: 0.3, dMax: 1.9, fill: 0.93, sub: 0.55, pipes: 0.16,
    });

    // Long horizontal service ducts: three per segment, full length, which is
    // what actually sells the speed when the camera runs down the trench.
    for (let k = 0; k < 3; k++) {
      const y = B(3) + k * (depth - B(6)) / 2.6 + hash2i(index, k, s + 55) * 1.2;
      const t = 0.5 + hash2i(index, k, s + 66) * 0.7;
      bb.brick(x - side * (0.9 + t / 2), y, z0, t + 0.9, len, {
        h: t, color: k % 2 ? C.darkBluishGray : C.flatSilver, free: true, studs: false,
      });
    }

    // Vertical ribs, evenly spaced, giving the parallax something to chew on.
    const ribs = Math.round(len / 10);
    for (let k = 0; k < ribs; k++) {
      const z = z0m + (k + 0.5) * (len / ribs);
      bb.brick(x - side * 1.1, B(2), z, 2.2, 1.6, {
        h: depth - B(4), color: C.darkBluishGray, free: true, studs: false,
      });
      bb.brick(x - side * 2.0, B(2), z, 1.4, 2.6, {
        h: P(2), color: C.lightBluishGray, free: true, studs: false,
      });
    }

    // Gun emplacements: a recessed box with a red glow and a stubby barrel.
    if (lights) {
      const guns = 2;
      for (let k = 0; k < guns; k++) {
        const z = z0m + (k + 0.5) * (len / guns) + hash2i(index, k, s + 77) * 6 - 3;
        const y = depth * (0.45 + hash2i(index, k, s + 88) * 0.3);
        bb.brick(x - side * 1.6, y - 1.6, z, 3.2, 5.2, { h: 3.2, color: C.darkBluishGray, free: true, studs: false });
        bb.brick(x - side * 2.9, y - 1.3, z, 1.0, 4.0, { h: 2.6, color: C.darkGray, free: true, studs: false });
        // Small round lens rather than a slab: a big flat GLOW rectangle just
        // reads as a red sticker once bloom gets hold of it.
        bb.cyl(x - side * 3.5, y, z - 1.0, 0.42, 0.3, {
          color: C.transRed, finish: FINISH.GLOW, axis: 'x', seg: 8, stud: false,
        });
        bb.cyl(x - side * 3.5, y, z + 1.0, 0.42, 0.3, {
          color: C.transRed, finish: FINISH.GLOW, axis: 'x', seg: 8, stud: false,
        });
        bb.cyl(x - side * 3.9, y, z, 0.32, 2.6, {
          color: C.darkGray, axis: 'x', seg: 8, finish: FINISH.METAL, stud: false,
        });
      }
    }
  }

  // ------------------------------------------------------- cross-braces
  if (braces) {
    const n = 2;
    for (let k = 0; k < n; k++) {
      const z = z0m + (k + 0.35) * (len / n);
      const y = depth - B(4) - hash2i(index, k, s + 99) * 4;
      bb.brick(0, y, z, width - 1.5, 2.4, { h: B(1.6), color: C.lightBluishGray, free: true, studs: false });
      bb.brick(0, y - P(1.5), z, width - 1.5, 1.2, { h: P(1.5), color: C.darkBluishGray, free: true, studs: false });
      // Gusset plates where the brace meets the wall.
      for (const side of [-1, 1]) {
        bb.slope(side * (hw - 5), y - B(1.4), z, 6, 2.2, {
          h: B(1.4), color: C.darkBluishGray, rot: side > 0 ? 0 : Math.PI, free: true,
        });
      }
      // Hanging strut lamps.
      for (const lx of [-6, 6]) {
        bb.brick(lx, y - P(2), z, 1.6, 1.6, { h: P(2), color: C.darkGray, free: true, studs: false });
        bb.cyl(lx, y - P(2.2), z, 0.45, P(0.6), { color: C.transNeonOrange, finish: FINISH.GLOW, seg: 8, stud: false });
      }
    }
  }
  return bb;
}

// ---------------------------------------------------------- exhaust port

/** Thermal exhaust port: a ringed shaft in the floor with a target circle. */
function exhaustPort(bb, x, z, r = 3.2) {
  // Recessed collar built from a ring of small plates -- a real brick build
  // would fan tiles round a circle exactly like this.
  const seg = 20;
  for (let k = 0; k < seg; k++) {
    const a = (k / seg) * Math.PI * 2;
    const ca = Math.cos(a), sa = Math.sin(a);
    bb.brick(x + ca * (r + 1.2), P(1), z + sa * (r + 1.2), 1.9, 1.3, {
      h: P(2), color: k % 2 ? C.darkBluishGray : C.lightBluishGray, rot: -a, free: true, studs: false,
    });
    bb.brick(x + ca * (r + 2.6), 0, z + sa * (r + 2.6), 1.7, 1.5, {
      h: P(1), color: k % 3 ? C.darkGray : C.black, rot: -a, free: true, studs: false,
    });
  }
  // The shaft itself: black, with a faint glow way down so it reads as a hole.
  bb.cyl(x, -B(6), z, r, B(6), { color: C.black, seg: 20, stud: false });
  bb.cyl(x, -B(6) + 0.1, z, r * 0.75, 0.2, { color: C.transRed, finish: FINISH.GLOW, seg: 16, stud: false });
  // Target ring painted round the mouth.
  for (let k = 0; k < 24; k++) {
    const a = (k / 24) * Math.PI * 2;
    if (k % 6 === 5) continue;
    bb.brick(x + Math.cos(a) * (r + 4.2), P(1), z + Math.sin(a) * (r + 4.2), 1.6, 1.1, {
      h: P(0.5), color: C.transNeonOrange, finish: FINISH.GLOW, rot: -a, free: true, studs: false,
    });
  }
}

// -------------------------------------------------------------- factories

export function buildTrenchSegment(opts = {}) {
  const bb = new BrickBuilder({ studs: false, bevel: false, cullStuds: false, castShadow: false, receiveShadow: false });
  trenchSegment(bb, {
    index: Math.round(num(opts, 'index', 0)),
    width: num(opts, 'width', WIDTH),
    depth: num(opts, 'depth', DEPTH),
    len: num(opts, 'len', SEG),
    seed: Math.round(num(opts, 'seed', 4477)),
  });
  const g = bb.build();
  g.name = 'trench_segment';
  g.userData.nodes = bb.nodes;
  return g;
}

export function buildTrench(opts = {}) {
  const length = num(opts, 'length', 600);
  const width = num(opts, 'width', WIDTH);
  const depth = num(opts, 'depth', DEPTH);
  const seed = Math.round(num(opts, 'seed', 4477));
  const segLen = num(opts, 'seg', SEG);
  const n = Math.max(1, Math.round(length / segLen));
  const total = n * segLen;

  // 600 studs is far outside any shadow camera the rigs set up, so a shadow
  // pass here buys nothing and costs a second draw of every triangle.
  const bb = new BrickBuilder({ studs: false, bevel: false, cullStuds: false, castShadow: false, receiveShadow: false });

  // Segments run from +Z (near, behind camera) to -Z (far).
  for (let k = 0; k < n; k++) {
    const z = total / 2 - (k + 0.5) * segLen;
    trenchSegment(bb, { index: k, width, depth, len: segLen, seed, z0: z });
  }

  // Exhaust port, a segment and a half from the far end.
  const portZ = -total / 2 + segLen * 1.5;
  exhaustPort(bb, 0, portZ);

  const g = bb.build();
  g.name = 'trench';
  g.userData.nodes = bb.nodes;

  const port = new THREE.Object3D();
  port.position.set(0, 0, portZ);
  g.add(port);
  g.userData.nodes.exhaustPort = port;
  g.userData.exhaustPort = port;
  g.userData.length = total;
  g.userData.width = width;
  g.userData.depth = depth;
  g.userData.segmentLength = segLen;

  if (bool(opts, 'lights', true)) {
    // The set carries its own sun. Point lights are useless over 600 studs and
    // the `dark` rig leaves a canyon this deep essentially black, so a raking
    // directional lights one wall and leaves the other in shadow -- which is
    // the shot. Turn it off with lights=0 if a scene brings its own.
    const sun = new THREE.DirectionalLight(new THREE.Color(0xdbe6ff).convertSRGBToLinear(), 1.35);
    sun.position.set(-70, 90, 40);
    sun.target.position.set(0, 0, 0);
    sun.castShadow = false;
    g.add(sun, sun.target);
    g.add(new THREE.HemisphereLight(
      new THREE.Color(0x7f93bb).convertSRGBToLinear(),
      new THREE.Color(0x141a26).convertSRGBToLinear(), 0.55,
    ));
    // A red wash coming up out of the port so the far end has a focus.
    practical(g, 0, 4, portZ, 0xff5530, 90, 46);
  }
  return g;
}
