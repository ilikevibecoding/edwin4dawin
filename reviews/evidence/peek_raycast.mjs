// One-off: from the exterior close-up cameras, cast rays through the tower glazing slots and report the first
// opaque surface hit: an interior room mesh (peek visible) or exterior tower geometry (peek occluded).
import { chromium } from "/workspace/node_modules/playwright-core/index.mjs";
const url = process.argv[2] || "http://127.0.0.1:5173/";
const browser = await chromium.launch({ headless: true, executablePath: "/usr/bin/google-chrome-stable", args: ["--no-sandbox", "--disable-dev-shm-usage", "--use-gl=angle", "--use-angle=swiftshader-webgl", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
page.setDefaultTimeout(600000);
await page.goto(url, { waitUntil: "load" });
await page.waitForFunction(() => window.debugAPI && window.debugAPI.ready);
const settle = async (n) => {
  const f0 = await page.evaluate(() => window.debugAPI.frames());
  await page.waitForFunction((t) => window.debugAPI.frames() >= t, f0 + n);
};
for (const view of ["ext_tower", "ext_close"]) {
  await page.evaluate((v) => window.debugAPI.setView(v), view);
  await settle(2);
  const res = await page.evaluate(async () => {
    const d = window.debugAPI;
    const cam = d.player.camera;
    const scene = d.scene;
    const rooms = d.rooms.group;
    const isInterior = (o) => { for (let p = o; p; p = p.parent) if (p === rooms) return true; return false; };
    // walk up to a named/room group for reporting
    const label = (o) => { for (let p = o; p; p = p.parent) if (p.name) return p.name; return o.type; };
    // same module instance as the app: Vite's pre-bundled three (URL taken from the page's own resource list)
    const threeUrl = performance.getEntriesByType("resource").map((e) => e.name).find((n) => /\/deps\/three\.js/.test(n));
    if (!threeUrl) return { error: "three dep URL not found" };
    const THREE = await import(threeUrl);
    const RC = THREE.Raycaster;
    const rc = new RC();
    rc.far = 5000;
    rc.camera = cam;
    const out = { camera: cam.position.toArray().map((v) => +v.toFixed(0)), peek: d.rooms.peek, visible: d.rooms.visibleRooms.map((r) => r.def.id), samples: 0, interiorFirst: 0, exteriorFirst: 0, miss: 0, firstHits: {}, examples: [] };
    const slots = [[-33, -17], [-13, 13], [17, 33], [-83, -63]];
    const V = cam.position.constructor; // THREE.Vector3
    for (const [x0, x1] of slots) {
      for (let x = x0 + 0.5; x < x1; x += 2) {
        for (let y = 209.0; y <= 216.5; y += 1.5) {
          const target = new V(x, y, 168.8);
          const dir = target.clone().sub(cam.position).normalize();
          rc.set(cam.position, dir);
          const hits = rc.intersectObjects(scene.children, true).filter((h) => h.object.visible && h.object.material && !(h.object.material.transparent) && h.object.isMesh);
          out.samples++;
          if (!hits.length) { out.miss++; continue; }
          const h = hits[0];
          const interior = isInterior(h.object);
          if (interior) out.interiorFirst++; else out.exteriorFirst++;
          const key = `${interior ? "INTERIOR" : "exterior"} ${label(h.object)} z=${h.point.z.toFixed(1)}`;
          out.firstHits[key] = (out.firstHits[key] || 0) + 1;
          if (out.examples.length < 4 && Math.abs(h.point.z - 170.9) < 0.3) out.examples.push({ at: [x, y], hitZ: +h.point.z.toFixed(2), mat: h.object.material.name || h.object.material.type, color: h.object.material.color ? "#" + h.object.material.color.getHexString() : null, next: hits[1] ? `${isInterior(hits[1].object) ? "INTERIOR" : "exterior"} z=${hits[1].point.z.toFixed(1)}` : null });
        }
      }
    }
    return out;
  });
  console.log(view, JSON.stringify(res, null, 1));
}
await browser.close();
