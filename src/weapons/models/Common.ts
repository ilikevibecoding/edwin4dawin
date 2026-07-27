import * as THREE from 'three';
import type { Rng } from '../../core/MathUtils';
import { stencilMaterial, type GunPalette } from './Materials';
import { makeSerial, stencilTexture } from './Textures';
import {
  boreGeo,
  boxGeo,
  curvedMagGeo,
  cylGeo,
  cylGeoX,
  cylGeoY,
  discGeo,
  extrudeProfileX,
  latheZ,
  pyramidGeo,
  railGeo,
  ringGeo,
  roundBoxGeo,
  screwGeo,
  strokeProfile,
} from './Parts';

/**
 * Sub-assemblies shared between weapons: muzzle devices, barrels, handguards,
 * magazines, grips, stocks and the small hardware that makes a receiver read as
 * machined rather than extruded. Every weapon builder is composed from these so
 * detail level stays consistent across the arsenal.
 */

function mesh(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  pos?: readonly [number, number, number],
  rot?: readonly [number, number, number],
): THREE.Mesh {
  const m = new THREE.Mesh(geometry, material);
  if (pos) m.position.set(pos[0], pos[1], pos[2]);
  if (rot) m.rotation.set(rot[0], rot[1], rot[2]);
  m.frustumCulled = false;
  m.castShadow = false;
  m.receiveShadow = false;
  return m;
}

// ---------------------------------------------------------------------------
// Muzzle devices
// ---------------------------------------------------------------------------

/**
 * Muzzle devices are authored with their origin at the muzzle exit and their
 * body extending rearward, so a builder can drop one at the bore anchor and be
 * done. `latheZ` profiles run rear-to-front, so each lathe is placed at its own
 * rear offset.
 *
 * A2-pattern flash hider: the slots are gaps between real prongs rather than a
 * texture, and the lower position is solid the way the issued part is, to keep
 * muzzle blast out of the dirt.
 */
export function buildFlashHider(
  pal: GunPalette,
  opts: { bodyR?: number; length?: number; boreR?: number; prongs?: number } = {},
): THREE.Group {
  const bodyR = opts.bodyR ?? 0.0112;
  const length = opts.length ?? 0.05;
  const boreR = opts.boreR ?? 0.0042;
  const prongs = opts.prongs ?? 6;
  const group = new THREE.Group();
  group.name = 'muzzleDevice';

  const collarLen = 0.012;
  group.add(
    mesh(
      latheZ(
        [
          [bodyR * 0.82, 0],
          [bodyR * 1.02, 0.0016],
          [bodyR * 1.02, collarLen - 0.0016],
          [bodyR * 0.86, collarLen],
        ],
        18,
      ),
      pal.metalDark,
      [0, 0, length],
    ),
  );

  const cageLen = length - collarLen - 0.007;
  const cageMid = length - collarLen - cageLen * 0.5;
  group.add(mesh(cylGeo(bodyR * 0.66, bodyR * 0.66, cageLen, 16), pal.metalDark, [0, 0, cageMid]));

  for (let i = 0; i < prongs; i++) {
    const a = (i / prongs) * Math.PI * 2 + Math.PI / prongs;
    if (Math.sin(a) < -0.5) continue; // closed floor
    const r = bodyR * 0.86;
    group.add(
      mesh(
        boxGeo(0.0038, bodyR * 0.44, cageLen, 0.0007),
        pal.metalDark,
        [Math.cos(a) * r, Math.sin(a) * r, cageMid],
        [0, 0, a - Math.PI / 2],
      ),
    );
  }
  group.add(mesh(boxGeo(bodyR * 1.02, bodyR * 0.42, cageLen, 0.0008), pal.metalDark, [0, -bodyR * 0.78, cageMid]));

  group.add(
    mesh(
      latheZ(
        [
          [bodyR * 0.64, 0],
          [bodyR, 0.0018],
          [bodyR, 0.005],
          [bodyR * 0.66, 0.007],
        ],
        18,
      ),
      pal.metal,
      [0, 0, 0.007],
    ),
  );

  group.add(mesh(boreGeo(boreR, 0.055, 16), pal.bore, [0, 0, 0.0004]));
  group.add(mesh(ringGeo(bodyR * 0.62, boreR, 16), pal.metalWorn, [0, 0, 0]));
  return group;
}

/** AK-pattern brake: big lateral ports and an angled compensator face. */
export function buildMuzzleBrake(
  pal: GunPalette,
  opts: { bodyR?: number; length?: number; boreR?: number } = {},
): THREE.Group {
  const bodyR = opts.bodyR ?? 0.0134;
  const length = opts.length ?? 0.076;
  const boreR = opts.boreR ?? 0.0042;
  const group = new THREE.Group();
  group.name = 'muzzleDevice';

  group.add(
    mesh(
      latheZ(
        [
          [bodyR * 0.7, 0],
          [bodyR * 0.94, 0.0022],
          [bodyR * 0.94, 0.017],
          [bodyR * 0.82, 0.021],
        ],
        18,
      ),
      pal.metalDark,
      [0, 0, length],
    ),
  );

  const chamber = length - 0.035;
  const chamberMid = length - 0.021 - chamber * 0.5;
  for (const s of [-1, 1]) {
    group.add(mesh(boxGeo(bodyR * 1.72, 0.0044, chamber, 0.0009), pal.metalDark, [0, s * bodyR * 0.8, chamberMid]));
  }
  group.add(mesh(cylGeo(bodyR * 0.44, bodyR * 0.44, chamber, 14), pal.metalDark, [0, 0, chamberMid]));
  group.add(
    mesh(
      latheZ(
        [
          [bodyR * 0.52, 0],
          [bodyR, 0.0032],
          [bodyR, 0.011],
          [bodyR * 0.54, 0.014],
        ],
        18,
      ),
      pal.metal,
      [0, 0, 0.014],
      [0.12, 0, 0],
    ),
  );
  group.add(mesh(boreGeo(boreR, 0.06, 16), pal.bore, [0, 0, 0.0006]));
  group.add(mesh(ringGeo(bodyR * 0.5, boreR, 16), pal.metalWorn, [0, 0, 0]));
  return group;
}

/** Plain crowned muzzle for pistols, snipers and shotguns. */
export function buildPlainMuzzle(
  pal: GunPalette,
  opts: { bodyR: number; boreR: number; length?: number },
): THREE.Group {
  const length = opts.length ?? 0.018;
  const group = new THREE.Group();
  group.name = 'muzzleDevice';
  group.add(
    mesh(
      latheZ(
        [
          [opts.bodyR, 0],
          [opts.bodyR, length - 0.004],
          [opts.bodyR * 0.93, length - 0.0015],
          [opts.boreR * 1.4, length],
        ],
        18,
      ),
      pal.metalDark,
      [0, 0, length],
    ),
  );
  group.add(mesh(boreGeo(opts.boreR, 0.05, 16), pal.bore, [0, 0, 0.0006]));
  return group;
}

// ---------------------------------------------------------------------------
// Barrels
// ---------------------------------------------------------------------------

/**
 * Barrel with a real thread step under the muzzle device and a chamber shoulder
 * at the breech. The origin is the breech and the profile runs forward, so the
 * muzzle ends up at z = -length.
 */
export function buildBarrel(
  pal: GunPalette,
  opts: {
    length: number;
    breechR: number;
    muzzleR: number;
    threadAt?: number;
    fluted?: boolean;
  },
): THREE.Group {
  const group = new THREE.Group();
  group.name = 'barrel';
  const { length, breechR, muzzleR } = opts;
  const threadAt = opts.threadAt ?? length - 0.024;

  const profile: Array<readonly [number, number]> = [
    [breechR * 0.86, 0],
    [breechR, 0.004],
    [breechR, Math.min(0.03, length * 0.2)],
    [breechR * 0.82, Math.min(0.038, length * 0.26)],
    [muzzleR * 1.06, Math.min(0.09, length * 0.45)],
    [muzzleR, threadAt - 0.004],
  ];
  // Thread ridges: an alternating-radius lathe reads as a cut thread at 20 cm.
  for (let i = 0; i <= 7; i++) {
    profile.push([i % 2 === 0 ? muzzleR * 0.9 : muzzleR * 0.99, threadAt + i * 0.0022]);
  }
  profile.push([muzzleR * 0.88, threadAt + 0.018]);
  group.add(mesh(latheZ(profile, 18), pal.metalDark));

  if (opts.fluted) {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      group.add(
        mesh(
          cylGeo(muzzleR * 0.26, muzzleR * 0.26, length * 0.4, 8),
          pal.bore,
          [Math.cos(a) * muzzleR * 0.96, Math.sin(a) * muzzleR * 0.96, -length * 0.55],
        ),
      );
    }
  }
  return group;
}

/** Gas block with a front sight tower option. */
export function buildGasBlock(
  pal: GunPalette,
  opts: { width?: number; height?: number; depth?: number; tube?: number } = {},
): THREE.Group {
  const w = opts.width ?? 0.022;
  const h = opts.height ?? 0.028;
  const d = opts.depth ?? 0.03;
  const group = new THREE.Group();
  group.name = 'gasBlock';
  group.add(mesh(boxGeo(w, h, d, 0.0016), pal.metalDark, [0, h * 0.5 - 0.012, 0]));
  group.add(mesh(screwGeo(0.0024, 0.0012), pal.metalWorn, [w * 0.28, h - 0.012, d * 0.28]));
  group.add(mesh(screwGeo(0.0024, 0.0012), pal.metalWorn, [-w * 0.28, h - 0.012, d * 0.28]));
  // Gas tube runs rearward from the block to the receiver, under the handguard.
  if (opts.tube) {
    group.add(mesh(cylGeo(0.0028, 0.0028, opts.tube, 10), pal.metalWorn, [0, 0.011, opts.tube * 0.5]));
  }
  return group;
}

// ---------------------------------------------------------------------------
// Handguards
// ---------------------------------------------------------------------------

/**
 * Free-float handguard: a faceted tube, a full-length top rail with real teeth
 * and rows of M-LOK slots. The slots are inset dark boxes — at viewmodel range
 * a recessed box reads as a hole, and it costs a fraction of real cut geometry.
 */
export function buildHandguard(
  pal: GunPalette,
  opts: {
    length: number;
    radius: number;
    rail?: boolean;
    slotRows?: number;
    facets?: number;
    material?: THREE.Material;
  },
): THREE.Group {
  const group = new THREE.Group();
  group.name = 'handguard';
  const mat = opts.material ?? pal.polymer;
  const facets = opts.facets ?? 14;
  const r = opts.radius;
  const len = opts.length;

  group.add(
    mesh(
      latheZ(
        [
          [r * 0.86, 0],
          [r, 0.008],
          [r, len - 0.012],
          [r * 0.97, len - 0.004],
          [r * 0.84, len],
        ],
        facets,
      ),
      mat,
      [0, 0, 0],
    ),
  );
  // Barrel nut collar at the receiver end.
  group.add(
    mesh(
      latheZ(
        [
          [r * 0.9, 0],
          [r * 1.08, 0.004],
          [r * 1.08, 0.016],
          [r * 0.92, 0.02],
        ],
        facets,
      ),
      pal.metalDark,
      [0, 0, 0.02],
    ),
  );

  if (opts.rail !== false) {
    const rail = mesh(railGeo(len * 0.94), pal.metal, [0, r * 0.99, -len * 0.5]);
    group.add(rail);
  }

  const rows = opts.slotRows ?? 3;
  const slotCount = Math.max(2, Math.floor(len / 0.038));
  for (let row = 0; row < rows; row++) {
    // Sides and bottom; the top carries the rail.
    const angle = rows === 3 ? [Math.PI, Math.PI * 0.5, Math.PI * 1.5][row] : [Math.PI, Math.PI * 0.5][row];
    const ca = Math.cos(angle);
    const sa = Math.sin(angle);
    for (let i = 0; i < slotCount; i++) {
      const z = -len * 0.16 - i * 0.038;
      if (z < -len + 0.03) break;
      group.add(
        mesh(
          boxGeo(0.0075, 0.0075, 0.026, 0.0018),
          pal.bore,
          [sa * (r - 0.0022), ca * (r - 0.0022), z],
          [0, 0, angle],
        ),
      );
    }
  }
  return group;
}

/** Ribbed polymer forend for the shotgun and the AK-style lower handguard. */
export function buildRibbedForend(
  pal: GunPalette,
  opts: { length: number; width: number; height: number; ribs?: number; material?: THREE.Material },
): THREE.Group {
  const group = new THREE.Group();
  const mat = opts.material ?? pal.polymer;
  group.add(mesh(roundBoxGeo(opts.width, opts.height, opts.length, Math.min(opts.width, opts.height) * 0.3, 2), mat, [0, 0, -opts.length * 0.5]));
  const ribs = opts.ribs ?? 6;
  for (let i = 0; i < ribs; i++) {
    const z = -0.012 - (i * (opts.length - 0.02)) / ribs;
    group.add(
      mesh(
        boxGeo(opts.width * 1.03, opts.height * 0.82, 0.0055, 0.0012),
        mat,
        [0, 0, z],
      ),
    );
  }
  return group;
}

// ---------------------------------------------------------------------------
// Magazines
// ---------------------------------------------------------------------------

/** Point on the magazine's sweep arc at 0..1 along its length. */
function magPoint(length: number, curve: number, t: number): { y: number; z: number; angle: number } {
  if (curve < 1e-4) return { y: -length * t, z: 0, angle: 0 };
  const r = length / curve;
  const a = curve * t;
  return { y: -r * Math.sin(a), z: -r * (1 - Math.cos(a)), angle: a };
}

export function buildStanagMag(
  pal: GunPalette,
  opts: { length?: number; curve?: number; width?: number; depth?: number; material?: THREE.Material } = {},
): THREE.Group {
  const length = opts.length ?? 0.19;
  const width = opts.width ?? 0.027;
  const depth = opts.depth ?? 0.06;
  const curve = opts.curve ?? 0.34;
  const mat = opts.material ?? pal.polymerDark;
  const group = new THREE.Group();
  group.name = 'magazine';
  group.add(mesh(curvedMagGeo({ width, depth, length, curve, taper: 0.97, segments: 10 }), mat));

  // Feed lips and floorplate: the two places a magazine reads as pressed sheet.
  group.add(mesh(boxGeo(width * 1.06, 0.008, depth * 0.96, 0.0014), pal.metalDark, [0, -0.004, 0]));
  // Floorplate has to sit square on the swept bottom face, so it takes the
  // tangent angle of the arc rather than its negation.
  const end = magPoint(length, curve, 1);
  group.add(
    mesh(
      boxGeo(width * 1.09, 0.0075, depth * 1.01, 0.0018),
      mat,
      [0, end.y + 0.0034, end.z],
      [end.angle, 0, 0],
    ),
  );
  // Witness holes down the right side.
  for (let i = 0; i < 4; i++) {
    const p = magPoint(length, curve, 0.22 + i * 0.18);
    group.add(mesh(boxGeo(0.0022, 0.0062, 0.0062, 0.0006), pal.bore, [width * 0.5 - 0.0008, p.y, p.z]));
  }
  return group;
}

/** Straight box magazine for pistols and SMGs. */
export function buildStickMag(
  pal: GunPalette,
  opts: { length: number; width: number; depth: number; curve?: number; material?: THREE.Material },
): THREE.Group {
  const group = new THREE.Group();
  group.name = 'magazine';
  const mat = opts.material ?? pal.metalDark;
  group.add(
    mesh(
      curvedMagGeo({
        width: opts.width,
        depth: opts.depth,
        length: opts.length,
        curve: opts.curve ?? 0.06,
        taper: 0.99,
        segments: 6,
      }),
      mat,
    ),
  );
  group.add(mesh(boxGeo(opts.width * 1.12, 0.006, opts.depth * 1.05, 0.0012), pal.polymerDark, [0, -opts.length + 0.003, -0.002]));
  return group;
}

// ---------------------------------------------------------------------------
// Grips, triggers, stocks
// ---------------------------------------------------------------------------

export interface GripResult {
  group: THREE.Group;
  /** Anchor for the firing hand, +Y up the grip. */
  anchor: THREE.Object3D;
  radius: number;
}

export function buildPistolGrip(
  pal: GunPalette,
  opts: {
    length?: number;
    radius?: number;
    rake?: number;
    material?: THREE.Material;
    beavertail?: boolean;
  } = {},
): GripResult {
  const length = opts.length ?? 0.108;
  const radius = opts.radius ?? 0.0185;
  const rake = opts.rake ?? 0.3;
  const mat = opts.material ?? pal.polymer;
  const group = new THREE.Group();
  group.name = 'pistolGrip';

  const column = new THREE.Group();
  column.rotation.x = -rake;
  group.add(column);

  // The column is a single extruded silhouette: front strap scalloped for the
  // fingers, a palm swell at the rear and a flare into the butt. Raised rings for
  // the finger grooves read as a stack of beads, so the grooves are cut into the
  // profile instead — concave, which is what a hand actually leaves in a grip.
  const front = -radius * 0.98;
  const back = radius * 1.05;
  const outline: Array<readonly [number, number]> = [
    [back * 0.7, 0.004],
    [back, -length * 0.1],
    [back * 1.12, -length * 0.3],
    [back * 1.16, -length * 0.62],
    [back * 1.04, -length * 0.9],
    [back * 1.1, -length],
    [front * 1.12, -length],
    [front * 1.02, -length * 0.9],
  ];
  for (let i = 3; i >= 0; i--) {
    const y = -length * (0.24 + i * 0.166);
    outline.push([front * 1.02, y - length * 0.055]);
    outline.push([front * 0.82, y]);
  }
  outline.push([front * 0.94, -length * 0.14]);
  outline.push([front * 0.72, 0.004]);
  column.add(mesh(extrudeProfileX(outline, radius * 1.6, radius * 0.34), mat));
  // Stippled side panels. Raised pyramids rather than a texture: the grip is the
  // part of the gun nearest the camera and a painted checker reads as painted.
  const stipple = pyramidGeo(radius * 0.095, radius * 0.055);
  for (const s of [-1, 1]) {
    for (let row = 0; row < 10; row++) {
      for (let col = 0; col < 5; col++) {
        const y = -length * (0.2 + row * 0.066);
        const z = (col - 2) * radius * 0.33 + (row % 2 ? radius * 0.165 : 0);
        column.add(
          mesh(stipple, mat, [s * radius * 0.82, y, z], [0, 0, s * -Math.PI / 2]),
        );
      }
    }
  }
  // Butt cap with a lanyard loop.
  column.add(mesh(boxGeo(radius * 1.7, 0.006, radius * 2.1, 0.0015), pal.polymerDark, [0, -length - 0.002, 0]));
  if (opts.beavertail !== false) {
    column.add(mesh(roundBoxGeo(radius * 1.5, 0.022, 0.012, 0.004, 2), mat, [0, 0.006, radius * 0.95]));
  }

  const anchor = new THREE.Object3D();
  anchor.name = 'gripAnchor';
  anchor.position.set(0, -length * 0.44, 0);
  anchor.rotation.x = -rake;
  group.add(anchor);
  return { group, anchor, radius };
}

export function buildTriggerGroup(
  pal: GunPalette,
  opts: { guardDepth?: number; width?: number; bar?: number; drop?: number } = {},
): { guard: THREE.Group; trigger: THREE.Group } {
  const depth = opts.guardDepth ?? 0.042;
  const width = opts.width ?? 0.026;
  const bar = opts.bar ?? 0.0058;
  const guard = new THREE.Group();
  guard.name = 'triggerGuard';

  // One continuous bow rather than three boxes. The centreline leaves the frame
  // vertically at both tangs so the guard reads as bent bar stock, and the low
  // point sits forward of centre where a finger actually rests.
  const half = depth * 0.5;
  const drop = opts.drop ?? 0.0295;
  const centre: Array<readonly [number, number]> = [[-half, -0.008]];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    const bell = Math.sin(Math.PI * t) ** 0.42;
    centre.push([-half + depth * t, -0.011 - (drop - 0.011) * bell]);
  }
  centre.push([half, -0.0075]);
  guard.add(mesh(extrudeProfileX(strokeProfile(centre, bar), width, 0.0014), pal.metalDark));

  const trigger = new THREE.Group();
  trigger.name = 'trigger';
  // Shoe: a flat-faced blade with a rolled toe, curved back towards the shooter.
  trigger.add(
    mesh(
      extrudeProfileX(
        strokeProfile(
          [
            [0.0016, -0.0015],
            [0.0004, -0.007],
            [-0.0012, -0.0125],
            [-0.0036, -0.0168],
            [-0.0064, -0.0186],
          ],
          0.0042,
        ),
        0.0055,
        0.0009,
      ),
      pal.metalWorn,
    ),
  );
  return { guard, trigger };
}

export function buildCollapsibleStock(
  pal: GunPalette,
  opts: { tubeLength?: number; bodyLength?: number; radius?: number } = {},
): THREE.Group {
  const tubeLength = opts.tubeLength ?? 0.19;
  const bodyLength = opts.bodyLength ?? 0.105;
  const r = opts.radius ?? 0.0165;
  const group = new THREE.Group();
  group.name = 'stock';

  group.add(mesh(cylGeo(r, r, tubeLength, 16), pal.metalDark, [0, 0, tubeLength * 0.5]));
  // Castle nut and end plate.
  const knurl: Array<readonly [number, number]> = [];
  for (let i = 0; i <= 8; i++) knurl.push([i % 2 === 0 ? r * 1.12 : r * 1.22, i * 0.0016]);
  group.add(mesh(latheZ(knurl, 20), pal.metal, [0, 0, 0.014]));
  // Position detents along the underside of the tube.
  for (let i = 0; i < 5; i++) {
    group.add(mesh(boxGeo(0.007, 0.0035, 0.0075, 0.0009), pal.metalDark, [0, -r - 0.001, 0.05 + i * 0.024]));
  }

  const body = new THREE.Group();
  body.position.z = tubeLength - bodyLength * 0.72;
  group.add(body);

  // One extruded silhouette rather than a stack of boxes: a collapsible stock is
  // read almost entirely from its profile — the ramp up to the comb, the notch
  // where the cheek sits and the drop to the toe — and any seam between separate
  // boxes shows up as a step from 30 cm away.
  const w = 0.036;
  const L = bodyLength;
  const top = r + 0.008;
  const toe = -r - 0.016;
  body.add(
    mesh(
      extrudeProfileX(
        [
          [0, r * 0.5],
          [L * 0.16, top - 0.003],
          [L * 0.28, top],
          [L * 0.88, top],
          [L * 0.96, top - 0.005],
          [L * 0.985, r * 0.1],
          [L * 0.985, toe + 0.006],
          [L * 0.92, toe],
          [L * 0.62, toe + 0.003],
          [L * 0.34, -r - 0.003],
          [L * 0.12, -r * 0.8],
          [0, -r * 0.5],
        ],
        w,
        0.0035,
      ),
      pal.polymer,
    ),
  );
  // Cheek rest riding above the comb, and the butt plate with its rubber pad.
  body.add(mesh(roundBoxGeo(w * 0.64, 0.009, L * 0.52, 0.003, 2), pal.polymer, [0, top + 0.0035, L * 0.6]));
  const buttPlate: ReadonlyArray<readonly [number, number]> = [
    [0, top - 0.004],
    [0.012, top - 0.003],
    [0.012, toe + 0.006],
    [0, toe + 0.005],
  ];
  body.add(mesh(extrudeProfileX(buttPlate, w * 0.96, 0.0025), pal.polymerDark, [0, 0, L * 0.98]));
  body.add(
    mesh(
      extrudeProfileX(
        [
          [0, top - 0.009],
          [0.011, top - 0.016],
          [0.011, toe + 0.017],
          [0, toe + 0.011],
        ],
        w * 0.9,
        0.003,
      ),
      pal.rubber,
      [0, 0, L * 0.995],
    ),
  );
  // Release lever hanging off the underside of the tube collar.
  body.add(mesh(roundBoxGeo(0.012, 0.02, 0.03, 0.0035, 2), pal.polymerDark, [0, toe + 0.004, L * 0.2]));
  // Lightening cuts, sling loops, and the ribs that break up the side.
  //
  // The flank of a butt stock is the largest single flat area on a carbine and it
  // sits a hand's width from the camera when hipfiring, so left plain it reads as
  // an untextured slab whatever material is on it. Two raised ribs with a recessed
  // panel between them cost 300 triangles and give the face three shadow lines,
  // which is the whole difference.
  for (const s of [-1, 1]) {
    const x = s * w * 0.5;
    body.add(mesh(roundBoxGeo(0.004, 0.014, 0.03, 0.0035, 1), pal.bore, [s * w * 0.48, -r * 0.1, L * 0.5]));
    body.add(mesh(roundBoxGeo(0.0034, 0.0075, L * 0.62, 0.0012, 1), pal.polymer, [x, top - 0.011, L * 0.58]));
    body.add(mesh(roundBoxGeo(0.0034, 0.0065, L * 0.5, 0.0012, 1), pal.polymer, [x, toe + 0.012, L * 0.62]));
    body.add(mesh(boxGeo(0.0016, 0.019, L * 0.5, 0.0004), pal.polymerDark, [s * w * 0.485, -r * 0.15, L * 0.62]));
    // QD swivel socket in the flat behind the comb.
    body.add(
      mesh(latheZ([[0.0062, 0], [0.0062, 0.0022], [0.004, 0.0026], [0.0036, 0.0006]], 12), pal.metalDark,
        [x, top - 0.02, L * 0.3], [0, s * Math.PI / 2, 0]),
    );
    body.add(
      mesh(
        new THREE.TorusGeometry(0.0062, 0.002, 6, 12),
        pal.metalDark,
        [s * w * 0.4, toe + 0.007, L * 0.78],
        [0, Math.PI / 2, 0],
      ),
    );
  }
  return group;
}

/**
 * Straight butt-stock for a weapon that already has a separate pistol grip — an
 * AK pattern or an MP5.
 *
 * There is no wrist on these: the stock is a tapered block bolted to the back of
 * the receiver, with a butt plate and a sling slot. Giving it the grip swell of a
 * one-piece stock puts material exactly where the firing hand already is.
 */
export function buildBlockStock(
  pal: GunPalette,
  opts: {
    length: number;
    material?: THREE.Material;
    frontHeight?: number;
    buttHeight?: number;
    rise?: number;
    width?: number;
  },
): THREE.Group {
  const group = new THREE.Group();
  group.name = 'stock';
  const mat = opts.material ?? pal.wood;
  const L = opts.length;
  const h0 = (opts.frontHeight ?? 0.05) * 0.5;
  const h1 = (opts.buttHeight ?? 0.062) * 0.5;
  const rise = opts.rise ?? 0.012;
  const width = opts.width ?? 0.036;

  group.add(
    mesh(
      extrudeProfileX(
        [
          [0, h0],
          [L * 0.45, h0 + rise * 0.62],
          [L * 0.9, h1 + rise],
          [L * 0.965, h1 + rise - 0.006],
          [L * 0.965, -h1 + 0.006],
          [L * 0.9, -h1],
          [L * 0.45, -h0 - (h1 - h0) * 0.5],
          [0, -h0],
        ],
        width,
        0.005,
      ),
      mat,
    ),
  );
  // Butt plate with a sling slot cut through the toe.
  group.add(mesh(roundBoxGeo(width * 0.99, h1 * 2 - 0.004, 0.008, 0.0025, 1), pal.metalDark, [0, rise * 0.5, L * 0.972]));
  group.add(mesh(boxGeo(width * 0.55, 0.008, 0.03, 0.0012), pal.bore, [0, -h1 + 0.012, L * 0.72]));
  return group;
}

/**
 * One-piece stock with a wrist, a comb and a dropped butt, extruded from its
 * side profile.
 *
 * The read of a shotgun or a rifle stock is entirely its profile: the wrist
 * pinches in behind the trigger, the comb runs back and slightly down to the
 * heel, and the toe drops well below the bore. Stacking boxes gets none of that
 * and leaves the weapon looking like a length of pipe, so the whole silhouette
 * is one closed profile with the grip swell included.
 */
export function buildFixedStock(
  pal: GunPalette,
  opts: { length: number; material?: THREE.Material; comb?: number; drop?: number },
): THREE.Group {
  const group = new THREE.Group();
  group.name = 'stock';
  const mat = opts.material ?? pal.wood;
  const L = opts.length;
  // Heel/toe spread at the butt. A shotgun drops hard; an SMG tube barely does.
  const drop = opts.drop ?? 0.055;
  const heel = 0.03;
  const width = 0.036;

  // Profile in [rearward, up], travelling along the comb and back under the
  // grip. The wrist pinch sits near the front so the firing hand, which is
  // anchored just behind the trigger, closes on solid material.
  const profile: Array<readonly [number, number]> = [
    [0, 0.026],
    [L * 0.32, 0.03],
    [L * 0.66, 0.028],
    [L * 0.93, heel],
    [L * 0.96, heel - 0.007],
    [L * 0.96, -drop + 0.009],
    [L * 0.92, -drop],
    [L * 0.68, -drop * 0.74],
    [L * 0.42, -drop * 0.4],
    [L * 0.26, -0.042],
    [L * 0.17, -0.048],
    [L * 0.08, -0.042],
    [0, -0.03],
  ];
  group.add(mesh(extrudeProfileX(profile, width, 0.006), mat, [0, 0, 0]));

  // Recoil pad, following the butt angle.
  const padProfile: Array<readonly [number, number]> = [
    [0, heel - 0.004],
    [0.013, heel - 0.008],
    [0.013, -drop + 0.01],
    [0, -drop + 0.006],
  ];
  group.add(mesh(extrudeProfileX(padProfile, width * 0.98, 0.003), pal.rubber, [0, 0, L * 0.955]));
  // Checkered panel on the wrist.
  for (const s of [-1, 1]) {
    group.add(
      mesh(roundBoxGeo(0.004, 0.026, 0.046, 0.0016, 1), pal.polymerDark, [s * width * 0.49, -0.03, L * 0.18]),
    );
  }
  if (opts.comb) {
    group.add(mesh(roundBoxGeo(0.03, 0.016, L * 0.34, 0.006, 2), mat, [0, heel + 0.012, L * 0.66]));
  }
  return group;
}

// ---------------------------------------------------------------------------
// Hardware details
// ---------------------------------------------------------------------------

/** QD sling swivel socket. */
export function buildQdSocket(pal: GunPalette): THREE.Group {
  const group = new THREE.Group();
  group.name = 'slingMount';
  group.add(mesh(cylGeoX(0.0058, 0.005, 12), pal.metalDark));
  group.add(mesh(cylGeoX(0.0032, 0.0062, 10), pal.bore));
  return group;
}

export function buildSlingLoop(pal: GunPalette, radius = 0.008): THREE.Group {
  const group = new THREE.Group();
  group.name = 'slingMount';
  group.add(mesh(new THREE.TorusGeometry(radius, radius * 0.28, 6, 14), pal.metalDark, [0, 0, 0], [0, Math.PI / 2, 0]));
  return group;
}

/** Takedown / pivot pin head, the detail that dates an AR receiver. */
export function buildTakedownPin(pal: GunPalette, radius = 0.0038): THREE.Mesh {
  return mesh(cylGeoX(radius, 0.0038, 12), pal.metalWorn);
}

export function buildRollPin(pal: GunPalette, radius = 0.0016): THREE.Mesh {
  return mesh(cylGeoX(radius, 0.004, 8), pal.bore);
}

/** Brass case visible in the chamber when a round is loaded. */
export function buildChamberedCase(pal: GunPalette, caliber: 'rifle' | 'pistol' | 'shotgun'): THREE.Group {
  const group = new THREE.Group();
  group.name = 'chamberedCase';
  if (caliber === 'shotgun') {
    group.add(mesh(cylGeo(0.0092, 0.0092, 0.03, 12), pal.polymerDark, [0, 0, -0.01]));
    group.add(mesh(cylGeo(0.0096, 0.0096, 0.009, 12), pal.brass, [0, 0, 0.01]));
  } else {
    const r = caliber === 'rifle' ? 0.0047 : 0.0048;
    const len = caliber === 'rifle' ? 0.038 : 0.019;
    group.add(
      mesh(
        latheZ(
          [
            [r * 1.06, 0],
            [r * 1.06, 0.004],
            [r, 0.008],
            [r, len * 0.62],
            [r * 0.72, len * 0.78],
            [r * 0.66, len],
          ],
          12,
        ),
        pal.brass,
        [0, 0, len * 0.5],
      ),
    );
  }
  return group;
}

/** Selector markings, calibre stencil and serial number. */
export function addMarkings(
  parent: THREE.Object3D,
  pal: GunPalette,
  rng: Rng,
  opts: {
    /** Local position of the decal centre. */
    pos: readonly [number, number, number];
    /** Which way the decal faces: 'left' | 'right' | 'top'. */
    face: 'left' | 'right' | 'top';
    lines: readonly string[];
    height?: number;
    color?: number;
  },
): void {
  const { texture, aspect } = stencilTexture(opts.lines, {
    scale: 4,
    wear: 0.2 + rng.next() * 0.3,
    seed: rng.int(1, 9999),
    color: opts.color ?? 0xcfcabd,
  });
  const height = opts.height ?? 0.0042 * opts.lines.length;
  const plane = new THREE.PlaneGeometry(height * aspect, height);
  const decal = new THREE.Mesh(plane, stencilMaterial(texture));
  decal.frustumCulled = false;
  decal.renderOrder = 2;
  if (opts.face === 'left') decal.rotation.y = -Math.PI / 2;
  else if (opts.face === 'right') decal.rotation.y = Math.PI / 2;
  else decal.rotation.x = -Math.PI / 2;
  decal.position.set(opts.pos[0], opts.pos[1], opts.pos[2]);
  void pal;
  parent.add(decal);
}

export function addSerial(parent: THREE.Object3D, pal: GunPalette, rng: Rng, pos: readonly [number, number, number], face: 'left' | 'right'): void {
  addMarkings(parent, pal, rng, {
    pos,
    face,
    lines: [makeSerial(rng)],
    height: 0.0032,
    color: 0xb9b3a6,
  });
}

/**
 * Randomised wear: small dark scuffs on high-contact surfaces, plus a few
 * bright rub-through patches on edges. Two instances of the same weapon should
 * never wear identically.
 */
export function addWear(
  parent: THREE.Object3D,
  pal: GunPalette,
  rng: Rng,
  opts: { count?: number; area: readonly [number, number, number]; center?: readonly [number, number, number] },
): void {
  const count = opts.count ?? 6;
  const c = opts.center ?? [0, 0, 0];
  const material = pal.metalWorn;
  for (let i = 0; i < count; i++) {
    const w = rng.range(0.002, 0.006);
    const h = rng.range(0.0012, 0.0035);
    const patch = mesh(
      boxGeo(w, h, 0.0009, 0.0003),
      material,
      [
        c[0] + rng.range(-opts.area[0], opts.area[0]),
        c[1] + rng.range(-opts.area[1], opts.area[1]),
        c[2] + rng.range(-opts.area[2], opts.area[2]),
      ],
      [0, rng.range(-0.3, 0.3), rng.range(-0.4, 0.4)],
    );
    parent.add(patch);
  }
}

/** Bipod for the LMG: two folding legs under the gas system. */
export function buildBipod(pal: GunPalette, opts: { legLength?: number } = {}): THREE.Group {
  const legLength = opts.legLength ?? 0.16;
  const group = new THREE.Group();
  group.name = 'bipod';
  group.add(mesh(roundBoxGeo(0.022, 0.016, 0.03, 0.005, 1), pal.metalDark, [0, -0.006, 0]));
  for (const s of [-1, 1]) {
    const leg = new THREE.Group();
    leg.position.set(s * 0.008, -0.012, 0.004);
    leg.rotation.z = s * 0.12;
    group.add(leg);
    leg.add(mesh(cylGeo(0.0032, 0.0038, legLength, 8), pal.metalDark, [0, -legLength * 0.5, 0], [Math.PI / 2, 0, 0]));
    leg.add(mesh(roundBoxGeo(0.009, 0.005, 0.014, 0.002, 1), pal.rubber, [0, -legLength, 0.002]));
  }
  return group;
}

export function buildEjectionPort(
  pal: GunPalette,
  opts: { width?: number; height?: number; side?: 1 | -1 },
): { port: THREE.Group; cover: THREE.Group } {
  const w = opts.width ?? 0.034;
  const h = opts.height ?? 0.016;
  const side = opts.side ?? 1;
  const port = new THREE.Group();
  port.name = 'ejectionPort';
  // The recess is a dark box set INTO the receiver wall (thin on x, long on z), with
  // a machined lip proud of it. Orientation matters: a port lying across the
  // receiver instead of along it reads as a plate bolted to the side.
  port.add(mesh(boxGeo(0.005, h, w, 0.0008), pal.bore, [side * -0.0022, 0, 0]));
  port.add(mesh(boxGeo(0.0022, h + 0.005, w + 0.006, 0.0006), pal.metalDark, [side * -0.0018, 0, 0]));
  // Brass deflector behind the port, angled to throw cases clear.
  port.add(
    mesh(boxGeo(0.0055, h * 0.7, 0.012, 0.0016), pal.metal, [side * 0.0012, 0.0015, w * 0.5 + 0.005], [0, side * -0.5, 0]),
  );

  const cover = new THREE.Group();
  cover.name = 'dustCover';
  cover.add(mesh(boxGeo(0.0026, h * 0.98, w, 0.0007), pal.metal, [side * 0.0014, -h * 0.5, 0]));
  cover.add(mesh(cylGeo(0.0015, 0.0015, w * 1.04, 8), pal.metalDark, [side * 0.0014, 0, 0]));
  return { port, cover };
}

export { mesh as partMesh };
