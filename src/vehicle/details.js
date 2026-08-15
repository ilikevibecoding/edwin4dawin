import { add, box, cyl, group } from '../geo.js';
import { SPEC as S } from './spec.js';

export function buildDetails(mat) {
  const g = group('details');

  // Light bar
  add(g, box(1.05, 0.06, 0.08, mat.blackout, 0, S.roofY + 0.08, 0.62));
  for (let i = 0; i < 8; i++) {
    add(g, box(0.08, 0.04, 0.05, mat.led, -0.42 + i * 0.12, S.roofY + 0.1, 0.66));
  }

  // Roof rack
  for (const sx of [-0.55, 0.55]) {
    add(g, box(0.04, 0.04, 1.4, mat.steel, sx, S.roofY + 0.12, -0.05));
  }
  for (const z of [0.5, 0.1, -0.3, -0.7]) {
    add(g, box(1.14, 0.03, 0.03, mat.steel, 0, S.roofY + 0.14, z));
  }

  // Snorkel
  add(
    g,
    cyl(0.035, 0.035, 0.7, 10, mat.blackout, 0.78, 1.35, 1.15),
    cyl(0.04, 0.04, 0.18, 10, mat.blackout, 0.78, 1.72, 1.08, Math.PI / 2),
  );

  // Hood decal strip / cowl vents
  add(g, box(1.4, 0.02, 0.06, mat.blackout, 0, S.hoodY + 0.04, 0.86));

  // Recovery boards on sliders
  for (const sx of [-1, 1]) {
    add(g, box(0.06, 0.04, 0.7, mat.amber, sx * 0.9, 0.5, -0.2));
  }

  // Hi-lift jack
  add(g, box(0.05, 0.08, 1.05, mat.rusty, 0.88, 0.95, -0.15));

  // Jerry can
  add(g, box(0.18, 0.32, 0.28, mat.plastic, -0.55, 1.05, S.tailZ + 0.22));

  // License plate
  add(g, box(0.28, 0.1, 0.01, mat.steel, 0, 0.72, S.tailZ - 0.02));

  // Mud flaps
  for (const sx of [-1, 1]) {
    add(g, box(0.18, 0.16, 0.02, mat.rubber, sx * 0.82, 0.52, -1.85));
  }

  return g;
}
