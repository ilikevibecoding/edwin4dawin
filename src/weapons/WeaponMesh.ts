import * as THREE from 'three';
import type { WeaponDef } from './WeaponDefs';
import type { MaterialLibrary } from '../render/Materials';
import {
  GeoBatch,
  extrude,
  picatinnyRail,
  revolve,
  roundRectSection,
  roundedBox,
  screwHead,
  gripTexture,
  slottedPanel,
  taperedBox,
} from './GeoKit';
import { buildHand, solveCylinderGrip } from './Hands';

/**
 * Procedural weapon geometry.
 *
 * Model space: the bore axis is Y = 0, -Z is downrange, +X is the shooter's
 * right, and Z = 0 is the rear face of the upper receiver. Everything is at
 * true scale, which matters more than it sounds — the hands are built from
 * anthropometric measurements, so if the grip is not 32 mm across the fingers
 * do not close on it, and the eye reads the mismatch instantly even though it
 * cannot name it.
 *
 * Detail is spent where the player looks: the top plane of the receiver, the
 * optic, the near end of the handguard and the ejection port carry real
 * geometry; the stock and the underside of the barrel carry almost none
 * because they sit off the bottom of the frame in every pose the weapon is
 * ever in.
 */

export interface WeaponFrame {
  dt: number;
  ads: number;
  elapsed: number;
  /** Camera position, world space, for the collimated reticle. */
  eye: THREE.Vector3;
}

export interface WeaponModel {
  group: THREE.Group;
  muzzle: THREE.Object3D;
  ejectionPort: THREE.Object3D;
  opticCentre: THREE.Object3D;
  /** Eye-to-optic distance that frames the sight picture when aiming. */
  eyeRelief: number;
  sprintPose: { position: THREE.Vector3; rotation: THREE.Euler };
  sprintBlend: number;
  onFire(): void;
  setMagazineVisible(v: boolean): void;
  setBoltBack(t: number): void;
  update(f: WeaponFrame): void;
  dispose(): void;
}

// The optical axis height above the bore. 70 mm is a shade over the 2.6 inches
// an AR actually runs, chosen deliberately: the extra height drops the whole
// weapon further down the frame when aiming, which leaves the receiver and the
// support hand visible under the sight picture instead of the optic filling
// the screen on its own.
const OPTIC_HEIGHT = 0.0705;
const RAIL_TOP = 0.0375;
const RECEIVER_TOP = 0.0285;

// ------------------------------------------------------------- proportions --

interface Proportions {
  receiverFront: number;
  receiverBack: number;
  handguardFront: number;
  brakeFront: number;
  handguardWidth: number;
  mlokSlots: number;
  magRounds: number;
  supportHandZ: number;
  stockBack: number;
}

function proportionsFor(def: WeaponDef): Proportions {
  switch (def.class) {
    case 'SMG':
      return {
        receiverFront: -0.160,
        receiverBack: 0.012,
        handguardFront: -0.300,
        brakeFront: -0.356,
        handguardWidth: 0.042,
        mlokSlots: 3,
        magRounds: 32,
        supportHandZ: -0.238,
        stockBack: 0.142,
      };
    case 'DMR':
    case 'SNIPER':
      return {
        receiverFront: -0.200,
        receiverBack: 0.014,
        handguardFront: -0.428,
        brakeFront: -0.526,
        handguardWidth: 0.048,
        mlokSlots: 6,
        magRounds: 20,
        supportHandZ: -0.330,
        stockBack: 0.182,
      };
    default:
      return {
        receiverFront: -0.185,
        receiverBack: 0.012,
        handguardFront: -0.383,
        brakeFront: -0.466,
        handguardWidth: 0.046,
        mlokSlots: 5,
        magRounds: 30,
        supportHandZ: -0.296,
        stockBack: 0.168,
      };
  }
}

// ------------------------------------------------------------------ shaders --

/**
 * Reticle.
 *
 * Drawn as if collimated: the aiming point is where a ray from the eye
 * *parallel to the optic's axis* crosses the reticle plane, not the centre of
 * the plane. That one line is the difference between a sticker on a piece of
 * glass and a sight. It means the dot holds on the target while the weapon
 * sways under it, it means the dot leaves the tube when the eye leaves the
 * eyebox, and it means the dot is dead centre on screen whenever the optic is
 * parallel to the view — so the sight picture cannot be a millimetre out
 * however the ADS pose happens to be authored.
 */
const RETICLE_VERT = /* glsl */ `
  varying vec2 vLocal;
  void main() {
    vLocal = position.xy;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const RETICLE_FRAG = /* glsl */ `
  varying vec2 vLocal;
  uniform vec3 uColor;
  uniform float uBrightness;
  uniform float uDotAngle;
  uniform float uRingAngle;
  uniform int uType;
  uniform vec3 uEyeLocal;
  uniform float uAperture;

  float blob(float d, float r) {
    return 1.0 - smoothstep(r * 0.45, r, d);
  }

  void main() {
    // Angular offset of this fragment from the optic axis as seen from the eye.
    vec2 ang = (vLocal - uEyeLocal.xy) / max(abs(uEyeLocal.z), 1e-4);
    float d = length(ang);

    float a = 0.0;
    if (uType == 1) {
      // Chevron: on a magnified optic the aiming point is the apex.
      vec2 p = ang / uRingAngle;
      float arm = abs(p.x) * 1.55 + p.y + 0.05;
      a = (1.0 - smoothstep(0.0, 0.085, abs(arm)))
        * step(p.y, 0.03) * step(-0.62, p.y);
      a += blob(length(p - vec2(0.0, -0.95)), 0.09) * 0.75;
      a = clamp(a, 0.0, 1.0);
    } else if (uType == 2) {
      // Holographic: a 65 MOA ring around a 1 MOA dot.
      float ring = 1.0 - smoothstep(uRingAngle * 0.055, uRingAngle * 0.11,
                                    abs(d - uRingAngle));
      a = ring * 0.9 + blob(d, uDotAngle);
      float th = atan(ang.y, ang.x);
      a *= 1.0 - 0.85 * step(0.985, abs(cos(th * 2.0))) * ring;
      a = clamp(a, 0.0, 1.0);
    } else {
      a = blob(d, uDotAngle) + blob(d, uDotAngle * 3.4) * 0.13;
    }

    // Emitter bloom on the glass, which is what makes a bright dot read as a
    // light source rather than a painted mark. It has to be strong enough to
    // survive a sunlit wall behind it: measured against one, a dot that looked
    // convincing over shade came back as a pale peach smudge, because adding
    // red to an already-bright background buys almost nothing after tone
    // mapping. A real emitter answers that by being brighter than the sky.
    a += exp(-d / (uDotAngle * 3.0)) * 0.28;
    a += exp(-d / (uDotAngle * 9.0)) * 0.05;

    // Clip to the aperture; off-axis the reticle simply is not there.
    a *= 1.0 - smoothstep(uAperture * 0.86, uAperture, length(vLocal));
    if (a < 0.004) discard;
    gl_FragColor = vec4(uColor * uBrightness * a, a);
  }
`;

/**
 * Objective and ocular glass.
 *
 * The temptation with a lens is to make it *look* like a lens — a coloured
 * disc, a bright rim, a coating that reads unmistakably as glass. That is
 * exactly backwards. A sight is a thing you look through, and the measure of
 * one is how little it costs you to do so: the working aperture of a 1x optic
 * is honest daylight with a hint of blue in it, and every percent of tint
 * added there is a percent of the target the player cannot see.
 *
 * So the tint is pushed out to a narrow annulus and the rim goes *dark*, not
 * bright. The tube wall shadows the last few millimetres of any real optic,
 * and that dark ring is what actually makes the glass read as recessed inside
 * a tube rather than painted across the front of it. The only bright thing is
 * a short arc of sky at the top of the ocular, which is the one specular a
 * shooter genuinely sees.
 */
const GLASS_VERT = /* glsl */ `
  varying vec2 vLocal;
  void main() {
    vLocal = position.xy;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const GLASS_FRAG = /* glsl */ `
  varying vec2 vLocal;
  uniform vec3 uTint;
  uniform float uRadius;
  uniform float uSky;

  void main() {
    // A flat lens a hand's width from the eye subtends seven degrees, so a
    // Fresnel term off the surface normal is zero everywhere across it and
    // does nothing at all. What varies is the *radius*: the coating is seen
    // through more glass and at a steeper internal angle towards the rim, and
    // the tube shades it there too.
    float r = clamp(length(vLocal) / uRadius, 0.0, 1.0);
    vec2 n = vLocal / max(uRadius, 1e-5);

    // Coating. Weak and blue across the aperture, swinging violet only in the
    // last fifth where the light is raking through the coating stack.
    vec3 coat = mix(uTint, vec3(0.20, 0.13, 0.31), smoothstep(0.66, 1.0, r));
    float tintA = 0.028 + 0.062 * smoothstep(0.34, 0.98, r);

    // Tube shadow: the last 8% of the aperture is the lens seat, in shade.
    float wall = smoothstep(0.90, 1.0, r);

    // Sky glint — a short arc across the top of the ocular, not a full ring.
    float top = smoothstep(0.20, 0.95, n.y) * smoothstep(0.66, 0.94, r)
              * (1.0 - smoothstep(0.94, 1.0, r));

    float alpha = clamp(tintA + wall * 0.78 + top * 0.30 * uSky, 0.0, 0.90);
    vec3 col = coat * (0.42 + uSky * 0.55) * (1.0 - wall * 0.88)
             + vec3(0.62, 0.68, 0.80) * top * uSky;
    gl_FragColor = vec4(col, alpha);
  }
`;

// -------------------------------------------------------------------- build --

interface Batches {
  steel: GeoBatch;
  barrel: GeoBatch;
  alloy: GeoBatch;
  optic: GeoBatch;
  polymer: GeoBatch;
  rubber: GeoBatch;
  mag: GeoBatch;
  bolt: GeoBatch;
  glove: GeoBatch;
  sleeve: GeoBatch;
}

export function buildWeaponModel(def: WeaponDef, materials: MaterialLibrary): WeaponModel {
  const group = new THREE.Group();
  group.name = `weapon:${def.id}`;

  // Five genuinely different surfaces. Parkerised steel is dark and slightly
  // glossy; hard-anodised aluminium is paler, flatter and slightly warm;
  // moulded polymer has no metallic response at all; rubber overmould is the
  // roughest thing on the weapon; the glove is cloth. Reading them apart is
  // most of what makes a gun look like an assembly rather than one casting.
  //
  // The tints below are calibrated against the *linear* reflectance of the
  // library's base maps, not picked by eye in a hex editor. That distinction
  // cost a whole iteration: `color` multiplies the map in linear space, so a
  // tint that looks like a neutral mid-grey on screen — 0xc0c4ca, say — is
  // actually halving the surface, and every one of these was doing it at
  // once. Measured off a street capture the entire weapon was sitting at 2%
  // reflectance, darker than coal, so it read as one black cut-out with a
  // bright rail along the top and no internal form at all. Anodised aluminium
  // is 4 to 6%, moulded nylon 3 to 4%, and the numbers here are chosen to
  // land there.
  const mats = {
    steel: materials.get('gunmetal', { color: 0x9aa0a8, roughness: 0.5, metalness: 1 }),
    // Nitrided barrel steel. Split out from the bright controls because a
    // muzzle device is the furthest thing from the eye and was the brightest
    // object in the frame, which put a silver full stop on the end of every
    // shot; a treated barrel is near-black and only glances light off its
    // curve, which is what actually reads as steel at that distance.
    barrel: materials.get('gunmetal', { color: 0x62666e, roughness: 0.42, metalness: 1 }),
    alloy: materials.get('gunmetal', { color: 0x767a82, roughness: 0.92, metalness: 0.9 }),
    // Hard-anodised matte black — the darkest thing on the weapon, and it has
    // to stay that way: metalness was 0.75, which handed the tube a full
    // environment reflection and lit the *inside* of the sight brighter than
    // the world seen through it.
    optic: materials.get('gunmetal', { color: 0x585c64, roughness: 1, metalness: 0.2 }),
    polymer: materials.get('polymerBlack', { color: 0xd0d4da, roughness: 0.95 }),
    rubber: materials.get('polymerBlack', { color: 0xa4a8b0, roughness: 1 }),
    // A moulded magazine reads a shade lighter than the anodised lower it
    // hangs out of, never darker, and never the same coyote as the glove —
    // two objects the same colour in the same corner of the frame merge into
    // one and the magwell stops reading as a separate mass entirely.
    mag: materials.get('polymerBlack', { color: 0xf2f5fa, roughness: 0.9 }),
    // A black glove on a black weapon is a silhouette with no information in
    // it: the hand becomes one lump and the player never sees a grip at all.
    // Coyote leather is both what the kit actually is and three times the
    // reflectance of the polymer it sits on, so the fingers read as fingers.
    glove: materials.get('fabricTarp', { color: 0xa8896a, roughness: 1 }),
    // The sleeve stays dark. It is the largest object on screen after the
    // weapon and it has nothing to say; its job is to frame the gun, so it
    // sits a stop under the glove and well under the receiver.
    //
    // In noon desert sun the first tint came back as a pale sand column with a
    // woven diagonal in it — a rolled tarp standing on end, which is exactly
    // what the material is named after and exactly what an arm must not look
    // like. Two and a half stops down puts it below every surface on the
    // weapon, which is where the eye needs it.
    sleeve: materials.get('fabricTarp', { color: 0x252e2a, roughness: 1 }),
  };

  const b: Batches = {
    steel: new GeoBatch(),
    barrel: new GeoBatch(),
    alloy: new GeoBatch(),
    optic: new GeoBatch(),
    polymer: new GeoBatch(),
    rubber: new GeoBatch(),
    mag: new GeoBatch(),
    bolt: new GeoBatch(),
    glove: new GeoBatch(),
    sleeve: new GeoBatch(),
  };

  const isPistol = def.class === 'PISTOL';
  const P = proportionsFor(def);
  const muzzle = new THREE.Object3D();
  const ejectionPort = new THREE.Object3D();

  if (isPistol) buildPistol(b, muzzle, ejectionPort);
  else buildRifle(P, b, muzzle, ejectionPort);

  const optics = buildOptic(def, b.optic, isPistol);

  // ---- meshes -------------------------------------------------------------
  const magGroup = new THREE.Group();
  const boltGroup = new THREE.Group();
  const owned: THREE.Mesh[] = [];

  const addMesh = (
    batch: GeoBatch,
    mat: THREE.Material,
    tile: number,
    parent: THREE.Object3D,
  ): THREE.Mesh | null => {
    if (batch.empty) return null;
    const mesh = new THREE.Mesh(batch.build(tile), mat);
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    // Everything here is a few centimetres from the near plane and always on
    // screen; a per-mesh frustum test is pure cost.
    mesh.frustumCulled = false;
    parent.add(mesh);
    owned.push(mesh);
    return mesh;
  };

  const steelMesh = addMesh(b.barrel, mats.barrel, 0.30, group);
  addMesh(b.steel, mats.steel, 0.35, group);
  addMesh(b.alloy, mats.alloy, 0.35, group);
  addMesh(b.optic, mats.optic, 0.32, group);
  addMesh(b.polymer, mats.polymer, 0.30, group);
  addMesh(b.rubber, mats.rubber, 0.28, group);
  addMesh(b.glove, mats.glove, 0.34, group);
  addMesh(b.sleeve, mats.sleeve, 0.55, group);
  addMesh(b.mag, mats.mag, 0.30, magGroup);
  addMesh(b.bolt, mats.steel, 0.22, boltGroup);
  group.add(magGroup, boltGroup);

  optics.attach(group);
  const opticCentre = new THREE.Object3D();
  opticCentre.position.set(0, optics.centreY, optics.centreZ);
  group.add(opticCentre, muzzle, ejectionPort);

  // The weapon lighting itself on every shot is one of the loudest cues that
  // a gun is a real object rather than a decal on the camera. It lives in the
  // view scene so it rakes across the receiver and the hands without leaking
  // into the world.
  const flashLight = new THREE.PointLight(0xffcf8c, 0, 1.6, 2);
  flashLight.position.set(0, 0.006, (isPistol ? -0.16 : P.brakeFront) - 0.035);
  group.add(flashLight);

  // ------------------------------------------------------------- behaviour --
  let boltOffset = 0;
  let boltTarget = 0;
  let heat = 0;
  let flash = 0;
  let flashSeed = 0;
  const eyeLocal = new THREE.Vector3();

  const model: WeaponModel = {
    group,
    muzzle,
    ejectionPort,
    opticCentre,
    eyeRelief: optics.eyeRelief,
    sprintPose: {
      position: new THREE.Vector3(),
      rotation: new THREE.Euler(-0.16, -0.55, 0.44, 'YXZ'),
    },
    sprintBlend: 0,
    onFire(): void {
      boltOffset = 1;
      heat = Math.min(1, heat + 0.11);
      flash = 1;
      flashSeed = Math.random();
    },
    setMagazineVisible(v: boolean): void {
      magGroup.visible = v;
    },
    setBoltBack(t: number): void {
      boltTarget = t;
    },
    update(f: WeaponFrame): void {
      // The bolt is the only part of the weapon that moves relative to the
      // rest, which makes it the only thing proving the weapon is a mechanism.
      boltOffset = Math.max(boltTarget, boltOffset - f.dt * 26);
      boltGroup.position.z = boltOffset * (isPistol ? 0.026 : 0.021);

      heat = Math.max(0, heat - f.dt * 0.34);
      if (steelMesh) {
        const mat = steelMesh.material as THREE.MeshStandardMaterial;
        mat.emissive.setRGB(heat * heat * 0.30, heat * heat * 0.05, 0);
        mat.emissiveIntensity = heat * heat * 1.3;
      }

      flash = Math.max(0, flash - f.dt * 30);
      flashLight.intensity = flash * flash * 30 * (0.7 + flashSeed * 0.6);

      optics.update(f, eyeLocal);
    },
    dispose(): void {
      for (const m of owned) m.geometry.dispose();
      optics.dispose();
    },
  };

  return model;
}

// -------------------------------------------------------------------- rifle --

/** Upper receiver cross-section: flat sides, a shouldered top under the rail. */
function upperSection(): Array<[number, number]> {
  return [
    [0.0180, -0.0142],
    [0.0190, -0.0112],
    [0.0190, 0.0140],
    [0.0172, 0.0218],
    [0.0128, 0.0268],
    [0.0106, RECEIVER_TOP],
    [-0.0106, RECEIVER_TOP],
    [-0.0128, 0.0268],
    [-0.0172, 0.0218],
    [-0.0190, 0.0140],
    [-0.0190, -0.0112],
    [-0.0180, -0.0142],
  ];
}

/** As above with the right wall stepped in five millimetres: the port. */
function upperPortedSection(): Array<[number, number]> {
  return upperSection().map(
    (p): [number, number] => (p[0] > 0.0185 ? [0.0140, p[1]] : [p[0], p[1]]),
  );
}

function handguardSection(w: number): Array<[number, number]> {
  const hw = w / 2;
  const hh = w * 0.43;
  return [
    [hw, -0.0082],
    [hw, 0.0082],
    [hw * 0.62, hh],
    [-hw * 0.62, hh],
    [-hw, 0.0082],
    [-hw, -0.0082],
    [-hw * 0.62, -hh],
    [hw * 0.62, -hh],
  ];
}

function buildRifle(
  P: Proportions,
  b: Batches,
  muzzle: THREE.Object3D,
  ejectionPort: THREE.Object3D,
): void {
  const portFront = -0.080;
  const portBack = -0.020;

  // ------------------------------------------------------- upper receiver ---
  const full = upperSection();
  const ported = upperPortedSection();
  b.alloy.add(extrude(full, P.receiverFront, portFront));
  b.alloy.add(extrude(ported, portFront, portBack));
  b.alloy.add(extrude(full, portBack, P.receiverBack));

  // Barrel nut shroud, where the handguard indexes onto the receiver.
  b.alloy.add(
    revolve(
      [
        { r: 0, z: P.receiverFront - 0.013 },
        { r: 0.0208, z: P.receiverFront - 0.013 },
        { r: 0.0228, z: P.receiverFront - 0.009 },
        { r: 0.0228, z: P.receiverFront + 0.002 },
        { r: 0, z: P.receiverFront + 0.002 },
      ],
      18,
    ),
  );

  // Top rail.
  b.alloy.add(picatinnyRail(P.receiverBack - P.receiverFront - 0.004), {
    y: RECEIVER_TOP,
    z: (P.receiverFront + P.receiverBack) / 2,
  });

  // Charging handle: a T-bar under the rail with the latch on the left.
  //
  // Anodised aluminium, not steel of any finish. This is the closest part of
  // the weapon to the eye when aiming and it lies across the bottom of the
  // sight picture, so its roughness matters more than that of anything else
  // on the gun: at 0.42 with full metalness it came back as a wet black bar
  // with a specular streak running the length of it, which is a chromed
  // aftermarket part and not what anyone is issued.
  b.alloy.add(roundedBox(0.0195, 0.0060, 0.062, 0.0018, 2), {
    y: 0.0225,
    z: P.receiverBack - 0.020,
  });
  b.alloy.add(roundedBox(0.0520, 0.0072, 0.0150, 0.0022, 2), {
    y: 0.0225,
    z: P.receiverBack + 0.0125,
  });
  b.alloy.add(taperedBox(0.0200, 0.0068, 0.0130, 0.0056, 0.0165, 0.0020, 2), {
    x: -0.0215,
    y: 0.0225,
    z: P.receiverBack + 0.0180,
    ry: -0.22,
  });
  // Ribs across the face of the latch. Something has to catch light there or
  // the handle is a featureless slab at the one distance it is never small.
  for (let i = 0; i < 4; i++) {
    b.alloy.add(roundedBox(0.0460, 0.0026, 0.0022, 0.0008, 1), {
      y: 0.0258,
      z: P.receiverBack + 0.0072 + i * 0.0036,
    });
  }

  // Brass deflector and forward assist: the two lumps that make the right
  // side of this receiver pattern unmistakable at a glance.
  b.alloy.add(taperedBox(0.0195, 0.0215, 0.0125, 0.0135, 0.0072, 0.0030, 2), {
    x: 0.0218,
    y: 0.0045,
    z: portBack + 0.0125,
    ry: Math.PI / 2,
  });
  b.alloy.add(
    revolve(
      [
        { r: 0, z: 0 },
        { r: 0.0085, z: 0 },
        { r: 0.0085, z: 0.0075 },
        { r: 0.0062, z: 0.0098 },
        { r: 0, z: 0.0098 },
      ],
      12,
    ),
    { x: 0.0182, y: 0.0175, z: portBack + 0.0075, ry: Math.PI / 2 },
  );

  // Port lip, and the bolt carrier riding just inside it.
  b.alloy.add(roundedBox(0.0050, 0.0032, 0.0625, 0.0012, 1), {
    x: 0.0172,
    y: 0.0152,
    z: (portFront + portBack) / 2,
  });
  b.bolt.add(taperedBox(0.0038, 0.0232, 0.0038, 0.0232, 0.0900, 0.0030, 2), {
    x: 0.0143,
    y: 0.0022,
    z: portFront + 0.0400,
  });
  // Bolt face and extractor, visible in the port when the action is open.
  b.bolt.add(roundedBox(0.0060, 0.0190, 0.0075, 0.0020, 2), {
    x: 0.0132,
    y: 0.0022,
    z: portFront - 0.0035,
  });
  b.bolt.add(roundedBox(0.0055, 0.0058, 0.0140, 0.0016, 1), {
    x: 0.0152,
    y: 0.0092,
    z: portFront + 0.0140,
  });
  ejectionPort.position.set(0.022, 0.006, portFront + 0.020);

  // Takedown pins.
  const pin = revolve(
    [
      { r: 0, z: 0 },
      { r: 0.0044, z: 0 },
      { r: 0.0044, z: 0.0022 },
      { r: 0.0030, z: 0.0026 },
      { r: 0, z: 0.0026 },
    ],
    10,
  );
  b.steel.addMirrored(pin, { x: 0.0164, y: -0.0215, z: -0.1205, ry: Math.PI / 2 });
  b.steel.addMirrored(pin, { x: 0.0164, y: -0.0215, z: 0.0020, ry: Math.PI / 2 });

  // ------------------------------------------------------- lower receiver ---
  b.alloy.add(
    extrude(roundRectSection(0.0330, 0.0335, 0.0060, 2), -0.1280, P.receiverBack),
    { y: -0.0298 },
  );

  // Magazine well: flared, raked forward, and a genuinely separate mass from
  // the receiver body rather than the same box made taller.
  const rake = Math.PI / 2 + 0.10;
  b.alloy.add(
    extrude(
      [
        [0.0185, -0.0300],
        [0.0185, 0.0300],
        [0.0150, 0.0340],
        [-0.0150, 0.0340],
        [-0.0185, 0.0300],
        [-0.0185, -0.0300],
        [-0.0150, -0.0340],
        [0.0150, -0.0340],
      ],
      -0.0640,
      0,
      { capBack: false },
    ),
    { y: -0.0880, z: -0.0855, rx: rake },
  );
  b.alloy.add(
    extrude(
      [
        [0.0208, -0.0330],
        [0.0208, 0.0330],
        [-0.0208, 0.0330],
        [-0.0208, -0.0330],
      ],
      -0.0095,
      0,
      { capFront: false },
    ),
    { y: -0.0880, z: -0.0855, rx: rake },
  );

  // Trigger guard: a real loop, and a trigger inside it the finger can reach.
  const guard = new THREE.TorusGeometry(0.0192, 0.0029, 6, 20, Math.PI);
  guard.rotateY(Math.PI / 2);
  guard.rotateX(Math.PI);
  b.alloy.add(guard, { y: -0.0472, z: -0.0300 });
  b.alloy.add(roundedBox(0.0058, 0.0110, 0.0058, 0.0016, 1), { y: -0.0430, z: -0.0492 });
  b.alloy.add(roundedBox(0.0058, 0.0110, 0.0058, 0.0016, 1), { y: -0.0430, z: -0.0108 });
  b.steel.add(taperedBox(0.0062, 0.0170, 0.0058, 0.0125, 0.0075, 0.0022, 2), {
    y: -0.0400,
    z: -0.0305,
    rx: 0.20,
  });

  // Controls. Small, but their absence is exactly what makes a procedural gun
  // look unfinished: a receiver with no visible way to operate it.
  b.alloy.add(roundedBox(0.0070, 0.0140, 0.0140, 0.0035, 2), {
    x: 0.0178,
    y: -0.0225,
    z: -0.0460,
  });
  b.steel.add(
    revolve(
      [
        { r: 0, z: 0 },
        { r: 0.0045, z: 0 },
        { r: 0.0045, z: 0.0032 },
        { r: 0, z: 0.0032 },
      ],
      10,
    ),
    { x: 0.0202, y: -0.0225, z: -0.0460, ry: Math.PI / 2 },
  );
  b.steel.add(taperedBox(0.0052, 0.0125, 0.0046, 0.0092, 0.0300, 0.0018, 2), {
    x: -0.0192,
    y: -0.0208,
    z: -0.0475,
  });
  b.steel.add(roundedBox(0.0058, 0.0135, 0.0100, 0.0022, 2), {
    x: -0.0194,
    y: -0.0232,
    z: -0.0610,
  });
  // Selector lever, both sides, set to fire.
  const selector = taperedBox(0.0046, 0.0092, 0.0038, 0.0064, 0.0215, 0.0016, 2);
  b.steel.addMirrored(selector, { x: 0.0196, y: -0.0312, z: 0.0055, rx: 0.62 });
  b.steel.addMirrored(
    revolve(
      [
        { r: 0, z: 0 },
        { r: 0.0070, z: 0 },
        { r: 0.0070, z: 0.0026 },
        { r: 0, z: 0.0026 },
      ],
      12,
    ),
    { x: 0.0166, y: -0.0250, z: -0.0030, ry: Math.PI / 2 },
  );

  // ----------------------------------------------------------------- grip ---
  const gripAngle = 1.0645; // 61 degrees from horizontal
  const gripDir = new THREE.Vector3(0, -Math.sin(gripAngle), Math.cos(gripAngle));
  const gripTop = new THREE.Vector3(0, -0.0300, -0.0040);
  b.polymer.add(
    extrude(roundRectSection(0.0325, 0.0435, 0.0105, 3), 0.0, 0.1000, {
      capFront: false,
      capBack: true,
    }),
    { x: gripTop.x, y: gripTop.y, z: gripTop.z, rx: gripAngle },
  );
  // Flared base, and the beavertail the web of the hand sits under.
  b.polymer.add(taperedBox(0.0340, 0.0300, 0.0250, 0.0200, 0.0170, 0.0075, 2), {
    y: gripTop.y + gripDir.y * 0.1035,
    z: gripTop.z + gripDir.z * 0.1035,
    rx: gripAngle,
  });
  b.polymer.add(taperedBox(0.0300, 0.0230, 0.0330, 0.0300, 0.0170, 0.0080, 2), {
    y: gripTop.y + gripDir.y * 0.001 + 0.0055,
    z: gripTop.z + gripDir.z * 0.001 + 0.0100,
    rx: gripAngle - 0.35,
  });
  // Moulded grip panels.
  b.rubber.addMirrored(gripTexture(0.0290, 0.0620, 5, 11, 0.0009), {
    x: 0.0164,
    y: gripTop.y + gripDir.y * 0.0520,
    z: gripTop.z + gripDir.z * 0.0520,
    ry: Math.PI / 2,
    rx: gripAngle,
  });
  b.rubber.add(gripTexture(0.0230, 0.0560, 4, 10, 0.0009), {
    y: gripTop.y + gripDir.y * 0.0500 - Math.cos(gripAngle) * 0.0220,
    z: gripTop.z + gripDir.z * 0.0500 - Math.sin(gripAngle) * 0.0220,
    rx: gripAngle + Math.PI / 2,
  });

  // ------------------------------------------------------------ handguard ---
  const hw = P.handguardWidth;
  b.alloy.add(
    extrude(handguardSection(hw), P.handguardFront, P.receiverFront + 0.001, {
      capFront: false,
      capBack: false,
      skipEdges: [0, 4, 6],
    }),
  );
  const panelLen = P.receiverFront - P.handguardFront - 0.022;
  const panelMid = (P.receiverFront + P.handguardFront) / 2 - 0.004;
  const sidePanel = slottedPanel(0.0164, panelLen, P.mlokSlots, 0.0098, 0.0330, 0.0055);
  b.alloy.add(sidePanel, { x: hw / 2, z: panelMid, ry: Math.PI / 2, rz: Math.PI / 2 });
  b.alloy.add(sidePanel, { x: -hw / 2, z: panelMid, ry: -Math.PI / 2, rz: -Math.PI / 2 });
  b.alloy.add(slottedPanel(hw * 0.62, panelLen, P.mlokSlots, 0.0098, 0.0330, 0.0055), {
    y: -hw * 0.43,
    z: panelMid,
    rx: Math.PI / 2,
    rz: Math.PI,
  });

  // The raised spine that carries the rail up to receiver height.
  b.alloy.add(
    extrude(
      [
        [0.0124, -0.0060],
        [0.0106, 0.0072],
        [-0.0106, 0.0072],
        [-0.0124, -0.0060],
      ],
      P.handguardFront,
      P.receiverFront + 0.001,
      { capBack: false },
    ),
    { y: RECEIVER_TOP - 0.0072 },
  );
  b.alloy.add(picatinnyRail(P.receiverFront - P.handguardFront - 0.002), {
    y: RECEIVER_TOP,
    z: (P.receiverFront + P.handguardFront) / 2,
  });
  b.alloy.add(
    extrude(handguardSection(hw + 0.0022), P.handguardFront - 0.0055, P.handguardFront + 0.0005),
  );
  const screw = screwHead(0.0027, 0.0016);
  b.steel.addMirrored(screw, { x: hw / 2, y: -0.0128, z: P.receiverFront - 0.0140, ry: Math.PI / 2 });
  b.steel.addMirrored(screw, { x: hw / 2, y: -0.0128, z: P.handguardFront + 0.0170, ry: Math.PI / 2 });

  // QD sling socket on the left of the handguard.
  b.steel.add(
    revolve(
      [
        { r: 0, z: 0 },
        { r: 0.0060, z: 0 },
        { r: 0.0060, z: 0.0034 },
        { r: 0.0031, z: 0.0034 },
        { r: 0.0031, z: -0.0006 },
      ],
      12,
    ),
    { x: -hw / 2 + 0.0006, y: -0.0125, z: P.handguardFront + 0.0500, ry: -Math.PI / 2 },
  );

  // --------------------------------------------------------------- barrel ---
  b.barrel.add(
    revolve(
      [
        { r: 0, z: P.brakeFront + 0.0025 },
        { r: 0.0094, z: P.brakeFront + 0.0025 },
        { r: 0.0094, z: P.handguardFront - 0.0300 },
        { r: 0.0114, z: P.handguardFront - 0.0260 },
        { r: 0.0114, z: P.receiverFront - 0.0300 },
        { r: 0.0142, z: P.receiverFront - 0.0260 },
        { r: 0.0142, z: P.receiverFront },
        { r: 0, z: P.receiverFront },
      ],
      14,
    ),
  );
  // Low-profile gas block, glimpsed through the forward M-LOK cuts.
  b.barrel.add(roundedBox(0.0200, 0.0215, 0.0300, 0.0030, 2), {
    y: 0.0018,
    z: P.handguardFront + 0.0300,
  });

  // -------------------------------------------------------- muzzle device ---
  const bz = P.brakeFront;
  const boreR = 0.0040;
  b.barrel.add(
    revolve(
      [
        { r: 0, z: bz + 0.0300 },
        { r: boreR, z: bz + 0.0300 },
        { r: boreR, z: bz + 0.0016 },
        { r: boreR + 0.0018, z: bz },
        { r: 0.0142, z: bz },
        { r: 0.0142, z: bz + 0.0075 },
        { r: 0.0094, z: bz + 0.0085 },
        { r: 0.0094, z: bz + 0.0165 },
        { r: 0.0142, z: bz + 0.0175 },
        { r: 0.0142, z: bz + 0.0245 },
        { r: 0.0094, z: bz + 0.0255 },
        { r: 0.0094, z: bz + 0.0335 },
        { r: 0.0142, z: bz + 0.0345 },
        { r: 0.0142, z: bz + 0.0430 },
        { r: 0.0124, z: bz + 0.0468 },
        { r: 0.0124, z: bz + 0.0560 },
        { r: 0, z: bz + 0.0560 },
      ],
      18,
    ),
  );
  // Closed underside: the ports vent up and out, never down, or the blast
  // throws dust straight back into the shooter's face.
  b.barrel.add(roundedBox(0.0120, 0.0130, 0.0330, 0.0018, 2), {
    y: -0.0085,
    z: bz + 0.0210,
  });
  // Ports. The stepped body already reads as a brake in profile, but from
  // above — which is the only angle the player ever sees it from — it was a
  // smooth tube. Three pairs of blast baffles put slots on the skyline.
  const baffle = roundedBox(0.0290, 0.0130, 0.0034, 0.0012, 1);
  for (let i = 0; i < 3; i++) {
    b.barrel.add(baffle, { y: 0.0062, z: bz + 0.0085 + i * 0.0170 });
  }
  muzzle.position.set(0, 0, bz - 0.004);

  // Front sight, folded. Standing it up put the post a third of the way into
  // the sight picture, which is a co-witness nobody asked for; folded it
  // still breaks the skyline of the handguard and stays under the glass.
  b.barrel.add(taperedBox(0.0174, 0.0092, 0.0152, 0.0072, 0.0230, 0.0022, 2), {
    y: RAIL_TOP + 0.0044,
    z: P.handguardFront + 0.0230,
  });
  b.barrel.add(taperedBox(0.0128, 0.0180, 0.0106, 0.0150, 0.0058, 0.0016, 1), {
    y: RAIL_TOP + 0.0062,
    z: P.handguardFront + 0.0332,
    rx: Math.PI / 2 - 0.14,
  });
  // Hinge boss, so it reads as a part that folds rather than a lump.
  b.steel.addMirrored(
    revolve(
      [
        { r: 0, z: 0 },
        { r: 0.0038, z: 0 },
        { r: 0.0038, z: 0.0016 },
        { r: 0, z: 0.0016 },
      ],
      10,
    ),
    { x: 0.0080, y: RAIL_TOP + 0.0050, z: P.handguardFront + 0.0270, ry: Math.PI / 2 },
  );

  buildStock(P, b);
  buildMagazine(P, b);
  buildRifleHands(P, gripTop, gripDir, b);
}

function buildStock(P: Proportions, b: Batches): void {
  const back = P.stockBack;
  b.alloy.add(
    revolve(
      [
        { r: 0, z: P.receiverBack },
        { r: 0.0188, z: P.receiverBack },
        { r: 0.0188, z: P.receiverBack + 0.0100 },
        { r: 0.0152, z: P.receiverBack + 0.0125 },
        { r: 0.0152, z: back - 0.0040 },
        { r: 0, z: back - 0.0040 },
      ],
      14,
    ),
  );
  // Castle nut and receiver end plate. Two rings 10 mm long, and they earn
  // their place: the receiver extension behind them is the closest object to
  // the eye when aiming and it is a smooth cylinder, so it came back as one
  // blank pale wedge across the bottom of the sight picture. Anything with an
  // edge on it there gives the eye a scale and a horizon.
  b.steel.add(
    revolve(
      [
        { r: 0.0155, z: P.receiverBack + 0.0010 },
        { r: 0.0196, z: P.receiverBack + 0.0016 },
        { r: 0.0196, z: P.receiverBack + 0.0056 },
        { r: 0.0158, z: P.receiverBack + 0.0064 },
      ],
      16,
    ),
  );
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.4;
    b.steel.add(roundedBox(0.0042, 0.0070, 0.0040, 0.0012, 1), {
      x: Math.sin(a) * 0.0180,
      y: Math.cos(a) * 0.0180,
      z: P.receiverBack + 0.0036,
      rz: -a,
    });
  }

  // Stock body. Run forward far enough to sheathe most of the extension: on a
  // real carbine the stock slides over the tube and only a castle nut's width
  // of it is ever bare.
  b.polymer.add(
    extrude(roundRectSection(0.0410, 0.0560, 0.0110, 3), back - 0.1180, back - 0.0180),
    { y: 0.0015 },
  );
  // Comb.
  //
  // This is the single largest object in the aiming picture — the eye sits
  // five centimetres from it, so it is magnified past anything else on the
  // weapon and a plain box here reads as a grey wall across the bottom sixth
  // of the screen. It gets a lower, narrower core than the first version so
  // less of it is in frame at all, then a rubber cheek pad and a pair of
  // moulded flutes so that what remains has a horizon line and a material
  // change rather than one unbroken plane of sky-lit polymer.
  const combY = 0.0242;
  b.polymer.add(taperedBox(0.0292, 0.0125, 0.0243, 0.0102, 0.0850, 0.0048, 2), {
    y: combY,
    z: back - 0.0580,
    rx: -0.05,
  });
  b.rubber.add(taperedBox(0.0214, 0.0062, 0.0186, 0.0055, 0.0668, 0.0026, 2), {
    y: combY + 0.0079,
    z: back - 0.0596,
    rx: -0.05,
  });
  for (const sx of [-1, 1]) {
    b.polymer.add(taperedBox(0.0044, 0.0072, 0.0038, 0.0062, 0.0700, 0.0018, 1), {
      x: sx * 0.0128,
      y: combY + 0.0022,
      z: back - 0.0590,
      rx: -0.05,
    });
  }
  // Length-of-pull detents down the underside of the comb: six shadow lines
  // that give the stock a scale reference from any angle.
  for (let i = 0; i < 6; i++) {
    b.polymer.add(roundedBox(0.0300, 0.0034, 0.0038, 0.0014, 1), {
      y: combY - 0.0060,
      z: back - 0.0930 + i * 0.0140,
    });
  }
  b.polymer.add(taperedBox(0.0340, 0.0280, 0.0300, 0.0230, 0.0500, 0.0070, 2), {
    y: -0.0270,
    z: back - 0.0360,
    rx: 0.12,
  });
  b.polymer.add(taperedBox(0.0420, 0.0740, 0.0400, 0.0700, 0.0130, 0.0060, 2), {
    y: -0.0060,
    z: back - 0.0140,
    rx: -0.13,
  });
  b.rubber.add(taperedBox(0.0400, 0.0715, 0.0330, 0.0640, 0.0120, 0.0055, 2), {
    y: -0.0055,
    z: back - 0.0020,
    rx: -0.13,
  });
  b.polymer.add(taperedBox(0.0130, 0.0135, 0.0110, 0.0100, 0.0420, 0.0035, 2), {
    y: -0.0320,
    z: back - 0.0700,
    rx: 0.22,
  });
  b.steel.add(
    revolve(
      [
        { r: 0, z: 0 },
        { r: 0.0062, z: 0 },
        { r: 0.0062, z: 0.0040 },
        { r: 0.0032, z: 0.0040 },
        { r: 0.0032, z: -0.0004 },
      ],
      12,
    ),
    { x: -0.0200, y: -0.0080, z: back - 0.0840, ry: -Math.PI / 2 },
  );
}

function buildMagazine(P: Proportions, b: Batches): void {
  // A curved box magazine built as raked segments, so the curve is in the
  // silhouette rather than implied by a texture.
  const rake = Math.PI / 2 + 0.10;
  const segs = P.magRounds >= 30 ? 4 : 3;
  const segLen = P.magRounds >= 30 ? 0.0345 : 0.0300;
  const curve = 0.052;

  const cursor = new THREE.Vector3(0, -0.0870, -0.0855);
  const dir = new THREE.Vector3();
  let angle = 0;
  for (let i = 0; i < segs; i++) {
    const t = i / Math.max(segs - 1, 1);
    const w = 0.0248 - t * 0.0010;
    const d = 0.0300 - t * 0.0022;
    b.mag.add(
      extrude(roundRectSection(w, d, 0.0045, 2), 0, segLen + 0.0015, {
        capFront: i === 0,
        capBack: false,
      }),
      { x: cursor.x, y: cursor.y, z: cursor.z, rx: rake + angle },
    );
    if (i > 0) {
      b.mag.addMirrored(roundedBox(0.0022, 0.0058, 0.0175, 0.0008, 1), {
        x: 0.0126,
        y: cursor.y - Math.cos(0.10 + angle) * segLen * 0.5,
        z: cursor.z - Math.sin(0.10 + angle) * segLen * 0.5,
        rx: rake + angle,
      });
    }
    dir.set(0, -Math.cos(0.10 + angle), -Math.sin(0.10 + angle));
    cursor.addScaledVector(dir, segLen);
    angle += curve;
  }
  // Floor plate with a finger ledge.
  b.mag.add(
    extrude(roundRectSection(0.0274, 0.0330, 0.0042, 2), -0.0010, 0.0130, { capFront: false }),
    { x: cursor.x, y: cursor.y, z: cursor.z, rx: rake + angle },
  );
}

/**
 * Poses the two hands onto the weapon.
 *
 * Neither grip is authored as angles. Each names the part being held — its
 * axis, its radius, and where around it the knuckles sit — and the solver in
 * `Hands` returns the transform and the joint angles that close the fingers on
 * that surface. The support hand takes the modern thumb-forward hold on the
 * handguard, the trigger hand wraps the grip with the index reaching the
 * trigger face, and both forearms are aimed at an elbow far enough back that
 * the sleeve leaves the frame rather than stopping inside it.
 */
function buildRifleHands(
  P: Proportions,
  gripTop: THREE.Vector3,
  gripDir: THREE.Vector3,
  b: Batches,
): void {
  // ---- trigger hand ------------------------------------------------------
  // Axis up the grip, so the right thumb comes off the top end by the
  // selector. The wrist sits just off the backstrap and the palm sweeps round
  // the right side, which puts the fingers on the front of the grip and the
  // fingertips back against the heel of the hand on the left — the shape a
  // closed fist on a pistol grip actually makes.
  const right = solveCylinderGrip({
    centre: gripTop.clone().addScaledVector(gripDir, 0.0455),
    axis: gripDir.clone().negate(),
    radius: 0.0198,
    up: new THREE.Vector3(0, gripDir.z, -gripDir.y).normalize(),
    wrist: 0.30,
  });
  buildHand(
    {
      side: 'right',
      fingers: [
        // The index leaves the wrap: it is on the trigger, which is forward of
        // the grip and a good deal straighter than a closed finger. It still
        // has to *stop* on the trigger, though — the flatter first version
        // reached clean through the guard and put a fingertip out in the air
        // on the far side, which is the sort of thing nobody consciously
        // notices and everybody registers as wrong.
        { curl: [0.60, 1.18, 0.86], spread: -0.09, lift: -0.40 },
        { curl: right.curls[1], spread: 0.02 },
        { curl: right.curls[2], spread: 0.07 },
        { curl: right.curls[3], spread: 0.15 },
      ],
      // Lying along the frame just under the selector, pointing downrange
      // rather than standing off it: a thumb that leaves the receiver reads
      // from above as a stray finger with nothing to do.
      thumb: { dir: new THREE.Vector3(-0.13, 0.26, -0.957), curl: [0.60, 0.54] },
      forearm: { dir: new THREE.Vector3(0.34, -0.50, 0.80), length: 0.34 },
      cup: right.cup,
    },
    right.place,
    b.glove,
    b.sleeve,
  );

  // ---- support hand ------------------------------------------------------
  // Axis toward the shooter, so the left thumb comes off the downrange end of
  // the palm and lies along the handguard. The wrist enters low on the left,
  // the palm crosses the underside, and the fingers close up the far side and
  // over the top towards the eye — which is the half of the grip the player
  // can actually see, and the reason to take the trouble at all.
  const left = solveCylinderGrip({
    centre: new THREE.Vector3(0, 0, P.supportHandZ),
    axis: new THREE.Vector3(0, 0, 1),
    radius: P.handguardWidth * 0.48,
    up: new THREE.Vector3(0, 1, 0),
    wrist: 2.42,
    // Just short of a full wrap. A hand closed to the last degree is a fist
    // with a rifle inside it; leaving the fingers a few degrees open is what
    // separates them into four objects instead of one dark lump, and it is
    // also how anyone actually holds a handguard they intend to let go of.
    close: 0.93,
  });
  buildHand(
    {
      side: 'left',
      fingers: [
        { curl: left.curls[0], spread: -0.10 },
        { curl: left.curls[1], spread: -0.03 },
        { curl: left.curls[2], spread: 0.05 },
        { curl: left.curls[3], spread: 0.15 },
      ],
      thumb: { dir: new THREE.Vector3(0.30, 0.44, -0.85), curl: [0.62, 0.52] },
      // Out to the left as hard as down. A support arm that drops vertically
      // out of frame is a column standing in the middle of the shot; angling it
      // across to the bottom-left corner turns the same geometry into a frame
      // edge, and it is also where the elbow of anyone actually holding a rifle
      // at this angle would be.
      forearm: { dir: new THREE.Vector3(-0.56, -0.62, 0.55), length: 0.34 },
      cup: left.cup,
      scale: 0.97,
    },
    left.place,
    b.glove,
    b.sleeve,
  );
}

// ------------------------------------------------------------------ pistol --

function buildPistol(b: Batches, muzzle: THREE.Object3D, ejectionPort: THREE.Object3D): void {
  const slide: Array<[number, number]> = [
    [0.0140, -0.0110],
    [0.0140, 0.0090],
    [0.0116, 0.0136],
    [-0.0116, 0.0136],
    [-0.0140, 0.0090],
    [-0.0140, -0.0110],
  ];
  b.barrel.add(extrude(slide, -0.1480, 0.0220), { y: 0.0125 });
  const serration = roundedBox(0.0028, 0.0175, 0.0026, 0.0008, 1);
  for (let i = 0; i < 7; i++) {
    b.steel.addMirrored(serration, { x: 0.0142, y: 0.0140, z: 0.0130 - i * 0.0052, rz: 0.16 });
  }
  b.barrel.add(
    revolve(
      [
        { r: 0, z: -0.1580 },
        { r: 0.0076, z: -0.1580 },
        { r: 0.0076, z: -0.1500 },
        { r: 0.0058, z: -0.1500 },
        { r: 0.0058, z: -0.1200 },
      ],
      12,
    ),
    { y: 0.0100 },
  );
  muzzle.position.set(0, 0.010, -0.162);
  ejectionPort.position.set(0.015, 0.020, -0.020);

  b.polymer.add(extrude(roundRectSection(0.0270, 0.0230, 0.0055, 2), -0.1300, 0.0100), {
    y: -0.0075,
  });
  b.polymer.add(picatinnyRail(0.0440, 0.0182), { y: -0.0208, z: -0.0960, rz: Math.PI });

  const gripAngle = 1.2000;
  const gripDir = new THREE.Vector3(0, -Math.sin(gripAngle), Math.cos(gripAngle));
  const gripTop = new THREE.Vector3(0, -0.0180, 0.0035);
  b.polymer.add(
    extrude(roundRectSection(0.0320, 0.0400, 0.0090, 3), 0.0, 0.0980, { capFront: false }),
    { y: gripTop.y, z: gripTop.z, rx: gripAngle },
  );
  b.rubber.addMirrored(gripTexture(0.0280, 0.0560, 5, 10, 0.0008), {
    x: 0.0160,
    y: gripTop.y + gripDir.y * 0.0520,
    z: gripTop.z + gripDir.z * 0.0520,
    ry: Math.PI / 2,
    rx: gripAngle,
  });
  const guard = new THREE.TorusGeometry(0.0182, 0.0032, 6, 18, Math.PI);
  guard.rotateY(Math.PI / 2);
  guard.rotateX(Math.PI);
  b.polymer.add(guard, { y: -0.0390, z: -0.0330 });
  b.steel.add(taperedBox(0.0058, 0.0155, 0.0054, 0.0120, 0.0070, 0.0020, 2), {
    y: -0.0330,
    z: -0.0330,
    rx: 0.18,
  });
  // Slide stop and takedown lever on the left, magazine release on the right.
  b.steel.add(taperedBox(0.0044, 0.0080, 0.0038, 0.0060, 0.0280, 0.0016, 2), {
    x: -0.0148,
    y: -0.0030,
    z: -0.0340,
  });
  b.steel.add(roundedBox(0.0060, 0.0110, 0.0110, 0.0026, 2), {
    x: 0.0148,
    y: -0.0090,
    z: -0.0090,
  });

  b.mag.add(
    extrude(roundRectSection(0.0250, 0.0330, 0.0050, 2), 0.0, 0.0960, { capFront: false }),
    { y: -0.0185, z: 0.0035, rx: gripAngle },
  );
  b.mag.add(
    extrude(roundRectSection(0.0330, 0.0380, 0.0055, 2), 0.0960, 0.1065),
    { y: -0.0185, z: 0.0035, rx: gripAngle },
  );

  // Both hands on the grip: the strong hand wraps the frame, the support hand
  // closes over its fingers in a thumbs-forward two-handed hold.
  const backstrap = new THREE.Vector3(0, gripDir.z, -gripDir.y).normalize();
  const right = solveCylinderGrip({
    centre: gripTop.clone().addScaledVector(gripDir, 0.0420),
    axis: gripDir.clone().negate(),
    radius: 0.0192,
    up: backstrap,
    wrist: 0.32,
  });
  buildHand(
    {
      side: 'right',
      fingers: [
        { curl: [0.74, 0.90, 0.44], spread: -0.09, lift: -0.42 },
        { curl: right.curls[1], spread: 0.02 },
        { curl: right.curls[2], spread: 0.07 },
        { curl: right.curls[3], spread: 0.14 },
      ],
      thumb: { dir: new THREE.Vector3(-0.26, 0.30, -0.92), curl: [0.34, 0.22] },
      forearm: { dir: new THREE.Vector3(0.30, -0.54, 0.79), length: 0.34 },
      cup: right.cup,
    },
    right.place,
    b.glove,
    b.sleeve,
  );

  // The support hand closes over the strong hand's fingers, so it wraps the
  // same way round but a full finger-thickness further out, and its wrist
  // comes in from the left where the strong hand's is not.
  const left = solveCylinderGrip({
    centre: gripTop.clone().addScaledVector(gripDir, 0.0500),
    axis: gripDir.clone().negate(),
    radius: 0.0330,
    up: backstrap,
    wrist: -0.62,
    close: 0.92,
  });
  buildHand(
    {
      side: 'left',
      fingers: [
        { curl: left.curls[0], spread: -0.06 },
        { curl: left.curls[1], spread: -0.01 },
        { curl: left.curls[2], spread: 0.05 },
        { curl: left.curls[3], spread: 0.12 },
      ],
      thumb: { dir: new THREE.Vector3(-0.14, 0.26, -0.96), curl: [0.20, 0.14] },
      forearm: { dir: new THREE.Vector3(-0.46, -0.52, 0.72), length: 0.34 },
      cup: left.cup,
      scale: 0.97,
    },
    left.place,
    b.glove,
    b.sleeve,
  );
}

// ------------------------------------------------------------------- optic --

interface OpticRig {
  centreY: number;
  centreZ: number;
  eyeRelief: number;
  attach(group: THREE.Group): void;
  update(f: WeaponFrame, tmp: THREE.Vector3): void;
  dispose(): void;
}

function buildOptic(def: WeaponDef, body: GeoBatch, isPistol: boolean): OpticRig {
  const isScope = def.optic === 'acog' || def.optic === 'sniper';
  const y = OPTIC_HEIGHT;
  const noop = (): void => {};

  if (def.optic === 'iron') {
    // A sidearm's sight picture *is* the irons, so the notch and the blade are
    // built to a single sight line: the top of the front blade lands exactly
    // on the bottom of the rear notch, which is the whole point of the parts
    // and the thing that is invariably wrong when they are eyeballed.
    const deckY = isPistol ? 0.0261 : RAIL_TOP;
    const sightLine = deckY + 0.0059;
    const rearZ = isPistol ? 0.0140 : -0.0060;
    const frontZ = isPistol ? -0.1400 : -0.2000;
    body.add(taperedBox(0.0170, 0.0060, 0.0160, 0.0052, 0.0072, 0.0014, 2), {
      y: deckY + 0.0029,
      z: rearZ,
    });
    body.addMirrored(roundedBox(0.0052, 0.0060, 0.0072, 0.0012, 1), {
      x: 0.0058,
      y: sightLine + 0.0030,
      z: rearZ,
    });
    body.add(taperedBox(0.0042, 0.0059, 0.0038, 0.0059, 0.0044, 0.0009, 1), {
      y: deckY + 0.0030,
      z: frontZ,
    });
    return {
      centreY: sightLine,
      centreZ: rearZ,
      eyeRelief: 0.235,
      attach: noop,
      update: noop,
      dispose: noop,
    };
  }

  // A red dot is a long thin tube. The first pass made it 37 mm across and
  // 61 mm long — a ratio of 1.6, where every optic anyone has actually
  // shouldered is north of 2.2 — and a stubby fat one reads as a toy scope
  // rather than a sight. Narrowing and lengthening it also buys back three
  // percent of screen height in the aiming picture and drops the aperture's
  // lower edge below the folded front sight, which was showing up as a black
  // notch in the bottom of the glass.
  const tubeR = isScope ? 0.0215 : 0.0170;
  const zFront = isScope ? -0.1080 : -0.0680;
  const zBack = isScope ? 0.0300 : 0.0060;
  const aperture = tubeR - 0.0030;

  // Tube: an outer wall with crowned rims, and an inner wall whose normals
  // face the axis so the bore of the sight is genuinely hollow.
  body.add(
    revolve(
      [
        { r: aperture, z: zFront + 0.0045 },
        { r: aperture, z: zFront + 0.0014 },
        { r: tubeR - 0.0007, z: zFront },
        { r: tubeR, z: zFront + 0.0024 },
        { r: tubeR, z: zFront + 0.0100 },
        { r: tubeR - 0.0016, z: zFront + 0.0130, smooth: true },
        { r: tubeR - 0.0016, z: zBack - 0.0130, smooth: true },
        { r: tubeR, z: zBack - 0.0100 },
        { r: tubeR, z: zBack - 0.0024 },
        { r: tubeR - 0.0007, z: zBack },
        { r: aperture, z: zBack - 0.0014 },
        { r: aperture, z: zBack - 0.0045 },
      ],
      24,
    ),
    { y },
  );

  if (isScope) {
    body.add(
      revolve(
        [
          { r: 0.0290, z: zFront - 0.0300 },
          { r: 0.0312, z: zFront - 0.0260 },
          { r: 0.0312, z: zFront - 0.0080, smooth: true },
          { r: tubeR + 0.0010, z: zFront + 0.0040 },
        ],
        22,
      ),
      { y },
    );
    body.add(
      revolve(
        [
          { r: tubeR, z: zBack - 0.0040 },
          { r: 0.0250, z: zBack + 0.0060, smooth: true },
          { r: 0.0250, z: zBack + 0.0240 },
          { r: 0.0230, z: zBack + 0.0280 },
        ],
        22,
      ),
      { y },
    );
    const turret = revolve(
      [
        { r: 0, z: 0 },
        { r: 0.0122, z: 0 },
        { r: 0.0122, z: 0.0165 },
        { r: 0.0100, z: 0.0185 },
        { r: 0, z: 0.0185 },
      ],
      14,
    );
    body.add(turret, { y: y + tubeR - 0.0020, z: zFront + 0.0520, rx: -Math.PI / 2 });
    body.add(turret, { x: tubeR - 0.0020, y, z: zFront + 0.0520, ry: Math.PI / 2 });
  } else {
    const cap = revolve(
      [
        { r: 0, z: 0 },
        { r: 0.0082, z: 0 },
        { r: 0.0082, z: 0.0092 },
        { r: 0.0066, z: 0.0106 },
        { r: 0, z: 0.0106 },
      ],
      12,
    );
    body.add(cap, { y: y + tubeR - 0.0010, z: zFront + 0.0220, rx: -Math.PI / 2 });
    body.add(cap, { x: tubeR - 0.0010, y, z: zFront + 0.0220, ry: Math.PI / 2 });
    body.add(
      revolve(
        [
          { r: 0, z: 0 },
          { r: 0.0114, z: 0 },
          { r: 0.0114, z: 0.0125 },
          { r: 0.0094, z: 0.0142 },
          { r: 0, z: 0.0142 },
        ],
        14,
      ),
      { x: -(tubeR - 0.0010), y, z: zFront + 0.0300, ry: -Math.PI / 2 },
    );
  }

  // Mount: a rail clamp, a riser and two cross-bolts. This matters because the
  // mount is the only thing tying the optic to the weapon, and an optic that
  // floats above the rail is the tell of a procedural gun.
  const mountFront = zFront + (isScope ? 0.0300 : 0.0060);
  const mountBack = zBack - (isScope ? 0.0300 : 0.0060);
  const riserH = y - tubeR + 0.0016 - RAIL_TOP;
  body.add(
    extrude(
      [
        [0.0132, 0],
        [0.0104, riserH],
        [-0.0104, riserH],
        [-0.0132, 0],
      ],
      mountFront,
      mountBack,
    ),
    { y: RAIL_TOP },
  );
  const clamp = extrude(roundRectSection(0.0330, 0.0135, 0.0026, 2), -0.0075, 0.0075);
  body.add(clamp, { y: RAIL_TOP - 0.0042, z: mountFront + 0.0090 });
  body.add(clamp, { y: RAIL_TOP - 0.0042, z: mountBack - 0.0090 });
  const bolt = revolve(
    [
      { r: 0, z: 0 },
      { r: 0.0042, z: 0 },
      { r: 0.0042, z: 0.0034 },
      { r: 0, z: 0.0034 },
    ],
    10,
  );
  body.add(bolt, { x: 0.0168, y: RAIL_TOP - 0.0042, z: mountFront + 0.0090, ry: Math.PI / 2 });
  body.add(bolt, { x: 0.0168, y: RAIL_TOP - 0.0042, z: mountBack - 0.0090, ry: Math.PI / 2 });
  body.add(
    extrude(roundRectSection(0.0250, 0.0120, 0.0024, 2), mountFront + 0.0040, mountBack - 0.0040),
    { y: y - tubeR - 0.0010 },
  );

  // ---- glass and reticle -------------------------------------------------
  const glassMat = new THREE.ShaderMaterial({
    vertexShader: GLASS_VERT,
    fragmentShader: GLASS_FRAG,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: {
      uTint: { value: new THREE.Color(0.09, 0.26, 0.48) },
      uRadius: { value: aperture },
      uSky: { value: 0.5 },
    },
  });
  const ocular = new THREE.Mesh(new THREE.CircleGeometry(aperture, 28), glassMat);
  ocular.position.set(0, y, zBack - 0.0060);
  ocular.renderOrder = 10;
  ocular.frustumCulled = false;
  const objective = new THREE.Mesh(new THREE.CircleGeometry(aperture, 28), glassMat);
  objective.position.set(0, y, zFront + 0.0060);
  objective.renderOrder = 9;
  objective.frustumCulled = false;

  const reticleMat = new THREE.ShaderMaterial({
    vertexShader: RETICLE_VERT,
    fragmentShader: RETICLE_FRAG,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uColor: { value: new THREE.Color(1.0, 0.13, 0.045) },
      uBrightness: { value: 11.0 },
      uDotAngle: { value: isScope ? 0.0026 : 0.0040 },
      uRingAngle: { value: isScope ? 0.0135 : 0.0175 },
      uType: { value: def.optic === 'acog' ? 1 : def.optic === 'holo' ? 2 : 0 },
      uEyeLocal: { value: new THREE.Vector3(0, 0, 0.18) },
      uAperture: { value: aperture },
    },
  });
  const reticle = new THREE.Mesh(new THREE.CircleGeometry(aperture, 28), reticleMat);
  reticle.position.set(0, y, (zFront + zBack) * 0.5);
  reticle.renderOrder = 12;
  reticle.frustumCulled = false;

  return {
    centreY: y,
    centreZ: (zFront + zBack) * 0.5,
    // Eye relief here is the framing distance, not the optic's spec sheet: it
    // is what decides how much of the screen the tube eats when aiming. At
    // 160 mm a 37 mm red dot covered a third of the frame height and buried
    // the receiver, which is how a sight picture ends up reading as a
    // porthole. Backing off to 215 mm brings it to a quarter, leaves the rail
    // and the support hand visible underneath, and matches where a shooter
    // actually holds a non-magnified optic.
    eyeRelief: isScope ? 0.235 : 0.215,
    attach(g: THREE.Group): void {
      g.add(objective, ocular, reticle);
    },
    update(f: WeaponFrame, tmp: THREE.Vector3): void {
      // Collimation needs the eye in the reticle's own space. The parent chain
      // is one frame stale here, which at these angles is far below a pixel.
      reticle.updateWorldMatrix(true, false);
      tmp.copy(f.eye);
      reticle.worldToLocal(tmp);
      (reticleMat.uniforms.uEyeLocal.value as THREE.Vector3).copy(tmp);
      // A real emitter is not steady, and the brightness has to fall away out
      // of the aim or the dot blooms across the screen from the hip.
      reticleMat.uniforms.uBrightness.value =
        (1.3 + f.ads * 4.4) * (0.96 + Math.sin(f.elapsed * 47.3) * 0.04);
      glassMat.uniforms.uSky.value = 0.32 + f.ads * 0.34;
    },
    dispose(): void {
      glassMat.dispose();
      reticleMat.dispose();
      ocular.geometry.dispose();
      objective.geometry.dispose();
      reticle.geometry.dispose();
    },
  };
}

export type { WeaponDef };
