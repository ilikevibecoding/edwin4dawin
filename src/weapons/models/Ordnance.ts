import * as THREE from 'three';
import { partMesh as mesh } from './Common';
import type { GunPalette } from './Materials';
import { boxGeo, cylGeo, cylGeoX, cylGeoY, latheZ, roundBoxGeo } from './Parts';
import type { ThrowableId } from '../WeaponDefs';

/**
 * Throwables.
 *
 * These are seen twice: in the left hand at arm's length during the throw, and
 * tumbling across the floor a few metres away. Both views are close enough that
 * the fuse assembly has to be real geometry — a sphere with a painted top is the
 * classic giveaway.
 */

/** Fuse body, safety lever and pull ring, shared by all three grenades. */
function fuseAssembly(pal: GunPalette, opts: { top: number; radius: number; pulled: boolean }): THREE.Group {
  const group = new THREE.Group();
  const { top, radius } = opts;
  group.add(mesh(cylGeoY(radius * 0.62, radius * 0.78, 0.011, 12), pal.metalDark, [0, top + 0.005, 0]));
  group.add(mesh(cylGeoY(radius * 0.4, radius * 0.44, 0.012, 10), pal.metalWorn, [0, top + 0.016, 0]));
  // Striker lever running down one side.
  if (!opts.pulled) {
    const lever = new THREE.Group();
    lever.position.set(radius * 0.34, top + 0.018, 0);
    group.add(lever);
    lever.add(mesh(roundBoxGeo(0.0075, 0.03, 0.0055, 0.0018, 1), pal.metalWorn, [0, -0.014, 0]));
    lever.add(mesh(roundBoxGeo(0.0085, 0.008, 0.0055, 0.002, 1), pal.metalWorn, [0, 0.002, 0]));
    // Pull ring and its pin through the fuse body.
    group.add(mesh(new THREE.TorusGeometry(0.0072, 0.0013, 6, 14), pal.metalWorn, [-radius * 0.5, top + 0.02, 0], [0, 0, 0]));
    group.add(mesh(cylGeoX(0.0011, radius * 1.1, 8), pal.metalWorn, [0, top + 0.02, 0]));
  }
  return group;
}

export function buildGrenadeModel(pal: GunPalette, kind: ThrowableId, pulled = false): THREE.Group {
  const group = new THREE.Group();
  group.name = `grenade_${kind}`;

  if (kind === 'frag') {
    const r = 0.0295;
    // Ribbed steel body: two hemispheres with a seam and a knurled band.
    group.add(
      mesh(
        latheZ(
          [
            [0.008, 0],
            [r * 0.62, 0.006],
            [r * 0.94, 0.018],
            [r, 0.03],
            [r * 0.94, 0.042],
            [r * 0.62, 0.054],
            [0.009, 0.06],
          ],
          20,
        ),
        pal.polymerDark,
        [0, -0.03, 0],
        [Math.PI / 2, 0, 0],
      ),
    );
    for (let i = 0; i < 5; i++) {
      const y = -0.018 + i * 0.009;
      const ring = Math.sqrt(Math.max(0.0001, r * r - y * y)) * 1.005;
      group.add(mesh(new THREE.TorusGeometry(ring, 0.0011, 5, 18), pal.polymerDark, [0, y, 0], [Math.PI / 2, 0, 0]));
    }
    group.add(fuseAssembly(pal, { top: 0.026, radius: 0.014, pulled }));
  } else if (kind === 'flash') {
    const r = 0.0215;
    group.add(mesh(cylGeoY(r, r, 0.086, 16), pal.metal, [0, 0, 0]));
    group.add(mesh(cylGeoY(r * 1.06, r * 1.06, 0.008, 16), pal.metalDark, [0, 0.038, 0]));
    group.add(mesh(cylGeoY(r * 1.06, r * 1.06, 0.008, 16), pal.metalDark, [0, -0.038, 0]));
    // Emission ports around the body.
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      for (const y of [-0.012, 0.012]) {
        group.add(mesh(cylGeoX(0.0042, 0.004, 8), pal.bore, [Math.cos(a) * r, y, Math.sin(a) * r], [0, -a, 0]));
      }
    }
    group.add(fuseAssembly(pal, { top: 0.042, radius: 0.013, pulled }));
  } else {
    const r = 0.0235;
    group.add(
      mesh(
        latheZ(
          [
            [0.01, 0],
            [r * 0.9, 0.004],
            [r, 0.012],
            [r, 0.104],
            [r * 0.9, 0.112],
            [0.01, 0.116],
          ],
          16,
        ),
        pal.polymer,
        [0, -0.058, 0],
        [Math.PI / 2, 0, 0],
      ),
    );
    // Label band and the burn ports in the top cap.
    group.add(mesh(cylGeoY(r * 1.02, r * 1.02, 0.016, 16), pal.nylon, [0, 0.0, 0]));
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      group.add(mesh(cylGeoY(0.0044, 0.0044, 0.006, 8), pal.bore, [Math.cos(a) * 0.011, 0.058, Math.sin(a) * 0.011]));
    }
    group.add(fuseAssembly(pal, { top: 0.056, radius: 0.013, pulled }));
  }

  return group;
}

/**
 * Empty magazine for the reload drop. Built from the weapon's own magazine group
 * when one exists so the object on the floor is the object that left the gun;
 * this generic body is the fallback for belt-fed and tube-fed weapons.
 */
export function buildGenericMagModel(pal: GunPalette): THREE.Group {
  const group = new THREE.Group();
  group.name = 'droppedMag';
  group.add(mesh(roundBoxGeo(0.026, 0.17, 0.05, 0.005, 2), pal.polymerDark, [0, -0.085, 0]));
  group.add(mesh(boxGeo(0.028, 0.007, 0.052, 0.0012), pal.metalDark, [0, -0.172, 0]));
  return group;
}