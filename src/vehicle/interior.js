// Wrangler cabin kit-bash (no downloaded assets):
// - Fabric seats x2: cushion, back, headrest, side/back bolsters, stitch lines
// - Steering wheel: rubber torus rim, 3 spokes, hub, column
// - Dash: cowled cluster, two dials + needles, center stack, defrost vents, passenger grab handle
// - Console: armrest, shifter boot, cup holders, parking-brake handle
// - Pedals + footwell / firewall
// - Sport bar with rubber pads
// - Door cards: handle pocket + window crank / switch block
// - Floor mats
// - Rear bulkhead + sound bar (closes the cabin)
import { add, box, cyl, group, torus } from '../geo.js';

function hush(root) {
  root.traverse((c) => {
    if (c.isMesh) c.castShadow = false;
  });
  return root;
}

function seat(mat, x, z) {
  const s = group('seat');
  const back = box(0.42, 0.5, 0.09, mat.fabric, 0, 1.1, -0.22);
  back.rotation.x = -0.1;
  add(
    s,
    box(0.44, 0.09, 0.46, mat.fabric, 0, 0.8, 0),
    back,
    box(0.2, 0.12, 0.08, mat.fabric, 0, 1.42, -0.26),
    box(0.055, 0.13, 0.4, mat.fabric, -0.205, 0.86, 0.01),
    box(0.055, 0.13, 0.4, mat.fabric, 0.205, 0.86, 0.01),
    box(0.05, 0.4, 0.08, mat.fabric, -0.2, 1.1, -0.2),
    box(0.05, 0.4, 0.08, mat.fabric, 0.2, 1.1, -0.2),
    box(0.34, 0.006, 0.006, mat.blackout, 0, 0.848, 0.05),
  );
  s.position.set(x, 0, z);
  return s;
}

function steering(mat) {
  const wheel = group('steering');
  wheel.position.set(0.32, 1.14, 0.4);
  wheel.rotation.x = -0.38;
  add(
    wheel,
    torus(0.155, 0.017, 8, 20, mat.rubber),
    box(0.1, 0.022, 0.016, mat.plastic, -0.07, 0.01, 0),
    box(0.1, 0.022, 0.016, mat.plastic, 0.07, 0.01, 0),
    box(0.022, 0.1, 0.016, mat.plastic, 0, -0.07, 0),
    box(0.078, 0.078, 0.036, mat.plastic, 0, 0, 0),
    cyl(0.022, 0.022, 0.016, 12, mat.chrome, 0, 0, 0.02, Math.PI / 2),
    cyl(0.022, 0.03, 0.2, 10, mat.plastic, 0, -0.012, 0.12, Math.PI / 2),
  );
  return wheel;
}

function doorCard(mat, sx) {
  const d = group(sx > 0 ? 'doorR' : 'doorL');
  add(
    d,
    box(0.04, 0.4, 0.92, mat.plastic, sx * 0.68, 0.94, 0.02),
    box(0.03, 0.07, 0.18, mat.blackout, sx * 0.662, 1.02, 0.14),
    box(0.018, 0.028, 0.12, mat.chrome, sx * 0.648, 1.02, 0.14),
  );
  if (sx > 0) {
    add(d, box(0.028, 0.018, 0.08, mat.blackout, sx * 0.655, 1.1, -0.02));
  } else {
    add(d, cyl(0.022, 0.022, 0.018, 10, mat.plastic, sx * 0.655, 1.0, -0.1, 0, 0, Math.PI / 2));
  }
  return d;
}

export function buildInterior(mat) {
  const g = group('interior');

  add(g, box(1.36, 0.035, 1.48, mat.plastic, 0, 0.625, -0.04));
  add(
    g,
    box(0.4, 0.012, 0.54, mat.rubber, 0.32, 0.648, 0.16),
    box(0.4, 0.012, 0.54, mat.rubber, -0.32, 0.648, 0.16),
  );

  g.add(seat(mat, 0.32, 0.1));
  g.add(seat(mat, -0.32, 0.1));
  g.add(steering(mat));

  // Dash body, brow, cowled cluster
  add(
    g,
    box(1.38, 0.14, 0.26, mat.plastic, 0, 1.0, 0.58),
    box(1.4, 0.12, 0.3, mat.plastic, 0, 1.14, 0.56),
    box(1.36, 0.042, 0.2, mat.blackout, 0, 1.22, 0.5),
    box(0.4, 0.078, 0.15, mat.blackout, 0.3, 1.225, 0.475),
  );
  // Two dials
  add(
    g,
    cyl(0.055, 0.055, 0.018, 16, mat.chrome, 0.22, 1.175, 0.535, Math.PI / 2),
    cyl(0.046, 0.046, 0.01, 16, mat.led, 0.22, 1.175, 0.544, Math.PI / 2),
    cyl(0.048, 0.048, 0.018, 16, mat.chrome, 0.38, 1.175, 0.535, Math.PI / 2),
    cyl(0.04, 0.04, 0.01, 16, mat.led, 0.38, 1.175, 0.544, Math.PI / 2),
    box(0.004, 0.036, 0.004, mat.blackout, 0.22, 1.186, 0.552),
    box(0.004, 0.03, 0.004, mat.blackout, 0.38, 1.182, 0.552),
  );
  // Center stack, defrost vents, passenger grab, glove
  add(
    g,
    box(0.2, 0.24, 0.14, mat.plastic, 0, 1.06, 0.5),
    box(0.14, 0.055, 0.018, mat.led, 0, 1.12, 0.428),
    cyl(0.015, 0.015, 0.018, 10, mat.chrome, -0.04, 1.0, 0.428, Math.PI / 2),
    cyl(0.015, 0.015, 0.018, 10, mat.chrome, 0.04, 1.0, 0.428, Math.PI / 2),
    box(0.15, 0.018, 0.055, mat.blackout, -0.3, 1.236, 0.455),
    box(0.12, 0.018, 0.055, mat.blackout, 0.02, 1.236, 0.455),
    box(0.15, 0.018, 0.055, mat.blackout, 0.52, 1.236, 0.455),
    cyl(0.015, 0.015, 0.28, 10, mat.steel, -0.48, 1.2, 0.455, 0, 0, Math.PI / 2),
    box(0.32, 0.1, 0.08, mat.plastic, -0.42, 1.04, 0.5),
  );

  // Console
  const ebrake = box(0.028, 0.022, 0.16, mat.blackout, 0.068, 0.88, -0.05);
  ebrake.rotation.x = -0.55;
  add(
    g,
    box(0.2, 0.2, 0.78, mat.plastic, 0, 0.76, 0.02),
    box(0.16, 0.05, 0.26, mat.fabric, 0, 0.9, -0.22),
    cyl(0.042, 0.068, 0.08, 10, mat.rubber, 0, 0.9, 0.14),
    cyl(0.013, 0.013, 0.14, 8, mat.steel, 0, 1.0, 0.14),
    cyl(0.028, 0.032, 0.038, 10, mat.rubber, 0, 1.08, 0.14),
    box(0.16, 0.028, 0.16, mat.blackout, 0, 0.872, -0.02),
    cyl(0.03, 0.03, 0.036, 10, mat.blackout, -0.038, 0.858, -0.02),
    cyl(0.03, 0.03, 0.036, 10, mat.blackout, 0.038, 0.858, -0.02),
    ebrake,
  );

  // Pedals + footwell
  add(
    g,
    box(1.3, 0.26, 0.04, mat.plastic, 0, 0.78, 0.68),
    box(0.04, 0.22, 0.3, mat.plastic, 0.62, 0.74, 0.48),
    box(0.06, 0.012, 0.09, mat.rubber, 0.18, 0.68, 0.5),
    box(0.07, 0.014, 0.1, mat.rubber, 0.28, 0.68, 0.5),
    box(0.05, 0.012, 0.11, mat.rubber, 0.38, 0.664, 0.51),
    box(0.08, 0.018, 0.12, mat.rubber, 0.5, 0.655, 0.46),
  );

  // Roll bar + pads
  add(
    g,
    cyl(0.028, 0.028, 1.08, 10, mat.steel, 0.54, 1.32, -0.52),
    cyl(0.028, 0.028, 1.08, 10, mat.steel, -0.54, 1.32, -0.52),
    cyl(0.028, 0.028, 1.14, 10, mat.steel, 0, 1.84, -0.52, 0, 0, Math.PI / 2),
    cyl(0.042, 0.042, 0.36, 10, mat.rubber, 0.54, 1.52, -0.52),
    cyl(0.042, 0.042, 0.36, 10, mat.rubber, -0.54, 1.52, -0.52),
    cyl(0.042, 0.042, 0.42, 10, mat.rubber, 0, 1.84, -0.52, 0, 0, Math.PI / 2),
  );

  g.add(doorCard(mat, 1));
  g.add(doorCard(mat, -1));

  // Rear bulkhead + sound bar
  add(
    g,
    box(1.34, 1.14, 0.045, mat.plastic, 0, 1.22, -0.74),
    box(1.26, 0.1, 0.12, mat.blackout, 0, 1.52, -0.58),
    cyl(0.038, 0.038, 0.03, 12, mat.rubber, 0.4, 1.52, -0.515, Math.PI / 2),
    cyl(0.038, 0.038, 0.03, 12, mat.rubber, -0.4, 1.52, -0.515, Math.PI / 2),
  );

  g.userData.driverEye = { x: 0.32, y: 1.48, z: 0.22 };
  return hush(g);
}
