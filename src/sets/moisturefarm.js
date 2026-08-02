import * as THREE from 'three';
import { BrickBuilder, PLATE, BRICK, P, B } from '../lego/brick.js';
import { C, FINISH } from '../lego/palette.js';
import { RNG } from '../engine/rng.js';
import { num, bool, clamp, smoothstep, hash2i } from './common.js';
import { duneField, rockOutcrop } from './dunes.js';

/*
 * The homestead.
 *
 * A sunken circular courtyard cut into a small dune plot, a domed entry hut
 * over the stair, and a ring of vaporators. Sits on its own patch of terrain
 * (flattened around the pit) so a scene can drop the whole thing into a wider
 * desert without any blending work.
 *
 * Courtyard floor is well below y = 0; the surrounding sand is at roughly
 * y = 0 so the plot still behaves like a ground-based set.
 */

const RIM_R = 26;      // outer lip of the pit
const PIT_R = 19;      // clear radius at the courtyard floor
const PIT_D = 13;      // how far down the courtyard sits

/** Ring of bricks laid round a circle, each yawed to face outward. */
function ring(bb, cx, cz, y, r, h, thick, seg, colorFn, opts = {}) {
  for (let k = 0; k < seg; k++) {
    const a = (k / seg) * Math.PI * 2 + (opts.phase ?? 0);
    const w = (2 * Math.PI * r / seg) * 1.12;
    bb.brick(cx + Math.cos(a) * r, y, cz + Math.sin(a) * r, thick, w, {
      h, color: colorFn(k, a), rot: -a, free: true, studs: false,
    });
  }
}

/** Sand-brick wall of the pit: courses of tan/dark tan with staggered joints. */
function pitWall(bb, cx, cz, r, top, bottom) {
  const courses = Math.round((top - bottom) / BRICK);
  for (let c = 0; c < courses; c++) {
    const y = bottom + c * BRICK;
    ring(bb, cx, cz, y, r, BRICK, 2.2, 34, (k) => {
      const t = hash2i(k, c, 3031);
      return t < 0.18 ? C.darkTan : (t < 0.3 ? C.nougat : C.tan);
    }, { phase: (c % 2) * (Math.PI / 34) });
  }
}

/** Vaporator: thin finned column with a condenser head and a ground pan. */
export function vaporator(bb, x, z, y0, height = 9, rng = null) {
  const r = 0.62;
  bb.cyl(x, y0, z, 2.1, P(2), { color: C.darkTan, seg: 12, stud: false });
  bb.cyl(x, y0 + P(2), z, 1.35, P(2), { color: C.lightBluishGray, seg: 12, stud: false });
  bb.cyl(x, y0 + P(4), z, r, height - P(4), { color: C.flatSilver, finish: FINISH.METAL, seg: 10, stud: false });

  // Cooling fins: four blades running most of the column.
  const finTop = y0 + height - B(1.6);
  const fins = 4;
  for (let k = 0; k < fins; k++) {
    const a = (k / fins) * Math.PI * 2 + 0.4;
    const fr = 1.5;
    bb.brick(x + Math.cos(a) * fr * 0.55, y0 + P(5), z - Math.sin(a) * fr * 0.55, fr, 0.32, {
      h: finTop - y0 - P(6), color: C.lightBluishGray, rot: -a, free: true, studs: false,
    });
  }
  // Collar rings.
  for (let k = 0; k < 3; k++) {
    bb.cyl(x, y0 + P(6) + k * (height - B(3)) / 3, z, r + 0.28, P(1), {
      color: C.darkBluishGray, seg: 10, stud: false,
    });
  }
  // Condenser head: a drum with a dish on top and three antennae.
  bb.cyl(x, finTop, z, 1.15, B(1.4), { color: C.lightBluishGray, seg: 12, stud: false });
  bb.cyl(x, finTop + B(1.4), z, 1.35, P(1), { color: C.darkBluishGray, seg: 12, stud: false });
  bb.sphere(x, finTop + B(1.4) + P(1), z, 1.15, {
    color: C.veryLightGray, dome: true, seg: 12, rings: 5, sy: 0.55,
  });
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2 + 0.9;
    bb.bar(x + Math.cos(a) * 0.7, finTop + B(2.6), z - Math.sin(a) * 0.7, 0.1, B(1.6), {
      color: C.flatSilver, rz: Math.cos(a) * 0.28, rx: Math.sin(a) * 0.28,
    });
  }
  // Drip line to the ground pan.
  if (rng && rng.next() < 0.6) {
    bb.brick(x + 2.4, y0, z, 2.4, 1.6, { h: P(2), color: C.darkTan, free: true, studs: false });
  }
}

/** Domed entry hut: half-sphere of sand brick on a low drum. */
function domedHut(bb, x, z, y0, r, opening = null) {
  const drum = B(3);
  const courses = 3;
  for (let c = 0; c < courses; c++) {
    ring(bb, x, z, y0 + c * BRICK, r, BRICK, 2.0, 26, (k) => {
      const t = hash2i(k, c, 811);
      return t < 0.2 ? C.darkTan : C.tan;
    }, { phase: (c % 2) * (Math.PI / 26) });
  }
  // Dome in stepped rings. Each ring is taller than its rise so the courses
  // overlap: leave a gap and the dome turns into a stack of hoops.
  const rings = 6;
  const domeH = r * 0.85;
  for (let i = 0; i < rings; i++) {
    const t = (i + 0.5) / rings;
    const rr = r * Math.cos(t * Math.PI / 2 * 0.96);
    const y = y0 + drum + Math.sin(t * Math.PI / 2 * 0.96) * domeH;
    ring(bb, x, z, y - domeH / rings, rr, domeH / rings * 2.1, 2.0,
      Math.max(9, Math.round(26 * rr / r)), (k) => {
        const hh = hash2i(k, i, 907);
        return hh < 0.24 ? C.darkTan : C.tan;
      }, { phase: (i % 2) * 0.14 });
  }
  bb.sphere(x, y0 + drum + domeH - P(1), z, r * 0.36, {
    color: C.tan, dome: true, seg: 12, rings: 4, sy: 0.8,
  });

  // Doorway: knock a notch out by capping it with a lintel and jambs.
  if (opening !== null) {
    const a = opening;
    const dx = Math.cos(a), dz = -Math.sin(a);
    bb.brick(x + dx * r, y0, z + dz * r, 2.2, 5.4, {
      h: B(2.6), color: C.darkTan, rot: -a, free: true, studs: false,
    });
    bb.brick(x + dx * (r + 0.4), y0, z + dz * (r + 0.4), 1.6, 3.4, {
      h: B(2.2), color: C.black, rot: -a, free: true, studs: false,
    });
  }
}

export function buildMoistureFarm(opts = {}) {
  const plot = num(opts, 'size', 130);
  const seed = Math.round(num(opts, 'seed', 3311));
  const rng = new RNG(seed);

  const bb = new BrickBuilder({ studs: false, bevel: false, cullStuds: false });

  // ---------------------------------------------------------- terrain
  // Flatten a shelf around the pit so the buildings have something to sit on,
  // then let the dunes take over past the yard.
  const flatten = (x, z, hh) => {
    const d = Math.hypot(x, z);
    if (d < RIM_R + 6) return B(1);
    const t = smoothstep(RIM_R + 6, RIM_R + 34, d);
    return B(1) * (1 - t) + hh * t;
  };
  duneField(bb, {
    size: plot, cell: 4, seed: seed + 17, amp: 11, flatten, taper: 0.24,
  });

  // Blank out the pit: cut a hole by laying the courtyard floor deep and
  // walling the shaft. (The dune cells inside the rim are already flat, so
  // the pit simply replaces them.)
  const floorY = -PIT_D;
  const cell = 3;
  const nn = Math.ceil((PIT_R * 2) / cell);
  for (let j = 0; j < nn; j++) {
    for (let i = 0; i < nn; i++) {
      const x = -PIT_R + (i + 0.5) * cell;
      const z = -PIT_R + (j + 0.5) * cell;
      if (Math.hypot(x, z) > PIT_R - 0.6) continue;
      const t = hash2i(i, j, seed + 5);
      bb.brick(x, floorY, z, cell - 0.1, cell - 0.1, {
        h: P(1), color: t < 0.2 ? C.darkTan : (t < 0.86 ? C.tan : C.nougat), free: true, studs: false,
      });
    }
  }
  // Fill the annulus between pit wall and rim so the ground reads solid.
  pitWall(bb, 0, 0, PIT_R + 1.4, B(1), floorY);
  ring(bb, 0, 0, B(1), RIM_R - 3, B(1), 8, 40, (k) => (hash2i(k, 0, 611) < 0.25 ? C.darkTan : C.tan));
  // Coping stones round the lip.
  ring(bb, 0, 0, B(2), PIT_R + 1.6, P(2), 3.4, 36, (k) => (k % 3 ? C.darkTan : C.tan));

  // ------------------------------------------------------- courtyard
  // Stair down from the rim on the +Z side, facing camera.
  const steps = 9;
  for (let k = 0; k < steps; k++) {
    const t = k / (steps - 1);
    const y = B(1) - (B(1) - floorY) * t;
    const z = PIT_R + 1.2 - t * 11;
    bb.brick(0, y - P(3), z, 7, 2.4, { h: P(3), color: k % 2 ? C.darkTan : C.tan, free: true, studs: false });
  }
  // Doorways round the courtyard wall: dark recesses with sand-brick lintels.
  for (let k = 0; k < 5; k++) {
    const a = Math.PI * 0.35 + k * (Math.PI * 1.3 / 4);
    const dx = Math.cos(a), dz = Math.sin(a);
    bb.brick(dx * (PIT_R - 0.5), floorY + P(1), dz * (PIT_R - 0.5), 2.2, 6.2, {
      h: B(4), color: C.black, rot: -a, free: true, studs: false,
    });
    bb.brick(dx * (PIT_R - 0.2), floorY + P(1) + B(4), dz * (PIT_R - 0.2), 2.6, 7.6, {
      h: B(0.8), color: C.darkTan, rot: -a, free: true, studs: false,
    });
    bb.brick(dx * (PIT_R - 0.2), floorY + P(1), dz * (PIT_R - 0.2), 2.6, 0.9, {
      h: B(4.8), color: C.darkTan, rot: -a, free: true, studs: false,
    });
    bb.brick(dx * (PIT_R - 0.2) - dz * 3.35, floorY + P(1), dz * (PIT_R - 0.2) + dx * 3.35, 2.6, 0.9, {
      h: B(4.8), color: C.darkTan, rot: -a, free: true, studs: false,
    });
  }
  // Yard dressing: crates, a workbench, a droid charging post.
  bb.brick(-8, floorY + P(1), -6, 5, 3.4, { h: B(2), color: C.reddishBrown, free: true, studs: false });
  bb.brick(-8, floorY + P(1) + B(2), -6, 5.6, 4, { h: P(1), color: C.darkTan, free: true, studs: false });
  bb.cyl(9, floorY + P(1), -4, 1.4, B(2.4), { color: C.darkBluishGray, seg: 12, stud: false });
  bb.cyl(9, floorY + P(1) + B(2.4), -4, 1.5, P(1), { color: C.flatSilver, seg: 12, stud: false });
  bb.brick(6, floorY + P(1), 7, 3.4, 3.4, { h: B(1.6), color: C.oliveGreen, free: true, studs: false });

  // ------------------------------------------------------------- hut
  // The domed entry over the stair head, set back from the rim.
  domedHut(bb, 0, RIM_R + 8, B(1), 10.5, -Math.PI / 2);

  // Two smaller domes off to one side -- the classic homestead silhouette.
  domedHut(bb, -RIM_R - 9, 8, B(1), 7.5, Math.PI);
  domedHut(bb, RIM_R + 7, -13, B(1), 6, 0);

  // ------------------------------------------------------- vaporators
  const vaps = Math.round(num(opts, 'vaporators', 4));
  for (let k = 0; k < vaps; k++) {
    const a = -0.5 + k * (Math.PI * 1.55 / Math.max(1, vaps - 1));
    const r = RIM_R + 12 + rng.range(-3, 7);
    vaporator(bb, Math.cos(a) * r, -Math.sin(a) * r, B(1), rng.range(8, 12), rng);
  }

  // A speeder-parking mat and a couple of rocks for scale.
  bb.brick(-RIM_R - 16, B(1), 22, 14, 10, { h: P(1), color: C.darkTan, free: true, studs: false });
  rockOutcrop(bb, plot * 0.36, plot * 0.3, B(1), 5, 11, rng);
  rockOutcrop(bb, -plot * 0.4, -plot * 0.34, B(1), 4, 8, rng);

  const g = bb.build();
  g.name = 'moisturefarm';
  g.userData.nodes = bb.nodes;

  const yard = new THREE.Object3D();
  yard.position.set(0, floorY, 0);
  g.add(yard);
  g.userData.nodes.courtyard = yard;
  const door = new THREE.Object3D();
  door.position.set(0, B(1), RIM_R + 4.5);
  g.add(door);
  g.userData.nodes.hutDoor = door;
  g.userData.pitDepth = PIT_D;
  return g;
}
