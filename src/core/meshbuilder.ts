import * as THREE from 'three';

const tmpA = new THREE.Vector3();
const tmpB = new THREE.Vector3();
const tmpN = new THREE.Vector3();

/**
 * Accumulates vertex-coloured geometry, so a whole ship hull can be lofted from
 * station curves and end up as one draw call. Quads get flat face normals;
 * `addSurface` builds a shared-vertex grid and smooth-shades it.
 */
export class MeshBuilder {
  private positions: number[] = [];
  private normals: number[] = [];
  private colors: number[] = [];
  private uvs: number[] = [];
  private indices: number[] = [];
  private color = new THREE.Color();
  private groups: { start: number; count: number; materialIndex: number }[] = [];
  private currentMaterial = 0;
  private groupStart = 0;
  private tint = 1;
  private white = new THREE.Color(0xffffff);

  get vertexCount(): number {
    return this.positions.length / 3;
  }

  /**
   * Switches the material slot for everything added from here on. The builder
   * emits geometry groups so one merged mesh can carry planking, iron, rope and
   * brass, each with its own PBR texture set.
   */
  setMaterial(materialIndex: number): void {
    if (materialIndex === this.currentMaterial) return;
    this.closeGroup();
    this.currentMaterial = materialIndex;
    this.groupStart = this.indices.length;
  }

  private closeGroup(): void {
    const count = this.indices.length - this.groupStart;
    if (count > 0) {
      this.groups.push({ start: this.groupStart, count, materialIndex: this.currentMaterial });
    }
  }

  /**
   * How strongly the per-vertex palette colours tint the material's texture.
   * Textured geometry wants a light touch (the albedo already carries the wood
   * tone), while untextured props use the colours at full strength.
   */
  setTint(strength: number): void {
    this.tint = strength;
  }

  private pushVertex(p: THREE.Vector3, n: THREE.Vector3, c: THREE.Color, u: number, v: number): number {
    const index = this.vertexCount;
    this.positions.push(p.x, p.y, p.z);
    this.normals.push(n.x, n.y, n.z);
    if (this.tint < 1) {
      this.colors.push(
        this.white.r + (c.r - this.white.r) * this.tint,
        this.white.g + (c.g - this.white.g) * this.tint,
        this.white.b + (c.b - this.white.b) * this.tint,
      );
    } else {
      this.colors.push(c.r, c.g, c.b);
    }
    this.uvs.push(u, v);
    return index;
  }

  addTriangle(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, color: THREE.ColorRepresentation): void {
    tmpA.subVectors(b, a);
    tmpB.subVectors(c, a);
    tmpN.crossVectors(tmpA, tmpB).normalize();
    this.color.set(color);
    // UVs are in metres so textures tile at a consistent real-world density.
    const width = tmpA.length();
    const height = tmpB.length();
    const i0 = this.pushVertex(a, tmpN, this.color, 0, 0);
    const i1 = this.pushVertex(b, tmpN, this.color, width, 0);
    const i2 = this.pushVertex(c, tmpN, this.color, width, height);
    this.indices.push(i0, i1, i2);
  }

  /** Counter-clockwise quad a-b-c-d as seen from the front face. */
  addQuad(
    a: THREE.Vector3,
    b: THREE.Vector3,
    c: THREE.Vector3,
    d: THREE.Vector3,
    color: THREE.ColorRepresentation,
  ): void {
    tmpA.subVectors(b, a);
    tmpB.subVectors(d, a);
    tmpN.crossVectors(tmpA, tmpB).normalize();
    this.color.set(color);
    const width = tmpA.length();
    const height = tmpB.length();
    const i0 = this.pushVertex(a, tmpN, this.color, 0, 0);
    const i1 = this.pushVertex(b, tmpN, this.color, width, 0);
    const i2 = this.pushVertex(c, tmpN, this.color, width, height);
    const i3 = this.pushVertex(d, tmpN, this.color, 0, height);
    this.indices.push(i0, i1, i2, i0, i2, i3);
  }

  /**
   * Smooth-shaded quad grid from `rows` of equal-length vertex arrays.
   * `colorFn` receives the grid coordinates so planking stripes are easy.
   */
  addSurface(
    rows: THREE.Vector3[][],
    colorFn: (row: number, col: number, point: THREE.Vector3) => THREE.ColorRepresentation,
    flip = false,
    skip?: (row: number, col: number) => boolean,
    /** Overrides the arc-length UVs, in metres. Useful when a seam must stay straight. */
    uvFn?: (row: number, col: number, arcU: number, arcV: number) => [number, number],
  ): void {
    const rowCount = rows.length;
    const colCount = rows[0].length;
    const base = this.vertexCount;
    const zero = new THREE.Vector3();

    // UVs follow arc length along the grid, in metres: planking on a curved hull
    // then keeps an even board width instead of stretching towards the bow.
    const u: number[][] = [];
    const v: number[][] = [];
    for (let r = 0; r < rowCount; r++) {
      u.push(new Array(colCount).fill(0));
      v.push(new Array(colCount).fill(0));
    }
    for (let r = 0; r < rowCount; r++) {
      for (let c = 1; c < colCount; c++) {
        u[r][c] = u[r][c - 1] + rows[r][c].distanceTo(rows[r][c - 1]);
      }
    }
    for (let c = 0; c < colCount; c++) {
      for (let r = 1; r < rowCount; r++) {
        v[r][c] = v[r - 1][c] + rows[r][c].distanceTo(rows[r - 1][c]);
      }
    }

    for (let r = 0; r < rowCount; r++) {
      for (let c = 0; c < colCount; c++) {
        this.color.set(colorFn(r, c, rows[r][c]));
        const [uu, vv] = uvFn ? uvFn(r, c, u[r][c], v[r][c]) : [u[r][c], v[r][c]];
        this.pushVertex(rows[r][c], zero, this.color, uu, vv);
      }
    }

    for (let r = 0; r < rowCount - 1; r++) {
      for (let c = 0; c < colCount - 1; c++) {
        if (skip?.(r, c)) continue;
        const i0 = base + r * colCount + c;
        const i1 = base + r * colCount + c + 1;
        const i2 = base + (r + 1) * colCount + c + 1;
        const i3 = base + (r + 1) * colCount + c;
        if (flip) this.indices.push(i0, i2, i1, i0, i3, i2);
        else this.indices.push(i0, i1, i2, i0, i2, i3);
      }
    }
  }

  /** Axis-aligned box, optionally with a per-face colour tweak. */
  addBox(center: THREE.Vector3Like, size: THREE.Vector3Like, color: THREE.ColorRepresentation, shade = 0.12): void {
    const hx = size.x / 2;
    const hy = size.y / 2;
    const hz = size.z / 2;
    const v = (dx: number, dy: number, dz: number) =>
      new THREE.Vector3(center.x + dx * hx, center.y + dy * hy, center.z + dz * hz);
    const base = new THREE.Color(color);
    const top = base.clone().multiplyScalar(1 + shade);
    const bottom = base.clone().multiplyScalar(1 - shade);
    const side = base.clone().multiplyScalar(1 - shade * 0.4);

    this.addQuad(v(-1, 1, -1), v(-1, 1, 1), v(1, 1, 1), v(1, 1, -1), top);
    this.addQuad(v(-1, -1, 1), v(-1, -1, -1), v(1, -1, -1), v(1, -1, 1), bottom);
    this.addQuad(v(-1, -1, 1), v(1, -1, 1), v(1, 1, 1), v(-1, 1, 1), side);
    this.addQuad(v(1, -1, -1), v(-1, -1, -1), v(-1, 1, -1), v(1, 1, -1), side);
    this.addQuad(v(1, -1, 1), v(1, -1, -1), v(1, 1, -1), v(1, 1, 1), base);
    this.addQuad(v(-1, -1, -1), v(-1, -1, 1), v(-1, 1, 1), v(-1, 1, -1), base);
  }

  /**
   * Merges an existing (already positioned) geometry, painting it flat.
   * `uvScale` converts the source geometry's 0..1 UVs into metres - for a
   * cylinder that is [circumference, length].
   */
  addGeometry(
    geometry: THREE.BufferGeometry,
    color?: THREE.ColorRepresentation,
    matrix?: THREE.Matrix4,
    uvScale?: [number, number],
  ): void {
    const source = geometry.index ? geometry.toNonIndexed() : geometry;
    const pos = source.attributes.position as THREE.BufferAttribute;
    const nrm = source.attributes.normal as THREE.BufferAttribute | undefined;
    const col = source.attributes.color as THREE.BufferAttribute | undefined;
    const srcUv = source.attributes.uv as THREE.BufferAttribute | undefined;
    const scaleU = uvScale?.[0] ?? 1;
    const scaleV = uvScale?.[1] ?? 1;
    const normalMatrix = matrix ? new THREE.Matrix3().getNormalMatrix(matrix) : null;
    const p = new THREE.Vector3();
    const n = new THREE.Vector3(0, 1, 0);
    const base = this.vertexCount;

    for (let i = 0; i < pos.count; i++) {
      p.fromBufferAttribute(pos, i);
      if (matrix) p.applyMatrix4(matrix);
      if (nrm) {
        n.fromBufferAttribute(nrm, i);
        if (normalMatrix) n.applyMatrix3(normalMatrix).normalize();
      }
      if (color !== undefined) this.color.set(color);
      else if (col) this.color.setRGB(col.getX(i), col.getY(i), col.getZ(i));
      else this.color.setRGB(1, 1, 1);
      const u = srcUv ? srcUv.getX(i) * scaleU : 0;
      const v = srcUv ? srcUv.getY(i) * scaleV : 0;
      this.pushVertex(p, n, this.color, u, v);
    }
    for (let i = 0; i < pos.count; i++) this.indices.push(base + i);
    if (source !== geometry) source.dispose();
  }

  /** Smooths normals over the whole builder (call before build for organic shapes). */
  build(smooth = false): THREE.BufferGeometry {
    this.closeGroup();
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(this.positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(this.normals, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(this.colors, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(this.uvs, 2));
    geometry.setIndex(this.indices);
    if (smooth) geometry.computeVertexNormals();
    else {
      // addSurface leaves zeroed normals; fix those up without flattening quads.
      const normals = geometry.attributes.normal as THREE.BufferAttribute;
      let needsCompute = false;
      for (let i = 0; i < normals.count; i++) {
        if (normals.getX(i) === 0 && normals.getY(i) === 0 && normals.getZ(i) === 0) {
          needsCompute = true;
          break;
        }
      }
      if (needsCompute) {
        const kept = normals.clone();
        geometry.computeVertexNormals();
        const computed = geometry.attributes.normal as THREE.BufferAttribute;
        for (let i = 0; i < kept.count; i++) {
          const hadNormal = kept.getX(i) !== 0 || kept.getY(i) !== 0 || kept.getZ(i) !== 0;
          if (hadNormal) computed.setXYZ(i, kept.getX(i), kept.getY(i), kept.getZ(i));
        }
        computed.needsUpdate = true;
      }
    }
    /*
     * Always emit groups.
     *
     * A mesh holding an *array* of materials draws nothing whatsoever if its
     * geometry has no groups: the renderer walks `geometry.groups` to decide which
     * slot each run of indices belongs to, so no groups means no draw calls at all,
     * whatever the vertices say. Groups used to be emitted only when two or more
     * slots were used, on the reasoning that a single-material prop should keep to
     * one draw call - but a single group *is* one draw call, and the meshes that
     * skipped it and were then handed the full ship material array came out
     * completely invisible while looking perfectly healthy from script: correct
     * vertices, correct transform, `visible` true, in the scene graph. All four
     * cannons went that way, along with a dozen other fittings.
     *
     * Geometry given one plain material ignores groups entirely, so this is free
     * there too.
     */
    for (const group of this.groups) geometry.addGroup(group.start, group.count, group.materialIndex);

    geometry.computeBoundingSphere();
    return geometry;
  }
}
