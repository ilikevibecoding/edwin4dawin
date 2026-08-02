import * as THREE from 'three';
import { register } from '../registry.js';
import { BrickBuilder } from '../lego/brick.js';
import { PLATE, BRICK, P, C, FINISH } from './_util.js';

/*
 * Quad laser turret. Bolted to the corvette's spine and to the ledges of the
 * Star Destroyer's dorsal trench, so it is built as a reusable rig rather than
 * a one-off: a fixed ring, a yawing housing, and an elevating gun cradle.
 *
 * Barrels point at +Z at rest. y = 0 is the bottom of the mounting ring.
 */

const SCALES = { small: 0.62, normal: 1, big: 1.5 };

export function quadTurret(opts = {}) {
  const s = SCALES[opts.size] || opts.scale || 1;
  const body = opts.color ?? C.lightBluishGray;
  const dark = opts.dark ?? C.darkBluishGray;
  const trim = opts.trim ?? C.darkRed;

  const root = new THREE.Group();
  root.name = 'turret';

  // ---- fixed ring -------------------------------------------------------
  const base = new BrickBuilder({ studs: true, studSeg: 8 });
  base.cyl(0, 0, 0, 2.0, P(1), { color: dark, stud: false });
  base.cyl(0, P(1), 0, 1.65, P(2), { color: dark, stud: false, seg: 12 });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    base.brick(Math.cos(a) * 1.75, 0, Math.sin(a) * 1.75, 1, 1, {
      h: P(1), color: C.darkGray, tile: true, free: true,
    });
  }
  root.add(base.build());

  // ---- yawing housing ---------------------------------------------------
  const yaw = new THREE.Group();
  yaw.position.y = P(3);
  root.add(yaw);

  const hb = new BrickBuilder({ studs: true, studSeg: 8 });
  hb.cyl(0, 0, 0, 1.5, P(1), { color: dark, stud: false, seg: 12 });
  hb.brick(0, P(1), 0, 3, 3, { h: P(2), color: body, studs: false });
  hb.brick(0, P(3), -0.5, 2, 2, { h: BRICK, color: body });
  // shoulder cheeks the cradle pivots between
  hb.mirrorX((b) => {
    b.brick(1.25, P(3), 0.3, 1, 2, { h: BRICK, color: dark, studs: false });
    b.cyl(1.25, P(3) + BRICK * 0.5, 0.3, 0.42, P(1), { color: C.flatSilver, finish: FINISH.METAL, axis: 'x', stud: false, seg: 8 });
  });
  hb.brick(0, P(3) + BRICK, -0.5, 2, 1, { h: P(1), color: trim, tile: true });
  yaw.add(hb.build());

  // ---- elevating cradle -------------------------------------------------
  const pitch = new THREE.Group();
  pitch.position.set(0, P(3) + BRICK * 0.5, 0.3);
  yaw.add(pitch);

  const gb = new BrickBuilder({ studs: true, studSeg: 8 });
  gb.brick(0, -P(1), 0.2, 2, 3, { h: P(2), color: dark, studs: false });
  gb.brick(0, P(1), 0.2, 1, 2, { h: P(1), color: trim, tile: true });
  // four barrels, LEGO bar + tip
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      const bx = sx * 0.52, by = sy * 0.42 - P(1) * 0.2;
      gb.cyl(bx, by, 1.5, 0.2, 1.0, { axis: 'z', color: dark, seg: 8, stud: false });
      gb.bar(bx, by, 2.9, 0.115, 3.4, { rx: Math.PI / 2, color: C.flatSilver, finish: FINISH.METAL, seg: 8 });
      gb.cyl(bx, by, 4.55, 0.16, 0.35, { axis: 'z', color: C.transRed, finish: FINISH.TRANS, seg: 8, stud: false });
    }
  }
  gb.node('muzzle', 0, 0, 4.8);
  const gunMesh = gb.build();
  pitch.add(gunMesh);

  root.scale.setScalar(s);
  root.userData.nodes = { ...gunMesh.userData.nodes, turret: root, yaw, pitch };
  root.userData.aim = (y = 0, p = 0) => {
    yaw.rotation.y = y;
    pitch.rotation.x = -THREE.MathUtils.clamp(p, -0.35, 1.25);
  };
  return root;
}

register('turret', () => {
  const t = quadTurret();
  t.userData.update = (time) => {
    t.userData.aim(Math.sin(time * 0.6) * 0.9, 0.35 + Math.sin(time * 1.1) * 0.3);
  };
  return t;
}, { notes: 'quad laser turret, 4 studs wide, base at y=0, userData.aim(yaw,pitch), node muzzle' });
