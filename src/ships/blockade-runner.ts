/**
 * Rebel blockade runner — the "Sunspire".
 *
 * Silhouette brief: a long white cylindrical body, a broad flat hammerhead
 * command section carried forward on a slim neck, and a dense cluster of
 * engine bells at the stern. Weathered, lightly armed, obviously a civilian
 * hull pressed into war service.
 *
 * Local space: nose at −Z (z = −75), stern at +Z (z = +71). Length ≈ 150 m.
 */

import * as THREE from 'three';
import {
  hullMaterial,
  metalMaterial,
  emissiveMaterial,
  additiveMaterial,
  glassMaterial,
  plumeMaterial,
  PALETTE,
} from '../assets/materials';
import { roundedBox, loftedHull, greebleField, prismGeometry } from '../assets/geometry';
import { flareSprite } from '../assets/textures';
import { Rng } from '../core/rng';
import { Turret } from './turret';
import type { QualitySettings } from '../core/quality';

export const RUNNER_LENGTH = 146;

/** Station keeping for the major sections, all in local Z. */
const HEAD_Z = -62;
const NECK_Z = -46;
const BODY_Z = 4;
const BODY_LEN = 86;
const BODY_R = 8.4;
const ENGINE_BLOCK_Z = 58;
const CLUSTER_Z = 70;

export interface RunnerAnchors {
  /** Where the destroyer's tractor beam locks on. */
  dockPort: THREE.Object3D;
  /** Escape-pod bay the droids launch from. */
  podBay: THREE.Object3D;
  /** Bridge viewport, used for interior/exterior match cuts. */
  bridge: THREE.Object3D;
  engineCluster: THREE.Object3D;
  noseTip: THREE.Object3D;
}

export class BlockadeRunner {
  readonly group = new THREE.Group();
  readonly anchors: RunnerAnchors;
  readonly turrets: Turret[] = [];

  private engineFlares: THREE.Mesh[] = [];
  private plumeMats: THREE.ShaderMaterial[] = [];
  private engineCores: THREE.Mesh[] = [];
  private engineLights: THREE.PointLight[] = [];
  private engineMat: THREE.MeshStandardMaterial;
  private runningLights: THREE.Mesh[] = [];
  private damageDecals: THREE.Mesh[] = [];
  private windowMat: THREE.MeshStandardMaterial;

  private damage = 0;
  private throttle = 1;

  constructor(quality: QualitySettings, seed = 'runner') {
    this.group.name = 'BlockadeRunner';
    const rng = new Rng(seed);

    const hull = hullMaterial('runner', {
      color: PALETTE.rebelHull,
      grime: 0.36,
      scorch: 5,
      cell: 78,
      roughness: 0.66,
      metalness: 0.26,
      seed: `${seed}-hull`,
      repeat: 3,
    });
    const hullDark = hullMaterial('runnerDark', {
      color: PALETTE.rebelHullShadow,
      grime: 0.5,
      scorch: 3,
      cell: 54,
      roughness: 0.74,
      metalness: 0.32,
      seed: `${seed}-dark`,
      repeat: 2,
    });
    const trim = metalMaterial('runnerTrim', PALETTE.rebelTrim, 0.62, 0.2);
    const structure = metalMaterial('runnerStruct', '#787b78', 0.55, 0.68);
    const dark = metalMaterial('runnerShadow', '#3a3d40', 0.8, 0.4);
    this.windowMat = emissiveMaterial('runnerWin', '#cfe6ff', 0.85).clone();
    // Just over the bloom threshold and distinctly blue: a pure-white core at
    // high intensity blooms into one shapeless ball from astern.
    this.engineMat = emissiveMaterial('runnerEngine', '#a8d8ff', 1.2).clone();

    /* ------------------------------------------------------------ main body */
    // Full amidships, gently waisted toward the stern, tapering to the neck.
    const body = new THREE.Mesh(
      loftedHull(
        BODY_LEN,
        BODY_R,
        (t) => {
          if (t < 0.14) return 0.5 + (t / 0.14) * 0.5;
          if (t < 0.74) return 1 - Math.pow((t - 0.4) / 0.42, 2) * 0.07;
          return 0.985 - (t - 0.74) * 0.22;
        },
        24,
        44,
        0.84,
      ),
      hull,
    );
    body.name = 'RunnerBody';
    body.position.z = BODY_Z;
    body.castShadow = true;
    this.group.add(body);

    // Dorsal spine and dorsal fin.
    const spine = new THREE.Mesh(roundedBox(4.6, 2.4, 74, 0.5), hullDark);
    spine.position.set(0, 6.7, BODY_Z);
    this.group.add(spine);
    const fin = new THREE.Mesh(
      prismGeometry([[-0.6, -16], [-0.6, 15], [0.6, 15], [0.6, -16]], 5.6, [1, 0.42], [0, 6]),
      structure,
    );
    fin.position.set(0, 10.4, BODY_Z - 4);
    this.group.add(fin);

    // Ventral keel with sensor blisters.
    const keel = new THREE.Mesh(roundedBox(5.6, 2.2, 68, 0.5), hullDark);
    keel.position.set(0, -6.4, BODY_Z);
    this.group.add(keel);
    for (let i = 0; i < 3; i++) {
      const blister = new THREE.Mesh(new THREE.SphereGeometry(1.6, 12, 8), structure);
      blister.position.set(0, -7.3, -22 + i * 24);
      blister.scale.set(1.4, 0.65, 2.1);
      this.group.add(blister);
    }

    /* ------------------------------------------------------------ hammerhead */
    // The neck is deliberately slim: the gap between it and the main hull is
    // what makes the forward section read as a separate "head".
    const neck = new THREE.Mesh(
      prismGeometry([[-3.4, -9], [-4.4, 9], [4.4, 9], [3.4, -9]], 8.4, [0.78, 1], [0, 0]),
      hullDark,
    );
    neck.position.set(0, 1.2, NECK_Z);
    this.group.add(neck);

    const hw = 17.5;
    const head = new THREE.Mesh(
      prismGeometry(
        [
          [-hw * 0.62, -13.5],
          [-hw, -8.5],
          [-hw, 9],
          [-hw * 0.5, 12.5],
          [hw * 0.5, 12.5],
          [hw, 9],
          [hw, -8.5],
          [hw * 0.62, -13.5],
        ],
        9.2,
        [0.88, 0.84],
        [0, -0.6],
        [0.94, 0.96],
        [0, 0.4],
      ),
      hull,
    );
    head.name = 'RunnerHammerhead';
    head.position.set(0, 2.6, HEAD_Z);
    head.castShadow = true;
    this.group.add(head);

    // Head underside plate, so the silhouette from below stays solid.
    const headBelly = new THREE.Mesh(roundedBox(hw * 1.5, 3, 20, 1), hullDark);
    headBelly.position.set(0, -2.6, HEAD_Z + 0.5);
    this.group.add(headBelly);

    // Bridge blister and forward viewports.
    const bridgeDome = new THREE.Mesh(new THREE.SphereGeometry(3.4, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.56), hull);
    bridgeDome.position.set(0, 6.9, HEAD_Z + 1);
    bridgeDome.scale.set(1.6, 0.8, 1.35);
    this.group.add(bridgeDome);
    const bridgeGlass = new THREE.Mesh(
      new THREE.SphereGeometry(3.25, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.5),
      glassMaterial('runnerBridge', '#12293c', 0.88),
    );
    bridgeGlass.position.copy(bridgeDome.position).add(new THREE.Vector3(0, 0.1, -0.5));
    bridgeGlass.scale.copy(bridgeDome.scale).multiplyScalar(0.96);
    this.group.add(bridgeGlass);

    for (const side of [-1, 1]) {
      const win = new THREE.Mesh(new THREE.BoxGeometry(11, 1.1, 0.5), this.windowMat);
      win.position.set(side * 7.2, 3.4, HEAD_Z - 12.4);
      win.rotation.y = side * 0.22;
      this.group.add(win);
    }
    // Angled brow above the viewports.
    const brow = new THREE.Mesh(roundedBox(hw * 1.55, 1.6, 5, 0.6), hullDark);
    brow.position.set(0, 5.6, HEAD_Z - 10.5);
    brow.rotation.x = -0.28;
    this.group.add(brow);

    // Head flank pods and sensor rods.
    for (const side of [-1, 1]) {
      const pod = new THREE.Mesh(roundedBox(3.6, 4.2, 11, 0.7), hullDark);
      pod.position.set(side * 16.4, 2.4, HEAD_Z + 1);
      this.group.add(pod);
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 11, 6), structure);
      rod.rotation.x = Math.PI / 2;
      rod.position.set(side * 11.5, 6.2, HEAD_Z - 14);
      this.group.add(rod);
    }

    /* ------------------------------------------------------------- mid hull */
    for (const side of [-1, 1]) {
      const sponson = new THREE.Mesh(roundedBox(3, 5.6, 50, 0.7), hullDark);
      sponson.position.set(side * 8, -0.4, BODY_Z - 2);
      this.group.add(sponson);

      // Escape-pod hatches — five a side, one of which the droids will use.
      for (let i = 0; i < 5; i++) {
        const z = -18 + i * 10.5;
        const hatch = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, 0.55, 14), structure);
        hatch.rotation.z = Math.PI / 2;
        hatch.position.set(side * 9.6, -0.4, z);
        this.group.add(hatch);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(1.82, 0.15, 6, 16), dark);
        ring.rotation.y = Math.PI / 2;
        ring.position.copy(hatch.position);
        this.group.add(ring);
      }

      // Red identification stripe: the one strong accent on the hull.
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.2, 34), trim);
      stripe.position.set(side * 8.3, 3.7, BODY_Z - 6);
      this.group.add(stripe);
    }

    /* ------------------------------------------------------ engine assembly */
    const engineBlock = new THREE.Mesh(
      loftedHull(22, 10.2, (t) => 0.9 + t * 0.2, 22, 10, 0.88),
      hullDark,
    );
    engineBlock.position.z = ENGINE_BLOCK_Z;
    this.group.add(engineBlock);
    // An open collar rather than a solid plate, so the bells sit in a recess.
    const engineRing = new THREE.Mesh(new THREE.CylinderGeometry(10.5, 10.9, 5.2, 26, 1, true), structure);
    engineRing.rotation.x = Math.PI / 2;
    engineRing.position.z = CLUSTER_Z - 2.4;
    engineRing.material = structure;
    this.group.add(engineRing);
    const engineBack = new THREE.Mesh(new THREE.CircleGeometry(10.4, 26), dark);
    engineBack.position.z = CLUSTER_Z - 4.6;
    this.group.add(engineBack);

    const cluster = new THREE.Object3D();
    cluster.name = 'EngineCluster';
    cluster.position.z = CLUSTER_Z;
    this.group.add(cluster);

    // Eleven bells: one centre, four inner, six outer — a distinct signature.
    const layout: Array<[number, number, number]> = [[0, 0, 3.3]];
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      layout.push([Math.cos(a) * 4.4, Math.sin(a) * 3.6, 2.2]);
    }
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
      layout.push([Math.cos(a) * 7.9, Math.sin(a) * 6.2, 1.9]);
    }

    const flareTex = flareSprite();
    for (const [x, y, r] of layout) {
      const housing = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.15, r * 1.0, 3.6, 14), structure);
      housing.rotation.x = Math.PI / 2;
      housing.position.set(x, y, -1.4);
      cluster.add(housing);

      const core = new THREE.Mesh(new THREE.CircleGeometry(r * 0.88, 16), this.engineMat);
      core.position.set(x, y, 0.6);
      cluster.add(core);
      this.engineCores.push(core);

      // Only the larger bells get a flare card; eleven overlapping additive
      // sprites bloom into one featureless ball at any distance.
      if (r > 2) {
        const flare = new THREE.Mesh(
          new THREE.PlaneGeometry(r * 2.4, r * 2.4),
          additiveMaterial(`runnerFlare${r}`, '#7fbdff', 0.16, flareTex).clone(),
        );
        flare.position.set(x, y, 1.4);
        cluster.add(flare);
        this.engineFlares.push(flare);
      }

      // One tapered plume per bell. The apex points aft (+Z) so the exhaust
      // narrows as it leaves the nozzle.
      const plumeLen = r * 7;
      const pmat = plumeMaterial('#5fa8ff', 0.5);
      const plume = new THREE.Mesh(new THREE.ConeGeometry(r * 0.9, plumeLen, 14, 1, true), pmat);
      plume.rotation.x = Math.PI / 2;
      plume.position.set(x, y, 1.4 + plumeLen / 2);
      plume.name = 'plume';
      cluster.add(plume);
      this.plumeMats.push(pmat);
    }

    const lightCount = quality.level === 'low' ? 1 : 2;
    for (let i = 0; i < lightCount; i++) {
      const l = new THREE.PointLight(0x9fd4ff, 0, 220, 2);
      l.position.set(0, 0, CLUSTER_Z + 8 + i * 24);
      this.group.add(l);
      this.engineLights.push(l);
    }

    /* ------------------------------------------------------------- greebles */
    if (quality.greebleScale > 0) {
      const dorsal = greebleField(structure, {
        count: Math.round(140 * quality.greebleScale),
        area: { x: [-6.4, 6.4], z: [-34, 44] },
        y: 6.6,
        minSize: 0.5,
        maxSize: 2,
        maxHeight: 1.1,
        seed: `${seed}-greeble-d`,
        towerChance: 0.07,
        mask: (x, z) => Math.abs(x) < 6.2 && z > -36 && z < 45,
      });
      this.group.add(dorsal);
      const ventral = greebleField(structure, {
        count: Math.round(90 * quality.greebleScale),
        area: { x: [-6, 6], z: [-30, 40] },
        y: -6.4,
        minSize: 0.5,
        maxSize: 1.7,
        maxHeight: 0.9,
        seed: `${seed}-greeble-v`,
      });
      ventral.scale.y = -1;
      this.group.add(ventral);
    }

    /* -------------------------------------------------------------- turrets */
    for (const [x, y, z, up] of [
      [0, 8.6, -14, 1],
      [0, -8.4, 12, -1],
    ] as Array<[number, number, number, number]>) {
      const t = new Turret({
        scale: 1.1,
        barrels: 2,
        hullColor: PALETTE.rebelHullShadow,
        boltColor: PALETTE.laserRed,
        slew: 1.6,
        name: 'RunnerTurret',
      });
      t.group.position.set(x, y, z);
      if (up < 0) t.group.rotation.z = Math.PI;
      this.group.add(t.group);
      this.turrets.push(t);
    }

    /* -------------------------------------------------- running / nav lights */
    const navSpots: Array<[number, number, number, string]> = [
      [-17.8, 2.6, HEAD_Z, '#ff4444'],
      [17.8, 2.6, HEAD_Z, '#44ff88'],
      [0, 13.2, BODY_Z - 4, '#ffffff'],
      [0, -8, 20, '#ffffff'],
    ];
    for (const [x, y, z, colour] of navSpots) {
      const lamp = new THREE.Mesh(
        new THREE.SphereGeometry(0.5, 8, 6),
        emissiveMaterial(`nav${colour}`, colour, 3).clone(),
      );
      lamp.position.set(x, y, z);
      this.group.add(lamp);
      this.runningLights.push(lamp);
    }

    /* -------------------------------------------------------- battle damage */
    for (let i = 0; i < 7; i++) {
      const decalMat = new THREE.MeshBasicMaterial({
        color: '#17130f',
        map: flareTex,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        toneMapped: false,
      });
      const decal = new THREE.Mesh(new THREE.PlaneGeometry(rng.range(5, 11), rng.range(5, 10)), decalMat);
      const side = rng.chance(0.5) ? 1 : -1;
      decal.position.set(side * 8.6, rng.range(-3.5, 4.5), rng.range(-34, 40));
      decal.rotation.y = (side * Math.PI) / 2;
      decal.visible = false;
      this.group.add(decal);
      this.damageDecals.push(decal);
    }

    /* -------------------------------------------------------------- anchors */
    const mk = (name: string, x: number, y: number, z: number) => {
      const o = new THREE.Object3D();
      o.name = name;
      o.position.set(x, y, z);
      this.group.add(o);
      return o;
    };
    this.anchors = {
      dockPort: mk('DockPort', 9.8, 0, -4),
      podBay: mk('PodBay', -10.4, -0.4, 13.6),
      bridge: mk('BridgeAnchor', 0, 6.4, HEAD_Z - 8),
      engineCluster: cluster,
      noseTip: mk('NoseTip', 0, 2.6, HEAD_Z - 14),
    };
  }

  /** 0 = engines cold, 1 = full burn. Drives glow, plume and light spill. */
  setThrottle(v: number): void {
    this.throttle = THREE.MathUtils.clamp(v, 0, 1);
  }

  /** 0 = pristine, 1 = disabled. Reveals scorching and kills the drive. */
  setDamage(v: number): void {
    this.damage = THREE.MathUtils.clamp(v, 0, 1);
    for (let i = 0; i < this.damageDecals.length; i++) {
      const d = this.damageDecals[i];
      const threshold = ((i + 0.5) / this.damageDecals.length) * 0.85;
      const on = this.damage > threshold;
      d.visible = on;
      (d.material as THREE.Material).opacity = on
        ? THREE.MathUtils.clamp((this.damage - threshold) * 3.2, 0, 0.9)
        : 0;
    }
  }

  get damageLevel(): number {
    return this.damage;
  }

  update(dt: number, elapsed: number): void {
    const power = this.throttle * (1 - this.damage);
    const flicker = 0.9 + Math.sin(elapsed * 21.7) * 0.05 + Math.sin(elapsed * 7.3) * 0.05;
    const level = power * flicker;

    this.engineMat.emissiveIntensity = 0.1 + level * 1.15;
    for (const f of this.engineFlares) {
      (f.material as THREE.MeshBasicMaterial).opacity = 0.16 * level;
      f.visible = level > 0.01;
    }
    for (const m of this.plumeMats) m.uniforms.uIntensity.value = 0.5 * level;
    for (const c of this.engineCores) c.visible = level > 0.004;
    for (const l of this.engineLights) l.intensity = 700 * level;

    // Running lights keep blinking even when the drive is dead: powerless,
    // but not destroyed.
    const blink = Math.sin(elapsed * 2.1) > 0.6 ? 1 : 0.15;
    for (const lamp of this.runningLights) {
      (lamp.material as THREE.MeshStandardMaterial).emissiveIntensity = 3.2 * blink * (1 - this.damage * 0.5);
    }
    const failing = this.damage > 0.6 && Math.sin(elapsed * 14) < 0 ? 0.35 : 1;
    this.windowMat.emissiveIntensity = 0.9 * (1 - this.damage * 0.45) * failing;

    for (const t of this.turrets) t.update(dt);
  }
}
