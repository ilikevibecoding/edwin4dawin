import * as THREE from 'three';
import { Rng, hash2 } from '../core/seed';
import { perlin2, smoothstep } from '../core/noise';
import { Zone, type WorldMap } from './map';

/** Palm atlas drawn procedurally (no external assets): fronds (cut-out) on the left half, bark on the right. */
function frondTexture(): THREE.CanvasTexture {
  const w = 256, h = 512;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, w, h);
  // bark: ringed trunk texture in the right half
  ctx.fillStyle = '#8a7458'; ctx.fillRect(w / 2, 0, w / 2, h);
  for (let y = 0; y < h; y += 9) { ctx.fillStyle = y % 18 === 0 ? '#6e5a44' : '#9a8466'; ctx.fillRect(w / 2, y, w / 2, 4); }
  for (let i = 0; i < 140; i++) { ctx.fillStyle = `rgba(40,30,20,${0.1 + Math.random() * 0.2})`; ctx.fillRect(w / 2 + Math.random() * w / 2, Math.random() * h, 3 + Math.random() * 6, 2); }
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, w / 2, h); ctx.clip();
  ctx.translate(0, 0);
  // rachis
  ctx.strokeStyle = '#6b7a3a';
  ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(w / 4, h); ctx.lineTo(w / 4, 8); ctx.stroke();
  // leaflets
  const fw = w / 2;
  for (let i = 0; i < 46; i++) {
    const t = i / 46;
    const y = h - 20 - t * (h - 40);
    const len = (fw / 2 - 4) * (0.45 + 0.55 * Math.sin(Math.PI * Math.min(1, t * 1.15)));
    const g = 60 + Math.round(40 * Math.sin(t * 7 + i));
    ctx.fillStyle = `rgb(${40 + (i % 3) * 8}, ${110 + g * 0.6}, ${40 + (i % 5) * 5})`;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(fw / 2, y);
      ctx.quadraticCurveTo(fw / 2 + side * len * 0.5, y - 18, fw / 2 + side * len, y - 34 + 6 * Math.sin(i));
      ctx.quadraticCurveTo(fw / 2 + side * len * 0.55, y - 6, fw / 2, y + 4);
      ctx.fill();
    }
  }
  ctx.restore();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function palmGeometry(rng: Rng): THREE.BufferGeometry {
  // trunk: gently curved tapered tube
  const segs = 4, radial = 5;
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
      uv.push(0.55 + 0.4 * (j / radial), t);
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
  const n = rng.int(7, 9);
  let v = 0;
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + rng.range(-0.2, 0.2);
    const droop = rng.range(0.35, 0.7);
    const len = rng.range(0.42, 0.58);
    const width = 0.13;
    const segsF = 3;
    for (let i = 0; i <= segsF; i++) {
      const t = i / segsF;
      // arc: rises slightly then droops
      const r = len * t;
      const yv = top.y + 0.18 * Math.sin(t * Math.PI * 0.8) - droop * t * t;
      const px = top.x + Math.cos(a) * r, pz = top.z + Math.sin(a) * r;
      const wx = -Math.sin(a) * width * (1 - t * 0.2), wz = Math.cos(a) * width * (1 - t * 0.2);
      fp.push(px - wx, yv, pz - wz, px + wx, yv, pz + wz);
      fn.push(0, 1, 0, 0, 1, 0);
      fu.push(0.0, 1 - t, 0.5, 1 - t);
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
  return mergeWithUv([trunk, fronds]);
}

function mergeWithUv(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const pos: number[] = [], nrm: number[] = [], uv: number[] = [], col: number[] = [];
  for (const g of geos) {
    const ng = g.index ? g.toNonIndexed() : g;
    const p = ng.getAttribute('position'), n = ng.getAttribute('normal'), u = ng.getAttribute('uv'), c = ng.getAttribute('color');
    for (let i = 0; i < p.count; i++) {
      pos.push(p.getX(i), p.getY(i), p.getZ(i)); nrm.push(n.getX(i), n.getY(i), n.getZ(i));
      uv.push(u ? u.getX(i) : 0, u ? u.getY(i) : 0);
      if (c) col.push(c.getX(i), c.getY(i), c.getZ(i)); else col.push(1, 1, 1);
    }
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  out.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  out.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return out;
}

/** Lumpy canopy made of displaced icosphere puffs: one broad crown plus offset side lobes so no two
 *  variants share a silhouette and the profile is wider than tall (tropical hardwoods). */
function canopyGeometry(rng: Rng, puffs: number, flat: number, detail = 1): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < puffs; i++) {
    const g = new THREE.IcosahedronGeometry(1, detail);
    const p = g.getAttribute('position') as THREE.BufferAttribute;
    const seed = rng.range(0, 100);
    for (let k = 0; k < p.count; k++) {
      const x = p.getX(k), y = p.getY(k), z = p.getZ(k);
      const d = 1 + 0.28 * perlin2(x * 2.3 + seed, y * 2.3 + z * 1.9);
      // flatter underside than top
      const fy = y < 0 ? flat * 0.6 : flat;
      p.setXYZ(k, x * d, y * d * fy, z * d);
    }
    const s = i === 0 ? 1 : rng.range(0.5, 0.8);
    g.scale(s * (i === 0 ? 1.25 : 1.0), s, s * (i === 0 ? 1.1 : 1.0));
    const a = rng.range(0, Math.PI * 2), r = i === 0 ? 0 : rng.range(0.45, 0.85);
    g.translate(Math.cos(a) * r, i === 0 ? 0 : rng.range(-0.3, 0.15), Math.sin(a) * r);
    g.computeVertexNormals();
    parts.push(g);
  }
  return mergeNonIndexed(parts);
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

function treeGeometry(rng: Rng): THREE.BufferGeometry {
  const trunk = new THREE.CylinderGeometry(0.05, 0.09, 0.45, 5);
  trunk.translate(0, 0.225, 0);
  const tc = new Float32Array(trunk.getAttribute('position').count * 3);
  for (let i = 0; i < tc.length; i += 3) { tc[i] = 0.36; tc[i + 1] = 0.27; tc[i + 2] = 0.2; }
  trunk.setAttribute('color', new THREE.BufferAttribute(tc, 3));
  const canopy = canopyGeometry(rng, rng.int(3, 5), rng.range(0.75, 0.95), 0);
  canopy.scale(0.55, 0.4, 0.55);
  canopy.translate(0, 0.62, 0);
  return mergeWithUv([trunk, canopy]);
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
    const canopyMat = windMaterial(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, vertexColors: true }), this.uTime, this.uWind);
    const mangroveMat = windMaterial(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 }), this.uTime, this.uWind);
    const treeTrunkMat = new THREE.MeshStandardMaterial({ color: 0x5a4632, roughness: 0.95 });
    this.materials.push(frondMat, canopyMat, mangroveMat);
    void trunkMat; void treeTrunkMat;

    const palmVariants = [0, 1, 2].map(() => palmGeometry(rng));
    const treeVariants = [0, 1, 2].map(() => treeGeometry(rng));
    const mangroveVariants = [0, 1, 2].map(() => mangroveGeometry(rng));

    const palms: Plant[] = [], trees: Plant[] = [], mangroves: Plant[] = [], shrubs: Plant[] = [];
    const palmTints = ['#5e8a3a', '#527f31', '#6c9a42', '#4a7229', '#739c46'];
    const treeTints = ['#2f5427', '#38652b', '#274a20', '#41702f', '#3d6a2e', '#2b5224', '#4a7434', '#30542a'];
    const mangroveTints = ['#284d22', '#2f5a27', '#23451e', '#35602b'];

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
          if (height > 1.2 && h < 0.09 + 0.08 * clump) palms.push({ x: jx, y: height, z: jz, s: rng.range(7, 13), rot: rng.range(0, 6.28), tint: new THREE.Color(rng.pick(palmTints)), variant: rng.int(0, 2) });
        } else if (zone === Zone.PARK) {
          const garza = Math.hypot((jx - 300) / 900, (jz - 2400) / 500) < 1.0 ? 2.6 : 1.0;
          const p = (0.09 + 0.14 * clump) * garza;
          if (h < p * 0.75) trees.push({ x: jx, y: height, z: jz, s: rng.range(9, 17), rot: rng.range(0, 6.28), tint: new THREE.Color(rng.pick(treeTints)), variant: rng.int(0, 2) });
          else if (h < p) palms.push({ x: jx, y: height, z: jz, s: rng.range(8, 14), rot: rng.range(0, 6.28), tint: new THREE.Color(rng.pick(palmTints)), variant: rng.int(0, 2) });
          else if (h < p + 0.02) shrubs.push({ x: jx, y: height, z: jz, s: rng.range(2, 4), rot: rng.range(0, 6.28), tint: new THREE.Color(rng.pick(treeTints)), variant: rng.int(0, 2) });
        } else if (zone === Zone.RES_LOW) {
          const p = 0.07 + 0.05 * clump;
          if (h < p * 0.5) trees.push({ x: jx, y: height, z: jz, s: rng.range(8, 14), rot: rng.range(0, 6.28), tint: new THREE.Color(rng.pick(treeTints)), variant: rng.int(0, 2) });
          else if (h < p) palms.push({ x: jx, y: height, z: jz, s: rng.range(7, 12), rot: rng.range(0, 6.28), tint: new THREE.Color(rng.pick(palmTints)), variant: rng.int(0, 2) });
        } else if (zone === Zone.GOLF) {
          const p = 0.1 + 0.25 * smoothstep(0.1, 0.6, clump);
          if (h < p * 0.7) trees.push({ x: jx, y: height, z: jz, s: rng.range(9, 16), rot: rng.range(0, 6.28), tint: new THREE.Color(rng.pick(treeTints)), variant: rng.int(0, 2) });
          else if (h < p) palms.push({ x: jx, y: height, z: jz, s: rng.range(8, 13), rot: rng.range(0, 6.28), tint: new THREE.Color(rng.pick(palmTints)), variant: rng.int(0, 2) });
        } else if (zone === Zone.HOTEL || zone === Zone.RES_MID) {
          if (h < 0.05) palms.push({ x: jx, y: height, z: jz, s: rng.range(8, 13), rot: rng.range(0, 6.28), tint: new THREE.Color(rng.pick(palmTints)), variant: rng.int(0, 2) });
        } else if (zone === Zone.DOWNTOWN) {
          if (h < 0.02) palms.push({ x: jx, y: height, z: jz, s: rng.range(7, 11), rot: rng.range(0, 6.28), tint: new THREE.Color(rng.pick(palmTints)), variant: rng.int(0, 2) });
        } else if (zone === Zone.AIRPORT) {
          if (h < 0.01) trees.push({ x: jx, y: height, z: jz, s: rng.range(6, 10), rot: rng.range(0, 6.28), tint: new THREE.Color(rng.pick(treeTints)), variant: rng.int(0, 2) });
        }
      }
    }
    this.counts = { palms: palms.length, trees: trees.length, mangroves: mangroves.length, shrubs: shrubs.length };

    const tile = 4000;
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
    build(palms, [{ geo: (v) => palmVariants[v], mat: frondMat, tint: true }]);
    build(trees, [{ geo: (v) => treeVariants[v], mat: canopyMat, tint: true }]);
    build(mangroves, [{ geo: (v) => mangroveVariants[v], mat: mangroveMat, tint: true }]);
    build(shrubs, [{ geo: (v) => treeVariants[v], mat: canopyMat, tint: true }], -0.3);
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
