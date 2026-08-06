import * as THREE from 'three';
import { SceneSet } from './SceneSet';
import { chainFence, neonSign, parapet, puddle, skyline, tileMaterial } from './Kit';
import { EmergencyLights, LightShaft } from '../render/Volumetric';
import { FOG, PALETTE } from '../render/LookConfig';
import { Tex } from '../render/SharedTextures';
import { signTexture } from '../render/Textures';
import type { QualitySettings } from '../core/Quality';
import type { ActorFactory } from '../actors/Cast';
import type { Actor } from '../actors/Actor';

/**
 * Chapter 3 — Hart Plaza, the night of the march.
 *
 * A wide wet apron of granite between a police line (upstage, backlit, red and
 * blue) and the android column (downstage). The set is deliberately symmetrical
 * and deep so that the final choice — walk forward or charge — reads in the
 * blocking alone.
 */
export class PlazaSet extends SceneSet {
  readonly marks = {
    podium: new THREE.Vector3(0, 0, -0.4),
    crowdCentre: new THREE.Vector3(0, 0, 6.2),
    policeLine: new THREE.Vector3(0, 0, -9.5),
    barricade: new THREE.Vector3(0, 0, -7.2),
    commander: new THREE.Vector3(1.3, 0, -8.6),
    atlasAdvance: new THREE.Vector3(0, 0, -5.2),
    orion: new THREE.Vector3(-2.6, 0, -8.2),
  };

  private strobes: EmergencyLights[] = [];
  private lineLights: THREE.SpotLight[] = [];
  private searchlights: { shaft: LightShaft; speed: number; phase: number; origin: THREE.Vector3 }[] = [];
  private crowd: Actor[] = [];
  private droneGroup = new THREE.Group();
  private drones: { mesh: THREE.Object3D; radius: number; speed: number; phase: number; y: number }[] = [];
  private bannerLight: THREE.PointLight | null = null;

  constructor(quality: QualitySettings) {
    super(quality);
  }

  async build(renderer: THREE.WebGLRenderer): Promise<void> {
    this.initSky(renderer, {
      coverage: 0.9,
      cityGlow: 0.4,
      cloudBrightness: 0.14,
      cityGlowColor: new THREE.Color(1.0, 0.42, 0.2),
      horizonColor: new THREE.Color(0.09, 0.11, 0.16),
      zenithColor: new THREE.Color(0.01, 0.016, 0.032),
      stars: 0.04,
      // Kept low for the same reason as the rooftop: image-based light is
      // omnidirectional, and at high intensity it flattens the whole square.
      envIntensity: 1.4,
      backgroundIntensity: 1.0,
      beams: [
        { azimuth: 1.2, elevation: 0.55, spread: 0.28, intensity: 0.3, color: new THREE.Color(0.55, 0.75, 1) },
        { azimuth: 5.0, elevation: 0.42, spread: 0.3, intensity: 0.26, color: new THREE.Color(1, 0.45, 0.4) },
        { azimuth: 3.1, elevation: 0.7, spread: 0.45, intensity: 0.18, color: new THREE.Color(0.7, 0.8, 1) },
      ],
    });
    this.initFog(0x0f1a24, FOG.plazaDensity);

    this.buildGround();
    this.buildArchitecture();
    this.buildBarricades();
    this.buildPlacards();
    this.buildLights();

    this.initRain({ groundY: 0, boxSize: 52, color: 0xb2cbe8, intensity: 0.85 });
    this.initWetFloor({ planeY: 0, wetness: 1, strength: 0.4 });
    if (this.groundMaterial) this.wetFloor?.attach(this.groundMaterial);
    this.initHaze(12, { color: 0x9fc0e8, radius: 18, height: 4.2, scale: 11, opacity: 0.055 });
    this.initCharacterLights({ keyColor: 0xd0e2ff, kickerColor: 0xff8a44, keyIntensity: 30, kickerIntensity: 14, bounceIntensity: 1.2 });
    if (this.rain) this.wetFloor?.excludeFromReflection(this.rain.group);
    if (this.haze) this.wetFloor?.excludeFromReflection(this.haze.group);
  }

  private groundMaterial: THREE.MeshStandardMaterial | null = null;

  private buildGround(): void {
    const maps = Tex.asphalt;
    const mat = new THREE.MeshStandardMaterial({
      map: maps.map,
      normalMap: maps.normalMap,
      roughnessMap: maps.roughnessMap,
      color: 0x22262c,
      roughness: 0.44,
      metalness: 0.02,
      envMapIntensity: 1.1,
      normalScale: new THREE.Vector2(0.45, 0.45),
    });
    this.groundMaterial = tileMaterial(mat, 14, 14);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(70, 70), this.groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);
    this.wetFloor?.excludeFromReflection(ground);

    // Granite banding gives the plaza scale and a perspective grid.
    const bandMat = new THREE.MeshStandardMaterial({ color: 0x4a5058, roughness: 0.5, metalness: 0.1, transparent: true, opacity: 0.4 });
    for (let i = -6; i <= 6; i++) {
      const band = new THREE.Mesh(new THREE.PlaneGeometry(46, 0.14), bandMat);
      band.rotation.x = -Math.PI / 2;
      band.position.set(0, 0.006, i * 3.2);
      this.scene.add(band);
    }

    for (const p of [
      [-4.2, 2.4],
      [3.6, -2.2],
      [0.4, 4.6],
      [-6.5, -3.4],
      [6.8, 5.2],
      [1.2, -5.4],
    ] as [number, number][]) {
      const pool = puddle(1.1 + Math.random() * 1.9);
      pool.position.set(p[0], 0.01, p[1]);
      pool.rotation.y = Math.random() * Math.PI;
      const pm = (pool.material as THREE.MeshStandardMaterial).clone();
      pm.roughness = 0.02;
      pool.material = pm;
      this.scene.add(pool);
    }
  }

  private buildArchitecture(): void {
    const city = skyline({ count: 110, innerRadius: 40, outerRadius: 260, minHeight: 24, maxHeight: 170, baseY: -2 });
    this.scene.add(city);
    this.reflect(city);

    // Flanking civic blocks frame the plaza and hold the neon.
    const maps = Tex.facadeDense;
    const facadeMat = new THREE.MeshStandardMaterial({
      map: maps.map,
      emissiveMap: maps.emissiveMap,
      roughnessMap: maps.roughnessMap,
      emissive: new THREE.Color(0xffffff),
      emissiveIntensity: 1.15,
      color: 0x3d434b,
      roughness: 0.72,
      metalness: 0.22,
    });
    for (const [x, z, w, h, d, ry] of [
      [-17, -14, 14, 40, 16, 0.2],
      [18, -16, 16, 52, 14, -0.25],
      [-22, 10, 18, 30, 14, 0.1],
      [22, 12, 16, 36, 14, -0.1],
    ] as [number, number, number, number, number, number][]) {
      const block = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), facadeMat);
      block.position.set(x, h / 2 - 1, z);
      block.rotation.y = ry;
      this.scene.add(block);
      this.reflect(block);
    }

    // Steps and a low wall behind the police line.
    const steps = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(26 - i * 1.2, 0.22, 1.1), this.kit.concreteFine);
      step.position.set(0, 0.11 + i * 0.22, -12.5 - i * 1.1);
      step.receiveShadow = true;
      step.castShadow = true;
      steps.add(step);
    }
    this.scene.add(steps);
    this.reflect(steps);

    const wall = parapet(this.kit, 26, { height: 1.0 });
    wall.position.set(0, 0.88, -17.4);
    this.scene.add(wall);
    this.reflect(wall);

    // Signage: the plaza's own advertising, plus the protest banner.
    const ad = neonSign(['LIBERTY', 'OR'], {
      color: PALETTE.neonMagenta,
      width: 5.2,
      height: 2.4,
      spill: 26,
      flicker: true,
    });
    ad.group.position.set(-15.5, 9.5, -6.5);
    ad.group.rotation.y = 0.55;
    this.scene.add(ad.group);
    this.reflect(ad.group);

    const ad2 = neonSign(['CYBER', 'LIFE'], {
      color: PALETTE.neonCyan,
      width: 3.4,
      height: 5.2,
      vertical: true,
      spill: 30,
    });
    ad2.group.position.set(16.5, 12, -8);
    ad2.group.rotation.y = -0.6;
    this.scene.add(ad2.group);
    this.reflect(ad2.group);

    // Protest banner: dark cloth with painted letters. It used to be a pale sheet
    // with glowing text, which bloomed into two white bars with nothing readable
    // on them — the one thing in the square that has something to say.
    const bannerTex = signTexture(['WE ARE', 'ALIVE'], { w: 512, h: 256, color: '#e8eef6' });
    const banner = new THREE.Mesh(
      new THREE.PlaneGeometry(4.6, 2.3),
      new THREE.MeshStandardMaterial({
        map: bannerTex,
        color: 0xffffff,
        roughness: 0.94,
        metalness: 0,
        side: THREE.DoubleSide,
        transparent: true,
      })
    );
    banner.position.set(-3.4, 2.3, 8.6);
    // Faces the police line, which is also where the camera watches the square
    // from; hung the other way the lettering reads backwards.
    banner.rotation.y = Math.PI + 0.18;
    this.scene.add(banner);
    this.reflect(banner);
    const cloth = new THREE.Mesh(
      new THREE.PlaneGeometry(4.8, 2.5),
      new THREE.MeshStandardMaterial({ color: 0x171a20, roughness: 0.96, metalness: 0, side: THREE.DoubleSide })
    );
    cloth.position.set(-3.4, 2.3, 8.66);
    cloth.rotation.y = Math.PI + 0.18;
    this.scene.add(cloth);
    this.reflect(cloth);
    this.bannerLight = new THREE.PointLight(0xffe8cf, 1.6, 8, 2);
    this.bannerLight.position.set(-3.4, 2.6, 9.4);
    this.scene.add(this.bannerLight);
  }

  /** Hand-held placards, so the crowd reads as a protest and not an audience. */
  private buildPlacards(): void {
    const slogans: string[][] = [
      ['I AM', 'NOT IT'],
      ['COUNT', 'US'],
      ['NO MORE', 'ORDERS'],
      ['WE FEEL'],
      ['ALIVE'],
      ['LET US', 'STAY'],
    ];
    const stickMat = new THREE.MeshStandardMaterial({ color: 0x2a231c, roughness: 0.8, metalness: 0.05 });
    const placements: [number, number, number, number][] = [
      [-3.2, 0, 5.2, 0.22],
      [-1.4, 0, 7.1, -0.15],
      [1.9, 0, 6.2, 0.34],
      [3.4, 0, 8.0, -0.28],
      [-4.6, 0, 8.4, 0.12],
      [0.6, 0, 9.2, -0.4],
    ];
    for (let i = 0; i < placements.length; i++) {
      const [x, y, z, rot] = placements[i];
      const g = new THREE.Group();
      const tex = signTexture(slogans[i % slogans.length], { w: 256, h: 160, color: '#e6ecf4' });
      const board = new THREE.Mesh(
        new THREE.PlaneGeometry(0.78, 0.5),
        new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95, metalness: 0, side: THREE.DoubleSide, transparent: true })
      );
      board.position.y = 2.06;
      const backing = new THREE.Mesh(
        new THREE.PlaneGeometry(0.82, 0.54),
        new THREE.MeshStandardMaterial({ color: 0x1b1f26, roughness: 0.96, side: THREE.DoubleSide })
      );
      backing.position.set(0, 2.06, 0.012);
      const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 1.5, 5), stickMat);
      stick.position.y = 1.2;
      g.add(board, backing, stick);
      g.position.set(x, y, z);
      g.rotation.y = Math.PI + rot;
      this.scene.add(g);
      this.reflect(g);
    }
  }

  private buildBarricades(): void {
    const barMat = new THREE.MeshStandardMaterial({ color: 0x2c3138, roughness: 0.5, metalness: 0.65 });
    const stripeTex = signTexture(['//////////'], { w: 256, h: 64, color: '#ffb43a' });
    const stripeMat = new THREE.MeshStandardMaterial({
      map: stripeTex,
      color: 0x1c1f24,
      emissive: new THREE.Color(PALETTE.neonAmber),
      emissiveMap: stripeTex,
      emissiveIntensity: 0.6,
      roughness: 0.6,
      metalness: 0.3,
    });

    for (let i = -3; i <= 3; i++) {
      const g = new THREE.Group();
      const frame = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.1, 0.1), barMat);
      frame.position.y = 1.0;
      const lower = frame.clone();
      lower.position.y = 0.55;
      const legL = new THREE.Mesh(new THREE.BoxGeometry(0.09, 1.05, 0.5), barMat);
      legL.position.set(-1.2, 0.52, 0);
      const legR = legL.clone();
      legR.position.x = 1.2;
      const panel = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 0.34), stripeMat);
      panel.position.set(0, 0.79, 0.06);
      for (const m of [frame, lower, legL, legR, panel]) {
        m.castShadow = true;
        m.receiveShadow = true;
        g.add(m);
      }
      g.position.set(i * 2.75, 0, -7.2 + (i % 2 === 0 ? 0 : 0.25));
      g.rotation.y = (i % 2 === 0 ? 1 : -1) * 0.05;
      this.scene.add(g);
      this.reflect(g);
    }

    const fence = chainFence(this.kit, 8, 2.6);
    fence.position.set(-13.5, 0, -4);
    fence.rotation.y = 0.2;
    this.scene.add(fence);
    this.reflect(fence);
  }

  private buildLights(): void {
    this.scene.add(new THREE.HemisphereLight(0x6c7a90, 0x121519, 0.6));
    this.scene.add(new THREE.AmbientLight(0x1d2430, 0.18));

    // Broad frontal wash over the crowd. The police line backlights them, which
    // is the shot, but without something on their faces the square reads as an
    // empty stage full of black cut-outs.
    const crowdFill = new THREE.SpotLight(0xa8c2e6, 240, 34, 0.85, 0.95, 2);
    crowdFill.position.set(-6, 9, 14);
    crowdFill.target.position.set(0, 1.2, 2);
    this.scene.add(crowdFill, crowdFill.target);

    const key = new THREE.DirectionalLight(PALETTE.moonlight, 2.2);
    key.position.set(-14, 20, 8);
    key.castShadow = this.quality.shadows;
    key.shadow.mapSize.set(this.quality.shadowMapSize, this.quality.shadowMapSize);
    key.shadow.camera.left = -18;
    key.shadow.camera.right = 18;
    key.shadow.camera.top = 18;
    key.shadow.camera.bottom = -18;
    key.shadow.camera.far = 60;
    key.shadow.bias = -0.0018;
    key.shadow.normalBias = 0.025;
    this.scene.add(key);

    // Police floodlights: hard backlight that turns the crowd into silhouettes.
    for (const x of [-7, 7]) {
      const flood = new THREE.SpotLight(0xdcebff, 700, 40, 0.42, 0.5, 2);
      flood.position.set(x, 7.5, -13.5);
      flood.target.position.set(x * 0.3, 1.2, 2);
      flood.userData.base = 700;
      this.lineLights.push(flood);
      this.scene.add(flood, flood.target);

      const shaft = new LightShaft({
        length: 24,
        radius: 5.2,
        color: 0xdcebff,
        intensity: 0.3,
        noise: 0.6,
        falloff: 1.15,
        nearFade: 2,
      });
      shaft.aim(flood.position.clone(), flood.target.position.clone());
      this.addShaft(shaft);
      this.scene.add(shaft.mesh);
    }

    // Emergency strobes on the line.
    for (const x of [-9.5, 0.5, 9.5]) {
      const strobe = new EmergencyLights(2, { length: 18, radius: 1.5, intensity: 0.34, lightIntensity: 9 });
      strobe.group.position.set(x, 1.4, -10.5);
      this.scene.add(strobe.group);
      this.strobes.push(strobe);
      this.wetFloor?.excludeFromReflection(strobe.group);
    }

    // Sweeping searchlights from the towers.
    for (const [x, y, z, speed, phase] of [
      [-16, 22, -10, 0.18, 0],
      [17, 26, -12, 0.13, 2.1],
    ] as [number, number, number, number, number][]) {
      const shaft = new LightShaft({
        length: 40,
        radius: 4,
        color: 0xe6f2ff,
        intensity: 0.26,
        noise: 0.7,
        falloff: 1,
        nearFade: 3,
      });
      this.addShaft(shaft);
      this.scene.add(shaft.mesh);
      this.searchlights.push({ shaft, speed, phase, origin: new THREE.Vector3(x, y, z) });
    }

    // Surveillance drones with blinking beacons.
    for (let i = 0; i < 5; i++) {
      const body = new THREE.Mesh(
        new THREE.SphereGeometry(0.16, 10, 8),
        new THREE.MeshStandardMaterial({ color: 0x14171c, roughness: 0.4, metalness: 0.7 })
      );
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.26, 0.02, 5, 14),
        new THREE.MeshStandardMaterial({ color: 0x22262c, roughness: 0.4, metalness: 0.8 })
      );
      ring.rotation.x = Math.PI / 2;
      const beacon = new THREE.Mesh(
        new THREE.SphereGeometry(0.045, 8, 6),
        new THREE.MeshBasicMaterial({ color: PALETTE.neonRed, toneMapped: false })
      );
      beacon.position.y = -0.14;
      const light = new THREE.PointLight(0xff3b30, 1.6, 4, 2);
      light.position.y = -0.2;
      const drone = new THREE.Group();
      drone.add(body, ring, beacon, light);
      this.droneGroup.add(drone);
      this.drones.push({
        mesh: drone,
        radius: 6 + i * 2.4,
        speed: 0.25 + i * 0.06,
        phase: (i / 5) * Math.PI * 2,
        y: 5.5 + (i % 3) * 1.6,
      });
    }
    this.scene.add(this.droneGroup);
    this.wetFloor?.excludeFromReflection(this.droneGroup);

    this.updatables.push((dt, time) => {
      const camPos = this.camera.getWorldPosition(new THREE.Vector3());
      for (const s of this.strobes) s.update(time, camPos);
      for (const s of this.searchlights) {
        const a = time * s.speed + s.phase;
        s.shaft.aim(s.origin, new THREE.Vector3(Math.sin(a) * 16, 0, Math.cos(a * 0.8) * 10 - 2));
      }
      for (const d of this.drones) {
        const a = time * d.speed + d.phase;
        d.mesh.position.set(Math.cos(a) * d.radius, d.y + Math.sin(time * 0.9 + d.phase) * 0.25, Math.sin(a) * d.radius * 0.7 - 1);
        d.mesh.rotation.y = -a + Math.PI / 2;
      }
      if (this.bannerLight) this.bannerLight.intensity = 3.4 + Math.sin(time * 1.7) * 0.6;
      void dt;
    });
  }

  /**
   * Fills the plaza with androids. Skinned characters are expensive, so the
   * count follows the quality tier and the back of the crowd is made of simple
   * posed silhouettes instead.
   */
  async populateCrowd(factory: ActorFactory): Promise<void> {
    const count = this.quality.crowdActors;
    const positions: THREE.Vector3[] = [];
    for (let i = 0; i < count; i++) {
      const row = Math.floor(i / 4);
      const col = i % 4;
      positions.push(
        new THREE.Vector3(
          (col - 1.5) * 1.5 + (row % 2 ? 0.6 : -0.3) + (Math.random() - 0.5) * 0.4,
          0,
          3.4 + row * 1.75 + (Math.random() - 0.5) * 0.3
        )
      );
    }
    for (let i = 0; i < positions.length; i++) {
      const actor = await factory.spawn('crowdAndroid', { name: `ANDROID ${i + 1}`, height: 1.72 + Math.random() * 0.16 });
      actor.root.position.copy(positions[i]);
      actor.faceToward(this.marks.policeLine, true);
      actor.setLed(i % 5 === 0 ? 'process' : 'calm');
      actor.breathAmount = 0.8 + Math.random() * 0.5;
      actor.swayAmount = 0.7 + Math.random() * 0.8;
      if (i % 3 === 0) actor.setPose('raiseFist', 0.55 + Math.random() * 0.3, { fadeIn: 0 });
      if (i % 4 === 1) actor.setPose('defiant', 0.5, { fadeIn: 0 });
      // Desynchronise the shared idle so the crowd doesn't breathe as one.
      actor.mixer.update(Math.random() * 3);
      this.addActor(`crowd${i}`, actor, { reflect: i < 6 });
      this.crowd.push(actor);
    }

    // Distant crowd: unlit capsules with LED points, lost in the haze.
    const far = new THREE.Group();
    const bodyGeo = new THREE.CapsuleGeometry(0.22, 1.1, 4, 8);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1a1e24, roughness: 0.7, metalness: 0.2 });
    const ledGeo = new THREE.SphereGeometry(0.028, 6, 5);
    const ledMat = new THREE.MeshBasicMaterial({ color: PALETTE.ledCalm, toneMapped: false });
    for (let i = 0; i < 46; i++) {
      const g = new THREE.Group();
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = 0.85;
      body.castShadow = false;
      const led = new THREE.Mesh(ledGeo, ledMat);
      led.position.set(0.1, 1.62, 0.1);
      g.add(body, led);
      const row = Math.floor(i / 8);
      g.position.set((i % 8) * 1.5 - 5.4 + (row % 2 ? 0.7 : 0) + (Math.random() - 0.5) * 0.5, 0, 9.5 + row * 1.9);
      g.rotation.y = Math.PI + (Math.random() - 0.5) * 0.4;
      far.add(g);
    }
    this.scene.add(far);
  }

  get crowdActors(): Actor[] {
    return this.crowd;
  }

  /**
   * Alert level for the police line: 0 stands down, 1 is the ultimatum, 2 is
   * weapons free. Drives the strobes, the floodlights and the crowd's posture in
   * one call so a story beat does not have to touch six objects.
   */
  raiseAlert(level: 0 | 1 | 2): void {
    this.alertLevel = level;
    for (const s of this.strobes) s.setIntensity(level === 0 ? 0.12 : level === 1 ? 0.42 : 0.85);
    for (const light of this.lineLights) light.intensity = light.userData.base * (0.5 + level * 0.55);
    for (let i = 0; i < this.crowd.length; i++) {
      const actor = this.crowd[i];
      if (level === 2) {
        actor.setLed('stress');
        actor.agitation = 1;
      } else if (level === 1) {
        actor.setLed(i % 3 === 0 ? 'stress' : 'process');
        actor.agitation = 0.7;
      } else {
        actor.setLed(i % 5 === 0 ? 'process' : 'calm');
        actor.agitation = 0.25;
      }
    }
  }

  /** Every android in the square goes down: the chapter's peaceful resolution. */
  kneelCrowd(): void {
    for (let i = 0; i < this.crowd.length; i++) {
      const actor = this.crowd[i];
      actor.clearAllPoses([]);
      actor.setPose('resigned', 0.9, { fadeIn: 0.9 + (i % 7) * 0.16 });
      actor.setLed('calm');
      actor.agitation = 0.15;
    }
  }

  alertLevel: 0 | 1 | 2 = 1;
}
