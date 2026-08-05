import * as THREE from 'three';
import { Rng, lerp } from '../engine/math';
import { T } from '../engine/Textures';
import {
  clothMaterial,
  concreteMaterial,
  emissiveMaterial,
  glassMaterial,
  glowMaterial,
  hologramMaterial,
  leatherMaterial,
  lightShaftMaterial,
  metalMaterial,
  paintedMetal,
} from './Materials';
import { mergeGeometries, roundedBox, transform } from './geom';

const V3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/** Draw glowing sign text into a texture - cheap way to get real typography. */
export function signTexture(
  text: string,
  color = '#ff3b6b',
  opts: { vertical?: boolean; font?: string; sub?: string } = {},
): THREE.Texture {
  const w = opts.vertical ? 256 : 1024;
  const h = opts.vertical ? 1024 : 256;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = color;
  ctx.fillStyle = color;
  if (opts.vertical) {
    const chars = text.split('');
    const step = h / (chars.length + 0.6);
    ctx.font = opts.font ?? `bold ${Math.min(step * 0.82, 190)}px sans-serif`;
    chars.forEach((c, i) => {
      ctx.shadowBlur = 46;
      ctx.fillText(c, w / 2, step * (i + 0.8));
      ctx.shadowBlur = 0;
      ctx.fillText(c, w / 2, step * (i + 0.8));
    });
  } else {
    ctx.font = opts.font ?? `bold ${opts.sub ? 130 : 168}px sans-serif`;
    const y = opts.sub ? h * 0.38 : h * 0.5;
    ctx.shadowBlur = 52;
    ctx.fillText(text, w / 2, y);
    ctx.shadowBlur = 0;
    ctx.fillText(text, w / 2, y);
    if (opts.sub) {
      ctx.font = 'bold 62px sans-serif';
      ctx.shadowBlur = 30;
      ctx.fillText(opts.sub, w / 2, h * 0.74);
      ctx.shadowBlur = 0;
      ctx.fillText(opts.sub, w / 2, h * 0.74);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export interface LightBudget {
  add(light: THREE.Light): void;
}

/** Neon sign: emissive quad + additive halo + a matching point light. */
export function neonSign(
  text: string,
  color: THREE.ColorRepresentation,
  opts: { width?: number; height?: number; vertical?: boolean; sub?: string; light?: number } = {},
): THREE.Group {
  const g = new THREE.Group();
  const c = new THREE.Color(color);
  const w = opts.width ?? (opts.vertical ? 0.55 : 2.2);
  const h = opts.height ?? (opts.vertical ? 2.2 : 0.55);
  const tex = signTexture(text, `#${c.getHexString()}`, { vertical: opts.vertical, sub: opts.sub });
  const panel = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, transparent: true, blending: THREE.AdditiveBlending }),
  );
  g.add(panel);
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(w * 2.1, h * 2.4), glowMaterial(c, 0.5, 2.6));
  halo.position.z = -0.02;
  g.add(halo);
  const box = new THREE.Mesh(roundedBox(w * 1.06, h * 1.15, 0.09, 0.02, 2), paintedMetal(0x14171c, 0.5));
  box.position.z = -0.07;
  g.add(box);
  if (opts.light !== 0) {
    const light = new THREE.PointLight(c, opts.light ?? 10, 10, 2);
    light.position.z = 0.6;
    g.add(light);
  }
  return g;
}

export function streetLamp(height = 5.4, color: THREE.ColorRepresentation = 0xffd9a0): THREE.Group {
  const g = new THREE.Group();
  const poleMat = paintedMetal(0x1a1d21, 0.45);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.075, height, 12), poleMat);
  pole.position.y = height / 2;
  pole.castShadow = true;
  g.add(pole);
  const armCurve = new THREE.CatmullRomCurve3([
    V3(0, height - 0.1, 0),
    V3(0.2, height + 0.22, 0.1),
    V3(0.75, height + 0.3, 0.25),
    V3(1.15, height + 0.16, 0.32),
  ]);
  const arm = new THREE.Mesh(new THREE.TubeGeometry(armCurve, 14, 0.045, 8), poleMat);
  arm.castShadow = true;
  g.add(arm);
  const shade = new THREE.Mesh(
    new THREE.CylinderGeometry(0.17, 0.24, 0.16, 14, 1, true),
    paintedMetal(0x22262b, 0.4),
  );
  shade.position.set(1.15, height + 0.1, 0.32);
  g.add(shade);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.15, 14, 10), emissiveMaterial(color, 5));
  bulb.position.set(1.15, height + 0.03, 0.32);
  g.add(bulb);
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), glowMaterial(color, 0.42, 2.2));
  halo.position.copy(bulb.position);
  halo.rotation.x = -0.2;
  g.add(halo);
  const cone = new THREE.Mesh(new THREE.ConeGeometry(1.85, height + 0.2, 20, 1, true), lightShaftMaterial(color, 0.16));
  cone.position.set(1.15, (height - 0.9) / 2 + 0.2, 0.32);
  cone.rotation.x = Math.PI;
  cone.renderOrder = 3;
  g.add(cone);
  const light = new THREE.PointLight(color, 70, 15, 2);
  light.position.set(1.15, height - 0.05, 0.32);
  g.add(light);
  (g as THREE.Group & { keyLight?: THREE.PointLight }).keyLight = light;
  return g;
}

export function trafficLight(): THREE.Group {
  const g = new THREE.Group();
  const mat = paintedMetal(0x191c20, 0.5);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 4.2, 10), mat);
  pole.position.y = 2.1;
  pole.castShadow = true;
  g.add(pole);
  const head = new THREE.Mesh(roundedBox(0.3, 0.82, 0.28, 0.05, 2), mat);
  head.position.set(0, 3.9, 0.2);
  head.castShadow = true;
  g.add(head);
  const colors = [0xff3020, 0xffb020, 0x30ff70];
  colors.forEach((c, i) => {
    const on = i === 0;
    const lens = new THREE.Mesh(
      new THREE.CircleGeometry(0.085, 14),
      on ? emissiveMaterial(c, 4) : new THREE.MeshStandardMaterial({ color: c, roughness: 0.4, metalness: 0.1 }),
    );
    lens.position.set(0, 4.16 - i * 0.26, 0.35);
    g.add(lens);
    if (on) {
      const halo = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.6), glowMaterial(c, 0.5, 2.4));
      halo.position.set(0, 4.16 - i * 0.26, 0.37);
      g.add(halo);
      const l = new THREE.PointLight(c, 6, 5, 2);
      l.position.set(0, 4.16 - i * 0.26, 0.6);
      g.add(l);
    }
  });
  return g;
}

/** Near-future sedan: sculpted single shell, glowing light bars. */
export function car(color: THREE.ColorRepresentation = 0x151a20, police = false): THREE.Group {
  const g = new THREE.Group();
  const bodyParts: THREE.BufferGeometry[] = [];
  const lower = roundedBox(1.86, 0.52, 4.5, 0.22, 4);
  transform(lower, { pos: [0, 0.62, 0] });
  bodyParts.push(lower);
  const cabin = roundedBox(1.62, 0.5, 2.5, 0.3, 4);
  transform(cabin, { pos: [0, 1.05, -0.18] });
  bodyParts.push(cabin);
  const nose = roundedBox(1.78, 0.36, 1.1, 0.16, 3);
  transform(nose, { pos: [0, 0.62, 2.0], rot: [0.06, 0, 0] });
  bodyParts.push(nose);
  const body = new THREE.Mesh(mergeGeometries(bodyParts, false)!, paintedMetal(color, 0.28));
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);

  const glass = new THREE.Mesh(roundedBox(1.5, 0.42, 2.3, 0.2, 3), glassMaterial(0x0a1218, 0.55));
  glass.position.set(0, 1.14, -0.16);
  g.add(glass);

  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x0b0c0e, roughness: 0.85 });
  const rimMat = metalMaterial(0x6a7076, 0.35);
  for (const x of [-0.9, 0.9]) {
    for (const z of [1.42, -1.5]) {
      const tyre = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.13, 8, 18), wheelMat);
      tyre.rotation.y = Math.PI / 2;
      tyre.position.set(x, 0.36, z);
      tyre.castShadow = true;
      g.add(tyre);
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.12, 12), rimMat);
      rim.rotation.z = Math.PI / 2;
      rim.position.set(x, 0.36, z);
      g.add(rim);
    }
  }
  // Light bars.
  const front = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.055, 0.05), emissiveMaterial(0xdce8ff, 3));
  front.position.set(0, 0.72, 2.53);
  g.add(front);
  const rear = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.05, 0.05), emissiveMaterial(0xff2a3a, 2.4));
  rear.position.set(0, 0.8, -2.26);
  g.add(rear);
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.8), glowMaterial(0xbcd8ff, 0.3, 2.2));
  halo.position.set(0, 0.72, 2.6);
  g.add(halo);

  if (police) {
    const bar = new THREE.Mesh(roundedBox(1.3, 0.12, 0.26, 0.05, 2), paintedMetal(0x111318, 0.4));
    bar.position.set(0, 1.36, -0.1);
    g.add(bar);
    for (const [x, c] of [[-0.4, 0x2b6cff] as const, [0.4, 0xff2b3c] as const]) {
      const lens = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.09, 0.2), emissiveMaterial(c, 5));
      lens.position.set(x, 1.36, -0.1);
      g.add(lens);
      const l = new THREE.PointLight(c, 18, 9, 2);
      l.position.set(x, 1.45, -0.1);
      g.add(l);
      const hl = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.8), glowMaterial(c, 0.55, 2.2));
      hl.position.set(x, 1.4, -0.1);
      g.add(hl);
    }
    const stripe = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.34), emissiveMaterial(0x2f7fd8, 0.6));
    stripe.position.set(-0.94, 0.75, 0.1);
    stripe.rotation.y = -Math.PI / 2;
    g.add(stripe);
    const stripe2 = stripe.clone();
    stripe2.position.x = 0.94;
    stripe2.rotation.y = Math.PI / 2;
    g.add(stripe2);
  }
  return g;
}

export function dumpster(color: THREE.ColorRepresentation = 0x2b4438): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.75,
    metalness: 0.3,
    map: T.rustMetal(),
    roughnessMap: T.rustRough(),
    normalMap: T.metalNormal(),
  });
  const body = new THREE.Mesh(roundedBox(2.0, 1.15, 1.1, 0.05, 3), mat);
  body.position.y = 0.62;
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);
  const lid = new THREE.Mesh(roundedBox(2.04, 0.09, 1.16, 0.04, 2), mat);
  lid.position.set(0, 1.22, -0.28);
  lid.rotation.x = -0.35;
  lid.castShadow = true;
  g.add(lid);
  for (const x of [-0.85, 0.85]) {
    for (const z of [-0.45, 0.45]) {
      const w = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.035, 6, 12), metalMaterial(0x2a2d31, 0.6));
      w.rotation.y = Math.PI / 2;
      w.position.set(x, 0.08, z);
      g.add(w);
    }
  }
  return g;
}

export function trashBags(count = 5, seed = 3): THREE.Group {
  const g = new THREE.Group();
  const rng = new Rng(seed);
  const mat = new THREE.MeshPhysicalMaterial({ color: 0x14161a, roughness: 0.34, clearcoat: 0.6, clearcoatRoughness: 0.4 });
  for (let i = 0; i < count; i++) {
    const r = rng.range(0.2, 0.32);
    const bag = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), mat);
    bag.scale.set(1, rng.range(0.7, 0.95), rng.range(0.85, 1.1));
    bag.position.set(rng.range(-0.6, 0.6), r * 0.75, rng.range(-0.4, 0.4));
    bag.rotation.y = rng.range(0, 3);
    bag.castShadow = true;
    g.add(bag);
  }
  return g;
}

export function crate(size = 0.8, color: THREE.ColorRepresentation = 0x3a3630): THREE.Mesh {
  const mesh = new THREE.Mesh(
    roundedBox(size, size * 0.85, size * 0.9, 0.02, 2),
    new THREE.MeshStandardMaterial({ color, roughness: 0.86, map: T.concreteAlbedo(), normalMap: T.concreteNormal() }),
  );
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function barrelFire(): THREE.Group {
  const g = new THREE.Group();
  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.31, 0.29, 0.88, 18, 1, true),
    new THREE.MeshStandardMaterial({
      color: 0x54402c,
      roughness: 0.85,
      metalness: 0.5,
      map: T.rustMetal(),
      roughnessMap: T.rustRough(),
      side: THREE.DoubleSide,
    }),
  );
  barrel.position.y = 0.44;
  barrel.castShadow = true;
  g.add(barrel);
  const fire = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.0), glowMaterial(0xff8a3c, 1.5, 1.6));
  fire.position.y = 1.05;
  g.add(fire);
  const fire2 = fire.clone();
  fire2.rotation.y = Math.PI / 2;
  g.add(fire2);
  const light = new THREE.PointLight(0xff7a30, 24, 8, 2);
  light.position.y = 1.0;
  g.add(light);
  (g as THREE.Group & { flicker?: THREE.PointLight }).flicker = light;
  return g;
}

export function holoBillboard(text: string, color: THREE.ColorRepresentation, w = 3.2, h = 4.6, seed = 0, lightIntensity = 14): THREE.Group {
  const g = new THREE.Group();
  const holo = new THREE.Mesh(new THREE.PlaneGeometry(w, h), hologramMaterial(color, seed));
  g.add(holo);
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(w * 0.8, h * 0.22),
    new THREE.MeshBasicMaterial({
      map: signTexture(text, `#${new THREE.Color(color).getHexString()}`),
      transparent: true,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    }),
  );
  sign.position.set(0, -h * 0.3, 0.03);
  g.add(sign);
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(w * 1.6, h * 1.4), glowMaterial(color, 0.22, 2.6));
  halo.position.z = -0.05;
  g.add(halo);
  if (lightIntensity > 0) {
    const light = new THREE.PointLight(color, lightIntensity, 12, 2);
    light.position.z = 1.2;
    g.add(light);
  }
  return g;
}

/** Building facade block with emissive window grid and rooftop clutter. */
export function facade(
  width: number,
  height: number,
  depth: number,
  opts: { windowRepeat?: [number, number]; color?: THREE.ColorRepresentation; clutter?: boolean; seed?: number } = {},
): THREE.Group {
  const g = new THREE.Group();
  const rng = new Rng(opts.seed ?? 11);
  const wallMat = concreteMaterial(Math.max(1, Math.round(width / 6)));
  wallMat.color = new THREE.Color(opts.color ?? 0x6c7076);
  const shell = new THREE.Mesh(roundedBox(width, height, depth, 0.06, 2), wallMat);
  shell.position.y = height / 2;
  shell.castShadow = true;
  shell.receiveShadow = true;
  g.add(shell);

  const winMat = new THREE.MeshStandardMaterial({
    color: 0x0b0f14,
    emissiveMap: T.windows(),
    emissive: 0xffffff,
    emissiveIntensity: 1.5,
    roughness: 0.25,
    metalness: 0.2,
  });
  const rep = opts.windowRepeat ?? [Math.max(1, Math.round(width / 4)), Math.max(1, Math.round(height / 5))];
  const winTex = winMat.emissiveMap!.clone();
  winTex.needsUpdate = true;
  winTex.wrapS = winTex.wrapT = THREE.RepeatWrapping;
  winTex.repeat.set(rep[0], rep[1]);
  winTex.offset.set(rng.next(), rng.next());
  winTex.anisotropy = 8;
  winTex.generateMipmaps = true;
  winTex.minFilter = THREE.LinearMipmapLinearFilter;
  winMat.emissiveMap = winTex;
  const win = new THREE.Mesh(new THREE.PlaneGeometry(width * 0.94, height * 0.92), winMat);
  win.position.set(0, height / 2, depth / 2 + 0.02);
  g.add(win);

  if (opts.clutter) {
    for (let i = 0; i < 3; i++) {
      const unit = new THREE.Mesh(roundedBox(rng.range(0.7, 1.3), rng.range(0.6, 1.0), rng.range(0.7, 1.1), 0.04, 2), metalMaterial(0x4a5056, 0.6));
      unit.position.set(rng.range(-width / 3, width / 3), height + 0.35, rng.range(-depth / 3, depth / 3));
      unit.castShadow = true;
      g.add(unit);
    }
    const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 3.2, 6), metalMaterial(0x3a4046, 0.7));
    antenna.position.set(rng.range(-width / 3, width / 3), height + 1.6, rng.range(-depth / 3, depth / 3));
    g.add(antenna);
  }
  return g;
}

export function fireEscape(levels = 3, width = 2.4): THREE.Group {
  const g = new THREE.Group();
  const mat = metalMaterial(0x2a2f34, 0.62);
  for (let i = 0; i < levels; i++) {
    const y = 3.1 + i * 3.0;
    const platform = new THREE.Mesh(new THREE.BoxGeometry(width, 0.06, 1.1), mat);
    platform.position.set(0, y, 0.55);
    platform.castShadow = true;
    g.add(platform);
    for (let r = 0; r < 6; r++) {
      const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.95, 6), mat);
      rail.position.set(-width / 2 + 0.1 + (r * (width - 0.2)) / 5, y + 0.5, 1.08);
      g.add(rail);
    }
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, width, 6), mat);
    top.rotation.z = Math.PI / 2;
    top.position.set(0, y + 0.95, 1.08);
    g.add(top);
    const stair = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.05, 3.0), mat);
    stair.position.set(width / 2 - 0.4, y + 1.5, 0.9);
    stair.rotation.x = 0.72;
    stair.castShadow = true;
    g.add(stair);
  }
  return g;
}

export function chainlinkFence(width = 6, height = 2.6): THREE.Group {
  const g = new THREE.Group();
  const mat = metalMaterial(0x53585d, 0.55);
  for (let x = -width / 2; x <= width / 2 + 0.01; x += width / 4) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, height, 8), mat);
    post.position.set(x, height / 2, 0);
    g.add(post);
  }
  const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, width, 6), mat);
  rail.rotation.z = Math.PI / 2;
  rail.position.set(0, height - 0.06, 0);
  g.add(rail);
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height - 0.1),
    new THREE.MeshStandardMaterial({
      color: 0x8d949a,
      metalness: 0.9,
      roughness: 0.45,
      alphaMap: T.tileRough(),
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
    }),
  );
  mesh.position.set(0, height / 2, 0);
  g.add(mesh);
  return g;
}

export function ceilingLamp(color: THREE.ColorRepresentation = 0xfff0d8, intensity = 26, cone = true): THREE.Group {
  const g = new THREE.Group();
  const shade = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.34, 0.24, 20, 1, true),
    paintedMetal(0x24282d, 0.35),
  );
  shade.castShadow = true;
  g.add(shade);
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.0, 6), metalMaterial(0x2a2e33, 0.5));
  rod.position.y = 0.6;
  g.add(rod);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.085, 14, 10), emissiveMaterial(color, 6));
  bulb.position.y = -0.1;
  g.add(bulb);
  if (intensity > 0) {
    const light = new THREE.SpotLight(color, intensity, 14, 0.95, 0.55, 2);
    light.position.set(0, -0.05, 0);
    light.target.position.set(0, -3, 0);
    g.add(light, light.target);
    (g as THREE.Group & { spot?: THREE.SpotLight }).spot = light;
  }
  if (cone) {
    const shaft = new THREE.Mesh(new THREE.ConeGeometry(1.6, 2.9, 22, 1, true), lightShaftMaterial(color, 0.2));
    shaft.position.y = -1.45;
    shaft.rotation.x = Math.PI;
    shaft.renderOrder = 3;
    g.add(shaft);
  }
  return g;
}

export function sofa(width = 2.1, color: THREE.ColorRepresentation = 0x3c4148): THREE.Group {
  const g = new THREE.Group();
  const mat = clothMaterial(color, 0.85, 0.3);
  const seat = new THREE.Mesh(roundedBox(width, 0.34, 0.9, 0.08, 3), mat);
  seat.position.set(0, 0.42, 0);
  g.add(seat);
  const back = new THREE.Mesh(roundedBox(width, 0.62, 0.24, 0.08, 3), mat);
  back.position.set(0, 0.72, -0.36);
  back.rotation.x = -0.12;
  g.add(back);
  for (const s of [-1, 1]) {
    const arm = new THREE.Mesh(roundedBox(0.22, 0.42, 0.9, 0.08, 3), mat);
    arm.position.set((s * width) / 2 - s * 0.11, 0.5, 0);
    g.add(arm);
  }
  for (const s of [-1, 1]) {
    const cushion = new THREE.Mesh(roundedBox(width / 2 - 0.2, 0.16, 0.78, 0.07, 3), mat);
    cushion.position.set((s * width) / 4, 0.6, 0.02);
    cushion.rotation.z = s * 0.01;
    g.add(cushion);
  }
  for (const s of [-1, 1]) {
    for (const z of [-0.3, 0.3]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.025, 0.26, 8), metalMaterial(0x35393e, 0.4));
      leg.position.set((s * width) / 2 - s * 0.18, 0.13, z);
      g.add(leg);
    }
  }
  g.traverse((o) => {
    o.castShadow = true;
    o.receiveShadow = true;
  });
  return g;
}

export function table(w = 1.2, h = 0.42, d = 0.7, wood = 0x2b2118): THREE.Group {
  const g = new THREE.Group();
  const top = new THREE.Mesh(
    roundedBox(w, 0.05, d, 0.01, 2),
    new THREE.MeshPhysicalMaterial({ color: wood, roughness: 0.35, clearcoat: 0.4, clearcoatRoughness: 0.3 }),
  );
  top.position.y = h;
  g.add(top);
  for (const x of [-w / 2 + 0.08, w / 2 - 0.08]) {
    for (const z of [-d / 2 + 0.08, d / 2 - 0.08]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.022, h, 8), metalMaterial(0x2c3035, 0.45));
      leg.position.set(x, h / 2, z);
      g.add(leg);
    }
  }
  g.traverse((o) => {
    o.castShadow = true;
    o.receiveShadow = true;
  });
  return g;
}

export function chair(metal = true): THREE.Group {
  const g = new THREE.Group();
  const mat = metal ? metalMaterial(0x676d73, 0.42) : leatherMaterial(0x2a2118);
  const seat = new THREE.Mesh(roundedBox(0.44, 0.05, 0.44, 0.02, 2), mat);
  seat.position.y = 0.46;
  g.add(seat);
  const back = new THREE.Mesh(roundedBox(0.42, 0.5, 0.05, 0.02, 2), mat);
  back.position.set(0, 0.72, -0.2);
  back.rotation.x = -0.1;
  g.add(back);
  for (const x of [-0.18, 0.18]) {
    for (const z of [-0.18, 0.18]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.02, 0.46, 8), mat);
      leg.position.set(x, 0.23, z);
      g.add(leg);
    }
  }
  g.traverse((o) => {
    o.castShadow = true;
    o.receiveShadow = true;
  });
  return g;
}

export function floorLamp(color: THREE.ColorRepresentation = 0xffd9a8): THREE.Group {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.028, 1.55, 8), metalMaterial(0x33373c, 0.4));
  pole.position.y = 0.78;
  g.add(pole);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.19, 0.03, 16), metalMaterial(0x2a2e33, 0.5));
  base.position.y = 0.015;
  g.add(base);
  const shade = new THREE.Mesh(
    new THREE.CylinderGeometry(0.17, 0.22, 0.26, 18, 1, true),
    new THREE.MeshPhysicalMaterial({
      color: 0xf0e2cc,
      roughness: 0.7,
      transmission: 0.5,
      thickness: 0.4,
      side: THREE.DoubleSide,
    }),
  );
  shade.position.y = 1.6;
  g.add(shade);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), emissiveMaterial(color, 4));
  bulb.position.y = 1.58;
  g.add(bulb);
  const light = new THREE.PointLight(color, 34, 8, 2);
  light.position.y = 1.58;
  g.add(light);
  g.traverse((o) => (o.castShadow = true));
  return g;
}

export function screen(text: string, color: THREE.ColorRepresentation, w = 1.2, h = 0.7): THREE.Group {
  const g = new THREE.Group();
  const frame = new THREE.Mesh(roundedBox(w + 0.05, h + 0.05, 0.04, 0.01, 2), paintedMetal(0x14171b, 0.4));
  g.add(frame);
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(w, h), hologramMaterial(color, w));
  glow.position.z = 0.028;
  g.add(glow);
  const label = new THREE.Mesh(
    new THREE.PlaneGeometry(w * 0.8, h * 0.3),
    new THREE.MeshBasicMaterial({
      map: signTexture(text, `#${new THREE.Color(color).getHexString()}`),
      transparent: true,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    }),
  );
  label.position.z = 0.032;
  g.add(label);
  const light = new THREE.PointLight(color, 7, 5, 2);
  light.position.z = 0.5;
  g.add(light);
  return g;
}

export function windowUnit(w = 2.0, h = 2.4, cityGlow: THREE.ColorRepresentation = 0x2a4a66, lightIntensity = 12): THREE.Group {
  const g = new THREE.Group();
  const frameMat = paintedMetal(0x1a1e22, 0.5);
  const border = 0.06;
  const parts: THREE.BufferGeometry[] = [];
  parts.push(transform(roundedBox(w + border * 2, border, 0.12, 0.01, 1), { pos: [0, h / 2, 0] }));
  parts.push(transform(roundedBox(w + border * 2, border, 0.12, 0.01, 1), { pos: [0, -h / 2, 0] }));
  parts.push(transform(roundedBox(border, h, 0.12, 0.01, 1), { pos: [-w / 2, 0, 0] }));
  parts.push(transform(roundedBox(border, h, 0.12, 0.01, 1), { pos: [w / 2, 0, 0] }));
  parts.push(transform(roundedBox(border * 0.6, h, 0.1, 0.01, 1), { pos: [0, 0, 0] }));
  const frame = new THREE.Mesh(mergeGeometries(parts, false)!, frameMat);
  frame.castShadow = true;
  g.add(frame);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(w, h), glassMaterial(0x0c1a24, 0.22));
  g.add(glass);
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(w * 1.1, h * 1.1), glowMaterial(cityGlow, 0.22, 2.0));
  glow.position.z = -0.12;
  g.add(glow);
  if (lightIntensity > 0) {
    const light = new THREE.PointLight(cityGlow, lightIntensity, 8, 2);
    light.position.z = 0.9;
    g.add(light);
  }
  return g;
}

export function rug(w = 2.4, d = 1.6, color: THREE.ColorRepresentation = 0x352c26): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), clothMaterial(color, 0.95, 0.1));
  mesh.rotation.x = -Math.PI / 2;
  mesh.receiveShadow = true;
  return mesh;
}

export function pipes(count = 4, length = 8, radius = 0.07): THREE.Group {
  const g = new THREE.Group();
  const mat = metalMaterial(0x4c5157, 0.6);
  const rng = new Rng(77);
  for (let i = 0; i < count; i++) {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 10), mat);
    pipe.rotation.z = Math.PI / 2;
    pipe.position.set(0, rng.range(2.2, 4.4), rng.range(-0.2, 0.2));
    pipe.castShadow = true;
    g.add(pipe);
    for (let j = 0; j < 3; j++) {
      const collar = new THREE.Mesh(new THREE.TorusGeometry(radius * 1.35, radius * 0.28, 6, 12), mat);
      collar.rotation.y = Math.PI / 2;
      collar.position.set(-length / 2 + (j + 0.5) * (length / 3), pipe.position.y, pipe.position.z);
      g.add(collar);
    }
  }
  return g;
}

export function stringLights(span = 7, sag = 0.9, bulbs = 12, color: THREE.ColorRepresentation = 0xffc07a): THREE.Group {
  const g = new THREE.Group();
  const curve = new THREE.CatmullRomCurve3([
    V3(-span / 2, 0, 0),
    V3(0, -sag, 0),
    V3(span / 2, 0, 0),
  ]);
  const wire = new THREE.Mesh(new THREE.TubeGeometry(curve, 20, 0.012, 5), new THREE.MeshStandardMaterial({ color: 0x14161a, roughness: 0.8 }));
  g.add(wire);
  const bulbMat = emissiveMaterial(color, 3.2);
  for (let i = 1; i < bulbs; i++) {
    const p = curve.getPoint(i / bulbs);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), bulbMat);
    bulb.position.copy(p).add(V3(0, -0.05, 0));
    g.add(bulb);
    const halo = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.34), glowMaterial(color, 0.4, 2.4));
    halo.position.copy(bulb.position);
    g.add(halo);
  }
  const l1 = new THREE.PointLight(color, 14, 9, 2);
  l1.position.set(0, -sag * 0.8, 0);
  g.add(l1);
  return g;
}

export function shippingContainer(color: THREE.ColorRepresentation = 0x7a3b2e, w = 2.4, h = 2.5, d = 6): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.72,
    metalness: 0.45,
    map: T.rustMetal(),
    roughnessMap: T.rustRough(),
    normalMap: T.metalNormal(),
  });
  [mat.map, mat.roughnessMap, mat.normalMap].forEach((t) => t && t.repeat.set(3, 1));
  const body = new THREE.Mesh(roundedBox(w, h, d, 0.03, 2), mat);
  body.position.y = h / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);
  // Corrugation.
  for (let i = 0; i < 14; i++) {
    const rib = new THREE.Mesh(new THREE.BoxGeometry(w + 0.02, h * 0.95, 0.05), mat);
    rib.position.set(0, h / 2, -d / 2 + 0.2 + i * ((d - 0.4) / 13));
    g.add(rib);
  }
  return g;
}

export function graffiti(text: string, color: THREE.ColorRepresentation, w = 3, h = 1.4): THREE.Mesh {
  const tex = signTexture(text, `#${new THREE.Color(color).getHexString()}`, { font: 'italic bold 150px sans-serif' });
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshStandardMaterial({
      map: tex,
      transparent: true,
      roughness: 0.9,
      metalness: 0,
      opacity: 0.85,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    }),
  );
  return mesh;
}

export function railing(length = 6, height = 1.05): THREE.Group {
  const g = new THREE.Group();
  const mat = metalMaterial(0x3a4045, 0.5);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, length, 10), mat);
  top.rotation.z = Math.PI / 2;
  top.position.y = height;
  top.castShadow = true;
  g.add(top);
  const mid = top.clone();
  mid.position.y = height * 0.55;
  mid.scale.setScalar(0.8);
  g.add(mid);
  const posts = Math.max(2, Math.round(length / 1.2));
  for (let i = 0; i <= posts; i++) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, height, 8), mat);
    post.position.set(-length / 2 + (i * length) / posts, height / 2, 0);
    post.castShadow = true;
    g.add(post);
  }
  return g;
}

export function hvacUnit(w = 1.6, h = 1.1, d = 1.6): THREE.Group {
  const g = new THREE.Group();
  const mat = metalMaterial(0x565c62, 0.65);
  const body = new THREE.Mesh(roundedBox(w, h, d, 0.05, 2), mat);
  body.position.y = h / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);
  const fan = new THREE.Mesh(new THREE.TorusGeometry(w * 0.28, 0.04, 8, 20), metalMaterial(0x33383d, 0.5));
  fan.rotation.x = Math.PI / 2;
  fan.position.y = h + 0.02;
  g.add(fan);
  for (let i = 0; i < 4; i++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(w * 0.5, 0.02, 0.1), metalMaterial(0x2c3136, 0.6));
    blade.position.y = h + 0.01;
    blade.rotation.y = (i / 4) * Math.PI;
    g.add(blade);
  }
  const vent = new THREE.Mesh(new THREE.BoxGeometry(w * 0.7, h * 0.5, 0.03), metalMaterial(0x3a4045, 0.7));
  vent.position.set(0, h * 0.5, d / 2 + 0.02);
  g.add(vent);
  return g;
}

export function waterTank(): THREE.Group {
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x3a2c20, roughness: 0.9, map: T.concreteAlbedo(), normalMap: T.concreteNormal() });
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 2.2, 20, 1), wood);
  tank.position.y = 3.3;
  tank.castShadow = true;
  g.add(tank);
  const cone = new THREE.Mesh(new THREE.ConeGeometry(1.25, 0.6, 20), wood);
  cone.position.y = 4.65;
  cone.castShadow = true;
  g.add(cone);
  const mat = metalMaterial(0x3d4247, 0.7);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 2.3, 8), mat);
    leg.position.set(Math.cos(a) * 0.85, 1.15, Math.sin(a) * 0.85);
    leg.rotation.set(Math.sin(a) * 0.09, 0, -Math.cos(a) * 0.09);
    leg.castShadow = true;
    g.add(leg);
  }
  for (const y of [2.5, 4.0]) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(1.17, 0.03, 6, 22), mat);
    band.rotation.x = Math.PI / 2;
    band.position.y = y;
    g.add(band);
  }
  return g;
}

export function evidenceMarker(n: number): THREE.Group {
  const g = new THREE.Group();
  const cardMat = new THREE.MeshStandardMaterial({ color: 0xf2d94e, roughness: 0.5, side: THREE.DoubleSide });
  const a = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.16), cardMat);
  a.position.set(0, 0.08, -0.03);
  a.rotation.x = 0.22;
  const b = a.clone();
  b.position.z = 0.03;
  b.rotation.x = -0.22;
  g.add(a, b);
  const label = new THREE.Mesh(
    new THREE.PlaneGeometry(0.07, 0.07),
    new THREE.MeshBasicMaterial({ map: signTexture(String(n), '#141414'), transparent: true }),
  );
  label.position.set(0, 0.09, 0.035);
  g.add(label);
  return g;
}

export function policeTape(length = 5): THREE.Group {
  const g = new THREE.Group();
  const tex = signTexture('POLICE LINE DO NOT CROSS', '#f2c21a', { font: 'bold 96px sans-serif' });
  tex.wrapS = THREE.RepeatWrapping;
  tex.repeat.set(3, 1);
  const tape = new THREE.Mesh(
    new THREE.PlaneGeometry(length, 0.12),
    new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0x2a2000, side: THREE.DoubleSide, roughness: 0.7 }),
  );
  g.add(tape);
  return g;
}

export function droneUnit(): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(roundedBox(0.34, 0.12, 0.34, 0.05, 2), paintedMetal(0x1c2026, 0.35));
  g.add(body);
  for (const [x, z] of [
    [-0.22, -0.22],
    [0.22, -0.22],
    [-0.22, 0.22],
    [0.22, 0.22],
  ] as const) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.016, 6, 14), metalMaterial(0x2a2f35, 0.5));
    ring.rotation.x = Math.PI / 2;
    ring.position.set(x, 0.02, z);
    g.add(ring);
    const rotor = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.006, 0.03), metalMaterial(0x40464c, 0.4));
    rotor.position.set(x, 0.04, z);
    g.add(rotor);
  }
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8), emissiveMaterial(0x38c8ff, 3));
  eye.position.set(0, -0.06, 0.1);
  g.add(eye);
  const beam = new THREE.Mesh(new THREE.ConeGeometry(0.6, 3.0, 16, 1, true), lightShaftMaterial(0x48c0ff, 0.24));
  beam.position.set(0, -1.5, 0.1);
  beam.rotation.x = Math.PI;
  g.add(beam);
  const light = new THREE.PointLight(0x48c0ff, 10, 9, 2);
  light.position.set(0, -0.2, 0.1);
  g.add(light);
  return g;
}

export function mirrorPanel(w = 1.6, h = 2.2, reflection?: THREE.Texture): THREE.Mesh {
  const mat = reflection
    ? new THREE.MeshStandardMaterial({ map: reflection, roughness: 0.12, metalness: 0.9, color: 0xbfd4e2 })
    : new THREE.MeshPhysicalMaterial({ color: 0x1a2228, roughness: 0.06, metalness: 1, envMapIntensity: 2.4 });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  return mesh;
}

export function bloodPool(radius = 0.5, seed = 5): THREE.Mesh {
  const rng = new Rng(seed);
  const shape = new THREE.Shape();
  const steps = 22;
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const r = radius * lerp(0.6, 1.15, rng.next());
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r * 0.75;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  const geo = new THREE.ShapeGeometry(shape, 8);
  geo.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshPhysicalMaterial({
      color: 0x2a0507,
      roughness: 0.12,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
      metalness: 0,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    }),
  );
  return mesh;
}
