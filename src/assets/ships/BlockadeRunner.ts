import * as THREE from 'three';
import { Rng } from '../../core/Rng';
import { clamp, flash, saturate } from '../../core/mathx';
import type { MaterialLibrary } from '../materials';
import { PALETTE } from '../materials';
import {
  bevelBox, greebleField, loftGeometry, mergeAll, mirrored, roundedRectProfile,
  stationLookup, type LoftStation,
} from '../geometry';

/**
 * Rebel blockade runner - a 150 m diplomatic corvette.
 *
 * Silhouette notes: wide flattened "hammerhead" bow, a narrow neck, a long
 * cylindrical body that swells toward the stern, and an eleven-thruster engine
 * block. Local space: nose at +Z, dorsal at +Y, 1 unit = 1 metre, origin at the
 * hull's centre of volume.
 */

export const RUNNER_LENGTH = 150;

interface Thruster {
  mesh: THREE.Mesh;
  halo: THREE.Sprite;
  baseScale: number;
}

export interface DamageEvent {
  /** Timeline time of the impact. */
  time: number;
  /** Local-space position on the hull. */
  position: THREE.Vector3;
  /** 0..1 - drives shake, flash size and spark count. */
  strength: number;
  /** True when the shield absorbed it (blue bloom instead of a hull scar). */
  shielded: boolean;
}

export class BlockadeRunner {
  readonly group = new THREE.Group();
  readonly anchors: Record<string, THREE.Object3D> = {};
  /** Hull-local points used as laser impact targets. */
  readonly hitPoints: THREE.Vector3[] = [];

  private thrusters: Thruster[] = [];
  private engineLight: THREE.PointLight;
  private shield: THREE.Mesh;
  private shieldMat: THREE.MeshBasicMaterial;
  private damage: DamageEvent[] = [];
  private scorchDecals: THREE.Mesh[] = [];
  private scorchMaterial: THREE.MeshBasicMaterial | null = null;
  private windowMeshes: THREE.Mesh[] = [];
  private engineLevel = 1;
  private rng: Rng;

  constructor(private lib: MaterialLibrary, seed = 'blockade-runner') {
    this.rng = new Rng(seed);
    this.group.name = 'BlockadeRunner';
    const q = lib.qualitySettings;

    // ---- Primary hull loft -------------------------------------------------
    const profile = roundedRectProfile(0.42, 4);
    const hullStations: LoftStation[] = [
      { z: 75, sx: 11.0, sy: 3.2 },
      { z: 70, sx: 18.5, sy: 3.9 },
      { z: 62, sx: 21.0, sy: 4.4 },
      { z: 54, sx: 19.0, sy: 4.4 },
      { z: 48, sx: 10.5, sy: 4.2 },
      { z: 42, sx: 5.2, sy: 4.0 },
      { z: 30, sx: 4.6, sy: 4.4 },
      { z: 12, sx: 5.6, sy: 5.4 },
      { z: -12, sx: 6.6, sy: 6.2 },
      { z: -40, sx: 7.4, sy: 6.8 },
      { z: -62, sx: 8.0, sy: 7.2 },
      { z: -70, sx: 8.0, sy: 7.2 },
      { z: -74, sx: 7.2, sy: 6.6 },
    ];
    const halfWidthAt = stationLookup(hullStations, 'sx');
    const halfHeightAt = stationLookup(hullStations, 'sy');
    const hullGeo = loftGeometry(profile, hullStations, true, true, new THREE.Vector2(4, 9));
    const hull = new THREE.Mesh(hullGeo, lib.rebel.hull);
    hull.name = 'runner-hull';
    hull.castShadow = hull.receiveShadow = q.shadows;
    this.group.add(hull);
    lib.registry.track(hullGeo);

    // ---- Hammerhead detailing ---------------------------------------------
    const browGeo = bevelBox(26, 2.2, 12, 0.5);
    browGeo.translate(0, 4.6, 60);
    const prong = bevelBox(3.4, 2.0, 12, 0.4);
    prong.translate(15.5, 1.0, 70);
    const bowDetail = mergeAll([browGeo, prong, mirrored(prong)]);
    if (bowDetail) {
      const m = new THREE.Mesh(bowDetail, lib.rebel.hullDark);
      m.castShadow = q.shadows;
      this.group.add(m);
      lib.registry.track(bowDetail);
    }

    // Bridge canopy on the hammerhead's dorsal face.
    const canopyGeo = new THREE.SphereGeometry(3.2, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.5);
    canopyGeo.scale(1.5, 0.55, 1.9);
    canopyGeo.translate(0, 4.3, 55);
    const canopy = new THREE.Mesh(canopyGeo, lib.rebel.hullDark);
    this.group.add(canopy);
    lib.registry.track(canopyGeo);
    const canopyGlassGeo = new THREE.SphereGeometry(3.0, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.42);
    canopyGlassGeo.scale(1.42, 0.55, 1.8);
    canopyGlassGeo.translate(0, 4.35, 55.4);
    const canopyGlass = new THREE.Mesh(canopyGlassGeo, lib.rebel.windows);
    this.group.add(canopyGlass);
    this.windowMeshes.push(canopyGlass);
    lib.registry.track(canopyGlassGeo);

    // ---- Dorsal spine + ventral keel --------------------------------------
    const spineProfile = roundedRectProfile(0.5, 3);
    const spineGeo = loftGeometry(spineProfile, [
      { z: 40, sx: 1.6, sy: 0.9, oy: 4.6 },
      { z: 10, sx: 2.4, sy: 1.5, oy: 6.0 },
      { z: -30, sx: 2.8, sy: 1.8, oy: 7.0 },
      { z: -66, sx: 2.6, sy: 1.5, oy: 7.6 },
    ]);
    const spine = new THREE.Mesh(spineGeo, lib.rebel.hullDark);
    spine.castShadow = q.shadows;
    this.group.add(spine);
    lib.registry.track(spineGeo);

    const keelGeo = loftGeometry(spineProfile, [
      { z: 34, sx: 2.0, sy: 0.8, oy: -4.4 },
      { z: -10, sx: 3.0, sy: 1.4, oy: -6.6 },
      { z: -60, sx: 3.2, sy: 1.4, oy: -7.6 },
    ]);
    const keel = new THREE.Mesh(keelGeo, lib.rebel.trench);
    this.group.add(keel);
    lib.registry.track(keelGeo);

    // ---- Engine block ------------------------------------------------------
    const blockGeo = loftGeometry(roundedRectProfile(0.3, 4), [
      { z: -66, sx: 8.4, sy: 7.4 },
      { z: -76, sx: 9.2, sy: 8.0 },
      { z: -80, sx: 9.0, sy: 7.8 },
    ]);
    const block = new THREE.Mesh(blockGeo, lib.rebel.trench);
    block.castShadow = q.shadows;
    this.group.add(block);
    lib.registry.track(blockGeo);

    const engineAnchor = new THREE.Object3D();
    engineAnchor.position.set(0, 0, -80);
    this.group.add(engineAnchor);
    this.anchors.engines = engineAnchor;

    // Eleven thrusters: one large core, an inner ring of four, an outer six.
    const layout: Array<[number, number, number]> = [[0, 0, 3.4]];
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      layout.push([Math.cos(a) * 5.1, Math.sin(a) * 4.4, 1.85]);
    }
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      layout.push([Math.cos(a) * 7.6, Math.sin(a) * 6.4, 1.05]);
    }
    for (const [x, y, r] of layout) {
      const housingGeo = new THREE.CylinderGeometry(r * 1.22, r * 1.15, 3.2, 14, 1, true);
      housingGeo.rotateX(Math.PI / 2);
      housingGeo.translate(x, y, -78.4);
      const housing = new THREE.Mesh(housingGeo, lib.rebel.greeble);
      (housing.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
      this.group.add(housing);
      lib.registry.track(housingGeo);

      const coreGeo = new THREE.CircleGeometry(r, 16);
      coreGeo.rotateY(Math.PI);
      coreGeo.translate(x, y, -80.2);
      const core = new THREE.Mesh(coreGeo, lib.rebel.engineCore);
      this.group.add(core);
      lib.registry.track(coreGeo);

      const halo = new THREE.Sprite(lib.rebel.engineHalo);
      halo.position.set(x, y, -81.5);
      halo.scale.setScalar(r * 3.0);
      this.group.add(halo);
      this.thrusters.push({ mesh: core, halo, baseScale: r * 3.0 });
    }

    this.engineLight = new THREE.PointLight(PALETTE.engineRebel, 0, 260, 2);
    this.engineLight.position.set(0, 0, -88);
    this.group.add(this.engineLight);

    // ---- Window strips along the tube -------------------------------------
    for (const side of [1, -1]) {
      const stripGeo = new THREE.PlaneGeometry(56, 1.5, 1, 1);
      stripGeo.rotateY(side > 0 ? Math.PI / 2 : -Math.PI / 2);
      stripGeo.translate(side * 6.9, 2.0, -18);
      const strip = new THREE.Mesh(stripGeo, lib.rebel.windows);
      this.group.add(strip);
      this.windowMeshes.push(strip);
      lib.registry.track(stripGeo);
    }

    // ---- Surface greebling -------------------------------------------------
    const greebleCount = Math.round(90 * q.greebleScale);
    const g1 = greebleField(this.rng.fork('greeble-top'), {
      count: greebleCount,
      bounds: new THREE.Box3(new THREE.Vector3(-5.4, 0, -66), new THREE.Vector3(5.4, 0, 34)),
      face: '+y',
      minSize: new THREE.Vector3(0.6, 0.3, 0.6),
      maxSize: new THREE.Vector3(2.8, 1.2, 4.6),
      cylinderChance: 0.2,
      yawJitter: 0.08,
      // Keep clear of the dorsal spine down the centreline.
      surface: (x, z) => (Math.abs(x) > 2.9 && Math.abs(x) < halfWidthAt(z) * 0.7 ? halfHeightAt(z) * 0.86 : null),
    });
    const g2 = greebleField(this.rng.fork('greeble-side'), {
      count: Math.round(greebleCount * 0.6),
      bounds: new THREE.Box3(new THREE.Vector3(0, -3.2, -62), new THREE.Vector3(0, 3.2, 16)),
      face: '+x',
      minSize: new THREE.Vector3(0.5, 0.25, 0.5),
      maxSize: new THREE.Vector3(3.2, 0.9, 1.6),
      surface: (z) => halfWidthAt(z) * 0.94,
    });
    const greebles = mergeAll([g1, g2, g2 ? mirrored(g2) : null]);
    if (greebles) {
      const gm = new THREE.Mesh(greebles, lib.rebel.greeble);
      gm.castShadow = q.shadows;
      this.group.add(gm);
      lib.registry.track(greebles);
    }

    // ---- Antennae ----------------------------------------------------------
    const antennaParts: THREE.BufferGeometry[] = [];
    for (const [x, z, h] of [[0, 30, 7], [3.4, -46, 5], [-3.4, -46, 5]] as const) {
      const mast = new THREE.CylinderGeometry(0.12, 0.2, h, 6);
      mast.translate(x, 5.4 + h / 2, z);
      antennaParts.push(mast);
      const tip = new THREE.SphereGeometry(0.32, 6, 5);
      tip.translate(x, 5.4 + h, z);
      antennaParts.push(tip);
    }
    const dish = new THREE.SphereGeometry(2.6, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.42);
    dish.rotateX(Math.PI);
    dish.translate(0, -7.6, -22);
    antennaParts.push(dish);
    const antennae = mergeAll(antennaParts);
    if (antennae) {
      const am = new THREE.Mesh(antennae, lib.rebel.greeble);
      this.group.add(am);
      lib.registry.track(antennae);
    }

    // ---- Red identification stripes ---------------------------------------
    const stripeParts: THREE.BufferGeometry[] = [];
    for (const side of [1, -1]) {
      const s = new THREE.PlaneGeometry(18, 1.1);
      s.rotateY(side > 0 ? Math.PI / 2 : -Math.PI / 2);
      s.translate(side * 7.2, -2.5, -40);
      stripeParts.push(s);
    }
    const nose = new THREE.PlaneGeometry(14, 1.2);
    nose.rotateX(-Math.PI / 2);
    nose.translate(0, 4.55, 64);
    stripeParts.push(nose);
    const stripes = mergeAll(stripeParts);
    if (stripes) {
      const sm = new THREE.Mesh(stripes, lib.rebel.trim);
      this.group.add(sm);
      lib.registry.track(stripes);
    }

    // ---- Deflector shield shell -------------------------------------------
    const shieldGeo = new THREE.SphereGeometry(1, 24, 16);
    shieldGeo.scale(26, 16, 88);
    this.shieldMat = new THREE.MeshBasicMaterial({
      color: 0x6fd0ff, transparent: true, opacity: 0, side: THREE.BackSide,
      blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    });
    lib.registry.track(shieldGeo);
    lib.registry.track(this.shieldMat);
    this.shield = new THREE.Mesh(shieldGeo, this.shieldMat);
    this.shield.renderOrder = 5;
    this.group.add(this.shield);

    // ---- Named anchors -----------------------------------------------------
    this.addAnchor('bridge', 0, 5.5, 56);
    this.addAnchor('dockingPort', 8.6, 0.5, -6);
    this.addAnchor('podBay', -8.4, -3.2, -34);
    this.addAnchor('dorsalTurret', 0, 9.2, -6);
    this.addAnchor('ventralTurret', 0, -8.4, -6);
    this.addAnchor('nose', 0, 1, 76);
    this.addAnchor('tail', 0, 0, -82);

    // Deterministic impact targets spread over the aft two thirds of the hull.
    const hitRng = this.rng.fork('hits');
    for (let i = 0; i < 24; i++) {
      const z = hitRng.range(-70, 30);
      const a = hitRng.range(0, Math.PI * 2);
      const rx = 7.4;
      const ry = 6.6;
      this.hitPoints.push(new THREE.Vector3(Math.cos(a) * rx, Math.sin(a) * ry, z));
    }
  }

  private addAnchor(name: string, x: number, y: number, z: number): THREE.Object3D {
    const o = new THREE.Object3D();
    o.name = `runner:${name}`;
    o.position.set(x, y, z);
    this.group.add(o);
    this.anchors[name] = o;
    return o;
  }

  /** Register hull impacts up front so playback stays a pure function of time. */
  setDamageEvents(events: DamageEvent[]): void {
    this.damage = [...events].sort((a, b) => a.time - b.time);

    // Persistent scorch decals appear as the battle progresses.
    for (const scar of this.scorchDecals) {
      scar.parent?.remove(scar);
      scar.geometry.dispose();
    }
    this.scorchDecals = [];
    if (!this.scorchMaterial) {
      this.scorchMaterial = new THREE.MeshBasicMaterial({
        map: this.lib.smokeSprite, color: 0x120f0c, transparent: true, opacity: 0.85,
        depthWrite: false, toneMapped: false,
      });
      this.lib.registry.track(this.scorchMaterial);
    }
    for (const ev of this.damage) {
      if (ev.shielded) continue;
      const size = 3 + ev.strength * 7;
      const geo = new THREE.PlaneGeometry(size, size);
      this.lib.registry.track(geo);
      const m = new THREE.Mesh(geo, this.scorchMaterial);
      m.position.copy(ev.position).multiplyScalar(1.02);
      m.lookAt(m.position.clone().multiplyScalar(2));
      m.visible = false;
      m.userData.time = ev.time;
      this.group.add(m);
      this.scorchDecals.push(m);
    }
  }

  setEngineLevel(level: number): void {
    this.engineLevel = clamp(level, 0, 1.4);
  }

  /** Deterministic per-frame state. Pure function of the master timeline. */
  update(t: number): void {
    const flicker = 0.94 + Math.sin(t * 31.3) * 0.03 + Math.sin(t * 12.7) * 0.03;
    const level = this.engineLevel * flicker;

    for (const th of this.thrusters) {
      const s = th.baseScale * (0.55 + level * 0.75);
      th.halo.scale.setScalar(s);
      (th.halo.material as THREE.SpriteMaterial).opacity = saturate(level * 0.5);
      th.mesh.visible = level > 0.02;
      (th.mesh.material as THREE.MeshBasicMaterial).opacity = 1;
    }
    this.engineLight.intensity = level * 3.2;

    // Shield bloom and scorch reveal, both derived from the damage table.
    let shieldGlow = 0;
    for (const ev of this.damage) {
      const dt = t - ev.time;
      if (dt < 0 || dt > 1.6) continue;
      if (ev.shielded) shieldGlow = Math.max(shieldGlow, flash(dt / 1.6, 0.05) * ev.strength);
    }
    this.shieldMat.opacity = shieldGlow * 0.5;
    this.shield.visible = shieldGlow > 0.005;

    for (const scar of this.scorchDecals) {
      scar.visible = t >= (scar.userData.time as number);
    }

    for (const w of this.windowMeshes) {
      (w.material as THREE.MeshStandardMaterial).emissiveIntensity = 2.4;
    }
  }

  /** Camera shake contribution at time `t` from recent nearby impacts. */
  shakeAt(t: number): number {
    let s = 0;
    for (const ev of this.damage) {
      const dt = t - ev.time;
      if (dt < 0 || dt > 1.1) continue;
      s += flash(dt / 1.1, 0.03) * ev.strength;
    }
    return Math.min(1.6, s);
  }

  dispose(): void {
    this.group.clear();
  }
}
