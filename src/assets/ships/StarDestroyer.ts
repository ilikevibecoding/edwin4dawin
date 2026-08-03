import * as THREE from 'three';
import { Rng } from '../../core/Rng';
import { clamp, saturate } from '../../core/mathx';
import type { MaterialLibrary } from '../materials';
import { PALETTE } from '../materials';
import {
  bevelBox, greebleField, loftGeometry, mergeAll, mirrored, roundedRectProfile,
  stationLookup, trenchGeometry, wedgeProfile, type LoftStation,
} from '../geometry';

/**
 * Imperial destroyer - 1600 m of triangular menace.
 *
 * Silhouette notes: an enormous dagger in plan view, a wedge in section, a
 * stepped dorsal superstructure that climbs to a command tower with twin
 * geodesic domes, a recessed ventral hangar and three vast engine bells.
 * Local space: bow at +Z, dorsal at +Y, 1 unit = 1 metre.
 *
 * Scale relationship: 1600 m against the runner's 150 m, so a single frame that
 * contains both reads as roughly eleven to one - that ratio is the whole point
 * of the pursuit sequence and is never cheated.
 */

export const DESTROYER_LENGTH = 1600;

export interface TurretHandle {
  group: THREE.Group;
  yaw: THREE.Object3D;
  pitch: THREE.Object3D;
  /** World-space muzzle anchor. */
  muzzle: THREE.Object3D;
  /** Seconds of lag before this turret matches the commanded aim. */
  lag: number;
}

export class StarDestroyer {
  readonly group = new THREE.Group();
  readonly anchors: Record<string, THREE.Object3D> = {};
  readonly turrets: TurretHandle[] = [];

  private engineHalos: THREE.Sprite[] = [];
  private engineCores: THREE.Mesh[] = [];
  private engineLight: THREE.PointLight;
  private hangarLight: THREE.PointLight;
  private rng: Rng;
  private engineLevel = 1;
  private windowMats: THREE.MeshStandardMaterial[] = [];

  constructor(private lib: MaterialLibrary, seed = 'star-destroyer') {
    this.rng = new Rng(seed);
    this.group.name = 'StarDestroyer';
    const q = lib.qualitySettings;
    const wedge = wedgeProfile(0.34, 0.5);

    // ---- Primary hull ------------------------------------------------------
    const hullStations: LoftStation[] = [
      { z: 800, sx: 5, sy: 11 },
      { z: 760, sx: 34, sy: 17 },
      { z: 660, sx: 92, sy: 26 },
      { z: 480, sx: 168, sy: 38 },
      { z: 240, sx: 258, sy: 50 },
      { z: -40, sx: 350, sy: 62 },
      { z: -340, sx: 432, sy: 76 },
      { z: -600, sx: 486, sy: 88 },
      { z: -740, sx: 500, sy: 96 },
      { z: -790, sx: 496, sy: 98 },
      { z: -800, sx: 470, sy: 94 },
    ];
    const halfWidthAt = stationLookup(hullStations, 'sx');
    const halfHeightAt = stationLookup(hullStations, 'sy');
    /** Dorsal plate half-width: the wedge profile's flat top. */
    const dorsalHalfWidth = (z: number): number => halfWidthAt(z) * 0.34;
    const hullGeo = loftGeometry(wedge, hullStations, true, true, new THREE.Vector2(9, 26));
    const hull = new THREE.Mesh(hullGeo, lib.imperial.hull);
    hull.name = 'destroyer-hull';
    hull.castShadow = hull.receiveShadow = q.shadows;
    this.group.add(hull);
    lib.registry.track(hullGeo);

    // ---- Dorsal trenches ---------------------------------------------------
    const trenchParts: THREE.BufferGeometry[] = [];
    // trenchGeometry is authored width-on-X, depth-on--Y, length-on-Z, so it
    // only needs translating onto the dorsal plate - the earlier rotation stood
    // each trench on end as an 880 m slab hanging off the hull.
    for (const [x, len, z, w, d] of [[92, 880, -260, 26, 8], [176, 620, -360, 18, 7]] as const) {
      const g = trenchGeometry(len, w, d, 1);
      g.translate(x, halfHeightAt(z) + 0.5, z);
      trenchParts.push(g);
      trenchParts.push(mirrored(g));
    }
    // Long axial trench forward of the superstructure.
    const axial = trenchGeometry(700, 38, 10, 1);
    axial.translate(0, halfHeightAt(240) + 0.5, 250);
    trenchParts.push(axial);
    const trenches = mergeAll(trenchParts);
    if (trenches) {
      const tm = new THREE.Mesh(trenches, lib.imperial.trench);
      tm.receiveShadow = q.shadows;
      this.group.add(tm);
      lib.registry.track(trenches);
    }

    // ---- Stepped dorsal superstructure ------------------------------------
    const superProfile = roundedRectProfile(0.12, 2);
    const superGeo = loftGeometry(superProfile, [
      { z: -300, sx: 120, sy: 6, oy: 96 },
      { z: -420, sx: 168, sy: 26, oy: 112 },
      { z: -560, sx: 196, sy: 44, oy: 130 },
      { z: -700, sx: 196, sy: 52, oy: 138 },
      { z: -790, sx: 172, sy: 44, oy: 130 },
    ]);
    const superstructure = new THREE.Mesh(superGeo, lib.imperial.hullDark);
    superstructure.castShadow = superstructure.receiveShadow = q.shadows;
    this.group.add(superstructure);
    lib.registry.track(superGeo);

    // Second tier.
    const tier2Geo = loftGeometry(superProfile, [
      { z: -520, sx: 108, sy: 10, oy: 176 },
      { z: -600, sx: 122, sy: 30, oy: 196 },
      { z: -720, sx: 122, sy: 34, oy: 200 },
      { z: -780, sx: 100, sy: 26, oy: 192 },
    ]);
    const tier2 = new THREE.Mesh(tier2Geo, lib.imperial.hullDark);
    tier2.castShadow = q.shadows;
    this.group.add(tier2);
    lib.registry.track(tier2Geo);

    // ---- Command tower -----------------------------------------------------
    const towerGeo = bevelBox(150, 120, 130, 6);
    towerGeo.translate(0, 288, -668);
    const tower = new THREE.Mesh(towerGeo, lib.imperial.hullDark);
    tower.castShadow = q.shadows;
    this.group.add(tower);
    lib.registry.track(towerGeo);

    // Bridge head - wider than the neck, with a lit forward face.
    const bridgeGeo = bevelBox(188, 44, 92, 5);
    bridgeGeo.translate(0, 366, -654);
    const bridge = new THREE.Mesh(bridgeGeo, lib.imperial.hull);
    bridge.castShadow = q.shadows;
    this.group.add(bridge);
    lib.registry.track(bridgeGeo);

    const bridgeGlassGeo = new THREE.PlaneGeometry(170, 22);
    bridgeGlassGeo.translate(0, 368, -607.2);
    const bridgeGlass = new THREE.Mesh(bridgeGlassGeo, lib.imperial.windows);
    this.group.add(bridgeGlass);
    this.windowMats.push(lib.imperial.windows);
    lib.registry.track(bridgeGlassGeo);

    // Twin geodesic domes.
    for (const side of [1, -1]) {
      const stalkGeo = new THREE.CylinderGeometry(9, 11, 26, 10);
      stalkGeo.translate(side * 66, 400, -672);
      const stalk = new THREE.Mesh(stalkGeo, lib.imperial.trim);
      this.group.add(stalk);
      lib.registry.track(stalkGeo);

      const domeGeo = new THREE.IcosahedronGeometry(30, 1);
      domeGeo.translate(side * 66, 428, -672);
      const dome = new THREE.Mesh(domeGeo, lib.imperial.hull);
      dome.castShadow = q.shadows;
      this.group.add(dome);
      lib.registry.track(domeGeo);
    }

    // Tower window bands.
    for (const z of [-604, -732]) {
      const g = new THREE.PlaneGeometry(140, 60);
      if (z < -700) g.rotateY(Math.PI);
      g.translate(0, 292, z);
      const m = new THREE.Mesh(g, lib.imperial.windows);
      this.group.add(m);
      lib.registry.track(g);
    }

    // ---- Ventral hangar ----------------------------------------------------
    const hangarShellGeo = bevelBox(190, 46, 240, 6);
    hangarShellGeo.translate(0, -92, -640);
    const hangarShell = new THREE.Mesh(hangarShellGeo, lib.imperial.trench);
    this.group.add(hangarShell);
    lib.registry.track(hangarShellGeo);

    const hangarMouthGeo = new THREE.PlaneGeometry(150, 190);
    hangarMouthGeo.rotateX(Math.PI / 2);
    hangarMouthGeo.translate(0, -114, -640);
    const hangarMat = new THREE.MeshBasicMaterial({ color: 0xff8a3c, toneMapped: false, transparent: true, opacity: 0.85 });
    lib.registry.track(hangarMat);
    lib.registry.track(hangarMouthGeo);
    const hangarMouth = new THREE.Mesh(hangarMouthGeo, hangarMat);
    this.group.add(hangarMouth);

    this.hangarLight = new THREE.PointLight(0xffa050, 2.5, 700, 2);
    this.hangarLight.position.set(0, -150, -640);
    this.group.add(this.hangarLight);

    // ---- Engines -----------------------------------------------------------
    const engineLayout: Array<[number, number, number]> = [
      [0, 30, 78], [-190, 26, 62], [190, 26, 62],
      [-330, 10, 34], [330, 10, 34], [-95, -34, 30], [95, -34, 30],
    ];
    for (const [x, y, r] of engineLayout) {
      const bellGeo = new THREE.CylinderGeometry(r * 1.12, r * 1.24, 44, 20, 1, true);
      bellGeo.rotateX(Math.PI / 2);
      bellGeo.translate(x, y, -812);
      const bell = new THREE.Mesh(bellGeo, lib.imperial.trench);
      (bell.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
      this.group.add(bell);
      lib.registry.track(bellGeo);

      // Recessed glow disc rather than a flat white circle at the nozzle mouth.
      const coreGeo = new THREE.CircleGeometry(r * 0.96, 20);
      coreGeo.rotateY(Math.PI);
      coreGeo.translate(x, y, -826);
      const core = new THREE.Mesh(coreGeo, lib.imperial.engineCore);
      this.group.add(core);
      this.engineCores.push(core);
      lib.registry.track(coreGeo);

      const halo = new THREE.Sprite(lib.imperial.engineHalo);
      halo.position.set(x, y, -840);
      halo.scale.setScalar(r * 2.1);
      halo.userData.baseScale = r * 2.1;
      this.group.add(halo);
      this.engineHalos.push(halo);
    }

    this.engineLight = new THREE.PointLight(PALETTE.engineBlue, 0, 3200, 2);
    this.engineLight.position.set(0, 20, -900);
    this.group.add(this.engineLight);

    // ---- Surface greebling -------------------------------------------------
    const gs = lib.qualitySettings.greebleScale;
    const greebleParts: (THREE.BufferGeometry | null)[] = [];
    greebleParts.push(greebleField(this.rng.fork('dorsal'), {
      count: Math.round(320 * gs),
      bounds: new THREE.Box3(new THREE.Vector3(-460, 0, -560), new THREE.Vector3(460, 0, 640)),
      face: '+y',
      minSize: new THREE.Vector3(6, 2.5, 8),
      maxSize: new THREE.Vector3(30, 11, 70),
      cylinderChance: 0.14,
      yawJitter: 0.06,
      // Only the flat dorsal plate carries surface fittings; the chamfered
      // flanks stay clean so the wedge silhouette reads.
      surface: (x, z) => (Math.abs(x) < dorsalHalfWidth(z) - 14 ? halfHeightAt(z) : null),
    }));
    greebleParts.push(greebleField(this.rng.fork('ventral'), {
      count: Math.round(220 * gs),
      bounds: new THREE.Box3(new THREE.Vector3(-470, 0, -700), new THREE.Vector3(470, 0, 480)),
      face: '-y',
      minSize: new THREE.Vector3(6, 2.5, 8),
      maxSize: new THREE.Vector3(34, 10, 62),
      cylinderChance: 0.22,
      yawJitter: 0.05,
      surface: (x, z) => (Math.abs(x) < halfWidthAt(z) * 0.9 - 16 ? -halfHeightAt(z) : null),
    }));
    greebleParts.push(greebleField(this.rng.fork('tower'), {
      count: Math.round(70 * gs),
      bounds: new THREE.Box3(new THREE.Vector3(-86, 0, -716), new THREE.Vector3(86, 0, -624)),
      face: '+y',
      minSize: new THREE.Vector3(3, 1.5, 3),
      maxSize: new THREE.Vector3(14, 9, 16),
      cylinderChance: 0.3,
      surface: () => 348,
    }));
    const greebles = mergeAll(greebleParts);
    if (greebles) {
      const gm = new THREE.Mesh(greebles, lib.imperial.greeble);
      gm.castShadow = gm.receiveShadow = q.shadows;
      this.group.add(gm);
      lib.registry.track(greebles);
    }

    // ---- Hull window bands (tiny lights that sell the scale) ---------------
    const bandParts: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 5; i++) {
      const z = -720 + i * 90;
      const g = new THREE.PlaneGeometry(150, 9);
      g.rotateY(Math.PI / 2);
      g.translate(-1, 40, z);
      bandParts.push(g);
      bandParts.push(mirrored(g));
    }
    // Ventral running lights: the cheapest, most effective way to communicate
    // 1.6 km of hull when the belly is the only thing the camera can see.
    for (let i = 0; i < 26; i++) {
      const f = i / 25;
      const z = 700 - f * 1480;
      const halfWidth = 20 + f * 440;
      for (const side of [-1, 1]) {
        const g = new THREE.PlaneGeometry(26, 8);
        g.rotateX(Math.PI / 2);
        g.translate(side * halfWidth, -60 - f * 36, z);
        bandParts.push(g);
      }
    }
    for (let i = 0; i < 10; i++) {
      const g = new THREE.PlaneGeometry(90, 10);
      g.rotateX(Math.PI / 2);
      g.translate(0, -66 - i * 3, 420 - i * 120);
      bandParts.push(g);
    }
    const bands = mergeAll(bandParts);
    if (bands) {
      const bm = new THREE.Mesh(bands, lib.imperial.windows);
      bm.name = 'destroyer-lights';
      this.group.add(bm);
      lib.registry.track(bands);
    }

    // ---- Turbolaser turrets ------------------------------------------------
    const turretSpots: Array<[number, number, number]> = [
      [-250, 96, -170], [250, 96, -170],
      [-186, 96, 90], [186, 96, 90],
      [-320, 96, -420], [320, 96, -420],
    ];
    turretSpots.forEach((spot, i) => this.turrets.push(this.buildTurret(spot, i)));

    // ---- Named anchors -----------------------------------------------------
    this.addAnchor('bow', 0, 0, 810);
    this.addAnchor('bridge', 0, 380, -640);
    this.addAnchor('hangar', 0, -140, -640);
    this.addAnchor('ventralCentre', 0, -100, -100);
    this.addAnchor('portFlank', -520, 0, -300);
    this.addAnchor('starboardFlank', 520, 0, -300);
    this.addAnchor('dockingClamp', 300, -110, 60);
    this.addAnchor('engines', 0, 20, -840);
  }

  private buildTurret(position: [number, number, number], index: number): TurretHandle {
    const lib = this.lib;
    const group = new THREE.Group();
    group.position.set(...position);
    group.name = `turret-${index}`;

    const baseGeo = new THREE.CylinderGeometry(16, 19, 9, 12);
    const base = new THREE.Mesh(baseGeo, lib.imperial.trim);
    base.position.y = 4.5;
    group.add(base);
    lib.registry.track(baseGeo);

    const yaw = new THREE.Object3D();
    yaw.position.y = 9;
    group.add(yaw);

    const housingGeo = bevelBox(22, 12, 26, 2);
    const housing = new THREE.Mesh(housingGeo, lib.imperial.hullDark);
    housing.position.y = 6;
    yaw.add(housing);
    lib.registry.track(housingGeo);

    const pitch = new THREE.Object3D();
    pitch.position.set(0, 8, 6);
    yaw.add(pitch);

    const barrelParts: THREE.BufferGeometry[] = [];
    for (const side of [-1, 1]) {
      const b = new THREE.CylinderGeometry(2.4, 3.0, 40, 8);
      b.rotateX(Math.PI / 2);
      b.translate(side * 5, 0, 18);
      barrelParts.push(b);
      const tip = new THREE.CylinderGeometry(3.4, 2.6, 7, 8);
      tip.rotateX(Math.PI / 2);
      tip.translate(side * 5, 0, 36);
      barrelParts.push(tip);
    }
    const barrels = mergeAll(barrelParts);
    if (barrels) {
      const bm = new THREE.Mesh(barrels, lib.imperial.trim);
      pitch.add(bm);
      lib.registry.track(barrels);
    }

    const muzzle = new THREE.Object3D();
    muzzle.position.set(0, 0, 40);
    pitch.add(muzzle);

    this.group.add(group);
    return { group, yaw, pitch, muzzle, lag: 0.18 + (index % 3) * 0.09 };
  }

  private addAnchor(name: string, x: number, y: number, z: number): THREE.Object3D {
    const o = new THREE.Object3D();
    o.name = `destroyer:${name}`;
    o.position.set(x, y, z);
    this.group.add(o);
    this.anchors[name] = o;
    return o;
  }

  setEngineLevel(level: number): void {
    this.engineLevel = clamp(level, 0, 1.4);
  }

  /** Point every turret at a world-space target with per-turret tracking lag. */
  aimTurrets(worldTarget: THREE.Vector3, t: number): void {
    const local = new THREE.Vector3();
    for (const turret of this.turrets) {
      local.copy(worldTarget);
      this.group.worldToLocal(local);
      local.sub(turret.group.position);
      // Lag is modelled as aiming at where the target was `lag` seconds ago,
      // approximated by easing the angle - deterministic and readable.
      const yawTarget = Math.atan2(local.x, local.z);
      const dist = Math.hypot(local.x, local.z);
      const pitchTarget = Math.atan2(local.y, dist);
      const wobble = Math.sin(t * 0.9 + turret.lag * 11) * 0.012;
      turret.yaw.rotation.y = yawTarget + wobble;
      turret.pitch.rotation.x = -clamp(pitchTarget, -0.9, 0.9) + wobble * 0.4;
    }
  }

  update(t: number): void {
    const flicker = 0.96 + Math.sin(t * 8.7) * 0.02 + Math.sin(t * 3.1) * 0.02;
    const level = this.engineLevel * flicker;
    for (const halo of this.engineHalos) {
      const base = halo.userData.baseScale as number;
      halo.scale.setScalar(base * (0.6 + level * 0.62));
      (halo.material as THREE.SpriteMaterial).opacity = saturate(level) * 0.42;
    }
    for (const core of this.engineCores) core.visible = level > 0.02;
    this.engineLight.intensity = level * 6;
    this.hangarLight.intensity = 2.2 + Math.sin(t * 1.7) * 0.2;
  }

  dispose(): void {
    this.group.clear();
  }
}
