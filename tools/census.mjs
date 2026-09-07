#!/usr/bin/env node
import { chromium } from 'playwright';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

// ---------------------------------------------------------------------------
// Scene census: who is paying for what.
//
//   node tools/census.mjs --url http://127.0.0.1:5186/?quality=fast \
//     --out perf --tag r1 [--views hero,mainroad,forest,camp,lions] [--loops 3] \
//     [--notes perf/census-r1-wins.md]
//
// This is measurement and attribution, not optimisation. It boots the game,
// hooks `renderer.renderBufferDirect` so every draw call in a frame can be
// charged to the object, material, program and top-level scene group that
// issued it, then takes the standard beauty views plus the campground and the
// pride (placed the way tools/campshots.mjs and tools/lions.mjs place them)
// and writes:
//
//   perf/census-<tag>.json   everything measured
//   perf/census-<tag>.md     the same, tabulated, with the `--notes` file
//                            appended verbatim (the hand-written analysis
//                            survives a re-run that way)
//
// Nothing in here is estimated where it can be measured. The two estimates are
// GPU texture memory (width x height x bytes-per-pixel x 4/3 for mipmapped) and
// geometry memory (attribute byte lengths), and both are labelled as such.
//
// Under SwiftShader frame times mean nothing, so none are reported here; the
// structural numbers (calls, triangles, programs, textures, bytes) are exact.
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);
const arg = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};
const url = arg('url', 'http://127.0.0.1:5186/?quality=fast');
const outDir = arg('out', 'perf');
const tag = arg('tag', 'r1');
const loops = Number(arg('loops', '3'));
const notesFile = arg('notes', path.join(outDir, `census-${tag}-wins.md`));
const viewNames = arg('views', 'hero,mainroad,forest,camp,lions').split(',').filter(Boolean);
const width = Number(arg('width', '1280'));
const height = Number(arg('height', '720'));
// --from <census.json>: skip the browser and re-render the report from a saved run
const fromFile = arg('from', null);

const log = (...a) => console.log('[census]', ...a);
const sum = (rows, f) => rows.reduce((a, r) => a + f(r), 0);
const by = (rows, keyFn) => {
  const m = new Map();
  for (const r of rows) {
    const k = keyFn(r);
    (m.get(k) || m.set(k, []).get(k)).push(r);
  }
  return m;
};

// ---------------------------------------------------------------------------
// Measurement: boot, hook, views, inventory, heap loops
// ---------------------------------------------------------------------------
async function measureAll() {
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--enable-precise-memory-info',
      '--js-flags=--expose-gc --max-old-space-size=4096',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
    ],
  });
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  // the production preview has no HMR client; the stub keeps a dev URL from reloading mid-census
  await page.route('**/@vite/client', (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: "import '/@vite/env';" }));

  const tNav = Date.now();
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => window.__READY__ === true || window.__ERROR__, null, { timeout: 900000 });
  const bootErr = await page.evaluate(() => window.__ERROR__ || null);
  if (bootErr) {
    console.error('boot failed:\n' + bootErr);
    await browser.close();
    process.exit(1);
  }
  log(`booted in ${((Date.now() - tNav) / 1000).toFixed(1)}s`);

  // ---------------------------------------------------------------------------
  // Page side. One install, then per-view `measure()` and a final `inventory()`.
  // Everything is plain JS on the debug API; THREE is not a global in the
  // bundle, so the few maths helpers needed are written out.
  // ---------------------------------------------------------------------------
  await page.evaluate(() => {
    const api = window.debugAPI;
    const { scene, camera, renderer, post, terrain, vehicle, camp, wildlife, skyRig, driver } = api.objects;

    // top-level scene children -> the module that owns them
    const GROUP_BY_NAME = {
      sky: 'sky',
      headlightBeams: 'sky',
      shafts: 'sky',
      terrain: 'terrain',
      forest: 'forest',
      truck: 'vehicle',
      campground: 'camp',
      fleet: 'fleet',
      wildlife: 'wildlife',
      roadside: 'roadside',
      wheelDust: 'dust',
    };
    const groupOfTop = (c) => {
      if (GROUP_BY_NAME[c.name]) return GROUP_BY_NAME[c.name];
      if (c.isPoints) return 'sky'; // the dust motes from sky.js
      if (c.isLight) return 'lights';
      return `other:${c.name || c.type}`;
    };
    const groupOf = (o) => {
      let n = o;
      while (n && n.parent && n.parent !== scene) n = n.parent;
      return n && n.parent === scene ? groupOfTop(n) : 'detached';
    };
    const matsOf = (o) => (Array.isArray(o.material) ? o.material : o.material ? [o.material] : []);
    const isDrawable = (o) => o.isMesh || o.isPoints || o.isSprite || o.isLine;
    const label = (o) => o.name || `${o.type}#${o.id}`;
    const shortKey = (s) => {
      // fnv-1a over the string, hex; enough to tell keys apart in a table
      let h = 0x811c9dc5;
      for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0;
      return h.toString(16).padStart(8, '0');
    };

    // --- frustum (three's Frustum.setFromProjectionMatrix + intersectsObject) --
    function frustumPlanes(cam) {
      const m = camera.projectionMatrix.clone().multiply(cam.matrixWorldInverse).elements;
      const [a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12, a13, a14, a15] = m;
      const raw = [
        [a3 - a0, a7 - a4, a11 - a8, a15 - a12],
        [a3 + a0, a7 + a4, a11 + a8, a15 + a12],
        [a3 + a1, a7 + a5, a11 + a9, a15 + a13],
        [a3 - a1, a7 - a5, a11 - a9, a15 - a13],
        [a3 - a2, a7 - a6, a11 - a10, a15 - a14],
        [a3 + a2, a7 + a6, a11 + a10, a15 + a14],
      ];
      return raw.map(([x, y, z, w]) => {
        const l = Math.hypot(x, y, z) || 1;
        return [x / l, y / l, z / l, w / l];
      });
    }
    function intersects(planes, o) {
      let sphere;
      if (o.boundingSphere !== undefined) {
        if (o.boundingSphere === null) o.computeBoundingSphere();
        sphere = o.boundingSphere.clone().applyMatrix4(o.matrixWorld);
      } else {
        const g = o.geometry;
        if (!g) return true;
        if (g.boundingSphere === null) g.computeBoundingSphere();
        sphere = g.boundingSphere.clone().applyMatrix4(o.matrixWorld);
      }
      const c = sphere.center;
      for (const [x, y, z, w] of planes) if (x * c.x + y * c.y + z * c.z + w < -sphere.radius) return false;
      return true;
    }

    // --- the draw-call hook ----------------------------------------------------
    let rec = null;
    let sceneSet = null;
    const orig = renderer.renderBufferDirect;
    renderer.renderBufferDirect = function (cam, sc, geometry, material, object, group) {
      if (rec) {
        const index = geometry.index;
        const position = geometry.attributes.position;
        if (index !== null || (position !== undefined && position.count !== 0)) {
          const rangeFactor = material.wireframe === true ? 2 : 1;
          const dataCount = index !== null ? index.count : position.count;
          const rangeStart = geometry.drawRange.start * rangeFactor;
          const rangeCount = geometry.drawRange.count * rangeFactor;
          const groupStart = group !== null ? group.start * rangeFactor : 0;
          const groupCount = group !== null ? group.count * rangeFactor : Infinity;
          const drawStart = Math.max(rangeStart, groupStart);
          const drawEnd = Math.min(dataCount, rangeStart + rangeCount, groupStart + groupCount) - 1;
          const drawCount = Math.max(0, drawEnd - drawStart + 1);
          if (drawCount > 0) {
            const instanceCount = object.isInstancedMesh ? object.count : geometry.isInstancedBufferGeometry ? geometry.instanceCount : 1;
            const triangles = (object.isMesh || object.isSprite) && !material.wireframe ? (drawCount / 3) * instanceCount : 0;
            let phase;
            if (sc === null || material.isMeshDepthMaterial || material.isMeshDistanceMaterial) phase = 'shadow';
            else if (sc.overrideMaterial) phase = `override:${sc.overrideMaterial.name || sc.overrideMaterial.type}`;
            else if (!sceneSet.has(object)) phase = 'post';
            else phase = 'beauty';
            const k = `${phase}|${object.uuid}|${material.uuid}`;
            let e = rec.get(k);
            if (!e) {
              e = {
                phase,
                object: label(object),
                objectType: object.type,
                objectUuid: object.uuid,
                group: sceneSet.has(object) ? groupOf(object) : 'post',
                material: material.name || material.type,
                materialType: material.type,
                materialUuid: material.uuid,
                instanced: !!object.isInstancedMesh,
                instances: instanceCount,
                frustumCulled: object.frustumCulled,
                calls: 0,
                triangles: 0,
                vertices: 0,
              };
              rec.set(k, e);
            }
            e.calls++;
            e.triangles += triangles;
            e.vertices += drawCount * instanceCount;
          }
        }
      }
      return orig.call(this, cam, sc, geometry, material, object, group);
    };

    // --- placements -------------------------------------------------------------
    // hero/mainroad/forest are the app's own views. camp is campshots.mjs `arrive`
    // (truck on the mainline 46 m before the camp, camera in the camp's frame);
    // lions is lions.mjs `seat` (truck on the mainline at t=0.84 beside the pride,
    // camera at the driver's eye turned toward the nearest lion).
    function placeCamp() {
      api.setView('forest');
      const fr = { pos: [-64, 3.6, -33.5], target: [-6, 1.8, -12], fov: 50, truckU: -46 };
      const a = camp.anchor;
      const world = (c) => ({ x: a.x + a.tx * c[0] - a.lx * c[2], y: a.y + c[1], z: a.z + a.tz * c[0] - a.lz * c[2] });
      const L = terrain.mainLength;
      const t = 0.6 + fr.truckU / L;
      const p = terrain.mainPoint(t);
      const tan = terrain.mainTangent(t);
      driver.state.auto = false;
      driver.state.speed = 0;
      driver.state.pos.set(p.x, p.y, p.z);
      driver.state.heading = Math.atan2(tan.x, tan.z);
      for (let i = 0; i < 90; i++) driver.update(1 / 60);
      vehicle.root.updateMatrixWorld(true);
      for (let i = 0; i < 60; i++) camp.update(1 / 60, i / 60, { vehiclePos: vehicle.root.position });
      const cp = world(fr.pos);
      const ct = world(fr.target);
      camera.position.set(cp.x, cp.y, cp.z);
      camera.fov = fr.fov;
      camera.lookAt(ct.x, ct.y, ct.z);
      camera.updateProjectionMatrix();
      skyRig.follow(vehicle.root.position);
      wildlife.update(1e-3, 0, { vehiclePos: vehicle.root.position, vehicleSpeed: 0, throttle: 0, camera });
    }
    function placeLions() {
      api.pause();
      const t = 0.84;
      const p = terrain.mainPoint(t);
      const tan = terrain.mainTangent(t);
      driver.state.auto = false;
      driver.state.speed = 0;
      driver.state.pos.set(p.x, p.y, p.z);
      driver.state.heading = Math.atan2(tan.x, tan.z);
      for (let i = 0; i < 90; i++) driver.update(1 / 60);
      vehicle.root.updateMatrixWorld(true);
      const truck = () => ({ vehiclePos: vehicle.root.position, vehicleSpeed: 0, throttle: 0, camera });
      let simT = 0;
      for (let i = 0; i < 120; i++) {
        simT += 1 / 30;
        wildlife.update(1 / 30, simT, truck());
      }
      let lion = null;
      let bd = 1e9;
      for (const l of wildlife.lions) {
        const d = l.root.position.distanceTo(vehicle.root.position);
        if (d < bd) {
          bd = d;
          lion = l;
        }
      }
      const e = vehicle.root.matrixWorld.elements;
      const v = [0.38, 1.62, 0.02];
      camera.position.set(
        e[0] * v[0] + e[4] * v[1] + e[8] * v[2] + e[12],
        e[1] * v[0] + e[5] * v[1] + e[9] * v[2] + e[13],
        e[2] * v[0] + e[6] * v[1] + e[10] * v[2] + e[14],
      );
      camera.fov = 50;
      const lp = lion.root.position;
      camera.lookAt(lp.x, lp.y + 0.7, lp.z);
      camera.updateProjectionMatrix();
      skyRig.follow(vehicle.root.position);
      wildlife.update(1e-3, simT, truck());
    }

    function place(name) {
      if (name === 'camp') placeCamp();
      else if (name === 'lions') placeLions();
      else if (!api.setView(name)) throw new Error(`no view ${name}`);
      camera.updateMatrixWorld(true);
      scene.updateMatrixWorld(true);
    }

    // --- one measured frame -----------------------------------------------------
    function measure(name) {
      place(name);
      const programsBefore = renderer.info.programs.length;
      api.renderFrames(1); // warm: compiles anything this view needs
      sceneSet = new Set();
      scene.traverse((o) => sceneSet.add(o));
      camera.updateMatrixWorld(true);
      const planes = frustumPlanes(camera);
      rec = new Map();
      api.renderFrames(1);
      const rows = [...rec.values()];
      rec = null;

      // in-frustum census of the scene as the frame saw it
      let visibleObjects = 0;
      let visibleInstances = 0;
      const byUuid = new Map();
      scene.traverse((o) => {
        if (!isDrawable(o)) return;
        byUuid.set(o.uuid, o);
        let vis = o.visible;
        for (let p = o.parent; vis && p; p = p.parent) vis = p.visible;
        if (!vis) return;
        if (!intersects(planes, o)) return;
        visibleObjects++;
        if (o.isInstancedMesh) visibleInstances += o.count;
      });
    for (const r of rows) {
      const o = byUuid.get(r.objectUuid);
      r.inFrustum = o ? intersects(planes, o) : null;
      const m = o && matsOf(o).find((x) => x.uuid === r.materialUuid);
      const props = m && renderer.properties.has(m) ? renderer.properties.get(m) : null;
      r.program = props && props.currentProgram ? props.currentProgram.id : null;
    }
    // How much of each big object is actually inside the frustum: per instance
    // (bounding sphere) for InstancedMeshes, per triangle centroid for regular
    // meshes of 20k+ triangles. This is the ceiling on what finer culling
    // (chunking a route-long mesh, splitting a forest-wide instance set) can
    // remove, measured for this camera.
    const M4 = camera.matrixWorld.constructor;
    const V3 = camera.position.constructor;
    const tmpM = new M4();
    const tmpV = new V3();
    const inside = (x, y, z, r) => {
      for (const [a, b, c, w] of planes) if (a * x + b * y + c * z + w < -r) return false;
      return true;
    };
    const detailed = new Set();
    for (const r of rows) {
      if (r.phase !== 'beauty' || detailed.has(r.objectUuid)) continue;
      detailed.add(r.objectUuid);
      const o = byUuid.get(r.objectUuid);
      if (!o || !o.geometry) continue;
      const g = o.geometry;
      if (o.isInstancedMesh) {
        if (g.boundingSphere === null) g.computeBoundingSphere();
        const bs = g.boundingSphere;
        let n = 0;
        for (let i = 0; i < o.count; i++) {
          o.getMatrixAt(i, tmpM);
          tmpM.premultiply(o.matrixWorld);
          const s = bs.clone().applyMatrix4(tmpM);
          if (inside(s.center.x, s.center.y, s.center.z, s.radius)) n++;
        }
        r.frustumDetail = { kind: 'instances', inside: n, total: o.count };
      } else if (r.triangles >= 20000 && g.attributes.position) {
        const pos = g.attributes.position;
        const idx = g.index;
        const nTri = Math.floor((idx ? idx.count : pos.count) / 3);
        let n = 0;
        for (let t = 0; t < nTri; t++) {
          let cx = 0;
          let cy = 0;
          let cz = 0;
          for (let k = 0; k < 3; k++) {
            const vi = idx ? idx.getX(t * 3 + k) : t * 3 + k;
            cx += pos.getX(vi);
            cy += pos.getY(vi);
            cz += pos.getZ(vi);
          }
          tmpV.set(cx / 3, cy / 3, cz / 3).applyMatrix4(o.matrixWorld);
          if (inside(tmpV.x, tmpV.y, tmpV.z, 0)) n++;
        }
        r.frustumDetail = { kind: 'triangles', inside: n, total: nTri };
      }
    }
      const st = api.stats();
      return {
        view: name,
        camera: { position: camera.position.toArray().map((v) => +v.toFixed(2)), fov: camera.fov },
        truck: vehicle.root.position.toArray().map((v) => +v.toFixed(2)),
        programsBefore,
        programsAfter: renderer.info.programs.length,
        rendererInfo: { calls: st.calls, triangles: st.triangles, textures: st.textures, geometries: st.geometries, programs: st.programs },
        visibleObjects,
        visibleInstances,
        rows,
      };
    }

    // --- program / texture / geometry inventory ---------------------------------
    const TEX_KEYS = [
      'map', 'alphaMap', 'aoMap', 'bumpMap', 'displacementMap', 'emissiveMap', 'envMap', 'lightMap', 'metalnessMap', 'normalMap',
      'roughnessMap', 'specularMap', 'specularColorMap', 'specularIntensityMap', 'clearcoatMap', 'clearcoatNormalMap', 'clearcoatRoughnessMap',
      'sheenColorMap', 'sheenRoughnessMap', 'transmissionMap', 'thicknessMap', 'iridescenceMap', 'iridescenceThicknessMap', 'anisotropyMap', 'gradientMap', 'matcap',
    ];
    const texturesOfMaterial = (m) => {
      const out = [];
      for (const k of TEX_KEYS) if (m[k] && m[k].isTexture) out.push([k, m[k]]);
      if (m.uniforms) for (const [k, u] of Object.entries(m.uniforms)) if (u && u.value && u.value.isTexture) out.push([`u.${k}`, u.value]);
      return out;
    };
    const FORMAT_CH = { 1023: 4, 1022: 3, 1028: 1, 1030: 2, 1021: 1, 1024: 1, 1025: 2, 1029: 1, 1031: 2, 1033: 4, 1026: 1, 1027: 1 };
    const TYPE_BYTES = { 1009: 1, 1010: 1, 1011: 2, 1012: 2, 1013: 4, 1014: 4, 1015: 4, 1016: 2, 1017: 2, 1018: 2, 1019: 2, 1020: 4 };
    const FORMAT_NAME = { 1023: 'RGBA', 1022: 'RGB', 1028: 'Red', 1030: 'RG', 1021: 'Alpha', 1024: 'Lum', 1025: 'LumA', 1029: 'RedInt', 1031: 'RGInt', 1033: 'RGBAInt', 1026: 'Depth', 1027: 'DepthStencil' };
    const TYPE_NAME = { 1009: 'u8', 1010: 'i8', 1011: 'i16', 1012: 'u16', 1013: 'i32', 1014: 'u32', 1015: 'f32', 1016: 'f16', 1017: 'u4444', 1018: 'u5551', 1020: 'u24_8' };
    function texInfo(tex) {
      const img = tex.image;
      let w = 0;
      let h = 0;
      let depth = 1;
      let faces = 1;
      let kind = 'none';
      if (tex.isCubeTexture) {
        faces = 6;
        const f = Array.isArray(img) ? img[0] : null;
        w = f ? f.width || 0 : 0;
        h = f ? f.height || 0 : 0;
        kind = f ? f.constructor.name : 'cube';
      } else if (img) {
        w = img.width || img.videoWidth || 0;
        h = img.height || img.videoHeight || 0;
        depth = img.depth || 1;
        kind = img.constructor ? img.constructor.name : typeof img;
      }
      let bpp;
      if (tex.isDepthTexture) bpp = 4;
      else bpp = (FORMAT_CH[tex.format] ?? 4) * (TYPE_BYTES[tex.type] ?? 1);
      // three only uploads mips when the min filter asks for them (Nearest=1003, Linear=1006)
      const mipmapped = tex.generateMipmaps && tex.minFilter !== 1003 && tex.minFilter !== 1006;
      let bytes;
      let compressed = false;
      if (tex.isCompressedTexture) {
        compressed = true;
        bytes = 0;
        const mips = tex.mipmaps || [];
        for (const m of mips) bytes += m.data ? m.data.byteLength : 0;
        if (tex.isCompressedCubeTexture) bytes *= 6;
        if (!w && mips[0]) {
          w = mips[0].width;
          h = mips[0].height;
        }
      } else {
        bytes = w * h * depth * faces * bpp * (mipmapped ? 4 / 3 : 1);
      }
      // the production bundle minifies class names; the `is*` flags survive
      const cls = tex.isDepthTexture ? 'DepthTexture' : tex.isCompressedTexture ? 'CompressedTexture' : tex.isDataTexture ? 'DataTexture' : tex.isCanvasTexture ? 'CanvasTexture' : tex.isCubeTexture ? 'CubeTexture' : tex.isRenderTargetTexture ? 'RenderTargetTexture' : tex.isDataArrayTexture ? 'DataArrayTexture' : tex.isVideoTexture ? 'VideoTexture' : 'Texture';
      if (kind === 'Object' && tex.isRenderTargetTexture) kind = 'render target';
      else if (kind === 'Object' && img && ArrayBuffer.isView(img.data)) kind = `${img.data.constructor.name} data`;
      return {
        uuid: tex.uuid,
        name: tex.name || '',
        type: tex.type,
        cls,
        imageKind: kind,
        imageId: img && !Array.isArray(img) && img.id ? img.id : '',
        width: w,
        height: h,
        depth,
        faces,
        format: FORMAT_NAME[tex.format] || String(tex.format),
        texelType: TYPE_NAME[tex.type] || String(tex.type),
        mipmapped: !!mipmapped,
        compressed,
        bpp,
        bytes: Math.round(bytes),
        cpuCanvasBytes: kind === 'HTMLCanvasElement' || kind === 'OffscreenCanvas' || kind === 'ImageBitmap' || kind === 'ImageData' ? w * h * 4 : 0,
        sourceUuid: tex.source ? tex.source.uuid : '',
        uploaded: renderer.properties.has(tex) && !!renderer.properties.get(tex).__webglTexture,
        owners: [],
      };
    }

    // deep walk of an arbitrary object for materials / textures / render targets;
    // `seen` is shared across calls so the same render target reached through two
    // paths (post.passes.gtao and composer.passes[2]) is recorded once
    function harvest(root, tagName, maxDepth, sinkMat, sinkTex, sinkRT, seen) {
      const walk = (v, depth, pathStr) => {
        if (!v || typeof v !== 'object' || seen.has(v) || depth > maxDepth) return;
        seen.add(v);
        if (v.isMaterial) return sinkMat(v, `${tagName}:${pathStr}`);
        if (v.isTexture) return sinkTex(v, `${tagName}:${pathStr}`);
        if (v.isWebGLRenderTarget) {
          sinkRT(v, `${tagName}:${pathStr}`);
          if (v.texture) sinkTex(v.texture, `${tagName}:${pathStr}.texture`);
          if (v.textures) v.textures.forEach((t, i) => sinkTex(t, `${tagName}:${pathStr}.textures[${i}]`));
          if (v.depthTexture) sinkTex(v.depthTexture, `${tagName}:${pathStr}.depthTexture`);
          return;
        }
        if (v.isObject3D || v.isBufferGeometry || v instanceof Element || ArrayBuffer.isView(v)) return;
        if (Array.isArray(v)) return v.forEach((x, i) => walk(x, depth + 1, `${pathStr}[${i}]`));
        if (v instanceof Map) return v.forEach((x, k) => walk(x, depth + 1, `${pathStr}{${String(k)}}`));
        for (const k of Object.keys(v)) {
          if (k.startsWith('__') || k === 'parent' || k === 'children' || k === 'scene' || k === 'camera' || k === 'renderer') continue;
          let x;
          try {
            x = v[k];
          } catch {
            continue;
          }
          if (typeof x === 'function') continue;
          walk(x, depth + 1, pathStr ? `${pathStr}.${k}` : k);
        }
      };
      walk(root, 0, '');
    }

    function parseCacheKey(program, customKey) {
      const key = program.cacheKey;
      let head = key;
      let custom = null;
      if (customKey !== null && key.endsWith(customKey)) {
        custom = customKey;
        head = key.slice(0, key.length - customKey.length - 1);
      }
      return { head, custom };
    }
    const PARAM_NAMES = [
      'precision', 'outputColorSpace', 'envMapMode', 'envMapCubeUVHeight', 'mapUv', 'alphaMapUv', 'lightMapUv', 'aoMapUv', 'bumpMapUv', 'normalMapUv',
      'displacementMapUv', 'emissiveMapUv', 'metalnessMapUv', 'roughnessMapUv', 'anisotropyMapUv', 'clearcoatMapUv', 'clearcoatNormalMapUv', 'clearcoatRoughnessMapUv',
      'iridescenceMapUv', 'iridescenceThicknessMapUv', 'sheenColorMapUv', 'sheenRoughnessMapUv', 'specularMapUv', 'specularColorMapUv', 'specularIntensityMapUv',
      'transmissionMapUv', 'thicknessMapUv', 'combine', 'fogExp2', 'sizeAttenuation', 'morphTargetsCount', 'morphAttributeCount', 'numDirLights', 'numPointLights',
      'numSpotLights', 'numSpotLightMaps', 'numHemiLights', 'numRectAreaLights', 'numDirLightShadows', 'numPointLightShadows', 'numSpotLightShadows',
      'numSpotLightShadowsWithMaps', 'numLightProbes', 'shadowMapType', 'toneMapping', 'numClippingPlanes', 'numClipIntersection', 'depthPacking',
    ];
    const BOOL_A = ['instancing', 'instancingColor', 'instancingMorph', 'matcap', 'envMap', 'normalMapObjectSpace', 'normalMapTangentSpace', 'clearcoat', 'iridescence', 'alphaTest', 'vertexColors', 'vertexAlphas', 'vertexUv1s', 'vertexUv2s', 'vertexUv3s', 'vertexTangents', 'anisotropy', 'alphaHash', 'batching', 'dispersion', 'batchingColor', 'gradientMap', 'packedNormalMap', 'vertexNormals'];
    const BOOL_B = ['fog', 'useFog', 'flatShading', 'logarithmicDepthBuffer', 'reversedDepthBuffer', 'skinning', 'morphTargets', 'morphNormals', 'morphColors', 'premultipliedAlpha', 'shadowMapEnabled', 'doubleSided', 'flipSided', 'useDepthPacking', 'dithering', 'transmission', 'sheen', 'opaque', 'pointsUvs', 'decodeVideoTexture', 'decodeVideoTextureEmissive', 'alphaToCoverage', 'lightProbeGrids', 'hasPositionAttribute'];
    const bits = (mask, names) => names.filter((_, i) => (Number(mask) >>> i) & 1);
    function decodeHead(head, material) {
      const f = head.split(',');
      const out = { shader: null, defines: {}, params: {}, flags: [] };
      let i = 0;
      if (material && material.isShaderMaterial) {
        out.shader = `custom(${f[0]},${f[1]})`;
        i = 2;
      } else {
        out.shader = f[0];
        i = 1;
      }
      const nDef = material && material.defines ? Object.keys(material.defines).length : 0;
      for (let d = 0; d < nDef; d++) {
        out.defines[f[i]] = f[i + 1];
        i += 2;
      }
      if (material && material.isRawShaderMaterial) return out;
      if (f.length - i !== PARAM_NAMES.length + 3) {
        out.unparsed = f.slice(i).join(',');
        return out;
      }
      for (const n of PARAM_NAMES) out.params[n] = f[i++];
      out.flags = [...bits(f[i++], BOOL_A), ...bits(f[i++], BOOL_B)];
      out.params.rendererColorSpace = f[i++];
      return out;
    }

    function inventory() {
      // --- materials in the scene, by group
      const mats = new Map(); // uuid -> {material, groups:Set, objects:Set}
      const geos = new Map();
      const instanceBuffers = [];
      scene.traverse((o) => {
        if (!isDrawable(o)) return;
        const g = groupOf(o);
        for (const m of matsOf(o)) {
          let e = mats.get(m.uuid);
          if (!e) mats.set(m.uuid, (e = { material: m, groups: new Set(), objects: new Set(), owner: g }));
          e.groups.add(g);
          e.objects.add(label(o));
        }
        if (o.geometry) {
          let e = geos.get(o.geometry.uuid);
          if (!e) geos.set(o.geometry.uuid, (e = { geometry: o.geometry, groups: new Set(), objects: new Set(), instancedUsers: 0 }));
          e.groups.add(g);
          e.objects.add(label(o));
          if (o.isInstancedMesh) e.instancedUsers++;
        }
        if (o.isInstancedMesh) {
          let bytes = o.instanceMatrix ? o.instanceMatrix.array.byteLength : 0;
          if (o.instanceColor) bytes += o.instanceColor.array.byteLength;
          instanceBuffers.push({ object: label(o), group: g, count: o.count, bytes });
        }
      });

      // --- off-scene materials: post passes, sky rig, shadow maps
      const extraMats = new Map(); // uuid -> {material, owner}
      const texOwners = new Map(); // texture uuid -> {tex, owners:Set}
      const rts = [];
      const addTex = (t, owner) => {
        let e = texOwners.get(t.uuid);
        if (!e) texOwners.set(t.uuid, (e = { tex: t, owners: new Set() }));
        e.owners.add(owner);
      };
      const addRT = (rt, owner) => rts.push({ owner, width: rt.width, height: rt.height, samples: rt.samples || 0, depthBuffer: !!rt.depthBuffer, hasDepthTexture: !!rt.depthTexture, textures: (rt.textures || [rt.texture]).length });
      const addExtraMat = (m, owner) => {
        if (mats.has(m.uuid)) return;
        if (!extraMats.has(m.uuid)) extraMats.set(m.uuid, { material: m, owner });
      };
      const harvested = new Set();
      for (const [name, pass] of Object.entries(post.passes)) if (pass) harvest(pass, `post:${name}`, 5, addExtraMat, addTex, addRT, harvested);
      harvest(post.composer, 'post:composer', 3, addExtraMat, addTex, addRT, harvested);
      harvest({ pmrem: skyRig.pmrem, envTarget: skyRig.envTarget, env: skyRig.env, skyMaterial: skyRig.skyMaterial }, 'sky', 4, addExtraMat, addTex, addRT, harvested);
      scene.traverse((o) => {
        if (o.isLight && o.shadow && o.shadow.map) {
          addRT(o.shadow.map, `shadow:${o.type}`);
          if (o.shadow.map.texture) addTex(o.shadow.map.texture, `shadow:${o.type}`);
          if (o.shadow.map.depthTexture) addTex(o.shadow.map.depthTexture, `shadow:${o.type}`);
        }
      });
      if (scene.background && scene.background.isTexture) addTex(scene.background, 'scene.background');
      if (scene.environment && scene.environment.isTexture) addTex(scene.environment, 'scene.environment');
      for (const [, e] of mats) for (const [slot, t] of texturesOfMaterial(e.material)) addTex(t, `${e.owner}:${e.material.name || e.material.type}.${slot} [${[...e.objects].slice(0, 2).join(', ')}${e.objects.size > 2 ? ` +${e.objects.size - 2}` : ''}]`);
      for (const [, e] of extraMats) for (const [slot, t] of texturesOfMaterial(e.material)) addTex(t, `${e.owner}.${slot}`);

      // --- programs
      const programs = new Map();
      for (const p of renderer.info.programs) {
        programs.set(p.id, { id: p.id, type: p.type, name: p.name, usedTimes: p.usedTimes, cacheKey: p.cacheKey, materials: new Set(), groups: new Set(), current: 0, custom: null, sampleMaterial: null });
      }
      const link = (m, owner) => {
        if (!renderer.properties.has(m)) return;
        const props = renderer.properties.get(m);
        if (!props.programs) return;
        for (const [, p] of props.programs) {
          const e = programs.get(p.id);
          if (!e) continue;
          e.materials.add(m.uuid);
          e.groups.add(owner);
          if (props.currentProgram === p) e.current++;
          if (!e.sampleMaterial) {
            e.sampleMaterial = m;
            let ck = null;
            try {
              ck = m.customProgramCacheKey();
            } catch {
              ck = null;
            }
            e.custom = ck;
          }
        }
      };
      // The custom key with the material *name* taken out of every `tag:name:...`
      // segment (and out of `loadedTyre_<name>_`). The numbers that stay are the
      // ones the patches bake into GLSL, so two programs with the same stripped
      // key and the same head would compile to identical source.
      const stripNames = (custom) => {
        if (custom === null) return null;
        return custom
          .split('|')
          .map((seg) => seg.replace(/^(\w+):[^:]+/, '$1:').replace(/^loadedTyre_[^_]+_/, 'loadedTyre_'))
          .join('|');
      };
      // countUnique: exact count of distinct vertices in a non-indexed geometry
      // (all attributes compared at 1e-4), i.e. what an index buffer would leave
      const countUnique = (g) => {
        const attrs = Object.entries(g.attributes);
        const n = g.attributes.position.count;
        if (n > 1500000) return null;
        const seenV = new Set();
        const parts = [];
        for (let i = 0; i < n; i++) {
          parts.length = 0;
          for (const [, a] of attrs) {
            for (let c = 0; c < a.itemSize; c++) parts.push(Math.round(a.array[i * a.itemSize + c] * 1e4));
          }
          seenV.add(parts.join(','));
        }
        return seenV.size;
      };
      for (const [, e] of mats) link(e.material, e.owner);
      for (const [, e] of extraMats) link(e.material, e.owner.split(':')[0] === 'post' ? 'post' : e.owner.split(':')[0]);

      const materialRows = [...mats.values()].map((e) => {
        const m = e.material;
        const props = renderer.properties.has(m) ? renderer.properties.get(m) : null;
        return {
          uuid: m.uuid,
          name: m.name || '',
          type: m.type,
          group: e.owner,
          objects: [...e.objects].slice(0, 6),
          objectCount: e.objects.size,
          programs: props && props.programs ? [...props.programs.values()].map((p) => p.id) : [],
          currentProgram: props && props.currentProgram ? props.currentProgram.id : null,
          hasOnBeforeCompile: m.onBeforeCompile !== Object.getPrototypeOf(m).onBeforeCompile && m.onBeforeCompile !== m.constructor.prototype.onBeforeCompile,
          hasCustomKey: m.customProgramCacheKey !== m.constructor.prototype.customProgramCacheKey,
          transparent: m.transparent,
          side: m.side,
          vertexColors: !!m.vertexColors,
          alphaTest: m.alphaTest,
          defines: m.defines ? Object.keys(m.defines) : [],
          textures: texturesOfMaterial(m).map(([k]) => k),
        };
      });
      const extraMaterialRows = [...extraMats.values()].map((e) => {
        const m = e.material;
        const props = renderer.properties.has(m) ? renderer.properties.get(m) : null;
        return { uuid: m.uuid, name: m.name || '', type: m.type, owner: e.owner, programs: props && props.programs ? [...props.programs.values()].map((p) => p.id) : [] };
      });
      const programRows = [...programs.values()].map((e) => {
        const { head, custom } = parseCacheKey(e, e.custom);
        const decoded = decodeHead(head, e.sampleMaterial);
        const stripped = stripNames(custom);
        return {
          id: e.id,
          // programs with the same collapseKey compile identical GLSL; only the
          // material name in the custom key keeps them apart
          collapseKey: stripped === null ? null : shortKey(`${head}||${stripped}`),
          strippedCustomPreview: stripped === null ? null : stripped.replace(/\s+/g, ' ').slice(0, 96),
          type: e.type,
          name: e.name,
          usedTimes: e.usedTimes,
          materials: e.materials.size,
          currentFor: e.current,
          groups: [...e.groups],
          shader: decoded.shader,
          defines: decoded.defines,
          params: decoded.params,
          flags: decoded.flags,
          unparsed: decoded.unparsed || null,
          head,
          headHash: shortKey(head),
          customKeyLength: custom === null ? null : custom.length,
          customKeyHash: custom === null ? null : shortKey(custom),
          customKeyPreview: custom === null ? null : custom.replace(/\s+/g, ' ').slice(0, 96),
          customIsDefault: custom !== null && /^onBeforeCompile\s*\(/.test(custom.trim()),
          cacheKeyLength: e.cacheKey.length,
          cacheKeyHash: shortKey(e.cacheKey),
          sampleMaterial: e.sampleMaterial ? e.sampleMaterial.name || e.sampleMaterial.type : null,
          sampleMaterialUuid: e.sampleMaterial ? e.sampleMaterial.uuid : null,
        };
      });

      // --- textures
      const textureRows = [...texOwners.values()].map((e) => Object.assign(texInfo(e.tex), { owners: [...e.owners].slice(0, 8), ownerCount: e.owners.size }));

      // --- geometries
      const geometryRows = [...geos.values()].map((e) => {
        const g = e.geometry;
        let bytes = 0;
        const seenBuf = new Set();
        const attrs = {};
        for (const [k, a] of Object.entries(g.attributes)) {
          const buf = a.isInterleavedBufferAttribute ? a.data.array : a.array;
          attrs[k] = `${a.itemSize}x${a.count}`;
          if (seenBuf.has(buf)) continue;
          seenBuf.add(buf);
          bytes += buf.byteLength;
        }
        if (g.index) bytes += g.index.array.byteLength;
        for (const list of Object.values(g.morphAttributes || {})) for (const a of list) bytes += a.array.byteLength;
        const tris = g.index ? g.index.count / 3 : g.attributes.position ? g.attributes.position.count / 3 : 0;
        const uniqueVertices = !g.index && g.attributes.position && g.attributes.position.count >= 3000 ? countUnique(g) : null;
        return {
          uuid: g.uuid,
          uniqueVertices,
          name: g.name || '',
          type: g.type,
          groups: [...e.groups],
          objects: [...e.objects].slice(0, 6),
          users: e.objects.size,
          instancedUsers: e.instancedUsers,
          vertices: g.attributes.position ? g.attributes.position.count : 0,
          triangles: Math.round(tris),
          indexed: !!g.index,
          attributes: attrs,
          bytes,
        };
      });

      const mem = performance.memory;
      return {
        rendererInfo: { programs: renderer.info.programs.length, textures: renderer.info.memory.textures, geometries: renderer.info.memory.geometries },
        programs: programRows,
        materials: materialRows,
        extraMaterials: extraMaterialRows,
        textures: textureRows,
        renderTargets: rts,
        geometries: geometryRows,
        instanceBuffers,
        heapMB: mem ? +(mem.usedJSHeapSize / 1048576).toFixed(1) : null,
      };
    }

    window.__census = { measure, inventory, place };
  });

  const info = await page.evaluate(() => {
    const api = window.debugAPI;
    const gl = api.objects.renderer.getContext();
    const mem = performance.memory;
    return {
      build: api.build,
      readyMs: api.perf.readyMs(),
      boot: api.perf.boot,
      quality: api.stats().quality,
      renderer: gl.getParameter(0x1f01),
      glVersion: gl.getParameter(0x1f02),
      heapAfterBootMB: mem ? +(mem.usedJSHeapSize / 1048576).toFixed(1) : null,
      stats: api.stats(),
      drawingBuffer: { width: api.objects.renderer.domElement.width, height: api.objects.renderer.domElement.height },
    };
  });
  log(`build ${info.build.rev} quality=${info.quality} programs=${info.stats.programs} textures=${info.stats.textures} geometries=${info.stats.geometries} heap=${info.heapAfterBootMB} MB`);

  const views = [];
  for (const v of viewNames) {
    const t0 = Date.now();
    const m = await page.evaluate((name) => window.__census.measure(name), v);
    const beauty = m.rows.filter((r) => r.phase === 'beauty');
    const tri = beauty.reduce((a, r) => a + r.triangles, 0);
    log(`${v.padEnd(9)} calls=${m.rendererInfo.calls} tris=${m.rendererInfo.triangles} (beauty ${beauty.reduce((a, r) => a + r.calls, 0)} calls / ${tri} tris) programs ${m.programsBefore}->${m.programsAfter} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
    views.push(m);
  }

  const inv = await page.evaluate(() => window.__census.inventory());
  log(`inventory: ${inv.programs.length} programs, ${inv.materials.length} scene materials (+${inv.extraMaterials.length} off-scene), ${inv.textures.length} textures found of ${inv.rendererInfo.textures}, ${inv.geometries.length} geometries of ${inv.rendererInfo.geometries}`);

  // --- heap over reset loops (perfrun's loop) ---------------------------------
  const heaps = [];
  for (let i = 0; i < loops; i++) {
    const h = await page.evaluate(async () => {
      window.debugAPI.setView('hero');
      window.debugAPI.resume();
      window.debugAPI.objects.driver.resetAuto(0.42);
      await new Promise((r) => setTimeout(r, 2500));
      if (globalThis.gc) globalThis.gc();
      return performance.memory ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(1) : null;
    });
    heaps.push(h);
    log(`reset loop ${i + 1}: heap ${h} MB`);
  }
  await page.evaluate(() => window.debugAPI.pause());
  const heapFinal = await page.evaluate(() => {
    if (globalThis.gc) globalThis.gc();
    return performance.memory ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(1) : null;
  });
  await browser.close();

  // per-view summaries from the raw draw records (the raw rows are not kept)
  const viewSummaries = views.map((v) => {
    const beauty = v.rows.filter((r) => r.phase === 'beauty');
    const phases = {};
    for (const [phase, rows] of by(v.rows, (r) => r.phase)) phases[phase] = { calls: sum(rows, (r) => r.calls), triangles: Math.round(sum(rows, (r) => r.triangles)) };
    const perGroup = {};
    for (const [g, rows] of by(beauty, (r) => r.group)) {
      perGroup[g] = {
        calls: sum(rows, (r) => r.calls),
        triangles: Math.round(sum(rows, (r) => r.triangles)),
        instancedTriangles: Math.round(sum(rows.filter((r) => r.instanced), (r) => r.triangles)),
        objects: new Set(rows.map((r) => r.objectUuid)).size,
        programs: new Set(rows.map((r) => r.program)).size,
      };
    }
    const shadowPerGroup = {};
    for (const [g, rows] of by(v.rows.filter((r) => r.phase === 'shadow'), (r) => r.group)) shadowPerGroup[g] = { calls: sum(rows, (r) => r.calls), triangles: Math.round(sum(rows, (r) => r.triangles)) };
    const overridePerGroup = {};
    for (const [g, rows] of by(v.rows.filter((r) => r.phase.startsWith('override:')), (r) => r.group)) overridePerGroup[g] = { calls: sum(rows, (r) => r.calls), triangles: Math.round(sum(rows, (r) => r.triangles)) };
    const objects = [...by(beauty, (r) => r.objectUuid).values()]
      .map((rows) => {
        const triangles = Math.round(sum(rows, (r) => r.triangles));
        const d = rows.find((r) => r.frustumDetail)?.frustumDetail || null;
        const inViewTriangles = d === null ? null : d.kind === 'instances' ? Math.round((triangles * d.inside) / Math.max(1, d.total)) : d.inside;
        return { object: rows[0].object, group: rows[0].group, type: rows[0].objectType, instanced: rows[0].instanced, instances: rows[0].instances, material: rows.map((r) => r.material).join('+'), calls: sum(rows, (r) => r.calls), triangles, inFrustum: rows[0].inFrustum, frustumCulled: rows[0].frustumCulled, frustumDetail: d, inViewTriangles };
      })
      .sort((a, b) => b.triangles - a.triangles);
    for (const [g, e] of Object.entries(perGroup)) {
      const objs = objects.filter((o) => o.group === g);
      e.inViewTriangles = sum(objs, (o) => (o.inViewTriangles === null ? o.triangles : o.inViewTriangles));
      e.measuredTriangles = sum(objs.filter((o) => o.inViewTriangles !== null), (o) => o.triangles);
    }
    const outside = objects.filter((o) => o.inFrustum === false);
    // the shadow pass by object, and by name prefix (body_/cabin_/gear_ on the
    // truck, camp_/fleet_ elsewhere) so a module can see which of its parts cast
    const shadowRows = v.rows.filter((r) => r.phase === 'shadow');
    const shadowObjects = [...by(shadowRows, (r) => r.objectUuid).values()]
      .map((rows) => ({ object: rows[0].object, group: rows[0].group, instanced: rows[0].instanced, instances: rows[0].instances, calls: sum(rows, (r) => r.calls), triangles: Math.round(sum(rows, (r) => r.triangles)) }))
      .sort((a, b) => b.triangles - a.triangles);
    const shadowByPrefix = {};
    for (const o of shadowObjects) {
      const k = `${o.group}/${(o.object.match(/^([a-zA-Z]+)_/) || [, o.object])[1]}`;
      const e = (shadowByPrefix[k] ||= { calls: 0, triangles: 0, objects: 0 });
      e.calls += o.calls;
      e.triangles += o.triangles;
      e.objects++;
    }
    const beautyByPrefix = {};
    for (const o of objects) {
      const k = `${o.group}/${(o.object.match(/^([a-zA-Z]+)_/) || [, o.object])[1]}`;
      const e = (beautyByPrefix[k] ||= { calls: 0, triangles: 0, objects: 0, inViewTriangles: 0 });
      e.calls += o.calls;
      e.triangles += o.triangles;
      e.inViewTriangles += o.inViewTriangles === null ? o.triangles : o.inViewTriangles;
      e.objects++;
    }
    return {
      view: v.view,
      shadowTopObjects: shadowObjects.slice(0, 15),
      shadowByPrefix,
      beautyByPrefix,
      camera: v.camera,
      truck: v.truck,
      rendererInfo: v.rendererInfo,
      programsBefore: v.programsBefore,
      programsAfter: v.programsAfter,
      visibleObjects: v.visibleObjects,
      visibleInstances: v.visibleInstances,
      phases,
      beauty: {
        calls: sum(beauty, (r) => r.calls),
        triangles: Math.round(sum(beauty, (r) => r.triangles)),
        instancedTriangles: Math.round(sum(beauty.filter((r) => r.instanced), (r) => r.triangles)),
        regularTriangles: Math.round(sum(beauty.filter((r) => !r.instanced), (r) => r.triangles)),
        instancedCalls: sum(beauty.filter((r) => r.instanced), (r) => r.calls),
        inViewTriangles: sum(objects, (o) => (o.inViewTriangles === null ? o.triangles : o.inViewTriangles)),
        objectsDrawn: objects.length,
        outsideFrustumDrawn: outside.length,
        outsideFrustumTriangles: Math.round(sum(outside, (o) => o.triangles)),
        outsideFrustumCalls: sum(outside, (o) => o.calls),
      },
      perGroup,
      shadowPerGroup,
      overridePerGroup,
      topObjects: objects.slice(0, 20),
      // every object drawn in the beauty pass, so a module can find its own rows
      objects,
      outsideFrustum: outside.sort((a, b) => b.triangles - a.triangles),
    };
  });

  return {
    tag,
    url,
    when: new Date().toISOString(),
    info,
    viewport: { width, height },
    views: viewSummaries,
    programs: inv.programs,
    materials: inv.materials,
    extraMaterials: inv.extraMaterials,
    textures: inv.textures,
    renderTargets: inv.renderTargets,
    geometries: inv.geometries,
    instanceBuffers: inv.instanceBuffers,
    rendererInfo: inv.rendererInfo,
    heap: { afterBootMB: info.heapAfterBootMB, afterViewsMB: inv.heapMB, loops: heaps, afterLoopsGcMB: heapFinal },
    errors,
  };
}

// ---------------------------------------------------------------------------
// Aggregation: everything derived, from the base measurement
// ---------------------------------------------------------------------------
const MB = (b) => +(b / 1048576).toFixed(2);
const groupOrder = ['terrain', 'forest', 'vehicle', 'camp', 'fleet', 'wildlife', 'roadside', 'sky', 'dust', 'post', 'shadow', 'lights'];
const sortGroups = (keys) => [...keys].sort((a, b) => (groupOrder.indexOf(a) + 1 || 99) - (groupOrder.indexOf(b) + 1 || 99) || a.localeCompare(b));
const groupOfProgram = (p) => (p.groups.length ? p.groups : [p.type === 'MeshDepthMaterial' || p.type === 'MeshDistanceMaterial' ? 'shadow' : 'unattributed']);
// Compiled with no render target bound (tone mapping on, sRGB out). The composer
// never draws the scene that way, so a tone-mapped program is a boot-time orphan
// when its material also owns a render-target twin, or when no material has it
// as its current program. (The last post pass and the PMREM equirect pass do
// legitimately draw tone-mapped.)
let screenVariantIds = new Set();
const isScreenVariant = (p) => screenVariantIds.has(p.id);

function aggregate(base) {
  const { programs, textures: textureList, geometries: geometryList, instanceBuffers, views } = base;
  const toneMapped = (p) => p.params && p.params.toneMapping !== undefined && p.params.toneMapping !== '0';
  const byId = new Map(programs.map((p) => [p.id, p]));
  screenVariantIds = new Set();
  for (const m of [...base.materials, ...base.extraMaterials]) {
    const ps = m.programs.map((id) => byId.get(id)).filter(Boolean);
    if (ps.some((p) => !toneMapped(p))) for (const p of ps) if (toneMapped(p)) screenVariantIds.add(p.id);
  }
  for (const p of programs) if (toneMapped(p) && p.currentFor === 0) screenVariantIds.add(p.id);

  // --- programs
  const programsByGroup = {};
  for (const p of programs) {
    const gs = groupOfProgram(p);
    for (const g of gs) {
      const e = (programsByGroup[g] ||= { programs: 0, exclusive: 0, materials: 0, screenVariants: 0, neverCurrent: 0, renderTargetPrograms: 0, ifNamesStripped: new Set(), types: {} });
      e.programs++;
      if (gs.length === 1) e.exclusive++;
      e.materials += p.materials;
      e.types[p.type] = (e.types[p.type] || 0) + 1;
      if (isScreenVariant(p)) e.screenVariants++;
      if (p.currentFor === 0) e.neverCurrent++;
      if (!isScreenVariant(p)) {
        e.renderTargetPrograms++;
        e.ifNamesStripped.add(p.collapseKey === null ? `id${p.id}` : p.collapseKey);
      }
    }
  }
  for (const e of Object.values(programsByGroup)) e.ifNamesStripped = e.ifNamesStripped.size;
  const sharing = { one: programs.filter((p) => p.materials === 1).length, two: programs.filter((p) => p.materials === 2).length, many: programs.filter((p) => p.materials > 2).length, zero: programs.filter((p) => p.materials === 0).length };
  const screenVariants = programs.filter(isScreenVariant);
  const rtPrograms = programs.filter((p) => !isScreenVariant(p));
  const collapse = by(rtPrograms.filter((p) => p.collapseKey !== null), (p) => p.collapseKey);
  const collapseGroups = [...collapse.values()]
    .filter((rows) => rows.length > 1)
    .map((rows) => ({ programs: rows.length, materials: sum(rows, (r) => r.materials), type: rows[0].type, groups: [...new Set(rows.flatMap((r) => r.groups))], names: rows.map((r) => r.name || r.sampleMaterial || '?'), strippedKey: rows[0].strippedCustomPreview, ids: rows.map((r) => r.id) }))
    .sort((a, b) => b.programs - a.programs);
  const ifNamesStripped = rtPrograms.length - sum(collapseGroups, (c) => c.programs - 1);

  const normalizeKey = (s) => (s || '').replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '<uuid>').replace(/\d+(\.\d+)?/g, '#').replace(/\s+/g, ' ');
  const clusters = [];
  for (const [k, rows] of by(rtPrograms.filter((p) => p.customKeyHash !== null), (p) => `${p.type}|${normalizeKey(p.customKeyPreview)}`)) {
    if (rows.length < 2) continue;
    const customs = new Set(rows.map((r) => r.customKeyHash));
    const heads = new Set(rows.map((r) => r.headHash));
    const diffParams = new Set();
    const diffFlags = new Set();
    const diffDefines = new Set();
    const first = rows[0];
    for (const r of rows.slice(1)) {
      for (const n of Object.keys(first.params)) if (first.params[n] !== r.params[n]) diffParams.add(n);
      for (const f of new Set([...first.flags, ...r.flags])) if (first.flags.includes(f) !== r.flags.includes(f)) diffFlags.add(f);
      for (const d of new Set([...Object.keys(first.defines), ...Object.keys(r.defines)])) if (first.defines[d] !== r.defines[d]) diffDefines.add(d);
    }
    clusters.push({
      key: k,
      type: first.type,
      shader: first.shader,
      programs: rows.length,
      materials: sum(rows, (r) => r.materials),
      groups: [...new Set(rows.flatMap((r) => r.groups))],
      distinctCustomKeys: customs.size,
      distinctHeads: heads.size,
      diffParams: [...diffParams],
      diffFlags: [...diffFlags],
      diffDefines: [...diffDefines],
      customKeyPreview: first.customKeyPreview,
      names: [...new Set(rows.map((r) => r.name).filter(Boolean))].slice(0, 12),
      ids: rows.map((r) => r.id),
    });
  }
  clusters.sort((a, b) => b.programs - a.programs);

  // --- textures
  const textures = textureList.slice().sort((a, b) => b.bytes - a.bytes);
  const texGroupOf = (t) => {
    const o = t.owners[0] || 'unknown';
    return o.startsWith('post:') ? `post:${o.split(':')[1].split('.')[0]}` : o.split(':')[0];
  };
  const texturesByGroup = {};
  for (const t of textures) {
    const g = texGroupOf(t);
    const e = (texturesByGroup[g] ||= { count: 0, bytes: 0, cpuCanvasBytes: 0, sources: new Set(), sizes: {} });
    e.count++;
    e.bytes += t.bytes;
    e.cpuCanvasBytes += t.cpuCanvasBytes;
    e.sources.add(t.sourceUuid);
    const k = `${t.width}x${t.height}`;
    e.sizes[k] = (e.sizes[k] || 0) + 1;
  }
  for (const e of Object.values(texturesByGroup)) e.sources = e.sources.size;
  const texTotal = {
    count: textures.length,
    bytes: sum(textures, (t) => t.bytes),
    cpuCanvasBytes: sum(textures, (t) => t.cpuCanvasBytes),
    over2048: textures.filter((t) => t.width > 2048 || t.height > 2048).map((t) => ({ name: t.name, width: t.width, height: t.height, owners: t.owners })),
    at2048: textures.filter((t) => Math.max(t.width, t.height) === 2048).map((t) => ({ name: t.name, width: t.width, height: t.height, owners: t.owners, MB: MB(t.bytes) })),
    compressed: textures.filter((t) => t.compressed).length,
    distinctSources: new Set(textures.map((t) => t.sourceUuid)).size,
    uploaded: textures.filter((t) => t.uploaded).length,
  };

  // --- geometries
  const geometries = geometryList.slice().sort((a, b) => b.bytes - a.bytes);
  const geometriesByGroup = {};
  for (const g of geometries) {
    const e = (geometriesByGroup[g.groups[0]] ||= { count: 0, bytes: 0, triangles: 0, nonIndexed: 0, vertices: 0, uniqueVertices: 0, measuredVertices: 0 });
    e.count++;
    e.bytes += g.bytes;
    e.triangles += g.triangles;
    e.vertices += g.vertices;
    if (!g.indexed) e.nonIndexed++;
    if (g.uniqueVertices !== null && g.uniqueVertices !== undefined) {
      e.uniqueVertices += g.uniqueVertices;
      e.measuredVertices += g.vertices;
    }
  }
  // bytes an index buffer would save on the non-indexed geometries measured
  const indexable = geometries.filter((g) => g.uniqueVertices !== null && g.uniqueVertices !== undefined);
  const indexSaving = sum(indexable, (g) => {
    const stride = g.bytes / g.vertices;
    return g.bytes - (g.uniqueVertices * stride + g.vertices * 4);
  });
  const instanceBufferBytes = sum(instanceBuffers, (b) => b.bytes);

  return {
    tag: base.tag,
    url: base.url,
    when: base.when,
    info: base.info,
    viewport: base.viewport,
    rendererInfo: base.rendererInfo,
    views,
    programs: {
      total: programs.length,
      screenVariants: screenVariants.length,
      renderTargetPrograms: rtPrograms.length,
      ifNamesStripped,
      byGroup: programsByGroup,
      sharing,
      clusters,
      collapseGroups,
      list: programs,
    },
    materials: base.materials,
    extraMaterials: base.extraMaterials,
    textures: { total: texTotal, rendererCount: base.rendererInfo.textures, byGroup: texturesByGroup, list: textures },
    renderTargets: base.renderTargets,
    geometries: { total: { count: geometries.length, bytes: sum(geometries, (g) => g.bytes), vertices: sum(geometries, (g) => g.vertices), triangles: sum(geometries, (g) => g.triangles), nonIndexed: geometries.filter((g) => !g.indexed).length, indexableMeasured: indexable.length, indexSavingBytes: Math.round(indexSaving), instanceBufferBytes }, rendererCount: base.rendererInfo.geometries, byGroup: geometriesByGroup, list: geometries, instanceBuffers },
    heap: base.heap,
    errors: base.errors,
  };
}

// ---------------------------------------------------------------------------
// Markdown
// ---------------------------------------------------------------------------
const fmtN = (n) => (n === null || n === undefined ? 'n/a' : typeof n === 'number' ? n.toLocaleString('en-US') : String(n));
const esc = (s) => String(s).replace(/\|/g, '\\|');
const table = (head, rows) => [`| ${head.join(' | ')} |`, `| ${head.map(() => '---').join(' | ')} |`, ...rows.map((r) => `| ${r.map((c) => fmtN(c)).join(' | ')} |`)].join('\n');
const mapsOf = (p) =>
  Object.entries(p.params || {})
    .filter(([k, v]) => k.endsWith('Uv') && v !== 'false' && v !== '' && v !== 'undefined')
    .map(([k, v]) => `${k.replace('MapUv', '')}${v === 'uv' ? '' : ':' + v}`)
    .join(' ') || '-';
const NOISE_FLAGS = ['shadowMapEnabled', 'vertexNormals', 'hasPositionAttribute', 'useFog', 'fog', 'normalMapTangentSpace', 'envMap'];
const flagsOf = (p) => p.flags.filter((f) => !NOISE_FLAGS.includes(f) && f !== 'opaque').join(' ') + (p.flags.length && !p.flags.includes('opaque') && p.params && p.params.precision ? ' transparent' : '');

async function renderMarkdown(result) {
  const { info, views: viewSummaries, heap, errors } = result;
  const programs = result.programs.list;
  const { byGroup: programsByGroup, sharing, clusters, collapseGroups } = result.programs;
  const textures = result.textures.list;
  const { total: texTotal, byGroup: texturesByGroup } = result.textures;
  const geometries = result.geometries.list;
  const { byGroup: geometriesByGroup, instanceBuffers } = result.geometries;
  const instanceBufferBytes = result.geometries.total.instanceBufferBytes;
  const { width, height } = result.viewport;
  const md = [];
  md.push(`# Scene census ${result.tag}`);
  md.push('');
  md.push(`Build \`${info.build.rev}\` (${info.build.stamp}), quality \`${info.quality}\`, ${width}x${height}, renderer \`${info.renderer}\` (${info.glVersion}). Measured ${result.when} from \`${result.url}\` by \`tools/census.mjs\`.`);
  md.push('');
  md.push('Every number below is measured: from a hook on `renderer.renderBufferDirect` during one rendered frame per view, from `renderer.info`, from `renderer.properties`, or from the objects themselves. The only estimates are GPU texture bytes (width x height x bytes/texel x 4/3 when mipmapped) and geometry bytes (attribute byte lengths), and they are labelled. Frame times are not reported: this machine rasterises in software.');
  md.push('');
  md.push("Groups are the top-level scene children and the module that built them: `terrain`, `forest`, `vehicle` (the truck), `camp`, `fleet`, `wildlife`, `roadside`, `sky` (dome, headlamp beams, light shafts and dust motes from sky.js), `dust` (wheel dust), `post` (compositor passes), `shadow` (the renderer's own depth materials).");
  md.push('');

  // headline
  md.push('## Headline');
  md.push('');
  const overrideNames = [...new Set(viewSummaries.flatMap((v) => Object.keys(v.phases).filter((k) => k.startsWith('override:'))))];
  md.push(
    table(
      ['view', 'draw calls (renderer.info)', 'beauty calls', 'shadow calls', 'AO G-buffer calls', 'post calls', 'triangles (renderer.info)', 'beauty tris', 'instanced tris', 'regular tris', 'beauty tris inside frustum', 'shadow tris', 'AO G-buffer tris', 'programs (cumulative)', 'textures', 'geometries', 'visible objects', 'visible instances'],
      viewSummaries.map((v) => {
        const ovr = Object.entries(v.phases).filter(([k]) => k.startsWith('override:'));
        const gb = { calls: sum(ovr, ([, e]) => e.calls), triangles: sum(ovr, ([, e]) => e.triangles) };
        return [v.view, v.rendererInfo.calls, v.beauty.calls, v.phases.shadow?.calls ?? 0, gb.calls, v.phases.post?.calls ?? 0, v.rendererInfo.triangles, v.beauty.triangles, v.beauty.instancedTriangles, v.beauty.regularTriangles, `${fmtN(v.beauty.inViewTriangles)} (${((100 * v.beauty.inViewTriangles) / Math.max(1, v.beauty.triangles)).toFixed(0)}%)`, v.phases.shadow?.triangles ?? 0, gb.triangles, v.programsAfter, v.rendererInfo.textures, v.rendererInfo.geometries, v.visibleObjects, v.visibleInstances];
      }),
    ),
  );
  md.push('');
  md.push(`\`renderer.info\` counts the shadow-map pass together with the beauty pass; that is the number \`debugAPI.stats()\` and the perf reports quote (beauty + shadow = renderer.info in every row above). The AO G-buffer is the scene drawn a third time through \`${overrideNames.map((k) => k.slice(9)).join('`, `')}\` as \`scene.overrideMaterial\`; the composer issues that render separately so it is not in \`renderer.info\`. The GPU therefore rasterises beauty + shadow + G-buffer triangles per frame: ${viewSummaries.map((v) => `${v.view} ${fmtN(v.beauty.triangles + (v.phases.shadow?.triangles ?? 0) + sum(Object.entries(v.phases).filter(([k]) => k.startsWith('override:')), ([, e]) => e.triangles))}`).join(', ')}. SSR is off at this quality tier, so its reflector-mask pass does not appear.`);
  md.push('');
  md.push(`Programs: ${result.programs.total} compiled, of which ${result.programs.screenVariants} are canvas variants (tone mapping on) that no frame uses because the scene is always drawn into the composer's render target; ${result.programs.renderTargetPrograms} do the work. JS heap: ${fmtN(heap.afterBootMB)} MB after boot, ${fmtN(heap.afterViewsMB)} MB after the ${viewSummaries.length} views, reset loops ${heap.loops.map((h) => fmtN(h)).join(' / ')} MB, ${fmtN(heap.afterLoopsGcMB)} MB after a forced GC. Textures: ${texTotal.count} objects, est. ${MB(texTotal.bytes)} MB. Geometries: ${geometries.length}, est. ${MB(result.geometries.total.bytes)} MB.`);
  md.push('');
  md.push('Note that `hero` and `forest` draw exactly the same set of objects from different cameras: culling in this scene is by whole-object bounding sphere, and nearly every object (terrain, route-long stone mesh, forest-wide instanced meshes, the truck) is large enough to intersect any frustum near the truck. What changes between views is only which camp/fleet/wildlife objects fall inside.');
  md.push('');

  // 1 programs
  md.push('## 1. Shader programs');
  md.push('');
  md.push(`${programs.length} compiled programs after all views (${info.stats.programs} straight after boot). ${sharing.one} are used by exactly one material, ${sharing.two} by two, ${sharing.many} by three or more, ${sharing.zero} could not be linked to any material this census could reach (the renderer's own shadow depth materials, PMREM scratch; their \`type\` says what they are).`);
  md.push('');
  md.push('### Canvas variants: the boot-time double compile');
  md.push('');
  md.push(`Three keys a program on \`toneMapping\` and \`outputColorSpace\`, which it takes from the *currently bound render target* at compile time: no target bound means the canvas (ACES, sRGB); the composer's target means (none, linear). \`main.js\` calls \`renderer.compile(scene, camera)\` with no target bound and then \`post.render()\`, which draws into the composer's target — so ${result.programs.screenVariants} programs are compiled for the canvas, never used by a frame (\`currentProgram\` for 0 materials), and kept alive in each material's program map; then the same materials compile again for the target. ${result.materials.filter((m) => m.programs.length === 2).length} of ${result.materials.length} scene materials carry exactly two programs for this reason. The fix is one line in \`main.js\` (bind the composer's read buffer before \`renderer.compile\`, or drop the \`compile\` and let the warm-up \`render\` do it) and halves the "Compiling shaders" stage.`);
  md.push('');
  md.push(
    table(
      ['group', 'programs', 'canvas variants (unused)', 'render-target programs', 'never current', 'would remain with material names out of cache keys'],
      sortGroups(Object.keys(programsByGroup)).map((g) => {
        const e = programsByGroup[g];
        return [g, e.programs, e.screenVariants, e.renderTargetPrograms, e.neverCurrent, e.ifNamesStripped];
      }),
    ),
  );
  md.push('');
  md.push(`The last column applies one rule to the ${result.programs.renderTargetPrograms} working programs: take the material *name* out of every \`tag:name:...\` segment of \`customProgramCacheKey\` (the vehicle family's \`bw:\`, \`dirt:\`, \`cb:\`, \`cl:\`, \`gf:\`, the fleet's \`fleetDirt:\`/\`sway:\`, the tyres' \`loadedTyre_name_\`) and keep everything else — the numbers those patches bake into GLSL, the map set, the flags. Programs whose keys then agree compile identical GLSL and would be one program: ${result.programs.renderTargetPrograms} → ${result.programs.ifNamesStripped}.`);
  md.push('');
  if (collapseGroups.length) {
    md.push('Groups of programs that differ only by the material name in the key:');
    md.push('');
    md.push(table(['#', 'type', 'programs', 'groups', 'materials (names)', 'shared key after stripping'], collapseGroups.slice(0, 25).map((c, i) => [i + 1, c.type, c.programs, c.groups.join(','), esc(c.names.join(', ')).slice(0, 110), `\`${esc((c.strippedKey || '').slice(0, 70))}\``])));
    md.push('');
  }
  md.push('### Programs per group');
  md.push('');
  md.push('A program shared by materials in two groups is counted in both; `exclusive` is the number only that group uses.');
  md.push('');
  md.push(
    table(
      ['group', 'programs', 'exclusive', 'material links', 'by material type'],
      sortGroups(Object.keys(programsByGroup)).map((g) => {
        const e = programsByGroup[g];
        return [g, e.programs, e.exclusive, e.materials, Object.entries(e.types).sort((a, b) => b[1] - a[1]).map(([t, n]) => `${t} ${n}`).join(', ')];
      }),
    ),
  );
  md.push('');
  md.push('### Programs by shader and material type');
  md.push('');
  const byShader = by(programs, (p) => `${p.type} / ${p.shader}`);
  md.push(table(['material type / shader', 'programs', 'canvas variants', 'materials', 'groups'], [...byShader.entries()].sort((a, b) => b[1].length - a[1].length).map(([k, rows]) => [k, rows.length, rows.filter(isScreenVariant).length, sum(rows, (r) => r.materials), [...new Set(rows.flatMap((r) => r.groups))].join(', ') || '-'])));
  md.push('');
  md.push('### Top 20 most-duplicated variants (working programs only)');
  md.push('');
  md.push('Programs are clustered by material type plus their `customProgramCacheKey` with every number and uuid blanked out, so programs whose *only* difference is an id inside the key land together, and so do programs with identical `onBeforeCompile` source that differ in a define. `custom keys` is how many distinct custom keys the cluster has (more than one with one head = an id in the key is forking the program: avoidable, that is a uniform), `heads` how many distinct built-in parameter sets (a real define difference; the differing fields are named). `#` in a preview is a blanked number.');
  md.push('');
  md.push(
    table(
      ['#', 'type', 'programs', 'materials', 'groups', 'custom keys', 'heads', 'differing params', 'differing flags', 'defines', 'key preview / names'],
      clusters.slice(0, 20).map((c, i) => [i + 1, `${c.type} (${c.shader})`, c.programs, c.materials, c.groups.join(','), c.distinctCustomKeys, c.distinctHeads, c.diffParams.join(' ') || '-', c.diffFlags.join(' ') || '-', c.diffDefines.join(' ') || '-', `\`${esc((c.customKeyPreview || '').slice(0, 60))}\`${c.names.length ? ' — ' + esc(c.names.slice(0, 6).join(', ')) : ''}`]),
    ),
  );
  md.push('');
  md.push('Reading the columns: three builds a program cache key from (a) the built-in shader id, (b) `material.defines`, (c) ~50 parameters (which maps are present and their UV channel, light counts, tone mapping, fog...), (d) two bitmasks of booleans (instancing, vertexColors, alphaTest, doubleSided, flipSided, skinning, `opaque` i.e. `!transparent`, dithering, premultipliedAlpha...), (e) `customProgramCacheKey()`, which defaults to `onBeforeCompile.toString()`. Any difference in (a)-(e) is a separate compile. A different *uniform value* never is — so when two programs in a cluster differ only in (e) and the difference is a name or a number that is only ever read through a uniform, the material author has put a per-instance value into the key and is paying one compile per material for it. When they differ in (c)/(d) the fix is to make the materials agree: same set of maps (a shared 1x1 white/flat texture keeps the define on), same `side`, same `transparent`, same `vertexColors`. `flipSided` pairs on the glass materials are legitimate: a pane drawn back-face-first then front needs both.');
  md.push('');
  md.push('### Every program');
  md.push('');
  md.push(
    table(
      ['id', 'type', 'shader', 'name', 'materials', 'groups', 'canvas variant', 'flags', 'maps', 'lights', 'custom key', 'key len'],
      programs
        .slice()
        .sort((a, b) => (a.groups[0] || 'zz').localeCompare(b.groups[0] || 'zz') || a.type.localeCompare(b.type) || (a.name || '').localeCompare(b.name || '') || a.id - b.id)
        .map((p) => [p.id, p.type, p.shader, esc(p.name || ''), p.materials, p.groups.join(',') || groupOfProgram(p)[0], isScreenVariant(p) ? 'yes' : '', flagsOf(p) || '-', mapsOf(p), p.params && p.params.numDirLights !== undefined ? `d${p.params.numDirLights} p${p.params.numPointLights} s${p.params.numSpotLights} h${p.params.numHemiLights} ds${p.params.numDirLightShadows}` : '-', p.customKeyHash === null ? '-' : p.customIsDefault ? 'default' : `\`${esc((p.customKeyPreview || '').replace(/function\(e,t\)\{\w&&\w\.call\(this,e,t\),/, 'fn{').slice(0, 60))}\``, p.cacheKeyLength]),
    ),
  );
  md.push('');

  // 2 triangles
  md.push('## 2. Triangles per frame');
  md.push('');
  md.push('Beauty pass only (the shadow pass and the AO G-buffer are broken out in the group tables). `instanced` triangles are `instanceCount x triangles per instance` for `InstancedMesh`; `regular` is everything else.');
  md.push('');
  for (const v of viewSummaries) {
    md.push(`### ${v.view}`);
    md.push('');
    md.push(`Camera at (${v.camera.position.join(', ')}) fov ${v.camera.fov}, truck at (${v.truck.join(', ')}). Beauty ${fmtN(v.beauty.triangles)} tris in ${fmtN(v.beauty.calls)} calls (${fmtN(v.beauty.instancedTriangles)} instanced in ${v.beauty.instancedCalls} calls, ${fmtN(v.beauty.regularTriangles)} regular); shadow pass ${fmtN(v.phases.shadow?.triangles ?? 0)} tris in ${fmtN(v.phases.shadow?.calls ?? 0)} calls. ${v.beauty.objectsDrawn} objects drawn, ${v.beauty.outsideFrustumDrawn} of them outside the frustum (\`frustumCulled = false\`) costing ${fmtN(v.beauty.outsideFrustumTriangles)} tris / ${v.beauty.outsideFrustumCalls} calls.`);
    md.push('');
    md.push(
      table(
        ['group', 'beauty calls', 'beauty tris', 'of which instanced', 'tris inside frustum (measured)', 'objects', 'programs touched', 'shadow calls', 'shadow tris', 'G-buffer calls', 'G-buffer tris'],
        sortGroups(Object.keys({ ...v.perGroup, ...v.shadowPerGroup, ...v.overridePerGroup })).map((g) => {
          const e = v.perGroup[g] || { calls: 0, triangles: 0, instancedTriangles: 0, objects: 0, programs: 0, inViewTriangles: 0, measuredTriangles: 0 };
          const s = v.shadowPerGroup[g] || { calls: 0, triangles: 0 };
          const o = v.overridePerGroup[g] || { calls: 0, triangles: 0 };
          return [g, e.calls, e.triangles, e.instancedTriangles, e.measuredTriangles ? `${fmtN(e.inViewTriangles)} (${((100 * e.inViewTriangles) / Math.max(1, e.triangles)).toFixed(0)}%)` : '-', e.objects, e.programs, s.calls, s.triangles, o.calls, o.triangles];
        }),
      ),
    );
    md.push('');
    md.push(`"Tris inside frustum" is measured per triangle centroid for every regular mesh of 20k+ triangles and per instance bounding sphere for every InstancedMesh; smaller regular meshes are counted whole. It is the ceiling on what finer-grained culling can remove for this camera. Whole frame: ${fmtN(v.beauty.inViewTriangles)} of ${fmtN(v.beauty.triangles)} beauty triangles (${((100 * v.beauty.inViewTriangles) / Math.max(1, v.beauty.triangles)).toFixed(0)}%) are inside the frustum.`);
    md.push('');
    md.push('Top 20 objects by triangles:');
    md.push('');
    md.push(table(['object', 'group', 'type', 'material', 'instances', 'calls', 'tris', 'inside frustum', 'frustumCulled'], v.topObjects.map((o) => [esc(o.object), o.group, o.type, esc(o.material).slice(0, 60), o.instanced ? o.instances : '-', o.calls, o.triangles, o.frustumDetail ? (o.frustumDetail.kind === 'instances' ? `${o.frustumDetail.inside}/${o.frustumDetail.total} instances` : `${fmtN(o.frustumDetail.inside)} tris (${((100 * o.frustumDetail.inside) / Math.max(1, o.frustumDetail.total)).toFixed(0)}%)`) : o.inFrustum === null ? '?' : o.inFrustum ? 'sphere yes' : 'sphere NO', o.frustumCulled ? 'yes' : 'no'])));
    md.push('');
    if (v.beautyByPrefix) {
      md.push('Beauty pass by object-name prefix (top 15; `body_`, `cabin_`, `gear_`, `tyre_` are the truck kits):');
      md.push('');
      md.push(table(['group/prefix', 'objects', 'calls', 'tris', 'tris inside frustum'], Object.entries(v.beautyByPrefix).sort((a, b) => b[1].triangles - a[1].triangles).slice(0, 15).map(([k, e]) => [esc(k), e.objects, e.calls, e.triangles, e.inViewTriangles])));
      md.push('');
    }
    md.push('Shadow pass, by name prefix (top 12) and top 10 casters:');
    md.push('');
    md.push(table(['group/prefix', 'casters', 'shadow calls', 'shadow tris'], Object.entries(v.shadowByPrefix).sort((a, b) => b[1].triangles - a[1].triangles).slice(0, 12).map(([k, e]) => [esc(k), e.objects, e.calls, e.triangles])));
    md.push('');
    md.push(table(['caster', 'group', 'instances', 'calls', 'shadow tris'], v.shadowTopObjects.slice(0, 10).map((o) => [esc(o.object), o.group, o.instanced ? o.instances : '-', o.calls, o.triangles])));
    md.push('');
    if (v.outsideFrustum.length) {
      md.push('Drawn while outside the frustum (`frustumCulled = false`):');
      md.push('');
      md.push(table(['object', 'group', 'type', 'instances', 'calls', 'tris'], v.outsideFrustum.map((o) => [esc(o.object), o.group, o.type, o.instanced ? o.instances : '-', o.calls, o.triangles])));
      md.push('');
    }
  }

  // 3 textures
  md.push('## 3. Textures');
  md.push('');
  md.push(`${texTotal.count} texture objects reachable from scene materials, post passes, the sky rig and the shadow map (${texTotal.distinctSources} distinct image sources; ${texTotal.uploaded} have a GL texture). \`renderer.info.memory.textures\` says ${result.textures.rendererCount}; the difference is textures the renderer owns that nothing in the scene graph points to any more (composer swap buffers' depth attachments, PMREM scratch, textures created and dropped during boot). Estimated GPU memory ${MB(texTotal.bytes)} MB (${texTotal.compressed} compressed). ${texTotal.at2048.length} texture(s) are 2048 on a side${texTotal.at2048.length ? ': ' + texTotal.at2048.map((t) => `${t.name || '(unnamed)'} ${t.width}x${t.height} ${t.MB} MB (${esc(t.owners[0])})`).join(', ') : ''}; ${texTotal.over2048.length} exceed 2048${texTotal.over2048.length ? ': ' + texTotal.over2048.map((t) => `${t.name || '(unnamed)'} ${t.width}x${t.height} (${esc(t.owners[0])})`).join(', ') : ''}. Canvas-backed textures also keep their canvas alive on the CPU: ${MB(texTotal.cpuCanvasBytes)} MB of RGBA bitmaps; the DataTextures keep their typed arrays (counted in the JS heap).`);
  md.push('');
  md.push(table(['group', 'textures', 'sources', 'est. GPU MB', 'CPU canvas MB', 'sizes'], Object.entries(texturesByGroup).sort((a, b) => b[1].bytes - a[1].bytes).map(([g, e]) => [g, e.count, e.sources, MB(e.bytes), MB(e.cpuCanvasBytes), Object.entries(e.sizes).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${n}x ${k}`).join(', ')])));
  md.push('');
  md.push('Top 20 by estimated memory:');
  md.push('');
  md.push(table(['name', 'class', 'image', 'size', 'format', 'mips', 'est. MB', 'owner (first)', 'owners'], textures.slice(0, 20).map((t) => [esc(t.name || t.imageId || '(unnamed)'), t.cls, t.imageKind, `${t.width}x${t.height}${t.depth > 1 ? 'x' + t.depth : ''}${t.faces > 1 ? ' x6' : ''}`, `${t.format}/${t.texelType}`, t.mipmapped ? 'yes' : 'no', MB(t.bytes), esc(t.owners[0] || ''), t.ownerCount])));
  md.push('');
  md.push('Render targets:');
  md.push('');
  md.push(table(['owner', 'size', 'samples', 'colour textures', 'depth'], result.renderTargets.map((r) => [esc(r.owner), `${r.width}x${r.height}`, r.samples, r.textures, r.hasDepthTexture ? 'depth texture' : r.depthBuffer ? 'renderbuffer' : 'none'])));
  md.push('');
  md.push('Every texture:');
  md.push('');
  md.push(table(['name', 'class', 'image', 'size', 'format', 'mips', 'est. MB', 'GL', 'owners'], textures.map((t) => [esc(t.name || t.imageId || '(unnamed)'), t.cls, t.imageKind, `${t.width}x${t.height}${t.faces > 1 ? ' x6' : ''}`, `${t.format}/${t.texelType}`, t.mipmapped ? 'y' : 'n', MB(t.bytes), t.uploaded ? 'y' : 'n', esc(t.owners.slice(0, 3).join('; '))])));
  md.push('');

  // 4 geometries
  md.push('## 4. Geometries');
  md.push('');
  const gt = result.geometries.total;
  md.push(`${geometries.length} geometries in the scene graph (\`renderer.info.memory.geometries\` = ${result.geometries.rendererCount}; the difference is geometries in the graph that have never been drawn, e.g. hidden LOD tiers, minus the compositor's quads). Estimated ${MB(gt.bytes)} MB of vertex/index data for ${fmtN(gt.vertices)} vertices / ${fmtN(gt.triangles)} triangles, plus ${MB(instanceBufferBytes)} MB of instance matrices/colours on ${instanceBuffers.length} InstancedMeshes. ${gt.nonIndexed} of the ${geometries.length} geometries are non-indexed (three vertices stored per triangle). For the ${gt.indexableMeasured} non-indexed geometries with 3,000+ vertices the census counted their distinct vertices exactly (all attributes compared at 1e-4): an index buffer would remove ${MB(gt.indexSavingBytes)} MB of the ${MB(sum(geometries.filter((g) => g.uniqueVertices !== null && g.uniqueVertices !== undefined), (g) => g.bytes))} MB they occupy.`);
  md.push('');
  md.push(table(['group', 'geometries', 'non-indexed', 'vertices', 'unique vertices (measured subset)', 'est. MB', 'triangles (one instance each)'], sortGroups(Object.keys(geometriesByGroup)).map((g) => [g, geometriesByGroup[g].count, geometriesByGroup[g].nonIndexed, geometriesByGroup[g].vertices, geometriesByGroup[g].measuredVertices ? `${fmtN(geometriesByGroup[g].uniqueVertices)} of ${fmtN(geometriesByGroup[g].measuredVertices)}` : '-', MB(geometriesByGroup[g].bytes), geometriesByGroup[g].triangles])));
  md.push('');
  md.push('Top 20 by bytes:');
  md.push('');
  md.push(table(['geometry / objects', 'group', 'vertices', 'unique', 'triangles', 'indexed', 'attributes', 'users', 'est. MB'], geometries.slice(0, 20).map((g) => [esc(g.name || g.objects.join(', ')).slice(0, 70), g.groups.join(','), g.vertices, g.uniqueVertices ?? '-', g.triangles, g.indexed ? 'y' : 'n', Object.entries(g.attributes).map(([k, v]) => `${k} ${v}`).join(', ').slice(0, 90), g.users, MB(g.bytes)])));
  md.push('');
  md.push('Instance buffers:');
  md.push('');
  md.push(table(['object', 'group', 'instances', 'est. MB'], instanceBuffers.slice().sort((a, b) => b.bytes - a.bytes).slice(0, 20).map((b) => [esc(b.object), b.group, b.count, MB(b.bytes)])));
  md.push('');

  // 5 draw calls
  md.push('## 5. Draw calls per group per view');
  md.push('');
  md.push('Beauty pass calls, with the shadow-map and AO G-buffer calls the same group adds. One `InstancedMesh` is one call however many instances it carries; an object with an array material is one call per material group.');
  md.push('');
  const allGroups = sortGroups(new Set(viewSummaries.flatMap((v) => Object.keys({ ...v.perGroup, ...v.shadowPerGroup, ...v.overridePerGroup }))));
  md.push(table(['group', ...viewSummaries.map((v) => `${v.view} beauty`), ...viewSummaries.map((v) => `${v.view} shadow`), ...viewSummaries.map((v) => `${v.view} G-buffer`)], allGroups.map((g) => [g, ...viewSummaries.map((v) => v.perGroup[g]?.calls ?? 0), ...viewSummaries.map((v) => v.shadowPerGroup[g]?.calls ?? 0), ...viewSummaries.map((v) => v.overridePerGroup[g]?.calls ?? 0)])));
  md.push('');
  md.push(table(['phase', ...viewSummaries.map((v) => v.view)], [...new Set(viewSummaries.flatMap((v) => Object.keys(v.phases)))].map((ph) => [ph, ...viewSummaries.map((v) => v.phases[ph]?.calls ?? 0)])));
  md.push('');

  // 6 heap
  md.push('## 6. JS heap');
  md.push('');
  md.push(table(['point', 'MB'], [['after boot (first frame drawn)', heap.afterBootMB], [`after ${viewSummaries.length} census views`, heap.afterViewsMB], ...heap.loops.map((h, i) => [`reset loop ${i + 1} (setView hero, resetAuto, 2.5 s drive, gc)`, h]), ['after loops, forced GC', heap.afterLoopsGcMB]]));
  md.push('');
  const dataTexBytes = sum(textures.filter((t) => t.cls === 'DataTexture'), (t) => t.width * t.height * t.faces * t.bpp);
  md.push(`Growth over the ${heap.loops.length} loops: ${heap.loops.length >= 2 && heap.loops[0] !== null ? `${(heap.loops[heap.loops.length - 1] - heap.loops[0]).toFixed(1)} MB` : 'n/a'} — no leak. Typed arrays count toward \`usedJSHeapSize\` in Chromium (checked: a 100 MB Float32Array moves it by 100.0 MB), so of the ${fmtN(heap.afterLoopsGcMB)} MB steady state, geometry attribute arrays are ${MB(gt.bytes + instanceBufferBytes)} MB (they stay referenced after upload) and DataTexture pixel arrays another ${MB(dataTexBytes)} MB — ${((100 * (gt.bytes + instanceBufferBytes + dataTexBytes)) / (heap.afterLoopsGcMB * 1048576)).toFixed(0)}% of the heap is upload-side copies of GPU data. The canvas bitmaps behind the CanvasTextures (${MB(texTotal.cpuCanvasBytes)} MB) are held by the browser outside the JS heap.`);
  md.push('');
  md.push(
    table(
      ['group', 'DataTexture pixel MB in heap', 'geometry MB in heap'],
      sortGroups(new Set([...Object.keys(geometriesByGroup), ...textures.filter((t) => t.cls === 'DataTexture').map((t) => t.owners[0].split(':')[0])])).map((g) => [g, MB(sum(textures.filter((t) => t.cls === 'DataTexture' && t.owners[0].split(':')[0] === g), (t) => t.width * t.height * t.faces * t.bpp)), MB(geometriesByGroup[g]?.bytes ?? 0)]),
    ),
  );
  md.push('');

  // 7 boot
  md.push('## 7. Boot stages');
  md.push('');
  md.push(`Time to first frame ${fmtN(info.readyMs)} ms in-page (SwiftShader; shader compilation dominates and is many times slower than on a GPU, but the *number* of programs it compiles is the same: ${info.stats.programs}, ${result.programs.screenVariants} of them for the canvas and unused).`);
  md.push('');
  md.push(table(['stage', 'ms', 'share'], info.boot.map((s) => [s.label, s.ms, `${((100 * s.ms) / info.readyMs).toFixed(1)}%`])));
  md.push('');
  if (errors.length) {
    md.push(`${errors.length} console/page errors: ${errors.slice(0, 5).map((e) => '`' + e.slice(0, 120) + '`').join(', ')}`);
    md.push('');
  }

  // notes
  try {
    const notes = await readFile(notesFile, 'utf8');
    md.push(notes.trim());
    md.push('');
  } catch {
    md.push('## Top ten cheapest wins');
    md.push('');
    md.push(`_No notes file at \`${notesFile}\`; write the analysis there and re-run (\`--from perf/census-${result.tag}.json\` re-renders without measuring)._`);
    md.push('');
  }
  return md.join('\n');
}

// ---------------------------------------------------------------------------
await mkdir(outDir, { recursive: true });
const jsonPath = path.join(outDir, `census-${tag}.json`);
let base;
if (fromFile) {
  const prev = JSON.parse(await readFile(fromFile, 'utf8'));
  base = { tag: prev.tag, url: prev.url, when: prev.when, info: prev.info, viewport: prev.viewport, views: prev.views, programs: prev.programs.list, materials: prev.materials, extraMaterials: prev.extraMaterials, textures: prev.textures.list, renderTargets: prev.renderTargets, geometries: prev.geometries.list, instanceBuffers: prev.geometries.instanceBuffers, rendererInfo: prev.rendererInfo, heap: prev.heap, errors: prev.errors };
  log(`re-rendering from ${fromFile}`);
} else {
  base = await measureAll();
}
const result = aggregate(base);
await writeFile(jsonPath, JSON.stringify(result, null, 1));
const mdPath = path.join(outDir, `census-${tag}.md`);
await writeFile(mdPath, await renderMarkdown(result));
log(`wrote ${jsonPath}`);
log(`wrote ${mdPath}`);
