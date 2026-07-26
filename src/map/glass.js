import * as THREE from 'three';
import { mat } from '../art/materials.js';
import { box } from '../art/geometry.js';
import { bus, EV } from '../core/events.js';
import { collision } from './collision.js';
import { decalTexture } from '../art/textures.js';
import { makeRng } from '../core/rng.js';
import { reg, OWNERS } from '../core/assets.js';

/**
 * GLASS
 * Owner: Fable 2 (glazing) + Fable 4 (fracture effects) + Opus 2 (ballistics).
 *
 * Panes are individual meshes so a single lite can crack and then shatter
 * without taking the whole curtain wall with it. Three states are authored:
 *   intact  → thin transmissive pane, blocks movement, does not block sight
 *   cracked → crack decal overlay, still solid, roughness raised
 *   broken  → pane removed, jagged remnant border, falling shard particles
 */

export function buildGlass(panes) {
  return panes;
}

function crackTexture(seed) {
  return decalTexture(`crack:${seed}`, 512, (ctx, size) => {
    const rng = makeRng(seed);
    const cx = size * (0.3 + rng() * 0.4);
    const cy = size * (0.3 + rng() * 0.4);
    ctx.lineCap = 'round';
    const radials = 9 + Math.floor(rng() * 6);
    const ends = [];
    for (let i = 0; i < radials; i++) {
      const a = (i / radials) * Math.PI * 2 + rng() * 0.3;
      const len = size * (0.18 + rng() * 0.36);
      let x = cx;
      let y = cy;
      ctx.beginPath();
      ctx.moveTo(x, y);
      const steps = 5;
      for (let s = 0; s < steps; s++) {
        x += (Math.cos(a) * len) / steps + (rng() - 0.5) * 9;
        y += (Math.sin(a) * len) / steps + (rng() - 0.5) * 9;
        ctx.lineTo(x, y);
      }
      ctx.strokeStyle = `rgba(255,255,255,${0.55 + rng() * 0.4})`;
      ctx.lineWidth = 1.1 + rng() * 1.6;
      ctx.stroke();
      ends.push([x, y]);
    }
    // Concentric webs
    for (let r = 1; r < 4; r++) {
      ctx.beginPath();
      for (let i = 0; i <= radials; i++) {
        const [ex, ey] = ends[i % radials];
        const t = r / 4;
        const px = cx + (ex - cx) * t + (rng() - 0.5) * 6;
        const py = cy + (ey - cy) * t + (rng() - 0.5) * 6;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.strokeStyle = `rgba(255,255,255,${0.3 + rng() * 0.25})`;
      ctx.lineWidth = 0.9 + rng();
      ctx.stroke();
    }
    // Impact crater
    const g = ctx.createRadialGradient(cx, cy, 1, cx, cy, size * 0.05);
    g.addColorStop(0, 'rgba(255,255,255,0.95)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.05, 0, Math.PI * 2);
    ctx.fill();
  });
}

export class GlassPane {
  constructor(spec, index) {
    this.id = spec.id ?? `glass.${index}`;
    this.spec = spec;
    this.state = 'intact';
    this.health = spec.matName === 'glass.frosted' ? 60 : 40;
    const w = spec.axis === 'x' ? spec.thickness : spec.b - spec.a;
    const d = spec.axis === 'x' ? spec.b - spec.a : spec.thickness;
    const h = spec.y1 - spec.y0;
    this.width = spec.b - spec.a;
    this.height = h;
    const cx = spec.axis === 'x' ? spec.at : (spec.a + spec.b) / 2;
    const cz = spec.axis === 'x' ? (spec.a + spec.b) / 2 : spec.at;
    const cy = (spec.y0 + spec.y1) / 2;
    this.center = new THREE.Vector3(cx, cy, cz);

    this.mesh = new THREE.Mesh(box(w, h, d), mat(spec.matName));
    this.mesh.position.copy(this.center);
    this.mesh.castShadow = false;
    this.mesh.receiveShadow = false;
    this.mesh.userData.matName = spec.matName;
    this.mesh.userData.glassPane = this;
    // Only low-iron interior glazing is transparent to AI sight. Solar-tinted
    // exterior glass reads as a mirror from outside in a snowstorm, and frosted
    // glass diffuses completely — otherwise lobby guards spot the operator in
    // the courtyard through the curtain wall and the building alerts on frame one.
    this.mesh.userData.transparentToSight = spec.matName === 'glass.clear';
    this.mesh.name = this.id;

    this.collider = {
      x0: cx - w / 2 - 0.01, y0: spec.y0, z0: cz - d / 2 - 0.01,
      x1: cx + w / 2 + 0.01, y1: spec.y1, z1: cz + d / 2 + 0.01,
      surface: 'glass', tag: 'glass',
    };
  }

  crack(point) {
    if (this.state !== 'intact') return;
    this.state = 'cracked';
    const m = mat('glass.cracked').clone();
    m.map = crackTexture(Math.floor(this.center.x * 31 + this.center.z * 17) & 0xffff);
    m.transparent = true;
    m.opacity = 0.55;
    m.roughness = 0.3;
    this.mesh.material = m;
    bus.emit(EV.GLASS_BROKEN, { pane: this, state: 'cracked', point: point ?? this.center.clone() });
  }

  shatter(point, dir) {
    if (this.state === 'broken') return;
    this.state = 'broken';
    this.mesh.visible = false;
    this.collider.noClip = true;
    this.collider.y1 = this.collider.y0 + 0.02;
    bus.emit(EV.GLASS_BROKEN, {
      pane: this, state: 'broken',
      point: point ?? this.center.clone(),
      dir: dir ?? new THREE.Vector3(0, 0, 1),
      width: this.width, height: this.height, center: this.center.clone(),
      axis: this.spec.axis,
    });
  }

  damage(amount, point, dir) {
    this.health -= amount;
    if (this.health <= 0) this.shatter(point, dir);
    else if (this.health < 26) this.crack(point);
  }

  reset() {
    this.state = 'intact';
    this.health = this.spec.matName === 'glass.frosted' ? 60 : 40;
    this.mesh.visible = true;
    this.mesh.material = mat(this.spec.matName);
    this.collider.noClip = false;
    this.collider.y1 = this.spec.y1;
  }
}

export class GlassSystem {
  constructor(parent) {
    this.group = new THREE.Group();
    this.group.name = 'glass';
    parent.add(this.group);
    this.panes = [];
    this.remnants = new THREE.Group();
    this.group.add(this.remnants);
  }

  build(specs) {
    let i = 0;
    for (const s of specs) {
      const p = new GlassPane(s, i++);
      this.panes.push(p);
      this.group.add(p.mesh);
    }
    collision.addDynamic(() => this.panes.filter((p) => !p.collider.noClip).map((p) => p.collider));
    collision.registerRaycastTarget(this.group);
    return this.panes;
  }

  paneFromObject(obj) {
    return obj?.userData?.glassPane ?? null;
  }

  update() {
    /* panes are static once built; shard particles are owned by the VFX system */
  }

  reset() {
    for (const p of this.panes) p.reset();
  }
}

let registered = false;
export function registerGlassManifest() {
  if (registered) return;
  registered = true;
  const base = {
    category: 'glass', owner: OWNERS.FABLE2,
    files: ['src/map/glass.js', 'src/map/kit.js'],
    pivot: 'pane centre, normal along the wall axis',
    collision: 'thin AABB per pane, removed on shatter',
    lod: 'single LOD; panes are two-triangle-per-face boxes',
    status: 'accepted',
    audio: ['glass.tap', 'glass.crack', 'glass.shatter', 'glass.fragments'],
  };
  const items = [
    ['glass.clear', 'Clear glazing pane', 'variable, 14 mm thick', 'interior partitions, office doors, archive and IT windows', ['glass.clear'], ['baseColor (solid)', 'clearcoat'], 'Reads as glass, not a blue wall: visible reflection, near-zero body tint, sightline unobstructed'],
    ['glass.tinted', 'Tinted exterior glazing', 'variable, 14 mm', 'lobby curtain wall, waiting area', ['glass.tinted'], ['baseColor (solid)', 'clearcoat'], 'Solar tint reads on the exterior, interior stays legible, no blown-out window'],
    ['glass.frosted', 'Frosted privacy glazing', 'variable, 14 mm', 'restroom, plant, garage clerestory, stair landing', ['glass.frosted'], ['baseColor', 'normal', 'roughness'], 'Silhouettes diffuse through it; blocks AI sight; no hard-edged transparency'],
    ['glass.cracked', 'Cracked glass state', 'matches the source pane', 'any damaged pane', ['glass.cracked'], ['crack decal (alpha)', 'baseColor'], 'Crack web radiates from the impact point, still solid, roughness raised'],
    ['glass.broken', 'Broken glass state', 'pane removed, jagged remnant', 'any destroyed pane', ['glass.cracked'], ['crack decal (alpha)'], 'Opening becomes passable to bullets and sight, remnant border visible, shards spawn'],
    ['glass.fragments', 'Glass fragment particles', '0.02–0.09 m shards', 'every shatter event', ['glass.clear'], ['baseColor (solid)'], 'Shards fall with gravity, tumble, fade after 3 s, land audibly'],
  ];
  for (const [id, name, dimensions, usedIn, materials, textures, acceptance] of items) {
    reg({ ...base, id, name, dimensions, usedIn, materials, textures, acceptance, evidence: ['screenshots/glass/*.png'] });
  }
}
