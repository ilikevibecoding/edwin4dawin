/**
 * Lighting design. Owner: Fable 2 (placement) under Fable 1's colour script.
 *
 * The plan, not a scatter of lights:
 *  - One sun. Cold overcast daylight from the south-west, with a shadow camera that follows the
 *    player and snaps to texel boundaries so shadows never shimmer.
 *  - Snow bounce: a second, very soft fill from below-south that only exists because the whole
 *    site is covered in snow. It is what stops window reveals going black.
 *  - Every ceiling fixture is a real object with emissive glass and a budgeted point light. The
 *    budget keeps the nearest N alive and disables the rest, so a 90-fixture building costs the
 *    same as a 10-fixture one.
 *  - Service spaces are dim but never unreadable: navigation strips and exit signs guarantee a
 *    legible path.
 */
import * as THREE from 'three';
import { ROOMS, type LightZone, type RoomDef } from './MapLayout';
import { ATMOSPHERE, Palette } from '../art/Palette';
import { box, buildMesh, cylinder, meshOf, rotatedX, translated, type Part } from '../assets/GeomKit';
import { Mat } from '../assets/Materials';
import { drawTexture, FONT_STACK } from '../assets/TextureLab';
import type { QualityProfile } from '../core/Types';

/**
 * A fixture's *description*. Fixtures are not lights: they are entries in a table that a small
 * fixed pool of real point lights is assigned to each frame.
 *
 * This matters more than it sounds. three.js bakes the light count into every shader program,
 * so leaving ninety point lights in the scene and merely zeroing their intensity would compile
 * ninety-light shaders for every material in the building. A fixed pool keeps exactly one
 * program per material no matter how many fixtures the level contains.
 */
export interface ManagedLight {
  baseIntensity: number;
  color: number;
  position: THREE.Vector3;
  radius: number;
  room: string;
  /** Flickering fixtures. */
  flicker: boolean;
  /** Emissive material of the fixture lens. */
  lens?: THREE.MeshStandardMaterial;
  on: boolean;
  /** Index of the pool light currently driving this fixture, or -1. */
  slot: number;
}

export class LightingRig {
  readonly group = new THREE.Group();
  readonly sun: THREE.DirectionalLight;
  readonly bounce: THREE.DirectionalLight;
  readonly hemi: THREE.HemisphereLight;
  readonly ambient: THREE.AmbientLight;
  readonly managed: ManagedLight[] = [];
  /** Fixed pool of real point lights; size never changes after construction. */
  private pool: THREE.PointLight[] = [];
  private poolOwner: (ManagedLight | null)[] = [];
  private profile: QualityProfile;
  private shadowRadius = 30;
  private time = 0;
  private sunTarget = new THREE.Object3D();

  constructor(profile: QualityProfile) {
    this.profile = profile;
    this.group.name = 'lighting';

    this.sun = new THREE.DirectionalLight(Palette.light.daylight, 2.35);
    this.sun.position.set(
      ATMOSPHERE.sunDir.x * 60,
      ATMOSPHERE.sunDir.y * 60,
      ATMOSPHERE.sunDir.z * 60,
    );
    this.sun.castShadow = profile.shadowsEnabled;
    this.sun.shadow.mapSize.set(profile.shadowMapSize, profile.shadowMapSize);
    this.sun.shadow.bias = -0.0006;
    this.sun.shadow.normalBias = 0.028;
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 190;
    this.shadowRadius = profile.tier === 'low' ? 20 : profile.tier === 'medium' ? 30 : 42;
    this.applyShadowExtent();
    this.group.add(this.sun);
    this.group.add(this.sunTarget);
    this.sun.target = this.sunTarget;

    // Snow bounce: broad, dim, from the opposite side and slightly below the horizon.
    this.bounce = new THREE.DirectionalLight(Palette.light.snowBounce, 0.5);
    this.bounce.position.set(30, 8, -40);
    this.bounce.castShadow = false;
    this.group.add(this.bounce);

    this.hemi = new THREE.HemisphereLight(ATMOSPHERE.skyTop, 0xb9c4cc, 0.55);
    this.group.add(this.hemi);

    // A small constant term guarantees no surface is ever pure black.
    this.ambient = new THREE.AmbientLight(0x93a4b4, 0.34);
    this.group.add(this.ambient);

    this.buildPool(profile.maxDynamicLights);
  }

  private buildPool(size: number): void {
    for (const l of this.pool) this.group.remove(l);
    this.pool = [];
    this.poolOwner = [];
    for (let i = 0; i < size; i++) {
      const l = new THREE.PointLight(0xffffff, 0, 8, 2);
      l.castShadow = false;
      l.position.set(0, -100, 0);
      this.group.add(l);
      this.pool.push(l);
      this.poolOwner.push(null);
    }
  }

  private applyShadowExtent(): void {
    const c = this.sun.shadow.camera;
    c.left = -this.shadowRadius;
    c.right = this.shadowRadius;
    c.top = this.shadowRadius;
    c.bottom = -this.shadowRadius;
    c.updateProjectionMatrix();
  }

  setProfile(p: QualityProfile): void {
    const poolChanged = p.maxDynamicLights !== this.profile.maxDynamicLights;
    this.profile = p;
    this.sun.castShadow = p.shadowsEnabled;
    this.sun.shadow.mapSize.set(p.shadowMapSize, p.shadowMapSize);
    this.shadowRadius = p.tier === 'low' ? 20 : p.tier === 'medium' ? 30 : 42;
    this.applyShadowExtent();
    if (this.sun.shadow.map) {
      this.sun.shadow.map.dispose();
      this.sun.shadow.map = null as unknown as THREE.WebGLRenderTarget;
    }
    if (poolChanged) {
      for (const m of this.managed) m.slot = -1;
      this.buildPool(p.maxDynamicLights);
    }
  }

  add(l: ManagedLight): void {
    this.managed.push(l);
  }

  /**
   * Assign the pool to the nearest fixtures. Slots that already hold a fixture still in range
   * keep it, so lights do not flick between sources as the player walks.
   */
  update(dt: number, cameraPos: THREE.Vector3): void {
    this.time += dt;

    // Shadow camera follows the player, snapped to texel size to keep edges stable.
    const texel = (this.shadowRadius * 2) / this.profile.shadowMapSize;
    const sx = Math.round(cameraPos.x / texel) * texel;
    const sz = Math.round(cameraPos.z / texel) * texel;
    this.sunTarget.position.set(sx, 1.2, sz);
    this.sun.position.set(
      sx + ATMOSPHERE.sunDir.x * 70,
      1.2 + ATMOSPHERE.sunDir.y * 70,
      sz + ATMOSPHERE.sunDir.z * 70,
    );
    this.sunTarget.updateMatrixWorld();

    // Candidate fixtures, nearest first.
    const candidates: ManagedLight[] = [];
    for (const m of this.managed) {
      if (!m.on || m.baseIntensity <= 0) {
        if (m.slot >= 0) {
          this.poolOwner[m.slot] = null;
          this.pool[m.slot].intensity = 0;
          m.slot = -1;
        }
        continue;
      }
      const d = m.position.distanceTo(cameraPos);
      if (d > m.radius + 12) {
        if (m.slot >= 0) {
          this.poolOwner[m.slot] = null;
          this.pool[m.slot].intensity = 0;
          m.slot = -1;
        }
        continue;
      }
      candidates.push(m);
    }
    candidates.sort(
      (a, b) => a.position.distanceToSquared(cameraPos) - b.position.distanceToSquared(cameraPos),
    );
    const keep = new Set(candidates.slice(0, this.pool.length));

    // Release slots whose fixture dropped out of the keep set.
    for (let i = 0; i < this.pool.length; i++) {
      const owner = this.poolOwner[i];
      if (owner && !keep.has(owner)) {
        owner.slot = -1;
        this.poolOwner[i] = null;
        this.pool[i].intensity = 0;
      }
    }
    // Fill free slots.
    let slot = 0;
    for (const m of keep) {
      if (m.slot >= 0) continue;
      while (slot < this.pool.length && this.poolOwner[slot] !== null) slot++;
      if (slot >= this.pool.length) break;
      this.poolOwner[slot] = m;
      m.slot = slot;
      const l = this.pool[slot];
      l.color.setHex(m.color);
      l.distance = m.radius;
      l.position.copy(m.position);
      slot++;
    }
    // Drive intensities (and flicker).
    for (let i = 0; i < this.pool.length; i++) {
      const owner = this.poolOwner[i];
      if (!owner) {
        this.pool[i].intensity = 0;
        continue;
      }
      let k = 1;
      if (owner.flicker) {
        const t = this.time * 11 + owner.position.x * 3.1 + owner.position.z * 1.7;
        k = Math.sin(t) * Math.sin(t * 2.7) > 0.1 ? 1 : 0.1;
        if (owner.lens) owner.lens.emissiveIntensity = 1.4 * k + 0.05;
      }
      this.pool[i].intensity = owner.baseIntensity * k * this.zoneScale;
    }
  }

  private zoneScale = 1;

  debugPool(): { room: string; intensity: number; pos: [number, number, number] }[] {
    return this.pool.map((l, i) => ({
      room: this.poolOwner[i]?.room ?? '-',
      intensity: Math.round(l.intensity * 100) / 100,
      pos: [
        Math.round(l.position.x * 10) / 10,
        Math.round(l.position.y * 10) / 10,
        Math.round(l.position.z * 10) / 10,
      ] as [number, number, number],
    }));
  }

  /** Switch every fixture in a room, used by the QA lighting scenarios. */
  setRoomPower(roomId: string, on: boolean): void {
    for (const m of this.managed) {
      if (m.room !== roomId) continue;
      m.on = on;
      if (m.lens) m.lens.emissiveIntensity = on ? 1.4 : 0.02;
    }
  }

  setScenario(name: 'production' | 'neutral' | 'blackout' | 'emergency' | 'daylight'): void {
    switch (name) {
      case 'neutral':
        this.ambient.intensity = 1.35;
        this.hemi.intensity = 1.1;
        this.sun.intensity = 1.3;
        this.bounce.intensity = 0.6;
        break;
      case 'blackout':
        this.ambient.intensity = 0.08;
        this.hemi.intensity = 0.1;
        this.sun.intensity = 0.35;
        this.bounce.intensity = 0.06;
        for (const m of this.managed) {
          m.on = m.color === Palette.light.emergency;
          if (m.lens) m.lens.emissiveIntensity = m.on ? 1.4 : 0.02;
        }
        break;
      case 'emergency':
        this.ambient.intensity = 0.12;
        this.hemi.intensity = 0.14;
        this.sun.intensity = 0.7;
        this.bounce.intensity = 0.12;
        break;
      case 'daylight':
        this.ambient.intensity = 0.6;
        this.hemi.intensity = 1.0;
        this.sun.intensity = 3.4;
        this.bounce.intensity = 0.9;
        break;
      case 'production':
      default:
        this.ambient.intensity = 0.34;
        this.hemi.intensity = 0.55;
        this.sun.intensity = 2.35;
        this.bounce.intensity = 0.5;
        for (const m of this.managed) m.on = true;
        break;
    }
  }
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** Recessed 1200x300 fluorescent troffer. */
export function trofferFixture(large: boolean): { group: THREE.Group; lens: THREE.MeshStandardMaterial } {
  const g = new THREE.Group();
  const w = 1.2;
  const d = large ? 0.6 : 0.3;
  const parts: Part[] = [];
  const bodyMat = Mat.paintedMetal({ color: 0xdcdedf, seed: 901, wear: 0.15 });
  const housing = box(w, 0.09, d, { bevel: 0.006 });
  housing.translate(0, 0.045, 0);
  parts.push({ geo: housing, mat: bodyMat, uvScale: 2 });
  const flange = box(w + 0.05, 0.014, d + 0.05, { bevel: 0.004 });
  flange.translate(0, 0.007, 0);
  parts.push({ geo: flange, mat: bodyMat, uvScale: 3 });
  g.add(buildMesh(parts, 'troffer-body'));

  const lensMat = new THREE.MeshStandardMaterial({
    color: 0x1a1c1e,
    emissive: new THREE.Color(Palette.light.fluorescent),
    emissiveIntensity: 1.4,
    roughness: 0.35,
    metalness: 0,
    transparent: true,
    opacity: 0.95,
  });
  const lens = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.06, d - 0.06), lensMat);
  lens.rotation.x = Math.PI / 2;
  lens.position.y = -0.002;
  lens.castShadow = false;
  lens.receiveShadow = false;
  g.add(lens);
  return { group: g, lens: lensMat };
}

/** Surface-mounted service strip light with a wire guard. */
export function stripFixture(): { group: THREE.Group; lens: THREE.MeshStandardMaterial } {
  const g = new THREE.Group();
  const parts: Part[] = [];
  const mat = Mat.paintedMetal({ color: 0xb6babd, seed: 903, wear: 0.4 });
  const body = box(1.25, 0.07, 0.09, { bevel: 0.006 });
  parts.push({ geo: body, mat, uvScale: 3 });
  for (const s of [-1, 1]) {
    const bracket = box(0.03, 0.09, 0.12, { bevel: 0.004 });
    bracket.translate(s * 0.5, 0.05, 0);
    parts.push({ geo: bracket, mat, uvScale: 5 });
  }
  // wire guard
  for (let i = 0; i < 5; i++) {
    const w = cylinder(0.004, 0.004, 0.14, 6);
    rotatedX(w, Math.PI / 2);
    translated(w, -0.5 + i * 0.25, -0.05, 0);
    parts.push({ geo: w, mat: Mat.stainless({ seed: 905 }), uvScale: 20 });
  }
  g.add(buildMesh(parts, 'strip-body'));
  const lensMat = new THREE.MeshStandardMaterial({
    color: 0x141618,
    emissive: new THREE.Color(0xdfe8ea),
    emissiveIntensity: 1.35,
    roughness: 0.4,
  });
  const lens = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 0.075), lensMat);
  lens.rotation.x = Math.PI / 2;
  lens.position.y = -0.036;
  lens.castShadow = false;
  g.add(lens);
  return { group: g, lens: lensMat };
}

/** Lobby pendant: brushed cylinder with a warm emissive base. */
export function pendantFixture(dropLength: number): { group: THREE.Group; lens: THREE.MeshStandardMaterial } {
  const g = new THREE.Group();
  const parts: Part[] = [];
  const cord = cylinder(0.006, 0.006, dropLength, 6);
  cord.translate(0, -dropLength / 2, 0);
  parts.push({ geo: cord, mat: Mat.solid(0x1d2023, 0.7, 0.1), uvScale: 20 });
  const shade = cylinder(0.14, 0.19, 0.24, 20, true);
  shade.translate(0, -dropLength - 0.12, 0);
  parts.push({ geo: shade, mat: Mat.paintedMetal({ color: 0x2a2f34, seed: 907, wear: 0.1 }), uvScale: 4 });
  const cap = cylinder(0.05, 0.14, 0.05, 20);
  cap.translate(0, -dropLength + 0.02, 0);
  parts.push({ geo: cap, mat: Mat.paintedMetal({ color: 0x2a2f34, seed: 907, wear: 0.1 }), uvScale: 6 });
  g.add(buildMesh(parts, 'pendant'));
  const lensMat = new THREE.MeshStandardMaterial({
    color: 0x100f0d,
    emissive: new THREE.Color(0xfff1d8),
    emissiveIntensity: 1.25,
    roughness: 0.3,
  });
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.175, 20), lensMat);
  lens.rotation.x = Math.PI / 2;
  lens.position.y = -dropLength - 0.238;
  lens.castShadow = false;
  g.add(lens);
  return { group: g, lens: lensMat };
}

/** Emergency twin-spot with a red maintained lamp. */
export function emergencyFixture(): { group: THREE.Group; lens: THREE.MeshStandardMaterial } {
  const g = new THREE.Group();
  const parts: Part[] = [];
  const mat = Mat.hardPlastic({ color: 0xd8d5cc, seed: 911 });
  const body = box(0.28, 0.11, 0.09, { bevel: 0.008, segments: 2 });
  parts.push({ geo: body, mat, uvScale: 5 });
  for (const s of [-1, 1]) {
    const head = cylinder(0.033, 0.038, 0.055, 12);
    rotatedX(head, Math.PI / 2);
    translated(head, s * 0.08, 0.0, 0.06);
    parts.push({ geo: head, mat, uvScale: 8 });
  }
  g.add(buildMesh(parts, 'emergency'));
  const lensMat = new THREE.MeshStandardMaterial({
    color: 0x120404,
    emissive: new THREE.Color(Palette.light.emergency),
    emissiveIntensity: 2.6,
    roughness: 0.28,
  });
  for (const s of [-1, 1]) {
    const l = new THREE.Mesh(new THREE.CircleGeometry(0.028, 12), lensMat);
    l.position.set(s * 0.08, 0, 0.089);
    l.castShadow = false;
    g.add(l);
  }
  return { group: g, lens: lensMat };
}

/** Illuminated running-man exit sign. */
export function exitSign(): THREE.Group {
  const g = new THREE.Group();
  const key = 'exit-sign-face';
  const tex = drawTexture(key, 256, 128, (ctx, w, h) => {
    ctx.fillStyle = '#0a1a10';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#2ee07a';
    ctx.font = `700 ${h * 0.52}px ${FONT_STACK.display}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('EXIT', w * 0.34, h * 0.53);
    // running figure
    ctx.save();
    ctx.translate(w * 0.16, h * 0.5);
    ctx.fillStyle = '#2ee07a';
    ctx.beginPath();
    ctx.arc(0, -h * 0.24, h * 0.075, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = h * 0.085;
    ctx.strokeStyle = '#2ee07a';
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-h * 0.04, -h * 0.14);
    ctx.lineTo(h * 0.06, h * 0.04);
    ctx.moveTo(h * 0.06, h * 0.04);
    ctx.lineTo(-h * 0.06, h * 0.24);
    ctx.moveTo(h * 0.06, h * 0.04);
    ctx.lineTo(h * 0.16, h * 0.24);
    ctx.moveTo(-h * 0.03, -h * 0.08);
    ctx.lineTo(-h * 0.18, h * 0.0);
    ctx.moveTo(h * 0.0, -h * 0.06);
    ctx.lineTo(h * 0.16, -h * 0.14);
    ctx.stroke();
    ctx.restore();
    // arrow
    ctx.fillStyle = '#2ee07a';
    ctx.beginPath();
    ctx.moveTo(w * 0.94, h * 0.5);
    ctx.lineTo(w * 0.84, h * 0.32);
    ctx.lineTo(w * 0.84, h * 0.68);
    ctx.closePath();
    ctx.fill();
  });
  const bodyMat = Mat.hardPlastic({ color: 0x2c3237, seed: 913 });
  const body = box(0.34, 0.16, 0.035, { bevel: 0.005 });
  g.add(meshOf(body, bodyMat, { uvScale: 5, name: 'exit-body', cast: false }));
  const faceMat = new THREE.MeshStandardMaterial({
    map: tex,
    emissiveMap: tex,
    emissive: new THREE.Color(0xffffff),
    emissiveIntensity: 1.9,
    color: 0x0a0a0a,
    roughness: 0.4,
  });
  for (const s of [-1, 1]) {
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.145), faceMat);
    face.position.z = s * 0.019;
    face.rotation.y = s > 0 ? 0 : Math.PI;
    face.castShadow = false;
    g.add(face);
  }
  const stem = box(0.02, 0.12, 0.02, { bevel: 0.003 });
  stem.translate(0, 0.13, 0);
  g.add(meshOf(stem, bodyMat, { uvScale: 8, name: 'exit-stem', cast: false }));
  return g;
}

/** Wall-washing navigation strip used in the service corridor. */
export function navStrip(length: number): { group: THREE.Group; lens: THREE.MeshStandardMaterial } {
  const g = new THREE.Group();
  const housing = box(length, 0.045, 0.05, { bevel: 0.004 });
  g.add(meshOf(housing, Mat.aluminium({ seed: 915 }), { uvScale: 4, name: 'nav-housing', cast: false }));
  const lensMat = new THREE.MeshStandardMaterial({
    color: 0x0c0e10,
    emissive: new THREE.Color(Palette.light.navStrip),
    emissiveIntensity: 1.5,
    roughness: 0.45,
  });
  const lens = new THREE.Mesh(new THREE.PlaneGeometry(length - 0.05, 0.03), lensMat);
  lens.position.set(0, -0.005, 0.026);
  lens.castShadow = false;
  g.add(lens);
  return { group: g, lens: lensMat };
}

/** Adjustable warm desk lamp. */
export function deskLamp(): { group: THREE.Group; lens: THREE.MeshStandardMaterial } {
  const g = new THREE.Group();
  const parts: Part[] = [];
  const mat = Mat.paintedMetal({ color: 0x2c3034, seed: 917, wear: 0.2 });
  const base = cylinder(0.085, 0.095, 0.018, 18);
  base.translate(0, 0.009, 0);
  parts.push({ geo: base, mat, uvScale: 6 });
  const arm1 = cylinder(0.009, 0.009, 0.3, 8);
  arm1.rotateZ(0.42);
  arm1.translate(0.06, 0.15, 0);
  parts.push({ geo: arm1, mat, uvScale: 12 });
  const arm2 = cylinder(0.009, 0.009, 0.26, 8);
  arm2.rotateZ(-0.9);
  arm2.translate(0.2, 0.31, 0);
  parts.push({ geo: arm2, mat, uvScale: 12 });
  const shade = cylinder(0.05, 0.075, 0.09, 16, true);
  shade.rotateZ(0.5);
  shade.translate(0.3, 0.36, 0);
  parts.push({ geo: shade, mat, uvScale: 8 });
  g.add(buildMesh(parts, 'desk-lamp'));
  const lensMat = new THREE.MeshStandardMaterial({
    color: 0x120e08,
    emissive: new THREE.Color(Palette.light.warmLamp),
    emissiveIntensity: 2.4,
    roughness: 0.3,
  });
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.068, 16), lensMat);
  lens.position.set(0.324, 0.322, 0);
  lens.rotation.set(Math.PI / 2, 0, -0.5);
  lens.castShadow = false;
  g.add(lens);
  return { group: g, lens: lensMat };
}

// ---------------------------------------------------------------------------
// Plan generation
// ---------------------------------------------------------------------------

interface ZoneSpec {
  color: number;
  intensity: number;
  radius: number;
  spacing: number;
  fixture: 'troffer' | 'troffer-large' | 'strip' | 'pendant' | 'emergency' | 'server';
}

const ZONE: Record<LightZone, ZoneSpec> = {
  'daylight-cold': { color: 0xe8f1f7, intensity: 3.8, radius: 8, spacing: 4.2, fixture: 'troffer-large' },
  fluorescent: { color: Palette.light.fluorescent, intensity: 3.4, radius: 7, spacing: 3.4, fixture: 'troffer' },
  'warm-occupied': { color: 0xffe4bd, intensity: 3.6, radius: 7, spacing: 3.6, fixture: 'troffer-large' },
  'service-dim': { color: 0xdfe9ee, intensity: 2.6, radius: 6, spacing: 4.6, fixture: 'strip' },
  'server-cool': { color: 0xcfe4ff, intensity: 2.8, radius: 6, spacing: 3.4, fixture: 'strip' },
  emergency: { color: Palette.light.emergency, intensity: 2.4, radius: 7, spacing: 5.0, fixture: 'emergency' },
  exterior: { color: 0xffffff, intensity: 0, radius: 0, spacing: 99, fixture: 'troffer' },
};

/** Rooms whose finishes are unusually bright or dark get a per-room exposure correction. */
const ROOM_LIGHT_TRIM: Record<string, number> = {
  'restroom-a': 0.6,
  'restroom-b': 0.6,
  'restroom-vest': 0.65,
  conference: 0.85,
  execoffice: 0.9,
  openplan: 0.88,
  breakroom: 0.9,
  garage: 1.25,
  loading: 1.2,
  mech: 1.15,
  janitor: 1.15,
  facilities: 1.15,
  archive: 0.95,
};

/** Build every fixture in the building and register its managed light. */
export function buildLighting(rig: LightingRig, root: THREE.Group): void {
  const g = new THREE.Group();
  g.name = 'fixtures';
  root.add(g);

  for (const room of ROOMS) {
    if (room.exterior) continue;
    const spec = ZONE[room.light];
    if (room.id === 'lobby') {
      buildLobbyLighting(rig, g, room);
      continue;
    }
    if (room.id === 'server') {
      buildServerLighting(rig, g, room);
      continue;
    }
    if (room.id === 'servicecorr') {
      buildCorridorLighting(rig, g, room);
      continue;
    }
    for (const r of room.rects) {
      const w = r.x1 - r.x0;
      const d = r.z1 - r.z0;
      const nx = Math.max(1, Math.round(w / spec.spacing));
      const nz = Math.max(1, Math.round(d / spec.spacing));
      for (let ix = 0; ix < nx; ix++) {
        for (let iz = 0; iz < nz; iz++) {
          const x = r.x0 + (w * (ix + 0.5)) / nx;
          const z = r.z0 + (d * (iz + 0.5)) / nz;
          const y = room.ceilingY - 0.02;
          let lens: THREE.MeshStandardMaterial | undefined;
          if (spec.fixture === 'emergency') {
            const f = emergencyFixture();
            f.group.position.set(x, Math.min(y, room.floorY + 2.6), z);
            g.add(f.group);
            lens = f.lens;
          } else if (spec.fixture === 'strip') {
            const f = stripFixture();
            f.group.position.set(x, y - 0.05, z);
            f.group.rotation.y = w >= d ? 0 : Math.PI / 2;
            g.add(f.group);
            lens = f.lens;
          } else {
            const f = trofferFixture(spec.fixture === 'troffer-large');
            f.group.position.set(x, y, z);
            f.group.rotation.y = w >= d ? 0 : Math.PI / 2;
            g.add(f.group);
            lens = f.lens;
          }
          // Environmental storytelling: a handful of dead or failing tubes.
          const hash = Math.abs(Math.round(x * 137 + z * 71)) % 23;
          const flicker = hash === 3 && (room.light === 'service-dim' || room.light === 'fluorescent');
          const dead = hash === 11 && room.light === 'service-dim';
          const trim = ROOM_LIGHT_TRIM[room.id] ?? 1;
          rig.add({
            baseIntensity: dead ? 0 : spec.intensity * trim,
            color: spec.color,
            position: new THREE.Vector3(x, y - 0.12, z),
            radius: spec.radius,
            room: room.id,
            flicker,
            lens,
            on: !dead,
            slot: -1,
          });
          if (dead && lens) lens.emissiveIntensity = 0.03;
        }
      }
    }
  }

  buildExitSigns(g);
  buildEmergencyLights(rig, g);
}

function buildLobbyLighting(rig: LightingRig, g: THREE.Group, room: RoomDef): void {
  // Pendant cluster over the reception desk plus perimeter downlights at the mezzanine soffit.
  const pendants: [number, number, number][] = [
    [-3.2, 5.2, 3.2], [-1.6, 6.6, 4.0], [0.2, 5.0, 2.6], [1.8, 6.4, 3.6], [3.4, 5.4, 3.0],
    [-5.5, 8.6, 4.2], [5.5, 8.4, 4.0],
  ];
  for (const [x, z, drop] of pendants) {
    const f = pendantFixture(drop);
    f.group.position.set(x, 7.55, z);
    g.add(f.group);
    rig.add({
      baseIntensity: 4.4, color: 0xffe8c8, position: new THREE.Vector3(x, 7.55 - drop - 0.3, z),
      radius: 11, room: room.id, flicker: false, lens: f.lens, on: true, slot: -1,
    });
  }
  // Cool wall-wash along the glazed south facade.
  for (const x of [-6.5, 0, 6.5]) {
    rig.add({
      baseIntensity: 3.4, color: 0xd6e8f7, position: new THREE.Vector3(x, 4.4, 12.2),
      radius: 10, room: room.id, flicker: false, on: true, slot: -1,
    });
  }
  // North wall of the double-height volume: without this the big feature wall goes flat black
  // when the player is standing at the far south end of the lobby.
  for (const [x, z, y] of [[-6, 2.6, 5.2], [0, 2.6, 5.6], [6, 2.6, 5.2]] as [number, number, number][]) {
    rig.add({
      baseIntensity: 3.0, color: 0xdfe9f2, position: new THREE.Vector3(x, y, z),
      radius: 9, room: room.id, flicker: false, on: true, slot: -1,
    });
  }
  // Under-mezzanine downlights keep the north side of the lobby readable.
  for (const x of [-6, -2, 2, 6]) {
    const f = trofferFixture(false);
    f.group.position.set(x, 3.95, 2.6);
    f.group.rotation.y = Math.PI / 2;
    g.add(f.group);
    rig.add({
      baseIntensity: 3.6, color: Palette.light.fluorescent, position: new THREE.Vector3(x, 3.8, 2.6),
      radius: 7, room: room.id, flicker: false, lens: f.lens, on: true, slot: -1,
    });
  }
}

function buildServerLighting(rig: LightingRig, g: THREE.Group, room: RoomDef): void {
  const r = room.rects[0];
  for (let i = 0; i < 4; i++) {
    const x = r.x0 + ((r.x1 - r.x0) * (i + 0.5)) / 4;
    const f = stripFixture();
    f.group.position.set(x, room.ceilingY - 0.06, (r.z0 + r.z1) / 2);
    f.group.rotation.y = Math.PI / 2;
    g.add(f.group);
    rig.add({
      baseIntensity: 3.0, color: 0xd2e6ff,
      position: new THREE.Vector3(x, room.ceilingY - 0.2, (r.z0 + r.z1) / 2),
      radius: 6.5, room: room.id, flicker: false, lens: f.lens, on: true, slot: -1,
    });
  }
  // Cold aisle glow from the rack faces themselves.
  for (const [x, z] of [[14.6, -18.6], [18.4, -18.6], [14.6, -16.1], [18.4, -16.1]] as [number, number][]) {
    rig.add({
      baseIntensity: 2.4, color: Palette.light.serverBlue, position: new THREE.Vector3(x, 1.1, z),
      radius: 4.5, room: room.id, flicker: false, on: true, slot: -1,
    });
  }
}

function buildCorridorLighting(rig: LightingRig, g: THREE.Group, room: RoomDef): void {
  const r = room.rects[0];
  const z = (r.z0 + r.z1) / 2;
  // Alternating strip lights leave pools of shadow between them, but a continuous nav strip on
  // the wall means the route is always readable.
  for (let x = r.x0 + 2.6; x < r.x1 - 1; x += 5.2) {
    const f = stripFixture();
    f.group.position.set(x, room.ceilingY - 0.07, z);
    g.add(f.group);
    const hash = Math.abs(Math.round(x * 31)) % 7;
    const flicker = hash === 2;
    rig.add({
      baseIntensity: 3.2, color: 0xdce8ee, position: new THREE.Vector3(x, room.ceilingY - 0.22, z),
      radius: 7, room: room.id, flicker, lens: f.lens, on: true, slot: -1,
    });
  }
  for (let x = r.x0 + 1; x < r.x1 - 2; x += 6) {
    const n = navStrip(4.2);
    n.group.position.set(x + 2.1, 0.42, r.z0 + 0.12);
    g.add(n.group);
  }
}

function buildExitSigns(g: THREE.Group): void {
  const places: [number, number, number, number][] = [
    [0, 2.42, 10.35, 0],          // vestibule -> courtyard
    [0, 2.42, 13.85, Math.PI],    // outer doors
    [-10, 2.42, -11.2, 0],        // open plan -> service corridor
    [2.5, 2.42, -11.2, 0],
    [9.5, 2.42, -11.2, 0],        // stairwell
    [6.2, 2.42, -8.5, Math.PI / 2],
    [-12.2, 2.42, -12.75, Math.PI / 2],
    [-9.7, 2.42, -14.35, 0],      // garage door
    [12.8, 2.42, -12.75, -Math.PI / 2],
    [-4.2, 6.42, -4.1, 0],        // exec corridor (level 1)
    [11, 6.42, -4.1, 0],
    [9, 2.42, 2.1, 0],            // concourse
    [-9, 2.42, 2.1, 0],
  ];
  for (const [x, y, z, rot] of places) {
    const s = exitSign();
    s.position.set(x, y, z);
    s.rotation.y = rot;
    g.add(s);
  }
}

function buildEmergencyLights(rig: LightingRig, g: THREE.Group): void {
  const places: [number, number, number, number, string][] = [
    [-15, 3.4, -14.6, 0, 'garage'],
    [-5, 3.4, -14.6, 0, 'loading'],
    [0, 2.6, -11.2, 0, 'servicecorr'],
    [-14, 2.6, -11.2, 0, 'servicecorr'],
    [9.5, 2.6, -4.2, Math.PI, 'stairwell'],
    [12.8, 5.6, -6, -Math.PI / 2, 'stairwell-up'],
    [-11.8, 2.6, -7, Math.PI / 2, 'archive'],
    [2, 2.6, -20.8, Math.PI, 'mech'],
  ];
  for (const [x, y, z, rot, room] of places) {
    const f = emergencyFixture();
    f.group.position.set(x, y, z);
    f.group.rotation.y = rot;
    g.add(f.group);
    rig.add({
      baseIntensity: 1.6, color: Palette.light.emergency,
      position: new THREE.Vector3(x + Math.sin(rot) * 0.3, y - 0.1, z + Math.cos(rot) * 0.3),
      radius: 5.5, room, flicker: false, lens: f.lens, on: true, slot: -1,
    });
  }
}
