import * as THREE from 'three';
import { TriBVH, bakeUVMaps, bakeVertexAO, bakeTriangleWear } from './surfaceBake.js';
import { enableVertexAO, setBakeMap } from '../materials.js';

/**
 * Load-time occlusion / edge bake for the whole view model (rifle + attachments), in gunRoot space:
 *
 *   1. every opaque mesh under gunRoot (GLB parts, incl. the ones re-parented under animation pivots, and the
 *      procedural attachments) becomes an occluder in one BVH
 *   2. the GLB parts share one UV atlas and one master material → they are merged and rasterised into a
 *      1024² RGBA map: R = hemisphere AO (224² grid, ≤ 10 rays), G = convex-edge proximity (edge wear),
 *      B = concave-edge proximity (cavity grime). The map is handed to the master material's hook.
 *   3. attachment meshes (procedural UVs, not an atlas) get per-vertex AO in an `aGunAO` attribute and their
 *      materials switch on the GUN_AO_ATTR define. Their edge-wear tint (colour attribute, read by the surface
 *      hook) is rewritten from real geometry: per-triangle proximity to sharp convex edges (bevel strips),
 *      gated by exposure, scaled by the part's `wear` amount (lib.PartsBuilder → `aGunWearAmt`).
 *
 * Runs synchronously so screenshots and the first frame are deterministic: ≈ 0.45 M rays through a JS BVH,
 * 1.6–2 s in the headless software-GL harness (contended CPU; plain V8 casts the same rays ≈ 2× faster).
 */
export function bakeViewModelOcclusion(game, rig, { size = 1024, aoRes = 224, aoSamples = 10, aoDist = 0.05, vertexSamples = 8 } = {}) {
  const t0 = performance.now();
  const gunRoot = rig.gunRoot;
  gunRoot.updateWorldMatrix(true, true);
  const toGun = new THREE.Matrix4().copy(gunRoot.matrixWorld).invert();
  const m = new THREE.Matrix4();
  const nm = new THREE.Matrix3();

  const isVisible = (o) => {
    for (let p = o; p && p !== gunRoot; p = p.parent) if (!p.visible) return false;
    return true;
  };
  const glb = [];
  const attach = [];
  gunRoot.traverse((o) => {
    if (!o.isMesh || !isVisible(o)) return;
    const mat = Array.isArray(o.material) ? o.material[0] : o.material;
    if (!mat || mat.transparent || mat.isShaderMaterial) return; // glass, reticle, labels
    let underAttach = false;
    for (let p = o; p && p !== gunRoot; p = p.parent) if (p === rig.attachments) underAttach = true;
    (underAttach ? attach : glb).push(o);
  });

  // --- occluder soup + per-mesh gun-space copies
  const gunSpace = new Map();
  let triTotal = 0;
  const prepare = (mesh) => {
    const g = mesh.geometry;
    const pos = g.attributes.position;
    const nor = g.attributes.normal;
    if (!pos || !nor) return null;
    m.multiplyMatrices(toGun, mesh.matrixWorld);
    nm.getNormalMatrix(m);
    const P = new Float32Array(pos.count * 3);
    const N = new Float32Array(pos.count * 3);
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(m);
      P[i * 3] = v.x;
      P[i * 3 + 1] = v.y;
      P[i * 3 + 2] = v.z;
      v.fromBufferAttribute(nor, i).applyMatrix3(nm).normalize();
      N[i * 3] = v.x;
      N[i * 3 + 1] = v.y;
      N[i * 3 + 2] = v.z;
    }
    let I;
    if (g.index) I = g.index.array;
    else {
      I = new Uint32Array(pos.count);
      for (let i = 0; i < pos.count; i++) I[i] = i;
    }
    const entry = { mesh, position: P, normal: N, index: I, uv: g.attributes.uv ? g.attributes.uv.array : null };
    gunSpace.set(mesh, entry);
    triTotal += I.length / 3;
    return entry;
  };
  for (const mesh of glb) prepare(mesh);
  for (const mesh of attach) prepare(mesh);

  const soup = new Float32Array(triTotal * 9);
  let o = 0;
  for (const { position: P, index: I } of gunSpace.values()) {
    for (let t = 0; t < I.length; t++) {
      const v = I[t] * 3;
      soup[o++] = P[v];
      soup[o++] = P[v + 1];
      soup[o++] = P[v + 2];
    }
  }
  const bvh = new TriBVH(soup, 4);
  const tBvh = performance.now();

  // --- rifle: merged atlas bake → DataTexture on the master material
  let glbStats = null;
  const glbMaterials = new Set();
  const glbEntries = glb.map((mesh) => gunSpace.get(mesh)).filter((e) => e && e.uv);
  if (glbEntries.length) {
    let vCount = 0;
    let iCount = 0;
    for (const e of glbEntries) {
      vCount += e.position.length / 3;
      iCount += e.index.length;
    }
    const P = new Float32Array(vCount * 3);
    const N = new Float32Array(vCount * 3);
    const UV = new Float32Array(vCount * 2);
    const I = new Uint32Array(iCount);
    let vo = 0;
    let io = 0;
    for (const e of glbEntries) {
      P.set(e.position, vo * 3);
      N.set(e.normal, vo * 3);
      UV.set(e.uv.subarray(0, (e.position.length / 3) * 2), vo * 2);
      for (let k = 0; k < e.index.length; k++) I[io++] = e.index[k] + vo;
      vo += e.position.length / 3;
      const mat = Array.isArray(e.mesh.material) ? e.mesh.material[0] : e.mesh.material;
      glbMaterials.add(mat);
    }
    const res = bakeUVMaps({ position: P, normal: N, uv: UV, index: I }, size, { bvh, aoSamples, aoRes, aoDist });
    glbStats = res.stats;
    const tex = new THREE.DataTexture(res.data, size, size, THREE.RGBAFormat, THREE.UnsignedByteType);
    tex.colorSpace = THREE.NoColorSpace;
    tex.flipY = false;
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.anisotropy = game.assets?.anisotropy ?? 8;
    tex.needsUpdate = true;
    for (const mat of glbMaterials) setBakeMap(mat, tex);
    rig.bakeMap = tex;
  }
  const tGlb = performance.now();

  // --- attachments: per-vertex AO attribute
  let vRays = 0;
  let vCount = 0;
  const attachMaterials = new Set();
  for (const mesh of attach) {
    const e = gunSpace.get(mesh);
    if (!e) continue;
    const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
    if (!mat.userData?.gun) continue; // only hooked materials read the attribute
    const { ao, rays } = bakeVertexAO(e, bvh, { samples: vertexSamples, maxDist: aoDist * 0.8 });
    for (let i = 0; i < ao.length; i++) ao[i] = Math.max(0.02, ao[i]);
    mesh.geometry.setAttribute('aGunAO', new THREE.BufferAttribute(ao, 1));
    vRays += rays;
    vCount += ao.length;
    attachMaterials.add(mat);

    // geometry-based edge wear replaces the normal heuristic tint (see lib.bakeEdgeWear)
    const amt = mesh.geometry.attributes.aGunWearAmt;
    const col = mesh.geometry.attributes.color;
    if (amt && col && !mesh.geometry.index) {
      const w = bakeTriangleWear(e, { ao });
      for (let i = 0; i < w.length; i++) {
        const c = 1 + amt.getX(i) * w[i];
        col.setXYZ(i, c, c, c);
      }
      col.needsUpdate = true;
    }
  }
  for (const mat of attachMaterials) enableVertexAO(mat);
  const t1 = performance.now();
  const stats = {
    occluderTris: triTotal,
    bvhMs: Math.round(tBvh - t0),
    glb: glbStats && { tris: glbStats.tris, edges: glbStats.edges, rays: glbStats.rays, ms: Math.round(tGlb - tBvh) },
    attachments: { meshes: attach.length, vertices: vCount, rays: vRays, ms: Math.round(t1 - tGlb) },
    totalMs: Math.round(t1 - t0),
  };
  console.info('[aoBake]', JSON.stringify(stats));
  rig.bakeStats = stats;
  return stats;
}
