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
    this.tvMaterial = new THREE.MeshBasicMaterial({ map: newsTex, toneMapped: false, color: 0x8fb4d8 });
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

  private buildLights(): void {
    this.scene.add(new THREE.HemisphereLight(0x2a3646, 0x0b0a09, 0.9));

    this.lampLight = new THREE.PointLight(PALETTE.sodium, 16, 7.5, 2);
    this.lampLight.position.set(1.95, 1.6, 1.35);
    this.lampLight.castShadow = this.quality.shadows;
    if (this.lampLight.shadow) {
      this.lampLight.shadow.mapSize.set(this.quality.shadowMapSize, this.quality.shadowMapSize);
      this.lampLight.shadow.bias = -0.003;
      this.lampLight.shadow.normalBias = 0.02;
    }
    this.scene.add(this.lampLight);

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
