// Smoke test for a built bundle: serve dist/ statically, load it in headless Chromium (SwiftShader),
// require debugAPI.ready within the timeout, zero page errors, and at least a few rendered frames.
// Usage: node tools/smoke.mjs [distDir]   (exit code 0 = pass)
import { chromium } from "playwright-core";
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, join, extname } from "node:path";

const dist = resolve(process.argv[2] || "dist");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml" };

const server = createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(req.url.split("?")[0]);
    if (p === "/") p = "/index.html";
    const file = join(dist, p);
    const st = await stat(file);
    if (!st.isFile()) throw new Error("not a file");
    res.writeHead(200, { "content-type": MIME[extname(file)] || "application/octet-stream" });
    res.end(await readFile(file));
  } catch {
    res.writeHead(404);
    res.end("not found");
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const port = server.address().port;
const url = `http://127.0.0.1:${port}/`;

const executablePath = ["/usr/bin/google-chrome-stable", "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"].find((p) => existsSync(p));
const browser = await chromium.launch({
  headless: true,
  executablePath,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--use-gl=angle", "--use-angle=swiftshader-webgl", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--enable-webgl"],
});
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
let ok = false;
try {
  await page.goto(url, { waitUntil: "load", timeout: 120000 });
  await page.waitForFunction(() => window.debugAPI && window.debugAPI.ready, null, { timeout: 180000 });
  const f0 = await page.evaluate(() => window.debugAPI.frames());
  await page.waitForFunction((t) => window.debugAPI.frames() >= t, f0 + 3, { timeout: 180000 });
  const stats = await page.evaluate(() => window.debugAPI.getStats());
  console.log("smoke stats", JSON.stringify(stats));
  ok = errors.length === 0;
} catch (e) {
  errors.push(String(e));
}
if (!ok) console.log("smoke FAILED:", errors.slice(0, 10).join("\n"));
else console.log("smoke OK");
await browser.close();
server.close();
process.exit(ok ? 0 : 1);
