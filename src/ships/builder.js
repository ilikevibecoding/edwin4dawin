// Ship model builder: hull cells plus animated PARTS (wings, S-foils, doors, ramps, landing gear) that are authored
// in the LANDED pose and carry a rigid transform to their FLIGHT pose. The renderer poses every part from a state in
// [0, 1] (1 = landed pose as authored, 0 = flight pose) in the vertex shader, so far ships animate inside a single
// instanced draw call per type; the vehicle uses the composite grids (landed-open / landed-closed / flight) for
// collision.
//
// Coordinates: x across (mirror axis at w / 2; +x is starboard for a ship whose nose points -z), y up (y = 0 is the
// landing-gear contact plane), z along the hull with the NOSE at z = 0 (forward = -z, the three.js yaw-0 direction).
// Cells are [x, x + 1) etc.; pivots are corner coordinates. Emit codes (per cell, for the shader): 0 none, 1 steady
// lamp, 2 nav strobe, 3 engine (thrust), 4 landing light.
import { B, BLOCKS } from '../blocks.js';
import { VoxelGrid } from '../vehicles/voxelMesh.js';

export const EMIT = { NONE: 0, LAMP: 1, NAV: 2, ENGINE: 3, LANDING: 4 };
// Animation channels (index into the per-instance state vec4)
export const CH = { GEAR: 0, CLASS: 1, DOOR: 2, LIGHTS: 3 };
export const CHANNEL_NAMES = ['gear', 'class', 'door', 'lights'];

export const SEAT = B.BED_FOOT;       // cushioned seat (9/16 high)
export const BUNK = B.BED_HEAD;
export const CONSOLE = B.CONSOLE;
export const STEP = B.STONE_BRICK_SLAB;   // half step of a boarding ramp

const key = (x, y, z) => ((x * 256 + y) * 256 + z);

// Rotates point p (array) about `axis` through `pivot` by `angle` (Rodrigues), then adds `slide`.
export function transformPoint(p, xf, out = [0, 0, 0]) {
  const [px, py, pz] = xf.pivot, [ax, ay, az] = xf.axis, a = xf.angle;
  let x = p[0] - px, y = p[1] - py, z = p[2] - pz;
  if (a) {
    const c = Math.cos(a), s = Math.sin(a), d = ax * x + ay * y + az * z;
    const cx = ay * z - az * y, cy = az * x - ax * z, cz = ax * y - ay * x;
    const nx = x * c + cx * s + ax * d * (1 - c), ny = y * c + cy * s + ay * d * (1 - c), nz = z * c + cz * s + az * d * (1 - c);
    x = nx; y = ny; z = nz;
  }
  out[0] = x + px + xf.slide[0]; out[1] = y + py + xf.slide[1]; out[2] = z + pz + xf.slide[2];
  return out;
}

export class Part {
  constructor(name, channel, xf) {
    this.name = name;
    this.channel = channel;
    this.pivot = xf.pivot || [0, 0, 0];
    this.axis = xf.axis || [0, 0, 1];
    this.angle = xf.angle || 0;
    this.slide = xf.slide || [0, 0, 0];
    this.cells = [];                   // [x, y, z, id, emit]
    this.emit = xf.emit || 0;
    this.flightId = xf.flightId || 0;  // collision stand-in for the flight pose (0 = the cell's own block)
  }
  set(x, y, z, id, emit = this.emit) { this.cells.push([x, y, z, id, emit]); return this; }
  fill(x0, y0, z0, x1, y1, z1, id, emit = this.emit) {
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) this.set(x, y, z, id, emit);
    return this;
  }
  // cells of this part in the flight pose (rasterised: cell centres transformed, then floored; exact for 90 degree
  // multiples and integer slides). Cells that leave the grid are dropped (they never matter for collision).
  flightCells(w, h, d) {
    const out = [], p = [0, 0, 0];
    for (const c of this.cells) {
      transformPoint([c[0] + 0.5, c[1] + 0.5, c[2] + 0.5], this, p);
      const x = Math.floor(p[0] + 1e-6), y = Math.floor(p[1] + 1e-6), z = Math.floor(p[2] + 1e-6);
      if (x < 0 || y < 0 || z < 0 || x >= w || y >= h || z >= d) continue;
      out.push([x, y, z, this.flightId || c[3], c[4]]);
    }
    return out;
  }
  // mirrored twin about x = w / 2 (angles flip sign, the axis and slide are mirrored in x)
  mirror(w, name = this.name.replace(/L$/, 'R')) {
    const m = new Part(name, this.channel, {
      pivot: [w - this.pivot[0], this.pivot[1], this.pivot[2]], axis: [-this.axis[0], this.axis[1], this.axis[2]],
      angle: -this.angle, slide: [-this.slide[0], this.slide[1], this.slide[2]], emit: this.emit, flightId: this.flightId,
    });
    for (const c of this.cells) m.cells.push([w - 1 - c[0], c[1], c[2], c[3], c[4]]);
    return m;
  }
}

export class ShipBuilder {
  constructor(name, w, h, d, opts = {}) {
    this.name = name;
    this.w = w; this.h = h; this.d = d;
    this.g = new VoxelGrid(w, h, d);
    this.emitMap = new Map();          // key -> emit code override for hull cells
    this.parts = [];
    this.interiors = [];
    this.seats = [];
    this.opts = opts;
    this.door = null;
    this.cockpit = null;
    this.spots = [];                   // grid-space mechanic spots (standing cells beside the hull)
  }
  mx(x) { return this.w - 1 - x; }
  set(x, y, z, id, emit) { this.g.set(x, y, z, id); if (emit !== undefined) this.emitMap.set(key(x, y, z), emit); return this; }
  fill(x0, y0, z0, x1, y1, z1, id, emit) {
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) this.set(x, y, z, id, emit);
    return this;
  }
  // mirrored writes (x and w-1-x)
  sset(x, y, z, id, emit) { this.set(x, y, z, id, emit); this.set(this.mx(x), y, z, id, emit); return this; }
  sfill(x0, y0, z0, x1, y1, z1, id, emit) { this.fill(x0, y0, z0, x1, y1, z1, id, emit); this.fill(this.mx(x1), y0, z0, this.mx(x0), y1, z1, id, emit); return this; }
  get(x, y, z) { return this.g.get(x, y, z); }
  // a hollow shell box: outer filled with `id`, inside carved to air
  shell(x0, y0, z0, x1, y1, z1, id, inner = 0) { this.fill(x0, y0, z0, x1, y1, z1, id); if (x1 - x0 >= 2 && y1 - y0 >= 2 && z1 - z0 >= 2) this.fill(x0 + 1, y0 + 1, z0 + 1, x1 - 1, y1 - 1, z1 - 1, inner); return this; }
  engine(x, y, z, id = B.GLOW_PANEL_BLUE) { return this.set(x, y, z, id, EMIT.ENGINE); }
  sengine(x, y, z, id = B.GLOW_PANEL_BLUE) { return this.sset(x, y, z, id, EMIT.ENGINE); }
  nav(x, y, z, id) { return this.set(x, y, z, id, EMIT.NAV); }
  // red to port (min x), green to starboard (max x)
  navPair(x, y, z) { this.set(x, y, z, B.PANEL_RED, EMIT.NAV); this.set(this.mx(x), y, z, B.NEON_GREEN, EMIT.NAV); return this; }
  landingLight(x, y, z, id = B.GLOW_PANEL) { return this.set(x, y, z, id, EMIT.LANDING); }
  slandingLight(x, y, z, id = B.GLOW_PANEL) { return this.sset(x, y, z, id, EMIT.LANDING); }
  lamp(x, y, z, id = B.GLOW_PANEL) { return this.set(x, y, z, id, EMIT.LAMP); }
  seat(x, y, z, id = SEAT) { this.set(x, y, z, id); this.seats.push([x, y, z]); return this; }
  sseat(x, y, z, id = SEAT) { this.seat(x, y, z, id); this.seat(this.mx(x), y, z, id); return this; }
  // walkable interior box (exclusive upper bounds), y0 = floor top (feet level)
  interior(x0, y0, z0, x1, y1, z1) { this.interiors.push({ x0, y0, z0, x1, y1, z1 }); return this; }
  // boarding door: inner = standing cell just inside, outer = standing cell on the ground outside (feet cells),
  // cells = the opening cells sealed while the door is closed, side = outward unit vector [dx, dz]
  setDoor(inner, outer, side, cells) { this.door = { inner, outer, side, cells }; return this; }
  setCockpit(seat, console, glass) { this.cockpit = { seat, console, glass }; return this; }
  spot(x, y, z) { this.spots.push([x, y, z]); return this; }
  part(name, channel, xf) { const p = new Part(name, channel, xf); this.parts.push(p); return p; }
  // adds the mirrored twin of a part (call after filling it)
  mirrorPart(p) { const m = p.mirror(this.w); this.parts.push(m); return m; }
  // replace every cell equal to `from` at depth z with `to` (panel seam ring)
  seamRing(z, from, to) { for (let x = 0; x < this.w; x++) for (let y = 0; y < this.h; y++) if (this.g.get(x, y, z) === from) this.g.set(x, y, z, to); return this; }
  seamRings(z0, z1, step, from, to) { for (let z = z0; z <= z1; z += step) this.seamRing(z, from, to); return this; }
  // a straight boarding ramp of half steps from the ground (y 0) up to a sill at height `sill` (2 or 3), starting at
  // the cell next to the door and running outward along `dir` ([dx, dz]) for 2 * sill - 1 half steps. Returns the
  // part; the flight pose swings the ramp up about the sill hinge so it seals the opening.
  ramp(name, x, z, dir, sill, width, along, id, stepId = STEP) {
    // along = [ax, az] unit vector across the door (the door is `width` cells wide)
    const [dx, dz] = dir, [ax, az] = along;
    const n = sill * 2 - 1;                       // columns
    const hingeAxis = dz === 0 ? [0, 0, 1] : [1, 0, 0];
    const sign = (dx + dz) > 0 ? 1 : -1;
    // rotate the ramp up (away from the ground) about the sill edge; the sign depends on which side it hangs
    const angle = hingeAxis[2] ? -sign * Math.PI / 2 : sign * Math.PI / 2;
    const pivot = [x + (dx > 0 ? 0 : dx < 0 ? 1 : 0.5), sill, z + (dz > 0 ? 0 : dz < 0 ? 1 : 0.5)];
    const p = this.part(name, CH.DOOR, { pivot, axis: hingeAxis, angle, flightId: id });
    for (let k = 0; k < n; k++) {
      const top = sill - 0.5 * (k + 1);           // height of this column's top, nearest the door first
      for (let wi = 0; wi < width; wi++) {
        const cx = x + dx * k + ax * wi, cz = z + dz * k + az * wi;
        const full = Math.floor(top), half = top !== full;
        for (let y = 0; y < full; y++) p.set(cx, y, cz, id);
        if (half) p.set(cx, full, cz, stepId);
      }
    }
    return p;
  }

  build() {
    const { w, h, d } = this;
    const hull = this.g;
    const landed = new VoxelGrid(w, h, d), closed = new VoxelGrid(w, h, d), flight = new VoxelGrid(w, h, d);
    landed.data.set(hull.data); closed.data.set(hull.data); flight.data.set(hull.data);
    for (const p of this.parts) {
      for (const c of p.cells) if (c[0] >= 0 && c[1] >= 0 && c[2] >= 0 && c[0] < w && c[1] < h && c[2] < d) {
        landed.set(c[0], c[1], c[2], c[3]);
        if (p.channel !== CH.DOOR) closed.set(c[0], c[1], c[2], c[3]);
      }
      for (const c of p.flightCells(w, h, d)) {
        flight.set(c[0], c[1], c[2], c[3]);
        if (p.channel === CH.DOOR) closed.set(c[0], c[1], c[2], c[3]);
      }
    }
    // sealed doorways: the opening cells are solid in the closed and flight grids whatever the parts rasterise to
    const o = this.opts, sealId = o.seal || B.DURASTEEL_DARK;
    if (this.door && this.door.cells) for (const [x, y, z] of this.door.cells) { closed.set(x, y, z, sealId); flight.set(x, y, z, sealId); }
    const anim = {};
    for (const p of this.parts) anim[CHANNEL_NAMES[p.channel]] = (anim[CHANNEL_NAMES[p.channel]] || 0) + p.cells.length;
    return {
      name: this.name, cls: o.cls || this.name, family: o.family || o.cls || this.name, w, h, d, length: d,
      hull, parts: this.parts, grid: landed, gridClosed: closed, gridFlight: flight, emitMap: this.emitMap,
      interiors: this.interiors, door: this.door, cockpit: this.cockpit, seats: this.seats, spots: this.spots,
      primary: o.primary, seam: o.seam, accent: o.accent, asym: !!o.asym, compact: !!o.compact, anim,
      speed: o.speed || 28, engineHz: o.engineHz || 90, gain: o.gain ?? 0.8, hum: o.hum || 'saw', sealId,
      capacity: o.capacity || this.seats.length, label: o.label || this.name,
    };
  }
}

// emit code of a cell of a model (hull cells: override map, else 1 for emissive blocks)
export function emitCodeOf(model, x, y, z, id) {
  const e = model.emitMap.get(key(x, y, z));
  if (e !== undefined) return e;
  return BLOCKS[id].emit > 0 ? EMIT.LAMP : EMIT.NONE;
}
