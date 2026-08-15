import * as THREE from 'three';
import { add, box, cyl, group } from '../geo.js';
import { SPEC as S } from './spec.js';

export function buildBody(mat) {
  const g = group('body');

  // Frame rails
  add(
    g,
    box(0.1, 0.12, 3.9, mat.rusty, 0.38, S.frameY, 0.0),
    box(0.1, 0.12, 3.9, mat.rusty, -0.38, S.frameY, 0.0),
    box(0.86, 0.06, 0.16, mat.rusty, 0, S.frameY, 1.1),
    box(0.86, 0.06, 0.16, mat.rusty, 0, S.frameY, -1.1),
  );

  // Floor / tub
  add(g, box(S.bodyHalfWidth * 2, 0.05, 2.7, mat.blackout, 0, S.floorY, -0.05));

  // Hood
  const hood = box(1.52, 0.06, 1.18, mat.paint, 0, S.hoodY, 1.36);
  hood.rotation.x = -0.04;
  g.add(hood);
  add(
    g,
    box(1.48, 0.04, 0.22, mat.paint, 0, S.hoodY + 0.04, 1.86),
    box(0.42, 0.05, 0.55, mat.blackout, 0, S.hoodY + 0.05, 1.42),
  );
  // Hood vents
  for (const sx of [-0.38, 0.38]) {
    add(g, box(0.22, 0.03, 0.38, mat.blackout, sx, S.hoodY + 0.05, 1.28));
  }
  // Hood latches
  for (const sx of [-0.62, 0.62]) {
    add(g, box(0.08, 0.04, 0.12, mat.steel, sx, S.hoodY + 0.02, 1.88));
  }

  // Cowl / windshield base
  add(g, box(1.56, 0.1, 0.18, mat.paint, 0, S.beltY - 0.02, 0.78));

  // A-pillars
  for (const sx of [-1, 1]) {
    const p = box(0.07, 0.72, 0.08, mat.blackout, sx * 0.72, 1.52, 0.58);
    p.rotation.x = -0.32;
    p.rotation.z = sx * 0.06;
    g.add(p);
  }

  // Roof / hardtop
  add(
    g,
    box(1.5, 0.06, 1.55, mat.blackout, 0, S.roofY, -0.05),
    box(1.48, 0.04, 0.08, mat.blackout, 0, S.roofY + 0.04, 0.68),
    box(1.48, 0.04, 0.08, mat.blackout, 0, S.roofY + 0.04, -0.78),
  );
  // Freedom-panel seam
  add(g, box(0.02, 0.05, 1.4, mat.steel, 0, S.roofY + 0.03, -0.05));

  // C-pillars / rear quarters
  for (const sx of [-1, 1]) {
    add(g, box(0.1, 0.62, 0.28, mat.paint, sx * 0.72, 1.5, -0.82));
  }

  // Belt / tub sides
  for (const sx of [-1, 1]) {
    add(
      g,
      box(0.07, 0.58, 1.62, mat.paint, sx * S.bodyHalfWidth, 0.9, -0.02),
      box(0.08, 0.42, 1.05, mat.paint, sx * S.bodyHalfWidth, 0.86, 1.28),
      box(0.08, 0.5, 0.85, mat.paint, sx * S.bodyHalfWidth, 0.9, -1.28),
    );
  }

  // Front fenders
  for (const sx of [-1, 1]) {
    add(
      g,
      box(0.28, 0.38, 0.95, mat.paint, sx * 0.82, 0.92, 1.55),
      box(0.22, 0.22, 0.55, mat.paint, sx * 0.88, 0.78, 1.78),
    );
  }

  // Rear fenders
  for (const sx of [-1, 1]) {
    add(g, box(0.26, 0.36, 0.8, mat.paint, sx * 0.82, 0.9, -1.45));
  }

  // Fender flares
  for (const sx of [-1, 1]) {
    add(
      g,
      box(0.16, 0.14, 0.95, mat.blackout, sx * S.flareHalfWidth, 0.78, 1.52),
      box(0.16, 0.14, 0.85, mat.blackout, sx * S.flareHalfWidth, 0.78, -1.42),
    );
    // Bolt heads
    for (let i = 0; i < 5; i++) {
      const zf = 1.2 + i * 0.16;
      const zr = -1.1 - i * 0.14;
      add(
        g,
        cyl(0.012, 0.012, 0.02, 8, mat.steel, sx * (S.flareHalfWidth + 0.07), 0.84, zf, 0, 0, Math.PI / 2),
        cyl(0.012, 0.012, 0.02, 8, mat.steel, sx * (S.flareHalfWidth + 0.07), 0.84, zr, 0, 0, Math.PI / 2),
      );
    }
  }

  // Grille surround + 7 slots
  add(g, box(1.18, 0.42, 0.08, mat.blackout, 0, 0.96, S.hoodFrontZ + 0.08));
  for (let i = 0; i < 7; i++) {
    const x = -0.42 + i * 0.14;
    add(g, box(0.055, 0.3, 0.04, mat.blackout, x, 0.96, S.hoodFrontZ + 0.13));
    add(g, box(0.03, 0.26, 0.02, mat.steel, x, 0.96, S.hoodFrontZ + 0.155));
  }

  // Headlight buckets
  for (const sx of [-1, 1]) {
    const bucket = cyl(0.13, 0.13, 0.1, 24, mat.blackout, sx * 0.62, 0.96, S.hoodFrontZ + 0.16, Math.PI / 2);
    const lens = cyl(0.11, 0.11, 0.04, 24, mat.headlight, sx * 0.62, 0.96, S.hoodFrontZ + 0.21, Math.PI / 2);
    const ring = cyl(0.125, 0.125, 0.02, 24, mat.chrome, sx * 0.62, 0.96, S.hoodFrontZ + 0.19, Math.PI / 2);
    g.add(bucket, lens, ring);
    // Marker
    add(g, cyl(0.035, 0.035, 0.03, 12, mat.amber, sx * 0.92, 1.08, 1.72, Math.PI / 2));
  }

  // Bumpers
  add(
    g,
    box(1.72, 0.12, 0.16, mat.steel, 0, 0.48, 2.18),
    box(0.18, 0.22, 0.18, mat.steel, 0.78, 0.52, 2.18),
    box(0.18, 0.22, 0.18, mat.steel, -0.78, 0.52, 2.18),
    box(1.68, 0.1, 0.14, mat.steel, 0, 0.46, -2.12),
  );
  // Skid / winch
  add(
    g,
    box(0.72, 0.08, 0.28, mat.rusty, 0, 0.38, 2.22),
    cyl(0.07, 0.07, 0.22, 12, mat.steel, 0, 0.5, 2.28, Math.PI / 2),
  );
  // D-rings
  for (const sx of [-0.55, 0.55]) {
    add(g, cyl(0.04, 0.04, 0.03, 10, mat.steel, sx, 0.46, 2.26, Math.PI / 2));
  }

  // Rock sliders
  for (const sx of [-1, 1]) {
    add(g, box(0.1, 0.07, 1.7, mat.steel, sx * 0.9, 0.42, -0.05));
  }

  // Tailgate
  add(g, box(1.42, 0.72, 0.08, mat.paint, 0, 1.02, S.tailZ + 0.02));
  // Spare carrier
  const spare = cyl(0.38, 0.38, 0.16, 28, mat.tire, 0, 1.12, S.tailZ - 0.16, Math.PI / 2);
  const spareRim = cyl(0.2, 0.2, 0.08, 20, mat.rim, 0, 1.12, S.tailZ - 0.24, Math.PI / 2);
  g.add(spare, spareRim);
  add(g, box(0.08, 0.55, 0.06, mat.steel, 0, 1.12, S.tailZ - 0.08));

  // Taillights
  for (const sx of [-1, 1]) {
    add(
      g,
      box(0.16, 0.22, 0.06, mat.tail, sx * 0.68, 1.08, S.tailZ - 0.02),
      box(0.1, 0.06, 0.05, mat.amber, sx * 0.68, 0.92, S.tailZ - 0.02),
    );
  }

  // Windshield
  const glass = box(1.36, 0.62, 0.02, mat.glass, 0, 1.54, 0.58);
  glass.rotation.x = -0.32;
  glass.castShadow = false;
  g.add(glass);
  // Side glass
  for (const sx of [-1, 1]) {
    const sg = box(0.02, 0.42, 0.95, mat.glass, sx * 0.76, 1.5, -0.02);
    sg.castShadow = false;
    g.add(sg);
  }
  // Rear glass
  const rg = box(1.2, 0.38, 0.02, mat.glass, 0, 1.62, -0.86);
  rg.castShadow = false;
  g.add(rg);

  // Door cut lines / handles / hinges
  for (const sx of [-1, 1]) {
    add(
      g,
      box(0.02, 0.55, 0.9, mat.blackout, sx * (S.bodyHalfWidth + 0.01), 0.95, 0.02),
      box(0.04, 0.06, 0.14, mat.steel, sx * (S.bodyHalfWidth + 0.05), 1.08, 0.18),
    );
    for (const z of [0.38, -0.28]) {
      add(g, box(0.05, 0.08, 0.04, mat.steel, sx * (S.bodyHalfWidth + 0.04), 1.0, z));
    }
  }

  // Mirrors
  for (const sx of [-1, 1]) {
    add(
      g,
      box(0.04, 0.04, 0.12, mat.blackout, sx * 0.86, 1.28, 0.62),
      box(0.16, 0.1, 0.06, mat.blackout, sx * 0.98, 1.3, 0.58),
    );
  }

  // Wipers
  for (const sx of [-0.22, 0.28]) {
    const w = box(0.02, 0.02, 0.48, mat.blackout, sx, 1.26, 0.72);
    w.rotation.x = -0.35;
    w.rotation.z = sx * 0.15;
    g.add(w);
  }

  // Antenna
  add(g, cyl(0.008, 0.006, 0.72, 6, mat.steel, -0.7, 1.7, -0.7));

  // Fuel filler
  add(g, cyl(0.05, 0.05, 0.03, 12, mat.blackout, 0.8, 1.05, -0.95, 0, 0, Math.PI / 2));

  // Exhaust
  add(g, cyl(0.035, 0.035, 0.22, 10, mat.rusty, -0.55, 0.38, -2.05, Math.PI / 2));

  return g;
}
