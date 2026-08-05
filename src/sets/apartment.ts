/**
 * Chapter 2 — a cramped apartment on the wrong side of the river.
 * One warm lamp, a television nobody is watching, rain on the window, and a man
 * who is angrier than the room can hold.
 */
import * as THREE from 'three';
import { Sky, envPanel } from '../engine/sky';
import { Rain } from '../engine/weather';
import { DustMotes, LightShaft, glowSprite } from '../engine/volumetric';
import { spotLight } from '../engine/lighting';
import { MAT, box, ceilingLamp, chair, cyl, neonSign, plane, skyline, sofa, table, tvScreen, wallWithWindow, windowPane } from './kit';
import type { GameSet, SetContext } from './types';

export function buildApartment(ctx: SetContext): GameSet {
  const { quality: q, renderer } = ctx;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 16 / 9, 0.06, 400);

  const sky = new Sky({
    top: 0x04070d,
    horizon: 0x101f2e,
    ground: 0x05080b,
    clouds: 0.8,
    cloudColor: 0x18283a,
    cityGlow: 0.7,
    cityGlowColor: 0x2b4460,
  });
  scene.add(sky.mesh);
  scene.fog = new THREE.FogExp2(0x0a1219, 0.02);
  const env = sky.buildEnvironment(renderer, [envPanel(0xffb066, 1.6, 6, 4, new THREE.Vector3(0, 2.2, -3))]);
  scene.environment = env;
  scene.environmentIntensity = 0.6;

  /* -------------------------------------------------------------- shell */
  const W = 7.2, D = 6.4, H = 2.75;
  const floorMat = MAT.wood(4, 0.8);
  const floor = plane(W, D, floorMat);
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  const wallMat = MAT.drywall(0x6f7378);
  const wallMatDark = MAT.drywall(0x4a4e53);

  // Back wall with the window onto the city.
  const back = wallWithWindow(W, H, 0.16, wallMat, { x: 1.2, y: 1.55, w: 2.6, h: 1.7 });
  back.position.set(0, 0, -D / 2);
  scene.add(back);
  const pane = windowPane(2.6, 1.7, 1);
  pane.position.set(1.2, 1.55, -D / 2 + 0.02);
  scene.add(pane);
  const sill = box(2.8, 0.08, 0.3, wallMatDark, [1.2, 0.68, -D / 2 + 0.14]);
  scene.add(sill);
  const frameV = box(0.06, 1.7, 0.1, wallMatDark, [1.2, 1.55, -D / 2 + 0.06]);
  scene.add(frameV);

  // Side walls, front wall behind camera.
  const left = wallWithWindow(D, H, 0.16, wallMatDark, null);
  left.rotation.y = Math.PI / 2;
  left.position.set(-W / 2, 0, 0);
  scene.add(left);
  const right = wallWithWindow(D, H, 0.16, wallMatDark, { x: 1.6, y: 1.3, w: 1.0, h: 2.05 });
  right.rotation.y = -Math.PI / 2;
  right.position.set(W / 2, 0, 0);
  scene.add(right);
  const doorGlow = box(0.02, 2.0, 0.95, MAT.neon(0x8fb4d8, 0.5), [W / 2 - 0.09, 1.28, 1.6]);
  scene.add(doorGlow);

  const front = wallWithWindow(W, H, 0.16, wallMatDark, null);
  front.rotation.y = Math.PI;
  front.position.set(0, 0, D / 2);
  scene.add(front);

  const ceil = plane(W, D, MAT.drywall(0x585c60));
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = H;
  scene.add(ceil);

  /* --------------------------------------------------------------- props */
  const couch = sofa(1.95, MAT.leather(0x2a2620));
  couch.position.set(-1.5, 0, 1.5);
  couch.rotation.y = 0.12;
  scene.add(couch);

  const coffee = table(1.1, 0.6, 0.42, MAT.wood(2, 0.7), MAT.metal(1, 0.2));
  coffee.position.set(-1.3, 0, -0.05);
  scene.add(coffee);
  // Bottles and a spilled glass: the room tells you about its owner.
  for (const [x, z, h, r] of [[-1.6, -0.1, 0.26, 0.045], [-1.42, 0.08, 0.22, 0.038], [-0.95, -0.16, 0.3, 0.05]] as const) {
    const bottle = cyl(r * 0.5, r, h, MAT.glass(0x1a3020, 0.5), [x, 0.42 + h / 2, z], 12);
    scene.add(bottle);
  }
  const glassOnSide = cyl(0.04, 0.04, 0.1, MAT.glass(0x223038, 0.4), [-0.85, 0.5, 0.12], 12);
  glassOnSide.rotation.z = Math.PI / 2;
  scene.add(glassOnSide);

  const tv = tvScreen(1.5, 0.86, 'ANDROID RIGHTS', 'PROTEST TURNS VIOLENT', 0x9fd8ff);
  tv.group.position.set(-3.4, 1.35, 0.6);
  tv.group.rotation.y = Math.PI / 2;
  scene.add(tv.group);
  const tvStand = box(0.4, 0.9, 1.1, MAT.paint(0x1b1e22, 0.7), [-3.35, 0.45, 0.6]);
  scene.add(tvStand);

  // Kitchen counter along the back-left.
  const counter = box(2.6, 0.9, 0.65, MAT.paint(0x35393e, 0.6), [-2.2, 0.45, -D / 2 + 0.5]);
  scene.add(counter);
  const counterTop = box(2.7, 0.06, 0.7, MAT.tile(2), [-2.2, 0.93, -D / 2 + 0.5]);
  scene.add(counterTop);
  const sink = box(0.5, 0.04, 0.4, MAT.metal(1, 0.35), [-2.6, 0.95, -D / 2 + 0.5]);
  scene.add(sink);
  for (let i = 0; i < 5; i++) {
    const plate = cyl(0.11, 0.11, 0.02, MAT.drywall(0xb9bec2), [-1.35 + i * 0.02, 0.97 + i * 0.022, -D / 2 + 0.42], 14);
    scene.add(plate);
  }

  const dining = table(1.2, 0.8, 0.74, MAT.wood(2, 0.6));
  dining.position.set(2.1, 0, -1.5);
  scene.add(dining);
  const ch1 = chair(MAT.wood(1, 0.6));
  ch1.position.set(2.1, 0, -0.6);
  ch1.rotation.y = Math.PI;
  scene.add(ch1);
  const ch2 = chair(MAT.wood(1, 0.6));
  ch2.position.set(2.1, 0, -2.4);
  scene.add(ch2);

  // Clutter: laundry, boxes, a child's drawing taped to the wall.
  scene.add(box(0.7, 0.45, 0.5, MAT.paint(0x4a4038, 0.9), [3.0, 0.22, 2.1], 0.4));
  scene.add(box(0.5, 0.3, 0.4, MAT.paint(0x3a3a3a, 0.9), [2.6, 0.15, 2.6], -0.3));
  const drawing = new THREE.Mesh(
    new THREE.PlaneGeometry(0.3, 0.4),
    new THREE.MeshStandardMaterial({ color: new THREE.Color(0xd8d2c4).convertSRGBToLinear(), roughness: 0.95 }),
  );
  drawing.position.set(-W / 2 + 0.1, 1.5, -1.2);
  drawing.rotation.y = Math.PI / 2;
  scene.add(drawing);

  /* -------------------------------------------------------------- outside */
  const outside = skyline(26, 46, 21, { minH: 10, maxH: 40, lit: 0.3 });
  outside.position.set(4, -6, -26);
  scene.add(outside);
  const sign = neonSign('MOTEL', { color: 0xff5a6e, w: 5, h: 1.6, intensity: 2.2, glow: 0.5 });
  sign.position.set(9, 5.5, -19);
  sign.rotation.y = -0.5;
  scene.add(sign);

  /* --------------------------------------------------------------- lights */
  const lamp = ceilingLamp(0xffd0a0, 20, 0.3);
  lamp.group.position.set(-1.4, H - 0.34, 0.7);
  lamp.light.target.position.set(-1.4, 0, 0.7);
  scene.add(lamp.group);

  // Cold city light through the window: the counter-key.
  const windowKey = spotLight(q, {
    color: 0x86b6e8,
    intensity: 52,
    position: new THREE.Vector3(2.6, 3.0, -D / 2 - 2.2),
    target: new THREE.Vector3(0.2, 1.1, 0.6),
    angle: 0.7,
    penumbra: 0.85,
    distance: 16,
    radius: 3,
  });
  scene.add(windowKey, windowKey.target);

  const shaft = new LightShaft(2.7, 1.8, 6.5, 0xa8cbf0, q.volumetrics ? 0.075 : 0.03, 0);
  shaft.mesh.position.set(1.2, 1.55, -D / 2 + 0.1);
  shaft.mesh.rotation.y = Math.PI;
  shaft.mesh.rotation.x = -0.22;
  scene.add(shaft.mesh);

  const amb = new THREE.HemisphereLight(0x35465a, 0x241d14, 1.9);
  scene.add(amb);

  const tvFlickerLight = tv.light;
  const lampGlow = glowSprite(0xffd0a0, 0.9, 0.35);
  lampGlow.position.copy(lamp.group.position);
  scene.add(lampGlow);

  const motes = q.volumetrics ? new DustMotes(260, new THREE.Vector3(6, 2.6, 5.6), 0xd8c8a8, 0.02) : null;
  if (motes) {
    motes.points.position.y = 1.2;
    scene.add(motes.points);
  }

  /* Rain outside the window only — the volume is parked beyond the glass. */
  const rain = new Rain({
    count: Math.round(q.rainCount * 0.35),
    splashes: 0,
    radius: 7,
    height: 9,
    wind: new THREE.Vector2(1.2, 0.2),
    color: 0xbcd8ff,
    mist: false,
  });
  rain.group.position.set(1.2, 0, -D / 2 - 3);
  scene.add(rain.group);

  const marks: GameSet['marks'] = {
    kitchen: { pos: [-2.2, 0, -2.1], rotY: 0.1 },
    livingCentre: { pos: [-0.2, 0, 0.4], rotY: 0.6 },
    byWindow: { pos: [1.5, 0, -1.9], rotY: 2.6 },
    doorway: { pos: [3.0, 0, 1.6], rotY: -1.4 },
    sofaSeat: { pos: [-1.5, 0, 1.35], rotY: 0.12 },
    childCorner: { pos: [2.6, 0, 1.9], rotY: -2.2 },
    ownerStand: { pos: [1.2, 0, 1.2], rotY: -2.4 },
    cower: { pos: [2.9, 0, 2.3], rotY: -2.2 },
  };

  const bounds = { minX: -W / 2 + 0.4, maxX: W / 2 - 0.4, minZ: -D / 2 + 0.4, maxZ: D / 2 - 0.4 };
  const colliders: GameSet['colliders'] = [
    { min: [-2.5, 1.0], max: [-0.5, 2.0] },     // sofa
    { min: [-1.9, -0.4], max: [-0.7, 0.3] },    // coffee table
    { min: [-3.6, 0.0], max: [-3.0, 1.2] },     // tv stand
    { min: [-3.5, -3.0], max: [-0.9, -2.5] },   // kitchen counter
    { min: [1.5, -1.95], max: [2.7, -1.05] },   // dining table
    { min: [2.6, 1.8], max: [3.4, 2.9] },       // boxes
  ];
  const interactables: GameSet['interactables'] = [
    {
      id: 'i_bottles', at: [-1.3, 0.55, -0.05], label: 'COUNT THE BOTTLES', marker: true,
      think: 'Six since noon. His blood alcohol is above two per cent. He will not remember tonight.',
      flag: 'sawBottles',
    },
    {
      id: 'i_drawing', at: [-3.3, 1.5, -1.2], label: "EXAMINE THE CHILD'S DRAWING", marker: true,
      think: 'Three figures. One of them has been scribbled out, hard enough to tear the paper.',
      flag: 'sawDrawing',
    },
    {
      id: 'i_tv', at: [-3.2, 1.35, 0.6], label: 'WATCH THE BROADCAST',
      think: 'Two hundred and forty-three deviants this month. Sixty-one per cent of humans want us recalled.',
      flag: 'sawNews',
    },
    {
      id: 'i_window', at: [1.2, 1.4, -2.9], label: 'CLEAN THE WINDOW', radius: 1.4,
      think: 'Two hundred and eleven days of the same list. I have never once been asked to stop.',
      flag: 'cleaned',
    },
  ];

  const scanTargets: GameSet['scanTargets'] = [
    {
      id: 'bottles',
      at: [-1.3, 0.62, -0.05],
      label: 'EMPTY BOTTLES — 6',
      readout: ['CONTENT: BOURBON, 43%', 'CONSUMED: LAST 14 HOURS', 'OWNER BAC ESTIMATE: 0.21%', 'RISK OF VIOLENCE: ELEVATED'],
      flag: 'sawBottles',
    },
    {
      id: 'drawing',
      at: [-3.4, 1.5, -1.2],
      label: "CHILD'S DRAWING",
      readout: ['SUBJECT: THREE FIGURES', 'ONE FIGURE SCRIBBLED OUT', 'AGE OF PAPER: 3 WEEKS', 'EMOTIONAL MARKER: FEAR'],
      flag: 'sawDrawing',
    },
    {
      id: 'tvnews',
      at: [-3.3, 1.35, 0.6],
      label: 'BROADCAST — ANDROID PROTEST',
      readout: ['SOURCE: CHANNEL 16', 'DEVIANT COUNT: 243 THIS MONTH', 'PUBLIC OPINION: 61% HOSTILE'],
      flag: 'sawNews',
    },
  ];

  let tvPhase = 0;
  return {
    name: 'apartment',
    scene,
    camera,
    marks,
    bounds,
    colliders,
    interactables,
    lights: { lamp: lamp.light, windowKey, tv: tvFlickerLight, amb },
    scanTargets,
    rain,
    update(dt, time) {
      sky.update(time);
      rain.update(dt, time, camera);
      motes?.update(time);
      shaft.update(time);
      // Television flicker drives its point light.
      tvPhase += dt;
      const f = 0.75 + Math.sin(tvPhase * 7.3) * 0.12 + Math.sin(tvPhase * 19.1) * 0.06;
      tvFlickerLight.intensity = 12 * f;
      lamp.light.intensity = 20 + Math.sin(time * 1.7) * 0.6;
    },
    applyLook(fx) {
      fx.wetLens = 0;
      fx.setBloom(0.16, 0.7, 1.9);
      fx.setStreak(0.16, new THREE.Vector3(0.9, 0.66, 0.4));
      fx.highlightCeiling = 6.0;
      fx.applyLook({
        uExposure: 1.5,
        uContrast: 1.12,
        uSaturation: 1.02,
        uSplit: 0.22,
        uVignette: 0.52,
        uGrain: 0.008,
        uHalation: 0.1,
        uShadowTint: new THREE.Vector3(0.34, 0.58, 0.86),
        uHighlightTint: new THREE.Vector3(1.0, 0.82, 0.62),
      });
    },
    dispose() {
      rain.dispose();
    },
    actions: {
      lampSwing: (on) => {
        lamp.light.intensity = on ? 11 : 20;
      },
      tvOff: (on) => {
        tvFlickerLight.intensity = on ? 0 : 12;
      },
    },
  };
}
