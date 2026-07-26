import * as THREE from 'three';
import { MeshBuilder } from '../core/meshbuilder';

export type ItemKind =
  | 'none'
  | 'cutlass'
  | 'flintlock'
  | 'shovel'
  | 'bucket'
  | 'planks'
  | 'banana'
  | 'spyglass'
  | 'lantern';

export interface ItemDef {
  kind: ItemKind;
  label: string;
  /** Short verb shown in the HUD when the item is held. */
  action: string;
  /** Consumables and repair supplies track a count. */
  stackable: boolean;
}

/** Hotbar contents, in slot order. */
export const HOTBAR: ItemDef[] = [
  { kind: 'cutlass', label: 'Cutlass', action: 'Swing', stackable: false },
  { kind: 'flintlock', label: 'Flintlock', action: 'Fire', stackable: false },
  { kind: 'shovel', label: 'Shovel', action: 'Dig', stackable: false },
  { kind: 'bucket', label: 'Bucket', action: 'Bail', stackable: false },
  { kind: 'planks', label: 'Planks', action: 'Repair', stackable: true },
  { kind: 'banana', label: 'Banana', action: 'Eat', stackable: true },
  { kind: 'spyglass', label: 'Spyglass', action: 'Look', stackable: false },
];

const STEEL = 0xb9c0c8;
const STEEL_DARK = 0x6e757d;
const BRASS = 0xb08a3c;
const WOOD = 0x6b4a2c;
const WOOD_DARK = 0x46301c;
const IRON = 0x3d3d3f;

const heldMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.35 });

/**
 * Held-item meshes. Each is built so that the grip sits at the origin with the
 * business end pointing down -Z, which is how the hand joint is oriented.
 */
export function buildItemMesh(kind: ItemKind): THREE.Object3D | null {
  if (kind === 'none') return null;
  const b = new MeshBuilder();

  switch (kind) {
    case 'cutlass': {
      b.addBox({ x: 0, y: 0, z: 0.06 }, { x: 0.045, y: 0.045, z: 0.18 }, WOOD_DARK);
      b.addBox({ x: 0, y: 0, z: -0.04 }, { x: 0.14, y: 0.035, z: 0.05 }, BRASS);
      // Knuckle bow.
      const bow = new THREE.TorusGeometry(0.07, 0.012, 4, 10, Math.PI * 1.2);
      b.addGeometry(
        bow,
        BRASS,
        new THREE.Matrix4().compose(
          new THREE.Vector3(0, -0.03, 0.02),
          new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)),
          new THREE.Vector3(1, 1, 1),
        ),
      );
      bow.dispose();
      // Blade: three tapering segments with a slight curve.
      for (let i = 0; i < 3; i++) {
        const t = i / 3;
        b.addBox(
          { x: t * 0.03, y: 0, z: -0.18 - i * 0.22 },
          { x: 0.012, y: 0.055 - t * 0.015, z: 0.23 },
          i === 2 ? STEEL : STEEL,
        );
      }
      b.addBox({ x: 0.09, y: 0, z: -0.82 }, { x: 0.01, y: 0.03, z: 0.1 }, STEEL_DARK);
      break;
    }

    case 'flintlock': {
      b.addBox({ x: 0, y: -0.04, z: 0.08 }, { x: 0.05, y: 0.14, z: 0.12 }, WOOD_DARK);
      b.addBox({ x: 0, y: 0.02, z: -0.06 }, { x: 0.045, y: 0.07, z: 0.22 }, WOOD);
      const barrel = new THREE.CylinderGeometry(0.018, 0.02, 0.3, 8);
      b.addGeometry(
        barrel,
        IRON,
        new THREE.Matrix4().compose(
          new THREE.Vector3(0, 0.05, -0.26),
          new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)),
          new THREE.Vector3(1, 1, 1),
        ),
      );
      barrel.dispose();
      b.addBox({ x: 0.03, y: 0.08, z: 0.0 }, { x: 0.02, y: 0.06, z: 0.05 }, BRASS);
      b.addBox({ x: 0, y: -0.03, z: 0.0 }, { x: 0.02, y: 0.05, z: 0.03 }, BRASS);
      break;
    }

    case 'shovel': {
      const shaft = new THREE.CylinderGeometry(0.022, 0.026, 0.95, 7);
      b.addGeometry(
        shaft,
        WOOD,
        new THREE.Matrix4().compose(
          new THREE.Vector3(0, 0, -0.34),
          new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)),
          new THREE.Vector3(1, 1, 1),
        ),
      );
      shaft.dispose();
      b.addBox({ x: 0, y: 0, z: 0.16 }, { x: 0.12, y: 0.03, z: 0.05 }, WOOD_DARK);
      b.addBox({ x: 0, y: 0, z: -0.86 }, { x: 0.17, y: 0.02, z: 0.22 }, STEEL_DARK);
      b.addBox({ x: 0, y: 0, z: -0.99 }, { x: 0.13, y: 0.018, z: 0.08 }, STEEL);
      break;
    }

    case 'bucket': {
      const body = new THREE.CylinderGeometry(0.13, 0.1, 0.24, 10, 1, true);
      b.addGeometry(
        body,
        WOOD,
        new THREE.Matrix4().compose(
          new THREE.Vector3(0, -0.16, -0.02),
          new THREE.Quaternion(),
          new THREE.Vector3(1, 1, 1),
        ),
      );
      body.dispose();
      const base = new THREE.CylinderGeometry(0.1, 0.1, 0.02, 10);
      b.addGeometry(base, WOOD_DARK, new THREE.Matrix4().makeTranslation(0, -0.28, -0.02));
      base.dispose();
      const handle = new THREE.TorusGeometry(0.13, 0.008, 4, 12, Math.PI);
      b.addGeometry(
        handle,
        IRON,
        new THREE.Matrix4().compose(
          new THREE.Vector3(0, -0.04, -0.02),
          new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI / 2, 0)),
          new THREE.Vector3(1, 1, 1),
        ),
      );
      handle.dispose();
      break;
    }

    case 'planks': {
      for (let i = 0; i < 3; i++) {
        b.addBox(
          { x: (i - 1) * 0.035, y: i * 0.03, z: -0.1 },
          { x: 0.1, y: 0.028, z: 0.62 },
          i % 2 === 0 ? WOOD : WOOD_DARK,
        );
      }
      break;
    }

    case 'banana': {
      for (let i = 0; i < 5; i++) {
        const t = i / 4;
        const bend = Math.sin(t * Math.PI) * 0.05;
        b.addBox(
          { x: 0, y: bend, z: -0.04 - t * 0.16 },
          { x: 0.045 - Math.abs(t - 0.5) * 0.03, y: 0.05, z: 0.05 },
          i === 4 ? 0x6b5a1c : 0xe0c93a,
        );
      }
      break;
    }

    case 'spyglass': {
      for (let i = 0; i < 3; i++) {
        const tube = new THREE.CylinderGeometry(0.032 - i * 0.006, 0.034 - i * 0.006, 0.16, 10);
        b.addGeometry(
          tube,
          i % 2 === 0 ? BRASS : 0x2f2a24,
          new THREE.Matrix4().compose(
            new THREE.Vector3(0, 0, -0.02 - i * 0.15),
            new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)),
            new THREE.Vector3(1, 1, 1),
          ),
        );
        tube.dispose();
      }
      break;
    }

    case 'lantern': {
      b.addBox({ x: 0, y: -0.12, z: 0 }, { x: 0.11, y: 0.14, z: 0.11 }, 0xffd08a, 0.02);
      b.addBox({ x: 0, y: -0.03, z: 0 }, { x: 0.13, y: 0.04, z: 0.13 }, IRON);
      b.addBox({ x: 0, y: -0.21, z: 0 }, { x: 0.13, y: 0.04, z: 0.13 }, IRON);
      const bail = new THREE.TorusGeometry(0.06, 0.007, 4, 10, Math.PI);
      b.addGeometry(
        bail,
        IRON,
        new THREE.Matrix4().compose(
          new THREE.Vector3(0, 0.0, 0),
          new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI / 2, 0)),
          new THREE.Vector3(1, 1, 1),
        ),
      );
      bail.dispose();
      break;
    }
  }

  const mesh = new THREE.Mesh(b.build(), heldMaterial);
  mesh.castShadow = true;
  mesh.name = `item-${kind}`;
  return mesh;
}

/** Small canvas-drawn icons for the hotbar, so the UI needs no image assets. */
export function drawItemIcon(kind: ItemKind, size = 48): string {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const s = size / 48;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#f3e4c0';
  ctx.fillStyle = '#f3e4c0';
  ctx.lineWidth = 2.4 * s;

  const line = (x1: number, y1: number, x2: number, y2: number) => {
    ctx.beginPath();
    ctx.moveTo(x1 * s, y1 * s);
    ctx.lineTo(x2 * s, y2 * s);
    ctx.stroke();
  };

  switch (kind) {
    case 'cutlass':
      ctx.strokeStyle = '#dfe6ee';
      ctx.beginPath();
      ctx.moveTo(12 * s, 38 * s);
      ctx.quadraticCurveTo(30 * s, 26 * s, 40 * s, 8 * s);
      ctx.stroke();
      ctx.strokeStyle = '#e3b04b';
      line(9, 41, 16, 34);
      line(7, 34, 16, 43);
      break;
    case 'flintlock':
      ctx.strokeStyle = '#dfe6ee';
      line(10, 20, 38, 20);
      ctx.strokeStyle = '#8a5a34';
      line(14, 22, 20, 38);
      line(20, 38, 26, 34);
      ctx.strokeStyle = '#e3b04b';
      line(24, 18, 26, 12);
      break;
    case 'shovel':
      ctx.strokeStyle = '#8a5a34';
      line(30, 10, 18, 30);
      line(27, 8, 33, 12);
      ctx.strokeStyle = '#dfe6ee';
      ctx.beginPath();
      ctx.moveTo(20 * s, 28 * s);
      ctx.lineTo(10 * s, 34 * s);
      ctx.lineTo(15 * s, 42 * s);
      ctx.lineTo(24 * s, 34 * s);
      ctx.closePath();
      ctx.stroke();
      break;
    case 'bucket':
      ctx.strokeStyle = '#8a5a34';
      ctx.beginPath();
      ctx.moveTo(14 * s, 18 * s);
      ctx.lineTo(18 * s, 40 * s);
      ctx.lineTo(30 * s, 40 * s);
      ctx.lineTo(34 * s, 18 * s);
      ctx.closePath();
      ctx.stroke();
      ctx.strokeStyle = '#9aa4ae';
      ctx.beginPath();
      ctx.arc(24 * s, 18 * s, 10 * s, Math.PI, 0);
      ctx.stroke();
      break;
    case 'planks':
      ctx.strokeStyle = '#a8763f';
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.rect(10 * s, (12 + i * 10) * s, 28 * s, 7 * s);
        ctx.stroke();
      }
      break;
    case 'banana':
      ctx.strokeStyle = '#e0c93a';
      ctx.lineWidth = 5 * s;
      ctx.beginPath();
      ctx.arc(30 * s, 30 * s, 16 * s, Math.PI * 0.85, Math.PI * 1.6);
      ctx.stroke();
      break;
    case 'spyglass':
      ctx.strokeStyle = '#e3b04b';
      ctx.lineWidth = 4 * s;
      line(12, 34, 34, 14);
      ctx.lineWidth = 2 * s;
      ctx.beginPath();
      ctx.arc(36 * s, 12 * s, 5 * s, 0, Math.PI * 2);
      ctx.stroke();
      break;
    default:
      ctx.beginPath();
      ctx.arc(24 * s, 24 * s, 10 * s, 0, Math.PI * 2);
      ctx.stroke();
  }

  return canvas.toDataURL();
}
