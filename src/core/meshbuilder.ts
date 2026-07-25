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

  get vertexCount(): number {
    return this.positions.length / 3;
  }

  private pushVertex(p: THREE.Vector3, n: THREE.Vector3, c: THREE.Color, u: number, v: number): number {
    const index = this.vertexCount;
    this.positions.push(p.x, p.y, p.z);
    this.normals.push(n.x, n.y, n.z);
    this.colors.push(c.r, c.g, c.b);
    this.uvs.push(u, v);
    return index;
  }

  addTriangle(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, color: THREE.ColorRepresentation): void {
    tmpA.subVectors(b, a);
    tmpB.subVectors(c, a);
    tmpN.crossVectors(tmpA, tmpB).normalize();
    this.color.set(color);
    const i0 = this.pushVertex(a, tmpN, this.color, 0, 0);
    const i1 = this.pushVertex(b, tmpN, this.color, 1, 0);
    const i2 = this.pushVertex(c, tmpN, this.color, 1, 1);
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
    const i0 = this.pushVertex(a, tmpN, this.color, 0, 0);
    const i1 = this.pushVertex(b, tmpN, this.color, 1, 0);
    const i2 = this.pushVertex(c, tmpN, this.color, 1, 1);
    const i3 = this.pushVertex(d, tmpN, this.color, 0, 1);
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
  ): void {
    const rowCount = rows.length;
    const colCount = rows[0].length;
    const base = this.vertexCount;
    const zero = new THREE.Vector3();

    for (let r = 0; r < rowCount; r++) {
      for (let c = 0; c < colCount; c++) {
        this.color.set(colorFn(r, c, rows[r][c]));
        this.pushVertex(rows[r][c], zero, this.color, c / (colCount - 1), r / (rowCount - 1));
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

  /** Merges an existing (already positioned) geometry, painting it flat. */
  addGeometry(geometry: THREE.BufferGeometry, color?: THREE.ColorRepresentation, matrix?: THREE.Matrix4): void {
    const source = geometry.index ? geometry.toNonIndexed() : geometry;
    const pos = source.attributes.position as THREE.BufferAttribute;
    const nrm = source.attributes.normal as THREE.BufferAttribute | undefined;
    const col = source.attributes.color as THREE.BufferAttribute | undefined;
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
      this.pushVertex(p, n, this.color, 0, 0);
    }
    for (let i = 0; i < pos.count; i++) this.indices.push(base + i);
    if (source !== geometry) source.dispose();
  }

  /** Smooths normals over the whole builder (call before build for organic shapes). */
  build(smooth = false): THREE.BufferGeometry {
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
    geometry.computeBoundingSphere();
    return geometry;
  }
}
