import puppeteer from 'puppeteer-core';
const view = process.argv[2] || 'aerial-a';
const browser = await puppeteer.launch({ executablePath: '/usr/local/bin/google-chrome', headless: true, args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'], defaultViewport: { width: 640, height: 360 }, protocolTimeout: 600000 });
const page = await browser.newPage();
await page.goto(`http://127.0.0.1:5173/?bench=${view}&w=640&h=360&quality=low&freeze=1`, { waitUntil: 'load' });
await page.waitForFunction('window.__benchReady === true', { timeout: 600000, polling: 250 });
const info = await page.evaluate(() => {
  const g = window.__game;
  const stats = {};
  let meshes = 0;
  g.scene.traverse((o) => {
    if (!o.isMesh && !o.isPoints) return;
    meshes++;
    const geo = o.geometry;
    const idx = geo.index ? geo.index.count : geo.attributes.position.count;
    const tris = Math.round(idx / 3) * (o.isInstancedMesh ? o.count : 1);
    // classify by ancestor group
    let p = o, name = o.name || o.type;
    while (p.parent && p.parent !== g.scene) p = p.parent;
    const key = p === o ? (o.isInstancedMesh ? 'instanced:' + (o.material.type) : o.type + ':' + o.material.type) : (p.name || p.uuid.slice(0, 6));
    const s = stats[key] || (stats[key] = { meshes: 0, tris: 0, instances: 0 });
    s.meshes++; s.tris += tris; s.instances += o.isInstancedMesh ? o.count : 1;
  });
  const groups = {};
  const named = { terrain: g.terrain.group, water: g.water.mesh, city: g.city.batches.group, veg: g.vegetation.group, props: g.props.group, traffic: g.traffic.group, bridges: g.bridges.group, plane: g.aircraft.model.root };
  for (const [k, root] of Object.entries(named)) {
    let m = 0, t = 0, inst = 0;
    root.traverse((o) => { if (!o.isMesh) return; m++; const geo = o.geometry; const idx = geo.index ? geo.index.count : geo.attributes.position.count; t += Math.round(idx / 3) * (o.isInstancedMesh ? o.count : 1); inst += o.isInstancedMesh ? o.count : 1; });
    groups[k] = { meshes: m, tris: t, instances: inst };
  }
  return { meshes, groups, veg: g.vegetation.counts, buildings: g.city.batches.count, cars: g.traffic.carCount, boats: g.traffic.boatCount, info: { calls: g.renderer.info.render.calls, tris: g.renderer.info.render.triangles } };
});
console.log(JSON.stringify(info, null, 1));
await browser.close();
