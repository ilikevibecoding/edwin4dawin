import * as THREE from 'three';
import { Rng } from '../core/MathUtils';
import { Groups } from '../core/GameContext';
import type { MaterialName } from '../core/Interfaces';
import type { Batcher, MatRef, PropDef } from './Batcher';
import { TANK_SHEET, registerInteriorFinishes } from './Finish';
import {
  FX_ALL,
  FX_NY,
  FX_NZ,
  FX_PZ,
  FX_SIDES,
  GeoBuf,
  addBox,
  addCloth,
  addCylinder,
  addQuad,
  addTube,
  addWedge,
  appendGeometry,
  groundGeometry,
  makeGeometry,
  type RGB,
} from './Geo';

/**
 * The prop library.
 *
 * Every entry is a single-material, low-poly, base-origin geometry registered
 * once and then placed by matrix, so four hundred objects cost roughly forty
 * draw calls. Single-material is a deliberate constraint: a crate with steel
 * banding would double the instanced mesh count for detail nobody reads at two
 * metres, so banding is painted in with vertex colour instead.
 *
 * Origins sit on the contact point of the prop, never at its centre. A prop
 * floating two centimetres above the pavement destroys the illusion faster
 * than any lighting error, and placing by contact point makes that impossible.
 */

const _m = new THREE.Matrix4();
const _v = new THREE.Vector3();

/*
 * Weathering multipliers for the timber materials.
 *
 * Both wood shaders are built on `pineColor`, whose lightest band is sRGB
 * (0.66, 0.55, 0.41) — linear (0.40, 0.26, 0.14), a red-to-blue ratio of three
 * to one. That is fresh-sawn softwood, and it is correct for fresh-sawn
 * softwood; under a golden-hour key it is also glowing orange. A market street
 * dressed in it read as a lumber yard, with rows of identical bright tangerine
 * crates pulling the eye off everything else in the frame.
 *
 * Timber left in this sun for a season goes silver-grey: the lignin breaks down
 * and what is left is a desaturated warm grey around 0.25 linear. These bring
 * the blue channel up by a third and hold red back to land there. Not applied
 * uniformly — anything recently cut or painted keeps more of its colour, so
 * boarding and structural planks take the milder knock-down.
 */
const WOOD_GREY: RGB = [0.66, 0.85, 1.22];
const WOOD_WARM: RGB = [0.82, 0.93, 1.08];

interface Spec {
  id: string;
  material: MatRef;
  build: (buf: GeoBuf, rng: Rng) => void;
  lod?: (buf: GeoBuf) => void;
  lodDistance?: number;
  cullDistance?: number;
  collide?: boolean;
  castShadow?: boolean;
  group?: number;
  /** Wall-mounted props keep their authored origin: it is the mount point on
   *  the wall plane, with +Z pointing out of the wall. */
  keepOrigin?: boolean;
  /**
   * Multiplies every vertex colour in the prop, on top of whatever the build
   * function wrote.
   *
   * This exists to re-hue a shared material. `metal_painted` is a petrol-blue
   * industrial enamel, and it is the right physical description of a jerrycan, an
   * air-conditioner, a street lamp, a sign post and an ammunition box — so all
   * five arrived in the same saturated teal and the map had teal scattered evenly
   * across every shot in it. Repainting each build function would mean touching
   * every colour in it and losing the relative shading it already carries; a
   * single multiplier moves the whole object's hue and keeps its internal
   * modelling intact.
   */
  baseTint?: RGB;
  /**
   * Multiplies the prop's uvs, so it samples its material finer than the tile
   * size the material was authored for.
   *
   * Worth reaching for whenever a prop is smaller than its material's tile and
   * that material has a large feature in it. `metal_painted` tiles at 1.6 m and
   * draws rust in patches most of a metre across; on a 60 cm road sign that is
   * one patch covering a third of the board.
   */
  uvScale?: number;
}

function spec(s: Spec): PropDef {
  const rng = new Rng(hash(s.id));
  const fit = s.keepOrigin
    ? (g: THREE.BufferGeometry): THREE.BufferGeometry => g
    : groundGeometry;
  /*
   * Every prop is given its own crop of its material, keyed off its id.
   *
   * Prop uvs are authored in the prop's own local metres, which means two props
   * sharing a material sample it at the same coordinates — so `metal_painted`
   * put an identical rust bloom in an identical place on the road sign, the sign
   * post, the meter cabinet and the jerrycan, and the level ended up with one
   * recognisable orange blotch stamped across a dozen unrelated objects. One
   * hashed offset per id costs nothing and breaks the whole family apart.
   */
  const uvShift = ((hash(s.id + '|uv') >>> 8) % 977) * 0.0193;
  const uvShift2 = ((hash(s.id + '|vu') >>> 8) % 991) * 0.0171;
  const paint = (g: THREE.BufferGeometry): THREE.BufferGeometry => {
    const t = s.baseTint;
    if (t) {
      const col = g.getAttribute('color') as THREE.BufferAttribute;
      for (let i = 0; i < col.count; i++) {
        col.setXYZ(i, col.getX(i) * t[0], col.getY(i) * t[1], col.getZ(i) * t[2]);
      }
    }
    const uv = g.getAttribute('uv') as THREE.BufferAttribute | undefined;
    if (uv) {
      const k = s.uvScale ?? 1;
      for (let i = 0; i < uv.count; i++) {
        uv.setXY(i, uv.getX(i) * k + uvShift, uv.getY(i) * k + uvShift2);
      }
    }
    return g;
  };
  const geometry = paint(fit(makeGeometry((buf) => s.build(buf, rng))));
  const def: PropDef = {
    id: s.id,
    material: s.material,
    geometry,
    lodDistance: s.lodDistance,
    cullDistance: s.cullDistance,
    collide: s.collide,
    castShadow: s.castShadow,
    hit: { group: s.group ?? Groups.PROP },
  };
  if (s.lod) def.lodGeometry = paint(fit(makeGeometry(s.lod)));
  return def;
}

function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Cheap stand-in used by most props beyond the level-of-detail switch. */
function boxLod(w: number, h: number, d: number, color: RGB): (buf: GeoBuf) => void {
  return (buf) => addBox(buf, 0, h * 0.5, 0, w, h, d, { color });
}

/* ---------------------------- the definitions ---------------------------- */

export function registerProps(batch: Batcher): void {
  // Props reference finish variants by key, so the variants have to exist before
  // any definition using one is resolved.
  registerInteriorFinishes(batch);
  for (const def of PROPS()) batch.defineProp(def);
}

function PROPS(): PropDef[] {
  const list: PropDef[] = [];
  const add = (s: Spec): void => {
    list.push(spec(s));
  };

  /* --- containers -------------------------------------------------------- */

  add({
    id: 'crate_large',
    material: 'wood_crate',
    baseTint: WOOD_GREY,
    lodDistance: 55,
    build: (buf) => {
      const s = 0.78;
      addBox(buf, 0, s * 0.5, 0, s, s, s, { color: [1, 1, 1], grime: 0.22, grimeHeight: 0.25 });
      // Corner battens; the silhouette break is what sells a crate.
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          addBox(buf, sx * s * 0.5, s * 0.5, sz * s * 0.5, 0.07, s + 0.01, 0.07, {
            color: [0.86, 0.8, 0.7],
          });
        }
      }
      addBox(buf, 0, s - 0.05, 0, s + 0.03, 0.07, s + 0.03, { color: [0.9, 0.84, 0.74] });
      addBox(buf, 0, 0.07, 0, s + 0.03, 0.07, s + 0.03, { color: [0.82, 0.76, 0.66] });
    },
    lod: boxLod(0.8, 0.8, 0.8, [0.95, 0.9, 0.82]),
  });

  add({
    id: 'crate_small',
    material: 'wood_crate',
    baseTint: WOOD_GREY,
    lodDistance: 40,
    cullDistance: 130,
    build: (buf) => {
      addBox(buf, 0, 0.22, 0, 0.54, 0.44, 0.4, { color: [1, 1, 1], grime: 0.2, grimeHeight: 0.16 });
      addBox(buf, 0, 0.42, 0, 0.57, 0.05, 0.43, { color: [0.9, 0.84, 0.74] });
    },
    lod: boxLod(0.54, 0.44, 0.4, [0.95, 0.9, 0.82]),
  });

  add({
    id: 'produce_crate',
    material: 'wood_crate',
    baseTint: WOOD_GREY,
    lodDistance: 40,
    cullDistance: 120,
    build: (buf) => {
      const w = 0.6;
      const d = 0.42;
      const h = 0.26;
      // Open-topped slatted box.
      for (const sz of [-1, 1]) {
        addBox(buf, 0, h * 0.5, sz * d * 0.5, w, h, 0.035, { color: [0.96, 0.9, 0.78] });
      }
      for (const sx of [-1, 1]) {
        addBox(buf, sx * w * 0.5, h * 0.5, 0, 0.035, h, d, { color: [0.96, 0.9, 0.78] });
      }
      addBox(buf, 0, 0.02, 0, w, 0.04, d, { color: [0.86, 0.8, 0.68] });
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          addBox(buf, sx * w * 0.5, h * 0.5, sz * d * 0.5, 0.06, h + 0.06, 0.06, {
            color: [0.88, 0.82, 0.7],
          });
        }
      }
    },
    lod: boxLod(0.6, 0.3, 0.42, [0.92, 0.86, 0.74]),
  });

  /*
   * A heap of fruit in a crate. Deliberately not built on the foliage
   * material: multiplying a green leaf albedo by a green tint produced
   * fluorescent slime, and market produce at golden hour is warm and muted,
   * not saturated.
   */
  add({
    id: 'produce_pile',
    material: 'plastic',
    collide: false,
    castShadow: false,
    lodDistance: 34,
    cullDistance: 90,
    build: (buf, rng) => {
      // 5x3 rather than 6x4: a 7 cm orange in a crate is thirty pixels across at
      // the closest a player ever gets to one, and eleven of them read as a heap
      // just as well as sixteen did at half the triangles.
      const sphere = new THREE.SphereGeometry(1, 5, 3);
      /*
       * Oranges, tomatoes, melons, dates, lemons and aubergines. Values are kept
       * well up: a plastic albedo multiplied by a mid-tone tint lands almost
       * black under an awning, and a crate of black spheres reads as coal.
       */
      const PRODUCE: RGB[] = [
        [1.5, 0.92, 0.34],
        [1.42, 0.5, 0.32],
        [1.05, 1.0, 0.46],
        [0.95, 0.8, 0.42],
        [1.5, 1.3, 0.6],
        [0.8, 0.62, 0.78],
      ];
      const base = PRODUCE[Math.floor(rng.range(0, PRODUCE.length)) % PRODUCE.length];
      for (let i = 0; i < 11; i++) {
        const r = rng.range(0.055, 0.088);
        const a = rng.range(0, Math.PI * 2);
        const d = rng.range(0, 0.2);
        _m.makeScale(r, r * rng.range(0.8, 1.0), r);
        _m.setPosition(Math.cos(a) * d, rng.range(0.04, 0.19), Math.sin(a) * d);
        // One crate holds one crop, with only per-fruit ripeness varying.
        const k = rng.range(0.82, 1.14);
        appendGeometry(buf, sphere, _m, [base[0] * k, base[1] * k, base[2] * k], [0.3, 0.3]);
      }
      sphere.dispose();
    },
  });

  add({
    id: 'sack',
    material: 'fabric_canvas',
    lodDistance: 36,
    cullDistance: 110,
    build: (buf, rng) => {
      addCylinder(buf, 0, 0, 0, 0.24, 0.5, {
        segments: 8, topRadius: 0.19, color: [1, 0.98, 0.92], grime: 0.18,
      });
      addCylinder(buf, 0, 0.5, 0, 0.19, 0.12, {
        segments: 8, topRadius: 0.1, color: [0.94, 0.92, 0.86],
      });
      void rng;
    },
    lod: boxLod(0.44, 0.6, 0.44, [1, 0.97, 0.9]),
  });

  add({
    id: 'basket',
    material: 'wood_crate',
    baseTint: WOOD_GREY,
    lodDistance: 32,
    cullDistance: 90,
    build: (buf) => {
      addCylinder(buf, 0, 0, 0, 0.22, 0.34, {
        segments: 9, topRadius: 0.28, caps: false, color: [0.94, 0.84, 0.66],
      });
      addCylinder(buf, 0, 0.01, 0, 0.22, 0.02, { segments: 9, color: [0.88, 0.78, 0.6] });
      addCylinder(buf, 0, 0.32, 0, 0.29, 0.05, {
        segments: 9, topRadius: 0.29, caps: false, color: [0.86, 0.76, 0.58],
      });
    },
  });

  /* --- barrels and drums -------------------------------------------------- */

  add({
    id: 'drum_rust',
    uvScale: 2.0,
    material: 'metal_rusted',
    lodDistance: 60,
    build: (buf) => {
      addCylinder(buf, 0, 0, 0, 0.29, 0.88, { segments: 12, color: [1, 1, 1], grime: 0.25 });
      for (const y of [0.2, 0.44, 0.68]) {
        addCylinder(buf, 0, y, 0, 0.305, 0.055, {
          segments: 12, caps: false, color: [0.86, 0.84, 0.82],
        });
      }
      addCylinder(buf, 0, 0.86, 0, 0.3, 0.04, { segments: 12, color: [0.92, 0.9, 0.88] });
    },
    lod: (buf) => addCylinder(buf, 0, 0, 0, 0.3, 0.88, { segments: 7, color: [0.95, 0.93, 0.9] }),
  });

  add({
    id: 'drum_painted',
    uvScale: 2.0,
    material: 'metal_painted',
    lodDistance: 60,
    build: (buf) => {
      addCylinder(buf, 0, 0, 0, 0.29, 0.88, { segments: 12, color: [1, 1, 1], grime: 0.3 });
      for (const y of [0.22, 0.62]) {
        addCylinder(buf, 0, y, 0, 0.305, 0.06, {
          segments: 12, caps: false, color: [0.7, 0.68, 0.66],
        });
      }
      addCylinder(buf, 0, 0.86, 0, 0.3, 0.04, { segments: 12, color: [0.9, 0.88, 0.86] });
    },
    lod: (buf) => addCylinder(buf, 0, 0, 0, 0.3, 0.88, { segments: 7, color: [0.95, 0.93, 0.9] }),
  });

  add({
    id: 'gas_bottle',
    uvScale: 2.6,
    material: 'metal_painted',
    lodDistance: 34,
    cullDistance: 100,
    build: (buf) => {
      addCylinder(buf, 0, 0, 0, 0.16, 0.52, { segments: 10, color: [1, 1, 1], grime: 0.3 });
      addCylinder(buf, 0, 0.52, 0, 0.16, 0.07, { segments: 10, topRadius: 0.1, color: [0.9, 0.88, 0.86] });
      addCylinder(buf, 0, 0.59, 0, 0.05, 0.09, { segments: 6, color: [0.7, 0.7, 0.72] });
      addCylinder(buf, 0, 0.6, 0, 0.11, 0.09, { segments: 8, caps: false, color: [0.82, 0.8, 0.78] });
    },
  });

  add({
    id: 'jerrycan',
    uvScale: 2.8,
    // Olive drab. Bright teal cans read as green glass bottles in a yard.
    baseTint: [1.12, 1.02, 0.5],
    material: 'metal_painted',
    lodDistance: 30,
    cullDistance: 90,
    build: (buf) => {
      addBox(buf, 0, 0.24, 0, 0.34, 0.46, 0.17, { color: [1, 1, 1], grime: 0.3, grimeHeight: 0.14 });
      addBox(buf, 0, 0.24, 0.09, 0.24, 0.36, 0.02, { color: [0.86, 0.84, 0.82] });
      addBox(buf, 0, 0.24, -0.09, 0.24, 0.36, 0.02, { color: [0.86, 0.84, 0.82] });
      addBox(buf, 0, 0.49, 0, 0.3, 0.05, 0.06, { color: [0.8, 0.78, 0.76] });
      addCylinder(buf, 0.1, 0.47, 0, 0.04, 0.06, { segments: 6, color: [0.72, 0.7, 0.68] });
    },
    lod: boxLod(0.34, 0.5, 0.18, [0.95, 0.93, 0.9]),
  });

  add({
    id: 'bucket',
    material: 'plastic',
    lodDistance: 26,
    cullDistance: 70,
    build: (buf) => {
      addCylinder(buf, 0, 0, 0, 0.12, 0.28, {
        segments: 9, topRadius: 0.15, caps: false, color: [1, 1, 1], grime: 0.25,
      });
      addCylinder(buf, 0, 0.01, 0, 0.12, 0.02, { segments: 9, color: [0.9, 0.9, 0.9] });
    },
  });

  /* --- pallets, tyres, blocks --------------------------------------------- */

  add({
    id: 'pallet',
    material: 'wood_planks',
    baseTint: WOOD_GREY,
    lodDistance: 45,
    build: (buf) => {
      const w = 1.15;
      const d = 0.95;
      for (let i = 0; i < 3; i++) {
        addBox(buf, 0, 0.05, -d * 0.5 + 0.09 + (i * (d - 0.18)) / 2, w, 0.1, 0.13, {
          color: [0.92, 0.86, 0.74], grime: 0.25, grimeHeight: 0.1,
        });
      }
      for (let i = 0; i < 6; i++) {
        addBox(buf, -w * 0.5 + 0.06 + (i * (w - 0.12)) / 5, 0.13, 0, 0.11, 0.05, d, {
          color: [0.96, 0.9, 0.78],
        });
      }
    },
    lod: boxLod(1.15, 0.16, 0.95, [0.93, 0.87, 0.75]),
  });

  add({
    id: 'tyre',
    material: 'rubber',
    // Dusty rather than showroom black. A tyre lying flat on sand shows the sky
    // in its top surface, and at the material's own value that came out as a
    // slate-blue disc — which on pale ground reads as a hole, not an object.
    baseTint: [1.42, 1.34, 1.2],
    lodDistance: 34,
    cullDistance: 100,
    build: (buf) => {
      const torus = new THREE.TorusGeometry(0.28, 0.1, 6, 12);
      _m.makeRotationX(Math.PI / 2);
      _m.setPosition(0, 0.1, 0);
      appendGeometry(buf, torus, _m, [1, 1, 1], [1.8, 0.62]);
      torus.dispose();
      // Sand has blown into the middle of it, which is also what stops the hub
      // reading as a void.
      addCylinder(buf, 0, 0.055, 0, 0.2, 0.09, { segments: 10, color: [1.5, 1.42, 1.26] });
    },
    lod: (buf) => addCylinder(buf, 0, 0, 0, 0.38, 0.2, { segments: 8, color: [0.9, 0.9, 0.9] }),
  });

  add({
    id: 'cinder_block',
    material: 'concrete',
    lodDistance: 26,
    cullDistance: 70,
    build: (buf) => {
      addBox(buf, 0, 0.1, 0, 0.44, 0.2, 0.2, { color: [1, 1, 1], grime: 0.25, grimeHeight: 0.08 });
      for (const sx of [-1, 1]) {
        addBox(buf, sx * 0.11, 0.19, 0, 0.11, 0.03, 0.09, { color: [0.6, 0.59, 0.57] });
      }
    },
  });

  add({
    id: 'brick',
    // Sand-lime, to match the blockwork the town is built from.
    baseTint: [1.04, 1.4, 1.52],
    material: 'brick',
    lodDistance: 18,
    cullDistance: 46,
    collide: false,
    castShadow: false,
    build: (buf) => addBox(buf, 0, 0.032, 0, 0.21, 0.064, 0.1, { color: [1, 1, 1] }),
  });

  add({
    id: 'rubble_chunk',
    material: 'rubble',
    lodDistance: 30,
    cullDistance: 90,
    build: (buf, rng) => {
      for (let i = 0; i < 5; i++) {
        const s = rng.range(0.14, 0.36);
        addBox(buf,
          rng.range(-0.22, 0.22), s * 0.4, rng.range(-0.22, 0.22),
          s, s * rng.range(0.5, 0.9), s * rng.range(0.6, 1.2),
          { rotY: rng.range(0, Math.PI), color: [1, 0.99, 0.97] },
        );
      }
    },
    lod: boxLod(0.55, 0.3, 0.55, [0.96, 0.94, 0.9]),
  });

  add({
    id: 'debris_plank',
    material: 'wood_planks',
    baseTint: WOOD_WARM,
    lodDistance: 22,
    cullDistance: 60,
    collide: false,
    build: (buf, rng) => {
      addBox(buf, 0, 0.03, 0, rng.range(0.9, 1.8), 0.05, 0.16, {
        color: [0.92, 0.86, 0.74], grime: 0.3, grimeHeight: 0.05,
      });
    },
  });

  add({
    id: 'newspaper',
    material: 'fabric_canvas',
    collide: false,
    castShadow: false,
    lodDistance: 14,
    cullDistance: 34,
    build: (buf, rng) => {
      for (let i = 0; i < 2; i++) {
        addBox(buf, rng.range(-0.05, 0.05), 0.004 + i * 0.004, rng.range(-0.05, 0.05),
          rng.range(0.2, 0.3), 0.004, rng.range(0.16, 0.24),
          { rotY: rng.range(0, Math.PI), color: [1.1, 1.08, 1.02] });
      }
    },
  });

  /* --- street furniture ---------------------------------------------------- */

  add({
    id: 'plastic_chair',
    material: 'plastic',
    lodDistance: 30,
    cullDistance: 80,
    build: (buf) => {
      const c: RGB = [1, 1, 1];
      addBox(buf, 0, 0.44, 0, 0.44, 0.04, 0.42, { color: c });
      addBox(buf, 0, 0.68, -0.19, 0.42, 0.44, 0.04, { color: c });
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          addBox(buf, sx * 0.19, 0.22, sz * 0.18, 0.035, 0.44, 0.035, { color: c, grime: 0.3 });
        }
      }
    },
    lod: boxLod(0.44, 0.9, 0.42, [0.95, 0.95, 0.95]),
  });

  add({
    id: 'plastic_table',
    material: 'plastic',
    lodDistance: 34,
    cullDistance: 90,
    build: (buf) => {
      addCylinder(buf, 0, 0.7, 0, 0.42, 0.04, { segments: 12, color: [1, 1, 1] });
      addCylinder(buf, 0, 0, 0, 0.05, 0.7, { segments: 8, color: [0.94, 0.94, 0.94], grime: 0.3 });
      addCylinder(buf, 0, 0, 0, 0.22, 0.03, { segments: 10, color: [0.9, 0.9, 0.9] });
    },
    lod: boxLod(0.84, 0.74, 0.84, [0.96, 0.96, 0.96]),
  });

  add({
    id: 'bench',
    material: 'wood_planks',
    baseTint: WOOD_GREY,
    lodDistance: 40,
    build: (buf) => {
      for (let i = 0; i < 3; i++) {
        addBox(buf, 0, 0.45, -0.16 + i * 0.16, 1.7, 0.05, 0.13, { color: [0.94, 0.88, 0.76] });
      }
      for (const sx of [-1, 1]) {
        addBox(buf, sx * 0.72, 0.22, 0, 0.1, 0.45, 0.42, { color: [0.82, 0.78, 0.7], grime: 0.3 });
      }
    },
    lod: boxLod(1.7, 0.5, 0.42, [0.9, 0.85, 0.74]),
  });

  add({
    id: 'bollard',
    material: 'concrete',
    lodDistance: 40,
    build: (buf) => {
      addCylinder(buf, 0, 0, 0, 0.13, 0.72, { segments: 8, topRadius: 0.11, color: [1, 1, 1], grime: 0.35 });
      addCylinder(buf, 0, 0.72, 0, 0.11, 0.05, { segments: 8, topRadius: 0.07, color: [0.94, 0.92, 0.9] });
      addCylinder(buf, 0, 0.5, 0, 0.115, 0.14, { segments: 8, caps: false, color: [1.25, 1.2, 1.05] });
    },
  });

  /*
   * A jersey barrier, which is worth building properly because it is the piece
   * of hard cover the player stands behind most often and it therefore ends up
   * filling the bottom of the frame. Its silhouette is the whole asset: a wide
   * splayed foot, a steep glacis, then a near-vertical parapet to a narrow top.
   * Approximating that with three stacked boxes gives a concrete ziggurat, which
   * is what this was, and it read as an untextured block from any distance.
   */
  add({
    id: 'jersey_barrier',
    material: 'concrete',
    lodDistance: 70,
    build: (buf, rng) => {
      const len = 1.96;
      const h = 0.86;
      // Half-width of the standard profile, sampled at a few heights.
      const profile: ReadonlyArray<readonly [number, number]> = [
        [0, 0.31], [0.07, 0.295], [0.16, 0.245], [0.34, 0.185],
        [0.52, 0.145], [0.66, 0.125], [0.86, 0.115],
      ];
      for (let i = 0; i < profile.length - 1; i++) {
        const [y0, w0] = profile[i];
        const [y1, w1] = profile[i + 1];
        // Each slice takes the mean half-width of its span, so the stack
        // approximates the slope rather than stepping outside it.
        const w = (w0 + w1) * 0.5;
        const shade = 0.97 + i * 0.012;
        // Only the topmost slice shows a top face; the rest are lids under the
        // slice above, and none of them has a visible underside.
        addBox(buf, 0, (y0 + y1) * 0.5, 0, len, y1 - y0, w * 2, {
          color: [shade, shade * 0.995, shade * 0.98],
          grime: i < 2 ? 0.45 : 0.18,
          grimeHeight: 0.4,
          faces: i === profile.length - 2 ? FX_ALL & ~FX_NY : FX_SIDES,
        });
      }
      // Cast-in lifting slots on the crown, and the shear key at each end.
      for (const sx of [-1, 1]) {
        addBox(buf, sx * len * 0.22, h - 0.03, 0, 0.16, 0.07, 0.1, { color: [0.72, 0.71, 0.69] });
        addBox(buf, sx * len * 0.5, 0.42, 0, 0.05, 0.7, 0.13, { color: [0.93, 0.92, 0.9], grime: 0.3 });
      }
      // Chipped corners and scuffs: the edges take every wing mirror in town.
      for (let i = 0; i < 5; i++) {
        const sx = rng.bool() ? 1 : -1;
        addBox(buf,
          rng.range(-len * 0.45, len * 0.45), rng.range(0.55, h), sx * rng.range(0.1, 0.14),
          rng.range(0.1, 0.3), rng.range(0.05, 0.12), 0.05,
          { rotY: rng.range(-0.3, 0.3), color: [0.82, 0.8, 0.77], grime: 0.4 });
      }
      addBox(buf, rng.range(-0.4, 0.4), 0.5, 0.14, 0.5, 0.12, 0.02,
        { color: [1.15, 0.72, 0.4] });
      /*
       * A painted reflective band down each face, and the sloped shoulder picked
       * out above it.
       *
       * The moulded profile is correct and it is also nearly invisible: from the
       * side — which is how a barrier standing along a kerb is almost always seen —
       * the slope reads as a flat face, so a row of them was a run of plain grey
       * blocks in the foreground of the hero shot. Real ones are painted, and two
       * horizontal bands do more for the silhouette from thirty metres than the
       * geometry underneath them.
       */
      for (const sz of [-1, 1]) {
        const outward = sz > 0 ? FX_PZ : FX_NZ;
        addBox(buf, 0, 0.6, sz * 0.135, len * 0.94, 0.16, 0.02,
          { color: [1.5, 1.44, 1.3], grime: 0.2, faces: outward });
        addBox(buf, 0, 0.28, sz * 0.2, len * 0.9, 0.12, 0.02,
          { color: [1.35, 0.95, 0.55], grime: 0.45, grimeHeight: 0.12, faces: outward });
      }
    },
    // Warm and dusty: near-neutral concrete put a cool grey block in the middle of
    // a golden-hour street, and the eye reads a value that cold as untextured.
    baseTint: [1.14, 1.08, 0.96],
    lod: boxLod(1.9, 0.9, 0.5, [0.98, 0.97, 0.94]),
  });

  add({
    id: 'planter',
    material: 'concrete',
    lodDistance: 45,
    build: (buf) => {
      const w = 1.1;
      const h = 0.55;
      addBox(buf, 0, h * 0.5, 0, w, h, 0.62, { color: [1, 1, 1], grime: 0.3 });
      addBox(buf, 0, h + 0.04, 0, w + 0.1, 0.08, 0.72, { color: [1.03, 1.02, 1] });
      addBox(buf, 0, h - 0.04, 0, w - 0.16, 0.1, 0.48, { color: [0.5, 0.46, 0.4] });
    },
    lod: boxLod(1.1, 0.6, 0.62, [0.98, 0.97, 0.95]),
  });

  add({
    id: 'clay_pot',
    material: 'ceramic_tile',
    lodDistance: 26,
    cullDistance: 70,
    build: (buf) => {
      addCylinder(buf, 0, 0, 0, 0.14, 0.34, {
        segments: 10, topRadius: 0.2, caps: false, color: [1.1, 0.72, 0.5],
      });
      addCylinder(buf, 0, 0.02, 0, 0.14, 0.02, { segments: 10, color: [1.0, 0.66, 0.46] });
      addCylinder(buf, 0, 0.32, 0, 0.21, 0.05, {
        segments: 10, topRadius: 0.21, caps: false, color: [1.14, 0.75, 0.52],
      });
      addCylinder(buf, 0, 0.3, 0, 0.19, 0.02, { segments: 10, color: [0.42, 0.34, 0.26] });
    },
  });

  add({
    id: 'carpet_roll',
    material: 'fabric_carpet',
    lodDistance: 32,
    cullDistance: 90,
    /*
     * Lying down, not standing up. Authored as an upright cylinder this was a
     * free-standing column of carpet in the middle of the room — nothing holds a
     * roll on end, and a metre and a half of vertical cylinder in an interior
     * reads as a stone pier. On its side it needs no support and it gives the
     * floor a horizontal line, which is what these are for.
     */
    build: (buf, rng) => {
      const len = rng.range(1.5, 2.3);
      const r = rng.range(0.13, 0.17);
      const yaw = rng.range(-0.12, 0.12);
      const a = new THREE.Vector3(-Math.cos(yaw) * len * 0.5, r, -Math.sin(yaw) * len * 0.5);
      const b = new THREE.Vector3(Math.cos(yaw) * len * 0.5, r * rng.range(0.95, 1.05), Math.sin(yaw) * len * 0.5);
      addTube(buf, a, b, r, 9, [1, 1, 1]);
      // The loose outer edge of the roll, and a cord tied round it.
      addBox(buf, 0, r * 0.6, r * 0.9, len * 0.8, r * 1.1, 0.05,
        { rotY: yaw, color: [1.05, 1.0, 0.96], grime: 0.25 });
      for (const t of [-0.3, 0.3]) {
        addBox(buf, Math.cos(yaw) * len * t, r, Math.sin(yaw) * len * t, 0.04, r * 2.1, r * 2.1,
          { rotY: yaw, color: [0.8, 0.74, 0.6] });
      }
    },
    lod: boxLod(1.9, 0.34, 0.34, [1, 0.98, 0.95]),
  });

  /* --- rooftop kit ---------------------------------------------------------- */

  add({
    id: 'water_tank',
    material: 'plastic',
    lodDistance: 80,
    build: (buf) => {
      addCylinder(buf, 0, 0.16, 0, 0.62, 1.05, { segments: 9, color: [1, 1, 1], grime: 0.25 });
      addCylinder(buf, 0, 1.21, 0, 0.62, 0.07, { segments: 9, topRadius: 0.5, color: [0.94, 0.93, 0.92] });
      addCylinder(buf, 0.16, 1.27, 0, 0.14, 0.07, { segments: 8, color: [0.8, 0.8, 0.8] });
      // Angle-iron cradle.
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          addBox(buf, sx * 0.44, 0.08, sz * 0.44, 0.07, 0.16, 0.07, { color: [0.6, 0.58, 0.56] });
        }
      }
      addBox(buf, 0, 0.15, 0, 1.0, 0.06, 1.0, { color: [0.62, 0.6, 0.58] });
    },
    lod: (buf) => addCylinder(buf, 0, 0.16, 0, 0.62, 1.1, { segments: 8, color: [0.97, 0.96, 0.95] }),
  });

  add({
    id: 'water_tank_steel',
    /*
     * Corrugation an eye can resolve, on a tank that is not brighter than the sky.
     *
     * At 1.7 the ribs came out about four centimetres apart on a metre-and-a-half
     * drum, and on the roof vantage — where one of these stands two metres off the
     * lens — that read as a printed barcode rather than as folded sheet. Real
     * galvanised tank sheet is ribbed at fifteen to twenty centimetres. Halving
     * the rate gets there and costs nothing.
     *
     * `metal_corrugated` also bakes to a linear 0.45, the brightest albedo in the
     * level after sand, which is honest for new galvanising and wrong for a tank
     * that has stood on a roof in this sun for a decade. Chalked zinc is a mid
     * grey, so it is tinted down to about three tenths.
     */
    uvScale: 0.9,
    baseTint: [0.72, 0.7, 0.67],
    material: TANK_SHEET,
    lodDistance: 80,
    build: (buf) => {
      addCylinder(buf, 0, 0.22, 0, 0.75, 1.25, { segments: 10, color: [1, 1, 1], grime: 0.3 });
      addCylinder(buf, 0, 1.47, 0, 0.75, 0.1, { segments: 10, topRadius: 0.58, color: [0.92, 0.9, 0.88] });
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          addBox(buf, sx * 0.5, 0.11, sz * 0.5, 0.08, 0.22, 0.08, { color: [0.66, 0.62, 0.58] });
        }
      }
    },
    lod: (buf) => addCylinder(buf, 0, 0.22, 0, 0.75, 1.3, { segments: 8, color: [0.95, 0.93, 0.9] }),
  });

  add({
    id: 'ac_unit',
    uvScale: 2.6,
    // Split units are off-white, and there is one on nearly every facade.
    baseTint: [2.15, 1.92, 1.7],
    material: 'metal_painted',
    lodDistance: 70,
    build: (buf) => {
      addBox(buf, 0, 0.34, 0, 0.92, 0.68, 0.56, { color: [1, 1, 1], grime: 0.28 });
      addBox(buf, 0, 0.34, 0.29, 0.78, 0.54, 0.04, { color: [0.78, 0.77, 0.76] });
      addCylinder(buf, 0, 0.68, 0, 0.3, 0.03, { segments: 8, color: [0.72, 0.71, 0.7] });
      for (let i = 0; i < 4; i++) {
        addBox(buf, 0, 0.7, 0, 0.56, 0.02, 0.05, {
          rotY: (i / 4) * Math.PI, color: [0.62, 0.61, 0.6],
        });
      }
      addBox(buf, 0, 0.04, 0, 0.96, 0.08, 0.6, { color: [0.7, 0.68, 0.66] });
    },
    lod: boxLod(0.92, 0.72, 0.56, [0.95, 0.94, 0.93]),
  });

  add({
    id: 'sat_dish',
    material: 'plastic',
    lodDistance: 70,
    collide: false,
    build: (buf) => {
      const dish = new THREE.SphereGeometry(0.42, 9, 4, 0, Math.PI * 2, Math.PI * 0.68, Math.PI * 0.32);
      _m.makeRotationX(-0.75);
      _m.setPosition(0, 0.62, 0);
      appendGeometry(buf, dish, _m, [1, 1, 1], [1.4, 0.7]);
      dish.dispose();
      addCylinder(buf, 0, 0, 0, 0.045, 0.6, { segments: 6, color: [0.86, 0.85, 0.84] });
      addBox(buf, 0, 0.06, 0, 0.28, 0.05, 0.28, { color: [0.8, 0.79, 0.78] });
      _v.set(0, 0.66, 0);
      addTube(buf, _v, new THREE.Vector3(0, 0.78, 0.4), 0.02, 4, [0.7, 0.69, 0.68]);
      addBox(buf, 0, 0.8, 0.42, 0.09, 0.09, 0.14, { color: [0.9, 0.89, 0.88] });
    },
    lod: boxLod(0.8, 0.9, 0.5, [0.9, 0.9, 0.9]),
  });

  add({
    id: 'roof_vent',
    uvScale: 2.4,
    material: 'metal_corrugated',
    lodDistance: 55,
    build: (buf) => {
      addBox(buf, 0, 0.2, 0, 0.5, 0.4, 0.5, { color: [1, 1, 1], grime: 0.3 });
      addBox(buf, 0, 0.44, 0, 0.62, 0.08, 0.62, { color: [0.9, 0.88, 0.86] });
      addCylinder(buf, 0, 0.48, 0, 0.13, 0.3, { segments: 8, color: [0.86, 0.84, 0.82] });
      addCylinder(buf, 0, 0.78, 0, 0.19, 0.06, { segments: 8, topRadius: 0.05, color: [0.82, 0.8, 0.78] });
    },
  });

  add({
    id: 'chimney',
    baseTint: [1.04, 1.4, 1.52],
    material: 'brick',
    lodDistance: 90,
    build: (buf) => {
      addBox(buf, 0, 0.55, 0, 0.5, 1.1, 0.5, { color: [1, 1, 1], grime: 0.2 });
      addBox(buf, 0, 1.14, 0, 0.62, 0.1, 0.62, { color: [0.9, 0.88, 0.85] });
      addBox(buf, 0, 1.26, 0, 0.24, 0.16, 0.24, { color: [0.7, 0.66, 0.6] });
    },
    lod: boxLod(0.5, 1.2, 0.5, [0.95, 0.92, 0.88]),
  });

  /* --- wall furniture ---------------------------------------------------- */

  /*
   * These hang off a facade rather than standing on the ground, so their
   * origin is the mount point on the wall plane with +Z pointing outward.
   * A blank stucco wall three storeys high is the fastest way to make a town
   * read as a set of boxes; a bracket, a condenser and a drainpipe cost almost
   * nothing and give the wall a scale and a shadow.
   */

  add({
    id: 'wall_ac',
    uvScale: 2.6,
    // Split units are off-white, and there is one on nearly every facade.
    baseTint: [2.15, 1.92, 1.7],
    material: 'metal_painted',
    lodDistance: 48,
    cullDistance: 110,
    keepOrigin: true,
    collide: false,
    build: (buf) => {
      // Bracket first, so the box is visibly held off the wall.
      for (const sx of [-1, 1]) {
        addBox(buf, sx * 0.34, -0.06, 0.24, 0.05, 0.06, 0.48, { color: [0.62, 0.6, 0.58] });
        addWedge(buf, sx * 0.34, -0.36, 0.15, 0.05, 0.3, 0.34, { color: [0.6, 0.58, 0.56] });
      }
      addBox(buf, 0, 0.22, 0.28, 0.84, 0.56, 0.42, { color: [1, 1, 1], grime: 0.34, grimeHeight: 0.5 });
      addBox(buf, 0, 0.22, 0.5, 0.7, 0.44, 0.03, { color: [0.72, 0.71, 0.7] });
      _v.set(0, 0.22, 0.5);
      addTube(buf, _v, new THREE.Vector3(0, 0.22, 0.53), 0.19, 10, [0.6, 0.59, 0.58]);
      // Condensate pipe running down the wall out of the base.
      addCylinder(buf, 0.3, -0.9, 0.07, 0.018, 1.1, { segments: 5, color: [0.82, 0.8, 0.78] });
    },
    lod: (buf) => addBox(buf, 0, 0.22, 0.28, 0.84, 0.56, 0.44, { color: [0.95, 0.94, 0.93] }),
  });

  add({
    id: 'wall_dish',
    material: 'plastic',
    lodDistance: 55,
    cullDistance: 130,
    keepOrigin: true,
    collide: false,
    build: (buf) => {
      const dish = new THREE.SphereGeometry(0.38, 12, 6, 0, Math.PI * 2, Math.PI * 0.68, Math.PI * 0.32);
      _m.makeRotationX(-1.05);
      _m.setPosition(0, 0.1, 0.55);
      appendGeometry(buf, dish, _m, [1, 1, 1], [1.4, 0.7]);
      dish.dispose();
      addBox(buf, 0, 0, 0.05, 0.16, 0.22, 0.1, { color: [0.78, 0.77, 0.76] });
      _v.set(0, 0, 0.08);
      addTube(buf, _v, new THREE.Vector3(0, 0.1, 0.5), 0.028, 5, [0.86, 0.85, 0.84]);
      addTube(buf, new THREE.Vector3(0, 0.14, 0.58), new THREE.Vector3(0, -0.1, 0.9), 0.018, 4, [0.7, 0.69, 0.68]);
      addBox(buf, 0, -0.12, 0.92, 0.08, 0.08, 0.12, { color: [0.9, 0.89, 0.88] });
    },
    lod: (buf) => addBox(buf, 0, 0.08, 0.5, 0.74, 0.74, 0.16, { color: [0.9, 0.9, 0.9] }),
  });

  add({
    id: 'wall_box',
    uvScale: 3.0,
    // Grey plastic meter cabinet.
    baseTint: [1.35, 1.3, 1.26],
    castShadow: false,
    material: 'metal_painted',
    lodDistance: 34,
    cullDistance: 80,
    keepOrigin: true,
    collide: false,
    build: (buf, rng) => {
      addBox(buf, 0, 0, 0.1, 0.34, 0.44, 0.2, { color: [0.7, 0.72, 0.66], grime: 0.4 });
      addBox(buf, 0, 0, 0.21, 0.28, 0.36, 0.02, { color: [0.62, 0.64, 0.58] });
      addBox(buf, 0.1, -0.24, 0.16, 0.05, 0.06, 0.05, { color: [0.5, 0.5, 0.48] });
      // Conduit run: the thing that makes a box read as connected to something.
      addCylinder(buf, -0.08, -0.62, 0.06, 0.022, 0.78, { segments: 5, color: [0.66, 0.65, 0.62] });
      addCylinder(buf, -0.08, 0.18, 0.06, 0.022, rng.range(0.5, 1.4), { segments: 5, color: [0.66, 0.65, 0.62] });
    },
    lod: (buf) => addBox(buf, 0, 0, 0.1, 0.34, 0.44, 0.2, { color: [0.7, 0.72, 0.66] }),
  });

  add({
    id: 'wall_lamp',
    uvScale: 3.0,
    // Galvanised, not painted.
    baseTint: [1.5, 1.45, 1.4],
    material: 'metal_painted',
    lodDistance: 44,
    cullDistance: 100,
    keepOrigin: true,
    collide: false,
    build: (buf) => {
      addBox(buf, 0, 0, 0.05, 0.14, 0.2, 0.1, { color: [0.6, 0.58, 0.56] });
      _v.set(0, 0, 0.08);
      addTube(buf, _v, new THREE.Vector3(0, 0.16, 0.52), 0.026, 5, [0.72, 0.7, 0.68]);
      addCylinder(buf, 0, 0.06, 0.56, 0.17, 0.14, {
        segments: 9, topRadius: 0.05, color: [0.92, 0.9, 0.86], caps: false,
      });
      addBox(buf, 0, -0.02, 0.56, 0.24, 0.03, 0.24, { color: [1.6, 1.45, 1.1] });
    },
    lod: (buf) => addBox(buf, 0, 0.04, 0.4, 0.3, 0.3, 0.6, { color: [0.85, 0.83, 0.8] }),
  });

  add({
    id: 'wall_meter',
    castShadow: false,
    material: 'plastic',
    lodDistance: 28,
    cullDistance: 60,
    keepOrigin: true,
    collide: false,
    build: (buf) => {
      addBox(buf, 0, 0, 0.07, 0.26, 0.3, 0.14, { color: [1.1, 1.05, 0.92], grime: 0.35 });
      addBox(buf, 0, 0.04, 0.15, 0.16, 0.12, 0.02, { color: [0.5, 0.55, 0.55] });
      addCylinder(buf, 0, -0.4, 0.05, 0.018, 0.4, { segments: 5, color: [0.55, 0.53, 0.5] });
    },
  });

  /*
   * A caged shopfront light and a bundle of service cable stapled up a wall.
   * Two more silhouette breaks for almost no triangles.
   */
  add({
    id: 'wall_cable',
    castShadow: false,
    material: 'rubber',
    lodDistance: 26,
    cullDistance: 55,
    keepOrigin: true,
    collide: false,
    build: (buf, rng) => {
      for (let i = 0; i < 4; i++) {
        const x = -0.06 + i * 0.04 + rng.range(-0.008, 0.008);
        addCylinder(buf, x, -1.3, 0.03, 0.014, 2.6, { segments: 4, color: [0.6, 0.58, 0.56] });
      }
      for (let i = 0; i < 5; i++) {
        addBox(buf, 0, -1.2 + i * 0.62, 0.03, 0.24, 0.035, 0.06, { color: [0.7, 0.68, 0.64] });
      }
    },
  });

  /* --- lighting and signage -------------------------------------------------- */

  add({
    id: 'street_lamp',
    uvScale: 2.4,
    // Galvanised, not painted.
    baseTint: [1.45, 1.42, 1.4],
    material: 'metal_painted',
    lodDistance: 110,
    build: (buf) => {
      addCylinder(buf, 0, 0, 0, 0.13, 0.35, { segments: 8, topRadius: 0.1, color: [0.8, 0.79, 0.78], grime: 0.4 });
      addCylinder(buf, 0, 0.3, 0, 0.075, 4.3, { segments: 8, topRadius: 0.055, color: [1, 1, 1], grime: 0.2 });
      // Swan neck.
      const steps = 5;
      for (let i = 0; i < steps; i++) {
        const t0 = i / steps;
        const t1 = (i + 1) / steps;
        const p0 = new THREE.Vector3(Math.sin(t0 * 1.5) * 0.95, 4.6 + Math.cos(t0 * 1.5) * 0.32 - 0.32 + t0 * 0.1, 0);
        const p1 = new THREE.Vector3(Math.sin(t1 * 1.5) * 0.95, 4.6 + Math.cos(t1 * 1.5) * 0.32 - 0.32 + t1 * 0.1, 0);
        addTube(buf, p0, p1, 0.05, 5, [0.96, 0.95, 0.94]);
      }
      addBox(buf, 0.94, 4.62, 0, 0.52, 0.13, 0.3, { color: [0.9, 0.89, 0.88] });
      addBox(buf, 0.94, 4.53, 0, 0.44, 0.06, 0.24, { color: [1.4, 1.35, 1.2] });
    },
    lod: (buf) => {
      addCylinder(buf, 0, 0, 0, 0.09, 4.6, { segments: 5, color: [0.95, 0.94, 0.93] });
      addBox(buf, 0.7, 4.6, 0, 1.5, 0.14, 0.3, { color: [0.9, 0.89, 0.88] });
    },
  });

  add({
    id: 'sign_post',
    uvScale: 2.6,
    // Galvanised, not painted.
    baseTint: [1.45, 1.42, 1.4],
    material: 'metal_painted',
    lodDistance: 60,
    build: (buf, rng) => {
      addCylinder(buf, 0, 0, 0, 0.05, 2.3, { segments: 7, color: [0.86, 0.85, 0.84], grime: 0.35 });
      addBox(buf, 0, 2.05, 0.02, 1.15, 0.42, 0.04, { color: [1.05, 1.03, 0.98] });
      addBox(buf, 0, 2.05, 0.0, 1.19, 0.46, 0.03, { color: [0.5, 0.55, 0.62] });
      glyphRun(buf, -0.42, 2.05, 0.05, 0.84, 0.2, rng, [0.24, 0.24, 0.26]);
      addBox(buf, 0, 1.55, 0.02, 0.8, 0.3, 0.04, { color: [1.1, 0.95, 0.5] });
      glyphRun(buf, -0.28, 1.55, 0.05, 0.56, 0.14, rng, [0.3, 0.26, 0.2]);
    },
    lod: (buf) => {
      addCylinder(buf, 0, 0, 0, 0.06, 2.3, { segments: 5, color: [0.86, 0.85, 0.84] });
      addBox(buf, 0, 2.05, 0, 1.15, 0.42, 0.05, { color: [0.9, 0.9, 0.9] });
    },
  });

  add({
    id: 'shop_sign',
    uvScale: 2.2,
    material: 'metal_painted',
    lodDistance: 55,
    collide: false,
    build: (buf, rng) => {
      addBox(buf, 0, 0.3, 0, 1.9, 0.58, 0.06, { color: [1, 1, 1], grime: 0.2 });
      addBox(buf, 0, 0.3, 0.04, 1.78, 0.46, 0.02, {
        color: rng.bool() ? [0.55, 0.75, 0.9] : [0.95, 0.6, 0.4],
      });
      glyphRun(buf, -0.74, 0.3, 0.06, 1.48, 0.26, rng, [1.2, 1.15, 1.05]);
      for (const sx of [-1, 1]) {
        addBox(buf, sx * 0.85, 0.62, -0.08, 0.05, 0.08, 0.24, { color: [0.7, 0.68, 0.66] });
      }
    },
  });

  add({
    id: 'poster',
    material: 'fabric_canvas',
    collide: false,
    castShadow: false,
    lodDistance: 24,
    cullDistance: 60,
    build: (buf, rng) => {
      const w = rng.range(0.4, 0.62);
      const h = rng.range(0.55, 0.85);
      addBox(buf, 0, h * 0.5, 0, w, h, 0.006, {
        color: [rng.range(0.7, 1.2), rng.range(0.65, 1.1), rng.range(0.6, 1.0)],
        faces: FX_ALL & ~FX_NZ,
      });
      // A torn corner: two small triangles' worth of missing paper.
      addBox(buf, w * 0.34, h * 0.86, 0.004, w * 0.3, h * 0.24, 0.004, {
        rotY: 0.0, color: [0.85, 0.83, 0.8], faces: FX_PZ,
      });
      glyphRun(buf, -w * 0.35, h * 0.62, 0.006, w * 0.7, h * 0.12, rng, [0.2, 0.2, 0.22]);
      glyphRun(buf, -w * 0.3, h * 0.4, 0.006, w * 0.6, h * 0.08, rng, [0.25, 0.25, 0.27]);
    },
  });

  /* --- market -------------------------------------------------------------- */

  add({
    id: 'stall_frame',
    material: 'wood_planks',
    baseTint: WOOD_GREY,
    lodDistance: 70,
    build: (buf, rng) => {
      const w = 2.3;
      const d = 1.35;
      /*
       * Sun-bleached rather than fresh timber. Most of these stalls stand under
       * the souk roof, so they are lit by bounce alone and anything painted at
       * the value of real wood silts up into a black mass down there.
       */
      const top: RGB = [1.22, 1.14, 0.99];
      const post: RGB = [1.1, 1.02, 0.88];
      // Counter: a top with a lipped edge, so it has a highlight to catch.
      addBox(buf, 0, 0.86, 0, w, 0.07, d, { color: top });
      addBox(buf, 0, 0.9, d * 0.5 - 0.02, w, 0.05, 0.05, { color: [1.26, 1.18, 1.02] });
      // Boarded front, planked so the shadow lines break it up.
      for (let i = 0; i < 6; i++) {
        const y = 0.09 + i * 0.135;
        addBox(buf, 0, y, -d * 0.5 + 0.05, w * 0.98, 0.12, 0.05, {
          color: [1.02 + rng.range(-0.06, 0.06), 0.95, 0.82], grime: 0.34, grimeHeight: 0.7,
        });
      }
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          addBox(buf, sx * (w * 0.5 - 0.08), 0.43, sz * (d * 0.5 - 0.08), 0.09, 0.86, 0.09, {
            color: post, grime: 0.35,
          });
          addBox(buf, sx * (w * 0.5 - 0.08), 1.35, sz * (d * 0.5 - 0.08), 0.07, 1.9, 0.07, {
            color: post,
          });
        }
      }
      // A shelf under the counter, which is where the stock actually lives.
      addBox(buf, 0, 0.34, 0, w * 0.9, 0.05, d * 0.7, { color: [0.98, 0.91, 0.78], grime: 0.4 });
      /*
       * Eaves rails front and back, and a ridge pole a quarter of a metre above
       * them on two king posts.
       *
       * The ridge is the whole point. With the frame's top members all at one
       * height the canvas over them has nothing to pitch across, and a flat sheet
       * of taut cloth is indistinguishable from a plank lid — which is exactly how
       * every stall in the souk and on the market street read. A pitch gives the
       * awning two differently-lit planes and a hard ridge highlight, and it is
       * also simply how a market stall is built.
       */
      for (const sz of [-1, 1]) {
        addBox(buf, 0, 2.26, sz * (d * 0.5 - 0.08), w, 0.07, 0.07, { color: post });
      }
      addBox(buf, 0, 2.52, 0, w * 1.04, 0.07, 0.07, { color: [1.14, 1.06, 0.92] });
      for (const sx of [-1, 1]) {
        addBox(buf, sx * (w * 0.5 - 0.14), 2.39, 0, 0.06, 0.26, 0.06, { color: post });
      }
      // Knee braces at the head of two posts: stops the frame reading as a grid.
      for (const sx of [-1, 1]) {
        _v.set(sx * (w * 0.5 - 0.1), 1.82, -d * 0.5 + 0.08);
        addTube(buf, _v, new THREE.Vector3(sx * (w * 0.5 - 0.55), 2.24, -d * 0.5 + 0.08),
          0.032, 4, post);
      }
    },
    lod: (buf) => {
      addBox(buf, 0, 0.86, 0, 2.3, 0.1, 1.35, { color: [0.94, 0.88, 0.76] });
      addBox(buf, 0, 0.45, 0, 2.3, 0.85, 1.2, { color: [0.86, 0.8, 0.7] });
      addBox(buf, 0, 2.28, 0, 2.3, 0.1, 1.35, { color: [0.88, 0.82, 0.7] });
    },
  });

  add({
    id: 'stall_canopy',
    material: 'fabric_canvas',
    collide: false,
    lodDistance: 90,
    /*
     * A sheet slung over the stall's top rails, sagging between them, with a
     * scalloped valance hanging off the front and sides.
     *
     * `keepOrigin` is essential and was the bug here: the canopy hangs *below*
     * its top edge, so floor-snapping the geometry — which is right for a crate
     * and wrong for anything suspended — lifted the lowest point of the valance
     * to ground level and left every market stall in the map wearing its canopy
     * around its ankles. The origin is the stall's base, matching `stall_frame`,
     * and the cloth is authored at rail height.
     *
     * The cloth is a sheet with a real underside a few centimetres behind it,
     * not a box and not a coplanar pair — see `addCloth`, which exists because
     * the player is usually stood under one of these looking up.
     */
    keepOrigin: true,
    build: (buf, rng) => {
      const w = 2.66;
      // Souk awnings are woven in bands, so the cloth gets two alternating
      // tones across the span instead of one flat colour.
      const pick = rng.next();
      const tint: RGB = pick < 0.4
        ? [1.18, 0.74, 0.52]
        : pick < 0.7
          ? [0.74, 0.88, 1.1]
          : [1.12, 1.05, 0.86];
      const alt: RGB = [
        tint[0] * 0.78 + 0.3, tint[1] * 0.8 + 0.28, tint[2] * 0.82 + 0.24,
      ];
      /*
       * Pitched over the frame's ridge pole, taut to the eaves rails, then a
       * free droop past them.
       *
       * The profile is the whole prop. Two straight slopes read as a tent, one
       * flat sheet reads as a plank, and what a market awning actually does is
       * pull tight between ridge and eaves and then fall slack over the edge,
       * which puts a change of curvature exactly where the eye is looking for the
       * hem. The overhang also throws the shadow that grounds the counter under
       * it, which a flat lid at rail height cannot.
       */
      const RIDGE_Y = 2.545;
      const EAVE_Z = 0.595;
      const EAVE_Y = 2.30;
      const HEM_Z = 0.99;
      const HEM_Y = 1.97;
      const profile = (z: number): number => {
        const az = Math.abs(z);
        if (az <= EAVE_Z) {
          // Slightly convex: cloth over a ridge is stretched, not folded.
          const t = az / EAVE_Z;
          return RIDGE_Y - (RIDGE_Y - EAVE_Y) * Math.pow(t, 1.4);
        }
        const t = Math.min(1, (az - EAVE_Z) / (HEM_Z - EAVE_Z));
        return EAVE_Y - (EAVE_Y - HEM_Y) * Math.pow(t, 1.7);
      };
      const nx = 6;
      const nz = 6;
      const p = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
      const at = (u: number, v: number, out: THREE.Vector3): THREE.Vector3 => {
        const z = -HEM_Z + 2 * HEM_Z * v;
        // Sags between the corner posts, and more where the cloth is slack.
        const slack = Math.abs(z) > EAVE_Z ? 0.055 : 0.02;
        return out.set(-w * 0.5 + w * u, profile(z) - Math.sin(u * Math.PI) * slack, z);
      };
      const e0 = new THREE.Vector3();
      const e1 = new THREE.Vector3();
      const nrm = new THREE.Vector3();
      // The far face is aimed near the horizon on the side the panel slopes
      // toward; see `addCloth` for why it is not simply the reverse of the top.
      const under = new THREE.Vector3();
      for (let i = 0; i < nx; i++) {
        const band = i % 2 === 0 ? tint : alt;
        // Backlit: the underside of a stall awning at this hour is the brightest
        // thing in the souk, not a shaded version of the top.
        const underCol: RGB = [band[0] * 1.45, band[1] * 1.3, band[2] * 1.0];
        for (let j = 0; j < nz; j++) {
          const u0 = i / nx;
          const u1 = (i + 1) / nx;
          const v0 = j / nz;
          const v1 = (j + 1) / nz;
          at(u0, v0, p[0]);
          at(u1, v0, p[1]);
          at(u1, v1, p[2]);
          at(u0, v1, p[3]);
          e0.copy(p[1]).sub(p[0]);
          e1.copy(p[3]).sub(p[0]);
          nrm.copy(e0).cross(e1).normalize();
          if (nrm.y < 0) nrm.negate();
          const side = (v0 + v1) * 0.5 < 0.5 ? -1 : 1;
          under.set(0.32 * (i % 2 === 0 ? -1 : 1), -0.34, side * 0.88).normalize();
          const uvs = [u0 * w, v0 * 2 * HEM_Z, u1 * w, v0 * 2 * HEM_Z,
            u1 * w, v1 * 2 * HEM_Z, u0 * w, v1 * 2 * HEM_Z];
          addCloth(buf, p[0], p[1], p[2], p[3], uvs, band, underCol, nrm, under, 0.03);
        }
      }
      // Valance: scalloped, because a straight hem reads as sheet metal. Hung off
      // the drooping front and back hems, so it follows the sag of the cloth.
      const scallops = 7;
      for (const sz of [-1, 1]) {
        for (let i = 0; i < scallops; i++) {
          const t = (i + 0.5) / scallops;
          const cx = -w * 0.5 + w * t;
          const dip = 0.17 + Math.sin(t * Math.PI) * 0.1;
          const top = HEM_Y - Math.sin(t * Math.PI) * 0.055;
          addBox(buf, cx, top - dip * 0.5, sz * HEM_Z, (w / scallops) * 1.02, dip, 0.02, {
            color: i % 2 === 0 ? tint : alt,
          });
        }
      }
      // Side hems, following the pitch so no straight edge shows against the sky.
      for (const sx of [-1, 1]) {
        for (let i = 0; i < 6; i++) {
          const z = -HEM_Z + (2 * HEM_Z * (i + 0.5)) / 6;
          const top = profile(z);
          const dip = 0.1 + (Math.abs(z) > EAVE_Z ? 0.06 : 0.02);
          addBox(buf, sx * w * 0.5, top - dip * 0.5, z, 0.02, dip, (2 * HEM_Z) / 6 * 1.02,
            { color: tint });
        }
      }
    },
  });

  add({
    id: 'overturned_stall',
    material: 'wood_planks',
    baseTint: WOOD_GREY,
    lodDistance: 60,
    build: (buf, rng) => {
      addBox(buf, 0, 0.5, 0, 2.2, 0.08, 1.2, { rotY: 0.1, color: [0.92, 0.86, 0.74], grime: 0.3 });
      addBox(buf, 0.2, 0.24, 0.1, 1.6, 0.06, 0.9, { rotY: -0.3, color: [0.88, 0.82, 0.7] });
      for (let i = 0; i < 4; i++) {
        addBox(buf, rng.range(-1, 1), rng.range(0.05, 0.6), rng.range(-0.6, 0.6),
          rng.range(0.6, 1.5), 0.07, 0.11,
          { rotY: rng.range(0, Math.PI), color: [0.9, 0.84, 0.72], grime: 0.2 });
      }
    },
    lod: boxLod(2.2, 0.6, 1.4, [0.9, 0.85, 0.74]),
  });

  /* --- laundry and cloth ------------------------------------------------------ */

  /*
   * Washing on a line, in three cuts.
   *
   * Authored hanging from its own origin — the line — so placement is just the
   * line's height, and folded over the wire rather than pinned at one edge,
   * because a single flat plate under a wire reads as a signboard. That was the
   * previous failure here: a grid of coplanar boxes with a two-centimetre sway
   * still has a rectangular silhouette and a flat face, so a row of them read as
   * cardboard sheets pegged to a string.
   *
   * The shape that fixes it is the vertical fold. Cloth hanging under its own
   * weight gathers into ridges that deepen toward the hem, and those ridges are
   * what break both the silhouette and the shading. Three cuts exist because one
   * geometry instanced forty times down an alley is recognisably one garment
   * however it is tinted.
   */
  for (let v = 0; v < 3; v++) {
    add({
      id: `laundry_${v}`,
      material: 'fabric_canvas',
      collide: false,
      castShadow: true,
      lodDistance: 45,
      cullDistance: 120,
      keepOrigin: true,
      build: (buf, rng) => {
        // A sheet, a shirt and a long wrap: different aspect, different hem.
        const w = [0.92, 0.6, 0.72][v] * rng.range(0.86, 1.16);
        const h = [0.78, 0.72, 1.35][v] * rng.range(0.85, 1.18);
        const folds = [3, 2, 4][v];
        const amp = [0.055, 0.045, 0.075][v] * 1.5;
        /*
         * Whites and a few dyed pieces, and both have to fight the material.
         *
         * `fabric_canvas` is olive drab, and the ratio that matters is the one
         * after linearisation: (0.50, 0.49, 0.40) on the page is (0.21, 0.21,
         * 0.13) shaded, so blue sits nearly two fifths below red. Lifting the
         * three channels together — which is what the first two passes did —
         * leaves that intact, and every sheet on the line comes out khaki.
         * Against a bright sky, which is where washing nearly always is, khaki
         * rectangles read as hanging cardboard: that is exactly what the alley
         * shot looked like. Whites need blue up by half again to land neutral.
         * The dyed pieces come from a short palette rather than three independent
         * ranges, which only ever produced muddy variations on the drab.
         */
        const DYED: RGB[] = [
          [0.24, 0.4, 1.9],    // indigo
          [1.42, 0.44, 0.4],   // faded terracotta
          [1.66, 1.18, 0.4],   // mustard
          [0.44, 1.0, 1.55],   // washed teal
          [0.86, 0.6, 1.7],    // dusty violet
        ];
        const k = rng.range(0.92, 1.1);
        const tint: RGB = rng.next() < 0.4
          ? (([a, b, c]) => [a * k, b * k, c * k] as RGB)(DYED[rng.int(0, DYED.length - 1)])
          : [rng.range(1.8, 2.0) * k, rng.range(1.88, 2.1) * k, rng.range(2.9, 3.3) * k];
        const cols = 6;
        const rows = 4;
        const p = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
        /*
         * The two faces of the garment are authored as separate sheets four
         * centimetres apart, and each is mirrored in u so its winding — and
         * therefore its normal — points out of the cloth.
         *
         * The obvious cheat is to give hanging cloth an upward normal so it
         * catches the sky the way a foliage card does. It makes a sheet on a
         * line read as a slab of grey card, because the shading is that of
         * something lying flat on the ground.
         */
        /*
         * Silhouette, not shading, is what sells hanging cloth.
         *
         * These are almost always seen against the sky, so the eye gets the
         * outline and nothing else: fold shading and weave detail are invisible
         * on a backlit sheet. The first version had ridges only four centimetres
         * deep and a hem that wavered by four per cent of the drop, which left a
         * clean rectangle — and a clean rectangle hanging off a wire is a
         * signboard. Deeper ridges, a hem that scallops properly, a lean off the
         * vertical and one corner blown out give an edge that reads as fabric
         * from thirty metres.
         */
        const lean = rng.range(-0.16, 0.16);
        const hemWave = rng.range(0.1, 0.2);
        const blown = rng.range(-1, 1);
        const at = (face: number, u: number, v: number, out: THREE.Vector3): THREE.Vector3 => {
          const uu = face > 0 ? u : 1 - u;
          // Fold ridges across the width, deepening toward the hem; the cloth
          // also narrows very slightly as it gathers.
          const ridge = Math.sin(uu * Math.PI * folds) * amp * (0.25 + v * 0.75);
          const gather = 1 - v * 0.1;
          // One bottom corner lifted by the wind, so the hem is not a chord.
          const lift = Math.max(0, blown * (uu - 0.5) * 2) * v * v * 0.3;
          return out.set(
            (-0.5 + uu) * w * gather + lean * v * v * w,
            -h * v * (1 + Math.cos(uu * Math.PI * folds) * hemWave * v) + h * lift,
            face * (0.022 + v * 0.02) + ridge * face + blown * lift * 0.6,
          );
        };
        for (const face of [-1, 1]) {
          for (let i = 0; i < cols; i++) {
            for (let j = 0; j < rows; j++) {
              const u0 = i / cols;
              const u1 = (i + 1) / cols;
              const t0 = j / rows;
              const t1 = (j + 1) / rows;
              at(face, u0, t0, p[0]);
              at(face, u1, t0, p[1]);
              at(face, u1, t1, p[2]);
              at(face, u0, t1, p[3]);
              // Shaded by depth into the fold, so the ridges read even flat-lit.
              const shade = (1 - t0 * 0.1)
                * (0.9 + 0.12 * (0.5 + 0.5 * Math.cos(u0 * Math.PI * folds)));
              const uvs = [u0 * w, t0 * h, u1 * w, t0 * h, u1 * w, t1 * h, u0 * w, t1 * h];
              addQuad(buf, p[0], p[3], p[2], p[1],
                [uvs[0], uvs[1], uvs[6], uvs[7], uvs[4], uvs[5], uvs[2], uvs[3]],
                [tint[0] * shade, tint[1] * shade, tint[2] * shade]);
            }
          }
        }
        /*
         * Hem and selvedges close the gap between the two sheets so a grazing
         * view from under the line does not see into the inside of the garment.
         * The hem is segmented and follows the scallop — one straight box across
         * the bottom put the rectangular edge straight back on.
         */
        const edge: RGB = [tint[0] * 0.94, tint[1] * 0.93, tint[2] * 0.92];
        const seg = 5;
        for (let i = 0; i < seg; i++) {
          const uu = (i + 0.5) / seg;
          at(1, uu, 1, p[0]);
          addBox(buf, p[0].x, p[0].y + 0.02, p[0].z * 0.35, (w / seg) * 1.05, 0.05, 0.085,
            { color: edge });
        }
        for (const sx of [-1, 1]) {
          at(1, sx > 0 ? 0.99 : 0.01, 1, p[0]);
          addBox(buf, (p[0].x + sx * w * 0.5) * 0.5, (p[0].y - 0.02) * 0.5, 0,
            0.02, Math.abs(p[0].y) + 0.04, 0.07, { color: edge });
        }
        // The fold itself, sitting on the line, plus a peg.
        addBox(buf, 0, -0.02, 0, w * 1.0, 0.05, 0.07, {
          color: [tint[0] * 1.04, tint[1] * 1.04, tint[2] * 1.04],
        });
        addBox(buf, w * rng.range(-0.35, 0.35), 0.01, 0, 0.03, 0.08, 0.05, {
          color: [0.9, 0.8, 0.62],
        });
      },
    });
  }

  /* --- vehicles-adjacent clutter ------------------------------------------------ */

  add({
    id: 'cable_spool',
    material: 'wood_planks',
    baseTint: WOOD_GREY,
    lodDistance: 50,
    build: (buf) => {
      addCylinder(buf, 0, 0, 0, 0.72, 0.08, { segments: 12, color: [0.9, 0.84, 0.72] });
      addCylinder(buf, 0, 0.62, 0, 0.72, 0.08, { segments: 12, color: [0.9, 0.84, 0.72] });
      addCylinder(buf, 0, 0.08, 0, 0.3, 0.54, { segments: 10, color: [0.7, 0.64, 0.54], grime: 0.3 });
    },
    lod: (buf) => addCylinder(buf, 0, 0, 0, 0.72, 0.7, { segments: 8, color: [0.88, 0.82, 0.7] }),
  });

  add({
    id: 'wheelbarrow',
    uvScale: 2.4,
    material: 'metal_rusted',
    lodDistance: 40,
    build: (buf) => {
      addBox(buf, 0, 0.44, 0, 0.7, 0.28, 0.52, { rotY: 0, color: [1, 1, 1], grime: 0.3 });
      addBox(buf, 0, 0.3, 0, 0.6, 0.06, 0.46, { color: [0.86, 0.82, 0.78] });
      for (const sx of [-1, 1]) {
        addBox(buf, sx * 0.26, 0.28, 0.44, 0.05, 0.05, 0.9, { color: [0.82, 0.78, 0.72] });
      }
      addCylinder(buf, 0, 0.14, -0.42, 0.16, 0.09, { segments: 9, rotY: 0, color: [0.5, 0.5, 0.5] });
      for (const sx of [-1, 1]) {
        addBox(buf, sx * 0.24, 0.12, 0.44, 0.05, 0.24, 0.05, { color: [0.8, 0.76, 0.7] });
      }
    },
    lod: boxLod(0.7, 0.6, 1.2, [0.9, 0.86, 0.8]),
  });

  add({
    id: 'ammo_box',
    uvScale: 2.8,
    // Olive drab.
    baseTint: [1.1, 1.05, 0.52],
    material: 'metal_painted',
    lodDistance: 30,
    cullDistance: 80,
    build: (buf) => {
      addBox(buf, 0, 0.15, 0, 0.5, 0.3, 0.26, { color: [0.65, 0.7, 0.6], grime: 0.3 });
      addBox(buf, 0, 0.31, 0, 0.52, 0.04, 0.28, { color: [0.6, 0.65, 0.55] });
      addBox(buf, 0, 0.36, 0, 0.18, 0.06, 0.05, { color: [0.5, 0.54, 0.46] });
    },
  });

  /* --- interior furniture ---------------------------------------------------- */

  /*
   * Rooms need furniture with a recognisable silhouette, not just scattered
   * debris. A room dressed only in rubble reads as a building site; one bed and
   * one wardrobe say somebody lived here and left in a hurry, which is the whole
   * story these interiors are telling.
   */

  add({
    id: 'bed_frame',
    uvScale: 2.2,
    // Cream enamel, which is what a domestic bedstead is painted.
    baseTint: [1.95, 1.8, 1.66],
    material: 'metal_painted',
    lodDistance: 34,
    cullDistance: 70,
    build: (buf) => {
      const w = 0.98;
      const l = 1.94;
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          addBox(buf, sx * (w * 0.5 - 0.04), 0.15, sz * (l * 0.5 - 0.04), 0.05, 0.3, 0.05,
            { color: [0.72, 0.7, 0.68], grime: 0.4 });
        }
      }
      // Head and foot boards, the head taller: reads as a bed from any angle.
      for (const [sz, h] of [[-1, 0.82], [1, 0.48]] as const) {
        addBox(buf, 0, h - 0.03, sz * l * 0.5, w, 0.06, 0.05, { color: [0.78, 0.76, 0.72] });
        for (const sx of [-1, 1]) {
          addBox(buf, sx * (w * 0.5 - 0.04), h * 0.5 + 0.15, sz * l * 0.5, 0.05, h - 0.3, 0.05,
            { color: [0.75, 0.73, 0.7] });
        }
        for (let i = 0; i < 4; i++) {
          addBox(buf, -w * 0.5 + w * ((i + 0.5) / 4), h * 0.5 + 0.16, sz * l * 0.5, 0.03, h - 0.34, 0.03,
            { color: [0.7, 0.68, 0.65] });
        }
      }
      addBox(buf, 0, 0.3, 0, w, 0.05, l, { color: [0.68, 0.66, 0.64], grime: 0.3 });
    },
    lod: boxLod(1.0, 0.5, 2.0, [0.74, 0.72, 0.7]),
  });

  add({
    id: 'mattress',
    material: 'fabric_canvas',
    lodDistance: 30,
    cullDistance: 66,
    build: (buf, rng) => {
      const w = 0.92;
      const l = 1.86;
      const stain = rng.range(0.82, 1.0);
      // Sagging in the middle, so it does not read as a foam block.
      for (let i = 0; i < 4; i++) {
        const t = (i + 0.5) / 4;
        const dip = Math.sin(t * Math.PI) * 0.035;
        addBox(buf, 0, 0.09 - dip, -l * 0.5 + l * t, w, 0.18 - dip, l / 4 + 0.01, {
          color: [1.12 * stain, 1.05 * stain, 0.94 * stain], grime: 0.4, grimeHeight: 0.9,
        });
      }
      // Buttoned seams down the length.
      for (const sx of [-0.5, 0.5]) {
        addBox(buf, sx * w * 0.5, 0.1, 0, 0.05, 0.14, l * 0.98,
          { color: [1.0 * stain, 0.94 * stain, 0.85 * stain] });
      }
    },
    lod: boxLod(0.92, 0.2, 1.86, [1.06, 1.0, 0.9]),
  });

  add({
    id: 'wardrobe',
    material: 'wood_planks',
    baseTint: WOOD_WARM,
    lodDistance: 40,
    cullDistance: 80,
    build: (buf, rng) => {
      const w = 1.06;
      const d = 0.54;
      const h = 1.86;
      const body: RGB = [0.86, 0.72, 0.56];
      addBox(buf, 0, h * 0.5, -d * 0.5 + 0.03, w, h, 0.06, { color: body, grime: 0.3 });
      for (const sx of [-1, 1]) {
        addBox(buf, sx * (w * 0.5 - 0.03), h * 0.5, 0, 0.06, h, d, { color: body, grime: 0.3 });
      }
      addBox(buf, 0, h - 0.03, 0, w, 0.06, d, { color: [0.9, 0.76, 0.6] });
      addBox(buf, 0, 0.05, 0, w, 0.1, d, { color: [0.78, 0.65, 0.5], grime: 0.5 });
      // A cornice, and one door swung open on its hinge.
      addBox(buf, 0, h + 0.05, 0, w + 0.08, 0.08, d + 0.06, { color: [0.92, 0.78, 0.62] });
      addBox(buf, -w * 0.25, h * 0.5, d * 0.5 - 0.02, w * 0.48, h - 0.18, 0.04,
        { color: [0.88, 0.74, 0.58], grime: 0.25 });
      // The other door swung out on its hinge, which sits at the right stile.
      const swing = rng.range(0.5, 1.15);
      const leaf = w * 0.48;
      const hingeX = w * 0.5 - 0.03;
      const hingeZ = d * 0.5 - 0.02;
      addBox(buf,
        hingeX - leaf * 0.5 * Math.cos(swing), h * 0.5, hingeZ + leaf * 0.5 * Math.sin(swing),
        leaf, h - 0.18, 0.04,
        { rotY: swing, color: [0.85, 0.71, 0.55], grime: 0.25 });
      // Dark interior behind it: the hole is what sells the volume.
      addBox(buf, w * 0.22, h * 0.5, -d * 0.5 + 0.09, w * 0.44, h - 0.24, 0.03,
        { color: [0.3, 0.26, 0.22] });
    },
    lod: boxLod(1.1, 1.94, 0.56, [0.88, 0.74, 0.58]),
  });

  add({
    id: 'shelf_unit',
    material: 'wood_planks',
    baseTint: WOOD_WARM,
    lodDistance: 36,
    cullDistance: 74,
    build: (buf, rng) => {
      const w = 1.2;
      const d = 0.36;
      const h = 1.7;
      const body: RGB = [0.94, 0.84, 0.68];
      for (const sx of [-1, 1]) {
        addBox(buf, sx * (w * 0.5 - 0.03), h * 0.5, 0, 0.06, h, d, { color: body, grime: 0.35 });
      }
      addBox(buf, 0, h * 0.5, -d * 0.5 + 0.02, w, h, 0.04, { color: [0.8, 0.71, 0.58], grime: 0.4 });
      for (let i = 0; i < 5; i++) {
        const y = 0.12 + (i * (h - 0.2)) / 4;
        addBox(buf, 0, y, 0, w - 0.1, 0.04, d, { color: body, grime: 0.3 });
        // Sparse stock, so the shelves are not either empty or uniformly full.
        const items = rng.int(0, 4);
        for (let k = 0; k < items; k++) {
          const bw = rng.range(0.08, 0.2);
          addBox(buf, rng.range(-w * 0.4, w * 0.4), y + 0.02 + rng.range(0.06, 0.14),
            rng.range(-d * 0.2, d * 0.2), bw, rng.range(0.12, 0.28), rng.range(0.08, 0.2), {
            rotY: rng.range(0, 1.5),
            color: [rng.range(0.6, 1.15), rng.range(0.6, 1.1), rng.range(0.55, 1.0)],
          });
        }
      }
    },
    lod: boxLod(1.2, 1.7, 0.36, [0.9, 0.81, 0.66]),
  });

  add({
    id: 'stove',
    material: 'metal_brushed',
    lodDistance: 30,
    cullDistance: 64,
    build: (buf) => {
      addBox(buf, 0, 0.42, 0, 0.6, 0.84, 0.56, { color: [0.86, 0.85, 0.83], grime: 0.45 });
      addBox(buf, 0, 0.86, 0, 0.64, 0.04, 0.6, { color: [0.7, 0.7, 0.69], grime: 0.3 });
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          addCylinder(buf, sx * 0.15, 0.88, sz * 0.14, 0.09, 0.02, { segments: 8, color: [0.42, 0.4, 0.39] });
        }
      }
      // Oven door, handle, and a scorched patch above it.
      addBox(buf, 0, 0.36, 0.29, 0.5, 0.56, 0.03, { color: [0.5, 0.49, 0.48] });
      addBox(buf, 0, 0.68, 0.32, 0.52, 0.04, 0.04, { color: [0.78, 0.78, 0.77] });
      addBox(buf, 0, 0.9, -0.26, 0.56, 0.28, 0.03, { color: [0.44, 0.42, 0.4], grime: 0.6 });
    },
    lod: boxLod(0.62, 0.9, 0.58, [0.82, 0.81, 0.79]),
  });

  add({
    id: 'tv_old',
    material: 'plastic',
    lodDistance: 26,
    cullDistance: 56,
    build: (buf) => {
      addBox(buf, 0, 0.24, 0, 0.52, 0.44, 0.46, { color: [0.66, 0.62, 0.56], grime: 0.4 });
      addBox(buf, 0, 0.26, 0.235, 0.4, 0.32, 0.03, { color: [0.22, 0.23, 0.25] });
      addBox(buf, 0, 0.03, 0, 0.36, 0.06, 0.34, { color: [0.5, 0.47, 0.43] });
      _v.set(0.16, 0.46, -0.1);
      addTube(buf, _v, new THREE.Vector3(0.34, 0.86, -0.24), 0.012, 4, [0.7, 0.69, 0.68]);
    },
    lod: boxLod(0.52, 0.5, 0.46, [0.64, 0.6, 0.55]),
  });

  return list;
}

/**
 * Procedural glyph run. Not any real script — a rhythm of strokes, bowls and
 * dots with the proportions and baseline behaviour of naskh, which is what the
 * eye actually reads at a distance on a shop sign.
 */
function glyphRun(
  buf: GeoBuf,
  x: number, y: number, z: number,
  width: number, height: number,
  rng: Rng,
  color: RGB,
): void {
  let cursor = x + width;
  const stroke = height * 0.16;
  /*
   * One face per stroke.
   *
   * Lettering is paint on a flat surface: the strokes are 4 mm boxes lying on a
   * poster or a sign board, and five of their six faces are either against the
   * board or edge-on at a scale nothing resolves. Emitting them as full boxes
   * cost twelve triangles per stroke and put the sign family — posters, shop
   * signs, road signs, every stencil in the level — at better than twenty
   * thousand triangles of invisible cardboard edge.
   */
  const F = FX_PZ;
  // Baseline: nearly every glyph in the family hangs off one continuous rule.
  addBox(buf, x + width * 0.5, y - height * 0.32, z, width, stroke, 0.004, { color, faces: F });
  while (cursor > x + height * 0.35) {
    const w = rng.range(height * 0.32, height * 0.9);
    const cx = cursor - w * 0.5;
    const form = rng.int(0, 3);
    if (form === 0) {
      addBox(buf, cx, y - height * 0.02, z, w * 0.8, stroke, 0.004, { color, faces: F });
      addBox(buf, cx + w * 0.32, y + height * 0.22, z, stroke, height * 0.5, 0.004, { color, faces: F });
    } else if (form === 1) {
      addBox(buf, cx, y - height * 0.14, z, w, stroke, 0.004, { color, faces: F });
      addBox(buf, cx - w * 0.4, y - height * 0.02, z, stroke, height * 0.26, 0.004, { color, faces: F });
      addBox(buf, cx + w * 0.4, y - height * 0.02, z, stroke, height * 0.26, 0.004, { color, faces: F });
    } else if (form === 2) {
      addBox(buf, cx, y - height * 0.5, z, w * 0.9, stroke, 0.004, { color, faces: F });
      addBox(buf, cx, y - height * 0.32, z, stroke, height * 0.34, 0.004, { color, faces: F });
    } else {
      addBox(buf, cx, y + height * 0.06, z, stroke, height * 0.62, 0.004, { color, faces: F });
    }
    if (rng.bool(0.4)) {
      addBox(buf, cx, y + height * (rng.bool() ? 0.5 : -0.62), z, stroke * 1.2, stroke * 1.2, 0.004,
        { color, faces: F });
    }
    cursor -= w + height * 0.16;
  }
}

/* --------------------------- scatter utilities ---------------------------- */

export interface ScatterOptions {
  count: number;
  /** Chance any individual placement is skipped, for uneven density. */
  skip?: number;
  yawJitter?: number;
  scaleRange?: readonly [number, number];
  tintRange?: number;
  /** Sink into the ground so nothing floats on an undulating surface. */
  sink?: number;
  tiltJitter?: number;
}

const _color = new THREE.Color();

/** Places instances inside a rectangle, avoiding a caller-supplied blocker. */
export function scatter(
  batch: Batcher,
  id: string,
  rng: Rng,
  bounds: { x0: number; z0: number; x1: number; z1: number },
  groundY: (x: number, z: number) => number,
  opts: ScatterOptions,
  blocked?: (x: number, z: number) => boolean,
): number {
  let placed = 0;
  for (let i = 0; i < opts.count; i++) {
    if (opts.skip && rng.next() < opts.skip) continue;
    const x = rng.range(bounds.x0, bounds.x1);
    const z = rng.range(bounds.z0, bounds.z1);
    if (blocked && blocked(x, z)) continue;
    const s = opts.scaleRange ? rng.range(opts.scaleRange[0], opts.scaleRange[1]) : 1;
    tint(rng, opts.tintRange ?? 0.1);
    batch.placeAt(
      id, x, groundY(x, z) - (opts.sink ?? 0.012), z,
      rng.range(0, Math.PI * 2), s, _color,
      opts.tiltJitter ? rng.range(-opts.tiltJitter, opts.tiltJitter) : 0,
      opts.tiltJitter ? rng.range(-opts.tiltJitter, opts.tiltJitter) : 0,
    );
    placed++;
  }
  return placed;
}

/** Per-instance tint. Small hue and value drift kills the copy-paste read. */
export function tint(rng: Rng, amount = 0.1, warm = 0): THREE.Color {
  const v = 1 + rng.range(-amount, amount);
  return _color.setRGB(
    v * (1 + warm * 0.06),
    v * (1 + rng.range(-amount, amount) * 0.4),
    v * (1 - warm * 0.05 + rng.range(-amount, amount) * 0.5),
  );
}

export { addBox, addWedge, FX_ALL, FX_NY };
