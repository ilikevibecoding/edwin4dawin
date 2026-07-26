import * as THREE from 'three';
import type { CollisionWorld } from './collision';
import { events } from '../core/events';
import { registerAsset } from '../assets/registry';
import { makeCanvas, toTexture } from '../assets/textures/gen';
import { hash2 } from '../core/rng';

registerAsset({
  id: 'arch.glass.family',
  name: 'Glass family (clear/frosted/wired panes, crack & break states)',
  category: 'glass',
  agent: 'Fable 2',
  files: 'src/world/glassy.ts',
  where: 'windows, curtain wall, interior partitions',
  dims: 'per opening',
  materials: 'physical glass (transmissive look), wired overlay',
  textures: 'procedural crack/wire canvases',
  collision: 'dynamic (removed on break)',
  lod: 'none',
  anim: 'intact → cracked → broken (+rim shards)',
  audio: 'glass-hit, glass-break',
  status: 'integrated',
  accept: 'reads as glass (reflection+transparency), crack visual on hit, full shatter with fragments and collision removal',
});

export interface PaneSpec {
  id: string;
  /** min corner */
  pos: THREE.Vector3;
  /** width along wall axis */
  w: number;
  h: number;
  /** wall axis: 'x' pane spans x, 'z' pane spans z */
  axis: 'x' | 'z';
  frosted?: boolean;
  wired?: boolean;
  breakable?: boolean;
}

let clearMat: THREE.MeshPhysicalMaterial | null = null;
let frostedMat: THREE.MeshPhysicalMaterial | null = null;
let wiredMat: THREE.MeshPhysicalMaterial | null = null;
let crackedTex: THREE.Texture | null = null;

function materials(): { clear: THREE.MeshPhysicalMaterial; frosted: THREE.MeshPhysicalMaterial; wired: THREE.MeshPhysicalMaterial } {
  if (!clearMat) {
    clearMat = new THREE.MeshPhysicalMaterial({
      color: 0xdceef0, transparent: true, opacity: 0.2, roughness: 0.04, metalness: 0,
      side: THREE.DoubleSide, depthWrite: false, envMapIntensity: 1.5,
      clearcoat: 0.6, clearcoatRoughness: 0.1,
    });
    frostedMat = new THREE.MeshPhysicalMaterial({
      color: 0xdfe9e9, transparent: true, opacity: 0.55, roughness: 0.5, metalness: 0,
      side: THREE.DoubleSide, depthWrite: false, envMapIntensity: 0.6,
    });
    const { canvas, ctx } = makeCanvas(128);
    ctx.fillStyle = 'rgba(220,232,232,0.06)';
    ctx.fillRect(0, 0, 128, 128);
    ctx.strokeStyle = 'rgba(60,70,72,0.85)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i <= 8; i++) {
      ctx.beginPath(); ctx.moveTo(i * 16, 0); ctx.lineTo(i * 16, 128); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * 16); ctx.lineTo(128, i * 16); ctx.stroke();
    }
    const wireTex = toTexture(canvas);
    wireTex.repeat.set(4, 4);
    wiredMat = new THREE.MeshPhysicalMaterial({
      map: wireTex, color: 0xffffff, transparent: true, opacity: 0.5, roughness: 0.25, metalness: 0,
      side: THREE.DoubleSide, depthWrite: false, envMapIntensity: 0.8,
    });
  }
  return { clear: clearMat, frosted: frostedMat!, wired: wiredMat! };
}

function crackTexture(): THREE.Texture {
  if (crackedTex) return crackedTex;
  const S = 256;
  const { canvas, ctx } = makeCanvas(S);
  ctx.clearRect(0, 0, S, S);
  ctx.strokeStyle = 'rgba(235,245,248,0.9)';
  const cx = S / 2, cy = S / 2;
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 + hash2(i, 3) * 0.5;
    ctx.lineWidth = 0.8 + hash2(i, 5) * 1.4;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    let x = cx, y = cy;
    const segs = 4 + Math.floor(hash2(i, 7) * 3);
    for (let s2 = 1; s2 <= segs; s2++) {
      const r = (s2 / segs) * (S * 0.48) * (0.7 + hash2(i, s2) * 0.5);
      x = cx + Math.cos(a + (hash2(i, s2 + 9) - 0.5) * 0.6) * r;
      y = cy + Math.sin(a + (hash2(i, s2 + 13) - 0.5) * 0.6) * r;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  // concentric partial rings
  for (let r = 14; r < 70; r += 16) {
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.arc(cx, cy, r, hash2(r, 1) * Math.PI * 2, hash2(r, 2) * Math.PI * 2 + Math.PI);
    ctx.stroke();
  }
  crackedTex = toTexture(canvas);
  crackedTex.wrapS = crackedTex.wrapT = THREE.ClampToEdgeWrapping;
  return crackedTex;
}

interface Pane {
  spec: PaneSpec;
  mesh: THREE.Mesh;
  rim: THREE.Group | null;
  crackSprite: THREE.Mesh | null;
  broken: boolean;
  health: number;
}

export class GlassSystem {
  readonly group = new THREE.Group();
  private panes = new Map<string, Pane>();
  private col: CollisionWorld;

  constructor(col: CollisionWorld) {
    this.col = col;
    this.group.name = 'glass';
  }

  addPane(spec: PaneSpec): void {
    const m = materials();
    const mat = spec.wired ? m.wired : spec.frosted ? m.frosted : m.clear;
    const t = 0.02;
    const size = spec.axis === 'x'
      ? new THREE.Vector3(spec.w, spec.h, t)
      : new THREE.Vector3(t, spec.h, spec.w);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), mat);
    mesh.position.set(
      spec.pos.x + (spec.axis === 'x' ? spec.w / 2 : 0),
      spec.pos.y + spec.h / 2,
      spec.pos.z + (spec.axis === 'z' ? spec.w / 2 : 0),
    );
    mesh.name = `glass:${spec.id}`;
    mesh.renderOrder = 10;
    this.group.add(mesh);
    const pane: Pane = { spec, mesh, broken: false, health: 2, rim: null, crackSprite: null };
    this.panes.set(spec.id, pane);
    this.addCollider(pane);
  }

  private addCollider(pane: Pane): void {
    const s = pane.spec;
    const half = 0.025;
    const min = new THREE.Vector3(
      s.pos.x - (s.axis === 'z' ? half : 0), s.pos.y, s.pos.z - (s.axis === 'x' ? half : 0));
    const max = new THREE.Vector3(
      s.pos.x + (s.axis === 'x' ? s.w : half), s.pos.y + s.h, s.pos.z + (s.axis === 'z' ? s.w : half));
    this.col.setDynamic({
      id: `glass:${s.id}`,
      min, max,
      surface: 'glass',
      transparent: !s.frosted && !s.wired,
      tag: s.id,
    });
  }

  /** Bullet or melee hit. Returns true if the pane broke through. */
  hit(id: string, point: THREE.Vector3, damage: number): boolean {
    const pane = this.panes.get(id);
    if (!pane || pane.broken) return true;
    if (pane.spec.breakable === false) {
      events.emit('impact', { surface: 'glass', pos: [point.x, point.y, point.z], normal: [0, 0, 1] });
      return false;
    }
    pane.health -= damage >= 25 ? 2 : 1;
    if (pane.health <= 0) {
      this.breakPane(pane, point);
      return true;
    }
    // crack overlay at hit point
    if (!pane.crackSprite) {
      const s = pane.spec;
      const size = Math.min(1.0, s.w * 0.8, s.h * 0.8);
      const geo = new THREE.PlaneGeometry(size, size);
      const mat = new THREE.MeshBasicMaterial({
        map: crackTexture(), transparent: true, depthWrite: false, side: THREE.DoubleSide,
        polygonOffset: true, polygonOffsetFactor: -2,
      });
      const spr = new THREE.Mesh(geo, mat);
      spr.position.copy(point);
      if (s.axis === 'z') spr.rotation.y = Math.PI / 2;
      // clamp within pane
      spr.position.y = Math.max(s.pos.y + size / 2, Math.min(s.pos.y + s.h - size / 2, spr.position.y));
      spr.renderOrder = 11;
      this.group.add(spr);
      pane.crackSprite = spr;
    }
    events.emit('glass:broken', { id: `${id}:crack` });
    return false;
  }

  private breakPane(pane: Pane, at: THREE.Vector3): void {
    pane.broken = true;
    pane.mesh.visible = false;
    if (pane.crackSprite) {
      pane.crackSprite.visible = false;
    }
    this.col.removeDynamic(`glass:${pane.spec.id}`);
    // jagged rim shards along edges
    const s = pane.spec;
    const rim = new THREE.Group();
    const mat = materials().clear.clone();
    mat.opacity = 0.3;
    const n = Math.max(3, Math.floor(s.w * 3));
    for (let i = 0; i < n; i++) {
      const w = s.w / n;
      const hBot = 0.04 + hash2(i, 91) * 0.16;
      const hTop = 0.03 + hash2(i, 92) * 0.1;
      const mk = (yc: number, hh: number): THREE.Mesh => {
        const g = new THREE.ConeGeometry(w * 0.4, hh, 3);
        const msh = new THREE.Mesh(g, mat);
        msh.position.set(
          s.pos.x + (s.axis === 'x' ? (i + 0.5) * w : 0),
          yc,
          s.pos.z + (s.axis === 'z' ? (i + 0.5) * w : 0),
        );
        return msh;
      };
      const bot = mk(s.pos.y + hBot / 2, hBot);
      rim.add(bot);
      const top = mk(s.pos.y + s.h - hTop / 2, hTop);
      top.rotation.x = Math.PI;
      rim.add(top);
    }
    this.group.add(rim);
    pane.rim = rim;
    events.emit('glass:broken', { id: pane.spec.id });
    events.emit('noise', { pos: [at.x, at.y, at.z], radius: 16, kind: 'glass' });
  }

  isBroken(id: string): boolean {
    return this.panes.get(id)?.broken ?? false;
  }

  reset(): void {
    for (const pane of this.panes.values()) {
      pane.broken = false;
      pane.health = 2;
      pane.mesh.visible = true;
      if (pane.rim) {
        this.group.remove(pane.rim);
        pane.rim = null;
      }
      if (pane.crackSprite) {
        this.group.remove(pane.crackSprite);
        pane.crackSprite = null;
      }
      this.addCollider(pane);
    }
  }

  count(): number {
    return this.panes.size;
  }
}
