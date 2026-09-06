#!/usr/bin/env node
// Dump the aircraft's scene graph from a running preview: node scenedump.mjs <url> <out.json>
// Records, in traversal order, every object's type / relative id / transform / flags, each mesh's material (relative
// id) and geometry (attribute checksums, so the vertex order of merged batches is part of the comparison), every
// material's properties and the pixel hash of its canvas textures, and the model's registries and uniforms.
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const [url, out] = process.argv.slice(2);
const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/usr/local/bin/google-chrome', headless: true, args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'], defaultViewport: { width: 320, height: 180 }, protocolTimeout: 1800000 });
const page = await browser.newPage();
page.on('pageerror', (e) => console.error('[page error]', e.message));
await page.goto(`${url}?bench=plane-rear-quarter&w=320&h=180&quality=low&freeze=1&dbg=nocity,noveg,nobridges,notraffic`, { waitUntil: 'load', timeout: 300000 });
await page.waitForFunction('window.__benchReady === true', { timeout: 900000, polling: 250 });
const dump = await page.evaluate(() => {
  const model = window.__game.aircraft.model;
  const fnv = (bytes) => { let h = 0x811c9dc5; for (let i = 0; i < bytes.length; i++) { h ^= bytes[i]; h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16); };
  const attrHash = (a) => fnv(new Uint8Array(a.array.buffer, a.array.byteOffset, a.array.byteLength));
  const rootId = model.root.id, mat0 = model.materials[0].id;
  const texHash = (t) => {
    if (!t || !t.image) return null;
    const img = t.image, c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0);
    return { w: img.width, h: img.height, hash: fnv(ctx.getImageData(0, 0, img.width, img.height).data), flipY: t.flipY, wrapS: t.wrapS, wrapT: t.wrapT, colorSpace: t.colorSpace, anisotropy: t.anisotropy, minFilter: t.minFilter, magFilter: t.magFilter };
  };
  const matInfo = (m) => {
    const o = { type: m.type, rid: m.id - mat0, key: m.customProgramCacheKey ? m.customProgramCacheKey() : null, transparent: m.transparent, opacity: m.opacity, side: m.side, depthWrite: m.depthWrite, depthTest: m.depthTest, blending: m.blending, vertexColors: m.vertexColors, shadowSide: m.shadowSide, premultipliedAlpha: m.premultipliedAlpha, toneMapped: m.toneMapped };
    for (const k of ['color', 'emissive']) if (m[k] && m[k].isColor) o[k] = m[k].getHex();
    for (const k of ['roughness', 'metalness', 'envMapIntensity', 'emissiveIntensity', 'clearcoat', 'clearcoatRoughness', 'ior', 'specularIntensity']) if (m[k] !== undefined) o[k] = m[k];
    for (const k of ['normalScale', 'clearcoatNormalScale']) if (m[k]) o[k] = m[k].toArray();
    for (const k of ['map', 'roughnessMap', 'metalnessMap', 'normalMap', 'clearcoatMap', 'clearcoatRoughnessMap', 'clearcoatNormalMap', 'emissiveMap']) if (m[k]) o[k] = texHash(m[k]);
    if (m.uniforms) o.uniforms = Object.fromEntries(Object.entries(m.uniforms).map(([k, u]) => [k, u.value && u.value.length !== undefined ? Array.from(u.value) : (u.value && u.value.isTexture ? texHash(u.value) : u.value)]));
    return o;
  };
  const objs = [];
  model.root.traverse((o) => {
    const e = { type: o.type, rid: o.id - rootId, parent: o.parent ? o.parent.id - rootId : null, pos: o.position.toArray(), rot: o.rotation.toArray().slice(0, 3), scl: o.scale.toArray(), renderOrder: o.renderOrder, visible: o.visible, cast: o.castShadow, receive: o.receiveShadow, frustumCulled: o.frustumCulled };
    if (o.isMesh) {
      e.material = o.material.id - mat0;
      const g = o.geometry, attrs = {};
      for (const [k, a] of Object.entries(g.attributes)) attrs[k] = { count: a.count, itemSize: a.itemSize, hash: attrHash(a) };
      e.geometry = { attrs, index: g.index ? { count: g.index.count, hash: attrHash(g.index) } : null, groups: g.groups.length, bs: g.boundingSphere ? [...g.boundingSphere.center.toArray(), g.boundingSphere.radius] : null };
    }
    objs.push(e);
  });
  return {
    objects: objs,
    materials: model.materials.map(matInfo),
    exterior: model.exteriorMeshes.map((m) => m.id - rootId),
    interior: model.interiorMeshes.map((m) => m.id - rootId),
    glassMaterial: model.glassMaterial.id - mat0, paintMaterial: model.paintMaterial.id - mat0,
    named: Object.fromEntries(['propeller', 'propDisc', 'propDiscPivot', 'propHub', 'propBlades', 'aileronL', 'aileronR', 'flapL', 'flapR', 'elevator', 'rudder', 'wheels', 'lights', 'lightGlow', 'yokeL', 'yokeR', 'throttleLever', 'flapLever', 'pedalsL', 'pedalsR', 'instruments', 'gpsMesh'].map((k) => [k, model[k] ? model[k].id - rootId : null])),
    waterRudders: model.waterRudders.map((g) => g.id - rootId),
    hardpoints: Object.fromEntries(['exhaustPos', 'floatSternL', 'floatSternR', 'floatBowL', 'floatBowR', 'wingTipL', 'wingTipR', 'cockpitEye'].map((k) => [k, model[k].toArray()])),
    gaugeState: model.gaugeState, spanHalf: model.spanHalf,
    uniforms: { wetLine: model.wetLine.value.toArray(), lightPower: Array.from(model.lightPower.value), instAngle: Array.from(model.instAngle.value), instShift: Array.from(model.instShift.value), cabinGlow: model.glassUniforms.uCabinGlow.value },
    build: window.__build,
  };
});
await browser.close();
fs.writeFileSync(out, JSON.stringify(dump, null, 1));
console.log(`${out}: ${dump.objects.length} objects, ${dump.materials.length} materials, build ${dump.build}`);
