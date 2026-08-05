/**
 * Set-dressing kit: the small vocabulary of props and surfaces the chapters are
 * built from. Everything is parametric so a whole environment is a few dozen
 * calls, and every material comes from the procedural texture library.
 */
import * as THREE from 'three';
import * as Tex from '../engine/textures';
import { emissiveMaterial, fromTexSet, glassMaterial, leatherMaterial, paintedMetal, screenMaterial } from '../engine/materials';
import { glowSprite } from '../engine/volumetric';
import { Rng, lerp } from '../engine/math';

export function box(
  w: number,
  h: number,
  d: number,
  mat: THREE.Material,
  pos?: [number, number, number],
  rotY = 0,
): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  if (pos) m.position.set(pos[0], pos[1], pos[2]);
  m.rotation.y = rotY;
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function plane(w: number, h: number, mat: THREE.Material): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.receiveShadow = true;
  return m;
}

export function cyl(
  rTop: number,
  rBot: number,
  h: number,
  mat: THREE.Material,
  pos?: [number, number, number],
  seg = 16,
): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, seg), mat);
  if (pos) m.position.set(pos[0], pos[1], pos[2]);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export const MAT = {
  concrete: (repeat = 4, tint = 0.09) => fromTexSet(Tex.concrete(512, tint), { repeat, rough: 1, normalScale: 0.8 }),
  brick: (repeat = 3) => fromTexSet(Tex.brick(512), { repeat, rough: 1, normalScale: 1 }),
  tile: (repeat = 6) => fromTexSet(Tex.stoneTile(512, 4), { repeat, rough: 1, normalScale: 0.6 }),
  wood: (repeat = 3, warm = 1) => fromTexSet(Tex.wood(512, warm), { repeat, rough: 1, normalScale: 0.6 }),
  metal: (repeat = 2, dark = 0.3) => fromTexSet(Tex.metal(512, dark), { repeat, rough: 1, metal: 0.75, normalScale: 0.4 }),
  asphalt: (repeat = 8) => fromTexSet(Tex.asphalt(512), { repeat, rough: 1, normalScale: 0.9 }),
  drywall: (color = 0x9aa2a8) => new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(color).convertSRGBToLinear(), roughness: 0.92, metalness: 0,
  }),
  paint: (color: number, rough = 0.55) => paintedMetal(color, rough),
  glass: (tint = 0x0b1418, opacity = 0.2) => glassMaterial(tint, opacity),
  leather: (color = 0x14181c) => leatherMaterial(color),
  neon: (color: number, intensity = 3) => emissiveMaterial(color, intensity),
};

/** A wall with an optional window cut, built from boxes (cheap and shadow-safe). */
export function wallWithWindow(
  w: number,
  h: number,
  thickness: number,
  mat: THREE.Material,
  win: { x: number; y: number; w: number; h: number } | null,
): THREE.Group {
  const g = new THREE.Group();
  if (!win) {
    g.add(box(w, h, thickness, mat, [0, h / 2, 0]));
    return g;
  }
  const left = win.x - win.w / 2 + w / 2;
  const right = w - (win.x + win.w / 2 + w / 2);
  const below = win.y - win.h / 2;
  const above = h - (win.y + win.h / 2);
  if (left > 0.01) g.add(box(left, h, thickness, mat, [-w / 2 + left / 2, h / 2, 0]));
  if (right > 0.01) g.add(box(right, h, thickness, mat, [w / 2 - right / 2, h / 2, 0]));
  if (below > 0.01) g.add(box(win.w, below, thickness, mat, [win.x, below / 2, 0]));
  if (above > 0.01) g.add(box(win.w, above, thickness, mat, [win.x, h - above / 2, 0]));
  return g;
}

/** Rain-streaked glass pane with grime. */
export function windowPane(w: number, h: number, wet = 1): THREE.Mesh {
  const mat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(0x0a1016).convertSRGBToLinear(),
    roughness: 0.06,
    metalness: 0,
    transparent: true,
    opacity: 0.28,
    transmission: 0.6,
    thickness: 0.02,
    ior: 1.5,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  if (wet > 0) {
    const grime = Tex.glassGrime(256);
    grime.wrapS = grime.wrapT = THREE.RepeatWrapping;
    grime.repeat.set(2, 2);
    mat.roughnessMap = grime;
    mat.roughness = 0.18 * wet;
    const ripple = Tex.rippleNormal(256);
    ripple.wrapS = ripple.wrapT = THREE.RepeatWrapping;
    ripple.repeat.set(3, 3);
    mat.normalMap = ripple;
    mat.normalScale = new THREE.Vector2(0.35 * wet, 0.35 * wet);
  }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.renderOrder = 3;
  return m;
}

/** Lit sign panel with its own glow sprite. */
export function neonSign(
  text: string,
  opts: {
    color?: number;
    sub?: string;
    w?: number;
    h?: number;
    vertical?: boolean;
    intensity?: number;
    border?: boolean;
    glow?: number;
  } = {},
): THREE.Group {
  const g = new THREE.Group();
  const color = opts.color ?? 0x63e0ff;
  const w = opts.w ?? 2.4;
  const h = opts.h ?? 0.7;
  const tex = Tex.signTexture({
    text,
    sub: opts.sub,
    color: `#${new THREE.Color(color).getHexString()}`,
    w: opts.vertical ? 256 : 512,
    h: opts.vertical ? 512 : 192,
    vertical: opts.vertical,
    border: opts.border,
  });
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(w, h), screenMaterial(tex, opts.intensity ?? 3.4));
  g.add(panel);
  const back = box(w * 1.04, h * 1.08, 0.06, MAT.metal(1, 0.12), [0, 0, -0.04]);
  g.add(back);
  const s = glowSprite(color, Math.max(w, h) * 1.5, (opts.glow ?? 0.5));
  s.position.z = 0.12;
  g.add(s);
  return g;
}

/** Street lamp: pole, head, cone of light and a point light. */
export function streetLamp(
  height = 5.4,
  color = 0xffd9a8,
  intensity = 90,
): { group: THREE.Group; light: THREE.PointLight } {
  const g = new THREE.Group();
  const pole = cyl(0.055, 0.075, height, MAT.metal(1, 0.16), [0, height / 2, 0], 12);
  g.add(pole);
  const arm = box(0.06, 0.06, 0.9, MAT.metal(1, 0.16), [0, height - 0.1, 0.42]);
  g.add(arm);
  const headMat = emissiveMaterial(color, 2.6);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 10, 0, Math.PI * 2, Math.PI * 0.4, Math.PI * 0.6), headMat);
  head.position.set(0, height - 0.16, 0.84);
  g.add(head);
  const shade = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), MAT.metal(1, 0.1));
  shade.position.copy(head.position);
  g.add(shade);
  const light = new THREE.PointLight(color, intensity, height * 3.2, 2);
  light.position.set(0, height - 0.28, 0.84);
  g.add(light);
  const s = glowSprite(color, 1.5, 0.5);
  s.position.copy(head.position);
  g.add(s);
  return { group: g, light };
}

/** Chair — used in interrogation rooms and apartments alike. */
export function chair(mat: THREE.Material, back = true): THREE.Group {
  const g = new THREE.Group();
  const seat = box(0.46, 0.06, 0.44, mat, [0, 0.45, 0]);
  g.add(seat);
  for (const [x, z] of [[-0.19, -0.17], [0.19, -0.17], [-0.19, 0.17], [0.19, 0.17]]) {
    g.add(cyl(0.022, 0.026, 0.45, mat, [x, 0.225, z], 8));
  }
  if (back) {
    const b = box(0.44, 0.5, 0.05, mat, [0, 0.72, -0.2]);
    b.rotation.x = -0.08;
    g.add(b);
  }
  return g;
}

export function table(w: number, d: number, h: number, mat: THREE.Material, legMat?: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  g.add(box(w, 0.055, d, mat, [0, h, 0]));
  const lm = legMat ?? mat;
  const insetX = w / 2 - 0.09;
  const insetZ = d / 2 - 0.09;
  for (const [x, z] of [[-insetX, -insetZ], [insetX, -insetZ], [-insetX, insetZ], [insetX, insetZ]]) {
    g.add(box(0.055, h, 0.055, lm, [x, h / 2, z]));
  }
  return g;
}

export function sofa(w = 1.9, mat?: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  const m = mat ?? MAT.leather(0x23262b);
  g.add(box(w, 0.3, 0.9, m, [0, 0.28, 0]));
  const back = box(w, 0.62, 0.18, m, [0, 0.62, -0.38]);
  back.rotation.x = -0.12;
  g.add(back);
  g.add(box(0.16, 0.5, 0.9, m, [-w / 2 + 0.08, 0.45, 0]));
  g.add(box(0.16, 0.5, 0.9, m, [w / 2 - 0.08, 0.45, 0]));
  for (let i = 0; i < 2; i++) {
    const cushion = box(w / 2 - 0.2, 0.14, 0.7, m, [(i - 0.5) * (w / 2 - 0.05), 0.46, 0.04]);
    g.add(cushion);
  }
  return g;
}

/** Wall-mounted screen playing a scrolling news feed (emissive). */
export function tvScreen(
  w: number,
  h: number,
  headline: string,
  sub?: string,
  color = 0x9fd8ff,
): { group: THREE.Group; light: THREE.PointLight } {
  const g = new THREE.Group();
  const tex = Tex.signTexture({ text: headline, sub, color: `#${new THREE.Color(color).getHexString()}`, w: 512, h: 288, size: 54 });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(w, h), screenMaterial(tex, 2.0));
  screen.position.z = 0.03;
  g.add(screen);
  g.add(box(w * 1.05, h * 1.08, 0.06, MAT.paint(0x0b0e11, 0.4), [0, 0, 0]));
  const light = new THREE.PointLight(color, 12, 6, 2);
  light.position.z = 0.5;
  g.add(light);
  return { group: g, light };
}

/** Chain-link / steel railing for rooftops and barricades. */
export function railing(length: number, height = 1.1, posts = 6): THREE.Group {
  const g = new THREE.Group();
  const m = MAT.metal(1, 0.14);
  for (let i = 0; i <= posts; i++) {
    const x = -length / 2 + (i / posts) * length;
    g.add(cyl(0.028, 0.032, height, m, [x, height / 2, 0], 8));
  }
  for (const y of [height, height * 0.55]) {
    const bar = cyl(0.022, 0.022, length, m, [0, y, 0], 8);
    bar.rotation.z = Math.PI / 2;
    g.add(bar);
  }
  return g;
}

/** Distant skyline: instanced blocks with emissive window grids. */
export function skyline(
  count = 44,
  radius = 120,
  seed = 7,
  opts: { minH?: number; maxH?: number; lit?: number } = {},
): THREE.Group {
  const g = new THREE.Group();
  const rng = new Rng(seed);
  const winTexA = Tex.windowGrid(512, 12, 24, opts.lit ?? 0.35, 3);
  const winTexB = Tex.windowGrid(512, 16, 30, (opts.lit ?? 0.35) * 0.8, 11);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0x0a0e13).convertSRGBToLinear(),
    roughness: 0.85,
    metalness: 0.1,
  });
  const winMatA = new THREE.MeshStandardMaterial({
    color: 0x05070a, emissive: 0xffffff, emissiveMap: winTexA, emissiveIntensity: 1.15, roughness: 0.5,
  });
  const winMatB = new THREE.MeshStandardMaterial({
    color: 0x05070a, emissive: 0xffffff, emissiveMap: winTexB, emissiveIntensity: 0.95, roughness: 0.5,
  });
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + rng.range(-0.05, 0.05);
    const r = radius * rng.range(0.55, 1.35);
    const w = rng.range(8, 22);
    const h = rng.range(opts.minH ?? 18, opts.maxH ?? 78);
    const d = rng.range(8, 20);
    const mat = rng.chance(0.5) ? winMatA : winMatB;
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [mat, mat, bodyMat, bodyMat, mat, mat]);
    m.position.set(Math.cos(a) * r, h / 2 - rng.range(0, 6), Math.sin(a) * r);
    m.rotation.y = rng.range(-0.4, 0.4);
    g.add(m);
    // Roof aircraft-warning light on the taller towers.
    if (h > 50 && rng.chance(0.6)) {
      const s = glowSprite(0xff4a4a, 2.4, 0.7);
      s.position.set(m.position.x, h + 0.6, m.position.z);
      g.add(s);
    }
  }
  return g;
}

/** Puddle: a flat, very smooth disc that catches reflections and light. */
export function puddle(radius = 1.2, y = 0.005): THREE.Mesh {
  const mat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(0x05080b).convertSRGBToLinear(),
    roughness: 0.03,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.02,
    transparent: true,
    opacity: 0.72,
  });
  const ripple = Tex.rippleNormal(256);
  ripple.wrapS = ripple.wrapT = THREE.RepeatWrapping;
  ripple.repeat.set(2, 2);
  mat.normalMap = ripple;
  mat.normalScale = new THREE.Vector2(0.5, 0.5);
  const m = new THREE.Mesh(new THREE.CircleGeometry(radius, 28), mat);
  m.rotation.x = -Math.PI / 2;
  m.position.y = y;
  m.renderOrder = 2;
  return m;
}

/** Rooftop clutter: vents, ducts, aerials. Cheap silhouette interest. */
export function rooftopClutter(seed = 3, spread = 14): THREE.Group {
  const g = new THREE.Group();
  const rng = new Rng(seed);
  const metal = MAT.metal(1, 0.2);
  const conc = MAT.concrete(2, 0.08);
  for (let i = 0; i < 9; i++) {
    const x = rng.range(-spread, spread);
    const z = rng.range(-spread, spread);
    const kind = rng.int(0, 2);
    if (kind === 0) {
      const h = rng.range(0.7, 1.5);
      g.add(box(rng.range(0.8, 1.8), h, rng.range(0.8, 1.6), conc, [x, h / 2, z], rng.range(0, 3)));
    } else if (kind === 1) {
      const h = rng.range(0.5, 1.1);
      const unit = box(1.3, h, 1.3, metal, [x, h / 2, z], rng.range(0, 3));
      g.add(unit);
      const fan = cyl(0.42, 0.42, 0.1, metal, [x, h + 0.06, z], 14);
      g.add(fan);
    } else {
      const h = rng.range(1.6, 3.4);
      g.add(cyl(0.06, 0.08, h, metal, [x, h / 2, z], 8));
      g.add(cyl(0.24, 0.24, 0.12, metal, [x, h, z], 10));
    }
  }
  return g;
}

/** Parked vehicle silhouette with lit strips — good street foreground mass. */
export function car(color = 0x14181d, accent = 0x63e0ff): THREE.Group {
  const g = new THREE.Group();
  const body = MAT.paint(color, 0.28);
  const lower = box(4.3, 0.5, 1.85, body, [0, 0.52, 0]);
  g.add(lower);
  const cabinGeo = new THREE.BoxGeometry(2.6, 0.52, 1.72);
  const cabin = new THREE.Mesh(cabinGeo, body);
  cabin.position.set(-0.1, 1.0, 0);
  cabin.castShadow = true;
  g.add(cabin);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(2.45, 0.42, 1.74), MAT.glass(0x0a1218, 0.35));
  glass.position.set(-0.1, 1.02, 0);
  g.add(glass);
  for (const [x, z] of [[-1.45, 0.9], [1.45, 0.9], [-1.45, -0.9], [1.45, -0.9]]) {
    const wheel = cyl(0.34, 0.34, 0.24, MAT.paint(0x0a0b0d, 0.85), [x, 0.34, z], 16);
    wheel.rotation.x = Math.PI / 2;
    g.add(wheel);
  }
  const strip = box(4.0, 0.03, 0.03, MAT.neon(accent, 1.6), [0, 0.78, 0.93]);
  g.add(strip);
  const strip2 = box(4.0, 0.03, 0.03, MAT.neon(accent, 1.6), [0, 0.78, -0.93]);
  g.add(strip2);
  const head = box(0.08, 0.12, 0.5, MAT.neon(0xfff2dd, 3.2), [2.14, 0.72, 0.55]);
  g.add(head);
  const head2 = box(0.08, 0.12, 0.5, MAT.neon(0xfff2dd, 3.2), [2.14, 0.72, -0.55]);
  g.add(head2);
  return g;
}

/** Barricade with a flashing beacon — for the march. */
export function barricade(width = 2.4): THREE.Group {
  const g = new THREE.Group();
  const m = MAT.paint(0x2b3038, 0.6);
  g.add(box(width, 0.12, 0.1, m, [0, 1.0, 0]));
  g.add(box(width, 0.12, 0.1, m, [0, 0.62, 0]));
  g.add(box(0.12, 1.1, 0.36, m, [-width / 2, 0.55, 0]));
  g.add(box(0.12, 1.1, 0.36, m, [width / 2, 0.55, 0]));
  for (let i = 0; i < 3; i++) {
    const stripe = box(width / 3 - 0.06, 0.13, 0.02, MAT.neon(0xffc247, 1.1), [(i - 1) * (width / 3), 1.0, 0.06]);
    g.add(stripe);
  }
  return g;
}

/** Simple crowd of low-detail androids for background depth. */
export function crowdBlocks(count: number, seed = 5, spread = 9, color = 0x1a2028): THREE.Group {
  const g = new THREE.Group();
  const rng = new Rng(seed);
  const mat = MAT.paint(color, 0.7);
  const led = MAT.neon(0x4fc6ff, 1.4);
  for (let i = 0; i < count; i++) {
    const x = rng.range(-spread, spread);
    const z = rng.range(-spread * 0.5, spread * 0.5);
    const h = rng.range(1.62, 1.86);
    const p = new THREE.Group();
    p.position.set(x, 0, z);
    p.rotation.y = rng.range(-0.6, 0.6);
    p.add(box(0.42, h * 0.52, 0.24, mat, [0, h * 0.5, 0]));
    p.add(cyl(0.09, 0.1, h * 0.14, mat, [0, h * 0.83, 0], 10));
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), mat);
    head.position.y = h * 0.95;
    head.scale.set(0.85, 1.1, 1);
    head.castShadow = true;
    p.add(head);
    for (const sx of [-1, 1]) {
      p.add(box(0.11, h * 0.42, 0.12, mat, [sx * 0.26, h * 0.55, 0]));
      p.add(box(0.14, h * 0.46, 0.16, mat, [sx * 0.1, h * 0.23, 0]));
    }
    const dot = new THREE.Mesh(new THREE.CircleGeometry(0.014, 10), led);
    dot.position.set(-0.09, h * 0.965, 0.055);
    p.add(dot);
    g.add(p);
  }
  return g;
}

/** Interior ceiling light: fixture, glow and a spot. */
export function ceilingLamp(
  color = 0xffe6c4,
  intensity = 60,
  shade = 0.34,
): { group: THREE.Group; light: THREE.SpotLight } {
  const g = new THREE.Group();
  const bulbMat = emissiveMaterial(color, 3.2);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(shade * 0.42, 14, 10), bulbMat);
  g.add(bulb);
  const shadeMesh = new THREE.Mesh(
    new THREE.ConeGeometry(shade, shade * 0.72, 18, 1, true),
    MAT.paint(0x1a1d21, 0.5),
  );
  shadeMesh.position.y = shade * 0.24;
  shadeMesh.material.side = THREE.DoubleSide;
  g.add(shadeMesh);
  const light = new THREE.SpotLight(color, intensity, 9, 1.1, 0.7, 2);
  light.castShadow = true;
  light.shadow.mapSize.set(1024, 1024);
  light.shadow.bias = -0.0004;
  light.shadow.normalBias = 0.02;
  light.position.set(0, -0.05, 0);
  light.target.position.set(0, -3, 0);
  g.add(light, light.target);
  g.add(glowSprite(color, shade * 3.4, 0.4));
  return { group: g, light };
}

export function gradientBackdrop(top: number, bottom: number, size = 240): THREE.Mesh {
  const cvs = document.createElement('canvas');
  cvs.width = 4;
  cvs.height = 128;
  const ctx = cvs.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 0, 128);
  g.addColorStop(0, `#${new THREE.Color(top).getHexString()}`);
  g.addColorStop(1, `#${new THREE.Color(bottom).getHexString()}`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 4, 128);
  const tex = new THREE.CanvasTexture(cvs);
  tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size * 0.5),
    new THREE.MeshBasicMaterial({ map: tex, depthWrite: false }),
  );
  m.renderOrder = -2;
  return m;
}

export function scatterDebris(count: number, seed: number, spread: number, y = 0): THREE.Group {
  const g = new THREE.Group();
  const rng = new Rng(seed);
  const mats = [MAT.concrete(1, 0.07), MAT.metal(1, 0.18), MAT.paint(0x22262b, 0.8)];
  for (let i = 0; i < count; i++) {
    const s = rng.range(0.05, 0.22);
    const m = box(s, s * rng.range(0.3, 1), s * rng.range(0.5, 1.4), mats[rng.int(0, 2)], [
      rng.range(-spread, spread),
      y + s * 0.3,
      rng.range(-spread, spread),
    ], rng.range(0, 6));
    g.add(m);
  }
  return g;
}

export function lerpColor(a: number, b: number, t: number): THREE.Color {
  return new THREE.Color(a).lerp(new THREE.Color(b), t);
}

export { lerp };
