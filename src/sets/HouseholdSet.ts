import * as THREE from 'three';
import { SceneSet } from './SceneSet';
import { LightShaft } from '../render/Volumetric';
import { FOG, PALETTE } from '../render/LookConfig';
import { Tex } from '../render/SharedTextures';
import { fabricSurface, signTexture } from '../render/Textures';
import type { QualitySettings } from '../core/Quality';

/**
 * Chapter 2 — a rented house on the east side, during the same storm.
 *
 * The room is lit almost entirely by practicals: a failing tungsten floor lamp,
 * the television, and lightning through the rain-streaked window. The camera
 * lives low and close here; the set is small on purpose so that the walls press
 * in during the confrontation.
 */
export class HouseholdSet extends SceneSet {
  readonly marks = {
    cass: new THREE.Vector3(-0.75, 0, 0.1),
    owner: new THREE.Vector3(1.15, 0, -0.35),
    child: new THREE.Vector3(-2.15, 0, -1.35),
    door: new THREE.Vector3(3.2, 0, 2.6),
    window: new THREE.Vector3(-1.2, 0, -3.4),
    stairs: new THREE.Vector3(2.9, 0, -2.4),
    tv: new THREE.Vector3(-3.3, 0, 1.0),
    escape: new THREE.Vector3(3.4, 0, 3.4),
  };

  private tvMaterial: THREE.MeshBasicMaterial | null = null;
  private tvLight: THREE.PointLight | null = null;
  private lampLight: THREE.PointLight | null = null;
  private lightningLight: THREE.DirectionalLight | null = null;
  private windowShaft: LightShaft | null = null;
  private lightningTimer = 2.5;
  private lightningEnergy = 0;
  /** Raised by the story during the confrontation. */
  stormIntensity = 1;

  constructor(quality: QualitySettings) {
    super(quality);
  }

  async build(renderer: THREE.WebGLRenderer): Promise<void> {
    this.initSky(renderer, {
      coverage: 0.95,
      cityGlow: 0.7,
      cloudBrightness: 0.4,
      stars: 0.01,
      envIntensity: 0.85,
      backgroundIntensity: 0.12,
    });
    this.initFog(0x141a22, FOG.domesticDensity);

    this.buildShell();
    this.buildFurniture();
    this.buildDressing();
    this.buildLights();

    // Rain belongs outside the glass. The volume is parked beyond the back wall
    // so it reads through the window without falling through the ceiling.
    this.initRain({ groundY: -3.5, boxSize: 16, color: 0x9fbcdc, intensity: 0 });
    this.initWetFloor({ planeY: 0, wetness: 0.12, strength: 0.22 });
    this.initHaze(5, { color: 0xffb066, radius: 4.5, height: 2.4, scale: 3.6, opacity: 0.035 });
    this.initCharacterLights({ keyColor: 0xffcf9a, kickerColor: 0x9fc4ff, keyIntensity: 18, kickerIntensity: 8, bounceIntensity: 1.0, range: 5 });
  }

  private buildShell(): void {
    const floorMaps = Tex.concreteFine;
    // A tight weave repeat at room scale reads as a checkerboard rather than a
    // floor, so the tiling is coarse and the sheen is pulled right down.
    const boards = fabricSurface({ size: 256, repeat: 2.5, tint: [0.22, 0.14, 0.09], weave: 26, seed: 5 });
    const floorMat = new THREE.MeshStandardMaterial({
      map: boards.map,
      normalMap: boards.normalMap,
      roughnessMap: boards.roughnessMap,
      color: 0x33231a,
      roughness: 0.58,
      metalness: 0.02,
      envMapIntensity: 0.4,
      normalScale: new THREE.Vector2(0.1, 0.1),
    });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);
    if (this.wetFloor) this.wetFloor.attach(floorMat);

    const wallMat = new THREE.MeshStandardMaterial({
      map: floorMaps.map,
      normalMap: floorMaps.normalMap,
      color: 0x4a463e,
      roughness: 0.94,
      metalness: 0.02,
      envMapIntensity: 0.6,
    });

    const mkWall = (w: number, h: number, pos: [number, number, number], rotY: number): THREE.Mesh => {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.16), wallMat);
      wall.position.set(...pos);
      wall.rotation.y = rotY;
      wall.castShadow = true;
      wall.receiveShadow = true;
      this.scene.add(wall);
      this.reflect(wall);
      return wall;
    };

    // Back wall with a window aperture built from three pieces.
    mkWall(3.4, 2.9, [-3.1, 1.45, -4.0], 0);
    mkWall(2.2, 2.9, [2.9, 1.45, -4.0], 0);
    mkWall(2.6, 0.75, [0.65, 2.53, -4.0], 0);
    mkWall(2.6, 0.85, [0.65, 0.42, -4.0], 0);
    mkWall(8.2, 2.9, [-4.4, 1.45, 0], Math.PI / 2);
    mkWall(3.0, 2.9, [4.4, 1.45, -2.4], Math.PI / 2);
    mkWall(9.0, 9.0, [0, 2.95, 0], 0).rotation.x = Math.PI / 2;

    // Window: glass, frame, and the storm behind it.
    const glass = new THREE.Mesh(
      new THREE.PlaneGeometry(2.5, 1.35),
      new THREE.MeshPhysicalMaterial({
        color: 0x0d1620,
        roughness: 0.12,
        metalness: 0,
        transparent: true,
        opacity: 0.32,
        envMapIntensity: 1.6,
      })
    );
    glass.position.set(0.65, 1.5, -3.94);
    this.scene.add(glass);

    const frameMat = new THREE.MeshStandardMaterial({ color: 0x2a2622, roughness: 0.65, metalness: 0.1 });
    for (const [w, h, x, y] of [
      [2.62, 0.08, 0.65, 2.18],
      [2.62, 0.08, 0.65, 0.84],
      [0.08, 1.4, -0.62, 1.5],
      [0.08, 1.4, 1.92, 1.5],
      [0.05, 1.35, 0.65, 1.5],
    ] as [number, number, number, number][]) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.1), frameMat);
      bar.position.set(x, y, -3.9);
      bar.castShadow = true;
      this.scene.add(bar);
      this.reflect(bar);
    }
  }

  private buildFurniture(): void {
    const uph = fabricSurface({ size: 256, repeat: 3, tint: [0.16, 0.15, 0.17], seed: 71 });
    const sofaMat = new THREE.MeshStandardMaterial({
      map: uph.map,
      normalMap: uph.normalMap,
      roughnessMap: uph.roughnessMap,
      color: 0x50525c,
      roughness: 0.85,
      metalness: 0.02,
    });

    const sofa = new THREE.Group();
    const seat = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.42, 0.9), sofaMat);
    seat.position.y = 0.34;
    const back = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.66, 0.24), sofaMat);
    back.position.set(0, 0.66, -0.36);
    const armL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.56, 0.9), sofaMat);
    armL.position.set(-1.05, 0.42, 0);
    const armR = armL.clone();
    armR.position.x = 1.05;
    for (const m of [seat, back, armL, armR]) {
      m.castShadow = true;
      m.receiveShadow = true;
      sofa.add(m);
    }
    sofa.position.set(-0.4, 0, 1.9);
    sofa.rotation.y = 0.12;
    this.scene.add(sofa);
    this.reflect(sofa);

    // Coffee table with a spilled glass: the argument already happened here.
    const tableMat = new THREE.MeshStandardMaterial({ color: 0x30241c, roughness: 0.4, metalness: 0.1 });
    const table = new THREE.Group();
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.06, 0.64), tableMat);
    top.position.y = 0.42;
    table.add(top);
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.42, 6), tableMat);
        leg.position.set(sx * 0.5, 0.21, sz * 0.24);
        table.add(leg);
      }
    }
    table.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = true;
        m.receiveShadow = true;
      }
    });
    table.position.set(-0.6, 0, 0.75);
    this.scene.add(table);
    this.reflect(table);

    const bottle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.05, 0.24, 10),
      new THREE.MeshPhysicalMaterial({ color: 0x2b1a08, roughness: 0.1, metalness: 0, envMapIntensity: 1.4 })
    );
    bottle.position.set(-0.9, 0.53, 0.62);
    bottle.rotation.z = 1.45;
    bottle.castShadow = true;
    this.scene.add(bottle);

    // Television, the second-brightest thing in the room.
    const tvBody = new THREE.Mesh(
      new THREE.BoxGeometry(1.35, 0.8, 0.07),
      new THREE.MeshStandardMaterial({ color: 0x0a0b0d, roughness: 0.35, metalness: 0.4 })
    );
    tvBody.position.set(-3.9, 1.15, 1.0);
    tvBody.rotation.y = Math.PI / 2;
    tvBody.castShadow = true;
    this.scene.add(tvBody);
    this.reflect(tvBody);

    const newsTex = signTexture(['BREAKING', 'ANDROID', 'INCIDENT'], {
      w: 256,
      h: 160,
      color: '#cfe4ff',
    });
    // Transparent and tone-mapped, so the caption sits as lit text on the dark
    // screen behind it. Opaque and unmapped it was three clipped white bars —
    // the background of the caption texture blowing out along with the letters.
    this.tvMaterial = new THREE.MeshBasicMaterial({
      map: newsTex,
      toneMapped: true,
      transparent: true,
      color: 0x8fb4d8,
    });
    const glow = new THREE.Mesh(
      new THREE.PlaneGeometry(1.24, 0.7),
      new THREE.MeshBasicMaterial({ color: 0x0e1622, toneMapped: true })
    );
    glow.position.set(-3.86, 1.15, 1.0);
    glow.rotation.y = Math.PI / 2;
    this.scene.add(glow);
    this.reflect(glow);

    const tvScreen = new THREE.Mesh(new THREE.PlaneGeometry(1.24, 0.7), this.tvMaterial);
    tvScreen.position.set(-3.85, 1.15, 1.0);
    tvScreen.rotation.y = Math.PI / 2;
    this.scene.add(tvScreen);
    this.reflect(tvScreen);

    const stand = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.55, 1.5),
      new THREE.MeshStandardMaterial({ color: 0x241b14, roughness: 0.5, metalness: 0.1 })
    );
    stand.position.set(-4.0, 0.27, 1.0);
    stand.castShadow = true;
    stand.receiveShadow = true;
    this.scene.add(stand);
    this.reflect(stand);

    // Floor lamp: the warm key for every close-up in this chapter.
    const lampPost = new THREE.Mesh(
      new THREE.CylinderGeometry(0.022, 0.03, 1.55, 8),
      new THREE.MeshStandardMaterial({ color: 0x2b2f36, roughness: 0.4, metalness: 0.7 })
    );
    lampPost.position.set(1.95, 0.78, 1.35);
    lampPost.castShadow = true;
    this.scene.add(lampPost);
    const shade = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.26, 0.3, 14, 1, true),
      new THREE.MeshStandardMaterial({
        color: 0x8f7d63,
        roughness: 0.95,
        side: THREE.DoubleSide,
        emissive: new THREE.Color(PALETTE.sodium),
        emissiveIntensity: 0.1,
      })
    );
    shade.position.set(1.95, 1.62, 1.35);
    this.scene.add(shade);
    this.reflect(shade);
  }

  /**
   * Everything that makes the room look inhabited.
   *
   * The furniture alone was not enough: shots kept landing on bare wall, and a
   * flat rectangle of plaster with nothing in front of it reads as a stage flat
   * rather than a house. What fixes that is silhouette — skirting to give the
   * wall/floor join a line, curtains and pictures to break the vertical
   * expanse, a sideboard and clutter so the middle distance has objects in it,
   * and a doorway the camera can see through to somewhere else.
   */
  private buildDressing(): void {
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x241a13, roughness: 0.62, metalness: 0.05 });
    const trimMat = new THREE.MeshStandardMaterial({ color: 0x554b3f, roughness: 0.78, metalness: 0.03 });

    // Skirting: a continuous line where wall meets floor, which is most of what
    // stops a wall reading as a flat.
    for (const [w, x, z, rotY] of [
      [8.2, 0, -3.86, 0],
      [8.2, -4.26, 0, Math.PI / 2],
      [3.0, 4.26, -2.4, Math.PI / 2],
    ] as [number, number, number, number][]) {
      const skirt = new THREE.Mesh(new THREE.BoxGeometry(w, 0.14, 0.05), trimMat);
      skirt.position.set(x, 0.07, z);
      skirt.rotation.y = rotY;
      skirt.receiveShadow = true;
      this.scene.add(skirt);
      this.reflect(skirt);
    }

    // Curtains either side of the window, hanging past the frame.
    const drape = fabricSurface({ size: 256, repeat: 2, tint: [0.13, 0.11, 0.13], weave: 40, seed: 19 });
    const curtainMat = new THREE.MeshStandardMaterial({
      map: drape.map,
      normalMap: drape.normalMap,
      color: 0x3a2f33,
      roughness: 0.92,
      metalness: 0,
      side: THREE.DoubleSide,
    });
    for (const x of [-0.95, 2.25]) {
      const curtain = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 2.15, 8, 1, true, 0, Math.PI), curtainMat);
      curtain.position.set(x, 1.42, -3.72);
      curtain.rotation.y = x < 0 ? -0.5 : Math.PI + 0.5;
      curtain.castShadow = true;
      this.scene.add(curtain);
      this.reflect(curtain);
    }
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 3.5, 6), trimMat);
    rail.rotation.z = Math.PI / 2;
    rail.position.set(0.65, 2.55, -3.7);
    this.scene.add(rail);

    // Framed pictures: the only thing on the walls, and they break the height.
    for (const [x, y, z, rotY, w, h] of [
      [-4.3, 1.72, -1.1, Math.PI / 2, 0.52, 0.66],
      [-4.3, 1.62, 0.9, Math.PI / 2, 0.44, 0.34],
      [-2.4, 1.8, -3.86, 0, 0.62, 0.42],
    ] as [number, number, number, number, number, number][]) {
      const frame = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.04), woodMat);
      frame.position.set(x, y, z);
      frame.rotation.y = rotY;
      frame.castShadow = true;
      this.scene.add(frame);
      const art = new THREE.Mesh(
        new THREE.PlaneGeometry(w * 0.84, h * 0.84),
        new THREE.MeshStandardMaterial({ color: 0x6a5b4a, roughness: 0.85, metalness: 0 })
      );
      art.position.set(x + Math.sin(rotY) * 0.025, y, z + Math.cos(rotY) * 0.025);
      art.rotation.y = rotY;
      this.scene.add(art);
      this.reflect(frame);
    }

    // Sideboard against the long wall, with bottles: middle-distance objects the
    // camera can rake across, and the reason the room feels occupied.
    const sideboard = new THREE.Group();
    const carcass = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.78, 0.44), woodMat);
    carcass.position.y = 0.39;
    sideboard.add(carcass);
    for (const dx of [-0.4, 0.4]) {
      const door = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.6, 0.03), trimMat);
      door.position.set(dx, 0.4, 0.235);
      sideboard.add(door);
    }
    sideboard.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = true;
        m.receiveShadow = true;
      }
    });
    sideboard.position.set(-2.9, 0, -3.55);
    this.scene.add(sideboard);
    this.reflect(sideboard);

    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x3a2a14,
      roughness: 0.08,
      metalness: 0,
      transparent: true,
      opacity: 0.72,
      envMapIntensity: 1.8,
    });
    for (const [dx, h, r] of [
      [-0.5, 0.28, 0.042],
      [-0.3, 0.22, 0.036],
      [0.42, 0.3, 0.038],
    ] as [number, number, number][]) {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.7, r, h, 9), glassMat);
      b.position.set(-2.9 + dx, 0.78 + h / 2, -3.55);
      b.castShadow = true;
      this.scene.add(b);
    }

    // Rug: separates the seating area from the rest of the floor and kills the
    // uninterrupted expanse of boards.
    const weave = fabricSurface({ size: 256, repeat: 4, tint: [0.17, 0.12, 0.12], weave: 60, seed: 33 });
    const rug = new THREE.Mesh(
      new THREE.PlaneGeometry(3.1, 2.2),
      new THREE.MeshStandardMaterial({
        map: weave.map,
        normalMap: weave.normalMap,
        color: 0x4a3630,
        roughness: 0.95,
        metalness: 0,
      })
    );
    rug.rotation.x = -Math.PI / 2;
    rug.position.set(-0.5, 0.008, 1.1);
    rug.receiveShadow = true;
    this.scene.add(rug);

    // Doorway to the hall, with light beyond it: something for the room to be
    // next to, so it stops feeling like a sealed box.
    const jambMat = trimMat;
    for (const dx of [-0.52, 0.52]) {
      const jamb = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.1, 0.18), jambMat);
      jamb.position.set(4.32, 1.05, 2.6 + dx);
      jamb.castShadow = true;
      this.scene.add(jamb);
      this.reflect(jamb);
    }
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 1.22), jambMat);
    lintel.position.set(4.32, 2.13, 2.6);
    this.scene.add(lintel);
    const hall = new THREE.Mesh(
      new THREE.PlaneGeometry(1.0, 2.05),
      new THREE.MeshBasicMaterial({ color: 0x2a1c10, toneMapped: false })
    );
    hall.position.set(4.4, 1.02, 2.6);
    hall.rotation.y = -Math.PI / 2;
    this.scene.add(hall);

    // Clutter on the table: a tumbler and a folded newspaper.
    const tumbler = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.09, 10), glassMat);
    tumbler.position.set(-0.3, 0.49, 0.86);
    tumbler.castShadow = true;
    this.scene.add(tumbler);
    const paper = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.012, 0.22),
      new THREE.MeshStandardMaterial({ color: 0x6b6256, roughness: 0.9 })
    );
    paper.position.set(-0.85, 0.46, 0.82);
    paper.rotation.y = 0.3;
    this.scene.add(paper);

    // Unlit ceiling pendant: reads as a room where somebody chose not to put the
    // main light on.
    const flex = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.55, 5), trimMat);
    flex.position.set(-0.4, 2.62, -0.4);
    this.scene.add(flex);
    const pendant = new THREE.Mesh(
      new THREE.ConeGeometry(0.19, 0.2, 12, 1, true),
      new THREE.MeshStandardMaterial({ color: 0x30333a, roughness: 0.6, metalness: 0.4, side: THREE.DoubleSide })
    );
    pendant.position.set(-0.4, 2.28, -0.4);
    this.scene.add(pendant);
  }

  private buildLights(): void {
    // Low ambient on purpose: the practicals are the light in this room, and a
    // strong hemisphere fill was flattening every face in the chapter.
    this.scene.add(new THREE.HemisphereLight(0x2a3646, 0x0b0a09, 0.34));

    this.lampLight = new THREE.PointLight(PALETTE.sodium, 22, 7.5, 2);
    this.lampLight.position.set(1.95, 1.6, 1.35);
    this.scene.add(this.lampLight);

    // A second practical behind the doorway, so the hall reads as somewhere with
    // its own light rather than a painted rectangle.
    const hallLight = new THREE.PointLight(PALETTE.sodium, 5, 4.5, 2);
    hallLight.position.set(4.9, 1.4, 2.6);
    this.scene.add(hallLight);

    this.tvLight = new THREE.PointLight(0x86b4ff, 7, 6.5, 2);
    this.tvLight.position.set(-3.5, 1.15, 1.0);
    this.scene.add(this.tvLight);

    // Lightning: a hard blue-white slap through the window.
    this.lightningLight = new THREE.DirectionalLight(0xd6e6ff, 0);
    this.lightningLight.position.set(2.5, 6, -9);
    this.lightningLight.castShadow = this.quality.shadows;
    if (this.lightningLight.shadow) {
      this.lightningLight.shadow.mapSize.set(this.quality.shadowMapSize, this.quality.shadowMapSize);
      this.lightningLight.shadow.camera.left = -6;
      this.lightningLight.shadow.camera.right = 6;
      this.lightningLight.shadow.camera.top = 6;
      this.lightningLight.shadow.camera.bottom = -6;
      this.lightningLight.shadow.bias = -0.002;
    }
    this.scene.add(this.lightningLight);

    // Street sodium spilling through the glass.
    const street = new THREE.SpotLight(PALETTE.sodium, 22, 12, 0.7, 0.7, 2);
    street.position.set(1.2, 3.4, -7);
    street.target.position.set(-0.6, 0.4, 0.5);
    this.scene.add(street, street.target);

    this.windowShaft = new LightShaft({
      length: 6.2,
      radius: 1.5,
      color: 0xbcd8ff,
      intensity: 0.16,
      noise: 0.5,
      falloff: 1.4,
      nearFade: 1.2,
    });
    this.windowShaft.aim(new THREE.Vector3(0.65, 2.3, -3.9), new THREE.Vector3(-1.4, 0, 1.6));
    this.addShaft(this.windowShaft);
    this.scene.add(this.windowShaft.mesh);

    this.updatables.push((dt, time) => {
      if (this.lampLight) {
        // Old filament: slow warm wander with the occasional dip.
        const f = 0.9 + 0.1 * Math.sin(time * 2.3) + (Math.sin(time * 41) > 0.97 ? -0.35 : 0);
        this.lampLight.intensity = 16 * f;
      }
      if (this.tvMaterial && this.tvLight) {
        // Broadcast flicker drives both the screen and its spill.
        const f = 0.72 + 0.28 * Math.abs(Math.sin(time * 5.7) * Math.sin(time * 1.9));
        this.tvMaterial.color.setRGB(0.3 * f + 0.08, 0.4 * f + 0.1, 0.62 * f + 0.05);
        this.tvLight.intensity = 5 + f * 5;
      }

      // Lightning strikes: a bright double-flash then a long gap.
      this.lightningTimer -= dt;
      if (this.lightningTimer <= 0) {
        this.lightningTimer = (5 + Math.random() * 9) / Math.max(0.2, this.stormIntensity);
        this.lightningEnergy = 1;
      }
      if (this.lightningEnergy > 0) {
        this.lightningEnergy = Math.max(0, this.lightningEnergy - dt * 3.2);
        const strobe = this.lightningEnergy > 0.72 ? 1 : this.lightningEnergy > 0.55 ? 0.35 : this.lightningEnergy;
        if (this.lightningLight) this.lightningLight.intensity = strobe * 5.5 * this.stormIntensity;
        if (this.windowShaft) this.windowShaft.setIntensity(0.16 + strobe * 0.75);
      } else if (this.lightningLight) {
        this.lightningLight.intensity = 0;
        this.windowShaft?.setIntensity(0.16);
      }
    });
  }

  /** Screen text for the in-world newscast. */
  setBroadcast(lines: string[]): void {
    if (!this.tvMaterial) return;
    this.tvMaterial.map = signTexture(lines, { w: 256, h: 160, color: '#cfe4ff' });
    this.tvMaterial.needsUpdate = true;
  }
}
