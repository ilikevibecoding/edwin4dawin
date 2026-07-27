import * as THREE from 'three';
import { Rng } from '../core/MathUtils';
import type { Batcher } from './Batcher';
import {
  FX_ALL, FX_NY, addBox, addCylinder, addGroundPatch, addTube, addWedge, type RGB,
} from './Geo';
import { cellFor } from './Layout';

/**
 * Wrecks.
 *
 * Three vehicles carry most of the hard cover on the centre lane, and each is
 * modelled once as merged static geometry rather than as an instanced prop:
 * they are unique, they are large enough that the player will study them, and
 * merging means they cost no draw calls at all beyond the material buckets
 * their district already owns.
 *
 * All three are burnt out, which is convenient as well as thematic — a scorched
 * shell has no glass, no paint gradients and no interior trim to model, so the
 * triangle budget goes into the silhouette: buckled panels, a sagging axle, a
 * roof peeled back, wheels that are flat or missing.
 */

const _a = new THREE.Vector3();
const _b = new THREE.Vector3();

/*
 * Burnt bodywork, and it must not be black.
 *
 * These tints started at a third of unity on an already dark rusted-steel albedo,
 * which multiplies out to very nearly zero — so a burnt-out shell standing in full
 * golden-hour sun rendered as a featureless silhouette. In the villa courtyard the
 * car sat in the near foreground and put a black hole across the bottom corner of
 * the frame; nothing about it read as a vehicle. Real fire-damaged panelwork in
 * bright light is a dark grey-brown that still shows its panel lines, its rust
 * blooms and the direction of the light, and the only way to get there through a
 * multiplier is to stay well above unity and let the material carry the value down.
 */
/*
 * They must not be orange either, and getting there needs bigger numbers than it
 * looks like it should.
 *
 * Library albedos are written in sRGB and converted to linear before they reach
 * the vertex colour, and that conversion roughly squares the channel ratios.
 * `metal_rusted` is iron oxide at about (0.40, 0.26, 0.17) sRGB, which is a red
 * to blue ratio of 2.4 on paper and 5.5 once linearised — so a tint that looks
 * like a firm correction on the page barely moves the hue, and three rounds of
 * "desaturating" the burnt shells left them glowing orange. Charred steel is
 * near neutral, so blue has to come up by a factor of several while red is held
 * down to keep the value where char belongs.
 */
const CHAR: RGB = [0.78, 1.72, 3.7];
const CHAR_DEEP: RGB = [0.5, 1.1, 2.4];
const RUST: RGB = [1.2, 1.5, 1.95];

/** Rotates a local offset into world space around Y. */
function place(
  cx: number, cz: number, cs: number, sn: number,
  lx: number, lz: number,
  out: THREE.Vector3, y: number,
): THREE.Vector3 {
  return out.set(cx + lx * cs + lz * sn, y, cz - lx * sn + lz * cs);
}

interface WheelOpts {
  radius: number;
  width: number;
  /** 0 inflated, 1 completely flat. */
  flat?: number;
  color?: RGB;
}

/** A tyre lying in the vehicle's local frame, axle along local X. */
function wheel(
  batch: Batcher, cell: string,
  cx: number, cz: number, cs: number, sn: number,
  lx: number, y: number, lz: number,
  o: WheelOpts,
): void {
  const tyre = batch.solid('rubber', cell);
  const rim = batch.solid('metal_rusted', cell);
  const yaw = Math.atan2(sn, cs);
  const flat = o.flat ?? 0;
  const r = o.radius;
  const half = o.width * 0.5;
  place(cx, cz, cs, sn, lx - half, lz, _a, y);
  place(cx, cz, cs, sn, lx + half, lz, _b, y);

  // The tyre is a faceted ring rather than a cylinder so a flat can squash the
  // lower facets without collapsing the whole wheel.
  const segs = 10;
  for (let i = 0; i < segs; i++) {
    const a0 = (i / segs) * Math.PI * 2;
    const a1 = ((i + 1) / segs) * Math.PI * 2;
    const am = (a0 + a1) * 0.5;
    const sag = flat * Math.max(0, -Math.sin(am)) * r * 0.72;
    const rr = r - sag;
    const my = y + Math.sin(am) * rr;
    const mz = lz + Math.cos(am) * rr;
    place(cx, cz, cs, sn, lx, mz, _a, my);
    /*
     * Dusty grey, not charred black. The rubber material is a near-black tyre
     * compound and the wreck tints were pushing it darker still, so a wheel under
     * a shaded arch was an unreadable blob — the bus appeared to be standing on
     * nothing, which is the worst thing that can happen to a vehicle's grounding.
     * A tyre that has stood in a dusty street is a mid grey with the sidewall
     * lighter than the tread.
     */
    addBox(tyre, _a.x, _a.y, _a.z, o.width, r * 0.66, r * 0.42, {
      rotY: yaw,
      color: [2.1, 2.05, 1.95],
    });
  }

  // Hub, visible through the burnt-out arch, and a paler sidewall ring so the
  // wheel reads as a wheel rather than a dark lump.
  place(cx, cz, cs, sn, lx - half, lz, _a, y);
  place(cx, cz, cs, sn, lx - half * 0.55, lz, _b, y);
  addTube(tyre, _a, _b, r * 0.86, 10, [2.5, 2.45, 2.35]);
  place(cx, cz, cs, sn, lx - half * 0.4, lz, _a, y + r * 0.12 * flat);
  place(cx, cz, cs, sn, lx + half * 0.4, lz, _b, y + r * 0.12 * flat);
  addTube(rim, _a, _b, r * 0.44, 8, [0.9, 0.84, 0.76]);
}

/* ------------------------------- technical -------------------------------- */

/**
 * A burnt-out pickup with a weapon mount in the bed. Sits at a slight angle
 * across the carriageway so it breaks the sightline without sealing it, and so
 * its silhouette reads as three-quarter from both ends of the street.
 */
export function buildTechnical(
  batch: Batcher,
  x: number, z: number, yaw: number,
  ground: (x: number, z: number) => number,
  rng: Rng,
): void {
  const cell = cellFor(x, z);
  const cs = Math.cos(yaw);
  const sn = Math.sin(yaw);
  const y = ground(x, z);
  const body = batch.solid('metal_rusted', cell);
  const paint = batch.solid('metal_painted', cell);
  const steel = batch.solid('steel_plate', cell);
  const rot = yaw;

  // The near-side front tyre is gone, so the chassis is down on its rim.
  const lean = -0.055;
  const chassisY = y + 0.52;
  const put = (
    target: ReturnType<Batcher['solid']>,
    lx: number, ly: number, lz: number,
    sx: number, sy: number, sz: number,
    color: RGB, faces = FX_ALL, grime = 0,
  ): void => {
    place(x, z, cs, sn, lx, lz, _a, chassisY + ly + lx * lean);
    addBox(target, _a.x, _a.y, _a.z, sx, sy, sz, { rotY: rot, color, faces, grime, grimeHeight: 0.4 });
  };

  // Ladder chassis, seen under the burnt body.
  for (const s of [-1, 1]) {
    put(steel, s * 0.62, -0.34, 0, 0.13, 0.16, 4.9, CHAR_DEEP);
  }
  put(steel, 0, -0.34, -1.55, 1.5, 0.12, 0.14, CHAR_DEEP);
  put(steel, 0, -0.34, 1.5, 1.5, 0.12, 0.14, CHAR_DEEP);

  // Bed: floor, sides, tailgate hanging open.
  put(body, 0, -0.16, 1.32, 1.86, 0.14, 2.3, CHAR, FX_ALL, 0.3);
  for (const s of [-1, 1]) {
    put(body, s * 0.9, 0.19, 1.32, 0.09, 0.58, 2.3, CHAR);
    // Ribs pressed into the bed side; the detail that stops it reading as a box.
    for (let i = 0; i < 4; i++) {
      put(body, s * 0.96, 0.19, 0.35 + i * 0.6, 0.04, 0.5, 0.07, [CHAR[0] * 1.2, CHAR[1] * 1.15, CHAR[2] * 1.1]);
    }
  }
  put(body, 0, 0.05, 2.45, 1.86, 0.09, 0.55, RUST);

  // Cab: sills, A and B pillars, a roof buckled where the fire took it.
  put(body, 0, -0.1, -0.75, 1.9, 0.3, 1.9, CHAR, FX_ALL, 0.35);
  for (const s of [-1, 1]) {
    put(body, s * 0.93, 0.34, -0.75, 0.1, 0.62, 1.9, CHAR);
    put(body, s * 0.9, 0.86, -1.52, 0.11, 0.62, 0.14, CHAR_DEEP);
    put(body, s * 0.9, 0.86, 0.08, 0.11, 0.62, 0.13, CHAR_DEEP);
  }
  put(body, 0, 1.17, -0.72, 1.9, 0.09, 1.72, [CHAR[0] * 0.9, CHAR[1] * 0.88, CHAR[2] * 0.86]);
  put(body, 0, 1.2, -1.5, 1.7, 0.06, 0.3, CHAR_DEEP);
  // Rear cab panel, intact enough to stop a bullet.
  put(body, 0, 0.55, 0.14, 1.86, 1.0, 0.11, CHAR);

  // Bonnet and wings, dropped toward the missing wheel.
  put(body, 0, 0.4, -2.05, 1.86, 0.12, 1.0, [CHAR[0] * 1.05, CHAR[1] * 1.0, CHAR[2] * 0.96]);
  for (const s of [-1, 1]) {
    put(body, s * 0.9, 0.16, -2.05, 0.1, 0.6, 1.0, CHAR);
  }
  // Grille and bumper, one end torn away.
  put(steel, -0.15, 0.06, -2.58, 1.55, 0.44, 0.14, CHAR_DEEP);
  put(steel, -0.3, -0.24, -2.62, 1.3, 0.16, 0.16, RUST);
  // Wheel arches.
  for (const s of [-1, 1]) {
    for (const f of [-1.75, 1.35]) {
      put(body, s * 0.94, 0.02, f, 0.1, 0.5, 1.15, [CHAR[0] * 1.1, CHAR[1] * 1.05, CHAR[2] * 1.0]);
    }
  }

  // Weapon mount: a pintle welded to a plate, and the gun long since removed.
  place(x, z, cs, sn, 0.1, 1.35, _a, chassisY - 0.09);
  addCylinder(paint, _a.x, _a.y, _a.z, 0.28, 0.1, { segments: 10, color: [0.5, 0.48, 0.45] });
  addCylinder(paint, _a.x, _a.y + 0.1, _a.z, 0.075, 0.92, { segments: 8, color: [0.46, 0.45, 0.43] });
  place(x, z, cs, sn, 0.1, 1.35, _a, chassisY + 0.95);
  place(x, z, cs, sn, 0.72, 1.05, _b, chassisY + 1.02);
  addTube(paint, _a, _b, 0.05, 6, [0.44, 0.43, 0.41]);

  // Improvised armour: sandbags wedged along the bed rail.
  const bags = batch.solid('sandbag', cell);
  for (let i = 0; i < 5; i++) {
    const lz = 0.4 + i * 0.44;
    place(x, z, cs, sn, -0.86, lz, _a, chassisY + 0.55 + rng.range(-0.03, 0.03));
    addBox(bags, _a.x, _a.y, _a.z, 0.3, 0.19, 0.44, {
      rotY: rot + rng.range(-0.12, 0.12), color: [0.92, 0.88, 0.8],
    });
  }

  // Wheels: three left, the near front one burnt off its rim.
  wheel(batch, cell, x, z, cs, sn, -0.9, y + 0.42, -1.75, { radius: 0.42, width: 0.28, flat: 0.15 });
  wheel(batch, cell, x, z, cs, sn, 0.9, y + 0.42, -1.75, { radius: 0.42, width: 0.28, flat: 0 });
  wheel(batch, cell, x, z, cs, sn, 0.9, y + 0.4, 1.35, { radius: 0.42, width: 0.3, flat: 0.55 });
  place(x, z, cs, sn, -0.86, 1.35, _a, y + 0.24);
  place(x, z, cs, sn, -0.62, 1.35, _b, y + 0.24);
  addTube(steel, _a, _b, 0.23, 8, [0.5, 0.46, 0.42]);

  // Scorch fan on the ground under the engine bay. Terrain-following polygons
  // rather than flat plates: the road is cambered and rutted, and a rectangle
  // laid across it either floats at one end or sinks at the other.
  const scorch = batch.solid('asphalt', cell);
  for (let i = 0; i < 7; i++) {
    const a = rng.range(0, Math.PI * 2);
    const d = rng.range(0.6, 3.1);
    const px = x + Math.cos(a) * d;
    const pz = z + Math.sin(a) * d;
    const r = rng.range(0.5, 1.3);
    addGroundPatch(scorch, px, pz,
      Array.from({ length: 9 }, () => r * rng.range(0.7, 1.25)),
      rng.range(0, Math.PI), rng.range(0.8, 1.3), ground, 0.012,
      [0.38, 0.36, 0.35]);
  }
}

/* ---------------------------------- bus ----------------------------------- */

/**
 * A city bus dropped across the southern half of the market street. It is the
 * biggest single occluder on the map and does three jobs: it caps the long
 * sightline, it gives the south spawn a covered approach, and its window band
 * is a shootable gallery a defender can work along.
 */
export function buildBus(
  batch: Batcher,
  x: number, z: number, yaw: number,
  ground: (x: number, z: number) => number,
  rng: Rng,
): void {
  const cell = cellFor(x, z);
  const cs = Math.cos(yaw);
  const sn = Math.sin(yaw);
  const y = ground(x, z);
  const body = batch.solid('metal_painted', cell);
  const burnt = batch.solid('metal_rusted', cell);
  const steel = batch.solid('steel_plate', cell);
  const rot = yaw;
  // Nose down and listing, because the front axle is gone.
  const pitch = 0.035;
  const roll = 0.03;
  const floorY = y + 0.86;

  /*
   * Every panel samples its material at nearly twice the authored rate.
   *
   * `metal_painted` tiles at 1.6 m, and the largest feature in it is the rust
   * front — patches most of a metre across. On a ten-metre bus that is a dozen
   * metre-wide blooms scattered over the sides, which at this saturation read as
   * spilled paint rather than corrosion. At a third of the tile they become
   * fist-sized freckles, which is both what rust on a panel actually looks like
   * and what keeps the largest object on the map from shouting.
   */
  const put = (
    target: ReturnType<Batcher['solid']>,
    lx: number, ly: number, lz: number,
    sx: number, sy: number, sz: number,
    color: RGB, faces = FX_ALL, grime = 0,
  ): void => {
    place(x, z, cs, sn, lx, lz, _a, floorY + ly + lz * pitch + lx * roll);
    addBox(target, _a.x, _a.y, _a.z, sx, sy, sz, {
      rotY: rot, color, faces, grime, grimeHeight: 0.7, uvScale: 2.9,
    });
  };

  const L = 10.6;
  const W = 2.5;
  const half = L * 0.5;
  /*
   * Faded municipal blue with a lighter waistband, and the tint leans hard away
   * from red on purpose.
   *
   * Vertex colour multiplies the albedo, so it cannot recolour the enamel without
   * also recolouring the rust blooming through it — and in linear terms that rust
   * is (0.19, 0.07, 0.03), a six to one red-to-blue ratio. Every attempt to bleach
   * the enamel toward cream multiplied that ratio further and the bus came back
   * looking splashed with orange paint, twice. Holding red down and lifting blue
   * inverts the problem: the enamel lands on the faded blue that every bus on this
   * coast is painted, and the same multiplier drags iron oxide to a warm brown-grey
   * that is darker than the panel around it, which is the only condition under
   * which a rust patch reads as rust. It also gives the street its one cool accent
   * against forty metres of ochre.
   */
  const paint: RGB = [0.95, 1.62, 2.4];
  const paintDirty: RGB = [0.72, 1.2, 1.78];
  const band: RGB = [1.5, 2.5, 3.5];

  /*
   * Underframe, skirt and floor pan, all narrower than the body above them.
   *
   * The tuck-under is not styling, it is what makes the wheels visible. Built
   * flush to the full body width the skirt swallowed the entire wheel track — the
   * tyres were inboard of it by five centimetres — so the bus stood on nothing at
   * all and read as a shipping container hovering half a metre off the road, which
   * is the single most damaging thing that can happen to the largest object on the
   * map. The skirt now stops well inboard and the tyres stand clear of it.
   */
  put(steel, 0, -0.34, 0, W - 0.62, 0.2, L - 0.5, CHAR_DEEP);
  put(body, 0, -0.1, 0, W - 0.46, 0.4, L - 0.3, paintDirty, FX_ALL, 0.5);
  // Floor pan.
  put(steel, 0, 0.14, 0, W - 0.16, 0.12, L - 0.3, [0.44, 0.42, 0.4]);

  /*
   * The side, built as a real bus side is: a lower panel, a waist rail, pillars
   * standing proud of both, and the glazing set back behind them.
   *
   * The first pass had all three at within a centimetre of the same offset, and a
   * flat plane with pillars drawn on it in a darker tint is a textured box — which
   * is what it read as from thirty metres down the street. Ten centimetres of real
   * setback is what puts a shadow down the inside edge of every pillar at this
   * sun angle, and that shadow is the entire difference.
   */
  const pillars = 9;
  const skinX = W * 0.5 - 0.06;
  const pillarX = W * 0.5 - 0.015;
  const glassX = W * 0.5 - 0.17;
  for (const s of [-1, 1]) {
    put(body, s * skinX, 0.5, 0, 0.11, 0.82, L, paint, FX_ALL, 0.25);
    // Waistband, proud of the panel: the livery stripe and a drip edge in one.
    put(body, s * (W * 0.5 - 0.01), 1.0, 0, 0.13, 0.24, L, band, FX_ALL, 0.15);
    // Ribs on the lower panel, between the pillars, catching a vertical highlight.
    for (let i = 0; i < pillars; i++) {
      const lz = -half + 0.62 + ((i + 0.5) * (L - 1.1)) / pillars;
      put(body, s * (W * 0.5 - 0.035), 0.5, lz, 0.06, 0.74, 0.07,
        [paint[0] * 0.94, paint[1] * 0.94, paint[2] * 0.93]);
    }
    for (let i = 0; i <= pillars; i++) {
      const lz = -half + 0.55 + (i * (L - 1.1)) / pillars;
      put(body, s * pillarX, 1.62, lz, 0.13, 1.0, 0.15,
        [paint[0] * 0.9, paint[1] * 0.9, paint[2] * 0.88]);
    }
    // Cant rail above the glass and the roof gutter.
    put(body, s * pillarX, 2.2, 0, 0.14, 0.22, L, paint);
    put(burnt, s * (W * 0.5 + 0.05), 2.34, 0, 0.1, 0.1, L - 0.2, RUST);
    /*
     * The pan behind the glazing, and it has to be genuinely dark.
     *
     * This is what turns the side of a bus from a slab into a structure. At sixty
     * per cent of the body tint the window band came out at very nearly the value
     * of the panel below it, so ten bays of smashed glazing read as more bodywork
     * and the pillars standing proud in front of them had nothing to be proud of.
     * A gutted bus interior in full sun is close to black, and a row of black
     * voids with lit pillars between them is legible from the far end of the
     * street.
     */
    put(body, s * glassX, 1.62, 0, 0.05, 1.0, L - 1.1,
      [0.12, 0.12, 0.12], FX_ALL, 0.6);
    // Glazing, mostly gone. What remains is a jagged upper margin.
    for (let i = 0; i < pillars; i++) {
      const lz = -half + 0.62 + ((i + 0.5) * (L - 1.1)) / pillars;
      const intact = rng.next() < 0.34;
      const gmat = intact ? 'glass' : 'glass_broken';
      const h = intact ? 1.0 : rng.range(0.16, 0.4);
      const gy = intact ? 1.62 : 2.09 - h * 0.5;
      place(x, z, cs, sn, s * (glassX + 0.03), lz, _a, floorY + gy + lz * pitch);
      addBox(batch.solid(gmat, cell), _a.x, _a.y, _a.z, 0.04, h, (L - 1.1) / pillars - 0.16, {
        rotY: rot, color: [1, 1, 1],
      });
    }
    // Wheel arches: a raised lip over each axle, following the tyre. Without them
    // the skirt is an unbroken ten-metre line and the wheels look bolted on.
    for (const lz of [half - 2.2, -half + 2.1]) {
      for (const t of [-1, -0.6, -0.2, 0.2, 0.6, 1]) {
        const dy = 0.26 - t * t * 0.3;
        put(body, s * (W * 0.5 - 0.02), dy, lz + t * 0.66, 0.11, 0.13, 0.3,
          [paintDirty[0] * 0.92, paintDirty[1] * 0.92, paintDirty[2] * 0.9], FX_ALL, 0.5);
      }
    }
  }

  // Roof, peeled open over the rear third where the fire vented.
  put(body, 0, 2.38, -half * 0.35, W - 0.06, 0.14, L * 0.62, paint);
  put(burnt, 0, 2.3, half * 0.36, W - 0.4, 0.1, L * 0.2, CHAR);
  for (const s of [-1, 1]) {
    place(x, z, cs, sn, s * (W * 0.5 - 0.3), half * 0.34, _a, floorY + 2.36);
    addWedge(burnt, _a.x, _a.y, _a.z, 0.5, 0.42, L * 0.24, {
      rotY: rot + (s > 0 ? 0 : Math.PI), color: CHAR,
    });
  }
  // Roof hatch, propped open. A tiny thing that sells the silhouette.
  put(burnt, -0.3, 2.6, -half * 0.5, 0.7, 0.06, 0.7, [0.66, 0.62, 0.58]);

  /*
   * Front, assembled rather than capped with one slab: a dash bulkhead, screen
   * pillars either side of a blown-out windscreen, a destination box over it and
   * a bumper hanging off the bottom. The bus is parked across the street, so this
   * end is the silhouette a whole lane looks at.
   */
  put(body, 0, 0.62, -half - 0.02, W - 0.1, 1.05, 0.16, paint, FX_ALL, 0.3);
  for (const s of [-1, 1]) {
    put(body, s * (W * 0.5 - 0.14), 1.62, -half - 0.03, 0.26, 1.0, 0.17, paint, FX_ALL, 0.15);
  }
  // Screen header and the shattered glass still in its rubber.
  put(body, 0, 2.12, -half - 0.03, W - 0.1, 0.22, 0.18, band);
  place(x, z, cs, sn, 0, -half + 0.04, _a, floorY + 1.86);
  addBox(batch.solid('glass_broken', cell), _a.x, _a.y, _a.z, W - 0.6, 0.44, 0.05,
    { rotY: rot, color: [1, 1, 1] });
  // Destination box, its glass gone and its blind hanging out.
  put(burnt, 0, 2.36, -half + 0.02, W - 0.72, 0.3, 0.2, CHAR);
  put(batch.solid('fabric_canvas', cell), -0.2, 2.24, -half - 0.06, 0.5, 0.26, 0.03,
    [1.5, 1.42, 1.24]);
  // Bumper and the grille below it, both proud of the bulkhead.
  put(steel, 0, 0.12, -half - 0.2, W - 0.16, 0.28, 0.24, [0.46, 0.44, 0.42]);
  for (let i = 0; i < 5; i++) {
    put(burnt, 0, 0.4 + i * 0.1, -half - 0.13, W - 0.9, 0.06, 0.1, RUST);
  }

  // Rear: engine bay louvres, a hanging bumper, one surviving lamp housing.
  put(body, 0, 1.1, half + 0.02, W - 0.1, 2.0, 0.16, paintDirty, FX_ALL, 0.3);
  for (let i = 0; i < 6; i++) {
    put(burnt, 0, 0.42 + i * 0.13, half + 0.11, W - 0.7, 0.08, 0.12, RUST);
  }
  for (const s of [-1, 1]) {
    put(burnt, s * (W * 0.5 - 0.28), 1.62, half + 0.12, 0.3, 0.22, 0.14,
      [0.7, 0.62, 0.56]);
  }
  put(burnt, 0, 0.06, half + 0.18, W - 0.5, 0.3, 0.22, RUST);

  // Door apertures: the front one folded back, the centre one missing entirely.
  put(burnt, -(W * 0.5 - 0.05), 0.98, -half + 1.5, 0.14, 1.9, 0.12, CHAR_DEEP);
  put(burnt, -(W * 0.5 - 0.05), 0.98, -half + 2.6, 0.14, 1.9, 0.12, CHAR_DEEP);
  place(x, z, cs, sn, -(W * 0.5 + 0.28), -half + 1.62, _a, floorY + 1.0);
  addBox(burnt, _a.x, _a.y, _a.z, 0.55, 1.9, 0.09, { rotY: rot + 1.15, color: CHAR });

  // Interior: a double row of gutted seat frames, seen through the windows.
  const frames = batch.solid('metal_rusted', cell);
  for (let i = 0; i < 7; i++) {
    const lz = -half + 1.9 + i * 1.12;
    for (const s of [-1, 1]) {
      if (rng.next() < 0.18) continue;
      place(x, z, cs, sn, s * 0.78, lz, _a, floorY + 0.52 + lz * pitch);
      addBox(frames, _a.x, _a.y, _a.z, 0.7, 0.1, 0.9, { rotY: rot, color: CHAR });
      addBox(frames, _a.x, _a.y + 0.36, _a.z + 0.0, 0.7, 0.72, 0.09, {
        rotY: rot, color: [CHAR[0] * 1.15, CHAR[1] * 1.1, CHAR[2] * 1.05],
      });
    }
  }

  // Wheels: rear pair on the ground, front axle collapsed onto its brake drum.
  // The track is set so the tyre's outer wall sits just proud of the body line.
  const track = W * 0.5 - 0.14;
  wheel(batch, cell, x, z, cs, sn, -track, y + 0.5, half - 2.2, { radius: 0.5, width: 0.3, flat: 0.35 });
  wheel(batch, cell, x, z, cs, sn, track, y + 0.5, half - 2.2, { radius: 0.5, width: 0.3, flat: 0.1 });
  wheel(batch, cell, x, z, cs, sn, track, y + 0.46, -half + 2.1, { radius: 0.46, width: 0.28, flat: 0.85 });
  place(x, z, cs, sn, -(track + 0.14), -half + 2.1, _a, y + 0.22);
  place(x, z, cs, sn, -(track - 0.16), -half + 2.1, _b, y + 0.22);
  addTube(steel, _a, _b, 0.22, 8, [0.5, 0.46, 0.42]);

  /*
   * Shed panels on the road beside it, buckled rather than flat.
   *
   * As level plates lying on the ground these read as sheets of card dropped in
   * the street — the giveaway was that all six had the same thickness, the same
   * horizontal top face and a straight edge all round. A torn-off bus panel lands
   * on one corner and stays bent, so each is drawn as two facets meeting at an
   * angle with a little air under one end.
   */
  /*
   * Grounding: a stained, drifted apron under the length of it.
   *
   * A wreck this size that has been standing here for months has a shadow of its
   * own on the road — dropped oil, ash washed off the roof, sand that has banked
   * against the tyres because the wind cannot get under the skirt. Without it the
   * body ends on a hard line half a metre above the dust and the whole bus reads
   * as hovering, which is exactly what the first pass looked like from the north
   * end of the street. This is the cheapest fix there is for a floating object and
   * it works on every one of them.
   */
  const stain = batch.solid('asphalt', cell);
  for (let i = 0; i < 5; i++) {
    const lz = -half + 0.8 + (i / 4) * (L - 1.6);
    place(x, z, cs, sn, rng.range(-0.5, 0.5), lz, _a, 0);
    addGroundPatch(stain, _a.x, _a.z,
      Array.from({ length: 10 }, () => rng.range(1.05, 1.9)),
      rng.range(0, Math.PI), 0.72, ground, 0.011, [0.5, 0.48, 0.46]);
  }
  const drift = batch.solid('sand', cell);
  for (const [dlx, dlz] of [
    [track, half - 2.2], [-track, half - 2.2], [track, -half + 2.1], [-track, -half + 2.1],
  ] as const) {
    for (let i = 0; i < 3; i++) {
      const s = Math.sign(dlx);
      place(x, z, cs, sn, dlx + s * rng.range(0.04, 0.2), dlz + rng.range(-0.7, 0.7), _a, 0);
      const w = rng.range(0.5, 1.0);
      addWedge(drift, _a.x, ground(_a.x, _a.z) - 0.02, _a.z,
        rng.range(0.35, 0.6), rng.range(0.14, 0.3), w,
        { rotY: rot + (s > 0 ? Math.PI : 0), color: [1.06, 1.0, 0.92] });
    }
  }

  const debris = batch.solid('metal_painted', cell);
  for (let i = 0; i < 6; i++) {
    const a = rng.range(0, Math.PI * 2);
    const d = rng.range(2.4, 5.4);
    const px = x + Math.cos(a) * d;
    const pz = z + Math.sin(a) * d;
    const gy = ground(px, pz);
    const w = rng.range(0.5, 1.2);
    const len = rng.range(0.35, 0.8);
    const yaw2 = rng.range(0, Math.PI);
    const lift = rng.range(0.05, 0.22);
    addWedge(debris, px, gy + 0.01, pz, len, lift, w,
      { rotY: yaw2, color: paintDirty, grime: 0.35 });
    addWedge(debris, px + Math.cos(yaw2) * len, gy + 0.01, pz - Math.sin(yaw2) * len,
      len * rng.range(0.7, 1.2), lift * rng.range(0.4, 0.8), w * rng.range(0.8, 1.1),
      { rotY: yaw2 + Math.PI, color: [paintDirty[0] * 0.9, paintDirty[1] * 0.9, paintDirty[2] * 0.9], grime: 0.4 });
  }
}

/* --------------------------------- sedan ---------------------------------- */

/** A small burnt car, used to plug an alley or dress a courtyard. */
export function buildBurntCar(
  batch: Batcher,
  x: number, z: number, yaw: number,
  ground: (x: number, z: number) => number,
  rng: Rng,
  /** Rolled onto its side against a wall. */
  onSide = false,
): void {
  const cell = cellFor(x, z);
  const cs = Math.cos(yaw);
  const sn = Math.sin(yaw);
  const y = ground(x, z);
  const body = batch.solid('metal_rusted', cell);
  const steel = batch.solid('steel_plate', cell);
  const roll = onSide ? 1.35 : 0.02;
  const floorY = y + (onSide ? 0.9 : 0.5);
  const rot0 = yaw;

  // With the shell on its side the local frame tips about its long axis, which
  // addBox cannot express, so the tipped case is built from its own boxes.
  const put = (
    target: ReturnType<Batcher['solid']>,
    lx: number, ly: number, lz: number,
    sx: number, sy: number, sz: number,
    color: RGB, grime = 0,
  ): void => {
    const rx = lx * Math.cos(roll) - ly * Math.sin(roll);
    const ry = lx * Math.sin(roll) + ly * Math.cos(roll);
    place(x, z, cs, sn, rx, lz, _a, floorY + ry);
    const w = onSide ? sy : sx;
    const h = onSide ? sx : sy;
    addBox(target, _a.x, _a.y, _a.z, w, h, sz, { rotY: rot0, color, grime, grimeHeight: 0.5 });
  };

  put(steel, 0, -0.26, 0, 1.55, 0.18, 3.8, CHAR_DEEP);
  put(body, 0, 0.02, 0.1, 1.68, 0.62, 3.9, CHAR, 0.4);
  put(body, 0, 0.5, -1.35, 1.6, 0.22, 1.1, [CHAR[0] * 1.1, CHAR[1] * 1.05, CHAR[2] * 1.0]);
  put(body, 0, 0.5, 1.45, 1.6, 0.26, 0.95, [CHAR[0] * 1.1, CHAR[1] * 1.05, CHAR[2] * 1.0]);
  // Cabin ring: pillars and a caved roof.
  for (const s of [-1, 1]) {
    put(body, s * 0.8, 0.66, -0.72, 0.1, 0.56, 0.14, CHAR_DEEP);
    put(body, s * 0.8, 0.66, 0.9, 0.1, 0.56, 0.15, CHAR_DEEP);
    put(body, s * 0.8, 0.42, 0.1, 0.11, 0.62, 2.0, CHAR);
  }
  put(body, 0, 0.9, 0.06, 1.5, 0.09, 1.75, [CHAR[0] * 0.85, CHAR[1] * 0.84, CHAR[2] * 0.82]);
  put(steel, 0, -0.06, -2.0, 1.5, 0.28, 0.18, RUST);
  put(steel, 0, -0.02, 2.02, 1.5, 0.28, 0.16, RUST);

  if (!onSide) {
    for (const [lx, lz, flat] of [
      [-0.78, -1.3, 0.9], [0.78, -1.3, 0.2], [-0.78, 1.32, 0.35], [0.78, 1.32, 1],
    ] as const) {
      wheel(batch, cell, x, z, cs, sn, lx, y + 0.32, lz, { radius: 0.32, width: 0.22, flat });
    }
  } else {
    for (const lz of [-1.3, 1.32]) {
      place(x, z, cs, sn, 0.62, lz, _a, y + 1.3);
      place(x, z, cs, sn, 0.92, lz, _b, y + 1.34);
      addTube(steel, _a, _b, 0.3, 8, [0.5, 0.46, 0.42]);
    }
  }
  void rng;
}

/* ------------------------------- container -------------------------------- */

/** A shipping container: instant cover, instant scale reference, instant colour. */
export function buildContainer(
  batch: Batcher,
  x: number, z: number, yaw: number,
  ground: (x: number, z: number) => number,
  color: RGB,
  length = 6.06,
): void {
  const cell = cellFor(x, z);
  const y = ground(x, z);
  const corr = batch.solid('metal_corrugated', cell);
  const frame = batch.solid('metal_painted', cell);
  const W = 2.44;
  const H = 2.59;
  const cs = Math.cos(yaw);
  const sn = Math.sin(yaw);

  addBox(corr, x, y + H * 0.5, z, W - 0.12, H - 0.24, length - 0.12, {
    rotY: yaw, color, grime: 0.3, grimeHeight: 0.8, uvSwap: true, uvScale: 1.6,
  });
  // Corner castings and the rails between them; the frame is the silhouette.
  for (const sy of [0.09, H - 0.09]) {
    addBox(frame, x, y + sy, z, W, 0.18, length, { rotY: yaw, color: [color[0] * 0.8, color[1] * 0.78, color[2] * 0.76] });
  }
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      place(x, z, cs, sn, sx * (W * 0.5 - 0.09), sz * (length * 0.5 - 0.09), _a, y + H * 0.5);
      addBox(frame, _a.x, _a.y, _a.z, 0.18, H, 0.18, {
        rotY: yaw, color: [color[0] * 0.72, color[1] * 0.7, color[2] * 0.68], grime: 0.35,
      });
    }
  }
  // Doors at one end: two leaves with locking bars.
  place(x, z, cs, sn, 0, -length * 0.5 - 0.02, _a, y + H * 0.5);
  addBox(frame, _a.x, _a.y, _a.z, W - 0.2, H - 0.24, 0.08, { rotY: yaw, color, grime: 0.3 });
  for (let i = 0; i < 4; i++) {
    place(x, z, cs, sn, -0.86 + i * 0.58, -length * 0.5 - 0.08, _a, y + H * 0.5);
    addBox(frame, _a.x, _a.y, _a.z, 0.07, H - 0.4, 0.07, {
      rotY: yaw, color: [color[0] * 0.75, color[1] * 0.73, color[2] * 0.72],
    });
  }
}
