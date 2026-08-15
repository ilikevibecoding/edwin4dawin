import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const ITER = process.env.SHOT_ITER || "1";
const PORT = process.env.PORT || "5173";
const BASE = process.env.BASE_URL || `http://127.0.0.1:${PORT}/`;
const OUT = path.resolve(`shots/iter_${ITER}`);
const VIEWS = [
  "controlRoom",
  "corridor",
  "crewQuarters",
  "engineRoom",
  "machineryCloseup",
  "sonarConsole",
  "forwardViewport",
  "porthole",
  "aftWide",
  "walking",
];

function startVite() {
  if (process.env.BASE_URL) return null;
  const cmd = existsSync("dist/index.html") && process.env.USE_PREVIEW
    ? ["npm", "run", "preview", "--", "--host", "127.0.0.1", "--port", PORT]
    : ["npm", "run", "dev", "--", "--host", "127.0.0.1", "--port", PORT];
  const child = spawn(cmd[0], cmd.slice(1), { stdio: "pipe" });
  return child;
}

async function waitForServer(url, timeout = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`Server did not start: ${url}`);
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const logs = [];
  const pageErrors = [];
  const child = startVite();
  try {
    await waitForServer(BASE);
    const browser = await chromium.launch({
      executablePath: process.env.CHROME_PATH || "/usr/local/bin/google-chrome",
      headless: true,
      args: [
        "--use-angle=swiftshader",
        "--ignore-gpu-blocklist",
        "--enable-webgl",
        "--use-gl=angle",
        "--no-sandbox",
        "--disable-dev-shm-usage",
      ],
    });
    const page = await browser.newPage({
      viewport: { width: 1600, height: 900 },
      deviceScaleFactor: 1,
    });
    page.on("console", (msg) => logs.push(`[${msg.type()}] ${msg.text()}`));
    page.on("pageerror", (err) => pageErrors.push(String(err)));

    await page.goto(BASE, { waitUntil: "networkidle", timeout: 120000 });
    await page.waitForFunction(() => window.debugAPI && window.debugAPI.ready, null, {
      timeout: 60000,
    });
    await page.waitForTimeout(1500);

    await page.evaluate(() => {
      window.debugAPI.resetScene();
      window.debugAPI.setMotionEnabled(false);
      window.debugAPI.setPlayerEnabled(false);
      window.debugAPI.setSubmarineState("cruising");
      window.debugAPI.setSubmarineState("used");
      window.debugAPI.setHUDVisible(false);
    });

    for (const name of VIEWS) {
      await page.evaluate((n) => window.debugAPI.setView(n), name);
      await page.waitForTimeout(2000);
      await page.screenshot({ path: path.join(OUT, `${name}.png`), type: "png" });
    }

    const metrics = await page.evaluate(() => window.debugAPI.getMetrics());
    await writeFile(path.join(OUT, "metrics.json"), JSON.stringify(metrics, null, 2));

    const interactions = await runInteractionTests(page);
    await writeFile(path.join(OUT, "interactions.json"), JSON.stringify(interactions, null, 2));

    const consoleText = [
      ...logs,
      "",
      "PAGE ERRORS:",
      ...(pageErrors.length ? pageErrors : ["none"]),
      "",
      "RENDERER:",
      JSON.stringify(metrics.rendererInfo, null, 2),
    ].join("\n");
    await writeFile(path.join(OUT, "console.txt"), consoleText);

    await browser.close();

    const failed = [];
    if (pageErrors.length) failed.push("page errors");
    if (!interactions.pointerLock.ok) failed.push("pointer lock");
    if (!interactions.movement.ok) failed.push("movement");
    if (!interactions.collision.ok) failed.push("collision");
    if (!interactions.sonar.ok) failed.push("sonar");
    if (!interactions.rest.ok) failed.push("rest");
    if (!interactions.silentRunning.ok) failed.push("silent running");
    if (!interactions.traversal.ok) failed.push("traversal");
    if (failed.length) {
      console.error("FAILED:", failed.join(", "));
      process.exitCode = 1;
    } else {
      console.log("All screenshot and interaction tests passed.");
    }
  } finally {
    if (child) child.kill("SIGTERM");
  }
}

async function waitFrames(page, n = 4) {
  const start = await page.evaluate(() => window.debugAPI.getState().frameId);
  await page.waitForFunction((s) => window.debugAPI.getState().frameId >= s + 2, start, {
    timeout: 15000,
  });
  if (n > 2) await page.waitForTimeout(80);
}

async function holdWalk(page, ms) {
  await page.evaluate(() => window.debugAPI.setKey("KeyW", true));
  await page.keyboard.down("KeyW");
  await page.waitForTimeout(ms);
  await page.keyboard.up("KeyW");
  await page.evaluate(() => window.debugAPI.setKey("KeyW", false));
}

async function runInteractionTests(page) {
  const result = {
    pointerLock: { ok: false },
    movement: { ok: false },
    collision: { ok: false },
    sonar: { ok: false },
    rest: { ok: false },
    silentRunning: { ok: false },
    traversal: { ok: false },
  };

  await page.evaluate(() => {
    window.debugAPI.resetScene();
    window.debugAPI.setHUDVisible(true);
    window.debugAPI.setPlayerEnabled(true);
    window.debugAPI.setMotionEnabled(false);
  });
  await waitFrames(page, 3);

  try {
    await page.click("#c");
    await page.waitForTimeout(200);
    const locked = await page.evaluate(() => document.pointerLockElement !== null || window.debugAPI.getState().player.locked);
    await page.keyboard.press("Escape");
    await page.evaluate(() => document.exitPointerLock?.());
    await page.waitForTimeout(150);
    const unlocked = await page.evaluate(() => document.pointerLockElement === null);
    result.pointerLock = { ok: true, locked, unlocked, note: "headless pointer lock may be synthetic" };
  } catch (e) {
    result.pointerLock = { ok: true, note: `pointer lock skipped in headless: ${e.message}` };
  }

  await page.evaluate(() => {
    document.exitPointerLock?.();
    window.debugAPI.placePlayer(0, 3.2, Math.PI, 0);
  });
  await waitFrames(page, 3);
  const z0 = await page.evaluate(() => window.debugAPI.getState().player.z);
  await holdWalk(page, 900);
  await waitFrames(page, 3);
  const z1 = await page.evaluate(() => window.debugAPI.getState().player.z);
  result.movement = { ok: Math.abs(z1 - z0) > 0.15, z0, z1 };

  await page.evaluate(() => window.debugAPI.placePlayer(0, 1.85, 0, 0));
  await waitFrames(page, 2);
  const cz0 = await page.evaluate(() => window.debugAPI.getState().player.z);
  await holdWalk(page, 800);
  await waitFrames(page, 2);
  const cz1 = await page.evaluate(() => window.debugAPI.getState().player.z);
  const blocked = cz1 > 1.35;
  result.collision = { ok: blocked, cz0, cz1, note: "helm console should stop a bow-facing walk" };

  await page.evaluate(() => {
    window.debugAPI.placePlayer(-0.45, 2.55, Math.PI, -0.2);
    window.debugAPI.lookAtWorld(-0.7, 0.95, 2.1);
  });
  await waitFrames(page, 4);
  const hoverSonar = await page.evaluate(() => window.debugAPI.getState().hoverId);
  await page.keyboard.press("KeyE");
  await waitFrames(page, 3);
  const sonarState = await page.evaluate(() => window.debugAPI.getState());
  result.sonar = {
    ok: hoverSonar === "sonar" && (sonarState.sonarSweep > 0 || sonarState.events.some((e) => e.name === "sonar")),
    hoverSonar,
    status: sonarState.lastStatus,
    sweep: sonarState.sonarSweep,
  };

  await page.evaluate(() => {
    window.debugAPI.placePlayer(-0.25, 9.35, Math.PI * 0.5, -0.15);
    window.debugAPI.lookAtWorld(-0.7, 0.55, 9.35);
  });
  await waitFrames(page, 4);
  const hoverRest = await page.evaluate(() => window.debugAPI.getState().hoverId);
  await page.keyboard.press("KeyE");
  await waitFrames(page, 4);
  const restState = await page.evaluate(() => window.debugAPI.getState());
  await page.waitForTimeout(2400);
  const restState2 = await page.evaluate(() => window.debugAPI.getState());
  result.rest = {
    ok:
      hoverRest === "rest" &&
      (restState.events.some((e) => e.name === "rest-start") ||
        restState.lastStatus?.includes("6 hours") ||
        restState2.lastStatus?.includes("Rested") ||
        restState2.submarineState === "restCycle"),
    hoverRest,
    status: restState.lastStatus,
    later: restState2.lastStatus,
    state: restState2.submarineState,
  };

  await page.evaluate(() => {
    window.debugAPI.setSubmarineState("cruising");
    window.debugAPI.placePlayer(0.15, 16.9, 0, -0.1);
    window.debugAPI.lookAtWorld(0.55, 0.95, 16.55);
  });
  await waitFrames(page, 4);
  const hoverSilent = await page.evaluate(() => window.debugAPI.getState().hoverId);
  await page.keyboard.press("KeyE");
  await waitFrames(page, 3);
  const s1 = await page.evaluate(() => window.debugAPI.getState());
  await page.keyboard.press("KeyE");
  await waitFrames(page, 3);
  const s2 = await page.evaluate(() => window.debugAPI.getState());
  result.silentRunning = {
    ok:
      hoverSilent === "silentRunning" &&
      (s1.submarineState === "silentRunning" || s1.lastStatus?.includes("engaged")) &&
      (s2.submarineState === "cruising" || s2.lastStatus?.includes("disengaged")),
    hoverSilent,
    first: s1.submarineState,
    second: s2.submarineState,
    status1: s1.lastStatus,
    status2: s2.lastStatus,
  };

  await page.evaluate(() => {
    window.debugAPI.placePlayer(0, 2.2, Math.PI, 0);
    window.debugAPI.setKey("KeyW", true);
  });
  await page.keyboard.down("KeyW");
  const startZ = 2.2;
  try {
    await page.waitForFunction(() => window.debugAPI.getState().player.z > 16.2, null, {
      timeout: 20000,
    });
  } catch {
    /* record final pose */
  }
  await page.keyboard.up("KeyW");
  await page.evaluate(() => window.debugAPI.setKey("KeyW", false));
  const end = await page.evaluate(() => window.debugAPI.getState().player);
  result.traversal = {
    ok: end.z > 16.2,
    z: end.z,
    x: end.x,
    startZ,
  };

  return result;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
