// Body kit-bash: peaked hood + slatted vents + washer jets + tight cowl gap;
// deep 7-slot grille with surround/header; nested headlight buckets + lens + park tick;
// stepped fender arches + readable flare bolts; door shut lines, belt moldings,
// grab handles, stacked A-pillar hinges; hardtop gutters + freedom seams + rear surround;
// stamped swing-gate, spare arms, CHMSL; winch fairlead, D-rings, rear step;
// skid plates + extra crossmembers for a solid wheel-well view.
import { add, box, cyl, group, torus } from '../geo.js';
import { SPEC as S } from './spec.js';

function glassBox(w, h, d, mat, x, y, z) {
  const m = box(w, h, d, mat, x, y, z);
  m.castShadow = false;
  return m;
}

function glassCyl(rTop, rBot, h, segs, mat, x, y, z, rx, ry, rz) {
  const m = cyl(rTop, rBot, h, segs, mat, x, y, z, rx, ry, rz);
  m.castShadow = false;
  return m;
}

function boltX(mat, x, y, z) {
  return cyl(0.015, 0.015, 0.02, 6, mat, x, y, z, 0, 0, Math.PI / 2);
}

export function buildBody(mat) {
  const g = group('body');

  // --- Frame + underside (readable from the wheel view) ---
  add(
    g,
    box(0.1, 0.13, 4.05, mat.rusty, 0.38, S.frameY, 0.02),
    box(0.1, 0.13, 4.05, mat.rusty, -0.38, S.frameY, 0.02),
    box(0.08, 0.05, 4.0, mat.rusty, 0.38, S.frameY - 0.08, 0.02),
    box(0.08, 0.05, 4.0, mat.rusty, -0.38, S.frameY - 0.08, 0.02),
  );
  for (const z of [1.72, 1.23, 0.42, -0.42, -1.23, -1.72]) {
    add(g, box(0.86, 0.055, 0.12, mat.rusty, 0, S.frameY, z));
  }
  add(
    g,
    box(0.64, 0.045, 0.78, mat.rusty, 0, 0.33, 1.58),
    box(0.52, 0.04, 0.42, mat.rusty, 0, 0.33, 0.18),
    box(0.58, 0.045, 0.55, mat.rusty, 0, 0.32, -1.15),
  );

  // Floor / tub
  add(g, box(S.bodyHalfWidth * 2, 0.05, 2.72, mat.blackout, 0, S.floorY, -0.04));
  for (const sx of [-1, 1]) {
    add(g, box(0.07, 0.1, 1.85, mat.blackout, sx * 0.74, S.floorY - 0.04, -0.04));
  }

  // --- Hood (peak / power bulge, vents, latches) ---
  const hood = group('hood');
  hood.position.set(0, S.hoodY, 1.355);
  hood.rotation.x = -0.042;
  add(
    hood,
    box(1.5, 0.05, 1.12, mat.paint, 0, 0, 0),
    box(0.54, 0.04, 0.9, mat.paint, 0, 0.032, 0.02),
    box(0.08, 0.028, 0.98, mat.paint, 0, 0.052, 0.0),
    box(1.46, 0.04, 0.16, mat.paint, 0, -0.008, 0.52),
  );
  for (const sx of [-0.36, 0.36]) {
    add(
      hood,
      box(0.26, 0.03, 0.42, mat.blackout, sx, 0.036, -0.12),
      box(0.22, 0.02, 0.36, mat.plastic, sx, 0.048, -0.12),
    );
    for (const dz of [-0.1, 0.0, 0.1]) {
      add(hood, box(0.2, 0.012, 0.028, mat.steel, sx, 0.058, -0.12 + dz));
    }
  }
  for (const sx of [-0.62, 0.62]) {
    add(
      hood,
      box(0.09, 0.035, 0.11, mat.steel, sx, 0.02, 0.54),
      box(0.05, 0.02, 0.06, mat.blackout, sx, 0.04, 0.54),
    );
  }
  g.add(hood);

  // Cowl / tight hood gap / washer jets / windshield hinges
  add(
    g,
    box(1.54, 0.09, 0.16, mat.paint, 0, S.beltY - 0.02, 0.78),
    box(1.5, 0.015, 0.018, mat.blackout, 0, S.hoodY + 0.01, 0.795),
    box(1.48, 0.03, 0.1, mat.blackout, 0, S.beltY + 0.02, 0.76),
  );
  for (const sx of [-0.26, 0.26]) {
    add(g, cyl(0.012, 0.008, 0.022, 8, mat.blackout, sx, S.beltY + 0.04, 0.81));
  }
  for (const sx of [-0.52, 0.52]) {
    add(g, box(0.09, 0.035, 0.055, mat.steel, sx, S.beltY + 0.04, 0.735));
  }

  // A-pillars
  for (const sx of [-1, 1]) {
    const p = box(0.07, 0.74, 0.075, mat.blackout, sx * 0.72, 1.54, 0.62);
    p.rotation.x = -S.windshieldLean;
    p.rotation.z = sx * 0.055;
    g.add(p);
  }

  // --- Hardtop: gutters, freedom-panel seams, rear-window surround ---
  add(
    g,
    box(1.5, 0.055, 1.56, mat.blackout, 0, S.roofY, -0.04),
    box(1.46, 0.035, 0.07, mat.blackout, 0, S.roofY + 0.04, 0.7),
    box(1.46, 0.04, 0.08, mat.blackout, 0, S.roofY + 0.04, -0.78),
    box(0.016, 0.04, 0.74, mat.steel, 0, S.roofY + 0.036, 0.3),
    box(1.44, 0.028, 0.014, mat.steel, 0, S.roofY + 0.032, -0.08),
    box(1.28, 0.045, 0.04, mat.blackout, 0, 1.82, -0.835),
    box(1.28, 0.045, 0.04, mat.blackout, 0, 1.42, -0.835),
    box(0.045, 0.4, 0.04, mat.blackout, 0.62, 1.62, -0.835),
    box(0.045, 0.4, 0.04, mat.blackout, -0.62, 1.62, -0.835),
    box(0.3, 0.035, 0.03, mat.tail, 0, 1.84, -0.82),
  );
  for (const sx of [-1, 1]) {
    add(g, box(0.045, 0.03, 1.52, mat.blackout, sx * 0.735, S.roofY + 0.042, -0.04));
    add(g, box(0.1, 0.64, 0.3, mat.paint, sx * 0.72, 1.5, -0.84));
  }

  // Belt / tub sides
  for (const sx of [-1, 1]) {
    add(
      g,
      box(0.07, 0.58, 1.14, mat.paint, sx * S.bodyHalfWidth, 0.9, 0.04),
      box(0.075, 0.4, 0.98, mat.paint, sx * S.bodyHalfWidth, 0.86, 1.3),
      box(0.08, 0.52, 0.82, mat.paint, sx * S.bodyHalfWidth, 0.9, -1.3),
    );
  }

  // --- Fenders: stepped arches, trapezoid flares, readable bolts ---
  for (const sx of [-1, 1]) {
    add(
      g,
      box(0.24, 0.34, 0.86, mat.paint, sx * 0.8, 0.94, 1.5),
      box(0.16, 0.18, 0.4, mat.paint, sx * 0.86, 0.8, 1.8),
      box(0.14, 0.1, 0.3, mat.paint, sx * 0.84, 1.1, 1.48),
      box(0.18, 0.055, 0.18, mat.paint, sx * 0.62, 1.14, 1.9),
      box(0.1, 0.24, 0.64, mat.blackout, sx * 0.66, 0.7, 1.23),
      box(0.2, 0.035, 0.64, mat.plastic, sx * 0.72, 0.85, 1.23),
      box(0.14, 0.1, 0.7, mat.blackout, sx * S.flareHalfWidth, 0.86, 1.48),
      box(0.12, 0.26, 0.11, mat.blackout, sx * 0.94, 0.7, 1.86),
      box(0.12, 0.24, 0.11, mat.blackout, sx * 0.94, 0.7, 1.14),
    );
    for (let i = 0; i < 6; i++) {
      add(g, boltX(mat.steel, sx * (S.flareHalfWidth + 0.068), 0.9, 1.22 + i * 0.13));
    }
  }
  for (const sx of [-1, 1]) {
    add(
      g,
      box(0.23, 0.34, 0.74, mat.paint, sx * 0.8, 0.92, -1.46),
      box(0.14, 0.1, 0.26, mat.paint, sx * 0.84, 1.08, -1.42),
      box(0.1, 0.22, 0.58, mat.blackout, sx * 0.66, 0.7, -1.23),
      box(0.2, 0.035, 0.58, mat.plastic, sx * 0.72, 0.84, -1.23),
      box(0.14, 0.1, 0.64, mat.blackout, sx * S.flareHalfWidth, 0.85, -1.42),
      box(0.12, 0.24, 0.11, mat.blackout, sx * 0.94, 0.7, -1.1),
      box(0.12, 0.24, 0.11, mat.blackout, sx * 0.94, 0.7, -1.76),
    );
    for (let i = 0; i < 6; i++) {
      add(g, boltX(mat.steel, sx * (S.flareHalfWidth + 0.068), 0.89, -1.16 - i * 0.12));
    }
  }

  // --- Grille: deep 7 slots, surround, header bar ---
  const gz = S.hoodFrontZ;
  add(
    g,
    box(1.12, 0.07, 0.09, mat.blackout, 0, S.grilleTopY + 0.01, gz + 0.075),
    box(1.08, 0.045, 0.07, mat.blackout, 0, S.grilleBottomY - 0.01, gz + 0.065),
    box(0.96, 0.3, 0.1, mat.plastic, 0, 0.96, gz - 0.01),
    box(0.045, 0.3, 0.08, mat.blackout, 0.5, 0.96, gz + 0.07),
    box(0.045, 0.3, 0.08, mat.blackout, -0.5, 0.96, gz + 0.07),
    box(1.08, 0.1, 0.055, mat.blackout, 0, 0.7, gz + 0.08),
  );
  for (let i = 0; i < 8; i++) {
    add(g, box(0.026, 0.3, 0.08, mat.blackout, -0.455 + i * 0.13, 0.96, gz + 0.07));
  }

  // --- Headlights: nested buckets, reflector, glass, park tick ---
  for (const sx of [-1, 1]) {
    const hx = sx * 0.62;
    const hy = 0.96;
    const hz = gz + 0.15;
    add(
      g,
      cyl(0.138, 0.138, 0.12, 24, mat.blackout, hx, hy, hz - 0.02, Math.PI / 2),
      cyl(0.118, 0.118, 0.07, 24, mat.plastic, hx, hy, hz + 0.02, Math.PI / 2),
      cyl(0.1, 0.092, 0.03, 20, mat.chrome, hx, hy, hz + 0.04, Math.PI / 2),
      cyl(0.128, 0.128, 0.018, 24, mat.chrome, hx, hy, hz + 0.055, Math.PI / 2),
      box(0.035, 0.014, 0.02, mat.led, hx, hy + 0.092, hz + 0.07),
      cyl(0.038, 0.038, 0.028, 12, mat.amber, sx * 0.92, 1.1, 1.74, Math.PI / 2),
    );
    const lens = glassCyl(0.11, 0.11, 0.022, 24, mat.lens, hx, hy, hz + 0.072, Math.PI / 2);
    g.add(lens);
  }

  // --- Bumpers: winch fairlead, D-rings, recovery, rear step ---
  add(
    g,
    box(1.74, 0.11, 0.15, mat.steel, 0, 0.48, 2.2),
    box(0.2, 0.24, 0.16, mat.steel, 0.8, 0.54, 2.2),
    box(0.2, 0.24, 0.16, mat.steel, -0.8, 0.54, 2.2),
    box(0.7, 0.07, 0.26, mat.rusty, 0, 0.4, 2.24),
    cyl(0.065, 0.065, 0.2, 12, mat.steel, 0, 0.5, 2.3, Math.PI / 2),
    box(0.22, 0.09, 0.03, mat.steel, 0, 0.52, 2.34),
    box(0.12, 0.026, 0.04, mat.blackout, 0, 0.52, 2.355),
  );
  for (const sx of [-0.52, 0.52]) {
    add(
      g,
      box(0.06, 0.05, 0.05, mat.steel, sx, 0.47, 2.28),
      torus(0.032, 0.007, 8, 12, mat.steel, sx, 0.47, 2.3),
    );
  }
  for (const sx of [-0.78, 0.78]) {
    add(g, box(0.07, 0.045, 0.1, mat.steel, sx, 0.4, 2.26));
  }
  add(
    g,
    box(1.7, 0.1, 0.14, mat.steel, 0, 0.46, -2.14),
    box(0.56, 0.03, 0.16, mat.blackout, 0, 0.42, -2.2),
    box(0.18, 0.16, 0.14, mat.steel, 0.78, 0.5, -2.14),
    box(0.18, 0.16, 0.14, mat.steel, -0.78, 0.5, -2.14),
  );
  for (const sx of [-0.5, 0.5]) {
    add(
      g,
      box(0.055, 0.045, 0.05, mat.steel, sx, 0.45, -2.22),
      torus(0.028, 0.006, 8, 10, mat.steel, sx, 0.45, -2.24),
    );
  }

  // Rock sliders
  for (const sx of [-1, 1]) {
    add(g, box(0.1, 0.07, 1.72, mat.steel, sx * 0.9, 0.42, -0.04));
  }

  // --- Tailgate: stamp, spare carrier arms, CHMSL already on hardtop ---
  add(
    g,
    box(1.42, 0.72, 0.07, mat.paint, 0, 1.02, S.tailZ + 0.03),
    box(1.16, 0.46, 0.035, mat.paint, 0, 1.0, S.tailZ - 0.01),
    box(1.18, 0.03, 0.045, mat.paint, 0, 1.1, S.tailZ - 0.015),
    box(0.06, 0.52, 0.05, mat.steel, 0, 1.12, S.tailZ - 0.04),
    box(0.05, 0.045, 0.22, mat.steel, 0, 1.34, S.tailZ - 0.14),
    box(0.05, 0.045, 0.22, mat.steel, 0, 0.9, S.tailZ - 0.14),
    box(0.26, 0.04, 0.04, mat.steel, 0, 1.12, S.tailZ - 0.12),
    cyl(0.38, 0.38, 0.16, 28, mat.tire, 0, 1.12, S.tailZ - 0.18, Math.PI / 2),
    cyl(0.2, 0.2, 0.08, 20, mat.rim, 0, 1.12, S.tailZ - 0.26, Math.PI / 2),
    box(0.08, 0.42, 0.05, mat.steel, 0.68, 1.02, S.tailZ + 0.01),
  );

  // Taillights
  for (const sx of [-1, 1]) {
    add(
      g,
      box(0.17, 0.24, 0.05, mat.blackout, sx * 0.68, 1.08, S.tailZ - 0.01),
      box(0.14, 0.16, 0.04, mat.tail, sx * 0.68, 1.12, S.tailZ - 0.03),
      box(0.1, 0.05, 0.035, mat.amber, sx * 0.68, 0.94, S.tailZ - 0.03),
    );
  }

  // Glass + rubber surrounds
  const windshield = glassBox(1.36, 0.64, 0.02, mat.glass, 0, 1.54, 0.64);
  windshield.rotation.x = -S.windshieldLean;
  g.add(windshield);
  for (const sx of [-1, 1]) {
    add(
      g,
      box(0.02, 0.02, 0.94, mat.blackout, sx * 0.76, 1.71, -0.02),
      box(0.02, 0.02, 0.94, mat.blackout, sx * 0.76, 1.29, -0.02),
    );
    const sg = glassBox(0.018, 0.4, 0.92, mat.glass, sx * 0.768, 1.5, -0.02);
    g.add(sg);
  }
  const rg = glassBox(1.16, 0.34, 0.018, mat.glass, 0, 1.62, -0.86);
  g.add(rg);

  // --- Doors: shut lines, belt molding, grab handles, 2 hinges ---
  for (const sx of [-1, 1]) {
    const ox = sx * (S.bodyHalfWidth + 0.038);
    add(
      g,
      box(0.012, 0.56, 0.012, mat.blackout, ox, 0.92, 0.56),
      box(0.012, 0.56, 0.012, mat.blackout, ox, 0.92, -0.5),
      box(0.012, 0.012, 1.06, mat.blackout, ox, 0.64, 0.03),
      box(0.012, 0.012, 1.06, mat.blackout, ox, 1.205, 0.03),
      box(0.02, 0.016, 1.04, mat.chrome, sx * (S.bodyHalfWidth + 0.046), 1.208, 0.03),
    );
    const hx = sx * (S.bodyHalfWidth + 0.055);
    add(
      g,
      box(0.03, 0.1, 0.07, mat.steel, hx, 1.12, 0.54),
      cyl(0.016, 0.016, 0.09, 8, mat.steel, sx * (S.bodyHalfWidth + 0.072), 1.12, 0.54),
      box(0.03, 0.1, 0.07, mat.steel, hx, 0.84, 0.54),
      cyl(0.016, 0.016, 0.09, 8, mat.steel, sx * (S.bodyHalfWidth + 0.072), 0.84, 0.54),
    );
    const hdx = sx * (S.bodyHalfWidth + 0.06);
    add(
      g,
      box(0.02, 0.07, 0.15, mat.plastic, hdx, 1.06, -0.28),
      box(0.025, 0.03, 0.03, mat.blackout, sx * (S.bodyHalfWidth + 0.085), 1.06, -0.23),
      box(0.025, 0.03, 0.03, mat.blackout, sx * (S.bodyHalfWidth + 0.085), 1.06, -0.33),
      box(0.02, 0.03, 0.14, mat.blackout, sx * (S.bodyHalfWidth + 0.1), 1.06, -0.28),
    );
  }

  // Mirrors
  for (const sx of [-1, 1]) {
    add(
      g,
      box(0.04, 0.035, 0.12, mat.blackout, sx * 0.86, 1.28, 0.6),
      box(0.17, 0.1, 0.055, mat.blackout, sx * 0.99, 1.3, 0.56),
    );
    const mirrorGlass = glassBox(0.14, 0.075, 0.01, mat.glass, sx * 1.07, 1.3, 0.56);
    g.add(mirrorGlass);
  }

  // Wipers
  for (const sx of [-0.2, 0.3]) {
    const arm = box(0.016, 0.016, 0.5, mat.blackout, sx, 1.27, 0.74);
    arm.rotation.x = -S.windshieldLean - 0.08;
    arm.rotation.z = sx * 0.12;
    g.add(arm);
    const blade = box(0.012, 0.01, 0.42, mat.rubber, sx + 0.02, 1.4, 0.66);
    blade.rotation.x = -S.windshieldLean;
    blade.rotation.z = sx * 0.1;
    g.add(blade);
  }

  add(g, cyl(0.008, 0.006, 0.72, 6, mat.steel, -0.7, 1.7, -0.7));
  add(g, cyl(0.05, 0.05, 0.03, 12, mat.blackout, 0.8, 1.05, -0.95, 0, 0, Math.PI / 2));
  add(g, cyl(0.042, 0.042, 0.012, 12, mat.steel, 0.815, 1.05, -0.95, 0, 0, Math.PI / 2));
  add(g, cyl(0.035, 0.035, 0.22, 10, mat.rusty, -0.55, 0.38, -2.05, Math.PI / 2));

  return g;
}
