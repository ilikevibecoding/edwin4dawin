// Trail kit (details only): header LED bar with housing / pods / glands /
// A-pillar loom; roof rack with rails, crossbars, caps, feet, awning cassette
// and a traction-board pair; Safari snorkel; hi-lift jack; NATO jerry can;
// CB whip + spring bases; rear D-rings; mud flaps; cowl trail camera; plate.
import { add, box, cyl, group, sphere, torus } from '../geo.js';
import { SPEC as S } from './spec.js';

export function buildDetails(mat) {
  const g = group('details');

  // --- Light bar on the windshield header ---
  const barY = S.roofY + 0.10;
  const barZ = 0.71;
  add(g, box(1.08, 0.055, 0.078, mat.blackout, 0, barY, barZ));
  for (const sx of [-1, 1]) {
    add(g, box(0.04, 0.062, 0.088, mat.blackout, sx * 0.55, barY, barZ));
    add(g, cyl(0.011, 0.011, 0.028, 6, mat.rubber, sx * 0.46, barY - 0.012, barZ - 0.048, Math.PI / 2));
    add(g, box(0.032, 0.07, 0.036, mat.steel, sx * 0.36, S.roofY + 0.065, 0.675));
  }
  for (let i = 0; i < 8; i++) {
    add(g, box(0.072, 0.03, 0.03, mat.led, -0.42 + i * 0.12, barY + 0.002, barZ + 0.032));
  }
  const loom = cyl(0.006, 0.006, 0.38, 5, mat.rubber, 0.70, 1.70, 0.64);
  loom.rotation.x = -0.34;
  g.add(loom);

  // --- Roof rack ---
  const rackY = S.roofY + 0.09;
  for (const sx of [-1, 1]) {
    add(g, box(0.034, 0.028, 1.36, mat.steel, sx * 0.56, rackY, -0.04));
    add(g, box(0.042, 0.034, 0.04, mat.blackout, sx * 0.56, rackY, 0.64));
    add(g, box(0.042, 0.034, 0.04, mat.blackout, sx * 0.56, rackY, -0.72));
    add(g, box(0.055, 0.04, 0.07, mat.blackout, sx * 0.56, S.roofY + 0.05, 0.52));
    add(g, box(0.055, 0.04, 0.07, mat.blackout, sx * 0.56, S.roofY + 0.05, -0.58));
  }
  for (const z of [0.42, -0.04, -0.50]) {
    add(g, box(1.14, 0.024, 0.032, mat.steel, 0, S.roofY + 0.112, z));
  }
  add(g, cyl(0.03, 0.03, 1.18, 10, mat.blackout, 0.63, S.roofY + 0.125, -0.05, Math.PI / 2));

  // Traction-board pair strapped on the rack
  add(
    g,
    box(0.30, 0.036, 0.90, mat.rusty, 0.04, S.roofY + 0.155, -0.10),
    box(0.30, 0.036, 0.90, mat.rusty, 0.04, S.roofY + 0.194, -0.10),
    box(0.32, 0.018, 0.045, mat.rubber, 0.04, S.roofY + 0.218, -0.10),
  );

  // --- Safari snorkel, passenger A-pillar ---
  add(
    g,
    box(0.055, 0.10, 0.12, mat.blackout, 0.86, 1.08, 1.30),
    cyl(0.032, 0.032, 0.20, 10, mat.blackout, 0.84, 1.16, 1.29),
    sphere(0.038, 8, mat.blackout, 0.84, 1.28, 1.22),
  );
  const riser = cyl(0.032, 0.032, 0.76, 10, mat.blackout, 0.84, 1.58, 1.00);
  riser.rotation.x = -0.36;
  g.add(riser);
  add(
    g,
    cyl(0.05, 0.046, 0.15, 10, mat.blackout, 0.84, 1.97, 0.80, Math.PI / 2),
    box(0.10, 0.032, 0.028, mat.blackout, 0.84, 2.02, 0.88),
    box(0.07, 0.016, 0.07, mat.steel, 0.84, 1.44, 1.10),
  );

  // --- Hi-lift jack on the right tub (~1.1 m) ---
  add(
    g,
    box(0.042, 0.082, 1.10, mat.rusty, 0.88, 0.96, -0.12),
    box(0.08, 0.035, 0.10, mat.rusty, 0.88, 0.91, -0.64),
    box(0.058, 0.07, 0.075, mat.steel, 0.88, 0.98, 0.08),
    cyl(0.01, 0.01, 0.60, 8, mat.steel, 0.925, 1.03, -0.06, Math.PI / 2),
    cyl(0.016, 0.016, 0.09, 8, mat.rubber, 0.925, 1.03, 0.24, Math.PI / 2),
    box(0.07, 0.028, 0.05, mat.steel, 0.86, 0.90, 0.28),
    box(0.07, 0.028, 0.05, mat.steel, 0.86, 0.90, -0.48),
  );

  // --- NATO jerry can on the left tub (~0.35 m), clear of the spare ---
  const canX = -0.90;
  const canY = 0.96;
  const canZ = -0.62;
  add(
    g,
    box(0.16, 0.35, 0.33, mat.plastic, canX, canY, canZ),
    cyl(0.028, 0.028, 0.04, 10, mat.blackout, canX, canY + 0.195, canZ + 0.08),
    box(0.04, 0.03, 0.12, mat.steel, canX, canY + 0.20, canZ - 0.02),
    box(0.02, 0.36, 0.04, mat.rubber, canX - 0.09, canY + 0.01, canZ),
    box(0.14, 0.03, 0.30, mat.steel, canX, canY - 0.19, canZ),
  );

  // --- CB whip on the left fender + spring under the body antenna ---
  add(
    g,
    cyl(0.02, 0.02, 0.018, 8, mat.steel, -0.90, 1.115, 1.48),
    torus(0.014, 0.005, 6, 8, mat.steel, -0.90, 1.138, 1.48, Math.PI / 2),
    cyl(0.005, 0.004, 0.82, 6, mat.steel, -0.90, 1.56, 1.48),
    torus(0.012, 0.004, 6, 8, mat.steel, -0.70, 1.355, -0.70, Math.PI / 2),
  );

  // --- Rear recovery D-rings (body already has front rings) ---
  for (const sx of [-1, 1]) {
    add(
      g,
      torus(0.03, 0.007, 6, 10, mat.steel, sx * 0.48, 0.50, S.tailZ - 0.18),
      box(0.055, 0.022, 0.05, mat.steel, sx * 0.48, 0.495, S.tailZ - 0.12),
    );
  }

  // --- Mud flaps hung from the rear flares ---
  for (const sx of [-1, 1]) {
    add(
      g,
      box(0.20, 0.20, 0.014, mat.rubber, sx * 0.86, 0.58, -1.86),
      box(0.18, 0.018, 0.03, mat.steel, sx * 0.86, 0.69, -1.85),
    );
  }

  // --- Trail camera on the cowl ---
  add(
    g,
    box(0.055, 0.032, 0.048, mat.blackout, -0.38, 1.275, 0.80),
    cyl(0.011, 0.011, 0.012, 8, mat.lens, -0.38, 1.275, 0.828, Math.PI / 2),
    box(0.02, 0.018, 0.02, mat.steel, -0.38, 1.252, 0.80),
  );

  // --- License plate ---
  add(
    g,
    box(0.30, 0.13, 0.008, mat.blackout, 0, 0.72, S.tailZ - 0.018),
    box(0.28, 0.11, 0.01, mat.steel, 0, 0.72, S.tailZ - 0.024),
  );

  return g;
}
