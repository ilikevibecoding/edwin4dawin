import * as THREE from 'three';
import { brushedMaps, rubberMaps, wornMetalMaps } from '../textures/vehicle.js';
import { deadWoodMaps } from '../textures/nature.js';
import {
  ashMaps,
  canvasMaps,
  dryGrassCutout,
  galvMaps,
  mapBoardMap,
  paintedSteelMaps,
  polyMaps,
  ropeMaps,
  savannaRockMaps,
  signMap,
  solarMaps,
  timberMaps,
} from './textures.js';

// ---------------------------------------------------------------------------
// The camp's material library. Keys are what every builder references through
// `Kit.add(key, ...)`, so one merged mesh per key is the whole static camp.
//
// The truck's maps are borrowed where a substance is genuinely the same —
// blasted steel, brushed aluminium, moulded rubber — but the truck's materials
// themselves are not, because their dirt and reflection shaders are keyed to
// the truck's own object space (arch fans at z = ±1.53) and a merged camp mesh
// would wear that mud in one spot near its origin.
// ---------------------------------------------------------------------------

let cached = null;

const V2 = (s) => new THREE.Vector2(s, s);

export function campMaterials(env = null) {
  if (cached) return cached;
  const m = {};

  const canvasOf = (kind, color = 0xffffff, extra = {}) => {
    const t = canvasMaps(kind);
    return new THREE.MeshStandardMaterial({
      map: t.map,
      normalMap: t.normal,
      roughnessMap: t.rough,
      normalScale: V2(0.8),
      color,
      metalness: 0,
      roughness: 1,
      envMapIntensity: 0.35,
      side: THREE.DoubleSide,
      ...extra,
    });
  };
  m.canvas = canvasOf('khaki');
  m.canvasOlive = canvasOf('olive');
  m.canvasSand = canvasOf('sand');
  m.canvasGreen = canvasOf('green');
  // camp chairs and the mess-tent roll-ups: a heavier, darker cloth
  m.canvasChair = canvasOf('green', 0x8a7a5a);
  // a poly tarp is canvas that has never been anything but one flat colour
  m.tarp = canvasOf('sand', 0x6f8592, { roughness: 0.7, envMapIntensity: 0.5 });

  const timber = timberMaps('grey');
  m.timber = new THREE.MeshStandardMaterial({
    map: timber.map,
    normalMap: timber.normal,
    roughnessMap: timber.rough,
    normalScale: V2(1.0),
    metalness: 0,
    roughness: 1,
    envMapIntensity: 0.3,
  });
  const timberWarm = timberMaps('warm');
  m.timberWarm = new THREE.MeshStandardMaterial({
    map: timberWarm.map,
    normalMap: timberWarm.normal,
    roughnessMap: timberWarm.rough,
    normalScale: V2(1.0),
    metalness: 0,
    roughness: 1,
    envMapIntensity: 0.3,
  });
  // Poles and posts: the same silvered wood, but a bark-stripped round section
  // reads darker in the grain than a sawn board, so it carries a tint.
  m.pole = new THREE.MeshStandardMaterial({
    map: timber.map,
    normalMap: timber.normal,
    roughnessMap: timber.rough,
    normalScale: V2(0.9),
    color: 0x8f7d66,
    metalness: 0,
    roughness: 1,
    envMapIntensity: 0.3,
  });

  const galv = galvMaps();
  m.galv = new THREE.MeshStandardMaterial({
    map: galv.map,
    normalMap: galv.normal,
    roughnessMap: galv.rough,
    metalnessMap: galv.metalness,
    normalScale: V2(1.2),
    metalness: 1,
    roughness: 1,
    envMapIntensity: 0.4,
    side: THREE.DoubleSide,
  });

  const painted = (color, seed, extra = {}) => {
    const t = paintedSteelMaps(color, seed);
    return new THREE.MeshStandardMaterial({
      map: t.map,
      normalMap: t.normal,
      roughnessMap: t.rough,
      normalScale: V2(0.6),
      metalness: 0.12,
      roughness: 1,
      envMapIntensity: 0.5,
      ...extra,
    });
  };
  m.steelGreen = painted(0x4a5a3a, 97);
  m.steelWhite = painted(0xb9b5a8, 101, { side: THREE.DoubleSide }); // the VSAT dish is a shell
  m.steelRed = painted(0x9a2f22, 103);
  m.steelBlue = painted(0x2e4f7a, 107);
  m.steelYellow = painted(0xc9a227, 109);
  m.steelBlack = painted(0x262a2c, 113, { metalness: 0.2 });

  const worn = wornMetalMaps(5);
  m.steel = new THREE.MeshStandardMaterial({
    map: worn.map,
    normalMap: worn.normal,
    roughnessMap: worn.rough,
    metalnessMap: worn.metalness,
    normalScale: V2(0.8),
    metalness: 0.6,
    roughness: 1,
    envMapIntensity: 0.5,
  });
  const brushed = brushedMaps();
  m.alu = new THREE.MeshStandardMaterial({
    color: 0x8f969c,
    metalness: 0.85,
    roughness: 1,
    normalMap: brushed.normal,
    roughnessMap: brushed.satin,
    normalScale: V2(0.5),
    envMapIntensity: 0.35,
  });
  const rubber = rubberMaps();
  m.rubber = new THREE.MeshStandardMaterial({
    map: rubber.map,
    normalMap: rubber.normal,
    roughnessMap: rubber.rough,
    normalScale: V2(1.0),
    metalness: 0,
    roughness: 1,
    envMapIntensity: 0.25,
  });
  // Steel wire: fence strands, guy wires, aerials. Too thin to carry a map.
  m.wire = new THREE.MeshStandardMaterial({ color: 0x4d4f50, metalness: 0.7, roughness: 0.55, envMapIntensity: 0.4 });

  const rope = ropeMaps();
  m.rope = new THREE.MeshStandardMaterial({
    map: rope.map,
    normalMap: rope.normal,
    normalScale: V2(0.8),
    metalness: 0,
    roughness: 0.95,
    envMapIntensity: 0.2,
  });

  const poly = polyMaps();
  const plastic = (color, extra = {}) =>
    new THREE.MeshStandardMaterial({
      map: poly.map,
      normalMap: poly.normal,
      roughnessMap: poly.rough,
      normalScale: V2(0.5),
      color,
      metalness: 0,
      roughness: 1,
      envMapIntensity: 0.45,
      ...extra,
    });
  m.poly = plastic(0xc4c0b4);
  m.polyBlack = plastic(0x1f2022, { envMapIntensity: 0.3 });
  m.polyBlue = plastic(0x2f5f8f);
  m.polyGreen = plastic(0x4f6a3a);
  m.polyRed = plastic(0xb03a24);
  m.polyYellow = plastic(0xc9a63a);

  const rock = savannaRockMaps();
  m.rock = new THREE.MeshStandardMaterial({
    map: rock.map,
    normalMap: rock.normal,
    roughnessMap: rock.rough,
    normalScale: V2(1.3),
    metalness: 0,
    roughness: 1,
    envMapIntensity: 0.3,
  });
  const dead = deadWoodMaps();
  m.deadwood = new THREE.MeshStandardMaterial({
    map: dead.map,
    normalMap: dead.normal,
    roughnessMap: dead.rough,
    aoMap: dead.ao,
    normalScale: V2(1.1),
    color: 0xb9a893,
    metalness: 0,
    roughness: 1,
    envMapIntensity: 0.3,
  });
  const ash = ashMaps();
  m.ash = new THREE.MeshStandardMaterial({
    map: ash.map,
    normalMap: ash.normal,
    roughnessMap: ash.rough,
    normalScale: V2(1.0),
    metalness: 0,
    roughness: 1,
    envMapIntensity: 0.2,
  });

  m.glass = new THREE.MeshPhysicalMaterial({
    color: 0x6d7c80,
    metalness: 0,
    roughness: 0.08,
    transparent: true,
    opacity: 0.35,
    envMapIntensity: 1.0,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  // Lantern glass and string-light bulbs. Emissive is driven by lights.js as the
  // hour changes; the daytime value is a dark, unlit lamp.
  m.lampGlass = new THREE.MeshStandardMaterial({
    color: 0xd9c9a8,
    emissive: 0xffb257,
    emissiveIntensity: 0,
    metalness: 0,
    roughness: 0.3,
    transparent: true,
    opacity: 0.85,
    envMapIntensity: 0.6,
  });
  m.bulb = new THREE.MeshStandardMaterial({
    color: 0xe8dcc2,
    emissive: 0xffc46a,
    emissiveIntensity: 0,
    metalness: 0,
    roughness: 0.25,
    envMapIntensity: 0.5,
  });
  // The mast's obstruction beacon: a red lens that blinks after dark (lights.js)
  m.beacon = new THREE.MeshStandardMaterial({
    color: 0x7a1a12,
    emissive: 0xff2a10,
    emissiveIntensity: 0,
    metalness: 0,
    roughness: 0.3,
    envMapIntensity: 0.4,
  });
  // Fire: charred logs on the pit floor read as the fire's own glow at night
  m.emberGlow = new THREE.MeshStandardMaterial({
    color: 0x1a1210,
    emissive: 0xff6a1a,
    emissiveIntensity: 0.9,
    metalness: 0,
    roughness: 1,
    envMapIntensity: 0.1,
  });

  const solar = solarMaps();
  // Glass over cells: a mirror-flat 6 m² pointed at the sky is a white blob in
  // every overhead, so the glass is dusty rather than polished.
  m.solar = new THREE.MeshStandardMaterial({
    map: solar,
    metalness: 0.1,
    roughness: 0.42,
    envMapIntensity: 0.45,
  });

  const sign = (key, tex) =>
    new THREE.MeshStandardMaterial({
      map: tex,
      metalness: 0,
      roughness: 0.75,
      envMapIntensity: 0.3,
      name: key,
    });
  m.signGate = sign(
    'signGate',
    signMap('gate', ['OLARE RIVER', 'RANGER POST & CAMP', 'Please report to the office'], { board: '#cbbf9f', ink: '#2a2622', accent: '#4a5a3a' }),
  );
  m.signFuel = sign('signFuel', signMap('fuel', ['FUEL STORE', 'NO NAKED FLAME'], { board: '#9c2e26', ink: '#e9e0cc', w: 512, h: 256 }));
  m.signLatrine = sign('signLatrine', signMap('latrine', ['SHOWERS  ·  WC', 'water is precious'], { board: '#cbbf9f', ink: '#2a2622', w: 512, h: 192 }));
  m.signSpeed = sign('signSpeed', signMap('speed', ['DEAD SLOW', 'ANIMALS ON ROAD'], { board: '#cfc3a6', ink: '#2a2622', accent: '#c9302c' }));
  m.signOffice = sign('signOffice', signMap('office', ['RADIO ROOM', 'Ranger on duty'], { board: '#c8bc9c', ink: '#2a2622', w: 512, h: 160 }));
  m.signRadio = sign('signRadio', signMap('radio', ['CALL SIGN', 'ZULU 4'], { board: '#4a5a3a', ink: '#e8dcc0', w: 256, h: 192 }));
  m.mapBoard = sign('mapBoard', mapBoardMap());

  // Backlit dry grass glows; an opaque card goes black. The emissive term is
  // the cheap translucency and lights.js turns it off after dark.
  m.grass = new THREE.MeshStandardMaterial({
    map: dryGrassCutout(),
    alphaTest: 0.45,
    transparent: false,
    metalness: 0,
    roughness: 0.95,
    side: THREE.DoubleSide,
    envMapIntensity: 0.3,
    emissive: 0xc8b078,
    emissiveMap: dryGrassCutout(),
    emissiveIntensity: 0.4,
  });

  // Fabric on the folding chairs: heavy cloth with the truck's weave normal
  m.chairCloth = canvasOf('green', 0x7f8a6a, { side: THREE.DoubleSide });

  if (env) for (const mat of Object.values(m)) if ('envMap' in mat) mat.envMap = env;
  for (const [key, mat] of Object.entries(m)) if (mat && mat.isMaterial && !mat.name) mat.name = key;
  cached = m;
  return m;
}
