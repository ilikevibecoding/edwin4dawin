/**
 * Scene 7 — Medals.
 *
 * The ceremony in a hall of white brick, and then the film takes itself apart:
 * the whole set lifts off the floor brick by brick and drifts away, leaving the
 * end card in empty space. Every element of the hall is built by one `Bricks`
 * builder so its part list can be handed straight to `BrickBurst`.
 *
 * Narration:
 *    2.00 – 9.97  "They gave out medals in a hall of white brick..."
 *   10.77 – 15.83 "Every last one of them built from two by four bricks..."
 */
import * as THREE from 'three';
import { Bricks } from '../engine/brick.js';
import { COLORS } from '../engine/palette.js';
import { standardLights, cameraRig, handheld } from '../engine/stage.js';
import { Starfield, BrickBurst, Sparks, glowSprite } from '../engine/fx.js';
import { makeTextTexture } from '../engine/overlay.js';
import { extrudeSVG, svgTexture } from '../engine/svg.js';
import { hash11 } from '../engine/rng.js';
import { buildMinifig, poseWalk, poseStand, poseArmsUp, bakeFigure, Crowd, FIG } from '../kit/minifig.js';
import * as ease from '../engine/ease.js';

export const meta = { id: 'medals', title: 'Medals', duration: 30, letterbox: 0.105 };

const AISLE = 9; // half-width of the central aisle, in studs
const HALL_LEN = 130;
const DAIS_Z = -52;
const DISSOLVE = 20.6; // when the hall starts lifting away

export async function build(ctx) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, ctx.aspect, 0.2, 3000);
  const lights = standardLights(scene, 'hall', { shadowRadius: 70, shadowMap: 2048, intensity: 0.72 });
  scene.background = new THREE.Color(0x9aa6b8);
  scene.fog = new THREE.Fog(0x9aa6b8, 70, 260);

  const stars = new Starfield({ count: 1400, radius: 800, sizeMax: 3.4 });
  stars.object.visible = false;
  scene.add(stars.object);

  // ---------------------------------------------------------------- the hall
  const hall = buildHall();
  const hallModel = hall.build();
  scene.add(hallModel);

  const banners = await buildBanners();
  scene.add(banners);

  // The set dissolving upward at the end: the same bricks, thrown gently.
  const burst = new BrickBurst(hallModel.userData.parts.concat(gatherParts(banners)), {
    t0: DISSOLVE,
    origin: new THREE.Vector3(0, -30, DAIS_Z + 40),
    speed: 5.2,
    spin: 1.2,
    gravity: 2.4, // positive: everything floats up
    spread: 0.55,
    radial: 0.35,
    stagger: 1.9,
    max: 2600,
    seed: 12,
  });
  burst.object.visible = false;
  scene.add(burst.object);

  // ------------------------------------------------------------ the assembly
  const cast = await buildCast();
  scene.add(cast.group);

  const crowd = await buildCrowd();
  scene.add(crowd.group);

  // ------------------------------------------------------------------ medals
  const medal = await buildMedal();
  cast.leia.handR.add(medal.group);
  medal.group.position.set(0, -0.1, 0.24);
  medal.group.rotation.set(1.2, 0, 0);

  const worn = medal.group.clone();
  worn.scale.setScalar(0.92);
  cast.hero.torso.add(worn);
  worn.position.set(0, 1.05, 0.56);
  worn.rotation.set(0, 0, 0);
  worn.visible = false;

  // ------------------------------------------------------------------ finale
  const endCard = buildEndCard();
  camera.add(endCard.group);
  scene.add(camera);

  const cheerSparks = new Sparks({
    t0: 13.0,
    life: 3.2,
    count: 220,
    speed: 12,
    gravity: -5,
    color: 0xffe066,
    size: 0.6,
    origin: [0, 16, DAIS_Z + 26],
    seed: 21,
  });
  scene.add(cheerSparks.object);

  ctx.sfx(0.2, 'ceremony_ambience', { gain: 0.5 });
  ctx.sfx(12.6, 'crowd_cheer', { gain: 0.85 });
  ctx.sfx(DISSOLVE - 0.15, 'brick_scatter', { gain: 0.75 });
  ctx.sfx(DISSOLVE + 1.1, 'whoosh_transition', { gain: 0.4 });

  // ------------------------------------------------------------------ update
  const heroWalkStart = 0.5;
  const heroWalkEnd = 8.6;

  return {
    scene,
    camera,
    bloom: { strength: 0.34, radius: 0.55, threshold: 0.94 },
    update(t) {
      // --- the two heroes walk the aisle, then stop before the dais
      const walkU = ease.range(t, heroWalkStart, heroWalkEnd);
      const walking = t > heroWalkStart && t < heroWalkEnd;
      for (let i = 0; i < cast.heroes.length; i++) {
        const fig = cast.heroes[i];
        const z = ease.lerp(28, DAIS_Z + 13.5, ease.inOutCubic(walkU));
        fig.root.position.z = z;
        if (fig.isDroid) {
          fig._r2?.roll?.(t, { speed: walking ? 1 : 0.15 });
          continue;
        }
        if (walking) poseWalk(fig, t, { speed: 1.5, amp: 0.5, bob: 0.07 });
        else if (t >= heroWalkEnd) {
          idle(fig, t, i * 2.1);
          // A proper bow as the medal goes over the head, then straighten up.
          const bow = ease.pulse(t, 10.0, 1.0, 1.8, 1.4);
          fig.head.rotation.x += bow * 0.3;
          fig.torso.rotation.x += bow * 0.1;
          // Hands come together in front during the presentation.
          fig.armL.rotation.x -= bow * 0.5;
          fig.armR.rotation.x -= bow * 0.5;
        } else idle(fig, t, i * 2.1);
      }

      // --- Leia raises the medal and places it
      idle(cast.leia, t, 4.7);
      const place = ease.pulse(t, 10.4, 2.0, 1.6, 1.8);
      cast.leia.armR.rotation.x = -0.15 - 1.45 * place;
      cast.leia.armL.rotation.x = -0.08 - 0.55 * place;
      cast.leia.armR.rotation.z = 0.07 - place * 0.22;
      cast.leia.torso.rotation.x += place * 0.12;
      cast.leia.head.rotation.x += place * 0.2;
      medal.group.visible = t < 12.3;
      worn.visible = t >= 12.3;
      medal.spin(t);

      // --- crowd: still, then applause
      crowd.update(t);

      // --- sparkle burst at the cheer
      cheerSparks.update(t);

      // --- the set lifts away
      const dissolving = t >= DISSOLVE;
      hallModel.visible = !dissolving;
      banners.visible = !dissolving;
      burst.object.visible = dissolving;
      if (dissolving) burst.update(t);
      const away = ease.range(t, DISSOLVE + 0.3, DISSOLVE + 4.2);
      cast.group.position.y = away * 26;
      cast.group.rotation.z = away * 0.25;
      scene.fog.near = ease.lerp(70, 400, away);
      scene.fog.far = ease.lerp(260, 900, away);
      const bg = new THREE.Color(0x9aa6b8).lerp(new THREE.Color(0x04060b), ease.smooth(away));
      scene.background = bg;
      scene.fog.color.copy(bg);
      lights.hemi.intensity = ease.lerp(0.83, 0.2, away);
      lights.key.intensity = ease.lerp(1.51, 0.5, away);
      stars.object.visible = away > 0.05;
      stars.opacity = away;
      stars.update(t);

      // --- end card
      endCard.update(t);

      // --- camera
      cameraRig(camera, t, {
        pos: [
          [0, [0, 11, 46]],
          [8.2, [0, 8.4, 2]],
          [9.8, [-20, 9.4, -24]],
          [13.6, [-16.0, 8.8, -27.5]],
          [14.4, [-9.5, 8.6, -51]],
          [18.2, [-5.0, 8.0, -48]],
          [19.4, [0, 17, -16]],
          [DISSOLVE, [0, 21, 14]],
          [meta.duration, [0, 30, 96]],
        ],
        look: [
          [0, [0, 5.5, -28]],
          [8.2, [0, 5.5, -38]],
          [9.8, [-0.5, 6.2, -39.5]],
          [13.6, [-0.5, 6.2, -40]],
          [14.4, [-1.2, 5.2, -38.5]],
          [18.2, [0.0, 5.2, -38.5]],
          [19.4, [0, 6, -42]],
          [DISSOLVE, [0, 9, -32]],
          [meta.duration, [0, 22, -32]],
        ],
        fov: [
          [0, 46],
          [8.2, 40],
          [9.8, 36],
          [13.6, 33],
          [14.4, 38],
          [18.2, 35],
          [19.4, 50],
          [meta.duration, 56],
        ],
        ease: ease.inOutCubic,
      });
      handheld(camera, t, 0.045, 0.4, 3);
    },
  };
}

// ---------------------------------------------------------------------------
// Set construction
// ---------------------------------------------------------------------------

function buildHall() {
  const b = new Bricks({ studSegments: 6 });
  const W = 46; // half-width of the hall
  const white = COLORS.white;
  const grey = COLORS.lightBluishGray;
  const dark = COLORS.darkBluishGray;

  // Floor: alternating grey plates with a dark aisle runner, laid in 4x4
  // sections so the set has visible brick divisions and dissolves nicely.
  for (let x = -W; x < W; x += 4) {
    for (let z = -70; z < HALL_LEN - 70; z += 4) {
      const inAisle = Math.abs(x + 2) < AISLE;
      const checker = ((x / 4 + z / 4) & 1) === 0;
      b.tile(x, -1, z, 4, 4, inAisle ? dark : checker ? grey : COLORS.flatSilver);
    }
  }
  // Gold aisle edging
  for (let z = -60; z < 46; z += 4) {
    for (const sx of [-1, 1]) b.tile(sx * AISLE - (sx > 0 ? 0 : 1), 0, z, 1, 4, COLORS.pearlGold);
  }

  // Side walls, built in 4-stud courses so they read as masonry and break up
  // into proper bricks when the set lifts away.
  for (const sx of [-1, 1]) {
    for (let z = -68; z < 58; z += 4) {
      for (let row = 0; row < 12; row++) {
        const y = row * 3;
        const stagger = (row & 1) === 0 ? 0 : 2;
        const c = row < 8 ? grey : white;
        b.brick(sx * W - (sx > 0 ? 0 : 4), y, z + (stagger % 4) - 2, 4, 4, c, { studs: row === 11 });
      }
      // recessed dark channel
      b.tile(sx * (W - 4.4) - (sx > 0 ? 0 : 0.6), 18, z, 0.6, 4, dark, { studs: false });
    }
    // pilasters every 12 studs, in blue with gold caps
    for (let z = -66; z < 56; z += 12) {
      b.box(sx * (W - 4) - 2, 0, z, 2, 4, 34, COLORS.darkBlue, { studs: false });
      b.box(sx * (W - 4.2) - 2.2, 34, z - 0.2, 2.4, 4.4, 2, COLORS.pearlGold, { studs: false });
      // lit panel between pilasters
      b.box(sx * (W - 4.3) - 1.4, 22, z + 5, 1.4, 5, 9, COLORS.transClear, {
        studs: false,
        emissive: 0xfff0cc,
        emissiveIntensity: 2.2,
        finish: 'glossy',
      });
    }
  }

  // Rear wall behind the dais.
  for (let x = -W; x < W; x += 4) {
    for (let row = 0; row < 12; row++) {
      b.brick(x, row * 3, DAIS_Z - 12, 4, 4, row < 8 ? grey : white, { studs: row === 11 });
    }
  }
  // A dark inset arch, with a gold surround.
  b.box(-15, 6, DAIS_Z - 11.4, 30, 1.4, 32, COLORS.trueBlack, { studs: false });
  b.box(-16, 5, DAIS_Z - 11.8, 32, 1, 1, COLORS.pearlGold, { studs: false });
  b.box(-16, 38, DAIS_Z - 11.8, 32, 1, 2, COLORS.pearlGold, { studs: false });
  for (const sx of [-1, 1]) b.box(sx * 16 - (sx > 0 ? 0 : 1), 5, DAIS_Z - 11.8, 1, 1, 35, COLORS.pearlGold, { studs: false });

  // The dais: three broad steps and a raised platform.
  for (let i = 0; i < 3; i++) {
    const inset = i * 4;
    for (let x = -22 + inset; x < 22 - inset; x += 4) {
      b.box(x, i * 2, DAIS_Z + inset, 4, 20 - inset, 2, i === 2 ? white : grey);
    }
  }
  for (let x = -14; x < 14; x += 4) b.tile(x, 6, DAIS_Z + 8, 4, 10, COLORS.darkBlue);

  // A low balustrade along the aisle.
  for (const sx of [-1, 1]) {
    for (let z = -40; z < 40; z += 4) {
      b.box(sx * (AISLE + 2) - (sx > 0 ? 0 : 1), 0, z, 1, 4, 4, grey, { studs: false });
      b.tile(sx * (AISLE + 2) - (sx > 0 ? 0 : 1), 4, z, 1, 4, COLORS.pearlGold);
    }
  }

  return b;
}

async function buildBanners() {
  const g = new THREE.Group();
  let tex = null;
  try {
    tex = await svgTexture('svg/alliance-banner.svg', { w: 256, h: 683 });
  } catch {
    tex = null;
  }
  for (const sx of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const z = DAIS_Z + 6 + i * 26;
      const mesh = tex
        ? new THREE.Mesh(
            new THREE.PlaneGeometry(9, 24),
            new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85, side: THREE.DoubleSide })
          )
        : new THREE.Mesh(
            new THREE.PlaneGeometry(9, 24),
            new THREE.MeshStandardMaterial({ color: COLORS.darkBlue, roughness: 0.85, side: THREE.DoubleSide })
          );
      mesh.position.set(sx * 40.5, 26, z);
      mesh.rotation.y = sx > 0 ? -Math.PI / 2 : Math.PI / 2;
      mesh.castShadow = false;
      mesh.receiveShadow = true;
      g.add(mesh);
      // banner pole
      const b = new Bricks();
      b.cyl(sx * 40.5, 92, z, 0.35, 3, COLORS.pearlGold, { segments: 8 });
      g.add(b.build());
    }
  }
  return g;
}

function gatherParts(group) {
  const out = [];
  group.traverse((n) => {
    if (n.userData?.parts) out.push(...n.userData.parts);
  });
  return out;
}

async function buildMedal() {
  const group = new THREE.Group();
  let disc = null;
  try {
    disc = await extrudeSVG('svg/medal-starbird.svg', {
      depth: 0.12,
      size: 1.5,
      color: COLORS.chromeGold,
      metalness: 0.9,
      roughness: 0.22,
      bevelSize: 0.02,
      bevelThickness: 0.03,
    });
  } catch {
    const b = new Bricks();
    b.cyl(0, 0, 0, 0.7, 0.4, COLORS.chromeGold, { segments: 20, finish: 'gold' });
    disc = b.build();
  }
  group.add(disc);
  // ribbon
  const rb = new Bricks();
  rb.addGeometry(new THREE.TorusGeometry(1.0, 0.07, 6, 20, Math.PI), {
    x: 0,
    y: 1.05,
    z: 0,
    color: COLORS.blue,
  });
  group.add(rb.build());
  const shine = glowSprite(0xffeaa0, 2.4, 0.0);
  group.add(shine);
  return {
    group,
    spin(t) {
      disc.rotation.y = Math.sin(t * 1.4) * 0.35;
      shine.material.opacity = 0.55 * ease.pulse(t, 11.6, 0.25, 0.35, 1.4);
      shine.scale.setScalar(2.4 + 2.6 * ease.pulse(t, 11.6, 0.25, 0.2, 1.2));
    },
  };
}

// ---------------------------------------------------------------------------
// People
// ---------------------------------------------------------------------------

async function buildCast() {
  const group = new THREE.Group();
  const chars = await tryCharacters();

  const leia = chars?.makeLeia ? await chars.makeLeia({ seed: 1 }) : await buildMinifig({
    shirt: COLORS.white,
    legs: COLORS.white,
    arms: COLORS.white,
    head: COLORS.lightFlesh,
    face: 'svg/face-leia.svg',
    torsoPrint: 'svg/torso-leia.svg',
    seed: 1,
  });
  leia.root.position.set(0, 2.8, DAIS_Z + 9.5);
  leia.root.rotation.y = 0;
  group.add(leia.root);

  const heroSpecs = [
    { x: -3.2, make: 'luke', shirt: COLORS.tan, legs: COLORS.tan, face: 'svg/face-luke.svg', print: 'svg/torso-luke.svg', seed: 2 },
    { x: 3.2, make: 'pilot', shirt: COLORS.brightOrange, legs: COLORS.white, face: 'svg/face-determined.svg', print: 'svg/torso-pilot.svg', seed: 3 },
  ];
  const heroes = [];
  for (const s of heroSpecs) {
    let fig;
    if (s.make === 'luke' && chars?.makeLuke) fig = await chars.makeLuke({ seed: s.seed });
    else if (s.make === 'pilot' && chars?.makePilot) fig = await chars.makePilot({ seed: s.seed });
    else
      fig = await buildMinifig({
        shirt: s.shirt,
        legs: s.legs,
        head: COLORS.lightFlesh,
        face: s.face,
        torsoPrint: s.print,
        seed: s.seed,
      });
    fig.root.position.set(s.x, 0, 28);
    fig.root.rotation.y = Math.PI;
    group.add(fig.root);
    heroes.push(fig);
  }

  // An astromech rolling along behind them is the joke that lands.
  if (chars?.makeAstromech) {
    const r2 = await chars.makeAstromech({ seed: 5 });
    r2.root.position.set(0, 0, 32.5);
    r2.root.rotation.y = Math.PI;
    group.add(r2.root);
    heroes.push({ root: r2.root, seed: 5, isDroid: true, _r2: r2 });
  }

  return { group, leia, heroes, hero: heroes[0] };
}

async function buildCrowd() {
  // Extras are instanced: five baked templates, forty-eight placements, about
  // a dozen draw calls in total.
  const specs = [
    { shirt: COLORS.tan, legs: COLORS.darkTan, print: 'svg/torso-rebel-trooper.svg', face: 'svg/face-neutral.svg' },
    { shirt: COLORS.brightOrange, legs: COLORS.white, print: 'svg/torso-pilot.svg', face: 'svg/face-determined.svg' },
    { shirt: COLORS.darkBluishGray, legs: COLORS.darkBluishGray, print: 'svg/torso-officer.svg', face: 'svg/face-neutral.svg' },
    { shirt: COLORS.sandGreen, legs: COLORS.darkTan, print: null, face: 'svg/face-neutral.svg' },
    { shirt: COLORS.darkBlue, legs: COLORS.darkBluishGray, print: null, face: 'svg/face-worried.svg' },
  ];
  const baked = [];
  for (const sp of specs) {
    const fig = await buildMinifig({
      shirt: sp.shirt,
      legs: sp.legs,
      head: COLORS.lightFlesh,
      face: sp.face,
      torsoPrint: sp.print ?? undefined,
    });
    // Bake them mid-cheer so the raised arms are part of the silhouette.
    fig.armL.rotation.z = -0.55;
    fig.armR.rotation.z = 0.55;
    fig.armL.rotation.x = -0.25;
    fig.armR.rotation.x = -0.25;
    baked.push(bakeFigure(fig));
  }

  const placements = [];
  let n = 0;
  for (const sx of [-1, 1]) {
    for (let row = 0; row < 3; row++) {
      for (let i = 0; i < 8; i++) {
        placements.push({
          template: Math.floor(hash11(n, 3) * baked.length),
          position: [
            sx * (AISLE + 4.6 + row * 3.4) + (hash11(n, 4) - 0.5) * 0.8,
            0,
            -30 + i * 9 + (hash11(n, 5) - 0.5) * 1.8,
          ],
          rotationY: -sx * (Math.PI / 2) + (hash11(n, 6) - 0.5) * 0.55,
          seed: hash11(n, 7) * 6.28,
        });
        n++;
      }
    }
  }
  const crowd = new Crowd(baked, placements, { castShadow: false });

  return {
    group: crowd.object,
    update(t) {
      const cheer = ease.pulse(t, 12.2, 0.6, 4.4, 2.4);
      crowd.update(t, (i, seed, out) => {
        const idle = Math.sin(t * 0.7 + seed) * 0.035;
        if (cheer > 0.02) {
          const beat = Math.max(0, Math.sin(t * 6.4 + seed * 2.1));
          out.y = cheer * beat * 0.55;
          out.rotY = idle + Math.sin(t * 3.1 + seed) * 0.14 * cheer;
          out.tilt = -cheer * beat * 0.07;
        } else {
          out.rotY = idle;
          out.y = Math.sin(t * 1.3 + seed) * 0.02;
        }
        // The set lifts away and takes the audience with it, each figure on
        // its own delay so they leave as a shower rather than a slab.
        const lift = Math.max(0, t - DISSOLVE - 0.2 - seed * 0.24);
        if (lift > 0) {
          out.y += lift * lift * 1.5 + lift * 1.2;
          out.rotY += lift * (0.6 + seed * 0.2);
          out.tilt += lift * 0.35;
        }
      });
    },
  };
}

/**
 * A readable idle. `poseStand` alone moves by a couple of hundredths of a
 * radian, which disappears at ceremony distance and makes everyone look like a
 * statue, so this adds a weight shift, a breath and a slow head turn.
 */
function idle(fig, t, seed = 0) {
  const p = t * 0.62 + seed;
  const breath = Math.sin(p * 1.7) * 0.5 + 0.5;
  const shift = Math.sin(p * 0.55);
  fig.body.rotation.z = shift * 0.035;
  fig.body.position.y = breath * 0.035;
  fig.torso.rotation.y = Math.sin(p * 0.47 + 0.8) * 0.08;
  fig.torso.rotation.x = -0.02 + breath * 0.02;
  fig.head.rotation.y = Math.sin(p * 0.33 + 1.9) * 0.16;
  fig.head.rotation.x = Math.sin(p * 0.26) * 0.05;
  fig.legL.rotation.x = shift * 0.05;
  fig.legR.rotation.x = -shift * 0.05;
  fig.armL.rotation.x = -0.06 + Math.sin(p * 0.9) * 0.05;
  fig.armR.rotation.x = -0.05 + Math.sin(p * 0.9 + 1.4) * 0.05;
  fig.armL.rotation.z = -0.07;
  fig.armR.rotation.z = 0.07;
}

async function tryCharacters() {
  try {
    return await import('../kit/characters.js');
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// End card
// ---------------------------------------------------------------------------

function buildEndCard() {
  // Parented to the camera, so it is always centred and always on top.
  const group = new THREE.Group();
  group.position.set(0, 0.3, -12);
  // Kept visible with zero opacity from frame one so its textures upload at
  // startup rather than the first time the card appears.

  const plate = (text, opts) => {
    const { texture } = makeTextTexture({
      text,
      width: 2048,
      height: opts.h ?? 512,
      font: opts.font,
      color: opts.color,
      outline: 0,
      shadow: opts.shadow ?? 22,
      letterSpacing: opts.ls ?? 8,
    });
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(opts.w, (opts.w * (opts.h ?? 512)) / 2048),
      new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: 0,
        toneMapped: false,
        depthTest: false,
        depthWrite: false,
      })
    );
    m.renderOrder = 900;
    group.add(m);
    return m;
  };

  const title = plate('BRICK WARS', {
    w: 11,
    font: '800 230px Arimo, Liberation Sans, sans-serif',
    color: '#f2cd37',
  });
  title.position.y = 1.15;

  const sub = plate('every brick, voice and note in this film was generated by code', {
    w: 9.6,
    h: 180,
    font: '600 58px Arimo, Liberation Sans, sans-serif',
    color: '#a8bdd8',
    ls: 3,
    shadow: 12,
  });
  sub.position.y = -0.35;

  return {
    group,
    update(t) {
      const a = ease.range(t, DISSOLVE + 3.0, DISSOLVE + 4.6);
      const b = ease.range(t, DISSOLVE + 3.9, DISSOLVE + 5.6);
      title.material.opacity = a;
      sub.material.opacity = b * 0.95;
      const sc = ease.lerp(0.95, 1, ease.outCubic(a));
      title.scale.setScalar(sc);
    },
  };
}
