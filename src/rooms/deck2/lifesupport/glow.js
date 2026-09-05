// Animated emitter atlas — one mesh + one material carries every animated emissive piece of a room
// (rotating beacon drums, breathing status caps, a chasing runway, flickering board tiles, coolant
// flow sleeves), so motion lighting costs ONE draw call however many effects a room runs.
//
// Each piece is merged geometry whose UVs address one ROW of a small RGBA DataTexture used as the
// material's emissive map (emissive = white, so the map carries the colour):
//   - a STATIC row holds a pattern along u (sine ramp, pulse, beacon sector, flow stripes) and is
//     animated by scrolling `emissiveMap.offset.x` at `rate` texture widths per second. A piece's u
//     is its phase (a cap), or spans a range (a drum's circumference, a sleeve's length) so the
//     pattern travels across it;
//   - a LIVE row is uniform and rewritten per frame (colour × brightness) for blinks and flicker.
// Rows are two texels tall and sampled at their centre, so linear filtering never bleeds between
// effects. update() writes into a preallocated buffer — nothing allocates per frame.
// Shared by S5's two rooms (lifesupport, escape); `_shared/` was off-limits this round — move it
// there when convenient.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

const W = 256;
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const smoothstep = (a, b, x) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
export const frac = (x) => x - Math.floor(x);
/** sRGB byte triplet from a THREE.Color or a hex number (the atlas texture is sRGB) */
export const rgb = (c) => {
  const h = typeof c === "number" ? c : c.getHex();
  return [(h >> 16) & 255, (h >> 8) & 255, h & 255];
};

export class GlowAtlas {
  constructor(rows, { intensity = 1.4, rate = 0.2 } = {}) {
    this.rate = rate;
    this.h = rows * 2;
    this.data = new Uint8Array(W * this.h * 4);
    this.last = new Float32Array(rows).fill(-1); // last brightness written per live row
    const tex = new THREE.DataTexture(this.data, W, this.h, THREE.RGBAFormat, THREE.UnsignedByteType);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    tex.needsUpdate = true;
    this.tex = tex;
    // matte: at 0.5 a status-board tile mirrored the nearest down-spot into a blown white square,
    // and floor-level emitters on the camera–key axis picked up a glitter path
    this.material = new THREE.MeshStandardMaterial({
      color: 0x0a0b0d,
      emissive: 0xffffff,
      emissiveMap: tex,
      emissiveIntensity: intensity,
      roughness: 0.9,
      metalness: 0,
      envMapIntensity: 0.2,
    });
    this.geos = [];
    this.mesh = null;
    this.dirty = false;
  }

  /** v coordinate at the centre of a row */
  v(row) {
    return (row * 2 + 1) / this.h;
  }

  texel(row, i, r, g, b) {
    for (let k = 0; k < 2; k++) {
      const o = ((row * 2 + k) * W + i) * 4;
      this.data[o] = r;
      this.data[o + 1] = g;
      this.data[o + 2] = b;
      this.data[o + 3] = 255;
    }
  }

  /** static row: brightness fn(u in [0,1)) applied to an sRGB byte triplet */
  pattern(row, c, fn) {
    for (let i = 0; i < W; i++) {
      const b = clamp01(fn((i + 0.5) / W));
      this.texel(row, i, c[0] * b, c[1] * b, c[2] * b);
    }
    this.dirty = true;
  }

  /** live row: uniform colour × brightness; call every frame (skips the upload when unchanged) */
  fill(row, c, b = 1) {
    b = clamp01(b);
    if (Math.abs(this.last[row] - b) < 1 / 255) return;
    this.last[row] = b;
    const r = c[0] * b;
    const g = c[1] * b;
    const bl = c[2] * b;
    for (let i = 0; i < W; i++) this.texel(row, i, r, g, bl);
    this.dirty = true;
  }

  /** beacon sector row: `sectors` bright arcs per texture width (a drum whose circumference spans
   *  1/sectors of the row turns at sectors × rate rev/s); arc from s0 to s0 + width of each sector */
  beaconRow(row, c, sectors, s0, width) {
    this.pattern(row, c, (u) => {
      const s = frac(sectors * u - s0);
      return 0.05 + 0.95 * smoothstep(0, 0.03, s) * (1 - smoothstep(width - 0.03, width, s));
    });
  }
  /** direction (radians about +y, three.js cylinder convention x = sin, z = cos) of the bright
   *  sector's centre at time t for a drum built with addRange(row, 0, 1/sectors) */
  beaconAngle(t, sectors, s0, width) {
    return Math.PI * 2 * frac(s0 + width / 2 - sectors * frac(this.rate * t));
  }

  /** every uv → (u, row): a single-phase piece (cap, tile, strip) */
  add(geo, row, u) {
    const uv = geo.attributes.uv;
    const v = this.v(row);
    for (let i = 0; i < uv.count; i++) uv.setXY(i, u, v);
    this.geos.push(geo);
    return geo;
  }
  /** existing uv.x (0..1, e.g. around a cylinder) → [u0, u1] of the row */
  addRange(geo, row, u0, u1) {
    const uv = geo.attributes.uv;
    const v = this.v(row);
    for (let i = 0; i < uv.count; i++) uv.setXY(i, u0 + (u1 - u0) * uv.getX(i), v);
    this.geos.push(geo);
    return geo;
  }
  /** existing uv.y (0..1 along a cylinder's axis) → [u0, u1] of the row: flow along the axis */
  addAxial(geo, row, u0, u1) {
    const uv = geo.attributes.uv;
    const v = this.v(row);
    for (let i = 0; i < uv.count; i++) uv.setXY(i, u0 + (u1 - u0) * uv.getY(i), v);
    this.geos.push(geo);
    return geo;
  }
  box(row, u, sx, sy, sz, pos, yaw = 0) {
    const g = new THREE.BoxGeometry(sx, sy, sz);
    if (yaw) g.rotateY(yaw);
    g.translate(pos[0], pos[1], pos[2]);
    return this.add(g, row, u);
  }

  build(group) {
    const geo = mergeGeometries(this.geos, false);
    this.geos.length = 0;
    const mesh = new THREE.Mesh(geo, this.material);
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    group.add(mesh);
    this.mesh = mesh;
    return mesh;
  }

  /** per frame: scroll the static rows, upload if a live row changed */
  update(t) {
    this.tex.offset.x = frac(t * this.rate);
    if (this.dirty) {
      this.tex.needsUpdate = true;
      this.dirty = false;
    }
  }

  dispose() {
    this.tex.dispose();
    this.material.dispose();
    if (this.mesh) this.mesh.geometry.dispose();
  }
}
