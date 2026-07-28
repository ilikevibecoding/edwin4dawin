import * as THREE from 'three';

/**
 * Geometry accumulator for the gun toolkit.
 *
 * Every part writes into a shared vertex soup through a transform stack rather
 * than producing its own `BufferGeometry`. A rifle is two hundred parts; two
 * hundred geometries would be two hundred draw calls and two hundred objects
 * for the animation system to walk, so the toolkit merges as it authors and the
 * finished weapon is a handful of meshes.
 *
 * Conventions, shared by every primitive in `Prim.ts`:
 *
 *  - **Metres, +X right, +Y up, -Z forward** (the muzzle points along -Z), so
 *    the local frame matches camera space and a weapon can be posed with a
 *    translation and no basis change.
 *  - **UVs are metres of surface**, scaled by `uvScale` on the way in. The
 *    material library authors every texture at a physical size, so a part that
 *    lays out its UVs in metres lands at the correct texel density with no
 *    per-part tuning.
 *  - **Colour is a linear tint**, multiplied into the material's albedo by the
 *    vertex-colour path. This is what lets one merged mesh carry a parkerised
 *    receiver, a phosphate barrel and an anodised rail, and it is where the
 *    baked ambient occlusion lands as well.
 */

const _m = new THREE.Matrix4();
const _n = new THREE.Matrix3();
const _v = new THREE.Vector3();

/**
 * Tint calibration; see {@link Mesher.tint}.
 *
 * `TINT_REF` is the linear luminance an authored hex has to carry to come out
 * as a multiplier of one. It sits well above the receiver entry of the palette,
 * which means the palette *darkens* the library's material — deliberately.
 * `gun_metal` is authored fully metallic, so its albedo map is F0 and it is
 * pitched for bare steel; a hard-anodised receiver reflects about half that,
 * and without the reduction the whole weapon comes back as light grey with no
 * blacks in it whatever the light rig is doing.
 */
export const TINT_REF = 0.08;
/** Compresses the ratio, so a palette spanning 50:1 spans about 6:1 in albedo. */
export const TINT_GAMMA = 0.55;
export const TINT_MIN = 0.3;
export const TINT_MAX = 2.3;
/** Per-channel ceiling, so a saturated hue cannot push an F0 past one. */
export const TINT_CEIL = 2.7;

export class Mesher {
  readonly pos: number[] = [];
  readonly nrm: number[] = [];
  readonly uv: number[] = [];
  readonly col: number[] = [];
  readonly idx: number[] = [];

  /** Multiplies UVs on the way in; set from the material's authored tile size. */
  uvScale = 1;

  private readonly matrix = new THREE.Matrix4();
  private readonly normalMatrix = new THREE.Matrix3();
  private readonly stack: THREE.Matrix4[] = [];
  private depth = 0;
  private tintR = 1;
  private tintG = 1;
  private tintB = 1;
  private aoValue = 1;

  get vertexCount(): number {
    return this.pos.length / 3;
  }

  get triangleCount(): number {
    return this.idx.length / 3;
  }

  get empty(): boolean {
    return this.idx.length === 0;
  }

  /* ---------------------------- transform ------------------------------ */

  push(): this {
    if (this.depth === this.stack.length) this.stack.push(new THREE.Matrix4());
    this.stack[this.depth].copy(this.matrix);
    this.depth++;
    return this;
  }

  pop(): this {
    if (this.depth === 0) return this;
    this.depth--;
    this.matrix.copy(this.stack[this.depth]);
    this.normalMatrix.setFromMatrix4(this.matrix);
    return this;
  }

  /** Replaces the current transform. Rarely wanted; `push`/`pop` is the norm. */
  setMatrix(m: THREE.Matrix4): this {
    this.matrix.copy(m);
    this.normalMatrix.setFromMatrix4(this.matrix);
    return this;
  }

  translate(x: number, y: number, z: number): this {
    this.matrix.multiply(_m.makeTranslation(x, y, z));
    this.normalMatrix.setFromMatrix4(this.matrix);
    return this;
  }

  rotateX(a: number): this {
    this.matrix.multiply(_m.makeRotationX(a));
    this.normalMatrix.setFromMatrix4(this.matrix);
    return this;
  }

  rotateY(a: number): this {
    this.matrix.multiply(_m.makeRotationY(a));
    this.normalMatrix.setFromMatrix4(this.matrix);
    return this;
  }

  rotateZ(a: number): this {
    this.matrix.multiply(_m.makeRotationZ(a));
    this.normalMatrix.setFromMatrix4(this.matrix);
    return this;
  }

  scale(x: number, y = x, z = x): this {
    this.matrix.multiply(_m.makeScale(x, y, z));
    this.normalMatrix.setFromMatrix4(this.matrix);
    return this;
  }

  /* ------------------------------ shading ------------------------------ */

  /**
   * Part colour, as the sRGB hex the part would read as under neutral light.
   *
   * It is applied as a *modulation* of the material rather than as the albedo
   * itself, because the material underneath is already a gun finish: parkerised
   * steel is 0.073 linear at 0.9 metalness, and multiplying that by a literal
   * 0x2d2f33 (0.026 linear) leaves a metal with an F0 of 0.002, which renders
   * as a hole in the screen.
   *
   * So the hex is read as *how much darker or lighter than the stock finish*
   * this part is. Luminance is taken as a ratio against {@link TINT_REF} and
   * compressed by {@link TINT_GAMMA} — the palette spans black polymer to bare
   * steel, fifty to one in the authored hex, which is a real ratio for two
   * reflectances but not for two parts of the same gun photographed together.
   * The hue is carried through at full strength on top, which is what lets
   * brass and copper read as brass and copper against a steel bolt face.
   */
  tint(hex: number): this {
    _color.setHex(hex);
    const lum = _color.r * 0.2126 + _color.g * 0.7152 + _color.b * 0.0722;
    if (lum <= 1e-6) {
      this.tintR = this.tintG = this.tintB = TINT_MIN;
      return this;
    }
    const k = Math.min(TINT_MAX, Math.max(TINT_MIN, (lum / TINT_REF) ** TINT_GAMMA)) / lum;
    this.tintR = Math.min(TINT_CEIL, _color.r * k);
    this.tintG = Math.min(TINT_CEIL, _color.g * k);
    this.tintB = Math.min(TINT_CEIL, _color.b * k);
    return this;
  }

  /** Hand-placed occlusion, multiplied on top of the baked term. */
  ao(value: number): this {
    this.aoValue = value;
    return this;
  }

  /* ------------------------------ emission ----------------------------- */

  /** Appends one vertex in the current frame and returns its index. */
  vertex(
    x: number,
    y: number,
    z: number,
    nx: number,
    ny: number,
    nz: number,
    u: number,
    v: number,
  ): number {
    _v.set(x, y, z).applyMatrix4(this.matrix);
    this.pos.push(_v.x, _v.y, _v.z);
    _v.set(nx, ny, nz).applyMatrix3(this.normalMatrix);
    const len = Math.hypot(_v.x, _v.y, _v.z) || 1;
    this.nrm.push(_v.x / len, _v.y / len, _v.z / len);
    this.uv.push(u * this.uvScale, v * this.uvScale);
    const ao = this.aoValue;
    this.col.push(this.tintR * ao, this.tintG * ao, this.tintB * ao);
    return this.pos.length / 3 - 1;
  }

  tri(a: number, b: number, c: number): void {
    this.idx.push(a, b, c);
  }

  quad(a: number, b: number, c: number, d: number): void {
    this.idx.push(a, b, c, a, c, d);
  }

  /** Wraps a strip of `n` vertex pairs into a quad band; `close` joins the ends. */
  band(first: number, n: number, close: boolean): void {
    const last = close ? n : n - 1;
    for (let i = 0; i < last; i++) {
      const a = first + i * 2;
      const b = first + ((i + 1) % n) * 2;
      this.quad(a, a + 1, b + 1, b);
    }
  }

  /* ------------------------------- output ------------------------------ */

  toGeometry(name: string): THREE.BufferGeometry {
    const geo = new THREE.BufferGeometry();
    geo.name = name;
    geo.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(this.nrm, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    geo.setIndex(this.idx);
    geo.computeBoundingSphere();
    geo.computeBoundingBox();
    return geo;
  }
}

const _color = new THREE.Color();
