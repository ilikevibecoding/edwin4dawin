// Atmosphere / post regression + cost measurement (headless, software GL).
//   node tools/atmo_test.mjs [url] [--out=shots/atmo_test] [--w=960 --h=540] [--no-shots]
// Checks: hologram shader swap, motes confined to the current room, shafts per room (planet-shine / sun /
// hangar work lights), engine glow only outside, alert tint + alert vignette, post setMode/setQuality hooks,
// draw-call / triangle cost of the atmosphere group (measured by toggling it), no page errors.
import { chromium } from "playwright-core";
import { existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const args = process.argv.slice(2);
const flags = Object.fromEntries(args.filter((a) => a.startsWith("--")).map((a) => a.slice(2).split("=")));
const url = args.find((a) => !a.startsWith("--")) || "http://127.0.0.1:5173/";
const outDir = resolve(flags.out || "shots/atmo_test");
const W = +(flags.w || 960);
const H = +(flags.h || 540);
const shots = !("no-shots" in flags);
mkdirSync(outDir, { recursive: true });

const executablePath = ["/usr/bin/google-chrome-stable", "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"].find((p) => existsSync(p));
const browser = await chromium.launch({
  headless: true,
  executablePath,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--use-gl=angle", "--use-angle=swiftshader-webgl", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--enable-webgl", "--disable-gpu-vsync", "--disable-frame-rate-limit"],
});
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
const errors = [];
page.on("pageerror", (e) => errors.push("[pageerror] " + e.message));
page.on("console", (m) => m.type() === "error" && errors.push("[console.error] " + m.text().slice(0, 300)));
const t0 = Date.now();
await page.goto(url, { waitUntil: "load", timeout: 180000 });
await page.waitForFunction(() => window.debugAPI && window.debugAPI.ready, null, { timeout: 300000 });
console.log(`ready in ${Date.now() - t0} ms`);

const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok: !!ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? "  " + detail : ""}`);
};
const ev = (fn, arg) => page.evaluate(fn, arg);
const settle = async (n = 2) => {
  const f0 = await ev(() => window.debugAPI.frames());
  await page.waitForFunction((t) => window.debugAPI.frames() >= t, f0 + n, { timeout: 600000 });
};
const shot = async (name) => {
  if (!shots) return;
  const file = resolve(outDir, `${name}.png`);
  await page.screenshot({ path: file, timeout: 300000 });
  console.log(`  -> ${file}`);
};
const stats = () => ev(() => window.debugAPI.getStats());
const atmo = () => ev(() => window.debugAPI.atmosphere.stats());
/**
 * Cost of the atmosphere group in this view. `calls`/`triangles` are exact (counted from the group's visible
 * meshes / draw ranges); the on/off frame stats are also sampled, but blinking running lights, doors and
 * fighter traffic make that delta noisy, so it is reported for information only.
 */
async function cost() {
  await settle(2);
  const on = await stats();
  const exact = await ev(() => {
    const g = window.debugAPI.atmosphere.group;
    let calls = 0;
    let tris = 0;
    let points = 0;
    g.traverseVisible((o) => {
      if (o.isMesh) {
        calls++;
        const geo = o.geometry;
        const count = geo.index ? Math.min(geo.drawRange.count, geo.index.count) : Math.min(geo.drawRange.count, geo.attributes.position.count);
        tris += count / 3;
      } else if (o.isPoints) {
        calls++;
        points += Math.min(o.geometry.drawRange.count, o.geometry.attributes.position.count);
      }
    });
    return { calls, tris, points };
  });
  await ev(() => (window.debugAPI.atmosphere.group.visible = false));
  await settle(2);
  const off = await stats();
  await ev(() => (window.debugAPI.atmosphere.group.visible = true));
  await settle(1);
  return { calls: exact.calls, triangles: exact.tris, points: exact.points, deltaCalls: on.calls - off.calls, deltaTriangles: on.triangles - off.triangles, frameMsOn: on.frameMs, frameMsOff: off.frameMs, on, off };
}
const summary = {};

// 1. hologram material swapped before any room was built
{
  const r = await ev(() => {
    const m = window.debugAPI.materials.holo;
    return { shader: !!m.isShaderMaterial, uniforms: Object.keys(m.uniforms || {}), additive: m.blending === 2, depthWrite: m.depthWrite, transparent: m.transparent, doubleSide: m.side === 2, vertexColors: m.vertexColors };
  });
  check("materials.holo is the hologram ShaderMaterial", r.shader && r.uniforms.includes("time") && r.uniforms.includes("opacity"), JSON.stringify(r));
  check("hologram material flags (additive, no depth write, transparent, double-sided)", r.additive && !r.depthWrite && r.transparent && r.doubleSide, "");
}

// 2. bridge: motes + planet-shine beams, cost of the group
{
  await ev(() => window.debugAPI.setView("bridge"));
  await settle(2);
  const a = await atmo();
  check("bridge: motes active in the bridge", a.motes > 0 && a.motes <= 1500 && a.moteRoom === "bridge", JSON.stringify(a));
  check("bridge: window beams present (sun or planet-shine)", a.shafts > 0 && a.shafts <= 6 && a.shaftRoom === "bridge" && (a.shaftKind === "planet" || a.shaftKind === "sun"), `${a.shafts} beams (${a.shaftKind})`);
  const box = await ev(() => {
    const d = window.debugAPI;
    const u = d.atmosphere.motes.material.uniforms;
    const r = d.rooms.current;
    const min = u.boxMin.value;
    const size = u.boxSize.value;
    return { min: min.toArray(), max: [min.x + size.x, min.y + size.y, min.z + size.z], room: { box: r.box, floor: r.floor, ceil: r.floor + r.h } };
  });
  const inside = box.min[0] >= box.room.box[0] && box.max[0] <= box.room.box[1] && box.min[2] >= box.room.box[2] && box.max[2] <= box.room.box[3] && box.min[1] >= box.room.floor && box.max[1] <= box.room.ceil;
  check("bridge: mote box stays inside the room box (floor..ceil)", inside, JSON.stringify(box));
  const c = await cost();
  summary.bridge = c;
  check("bridge: atmosphere adds ≤ 6 draw calls and ≤ 30k triangles", c.calls <= 6 && c.triangles <= 30000, `+${c.calls} calls, +${c.triangles} tris (frame ${c.frameMsOff.toFixed(0)} → ${c.frameMsOn.toFixed(0)} ms sw)`);
  await shot("bridge_planetshine");
}

// 3. swing the sun ahead of the bow: warm sun shafts replace the planet-shine
{
  await ev(() => window.debugAPI.advanceSky(1500));
  await settle(2);
  const a = await atmo();
  const sun = await ev(() => window.debugAPI.space.sunWorld.toArray().map((v) => +v.toFixed(2)));
  check("bridge: sun ahead of the bow → warm sun beams", a.shaftKind === "sun" && a.shafts > 0, `sunWorld ${JSON.stringify(sun)}, ${a.shafts} beams`);
  await shot("bridge_sun");
  await ev(() => window.debugAPI.setView("bridge_window"));
  await settle(2);
  await shot("bridge_window_sun");
  await ev(() => {
    window.debugAPI.space.setTime(0);
    window.debugAPI.advanceSky(0);
  });
}

// 4. red alert: motes/shafts tint red, final pass gets the pulsing red vignette
{
  await ev(() => window.debugAPI.setView("bridge"));
  await ev(() => window.debugAPI.setAlert(1));
  await settle(2);
  const r = await ev(() => {
    const d = window.debugAPI;
    return { alert: d.atmosphere.stats().alert, post: d.post.finalPass.uniforms.alert.value, moteTint: d.atmosphere.motes.material.uniforms.tint.value.toArray(), shaftTint: d.atmosphere.shafts.material.uniforms.tint.value.toArray() };
  });
  check("alert: atmosphere mirrors lighting.alert and post reads it", r.alert > 0.99 && r.post > 0.99, JSON.stringify(r));
  check("alert: motes and shafts tinted red", r.moteTint[0] > 1.3 && r.moteTint[1] < 0.5 && r.shaftTint[0] > 1.2, "");
  await shot("bridge_alert");
  await ev(() => window.debugAPI.setAlert(0));
  await settle(1);
  const off = await ev(() => window.debugAPI.post.finalPass.uniforms.alert.value);
  check("alert: clears again", off < 0.01, `alert uniform ${off}`);
}

// 5. corridor: motes follow the player into a windowless room; beams come from the visible bridge (if any)
{
  await ev(() => window.debugAPI.setView("cmd_corridor"));
  await settle(2);
  const a = await atmo();
  check("cmd_corridor: motes active in the corridor", a.moteRoom === "cmd_corridor" && a.motes > 0, JSON.stringify(a));
  const c = await cost();
  summary.cmd_corridor = c;
  check("cmd_corridor: atmosphere adds ≤ 6 draw calls", c.calls <= 6, `+${c.calls} calls, +${c.triangles} tris`);
  await shot("cmd_corridor");
}

// 6. hangar: work-light cones over the well
{
  await ev(() => window.debugAPI.setView("hangar_well"));
  await settle(2);
  const a = await atmo();
  check("hangar: work-light cones (2..6) over the well", a.shaftKind === "work" && a.shafts >= 2 && a.shafts <= 6, JSON.stringify(a));
  const c = await cost();
  summary.hangar_well = c;
  check("hangar: atmosphere adds ≤ 6 draw calls and ≤ 30k triangles", c.calls <= 6 && c.triangles <= 30000, `+${c.calls} calls, +${c.triangles} tris (frame ${c.frameMsOff.toFixed(0)} → ${c.frameMsOn.toFixed(0)} ms sw)`);
  await shot("hangar_well");
}

// 7. exterior: engine glow only, nothing interior
{
  await ev(() => window.debugAPI.setView("ext_stern"));
  await settle(2);
  const a = await atmo();
  check("exterior: engine glow on, motes and shafts off", a.engineGlow && a.motes === 0 && a.shafts === 0, JSON.stringify(a));
  const c = await cost();
  summary.ext_stern = c;
  check("exterior: atmosphere adds ≤ 2 draw calls", c.calls <= 2, `+${c.calls} calls, +${c.triangles} tris`);
  await shot("ext_stern");
}

// 8. post hooks
{
  const r = await ev(() => {
    const d = window.debugAPI;
    const p = d.post;
    const out = {};
    p.setMode("interior");
    out.expInt = d.renderer.toneMappingExposure;
    out.bloomInt = [p.bloom.strength, p.bloom.radius, p.bloom.threshold];
    p.setMode("exterior");
    out.expExt = d.renderer.toneMappingExposure;
    out.bloomExt = [p.bloom.strength, p.bloom.radius, p.bloom.threshold];
    out.q0 = p.setQuality(0);
    out.aoQ0 = p.ao.configuration.aoSamples;
    out.q3 = p.setQuality(3);
    out.aoQ3 = p.ao.configuration.aoSamples;
    out.get = p.getQuality();
    out.exports = ["ao", "bloom", "finalPass", "setSize", "render", "setMode", "setQuality", "composer"].every((k) => p[k] !== undefined);
    return out;
  });
  check("post: setMode applies exposure + bloom per mode", r.bloomInt[0] !== r.bloomExt[0] && typeof r.expInt === "number" && typeof r.expExt === "number", JSON.stringify(r));
  check("post: setQuality(0..3) changes AO sampling and reports back", r.q0 === 0 && r.q3 === 3 && r.get === 3 && r.aoQ0 < r.aoQ3, `aoSamples ${r.aoQ0} → ${r.aoQ3}`);
  check("post: existing exports intact", r.exports, "");
}

console.log("\ncost summary (exact contribution of the atmosphere group; frame times are software GL and load-dependent):");
for (const [k, v] of Object.entries(summary)) console.log(`  ${k.padEnd(14)} +${v.calls} calls  +${v.triangles} tris  ${v.points} points   measured delta ${v.deltaCalls >= 0 ? "+" : ""}${v.deltaCalls} calls / ${v.deltaTriangles >= 0 ? "+" : ""}${v.deltaTriangles} tris   frame ${v.frameMsOff.toFixed(0)} → ${v.frameMsOn.toFixed(0)} ms   base ${v.off.calls} calls / ${(v.off.triangles / 1000).toFixed(0)}k tris`);
if (errors.length) {
  console.log("PAGE ERRORS:");
  errors.slice(0, 10).forEach((e) => console.log(" ", e));
}
const failed = results.filter((r) => !r.ok).length;
console.log(`${results.length - failed}/${results.length} checks passed${errors.length ? `, ${errors.length} page errors` : ", no page errors"}`);
await browser.close();
process.exit(failed || errors.length ? 1 : 0);
