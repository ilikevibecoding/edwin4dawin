import * as THREE from 'three';
import { register } from '../registry.js';
import { BrickBuilder, PLATE, BRICK, P, B } from '../lego/brick.js';
import { C, FINISH } from '../lego/palette.js';
import { Minifig, Lightsaber } from '../lego/minifig.js';

/** Parts-bin sanity check: one of everything the builder can make. */
register('test_parts', () => {
  const bb = new BrickBuilder();
  bb.brick(-6, 0, 0, 2, 4, { color: C.red });
  bb.brick(-6, BRICK, 0, 2, 2, { color: C.yellow });
  bb.plate(-3, 0, 0, 4, 4, { color: C.blue });
  bb.tile(-3, PLATE, 0, 2, 2, { color: C.white });
  bb.slope(0, 0, 0, 2, 2, { color: C.green, h: BRICK });
  bb.slope(0, BRICK, 0, 2, 2, { color: C.lime, h: BRICK, rot: Math.PI });
  bb.cyl(3, 0, 0, 0.5, BRICK, { color: C.darkAzure });
  bb.cone(3, BRICK, 0, 0.5, BRICK, { color: C.orange });
  bb.sphere(6, 1, 0, 0.9, { color: C.transRed, finish: FINISH.TRANS });
  bb.wedge(9, 0, 0, 4, 4, { color: C.tan, h: PLATE });
  bb.curveSlope(12, 0, 0, 3, 2, { color: C.transLightBlue, finish: FINISH.TRANS, h: BRICK * 1.5 });
  bb.bar(15, 1.5, 0, 0.08, 3, { color: C.flatSilver, finish: FINISH.METAL });
  bb.sphere(-9, 0.8, 0, 1.0, { color: C.white, dome: true });
  return bb.build();
}, { notes: 'every primitive the brick builder supports' });

register('test_minifig', () => {
  const f = new Minifig({
    name: 'test', skin: C.brightLightYellow, torso: C.blue, legs: C.reddishBrown, hips: C.reddishBrown,
  });
  const saber = new Lightsaber({ color: C.transLightBlue });
  f.attach('R', saber.object3D);
  saber.object3D.rotation.x = -1.4;
  saber.setExtension(1);
  f.setPose('saber_guard');
  const g = new THREE.Group();
  g.add(f.object3D);
  g.userData.update = (t, dt) => { f.update(dt, t); saber.update(dt, t); };
  return g;
});
