import * as THREE from 'three';
import type { Rng } from '../../core/MathUtils';
import { blackoutMaterial, reticleMaterial, type GunPalette } from './Materials';
import { APERTURE_MASK_OVERLAP } from '../ScopeView';
import { addMarkings } from './Common';
import {
  boxGeo,
  cylGeoX,
  cylGeoY,
  discGeo,
  latheZ,
  ringGeo,
  screwGeo,
  tubeInnerGeo,
} from './Parts';
import type { ReticleSpec } from './WeaponModel';

/**
 * Optics.
 *
 * The hard part of a first-person optic is not the housing, it is the reticle.
 * A reticle painted on the glass slides around as the eye moves, which reads
 * wrong immediately. Collimated sights therefore return a reticle marked
 * `parallaxFree` and the viewmodel re-projects it every frame so its apparent
 * direction is the sight axis and nothing else — the same trick the real optic
 * plays with a collimating mirror. Magnified optics keep their reticle inside
 * the tube, where a little parallax is correct behaviour, and get a black-out
 * annulus at the ocular so the glass reads as glass.
 *
 * Convention: the optic group's origin sits on its mounting plane (the top of
 * the rail), -Z is downrange, and `sight` marks the point the eye lines up on.
 */

export interface OpticResult {
  group: THREE.Group;
  sight: THREE.Object3D;
  reticle: ReticleSpec;
  /** Height of the sight axis above the mounting plane. */
  axisHeight: number;
  /** Distance from the eye to the sight anchor when aiming. */
  eyeRelief: number;
}

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
  return m;
}

function mountBlock(
  group: THREE.Group,
  pal: GunPalette,
  width: number,
  height: number,
  depth: number,
  z = 0,
): void {
  group.add(mesh(boxGeo(width, height, depth, 0.0018), pal.metal, [0, height * 0.5, z]));
  group.add(mesh(cylGeoX(0.0028, width * 1.3, 10), pal.metalDark, [0, height * 0.34, z + depth * 0.2]));
  group.add(mesh(cylGeoX(0.0062, 0.0042, 12), pal.metalWorn, [-width * 0.66, height * 0.34, z + depth * 0.2]));
  group.add(mesh(screwGeo(0.0024, 0.0012), pal.metalDark, [width * 0.24, height, z - depth * 0.3]));
}

/** Lens: a coated disc set behind a machined rim so it catches an edge light. */
function lens(group: THREE.Group, pal: GunPalette, radius: number, z: number, cant = 0.08): void {
  const glass = mesh(discGeo(radius, 24), pal.glass, [0, 0, z], [cant, 0, 0]);
  glass.renderOrder = 4;
  group.add(glass);
  group.add(mesh(ringGeo(radius * 1.14, radius * 0.98, 24), pal.metalDark, [0, 0, z]));
}

/**
 * Ocular disc for a magnified optic: the surface the sight picture is shown on.
 *
 * This is the one place a weapon model deliberately stops being a model. A scope
 * is a pipe, and the far end of a 250 mm tube with a 40 mm objective subtends
 * about four degrees from the eye, so drawing an honest interior gives a peephole
 * no matter how wide the ocular is — and a hole does not magnify anyway. Instead
 * the tube is left hollow and capped at the eye end by this disc, which the
 * viewmodel hands a narrow-FOV render of the world (see ScopeView). Everything
 * bolted to the outside of the tube is then correctly hidden behind it, and the
 * blackout annulus frames it.
 *
 * Returned rather than added so the caller can register it as the aperture.
 */
function ocularDisc(group: THREE.Group, pal: GunPalette, radius: number, z: number): THREE.Mesh {
  // Faces +Z, towards the eye, and keeps CircleGeometry's untouched UVs so the
  // sight picture is not mirrored when the scope render is mapped onto it.
  const disc = mesh(new THREE.CircleGeometry(radius, 48), pal.glass, [0, 0, z]);
  disc.name = 'ocularDisc';
  disc.renderOrder = 3;
  group.add(disc);
  return disc;
}

function makeReticle(
  kind: 'dot' | 'holo' | 'chevron' | 'crosshair',
  size: number,
  glassDistance: number,
  rng: Rng,
): ReticleSpec {
  const material = reticleMaterial(kind);
  // Per-unit brightness-setting variation. It has to ride on the radiance, not on
  // `opacity`: the viewmodel rewrites opacity every frame from the eyebox fade,
  // so anything stored there is overwritten before the first frame is drawn.
  material.color.multiplyScalar(0.88 + rng.next() * 0.22);
  const object = mesh(new THREE.PlaneGeometry(size, size), material);
  object.name = `reticle_${kind}`;
  object.renderOrder = 9;
  return {
    object,
    material,
    parallaxFree: true,
    authoredPosition: new THREE.Vector3(),
    glassDistance,
    eyebox: 0.075,
    baseScale: 1,
  };
}

/**
 * Eye-relief black-out. Growing this annulus inwards as the eye leaves the
 * optical axis reproduces scope shadow, the cue that tells a player they are not
 * properly behind the glass.
 *
 * The outer radius has to overrun the ocular bell by a long way to reach the
 * corners of the screen once the eye is up against it, so the ViewModel fades
 * this in only over the last part of the ADS blend — otherwise it is a black
 * blade sticking out of both sides of the scope.
 */
function scopeShadow(
  inner: number,
  outer: number,
  z: number,
): THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial> {
  // Sits on the ocular plane so its hole is exactly the aperture, and carries
  // enough segments that the inner edge does not read as a polygon at the size
  // it covers the screen.
  const m = mesh(ringGeo(outer, inner, 96), blackoutMaterial(), [0, 0, z]) as THREE.Mesh<
    THREE.BufferGeometry,
    THREE.MeshBasicMaterial
  >;
  m.name = 'scopeShadow';
  m.renderOrder = 7;
  m.visible = false;
  return m;
}

// ---------------------------------------------------------------------------
// Collimated sights
// ---------------------------------------------------------------------------

/** 30 mm tube red dot on a lower-third mount. */
export function buildRedDot(pal: GunPalette, rng: Rng): OpticResult {
  const group = new THREE.Group();
  group.name = 'optic';
  const mountH = 0.024;
  const tubeR = 0.0158;
  const axisHeight = mountH + tubeR;
  const zRear = 0.032;
  const zFront = -0.036;

  mountBlock(group, pal, 0.026, mountH, 0.05, -0.002);

  const tube = new THREE.Group();
  tube.position.set(0, axisHeight, 0);
  group.add(tube);

  tube.add(
    mesh(
      latheZ(
        [
          [tubeR * 0.74, 0],
          [tubeR * 0.99, 0.004],
          [tubeR, 0.009],
          [tubeR, 0.02],
          [tubeR * 1.11, 0.023],
          [tubeR * 1.11, 0.04],
          [tubeR, 0.043],
          [tubeR, zRear - zFront - 0.009],
          [tubeR * 0.99, zRear - zFront - 0.004],
          [tubeR * 0.76, zRear - zFront],
        ],
        22,
      ),
      pal.metal,
      [0, 0, zRear],
    ),
  );
  tube.add(mesh(tubeInnerGeo(tubeR * 0.9, zRear - zFront - 0.01, 20), pal.bore, [0, 0, zFront + 0.006]));
  lens(tube, pal, tubeR * 0.88, zFront + 0.004, 0.1);
  lens(tube, pal, tubeR * 0.88, zRear - 0.004, -0.07);

  tube.add(mesh(cylGeoY(0.0068, 0.0074, 0.0092, 14), pal.metalDark, [0, tubeR + 0.003, 0.006]));
  tube.add(mesh(cylGeoX(0.0066, 0.0094, 14), pal.metalDark, [tubeR + 0.003, 0, 0.006]));
  tube.add(mesh(cylGeoX(0.0084, 0.0078, 16), pal.metalWorn, [-tubeR - 0.002, 0, 0.006]));
  // Brightness rocker on the left of the housing.
  tube.add(mesh(boxGeo(0.005, 0.0075, 0.013, 0.001), pal.rubber, [-tubeR - 0.004, -0.004, -0.012]));

  const sight = new THREE.Object3D();
  sight.name = 'sight';
  sight.position.set(0, axisHeight, zRear - 0.004);
  group.add(sight);

  // Open sights are parked far enough out that the housing reads at a plausible
  // size and the receiver stays in shot. Physical cheek weld would be a third of
  // this, which puts a 30 mm tube across half the screen.
  const eyeRelief = 0.2;
  const reticle = makeReticle('dot', 0.0135, eyeRelief + (zRear - zFront) * 0.8, rng);
  return { group, sight, reticle, axisHeight, eyeRelief };
}

/**
 * Holographic sight: square hood, big rectangular window, ring-and-dot.
 *
 * The laser and the battery live in a body *below* the optical path, and the
 * hood is a three-sided tunnel open at both ends. Nothing at all sits between
 * the eye and the front glass, which is what lets the target stay visible when
 * the viewmodel is composited over the world.
 */
export function buildHolo(pal: GunPalette, rng: Rng): OpticResult {
  const group = new THREE.Group();
  group.name = 'optic';
  const mountH = 0.012;
  const bodyH = 0.012;
  const windowH = 0.024;
  const windowW = 0.032;
  const wall = 0.0032;
  const axisHeight = mountH + bodyH + windowH * 0.5 + 0.0015;
  const zRear = 0.024;
  const zGlass = -0.03;

  mountBlock(group, pal, 0.028, mountH, 0.088, 0.006);

  // Laser and battery housing, entirely under the sight line.
  const bodyTop = mountH + bodyH;
  group.add(mesh(boxGeo(windowW + 0.006, bodyH, 0.09, 0.0022), pal.metal, [0, mountH + bodyH * 0.5, 0.006]));
  group.add(mesh(boxGeo(0.018, 0.0075, 0.03, 0.0016), pal.metalDark, [0, bodyTop + 0.0032, 0.044]));
  // Transverse battery cap on the left of the body.
  group.add(mesh(cylGeoX(0.0068, 0.0092, 14), pal.metalWorn, [-windowW * 0.5 - 0.004, mountH + bodyH * 0.5, 0.038]));
  for (let i = 0; i < 2; i++) {
    group.add(mesh(boxGeo(0.009, 0.0055, 0.011, 0.0012), pal.rubber, [windowW * 0.5 + 0.0018, mountH + bodyH * 0.5, 0.03 + i * 0.014]));
  }

  const hood = new THREE.Group();
  hood.position.set(0, axisHeight, 0);
  group.add(hood);

  // Three-sided hood: top plate and two uprights, open front and rear.
  const hoodDepth = zRear - zGlass + 0.008;
  const hoodMid = (zRear + zGlass) * 0.5 + 0.002;
  hood.add(mesh(boxGeo(windowW + wall * 2, wall * 1.5, hoodDepth, 0.0016), pal.metal, [0, windowH * 0.5 + wall * 0.75, hoodMid]));
  for (const s of [-1, 1]) {
    hood.add(
      mesh(
        boxGeo(wall, windowH + wall * 1.5, hoodDepth, 0.0012),
        pal.metal,
        [s * (windowW * 0.5 + wall * 0.5), 0, hoodMid],
      ),
    );
    // Matte interior stripe so the hood walls do not bounce light onto the glass.
    hood.add(mesh(boxGeo(0.0008, windowH, hoodDepth - 0.006, 0.0002), pal.bore, [s * windowW * 0.5, 0, hoodMid]));
  }
  // Front bezel around the glass, and the glass itself canted like the real one.
  hood.add(mesh(boxGeo(windowW + wall * 2, 0.0022, 0.004, 0.0008), pal.metalDark, [0, -windowH * 0.5 - 0.0011, zGlass]));
  const front = mesh(new THREE.PlaneGeometry(windowW, windowH), pal.glass, [0, 0, zGlass], [-0.13, 0, 0]);
  front.renderOrder = 4;
  hood.add(front);

  // Bolts through the hood and rub-through along the leading edges. Both sit
  // right under the eye whenever the player aims, which is the one place on the
  // weapon where an unbroken machined face is most obviously unmanufactured.
  for (const s of [-1, 1]) {
    for (const z of [zRear - 0.006, zGlass + 0.012]) {
      hood.add(
        mesh(screwGeo(0.0021, 0.0011), pal.metalWorn, [
          s * (windowW * 0.5 + wall * 0.5),
          windowH * 0.5 + wall * 0.72,
          z,
        ]),
      );
    }
    // Polished corner where the hood meets the bezel, and along the top rail.
    hood.add(
      mesh(boxGeo(wall * 0.7, windowH * 0.86, 0.0022, 0.0004), pal.metalWorn, [
        s * (windowW * 0.5 + wall * 0.62),
        0,
        zGlass + 0.0035,
      ]),
    );
    hood.add(
      mesh(boxGeo(0.0022, wall * 0.9, hoodDepth * 0.62, 0.0005), pal.metalWorn, [
        s * (windowW * 0.5 + wall * 0.6),
        windowH * 0.5 + wall * 0.6,
        hoodMid - 0.004,
      ]),
    );
  }

  // Detail on the rear faces, which are the only ones the eye sees in ADS.
  //
  // Everything above is authored for the three-quarter view of a hipfire frame,
  // and none of it survives the head-on one: the bolts are in the top plate and go
  // edge-on, the polished corners face sideways, and the two shader terms that
  // carry the rest — `fwidth` of the normal, and grime on downward faces — both
  // return nothing on a face pointed straight down the lens. The result was a
  // sight that measured as fully textured and photographed as a moulded grey box
  // filling a fifth of the aimed frame.
  //
  // A rubbed rim round the rear of the hood and a pair of bolts in the rear of the
  // emitter housing sit 200 mm from the eye at full size, which is the one place
  // on the weapon where a few square millimetres of bright steel is worth more
  // than anything on the far side of it.
  const rearZ = hoodMid + hoodDepth * 0.5 - 0.0008;
  hood.add(
    mesh(boxGeo(windowW + wall * 1.6, wall * 0.85, 0.0016, 0.0004), pal.metalWorn, [
      0,
      windowH * 0.5 + wall * 0.7,
      rearZ,
    ]),
  );
  for (const s of [-1, 1]) {
    hood.add(
      mesh(boxGeo(wall * 0.85, windowH + wall * 0.9, 0.0016, 0.0004), pal.metalWorn, [
        s * (windowW * 0.5 + wall * 0.5),
        0,
        rearZ,
      ]),
    );
    hood.add(
      mesh(screwGeo(0.0016, 0.0009), pal.metalWorn, [
        s * 0.0055,
        bodyTop + 0.0032,
        0.0588,
      ], [Math.PI / 2, 0, 0]),
    );
  }

  // Windage table on the battery housing's flank, and the model number on the
  // rear of the emitter block.
  //
  // The rear one is the only marking on the weapon an aimed frame can show. Every
  // flank goes edge-on when the eye is behind the sight — measured, the carbine's
  // five rollmarks contribute zero pixels to the ADS render — and the block under
  // the window is both square-on to the eye and 200 mm from it, so a 4 mm stencil
  // there is larger in the aimed frame than a 14 mm one on the receiver is at
  // hipfire.
  addMarkings(group, pal, rng, {
    pos: [-windowW * 0.5 - 0.004, mountH + bodyH * 0.62, 0.014],
    face: 'left',
    lines: ['HWS-4', '1 CLICK 12mm'],
    height: 0.0062,
    wear: 0.12,
  });
  // On the battery body's rear wall rather than the emitter block's, which is
  // narrower and already carries the two bolts.
  addMarkings(group, pal, rng, {
    pos: [0, mountH + bodyH * 0.5, 0.051],
    face: 'rear',
    lines: ['HWS-4'],
    height: 0.0042,
    color: 0xe2ded4,
    wear: 0.1,
  });

  const sight = new THREE.Object3D();
  sight.name = 'sight';
  sight.position.set(0, axisHeight, zRear);
  group.add(sight);

  const eyeRelief = 0.205;
  // Sized off the window rather than off the real optic. The ring sits at 0.62 of
  // the plane's half-width, so this leaves it a little under 40 per cent of the
  // glass — an EOTech's 68 MOA circle is nearer a fifth, but a life-size ring is
  // twenty pixels at this resolution and a game reticle has to survive being
  // looked at rather than through. Only trimmed, not shrunk: at the previous size
  // the ring reached most of the way across the window and read as a decal on the
  // glass instead of a projection floating past it.
  const reticle = makeReticle('holo', 0.017, eyeRelief + (zRear - zGlass), rng);
  return { group, sight, reticle, axisHeight, eyeRelief };
}

// ---------------------------------------------------------------------------
// Magnified optics
// ---------------------------------------------------------------------------

/** 4x prismatic scope with a fibre-optic ridge and an illuminated chevron. */
export function buildAcog(pal: GunPalette, rng: Rng): OpticResult {
  const group = new THREE.Group();
  group.name = 'optic';
  const mountH = 0.017;
  const tubeR = 0.019;
  const axisHeight = mountH + tubeR;
  const zRear = 0.044;
  const zFront = -0.066;
  const length = zRear - zFront;

  mountBlock(group, pal, 0.028, mountH, 0.058, -0.004);

  const tube = new THREE.Group();
  tube.position.set(0, axisHeight, 0);
  group.add(tube);

  // Profile runs from the ocular (h = 0) to the objective bell (h = length).
  tube.add(
    mesh(
      latheZ(
        [
          [tubeR * 1.1, 0],
          [tubeR * 1.24, 0.005],
          [tubeR * 1.24, 0.016],
          [tubeR * 1.04, 0.03],
          [tubeR * 0.99, length * 0.5],
          [tubeR * 1.04, length * 0.58],
          [tubeR * 1.16, length - 0.022],
          [tubeR * 1.22, length - 0.006],
          [tubeR * 0.74, length],
        ],
        22,
      ),
      pal.metalDark,
      [0, 0, zRear],
    ),
  );
  const apertureR = tubeR * 0.92;
  const disc = ocularDisc(tube, pal, apertureR, zRear - 0.005);

  // Fibre-optic light pipe along the top: the detail that identifies an ACOG.
  tube.add(mesh(latheZ([[0.0034, 0], [0.0044, 0.004], [0.0044, 0.05], [0.0032, 0.056]], 12), pal.glassAmber, [0, tubeR * 1.02, 0.022]));
  tube.add(mesh(boxGeo(0.0115, 0.0042, 0.062, 0.0012), pal.metalDark, [0, tubeR * 1.02 + 0.0036, -0.008]));

  // Rubber eyecup at the ocular.
  tube.add(
    mesh(
      latheZ(
        [
          [tubeR * 1.14, 0],
          [tubeR * 1.34, -0.006],
          [tubeR * 1.38, -0.014],
          [tubeR * 1.18, -0.019],
        ],
        20,
      ),
      pal.rubber,
      [0, 0, zRear],
    ),
  );

  // The aiming reference is the centre of the ocular disc, which makes the eye
  // relief the disc's own distance from the eye and lets the viewmodel size the
  // sight picture straight from the aperture radius.
  const sight = new THREE.Object3D();
  sight.name = 'sight';
  sight.position.set(0, axisHeight, zRear - 0.005);
  group.add(sight);

  const eyeRelief = 0.07;
  // A prism's chevron subtends a small part of the field; only a duplex
  // crosshair reaches the edge of the glass.
  const reticle = makeReticle('chevron', apertureR * 1.5, eyeRelief, rng);
  reticle.parallaxFree = false;
  reticle.object.position.set(0, axisHeight, zRear - 0.0042);
  reticle.eyebox = 0.03;
  group.add(reticle.object);
  const shadow = scopeShadow(apertureR * APERTURE_MASK_OVERLAP, apertureR * 12, zRear - 0.0046);
  shadow.position.y = axisHeight;
  group.add(shadow);
  reticle.shadow = shadow;
  reticle.aperture = { mesh: disc, radius: apertureR };

  return { group, sight, reticle, axisHeight, eyeRelief };
}

/** Long-range scope: 50 mm objective, exposed turrets, mil-dot glass. */
export function buildSniperScope(pal: GunPalette, rng: Rng): OpticResult {
  const group = new THREE.Group();
  group.name = 'optic';
  const mountH = 0.018;
  // 38 mm main tube with a 46 mm ocular bell, on a 250 mm body: a compact
  // precision scope rather than a full-length target optic. The ocular radius is
  // what sets how large the sight picture reads, so the bell is generous.
  const tubeR = 0.0192;
  const ocularR = tubeR * 1.2;
  const axisHeight = mountH + 0.03;
  const zRear = 0.1;
  const zFront = -0.15;
  const length = zRear - zFront;

  for (const z of [-0.052, 0.046]) {
    mountBlock(group, pal, 0.026, mountH, 0.026, z);
    const clamp = new THREE.Group();
    clamp.position.set(0, axisHeight, z);
    group.add(clamp);
    clamp.add(
      mesh(
        latheZ(
          [
            [tubeR * 1.02, 0],
            [tubeR * 1.3, 0.0022],
            [tubeR * 1.3, 0.019],
            [tubeR * 1.02, 0.021],
          ],
          18,
        ),
        pal.metal,
        [0, 0, 0.011],
      ),
    );
    clamp.add(mesh(screwGeo(0.0026, 0.0014), pal.metalDark, [0.0085, tubeR * 1.28, 0.011]));
    clamp.add(mesh(screwGeo(0.0026, 0.0014), pal.metalDark, [-0.0085, tubeR * 1.28, 0.011]));
  }

  const tube = new THREE.Group();
  tube.position.set(0, axisHeight, 0);
  group.add(tube);

  // Ocular (h = 0) through the main tube to the objective bell (h = length).
  tube.add(
    mesh(
      latheZ(
        [
          // The ocular opening is the aperture the sight picture is seen
          // through, so the bell runs at full width right to the eye end.
          [ocularR, 0],
          [ocularR * 1.06, 0.008],
          [ocularR * 1.06, 0.036],
          [tubeR * 1.06, 0.046],
          [tubeR, 0.056],
          [tubeR, 0.098],
          [tubeR * 1.06, 0.104],
          [tubeR * 1.06, 0.124],
          [tubeR, 0.13],
          [tubeR, 0.19],
          [tubeR * 1.24, 0.204],
          [tubeR * 1.3, 0.238],
          [tubeR * 1.22, 0.246],
          [tubeR * 0.96, 0.25],
        ],
        24,
      ),
      pal.metalDark,
      [0, 0, zRear],
    ),
  );
  const apertureR = ocularR * 0.94;
  const disc = ocularDisc(tube, pal, apertureR, zRear - 0.006);

  // Elevation, windage and parallax turrets.
  const turret = latheZ(
    [
      [0.0092, 0],
      [0.0106, 0.0032],
      [0.0106, 0.0165],
      [0.0088, 0.0192],
    ],
    14,
  );
  tube.add(mesh(turret, pal.metal, [0, tubeR, -0.028], [-Math.PI / 2, 0, 0]));
  tube.add(mesh(turret.clone(), pal.metal, [tubeR, 0, -0.028], [0, Math.PI / 2, 0]));
  tube.add(mesh(turret.clone(), pal.metal, [-tubeR, 0, -0.028], [0, -Math.PI / 2, 0]));

  // Magnification ring: knurl faked with an alternating-radius lathe.
  const knurl: Array<readonly [number, number]> = [];
  for (let i = 0; i <= 12; i++) {
    knurl.push([i % 2 === 0 ? tubeR * 1.28 : tubeR * 1.36, i * 0.0019]);
  }
  tube.add(mesh(latheZ(knurl, 26), pal.metalWorn, [0, 0, zRear - 0.05]));

  tube.add(
    mesh(
      latheZ(
        [
          [ocularR * 1.04, 0],
          [ocularR * 1.16, -0.006],
          [ocularR * 1.18, -0.015],
          [ocularR * 1.0, -0.021],
        ],
        22,
      ),
      pal.rubber,
      [0, 0, zRear],
    ),
  );

  const sight = new THREE.Object3D();
  sight.name = 'sight';
  sight.position.set(0, axisHeight, zRear - 0.006);
  group.add(sight);

  const eyeRelief = 0.088;
  // Duplex posts are meant to run in from the edge of the field, so the plane is
  // the full aperture.
  const reticle = makeReticle('crosshair', apertureR * 1.94, eyeRelief, rng);
  reticle.parallaxFree = false;
  reticle.object.position.set(0, axisHeight, zRear - 0.005);
  reticle.eyebox = 0.022;
  group.add(reticle.object);
  const shadow = scopeShadow(apertureR * APERTURE_MASK_OVERLAP, apertureR * 12, zRear - 0.0055);
  shadow.position.y = axisHeight;
  group.add(shadow);
  reticle.shadow = shadow;
  reticle.aperture = { mesh: disc, radius: apertureR };

  return { group, sight, reticle, axisHeight, eyeRelief };
}

// ---------------------------------------------------------------------------
// Iron sights
// ---------------------------------------------------------------------------

/**
 * Iron sights. Every weapon gets a set even when an optic is fitted: that is how
 * rifles are issued, and the front post is what reads in the silhouette at hip
 * level where the optic does not.
 */
/** Height of a front sight's base block, i.e. the offset from its mount to the post. */
const FRONT_BASE_H = 0.0058;

/**
 * Where the line of sight actually falls above a rear sight's mounting surface.
 *
 * Front and rear sights nearly always mount at different heights — the front on a
 * gas block over the barrel, the rear on the receiver — so choosing a post height
 * and hoping the two agree does not work. Solving the post from the rear's sight
 * line is invisible in every side view and the only thing that matters once the
 * player aims: a rear notch 10 mm below the axis puts the whole rear sight out of
 * the sight picture and leaves the front post floating in space.
 */
export function ironSightLine(rearBase: number, rearHeight: number, aperture: boolean): number {
  // A notch is aimed off the top of its blades, not the floor of the gap: put the
  // axis on the floor and the front post tip lands behind the notch bar, hidden.
  return rearBase + 0.005 + rearHeight * (aperture ? 0.68 : 1);
}

/** Post height that puts a front sight mounted at `frontBase` on `sightLine`. */
export function frontPostFor(sightLine: number, frontBase: number): number {
  return Math.max(0.005, sightLine - frontBase - FRONT_BASE_H);
}

/**
 * See-through ghost ring: a real annulus, not a disc.
 *
 * An aperture sight is the one place on a weapon where geometry sitting on the
 * optical axis is fatal — the viewmodel is composited over the world, so a solid
 * rear disc blacks out precisely the target the player is aiming at.
 */
export function buildGhostRing(
  pal: GunPalette,
  opts: { ringR: number; holeR: number; depth: number; segments?: number },
): THREE.Group {
  const seg = opts.segments ?? 20;
  const group = new THREE.Group();
  group.name = 'ghostRing';
  const half = opts.depth * 0.5;
  group.add(
    mesh(
      latheZ(
        [
          [opts.ringR * 0.94, -half],
          [opts.ringR, -half + opts.depth * 0.2],
          [opts.ringR, half - opts.depth * 0.2],
          [opts.ringR * 0.94, half],
        ],
        seg,
      ),
      pal.metalDark,
    ),
  );
  group.add(mesh(tubeInnerGeo(opts.holeR, opts.depth, seg), pal.bore, [0, 0, -half]));
  group.add(mesh(ringGeo(opts.ringR * 0.94, opts.holeR, seg), pal.metalDark, [0, 0, -half]));
  group.add(mesh(ringGeo(opts.ringR * 0.94, opts.holeR, seg), pal.metalWorn, [0, 0, half], [0, Math.PI, 0]));
  return group;
}

export function buildFrontSight(
  pal: GunPalette,
  postHeight: number,
  opts: { wings?: boolean; width?: number; folding?: boolean } = {},
): THREE.Group {
  const group = new THREE.Group();
  group.name = 'frontSight';
  const width = opts.width ?? 0.019;
  group.add(mesh(boxGeo(width, FRONT_BASE_H, 0.017, 0.0012), pal.metal, [0, FRONT_BASE_H * 0.5, 0]));
  group.add(mesh(boxGeo(0.0034, postHeight, 0.0032, 0.0006), pal.metalDark, [0, FRONT_BASE_H + postHeight * 0.5, 0]));
  group.add(mesh(new THREE.SphereGeometry(0.0016, 8, 6), pal.tritium, [0, FRONT_BASE_H + postHeight - 0.0012, -0.0019]));
  if (opts.wings !== false) {
    // Ears sit on the outer corners of the base. Pulled in towards the post they
    // crowd it in the sight picture and the three merge into one dark smear.
    for (const s of [-1, 1]) {
      group.add(
        mesh(
          boxGeo(0.0032, postHeight * 0.96, 0.0125, 0.0008),
          pal.metal,
          [s * width * 0.44, 0.0058 + postHeight * 0.48, 0],
          [0, 0, -s * 0.1],
        ),
      );
    }
  }
  return group;
}

export function buildRearSight(
  pal: GunPalette,
  height: number,
  aperture = true,
): THREE.Group {
  const group = new THREE.Group();
  group.name = 'rearSight';
  group.add(mesh(boxGeo(0.019, 0.005, 0.015, 0.001), pal.metal, [0, 0.0025, 0]));
  if (aperture) {
    // Oversized against scale, deliberately. A true 2 mm peep at a 200 mm eye
    // relief is nine pixels across at 1080p, which is not a sight picture.
    const ringR = 0.0098;
    const centre = 0.005 + height * 0.68;
    const ring = buildGhostRing(pal, { ringR, holeR: 0.0062, depth: 0.007, segments: 18 });
    ring.position.set(0, centre, 0.0035);
    group.add(ring);
    for (const s of [-1, 1]) {
      group.add(mesh(boxGeo(0.0028, height, 0.0105, 0.0007), pal.metal, [s * 0.0128, 0.005 + height * 0.5, 0]));
    }
    // Web filling the space between the base and the ring. Left open it is a
    // second window under the aperture, and the player cannot tell which of the
    // two holes is the sight.
    const web = Math.max(0.001, centre - ringR * 0.86 - 0.005);
    group.add(mesh(boxGeo(0.0225, web, 0.0088, 0.0008), pal.metal, [0, 0.005 + web * 0.5, 0.0035]));
  } else {
    // Open notch: two blades with a real gap, never a dark box on the sight line.
    // The gap is kept roughly square — a deep slot reads as a hole in the model
    // rather than as a notch, and swallows the front post.
    const notch = 0.005;
    const floor = height * 0.6;
    const blade = (0.0165 - notch) * 0.5;
    for (const s of [-1, 1]) {
      group.add(
        mesh(
          boxGeo(blade, height, 0.0034, 0.0007),
          pal.metalDark,
          [s * (notch + blade) * 0.5, 0.005 + height * 0.5, 0],
        ),
      );
      group.add(mesh(new THREE.SphereGeometry(0.0013, 8, 6), pal.tritium, [s * 0.0053, 0.005 + floor * 0.55, -0.0023]));
    }
    group.add(mesh(boxGeo(0.0165, floor, 0.0034, 0.0007), pal.metalDark, [0, 0.005 + floor * 0.5, 0]));
  }
  return group;
}
