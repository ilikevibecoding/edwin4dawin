import { add, box, cyl, group } from '../geo.js';

function seat(mat, x, z) {
  const s = group('seat');
  add(
    s,
    box(0.46, 0.1, 0.48, mat.fabric, x, 0.78, z),
    box(0.46, 0.52, 0.1, mat.fabric, x, 1.06, z - 0.2),
    box(0.06, 0.28, 0.42, mat.fabric, x - 0.2, 0.88, z),
    box(0.06, 0.28, 0.42, mat.fabric, x + 0.2, 0.88, z),
  );
  return s;
}

export function buildInterior(mat) {
  const g = group('interior');

  add(g, box(1.36, 0.04, 1.5, mat.plastic, 0, 0.62, -0.05));
  g.add(seat(mat, 0.32, 0.12));
  g.add(seat(mat, -0.32, 0.12));

  // Dash
  add(
    g,
    box(1.4, 0.16, 0.32, mat.plastic, 0, 1.12, 0.58),
    box(0.42, 0.1, 0.18, mat.blackout, 0.28, 1.22, 0.55),
  );
  // Gauges
  add(
    g,
    cyl(0.055, 0.055, 0.02, 16, mat.chrome, 0.22, 1.22, 0.66, Math.PI / 2),
    cyl(0.045, 0.045, 0.015, 16, mat.led, 0.22, 1.22, 0.67, Math.PI / 2),
    cyl(0.04, 0.04, 0.02, 16, mat.chrome, 0.36, 1.22, 0.66, Math.PI / 2),
  );

  // Wheel
  const wheel = group('steering');
  wheel.position.set(0.32, 1.12, 0.42);
  wheel.rotation.x = -0.35;
  add(
    wheel,
    cyl(0.16, 0.16, 0.03, 20, mat.rubber, 0, 0, 0, Math.PI / 2),
    box(0.22, 0.03, 0.03, mat.plastic),
    box(0.03, 0.18, 0.03, mat.plastic),
  );
  g.add(wheel);

  // Console / shifter
  add(
    g,
    box(0.22, 0.16, 0.7, mat.plastic, 0, 0.78, 0.05),
    cyl(0.02, 0.02, 0.16, 8, mat.steel, 0, 0.92, 0.12),
    cyl(0.035, 0.035, 0.04, 10, mat.rubber, 0, 1.0, 0.12),
  );

  // Pedals
  add(
    g,
    box(0.08, 0.02, 0.1, mat.rubber, 0.22, 0.66, 0.48),
    box(0.08, 0.02, 0.1, mat.rubber, 0.36, 0.66, 0.48),
  );

  // Roll bar
  add(
    g,
    cyl(0.03, 0.03, 1.1, 10, mat.steel, 0.55, 1.35, -0.55),
    cyl(0.03, 0.03, 1.1, 10, mat.steel, -0.55, 1.35, -0.55),
    cyl(0.03, 0.03, 1.2, 10, mat.steel, 0, 1.82, -0.55, 0, 0, Math.PI / 2),
  );

  // Door cards
  for (const sx of [-1, 1]) {
    add(g, box(0.04, 0.38, 0.9, mat.fabric, sx * 0.7, 0.92, 0.0));
  }

  g.userData.driverEye = { x: 0.32, y: 1.48, z: 0.22 };
  return g;
}
