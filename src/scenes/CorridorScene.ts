import * as THREE from 'three';
import { MaterialLibrary, PALETTE } from '../assets/materials';
import { Character, type StateKey } from '../assets/characters/CharacterRig';
import { createLeia, createRebel, createStormtrooper, createVader } from '../assets/characters/cast';
import { Astromech, ProtocolDroid } from '../assets/characters/Droids';
import {
  AlarmLight, BlastDoor, CORRIDOR_HALF_WIDTH, ControlPanel, CorridorRun,
} from '../assets/interior/CorridorKit';
import { DataProjection } from '../assets/interior/DataProjection';
import { BoltField, type BoltEvent } from '../effects/BoltField';
import { FlashField, type FlashEvent } from '../effects/FlashField';
import { ParticleField, type Emission } from '../effects/ParticleField';
import { DebrisField } from '../effects/DebrisField';
import { VectorTrack } from '../timeline/tracks';
import { Rng } from '../core/Rng';
import { clamp, flash, saturate, smoothstep } from '../core/mathx';
import { bevelBox, mergeAll } from '../assets/geometry';

/**
 * The interior act: corridor defence, the transfer of the plans, and the run
 * to the pod.
 *
 * Geography is deliberately simple and never violated, so the viewer always
 * knows which way is "toward the Empire":
 *
 *      -Z  [ breached blast door ]  ...  firefight  ...  junction  ...  pod bay  +Z
 *
 * Imperials always come from -Z. Rebels always defend toward -Z. The archive
 * alcove opens off -X at the junction; the pod hatch is on -X at the far end.
 */

export const DOOR_Z = -8;
export const BREACH_GLOW_START = 206;
export const BREACH_TIME = 218.6;
/** Centre of the widened archive junction. */
export const JUNCTION_Z = 26.5;
export const JUNCTION_HALF_WIDTH = 3.4;
/** X of the archive console's face. */
export const ARCHIVE_X = -3.3;
/** Centre of the widened pod bay. */
export const POD_BAY_Z = 47;
export const POD_BAY_HALF_WIDTH = 2.8;

export interface CorridorBoltPlan {
  t0: number;
  from: THREE.Vector3;
  to: THREE.Vector3;
  imperial: boolean;
}

export class CorridorScene {
  readonly scene = new THREE.Scene();
  readonly root = new THREE.Group();
  readonly door: BlastDoor;
  readonly runs: CorridorRun[] = [];
  readonly rebels: Character[] = [];
  readonly troopers: Character[] = [];
  readonly vader: Character;
  readonly leia: Character;
  readonly r2: Astromech;
  readonly threepio: ProtocolDroid;
  readonly plans: DataProjection;
  readonly consoles: ControlPanel[] = [];
  readonly alarms: AlarmLight[] = [];
  readonly selectable: Array<{ object: THREE.Object3D; id: string }> = [];

  private bolts: BoltField;
  private sparks: ParticleField;
  private smoke: ParticleField;
  private debris: DebrisField;
  private flashes: FlashField;
  private keyLight: THREE.DirectionalLight;
  private fillLight: THREE.HemisphereLight;
  private ambient: THREE.AmbientLight;
  private vaderRim: THREE.PointLight;
  private vaderKey: THREE.PointLight;
  private archiveLight: THREE.PointLight;
  private archiveFill: THREE.PointLight;
  private doorwayGlow: THREE.PointLight;
  private breachLight: THREE.PointLight;
  private podHatch: THREE.Group;
  private podHatchGlow: THREE.MeshBasicMaterial;
  private podBayLight: THREE.PointLight;
  private transferBeam: THREE.Mesh;
  private transferBeamMat: THREE.MeshBasicMaterial;
  private rng = new Rng('corridor-scene');
  private boltPlans: CorridorBoltPlan[] = [];

  constructor(lib: MaterialLibrary) {
    this.scene.name = 'CorridorScene';
    this.scene.background = new THREE.Color(0x05070a);
    this.scene.add(this.root);

    // ---- Architecture ------------------------------------------------------
    // Straight spine: fighting corridor -> widened archive junction -> aft run
    // -> widened pod bay. Nothing branches, so screen direction is trivial to
    // preserve and the viewer always knows where the Empire is.
    const JUNCTION_Z0 = 22.5;
    const JUNCTION_Z1 = 30.5;
    const POD_Z0 = 43;
    const POD_Z1 = 52;

    const main = new CorridorRun(lib, { z0: DOOR_Z, z1: JUNCTION_Z0, seed: 'main-run' });
    this.runs.push(main);
    this.root.add(main.group);

    const junction = new CorridorRun(lib, {
      z0: JUNCTION_Z0, z1: JUNCTION_Z1, halfWidth: JUNCTION_HALF_WIDTH, height: 2.92, ribs: false, seed: 'junction',
    });
    this.runs.push(junction);
    this.root.add(junction.group);

    const aft = new CorridorRun(lib, { z0: JUNCTION_Z1, z1: POD_Z0, seed: 'aft-run' });
    this.runs.push(aft);
    this.root.add(aft.group);

    const podBay = new CorridorRun(lib, {
      z0: POD_Z0, z1: POD_Z1, halfWidth: POD_BAY_HALF_WIDTH, height: 2.9, ribs: false, seed: 'pod-bay',
    });
    this.runs.push(podBay);
    this.root.add(podBay.group);

    // Filler walls where a narrow run meets a wide one.
    const addShoulder = (z: number, innerHalf: number, outerHalf: number, height: number): void => {
      for (const side of [-1, 1]) {
        for (const facing of [0, Math.PI]) {
          const w = outerHalf - innerHalf;
          const g = new THREE.PlaneGeometry(w, height);
          if (facing) g.rotateY(Math.PI);
          g.translate(side * (innerHalf + w / 2), height / 2, z + (facing ? -0.01 : 0.01));
          lib.registry.track(g);
          const m = new THREE.Mesh(g, lib.interiorWallDark);
          m.receiveShadow = true;
          this.root.add(m);
        }
      }
    };
    addShoulder(JUNCTION_Z0, CORRIDOR_HALF_WIDTH, JUNCTION_HALF_WIDTH, 2.92);
    addShoulder(JUNCTION_Z1, CORRIDOR_HALF_WIDTH, JUNCTION_HALF_WIDTH, 2.92);
    addShoulder(POD_Z0, CORRIDOR_HALF_WIDTH, POD_BAY_HALF_WIDTH, 2.9);

    // Cap the far end so the corridor never reads as an open tube.
    const capGeo = new THREE.PlaneGeometry(POD_BAY_HALF_WIDTH * 2, 2.9);
    capGeo.rotateY(Math.PI);
    capGeo.translate(0, 1.45, POD_Z1);
    lib.registry.track(capGeo);
    this.root.add(new THREE.Mesh(capGeo, lib.interiorWallDark));

    // Imperial side of the door: a dark boarding tube the troopers emerge from.
    const tube = new CorridorRun(lib, { z0: DOOR_Z - 9, z1: DOOR_Z, halfWidth: 1.6, height: 2.5, seed: 'boarding-tube' });
    tube.group.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh && m.material === lib.interiorWall) m.material = lib.interiorWallDark;
    });
    this.runs.push(tube);
    this.root.add(tube.group);

    this.door = new BlastDoor(lib, {
      z: DOOR_Z, breachStart: BREACH_GLOW_START, breachTime: BREACH_TIME, facing: 1,
    });
    this.root.add(this.door.group);

    // Archive console the princess works at, on the -X wall of the junction.
    const archive = new ControlPanel(lib, 1.7, 1.05);
    archive.group.position.set(ARCHIVE_X - 0.04, 1.24, JUNCTION_Z);
    archive.group.rotation.y = Math.PI / 2;
    this.consoles.push(archive);
    this.root.add(archive.group);

    // A shallow equipment bank flanking it, so the archive reads as a station.
    const bankParts: THREE.BufferGeometry[] = [];
    for (const dz of [-1.85, 1.85]) {
      const g = bevelBox(0.34, 1.8, 1.0, 0.05);
      g.translate(ARCHIVE_X + 0.06, 0.9, JUNCTION_Z + dz);
      bankParts.push(g);
    }
    const bank = mergeAll(bankParts);
    if (bank) {
      // Machinery grey, not the dark metallic trim. In the archive wide shot the
      // trim material drops to near black and the lit wall panels either side of
      // it look like they are floating in a hole.
      const bm = new THREE.Mesh(bank, lib.interiorWallDark);
      bm.castShadow = bm.receiveShadow = true;
      bm.name = 'archive bank';
      this.root.add(bm);
      lib.registry.track(bank);
    }
    const bankStrip = lib.registry.track(new THREE.MeshBasicMaterial({
      color: 0x7fc6a8, transparent: true, opacity: 0.7, toneMapped: false,
    }));
    for (const dz of [-1.85, 1.85]) {
      const strip = new THREE.Mesh(lib.registry.track(new THREE.PlaneGeometry(0.62, 0.05)), bankStrip);
      strip.rotation.y = Math.PI / 2;
      strip.position.set(ARCHIVE_X + 0.24, 1.42, JUNCTION_Z + dz);
      this.root.add(strip);
    }

    // Corridor wall consoles.
    for (const [x, z, ry] of [[-CORRIDOR_HALF_WIDTH + 0.1, 4, Math.PI / 2], [CORRIDOR_HALF_WIDTH - 0.1, 16, -Math.PI / 2], [CORRIDOR_HALF_WIDTH - 0.1, 38, -Math.PI / 2]] as const) {
      const p = new ControlPanel(lib, 0.9, 0.62);
      p.group.position.set(x, 1.3, z);
      p.group.rotation.y = ry;
      this.consoles.push(p);
      this.root.add(p.group);
    }

    // Alarm beacons.
    for (let i = 0; i < 6; i++) {
      const z = -4 + i * 9;
      const side = i % 2 === 0 ? -1 : 1;
      const a = new AlarmLight(lib, i * 1.1);
      a.group.position.set(side * (CORRIDOR_HALF_WIDTH - 0.12), 2.05, z);
      this.alarms.push(a);
      this.root.add(a.group);
    }

    // Crates used as cover.
    const crateParts: THREE.BufferGeometry[] = [];
    for (const [x, z, w, h, d] of [
      [-1.24, 9.4, 0.78, 0.62, 0.66], [1.28, 11.6, 0.72, 0.7, 0.7],
      [-1.3, 14.2, 0.74, 0.5, 0.86], [1.26, 16.8, 0.7, 0.56, 0.62],
    ] as const) {
      const g = bevelBox(w, h, d, 0.04);
      g.translate(x, h / 2, z);
      crateParts.push(g);
    }
    const crates = mergeAll(crateParts);
    if (crates) {
      const cm = new THREE.Mesh(crates, lib.interiorTrim);
      cm.castShadow = cm.receiveShadow = true;
      cm.name = 'cargo crates';
      this.root.add(cm);
      lib.registry.track(crates);
    }

    // Pod hatch on -X at the far end. This is where the story is going, so it
    // has to be obviously a way off the ship from across the bay: a lit
    // surround, hazard chevrons, a marked airlock ring and a green ready sign.
    this.podHatch = new THREE.Group();
    this.podHatch.position.set(-POD_BAY_HALF_WIDTH + 0.02, 0, POD_BAY_Z);

    const hatchDoorGeo = bevelBox(0.12, 1.92, 1.5, 0.05);
    lib.registry.track(hatchDoorGeo);
    const hatchDoor = new THREE.Mesh(hatchDoorGeo, lib.doorMetal);
    hatchDoor.position.set(0.02, 1.0, 0);
    hatchDoor.name = 'pod hatch';
    this.podHatch.add(hatchDoor);

    // A surround built from four bars, not one slab. A solid frame box in front
    // of the door hides the door completely and the whole hatch reads as a hole
    // punched in the wall.
    const surround: THREE.BufferGeometry[] = [
      bevelBox(0.12, 0.17, 2.06, 0.04).translate(0, 2.05, 0),
      bevelBox(0.12, 0.15, 2.06, 0.04).translate(0, 0.07, 0),
      bevelBox(0.12, 2.12, 0.17, 0.04).translate(0, 1.06, -0.94),
      bevelBox(0.12, 2.12, 0.17, 0.04).translate(0, 1.06, 0.94),
    ];
    const surroundGeo = mergeAll(surround);
    if (surroundGeo) {
      lib.registry.track(surroundGeo);
      const sm = new THREE.Mesh(surroundGeo, lib.interiorTrim);
      sm.position.x = 0.09;
      sm.castShadow = true;
      this.podHatch.add(sm);
    }

    // Airlock collar: a ring on the door face reads as a docking interface even
    // in a wide shot where nothing else on it is resolvable.
    const collarGeo = new THREE.TorusGeometry(0.52, 0.06, 8, 22);
    collarGeo.rotateY(Math.PI / 2);
    lib.registry.track(collarGeo);
    const collar = new THREE.Mesh(collarGeo, lib.doorMetal);
    collar.position.set(0.09, 1.16, 0);
    this.podHatch.add(collar);
    const portGeo = new THREE.CircleGeometry(0.2, 20);
    portGeo.rotateY(-Math.PI / 2);
    lib.registry.track(portGeo);
    const port = new THREE.Mesh(portGeo, lib.registry.track(new THREE.MeshBasicMaterial({
      color: 0x9ec6e6, transparent: true, opacity: 0.6, toneMapped: false,
    })));
    port.position.set(0.1, 1.16, 0);
    this.podHatch.add(port);

    // Hazard chevrons above and below the opening.
    const chevron = lib.registry.track(new THREE.MeshStandardMaterial({
      color: 0xd9a13a, roughness: 0.6, metalness: 0.1,
    }));
    for (const y of [2.05, 0.07]) {
      for (let i = -2; i <= 2; i++) {
        const bar = new THREE.Mesh(lib.registry.track(new THREE.BoxGeometry(0.035, 0.13, 0.24)), chevron);
        bar.position.set(0.16, y, i * 0.36);
        bar.rotation.x = 0.62;
        this.podHatch.add(bar);
      }
    }

    this.podHatchGlow = new THREE.MeshBasicMaterial({
      color: 0x54d98c, transparent: true, opacity: 0.85, toneMapped: false,
    });
    lib.registry.track(this.podHatchGlow);
    const sign = new THREE.Mesh(lib.registry.track(new THREE.PlaneGeometry(0.86, 0.2)), this.podHatchGlow);
    sign.rotation.y = -Math.PI / 2;
    sign.position.set(0.14, 2.34, 0);
    this.podHatch.add(sign);
    for (const z of [-1.12, 1.12]) {
      const lamp = new THREE.Mesh(
        lib.registry.track(new THREE.BoxGeometry(0.04, 0.55, 0.08)),
        this.podHatchGlow,
      );
      lamp.position.set(0.1, 1.15, z);
      this.podHatch.add(lamp);
    }
    this.root.add(this.podHatch);

    this.podBayLight = new THREE.PointLight(0xcfe2d6, 0, 8, 2);
    this.podBayLight.position.set(-1.1, 1.9, POD_BAY_Z);
    this.scene.add(this.podBayLight);

    // ---- Lighting ----------------------------------------------------------
    // One shadow-casting key from above gives every character a contact shadow
    // without paying for shadow maps on the practical lights.
    this.keyLight = new THREE.DirectionalLight(0xfff2e2, 1.15);
    this.keyLight.position.set(3.5, 12, 14);
    this.keyLight.target.position.set(0, 0, 14);
    this.keyLight.castShadow = lib.qualitySettings.shadows;
    const sm = lib.qualitySettings.shadowMapSize;
    this.keyLight.shadow.mapSize.set(sm, sm);
    this.keyLight.shadow.camera.left = -8;
    this.keyLight.shadow.camera.right = 8;
    this.keyLight.shadow.camera.top = 34;
    this.keyLight.shadow.camera.bottom = -34;
    this.keyLight.shadow.camera.near = 1;
    this.keyLight.shadow.camera.far = 40;
    this.keyLight.shadow.bias = -0.0012;
    this.keyLight.shadow.normalBias = 0.02;
    this.scene.add(this.keyLight);
    this.scene.add(this.keyLight.target);

    this.fillLight = new THREE.HemisphereLight(0xdfe6f2, 0x2a2620, 0.5);
    this.scene.add(this.fillLight);
    this.ambient = new THREE.AmbientLight(0xffffff, 0.22);
    this.scene.add(this.ambient);

    // Two lights follow him: a red wash from behind that separates him from the
    // smoke, and a small cool key ahead so the helmet reads instead of becoming
    // a featureless hole.
    this.vaderRim = new THREE.PointLight(0xff3a2a, 0, 14, 2);
    this.vaderRim.position.set(0, 2.1, DOOR_Z - 1.5);
    this.scene.add(this.vaderRim);

    this.vaderKey = new THREE.PointLight(0xd6e4ff, 0, 10, 2);
    this.vaderKey.position.set(0.5, 1.9, 0);
    this.scene.add(this.vaderKey);

    this.breachLight = new THREE.PointLight(0xffb070, 0, 22, 2);
    this.breachLight.position.set(0, 1.4, DOOR_Z + 1);
    this.scene.add(this.breachLight);

    // Warm practical over the archive station, and a dim residual glow from the
    // boarding tube so the breached doorway keeps reading after the flash.
    this.archiveLight = new THREE.PointLight(0xffe6c8, 1.5, 9, 2);
    this.archiveLight.position.set(-1.9, 2.5, 25.6);
    this.scene.add(this.archiveLight);

    this.archiveFill = new THREE.PointLight(0xbfd4f0, 0, 12, 2);
    this.archiveFill.position.set(1.4, 1.9, 24.2);
    this.scene.add(this.archiveFill);

    this.doorwayGlow = new THREE.PointLight(0xffb27a, 0, 16, 2);
    this.doorwayGlow.position.set(0, 1.5, DOOR_Z - 2.2);
    this.scene.add(this.doorwayGlow);

    // ---- Effects -----------------------------------------------------------
    const q = lib.qualitySettings;
    this.bolts = new BoltField(lib, 40, 'corridor-bolts');
    this.root.add(this.bolts.mesh, this.bolts.glow);

    this.sparks = new ParticleField(lib, {
      name: 'corridor-sparks',
      capacity: Math.round(3000 * q.particleScale),
      texture: lib.sparkSprite,
      drag: 1.6, gravity: new THREE.Vector3(0, -5.2, 0), growth: 0.2, fade: 2.1, attack: 0.02,
    });
    this.root.add(this.sparks.points);

    this.smoke = new ParticleField(lib, {
      name: 'corridor-smoke',
      capacity: Math.round(1500 * q.particleScale),
      texture: lib.smokeSprite,
      drag: 0.55, gravity: new THREE.Vector3(0, 0.16, 0), growth: 4.2, fade: 1.5,
      attack: 0.22, additive: false, softness: 0.85,
    });
    this.smoke.material.blending = THREE.NormalBlending;
    this.root.add(this.smoke.points);

    this.debris = new DebrisField(lib, 120, lib.interiorTrim, 'corridor-debris');
    this.root.add(this.debris.mesh);

    this.flashes = new FlashField(lib, 10, 3, 'corridor-flashes');
    this.root.add(this.flashes.group);

    // ---- Cast --------------------------------------------------------------
    const cast = buildCast(lib);
    this.rebels = cast.rebels;
    this.troopers = cast.troopers;
    this.vader = cast.vader;
    this.leia = cast.leia;
    this.r2 = cast.r2;
    this.threepio = cast.threepio;
    for (const c of [...this.rebels, ...this.troopers, this.vader, this.leia]) this.root.add(c.group);
    this.root.add(this.r2.group);
    this.root.add(this.threepio.group);

    // ---- Plans -------------------------------------------------------------
    this.plans = new DataProjection(lib, 0.34);
    this.plans.setPosition(-2.78, 1.72, 25.35);
    this.root.add(this.plans.group);

    const beamGeo = new THREE.CylinderGeometry(0.035, 0.014, 1, 10, 1, true);
    lib.registry.track(beamGeo);
    this.transferBeamMat = new THREE.MeshBasicMaterial({
      color: 0x8fe4ff, transparent: true, opacity: 0, toneMapped: false,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    });
    lib.registry.track(this.transferBeamMat);
    this.transferBeam = new THREE.Mesh(beamGeo, this.transferBeamMat);
    this.root.add(this.transferBeam);

    this.buildFirefight();

    // ---- Selectables -------------------------------------------------------
    this.selectable.push(
      { object: this.vader.group, id: 'vader' },
      { object: this.leia.group, id: 'leia' },
      { object: this.r2.group, id: 'r2' },
      { object: this.threepio.group, id: 'threepio' },
      { object: this.door.group, id: 'blast-door' },
      { object: this.plans.group, id: 'plans' },
    );
    this.troopers.forEach((c, i) => this.selectable.push({ object: c.group, id: `trooper-${i}` }));
    this.rebels.forEach((c, i) => this.selectable.push({ object: c.group, id: `rebel-${i}` }));
  }

  // -------------------------------------------------------------------------
  // Firefight: precomputed like every other effect in the production
  // -------------------------------------------------------------------------
  private buildFirefight(): void {
    const rng = this.rng.fork('firefight');
    const bolts: BoltEvent[] = [];
    const flashes: FlashEvent[] = [];
    const sparks: Emission[] = [];

    const BOLT_SPEED = 62;
    const addShot = (t0: number, from: THREE.Vector3, to: THREE.Vector3, imperial: boolean, hit: boolean): void => {
      const dist = from.distanceTo(to);
      const t1 = t0 + dist / BOLT_SPEED;
      const color = imperial ? PALETTE.imperialBoltRed : PALETTE.rebelBoltBlue;
      bolts.push({ t0, t1, from: from.clone(), to: to.clone(), color, length: 1.05, radius: 0.026 });
      flashes.push({ t0, position: from.clone(), color, size: 0.55, light: 2.2, lightRange: 7, duration: 0.12 });
      flashes.push({
        t0: t1, position: to.clone(), color: hit ? 0xffd08a : color,
        size: hit ? 0.9 : 0.6, light: hit ? 3.4 : 2.0, lightRange: 6, duration: 0.24,
      });
      const dir = to.clone().sub(from).normalize().negate();
      sparks.push({
        t0: t1, position: to.clone(), count: hit ? 16 : 10, speed: hit ? 4.2 : 3.0,
        spread: Math.PI * 0.55, direction: dir,
        color: 0xffe0a8, colorB: imperial ? 0xff5a2a : 0x66d0ff,
        size: 0.09, life: 0.65, radius: 0.06,
      });
      this.boltPlans.push({ t0, from: from.clone(), to: to.clone(), imperial });
    };

    const muzzleOf = (c: Character, t: number): THREE.Vector3 => {
      const p = c.options.path.at(t, new THREE.Vector3());
      const face = c.stateAt(t).focus;
      const dir = face
        ? new THREE.Vector3(face.x - p.x, 0, face.z - p.z).normalize()
        : new THREE.Vector3(0, 0, -1);
      return new THREE.Vector3(p.x + dir.x * 0.55, 1.28, p.z + dir.z * 0.55);
    };

    // Imperial fire, from the doorway into the defended corridor.
    for (const trooper of this.troopers) {
      const windows = trooper.options.states.filter((s) => s.state === 'fire');
      for (const w of windows) {
        const next = trooper.options.states.find((s) => s.t > w.t);
        const end = Math.min(next?.t ?? w.t + 4, w.t + 8);
        const shots = Math.max(1, Math.round((end - w.t) * (w.rate ?? 1.6)));
        for (let i = 0; i < shots; i++) {
          const t0 = w.t + 0.2 + (i / shots) * (end - w.t - 0.3);
          const from = muzzleOf(trooper, t0);
          const hit = rng.bool(0.32);
          const target = hit
            ? this.pickRebelTarget(t0, rng)
            : new THREE.Vector3(rng.range(-1.5, 1.5), rng.range(0.4, 2.2), rng.range(9, 17));
          if (!target) continue;
          addShot(t0, from, target, true, hit);
        }
      }
    }

    // Rebel return fire.
    for (const rebel of this.rebels) {
      const windows = rebel.options.states.filter((s) => s.state === 'fire');
      for (const w of windows) {
        const next = rebel.options.states.find((s) => s.t > w.t);
        const end = Math.min(next?.t ?? w.t + 4, w.t + 8);
        const shots = Math.max(1, Math.round((end - w.t) * (w.rate ?? 1.2)));
        for (let i = 0; i < shots; i++) {
          const t0 = w.t + 0.15 + (i / shots) * (end - w.t - 0.3);
          const from = muzzleOf(rebel, t0);
          const hit = rng.bool(0.22);
          const target = new THREE.Vector3(
            rng.range(-1.3, 1.3),
            hit ? rng.range(0.9, 1.5) : rng.range(0.3, 2.3),
            hit ? rng.range(-6, -2) : DOOR_Z + rng.range(0, 1.5),
          );
          addShot(t0, from, target, false, hit);
        }
      }
    }

    // Door breach: the charge blows inward with smoke, debris and a hard flash.
    flashes.push({
      t0: BREACH_TIME, position: new THREE.Vector3(0, 1.35, DOOR_Z + 0.4),
      color: 0xffd9a0, size: 6.5, light: 22, lightRange: 26, duration: 1.1,
    });
    sparks.push({
      t0: BREACH_TIME, position: new THREE.Vector3(0, 1.35, DOOR_Z + 0.5),
      count: 220, speed: 13, spread: Math.PI * 0.62, direction: new THREE.Vector3(0, 0.1, 1),
      color: 0xfff0c8, colorB: 0xff5a1e, size: 0.12, life: 1.5, radius: 0.35,
    });
    this.debris.emit({
      t0: BREACH_TIME, position: new THREE.Vector3(0, 1.2, DOOR_Z + 0.4),
      direction: new THREE.Vector3(0, 0.25, 1), count: 40, speed: 7.5, size: 0.22, life: 4,
    });

    // Smoke: a bank that rolls in through the breach and lingers all act.
    const smoke: Emission[] = [];
    for (let i = 0; i < 34; i++) {
      smoke.push({
        t0: BREACH_TIME + i * 0.16,
        position: new THREE.Vector3(rng.range(-1.2, 1.2), rng.range(0.3, 2.1), DOOR_Z + rng.range(0.2, 1.6)),
        count: 4, speed: 1.9, spread: Math.PI * 0.5, direction: new THREE.Vector3(0, 0.25, 1),
        color: 0x8b8781, colorB: 0x2c2a27, size: 1.9, life: 13, radius: 0.3, stagger: 0.4,
      });
    }
    // Damage smoke from the walls near the breach for the rest of the act.
    for (let i = 0; i < 26; i++) {
      const t0 = BREACH_TIME + 2 + i * 1.7;
      smoke.push({
        t0,
        position: new THREE.Vector3(rng.range(-1.5, 1.5), rng.range(0.1, 0.6), rng.range(DOOR_Z + 1, 6)),
        count: 3, speed: 0.55, spread: Math.PI * 0.35, direction: new THREE.Vector3(0, 1, 0),
        color: 0x77736d, colorB: 0x24221f, size: 1.5, life: 15, radius: 0.25, stagger: 0.9,
      });
    }
    // Electrical arcing from a damaged panel after the breach.
    for (let i = 0; i < 42; i++) {
      const t0 = BREACH_TIME + 1.2 + i * 1.05 + rng.range(-0.2, 0.2);
      sparks.push({
        t0, position: new THREE.Vector3(-CORRIDOR_HALF_WIDTH + 0.15, 1.32, 4),
        count: 12, speed: 3.4, spread: Math.PI * 0.7, direction: new THREE.Vector3(1, -0.2, 0),
        color: 0xd8f0ff, colorB: 0x6fa8ff, size: 0.07, life: 0.5, radius: 0.05,
      });
      flashes.push({
        t0, position: new THREE.Vector3(-CORRIDOR_HALF_WIDTH + 0.2, 1.32, 4),
        color: 0x9fd0ff, size: 0.7, light: 2.4, lightRange: 5, duration: 0.16,
      });
    }

    this.bolts.addAll(bolts);
    for (const f of flashes) this.flashes.add(f);
    for (const s of sparks) this.sparks.emit(s);
    for (const s of smoke) this.smoke.emit(s);
    this.sparks.commit();
    this.smoke.commit();
  }

  private pickRebelTarget(t: number, rng: Rng): THREE.Vector3 | null {
    const standing = this.rebels.filter((r) => {
      const s = r.stateAt(t + 0.3).state;
      return s !== 'down';
    });
    if (!standing.length) return null;
    const target = standing[rng.int(0, standing.length - 1)];
    const p = target.options.path.at(t + 0.3, new THREE.Vector3());
    return new THREE.Vector3(p.x + rng.signed(0.25), 1.1 + rng.range(-0.15, 0.35), p.z + rng.signed(0.2));
  }

  // -------------------------------------------------------------------------
  setViewportScale(heightPx: number, fovDeg: number): void {
    this.sparks.setViewportScale(heightPx, fovDeg);
    this.smoke.setViewportScale(heightPx, fovDeg);
  }

  update(t: number): void {
    this.door.update(t);
    for (const c of this.rebels) c.update(t);
    for (const c of this.troopers) c.update(t);
    this.vader.update(t);
    this.leia.update(t);
    this.r2.update(t);
    this.threepio.update(t);

    this.bolts.update(t);
    this.sparks.update(t);
    this.smoke.update(t);
    this.debris.update(t);
    this.flashes.update(t);

    // --- Lighting mood ------------------------------------------------------
    // White house lighting fails as the boarding begins, emergency red takes
    // over, and Vader's arrival pulls the corridor colder and darker still.
    const alarmOn = smoothstep(196, 199, t) * (1 - smoothstep(300, 306, t) * 0.35);
    const whiteLevel = 1 - 0.5 * smoothstep(197.5, 200.5, t) - 0.18 * smoothstep(216, 222, t) + 0.45 * smoothstep(262, 268, t);
    const redLevel = alarmOn * (0.8 + 0.2 * smoothstep(214, 220, t));
    for (let i = 0; i < this.runs.length; i++) {
      this.runs[i].setMood(t, clamp(whiteLevel, 0.25, 1), redLevel, i * 3.7);
    }
    for (const a of this.alarms) a.update(t, alarmOn);

    const vaderPresence = smoothstep(238, 243, t) * (1 - smoothstep(300, 306, t));
    this.keyLight.intensity = 1.2 - 0.45 * vaderPresence - 0.25 * smoothstep(216, 224, t);
    this.keyLight.color.setRGB(1, 0.95 - 0.1 * vaderPresence, 0.89 - 0.2 * vaderPresence);
    this.fillLight.intensity = 0.52 - 0.2 * vaderPresence;
    this.ambient.intensity = 0.24 - 0.06 * vaderPresence;

    const vaderZ = this.vader.options.path.at(t).z;
    this.vaderRim.position.set(0.6, 2.05, vaderZ - 2.4);
    this.vaderRim.intensity = vaderPresence * 5.2 * (0.85 + 0.15 * Math.sin(t * 1.6));
    // Raking key from above and to one side: enough to find the helmet and
    // shoulder edges without turning him grey.
    this.vaderKey.position.set(0.95, 2.15, vaderZ + 2.2);
    this.vaderKey.intensity = vaderPresence * 11;

    const archivePresence = smoothstep(260, 268, t) * (1 - smoothstep(316, 322, t));
    this.archiveLight.intensity = 1.1 + 1.5 * archivePresence;
    this.archiveFill.intensity = 2.3 * archivePresence;
    this.doorwayGlow.intensity = smoothstep(BREACH_TIME, BREACH_TIME + 3, t) * (2.6 + 3.4 * vaderPresence);

    const breach = this.door.breachFlash(t);
    this.breachLight.intensity = breach * 26;
    this.breachLight.position.set(0, 1.4, DOOR_Z + 1.2);

    for (const c of this.consoles) c.update(t, 1);

    // --- Plans and the transfer --------------------------------------------
    const plansStrength = smoothstep(272, 276, t) * (1 - smoothstep(300, 304, t));
    const transfer = smoothstep(288, 299, t);
    this.plans.update(t, plansStrength, transfer);
    this.updateTransferBeam(t, plansStrength, transfer);

    // The hatch pulses faster and the bay lifts out of shadow as the droids
    // commit to it, so the destination is lit before they arrive in frame.
    const podApproach = smoothstep(300, 310, t);
    const podPulse = 1.4 + 1.6 * podApproach;
    this.podHatchGlow.opacity = (0.34 + 0.24 * podApproach)
      + (0.42 + 0.34 * podApproach) * Math.pow(Math.max(0, Math.sin(t * podPulse)), 3);
    this.podBayLight.intensity = 0.5 + 2.4 * podApproach;
  }

  private updateTransferBeam(t: number, strength: number, transfer: number): void {
    const active = strength * smoothstep(287.5, 289.5, t) * (1 - smoothstep(298, 300.5, t));
    this.transferBeamMat.opacity = active * 0.42 * (0.7 + 0.3 * Math.sin(t * 14));
    this.transferBeam.visible = active > 0.01;
    if (!this.transferBeam.visible) return;
    // Leaves from the foot of the projection rather than its middle. Struck from
    // the centre it runs straight across the princess's face on the shot that
    // matters most.
    const from = this.plans.group.position.clone().add(new THREE.Vector3(0, -1.1, 0));
    const to = this.r2.anchors.dataPort.getWorldPosition(new THREE.Vector3());
    this.root.worldToLocal(to);
    const mid = from.clone().add(to).multiplyScalar(0.5);
    this.transferBeam.position.copy(mid);
    this.transferBeam.lookAt(to);
    this.transferBeam.rotateX(Math.PI / 2);
    this.transferBeam.scale.set(1, Math.max(0.01, from.distanceTo(to)), 1);
    void transfer;
  }

  /** Interior shake: door breach plus nearby blaster impacts. */
  shakeAt(t: number): number {
    let s = this.door.breachFlash(t) * 1.5;
    const impact = flash(saturate((t - 152) / 8), 0.1);
    s += impact * 0.2;
    for (const plan of this.boltPlans) {
      const dt = t - plan.t0;
      if (dt < 0 || dt > 0.5) continue;
      s += 0.035 * Math.pow(1 - dt / 0.5, 2);
    }
    return Math.min(1.4, s);
  }

  get particleStats(): { sparks: number; smoke: number; overflow: boolean } {
    return { sparks: this.sparks.used, smoke: this.smoke.used, overflow: this.sparks.overflowed || this.smoke.overflowed };
  }

  get boltCount(): number {
    return this.bolts.count;
  }

  /** Exposed so the sound director can schedule a report per bolt fired. */
  get boltAudioPlans(): ReadonlyArray<CorridorBoltPlan> {
    return this.boltPlans;
  }

  /** Bolts genuinely in flight at `t`, used by QA assertions. */
  boltsActiveAt(t: number): number {
    return this.bolts.activeAt(t);
  }

  /** Bolt activity used by the audio mixer. */
  intensityAt(t: number): number {
    return saturate(this.bolts.activeAt(t) / 5);
  }
}

// ---------------------------------------------------------------------------
// Choreography
// ---------------------------------------------------------------------------

function path(keys: Array<[number, number, number, number]>): VectorTrack {
  return new VectorTrack(keys.map(([t, x, y, z]) => ({ t, v: [x, y, z] as [number, number, number] })));
}

const DOORWAY = new THREE.Vector3(0, 1.2, DOOR_Z);

function buildCast(lib: MaterialLibrary): {
  rebels: Character[];
  troopers: Character[];
  vader: Character;
  leia: Character;
  r2: Astromech;
  threepio: ProtocolDroid;
} {
  const rebels: Character[] = [];
  const troopers: Character[] = [];

  // --- Rebel defenders -----------------------------------------------------
  // Each one has a named objective: run to a covered firing position facing the
  // door, hold it, then either fall or fall back.
  const rebelPlans: Array<{
    start: [number, number];
    cover: [number, number];
    arrive: number;
    officer?: boolean;
    downAt?: number;
    fallbackAt?: number;
    fallbackTo?: [number, number];
  }> = [
    { start: [0.5, 27.0], cover: [-0.85, 8.6], arrive: 203.6, officer: true, downAt: 233.5 },
    { start: [-0.6, 29.5], cover: [0.95, 10.4], arrive: 204.4, downAt: 226.5 },
    { start: [1.0, 32.5], cover: [-0.9, 12.9], arrive: 205.2, downAt: 229.5 },
    { start: [-1.0, 35.0], cover: [0.9, 14.6], arrive: 206.0, downAt: 231.5 },
    { start: [0.3, 38.0], cover: [-0.5, 16.8], arrive: 206.8, fallbackAt: 228, fallbackTo: [1.26, 19.4] },
  ];

  rebelPlans.forEach((plan, i) => {
    const keys: Array<[number, number, number, number]> = [
      [0, plan.start[0], 0, plan.start[1]],
      [199.2 + i * 0.25, plan.start[0], 0, plan.start[1]],
      [plan.arrive, plan.cover[0], 0, plan.cover[1]],
    ];
    if (plan.fallbackAt && plan.fallbackTo) {
      keys.push([plan.fallbackAt, plan.cover[0], 0, plan.cover[1]]);
      keys.push([plan.fallbackAt + 2.4, plan.fallbackTo[0], 0, plan.fallbackTo[1]]);
      keys.push([1000, plan.fallbackTo[0], 0, plan.fallbackTo[1]]);
    } else {
      keys.push([1000, plan.cover[0], 0, plan.cover[1]]);
    }

    const states: StateKey[] = [
      { t: 0, state: 'idle', facing: Math.PI },
      { t: 199.2 + i * 0.25, state: 'run' },
      { t: plan.arrive, state: 'alert', focus: DOORWAY },
      { t: plan.arrive + 1.2, state: 'aim', focus: DOORWAY },
      { t: BREACH_TIME - 1.4, state: 'react', focus: DOORWAY },
      { t: BREACH_TIME + 0.5, state: 'aim', focus: DOORWAY },
      { t: BREACH_TIME + 1.6 + i * 0.35, state: 'fire', focus: DOORWAY, rate: 1.3 },
      { t: BREACH_TIME + 4.5 + i * 0.4, state: 'aim', focus: DOORWAY },
      { t: BREACH_TIME + 5.4 + i * 0.3, state: 'fire', focus: DOORWAY, rate: 1.5 },
    ];
    if (plan.downAt) {
      states.push({ t: plan.downAt - 0.55, state: 'react', focus: DOORWAY });
      states.push({ t: plan.downAt, state: 'down' });
    } else if (plan.fallbackAt) {
      states.push({ t: plan.fallbackAt, state: 'run' });
      states.push({ t: plan.fallbackAt + 2.4, state: 'cower', facing: Math.PI });
      states.push({ t: 243, state: 'kneel', focus: DOORWAY });
    }
    const c = createRebel(lib, { path: path(keys), states, phase: i * 0.7, gait: 1.05 }, i, plan.officer);
    rebels.push(c);
  });

  // --- Stormtroopers -------------------------------------------------------
  // They come through the breach in two waves and advance up the corridor.
  const trooperPlans: Array<{
    lane: number;
    enter: number;
    advance: Array<[number, number]>;
    /** Where this trooper stands once Vader is announced: clear of the centre. */
    aside: [number, number];
    /** Optional aft sweep during the archive chapter. */
    sweepTo?: [number, number];
    downAt?: number;
  }> = [
    { lane: -0.75, enter: BREACH_TIME + 0.7, advance: [[-0.75, -3.4], [-0.95, 1.2], [-1.0, 3.6]], aside: [-1.3, 4.4], sweepTo: [-1.05, 17.4] },
    { lane: 0.75, enter: BREACH_TIME + 1.0, advance: [[0.75, -3.0], [0.95, 0.6], [1.05, 3.0]], aside: [1.3, 3.4], sweepTo: [1.05, 15.6] },
    { lane: 0.0, enter: BREACH_TIME + 1.5, advance: [[0.1, -4.2], [0.2, -1.2], [0.3, 1.6]], aside: [1.28, 0.4], downAt: 227.5 },
    { lane: -1.05, enter: BREACH_TIME + 2.4, advance: [[-1.05, -5.0], [-1.15, -1.6], [-1.2, 2.0]], aside: [-1.3, 1.0] },
    { lane: 1.05, enter: BREACH_TIME + 3.0, advance: [[1.05, -4.6], [1.15, -0.8], [1.2, 2.6]], aside: [1.3, -2.0], downAt: 224.5 },
    { lane: 0.35, enter: BREACH_TIME + 4.2, advance: [[0.35, -5.4], [0.45, -2.2], [0.55, 0.8]], aside: [-1.3, -2.6] },
  ];

  trooperPlans.forEach((plan, i) => {
    const keys: Array<[number, number, number, number]> = [
      [0, plan.lane, 0, DOOR_Z - 7.5],
      [plan.enter - 0.9, plan.lane, 0, DOOR_Z - 7.5],
      [plan.enter, plan.lane, 0, DOOR_Z - 1.2],
    ];
    plan.advance.forEach(([x, z], k) => keys.push([plan.enter + 1.6 + k * 2.6, x, 0, z]));
    const last = plan.advance[plan.advance.length - 1];
    // Clear the centre line before he arrives; nobody stands in his way.
    if (!plan.downAt) {
      keys.push([238.5 + i * 0.2, last[0], 0, last[1]]);
      keys.push([241.5 + i * 0.2, plan.aside[0], 0, plan.aside[1]]);
      if (plan.sweepTo) {
        keys.push([298.5 + i * 0.4, plan.aside[0], 0, plan.aside[1]]);
        keys.push([306.5, plan.sweepTo[0], 0, plan.sweepTo[1]]);
        keys.push([1000, plan.sweepTo[0], 0, plan.sweepTo[1]]);
      } else {
        keys.push([1000, plan.aside[0], 0, plan.aside[1]]);
      }
    } else {
      keys.push([1000, last[0], 0, last[1]]);
    }

    const facingIn = plan.aside[0] > 0 ? -Math.PI / 2 : Math.PI / 2;
    const states: StateKey[] = [
      { t: 0, state: 'idle', facing: 0 },
      { t: plan.enter - 0.9, state: 'run' },
      { t: plan.enter + 1.5, state: 'fire', focus: new THREE.Vector3(plan.lane * 0.4, 1.2, 12), rate: 2.1 },
      { t: plan.enter + 4.0, state: 'run' },
      { t: plan.enter + 5.4, state: 'fire', focus: new THREE.Vector3(plan.lane * 0.4, 1.2, 13), rate: 2.3 },
      { t: 234.5, state: 'aim', focus: new THREE.Vector3(plan.lane * 0.4, 1.2, 14) },
      { t: 238.5 + i * 0.2, state: 'walk' },
      { t: 242.4 + i * 0.2, state: 'alert', facing: facingIn },
      { t: 246, state: 'idle', facing: facingIn, focus: new THREE.Vector3(0, 1.5, DOOR_Z + 2) },
    ];
    if (plan.sweepTo) {
      states.push({ t: 298.5 + i * 0.4, state: 'aim', focus: new THREE.Vector3(0, 1.3, 30) });
      states.push({ t: 299.5 + i * 0.4, state: 'walk' });
      states.push({ t: 306.5, state: 'aim', focus: new THREE.Vector3(-1.5, 1.3, 26) });
      states.push({ t: 1000, state: 'aim', focus: new THREE.Vector3(-1.5, 1.3, 26) });
    } else {
      states.push({ t: 1000, state: 'idle', facing: facingIn });
    }
    if (plan.downAt) {
      states.length = 6;
      states.push({ t: plan.downAt - 0.4, state: 'react', focus: new THREE.Vector3(0, 1.2, 12) });
      states.push({ t: plan.downAt, state: 'down' });
    }
    troopers.push(createStormtrooper(lib, { path: path(keys), states, phase: i * 0.53, gait: 1.0 }, i));
  });

  // --- Vader ----------------------------------------------------------------
  // He arrives only once the shooting has stopped, and walks at a single,
  // unhurried pace all the way to the middle of the corridor.
  const vaderPath = path([
    [0, 0, 0, DOOR_Z - 9],
    [240.0, 0, 0, DOOR_Z - 9],
    [241.4, 0, 0, DOOR_Z - 2.8],
    [244.0, 0, 0, DOOR_Z + 0.8],
    [249.0, 0, 0, -1.6],
    [254.0, 0, 0, 3.4],
    [259.5, 0, 0, 7.2],
    [262.0, 0, 0, 8.2],
    [296.0, 0, 0, 8.6],
    [307.0, 0, 0, 13.4],
    [1000, 0, 0, 13.4],
  ]);
  const vader = createVader(lib, {
    path: vaderPath,
    gait: 0.62,
    fluidity: 0.75,
    states: [
      { t: 0, state: 'idle', facing: 0 },
      { t: 240.0, state: 'march', facing: 0 },
      { t: 259.5, state: 'alert', facing: 0 },
      { t: 261.0, state: 'idle', facing: 0, focus: new THREE.Vector3(0, 1.6, 20) },
      { t: 296.0, state: 'march', facing: 0 },
      { t: 307.5, state: 'idle', facing: 0, focus: new THREE.Vector3(-1.5, 1.5, 26) },
      { t: 1000, state: 'idle', facing: 0 },
    ],
  });

  // --- Leia -----------------------------------------------------------------
  // She comes forward from the aft of the ship, works the archive console,
  // kneels to load the droid, then turns to face the approaching boarders.
  const leiaPath = path([
    [0, 0.6, 0, 36],
    [262.0, 0.6, 0, 36],
    [264.5, 0.4, 0, 32],
    [268.0, -0.9, 0, 28.8],
    [271.5, -2.15, 0, 26.4],
    [283.0, -2.15, 0, 26.4],
    [285.2, -2.25, 0, 24.95],
    [299.0, -2.25, 0, 24.95],
    [302.5, -1.15, 0, 24.1],
    [1000, -1.15, 0, 24.1],
  ]);
  // She works the projection itself, which turns her toward camera instead of
  // presenting her back to it for thirty seconds.
  const consoleFocus = new THREE.Vector3(-2.78, 1.6, 25.35);
  const droidFocus = new THREE.Vector3(-2.62, 0.85, 23.85);
  const leia = createLeia(lib, {
    path: leiaPath,
    gait: 1.0,
    states: [
      { t: 0, state: 'idle', facing: -Math.PI / 2 },
      { t: 262.0, state: 'run' },
      { t: 271.5, state: 'interact', focus: consoleFocus },
      { t: 277.0, state: 'interact', focus: consoleFocus },
      { t: 285.6, state: 'crouch', focus: droidFocus },
      { t: 296.0, state: 'interact', focus: droidFocus },
      { t: 299.5, state: 'alert', focus: new THREE.Vector3(0, 1.5, 8) },
      { t: 303.0, state: 'idle', facing: Math.PI, focus: new THREE.Vector3(0, 1.5, 10) },
      { t: 1000, state: 'idle', facing: Math.PI },
    ],
  });

  // --- Droids ---------------------------------------------------------------
  // The astromech travels in straight lines at one speed and never stops.
  const r2Path = path([
    [0, -2.62, 0, 23.85],
    [302.0, -2.62, 0, 23.85],
    [304.5, -1.5, 0, 27.4],
    [307.0, -0.7, 0, 33.5],
    [313.0, -0.7, 0, 44.0],
    [316.5, -1.5, 0, 46.4],
    [318.8, -2.4, 0, POD_BAY_Z],
    [1000, -2.4, 0, POD_BAY_Z],
  ]);
  const r2 = new Astromech(lib, r2Path, {
    scanning: [[262, 286], [304, 312]],
    projecting: [[288, 300]],
  });

  // The protocol droid lags, stops dead once, and has to be left behind by the
  // camera before he finally follows.
  const threepioPath = path([
    [0, 0.9, 0, 30.5],
    [303.0, 0.9, 0, 30.5],
    [305.5, 0.85, 0, 31.8],
    [309.5, 0.75, 0, 36.0],
    [311.8, 0.72, 0, 36.4],
    [315.5, 0.5, 0, 42.0],
    [318.2, -0.4, 0, 45.6],
    [320.0, -1.78, 0, POD_BAY_Z + 0.4],
    [1000, -1.78, 0, POD_BAY_Z + 0.4],
  ]);
  const threepio = new ProtocolDroid(lib, {
    path: threepioPath,
    gait: 0.9,
    states: [
      { t: 0, state: 'idle', facing: Math.PI },
      { t: 303.0, state: 'walk' },
      { t: 309.8, state: 'cower', facing: Math.PI * 0.82 },
      { t: 312.0, state: 'walk' },
      { t: 315.5, state: 'walk', focus: new THREE.Vector3(-2.6, 1.4, POD_BAY_Z) },
      { t: 318.4, state: 'interact', focus: new THREE.Vector3(-2.7, 1.2, POD_BAY_Z) },
      { t: 320.2, state: 'idle', facing: -Math.PI / 2 },
      { t: 1000, state: 'idle', facing: -Math.PI / 2 },
    ],
  });

  return { rebels, troopers, vader, leia, r2, threepio };
}
