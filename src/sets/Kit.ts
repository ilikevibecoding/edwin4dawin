import * as THREE from 'three';
import { Tex } from '../render/SharedTextures';
import { PALETTE } from '../render/LookConfig';
import { signTexture } from '../render/Textures';
import { LightShaft } from '../render/Volumetric';

/**
 * Set-dressing kit.
 *
 * Everything in the game's environments is built from these parts. They are
 * plain geometry with shared procedural materials, arranged so that silhouettes
 * read against the sky and so that every surface has something for the wet
 * highlights to catch — railings, cable runs, grilles and panel seams do more
 * for the look than polygon count does.
 */

export interface Kit {
  concrete: THREE.MeshStandardMaterial;
  concreteFine: THREE.MeshStandardMaterial;
  metal: THREE.MeshStandardMaterial;
  metalDark: THREE.MeshStandardMaterial;
  rubber: THREE.MeshStandardMaterial;
  glass: THREE.MeshPhysicalMaterial;
  emissiveCache: Map<number, THREE.MeshBasicMaterial>;
}

export function createKit(): Kit {
  const c = Tex.concrete;
  const cf = Tex.concreteFine;
  const m = Tex.metal;
  const mf = Tex.metalFine;
  return {
    concrete: new THREE.MeshStandardMaterial({
      map: c.map,
      normalMap: c.normalMap,
      roughnessMap: c.roughnessMap,
      color: 0x8d9299,
      roughness: 0.9,
      metalness: 0.02,
      envMapIntensity: 0.85,
    }),
    concreteFine: new THREE.MeshStandardMaterial({
      map: cf.map,
      normalMap: cf.normalMap,
      roughnessMap: cf.roughnessMap,
      color: 0x7e848c,
      roughness: 0.85,
      metalness: 0.02,
      envMapIntensity: 0.85,
    }),
    metal: new THREE.MeshStandardMaterial({
      map: m.map,
      normalMap: m.normalMap,
      roughnessMap: m.roughnessMap,
      color: 0x99a1ab,
      roughness: 0.45,
      metalness: 0.85,
      envMapIntensity: 1.15,
    }),
    metalDark: new THREE.MeshStandardMaterial({
      map: mf.map,
      normalMap: mf.normalMap,
      roughnessMap: mf.roughnessMap,
      color: 0x3a4048,
      roughness: 0.55,
      metalness: 0.8,
      envMapIntensity: 1,
    }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x14161a, roughness: 0.85, metalness: 0.05 }),
    glass: new THREE.MeshPhysicalMaterial({
      color: 0x1a2430,
      roughness: 0.08,
      metalness: 0,
      transmission: 0,
      reflectivity: 0.6,
      envMapIntensity: 1.6,
    }),
    emissiveCache: new Map(),
  };
}

export function emissive(kit: Kit, color: number, intensity = 1): THREE.MeshBasicMaterial {
  const key = color * 100 + intensity;
  let mat = kit.emissiveCache.get(key);
  if (!mat) {
    mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), toneMapped: false });
    kit.emissiveCache.set(key, mat);
  }
  return mat;
}

function mesh(geo: THREE.BufferGeometry, mat: THREE.Material, opts: { cast?: boolean; receive?: boolean } = {}): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = opts.cast ?? true;
  m.receiveShadow = opts.receive ?? true;
  return m;
}

/** Low perimeter wall with a coping stone, the thing that reads as "roof edge". */
export function parapet(
  kit: Kit,
  length: number,
  opts: { height?: number; thickness?: number; coping?: boolean } = {}
): THREE.Group {
  const g = new THREE.Group();
  const h = opts.height ?? 1.05;
  const t = opts.thickness ?? 0.32;
  const wall = mesh(new THREE.BoxGeometry(length, h, t), kit.concrete);
  wall.position.y = h / 2;
  g.add(wall);
  if (opts.coping !== false) {
    const cap = mesh(new THREE.BoxGeometry(length, 0.09, t * 1.35), kit.concreteFine);
    cap.position.y = h + 0.045;
    g.add(cap);
  }
  return g;
}

/** Rooftop air handler: box, grille face, fan cowl, feet. */
export function hvacUnit(kit: Kit, w = 1.9, h = 1.25, d = 1.4): THREE.Group {
  const g = new THREE.Group();
  const body = mesh(new THREE.BoxGeometry(w, h, d), kit.metalDark);
  body.position.y = h / 2 + 0.08;
  g.add(body);

  // Louvred intake face.
  const slats = 7;
  for (let i = 0; i < slats; i++) {
    const slat = mesh(new THREE.BoxGeometry(w * 0.82, h / (slats * 2.1), 0.03), kit.metal);
    slat.position.set(0, 0.22 + (i / slats) * h * 0.72, d / 2 + 0.02);
    slat.rotation.x = -0.32;
    g.add(slat);
  }

  const cowl = mesh(new THREE.CylinderGeometry(w * 0.26, w * 0.3, 0.16, 16), kit.metal);
  cowl.position.set(w * 0.22, h + 0.16, 0);
  g.add(cowl);
  const fanGuard = mesh(new THREE.TorusGeometry(w * 0.26, 0.014, 4, 18), kit.metal);
  fanGuard.position.set(w * 0.22, h + 0.24, 0);
  fanGuard.rotation.x = Math.PI / 2;
  g.add(fanGuard);

  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const foot = mesh(new THREE.BoxGeometry(0.16, 0.16, 0.16), kit.rubber);
      foot.position.set((sx * w) / 2.6, 0.08, (sz * d) / 2.6);
      g.add(foot);
    }
  }
  return g;
}

/** Lattice mast with a blinking aviation beacon. */
export function antennaMast(kit: Kit, height = 6): { group: THREE.Group; beacon: THREE.Mesh; beaconLight: THREE.PointLight } {
  const g = new THREE.Group();
  const legR = 0.035;
  const spread = 0.28;
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const leg = mesh(new THREE.CylinderGeometry(legR, legR, height, 5), kit.metalDark);
    leg.position.set(Math.cos(a) * spread, height / 2, Math.sin(a) * spread);
    leg.rotation.z = Math.cos(a) * 0.02;
    g.add(leg);
  }
  // Cross bracing.
  const braceMat = kit.metalDark;
  for (let y = 0.5; y < height - 0.3; y += 0.62) {
    for (let i = 0; i < 3; i++) {
      const a1 = (i / 3) * Math.PI * 2;
      const a2 = ((i + 1) / 3) * Math.PI * 2;
      const p1 = new THREE.Vector3(Math.cos(a1) * spread, y, Math.sin(a1) * spread);
      const p2 = new THREE.Vector3(Math.cos(a2) * spread, y + 0.31, Math.sin(a2) * spread);
      const len = p1.distanceTo(p2);
      const brace = mesh(new THREE.CylinderGeometry(0.012, 0.012, len, 4), braceMat, { cast: false });
      brace.position.copy(p1).lerp(p2, 0.5);
      brace.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), p2.clone().sub(p1).normalize());
      g.add(brace);
    }
  }
  const beacon = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 12, 10),
    new THREE.MeshBasicMaterial({ color: PALETTE.neonRed, toneMapped: false })
  );
  beacon.position.y = height + 0.1;
  g.add(beacon);
  const beaconLight = new THREE.PointLight(PALETTE.neonRed, 6, 9, 2);
  beaconLight.position.copy(beacon.position);
  g.add(beaconLight);
  return { group: g, beacon, beaconLight };
}

export function satelliteDish(kit: Kit, radius = 0.85): THREE.Group {
  const g = new THREE.Group();
  const dish = mesh(new THREE.SphereGeometry(radius, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2.6), kit.metal);
  dish.rotation.x = Math.PI * 0.62;
  dish.position.y = radius * 1.1;
  g.add(dish);
  const arm = mesh(new THREE.CylinderGeometry(0.03, 0.03, radius * 0.9, 6), kit.metalDark);
  arm.position.set(0, radius * 0.85, radius * 0.35);
  arm.rotation.x = -0.5;
  g.add(arm);
  const post = mesh(new THREE.CylinderGeometry(0.06, 0.075, radius * 1.1, 8), kit.metalDark);
  post.position.y = radius * 0.55;
  g.add(post);
  const base = mesh(new THREE.BoxGeometry(radius * 0.9, 0.08, radius * 0.9), kit.concreteFine);
  base.position.y = 0.04;
  g.add(base);
  return g;
}

/** Stairwell head-house with a caged bulkhead lamp over the door. */
export function stairHouse(
  kit: Kit,
  opts: { w?: number; h?: number; d?: number; lampColor?: number } = {}
): { group: THREE.Group; lamp: THREE.PointLight; shaft: LightShaft; doorFrame: THREE.Object3D } {
  const g = new THREE.Group();
  const w = opts.w ?? 3.4;
  const h = opts.h ?? 2.9;
  const d = opts.d ?? 3;

  const body = mesh(new THREE.BoxGeometry(w, h, d), kit.concrete);
  body.position.y = h / 2;
  g.add(body);
  const roof = mesh(new THREE.BoxGeometry(w + 0.22, 0.14, d + 0.22), kit.concreteFine);
  roof.position.y = h + 0.07;
  g.add(roof);

  // Recessed doorway.
  const doorW = 1.05;
  const doorH = 2.1;
  const frame = new THREE.Group();
  const jambMat = kit.metalDark;
  const left = mesh(new THREE.BoxGeometry(0.09, doorH, 0.14), jambMat);
  left.position.set(-doorW / 2, doorH / 2, d / 2 + 0.02);
  const right = left.clone();
  right.position.x = doorW / 2;
  const head = mesh(new THREE.BoxGeometry(doorW + 0.18, 0.1, 0.14), jambMat);
  head.position.set(0, doorH, d / 2 + 0.02);
  const door = mesh(new THREE.BoxGeometry(doorW, doorH, 0.07), kit.metalDark);
  door.position.set(0, doorH / 2, d / 2 - 0.02);
  const bar = mesh(new THREE.BoxGeometry(doorW * 0.7, 0.05, 0.05), kit.metal);
  bar.position.set(0, doorH * 0.5, d / 2 + 0.04);
  frame.add(left, right, head, door, bar);
  g.add(frame);

  // Bulkhead lamp: warm sodium, the only friendly light on the roof.
  const lampColor = opts.lampColor ?? PALETTE.sodium;
  const housing = mesh(new THREE.BoxGeometry(0.34, 0.16, 0.2), kit.metalDark);
  housing.position.set(0, doorH + 0.42, d / 2 + 0.12);
  g.add(housing);
  const lens = new THREE.Mesh(
    new THREE.SphereGeometry(0.11, 12, 10, 0, Math.PI * 2, 0, Math.PI / 1.7),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(lampColor).multiplyScalar(2.4), toneMapped: false })
  );
  lens.position.set(0, doorH + 0.36, d / 2 + 0.14);
  lens.rotation.x = Math.PI;
  g.add(lens);
  const cage = mesh(new THREE.TorusGeometry(0.12, 0.008, 4, 12), kit.metal, { cast: false });
  cage.position.copy(lens.position);
  cage.rotation.x = Math.PI / 2;
  g.add(cage);

  const lamp = new THREE.PointLight(lampColor, 14, 9, 2);
  lamp.position.set(0, doorH + 0.3, d / 2 + 0.3);
  lamp.castShadow = true;
  lamp.shadow.bias = -0.002;
  g.add(lamp);

  const shaft = new LightShaft({
    length: 3.4,
    radius: 1.5,
    color: lampColor,
    intensity: 0.34,
    noise: 0.6,
    falloff: 1.6,
    nearFade: 0.6,
  });
  shaft.aim(lamp.position.clone(), lamp.position.clone().add(new THREE.Vector3(0, -3, 0.7)));
  g.add(shaft.mesh);

  return { group: g, lamp, shaft, doorFrame: frame };
}

/** Neon sign: an emissive face, a glow card behind it, and a spill light. */
export function neonSign(
  lines: string[],
  opts: {
    color?: number;
    width?: number;
    height?: number;
    vertical?: boolean;
    spill?: number;
    flicker?: boolean;
  } = {}
): { group: THREE.Group; light: THREE.PointLight; flicker: boolean; panel: THREE.Mesh } {
  const g = new THREE.Group();
  const color = opts.color ?? PALETTE.neonCyan;
  const w = opts.width ?? 2.4;
  const h = opts.height ?? 1.1;
  const tex = signTexture(lines, {
    w: opts.vertical ? 256 : 512,
    h: opts.vertical ? 512 : 256,
    color: `#${new THREE.Color(color).getHexString()}`,
    vertical: opts.vertical,
  });
  const panel = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      toneMapped: false,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );
  g.add(panel);

  // Backing board so the sign has a body in silhouette.
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(w * 1.06, h * 1.12, 0.08),
    new THREE.MeshStandardMaterial({ color: 0x0a0c10, roughness: 0.6, metalness: 0.3 })
  );
  board.position.z = -0.06;
  board.castShadow = true;
  g.add(board);

  const glow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: Tex.softGlow,
      color,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    })
  );
  glow.scale.set(w * 2.1, h * 2.4, 1);
  glow.position.z = 0.05;
  g.add(glow);

  const light = new THREE.PointLight(color, opts.spill ?? 9, 12, 2);
  light.position.z = 0.6;
  g.add(light);

  return { group: g, light, flicker: opts.flicker ?? false, panel };
}

/**
 * Standing water. A separate thin plane over the floor with near-zero roughness;
 * reflections come from the wet-floor shader attached to it by the set.
 */
export function puddle(radius = 1.2, segments = 22): THREE.Mesh {
  const geo = new THREE.CircleGeometry(radius, segments);
  // Break the perfect circle so it looks like water finding low ground.
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const d = Math.hypot(x, y);
    if (d > 0.01) {
      const a = Math.atan2(y, x);
      const wobble = 1 + Math.sin(a * 3.1) * 0.12 + Math.sin(a * 5.7 + 1.3) * 0.08;
      pos.setXY(i, x * wobble, y * wobble);
    }
  }
  geo.computeVertexNormals();
  geo.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x05070a, roughness: 0.04, metalness: 0.1 }));
  m.receiveShadow = false;
  return m;
}

/** Sagging cable run between two points. */
export function cableRun(from: THREE.Vector3, to: THREE.Vector3, sag = 0.4, radius = 0.018): THREE.Mesh {
  const mid = from.clone().lerp(to, 0.5);
  mid.y -= sag;
  const curve = new THREE.CatmullRomCurve3([from, mid, to]);
  const geo = new THREE.TubeGeometry(curve, 14, radius, 5, false);
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x0e1013, roughness: 0.75, metalness: 0.2 }));
  m.castShadow = true;
  return m;
}

/** Chain-link fence panel: posts, rails and a cross-hatch alpha sheet. */
export function chainFence(kit: Kit, width = 4, height = 2.2): THREE.Group {
  const g = new THREE.Group();
  const postMat = kit.metalDark;
  const posts = Math.max(2, Math.round(width / 2) + 1);
  for (let i = 0; i < posts; i++) {
    const post = mesh(new THREE.CylinderGeometry(0.05, 0.05, height, 7), postMat);
    post.position.set(-width / 2 + (i / (posts - 1)) * width, height / 2, 0);
    g.add(post);
  }
  for (const y of [height - 0.05, height * 0.5, 0.1]) {
    const rail = mesh(new THREE.CylinderGeometry(0.028, 0.028, width, 6), postMat, { cast: false });
    rail.rotation.z = Math.PI / 2;
    rail.position.set(0, y, 0);
    g.add(rail);
  }

  // Mesh sheet drawn as a texture so it stays cheap.
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, size, size);
    ctx.strokeStyle = 'rgba(190,205,220,0.95)';
    ctx.lineWidth = 2.2;
    for (let i = -size; i < size * 2; i += 16) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + size, size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(i + size, 0);
      ctx.lineTo(i, size);
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(width * 2.2, height * 2.2);
  const sheet = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshStandardMaterial({
      map: tex,
      alphaMap: tex,
      transparent: true,
      alphaTest: 0.35,
      color: 0x9aa6b4,
      roughness: 0.42,
      metalness: 0.75,
      side: THREE.DoubleSide,
      envMapIntensity: 1.2,
    })
  );
  sheet.position.y = height / 2;
  sheet.castShadow = false;
  g.add(sheet);
  return g;
}

/** Cheap distant skyline: instanced towers with emissive window grids. */
export function skyline(
  opts: {
    count?: number;
    innerRadius?: number;
    outerRadius?: number;
    minHeight?: number;
    maxHeight?: number;
    baseY?: number;
    seed?: number;
  } = {}
): THREE.Group {
  const g = new THREE.Group();
  const count = opts.count ?? 90;
  const inner = opts.innerRadius ?? 55;
  const outer = opts.outerRadius ?? 320;
  const minH = opts.minHeight ?? 18;
  const maxH = opts.maxHeight ?? 130;
  const baseY = opts.baseY ?? -70;

  const facade = Tex.facade;
  const facadeDense = Tex.facadeDense;

  const matA = new THREE.MeshStandardMaterial({
    map: facade.map,
    emissiveMap: facade.emissiveMap,
    roughnessMap: facade.roughnessMap,
    emissive: new THREE.Color(0xffffff),
    emissiveIntensity: 1.5,
    color: 0x4a5058,
    roughness: 0.7,
    metalness: 0.25,
    envMapIntensity: 0.5,
  });
  const matB = new THREE.MeshStandardMaterial({
    map: facadeDense.map,
    emissiveMap: facadeDense.emissiveMap,
    roughnessMap: facadeDense.roughnessMap,
    emissive: new THREE.Color(0xffffff),
    emissiveIntensity: 1.35,
    color: 0x3f454d,
    roughness: 0.72,
    metalness: 0.25,
    envMapIntensity: 0.5,
  });

  const geo = new THREE.BoxGeometry(1, 1, 1);
  const half = Math.floor(count / 2);
  const meshA = new THREE.InstancedMesh(geo, matA, half);
  const meshB = new THREE.InstancedMesh(geo, matB, count - half);
  meshA.castShadow = meshB.castShadow = false;
  meshA.receiveShadow = meshB.receiveShadow = false;

  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const p = new THREE.Vector3();
  let seed = opts.seed ?? 12345;
  const rnd = (): number => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };

  for (let i = 0; i < count; i++) {
    const a = rnd() * Math.PI * 2;
    const r = inner + Math.pow(rnd(), 0.7) * (outer - inner);
    const h = minH + Math.pow(rnd(), 1.6) * (maxH - minH);
    const w = 8 + rnd() * 22;
    const d = 8 + rnd() * 22;
    s.set(w, h, d);
    p.set(Math.cos(a) * r, baseY + h / 2, Math.sin(a) * r);
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rnd() * Math.PI);
    m4.compose(p, q, s);
    if (i < half) meshA.setMatrixAt(i, m4);
    else meshB.setMatrixAt(i - half, m4);
  }
  g.add(meshA, meshB);
  return g;
}

/** Handheld tablet prop, used as an investigable clue. */
export function tablet(kit: Kit, screenColor = PALETTE.neonCyan): THREE.Group {
  const g = new THREE.Group();
  const body = mesh(new THREE.BoxGeometry(0.19, 0.012, 0.28), kit.metalDark);
  g.add(body);
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.166, 0.25),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(screenColor).multiplyScalar(0.9), toneMapped: false })
  );
  screen.rotation.x = -Math.PI / 2;
  screen.position.y = 0.0075;
  g.add(screen);
  return g;
}

/** Spilled thirium: android blood, faintly luminous. */
export function thiriumPool(radius = 0.45): THREE.Mesh {
  const m = puddle(radius, 18);
  m.material = new THREE.MeshStandardMaterial({
    color: 0x0a2a5a,
    roughness: 0.08,
    metalness: 0.2,
    emissive: new THREE.Color(0x1e6fff),
    emissiveIntensity: 0.55,
  });
  return m;
}

/** Overturned plastic chair; small human detail that sells a struggle. */
export function chair(kit: Kit): THREE.Group {
  const g = new THREE.Group();
  const seat = mesh(new THREE.BoxGeometry(0.44, 0.05, 0.44), kit.rubber);
  seat.position.y = 0.45;
  g.add(seat);
  const back = mesh(new THREE.BoxGeometry(0.44, 0.5, 0.05), kit.rubber);
  back.position.set(0, 0.7, -0.2);
  g.add(back);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const leg = mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.45, 6), kit.metal);
      leg.position.set(sx * 0.18, 0.225, sz * 0.18);
      g.add(leg);
    }
  }
  return g;
}

/** Wall-mounted warning placard. */
export function warningSign(text: string, color = PALETTE.neonAmber): THREE.Mesh {
  const tex = signTexture([text], { w: 256, h: 128, color: `#${new THREE.Color(color).getHexString()}` });
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(0.5, 0.25),
    new THREE.MeshStandardMaterial({
      map: tex,
      transparent: true,
      color: 0xffffff,
      emissive: new THREE.Color(color),
      emissiveMap: tex,
      emissiveIntensity: 0.35,
      roughness: 0.6,
      metalness: 0.1,
    })
  );
  return m;
}
