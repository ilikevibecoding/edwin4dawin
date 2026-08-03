import * as THREE from 'three';
import { Rng } from '../../core/Rng';
import { clamp, flash, saturate, smoothstep } from '../../core/mathx';
import type { MaterialLibrary } from '../materials';
import { PALETTE } from '../materials';
import { bevelBox, mergeAll, mirrored, ribbonGeometry } from '../geometry';

/**
 * Modular interior kit for the blockade runner.
 *
 * The corridor is a single lofted shell (floor, vertical walls, curved
 * shoulders, flat ceiling) plus a repeated 4 m detail section drawn with one
 * InstancedMesh. Doors, alcoves, consoles and ceiling fixtures are separate
 * reusable constructors so the same pieces build the firefight corridor, the
 * archive alcove and the pod bay.
 *
 * Local space: the corridor runs along +Z, floor at y = 0.
 */

export const CORRIDOR_HALF_WIDTH = 1.72;
export const CORRIDOR_HEIGHT = 2.62;
export const SECTION_LENGTH = 4;

/** Cross-section of the corridor shell, traced from floor-left to floor-right. */
export function corridorProfile(halfWidth = CORRIDOR_HALF_WIDTH, height = CORRIDOR_HEIGHT): THREE.Vector2[] {
  const pts: THREE.Vector2[] = [];
  const shoulderY = height - 0.95;
  const ceilingHalf = halfWidth - 0.78;
  pts.push(new THREE.Vector2(-halfWidth, 0));
  pts.push(new THREE.Vector2(-halfWidth, shoulderY));
  for (let i = 1; i <= 5; i++) {
    const a = (i / 6) * (Math.PI / 2);
    pts.push(new THREE.Vector2(
      -halfWidth + (halfWidth - ceilingHalf) * (1 - Math.cos(a)),
      shoulderY + (height - shoulderY) * Math.sin(a),
    ));
  }
  pts.push(new THREE.Vector2(-ceilingHalf, height));
  pts.push(new THREE.Vector2(ceilingHalf, height));
  for (let i = 5; i >= 1; i--) {
    const a = (i / 6) * (Math.PI / 2);
    pts.push(new THREE.Vector2(
      halfWidth - (halfWidth - ceilingHalf) * (1 - Math.cos(a)),
      shoulderY + (height - shoulderY) * Math.sin(a),
    ));
  }
  pts.push(new THREE.Vector2(halfWidth, shoulderY));
  pts.push(new THREE.Vector2(halfWidth, 0));
  return pts;
}

export interface CorridorRunOptions {
  z0: number;
  z1: number;
  halfWidth?: number;
  height?: number;
  /** Adds worn scorch marks and dents. */
  weathering?: number;
  /** Structural ribs between sections. Rooms read better without them. */
  ribs?: boolean;
  seed?: string;
}

export class CorridorRun {
  readonly group = new THREE.Group();
  readonly lights: THREE.PointLight[] = [];
  readonly lightStrips: THREE.Mesh[] = [];
  readonly bounds: THREE.Box3;

  constructor(lib: MaterialLibrary, opts: CorridorRunOptions) {
    const halfWidth = opts.halfWidth ?? CORRIDOR_HALF_WIDTH;
    const height = opts.height ?? CORRIDOR_HEIGHT;
    const rng = new Rng(opts.seed ?? `corridor:${opts.z0}:${opts.z1}`);
    const length = opts.z1 - opts.z0;
    const sections = Math.max(1, Math.round(length / SECTION_LENGTH));
    const step = length / sections;
    this.group.name = `corridorRun:${opts.z0}:${opts.z1}`;

    // --- Shell -------------------------------------------------------------
    const profile = corridorProfile(halfWidth, height);
    const shellGeo = ribbonGeometry(profile, opts.z0, opts.z1, sections * 2, new THREE.Vector2(2.6, 1), true);
    lib.registry.track(shellGeo);
    const shell = new THREE.Mesh(shellGeo, lib.interiorWall);
    shell.name = 'corridor-shell';
    shell.receiveShadow = true;
    this.group.add(shell);

    // --- Floor -------------------------------------------------------------
    const floorGeo = new THREE.PlaneGeometry(halfWidth * 2, length);
    floorGeo.rotateX(-Math.PI / 2);
    floorGeo.translate(0, 0.001, (opts.z0 + opts.z1) / 2);
    lib.registry.track(floorGeo);
    const floor = new THREE.Mesh(floorGeo, lib.interiorFloor);
    floor.name = 'corridor-floor';
    floor.receiveShadow = true;
    this.group.add(floor);

    // Centre walkway strip.
    const walkGeo = new THREE.PlaneGeometry(halfWidth * 1.05, length);
    walkGeo.rotateX(-Math.PI / 2);
    walkGeo.translate(0, 0.004, (opts.z0 + opts.z1) / 2);
    lib.registry.track(walkGeo);
    const walk = new THREE.Mesh(walkGeo, lib.interiorTrim);
    walk.receiveShadow = true;
    this.group.add(walk);

    // --- Repeated section detail (single instanced draw) -------------------
    const detail = buildSectionDetail(halfWidth, height, rng);
    if (detail) {
      const inst = new THREE.InstancedMesh(detail, lib.interiorWallDark, sections);
      inst.name = 'corridor-sections';
      inst.castShadow = true;
      inst.receiveShadow = true;
      const m = new THREE.Matrix4();
      for (let i = 0; i < sections; i++) {
        m.makeTranslation(0, 0, opts.z0 + step * (i + 0.5));
        inst.setMatrixAt(i, m);
      }
      inst.instanceMatrix.needsUpdate = true;
      this.group.add(inst);
      lib.registry.track(detail);
    }

    // Ribs between sections.
    const ribGeo = opts.ribs === false ? null : buildRib(halfWidth, height);
    if (ribGeo) {
      const ribs = new THREE.InstancedMesh(ribGeo, lib.interiorTrim, sections + 1);
      ribs.name = 'corridor-ribs';
      ribs.castShadow = true;
      const m = new THREE.Matrix4();
      for (let i = 0; i <= sections; i++) {
        m.makeTranslation(0, 0, opts.z0 + step * i);
        ribs.setMatrixAt(i, m);
      }
      ribs.instanceMatrix.needsUpdate = true;
      this.group.add(ribs);
      lib.registry.track(ribGeo);
    }

    // --- Ceiling lights -----------------------------------------------------
    const stripCount = Math.max(1, Math.round(length / (SECTION_LENGTH * 1)));
    for (let i = 0; i < stripCount; i++) {
      const z = opts.z0 + (i + 0.5) * (length / stripCount);
      const g = new THREE.BoxGeometry(0.44, 0.05, 1.8);
      lib.registry.track(g);
      const strip = new THREE.Mesh(g, lib.interiorLight);
      strip.position.set(0, height - 0.04, z);
      strip.name = `ceiling-light-${i}`;
      this.group.add(strip);
      this.lightStrips.push(strip);

      const light = new THREE.PointLight(0xfff0dc, 1.1, 9.5, 2);
      light.position.set(0, height - 0.35, z);
      this.group.add(light);
      this.lights.push(light);
    }

    this.bounds = new THREE.Box3(
      new THREE.Vector3(-halfWidth, 0, opts.z0),
      new THREE.Vector3(halfWidth, height, opts.z1),
    );
  }

  /** Flicker, brown-out and the switch to emergency red. */
  setMood(t: number, whiteLevel: number, redLevel: number, flickerSeed = 0): void {
    const flick = 0.86 + 0.14 * Math.sin(t * 37 + flickerSeed) * Math.sin(t * 11.3 + flickerSeed * 2);
    for (let i = 0; i < this.lights.length; i++) {
      const l = this.lights[i];
      const local = 0.82 + 0.18 * Math.sin(t * 5 + i * 2.1);
      l.intensity = whiteLevel * 1.35 * flick * local + redLevel * 0.5;
      l.color.setRGB(
        1,
        clamp(0.94 * whiteLevel + 0.16 * redLevel, 0.15, 1),
        clamp(0.86 * whiteLevel + 0.05 * redLevel, 0.1, 1),
      );
    }
    for (const strip of this.lightStrips) {
      const mat = strip.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.16 + whiteLevel * 0.52 * flick;
      mat.emissive.setRGB(1, 0.94 * whiteLevel + 0.2 * redLevel, 0.86 * whiteLevel + 0.08 * redLevel);
    }
  }
}

function buildSectionDetail(halfWidth: number, height: number, rng: Rng): THREE.BufferGeometry | null {
  const parts: (THREE.BufferGeometry | null)[] = [];
  // Three inset wall panels per side with raised frames.
  for (let i = 0; i < 3; i++) {
    const z = -SECTION_LENGTH / 2 + 0.6 + i * 1.3;
    const h = 0.9 + rng.range(-0.08, 0.08);
    const frame = bevelBox(0.06, h, 1.02, 0.02);
    frame.translate(-halfWidth + 0.03, 1.22, z);
    parts.push(frame);
    parts.push(mirrored(frame));
    const inset = bevelBox(0.03, h - 0.16, 0.86, 0.01);
    inset.translate(-halfWidth + 0.08, 1.22, z);
    parts.push(inset);
    parts.push(mirrored(inset));
  }
  // Low kick rail.
  const rail = bevelBox(0.08, 0.14, SECTION_LENGTH - 0.1, 0.03);
  rail.translate(-halfWidth + 0.04, 0.22, 0);
  parts.push(rail);
  parts.push(mirrored(rail));
  // Ceiling conduit.
  const conduit = new THREE.CylinderGeometry(0.055, 0.055, SECTION_LENGTH - 0.05, 8);
  conduit.rotateX(Math.PI / 2);
  conduit.translate(-0.62, height - 0.12, 0);
  parts.push(conduit);
  parts.push(mirrored(conduit));
  return mergeAll(parts);
}

function buildRib(halfWidth: number, height: number): THREE.BufferGeometry | null {
  const profile = corridorProfile(halfWidth - 0.02, height - 0.02);
  const inner = corridorProfile(halfWidth - 0.14, height - 0.14);
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < profile.length - 1; i++) {
    const a = profile[i];
    const b = profile[i + 1];
    const ai = inner[i];
    const mid = new THREE.Vector2().addVectors(a, b).multiplyScalar(0.5);
    const midI = new THREE.Vector2().addVectors(ai, inner[i + 1]).multiplyScalar(0.5);
    const len = a.distanceTo(b);
    const depth = mid.distanceTo(midI);
    const g = new THREE.BoxGeometry(len, Math.max(0.04, depth), 0.16);
    const angle = Math.atan2(b.y - a.y, b.x - a.x);
    g.rotateZ(angle);
    g.translate((mid.x + midI.x) / 2, (mid.y + midI.y) / 2, 0);
    parts.push(g);
  }
  return mergeAll(parts);
}

// ---------------------------------------------------------------------------
// Blast door
// ---------------------------------------------------------------------------

export interface BlastDoorOptions {
  z: number;
  halfWidth?: number;
  height?: number;
  /** Time the cutting charge starts glowing. */
  breachStart?: number;
  /** Time the door blows inward. */
  breachTime?: number;
  facing?: 1 | -1;
}

export class BlastDoor {
  readonly group = new THREE.Group();
  readonly leaves: THREE.Group[] = [];
  private glowMat: THREE.MeshBasicMaterial;
  private glowRing: THREE.Mesh;
  private opts: Required<BlastDoorOptions>;
  private heatLight: THREE.PointLight;

  constructor(lib: MaterialLibrary, opts: BlastDoorOptions) {
    this.opts = {
      halfWidth: CORRIDOR_HALF_WIDTH, height: CORRIDOR_HEIGHT,
      breachStart: Number.POSITIVE_INFINITY, breachTime: Number.POSITIVE_INFINITY,
      facing: 1, ...opts,
    };
    const hw = this.opts.halfWidth;
    const h = this.opts.height;
    this.group.name = 'blastDoor';
    this.group.position.z = opts.z;

    // Frame.
    const frameParts: THREE.BufferGeometry[] = [];
    const jamb = bevelBox(0.34, h, 0.4, 0.05);
    jamb.translate(-hw + 0.1, h / 2, 0);
    frameParts.push(jamb, mirrored(jamb));
    const lintel = bevelBox(hw * 2, 0.32, 0.4, 0.05);
    lintel.translate(0, h - 0.14, 0);
    frameParts.push(lintel);
    const frame = mergeAll(frameParts);
    if (frame) {
      const fm = new THREE.Mesh(frame, lib.interiorTrim);
      fm.castShadow = fm.receiveShadow = true;
      this.group.add(fm);
      lib.registry.track(frame);
    }

    // Two leaves that meet in the middle.
    for (const side of [-1, 1]) {
      const leaf = new THREE.Group();
      const w = hw - 0.16;
      const g = bevelBox(w, h - 0.3, 0.24, 0.04);
      lib.registry.track(g);
      const m = new THREE.Mesh(g, lib.doorMetal);
      m.castShadow = m.receiveShadow = true;
      m.position.set(side * w * 0.5, (h - 0.3) / 2, 0);
      leaf.add(m);
      // Diagonal bracing so the leaves read as armoured.
      for (let i = 0; i < 3; i++) {
        const b = bevelBox(w * 0.86, 0.1, 0.06, 0.02);
        lib.registry.track(b);
        const bm = new THREE.Mesh(b, lib.interiorTrim);
        bm.position.set(side * w * 0.5, 0.5 + i * 0.72, 0.14);
        leaf.add(bm);
      }
      this.group.add(leaf);
      this.leaves.push(leaf);
    }

    // Cutting-charge glow ring.
    const ringGeo = new THREE.TorusGeometry(0.72, 0.05, 8, 28);
    lib.registry.track(ringGeo);
    this.glowMat = new THREE.MeshBasicMaterial({
      color: 0xff7a2a, transparent: true, opacity: 0, toneMapped: false,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    lib.registry.track(this.glowMat);
    this.glowRing = new THREE.Mesh(ringGeo, this.glowMat);
    this.glowRing.position.set(0, 1.3, 0.14 * this.opts.facing);
    this.group.add(this.glowRing);

    this.heatLight = new THREE.PointLight(0xff6a20, 0, 8, 2);
    this.heatLight.position.set(0, 1.3, 0.5 * this.opts.facing);
    this.group.add(this.heatLight);
  }

  update(t: number): void {
    const { breachStart, breachTime, facing } = this.opts;
    const heat = saturate((t - breachStart) / Math.max(0.001, breachTime - breachStart));
    const blown = t >= breachTime;

    // Charge burning through: ring brightens and the metal bulges inward.
    const pulse = 0.6 + 0.4 * Math.sin(t * 9);
    this.glowMat.opacity = blown ? Math.max(0, 1 - (t - breachTime) * 1.2) * 0.4 : heat * pulse;
    this.glowRing.scale.setScalar(0.6 + heat * 0.75);
    this.heatLight.intensity = blown ? Math.max(0, 3 - (t - breachTime) * 4) : heat * 3.4 * pulse;

    const bulge = Math.pow(heat, 2.4) * 0.16;
    for (let i = 0; i < this.leaves.length; i++) {
      const leaf = this.leaves[i];
      const side = i === 0 ? -1 : 1;
      if (!blown) {
        leaf.position.set(0, 0, bulge * facing);
        leaf.rotation.set(0, 0, 0);
        leaf.scale.setScalar(1);
        leaf.visible = true;
      } else {
        // Blown inward: the leaves tumble down the corridor and come to rest
        // FLAT on the deck, clear of the centre line. Anything that settles
        // standing up ends as a slab across the next shot.
        const age = t - breachTime;
        const travel = Math.min(age, 1.6);
        const ease = 1 - Math.pow(1 - saturate(travel / 1.6), 3);
        const tumble = Math.sin(saturate(travel / 1.6) * Math.PI) * 0.9;
        leaf.position.set(
          side * ease * 1.25,
          0.13 * ease + tumble * 0.35,
          facing * ease * 4.2,
        );
        leaf.rotation.set(
          -ease * Math.PI / 2 - tumble * 0.8,
          side * ease * 0.45,
          side * tumble * 0.6,
        );
        leaf.visible = true;
      }
    }
  }

  /** Bright flash factor used by lighting and the audio mix at the moment of breach. */
  breachFlash(t: number): number {
    const dt = t - this.opts.breachTime;
    if (dt < 0 || dt > 1.4) return 0;
    return flash(dt / 1.4, 0.04);
  }

  get breachTime(): number {
    return this.opts.breachTime;
  }
}

// ---------------------------------------------------------------------------
// Wall console
// ---------------------------------------------------------------------------

export class ControlPanel {
  readonly group = new THREE.Group();
  private screenMat: THREE.MeshStandardMaterial;
  private light: THREE.PointLight;

  constructor(lib: MaterialLibrary, width = 1.0, height = 0.7) {
    this.group.name = 'controlPanel';
    const shell = bevelBox(width, height, 0.16, 0.03);
    lib.registry.track(shell);
    const sm = new THREE.Mesh(shell, lib.interiorTrim);
    sm.castShadow = sm.receiveShadow = true;
    this.group.add(sm);

    const screenGeo = new THREE.PlaneGeometry(width - 0.12, height - 0.12);
    screenGeo.translate(0, 0, 0.085);
    lib.registry.track(screenGeo);
    this.screenMat = lib.controlPanel.clone();
    lib.registry.track(this.screenMat);
    const screen = new THREE.Mesh(screenGeo, this.screenMat);
    this.group.add(screen);

    this.light = new THREE.PointLight(0x8ad0ff, 0.5, 3.2, 2);
    this.light.position.set(0, 0, 0.4);
    this.group.add(this.light);
  }

  update(t: number, active = 1): void {
    const blink = 0.75 + 0.25 * Math.sin(t * 6.2 + this.group.position.z);
    this.screenMat.emissiveIntensity = 0.9 * active * blink;
    this.light.intensity = 0.55 * active * blink;
  }
}

// ---------------------------------------------------------------------------
// Bulkhead / alcove framing
// ---------------------------------------------------------------------------

export function buildAlcove(lib: MaterialLibrary, width: number, depth: number, height = CORRIDOR_HEIGHT): THREE.Group {
  const group = new THREE.Group();
  group.name = 'alcove';
  const wallMat = lib.interiorWall;

  const back = new THREE.PlaneGeometry(width, height);
  back.translate(0, height / 2, -depth / 2);
  lib.registry.track(back);
  const bm = new THREE.Mesh(back, wallMat);
  bm.receiveShadow = true;
  group.add(bm);

  for (const side of [-1, 1]) {
    const g = new THREE.PlaneGeometry(depth, height);
    g.rotateY(side * Math.PI / 2);
    g.translate(side * -width / 2, height / 2, 0);
    lib.registry.track(g);
    const m = new THREE.Mesh(g, wallMat);
    m.receiveShadow = true;
    group.add(m);
  }

  const ceil = new THREE.PlaneGeometry(width, depth);
  ceil.rotateX(Math.PI / 2);
  ceil.translate(0, height, 0);
  lib.registry.track(ceil);
  group.add(new THREE.Mesh(ceil, wallMat));

  const floor = new THREE.PlaneGeometry(width, depth);
  floor.rotateX(-Math.PI / 2);
  floor.translate(0, 0.002, 0);
  lib.registry.track(floor);
  const fm = new THREE.Mesh(floor, lib.interiorFloor);
  fm.receiveShadow = true;
  group.add(fm);

  return group;
}

/** Alarm strobe: a wall-mounted red beacon used during the boarding. */
export class AlarmLight {
  readonly group = new THREE.Group();
  private lens: THREE.Mesh;
  private mat: THREE.MeshBasicMaterial;
  private light: THREE.PointLight;

  constructor(lib: MaterialLibrary, private phase = 0) {
    const housing = new THREE.Mesh(
      lib.registry.track(new THREE.CylinderGeometry(0.1, 0.12, 0.1, 10)),
      lib.interiorTrim,
    );
    housing.rotation.z = Math.PI / 2;
    this.group.add(housing);
    this.mat = new THREE.MeshBasicMaterial({ color: PALETTE.alarmRed, toneMapped: false, transparent: true, opacity: 1 });
    lib.registry.track(this.mat);
    this.lens = new THREE.Mesh(
      lib.registry.track(new THREE.SphereGeometry(0.085, 10, 8)),
      this.mat,
    );
    this.group.add(this.lens);
    this.light = new THREE.PointLight(PALETTE.alarmRed, 0, 6.5, 2);
    this.group.add(this.light);
  }

  update(t: number, active: number): void {
    const strobe = Math.pow(Math.max(0, Math.sin(t * 3.4 + this.phase)), 6);
    const v = active * (0.15 + strobe);
    this.mat.opacity = clamp(v, 0, 1);
    this.light.intensity = v * 2.6;
    this.lens.scale.setScalar(0.85 + v * 0.35);
    this.group.visible = active > 0.01;
  }
}

export { smoothstep };
