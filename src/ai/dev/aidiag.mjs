#!/usr/bin/env node
/**
 * AI model diagnostic: boots the built game, spawns a lineup, and dumps the
 * state of every soldier mesh (bone NaNs, skin weight sums, group/material
 * mapping, world bounds) so a rendering failure can be localised.
 */
import { chromium } from 'playwright';
import { spawn, execSync } from 'node:child_process';
import { writeFile, mkdir } from 'node:fs/promises';

const PORT = Number(process.env.PORT || 4197);
const DIST = process.env.DIST || 'dist-ai';
const ROOT = '/workspace';
const OUT = process.env.OUT || '/workspace/shots/ai';

try {
  execSync(`fuser -k ${PORT}/tcp 2>/dev/null || true`, { stdio: 'ignore' });
} catch {}

const server = spawn(
  'npx',
  ['vite', 'preview', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1', '--outDir', DIST],
  { cwd: ROOT, stdio: 'pipe', detached: true },
);
server.stderr.on('data', (d) => process.stderr.write(`[preview] ${d}`));
const kill = () => {
  try {
    process.kill(-server.pid, 'SIGKILL');
  } catch {
    server.kill('SIGKILL');
  }
};
process.on('exit', kill);

const base = `http://127.0.0.1:${PORT}/`;
for (let i = 0; i < 120; i++) {
  try {
    const r = await fetch(base);
    if (r.ok) break;
  } catch {}
  await new Promise((r) => setTimeout(r, 400));
}

await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome-stable',
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--enable-unsafe-swiftshader',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-webgl',
    '--ignore-gpu-blocklist',
    '--js-flags=--max-old-space-size=4096',
  ],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const logs = [];
page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning' || m.text().startsWith('[ai]')) {
    logs.push(`[${m.type()}] ${m.text()}`);
  }
});
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}\n${e.stack ?? ''}`));

await page.goto(`${base}?quality=low&capture=1`, { waitUntil: 'load', timeout: 120000 });
try {
  await page.waitForFunction(() => window.GAME_READY === true, { timeout: 240000 });
} catch {
  console.log('BOOT FAILED');
  console.log(logs.join('\n'));
  await page.screenshot({ path: `${OUT}/diag_bootfail.png` });
  await browser.close();
  kill();
  process.exit(1);
}
await page.waitForTimeout(9000);

const report = await page.evaluate(() => {
  const g = window.GAME;
  const ai = g.tryGet('ai');
  const out = { placed: 0, soldiers: [] };
  if (!ai) return { error: 'no ai system' };
  out.placed = ai.debugLineup({ distance: 4.5, crouch: true });
  // Let one frame of animation run.
  return new Promise((resolve) => {
    setTimeout(() => {
      const roots = [];
      g.scene.traverse((o) => {
        if (o.name === 'ai_soldier') roots.push(o);
      });
      for (const root of roots.slice(0, 3)) {
        const info = {
          rootPos: root.position.toArray().map((v) => +v.toFixed(3)),
          rootVisible: root.visible,
          children: root.children.map((c) => c.type + ':' + (c.name || '?')),
          bones: {},
          meshes: [],
        };
        // Bone world positions.
        root.traverse((o) => {
          if (o.isBone) {
            const e = o.matrixWorld.elements;
            info.bones[o.name] = [e[12], e[13], e[14]].map((v) =>
              Number.isFinite(v) ? +v.toFixed(3) : String(v),
            );
          }
        });
        root.traverse((o) => {
          if (!o.isMesh) return;
          const geo = o.geometry;
          const pos = geo.getAttribute('position');
          const sw = geo.getAttribute('skinWeight');
          const si = geo.getAttribute('skinIndex');
          let zeroWeights = 0;
          let maxBone = 0;
          if (sw) {
            for (let i = 0; i < sw.count; i++) {
              const s = sw.getX(i) + sw.getY(i) + sw.getZ(i) + sw.getW(i);
              if (!(s > 0.001)) zeroWeights++;
              maxBone = Math.max(maxBone, si.getX(i), si.getY(i), si.getZ(i), si.getW(i));
            }
          }
          // Where the skinned vertices actually end up.
          let lo = [1e9, 1e9, 1e9];
          let hi = [-1e9, -1e9, -1e9];
          let nan = 0;
          if (o.isSkinnedMesh && o.getVertexPosition) {
            const v = new (Object.getPrototypeOf(o.position).constructor)();
            const step = Math.max(1, Math.floor(pos.count / 400));
            for (let i = 0; i < pos.count; i += step) {
              o.getVertexPosition(i, v);
              if (!Number.isFinite(v.x) || !Number.isFinite(v.y) || !Number.isFinite(v.z)) {
                nan++;
                continue;
              }
              lo = [Math.min(lo[0], v.x), Math.min(lo[1], v.y), Math.min(lo[2], v.z)];
              hi = [Math.max(hi[0], v.x), Math.max(hi[1], v.y), Math.max(hi[2], v.z)];
            }
          }
          info.meshes.push({
            name: o.name || o.type,
            visible: o.visible,
            skinned: !!o.isSkinnedMesh,
            verts: pos.count,
            tris: (geo.index ? geo.index.count : pos.count) / 3,
            groups: geo.groups.map((gr) => `${gr.start}+${gr.count}@${gr.materialIndex}`),
            materials: Array.isArray(o.material)
              ? o.material.map((m) => (m ? m.name || m.type : 'MISSING'))
              : o.material.name || o.material.type,
            zeroWeights,
            maxBone,
            nanVerts: nan,
            skinLo: lo.map((v) => +v.toFixed(2)),
            skinHi: hi.map((v) => +v.toFixed(2)),
          });
        });
        out.soldiers.push(info);
      }
      // Unminified builds keep TypeScript private field names, so the animator's
      // inputs can be read straight off the first agent.
      const num = (v) => (typeof v !== 'number' ? v : Number.isFinite(v) ? +v.toFixed(4) : String(v));
      const vec = (v) => (v ? [num(v.x), num(v.y), num(v.z)] : null);
      out.agents = [];
      for (const e of ai.director.all) {
        const bad = [];
        for (const b of e.model.bones) {
          const q = b.quaternion;
          if (!Number.isFinite(q.x + q.y + q.z + q.w)) bad.push(b.name);
        }
        const a = e.animator;
        out.agents.push({
          archetype: e.archetype.id,
          badBones: bad,
          aimPoint: vec(a.aimPoint),
          aimLocal: vec(a.aimLocal),
          weaponUp: num(a.weaponUp),
          crouch: num(a.crouch),
          suppression: num(a.suppression),
          reload: num(a.reloadProgress),
          flinch: [num(a.flinchPitch), num(a.flinchYaw)],
          recoil: num(a.recoil),
          yawRate: num(a.yawRate),
          headTurn: num(a.headTurn),
          pelvisY: num(a.pelvisY),
          quality: e.quality,
          state: e.behavior.state,
        });
      }
      try {
        const e = ai.director.all[0];
        const a = e.animator;
        out.animator = {
          aimPoint: vec(a.aimPoint),
          aimLocal: vec(a.aimLocal),
          velocity: vec(a.velocity),
          bodyYaw: num(a.bodyYaw),
          crouch: num(a.crouch),
          weaponUp: num(a.weaponUp),
          suppression: num(a.suppression),
          reloadProgress: num(a.reloadProgress),
          pelvisY: num(a.pelvisY),
          yawRate: num(a.yawRate),
          accelForward: num(a.accelForward),
          accelRight: num(a.accelRight),
          flinchPitch: num(a.flinchPitch),
          flinchYaw: num(a.flinchYaw),
          recoil: num(a.recoil),
          headTurn: num(a.headTurn),
          smoothedSpeed: num(a.smoothedSpeed),
          cadencePhase: num(a.cadencePhase),
          muzzle: vec(a.muzzle),
          gunDir: vec(a.gunDir),
          speed: num(a.speed),
          legReach: num(a.legReach),
          footL: vec(a.feet[0].current),
          footR: vec(a.feet[1].current),
          footLSwing: a.feet[0].swinging,
          footRSwing: a.feet[1].swinging,
          root: vec(e.feet),
        };
        out.agent = {
          feet: vec(e.feet),
          bodyYaw: num(e.bodyYaw),
          wantWeaponUp: num(e.wantWeaponUp),
          weaponUpBlend: num(e.weaponUpBlend),
          crouchBlend: num(e.crouchBlend),
          suppression: num(e.suppression),
          aimPoint: vec(e.combatant.aimPoint),
          aimGoal: vec(e.combatant.aimGoal),
          perceptionDistance: num(e.perception.distance),
          quality: e.quality,
          state: e.behavior.state,
        };
        const spine = e.model.bones[1];
        out.spineQuat = [spine.quaternion.x, spine.quaternion.y, spine.quaternion.z, spine.quaternion.w].map(num);
      } catch (err) {
        out.animator = 'unavailable: ' + err;
      }

      // Bone positions in the model's own frame, to compare with the bind pose.
      try {
        const e = ai.director.all[0];
        const root = e.model.root;
        const inv = root.matrixWorld.clone().invert();
        const V = root.position.constructor;
        const v = new V();
        const local = {};
        for (const b of e.model.bones) {
          v.setFromMatrixPosition(b.matrixWorld).applyMatrix4(inv);
          local[b.name] = [+v.x.toFixed(3), +v.y.toFixed(3), +v.z.toFixed(3)];
        }
        v.setFromMatrixPosition(e.model.weaponHolder.matrixWorld).applyMatrix4(inv);
        local.WEAPON = [+v.x.toFixed(3), +v.y.toFixed(3), +v.z.toFixed(3)];
        const prop = e.model.prop;
        for (const [k, p] of [['GRIP_R', prop.gripRear], ['GRIP_F', prop.gripFront], ['MUZZLE', prop.muzzle]]) {
          v.copy(p).applyMatrix4(e.model.weaponHolder.matrix);
          local[k] = [+v.x.toFixed(3), +v.y.toFixed(3), +v.z.toFixed(3)];
        }
        out.modelSpace = local;
        out.weaponUp = e.animator.weaponUp;
        // Crown height, which has to agree with the hitbox height reported to
        // combat: the visible top of the head is Head bone plus the skull radius.
        out.crown = +(local.Head[1] + 0.115).toFixed(3);
        out.crouchBlend = +e.crouchBlend.toFixed(3);
      } catch (err) {
        out.modelSpace = 'unavailable: ' + err;
      }

      const cam = g.camera;
      out.camera = {
        pos: cam.position.toArray().map((v) => +v.toFixed(2)),
        near: cam.near,
        far: cam.far,
        fov: cam.fov,
      };
      out.render = { calls: g.renderer.info.render.calls, tris: g.renderer.info.render.triangles };
      out.stats = ai.debugStats ? ai.debugStats() : null;
      // Two samples a few seconds apart: if the simulation clock and the pelvis
      // blend are identical in both, the agents are not being updated at all.
      const probe = () => {
        const e = ai.director.all[0];
        return {
          now: +ai.bb.now.toFixed(3),
          frame: ai.bb.frame,
          pelvisY: e ? +e.animator.pelvisY.toFixed(4) : null,
          crouchBlend: e ? +e.crouchBlend.toFixed(4) : null,
          alive: ai.director.aliveCount,
        };
      };
      out.probeA = probe();
      setTimeout(() => {
        out.probeB = probe();
        resolve(out);
      }, 3000);
    }, 9000);
  });
});

console.log(JSON.stringify(report, null, 2));
await page.screenshot({ path: `${OUT}/diag_lineup.png` });
await writeFile(`${OUT}/diag_console.log`, logs.join('\n') || '(clean)', 'utf8');
console.log('\n--- console ---\n' + (logs.join('\n') || '(clean)'));
await browser.close();
kill();
