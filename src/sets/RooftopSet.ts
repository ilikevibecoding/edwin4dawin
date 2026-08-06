import * as THREE from 'three';
import { SceneSet } from './SceneSet';
import {
  antennaMast,
  facadeMaterialFor,
  cableRun,
  chainFence,
  chair,
  hvacUnit,
  neonSign,
  parapet,
  puddle,
  satelliteDish,
  skyline,
  stairHouse,
  tablet,
  tileMaterial,
  thiriumPool,
  warningSign,
  workLight,
} from './Kit';
import { LightShaft } from '../render/Volumetric';
import { FOG, PALETTE } from '../render/LookConfig';
import { Tex } from '../render/SharedTextures';
import type { QualitySettings } from '../core/Quality';

/**
 * Chapter 1 — the roof of the Stratford tower, in a downpour.
 *
 * Layout is built for the camera: the stairwell head-house anchors screen left
 * with the only warm light on the roof, the hostage stands at the open east edge
 * against the skyline so she is always in silhouette, and the plant equipment
 * cluster gives the negotiator something to move between. Everything is placed
 * so that the wet deck can pick up the neon from the tower below.
 */
export class RooftopSet extends SceneSet {
  /** Anchors the story code can reference for staging and camera framing. */
  readonly marks = {
    playerStart: new THREE.Vector3(-3.4, 0, 4.4),
    doorway: new THREE.Vector3(-4.6, 0, 5.2),
    clueTablet: new THREE.Vector3(-1.15, 0.02, 2.05),
    clueThirium: new THREE.Vector3(1.9, 0.01, 3.15),
    clueChair: new THREE.Vector3(2.9, 0, 1.1),
    clueFootprints: new THREE.Vector3(0.6, 0.01, 0.2),
    standoff: new THREE.Vector3(-0.2, 0, 0.2),
    deviant: new THREE.Vector3(1.15, 0, -4.15),
    hostage: new THREE.Vector3(1.9, 0, -4.85),
    edge: new THREE.Vector3(1.6, 0, -5.6),
    // Kept well clear of playerStart and of the line between it and each other:
    // a single on one trooper used to frame the negotiator standing between them.
    troopers: [new THREE.Vector3(-1.9, 0, 5.3), new THREE.Vector3(0.4, 0, 4.8)],
  };

  private beacon: THREE.Mesh | null = null;
  private beaconLight: THREE.PointLight | null = null;
  private searchlight: LightShaft | null = null;
  private searchlightSource = new THREE.Vector3(-16, 26, -22);
  private neonLights: { light: THREE.PointLight; base: number; flicker: boolean; phase: number }[] = [];
  private floorMaterial: THREE.MeshStandardMaterial | null = null;
  private heliAngle = 0;
  /** Set while the helicopter searchlight is sweeping the roof. */
  searchlightActive = true;

  constructor(quality: QualitySettings) {
    super(quality);
  }

  async build(renderer: THREE.WebGLRenderer): Promise<void> {
    this.initSky(renderer, {
      coverage: 0.9,
      cityGlow: 0.34,
      cloudBrightness: 0.1,
      // Barely warm. A saturated sodium glow here bleeds onto every upward face
      // in the set and turns the whole frame muddy brown.
      cityGlowColor: new THREE.Color(0.5, 0.46, 0.47),
      horizonColor: new THREE.Color(0.042, 0.052, 0.068),
      zenithColor: new THREE.Color(0.008, 0.011, 0.018),
      stars: 0.05,
      // Deliberately low: image-based light is ambient by nature, and any more of
      // it flattens the deck into a uniform grey. Modelling comes from the lamps.
      envIntensity: 1.7,
      backgroundIntensity: 0.32,
      beams: [
        { azimuth: 2.1, elevation: 0.5, spread: 0.35, intensity: 0.16, color: new THREE.Color(0.4, 0.7, 1) },
        { azimuth: 4.4, elevation: 0.3, spread: 0.5, intensity: 0.1, color: new THREE.Color(1, 0.5, 0.3) },
      ],
    });
    this.initFog(0x2b3a4e, FOG.rooftopDensity);

    this.buildDeck();
    this.buildEdgeAndSkyline();
    this.buildPlant();
    this.buildLights();

    this.initRain({ groundY: 0, boxSize: 26, color: 0xa9c6e8, intensity: 1 });
    this.initWetFloor({ planeY: 0, wetness: 1, strength: 0.85 });
    if (this.floorMaterial) this.wetFloor?.attach(this.floorMaterial);
    for (const mat of this.puddleMaterials) this.wetFloor?.attach(mat);
    this.initHaze(10, { color: 0x6d88b4, radius: 14, height: 3.6, scale: 7, opacity: 0.05 });
    this.initCharacterLights({ keyColor: 0xbcd4ff, kickerColor: 0xff9a52, keyIntensity: 42, kickerIntensity: 19, bounceIntensity: 1.4 });
    this.lightSubject(this.marks.standoff.clone().setY(1.5), { keySide: -1 });

    // Rain and haze must not appear in the mirror pass.
    if (this.rain) this.wetFloor?.excludeFromReflection(this.rain.group);
    if (this.haze) this.wetFloor?.excludeFromReflection(this.haze.group);
  }

  // ------------------------------------------------------------------- geometry

  private buildDeck(): void {
    const deckW = 17;
    const deckD = 14;
    const maps = Tex.concrete;
    const floorMat = tileMaterial(
      new THREE.MeshStandardMaterial({
        map: maps.map,
        normalMap: maps.normalMap,
        roughnessMap: maps.roughnessMap,
        color: 0x424852,
        // Wet, so it is nearly a mirror at grazing angles and reads black head-on.
        roughness: 0.38,
        metalness: 0.0,
        envMapIntensity: 1.5,
        normalScale: new THREE.Vector2(0.55, 0.55),
      }),
      14,
      12
    );
    this.floorMaterial = floorMat;

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(deckW, deckD, 1, 1), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    floor.position.z = -1;
    this.scene.add(floor);
    this.wetFloor?.excludeFromReflection(floor);

    // Structural mass under the deck so the roof has thickness at the edge.
    const slab = new THREE.Mesh(new THREE.BoxGeometry(deckW, 1.2, deckD), this.kit.concreteFine);
    slab.position.set(0, -0.62, -1);
    slab.receiveShadow = true;
    slab.castShadow = true;
    this.scene.add(slab);
    this.reflect(slab);

    // Fixed sizes and rotations rather than Math.random: an unseeded set makes
    // two captures of the same code differ, which makes look development
    // impossible to judge.
    for (const [x, z, radius, spin] of [
      [-2.2, 2.6, 1.35, 0.4],
      [2.5, -1.4, 1.9, 2.1],
      [-0.4, -3.2, 1.05, 1.2],
      [4.4, 2.2, 2.2, 2.9],
      [-4.8, -1.2, 1.6, 0.8],
    ] as [number, number, number, number][]) {
      const pool = puddle(radius);
      pool.position.set(x, 0.012, z);
      pool.rotation.y = spin;
      const mat = (pool.material as THREE.MeshStandardMaterial).clone();
      mat.roughness = 0.05;
      mat.metalness = 0.0;
      mat.envMapIntensity = 1.4;
      pool.material = mat;
      this.puddleMaterials.push(mat);
      this.scene.add(pool);
    }
  }

  /** Standing water shares the wet-floor shader, so it mirrors the set too. */
  private puddleMaterials: THREE.MeshStandardMaterial[] = [];

  private buildEdgeAndSkyline(): void {
    // Parapets on three sides; the east edge (-z) is open for the standoff.
    const west = parapet(this.kit, 14, { height: 1.05 });
    west.rotation.y = Math.PI / 2;
    west.position.set(-8.4, 0, -1);
    this.scene.add(west);
    this.reflect(west);

    const east = parapet(this.kit, 14, { height: 1.05 });
    east.rotation.y = Math.PI / 2;
    east.position.set(8.4, 0, -1);
    this.scene.add(east);

    const south = parapet(this.kit, 17, { height: 1.05 });
    south.position.set(0, 0, 5.9);
    this.scene.add(south);
    this.reflect(south);

    // North edge: broken low kerb where the roof falls away.
    const kerbL = parapet(this.kit, 6.2, { height: 0.34, thickness: 0.4, coping: false });
    kerbL.position.set(-5.3, 0, -7.85);
    this.scene.add(kerbL);
    const kerbR = parapet(this.kit, 5.4, { height: 0.34, thickness: 0.4, coping: false });
    kerbR.position.set(5.6, 0, -7.85);
    this.scene.add(kerbR);
    this.reflect(kerbL);
    this.reflect(kerbR);

    const city = skyline({ count: 96, innerRadius: 48, outerRadius: 300, minHeight: 20, maxHeight: 150, baseY: -78 });
    this.scene.add(city);
    this.reflect(city);

    // A near tower on the left gives the frame a hard vertical and a light source.
    const nearTowerMaps = Tex.facadeDense;
    const nearTower = new THREE.Mesh(
      new THREE.BoxGeometry(16, 96, 16),
      facadeMaterialFor(
        new THREE.MeshStandardMaterial({
          map: nearTowerMaps.map,
          emissiveMap: nearTowerMaps.emissiveMap,
          roughnessMap: nearTowerMaps.roughnessMap,
          emissive: new THREE.Color(0xffffff),
          emissiveIntensity: 1.5,
          color: 0x1e2530,
          roughness: 0.7,
          metalness: 0.25,
        }),
        16,
        96
      )
    );
    nearTower.position.set(-27, -20, -26);
    this.scene.add(nearTower);
    this.reflect(nearTower);

    const nearTower2 = nearTower.clone();
    nearTower2.position.set(24, -34, -34);
    nearTower2.scale.set(1.3, 0.8, 1.1);
    this.scene.add(nearTower2);
    this.reflect(nearTower2);
  }

  private buildPlant(): void {
    // Stairwell head-house, screen left.
    const stair = stairHouse(this.kit, { w: 3.6, h: 3.1, d: 3.2 });
    stair.group.position.set(-5.6, 0, 5.0);
    stair.group.rotation.y = -0.12;
    this.scene.add(stair.group);
    this.reflect(stair.group);
    this.addShaft(stair.shaft);
    this.updatables.push((_dt, time) => {
      // Failing ballast: the sodium lamp buzzes and dips.
      const f = 0.86 + 0.14 * Math.sin(time * 37) * Math.sin(time * 5.3);
      stair.lamp.intensity = 14 * f;
    });

    // Plant cluster: two air handlers, a dish, ducting.
    const hvac1 = hvacUnit(this.kit, 2.1, 1.35, 1.5);
    hvac1.position.set(-3.9, 0, -0.6);
    hvac1.rotation.y = 0.22;
    this.scene.add(hvac1);
    this.reflect(hvac1);

    const hvac2 = hvacUnit(this.kit, 1.7, 1.05, 1.3);
    hvac2.position.set(5.3, 0, 2.7);
    hvac2.rotation.y = -0.5;
    this.scene.add(hvac2);
    this.reflect(hvac2);

    const dish = satelliteDish(this.kit, 0.95);
    dish.position.set(6.4, 0, -2.4);
    dish.rotation.y = 2.2;
    this.scene.add(dish);
    this.reflect(dish);

    const mast = antennaMast(this.kit, 6.5);
    mast.group.position.set(-7.1, 0, -4.4);
    this.scene.add(mast.group);
    this.reflect(mast.group);
    this.beacon = mast.beacon;
    this.beaconLight = mast.beaconLight;

    const duct = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 5.4, 12), this.kit.metal);
    duct.rotation.z = Math.PI / 2;
    duct.position.set(-2.2, 0.42, -2.9);
    duct.castShadow = true;
    duct.receiveShadow = true;
    this.scene.add(duct);
    this.reflect(duct);

    for (const [from, to] of [
      [new THREE.Vector3(-5.6, 3.0, 3.6), new THREE.Vector3(-7.0, 2.1, -3.9)],
      [new THREE.Vector3(-3.9, 1.5, -1.2), new THREE.Vector3(-7.0, 1.6, -4.2)],
    ] as [THREE.Vector3, THREE.Vector3][]) {
      const cable = cableRun(from, to, 0.55);
      this.scene.add(cable);
      this.reflect(cable);
    }

    // Police floodlights hauled up for the standoff. Placed low and raking so
    // the wet deck catches them, and off to the sides so they cross the acting
    // area rather than flattening it from the camera's side.
    for (const spec of [
      { at: new THREE.Vector3(-7.6, 0, 5.0), aim: new THREE.Vector3(2.4, 0.0, -1.4), intensity: 210, color: 0xfff2e0, shadows: false },
      { at: new THREE.Vector3(7.4, 0, 3.4), aim: new THREE.Vector3(-1.2, 0.1, -3.4), intensity: 110, color: 0xe4f0ff, shadows: false },
      { at: new THREE.Vector3(-7.8, 0, -4.6), aim: new THREE.Vector3(2.8, 0.1, 3.2), intensity: 90, color: 0xd8e8ff, shadows: false },
    ]) {
      const flood = workLight(this.kit, {
        color: spec.color,
        intensity: spec.intensity,
        height: 1.2,
        range: 30,
        shadows: spec.shadows && this.quality.shadows,
      });
      flood.group.position.copy(spec.at);
      const head = spec.aim.clone().sub(spec.at);
      flood.group.rotation.y = Math.atan2(head.x, head.z);
      flood.light.target.position.set(0, spec.aim.y - 1.2, head.length());
      flood.light.target.updateMatrixWorld();
      this.scene.add(flood.group);
      this.reflect(flood.group);
      // No volumetric cone: a shaft that terminates inside the acting area
      // leaves a bright additive blob on whoever is standing there.
      flood.shaft.dispose();
    }

    const fence = chainFence(this.kit, 4.6, 2.1);
    fence.position.set(7.0, 0, 0.4);
    fence.rotation.y = Math.PI / 2;
    this.scene.add(fence);
    this.reflect(fence);

    // Clues, placed so the investigation walks the player toward the edge.
    const pad = tablet(this.kit);
    pad.position.copy(this.marks.clueTablet);
    pad.rotation.set(0, 0.7, 0.06);
    this.scene.add(pad);
    this.reflect(pad);

    const thirium = thiriumPool(0.55);
    thirium.position.copy(this.marks.clueThirium);
    this.scene.add(thirium);

    const seat = chair(this.kit);
    seat.position.copy(this.marks.clueChair);
    // Tipped onto its back, and lifted so the legs do not pass through the deck.
    seat.rotation.set(-1.3, 0.6, 0.3);
    seat.position.y += 0.24;
    this.scene.add(seat);
    this.reflect(seat);

    const sign = warningSign('ROOF ACCESS · AUTHORISED ONLY');
    sign.position.set(-5.6, 2.1, 3.35);
    sign.rotation.y = -0.12;
    this.scene.add(sign);
  }

  private buildLights(): void {
    // Overcast key from the sky, cool and soft.
    // Ground colour is deliberately not black: downward-facing surfaces still
    // receive bounce from a wet deck, and without it half the frame crushes.
    const ambient = new THREE.HemisphereLight(0x5a6d86, 0x0d1014, 0.85);
    // A flat ambient term keeps deep interiors and undersides readable.
    this.scene.add(new THREE.AmbientLight(0x1b2430, 0.28));
    this.scene.add(ambient);

    // Moon/skylight direction: the only shadow-caster wide enough for the deck.
    const key = new THREE.DirectionalLight(PALETTE.moonlight, 2.6);
    key.position.set(-9, 14, -11);
    key.castShadow = this.quality.shadows;
    key.shadow.mapSize.set(this.quality.shadowMapSize, this.quality.shadowMapSize);
    key.shadow.camera.left = -13;
    key.shadow.camera.right = 13;
    key.shadow.camera.top = 13;
    key.shadow.camera.bottom = -13;
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 46;
    key.shadow.bias = -0.0016;
    key.shadow.normalBias = 0.022;
    this.scene.add(key);

    // Neon from the tower face below throws magenta up onto the deck edge.
    const magenta = neonSign(['神経', 'NEURO'], {
      color: PALETTE.neonMagenta,
      width: 3.2,
      height: 6.4,
      vertical: true,
      spill: 18,
      flicker: true,
    });
    magenta.group.position.set(9.6, -3.4, -9.2);
    magenta.group.rotation.y = -0.9;
    this.scene.add(magenta.group);
    this.reflect(magenta.group);
    this.neonLights.push({ light: magenta.light, base: 18, flicker: true, phase: 0 });

    const cyan = neonSign(['CYBERLIFE'], {
      color: PALETTE.neonCyan,
      width: 7.2,
      height: 1.5,
      spill: 30,
    });
    cyan.group.position.set(-13.5, 2.6, -16);
    cyan.group.rotation.y = 0.55;
    this.scene.add(cyan.group);
    this.reflect(cyan.group);
    this.neonLights.push({ light: cyan.light, base: 30, flicker: false, phase: 1.7 });

    const amber = neonSign(['24H', 'NOODLE'], {
      color: PALETTE.neonAmber,
      width: 2.2,
      height: 3.6,
      vertical: true,
      spill: 6,
    });
    amber.group.position.set(-10.5, -6.5, 6.5);
    amber.group.rotation.y = 1.3;
    this.scene.add(amber.group);
    this.neonLights.push({ light: amber.light, base: 6, flicker: false, phase: 3.1 });

    // Bounce from the city, low and warm, keeps the shadow side alive.
    const bounce = new THREE.PointLight(PALETTE.sodium, 9, 24, 2);
    bounce.position.set(6, -2.5, -8);
    this.scene.add(bounce);

    // Acting-area key. The portrait rig only lights whoever is speaking, so a
    // broad soft source over the standoff keeps everyone else in the frame
    // readable instead of dropping them to silhouette the moment they stop
    // being the subject.
    const areaKey = new THREE.SpotLight(0xb4c8ea, 150, 26, 0.8, 0.9, 2);
    areaKey.position.set(-4.5, 4.6, 5.6);
    areaKey.target.position.set(0.8, 1.2, -3.5);
    areaKey.castShadow = this.quality.shadows;
    if (areaKey.castShadow) {
      areaKey.shadow.mapSize.set(this.quality.shadowMapSize, this.quality.shadowMapSize);
      areaKey.shadow.bias = -0.0014;
      areaKey.shadow.normalBias = 0.024;
      areaKey.shadow.camera.near = 1;
      areaKey.shadow.camera.far = 26;
    }
    this.scene.add(areaKey, areaKey.target);

    // Hard cyan rim from the tower behind the standoff: separates the figures
    // from the skyline, which is the single most important light in the scene.
    const rimLight = new THREE.SpotLight(0x9fd4ff, 260, 22, 0.42, 0.22, 2);
    rimLight.position.set(2.4, 3.2, -8.4);
    rimLight.target.position.set(0.4, 1.4, -1.5);
    this.scene.add(rimLight, rimLight.target);

    // Low sodium fill from the stairwell side, so shadow sides keep detail.
    const fill = new THREE.SpotLight(PALETTE.sodium, 8, 16, 0.9, 0.8, 2);
    fill.position.set(-5.0, 2.6, 4.2);
    fill.target.position.set(0.2, 1.3, 0.4);
    this.scene.add(fill, fill.target);

    // Police helicopter searchlight sweeping the roof.
    this.searchlight = new LightShaft({
      length: 34,
      radius: 2.1,
      color: 0xdfeeff,
      intensity: 0.32,
      noise: 0.7,
      falloff: 1.05,
      nearFade: 1.4,
    });
    this.addShaft(this.searchlight);
    this.scene.add(this.searchlight.mesh);

    const heliSpot = new THREE.SpotLight(0xe8f4ff, 160, 46, 0.16, 0.6, 2);
    heliSpot.position.copy(this.searchlightSource);
    heliSpot.castShadow = false;
    this.scene.add(heliSpot, heliSpot.target);

    this.updatables.push((dt, time) => {
      // Aviation beacon.
      if (this.beacon && this.beaconLight) {
        const on = Math.sin(time * 1.9) > 0.72 ? 1 : 0.06;
        (this.beacon.material as THREE.MeshBasicMaterial).color
          .set(PALETTE.neonRed)
          .multiplyScalar(0.4 + on * 2.4);
        this.beaconLight.intensity = 1 + on * 7;
      }
      // Neon flicker: mostly steady with occasional dropouts.
      for (const n of this.neonLights) {
        if (!n.flicker) {
          n.light.intensity = n.base * (0.94 + 0.06 * Math.sin(time * 1.3 + n.phase));
          continue;
        }
        const glitch = Math.sin(time * 23 + n.phase) * Math.sin(time * 3.1);
        n.light.intensity = n.base * (glitch > 0.86 ? 0.25 : 0.92 + 0.08 * Math.sin(time * 9));
      }
      // Searchlight sweep.
      this.heliAngle += dt * 0.22;
      const target = new THREE.Vector3(Math.sin(this.heliAngle) * 6.5, 0, -1.5 + Math.cos(this.heliAngle * 0.7) * 4.5);
      if (this.searchlight) {
        this.searchlight.aim(this.searchlightSource, target);
        this.searchlight.setIntensity(this.searchlightActive ? 0.32 : 0);
      }
      heliSpot.intensity = this.searchlightActive ? 160 : 0;
      heliSpot.target.position.copy(target);
      heliSpot.target.updateMatrixWorld();
    });
  }
}
