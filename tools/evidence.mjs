// Curated evidence package (Opus 4, WP-016). Captures the visual record that ships with the
// release report: every room from its checkpoint, every weapon in first person, the character
// roster, every UI screen, and the cause-and-effect moments that prove the systems work.
//
// Output: docs/evidence/<category>--<name>.jpg at 1280x720, JPEG so the whole package stays inside
// its size budget (a comparable PNG set is ~340 MB). docs/evidence/index.json records what was
// captured and docs/evidence/README.md is generated from it, so the index can never drift from the
// files on disk.
//
// Screenshots are taken with the engine loop stopped and one explicit render() before each frame:
// under ANGLE/SwiftShader an idle requestAnimationFrame loop spends seconds per presented frame and
// would triple the runtime for nothing.
//
// Usage: node tools/evidence.mjs [category ...]      (default: all)
//        SERVER=http://127.0.0.1:5187 node tools/evidence.mjs rooms
//        node tools/evidence.mjs --quality 70
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : fallback;
};
const SERVER = process.env.SERVER || 'http://127.0.0.1:5187';
const QUALITY = +opt('--quality', 78);
const OUT = 'docs/evidence';
const INDEX = path.join(OUT, 'index.json');
const SETTINGS_KEY = 'northstar.settings.v1';
const VIEWPORT = { width: 1280, height: 720 };

// Production-quality settings: this is a visual record, so it is captured at the tier a player on
// decent hardware would use, not at the test tier.
const SETTINGS = {
  quality: 'high', resolutionScale: 1, sensitivity: 1, invertY: false, fov: 75, crosshair: true,
  reducedMotion: true, subtitles: true, volMaster: 0, volEffects: 0, volMusic: 0, volUI: 0,
};

const VITE_CLIENT_STUB = `
export const createHotContext = () => ({
  on() {}, off() {}, send() {}, accept() {}, acceptExports() {}, dispose() {}, prune() {},
  invalidate() {}, decline() {}, data: {},
});
export const updateStyle = () => {};
export const removeStyle = () => {};
export const injectQuery = (url) => url;
export class ErrorOverlay extends HTMLElement {}
export default {};
`;

// Every checkpoint in src/map/layout.js, in walking order through the building.
const ROOMS = [
  ['plaza', 'Entrance plaza, snowbound facade under the canopy'],
  ['plaza-spawn', 'Insertion point at the plaza edge, looking towards the doors'],
  ['vest', 'Vestibule between the outer doors and the atrium'],
  ['lobby', 'Lobby atrium — the widest sightline on the ground floor'],
  ['lobby-desk', 'Reception desk and visitor seating'],
  ['gallery', 'Gallery wing off the atrium'],
  ['wait', 'East waiting area by the curtain wall'],
  ['sec', 'Security office with the monitor wall'],
  ['stair-a', 'Stairwell A, ground landing'],
  ['copy', 'Copy and supply room'],
  ['corr-e', 'East corridor, ground floor'],
  ['it', 'IT workshop'],
  ['server', 'Server room — hostage A is held here'],
  ['mech', 'Mechanical plant'],
  ['loading', 'Loading bay with the roller shutter'],
  ['garage', 'Extraction garage and the response van'],
  ['sc-west', 'Service corridor, west end'],
  ['sc-mid', 'Service corridor, midpoint'],
  ['sc-east', 'Service corridor, east end'],
  ['break', 'Break room'],
  ['janitor', 'Janitor closet'],
  ['rr-m', 'Restroom, main'],
  ['rr-w', 'Restroom, west'],
  ['stair-b', 'Stairwell B, ground landing'],
  ['courtyard', 'Exterior courtyard on the west flank'],
  ['cubes', 'Open-plan office, east bank of cubicles'],
  ['cubes-west', 'Open-plan office, west bank of cubicles'],
  ['print', 'Print and mail room, first floor'],
  ['corr-n', 'North corridor, first floor'],
  ['conference', 'Conference room'],
  ['records', 'Records room'],
  ['exec-corr', 'Executive corridor'],
  ['asst', 'Assistant station outside the executive office'],
  ['exec', 'Executive office — hostage B is held here'],
  ['corr-w', 'West corridor, first floor'],
  ['well', 'Light well overlooking the atrium'],
  ['mezz-west', 'Mezzanine, west span'],
  ['mezz-south', 'Mezzanine, south span above the entrance'],
  ['mezz-east', 'Mezzanine, east span'],
  ['hr', 'HR office'],
  ['store', 'Storage room, first floor'],
  ['stair-a1', 'Stairwell A, first-floor landing'],
  ['stair-b1', 'Stairwell B, first-floor landing'],
];

const WEAPONS = [
  ['karst-p9', 'Karst P9 sidearm'],
  ['boreal-k5', 'Boreal K5 submachine gun'],
  ['halcyon-hc4', 'Halcyon HC-4 carbine'],
  ['vanta-s12', 'Vanta S-12 shotgun'],
  ['meridian-lr8', 'Meridian LR-8 precision rifle'],
  ['cq-blade', 'Fieldman CQ blade'],
  ['fb-3', 'FB-3 Dazzler flash device'],
  ['sg-2', 'SG-2 Veil smoke device'],
];

// Graybox-to-final pairs for the README. The "before" side comes from artifacts/before-wp011/,
// the earliest surviving capture of these cameras (see the note in the generated README).
const PAIRS = [
  ['lobby', 'Atrium: flat white boxes become a tiled floor, a coffered ceiling, reception and planting'],
  ['cubes', 'Open-plan office: bare slab becomes desks, monitors, chairs and cable trays'],
  ['garage', 'Garage: empty bay becomes the response van, racking and painted floor markings'],
  ['conference', 'Conference room: box table becomes a real table, chairs, screen and glass wall'],
  ['exec', 'Executive office: grey shell becomes desk, shelving, art and warm accent light'],
  ['server', 'Server room: placeholder racks become populated cabinets with status lighting'],
  ['break', 'Break room: empty room becomes counters, appliances, seating and clutter'],
  ['plaza', 'Plaza: white ground plane becomes snow, canopy, signage and the lit facade'],
];

fs.mkdirSync(OUT, { recursive: true });
const index = fs.existsSync(INDEX) ? JSON.parse(fs.readFileSync(INDEX, 'utf8')) : {};

function makeHelpers(page, category, report) {
  const h = {
    page,
    qa: (m, ...a) => page.evaluate(([mm, aa]) => window.__qa[mm](...aa), [m, a]),
    adv: (ms) => page.evaluate((v) => window.advanceTime(v), ms),
    state: async () => JSON.parse(await page.evaluate(() => window.render_game_to_text())),
    probe: (fn, arg) => page.evaluate(fn, arg),
    render: () => page.evaluate(() => window.__game.render()),
    click: (action) => page.locator(`[data-action="${action}"]:visible`).first().click(),

    /** Draws one frame and writes docs/evidence/<category>--<name>.jpg. */
    async shot(name, desc) {
      await h.render();
      const file = `${category}--${name}.jpg`;
      await page.screenshot({ path: path.join(OUT, file), type: 'jpeg', quality: QUALITY, timeout: 240_000 });
      const bytes = fs.statSync(path.join(OUT, file)).size;
      index[file] = { category, name, desc, bytes };
      report.shots.push(file);
      return file;
    },

    /** Points the view at a world point (no smoothing: yaw and pitch are set exactly). */
    lookAt: (at) => page.evaluate((t) => {
      const p = window.__game.mission.player;
      const dx = t[0] - p.pos.x, dy = t[1] - p.eyeY, dz = t[2] - p.pos.z;
      p.yaw = Math.atan2(-dx, -dz);
      p.pitch = Math.atan2(dy, Math.hypot(dx, dz));
    }, at),

    /**
     * Stands the player `dist` metres from a world point with an unobstructed sight line to it,
     * looking at chest height. Tries a ring of bearings and takes the first that is on the navmesh
     * and clear of geometry, so it keeps working if the room is re-dressed.
     */
    standOff: (at, dist = 3) => page.evaluate(([t, d]) => {
      const m = window.__game.mission, p = m.player;
      for (const r of [d, d * 1.15, d * 0.85, d * 1.4]) {
        for (let i = 0; i < 24; i++) {
          const a = (i / 24) * Math.PI * 2;
          const x = t[0] + Math.cos(a) * r, z = t[2] + Math.sin(a) * r;
          if (m.nav.nearestNode(x, t[1], z) < 0) continue;
          p.pos.set(x, t[1], z);
          p.vel.set(0, 0, 0);
          const eye = { x: p.pos.x, y: p.eyeY, z: p.pos.z };
          const dir = { x: t[0] - eye.x, y: (t[1] + 1.2) - eye.y, z: t[2] - eye.z };
          const len = Math.hypot(dir.x, dir.y, dir.z);
          const blocked = m.world.raycast(eye.x, eye.y, eye.z, dir.x / len, dir.y / len, dir.z / len,
            len - 0.2, (c) => c.blockSight && c.tag !== 'enemy');
          if (blocked) continue;
          p.yaw = Math.atan2(-(t[0] - p.pos.x), -(t[2] - p.pos.z));
          p.pitch = Math.atan2((t[1] + 1.05) - p.eyeY, Math.hypot(t[0] - p.pos.x, t[2] - p.pos.z));
          return { at: [+p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)], dist: +len.toFixed(2) };
        }
      }
      return null;
    }, [at, dist]),

    log: (...a) => console.log(`  [${category}]`, ...a),
  };
  return h;
}

// ---------------------------------------------------------------------------
const CATEGORIES = {
  /** (f) The title screen, exactly as the game opens. */
  async title(h) {
    await h.adv(2400); // let the cinematic camera drift off its first frame
    await h.shot('title-screen', 'Title screen: cinematic plaza camera, snowfall, logotype and menu');
  },

  /** (a) Every room in the building, from its checkpoint, framed as the graybox set was. */
  async rooms(h) {
    await h.qa('quickStart', 'operator');
    await h.qa('freezeAI', true);
    await h.qa('god', true);
    for (const [cp, desc] of ROOMS) {
      await h.qa('teleport', cp);
      await h.adv(200);
      await h.shot(cp, desc);
    }
  },

  /** (b) All eight weapons in first person, hip and sights. */
  async weapons(h) {
    await h.qa('quickStart', 'operator');
    await h.qa('freezeAI', true);
    await h.qa('god', true);
    await h.qa('teleport', 'lobby');
    await h.adv(400);
    for (const [id, name] of WEAPONS) {
      await h.qa('giveWeapon', id);
      await h.adv(900); // draw
      await h.shot(`${id}-hip`, `${name}: hip-fired viewmodel`);
      await h.qa('mouse', 2, true);
      await h.adv(700);
      const aiming = await h.probe(() => window.__game.mission.player.arsenal.isAiming);
      await h.shot(`${id}-ads`, aiming
        ? `${name}: aiming down the sights`
        : `${name}: right mouse held — this class has no sighted stance, so the pose is unchanged`);
      await h.qa('mouse', 2, false);
      await h.adv(400);
    }
  },

  /**
   * (c) The three hostile variants and both hostages, at three metres. This is a character sheet
   * rather than a gameplay frame, so the HUD and the first-person arms are taken out of the way and
   * the camera orbits to exactly 3 m — the silhouettes are the point, and they have to be
   * comparable with each other.
   */
  async chars(h) {
    await h.qa('quickStart', 'operator');
    await h.qa('god', true);
    await h.qa('teleport', 'lobby');
    await h.adv(600);
    await h.qa('freezeAI', true);

    /**
     * A bearing to put the camera on, `radius` metres around the subject. A fixed angle is no good:
     * it would stand the camera out in the snow for the hostage held against the east wall, or in a
     * bookshelf for the one in the corner office. So every bearing on the ring is scored and the
     * best is taken.
     *
     * `prefer` is a world point the camera should sit towards, all else equal — for a hostage, a
     * point in front of them, since a hostage cannot be turned to face the camera the way a spawned
     * hostile can.
     */
    const clearAngle = (at, radius, prefer) => h.probe(([t, r, pref]) => {
      const m = window.__game.mission;
      const base = pref ? Math.atan2(pref[2] - t[2], pref[0] - t[0]) : 0;
      let best = null;
      for (let i = 0; i < 36; i++) {
        const a = base + (i / 36) * Math.PI * 2;
        const cx = t[0] + Math.cos(a) * r, cy = t[1] + 1.2, cz = t[2] + Math.sin(a) * r;
        if (m.nav.nearestNode(cx, t[1], cz, 0.5) < 0) continue; // walkable floor, i.e. in the room
        // In free air, too: a lens inside a crate has an unobstructed ray to the subject (the ray
        // starts inside the box) and sees nothing but the inside of it.
        const near = m.world.query(
          { x: cx - 0.3, y: cy - 0.4, z: cz - 0.3 },
          { x: cx + 0.3, y: cy + 0.4, z: cz + 0.3 }, []);
        if (near.some((c) => c.tag !== 'ground' && (c.blockSight || c.blockMove))) continue;
        const d = { x: t[0] - cx, y: (t[1] + 1.0) - cy, z: t[2] - cz };
        const len = Math.hypot(d.x, d.y, d.z);
        if (m.world.raycast(cx, cy, cz, d.x / len, d.y / len, d.z / len, len - 0.3,
          (c) => c.blockSight && c.tag !== 'enemy')) continue;
        // Standing in open floor rather than merely on floor. Dressing props are the reason: a
        // bookshelf or a server rack carries no collider, so a camera inside one passes every test
        // above and still renders the back of a shelf. What such props have in common is that they
        // are pushed against a wall, and the navmesh does know where the walls are — so openness is
        // how many of eight probes at 0.9 m still land on walkable floor.
        let open = 0;
        for (let k = 0; k < 8; k++) {
          const b = (k / 8) * Math.PI * 2;
          if (m.nav.nearestNode(cx + Math.cos(b) * 0.9, t[1], cz + Math.sin(b) * 0.9, 0.6) >= 0) open++;
        }
        const off = Math.min(i, 36 - i); // deviation from the preferred bearing, in ring steps
        const score = open * 100 - off;
        if (!best || score > best.score) best = { score, deg: Math.round((a * 180) / Math.PI), open };
      }
      return best ? best.deg : Math.round((base * 180) / Math.PI);
    }, [at, radius, prefer ?? null]);

    const portrait = async (at, name, desc, prefer) => {
      const angle = await clearAngle(at, 3, prefer);
      await h.qa('cameraOrbit', at[0], at[1] + 1.0, at[2], 3, 0.2, angle, 55);
      await h.adv(120);
      // The HUD and the first-person arms are cleared here rather than once up front, because
      // Mission.applyPlayerCamera puts the arms back on any frame drawn without a camera override.
      await h.probe(() => {
        document.getElementById('hud').classList.remove('visible');
        window.__game.mission.viewModel.root.visible = false;
      });
      await h.shot(name, desc);
      return angle;
    };

    for (const [type, desc] of [
      ['scout', 'Scout: light kit, Boreal K5, the fastest of the three'],
      ['trooper', 'Trooper: standard kit, Halcyon HC-4, the backbone of the roster'],
      ['heavy', 'Heavy: armoured kit, Vanta S-12, slow and close-range'],
    ]) {
      const placed = await h.probe((t) => {
        const m = window.__game.mission, p = m.player;
        for (const e of m.enemies) e.rig.group.visible = false; // the roster stays out of frame
        const f = p.forwardVec();
        const at = [p.pos.x + f.x * 4, p.pos.y, p.pos.z + f.z * 4];
        const id = window.__qa.spawnEnemy(t, at);
        const e = m.enemies.find((x) => x.id === id);
        e.rig.group.visible = true;
        e.frozen = true;
        return { id, at: [+e.pos.x.toFixed(2), +e.pos.y.toFixed(2), +e.pos.z.toFixed(2)] };
      }, type);
      await h.adv(300);
      const angle = await clearAngle(placed.at, 3);
      // Turn the subject towards wherever the camera ended up, with a little offset for depth.
      await h.probe(([id, a]) => {
        const e = window.__game.mission.enemies.find((x) => x.id === id);
        const rad = (a * Math.PI) / 180;
        e.yaw = Math.atan2(-Math.cos(rad), -Math.sin(rad)) + 0.3;
        e.guardYaw = e.yaw;
      }, [placed.id, angle]);
      await h.adv(200);
      await portrait(placed.at, `hostile-${type}`, `${desc} — orbit camera at 3 m`);
    }

    // Hostages, captive in the rooms they are held in.
    const hostages = await h.probe(() => window.__game.mission.hostages.map((x) => ({
      id: x.id, name: x.name, pos: [+x.pos.x.toFixed(2), +x.pos.y.toFixed(2), +x.pos.z.toFixed(2)], state: x.state,
    })));
    // Hostiles are turned to face the camera; hostages cannot be, since where they kneel and which
    // way they face is the staging of the scene. So the ring is anchored in front of them instead
    // and searched outwards from there — both are held in a corner facing a wall, so what comes out
    // is a three-quarter view rather than the back of a head.
    for (const hostage of hostages) {
      const front = await h.probe((id) => {
        const hs = window.__game.mission.hostages.find((x) => x.id === id);
        return [hs.pos.x - Math.sin(hs.yaw) * 3, hs.pos.y, hs.pos.z - Math.cos(hs.yaw) * 3];
      }, hostage.id);
      await h.qa('teleport', hostage.pos);
      await h.adv(200);
      await portrait(hostage.pos, `hostage-${hostage.id.replace('hostage-', '')}`,
        `Hostage ${hostage.name}, ${hostage.state} — orbit camera at 3 m`, front);
    }

    await h.qa('cameraOff');
    await h.probe(() => {
      document.getElementById('hud').classList.add('visible');
      window.__game.mission.viewModel.root.visible = true;
    });
  },

  /** (d) Every UI screen, including the ones a player only sees for a moment. */
  async ui(h) {
    await h.click('start');
    await h.shot('screen-difficulty', 'Difficulty select: three tiers with insignia and blurbs');
    await h.page.click('[data-action="difficulty-operator"]');
    await h.shot('screen-briefing', 'Mission briefing: intel, objectives and the building diagram');
    await h.click('to-loadout');
    await h.shot('screen-loadout', 'Loadout: primary weapon cards, sidearm and equipment');
    await h.page.keyboard.press('Escape');
    await h.page.keyboard.press('Escape');
    await h.page.keyboard.press('Escape');
    await h.click('settings');
    await h.shot('screen-settings', 'Settings: grouped display, audio and control sections');
    await h.click('back');
    // The loading screen is held for 50 ms in automation, so it is shown directly rather than
    // raced for.
    await h.qa('setState', 'loading');
    await h.shot('screen-loading', 'Loading screen: rotating tactical tip and progress treatment');
    await h.qa('setState', 'title');

    await h.qa('quickStart', 'operator');
    await h.qa('freezeAI', true);
    await h.qa('god', true);
    await h.qa('teleport', 'lobby');
    await h.adv(900);
    await h.shot('screen-hud', 'In-mission HUD: objectives, hostage chips, vitals, ammo, tac-map, clock');

    await h.qa('giveWeapon', 'meridian-lr8');
    await h.adv(900);
    await h.qa('mouse', 2, true);
    await h.adv(900);
    await h.shot('scope-overlay', 'LR-8 scope overlay: reticle, blackout ring and crosshair suppressed');
    await h.qa('mouse', 2, false);
    await h.adv(400);

    await h.page.keyboard.press('KeyP');
    await h.shot('screen-paused', 'Pause menu over the frozen mission');
    // The restart confirmation only arms when the game is not in automation mode; the flag is
    // cleared for this one shot and put straight back.
    await h.probe(() => { window.__game.testMode = false; });
    await h.click('restart');
    await h.shot('restart-confirm', 'Restart confirmation armed inline on the pause menu');
    await h.click('restart-cancel');
    await h.probe(() => { window.__game.testMode = true; });
    await h.click('resume');

    // Extraction chip: both hostages delivered, player holding the zone.
    await h.qa('setObjective', 'escorted');
    for (let i = 0; i < 20; i++) {
      await h.adv(400);
      const s = await h.state();
      if (s.extraction.countdown != null) break;
    }
    await h.shot('extraction-chip', 'Extraction hold: centred countdown chip and the live exfil objective row');

    await h.qa('setObjective', 'victory');
    await h.adv(200);
    await h.shot('screen-victory', 'Victory debrief: outcome, time and shooting statistics');
    await h.qa('resetMission');
    await h.adv(400);
    await h.qa('setObjective', 'defeat');
    await h.adv(200);
    await h.shot('screen-defeat', 'Defeat debrief with the cause of failure');
  },

  /** (e) Cause and effect: the moments that prove the systems are doing something. */
  async moments(h) {
    await h.qa('quickStart', 'operator');
    await h.qa('freezeAI', true);
    await h.qa('god', true);
    await h.qa('teleport', 'lobby');
    await h.adv(900);

    // Muzzle flash. The sprite lives 55 ms — under four fixed steps — and the trigger is read on the
    // step after the button goes down, so the frame is found by stepping one tick at a time until the
    // round count drops rather than by guessing an interval. The third round of the burst is the one
    // caught, so the pose carries the accumulated recoil of a burst rather than a first shot.
    const burst = await h.probe(() => {
      const a = window.__game.mission.player.arsenal;
      window.__qa.mouse(0, true);
      let mag = a.current.mag, fired = 0;
      for (let i = 0; i < 90 && fired < 3; i++) {
        window.advanceTime(16);
        if (a.current.mag < mag) { fired++; mag = a.current.mag; }
      }
      return { fired, mag };
    });
    await h.shot('muzzle-flash', `Muzzle flash on round ${burst.fired} of a burst: flash sprite, `
      + 'hot core, dynamic muzzle light on the ceiling and walls');
    await h.qa('mouse', 0, false);
    await h.adv(200);

    // Glass: a pane with a clear line of fire, cracked by the first round and broken by the second.
    const pane = await h.probe(() => {
      const m = window.__game.mission, p = m.player;
      for (const g of m.map.glass) {
        for (const dir of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
          const px = g.center.x + dir[0] * 2.4, pz = g.center.z + dir[1] * 2.4;
          const floorY = Math.abs(g.center.y - 1.5) < 2.5 ? 0 : 3.6;
          if (m.nav.nearestNode(px, floorY, pz) < 0) continue;
          p.pos.set(px, floorY, pz);
          p.vel.set(0, 0, 0);
          const eye = { x: p.pos.x, y: p.eyeY, z: p.pos.z };
          const d = { x: g.center.x - eye.x, y: g.center.y - eye.y, z: g.center.z - eye.z };
          const len = Math.hypot(d.x, d.y, d.z);
          const hit = m.world.raycast(eye.x, eye.y, eye.z, d.x / len, d.y / len, d.z / len, len + 0.5,
            (c) => c.blockShot);
          if (hit && hit.collider === g.collider) return { id: g.id, aim: [g.center.x, g.center.y, g.center.z] };
        }
      }
      return null;
    });
    if (pane) {
      await h.adv(300);
      await h.lookAt(pane.aim);
      await h.qa('mouse', 0, true); await h.adv(30); await h.qa('mouse', 0, false);
      await h.adv(250);
      await h.shot('glass-cracked', 'First round cracks a pane: spidered decal, pane still stops bullets');
      await h.lookAt(pane.aim);
      await h.qa('mouse', 0, true); await h.adv(30); await h.qa('mouse', 0, false);
      await h.adv(250);
      await h.shot('glass-broken', 'Second round breaks it: shards falling, the opening now shoots through');
    } else {
      h.log('no pane with a clear line of fire found — glass shots skipped');
    }

    // Smoke: thrown a few metres ahead so the cloud sits in the open.
    await h.qa('teleport', 'lobby');
    await h.adv(400);
    await h.qa('giveWeapon', 'sg-2');
    await h.adv(700);
    const from = await h.probe(() => {
      const p = window.__game.mission.player;
      return [p.pos.x, p.pos.y, p.pos.z];
    });
    await h.lookAt([from[0], from[1] + 0.3, from[2] - 6]);
    await h.qa('mouse', 0, true); await h.adv(40); await h.qa('mouse', 0, false);
    await h.adv(3000);
    await h.shot('smoke-cloud', 'SG-2 Veil: a settled smoke volume that AI perception cannot see through');

    // Flash: thrown at the player's own feet while looking at it, which is what blinds them.
    await h.qa('resetMission');
    await h.qa('teleport', 'lobby');
    await h.qa('god', true);
    await h.adv(600);
    await h.qa('giveWeapon', 'fb-3');
    await h.adv(700);
    const at = await h.probe(() => {
      const p = window.__game.mission.player;
      return [p.pos.x, p.pos.y, p.pos.z];
    });
    await h.lookAt([at[0], at[1] + 0.2, at[2] - 3]);
    await h.qa('mouse', 0, true); await h.adv(40); await h.qa('mouse', 0, false);
    let flash = 0;
    for (let i = 0; i < 40; i++) {
      await h.adv(100);
      flash = await h.probe(() => window.__game.mission.player.flash);
      if (flash > 0.55) break;
    }
    await h.shot('flash-whiteout', `FB-3 Dazzler detonating in the player's face (blindness ${flash.toFixed(2)})`);
    await h.adv(4000);

    // Door caught mid-swing.
    await h.qa('resetMission');
    await h.qa('god', true);
    const door = await h.probe(() => {
      const m = window.__game.mission, p = m.player;
      window.__qa.teleport('sec');
      let best = null;
      for (const d of m.map.doors) {
        if (d.kind === 'shutter' || d.state === 'locked') continue;
        const dist = d.center.distanceTo(p.pos);
        if (!best || dist < best.dist) best = { id: d.id, dist, c: [d.center.x, d.center.y, d.center.z] };
      }
      if (!best) return null;
      const dx = p.pos.x - best.c[0], dz = p.pos.z - best.c[2];
      const len = Math.hypot(dx, dz) || 1;
      p.pos.x = best.c[0] + (dx / len) * 1.6;
      p.pos.z = best.c[2] + (dz / len) * 1.6;
      p.pos.y = Math.abs(best.c[1]) < 1.8 ? 0 : p.pos.y;
      p.yaw = Math.atan2(-(best.c[0] - p.pos.x), -(best.c[2] - p.pos.z));
      p.pitch = 0;
      p.vel.set(0, 0, 0);
      return { id: best.id };
    });
    await h.adv(300);
    await h.qa('press', 'KeyE');
    await h.adv(60);
    await h.qa('release', 'KeyE');
    await h.adv(420); // caught partway through the 1.2 s swing
    const swing = door ? await h.probe((id) => window.__game.mission.map.doorById(id).textState().state, door.id) : 'unknown';
    await h.shot('door-mid-swing', `Door caught mid-swing (state: ${swing}) after an E interaction`);

    // Hostage following: secured, then trailing the player down the corridor.
    await h.qa('resetMission');
    await h.qa('god', true);
    await h.adv(300);
    const hostage = await h.probe(() => {
      const m = window.__game.mission, p = m.player;
      const hg = m.hostages[0];
      p.pos.set(hg.pos.x, hg.pos.y, hg.pos.z + 1.5);
      p.yaw = Math.atan2(-(hg.pos.x - p.pos.x), -(hg.pos.z - p.pos.z));
      p.pitch = 0;
      p.vel.set(0, 0, 0);
      return { id: hg.id, name: hg.name };
    });
    await h.adv(700);
    await h.qa('press', 'KeyE');
    await h.adv(60);
    await h.qa('release', 'KeyE');
    await h.adv(600);
    await h.qa('teleport', 'corr-e');
    await h.adv(6000); // let them catch up
    const follow = await h.probe((id) => {
      const m = window.__game.mission;
      const hg = m.hostages.find((x) => x.id === id);
      const p = m.player;
      p.yaw = Math.atan2(-(hg.pos.x - p.pos.x), -(hg.pos.z - p.pos.z));
      p.pitch = Math.atan2((hg.pos.y + 1.1) - p.eyeY, Math.hypot(hg.pos.x - p.pos.x, hg.pos.z - p.pos.z));
      return { state: hg.state, dist: +hg.pos.distanceTo(p.pos).toFixed(2) };
    }, hostage.id);
    await h.shot('hostage-following', `${hostage.name} secured and following, ${follow.dist} m behind (${follow.state})`);

    // Extraction zone with the countdown running.
    await h.qa('setObjective', 'escorted');
    let countdown = null;
    for (let i = 0; i < 24; i++) {
      await h.adv(400);
      const s = await h.state();
      if (s.extraction.countdown != null) { countdown = s.extraction.countdown; break; }
    }
    await h.probe(() => {
      const m = window.__game.mission, p = m.player;
      p.yaw = Math.atan2(-(5.2 - p.pos.x), -(6.4 - p.pos.z));
      p.pitch = 0;
    });
    await h.shot('extraction-zone', `Extraction zone held in the garage, countdown at ${countdown ?? '—'} s`);

    // Dropped weapon prompt: a trooper is killed and its weapon offered on the floor.
    await h.qa('resetMission');
    await h.qa('freezeAI', true);
    await h.qa('god', true);
    await h.qa('selectPrimary', 'meridian-lr8');
    await h.qa('teleport', 'lobby');
    await h.adv(900);
    const prompt = await h.probe(() => {
      const m = window.__game.mission, p = m.player;
      const f = p.forwardVec();
      const id = window.__qa.spawnEnemy('trooper', [p.pos.x + f.x * 4, p.pos.y, p.pos.z + f.z * 4]);
      const e = m.enemies.find((x) => x.id === id);
      e.mag = 18;
      e.damage(9999, null, 'evidence');
      return { id };
    });
    await h.adv(1600); // the corpse settles and the weapon finishes its toss
    const walked = await h.probe((eid) => {
      const m = window.__game.mission, p = m.player;
      const e = m.enemies.find((x) => x.id === eid);
      const dw = e.rig.droppedWeapon;
      dw.obj.updateWorldMatrix(true, false);
      const el = dw.obj.matrixWorld.elements;
      const w = [el[12], el[13], el[14]];
      window.__qa.press('KeyW');
      for (let i = 0; i < 24; i++) {
        p.yaw = Math.atan2(-(w[0] - p.pos.x), -(w[2] - p.pos.z));
        p.pitch = -0.42; // look down at the floor where it landed
        window.advanceTime(150);
        if (m.interactTarget && m.interactTarget.kind === 'pickup') break;
      }
      window.__qa.releaseAll();
      window.advanceTime(60);
      return m.interactTarget ? { kind: m.interactTarget.kind, label: m.interactTarget.label } : null;
    }, prompt.id);
    await h.shot('dropped-weapon-prompt',
      `Weapon dropped by a fallen trooper, offered as "${walked ? walked.label : 'no prompt'}"`);
  },
};

// ---------------------------------------------------------------------------
function writeReadme() {
  const rows = Object.values(index).sort((a, b) => (a.category + a.name).localeCompare(b.category + b.name));
  const byCat = {};
  for (const r of rows) (byCat[r.category] ||= []).push(r);
  const total = rows.reduce((a, r) => a + r.bytes, 0);
  const mb = (n) => (n / 1024 / 1024).toFixed(2);
  const titles = {
    title: 'Title screen',
    rooms: 'Rooms (a): every checkpoint in the building',
    weapons: 'Weapons (b): all eight, first person, hip and sights',
    chars: 'Characters (c): hostile variants and hostages at three metres',
    ui: 'UI screens (d): every screen a player can reach',
    moments: 'Cause and effect (e): the systems caught in the act',
  };
  const order = ['title', 'rooms', 'weapons', 'chars', 'ui', 'moments'];

  let md = `# Evidence package — Northstar Rescue

Captured by \`tools/evidence.mjs\` (Opus 4, WP-016). ${rows.length} frames, ${mb(total)} MB total,
1280x720 JPEG at quality ${QUALITY}. Regenerate with:

\`\`\`bash
npx vite --port 5187 --strictPort            # or point SERVER= at a running dev server
node tools/evidence.mjs                      # all categories; or: node tools/evidence.mjs rooms ui
\`\`\`

Every frame is taken through the deterministic QA interface (\`window.__qa\`, \`advanceTime\`) on a
fresh page, so the same command reproduces the same set. Screenshots are JPEG rather than PNG on
purpose: the equivalent PNG set is about 340 MB, which does not belong in a repository.

`;
  for (const cat of order) {
    if (!byCat[cat]) continue;
    const sz = byCat[cat].reduce((a, r) => a + r.bytes, 0);
    md += `## ${titles[cat]}\n\n_${byCat[cat].length} frames, ${mb(sz)} MB_\n\n`;
    md += '| File | What it shows |\n|---|---|\n';
    for (const r of byCat[cat]) md += `| \`${r.category}--${r.name}.jpg\` | ${r.desc} |\n`;
    md += '\n';
  }

  md += `## Before and after — graybox against the finished art

The "before" frames come from \`artifacts/before-wp011/\`, captured from the same checkpoints with
the same camera before the art waves landed. The set that used to sit at
\`artifacts/shots/graybox-rooms--*.png\` has since been overwritten by later runs of the same
scenario name and now shows finished art, so it is no longer a valid "before"; \`before-wp011/\` is
the earliest surviving capture of these cameras. \`artifacts/\` is git-ignored, so both sides of
each pair are reproducible rather than committed:

\`\`\`bash
node tools/capture.js graybox-rooms          # re-shoots the same 40 cameras at the current art
\`\`\`

| Room | Before (graybox) | After (final) | What changed |
|---|---|---|---|
`;
  for (const [cp, note] of PAIRS) {
    md += `| ${cp} | \`artifacts/before-wp011/graybox-rooms--${cp}.png\` | \`docs/evidence/rooms--${cp}.jpg\` | ${note} |\n`;
  }
  md += `
Both sides are 16:9 at the same field of view and the same checkpoint, so the pairs line up frame
for frame; the before set is 1920x1080 PNG and the after set is 1280x720 JPEG.

## Two things to know when reading these frames

**Nine of the room frames are shot from on top of the furniture.** \`__qa.teleport()\` drops the
player onto whatever surface is under the checkpoint, and nine checkpoints sit over a desk, a
cabinet or a stair tread rather than clear floor — \`cubes\`, \`cubes-west\`, \`conference\`, \`asst\`,
\`store\`, \`janitor\`, \`stair-b\`, \`stair-a1\` and \`stair-b1\`. Those frames look down over the
partitions from roughly 0.7 m too high. It is a checkpoint-placement defect rather than a capture
bug (filed as NS-10 in \`docs/reports/wp-016.md\`), and it is worth knowing before treating any of
those nine as a representative player view.

**Exposure is audited, not eyeballed.** \`node tools/evidence.mjs --audit\` decodes every frame in
this directory and reports mean luminance and the share of pixels clipped to white or crushed to
black, writing \`artifacts/evidence-exposure.json\`. It is how NS-11 (the security office blowing
out) was found and how the dark menu screens were cleared as intentional rather than broken.
`;
  fs.writeFileSync(path.join(OUT, 'README.md'), md);
  return { frames: rows.length, bytes: total };
}

/**
 * Exposure audit over frames already on disk — no game, no rendering. Every captured JPEG is decoded
 * in the browser (the only image decoder available without adding a dependency) and reduced to three
 * numbers: mean luminance, and the share of pixels clipped to white or crushed to black. It answers
 * two checklist items objectively instead of by eye: a room nobody can read because it is too dark,
 * and a room nobody can read because the exposure has blown the detail out of it.
 */
async function auditExposure(browser) {
  const files = fs.readdirSync(OUT).filter((f) => f.endsWith('.jpg')).sort();
  const page = await browser.newPage({ viewport: { width: 64, height: 64 } });
  await page.goto('about:blank');
  const rows = [];
  for (const file of files) {
    const b64 = fs.readFileSync(path.join(OUT, file)).toString('base64');
    rows.push({ file, ...await page.evaluate(async (data) => {
      const img = new Image();
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = 'data:image/jpeg;base64,' + data; });
      const c = document.createElement('canvas');
      c.width = img.width; c.height = img.height;
      const ctx = c.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0);
      const d = ctx.getImageData(0, 0, c.width, c.height).data;
      const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
      let sum = 0, blown = 0, crushed = 0, n = 0;
      // Every fourth pixel on each axis: 57,600 samples per frame is plenty for a share, and the
      // full 921,600 would make the sweep pointlessly slow.
      for (let y = 0; y < c.height; y += 4) {
        for (let x = 0; x < c.width; x += 4) {
          const i = (y * c.width + x) * 4;
          const l = 0.2126 * lin(d[i]) + 0.7152 * lin(d[i + 1]) + 0.0722 * lin(d[i + 2]);
          sum += l; n++;
          if (d[i] > 250 && d[i + 1] > 250 && d[i + 2] > 250) blown++;
          else if (l < 0.005) crushed++;
        }
      }
      return { meanLum: +(sum / n).toFixed(4), blownPct: +((blown / n) * 100).toFixed(1), crushedPct: +((crushed / n) * 100).toFixed(1) };
    }, b64) });
  }
  await page.close();
  const fmt = (r) => `${r.file.padEnd(42)} mean ${String(r.meanLum).padEnd(7)} blown ${String(r.blownPct).padStart(5)}%  crushed ${String(r.crushedPct).padStart(5)}%`;
  console.log(`exposure audit over ${rows.length} frames\n`);
  console.log('most blown out:');
  for (const r of rows.slice().sort((a, b) => b.blownPct - a.blownPct).slice(0, 10)) console.log('  ' + fmt(r));
  console.log('\ndarkest by mean luminance:');
  for (const r of rows.slice().sort((a, b) => a.meanLum - b.meanLum).slice(0, 10)) console.log('  ' + fmt(r));
  const blown = rows.filter((r) => r.blownPct > 10).length;
  const dark = rows.filter((r) => r.meanLum < 0.02).length;
  console.log(`\n${blown} frames over 10 % clipped white, ${dark} frames under 0.02 mean luminance`);
  fs.writeFileSync(path.join('artifacts', 'evidence-exposure.json'), JSON.stringify(rows, null, 1));
}

const names = argv.filter((a) => !a.startsWith('--') && !/^\d+$/.test(a));
const wanted = names.length ? names : Object.keys(CATEGORIES);

const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-dev-shm-usage'],
});

if (argv.includes('--audit')) {
  await auditExposure(browser);
  await browser.close();
  writeReadme();
  process.exit(0);
}

let failures = 0;
for (const category of wanted) {
  const fn = CATEGORIES[category];
  if (!fn) { console.error('unknown category:', category); failures++; continue; }
  const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: 1 });
  page.setDefaultTimeout(240_000);
  await page.route('**/@vite/client', (r) => r.fulfill({ contentType: 'application/javascript', body: VITE_CLIENT_STUB }));
  await page.addInitScript(([key, value]) => localStorage.setItem(key, value), [SETTINGS_KEY, JSON.stringify(SETTINGS)]);
  const report = { shots: [], errors: [] };
  page.on('pageerror', (e) => report.errors.push('pageerror: ' + e.message));
  console.log(`CATEGORY ${category}`);
  const t0 = Date.now();
  try {
    await page.goto(`${SERVER}/?qa=1&test=1`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__game && window.__game.state === 'title', null, { timeout: 240_000 });
    // Manual mode, loop stopped: every frame in this package is drawn on request.
    await page.evaluate(() => { window.advanceTime(1); window.__game.engine.running = false; });
    await fn(makeHelpers(page, category, report));
    report.errors.push(...(await page.evaluate(() => window.__consoleErrors)));
    const bytes = report.shots.reduce((a, f) => a + fs.statSync(path.join(OUT, f)).size, 0);
    console.log(`  ${report.shots.length} shots, ${(bytes / 1024 / 1024).toFixed(2)} MB, `
      + `${((Date.now() - t0) / 1000).toFixed(0)} s`);
    if (report.errors.length) {
      failures++;
      console.log(`  ERRORS(${report.errors.length}):`, JSON.stringify(report.errors.slice(0, 6), null, 1));
    }
  } catch (e) {
    failures++;
    console.error(`  FAILED: ${e.message.split('\n')[0]}`);
  }
  await page.close();
}
await browser.close();

fs.writeFileSync(INDEX, JSON.stringify(index, null, 1));
const totals = writeReadme();
console.log(`index: ${totals.frames} frames, ${(totals.bytes / 1024 / 1024).toFixed(2)} MB -> ${OUT}/README.md`);
process.exit(failures ? 1 : 0);
