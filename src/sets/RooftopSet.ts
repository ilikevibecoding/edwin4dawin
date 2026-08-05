import * as THREE from 'three';
import { SceneSet } from './SceneSet';
import {
  antennaMast,
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
  thiriumPool,
  warningSign,
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
    troopers: [new THREE.Vector3(-4.2, 0, 2.2), new THREE.Vector3(-5.0, 0, 3.6)],
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
      coverage: 0.86,
      cityGlow: 1.35,
      cloudBrightness: 0.62,
      cityGlowColor: new THREE.Color(1.0, 0.5, 0.24),
      horizonColor: new THREE.Color(0.075, 0.1, 0.15),
      zenithColor: new THREE.Color(0.008, 0.014, 0.03),
      stars: 0.08,
      envIntensity: 1.15,
      backgroundIntensity: 1.0,
      beams: [
        { azimuth: 2.1, elevation: 0.5, spread: 0.35, intensity: 0.16, color: new THREE.Color(0.4, 0.7, 1) },
        { azimuth: 4.4, elevation: 0.3, spread: 0.5, intensity: 0.1, color: new THREE.Color(1, 0.5, 0.3) },
      ],
    });
    this.initFog(PALETTE.fogNight, FOG.rooftopDensity);

    this.buildDeck();
    this.buildEdgeAndSkyline();
    this.buildPlant();
    this.buildLights();

    this.initRain({ groundY: 0, boxSize: 40, color: 0xa9c6e8, intensity: 1 });
    this.initWetFloor({ planeY: 0, wetness: 1, strength: 1.05 });
    if (this.floorMaterial) this.wetFloor?.attach(this.floorMaterial);
    this.initHaze(9, { color: 0x86a8d8, radius: 13, height: 3.4, scale: 8, opacity: 0.05 });

    // Rain and haze must not appear in the mirror pass.
    if (this.rain) this.wetFloor?.excludeFromReflection(this.rain.group);
    if (this.haze) this.wetFloor?.excludeFromReflection(this.haze.group);
  }

  // ------------------------------------------------------------------- geometry

  private buildDeck(): void {
    const deckW = 17;
    const deckD = 14;
    const maps = Tex.concrete;
    const floorMat = new THREE.MeshStandardMaterial({
      map: maps.map,
      normalMap: maps.normalMap,
      roughnessMap: maps.roughnessMap,
      color: 0x6e747c,
      roughness: 0.55,
      metalness: 0.12,
      envMapIntensity: 1,
      normalScale: new THREE.Vector2(0.85, 0.85),
    });
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

    // Painted service walkway; a graphic line that guides the eye to the edge.
    const walk = new THREE.Mesh(
      new THREE.PlaneGeometry(1.5, 11),
      new THREE.MeshStandardMaterial({ color: 0x9a8f5f, roughness: 0.7, metalness: 0.05, opacity: 0.55, transparent: true })
    );
    walk.rotation.x = -Math.PI / 2;
    walk.position.set(0.6, 0.008, -1.5);
    this.scene.add(walk);

    for (const p of [
      new THREE.Vector3(-2.2, 0.012, 2.6),
      new THREE.Vector3(2.5, 0.012, -1.4),
      new THREE.Vector3(-0.4, 0.012, -3.2),
      new THREE.Vector3(4.4, 0.012, 2.2),
      new THREE.Vector3(-4.8, 0.012, -1.2),
    ]) {
      const pool = puddle(0.85 + Math.random() * 1.5);
      pool.position.copy(p);
      pool.rotation.y = Math.random() * Math.PI;
      this.scene.add(pool);
      if (this.floorMaterial) {
        // Puddles share the wet shader so they reflect too.
        const mat = (pool.material as THREE.MeshStandardMaterial).clone();
        mat.roughness = 0.02;
        mat.metalness = 0.1;
        pool.material = mat;
      }
    }
  }

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
      new THREE.MeshStandardMaterial({
        map: nearTowerMaps.map,
        emissiveMap: nearTowerMaps.emissiveMap,
        roughnessMap: nearTowerMaps.roughnessMap,
        emissive: new THREE.Color(0xffffff),
        emissiveIntensity: 1.25,
        color: 0x43494f,
        roughness: 0.7,
        metalness: 0.25,
      })
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
    seat.rotation.set(-1.3, 0.6, 0.3);
    this.scene.add(seat);
    this.reflect(seat);

    const sign = warningSign('ROOF ACCESS · AUTHORISED ONLY');
    sign.position.set(-5.6, 2.1, 3.35);
    sign.rotation.y = -0.12;
    this.scene.add(sign);
  }

  private buildLights(): void {
    // Overcast key from the sky, cool and soft.
    const ambient = new THREE.HemisphereLight(0x3c5878, 0x0a0c10, 0.55);
    this.scene.add(ambient);

    // Moon/skylight direction: the only shadow-caster wide enough for the deck.
    const key = new THREE.DirectionalLight(PALETTE.moonlight, 1.15);
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
      spill: 26,
      flicker: true,
    });
    magenta.group.position.set(9.6, -3.4, -9.2);
    magenta.group.rotation.y = -0.9;
    this.scene.add(magenta.group);
    this.reflect(magenta.group);
    this.neonLights.push({ light: magenta.light, base: 26, flicker: true, phase: 0 });

    const cyan = neonSign(['CYBERLIFE'], {
      color: PALETTE.neonCyan,
      width: 7.2,
      height: 1.5,
      spill: 22,
    });
    cyan.group.position.set(-13.5, 2.6, -16);
    cyan.group.rotation.y = 0.55;
    this.scene.add(cyan.group);
    this.reflect(cyan.group);
    this.neonLights.push({ light: cyan.light, base: 22, flicker: false, phase: 1.7 });

    const amber = neonSign(['24H', 'NOODLE'], {
      color: PALETTE.neonAmber,
      width: 2.2,
      height: 3.6,
      vertical: true,
      spill: 14,
    });
    amber.group.position.set(-10.5, -6.5, 6.5);
    amber.group.rotation.y = 1.3;
    this.scene.add(amber.group);
    this.neonLights.push({ light: amber.light, base: 14, flicker: false, phase: 3.1 });

    // Bounce from the city, low and warm, keeps the shadow side alive.
    const bounce = new THREE.PointLight(PALETTE.sodium, 12, 26, 2);
    bounce.position.set(6, -2.5, -8);
    this.scene.add(bounce);

    const rimLight = new THREE.SpotLight(0x9fd4ff, 60, 26, 0.85, 0.6, 2);
    rimLight.position.set(6.5, 8.5, -12);
    rimLight.target.position.set(0.5, 1.2, -3);
    this.scene.add(rimLight, rimLight.target);

    // Police helicopter searchlight sweeping the roof.
    this.searchlight = new LightShaft({
      length: 34,
      radius: 3.6,
      color: 0xdfeeff,
      intensity: 0.42,
      noise: 0.7,
      falloff: 1.05,
      nearFade: 1.4,
    });
    this.addShaft(this.searchlight);
    this.scene.add(this.searchlight.mesh);

    const heliSpot = new THREE.SpotLight(0xe8f4ff, 260, 46, 0.2, 0.55, 2);
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
        this.searchlight.setIntensity(this.searchlightActive ? 0.42 : 0);
      }
      heliSpot.intensity = this.searchlightActive ? 260 : 0;
      heliSpot.target.position.copy(target);
      heliSpot.target.updateMatrixWorld();
    });
  }
}
