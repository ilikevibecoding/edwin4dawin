import * as THREE from 'three';
import { Rng } from '../core/seed';
import { clamp, lerp } from '../core/noise';
import type { WorldMap, Vec2 } from './map';
import type { RoadSegment } from './roads';
import type { BridgeRoute } from './bridges';
import { CONTRAIL_MATERIAL, WakeTrail, type WakeBatch } from '../render/wakes';
import { PbrSoup, cellKey, createBatchedPbrMaterial } from './batching';
import { layerMask, maskCasts, setCasterClass, type ViewCull } from './culling';

// ------------------------------------------------------------------ boats

export type HullKind = 'speed' | 'yacht' | 'sail' | 'console' | 'cargo' | 'ferry' | 'cruise';

/** A vessel tied up somewhere (marina slips, the cruise berth): position, heading, the length the berth was laid
 *  out for and, for the special berths, the kind of vessel. */
export interface MooredBoat { x: number; z: number; rot: number; len: number; kind?: HullKind; }

function hullGeometry(len: number, beam: number, height: number): THREE.BufferGeometry {
  // pointed bow, flat transom; simple 8-vertex hull with a deck
  const l = len / 2, b = beam / 2;
  const v = [
    // keel line
    [-l, -height * 0.55, 0], [l * 0.55, -height * 0.55, 0],
    // chine
    [-l, -height * 0.1, -b * 0.95], [-l, -height * 0.1, b * 0.95], [l * 0.35, -height * 0.15, -b], [l * 0.35, -height * 0.15, b], [l, 0.05, 0],
    // deck
    [-l, height * 0.45, -b], [-l, height * 0.45, b], [l * 0.4, height * 0.45, -b * 0.95], [l * 0.4, height * 0.45, b * 0.95], [l, height * 0.55, 0],
  ];
  const f = [
    // bottom
    [0, 2, 4], [0, 4, 1], [0, 1, 5], [0, 5, 3], [1, 4, 6], [1, 6, 5],
    // sides
    [2, 7, 9], [2, 9, 4], [4, 9, 11], [4, 11, 6], [3, 5, 10], [3, 10, 8], [5, 6, 11], [5, 11, 10],
    // transom
    [0, 3, 8], [0, 8, 7], [0, 7, 2],
    // deck
    [7, 8, 10], [7, 10, 9], [9, 10, 11],
  ];
  const pos: number[] = [];
  for (const tri of f) for (const i of tri) pos.push(v[i][0], v[i][1], v[i][2]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

export class BoatFactory {
  readonly mats = {
    white: new THREE.MeshStandardMaterial({ color: 0xf4f4f0, roughness: 0.35, metalness: 0.05 }),
    hullDark: new THREE.MeshStandardMaterial({ color: 0x1f2a38, roughness: 0.5 }),
    hullRed: new THREE.MeshStandardMaterial({ color: 0x9a2f2a, roughness: 0.55 }),
    hullBlue: new THREE.MeshStandardMaterial({ color: 0x1f4f8a, roughness: 0.5 }),
    hullGreen: new THREE.MeshStandardMaterial({ color: 0x2f5a3c, roughness: 0.55 }),
    hullCream: new THREE.MeshStandardMaterial({ color: 0xe6dcc4, roughness: 0.4 }),
    hullGrey: new THREE.MeshStandardMaterial({ color: 0x6d7378, roughness: 0.5 }),
    teak: new THREE.MeshStandardMaterial({ color: 0xb08a5a, roughness: 0.8 }),
    glass: new THREE.MeshStandardMaterial({ color: 0x223344, roughness: 0.1, metalness: 0.9 }),
    sail: new THREE.MeshStandardMaterial({ color: 0xf8f6ee, roughness: 0.9, side: THREE.DoubleSide }),
    cover: new THREE.MeshStandardMaterial({ color: 0x2a4a78, roughness: 0.85 }),
    steel: new THREE.MeshStandardMaterial({ color: 0x8c949c, roughness: 0.5, metalness: 0.6 }),
    orange: new THREE.MeshStandardMaterial({ color: 0xe0762a, roughness: 0.6 }),
    containerWhite: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7 }),
  };
  get materials(): THREE.Material[] { return Object.values(this.mats); }

  /** `moored`: sails down (boom cover, bare mast) and a wider spread of hull colours than the boats under way. */
  build(kind: HullKind, rng: Rng, moored = false): { group: THREE.Group; len: number; beam: number; draft: number; wakeWidth: number } {
    const g = new THREE.Group();
    const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z); m.rotation.set(rx, ry, rz);
      m.castShadow = true; m.receiveShadow = true;
      g.add(m);
      return m;
    };
    const hullMat = moored
      ? rng.pick([this.mats.white, this.mats.white, this.mats.hullDark, this.mats.hullBlue, this.mats.hullRed, this.mats.hullGreen, this.mats.hullCream, this.mats.hullGrey])
      : rng.pick([this.mats.white, this.mats.white, this.mats.hullDark, this.mats.hullBlue, this.mats.hullRed]);
    switch (kind) {
      case 'speed': {
        const len = rng.range(7, 10), beam = len * 0.3;
        add(hullGeometry(len, beam, 1.4), hullMat, 0, 0.3, 0);
        add(new THREE.BoxGeometry(len * 0.25, 0.5, beam * 0.8), this.mats.glass, len * 0.05, 1.05, 0, 0, 0, -0.35);
        add(new THREE.BoxGeometry(len * 0.35, 0.35, beam * 0.75), this.mats.teak, -len * 0.2, 0.8, 0);
        add(new THREE.BoxGeometry(0.6, 0.6, 0.8), this.mats.steel, -len * 0.45, 0.6, 0);
        return { group: g, len, beam, draft: 0.5, wakeWidth: beam * 1.4 };
      }
      case 'console': {
        const len = rng.range(6, 8), beam = len * 0.32;
        add(hullGeometry(len, beam, 1.3), this.mats.white, 0, 0.3, 0);
        add(new THREE.BoxGeometry(1.2, 1.4, 1.0), this.mats.white, 0, 1.2, 0);
        add(new THREE.BoxGeometry(1.6, 0.15, 1.6), this.mats.hullDark, 0, 2.3, 0);
        for (const s of [-1, 1]) add(new THREE.CylinderGeometry(0.04, 0.04, 1.6, 6), this.mats.steel, 0.6 * s, 1.5, 0.7 * s);
        add(new THREE.BoxGeometry(0.5, 0.7, 0.5), this.mats.hullDark, -len * 0.45, 0.7, 0);
        return { group: g, len, beam, draft: 0.45, wakeWidth: beam * 1.3 };
      }
      case 'yacht': {
        const len = rng.range(18, 32), beam = len * 0.25;
        add(hullGeometry(len, beam, len * 0.16), this.mats.white, 0, len * 0.04, 0);
        add(new THREE.BoxGeometry(len * 0.5, len * 0.09, beam * 0.8), this.mats.white, -len * 0.05, len * 0.13, 0);
        add(new THREE.BoxGeometry(len * 0.48, len * 0.04, beam * 0.82), this.mats.glass, -len * 0.05, len * 0.135, 0);
        add(new THREE.BoxGeometry(len * 0.28, len * 0.07, beam * 0.6), this.mats.white, -len * 0.12, len * 0.21, 0);
        add(new THREE.BoxGeometry(len * 0.26, len * 0.03, beam * 0.62), this.mats.glass, -len * 0.12, len * 0.215, 0);
        add(new THREE.BoxGeometry(len * 0.06, len * 0.09, beam * 0.5), this.mats.white, -len * 0.2, len * 0.29, 0, 0, 0, 0.3); // radar arch
        add(new THREE.CylinderGeometry(0.15, 0.15, 1.2, 8), this.mats.steel, -len * 0.2, len * 0.34, 0);
        return { group: g, len, beam, draft: len * 0.06, wakeWidth: beam * 1.5 };
      }
      case 'sail': {
        const len = moored ? rng.range(8, 15) : rng.range(9, 14), beam = len * 0.31;
        add(hullGeometry(len, beam, len * 0.14), hullMat, 0, len * 0.03, 0);
        // cabin trunk, cockpit coaming
        add(new THREE.BoxGeometry(len * 0.3, 0.7, beam * 0.6), rng.chance(0.75) ? this.mats.white : this.mats.hullCream, -len * 0.05, len * 0.09 + 0.3, 0);
        const mastH = len * 1.25;
        add(new THREE.CylinderGeometry(0.06, 0.09, mastH, 6), this.mats.steel, len * 0.05, mastH / 2 + len * 0.08, 0);
        if (moored) {
          // sails down: boom with its cover along the centreline, spreaders, a furled headsail on the forestay
          add(new THREE.BoxGeometry(len * 0.42, 0.42, 0.34), rng.pick([this.mats.cover, this.mats.cover, this.mats.hullRed, this.mats.hullGreen, this.mats.hullCream]), -len * 0.16, len * 0.13 + 0.55, 0);
          add(new THREE.BoxGeometry(0.08, 0.08, beam * 0.7), this.mats.steel, len * 0.05, mastH * 0.5 + len * 0.08, 0);
          const stay = new THREE.CylinderGeometry(0.07, 0.11, mastH * 0.86, 5);
          add(stay, this.mats.sail, len * 0.05 + len * 0.22, len * 0.12 + mastH * 0.43, 0, 0, 0, Math.atan2(len * 0.44, mastH * 0.86));
          add(new THREE.BoxGeometry(0.25, 1.0, 0.25), this.mats.white, len * 0.05, mastH + len * 0.08 - 0.5, 0); // masthead
          if (rng.chance(0.5)) add(new THREE.BoxGeometry(0.8, 0.9, 0.8), this.mats.hullDark, -len * 0.4, len * 0.1 + 0.2, 0); // outboard / lazarette
        } else {
          // main sail (triangle) + jib
          const sail = new THREE.BufferGeometry();
          sail.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, mastH * 0.9, 0, -len * 0.42, 0, 0], 3));
          sail.computeVertexNormals();
          add(sail, this.mats.sail, len * 0.05, len * 0.13, 0, 0, 0, 0);
          const jib = new THREE.BufferGeometry();
          jib.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, mastH * 0.75, 0, len * 0.4, 0, 0], 3));
          jib.computeVertexNormals();
          add(jib, this.mats.sail, len * 0.05, len * 0.13, 0.05, 0, 0, 0);
          g.rotation.z = 0.12;
        }
        return { group: g, len, beam, draft: 1.5, wakeWidth: beam * 0.9 };
      }
      case 'cruise': {
        // cruise liner: dark boot top under a white hull with a raked bow, three superstructure tiers with window
        // bands, forward wheelhouse with bridge wings, lifeboats hung along the promenade deck, raked funnel, mast
        const len = 290, beam = 36, hullH = 16;
        add(hullGeometry(len, beam, hullH), this.mats.hullDark, 0, hullH * 0.15, 0);
        add(hullGeometry(len * 0.99, beam * 1.02, hullH * 0.6), this.mats.white, 0, hullH * 0.15 + hullH * 0.3, 0);
        const deckY = hullH * 0.15 + hullH * 0.55; // top of the hull
        const tier = (x: number, y: number, l: number, h: number, b: number, bands: number) => {
          add(new THREE.BoxGeometry(l, h, b), this.mats.white, x, y + h / 2, 0);
          for (let i = 0; i < bands; i++) add(new THREE.BoxGeometry(l * 0.98, 1.0, b + 0.3), this.mats.glass, x, y + 1.6 + i * (h / bands), 0);
        };
        tier(-len * 0.03, deckY, len * 0.8, 9.0, beam * 0.9, 3);
        tier(-len * 0.06, deckY + 9.0, len * 0.66, 8.0, beam * 0.82, 3);
        tier(-len * 0.1, deckY + 17.0, len * 0.42, 5.0, beam * 0.62, 2);
        // wheelhouse at the forward end of the second tier, wings past the beam
        add(new THREE.BoxGeometry(len * 0.05, 3.6, beam * 1.06), this.mats.white, len * 0.29, deckY + 9.0 + 1.8, 0);
        add(new THREE.BoxGeometry(len * 0.05 + 0.3, 1.2, beam * 1.08), this.mats.glass, len * 0.29, deckY + 9.0 + 2.5, 0);
        // lifeboats on davits along the promenade deck, both sides
        for (let i = 0; i < 9; i++) for (const s of [-1, 1]) {
          add(new THREE.BoxGeometry(8.5, 2.6, 3.4), i % 3 === 1 ? this.mats.white : this.mats.orange, -len * 0.22 + i * len * 0.055, deckY + 5.2, s * (beam * 0.45 + 1.6));
        }
        // funnel (raked), mast, some deck furniture on the top tier
        add(new THREE.CylinderGeometry(3.0, 3.6, 10, 12), this.mats.hullDark, -len * 0.2, deckY + 22.0 + 4.5, 0, 0, 0, 0.28);
        add(new THREE.CylinderGeometry(2.2, 2.2, 2.0, 10), this.mats.orange, -len * 0.2 - 1.6, deckY + 32.0, 0, 0, 0, 0.28);
        add(new THREE.CylinderGeometry(0.35, 0.5, 12, 6), this.mats.steel, len * 0.2, deckY + 17.0 + 6, 0);
        add(new THREE.BoxGeometry(len * 0.12, 2.6, beam * 0.3), this.mats.white, len * 0.02, deckY + 22.0, 0);
        add(new THREE.BoxGeometry(len * 0.08, 0.6, beam * 0.24), this.mats.glass, -len * 0.04, deckY + 22.0, 0); // pool
        return { group: g, len, beam, draft: hullH * 0.4, wakeWidth: beam * 1.4 };
      }
      case 'ferry': {
        const len = 42, beam = 12;
        add(hullGeometry(len, beam, 5), this.mats.hullBlue, 0, 1.5, 0);
        add(new THREE.BoxGeometry(len * 0.8, 3.2, beam * 0.9), this.mats.white, -1, 4.9, 0);
        add(new THREE.BoxGeometry(len * 0.78, 1.2, beam * 0.92), this.mats.glass, -1, 5.2, 0);
        add(new THREE.BoxGeometry(len * 0.4, 2.8, beam * 0.6), this.mats.white, -4, 7.8, 0);
        add(new THREE.CylinderGeometry(0.6, 0.7, 3, 10), this.mats.hullDark, -12, 10.5, 0);
        return { group: g, len, beam, draft: 2.2, wakeWidth: beam * 1.3 };
      }
      case 'cargo': {
        const len = rng.range(120, 180), beam = len * 0.16, hullH = len * 0.075;
        add(hullGeometry(len, beam, hullH), this.mats.hullDark, 0, hullH * 0.15, 0);
        add(new THREE.BoxGeometry(len * 0.9, 0.8, beam * 0.98), this.mats.hullRed, 0, hullH * 0.6, 0);
        // stern bridge
        add(new THREE.BoxGeometry(len * 0.09, hullH * 1.6, beam * 0.9), this.mats.white, -len * 0.38, hullH * 0.6 + hullH * 0.8, 0);
        add(new THREE.BoxGeometry(len * 0.1, 2, beam * 0.95), this.mats.glass, -len * 0.38, hullH * 0.6 + hullH * 1.55, 0);
        add(new THREE.CylinderGeometry(1.2, 1.5, hullH * 0.9, 10), this.mats.hullDark, -len * 0.44, hullH * 0.6 + hullH * 1.9, 0);
        // container stacks as one instanced mesh per ship
        const rows = Math.floor(len * 0.6 / 6.4), cols = Math.max(3, Math.floor(beam / 2.6));
        const boxes: { x: number; y: number; z: number; c: number }[] = [];
        for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
          const stack = rng.int(1, 4);
          for (let k = 0; k < stack; k++) boxes.push({ x: len * 0.3 - r * 6.4, y: hullH * 0.6 + 0.8 + 1.3 + k * 2.6, z: (c - (cols - 1) / 2) * 2.5, c: rng.int(0, 5) });
        }
        const inst = new THREE.InstancedMesh(new THREE.BoxGeometry(6.1, 2.6, 2.44), this.mats.containerWhite, boxes.length);
        const m = new THREE.Matrix4();
        const palette = [0xc0392b, 0x2e86c1, 0x27ae60, 0xd68910, 0x7d8b93, 0xecf0f1].map((c) => new THREE.Color(c));
        boxes.forEach((b, i) => { inst.setMatrixAt(i, m.makeTranslation(b.x, b.y, b.z)); inst.setColorAt(i, palette[b.c]); });
        inst.castShadow = true; inst.receiveShadow = true;
        g.add(inst);
        return { group: g, len, beam, draft: hullH * 0.5, wakeWidth: beam * 1.4 };
      }
    }
  }
}

interface MovingBoat {
  /** instance in the movers batch */
  id: number;
  route: Vec2[];
  routeLen: number;
  s: number;
  dir: 1 | -1;
  speed: number;
  len: number;
  draft: number;
  wake: WakeTrail;
  phase: number;
}

function routeLength(pts: Vec2[]): number {
  let l = 0;
  for (let i = 0; i < pts.length - 1; i++) l += Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
  return l;
}
function routePoint(pts: Vec2[], s: number, out: { x: number; z: number; dx: number; dz: number }): void {
  let acc = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const l = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
    if (s <= acc + l || i === pts.length - 2) {
      const t = clamp((s - acc) / l, 0, 1);
      out.dx = (pts[i + 1][0] - pts[i][0]) / l; out.dz = (pts[i + 1][1] - pts[i][1]) / l;
      out.x = pts[i][0] + out.dx * l * t; out.z = pts[i][1] + out.dz * l * t;
      return;
    }
    acc += l;
  }
}

/**
 * Bake the meshes of a vehicle group into one vertex-coloured geometry in the group's local frame,
 * with each part's roughness / metalness carried per vertex (see createBatchedPbrMaterial). Instanced
 * children (container stacks) are expanded with their instance colours. The source geometries are freed.
 */
function bakeLocal(g: THREE.Group): THREE.BufferGeometry {
  g.updateMatrixWorld(true);
  const inv = g.matrixWorld.clone().invert();
  const soup = new PbrSoup();
  const local = new THREE.Matrix4(), inst = new THREE.Matrix4(), col = new THREE.Color();
  g.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    local.multiplyMatrices(inv, m.matrixWorld);
    const mat = m.material as THREE.MeshStandardMaterial;
    const im = o as THREE.InstancedMesh;
    if (im.isInstancedMesh) {
      for (let i = 0; i < im.count; i++) {
        im.getMatrixAt(i, inst);
        if (im.instanceColor) im.getColorAt(i, col);
        soup.add(m.geometry, inst.premultiply(local), mat, im.instanceColor ? col : undefined);
      }
    } else {
      soup.add(m.geometry, local, mat);
    }
    m.geometry.dispose();
  });
  return soup.build();
}

// ------------------------------------------------------------------ cars

/** `laneOff0`: centre-line offset of the innermost lane, `laneW`: lane pitch (bridge decks pass their real
 *  carriageway layout; streets use the road builder's nominal lanes). `heavy`: share of vans / buses / trucks. */
interface CarRoute { pts: THREE.Vector3[]; length: number; lanes: number; width: number; laneOff0: number; laneW: number; }
/** `kind` 0 = car geometry, 1 = box vehicle (van / bus / truck, distinguished by `scale`) */
interface Car { route: number; s: number; dir: 1 | -1; lane: number; speed: number; color: THREE.Color; kind: 0 | 1; scale: THREE.Vector3; }

/** Vehicles of one kind in one spatial cell: refilled every update with bounds fitted to the vehicles actually
 *  in it, so a cell can be frustum-culled and only the cells near the camera cast shadows. */
interface CarChunk { mesh: THREE.InstancedMesh; capacity: number; n: number; center: THREE.Vector3; r: number; box: THREE.Box3 }

const CAR_CELL = 5000;
/** half-extent of a vehicle around its position, added to the fitted cell bounds */
const CAR_MARGIN = 6;
/** minimum headway (m, bumper to bumper) between vehicles placed in the same lane */
const MIN_HEADWAY = 16;

/** Box vehicle unit (a 5.4 m van): body, windscreen + side glass band, rear light bar; scaled per instance into
 *  vans, buses and rigid trucks. Same part ids as the car. */
function boxVehicleGeometry(): THREE.BufferGeometry {
  return partsGeometry([
    [new THREE.BoxGeometry(5.4, 2.0, 2.05), 0, 0, 1.15, 0],
    [new THREE.BoxGeometry(0.3, 0.9, 1.9), 1, 2.6, 1.6, 0],
    [new THREE.BoxGeometry(3.6, 0.55, 2.1), 1, 0.1, 1.65, 0],
    [new THREE.BoxGeometry(0.2, 0.3, 1.8), 2, 2.65, 0.9, 0],
  ]);
}

/** Body (part 0), cabin (part 1) and light bar (part 2) of a car in one geometry. */
function carGeometry(): THREE.BufferGeometry {
  return partsGeometry([
    [new THREE.BoxGeometry(4.4, 1.0, 1.9), 0, 0, 0.65, 0],
    [new THREE.BoxGeometry(2.2, 0.75, 1.7), 1, -0.2, 1.5, 0],
    [new THREE.BoxGeometry(0.2, 0.25, 1.6), 2, 2.2, 0.8, 0],
  ]);
}

function partsGeometry(parts: [THREE.BoxGeometry, number, number, number, number][]): THREE.BufferGeometry {
  const pos: number[] = [], nrm: number[] = [], uv: number[] = [], part: number[] = [];
  for (const [box, id, x, y, z] of parts) {
    const g = box.translate(x, y, z).toNonIndexed();
    const p = g.getAttribute('position'), n = g.getAttribute('normal'), u = g.getAttribute('uv');
    for (let i = 0; i < p.count; i++) {
      pos.push(p.getX(i), p.getY(i), p.getZ(i)); nrm.push(n.getX(i), n.getY(i), n.getZ(i)); uv.push(u.getX(i), u.getY(i)); part.push(id);
    }
    g.dispose(); box.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  out.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  out.setAttribute('aPart', new THREE.Float32BufferAttribute(part, 1));
  out.computeBoundingSphere();
  return out;
}

/** One material for the three car parts, reproducing the body / cabin / light materials exactly:
 *  body = instance colour (rough 0.35, metal 0.4), cabin = dark glass (0.15, 0.8), lights = white with
 *  the night emissive (1.0, 0.0). */
function carMaterial(): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff2d0, emissiveIntensity: 0 });
  const cabin = new THREE.Color(0x1a222c);
  const f = (v: number) => v.toFixed(6);
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aPart;\nvarying float vPart;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvPart = aPart;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vPart;')
      .replace('#include <color_fragment>', `#include <color_fragment>
if (vPart > 1.5) diffuseColor.rgb = vec3(1.0);
else if (vPart > 0.5) diffuseColor.rgb = vec3(${f(cabin.r)}, ${f(cabin.g)}, ${f(cabin.b)});`)
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = vPart > 1.5 ? 1.0 : (vPart > 0.5 ? 0.15 : 0.35);')
      .replace('#include <metalnessmap_fragment>', 'float metalnessFactor = vPart > 1.5 ? 0.0 : (vPart > 0.5 ? 0.8 : 0.4);')
      .replace('#include <emissivemap_fragment>', 'totalEmissiveRadiance *= step(1.5, vPart);');
  };
  mat.customProgramCacheKey = () => 'traffic-car-v1';
  return mat;
}

// ------------------------------------------------------------------ aircraft

interface DistantAircraft { id: number; path: (t: number, out: THREE.Vector3) => THREE.Vector3; period: number; offset: number; contrail: WakeTrail | null; }

export class Traffic {
  readonly group = new THREE.Group();
  readonly materials: THREE.Material[] = [];
  private boats: MovingBoat[] = [];
  private carRoutes: CarRoute[] = [];
  private cars: Car[] = [];
  private readonly carChunks: CarChunk[] = [];
  /** per cell: the car chunk and the box-vehicle chunk (null when no route through the cell carries that kind) */
  private readonly carCells = new Map<number, [CarChunk | null, CarChunk | null]>();
  /** the culled car cell meshes: their bounding spheres are refit to the cars in the cell every update */
  readonly carCellMeshes = new Set<THREE.Object3D>();
  /** catches vehicles whose lane offset pushed them out of every registered cell (never culled), per kind */
  private readonly carOverflow: [CarChunk, CarChunk];
  private readonly carMat: THREE.MeshStandardMaterial;
  /** every moving boat and airliner: one batched draw, per-vehicle matrices and frustum culling */
  private readonly movers: THREE.BatchedMesh;
  private aircraft: DistantAircraft[] = [];
  private readonly tmp = { x: 0, z: 0, dx: 1, dz: 0 };
  private readonly tmpM = new THREE.Matrix4();
  private readonly tmpQ = new THREE.Quaternion();
  private readonly tmpP = new THREE.Vector3();
  private readonly tmpS = new THREE.Vector3(1, 1, 1);
  private readonly tmpE = new THREE.Euler(0, 0, 0, 'YXZ');
  private readonly up = new THREE.Vector3(0, 1, 0);
  private readonly pos = new THREE.Vector3();
  private readonly dir = new THREE.Vector3();
  private readonly side = new THREE.Vector3();
  private readonly ahead = new THREE.Vector3();
  boatCount = 0;
  carCount = 0;

  constructor(private map: WorldMap, roads: RoadSegment[], bridges: BridgeRoute[], wakes: WakeBatch, seed: number, moored: MooredBoat[]) {
    const rng = new Rng(`traffic-${seed}`);
    const factory = new BoatFactory();
    // moving boats along channels: baked in their local frame, batched below
    const moverGeos: THREE.BufferGeometry[] = [];
    for (const ch of map.channels) {
      const len = routeLength(ch.pts);
      for (let i = 0; i < ch.boats; i++) {
        const kind: HullKind = ch.id === 'ocean-route' || ch.id === 'ship-channel' ? (rng.chance(0.6) ? 'cargo' : 'ferry') : rng.pick(['speed', 'speed', 'console', 'yacht', 'sail', 'speed']);
        const b = factory.build(kind, rng);
        const speed = kind === 'cargo' ? rng.range(4, 6) : kind === 'ferry' ? 7 : kind === 'sail' ? rng.range(2.5, 4) : kind === 'yacht' ? rng.range(5, 9) : rng.range(9, 16);
        const wake = new WakeTrail(kind === 'cargo' ? 90 : 80, b.wakeWidth, kind === 'cargo' ? 70 : kind === 'sail' ? 20 : 42, kind === 'sail' ? 0.45 : 1.5, wakes);
        moverGeos.push(bakeLocal(b.group));
        this.boats.push({ id: moverGeos.length - 1, route: ch.pts, routeLen: len, s: rng.range(0, len), dir: rng.chance(0.5) ? 1 : -1, speed, len: b.len, draft: b.draft, wake, phase: rng.range(0, 100) });
      }
    }
    // moored boats (static, no wake) join the same batch with a fixed matrix
    const mooredInst: { idx: number; m: THREE.Matrix4 }[] = [];
    for (const mb of moored) {
      const kind: HullKind = mb.kind ?? (rng.chance(0.4) ? 'sail' : rng.chance(0.5) ? 'speed' : rng.chance(0.5) ? 'console' : 'yacht');
      const b = factory.build(kind, rng, true);
      const scale = kind === 'cruise' ? 1 : clamp(mb.len / b.len, 0.6, 1.4);
      b.group.scale.setScalar(scale);
      b.group.position.set(mb.x, 0.05, mb.z);
      b.group.rotation.y = mb.rot + (rng.chance(0.5) ? Math.PI : 0);
      moverGeos.push(bakeLocal(b.group));
      mooredInst.push({ idx: moverGeos.length - 1, m: b.group.matrixWorld.clone() });
    }
    this.boatCount = this.boats.length + moored.length;

    // car routes: authored road polylines + generated streets + bridge decks
    const byId = new Map<string, THREE.Vector3[]>();
    for (const r of map.roads) byId.set(r.id, r.pts.map(([x, z]) => new THREE.Vector3(x, map.heightAt(x, z) + 0.25, z)));
    const routeDensity: number[] = [];
    for (const [id, pts] of byId) {
      const spec = map.roads.find((r) => r.id === id)!;
      this.carRoutes.push({ pts, length: this.len3(pts), lanes: spec.lanes, width: spec.width, laneOff0: spec.lanes >= 4 ? 1.5 : 1.8, laneW: 3.2 });
      routeDensity.push(spec.traffic);
    }
    for (const b of bridges) {
      // the deck's carriageway layout (see bridges.ts): lanes of 3.3 m, a 0.3 m median half-width on six lanes
      const cw = clamp(b.lanes * 3.3, 8, b.width - 4), laneW = cw / b.lanes, median = b.lanes >= 6 ? 0.3 : 0;
      this.carRoutes.push({ pts: b.pts.map((p) => p.clone().add(new THREE.Vector3(0, 0.25, 0))), length: this.len3(b.pts), lanes: b.lanes, width: b.width, laneOff0: median + laneW * 0.5, laneW });
      routeDensity.push(b.traffic * 2.4);
    }
    for (const s of roads) {
      if (s.cls !== 'street') continue;
      if (rng.next() > 0.35) continue; // not every street carries traffic
      const pts = [new THREE.Vector3(s.a[0], map.heightAt(s.a[0], s.a[1]) + 0.25, s.a[1]), new THREE.Vector3(s.b[0], map.heightAt(s.b[0], s.b[1]) + 0.25, s.b[1])];
      this.carRoutes.push({ pts, length: this.len3(pts), lanes: 2, width: s.width, laneOff0: 1.8, laneW: 3.2 });
      routeDensity.push(1.2);
    }
    const carColors = ['#e8e8e8', '#d0d0d0', '#1c1c1e', '#8a8f94', '#b8352e', '#2b4c8c', '#d9a441', '#3d6b3a', '#f2f2f2', '#6c6f73', '#c94f3d', '#20242a'];
    const vanColors = ['#f2f2f2', '#e8e8e8', '#d8d8d4', '#3a4a5c', '#b8352e'];
    const busColors = ['#2b6cb0', '#e4842a', '#f0f0ee', '#3d8a4a'];
    const truckColors = ['#f2f2f2', '#c8cccf', '#8a2f2a', '#2f5a3c', '#d9a441'];
    const unit = new THREE.Vector3(1, 1, 1);
    /** van: the unit box; bus: 12 x 2.55 x 3.2 m; rigid truck: 9 x 2.5 x 3.4 m */
    const heavyOf = (): { scale: THREE.Vector3; color: string; len: number } => {
      const u = rng.next();
      if (u < 0.55) return { scale: unit, color: rng.pick(vanColors), len: 5.4 };
      if (u < 0.78) return { scale: new THREE.Vector3(2.2, 1.55, 1.25), color: rng.pick(busColors), len: 12 };
      return { scale: new THREE.Vector3(1.7, 1.65, 1.22), color: rng.pick(truckColors), len: 9.2 };
    };
    for (let ri = 0; ri < this.carRoutes.length; ri++) {
      const r = this.carRoutes[ri];
      const n = Math.min(160, Math.round((r.length / 1000) * routeDensity[ri]));
      if (!n) continue;
      const lanesPerDir = Math.max(1, Math.floor(r.lanes / 2));
      const multi = r.lanes >= 4;
      // lane discipline: every (direction, lane) gets a queue of vehicles with random headways >= MIN_HEADWAY and a
      // common lane speed (fast inside, slow outside, where the heavies run) with a hair of jitter, so the queues
      // keep their spacing through the pre-simulation instead of overlapping
      const perQueue = Math.ceil(n / (2 * lanesPerDir));
      const base = multi ? 24 : 13;
      for (const dir of [1, -1] as const) for (let lane = 0; lane < lanesPerDir; lane++) {
        const laneSpeed = base * (1.12 - 0.1 * lane);
        let s = rng.range(0, r.length);
        for (let i = 0; i < perQueue; i++) {
          const outer = lane === lanesPerDir - 1;
          const heavy = multi && rng.chance(outer ? 0.32 : 0.08);
          const h = heavy ? heavyOf() : null;
          const color = new THREE.Color(h ? h.color : rng.pick(carColors));
          this.cars.push({ route: ri, s, dir, lane, speed: laneSpeed * rng.range(0.99, 1.01) * (h && h.len > 6 ? 0.92 : 1), color, kind: h ? 1 : 0, scale: h ? h.scale : unit });
          s = (s + (h ? h.len : 4.4) + MIN_HEADWAY + rng.range(0, 3) * rng.range(0, 30) + rng.range(4, 40)) % r.length;
        }
      }
    }
    this.carCount = this.cars.length;
    // vehicle cells: every cell a route passes through gets a chunk per kind sized for all vehicles of those routes
    const geos = [carGeometry(), boxVehicleGeometry()];
    this.carMat = carMaterial();
    this.materials.push(this.carMat);
    const cellCap = new Map<number, [number, number]>();
    const carsPerRoute = this.carRoutes.map(() => [0, 0]);
    for (const c of this.cars) carsPerRoute[c.route][c.kind]++;
    const seen = new Set<number>();
    const sample = new THREE.Vector3();
    for (let ri = 0; ri < this.carRoutes.length; ri++) {
      if (!carsPerRoute[ri][0] && !carsPerRoute[ri][1]) continue;
      const pts = this.carRoutes[ri].pts;
      seen.clear();
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1];
        const steps = Math.max(1, Math.ceil(a.distanceTo(b) / 40));
        for (let k = 0; k <= steps; k++) {
          sample.lerpVectors(a, b, k / steps);
          const key = cellKey(sample.x, sample.z, CAR_CELL);
          if (!seen.has(key)) {
            seen.add(key);
            const cap = cellCap.get(key) ?? [0, 0];
            cap[0] += carsPerRoute[ri][0]; cap[1] += carsPerRoute[ri][1];
            cellCap.set(key, cap);
          }
        }
      }
    }
    const makeChunk = (kind: 0 | 1, capacity: number, culled: boolean): CarChunk => {
      const mesh = new THREE.InstancedMesh(geos[kind], this.carMat, capacity);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.setColorAt(0, this.cars[0]?.color ?? new THREE.Color(0xffffff));
      mesh.instanceColor!.setUsage(THREE.DynamicDrawUsage);
      mesh.castShadow = true;
      mesh.count = 0;
      mesh.visible = false;
      setCasterClass(mesh, 'mid');
      // the world-space bound is refitted to the vehicles in the cell every update
      if (culled) mesh.boundingSphere = new THREE.Sphere();
      else mesh.frustumCulled = false;
      this.group.add(mesh);
      return { mesh, capacity, n: 0, center: new THREE.Vector3(), r: 0, box: new THREE.Box3() };
    };
    for (const [key, cap] of cellCap) {
      const chunks: [CarChunk | null, CarChunk | null] = [null, null];
      for (const kind of [0, 1] as const) {
        if (!cap[kind]) continue;
        const chunk = makeChunk(kind, cap[kind], true);
        chunks[kind] = chunk;
        this.carChunks.push(chunk);
        this.carCellMeshes.add(chunk.mesh);
      }
      this.carCells.set(key, chunks);
    }
    this.carOverflow = [makeChunk(0, Math.max(1, carsPerRoute.reduce((a, c) => a + c[0], 0)), false), makeChunk(1, Math.max(1, carsPerRoute.reduce((a, c) => a + c[1], 0)), false)];
    this.carChunks.push(...this.carOverflow);

    // distant aircraft: two airliners on approach / departure, one high cruiser with a contrail
    const airMat = new THREE.MeshStandardMaterial({ color: 0xf4f6f8, roughness: 0.35, metalness: 0.2 });
    const tailMat = new THREE.MeshStandardMaterial({ color: 0x2a6fbf, roughness: 0.4 });
    const airliner = (scale: number): number => {
      const g = new THREE.Group();
      const fus = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.9, 38, 12), airMat); fus.rotation.z = Math.PI / 2; g.add(fus);
      const nose = new THREE.Mesh(new THREE.SphereGeometry(1.9, 12, 8), airMat); nose.position.x = 19; nose.scale.set(1.6, 1, 1); g.add(nose);
      const wing = new THREE.Mesh(new THREE.BoxGeometry(6, 0.5, 34), airMat); wing.position.set(1, -0.8, 0); wing.rotation.y = 0.0; g.add(wing);
      const sweepL = new THREE.Mesh(new THREE.BoxGeometry(5, 0.4, 16), airMat); sweepL.position.set(-3, -0.8, 12); sweepL.rotation.y = -0.45; g.add(sweepL);
      const sweepR = sweepL.clone(); sweepR.position.z = -12; sweepR.rotation.y = 0.45; g.add(sweepR);
      const tail = new THREE.Mesh(new THREE.BoxGeometry(5, 8, 0.4), tailMat); tail.position.set(-16, 4.5, 0); tail.rotation.z = -0.4; g.add(tail);
      const hstab = new THREE.Mesh(new THREE.BoxGeometry(4, 0.3, 12), airMat); hstab.position.set(-17, 1, 0); g.add(hstab);
      for (const s of [-1, 1]) { const eng = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.0, 4.5, 10), airMat); eng.rotation.z = Math.PI / 2; eng.position.set(3, -2.4, s * 7); g.add(eng); }
      g.scale.setScalar(scale);
      moverGeos.push(bakeLocal(g));
      return moverGeos.length - 1;
    };
    const rwy = map.runways[0];
    // approach to runway 09 from the east over the bay: descend from 900 m at x=+3000 to the threshold
    const approach = (t: number, out: THREE.Vector3) => {
      const x = lerp(4000, rwy.a[0], t), z = lerp(rwy.a[1] + 30, rwy.a[1], t);
      const y = lerp(900, 12, Math.pow(t, 0.9));
      return out.set(x, y, z);
    };
    this.aircraft.push({ id: airliner(1.0), path: approach, period: 240, offset: 0, contrail: null });
    this.aircraft.push({ id: airliner(0.9), path: approach, period: 240, offset: 0.5, contrail: null });
    // departure climbing west then turning north
    const departure = (t: number, out: THREE.Vector3) => {
      const x = lerp(rwy.b[0], -9000, t), z = rwy.b[1] - 3500 * t * t;
      return out.set(x, 12 + 2200 * Math.pow(t, 0.8), z);
    };
    this.aircraft.push({ id: airliner(1.0), path: departure, period: 200, offset: 0.2, contrail: null });
    // high cruiser with contrail
    const cruise = (t: number, out: THREE.Vector3) => out.set(lerp(-14000, 14000, t), 9500, lerp(-9000, 6000, t));
    const contrail = new WakeTrail(180, 25, 90, 0.6, CONTRAIL_MATERIAL);
    this.aircraft.push({ id: airliner(1.0), path: cruise, period: 260, offset: 0.4, contrail });

    // the movers batch: one geometry + instance per vehicle, drawn in a single (multi-draw) call with
    // per-vehicle frustum culling; the whole-mesh bound is meaningless for vehicles spread over the map
    let vertexCount = 0;
    for (const g of moverGeos) vertexCount += g.getAttribute('position').count;
    const moverMat = createBatchedPbrMaterial('traffic-movers-v1', true);
    this.materials.push(moverMat);
    this.movers = new THREE.BatchedMesh(moverGeos.length, vertexCount, vertexCount, moverMat);
    const ids = moverGeos.map((g) => {
      const id = this.movers.addInstance(this.movers.addGeometry(g));
      g.dispose();
      return id;
    });
    for (const b of this.boats) b.id = ids[b.id];
    for (const a of this.aircraft) a.id = ids[a.id];
    for (const mi of mooredInst) this.movers.setMatrixAt(ids[mi.idx], mi.m);
    this.movers.frustumCulled = false;
    this.movers.castShadow = true; this.movers.receiveShadow = true;
    this.group.add(this.movers);
  }

  private len3(pts: THREE.Vector3[]): number {
    let l = 0;
    for (let i = 0; i < pts.length - 1; i++) l += pts[i].distanceTo(pts[i + 1]);
    return l;
  }

  private point3(pts: THREE.Vector3[], s: number, out: THREE.Vector3, dir: THREE.Vector3): void {
    let acc = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const l = pts[i].distanceTo(pts[i + 1]);
      if (s <= acc + l || i === pts.length - 2) {
        const t = clamp((s - acc) / l, 0, 1);
        dir.subVectors(pts[i + 1], pts[i]).divideScalar(l);
        out.copy(pts[i]).addScaledVector(dir, l * t);
        return;
      }
      acc += l;
    }
  }

  /** Contrail meshes live in the main scene (they are drawn in the air, not on the water). */
  get contrailMeshes(): THREE.Mesh[] { return this.aircraft.filter((a) => a.contrail).map((a) => a.contrail!.mesh!); }

  update(dt: number, time: number, night: number): void {
    const { tmpM, tmpQ, tmpP, tmpS, tmpE, movers } = this;
    tmpS.set(1, 1, 1);
    // boats
    for (const b of this.boats) {
      const len = b.routeLen;
      b.s += b.speed * dt * b.dir;
      if (b.s > len - 5) { b.s = len - 5; b.dir = -1; }
      if (b.s < 5) { b.s = 5; b.dir = 1; }
      routePoint(b.route, b.s, this.tmp);
      const yaw = Math.atan2(this.tmp.dx * b.dir, this.tmp.dz * b.dir);
      tmpP.set(this.tmp.x, -b.draft * 0.15 + 0.12 * Math.sin(time * 1.3 + b.phase) * (b.len < 20 ? 1 : 0.2), this.tmp.z);
      // hull axis is +x, rotate so +x points along travel direction; a little roll and pitch with the swell
      tmpE.set(0.02 * Math.sin(time * 1.7 + b.phase), yaw - Math.PI / 2, 0.03 * Math.sin(time * 1.1 + b.phase) + (b.speed > 8 ? -0.03 : 0), 'XYZ');
      movers.setMatrixAt(b.id, tmpM.compose(tmpP, tmpQ.setFromEuler(tmpE), tmpS));
      b.wake.update(this.tmp.x - this.tmp.dx * b.dir * b.len * 0.4, this.tmp.z - this.tmp.dz * b.dir * b.len * 0.4, time, true, b.speed);
    }
    // cars: advance, then refill the chunk of the cell each car is in
    const { pos, dir, side, up } = this;
    for (const ch of this.carChunks) { ch.n = 0; ch.box.makeEmpty(); }
    for (let i = 0; i < this.cars.length; i++) {
      const c = this.cars[i];
      const r = this.carRoutes[c.route];
      c.s += c.speed * dt * c.dir;
      if (c.s > r.length) { c.s = 0; }
      if (c.s < 0) { c.s = r.length; }
      this.point3(r.pts, c.s, pos, dir);
      if (c.dir < 0) dir.negate();
      side.crossVectors(dir, up).normalize();
      const laneOff = r.laneOff0 + c.lane * r.laneW;
      pos.addScaledVector(side, laneOff);
      const yaw = Math.atan2(dir.x, dir.z) - Math.PI / 2;
      const pitch = -Math.asin(clamp(dir.y, -1, 1));
      this.tmpQ.setFromEuler(this.tmpE.set(0, yaw, pitch, 'YXZ'));
      this.tmpP.copy(pos);
      this.tmpM.compose(this.tmpP, this.tmpQ, c.scale);
      let chunk = this.carCells.get(cellKey(pos.x, pos.z, CAR_CELL))?.[c.kind];
      if (!chunk || chunk.n >= chunk.capacity) chunk = this.carOverflow[c.kind];
      const slot = chunk.n++;
      chunk.mesh.setMatrixAt(slot, this.tmpM);
      chunk.mesh.setColorAt(slot, c.color);
      chunk.box.expandByPoint(pos);
    }
    for (const ch of this.carChunks) {
      const m = ch.mesh;
      m.count = ch.n;
      if (!ch.n) { m.visible = false; continue; }
      m.visible = true;
      m.instanceMatrix.clearUpdateRanges(); m.instanceMatrix.addUpdateRange(0, ch.n * 16); m.instanceMatrix.needsUpdate = true;
      m.instanceColor!.clearUpdateRanges(); m.instanceColor!.addUpdateRange(0, ch.n * 3); m.instanceColor!.needsUpdate = true;
      ch.box.min.addScalar(-CAR_MARGIN); ch.box.max.addScalar(CAR_MARGIN);
      if (m.boundingSphere) {
        ch.box.getBoundingSphere(m.boundingSphere);
        ch.center.copy(m.boundingSphere.center); ch.r = m.boundingSphere.radius;
      }
    }
    this.carMat.emissiveIntensity = 6 * night;
    // aircraft
    for (const a of this.aircraft) {
      const t = ((time / a.period) + a.offset) % 1;
      const p = a.path(t, this.pos), d = a.path(Math.min(1, t + 0.002), this.ahead).sub(p).normalize();
      const yaw = Math.atan2(d.x, d.z) - Math.PI / 2;
      const pitch = Math.asin(clamp(d.y, -1, 1));
      tmpE.set(0, yaw, pitch * 0.6, 'YXZ');
      movers.setMatrixAt(a.id, tmpM.compose(p, tmpQ.setFromEuler(tmpE), tmpS));
      if (a.contrail) {
        a.contrail.update(p.x, p.z, time, true, 250);
        a.contrail.mesh!.position.y = p.y - 2;
        a.contrail.mesh!.updateMatrix();
      }
    }
  }

  /** Per-frame culling of the car cells: a cell casts only when its shadow can reach the view, and
   *  leaves the camera layer when out of view. (The movers batch culls per vehicle on its own.) */
  updateCulling(cull: ViewCull): void {
    for (const ch of this.carChunks) {
      if (!ch.n || ch === this.carOverflow[0] || ch === this.carOverflow[1]) continue;
      const inView = cull.boxInView(ch.box);
      const bits = cull.casterCascades(ch.center, ch.r, 2.5);
      const mask = layerMask('mid', inView, bits);
      const cast = maskCasts(mask);
      ch.mesh.visible = inView || cast;
      ch.mesh.castShadow = cast;
      ch.mesh.layers.mask = mask;
    }
  }
}
