// Combat instrumentation + screenshots (Opus 2 / WP-014). Same harness shape as tools/capture.js
// but every scenario is about how the weapons behave: recoil pattern traces, ADS timing, spread
// tables, penetration through cover and time-to-kill matrices.
//
// Usage: SERVER=http://127.0.0.1:5173 node tools/capture-combat.js [scenario ...]
//        (default: every scenario)
import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const SERVER = process.env.SERVER || 'http://127.0.0.1:5173';
const OUT = 'artifacts/shots';
const DATA = 'artifacts/combat';
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(DATA, { recursive: true });

const PRIMARIES = ['boreal-k5', 'halcyon-hc4', 'vanta-s12', 'meridian-lr8'];
const ALL_GUNS = ['karst-p9', ...PRIMARIES];

// Several agents edit src/** while these scenarios run. A hot update to a module without an accept
// handler makes Vite reload the page, which destroys everything the scenario has set up mid-run.
// Stubbing the HMR client keeps module loading intact and removes only live reload — same trick
// tests/helpers/game.js uses, and for the same reason.
const VITE_CLIENT_STUB = `
export const createHotContext = () => ({
  on() {}, off() {}, send() {}, accept() {}, acceptExports() {}, dispose() {}, prune() {},
  invalidate() {}, decline() {}, data: {},
});
export const updateStyle = (id, css) => {
  let el = document.querySelector('style[data-vite-dev-id="' + id + '"]');
  if (!el) { el = document.createElement('style'); el.setAttribute('data-vite-dev-id', id); document.head.appendChild(el); }
  el.textContent = css;
};
export const removeStyle = (id) => {
  const el = document.querySelector('style[data-vite-dev-id="' + id + '"]');
  if (el) el.remove();
};
export const injectQuery = (url) => url;
export class ErrorOverlay extends HTMLElement {}
export default {};
`;

function makeHelpers(page, scenarioName, report) {
  const h = {
    page,
    qa: (method, ...args) => page.evaluate(([m, a]) => window.__qa[m](...a), [method, args]),
    adv: (ms) => page.evaluate((v) => window.advanceTime(v), ms),
    probe: (fn, arg) => page.evaluate(fn, arg),
    state: async () => JSON.parse(await page.evaluate(() => window.render_game_to_text())),
    // Rendering is on demand: a single 1080p SwiftShader frame costs seconds here, and these
    // scenarios step the simulation hundreds of times. One frame is drawn per screenshot.
    async shot(name) {
      const file = path.join(OUT, `${scenarioName}--${name}.png`);
      await page.evaluate(() => window.__cu.drawFrame());
      await page.screenshot({ path: file, timeout: 240000 });
      report.shots.push(file);
      return file;
    },
    save(name, obj) {
      const file = path.join(DATA, `${scenarioName}--${name}.json`);
      fs.writeFileSync(file, JSON.stringify(obj, null, 1));
      report.data.push(file);
      return obj;
    },
    async mouse(button, down) { await h.qa('mouse', button, down); },
    // press/release around a single simulation step: qa.press only latches the key down
    async tap(code) {
      await h.qa('press', code);
      await h.adv(20);
      await h.qa('release', code);
    },
    async fire(ms) {
      await h.qa('mouse', 0, true);
      await h.adv(ms);
      await h.qa('mouse', 0, false);
    },
    async ready(primary) {
      await h.qa('quickStart', 'operator', primary ?? null, 1337);
      await h.qa('freezeAI', true);
      await h.qa('god', true);
      await h.adv(900);
    },
    async equip(id) {
      await h.qa('giveWeapon', id);
      await h.adv(900);
      await h.qa('refillAmmo');
      await h.adv(30);
    },
    log(...a) { console.log(`  [${scenarioName}]`, ...a); },
  };
  return h;
}

// ---------------------------------------------------------------------------
// page-side utilities, injected once per page
const PAGE_UTILS = () => {
  const g = window.__game;
  // stop the RAF loop and the per-advance render; shot() asks for frames explicitly
  g.engine.running = false;
  const realRender = g.engine.renderFn;
  g.engine.renderFn = () => {};
  const U = {
    drawFrame() { realRender(1); },
    // Find a pose (checkpoint + yaw) whose forward ray meets a flat wall within [minD, maxD].
    // `clearBehind` metres of empty space past the far face can be required, which is what the
    // penetration scenario needs so the hostile it spawns is not standing inside the next wall.
    // `face` asks for an unbroken patch of that same collider around the aim point, given as
    // { pitchLo, pitchHi, yawSpan } in degrees — the recoil traces need one so a climbing pattern
    // does not wander onto a door frame or through a glass pane partway up.
    findWall(minD, maxD, wantMaterials, clearBehind = 0, face = null) {
      const m = g.mission, p = m.player;
      const cps = window.__qa.checkpoints();
      const aimDeg = face ? (face.aim ?? (face.pitchLo + face.pitchHi) / 2) : 0;
      const aimPitch = (aimDeg * Math.PI) / 180;
      let best = null;
      for (const cp of cps) {
        window.__qa.teleport(cp);
        for (let deg = 0; deg < 360; deg += 6) {
          p.yaw = (deg * Math.PI) / 180;
          p.pitch = 0;
          const f = { x: -Math.sin(p.yaw), y: 0, z: -Math.cos(p.yaw) };
          const hit = m.world.raycast(p.pos.x, p.eyeY, p.pos.z, f.x, 0, f.z, maxD + 1, (c) => c.blockShot);
          if (!hit) continue;
          const c = hit.collider;
          if (hit.t < minD || hit.t > maxD) continue;
          if (wantMaterials && !wantMaterials.includes(c.material)) continue;
          const n = hit.normal;
          if (Math.abs(n.y) > 0.2) continue; // want a vertical face
          // face the wall square on, otherwise oblique incidence stretches the trace along it
          if (Math.abs(f.x * n.x + f.z * n.z) < 0.985) continue;
          // wall has to be wide and tall enough to hold a cluster
          const w = Math.abs(n.x) > 0.5 ? c.max.z - c.min.z : c.max.x - c.min.x;
          const tall = c.max.y - c.min.y;
          if (w < 2.4 || tall < 2.2) continue;
          const thick = Math.min(c.max.x - c.min.x, c.max.z - c.min.z);
          if (clearBehind > 0) {
            const past = hit.t + thick + 0.08;
            const beyond = m.world.raycast(
              p.pos.x + f.x * past, p.eyeY, p.pos.z + f.z * past, f.x, 0, f.z,
              clearBehind, (cc) => cc.blockShot,
            );
            if (beyond) continue;
            // and the far side needs a floor for a target to stand on
            const tx = p.pos.x + f.x * (past + clearBehind * 0.6), tz = p.pos.z + f.z * (past + clearBehind * 0.6);
            const ground = m.world.raycast(tx, p.pos.y + 1.4, tz, 0, -1, 0, 3, (cc) => cc.blockMove);
            if (!ground || Math.abs(ground.point.y - p.pos.y) > 0.4) continue;
          }
          // the patch the pattern will walk across has to be the same unbroken collider
          if (face) {
            let clean = true;
            for (let pd = face.pitchLo; pd <= face.pitchHi + 1e-6 && clean; pd += 1.5) {
              for (let yd = -face.yawSpan; yd <= face.yawSpan + 1e-6 && clean; yd += 1.5) {
                const yaw = p.yaw + (yd * Math.PI) / 180;
                const pit = (pd * Math.PI) / 180;
                const cp2 = Math.cos(pit);
                const d = { x: -Math.sin(yaw) * cp2, y: Math.sin(pit), z: -Math.cos(yaw) * cp2 };
                const h2 = m.world.raycast(p.pos.x, p.eyeY, p.pos.z, d.x, d.y, d.z, maxD + 1, (cc) => cc.blockShot);
                if (!h2 || h2.collider !== c) clean = false;
              }
            }
            if (!clean) continue;
          }
          const score = w + tall;
          if (!best || score > best.score) {
            best = {
              cp, yawDeg: deg, pitchDeg: aimDeg,
              dist: +hit.t.toFixed(2), material: c.material, tag: c.tag,
              thick: +thick.toFixed(3), normal: [n.x, n.y, n.z], score, pos: [p.pos.x, p.pos.y, p.pos.z],
            };
          }
        }
      }
      if (best) {
        window.__qa.teleport(best.cp);
        p.yaw = (best.yawDeg * Math.PI) / 180;
        p.pitch = face ? aimPitch : 0;
      }
      return best;
    },

    // Clear line of fire of at least `dist` metres from a checkpoint.
    findOpenLane(dist) {
      const m = g.mission, p = m.player;
      let best = null;
      for (const cp of window.__qa.checkpoints()) {
        window.__qa.teleport(cp);
        for (let deg = 0; deg < 360; deg += 6) {
          p.yaw = (deg * Math.PI) / 180;
          p.pitch = 0;
          const f = { x: -Math.sin(p.yaw), z: -Math.cos(p.yaw) };
          const hit = m.world.raycast(p.pos.x, p.eyeY, p.pos.z, f.x, 0, f.z, dist + 6, (c) => c.blockShot);
          const reach = hit ? hit.t : dist + 6;
          if (reach < dist + 1.2) continue;
          // the target's feet have to be on something solid
          const tx = p.pos.x + f.x * dist, tz = p.pos.z + f.z * dist;
          const ground = m.world.raycast(tx, p.pos.y + 1.2, tz, 0, -1, 0, 2.4, (c) => c.blockMove);
          if (!ground) continue;
          if (Math.abs(ground.point.y - p.pos.y) > 0.4) continue;
          if (!best || reach > best.reach) best = { cp, yawDeg: deg, reach: +reach.toFixed(1), target: [tx, ground.point.y, tz] };
        }
      }
      if (best) { window.__qa.teleport(best.cp); p.yaw = (best.yawDeg * Math.PI) / 180; p.pitch = 0; }
      return best;
    },

    // Record every impact the VFX layer is asked to draw (includes penetration exit wounds).
    recordImpacts() {
      const vfx = g.mission.vfx;
      if (!vfx.__origImpact) vfx.__origImpact = vfx.impact.bind(vfx);
      window.__impacts = [];
      vfx.impact = (point, normal, material, ...rest) => {
        window.__impacts.push({
          p: [point.x, point.y, point.z], n: [normal.x, normal.y, normal.z], material,
          t: +g.engine.simTime.toFixed(3),
        });
        return vfx.__origImpact(point, normal, material, ...rest);
      };
    },
    impacts() { return window.__impacts || []; },

    // Record every damage application on hostiles.
    recordDamage() {
      window.__dmg = [];
      for (const e of g.mission.enemies) {
        if (e.__origDamage) continue;
        e.__origDamage = e.damage.bind(e);
        e.damage = (amount, fromPos, region, shooter) => {
          window.__dmg.push({
            id: e.id, amount: +amount.toFixed(2), region, hpBefore: +e.hp.toFixed(1),
            t: +g.engine.simTime.toFixed(3),
          });
          return e.__origDamage(amount, fromPos, region, shooter);
        };
      }
    },
    damageLog() { return window.__dmg || []; },

    // Subscribe to gameplay bus events. The dev server hands out one module instance per URL, so
    // importing events.js here yields the very bus the systems emit on.
    async recordBus(names) {
      const { bus } = await import('/src/core/events.js');
      window.__bus = [];
      for (const off of window.__busOff || []) off();
      window.__busOff = names.map((n) => bus.on(n, (payload) => {
        window.__bus.push({ event: n, t: +g.engine.simTime.toFixed(3), payload: { ...payload } });
      }));
      return names.length;
    },
    busLog() { return window.__bus || []; },

    // Flat quad markers built from constructors harvested off the live scene, so the tool needs no
    // module imports of its own.
    marks(points, normal, colors, size = 0.034) {
      const m = g.mission;
      if (window.__marks) { for (const o of window.__marks) m.scene.remove(o); }
      window.__marks = [];
      let sample = null;
      m.scene.traverse((o) => { if (!sample && o.isMesh && o.geometry?.attributes?.position) sample = o; });
      const Mesh = sample.constructor;
      const Geo = sample.geometry.constructor;
      const Attr = sample.geometry.attributes.position.constructor;
      const Basic = m.vfx.tracerMat.constructor;
      const n = { x: normal[0], y: normal[1], z: normal[2] };
      // in-plane basis
      const up = Math.abs(n.y) > 0.8 ? { x: 1, y: 0, z: 0 } : { x: 0, y: 1, z: 0 };
      const rx = up.y * n.z - up.z * n.y, ry = up.z * n.x - up.x * n.z, rz = up.x * n.y - up.y * n.x;
      const rl = Math.hypot(rx, ry, rz) || 1;
      const R = { x: rx / rl, y: ry / rl, z: rz / rl };
      const Uv = { x: R.y * n.z - R.z * n.y, y: R.z * n.x - R.x * n.z, z: R.x * n.y - R.y * n.x };
      const quad = (pt, s, off, color) => {
        const c = { x: pt[0] + n.x * off, y: pt[1] + n.y * off, z: pt[2] + n.z * off };
        const v = (a, b) => [
          c.x + R.x * a * s + Uv.x * b * s,
          c.y + R.y * a * s + Uv.y * b * s,
          c.z + R.z * a * s + Uv.z * b * s,
        ];
        const q = [v(-1, -1), v(1, -1), v(1, 1), v(-1, -1), v(1, 1), v(-1, 1)].flat();
        const geo = new Geo();
        geo.setAttribute('position', new Attr(new Float32Array(q), 3));
        const mat = new Basic({ color });
        mat.toneMapped = false;
        mat.side = 2; // DoubleSide: the quad winding depends on the wall it is built against
        const mesh = new Mesh(geo, mat);
        mesh.frustumCulled = false;
        mesh.renderOrder = 900;
        m.scene.add(mesh);
        window.__marks.push(mesh);
      };
      // dark backing plate under a bright pip, so the marker reads against any wall colour
      points.forEach((pt, i) => {
        quad(pt, size * 1.62, 0.01, 0x101418);
        quad(pt, size, 0.014, colors[i] ?? 0xff3b30);
      });
      return points.length;
    },
    clearMarks() {
      const m = g.mission;
      if (window.__marks) for (const o of window.__marks) m.scene.remove(o);
      window.__marks = [];
    },

    pose() {
      const p = g.mission.player;
      return { pos: [p.pos.x, p.pos.y, p.pos.z], eyeY: p.eyeY, yawDeg: (p.yaw * 180) / Math.PI };
    },
    arsenal() {
      const a = g.mission.player.arsenal;
      return {
        id: a.current.def.id, state: a.state, mag: a.current.mag, reserve: a.current.reserve,
        adsBlend: +a.adsBlend.toFixed(3), isAiming: a.isAiming,
        spreadDeg: +a.spreadDeg(Math.hypot(g.mission.player.vel.x, g.mission.player.vel.z), g.mission.player.crouched).toFixed(3),
        recoilPitchDeg: +((a.recoilPitch * 180) / Math.PI).toFixed(3),
        recoilYawDeg: +((a.recoilYaw * 180) / Math.PI).toFixed(3),
        recoilStep: a.recoilIndex, heat: +a.heat.toFixed(3),
        swayXDeg: +((a.scopeSwayX * 180) / Math.PI).toFixed(4),
        swayYDeg: +((a.scopeSwayY * 180) / Math.PI).toFixed(4),
        steady: +a.steady.toFixed(2), steadyLeft: +a.steadyLeft.toFixed(2),
      };
    },
    simTime() { return +g.engine.simTime.toFixed(3); },
  };
  window.__cu = U;
  return true;
};

// ---------------------------------------------------------------------------
export const SCENARIOS = {
  /**
   * Full-magazine trace against a flat wall from a fixed pose. Every impact is marked with a quad
   * coloured by shot order (cyan first -> red last), so the pattern is visible in one frame.
   */
  async 'recoil-trace'(h) {
    await h.ready();
    // FACE demands one unbroken collider across the whole patch the pattern walks over — without it
    // the search happily picks a partition with a glass door in the middle of it. The aim sits above
    // the horizon on purpose: furniture and wall screens do not block shots, so a cluster at desk
    // height is correct in the data but hidden behind a prop in the screenshot.
    const FACE = { pitchLo: 1, pitchHi: 11, yawSpan: 5, aim: 3 };
    // prefer a painted interior partition: it reads as a wall and takes drywall impact dust
    const wall = await h.probe((f) => window.__cu.findWall(4.5, 8.5, ['drywall'], 0, f), FACE)
      || await h.probe((f) => window.__cu.findWall(4.5, 8.5, ['concrete'], 0, f), FACE);
    if (!wall) throw new Error('no suitable wall found');
    h.log('wall:', JSON.stringify(wall));
    const summary = {};

    for (const id of ALL_GUNS) {
      await h.probe((w) => {
        window.__qa.teleport(w.cp);
        const p = window.__game.mission.player;
        p.yaw = (w.yawDeg * Math.PI) / 180;
        p.pitch = (w.pitchDeg * Math.PI) / 180;
        p.vel.set(0, 0, 0);
      }, wall);
      await h.equip(id);
      // aimed, standing still: with the spread cone collapsed, what lands on the wall is the
      // recoil pattern and nothing else
      await h.mouse(2, true);
      await h.adv(500);
      await h.probe(() => window.__cu.recordImpacts());
      const cadence = await h.probe(() => {
        const d = window.__game.mission.player.arsenal.current.def;
        // fire() itself holds the trigger for 25ms, which counts towards the cycle
        const cycle = Math.round(60000 / d.rpm) + (d.pumpMs ?? 0);
        return { auto: !!d.auto, cycle, gapMs: Math.max(0, cycle - 25) + 8 };
      });
      if (cadence.auto) {
        await h.fire(1300);
      } else {
        // tap at the weapon's own rate cap: any slower and a fast-recovering action like the P9
        // settles between shots, which hides the pattern the player would actually fight
        const shots = cadence.cycle > 900 ? 4 : 8;
        for (let i = 0; i < shots; i++) { await h.fire(25); await h.adv(cadence.gapMs); }
      }
      await h.mouse(2, false);
      await h.adv(900); // let the impact dust and debris expire so only the markers remain
      const trace = await h.probe(([w, wid]) => {
        const n = w.normal;
        const ai = Math.abs(n[0]) > 0.5 ? 0 : 2;
        const px = window.__game.mission.player.pos;
        const pc = ai === 0 ? px.x : px.z;
        const all = window.__cu.impacts().filter((im) => im.material !== 'flesh');
        // Every impact from one shot lands on the same simulation step, so grouping by time gives
        // one group per shot (eight for a shotgun shell). Within a group, a penetrating round also
        // reports an exit wound on the far face — keep the near face only.
        const groups = new Map();
        for (const im of all) {
          if (!groups.has(im.t)) groups.set(im.t, []);
          groups.get(im.t).push(im);
        }
        const pts = [];
        for (const [, grp] of groups) {
          const near = Math.min(...grp.map((im) => Math.abs(im.p[ai] - pc)));
          for (const im of grp) if (Math.abs(im.p[ai] - pc) < near + 0.02) pts.push(im);
        }
        // wall-local axes: horizontal is whichever of x/z the face does not face
        const hi = ai === 0 ? 2 : 0;
        const o = pts.length ? pts[0].p : [0, 0, 0];
        return {
          weapon: wid,
          shots: pts.length,
          points: pts.map((im) => im.p),
          local: pts.map((im, i) => ({
            i, h: +(im.p[hi] - o[hi]).toFixed(3), v: +(im.p[1] - o[1]).toFixed(3), t: im.t,
          })),
        };
      }, [wall, id]);
      // colour ramp cyan -> amber -> red across the burst
      const colors = trace.points.map((_, i) => {
        const k = trace.points.length > 1 ? i / (trace.points.length - 1) : 0;
        const r = Math.round(0x6f + k * (0xe0 - 0x6f));
        const g = Math.round(0xc3 - k * (0xc3 - 0x45));
        const b = Math.round(0xe8 - k * (0xe8 - 0x35));
        return (r << 16) | (g << 8) | b;
      });
      // Marker and framing scale with the cluster: a P9's few-centimetre group and the HC-4's
      // half-metre climb both have to be readable in a 1080p frame.
      const extent = Math.max(
        0.16,
        ...trace.points.map((q) => Math.hypot(
          q[0] - trace.points[0][0], q[1] - trace.points[0][1], q[2] - trace.points[0][2],
        )),
      );
      await h.probe(([pts, n, cols, ext]) => window.__cu.marks(pts, n, cols, ext * 0.075), [trace.points, wall.normal, colors, extent]);
      // fixed camera back at the firing pose, framed on the centroid of the cluster
      await h.probe(([pts, ext]) => {
        const p = window.__game.mission.player;
        const c = pts.reduce((a, q) => [a[0] + q[0] / pts.length, a[1] + q[1] / pts.length, a[2] + q[2] / pts.length], [0, 0, 0]);
        const dx = c[0] - p.pos.x, dy = c[1] - p.eyeY, dz = c[2] - p.pos.z;
        const dist = Math.hypot(dx, dy, dz);
        const yawDeg = (Math.atan2(-dx, -dz) * 180) / Math.PI;
        const pitchDeg = (Math.atan2(dy, Math.hypot(dx, dz)) * 180) / Math.PI;
        // put the cluster across ~55% of the vertical frame, clamped to a sane lens range
        const fov = Math.min(42, Math.max(7, (2 * Math.atan((ext * 1.9) / (2 * dist)) * 180) / Math.PI));
        window.__qa.camera([p.pos.x, p.eyeY, p.pos.z], yawDeg, pitchDeg, fov);
      }, [trace.points, extent]);
      await h.adv(20);
      await h.shot('pattern-' + id);
      await h.probe(() => { window.__cu.clearMarks(); window.__qa.cameraOff(); });
      const spanH = trace.local.length ? Math.max(...trace.local.map((l) => l.h)) - Math.min(...trace.local.map((l) => l.h)) : 0;
      const spanV = trace.local.length ? Math.max(...trace.local.map((l) => l.v)) - Math.min(...trace.local.map((l) => l.v)) : 0;
      summary[id] = {
        shots: trace.shots, spanHorizM: +spanH.toFixed(3), spanVertM: +spanV.toFixed(3),
        driftHorizM: trace.local.length ? +trace.local[trace.local.length - 1].h.toFixed(3) : 0,
        climbVertM: trace.local.length ? +trace.local[trace.local.length - 1].v.toFixed(3) : 0,
        local: trace.local,
      };
      h.log(id, `shots=${trace.shots} climb=${summary[id].climbVertM}m drift=${summary[id].driftHorizM}m`);
    }
    h.save('summary', { wall, guns: summary });

    // repeatability: the same burst twice from the same pose must land in the same places
    const repeat = [];
    for (let run = 0; run < 2; run++) {
      await h.probe((w) => {
        window.__qa.resetMission();
        window.__qa.freezeAI(true);
        window.__qa.god(true);
        window.__qa.teleport(w.cp);
        const p = window.__game.mission.player;
        p.yaw = (w.yawDeg * Math.PI) / 180; p.pitch = (w.pitchDeg * Math.PI) / 180; p.vel.set(0, 0, 0);
      }, wall);
      await h.adv(900);
      await h.equip('halcyon-hc4');
      await h.mouse(2, true);
      await h.adv(500);
      await h.probe(() => window.__cu.recordImpacts());
      await h.fire(900);
      await h.adv(60);
      await h.mouse(2, false);
      repeat.push(await h.probe(() => window.__cu.impacts()
        .filter((im) => im.material !== 'flesh')
        .map((im) => im.p.map((v) => +v.toFixed(4)))));
    }
    const identical = JSON.stringify(repeat[0]) === JSON.stringify(repeat[1]);
    h.log('repeatable across a mission reset:', identical, `(${repeat[0].length} vs ${repeat[1].length} impacts)`);
    h.save('repeatability', { identical, runA: repeat[0], runB: repeat[1] });
  },

  /** ADS blend/spread over time per weapon, plus the scope sway figure and the breath hold. */
  async 'ads-timing'(h) {
    await h.ready();
    await h.qa('teleport', 'lobby');
    await h.adv(200);
    const out = {};
    for (const id of ALL_GUNS) {
      await h.equip(id);
      await h.mouse(2, true);
      const rise = [];
      for (let t = 0; t <= 500; t += 25) {
        rise.push({ ms: t, ...(await h.probe(() => window.__cu.arsenal())) });
        await h.adv(25);
      }
      await h.mouse(2, false);
      const fall = [];
      for (let t = 0; t <= 300; t += 25) {
        fall.push({ ms: t, ...(await h.probe(() => window.__cu.arsenal())) });
        await h.adv(25);
      }
      const settle = rise.find((r) => r.adsBlend >= 0.999);
      out[id] = {
        adsMs: await h.probe(() => window.__game.mission.player.arsenal.current.def.adsMs),
        settledAtMs: settle ? settle.ms : null,
        hipSpread: rise[0].spreadDeg,
        adsSpread: rise[rise.length - 1].spreadDeg,
        rise, fall,
      };
      h.log(id, `adsMs=${out[id].adsMs} settled@${out[id].settledAtMs}ms hip=${out[id].hipSpread}° ads=${out[id].adsSpread}°`);
    }

    // LR-8 scope: breath sway, then Shift to steady it
    await h.equip('meridian-lr8');
    await h.mouse(2, true);
    await h.adv(500);
    const free = [];
    for (let i = 0; i < 40; i++) { await h.adv(50); free.push(await h.probe(() => window.__cu.arsenal())); }
    await h.shot('scoped-free');
    await h.qa('press', 'ShiftLeft');
    const held = [];
    for (let i = 0; i < 30; i++) { await h.adv(50); held.push(await h.probe(() => window.__cu.arsenal())); }
    await h.shot('scoped-steady');
    await h.qa('release', 'ShiftLeft');
    await h.mouse(2, false);
    const amp = (rows, k) => Math.max(...rows.map((r) => Math.abs(r[k])));
    const sway = {
      freeAmpXDeg: +amp(free, 'swayXDeg').toFixed(4), freeAmpYDeg: +amp(free, 'swayYDeg').toFixed(4),
      heldAmpXDeg: +amp(held.slice(10), 'swayXDeg').toFixed(4), heldAmpYDeg: +amp(held.slice(10), 'swayYDeg').toFixed(4),
      steadyLeftAfterHold: held[held.length - 1].steadyLeft,
      free, held,
    };
    h.log('scope sway free', sway.freeAmpXDeg, '/', sway.freeAmpYDeg, 'deg -> steadied', sway.heldAmpXDeg, '/', sway.heldAmpYDeg);
    h.save('summary', { guns: out, sway });

    // a scoped shot, for the record
    await h.equip('meridian-lr8');
    await h.mouse(2, true);
    await h.adv(500);
    await h.shot('scope-view');
    await h.fire(40);
    await h.adv(60);
    await h.shot('scope-fired');
    await h.mouse(2, false);
  },

  /** The whole spread model as a table: stance x movement x air x crouch x bloom. */
  async 'spread-table'(h) {
    await h.ready();
    await h.qa('teleport', 'lobby');
    await h.adv(200);
    const rows = {};
    for (const id of ALL_GUNS) {
      await h.equip(id);
      rows[id] = await h.probe(() => {
        const p = window.__game.mission.player, a = p.arsenal;
        const at = (opts) => {
          const wasGround = p.onGround, wasBlend = a.adsBlend, wasHeat = a.heat;
          p.onGround = opts.air ? false : true;
          a.adsBlend = opts.ads ? 1 : 0;
          a.heat = opts.heat ?? 0;
          const v = +a.spreadDeg(opts.speed ?? 0, !!opts.crouch).toFixed(3);
          p.onGround = wasGround; a.adsBlend = wasBlend; a.heat = wasHeat;
          return v;
        };
        const s = a.current.def.spread;
        return {
          hipStill: at({}),
          hipWalk: at({ speed: 1.85 }),
          hipRun: at({ speed: 3.7 }),
          hipCrouch: at({ crouch: true }),
          hipAir: at({ air: true, speed: 3.7 }),
          adsStill: at({ ads: true }),
          adsWalk: at({ ads: true, speed: 1.85 }),
          adsRun: at({ ads: true, speed: 3.7 }),
          adsCrouch: at({ ads: true, crouch: true }),
          adsAir: at({ ads: true, air: true, speed: 3.7 }),
          adsFullBloom: at({ ads: true, heat: s.max }),
          def: { base: s.base, aim: s.aim, move: s.move, air: s.air, crouchMul: s.crouchMul, perShot: s.perShot, max: s.max, decay: s.decay },
        };
      });
      h.log(id, `hip=${rows[id].hipStill}° ads=${rows[id].adsStill}° run=${rows[id].hipRun}° air=${rows[id].hipAir}°`);
    }
    // bloom + decay trace for the HC-4
    await h.equip('halcyon-hc4');
    await h.mouse(2, true);
    await h.adv(300);
    const bloom = [];
    await h.qa('mouse', 0, true);
    for (let i = 0; i < 12; i++) { await h.adv(100); bloom.push({ ms: i * 100, ...(await h.probe(() => window.__cu.arsenal())) }); }
    await h.qa('mouse', 0, false);
    for (let i = 0; i < 12; i++) { await h.adv(100); bloom.push({ ms: 1200 + i * 100, ...(await h.probe(() => window.__cu.arsenal())) }); }
    await h.mouse(2, false);
    h.save('summary', { rows, hc4Bloom: bloom });
  },

  /**
   * Shoot a hostile standing behind a thin interior wall. Verifies material-aware penetration,
   * that both faces of the wall report an impact, and how much damage each weapon carries through.
   */
  async 'penetration'(h) {
    await h.ready();
    const wall = await h.probe(() => window.__cu.findWall(2.6, 5.5, ['drywall'], 3.2));
    if (!wall) throw new Error('no drywall wall found');
    h.log('wall:', JSON.stringify(wall));
    const results = {};

    for (const id of ALL_GUNS) {
      const setup = await h.probe((w) => {
        window.__qa.resetMission();
        window.__qa.freezeAI(true);
        window.__qa.god(true);
        window.__qa.teleport(w.cp);
        const m = window.__game.mission, p = m.player;
        p.yaw = (w.yawDeg * Math.PI) / 180; p.pitch = 0; p.vel.set(0, 0, 0);
        const f = { x: -Math.sin(p.yaw), z: -Math.cos(p.yaw) };
        // put the hostile 1.6 m past the far face of the wall
        const hit = m.world.raycast(p.pos.x, p.eyeY, p.pos.z, f.x, 0, f.z, 12, (c) => c.blockShot);
        const thick = Math.min(hit.collider.max.x - hit.collider.min.x, hit.collider.max.z - hit.collider.min.z);
        const d = hit.t + thick + 1.6;
        const tx = p.pos.x + f.x * d, tz = p.pos.z + f.z * d;
        const ground = m.world.raycast(tx, p.pos.y + 1.4, tz, 0, -1, 0, 3, (c) => c.blockMove);
        const y = ground ? ground.point.y : p.pos.y;
        const eid = window.__qa.spawnEnemy('trooper', [tx, y, tz]);
        return { eid, wallT: +hit.t.toFixed(2), thick: +thick.toFixed(3), targetDist: +d.toFixed(2) };
      }, wall);
      await h.adv(900);
      await h.equip(id);
      await h.probe(() => { window.__cu.recordImpacts(); window.__cu.recordDamage(); });
      // aim at the chest through the wall
      await h.probe((eid) => {
        const m = window.__game.mission, p = m.player;
        const e = m.enemies.find((x) => x.id === eid);
        const dx = e.pos.x - p.pos.x, dy = (e.pos.y + 1.2) - p.eyeY, dz = e.pos.z - p.pos.z;
        p.yaw = Math.atan2(-dx, -dz);
        p.pitch = Math.atan2(dy, Math.hypot(dx, dz));
      }, setup.eid);
      await h.mouse(2, true);
      await h.adv(450);
      await h.fire(40);
      await h.adv(200);
      await h.mouse(2, false);
      const r = await h.probe((eid) => {
        const m = window.__game.mission;
        const e = m.enemies.find((x) => x.id === eid);
        return {
          impacts: window.__cu.impacts(),
          damage: window.__cu.damageLog().filter((d) => d.id === eid),
          hp: +e.hp.toFixed(1), alive: e.alive,
        };
      }, setup.eid);
      const entry = results[id] = {
        ...setup,
        wallImpacts: r.impacts.filter((im) => im.material === 'drywall').length,
        exitSideImpacts: r.impacts.filter((im) => im.material === 'drywall').length - 1,
        hitsThrough: r.damage.length,
        damageThrough: r.damage.reduce((a, d) => a + d.amount, 0),
        hpLeft: r.hp,
        impacts: r.impacts.map((im) => ({ material: im.material, p: im.p.map((v) => +v.toFixed(2)) })),
      };
      entry.damageThrough = +entry.damageThrough.toFixed(1);
      h.log(id, `wallImpacts=${entry.wallImpacts} hitsThrough=${entry.hitsThrough} dmg=${entry.damageThrough} hpLeft=${entry.hpLeft}`);
      if (id === 'meridian-lr8' || id === 'boreal-k5') {
        // Down the sights all you see is wall, so document the two holes instead: the near face from
        // the shooter's side, then the far face from the target's side with the hostile in frame.
        await h.mouse(2, false);
        await h.adv(400); // let the scope drop before the camera is taken over
        const holes = r.impacts.filter((im) => im.material === 'drywall')
          .map((im) => im.p)
          .sort((a, b) => Math.hypot(a[0] - wall.pos[0], a[2] - wall.pos[2]) - Math.hypot(b[0] - wall.pos[0], b[2] - wall.pos[2]));
        for (const [side, hole] of [['entry', holes[0]], ['exit', holes[holes.length - 1]]]) {
          if (!hole) continue;
          const n = side === 'entry' ? wall.normal : wall.normal.map((v) => -v);
          await h.probe(([pts, nn]) => window.__cu.marks(pts, nn, [0xff3b30], 0.05), [[hole], n]);
          await h.probe(([hl, nn]) => {
            // stand off the hole along its own normal, raised and swung aside so the face reads flat
            const eye = [hl[0] + nn[0] * 2.1 + nn[2] * 1.15, hl[1] + 0.75, hl[2] + nn[2] * 2.1 - nn[0] * 1.15];
            const dx = hl[0] - eye[0], dy = hl[1] - eye[1], dz = hl[2] - eye[2];
            window.__qa.camera(eye, (Math.atan2(-dx, -dz) * 180) / Math.PI,
              (Math.atan2(dy, Math.hypot(dx, dz)) * 180) / Math.PI, 55);
          }, [hole, n]);
          await h.adv(20);
          await h.shot(`${side}-${id}`);
          await h.probe(() => { window.__cu.clearMarks(); window.__qa.cameraOff(); });
        }
      }
    }

    // Control: metal and concrete stop even the LR-8. One impact means the round died on the near
    // face; two would mean it punched through and reported an exit wound.
    const control = {};
    for (const mat of ['metal', 'concrete']) {
      const found = await h.probe((mm) => window.__cu.findWall(2.6, 7, [mm]), mat);
      if (!found) { control[mat] = 'no such wall in reach'; continue; }
      await h.equip('meridian-lr8');
      // the LR-8 cycles in 1333 ms, so a shot fired too soon after the last one silently does nothing
      await h.adv(1500);
      await h.probe(() => { window.__cu.recordImpacts(); });
      const before = (await h.state()).player.weapon.magazine;
      await h.fire(40);
      await h.adv(250);
      const after = (await h.state()).player.weapon.magazine;
      const imp = await h.probe(() => window.__cu.impacts());
      control[mat] = {
        fired: before - after, impacts: imp.length,
        materials: [...new Set(imp.map((i) => i.material))],
        stopped: before - after === 1 && imp.length === 1,
      };
      h.log('control', mat, JSON.stringify(control[mat]));
    }
    h.save('summary', { wall, guns: results, control });
  },

  /**
   * TTK matrix. Two measurements per weapon/target:
   *   single — one aimed round at a time, which isolates the damage model
   *   auto   — trigger held down from a fixed pose, which is what the recoil pattern costs you
   */
  async 'ttk'(h) {
    await h.ready();
    const lane = await h.probe(() => window.__cu.findOpenLane(12));
    if (!lane) throw new Error('no 12 m open lane found');
    h.log('lane:', JSON.stringify(lane));
    const matrix = {};

    const setup = async (type, dist) => h.probe(([w, t, d]) => {
      window.__qa.resetMission();
      window.__qa.freezeAI(true);
      window.__qa.god(true);
      window.__qa.teleport(w.cp);
      const m = window.__game.mission, p = m.player;
      p.yaw = (w.yawDeg * Math.PI) / 180; p.pitch = 0; p.vel.set(0, 0, 0);
      const f = { x: -Math.sin(p.yaw), z: -Math.cos(p.yaw) };
      const tx = p.pos.x + f.x * d, tz = p.pos.z + f.z * d;
      const ground = m.world.raycast(tx, p.pos.y + 1.4, tz, 0, -1, 0, 3, (c) => c.blockMove);
      const eid = window.__qa.spawnEnemy(t, [tx, ground ? ground.point.y : p.pos.y, tz]);
      window.__cu.recordDamage();
      const e = m.enemies.find((x) => x.id === eid);
      return { eid, hp: e.hp, dist: +Math.hypot(e.pos.x - p.pos.x, e.pos.z - p.pos.z).toFixed(2) };
    }, [lane, type, dist]);

    const aim = (eid, at = 1.2) => h.probe(([id, y]) => {
      const m = window.__game.mission, p = m.player;
      const e = m.enemies.find((x) => x.id === id);
      const dx = e.pos.x - p.pos.x, dy = (e.pos.y + y) - p.eyeY, dz = e.pos.z - p.pos.z;
      p.yaw = Math.atan2(-dx, -dz);
      p.pitch = Math.atan2(dy, Math.hypot(dx, dz));
    }, [eid, at]);

    const enemyState = (eid) => h.probe((id) => {
      const m = window.__game.mission;
      const e = m.enemies.find((x) => x.id === id);
      return { hp: +Math.max(0, e.hp).toFixed(1), alive: e.alive };
    }, eid);

    for (const id of ALL_GUNS) {
      matrix[id] = {};
      for (const type of ['scout', 'trooper', 'heavy']) {
        // --- one aimed round at a time (ADS, standing still): the damage model
        const s = await setup(type, 12);
        await h.adv(900);
        await h.equip(id);
        await h.mouse(2, true);
        await h.adv(500);
        let shots = 0;
        const t0 = await h.probe(() => window.__cu.simTime());
        let st = await enemyState(s.eid);
        while (st.alive && shots < 30) {
          await aim(s.eid, 1.2);
          await h.fire(20);
          shots++;
          await h.adv(id === 'vanta-s12' ? 1500 : id === 'meridian-lr8' ? 1400 : 400);
          st = await enemyState(s.eid);
        }
        const t1 = await h.probe(() => window.__cu.simTime());
        const log = await h.probe((eid) => window.__cu.damageLog().filter((d) => d.id === eid), s.eid);
        await h.mouse(2, false);

        // --- sustained fire from a FIXED pose (no re-aim): what the recoil pattern costs
        const s2 = await setup(type, 12);
        await h.adv(900);
        await h.equip(id);
        const isAuto = await h.probe(() => !!window.__game.mission.player.arsenal.current.def.auto);
        await h.mouse(2, true);
        await h.adv(500);
        await aim(s2.eid, 1.2);
        const a0 = await h.probe(() => window.__cu.simTime());
        let held = 0;
        let st2 = await enemyState(s2.eid);
        if (isAuto) {
          await h.qa('mouse', 0, true);
          while (st2.alive && held < 6000) { await h.adv(100); held += 100; st2 = await enemyState(s2.eid); }
          await h.qa('mouse', 0, false);
        } else {
          // semi-automatic: tap as fast as the action allows, still without re-aiming
          const step = id === 'vanta-s12' ? 1500 : id === 'meridian-lr8' ? 1400 : 200;
          while (st2.alive && held < 12000) {
            await h.fire(20);
            await h.adv(step);
            held += step + 20;
            st2 = await enemyState(s2.eid);
          }
        }
        const a1 = await h.probe(() => window.__cu.simTime());
        const log2 = await h.probe((eid) => window.__cu.damageLog().filter((d) => d.id === eid), s2.eid);
        const fired = await h.probe(() => window.__game.mission.stats.shots);
        await h.mouse(2, false);

        matrix[id][type] = {
          hp: +s.hp.toFixed(0),
          single: {
            killed: !st.alive, shots, hits: log.length,
            perHit: log.length ? +(log.reduce((a, d) => a + d.amount, 0) / log.length).toFixed(1) : 0,
            regions: [...new Set(log.map((d) => d.region))],
            seconds: +(t1 - t0).toFixed(2),
          },
          auto: {
            killed: !st2.alive, seconds: +(a1 - a0).toFixed(2), hits: log2.length,
            shotsFired: fired,
            damage: +log2.reduce((a, d) => a + d.amount, 0).toFixed(1),
          },
        };
        h.log(id, type, `single: ${shots} shots (${matrix[id][type].single.perHit}/hit, ${matrix[id][type].single.seconds}s)`,
          `held: ${matrix[id][type].auto.killed ? matrix[id][type].auto.seconds + 's' : 'no kill'}`);
      }
    }

    // head shots and the knife, on a trooper
    const extras = {};
    for (const id of ALL_GUNS) {
      const s = await setup('trooper', 12);
      await h.adv(900);
      await h.equip(id);
      await h.mouse(2, true);
      await h.adv(500);
      let shots = 0;
      let st = await enemyState(s.eid);
      while (st.alive && shots < 12) {
        await aim(s.eid, 1.66);
        await h.fire(20);
        shots++;
        await h.adv(id === 'vanta-s12' ? 1500 : id === 'meridian-lr8' ? 1400 : 400);
        st = await enemyState(s.eid);
      }
      await h.mouse(2, false);
      const log = await h.probe((eid) => window.__cu.damageLog().filter((d) => d.id === eid), s.eid);
      extras[id] = {
        headShots: shots, killed: !st.alive,
        regions: [...new Set(log.map((d) => d.region))],
        perHit: log.length ? +(log.reduce((a, d) => a + d.amount, 0) / log.length).toFixed(1) : 0,
      };
      h.log('head', id, JSON.stringify(extras[id]));
    }

    // knife: front vs back
    const knife = {};
    for (const facing of ['front', 'back']) {
      const s = await setup('trooper', 12);
      await h.adv(900);
      await h.equip('cq-blade');
      const before = await h.probe(([eid, f]) => {
        const m = window.__game.mission, p = m.player;
        const e = m.enemies.find((x) => x.id === eid);
        p.pos.set(e.pos.x, e.pos.y, e.pos.z + 1.05);
        p.yaw = Math.atan2(-(e.pos.x - p.pos.x), -(e.pos.z - p.pos.z));
        p.pitch = 0;
        // facing 'front' = the hostile looks at the player; 'back' = it looks away
        const toPlayer = Math.atan2(-(p.pos.x - e.pos.x), -(p.pos.z - e.pos.z));
        e.yaw = f === 'front' ? toPlayer : toPlayer + Math.PI;
        e.guardYaw = e.yaw;
        window.__cu.recordDamage();
        return +e.hp.toFixed(1);
      }, [s.eid, facing]);
      await h.adv(60);
      await h.fire(30);
      await h.adv(500);
      const log = await h.probe((eid) => window.__cu.damageLog().filter((d) => d.id === eid), s.eid);
      const st = await enemyState(s.eid);
      knife[facing] = { hpBefore: before, hits: log.length, damage: +log.reduce((a, d) => a + d.amount, 0).toFixed(1), hpAfter: st.hp, killed: !st.alive };
      h.log('knife', facing, JSON.stringify(knife[facing]));
    }
    // Shell-by-shell falloff: the S-12 is meant to be decisive inside a room and a poor argument
    // down a corridor, which one shell per distance shows better than a shots-to-kill count.
    const buck = {};
    for (const d of [3, 6, 9, 12, 16]) {
      const s = await setup('trooper', d);
      await h.adv(900);
      await h.equip('vanta-s12');
      await h.mouse(2, true);
      await h.adv(500);
      await aim(s.eid, 1.2);
      await h.fire(20);
      await h.adv(400);
      await h.mouse(2, false);
      const log = await h.probe((eid) => window.__cu.damageLog().filter((x) => x.id === eid), s.eid);
      const st = await enemyState(s.eid);
      buck[d + 'm'] = {
        pelletsHit: log.length, damage: +log.reduce((a, x) => a + x.amount, 0).toFixed(1),
        perPellet: log.length ? +(log.reduce((a, x) => a + x.amount, 0) / log.length).toFixed(1) : 0,
        hpLeft: st.hp, killed: !st.alive,
      };
      h.log('buckshot', d + 'm', JSON.stringify(buck[d + 'm']));
    }
    h.save('summary', { lane, matrix, headShots: extras, knife, buckshotByRange: buck });
  },

  /**
   * Weapon handling: the chambered round, a reload abandoned by a weapon switch, the shell-by-shell
   * interrupt and the dry-fire click. All state, no pixels.
   */
  async 'handling'(h) {
    await h.ready();
    const out = {};
    const weap = async () => (await h.state()).player.weapon;
    const ammo = () => h.probe(() => {
      const w = window.__game.mission.player.arsenal.current;
      return { mag: w.mag, reserve: w.reserve };
    });

    // --- +1 chamber on a tactical reload, but not from empty
    out.chamber = {};
    for (const id of ['halcyon-hc4', 'karst-p9', 'boreal-k5', 'meridian-lr8', 'vanta-s12']) {
      await h.equip(id);
      const def = await h.probe(() => {
        const d = window.__game.mission.player.arsenal.current.def;
        return { magSize: d.magSize, chamber: !!d.chamber, perShell: !!d.reloadPerShell, reloadEmptyMs: d.reloadEmptyMs, reloadMs: d.reloadMs };
      });
      // tactical: leave rounds in the magazine
      await h.probe((n) => { window.__game.mission.player.arsenal.current.mag = n; }, Math.max(1, def.magSize - 5));
      await h.tap('KeyR');
      // shell-by-shell needs one reload window per shell, so give the whole magazine time
      await h.adv((def.reloadEmptyMs ?? def.reloadMs) * (def.perShell ? def.magSize : 1) + 2600);
      const tactical = await ammo();
      // empty: the bolt closes on nothing
      await h.qa('refillAmmo');
      await h.probe(() => { window.__game.mission.player.arsenal.current.mag = 0; });
      await h.tap('KeyR');
      await h.adv((def.reloadEmptyMs ?? def.reloadMs) * (def.perShell ? def.magSize : 1) + 2600);
      const empty = await ammo();
      out.chamber[id] = {
        magSize: def.magSize, closedBolt: def.chamber, perShell: def.perShell,
        tacticalMag: tactical.mag, emptyMag: empty.mag,
        plusOne: tactical.mag === def.magSize + 1,
      };
      h.log('chamber', id, JSON.stringify(out.chamber[id]));
    }

    // --- a switch mid-reload abandons it, and the progress is lost
    await h.equip('halcyon-hc4');
    await h.probe(() => { window.__game.mission.player.arsenal.current.mag = 10; });
    const before = await ammo();
    await h.probe(() => window.__cu.recordBus(['weapon-state', 'weapon-changed']));
    await h.tap('KeyR');
    await h.adv(880); // partway through a 2100 ms reload
    const during = await weap();
    await h.tap('Digit1'); // switch to the sidearm
    await h.adv(900);
    const afterSwitch = await weap();
    await h.tap('Digit2'); // and back
    await h.adv(1200);
    const back = await h.probe(() => {
      const a = window.__game.mission.player.arsenal;
      return { mag: a.slots[2].mag, reserve: a.slots[2].reserve, state: a.state };
    });
    const busLog = await h.probe(() => window.__cu.busLog());
    out.reloadCancel = {
      magBefore: before.mag, reserveBefore: before.reserve,
      stateDuringReload: during.state, stateAfterSwitch: afterSwitch.id,
      magAfter: back.mag, reserveAfter: back.reserve,
      progressLost: back.mag === before.mag && back.reserve === before.reserve,
      cancelEvent: busLog.some((e) => e.payload.state === 'reload-cancelled'),
    };
    h.log('reload-cancel', JSON.stringify(out.reloadCancel));

    // --- shotgun: a shell goes in, then the trigger interrupts the sequence to fire
    await h.equip('vanta-s12');
    await h.probe(() => { window.__game.mission.player.arsenal.current.mag = 2; });
    await h.tap('KeyR');
    await h.adv(700); // one shell
    const shell1 = await ammo();
    await h.adv(700); // a second
    const shell2 = await ammo();
    await h.mouse(0, true);
    await h.adv(40);
    await h.mouse(0, false);
    await h.adv(200);
    const interrupted = await weap();
    out.shotgun = {
      afterOneShell: shell1.mag, afterTwoShells: shell2.mag,
      // firing costs one shell and then the pump runs, so the tube is one down and the state is pump
      stateAfterTriggerPull: interrupted.state, magAfterFiring: interrupted.magazine,
      interruptedToFire: interrupted.magazine === shell2.mag - 1 && interrupted.state !== 'reload',
    };
    h.log('shotgun', JSON.stringify(out.shotgun));

    // --- dry fire: a click, a cooldown, and no reserve spent
    await h.equip('karst-p9');
    await h.probe(() => { window.__game.mission.player.arsenal.current.mag = 0; });
    await h.probe(() => window.__cu.recordBus(['weapon-dryfire']));
    const reserveBefore = (await ammo()).reserve;
    for (let i = 0; i < 6; i++) { await h.fire(20); await h.adv(60); } // 6 pulls inside ~0.5 s
    const clicks = (await h.probe(() => window.__cu.busLog())).length;
    out.dryFire = {
      pulls: 6, clicks, reserveBefore, reserveAfter: (await ammo()).reserve,
      mag: (await ammo()).mag,
      throttled: clicks < 6,
    };
    h.log('dry-fire', JSON.stringify(out.dryFire));

    // --- draw / holster round trip per weapon
    out.swapMs = {};
    for (const id of [...ALL_GUNS, 'cq-blade']) {
      const t = await h.probe(async (wid) => {
        const { WEAPONS } = await import('/src/weapons/defs.js');
        const d = WEAPONS[wid];
        return { drawMs: d.drawMs, holsterMs: d.holsterMs };
      }, id);
      out.swapMs[id] = { ...t, swapTotalMs: t.drawMs + t.holsterMs };
    }
    h.log('swap times:', JSON.stringify(out.swapMs));
    h.save('summary', out);
  },

  /**
   * The recoil budget: how far the view is actually pushed during a burst, and how it comes home.
   * Recovery must approach the pre-fire aim from one side and stop there — if pitch ever crosses
   * below zero the camera is dipping past where the player was pointing, which reads as a bug.
   */
  async 'recoil-envelope'(h) {
    await h.ready();
    await h.qa('teleport', 'lobby');
    await h.adv(300);
    const out = {};
    for (const id of ALL_GUNS) {
      await h.equip(id);
      await h.probe(() => {
        const p = window.__game.mission.player;
        p.pitch = 0; p.vel.set(0, 0, 0);
      });
      await h.mouse(2, true);
      await h.adv(500);
      const def = await h.probe(() => {
        const d = window.__game.mission.player.arsenal.current.def;
        return { auto: !!d.auto, cycle: Math.round(60000 / d.rpm) + (d.pumpMs ?? 0) };
      });
      const sample = () => h.probe(() => {
        const a = window.__game.mission.player.arsenal;
        const R = 180 / Math.PI;
        return {
          t: +window.__game.engine.simTime.toFixed(3),
          pitch: +(a.recoilPitch * R).toFixed(3),
          yaw: +(a.recoilYaw * R).toFixed(3),
          roll: +(a.rollKick * R).toFixed(3),
          step: a.recoilIndex,
        };
      });
      const trace = [];
      if (def.auto) {
        await h.qa('mouse', 0, true);
        for (let i = 0; i < 14; i++) { await h.adv(90); trace.push(await sample()); }
        await h.qa('mouse', 0, false);
      } else {
        for (let i = 0; i < 6; i++) {
          await h.fire(20);
          trace.push(await sample());
          await h.adv(Math.max(0, def.cycle - 20) + 8);
        }
      }
      // then let go and watch it come home
      const recovery = [];
      for (let i = 0; i < 30; i++) { await h.adv(40); recovery.push(await sample()); }
      await h.mouse(2, false);
      const all = [...trace, ...recovery];
      const settleIdx = recovery.findIndex((s) => Math.abs(s.pitch) < 0.05 && Math.abs(s.yaw) < 0.05);
      out[id] = {
        peakPitchDeg: +Math.max(...all.map((s) => s.pitch)).toFixed(2),
        peakAbsYawDeg: +Math.max(...all.map((s) => Math.abs(s.yaw))).toFixed(2),
        peakAbsRollDeg: +Math.max(...all.map((s) => Math.abs(s.roll))).toFixed(2),
        // negative pitch during recovery would mean the view swung past the original aim
        minPitchAfterRelease: +Math.min(...recovery.map((s) => s.pitch)).toFixed(3),
        overshoots: recovery.some((s) => s.pitch < -0.05),
        settleMs: settleIdx < 0 ? null : (settleIdx + 1) * 40,
        patternStepsUsed: Math.max(...all.map((s) => s.step)),
        trace: all,
      };
      h.log(id, `peak pitch=${out[id].peakPitchDeg}° yaw=${out[id].peakAbsYawDeg}° roll=${out[id].peakAbsRollDeg}°`,
        `settle=${out[id].settleMs}ms overshoot=${out[id].overshoots} steps=${out[id].patternStepsUsed}`);
    }
    h.save('summary', out);
  },

  /**
   * Player armour: how much of a bullet each region lets past the plate, and the single
   * 'armor-broken' moment the HUD hangs its feedback on.
   */
  async 'armor'(h) {
    await h.ready();
    await h.qa('god', false);
    const vitals = () => h.probe(() => {
      const p = window.__game.mission.player;
      return { health: +p.health.toFixed(2), armor: +p.armor.toFixed(2) };
    });

    // one 40-damage hit per region, each from an untouched plate
    const perRegion = {};
    for (const region of ['head', 'torso', 'legs']) {
      await h.qa('resetMission');
      await h.qa('freezeAI', true);
      await h.qa('god', false);
      await h.adv(600);
      await h.probe(() => window.__cu.recordBus(['armor-broken', 'player-damaged']));
      const before = await vitals();
      await h.probe((r) => window.__game.mission.player.damage(40, null, r), region);
      const after = await vitals();
      perRegion[region] = {
        ...after,
        healthLost: +(before.health - after.health).toFixed(2),
        armorLost: +(before.armor - after.armor).toFixed(2),
      };
      h.log('region', region, JSON.stringify(perRegion[region]));
    }

    // then hammer the torso until the plate gives out
    await h.qa('resetMission');
    await h.qa('freezeAI', true);
    await h.qa('god', false);
    await h.adv(600);
    await h.probe(() => window.__cu.recordBus(['armor-broken', 'player-damaged']));
    const steps = [];
    for (let i = 0; i < 8; i++) {
      await h.probe(() => window.__game.mission.player.damage(25, null, 'torso'));
      const v = await vitals();
      steps.push({ hit: i + 1, ...v });
      if (!(await h.probe(() => window.__game.mission.player.alive))) break;
    }
    const busLog = await h.probe(() => window.__cu.busLog());
    const breaks = busLog.filter((e) => e.event === 'armor-broken');
    const brokeAt = steps.findIndex((s) => s.armor === 0) + 1;
    h.log('torso string:', steps.map((s) => `${s.armor}/${s.health}`).join(' -> '));
    h.log(`armor-broken emitted ${breaks.length}x, plate gone after hit ${brokeAt}`);
    // a bullet still says 'bullet' rather than leaking the region name into the HUD's damage type
    const types = [...new Set(busLog.filter((e) => e.event === 'player-damaged').map((e) => e.payload.type))];
    h.log('player-damaged types:', JSON.stringify(types));
    h.save('summary', {
      perRegion, torsoString: steps, armorBrokenEvents: breaks, damageTypes: types,
      onceOnly: breaks.length === 1,
    });
  },

  /** A handful of "is it still a game" frames: hip, ADS, post-burst, crouched, airborne. */
  async 'feel-frames'(h) {
    await h.ready();
    await h.qa('teleport', 'lobby');
    await h.adv(300);
    await h.equip('halcyon-hc4');
    await h.shot('hip-idle');
    await h.mouse(2, true);
    await h.adv(400);
    await h.shot('ads-settled');
    await h.qa('mouse', 0, true);
    await h.adv(700);
    await h.shot('mid-burst');
    await h.qa('mouse', 0, false);
    await h.mouse(2, false);
    await h.adv(700);
    await h.shot('recovered');
    await h.qa('press', 'KeyC');
    await h.adv(400);
    await h.qa('release', 'KeyC');
    await h.shot('crouched');
    await h.qa('press', 'KeyC');
    await h.adv(60);
    await h.qa('release', 'KeyC');
    await h.adv(500);
    await h.qa('press', 'Space');
    await h.adv(60);
    await h.qa('release', 'Space');
    await h.adv(180);
    await h.shot('airborne');
    await h.adv(1200);
    await h.equip('vanta-s12');
    await h.shot('shotgun-hip');
    await h.equip('meridian-lr8');
    await h.mouse(2, true);
    await h.adv(600);
    await h.shot('lr8-scoped');
    await h.mouse(2, false);
    await h.adv(300);
    const st = await h.state();
    h.log('final weapon state:', JSON.stringify(st.player.weapon));
  },
};

// ---------------------------------------------------------------------------
const wanted = process.argv.slice(2);
const names = wanted.length ? wanted : Object.keys(SCENARIOS);

const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-dev-shm-usage'],
});

let failures = 0;
for (const name of names) {
  const fn = SCENARIOS[name];
  if (!fn) { console.error('unknown scenario:', name); failures++; continue; }
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.setDefaultTimeout(240000);
  const report = { shots: [], data: [], errors: [] };
  page.on('pageerror', (e) => report.errors.push('pageerror: ' + e.message));
  console.log(`SCENARIO ${name}`);
  const t0 = Date.now();
  try {
    await page.route('**/@vite/client', (route) => route.fulfill({
      contentType: 'application/javascript', body: VITE_CLIENT_STUB,
    }));
    await page.goto(SERVER + '/?qa=1&test=1', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__game && window.__game.state === 'title', null, { timeout: 120000 });
    await page.evaluate(PAGE_UTILS);
    await fn(makeHelpers(page, name, report));
    const errs = await page.evaluate(() => window.__consoleErrors);
    report.errors.push(...errs);
    if (report.errors.length) {
      failures++;
      console.log(`  ERRORS(${report.errors.length}):`, JSON.stringify(report.errors.slice(0, 6), null, 1));
    } else {
      console.log(`  ok — ${report.shots.length} shots, ${report.data.length} data files, ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    }
  } catch (e) {
    failures++;
    console.error(`  FAILED: ${e.message.split('\n')[0]}`);
    try { await page.screenshot({ path: path.join(OUT, `${name}--FAILED.png`) }); } catch { /* ignore */ }
  }
  await page.close();
}
await browser.close();
console.log(failures ? `DONE with ${failures} failing scenario(s)` : 'DONE all scenarios passed');
process.exit(failures ? 1 : 0);
