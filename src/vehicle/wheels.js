import * as THREE from 'three';
import { add, box, cyl, group } from '../geo.js';
import { SPEC as S } from './spec.js';

export function buildWheel(mat, side = 1) {
  const g = group('wheel');
  const spin = group('spin');
  g.add(spin);

  const tire = cyl(S.wheelRadius, S.wheelRadius, S.wheelWidth, 36, mat.tire);
  tire.rotation.z = Math.PI / 2;
  spin.add(tire);

  const sidewall = cyl(S.wheelRadius * 0.98, S.rimRadius + 0.04, 0.04, 28, mat.rubber);
  sidewall.rotation.z = Math.PI / 2;
  sidewall.position.x = side * (S.wheelWidth * 0.42);
  spin.add(sidewall);

  const rim = cyl(S.rimRadius, S.rimRadius * 0.86, 0.14, 24, mat.rim);
  rim.rotation.z = Math.PI / 2;
  spin.add(rim);

  const hub = cyl(0.08, 0.08, 0.1, 16, mat.steel);
  hub.rotation.z = Math.PI / 2;
  hub.position.x = side * 0.04;
  spin.add(hub);

  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const spoke = box(0.04, S.rimRadius * 0.72, 0.03, mat.rim);
    spoke.position.set(side * 0.02, Math.sin(a) * S.rimRadius * 0.38, Math.cos(a) * S.rimRadius * 0.38);
    spoke.rotation.x = a;
    spin.add(spoke);
  }

  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const lug = cyl(0.012, 0.012, 0.03, 8, mat.chrome);
    lug.rotation.z = Math.PI / 2;
    lug.position.set(side * 0.08, Math.sin(a) * 0.055, Math.cos(a) * 0.055);
    spin.add(lug);
  }

  const rotor = cyl(0.16, 0.16, 0.02, 24, mat.steel);
  rotor.rotation.z = Math.PI / 2;
  rotor.position.x = -side * 0.08;
  spin.add(rotor);

  const caliper = box(0.08, 0.1, 0.14, mat.rusty, -side * 0.1, 0.12, 0);
  spin.add(caliper);

  return { group: g, spin };
}

export function buildAxles(mat) {
  const g = group('axles');
  add(
    g,
    cyl(0.04, 0.04, S.trackHalf * 2 - 0.2, 10, mat.rusty, 0, S.axleY, S.frontAxleZ, 0, 0, Math.PI / 2),
    cyl(0.04, 0.04, S.trackHalf * 2 - 0.2, 10, mat.rusty, 0, S.axleY, S.rearAxleZ, 0, 0, Math.PI / 2),
    box(0.12, 0.08, 2.4, mat.rusty, 0, S.axleY - 0.02, 0),
  );
  return g;
}
