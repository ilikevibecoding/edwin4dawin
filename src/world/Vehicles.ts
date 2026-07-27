import * as THREE from 'three';
import { Rng } from '../core/MathUtils';
import type { Batcher } from './Batcher';
import { PAINT_ARCH, finishVariant, registerMasonryFinishes } from './Finish';
import {
  FX_ALL, FX_NX, FX_NY, FX_NZ, FX_PX, FX_PY, addBox, addCylinder, addGroundPatch, addTube,
  addWedge, type RGB,
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
 * Burnt bodywork.
 *
 * Getting here took four failed rounds, all of them the same mistake in
 * different clothes: trying to reach charred steel by multiplying an iron-oxide
 * albedo. `metal_rusted` carries two hues at once — orange oxide and blue-black
 * mill scale — and a per-channel multiply moves both in the same direction, so
 * every correction that neutralised the rust turned the scale navy and every
 * correction that neutralised the scale turned the rust to tangerine. The final
 * version of that attempt rendered the bus as a blue-and-orange mosaic.
 *
 * The fix is not a better multiplier, it is to stop asking a multiplier to do a
 * hue rotation. `CHAR_MAT` is `metal_rusted` with its hue collapsed at the
 * shader level (see Finish.ts), so what arrives at the vertex colour is a
 * greyscale relief map of oxide blooms, pitting and lifted scale. The tints
 * below are then plain values, and they mean what they say.
 *
 * They are near unity, which is right: `CHAR_MAT` resolves to a flat linear
 * 0.070 and charred steel is about that. What they must not do is approach zero —
 * a burnt shell in golden-hour sun is a dark warm grey that still shows its panel
 * lines and the direction of the light, not a silhouette.
 */
/*
 * All three are warm-biased, and that is a correction for the light rather than
 * a stylistic choice.
 *
 * The sun is six degrees up, so almost every surface on a wreck standing in a
 * street is lit by sky alone — and sky is blue. A neutral dark grey under a blue
 * hemisphere renders navy, which is physically exact and reads as painted blue
 * metal, the exact note this asset came back with twice. Measured off a frame,
 * the pillars were arriving at a blue-over-red ratio well above the masonry
 * beside them while their albedo was neutral. Biasing the albedo warm by about a
 * third cancels the sky's cast and lands the rendered result on the dark warm
 * grey that photographs of burnt vehicles actually show.
 */
const CHAR: RGB = [1.24, 1.04, 0.86];
const CHAR_DEEP: RGB = [0.86, 0.72, 0.6];
/**
 * Oxide, the one place the wreck is allowed a hue — but a *dark* one. Bright
 * orange oxide on a burnt shell reads as decoration, because rust that has been
 * baked by a vehicle fire and then stood in the sun for a season is closer to
 * dried blood than to a new tin can.
 */
const RUST: RGB = [1.16, 0.82, 0.56];

/**
 * Vehicle finishes. Registered on first use; `registerVariant` is idempotent.
 *
 * `flatten` matters as much as `desaturate` here. The oxide blooms swing about
 * three to one in value, which is right across a shed roof and wrong across the
 * flank of a vehicle at street distance: at that size the swings fall below the
 * eye's resolution and integrate into speckle. Pulling the contrast in leaves
 * the relief doing the work.
 */
/*
 * One consequence of collapsing the hue is worth stating plainly, because it
 * caught this code out once: after the finish, a tint is *the colour*, not a
 * correction to one. The channel ratios of the underlying map are gone, so
 * dividing a target by the map's original per-channel albedo — which is the right
 * thing to do for an unfinished material — over-corrects by exactly the ratio the
 * finish removed. Doing that to the bus flank asked for a pale grey-blue and
 * produced pink. Divide by the material's *luma*, uniformly.
 */
const CHAR_MAT = 'veh_char';
const PAINT_MAT = 'veh_paint';

/*
 * Metalness is the whole ballgame here, and it was set two orders of magnitude
 * too high.
 *
 * The measured albedo of the flank after finishing is 0.16 against 0.29 for the
 * ochre stucco it parks in front of, so on paper the bus is much the darker
 * object — and it rendered *brighter than the sunlit terrace behind it*, as a
 * pale polished slab that read as cut stone. The reason is that these panels
 * were left half metallic. A dielectric returns a few per cent of the sky as a
 * narrow highlight; a half-metal returns most of it across the entire surface,
 * and the sky over this map is an enormous bright source, so a broad specular
 * sheen was landing on ten square metres of bodywork and swamping the diffuse
 * term that the tints were so carefully chosen to set.
 *
 * Neither of these surfaces is metal in the physical sense. Soot and iron oxide
 * are ceramics, and chalked-out paint is a powder; all three are dielectrics
 * with the conductor buried somewhere underneath, and none of them reflects
 * anything specularly except a faint sheen where a panel is still smooth. So
 * metalness goes to almost nothing and roughness goes up, and the surface is
 * then described by its albedo — which is what the tints were written against.
 */
function registerVehicleFinishes(batch: Batcher): void {
  finishVariant(batch, CHAR_MAT, 'metal_rusted', {
    desaturate: 0.94,
    flatten: 0.4,
    pivot: 0.075,
    metalness: 0.05,
    roughness: 1.25,
  });
  finishVariant(batch, PAINT_MAT, 'metal_painted', {
    desaturate: 0.9,
    // `metal_painted` bakes to a 1.2x value swing, so it is already almost
    // flat and does not need help. Most of the flattening is dropped: what
    // little mottle the map has is the only thing distinguishing a chalked
    // panel from a flat colour fill.
    flatten: 0.1,
    pivot: 0.1,
    metalness: 0.06,
    roughness: 1.3,
  });
}

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
  /** Tyre burnt away entirely; the vehicle stands on the bare rim. */
  burnt?: boolean;
  color?: RGB;
}

/**
 * A tyre lying in the vehicle's local frame, axle along local X.
 *
 * Every part of this is a tube about the axle, which sounds obvious and was the
 * bug. The tread used to be a ring of ten boxes stepped around the circle, and
 * `addBox` only rotates about Y — so the boxes could not lean into the curve and
 * the wheel came out as a staircase of blocks. Under a shaded arch that reads as
 * a heap of rubble someone has swept under the bus, and since it is the only
 * thing between the body and the road, the largest object on the map appeared to
 * be resting on debris rather than standing on wheels.
 *
 * `addTube` is round, has correct radial normals, and at ten segments costs
 * twenty triangles against the sixty the boxes were spending. The lesson is
 * cheap: pick the primitive that matches the topology.
 */
function wheel(
  batch: Batcher, cell: string,
  cx: number, cz: number, cs: number, sn: number,
  lx: number, y: number, lz: number,
  o: WheelOpts,
): void {
  const tyre = batch.solid('rubber', cell);
  const rim = batch.solid(CHAR_MAT, cell);
  const yaw = Math.atan2(sn, cs);
  const flat = o.flat ?? 0;
  const r = o.radius;
  const half = o.width * 0.5;

  /*
   * Burnt off entirely: a bare rim resting on the road, with the last of the
   * bead still welded to it.
   *
   * A wheel with no rubber on it sits a good fifteen centimetres lower than one
   * with, which is what makes the corner of the vehicle drop — so the caller
   * passes a lower centre and this draws only the steel.
   */
  if (o.burnt) {
    /*
     * The rim is the brightest thing under the bus and has to be. It is bare
     * steel that has been scoured by a rubber fire and then stood in a dusty
     * street, so it is a mid grey — and it sits in the deepest shadow on the
     * whole asset, under a body that occludes most of the sky. Tinted down to
     * the value charred steel has in sunlight it disappeared completely, and a
     * wheel you cannot see is worse than no wheel at all.
     */
    place(cx, cz, cs, sn, lx - half * 0.72, lz, _a, y);
    place(cx, cz, cs, sn, lx + half * 0.7, lz, _b, y);
    // Capped, or the wheel is a hoop with a hole through it from the one
    // direction anybody looks at it from. See `addTube`.
    addTube(rim, _a, _b, r * 0.62, 12, [1.72, 1.6, 1.42], true);
    // Nave and the hollow behind it, dished in from the wheel face.
    place(cx, cz, cs, sn, lx + half * 0.24, lz, _a, y);
    addTube(rim, _a, _b, r * 0.34, 9, [0.86, 0.78, 0.68], true);
    place(cx, cz, cs, sn, lx + half * 0.55, lz, _a, y);
    place(cx, cz, cs, sn, lx + half * 0.78, lz, _b, y);
    addTube(rim, _a, _b, r * 0.17, 8, [1.3, 1.18, 1.02], true);
    // Charred bead: a ragged remnant of tyre still gripping the flange. Left as
    // separate lumps on purpose — this is the one part of a wheel that should
    // not be round, because what is left of it burnt off unevenly.
    for (let i = 0; i < 6; i++) {
      if (i % 3 === 0) continue;
      const am = ((i + 0.5) / 6) * Math.PI * 2;
      place(cx, cz, cs, sn, lx, lz + Math.cos(am) * r * 0.64, _a, y + Math.sin(am) * r * 0.64);
      addBox(tyre, _a.x, _a.y, _a.z, o.width * 0.9, r * 0.2, r * 0.3, {
        rotY: yaw, color: [1.1, 1.05, 1.0],
      });
    }
    return;
  }

  /*
   * A flat tyre is modelled by dropping the axle rather than by deforming the
   * carcass. The lower arc then passes below the road and is simply not seen,
   * which leaves exactly the silhouette a deflated tyre has — full round over
   * the top, spread wide at the contact patch — for no extra geometry and no
   * risk of the deformation folding the wheel inside out.
   */
  const drop = flat * r * 0.42;
  const cy = y - drop;

  /*
   * Dusty grey, not charred black. The rubber material bakes to a linear 0.043,
   * which is tyre compound and is nearly the darkest thing in the level; tinted
   * down further, a wheel in the shade under a bus was an unreadable blob. A
   * tyre that has stood in a dusty street for a season is a mid grey with the
   * sidewall paler than the tread, so these tints multiply up, not down.
   */
  place(cx, cz, cs, sn, lx - half, lz, _a, cy);
  place(cx, cz, cs, sn, lx + half, lz, _b, cy);
  addTube(tyre, _a, _b, r, 12, [2.15, 2.0, 1.8]);
  // Sidewall, a hair proud of the tread and paler, so the wheel has an edge. The
  // outboard end is capped: this is the face the street sees.
  place(cx, cz, cs, sn, lx - half * 1.04, lz, _a, cy);
  place(cx, cz, cs, sn, lx - half * 0.62, lz, _b, cy);
  addTube(tyre, _a, _b, r * 0.93, 12, [2.55, 2.4, 2.2], true);
  // Rim and hub, dished in behind the sidewall.
  place(cx, cz, cs, sn, lx - half * 0.58, lz, _a, cy);
  place(cx, cz, cs, sn, lx + half * 0.5, lz, _b, cy);
  addTube(rim, _a, _b, r * 0.6, 10, [1.12, 1.0, 0.86], true);
  place(cx, cz, cs, sn, lx - half * 0.72, lz, _a, cy);
  place(cx, cz, cs, sn, lx + half * 0.4, lz, _b, cy);
  addTube(rim, _a, _b, r * 0.3, 8, [0.9, 0.8, 0.7], true);
  // Where a flat one spreads onto the road.
  if (flat > 0.3) {
    place(cx, cz, cs, sn, lx, lz, _a, y - r * 0.04);
    addBox(tyre, _a.x, _a.y, _a.z, o.width * 1.25, r * 0.16, r * 1.5, {
      rotY: yaw, color: [1.7, 1.66, 1.6],
    });
  }
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
  registerVehicleFinishes(batch);
  const cell = cellFor(x, z);
  const cs = Math.cos(yaw);
  const sn = Math.sin(yaw);
  const y = ground(x, z);
  const body = batch.solid(CHAR_MAT, cell);
  const paint = batch.solid(PAINT_MAT, cell);
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
  const scorch = batch.solidFlat('asphalt', cell);
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
  registerVehicleFinishes(batch);
  const cell = cellFor(x, z);
  const cs = Math.cos(yaw);
  const sn = Math.sin(yaw);
  const y = ground(x, z);
  const body = batch.solid(PAINT_MAT, cell);
  const burnt = batch.solid(CHAR_MAT, cell);
  const steel = batch.solid('steel_plate', cell);
  const rot = yaw;
  // Nose down and listing, because the front axle is gone.
  const pitch = 0.035;
  const roll = 0.03;
  const floorY = y + 0.86;

  /*
   * Panels sample their material at close to the authored rate.
   *
   * This used to be 2.9, on the theory that smaller rust patches read as more
   * plausible corrosion. It does the opposite. `metal_painted` tiles at 1.6 m and
   * its rust front runs at five cycles, so a bay of bodywork got a rust bloom
   * every eleven centimetres: from the far end of the street that is not
   * corrosion, it is speckle, and speckle is what a texture looks like when it
   * has nothing to do with the object under it. Corrosion on a vehicle is
   * organised — it starts at a seam, a fixing or a stone chip and runs downhill
   * from there — so the material's job is to supply large soft blooms at roughly
   * the size of a real one, and the organisation comes from geometry: soot above
   * the openings, runs below the drains, char above the waist.
   */
  const UV = 1.15;
  const put = (
    target: ReturnType<Batcher['solid']>,
    lx: number, ly: number, lz: number,
    sx: number, sy: number, sz: number,
    color: RGB, faces = FX_ALL, grime = 0,
  ): void => {
    place(x, z, cs, sn, lx, lz, _a, floorY + ly + lz * pitch + lx * roll);
    addBox(target, _a.x, _a.y, _a.z, sx, sy, sz, {
      rotY: rot, color, faces, grime, grimeHeight: 0.7, uvScale: UV,
    });
  };
  /** As `put`, with an extra yaw about the box centre: for diagonal members. */
  const putSkew = (
    target: ReturnType<Batcher['solid']>,
    lx: number, ly: number, lz: number,
    sx: number, sy: number, sz: number,
    skew: number, color: RGB, faces = FX_ALL,
  ): void => {
    place(x, z, cs, sn, lx, lz, _a, floorY + ly + lz * pitch + lx * roll);
    addBox(target, _a.x, _a.y, _a.z, sx, sy, sz, {
      rotY: rot + skew, color, faces, uvScale: UV,
    });
  };
  /**
   * A wedge in the bus frame. `out` is the side the slope falls away toward, so
   * `-1` bevels the left flank and `+1` the right.
   */
  const putBevel = (
    target: ReturnType<Batcher['solid']>,
    lx: number, ly: number, lz: number,
    sx: number, sy: number, sz: number,
    out: number, color: RGB,
  ): void => {
    place(x, z, cs, sn, lx, lz, _a, floorY + ly + lz * pitch + lx * roll);
    addWedge(target, _a.x, _a.y, _a.z, sx, sy, sz, {
      rotY: rot + (out > 0 ? Math.PI : 0), color,
    });
  };

  const L = 10.6;
  const W = 2.5;
  const half = L * 0.5;
  /*
   * Corner radius, and the end-panel width it leaves behind.
   *
   * These are body dimensions rather than local details, so they live up here
   * with the length and width: the front cap, the rear cap and the four corner
   * rounds all have to agree about where the flank stops being flat, and when
   * they disagreed the corners either floated clear of the panels or buried
   * themselves inside them.
   */
  const cr = 0.24;
  const backW = W - 0.1 - cr * 1.6;
  /*
   * The bus is scorched, not painted.
   *
   * The previous version tinted the whole shell one saturated municipal blue,
   * and a burnt-out vehicle painted a clean strong colour is a contradiction the
   * eye picks up immediately — it reads as a bus with rust decals on it rather
   * than as a wreck. What actually survives a fire is the paint *below the
   * window line*, sheltered from the flame front by the waist rail and cooked to
   * a chalky ghost of its original colour, and nothing above it at all. Every
   * fire-damaged bus photograph shows the same two-tone split: dirty pale
   * bodywork to the waist, bare blackened steel from there to the roof.
   *
   * So there are two surfaces here rather than one, and the split is horizontal.
   *
   * `ENAMEL` is what a municipal blue looks like after a fire and a summer: a
   * chalky pale grey-blue with most of the colour gone out of it. It is tempting
   * to give it more saturation than this and it must not have any — the moment
   * the flank carries a recognisable colour the object reads as a serviceable bus
   * wearing damage decals rather than as a burnt-out shell, which is the note
   * this asset came back with. The one place any of the livery survives is the
   * waist rail, sheltered from above by its own drip edge and wiped by traffic.
   *
   * What it does need is *value*. The sun here is six degrees up and almost due
   * west, so a ten-metre terrace on the west side of the market street throws its
   * shadow the full width of the carriageway and the bus stands in shade all
   * evening: the only light on it is sky. A first pass at these tints put the
   * flank at about a quarter reflectance, which is honest for scorched paint in
   * sunlight and, under sky alone, made the biggest object on the map a black
   * slab that read as a shipping container. Everything below the waist is now
   * roughly twice the value of everything above it, and that ratio — pale
   * bodywork, dark cant rail, black window voids — is what makes the shape read
   * as a bus from the far end of the street with no direct light on it at all.
   */
  /*
   * Measured against the street rather than chosen in the abstract, and it took
   * one bad correction to learn why the measurement has to be trusted.
   *
   * `PAINT_MAT` resolves to a flat linear 0.095, so a tint of about 1.5 puts the
   * flank at 0.145 — six tenths of the concrete opposite and a third of the sand
   * underneath, which is where a scorched vehicle belongs. An earlier pass at
   * exactly those numbers rendered as a pale polished slab brighter than the
   * sunlit terrace, and two fixes went in at once: metalness came down from a half
   * to almost nothing, and the tints were halved. The first was the actual bug —
   * half-metallic panels were returning most of an enormous bright sky as a broad
   * specular sheen across ten square metres of bodywork. Halving the tints on top
   * of that was a correction applied to an already-corrected problem, and it took
   * the flank to 0.078: three times darker than the concrete next to it, which is
   * how the biggest object on the map came back as a black slab reading as a
   * shipping container.
   *
   * So the diffuse is back where the measurement puts it, and nothing else moved.
   * The blue-over-red ratio is 1.25 and deliberately no higher — enough to name
   * the colour standing next to it, not enough to compete with anything at street
   * distance. The waist rail keeps a little more, because it is the one strip of
   * livery the flame front never reached.
   */
  /*
   * The livery is confined to the waist rail, and the large panels are warm.
   *
   * This is the third attempt at the flank and the first that stops trying to
   * make ten square metres of bodywork carry the colour. Measured off a frame,
   * the previous tints put the flank at a blue-over-red *rendered* ratio of 0.86
   * against the sunlit stucco's 0.27 — so while its luma was a defensible half of
   * the masonry, it was by far the coolest large surface in a street where
   * everything else is ochre. The eye reads chroma difference before it reads
   * value difference, which is why a panel at half the brightness of its
   * surroundings still came back described as pale, white, and container-like.
   *
   * So the flank is now warm dark grey — soot wash, dust and oxide, which is what
   * the lower panels of a burnt bus are actually covered in — and the blue
   * survives only on the waist rail. That is the correct place for it on two
   * counts: it is the one strip sheltered from the flame front by its own drip
   * edge, and it is small enough that full saturation reads as intent rather than
   * as a paint job. A narrow saturated line against a large neutral field says
   * "this was blue" far more clearly than the whole field saying it quietly.
   */
  /*
   * Two numbers, measured, and the reasoning behind each:
   *
   * *Value.* The flank sits at a tint luma of about 0.95, which on `PAINT_MAT`
   * is an albedo near 0.09 — a third of the sunlit stucco opposite. A burnt
   * vehicle has to be a *dark* object in a bright street, and every version of
   * this that read as a shipping container was one where it was not.
   *
   * *Hue.* Neutral, with the faintest cool lean. This is the correction for the
   * pass before, which warmed the flank to ochre and produced a bus the same
   * colour and value as the masonry behind it — the object stopped being a wreck
   * and became a wall. Neutral albedo under this warm sun renders as warm dark
   * grey, which separates from ochre stucco by hue and from the sky by value,
   * and is what a scorched panel actually looks like.
   *
   * The livery is now a *hue* accent rather than a bright one: the waist rail
   * carries the same tint luma as the flank but pushed hard toward blue, so it
   * reads as a line of surviving colour instead of a pale stripe. Measured, the
   * previous rail was 1.7x the flank's brightness and was the lightest thing on
   * the asset — a ten-metre white line down a burnt-out bus.
   */
  const ENAMEL: RGB = [0.94, 0.95, 1.0];
  const ENAMEL_DIRTY: RGB = [0.62, 0.63, 0.66];
  /*
   * Half the flank's albedo, because the rail is lit about twice as hard.
   *
   * It stands twelve centimetres proud of panels that are themselves recessed
   * between it and the skirt, so the bays sit in a shallow channel and occlude a
   * good deal of sky while the rail sees all of it. Measured, that is a 1.9x
   * difference in irradiance for identical material — which is why matching the
   * two on albedo still produced a white line down the bus. Matching them on the
   * *rendered* result means halving the tint, and it leaves the rail free to be a
   * genuinely saturated blue without becoming the brightest thing in frame.
   */
  const band: RGB = [0.4, 0.52, 0.84];
  /*
   * Cooked bare steel above the waist, and the soot that put it there.
   *
   * A bus is read as a bus by the horizontal band across its middle: pale
   * bodywork below, dark glazing and cant rail above. `CHAR_MAT` resolves to a
   * flat 0.070, so scorch at unity sits at half the flank's value and the soot
   * line at a quarter of that — the two-to-one split that holds the band open,
   * with the window voids darker still.
   */
  /*
   * Scorch is oxide scale, not soot, and scale is a mid grey-brown — measured at
   * roughly twice the flank's albedo. It was previously darker than the panels
   * below it, which put the pillars at 1.13x the value of the window voids they
   * stand in front of: the band had no internal contrast at all and the whole
   * upper half of the bus collapsed into one dark mass. Soot stays black, because
   * soot is.
   */
  const SCORCH: RGB = [1.9, 1.72, 1.5];
  const SOOT: RGB = [0.44, 0.38, 0.32];

  /*
   * Underframe, skirt and floor pan, all narrower than the body above them, and
   * all of them kept clear of the wheels.
   *
   * The tuck-under is not styling, it is what makes the wheels visible, and this
   * has now been got wrong twice in two different ways. Built flush to the full
   * body width the skirt swallowed the whole wheel track sideways. Pulled inboard
   * to fix that, it still hung down to sixteen centimetres above the road — so a
   * bare rim standing sixty-two centimetres tall had fifteen of them showing under
   * a ten-metre pale panel, and from the length of the street the bus read as a
   * container resting flat on the dust with no running gear at all.
   *
   * The floor is where a bus floor is, so the height cannot move; what moves is
   * everything hanging off it. The skirt's hem now sits level with the top of a
   * bare rim, which is the whole of the story this asset is telling — no tyres,
   * standing on steel — and the underframe above it reads as the chassis it is.
   */
  const HEM = -0.56;
  const SKIRT_TOP = 0.23;
  const ARCH_CROWN = -0.06;
  const ARCH_HALF = 0.78;
  /** Axle centres, shared by the arches and by `setWheel` at the bottom. */
  const AXLE_Z = [-half + 2.1, half - 2.2] as const;
  /*
   * Chassis rail, seen through the arch openings under the skirt hem.
   *
   * On `burnt`, not `steel`. The tints in this file are calibrated against
   * `CHAR_MAT`'s flat 0.070 albedo, and `steel_plate` is a bright half-metallic
   * material several times lighter — so `CHAR_DEEP` applied to it does not mean
   * "charred", it means "unity-ish", and the rail rendered as a bright yellow
   * beam running the whole length of the underside. It had been wrong in exactly
   * this way before and nobody could see it because the old skirt hung down far
   * enough to hide it; cutting the arches put it on show.
   */
  put(burnt, 0, HEM - 0.05, 0, W - 0.9, 0.14, L - 1.4,
    [CHAR_DEEP[0] * 0.7, CHAR_DEEP[1] * 0.66, CHAR_DEEP[2] * 0.6]);
  /*
   * The skirt runs the length of the bus in three pieces with a gap at each
   * axle, and the gaps are the point.
   *
   * Every previous pass built this as one unbroken box whose hem sat above the
   * top of the wheels, so the wheels hung below the body as four isolated discs
   * and the bottom of the silhouette was a dead straight ten-metre line. That is
   * not what a bus looks like from the side — it is what a container looks like
   * on a chassis, and "shipping container" is precisely the note this asset kept
   * coming back with. A bus skirt comes down to about a third of a metre off the
   * road and has arches cut *up* into it, so the bottom edge of the body reads
   * hem, arch, hem, arch, hem. That profile is the second strongest identifying
   * feature a bus has after the window band, and no amount of tinting substitutes
   * for it.
   */
  for (const [z0, z1] of [
    [-half + 0.15, AXLE_Z[0] - ARCH_HALF],
    [AXLE_Z[0] + ARCH_HALF, AXLE_Z[1] - ARCH_HALF],
    [AXLE_Z[1] + ARCH_HALF, half - 0.15],
  ] as const) {
    put(body, 0, (HEM + SKIRT_TOP) * 0.5, (z0 + z1) * 0.5,
      W - 0.46, SKIRT_TOP - HEM, z1 - z0, ENAMEL_DIRTY, FX_ALL, 0.5);
  }
  // Over each arch the skirt carries on from the crown up, so the opening is a
  // hole in the panel rather than a notch out of its bottom edge.
  for (const az of AXLE_Z) {
    put(body, 0, (ARCH_CROWN + SKIRT_TOP) * 0.5, az,
      W - 0.46, SKIRT_TOP - ARCH_CROWN, ARCH_HALF * 2, ENAMEL_DIRTY, FX_ALL, 0.4);
  }
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
  const bayZ = (i: number): number => -half + 0.62 + ((i + 0.5) * (L - 1.1)) / pillars;
  const bayW = (L - 1.1) / pillars;
  /*
   * Heat is not uniform along a bus, and everything above the waist shows it. The
   * fire started in the engine bay, so the rear third cooked hardest and its
   * pillars are nearly black while the front ones keep some of their grey. Shared
   * by the pillars, the cant rail and the roof turn-under so all three agree about
   * which end burned.
   */
  const heatAt = (lz: number): number => 0.28 + 0.72 * Math.max(0, (lz + half) / L);
  for (const s of [-1, 1]) {
    /*
     * The lower skin is built bay by bay rather than as one ten-metre plate, so
     * it can be dented.
     *
     * A wreck with dead straight flanks is the tell that survived every other
     * fix: heat buckles a bus side into shallow waves between the pillars,
     * because the pillars hold their line and the unsupported panel between them
     * does not. Each bay gets a couple of centimetres in or out and a hair of
     * yaw, which is nothing measurable and is the difference between a shell and
     * an extrusion — the highlight running along the waist breaks into segments
     * instead of being one unbroken line down the street.
     */
    for (let i = 0; i < pillars; i++) {
      const lz = bayZ(i);
      // Rearward bays took more heat, so they buckle harder.
      const heat = 0.3 + 0.7 * Math.max(0, (lz + half) / L);
      const dent = rng.range(-0.055, 0.03) * heat;
      /*
       * Every bay is a slightly different value. Ten metres of flank at one tint
       * reads as a single plane whatever is modelled onto it, because a plane is
       * exactly what a constant value looks like — the dents and ribs were all
       * present and the flank still came back described as a flat expanse. Panels
       * on a burnt vehicle are not one colour: each took its own share of heat,
       * soot and hosing, and a fifth of a stop between neighbours is enough to
       * stop the eye integrating the lot into one surface.
       */
      const v = 1 - heat * 0.22 + rng.range(-0.09, 0.09);
      const bayCol: RGB = [ENAMEL[0] * v, ENAMEL[1] * v, ENAMEL[2] * v];
      place(x, z, cs, sn, s * (skinX + dent), lz, _a,
        floorY + 0.5 + lz * pitch + s * skinX * roll);
      addBox(body, _a.x, _a.y, _a.z, 0.11, 0.82, bayW + 0.06, {
        rotY: rot + rng.range(-0.02, 0.02) * s, color: bayCol, grime: 0.25,
        grimeHeight: 0.7, uvScale: UV,
        // Shifts the map under each bay so neighbours do not share a bloom, which
        // is what turned nine dented panels back into one tiling plane.
        uvOffset: [i * 0.61, 0],
      });
      // Ribs, catching a vertical highlight down each bay.
      put(body, s * (W * 0.5 - 0.035 + dent), 0.5, lz, 0.06, 0.74, 0.07,
        [bayCol[0] * 0.9, bayCol[1] * 0.9, bayCol[2] * 0.89]);
    }
    // Waistband, proud of the panel: the livery stripe and a drip edge in one.
    put(body, s * (W * 0.5 - 0.01), 1.0, 0, 0.13, 0.24, L, band, FX_ALL, 0.15);
    /*
     * Pillars, cant rail and gutter are bare cooked steel.
     *
     * Above the waist the flame front came out of the windows and took the paint
     * with it, which is why every photograph of a burnt bus shows a clean
     * horizontal line at the waist rail with colour below it and black above.
     */
    for (let i = 0; i <= pillars; i++) {
      const lz = -half + 0.55 + (i * (L - 1.1)) / pillars;
      // One pillar near the rear has folded outward where the roof came down.
      const splay = i === pillars - 2 ? 0.07 : 0;
      const k = 1 - heatAt(lz) * 0.42;
      put(burnt, s * (pillarX + splay), 1.62, lz, 0.13, 1.0, 0.15,
        [SCORCH[0] * k, SCORCH[1] * k, SCORCH[2] * k]);
    }
    /*
     * Cant rail, drawn bay by bay rather than as one ten-metre extrusion.
     *
     * This is where the soot actually goes, and getting that wrong was the worst
     * single fault in the asset. The previous version stacked widening plates
     * *upward* from the window head to suggest a plume, on the reasoning that
     * flame leaving an opening licks up the bodywork above it — which is true of
     * a building and not of a bus, because a bus has no bodywork above its
     * windows. Its cant rail is twenty centimetres deep and the roof starts
     * immediately. So the plates climbed straight past the roofline into thin
     * air, and the largest object on the map wore a metre-high band of floating
     * speckled slabs along the top of it.
     *
     * A bus fire marks the surfaces it actually has: the cant rail directly over
     * each opening goes black, the pillars either side darken where the flame
     * wrapped them, and the deposit thins to nothing over the pillar centres.
     * That alternation along the roofline is worth far more than any plume,
     * because it is the thing that makes ten identical bays read as ten separate
     * events.
     */
    for (let i = 0; i < pillars; i++) {
      const lz = bayZ(i);
      const heat = heatAt(lz);
      const v = 1 - heat * 0.78;
      put(burnt, s * pillarX, 2.2, lz, 0.14, 0.22, bayW - 0.02, [
        SOOT[0] + (SCORCH[0] - SOOT[0]) * v,
        SOOT[1] + (SCORCH[1] - SOOT[1]) * v,
        SOOT[2] + (SCORCH[2] - SOOT[2]) * v,
      ]);
      // Soot on the roof deck just inboard of the gutter, fanning in from the
      // opening it came out of. Flat on the roof, so it can only be seen from
      // above or from a rooftop — which is where half this map is fought.
      place(x, z, cs, sn, s * (W * 0.5 - 0.34), lz, _a, floorY + 2.46 + lz * pitch);
      addBox(burnt, _a.x, _a.y, _a.z, 0.5, 0.02, bayW * 0.8, {
        rotY: rot, faces: FX_PY, uvScale: 0.8,
        color: [SOOT[0] * 1.2, SOOT[1] * 1.15, SOOT[2] * 1.1],
      });
    }
    /*
     * Drip rail at the foot of the roof turn-under. Dark, not oxide: a ten-metre
     * rust-coloured line along the roofline is the single most prominent element
     * on the asset and reading it as a livery stripe undoes the wreck. The oxide
     * belongs in the runs it feeds down the flank, which are short and vertical.
     */
    put(burnt, s * (W * 0.5 + 0.04), 2.27, 0, 0.09, 0.09, L - 0.2,
      [CHAR[0] * 0.86, CHAR[1] * 0.8, CHAR[2] * 0.72]);
    // Hard black lip along the head of the whole window band: the line the smoke
    // leaves where it left the aperture and crossed the rail.
    put(burnt, s * (pillarX + 0.005), 2.07, 0, 0.14, 0.07, L - 1.1, SOOT);
    /*
     * The side lining, drawn inward-facing only, which is what finally made the
     * window band read as a row of holes.
     *
     * The previous version put a dark pan behind each aperture with all six faces
     * on, and it failed twice over. It was measured at only two and a half times
     * darker than the bodywork below it, where a void needs closer to eight — and
     * the reason it was that bright is that the sun here is six degrees up and
     * nearly due west, so it enters the west windows almost horizontally and lands
     * square on a pan facing straight back at it. A vertical surface at that
     * incidence collects very nearly full sun; there is no lintel depth that will
     * shade it.
     *
     * Drawing only the *inward* face of each lining solves the lighting and the
     * occlusion together. The near lining vanishes — its one face points away from
     * the viewer and back-face culls — so looking through the near windows you see
     * across the gutted interior to the *far* lining, whose visible face is turned
     * away from the sun and is therefore genuinely dark. It also uncovers the seat
     * frames, which sit between the two linings and were previously walled off by
     * the near pan on both sides: they had been built to be "seen through the
     * windows" and could not be seen at all. A black interior with a double row
     * of burnt seat frames silhouetted in it is worth far more than a black
     * rectangle, and it costs a sixth of the triangles the closed box did.
     */
    put(burnt, s * glassX, 1.62, 0, 0.05, 1.0, L - 1.1,
      [0.035, 0.033, 0.03], s > 0 ? FX_NX : FX_PX, 0.6);
    /*
     * Glazing: every pane blown out.
     *
     * A third of the bays used to keep an intact sheet of glass, which is what a
     * bus looks like after a collision and not after a fire — toughened glazing
     * goes everywhere in the first minute, and a wreck with three clean windows
     * in it reads as abandoned rather than burnt. What is left is the margin
     * still gripped in the rubber at the top of the aperture, and the odd
     * triangle hanging in a corner.
     */
    const shardBuf = batch.solid('glass_broken', cell);
    for (let i = 0; i < pillars; i++) {
      const lz = bayZ(i);
      const h = rng.range(0.1, 0.3);
      place(x, z, cs, sn, s * (glassX + 0.03), lz, _a, floorY + 2.11 - h * 0.5 + lz * pitch);
      addBox(shardBuf, _a.x, _a.y, _a.z, 0.04, h, bayW - 0.16, {
        rotY: rot, color: [1, 1, 1], faces: s > 0 ? FX_PX | FX_NX : FX_PX | FX_NX,
      });
      // A corner shard in about half the bays, alternating side.
      if (rng.next() < 0.5) {
        const cz2 = lz + (i % 2 === 0 ? 1 : -1) * (bayW * 0.5 - 0.12);
        place(x, z, cs, sn, s * (glassX + 0.03), cz2, _a, floorY + 1.82 + lz * pitch);
        addBox(shardBuf, _a.x, _a.y, _a.z, 0.04, rng.range(0.25, 0.5), rng.range(0.1, 0.22), {
          rotY: rot, color: [1, 1, 1], faces: FX_PX | FX_NX,
        });
      }
    }

    /*
     * Corrosion where corrosion belongs: below the waist rail, hanging off the
     * fixings.
     *
     * The complaint about the first pass was that rust read as high-frequency
     * noise rather than as something following seams and water runs, and that is
     * a placement problem, not a texture problem. Oxide on a vehicle starts at a
     * discontinuity — a seam, a rivet, a stone chip — and runs vertically down
     * from it under gravity. So each run starts at the underside of the waist
     * rail, is narrower than it is long by a factor of five or more, and there is
     * at most one per bay, offset within the bay so they do not form a rank.
     */
    for (let i = 0; i < pillars; i++) {
      const lz = bayZ(i);
      if (rng.next() < 0.35) continue;
      const runH = rng.range(0.3, 0.78);
      const o = rng.range(-0.3, 0.3);
      /*
       * Each run is a different strength, and the strongest are the widest.
       *
       * At one tint and one width they came out as a rank of orange sticks of
       * matched length — the giveaway that they were placed by a loop rather than
       * by water. A stain is strongest where it starts and fades as it spreads,
       * and no two fixings leak at the same rate.
       */
      const wet = rng.range(0.45, 1.0);
      place(x, z, cs, sn, s * (W * 0.5 + 0.005), lz + o, _a,
        floorY + 0.86 - runH * 0.5 + lz * pitch);
      addBox(burnt, _a.x, _a.y, _a.z, 0.02, runH, rng.range(0.04, 0.07) + wet * 0.06, {
        rotY: rot, color: [RUST[0] * wet, RUST[1] * wet, RUST[2] * wet],
        faces: s > 0 ? FX_PX : FX_NX, uvScale: 1.6,
      });
    }
    /*
     * The arch eyebrow: a lip standing proud of the skirt around each opening.
     *
     * It sits on the *skirt* line rather than the flank line, which sounds
     * pedantic and is not. The skirt is tucked twenty centimetres inboard of the
     * bodywork above it, so a lip placed on the flank line hangs in space over
     * the arch with a visible gap behind it. Two centimetres proud of the panel
     * it belongs to is enough to catch a rim of light along the top of the arch,
     * which is all this has to do.
     */
    const archX = (W - 0.46) * 0.5 + 0.02;
    for (const lz of AXLE_Z) {
      for (const t of [-1, -0.72, -0.4, 0, 0.4, 0.72, 1]) {
        const dy = ARCH_CROWN - t * t * 0.46;
        put(body, s * archX, dy, lz + t * ARCH_HALF, 0.08, 0.14, ARCH_HALF * 0.42,
          [ENAMEL_DIRTY[0] * 0.86, ENAMEL_DIRTY[1] * 0.84, ENAMEL_DIRTY[2] * 0.8],
          FX_ALL, 0.5);
      }
    }
  }

  /*
   * The roof, and the two bevels that turn this object into a bus.
   *
   * Everything above was right and the asset still came back reading as a
   * shipping container, which took a while to understand because the fault is
   * not in any one part — it is in the silhouette, and the silhouette was a
   * cuboid. A bus is a cuboid with two things done to it: the roof is domed and
   * turns down into the sides through a generous radius, and the four vertical
   * corners are rounded off. Those are not details, they are the entire
   * difference between a coachbuilt shell and a box, and they read from any
   * distance at which the object is visible at all, because they are the parts
   * that decide where the top edge catches the sky.
   *
   * Neither can be done with a box, which is why the previous eight passes of
   * boxes on boxes never fixed it. A 45-degree facet is a coarse stand-in for a
   * radius and it is enough: what matters is that the top edge is no longer a
   * single hard line against the sky but a bright bevel with a shadowed panel
   * under it, and that the corners return light at an angle nothing else in the
   * street does.
   */
  const roofY = 2.38;
  const bevel = 0.26;
  put(burnt, 0, roofY, -half * 0.35, W - 0.06 - bevel * 2, 0.14, L * 0.62, SCORCH);
  put(burnt, 0, 2.3, half * 0.36, W - 0.4, 0.1, L * 0.2, CHAR);
  for (const s of [-1, 1]) {
    /*
     * Roof turn-under: the bevel from the gutter line up to the deck, in one
     * piece per bay so it can carry the soot.
     *
     * This is where the smoke actually shows from street level. It used to be a
     * single six-and-a-half-metre wedge at one tint — both the longest
     * uninterrupted element on the asset and, because it faces up and outward at
     * forty-five degrees, the one surface above the window line that a player
     * standing in the road can see the whole of. Splitting it on the bay pitch and
     * darkening the pieces over the openings puts the plume where the flame left
     * the bus, and does it on geometry that already existed.
     */
    for (let i = 0; i < pillars; i++) {
      const lz = bayZ(i);
      const v = 1 - heatAt(lz) * 0.6;
      putBevel(burnt, s * (W * 0.5 - 0.02 - bevel * 0.5), roofY - 0.07, lz,
        bevel, 0.14, bayW - 0.03, s, [
          SOOT[0] + (SCORCH[0] * 1.06 - SOOT[0]) * v,
          SOOT[1] + (SCORCH[1] * 1.04 - SOOT[1]) * v,
          SOOT[2] + (SCORCH[2] * 1.0 - SOOT[2]) * v,
        ]);
    }
  }
  /*
   * Corner rounds. Front pair still carry paint, rear pair are burnt bare —
   * the same waist split as the flanks, kept consistent so the fire reads as one
   * event rather than as decoration applied per panel.
   */
  for (const s of [-1, 1]) {
    for (const e of [-1, 1]) {
      const front = e < 0;
      const buf = front ? body : burnt;
      const col = front ? ENAMEL_DIRTY : [SCORCH[0] * 0.9, SCORCH[1] * 0.86, SCORCH[2] * 0.82] as RGB;
      // Below the waist the corner keeps its paint; above it is cooked.
      putSkew(buf, s * (W * 0.5 - cr * 0.5), 0.52, e * (half - cr * 0.5),
        cr * 1.5, 1.06, 0.07, s * e * (Math.PI * 0.25), col);
      putSkew(burnt, s * (W * 0.5 - cr * 0.5), 1.66, e * (half - cr * 0.5),
        cr * 1.5, 1.3, 0.07, s * e * (Math.PI * 0.25),
        [SCORCH[0] * 0.8, SCORCH[1] * 0.76, SCORCH[2] * 0.72]);
    }
  }
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
  put(body, 0, 0.62, -half - 0.02, backW, 1.05, 0.16, ENAMEL, FX_ALL, 0.3);
  // Waist rail carried round the front too, for the same reason as the back.
  put(body, 0, 1.0, -half - 0.06, backW + 0.1, 0.24, 0.1, band, FX_ALL, 0.2);
  for (const s of [-1, 1]) {
    // Screen pillars are above the waist and so are bare, like the side pillars.
    put(burnt, s * (W * 0.5 - 0.3), 1.62, -half - 0.03, 0.26, 1.0, 0.17, SCORCH, FX_ALL, 0.15);
  }
  // Screen header and the shattered glass still in its rubber.
  put(burnt, 0, 2.12, -half - 0.03, backW, 0.22, 0.18, SCORCH);
  place(x, z, cs, sn, 0, -half + 0.04, _a, floorY + 1.86);
  addBox(batch.solid('glass_broken', cell), _a.x, _a.y, _a.z, W - 0.6, 0.44, 0.05,
    { rotY: rot, color: [1, 1, 1] });
  // Soot across the screen header, where the smoke crossed it on its way out.
  place(x, z, cs, sn, 0, -half - 0.13, _a, floorY + 2.11);
  addBox(burnt, _a.x, _a.y, _a.z, W - 0.36, 0.2, 0.02,
    { rotY: rot, color: SOOT, faces: FX_NZ, uvScale: 0.8 });
  // Destination box, its glass gone and its blind hanging out.
  put(burnt, 0, 2.36, -half + 0.02, W - 0.72, 0.3, 0.2, CHAR);
  put(batch.solid('fabric_canvas', cell), -0.2, 2.24, -half - 0.06, 0.5, 0.26, 0.03,
    [1.5, 1.42, 1.24]);
  // Bumper and the grille below it, both proud of the bulkhead.
  put(steel, 0, 0.12, -half - 0.2, W - 0.16, 0.28, 0.24, [0.46, 0.44, 0.42]);
  for (let i = 0; i < 5; i++) {
    put(burnt, 0, 0.4 + i * 0.1, -half - 0.13, W - 0.9, 0.06, 0.1, RUST);
  }

  /*
   * Rear. This end faces the length of the market street and is the first thing
   * the north spawn sees, and it was a single flat plate two and a half metres
   * square — the most box-like surface on the map, on the most important object.
   *
   * A bus back end is four stacked things, not one: an engine bay with its
   * louvres, a waist rail carrying across from the flanks, a rear window, and a
   * cooked cap above that. Splitting it at those lines and letting the window be
   * a genuine void does more for the read than any amount of tinting, because a
   * hole is the one thing a slab cannot fake.
   */
  // Engine bay, below the waist: the fire started here and this panel is bare.
  put(burnt, 0, 0.62, half + 0.02, backW, 1.04, 0.16, CHAR_DEEP, FX_ALL, 0.5);
  for (let i = 0; i < 6; i++) {
    put(burnt, 0, 0.42 + i * 0.13, half + 0.11, backW - 0.6, 0.08, 0.12, RUST);
  }
  // Waist rail carrying round the corner from the flanks, so the band reads as
  // continuous and the shell as one body.
  put(body, 0, 1.0, half + 0.06, backW + 0.1, 0.24, 0.1, band, FX_ALL, 0.2);
  /*
   * Rear window, burnt out: a recessed black void with the frame standing proud
   * of it. Set back 14 cm, which at this sun angle drops the top of the aperture
   * into shadow and is what makes it read as an opening rather than a dark
   * rectangle painted on the back.
   */
  put(burnt, 0, 1.66, half - 0.06, backW - 0.36, 0.94, 0.06, [0.1, 0.1, 0.1]);
  for (const s of [-1, 1]) {
    put(burnt, s * (backW * 0.5 - 0.1), 1.66, half + 0.03, 0.2, 0.96, 0.14, SCORCH);
  }
  put(burnt, 0, 2.12, half + 0.03, backW, 0.22, 0.15, SOOT);
  put(burnt, 0, 1.18, half + 0.03, backW, 0.16, 0.15,
    [SCORCH[0] * 0.85, SCORCH[1] * 0.82, SCORCH[2] * 0.78]);
  // Lamp clusters, down at the height buses actually carry them. Lenses gone,
  // so what is left is the reflector pan and a rim of coloured plastic.
  for (const s of [-1, 1]) {
    put(burnt, s * (backW * 0.5 - 0.24), 0.46, half + 0.13, 0.34, 0.3, 0.1,
      [0.62, 0.5, 0.44]);
    put(burnt, s * (backW * 0.5 - 0.24), 0.46, half + 0.17, 0.26, 0.22, 0.05,
      [0.34, 0.3, 0.29]);
  }
  put(burnt, 0, 0.06, half + 0.18, W - 0.5, 0.3, 0.22, RUST);

  // Door apertures: the front one folded back, the centre one missing entirely.
  put(burnt, -(W * 0.5 - 0.05), 0.98, -half + 1.5, 0.14, 1.9, 0.12, CHAR_DEEP);
  put(burnt, -(W * 0.5 - 0.05), 0.98, -half + 2.6, 0.14, 1.9, 0.12, CHAR_DEEP);
  place(x, z, cs, sn, -(W * 0.5 + 0.28), -half + 1.62, _a, floorY + 1.0);
  addBox(burnt, _a.x, _a.y, _a.z, 0.55, 1.9, 0.09, { rotY: rot + 1.15, color: CHAR });

  // Interior: a double row of gutted seat frames, seen through the windows.
  const frames = batch.solid(CHAR_MAT, cell);
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

  /*
   * Wheels. Rubber is the first thing to go in a vehicle fire, so a burnt-out bus
   * does not stand on tyres — it stands on steel.
   *
   * Four states across the four positions, because a wreck that has been picked
   * over for months does not lose its wheels uniformly: the near rear still has
   * a tyre on it, gone down to the rim; the off rear burnt off entirely and the
   * bus is sitting on the bare wheel, which is why it lists; the off front is
   * flat; and the near front has been taken away complete, leaving the hub, the
   * brake drum and the axle stub in the dust. That last one is the read the
   * user was after — the corner of the body drops onto the ground, and it is
   * also why the whole shell sits nose-down.
   *
   * The track is set so what remains sits just proud of the body line.
   */
  const track = W * 0.5 - 0.14;
  /*
   * Each wheel is set on the road under *itself*.
   *
   * These used to take the terrain height at the middle of the bus, three metres
   * away from either axle. The market street is cambered and rutted, so that put
   * the front pair a hand's width into the road surface and left the rear pair
   * hovering above it — on the one asset where grounding matters most, because a
   * ten-metre body cantilevered over four small contact patches is read entirely
   * through where those patches meet the ground.
   */
  const setWheel = (s: number, lz: number, o: WheelOpts): void => {
    place(x, z, cs, sn, s * track, lz, _b, 0);
    const gy = ground(_b.x, _b.z);
    // A bare rim stands on a radius two-thirds of the tyre's, which is what
    // drops that corner of the body and gives the shell its list.
    wheel(batch, cell, x, z, cs, sn, s * track,
      gy + (o.burnt ? o.radius * 0.62 : o.radius), lz, o);
  };
  setWheel(-1, AXLE_Z[1], { radius: 0.5, width: 0.3, burnt: true });
  setWheel(1, AXLE_Z[1], { radius: 0.5, width: 0.3, burnt: true });
  setWheel(1, AXLE_Z[0], { radius: 0.46, width: 0.28, flat: 0.85 });
  // Near front: nothing left but the drum and the stub it turned on.
  place(x, z, cs, sn, -(track + 0.2), AXLE_Z[0], _a, y + 0.3);
  place(x, z, cs, sn, -(track - 0.3), AXLE_Z[0], _b, y + 0.3);
  addTube(steel, _a, _b, 0.26, 8, [0.5, 0.46, 0.42]);
  place(x, z, cs, sn, -(track - 0.02), -half + 2.1, _a, y + 0.3);
  addCylinder(steel, _a.x, _a.y - 0.28, _a.z, 0.3, 0.05, {
    segments: 9, color: [0.42, 0.4, 0.38], grime: 0.5,
  });
  // Wheel nuts on the exposed drum face: the detail that says the wheel is gone
  // rather than that it was never modelled.
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    place(x, z, cs, sn, -(track + 0.19), -half + 2.1 + Math.cos(a) * 0.16, _a,
      y + 0.3 + Math.sin(a) * 0.16);
    addBox(steel, _a.x, _a.y, _a.z, 0.05, 0.05, 0.05, { rotY: rot, color: [0.56, 0.52, 0.48] });
  }
  // And the burnt remains of that tyre, thrown clear.
  place(x, z, cs, sn, -(track + 1.5), -half + 3.4, _a, 0);
  addCylinder(batch.solid('rubber', cell), _a.x, ground(_a.x, _a.z) + 0.01, _a.z, 0.47, 0.14, {
    segments: 9, color: [1.1, 1.06, 1.0], grime: 0.4,
  });
  addCylinder(batch.solid('sand', cell), _a.x, ground(_a.x, _a.z) + 0.02, _a.z, 0.3, 0.1, {
    segments: 8, color: [1.04, 1.0, 0.93],
  });

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
  const stain = batch.solidFlat('asphalt', cell);
  for (let i = 0; i < 5; i++) {
    const lz = -half + 0.8 + (i / 4) * (L - 1.6);
    place(x, z, cs, sn, rng.range(-0.5, 0.5), lz, _a, 0);
    addGroundPatch(stain, _a.x, _a.z,
      Array.from({ length: 10 }, () => rng.range(1.05, 1.9)),
      rng.range(0, Math.PI), 0.72, ground, 0.011, [0.5, 0.48, 0.46]);
  }
  /*
   * Sand banked against the skirt — between the axles, never at them.
   *
   * These drifts used to be placed on the wheels, on the reasonable theory that
   * sand banks against whatever stops it and a tyre is what stops it. It is also
   * the one place on the asset where a drift must not go. The wheels are the
   * only thing establishing that a ten-metre body is standing on something, they
   * sit in the deepest shadow the bus casts, and a sunlit drift is among the
   * brightest surfaces in the level — so each drift buried its wheel and then
   * drew the eye to the burial. The bus went back to reading as a container on a
   * plinth, which is the fault this whole pass exists to fix.
   *
   * They now sit mid-span where the skirt runs closest to the road, which is
   * where the wind actually drops its load, and they are lower and shorter so the
   * gap of daylight under the body survives.
   */
  const drift = batch.solid('sand', cell);
  for (const s of [-1, 1]) {
    /*
     * One bank per side, and only mid-span. Three of them read as a dashed line
     * of little bright triangles strung along the bottom of the body — a row of
     * identical wedges at identical spacing is a fence, not a drift — and between
     * them they closed off the strip of daylight under the shell that the wheels
     * are seen against.
     */
    for (const dlz of [0.6]) {
      place(x, z, cs, sn, s * (track - 0.06), dlz + rng.range(-0.5, 0.5), _a, 0);
      /*
       * Tinted to about half. `sand` bakes to a linear 0.43, which is the
       * brightest albedo in the level — brighter than the stucco, brighter than
       * the road, brighter than anything it will ever sit next to. At full
       * strength, in the one place on the map that is supposed to be the darkest,
       * a drift measured more than twice the value of the bodywork above it and
       * became the first thing the eye found in the lower half of the frame.
       * Sand lying in a vehicle's shadow, mixed with the ash off its own roof, is
       * a dark ochre.
       */
      addWedge(drift, _a.x, ground(_a.x, _a.z) - 0.02, _a.z,
        rng.range(0.3, 0.42), rng.range(0.1, 0.16), rng.range(2.2, 3.0),
        { rotY: rot + (s > 0 ? Math.PI : 0), color: [0.52, 0.49, 0.45] });
    }
  }

  const debris = batch.solid(PAINT_MAT, cell);
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
      { rotY: yaw2, color: ENAMEL_DIRTY, grime: 0.35 });
    addWedge(debris, px + Math.cos(yaw2) * len, gy + 0.01, pz - Math.sin(yaw2) * len,
      len * rng.range(0.7, 1.2), lift * rng.range(0.4, 0.8), w * rng.range(0.8, 1.1),
      {
        rotY: yaw2 + Math.PI, grime: 0.4,
        color: [ENAMEL_DIRTY[0] * 0.9, ENAMEL_DIRTY[1] * 0.9, ENAMEL_DIRTY[2] * 0.9],
      });
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
  registerVehicleFinishes(batch);
  const body = batch.solid(CHAR_MAT, cell);
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
  registerMasonryFinishes(batch);
  const cell = cellFor(x, z);
  const y = ground(x, z);
  const corr = batch.solid('metal_corrugated', cell);
  const frame = batch.solid(PAINT_ARCH, cell);
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
