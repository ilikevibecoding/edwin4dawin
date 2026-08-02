import * as THREE from 'three';
import { register } from '../registry.js';
import { BrickBuilder } from '../lego/brick.js';
import { sym, PLATE, BRICK, P, C } from './_util.js';

/*
 * Quad laser turret. Bolted to the corvette's spine and to the ledges of the
 * Star Destroyer's dorsal trench, so it is a reusable rig: a yawing housing
 * (the mounting ring rides along, being round) and an elevating gun cradle.
 *
 * Barrels point at +Z at rest, y = 0 is the bottom of the ring, and the whole
 * thing is deliberately built from two merged meshes to stay cheap enough to
 * scatter a dozen of them along a trench.
 */

export function quadTurret(opts = {}) {
  const body = opts.color ?? C.lightBluishGray;
  const dark = opts.dark ?? C.darkBluishGray;
  const trim = opts.trim ?? C.darkRed;
  const steel = opts.steel ?? C.flatSilver;

  const root = new THREE.Group();
  root.name = 'turret';

  const yaw = new THREE.Group();
  root.add(yaw);

  // ---- mounting ring + yawing housing (one mesh) -------------------------
  const hb = new BrickBuilder({ studs: true, studSeg: 8, vertexColors: true });
  hb.cyl(0, 0, 0, 2.0, P(1), { color: dark, stud: false, seg: 12 });
  hb.cyl(0, P(1), 0, 1.7, P(2), { color: C.darkGray, stud: false, seg: 12 });
  hb.brick(0, P(3), 0, 3, 3, { h: P(2), color: body, studs: false });
  hb.brick(0, P(5), -0.5, 2, 2, { h: BRICK, color: body });
  hb.tile(0, P(5) + BRICK, -0.5, 2, 1, { color: trim });
  sym(hb, (b, s) => {
    b.brick(s * 1.25, P(5), 0.45, 1, 2, { h: BRICK, color: dark, studs: false });
    b.cyl(s * 1.55, P(5) + BRICK * 0.5, 0.45, 0.34, P(1), {
      axis: 'x', color: steel, finish: 'solid', seg: 8, stud: false,
    });
  });
  yaw.add(hb.build());

  // ---- elevating cradle (one mesh) --------------------------------------
  const pitch = new THREE.Group();
  pitch.position.set(0, P(5) + BRICK * 0.5, 0.45);
  yaw.add(pitch);

  const gb = new BrickBuilder({ studs: true, studSeg: 8, vertexColors: true });
  gb.brick(0, -P(1.5), 0.3, 2, 3, { h: P(3), color: dark, studs: false });
  gb.tile(0, P(1.5), 0.3, 1, 2, { color: trim });
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      const bx = sx * 0.55, by = sy * 0.45;
      gb.cyl(bx, by, 1.4, 0.24, 1.2, { axis: 'z', color: dark, seg: 8, stud: false });
      gb.cyl(bx, by, 3.1, 0.115, 2.4, { axis: 'z', color: steel, finish: 'solid', seg: 8, stud: false });
      gb.cyl(bx, by, 4.4, 0.17, 0.35, { axis: 'z', color: C.red, finish: 'solid', seg: 8, stud: false });
    }
  }
  gb.node('muzzle', 0, 0, 4.7);
  const guns = gb.build();
  pitch.add(guns);

  if (opts.scale) root.scale.setScalar(opts.scale);
  if (opts.flip) root.rotation.set(Math.PI, Math.PI, 0);

  root.userData.nodes = { ...guns.userData.nodes, turret: root, yaw, pitch };
  root.userData.aim = (y = 0, p = 0) => {
    yaw.rotation.y = y;
    pitch.rotation.x = -THREE.MathUtils.clamp(p, -0.4, 1.3);
  };
  root.userData.aim(0, 0);
  return root;
}

register('turret', () => {
  const t = quadTurret();
  t.userData.update = (time) => {
    t.userData.aim(Math.sin(time * 0.6) * 0.9, 0.35 + Math.sin(time * 1.1) * 0.3);
  };
  return t;
}, { notes: 'quad laser turret, 4 studs wide, ring bottom at y=0, userData.aim(yaw,pitch), node muzzle' });
