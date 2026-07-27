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
  /**
   * Inventory key this item spends when used, if it is not itself the stock. The
   * flintlock burns powder rather than being consumed, and running dry with no
   * number anywhere on screen to warn you is how you end up in a fight with an
   * empty gun.
   */
  ammo?: string;
}

/** Hotbar contents, in slot order. */
export const HOTBAR: ItemDef[] = [
  { kind: 'cutlass', label: 'Cutlass', action: 'Swing', stackable: false },
  { kind: 'flintlock', label: 'Flintlock', action: 'Fire', stackable: false, ammo: 'shots' },
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
 * Per-item framing for the first-person view.
 *
 * One hand pose cannot present a metre of sword and a short pistol equally well.
 * Sharing one meant the cutlass lay along the line of sight and hung off the
 * bottom-right corner, where a player could genuinely not tell what they were
 * holding. Each weapon now gets the offset and angle that puts it in frame:
 * blade raised across the view, muzzle pointed where the shot is going.
 */
export const VIEW_HOLD: Partial<Record<ItemKind, { pos: [number, number, number]; rot: [number, number, number] }>> = {
  // Hilt low and to the right, blade angled up and across to the left, receding
  // from 0.54 to 1.35 units away so it foreshortens instead of lying flat. Chosen
  // by projecting the grip and the point into screen space and picking the pose
  // that actually spans the frame: the blade used to point almost straight down the
  // line of sight, which is a metre of steel occupying about nine pixels.
  cutlass: { pos: [0, -0.04, -0.1], rot: [0.22, 0.92, 0.15] },
  flintlock: { pos: [0, -0.03, -0.06], rot: [0.26, 0.9, 0.02] },
  // Angled across the view like the sword, for the same reason: pointing straight
  // down the line of sight, a banana is a yellow dot and a bundle of boards is a
  // brown one. Turned across the frame, their length and curve are what you see.
  banana: { pos: [0.01, 0.01, -0.04], rot: [0.3, 1.05, 0.12] },
  planks: { pos: [0.02, 0.02, -0.28], rot: [0.16, 0.82, 0.1] },
  shovel: { pos: [0, 0.01, -0.16], rot: [0.2, 0.62, 0.08] },
  spyglass: { pos: [0, 0, 0], rot: [-0.05, 0.05, 0] },
};

/**
 * Held-item meshes. Each is built so that the grip sits at the origin with the
 * business end pointing down -Z, which is how the hand joint is oriented.
 */
export function buildItemMesh(kind: ItemKind): THREE.Object3D | null {
  if (kind === 'none') return null;
  const b = new MeshBuilder();

  switch (kind) {
    case 'cutlass': {
      // Grip: leather over a slightly swelled wooden core, with a brass pommel.
      b.addBox({ x: 0, y: 0, z: 0.1 }, { x: 0.05, y: 0.055, z: 0.19 }, 0x3a2418);
      for (let i = 0; i < 5; i++) {
        b.addBox({ x: 0, y: 0, z: 0.035 + i * 0.036 }, { x: 0.056, y: 0.06, z: 0.014 }, 0x22150d);
      }
      const pommel = new THREE.SphereGeometry(0.037, 8, 6);
      b.addGeometry(pommel, BRASS, new THREE.Matrix4().makeTranslation(0, 0, 0.205));
      pommel.dispose();
      // Ferrule and the shell guard: a cutlass has a solid plate over the hand,
      // which is most of what identifies it at a glance.
      b.addBox({ x: 0, y: 0, z: -0.055 }, { x: 0.075, y: 0.075, z: 0.05 }, BRASS);
      const shell = new THREE.CylinderGeometry(0.115, 0.075, 0.022, 12, 1, false, Math.PI * 0.15, Math.PI * 1.7);
      b.addGeometry(
        shell,
        BRASS,
        new THREE.Matrix4().compose(
          new THREE.Vector3(0, -0.02, -0.07),
          new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)),
          new THREE.Vector3(1, 1, 1),
        ),
      );
      shell.dispose();
      // Knuckle bow sweeping from the guard back to the pommel.
      const bow = new THREE.TorusGeometry(0.088, 0.014, 5, 12, Math.PI * 1.15);
      b.addGeometry(
        bow,
        BRASS,
        new THREE.Matrix4().compose(
          new THREE.Vector3(0, -0.055, 0.03),
          new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, -0.35)),
          new THREE.Vector3(1, 1.1, 1),
        ),
      );
      bow.dispose();
      // Blade: broad at the forte, curving up and back towards a clipped point.
      // Wider and shorter than before, which is what a cutlass is - and what makes
      // it read as a weapon rather than as a length of wire.
      /*
       * The blade is one lofted surface, not a row of boxes.
       *
       * Stepping axis-aligned boxes along a curve gives a flight of white stairs:
       * each box stays square to the world while the edge it is meant to follow runs
       * diagonally, so every corner stands proud of the face before it. Overlapping
       * them further only widens the treads. A loft puts vertices exactly on the
       * curve and smooth-shades between them, which is the only way a curved blade
       * reads as a blade.
       *
       * The section is a lens - back edge, two ground flats, cutting edge - swept
       * along the curve as a closed ring, so the solid has a bright thin edge to
       * catch the light and broad flats to take the sky.
       */
      const STATIONS = 16;
      const rows: THREE.Vector3[][] = [];
      for (let i = 0; i < STATIONS; i++) {
        const t = i / (STATIONS - 1);
        // Sabre curve: near straight at the forte, sweeping up towards the point.
        const rise = t * t * 0.14;
        const z = -0.11 - t * 0.68;
        // Broad at the forte with a little belly, closing to nothing at the point.
        const taper = 1 - Math.pow(t, 5);
        const width = (0.086 - t * 0.042 + Math.sin(t * Math.PI) * 0.01) * taper;
        const thick = (0.009 - t * 0.0038) * (1 - Math.pow(t, 3));
        const ring: THREE.Vector3[] = [];
        // Back (blunt) edge, round the near flat, out to the cutting edge, back
        // round the far flat, closing on the start.
        const section: [number, number][] = [
          [0, 0.5],
          [1, 0.22],
          [0.78, -0.16],
          [0.16, -0.47],
          [0, -0.5],
          [-0.16, -0.47],
          [-0.78, -0.16],
          [-1, 0.22],
          [0, 0.5],
        ];
        for (const [nx, ny] of section) {
          ring.push(new THREE.Vector3(nx * thick, rise + ny * width, z));
        }
        rows.push(ring);
      }
      b.addSurface(rows, (row, col) => {
        const t = row / (STATIONS - 1);
        // Columns 3, 4 and 5 are the cutting edge: keep them near white so the edge
        // catches, and the broad flats a darker grey so there is contrast across the
        // section rather than one flat wash of white.
        if (col >= 3 && col <= 5) return 0xdfe7ee;
        if (col === 2 || col === 6) return 0xb9c2cc;
        return t > 0.72 ? 0x9aa5b1 : 0x8d98a5;
      });
      break;
    }

    case 'flintlock': {
      // Grip, raked back the way a pistol butt is, with a brass butt cap. One
      // tapered form turned to the rake, not a stack of axis-aligned slices: those
      // step, and the corners poke through the face of each one below, so the back
      // of the gun reads as a flight of stairs.
      const rake = new THREE.Matrix4().compose(
        new THREE.Vector3(0, -0.078, 0.1),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(-1.02, 0, 0)),
        new THREE.Vector3(1, 1, 1),
      );
      const butt = new THREE.CylinderGeometry(0.033, 0.026, 0.15, 8);
      b.addGeometry(butt, WOOD_DARK, rake);
      butt.dispose();
      const cap = new THREE.CylinderGeometry(0.035, 0.031, 0.024, 8);
      b.addGeometry(
        cap,
        BRASS,
        new THREE.Matrix4().compose(
          new THREE.Vector3(0, -0.152, 0.145),
          new THREE.Quaternion().setFromEuler(new THREE.Euler(-1.02, 0, 0)),
          new THREE.Vector3(1, 1, 1),
        ),
      );
      cap.dispose();
      // Fore-stock carrying the barrel.
      b.addBox({ x: 0, y: 0.015, z: -0.1 }, { x: 0.044, y: 0.062, z: 0.28 }, WOOD);
      // Barrel, and a ramrod slung under it.
      const barrel = new THREE.CylinderGeometry(0.019, 0.023, 0.34, 10);
      b.addGeometry(
        barrel,
        IRON,
        new THREE.Matrix4().compose(
          new THREE.Vector3(0, 0.056, -0.28),
          new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)),
          new THREE.Vector3(1, 1, 1),
        ),
      );
      barrel.dispose();
      const muzzle = new THREE.CylinderGeometry(0.026, 0.024, 0.03, 10);
      b.addGeometry(
        muzzle,
        BRASS,
        new THREE.Matrix4().compose(
          new THREE.Vector3(0, 0.056, -0.44),
          new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)),
          new THREE.Vector3(1, 1, 1),
        ),
      );
      muzzle.dispose();
      const rod = new THREE.CylinderGeometry(0.006, 0.006, 0.28, 6);
      b.addGeometry(
        rod,
        0x2a1d12,
        new THREE.Matrix4().compose(
          new THREE.Vector3(0, 0.005, -0.28),
          new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)),
          new THREE.Vector3(1, 1, 1),
        ),
      );
      rod.dispose();
      // Lock plate on the near side, with the cock, the flint in its jaws and the
      // frizzen standing up in front of it. These are the parts that say flintlock;
      // without them it is a pipe on a stick.
      b.addBox({ x: -0.026, y: 0.03, z: 0.005 }, { x: 0.012, y: 0.062, z: 0.14 }, IRON);
      b.addBox({ x: -0.03, y: 0.075, z: 0.045 }, { x: 0.014, y: 0.055, z: 0.026 }, 0x55585c);
      b.addBox({ x: -0.03, y: 0.098, z: 0.03 }, { x: 0.016, y: 0.026, z: 0.03 }, 0x2b2b2e);
      b.addBox({ x: -0.03, y: 0.086, z: -0.012 }, { x: 0.012, y: 0.05, z: 0.014 }, 0x6b6f73);
      b.addBox({ x: -0.026, y: 0.052, z: 0.012 }, { x: 0.02, y: 0.018, z: 0.05 }, BRASS);
      // Trigger and its guard.
      b.addBox({ x: 0, y: -0.032, z: 0.048 }, { x: 0.011, y: 0.036, z: 0.014 }, 0x55585c);
      const guard = new THREE.TorusGeometry(0.036, 0.007, 4, 10, Math.PI);
      b.addGeometry(
        guard,
        BRASS,
        new THREE.Matrix4().compose(
          new THREE.Vector3(0, -0.052, 0.05),
          new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, Math.PI)),
          new THREE.Vector3(1, 1.2, 1),
        ),
      );
      guard.dispose();
      // Barrel bands and the fore-sight.
      for (const z of [-0.19, -0.35]) {
        b.addBox({ x: 0, y: 0.04, z }, { x: 0.05, y: 0.05, z: 0.018 }, BRASS);
      }
      b.addBox({ x: 0, y: 0.082, z: -0.42 }, { x: 0.008, y: 0.014, z: 0.014 }, BRASS);
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
      // A bundle of four boards a metre and a bit long, fanned so you can count
      // them, with sawn end grain and a lashing round the middle. They were 0.62 m
      // and stacked square, which at a glance is one indistinct brown lump.
      const LENGTH = 1.06;
      for (let i = 0; i < 4; i++) {
        const spread = (i - 1.5) * 0.028;
        b.addBox(
          { x: spread * 1.5, y: i * 0.027, z: -0.16 + spread * 0.6 },
          { x: 0.115, y: 0.026, z: LENGTH },
          i % 2 === 0 ? WOOD : WOOD_DARK,
        );
        // Pale sawn end, so the bundle reads as cut timber rather than as a slab.
        b.addBox(
          { x: spread * 1.5, y: i * 0.027, z: -0.16 + spread * 0.6 - LENGTH / 2 },
          { x: 0.117, y: 0.028, z: 0.012 },
          0xd8b57a,
        );
      }
      // Lashing.
      for (const z of [-0.02, -0.42]) {
        b.addBox({ x: 0, y: 0.04, z }, { x: 0.16, y: 0.135, z: 0.022 }, 0x4a3a22);
      }
      break;
    }

    case 'banana': {
      /*
       * Lofted along a curve with a faceted section, because five stacked boxes
       * with a sine offset is a piece of macaroni: the segments step, the silhouette
       * has no taper, and there is nothing at either end to say which way is up. A
       * banana is recognised by three things - the curve, the flats down its length,
       * and the dark stub at the tip - so it needs all three. Half again as long as
       * before, so it is not lost behind the hand.
       */
      const STATIONS = 14;
      const FACETS = 7;
      const rows: THREE.Vector3[][] = [];
      for (let i = 0; i < STATIONS; i++) {
        const t = i / (STATIONS - 1);
        // Curve away and up, the way a banana lies in the hand.
        const bend = Math.sin(t * Math.PI * 0.82) * 0.075;
        const z = -0.03 - t * 0.29;
        // Fat through the middle, pinched at the stem, blunt at the tip.
        const girth = 0.031 * Math.pow(Math.sin(0.18 + t * 2.5), 0.42) * (t > 0.94 ? 0.45 : 1);
        const ring: THREE.Vector3[] = [];
        for (let f = 0; f <= FACETS; f++) {
          const a = (f / FACETS) * Math.PI * 2;
          // Slightly flattened, so the lengthwise ridges catch the light.
          ring.push(new THREE.Vector3(Math.cos(a) * girth * 0.86, bend + Math.sin(a) * girth, z));
        }
        rows.push(ring);
      }
      b.addSurface(rows, (row) => {
        const t = row / (STATIONS - 1);
        if (t > 0.9) return 0x4a3a14;
        if (t < 0.07) return 0x8f7a26;
        // Ripening blotches along the skin.
        return t > 0.62 ? 0xd8bf34 : 0xefd949;
      });
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
