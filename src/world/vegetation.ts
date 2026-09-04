import * as THREE from 'three';
import { Rng, hash2 } from '../core/seed';
import { perlin2, smoothstep } from '../core/noise';
import { Zone, type WorldMap } from './map';

/** Frond cut-out texture drawn procedurally (no external assets). */
function frondTexture(): THREE.CanvasTexture {
  const w = 128, h = 512;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, w, h);
  // rachis
  ctx.strokeStyle = '#6b7a3a';
  ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(w / 2, h); ctx.lineTo(w / 2, 8); ctx.stroke();
  // leaflets
  for (let i = 0; i < 46; i++) {
    const t = i / 46;
    const y = h - 20 - t * (h - 40);
    const len = (w / 2 - 4) * (0.45 + 0.55 * Math.sin(Math.PI * Math.min(1, t * 1.15)));
    const g = 60 + Math.round(40 * Math.sin(t * 7 + i));
    ctx.fillStyle = `rgb(${40 + (i % 3) * 8}, ${110 + g * 0.6}, ${40 + (i % 5) * 5})`;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(w / 2, y);
      ctx.quadraticCurveTo(w / 2 + side * len * 0.5, y - 18, w / 2 + side * len, y - 34 + 6 * Math.sin(i));
      ctx.quadraticCurveTo(w / 2 + side * len * 0.55, y - 6, w / 2, y + 4);
      ctx.fill();
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function palmGeometry(rng: Rng): { trunk: THREE.BufferGeometry; fronds: THREE.BufferGeometry } {
  // trunk: gently curved tapered tube
  const segs = 5, radial = 6;
  const pos: number[] = [], nrm: number[] = [], uv: number[] = [], idx: number[] = [];
  const lean = rng.range(0.02, 0.12), leanDir = rng.range(0, Math.PI * 2);
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const y = t;
    const bend = lean * t * t;
    const cx = Math.cos(leanDir) * bend, cz = Math.sin(leanDir) * bend;
    const r = 0.045 * (1 - 0.35 * t) * (1 + 0.15 * Math.sin(t * 20));
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      pos.push(cx + Math.cos(a) * r, y, cz + Math.sin(a) * r);
      nrm.push(Math.cos(a), 0, Math.sin(a));
      uv.push(j / radial, t);
    }
  }
  for (let i = 0; i < segs; i++) for (let j = 0; j < radial; j++) {
    const a = i * (radial + 1) + j, b = a + radial + 1;
    idx.push(a, b, a + 1, a + 1, b, b + 1);
  }
  const trunk = new THREE.BufferGeometry();
  trunk.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  trunk.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  trunk.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  trunk.setIndex(idx);
  // fronds: n bent strips radiating from the top (which is at (cx, 1, cz))
  const top = new THREE.Vector3(Math.cos(leanDir) * lean, 1.0, Math.sin(leanDir) * lean);
  const fp: number[] = [], fn: number[] = [], fu: number[] = [], fi: number[] = [];
  const n = rng.int(8, 11);
  let v = 0;
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + rng.range(-0.2, 0.2);
    const droop = rng.range(0.35, 0.7);
    const len = rng.range(0.42, 0.58);
    const width = 0.13;
    const segsF = 4;
    for (let i = 0; i <= segsF; i++) {
      const t = i / segsF;
      // arc: rises slightly then droops
      const r = len * t;
      const yv = top.y + 0.18 * Math.sin(t * Math.PI * 0.8) - droop * t * t;
      const px = top.x + Math.cos(a) * r, pz = top.z + Math.sin(a) * r;
      const wx = -Math.sin(a) * width * (1 - t * 0.2), wz = Math.cos(a) * width * (1 - t * 0.2);
      fp.push(px - wx, yv, pz - wz, px + wx, yv, pz + wz);
      fn.push(0, 1, 0, 0, 1, 0);
      fu.push(0, 1 - t, 1, 1 - t);
      if (i > 0) {
        const b = v + i * 2;
        fi.push(b - 2, b, b - 1, b - 1, b, b + 1);
      }
    }
    v += (segsF + 1) * 2;
  }
  const fronds = new THREE.BufferGeometry();
  fronds.setAttribute('position', new THREE.Float32BufferAttribute(fp, 3));
  fronds.setAttribute('normal', new THREE.Float32BufferAttribute(fn, 3));
  fronds.setAttribute('uv', new THREE.Float32BufferAttribute(fu, 2));
  fronds.setIndex(fi);
  return { trunk, fronds };
}

/** Lumpy canopy made of displaced icosphere puffs. */
function canopyGeometry(rng: Rng, puffs: number, flat: number, detail = 1): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < puffs; i++) {
    const g = new THREE.IcosahedronGeometry(1, detail);
    const p = g.getAttribute('position') as THREE.BufferAttribute;
    const seed = rng.range(0, 100);
    for (let k = 0; k < p.count; k++) {
      const x = p.getX(k), y = p.getY(k), z = p.getZ(k);
      const d = 1 + 0.22 * perlin2(x * 2.1 + seed, y * 2.1 + z * 1.7);
      p.setXYZ(k, x * d, y * d * flat, z * d);
    }
    const s = i === 0 ? 1 : rng.range(0.55, 0.85);
    g.scale(s, s, s);
    const a = rng.range(0, Math.PI * 2), r = i === 0 ? 0 : rng.range(0.35, 0.7);
    g.translate(Math.cos(a) * r, rng.range(-0.15, 0.25) * (i === 0 ? 0 : 1), Math.sin(a) * r);
    g.computeVertexNormals();
    parts.push(g);
  }
  const merged = mergeNonIndexed(parts);
  return merged;
}

function mergeNonIndexed(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const pos: number[] = [], nrm: number[] = [];
  for (const g of geos) {
    const ng = g.index ? g.toNonIndexed() : g;
    const p = ng.getAttribute('position'), n = ng.getAttribute('normal');
    for (let i = 0; i < p.count; i++) { pos.push(p.getX(i), p.getY(i), p.getZ(i)); nrm.push(n.getX(i), n.getY(i), n.getZ(i)); }
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  out.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array((pos.length / 3) * 2), 2));
  return out;
}

function treeGeometry(rng: Rng): { trunk: THREE.BufferGeometry; canopy: THREE.BufferGeometry } {
  const trunk = new THREE.CylinderGeometry(0.05, 0.09, 0.45, 5);
  trunk.translate(0, 0.225, 0);
  const canopy = canopyGeometry(rng, rng.int(3, 4), rng.range(0.7, 0.9), 0);
  canopy.scale(0.55, 0.55, 0.55);
  canopy.translate(0, 0.72, 0);
  return { trunk, canopy };
}

function mangroveGeometry(rng: Rng): THREE.BufferGeometry {
  const canopy = canopyGeometry(rng, 2, 0.45, 0);
  canopy.scale(0.6, 0.6, 0.6);
  canopy.translate(0, 0.6, 0);
  // prop roots
  const roots: THREE.BufferGeometry[] = [canopy];
  for (let i = 0; i < 3; i++) {
    const r = new THREE.CylinderGeometry(0.02, 0.03, 0.5, 3);
    const a = (i / 4) * Math.PI * 2 + rng.range(0, 0.5);
    r.rotateZ(rng.range(-0.4, 0.4));
    r.translate(Math.cos(a) * 0.25, 0.25, Math.sin(a) * 0.25);
    roots.push(r);
  }
  return mergeNonIndexed(roots);
}

const WIND_VERT = /* glsl */ `
uniform float uTime;
uniform float uWind;
`;
const WIND_MAIN = /* glsl */ `
{
  // sway grows with height; phase from the instance position so no two plants move together
  vec3 iw = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  float phase = iw.x * 0.13 + iw.z * 0.17;
  float sway = sin(uTime * 1.3 + phase) * 0.6 + sin(uTime * 2.7 + phase * 1.9) * 0.4;
  float k = transformed.y * transformed.y * uWind * 0.06;
  transformed.x += sway * k;
  transformed.z += cos(uTime * 1.1 + phase) * k * 0.6;
}
`;

function windMaterial(base: THREE.MeshStandardMaterial, time: THREE.IUniform<number>, wind: THREE.IUniform<number>): THREE.MeshStandardMaterial {
  base.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = time;
    shader.uniforms.uWind = wind;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${WIND_VERT}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n${WIND_MAIN}`);
  };
  base.customProgramCacheKey = () => `wind-${base.uuid}`;
  return base;
}

interface Plant { x: number; y: number; z: number; s: number; rot: number; tint: THREE.Color; variant: number; }

export class Vegetation {
  readonly group = new THREE.Group();
  readonly materials: THREE.MeshStandardMaterial[] = [];
  readonly uTime = { value: 0 };
  readonly uWind = { value: 0.5 };
  counts = { palms: 0, trees: 0, mangroves: 0, shrubs: 0 };
  private readonly tiles: { mesh: THREE.InstancedMesh; cx: number; cz: number; r: number }[] = [];
  shadowDistance = 1800;
  viewDistance = 9000;

  constructor(map: WorldMap, occupied: (x: number, z: number) => boolean) {
    const rng = new Rng('vegetation');
    const frondTex = frondTexture();
    const trunkMat = windMaterial(new THREE.MeshStandardMaterial({ color: 0x8a7458, roughness: 0.9 }), this.uTime, this.uWind);
    const frondMat = windMaterial(new THREE.MeshStandardMaterial({ map: frondTex, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.75, color: 0xffffff }), this.uTime, this.uWind);
    const canopyMat = windMaterial(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85 }), this.uTime, this.uWind);
    const mangroveMat = windMaterial(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 }), this.uTime, this.uWind);
    const treeTrunkMat = new THREE.MeshStandardMaterial({ color: 0x5a4632, roughness: 0.95 });
    this.materials.push(trunkMat, frondMat, canopyMat, mangroveMat, treeTrunkMat);

    const palmVariants = [0, 1, 2, 3].map(() => palmGeometry(rng));
    const treeVariants = [0, 1, 2, 3].map(() => treeGeometry(rng));
    const mangroveVariants = [0, 1, 2].map(() => mangroveGeometry(rng));

    const palms: Plant[] = [], trees: Plant[] = [], mangroves: Plant[] = [], shrubs: Plant[] = [];
    const palmTints = ['#7fae4a', '#6b9c3d', '#8dbb55', '#5f8f36', '#9cc26a'];
    const treeTints = ['#3f7a2e', '#4d8a34', '#2f6a25', '#5f9a3c', '#6a9e45', '#3a6f2c', '#7aa64a'];
    const mangroveTints = ['#2e5a26', '#35672c', '#294f22', '#3d6f31'];

    // jittered-grid sampling per zone
    const step = 11;
    for (let z = -9500; z < 9500; z += step) {
      for (let x = -9500; x < 9500; x += step) {
        const h = hash2(Math.round(x / step), Math.round(z / step), 7);
        const jx = x + (hash2(Math.round(x / step), Math.round(z / step), 8) - 0.5) * step;
        const jz = z + (hash2(Math.round(x / step), Math.round(z / step), 9) - 0.5) * step;
        const height = map.heightAt(jx, jz);
        if (height < 0.15) continue;
        const zone = map.zoneAt(jx, jz);
        if (zone === Zone.MANGROVE) {
          if (height > 0.1 && h < 0.42) mangroves.push({ x: jx, y: height - 0.1, z: jz, s: rng.range(6, 11), rot: rng.range(0, 6.28), tint: new THREE.Color(rng.pick(mangroveTints)), variant: rng.int(0, 2) });
          continue;
        }
        if (occupied(jx, jz)) continue;
        const clump = perlin2(jx / 140, jz / 140); // clumping so trees don't look evenly distributed
        if (zone === Zone.BEACH) {
          // palms on the dune line, none on the wet sand
          if (height > 1.2 && h < 0.12 + 0.1 * clump) palms.push({ x: jx, y: height, z: jz, s: rng.range(7, 13), rot: rng.range(0, 6.28), tint: new THREE.Color(rng.pick(palmTints)), variant: rng.int(0, 3) });
        } else if (zone === Zone.PARK) {
          const p = 0.16 + 0.2 * clump;
          if (h < p * 0.75) trees.push({ x: jx, y: height, z: jz, s: rng.range(9, 17), rot: rng.range(0, 6.28), tint: new THREE.Color(rng.pick(treeTints)), variant: rng.int(0, 3) });
          else if (h < p) palms.push({ x: jx, y: height, z: jz, s: rng.range(8, 14), rot: rng.range(0, 6.28), tint: new THREE.Color(rng.pick(palmTints)), variant: rng.int(0, 3) });
          else if (h < p + 0.05) shrubs.push({ x: jx, y: height, z: jz, s: rng.range(2, 4), rot: rng.range(0, 6.28), tint: new THREE.Color(rng.pick(treeTints)), variant: rng.int(0, 3) });
        } else if (zone === Zone.RES_LOW) {
          const p = 0.13 + 0.08 * clump;
          if (h < p * 0.5) trees.push({ x: jx, y: height, z: jz, s: rng.range(8, 14), rot: rng.range(0, 6.28), tint: new THREE.Color(rng.pick(treeTints)), variant: rng.int(0, 3) });
          else if (h < p) palms.push({ x: jx, y: height, z: jz, s: rng.range(7, 12), rot: rng.range(0, 6.28), tint: new THREE.Color(rng.pick(palmTints)), variant: rng.int(0, 3) });
        } else if (zone === Zone.GOLF) {
          const p = 0.1 + 0.25 * smoothstep(0.1, 0.6, clump);
          if (h < p * 0.7) trees.push({ x: jx, y: height, z: jz, s: rng.range(9, 16), rot: rng.range(0, 6.28), tint: new THREE.Color(rng.pick(treeTints)), variant: rng.int(0, 3) });
          else if (h < p) palms.push({ x: jx, y: height, z: jz, s: rng.range(8, 13), rot: rng.range(0, 6.28), tint: new THREE.Color(rng.pick(palmTints)), variant: rng.int(0, 3) });
        } else if (zone === Zone.HOTEL || zone === Zone.RES_MID) {
          if (h < 0.05) palms.push({ x: jx, y: height, z: jz, s: rng.range(8, 13), rot: rng.range(0, 6.28), tint: new THREE.Color(rng.pick(palmTints)), variant: rng.int(0, 3) });
        } else if (zone === Zone.DOWNTOWN) {
          if (h < 0.02) palms.push({ x: jx, y: height, z: jz, s: rng.range(7, 11), rot: rng.range(0, 6.28), tint: new THREE.Color(rng.pick(palmTints)), variant: rng.int(0, 3) });
        } else if (zone === Zone.AIRPORT) {
          if (h < 0.01) trees.push({ x: jx, y: height, z: jz, s: rng.range(6, 10), rot: rng.range(0, 6.28), tint: new THREE.Color(rng.pick(treeTints)), variant: rng.int(0, 3) });
        }
      }
    }
    this.counts = { palms: palms.length, trees: trees.length, mangroves: mangroves.length, shrubs: shrubs.length };

    const tile = 3000;
    const tiled = <T extends Plant>(list: T[]): Map<string, T[]> => {
      const m = new Map<string, T[]>();
      for (const p of list) {
        const k = `${Math.floor(p.x / tile)}|${Math.floor(p.z / tile)}|${p.variant}`;
        let l = m.get(k); if (!l) { l = []; m.set(k, l); }
        l.push(p);
      }
      return m;
    };
    const build = (list: Plant[], parts: { geo: (v: number) => THREE.BufferGeometry; mat: THREE.Material; tint: boolean }[], yOffset = 0) => {
      for (const [key, plants] of tiled(list)) {
        const variant = Number(key.split('|')[2]);
        for (const part of parts) {
          const mesh = new THREE.InstancedMesh(part.geo(variant), part.mat, plants.length);
          const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
          const box = new THREE.Box3();
          plants.forEach((pl, i) => {
            p.set(pl.x, pl.y + yOffset, pl.z);
            q.setFromEuler(new THREE.Euler(0, pl.rot, 0));
            s.set(pl.s, pl.s, pl.s);
            mesh.setMatrixAt(i, m.compose(p, q, s));
            if (part.tint) mesh.setColorAt(i, pl.tint);
            box.expandByPoint(new THREE.Vector3(pl.x - pl.s, pl.y, pl.z - pl.s));
            box.expandByPoint(new THREE.Vector3(pl.x + pl.s, pl.y + pl.s * 1.3, pl.z + pl.s));
          });
          mesh.geometry.boundingSphere = box.getBoundingSphere(new THREE.Sphere());
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          mesh.instanceMatrix.needsUpdate = true;
          this.group.add(mesh);
          this.tiles.push({ mesh, cx: (box.min.x + box.max.x) / 2, cz: (box.min.z + box.max.z) / 2, r: Math.hypot(box.max.x - box.min.x, box.max.z - box.min.z) / 2 });
        }
      }
    };
    build(palms, [{ geo: (v) => palmVariants[v].trunk, mat: trunkMat, tint: false }, { geo: (v) => palmVariants[v].fronds, mat: frondMat, tint: true }]);
    build(trees, [{ geo: (v) => treeVariants[v].trunk, mat: treeTrunkMat, tint: false }, { geo: (v) => treeVariants[v].canopy, mat: canopyMat, tint: true }]);
    build(mangroves, [{ geo: (v) => mangroveVariants[v], mat: mangroveMat, tint: true }]);
    build(shrubs, [{ geo: (v) => treeVariants[v].canopy, mat: canopyMat, tint: true }], -0.3);
  }

  update(time: number, wind: number): void {
    this.uTime.value = time;
    this.uWind.value = wind;
  }

  /** Distance-based shadow casting and visibility per tile (cheap streaming/LOD). */
  updateLod(camX: number, camZ: number): void {
    for (const t of this.tiles) {
      const d = Math.max(0, Math.hypot(t.cx - camX, t.cz - camZ) - t.r);
      t.mesh.castShadow = d < this.shadowDistance;
      t.mesh.visible = d < this.viewDistance;
    }
  }
}
