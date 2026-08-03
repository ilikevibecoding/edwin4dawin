import * as THREE from 'three';
import { BrickBuilder, PLATE, BRICK, P, B } from '../lego/brick.js';
import { C, FINISH } from '../lego/palette.js';
import { RNG } from '../engine/rng.js';
import { num, bool, hash2i, practical } from './common.js';

/*
 * Ben Kenobi's hut: a small stone-brick dome in dark tan and light bluish
 * gray, built as a filming set rather than a real building -- the +Z wall is
 * missing and the dome over it is cut away, so a camera outside can shoot the
 * whole interior. From behind (-Z) it still reads as a closed hut.
 *
 * Interior floor at y = 0, roughly 20 x 18 studs of room.
 */

const RX = 11;   // interior half-width
const RZ = 9.5;  // interior half-depth
const WALL = 2;  // stone thickness

/** One course of stone: staggered blocks with a random cool/warm mix. */
function course(bb, y, h, seed, cut) {
  const step = 2.6;
  const outerX = RX + WALL, outerZ = RZ + WALL;
  const place = (x, z, w, d, k) => {
    const t = hash2i(k, Math.round(y * 10), seed);
    const color = t < 0.42 ? C.darkTan : (t < 0.72 ? C.lightBluishGray : (t < 0.9 ? C.darkBluishGray : C.tan));
    bb.brick(x, y, z, w, d, { h, color, free: true, studs: false });
  };
  const jitter = (y / BRICK) % 2 < 1 ? 0 : step / 2;

  // Back wall (-Z) full width; side walls up to the open front.
  let k = 0;
  for (let x = -outerX + step / 2 + jitter * 0.5; x <= outerX; x += step) {
    place(Math.min(x, outerX - step / 2), -outerZ + WALL / 2, step - 0.12, WALL, k++);
  }
  for (const sx of [-1, 1]) {
    for (let z = -outerZ + WALL + step / 2 + jitter; z <= (cut ?? outerZ); z += step) {
      if (z > outerZ - step / 2) break;
      place(sx * (outerX - WALL / 2), z, WALL, step - 0.12, k++);
    }
  }
}

export function buildHermitHut(opts = {}) {
  const seed = Math.round(num(opts, 'seed', 1919));
  const rng = new RNG(seed);
  const wallH = num(opts, 'wallHeight', 9.6);
  const open = bool(opts, 'open', true);   // fourth wall removed for filming
  const frontZ = RZ + WALL;

  const bb = new BrickBuilder({ studs: false, bevel: false, cullStuds: false });

  // ------------------------------------------------------------- floor
  const cell = 2.5;
  const nx = Math.ceil((RX + WALL) * 2 / cell), nz = Math.ceil((RZ + WALL) * 2 / cell);
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const x = -(RX + WALL) + (i + 0.5) * cell;
      const z = -(RZ + WALL) + (j + 0.5) * cell;
      const t = hash2i(i, j, seed + 3);
      bb.brick(x, -PLATE, z, cell - 0.1, cell - 0.1, {
        h: PLATE, color: t < 0.42 ? C.darkTan : (t < 0.86 ? C.tan : C.lightBluishGray),
        free: true, studs: false,
      });
    }
  }
  // Sand apron so the hut is not floating on a hard edge.
  for (let k = 0; k < 3; k++) {
    bb.brick(0, -PLATE - (k + 1) * P(1), 0, (RX + WALL) * 2 + 6 + k * 7, (RZ + WALL) * 2 + 6 + k * 7, {
      h: P(1), color: k % 2 ? C.tan : C.darkTan, free: true, studs: false,
    });
  }

  // ------------------------------------------------------------- walls
  // Side walls run full height right up to the open front: it is the dome
  // that gets cut away, not the room, or the hut turns into an amphitheatre.
  const courses = Math.round(wallH / BRICK);
  for (let c = 0; c < courses; c++) course(bb, c * BRICK, BRICK, seed + 11, null);
  if (!open) {
    for (let c = 0; c < courses; c++) {
      bb.brick(0, c * BRICK, frontZ - WALL / 2, (RX + WALL) * 2, WALL, {
        h: BRICK, color: c % 2 ? C.darkTan : C.lightBluishGray, free: true, studs: false,
      });
    }
  } else {
    // Stub returns at the open corners so the missing wall reads as a
    // proscenium rather than as a hut with a bite taken out of it.
    for (const sx of [-1, 1]) {
      for (let c = 0; c < courses; c++) {
        const t = hash2i(sx, c, seed + 19);
        bb.brick(sx * (RX - 0.6), c * BRICK, frontZ - WALL / 2, 3.6, WALL, {
          h: BRICK, color: t < 0.45 ? C.darkTan : (t < 0.78 ? C.lightBluishGray : C.darkBluishGray),
          free: true, studs: false,
        });
      }
    }
  }

  // Low doorway in the back-left, with a heavy lintel: even with the fourth
  // wall gone the hut needs a door to read as a dwelling.
  const doorX = -RX * 0.42;
  bb.brick(doorX, 0, -RZ - WALL / 2, 5.2, WALL + 0.4, { h: B(4.6), color: C.black, free: true, studs: false });
  bb.brick(doorX, B(4.6), -RZ - WALL / 2, 6.6, WALL + 0.8, { h: B(0.9), color: C.darkBluishGray, free: true, studs: false });
  for (const s of [-1, 1]) {
    bb.brick(doorX + s * 3.1, 0, -RZ - WALL / 2, 1.2, WALL + 0.8, {
      h: B(4.6), color: C.darkBluishGray, free: true, studs: false,
    });
  }

  // Window slit in the +X wall, glowing with hot outside light.
  const winY = B(3.4);
  bb.brick(RX + WALL / 2, winY, 2.5, WALL + 0.5, 5.2, { h: B(1.8), color: C.black, free: true, studs: false });
  // Just a pale plate, not a GLOW part: an emissive slit this size blows out
  // under bloom and eats the whole right-hand side of the frame.
  bb.brick(RX + WALL / 2 - 0.3, winY + P(1), 2.5, 0.4, 4.4, {
    h: B(1.8) - P(2), color: C.veryLightGray, free: true, studs: false,
  });
  for (let k = 0; k < 3; k++) {
    bb.bar(RX + WALL / 2 - 0.4, winY + B(0.9), 1.0 + k * 1.5, 0.13, B(1.8) - P(2), { color: C.darkBluishGray });
  }
  bb.brick(RX + WALL / 2, winY + B(1.8), 2.5, WALL + 0.9, 6.4, {
    h: P(2), color: C.darkTan, free: true, studs: false,
  });

  // -------------------------------------------------------------- dome
  // Corbelled stone dome: each course is a full ring of blocks, and every
  // block is sized from the gap to the course above it -- radial depth covers
  // the inward step and height covers the rise -- so the shell is watertight
  // from the inside instead of a stack of hoops with daylight between.
  // The near arc is dropped when `open` so the camera can see over the wall.
  const rings = 11;
  const domeH = num(opts, 'domeHeight', 10);
  const baseX = RX + WALL, baseZ = RZ + WALL;
  const prof = (t) => ({
    k: Math.cos(t * Math.PI / 2),
    y: wallH - BRICK * 0.5 + Math.sin(t * Math.PI / 2) * domeH,
  });
  for (let i = 0; i < rings; i++) {
    const a0 = prof(i / rings), a1 = prof((i + 1) / rings);
    // Overshoot both ways: the block hangs below its own course and reaches
    // outward past the one under it, which also hides the step's underside.
    const depth = Math.max(2.4, (a0.k - a1.k) * baseX + 1.6);
    const h = (a1.y - a0.y) + BRICK * 0.55;
    const rx = a0.k * baseX - depth / 2 + 0.7;
    const rz = a0.k * baseZ - depth / 2 + 0.7;
    if (rx < 0.9) break;
    const seg = Math.max(8, Math.round(2.4 * Math.max(rx, rz)));
    for (let s = 0; s < seg; s++) {
      const a = (s / seg) * Math.PI * 2 + (i % 2) * (Math.PI / seg);
      const sa = Math.sin(a), ca = Math.cos(a);
      if (open && sa > 0.12) continue;
      const px = ca * rx, pz = sa * rz;
      const wdt = (2 * Math.PI * Math.max(rx, rz) / seg) * 1.45;
      const tt = hash2i(s, i, seed + 71);
      bb.brick(px, a0.y, pz, depth, wdt, {
        h, rot: -Math.atan2(pz, px),
        color: tt < 0.5 ? C.darkTan : (tt < 0.74 ? C.tan : (tt < 0.93 ? C.lightBluishGray : C.darkBluishGray)),
        free: true, studs: false,
      });
    }
  }
  // Crown: a stepped capstone plugs the apex whichever way the dome was cut.
  const crownY = wallH - BRICK * 0.5 + domeH - BRICK * 0.8;
  bb.cyl(0, crownY - P(3), 0, 4.2, P(3), { color: C.lightBluishGray, seg: 16, stud: false });
  bb.cyl(0, crownY, 0, 3.4, P(3), { color: C.darkTan, seg: 16, stud: false });
  bb.sphere(0, crownY + P(3), 0, 2.6, {
    color: C.darkTan, dome: true, seg: 14, rings: 5, sy: 0.55,
  });

  // ---------------------------------------------------------- interior
  // Chest: reddish brown with a hinged dark lid, standing against -Z.
  const chestX = RX * 0.45, chestZ = -RZ + 3.2;
  bb.brick(chestX, 0, chestZ, 6, 3.6, { h: B(2), color: C.reddishBrown, free: true, studs: false });
  bb.brick(chestX, B(2), chestZ, 6.4, 4, { h: P(2), color: C.darkBrown, free: true, studs: false });
  for (const s of [-1, 1]) {
    bb.brick(chestX + s * 2.4, 0, chestZ, 0.5, 4, { h: B(2), color: C.pearlGold, finish: FINISH.METAL, free: true, studs: false });
  }
  bb.brick(chestX, B(1.1), chestZ + 1.9, 1.4, 0.4, { h: P(2), color: C.pearlGold, finish: FINISH.METAL, free: true, studs: false });

  // Low table with a lamp, a mat, and a shelf of odds and ends.
  bb.brick(-RX * 0.35, 0, 1.5, 7, 5, { h: P(1), color: C.darkTan, free: true, studs: false });
  bb.brick(-RX * 0.35, P(1), 1.5, 5, 3.4, { h: B(1.4), color: C.reddishBrown, free: true, studs: false });
  bb.brick(-RX * 0.35, P(1) + B(1.4), 1.5, 6, 4.2, { h: P(1), color: C.darkTan, free: true, studs: false });
  bb.cyl(-RX * 0.35 + 1.8, P(1) + B(1.4) + P(1), 1.5, 0.55, B(1), { color: C.darkBluishGray, seg: 10, stud: false });
  bb.sphere(-RX * 0.35 + 1.8, P(1) + B(1.4) + P(1) + B(1), 1.5, 0.75, {
    color: C.transNeonOrange, finish: FINISH.GLOW, seg: 10, rings: 6,
  });

  bb.brick(-RX - WALL / 2 + WALL, B(3), -3, 0.9, 8, { h: P(2), color: C.darkTan, free: true, studs: false });
  for (let k = 0; k < 4; k++) {
    const z = -6 + k * 2.2;
    bb.cyl(-RX + 1.2, B(3) + P(2), z, 0.42, B(rng.range(0.8, 1.6)), {
      color: k % 2 ? C.darkBluishGray : C.reddishBrown, seg: 8, stud: false,
    });
  }
  // Sleeping mat.
  bb.brick(RX * 0.4, 0, 4.5, 4.4, 8, { h: P(1), color: C.darkTan, free: true, studs: false });
  bb.brick(RX * 0.4, P(1), 1.4, 3.2, 1.8, { h: P(2), color: C.tan, free: true, studs: false });

  const g = bb.build();
  g.name = 'hermithut';
  g.userData.nodes = bb.nodes;

  const inside = new THREE.Object3D();
  inside.position.set(0, 3, 0);
  g.add(inside);
  g.userData.nodes.interior = inside;

  if (bool(opts, 'lights', true)) {
    // Warm lamp inside, a hot shaft through the window slit.
    practical(g, -RX * 0.35 + 1.8, 5.4, 1.5, 0xffb464, 90, 34);
    // Daylight through the window slit: weak and set back off the wall, or it
    // burns a specular hole through the stonework right at it.
    practical(g, RX - 4.5, winY + 1.2, 2.5, 0xffe6c0, 26, 18);
    // Sun spilling in through the missing wall, which is the only thing
    // lighting the far side of the room.
    practical(g, -4, wallH + 4, frontZ + 8, 0xffeed2, 200, 60);
    // Sky fill from the open side. Held well back off the proscenium: a point
    // light a few studs from the jamb puts its clearcoat highlight on a face
    // the camera is looking straight at, and it blows to white.
    practical(g, 7, 10, frontZ + 14, 0xdce7ff, 150, 60);
    // Bounce off the floor. Without it the corbelled underside of every dome
    // course goes black and the shell reads as loose rubble, not stonework.
    const bounce = new THREE.HemisphereLight(
      new THREE.Color(0x6a5540).convertSRGBToLinear(),
      new THREE.Color(0xc79a63).convertSRGBToLinear(), 1.5,
    );
    g.add(bounce);
    practical(g, 0, 2.5, 3, 0xffd9a8, 46, 26);
  }
  return g;
}
