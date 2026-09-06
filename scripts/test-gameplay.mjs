// Headless gameplay verification (doors, chests, items, eating, animals, wheat, cooking, save/reload):
//   node scripts/test-gameplay.mjs [--url http://localhost:5201] [--shots /tmp/gameplay-shots]
// Drives the real interaction code (raycast + mouse flags, HUD clicks, key events) through the CDP helper.
import { mkdirSync } from 'node:fs';
import { launchPage } from './cdp.mjs';

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : def; };
const base = opt('--url', 'http://localhost:5201');
const shots = opt('--shots', '/tmp/gameplay-shots');
mkdirSync(shots, { recursive: true });
const profile = `/tmp/chrome-gameplay-${process.pid}`;

let passed = 0, failed = 0;
const log = (...a) => console.log(...a);
function check(name, cond, detail = '') {
  if (cond) { passed++; log(`PASS ${name}${detail ? '  (' + detail + ')' : ''}`); }
  else { failed++; log(`FAIL ${name}${detail ? '  (' + detail + ')' : ''}`); }
}

// Test helpers installed into the page (all interaction goes through the game's own input flags / DOM events)
const HELPERS = `
window.__t = {
  frame: () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))),
  frames: async (n) => { for (let i = 0; i < n; i++) await window.__t.frame(); },
  wait: (ms) => new Promise((r) => setTimeout(r, ms)),
  // world scan: positions of blocks with any of the ids, nearest to the player first
  find(ids, limit = 20) {
    const w = game.world, p = game.player.pos, out = [];
    for (const c of w.chunks.values()) {
      if (!c.generated) continue;
      const b = c.blocks;
      for (let lx = 0; lx < 16; lx++) for (let lz = 0; lz < 16; lz++) {
        const base = (lx * 16 + lz) * 256;
        for (let y = 0; y < 256; y++) { const id = b[base + y]; if (ids.includes(id)) out.push({ x: c.cx * 16 + lx, y, z: c.cz * 16 + lz, id }); }
      }
    }
    out.sort((a, b) => (a.x - p.x) ** 2 + (a.z - p.z) ** 2 - ((b.x - p.x) ** 2 + (b.z - p.z) ** 2));
    return out.slice(0, limit);
  },
  aimAt(x, y, z) {
    const p = game.player, eye = p.eyePos(1, new (game.camera.position.constructor)());
    const dx = x - eye.x, dy = y - eye.y, dz = z - eye.z;
    p.yaw = Math.atan2(-dx, -dz); p.pitch = Math.atan2(dy, Math.hypot(dx, dz));
  },
  play() { game.input.locked = true; if (game.hud.screen) game.hud.screen = null; },
  async click(button) { window.__t.play(); await window.__t.frame(); game.input.mouseClicked[button] = true; game.input.mouseDown[button] = true; await window.__t.frame(); game.input.mouseDown[button] = false; await window.__t.frame(); },
  async hold(button, frames) { window.__t.play(); game.input.mouseDown[button] = true; game.input.mouseClicked[button] = true; await window.__t.frames(frames); game.input.mouseDown[button] = false; await window.__t.frame(); },
  // hold the attack button until the aimed block at (x,y,z) is gone (released right away, so nothing behind it breaks)
  async breakAt(x, y, z, maxFrames = 40) {
    window.__t.play(); game.input.mouseDown[0] = true; game.input.mouseClicked[0] = true;
    for (let i = 0; i < maxFrames && game.world.getBlock(x, y, z) !== 0; i++) await window.__t.frame();
    game.input.mouseDown[0] = false; await window.__t.frame();
  },
  key(code) { document.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true })); document.dispatchEvent(new KeyboardEvent('keyup', { code, bubbles: true })); },
  async hudClick(x, y, button = 0, shift = false) {
    const h = game.hud; h.mouse.x = x; h.mouse.y = y;
    if (shift) game.input.keys.add('ShiftLeft');
    if (button === 0) h.mouse.clicked = true; else h.mouse.rclicked = true;
    await window.__t.frame();
    game.input.keys.delete('ShiftLeft');
  },
  // screen-space centres of the chest UI slots (mirrors hud.drawChest layout)
  chestLayout() {
    const h = game.hud, s = h.scale, W = h.canvas.width, H = h.canvas.height;
    const pw = 176 * s, ph = 168 * s, px = Math.floor(W / 2 - pw / 2), py = Math.floor(H / 2 - ph / 2), gx = px + 7 * s;
    const c = (x, y) => [x + 9 * s, y + 9 * s];
    return {
      chest: (i) => c(gx + (i % 9) * 18 * s, py + 17 * s + Math.floor(i / 9) * 18 * s),
      main: (i) => c(gx + ((i - 9) % 9) * 18 * s, py + 83 * s + Math.floor((i - 9) / 9) * 18 * s),
      hotbar: (i) => c(gx + i * 18 * s, py + 141 * s),
    };
  },
  ticks(n) { for (let i = 0; i < n; i++) game.tick(false); },
  // the game's own module instance (Vite appends ?t= HMR timestamps after edits, so a plain import would be a copy)
  mod(path) { const url = performance.getEntriesByType('resource').map((e) => e.name).find((u) => u.includes(path + '?') || u.endsWith(path)); return import(url || path); },
  inv() { return game.inventory.slots.map((s) => (s ? [s.id, s.count] : null)); },
  countOf(id) { return game.inventory.count(id); },
  snap() { const p = game.player; return { x: +p.pos.x.toFixed(2), y: +p.pos.y.toFixed(2), z: +p.pos.z.toFixed(2), health: p.health, food: p.food, sat: +p.saturation.toFixed(2) }; },
};
true`;

const I = { APPLE: 1000, BREAD: 1001, WHEAT: 1002, SEEDS: 1003, BEEF_RAW: 1004, BEEF_COOKED: 1005 };
const B = { AIR: 0, OAK_DOOR: 42, CHEST: 60, FURNACE: 58, WHEAT: 65, FARMLAND: 66, SPRUCE_DOOR: 77, OAK_DOOR_TOP: 100, OAK_DOOR_OPEN: 101, SPRUCE_DOOR_TOP: 102, SPRUCE_DOOR_OPEN: 103, WHEAT_0: 104, WHEAT_1: 105 };

const startUrl = `${base}/?x=-8&z=2&yaw=-70&time=0.45&fresh=1&mode=survival`;
log(`launching ${startUrl}`);
let page = await launchPage(startUrl, { profile });
const ev = (js) => page.evaluate(js);
const shot = async (name) => { const p = `${shots}/${name}.png`; await page.screenshot(p); log(`  screenshot ${p}`); };
let saveState = null;

try {
  await page.waitForGame(180000);
  await ev(HELPERS);
  await page.sleep(1500);

  // ------------------------------------------------------------------ 1. doors: toggle + collision + NPC auto-open
  log('\n== Doors ==');
  const door = await ev(`(() => {
    const doors = __t.find([${B.OAK_DOOR}, ${B.SPRUCE_DOOR}], 60);
    const w = game.world, solid = (x, y, z) => game.world.getBlockDef(x, y, z).solid;
    for (const d of doors) {
      if (!w.getBlockDef(d.x, d.y + 1, d.z).doorTop) continue;
      const wallX = solid(d.x + 1, d.y, d.z) && solid(d.x - 1, d.y, d.z);   // wall along x => passage along z
      const wallZ = solid(d.x, d.y, d.z + 1) && solid(d.x, d.y, d.z - 1);
      if (wallX === wallZ) continue;
      const ax = wallX ? 0 : 1, az = wallX ? 1 : 0; // passage axis
      for (const sgn of [1, -1]) {
        const ox = d.x + ax * sgn * 2, oz = d.z + az * sgn * 2;
        const ok = !solid(ox, d.y, oz) && !solid(ox, d.y + 1, oz) && solid(ox, d.y - 1, oz)
          && !solid(d.x - ax * sgn * 2, d.y, d.z - az * sgn * 2) && !solid(d.x - ax * sgn * 2, d.y + 1, d.z - az * sgn * 2);
        if (ok) return { ...d, ax, az, sgn, standX: ox + 0.5, standZ: oz + 0.5 };
      }
    }
    return null;
  })()`);
  check('found a generated two-block door with a clear passage', !!door, JSON.stringify(door));
  if (door) {
    const closedBefore = await ev(`[game.world.getBlock(${door.x}, ${door.y}, ${door.z}), game.world.getBlock(${door.x}, ${door.y + 1}, ${door.z})]`);
    check('generated door starts closed (bottom id + top id)', (closedBefore[0] === B.OAK_DOOR || closedBefore[0] === B.SPRUCE_DOOR) && (closedBefore[1] === B.OAK_DOOR_TOP || closedBefore[1] === B.SPRUCE_DOOR_TOP), closedBefore.join(','));
    // collision: walk into the closed door for 30 ticks
    const walk = async () => ev(`(async () => {
      const p = game.player; p.flying = false; p.teleport(${door.standX}, ${door.y}, ${door.standZ});
      __t.aimAt(${door.x + 0.5}, ${door.y + 1.2}, ${door.z + 0.5}); p.pitch = 0;
      const orig = p.tick.bind(p); let n = 0;
      p.tick = (ctrl) => orig(Object.assign({}, ctrl, n++ < 30 ? { forward: 1 } : {}));
      __t.play();
      for (let i = 0; i < 30; i++) game.tick(true);
      p.tick = orig;
      return { x: +p.pos.x.toFixed(2), z: +p.pos.z.toFixed(2) };
    })()`);
    const along = (pos) => (door.ax ? pos.x : pos.z);
    const doorCentre = door.ax ? door.x + 0.5 : door.z + 0.5;
    const start = door.ax ? door.standX : door.standZ;
    const p1 = await walk();
    const crossedClosed = Math.sign(doorCentre - along(p1)) !== Math.sign(doorCentre - start);
    check('closed door blocks the player (thin panel collision)', !crossedClosed && Math.abs(along(p1) - doorCentre) > 0.3, `stopped at ${along(p1).toFixed(2)} (door ${doorCentre}, start ${start})`);
    // toggle with a right-click through the interaction code
    // door sounds are positional; count only the ones played at this door (NPCs open / close other doors meanwhile)
    await ev(`(() => { window.__doorSounds = { open: 0, close: 0 }; const here = (p) => Math.abs(p.x - ${door.x + 0.5}) < 0.01 && Math.abs(p.z - ${door.z + 0.5}) < 0.01; const a = game.audio, o = a.doorOpen.bind(a), c = a.doorClose.bind(a); a.doorOpen = (p) => { if (here(p)) __doorSounds.open++; o(p); }; a.doorClose = (p) => { if (here(p)) __doorSounds.close++; c(p); }; return true; })()`);
    await ev(`(() => { game.player.teleport(${door.standX}, ${door.y}, ${door.standZ}); __t.aimAt(${door.x + 0.5}, ${door.y + 1.0}, ${door.z + 0.5}); })()`);
    await ev(`__t.click(2)`);
    const open = await ev(`[game.world.getBlock(${door.x}, ${door.y}, ${door.z}), game.world.getBlock(${door.x}, ${door.y + 1}, ${door.z}), __doorSounds.open]`);
    check('right-click opens the door (both halves -> open id, open sound)', (open[0] === B.OAK_DOOR_OPEN || open[0] === B.SPRUCE_DOOR_OPEN) && open[1] === open[0] && open[2] === 1, open.join(','));
    await page.sleep(300);
    await shot('door_open');
    const p2 = await walk();
    const crossedOpen = Math.sign(doorCentre - along(p2)) !== Math.sign(doorCentre - start);
    check('open door lets the player walk through (no collision)', crossedOpen, `reached ${along(p2).toFixed(2)} (door ${doorCentre})`);
    await ev(`(() => { game.player.teleport(${door.standX}, ${door.y}, ${door.standZ}); __t.aimAt(${door.x + 0.5}, ${door.y + 1.0}, ${door.z + 0.5}); })()`);
    await ev(`__t.click(2)`);
    const closed = await ev(`[game.world.getBlock(${door.x}, ${door.y}, ${door.z}), game.world.getBlock(${door.x}, ${door.y + 1}, ${door.z}), __doorSounds.close]`);
    check('right-click again closes it (bottom + top ids restored, close sound)', closed[0] === closedBefore[0] && closed[1] === closedBefore[1] && closed[2] === 1, closed.join(','));
    const saved = await ev(`(() => { const e = game.save.serialize().edits; return e.filter((r) => r[0] === ${door.x} && r[2] === ${door.z}).length; })()`);
    check('door toggles are recorded as saved edits (both halves)', saved === 2, `${saved} edits`);
  }
  // NPC auto doors: simulate a minute of town life without the player
  const npcDoors = await ev(`(async () => {
    const before = game.doors.toggles; let held = 0;
    game.player.teleport(-8, 60, 2); game.player.flying = true;
    for (let i = 0; i < 1200; i++) { game.tick(false); held = Math.max(held, game.doors.held.size); }
    let stillOpen = 0; for (const [k, d] of game.doors.held) stillOpen++;
    const closedDoors = __t.find([${B.OAK_DOOR}, ${B.SPRUCE_DOOR}], 500).length, openDoors = __t.find([${B.OAK_DOOR_OPEN}, ${B.SPRUCE_DOOR_OPEN}], 500).length / 2;
    return { toggles: game.doors.toggles - before, maxHeld: held, stillHeld: stillOpen, closedDoors, openDoors, npcs: game.npcs.list.length, walking: game.npcs.list.filter((n) => n.state === 'walk').length };
  })()`);
  check('NPCs open doors on approach and close them again (60 s of simulated town life)', npcDoors.toggles >= 2 && npcDoors.maxHeld >= 1, JSON.stringify(npcDoors));

  // ------------------------------------------------------------------ 2. chests: open via right-click, UI moves, split, quick move
  log('\n== Chests ==');
  const chest = await ev(`(() => {
    const list = __t.find([${B.CHEST}], 40), solid = (x, y, z) => game.world.getBlockDef(x, y, z).solid;
    for (const c of list) for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const x = c.x + dx, z = c.z + dz;
      if (!solid(x, c.y, z) && !solid(x, c.y + 1, z) && solid(x, c.y - 1, z)) return { ...c, standX: x + 0.5, standZ: z + 0.5 };
    }
    return null;
  })()`);
  check('found a generated chest with a free side', !!chest, JSON.stringify(chest));
  if (chest) {
    await ev(`(() => { const p = game.player; p.flying = false; p.teleport(${chest.standX}, ${chest.y}, ${chest.standZ}); __t.aimAt(${chest.x + 0.5}, ${chest.y + 0.5}, ${chest.z + 0.5}); })()`);
    await ev(`__t.click(2)`);
    const opened = await ev(`JSON.stringify({ screen: game.hud.screen, slots: game.hud.chest && game.hud.chest.entity.slots.length, loot: game.hud.chest && game.hud.chest.entity.slots.filter(Boolean).map((s) => [s.id, s.count]) })`);
    const o = JSON.parse(opened);
    check('right-click on a chest opens the 27-slot chest screen', o.screen === 'chest' && o.slots === 27, opened);
    check('town chest holds deterministic loot on first open', o.loot && o.loot.length > 0, `${o.loot ? o.loot.length : 0} stacks`);
    const L = await ev(`JSON.stringify({ chest0: __t.chestLayout().chest(0), chest1: __t.chestLayout().chest(1), hot0: __t.chestLayout().hotbar(0), main9: __t.chestLayout().main(9) })`);
    const lay = JSON.parse(L);
    // find an empty chest slot and a loot slot
    const idx = await ev(`JSON.stringify({ empty: game.hud.chest.entity.slots.findIndex((s) => !s), loot: game.hud.chest.entity.slots.findIndex((s) => s && s.count >= 2) })`);
    const ix = JSON.parse(idx);
    const emptyPos = await ev(`__t.chestLayout().chest(${ix.empty})`);
    const hot0 = await ev(`JSON.stringify(game.inventory.slots[0])`);
    await ev(`__t.hudClick(${lay.hot0[0]}, ${lay.hot0[1]}, 0)`);                    // pick up hotbar 0
    const carried = await ev(`JSON.stringify(game.hud.cursorItem)`);
    check('left-click picks up a stack from the hotbar onto the cursor', carried === hot0 && carried !== 'null', carried);
    await ev(`__t.hudClick(${emptyPos[0]}, ${emptyPos[1]}, 0)`);                    // drop it into the chest
    const placed = await ev(`JSON.stringify([game.hud.chest.entity.slots[${ix.empty}], game.inventory.slots[0], game.hud.cursorItem])`);
    check('left-click places the carried stack into the chest (drag & drop)', placed === `[${hot0},null,null]`, placed);
    // right-click split on a loot stack
    if (ix.loot >= 0) {
      const lootPos = await ev(`__t.chestLayout().chest(${ix.loot})`);
      const before = JSON.parse(await ev(`JSON.stringify(game.hud.chest.entity.slots[${ix.loot}])`));
      await ev(`__t.hudClick(${lootPos[0]}, ${lootPos[1]}, 2)`);
      const split = JSON.parse(await ev(`JSON.stringify([game.hud.chest.entity.slots[${ix.loot}], game.hud.cursorItem])`));
      check('right-click splits a stack (half to the cursor)', split[1] && split[1].count === Math.ceil(before.count / 2) && ((split[0] && split[0].count === Math.floor(before.count / 2)) || (!split[0] && before.count === 1)), JSON.stringify({ before, after: split }));
      await ev(`__t.hudClick(${lootPos[0]}, ${lootPos[1]}, 0)`);                  // merge it back
      const merged = JSON.parse(await ev(`JSON.stringify([game.hud.chest.entity.slots[${ix.loot}], game.hud.cursorItem])`));
      check('left-click merges the half back onto the stack', merged[0] && merged[0].count === before.count && merged[1] === null, JSON.stringify(merged));
    }
    await shot('chest_ui');
    // shift-click quick move: chest -> player inventory
    await ev(`__t.hudClick(${emptyPos[0]}, ${emptyPos[1]}, 0, true)`);
    const quick = JSON.parse(await ev(`JSON.stringify([game.hud.chest.entity.slots[${ix.empty}], game.inventory.count(${JSON.parse(hot0).id}), game.hud.cursorItem])`));
    check('shift-click quick-moves the stack back into the player inventory', quick[0] === null && quick[1] >= JSON.parse(hot0).count && quick[2] === null, JSON.stringify(quick));
    // put something back for the reload test, then hover a slot for the tooltip and close with E
    await ev(`__t.hudClick(${lay.hot0[0]}, ${lay.hot0[1]}, 0)`);
    const hot0b = await ev(`JSON.stringify(game.hud.cursorItem)`);
    await ev(`__t.hudClick(${emptyPos[0]}, ${emptyPos[1]}, 0)`);
    await ev(`(() => { game.hud.mouse.x = ${emptyPos[0]}; game.hud.mouse.y = ${emptyPos[1]}; })()`);
    await ev(`__t.frame()`);
    const hoverName = await ev(`game.hud.hoveredName(game.inventory)`);
    check('hovering a slot shows the item name tooltip', typeof hoverName === 'string' && hoverName.length > 0, hoverName);
    await shot('chest_ui_tooltip');
    await ev(`__t.key('KeyE')`);
    await ev(`__t.frame()`);
    const closedScreen = await ev(`game.hud.screen`);
    check('E closes the chest screen', closedScreen === null, String(closedScreen));
    const ent = await ev(`JSON.stringify(game.world.getBlockEntity(${chest.x}, ${chest.y}, ${chest.z}).slots[${ix.empty}])`);
    check('chest contents live in world.blockEntities', ent === hot0b, ent);
    saveState = { chest, slot: ix.empty, stack: hot0b };
  }

  // ------------------------------------------------------------------ 3. items + eating
  log('\n== Items & eating ==');
  await ev(`(() => { game.inventory.set(0, ${I.APPLE}, 3); game.inventory.set(1, ${I.BREAD}, 2); game.inventory.set(2, ${I.BEEF_RAW}, 4); game.inventory.selected = 0; game.player.food = 10; game.player.saturation = 0; game.player.flying = false; })()`);
  await ev(`(() => { window.__chews = 0; const a = game.audio, c = a.chew.bind(a); a.chew = () => { __chews++; c(); }; })()`);
  // open the inventory screen on the Items tab for the icon sheet
  await ev(`(() => { game.openScreen('inventory'); game.hud.invTab = 'items'; })()`);
  await ev(`__t.frames(2)`);
  const items = JSON.parse(await ev(`(async () => {
    const { ITEMS, ITEM_PALETTE, MAX_STACK } = await __t.mod('/src/items.js');
    const { BLOCKS } = await __t.mod('/src/blocks.js');
    const { tilePixels } = await __t.mod('/src/textures.js');
    const rows = ITEM_PALETTE.map((id) => {
      const it = ITEMS[id], def = BLOCKS[id];
      // tiles are 64x64 since the HD pass; the icon must be painted (not empty) and must keep transparent surroundings
      const px = tilePixels(def.tex[0]); const total = px.length / 4; let opaque = 0; for (let i = 3; i < px.length; i += 4) if (px[i] > 0) opaque++;
      opaque = Math.round(opaque * 256 / total);   // normalised to a 16x16 count
      let drawn = 'ok'; try { game.hud.drawItem({ id, count: 1 }, -100, -100); } catch (e) { drawn = e.message; }
      return { id, name: it.displayName, sameName: def.displayName === it.displayName, food: it.food, opaquePixels: opaque, drawn };
    });
    return JSON.stringify({ n: rows.length, maxStack: MAX_STACK, rows });
  })()`));
  check('14 registered items, each with a painted icon (transparent surround) that renders through the HUD item path', items.n === 14 && items.maxStack === 64 && items.rows.every((r) => r.drawn === 'ok' && r.sameName && r.opaquePixels > 20 && r.opaquePixels < 256), items.rows.map((r) => `${r.name}:${r.opaquePixels}px/256`).join(' '));
  const foods = Object.fromEntries(items.rows.filter((r) => r.food).map((r) => [r.name, [r.food.hunger, r.food.saturation]]));
  check('Minecraft food values', foods.Apple[0] === 4 && foods.Apple[1] === 2.4 && foods.Bread[0] === 5 && foods.Bread[1] === 6 && foods.Steak[0] === 8 && foods.Steak[1] === 12.8 && foods['Cooked Chicken'][0] === 6 && foods['Cooked Chicken'][1] === 7.2 && foods['Raw Beef'][0] === 3 && foods['Raw Chicken'][1] === 1.2, JSON.stringify(foods));
  await ev(`(() => { game.hud.mouse.x = 4; game.hud.mouse.y = 4; })()`); // no tooltip over the icon rows
  await ev(`__t.frames(2)`);
  await shot('items_tab');
  await ev(`game.closeScreen()`);
  await ev(`__t.frame()`);
  // eat an apple by holding right-click while standing outdoors looking at plain ground (no block "use" action there)
  await ev(`(() => { const p = game.player; p.flying = false; p.teleport(-8.5, game.world.surfaceY(-9, 2) + 1, 2.5); const yaw = -70 * Math.PI / 180; __t.aimAt(p.pos.x - Math.sin(yaw) * 3, p.pos.y - 0.6, p.pos.z - Math.cos(yaw) * 3); __t.play(); game.input.mouseDown[2] = true; game.input.mouseClicked[2] = true; })()`);
  await page.sleep(800);
  const mid = JSON.parse(await ev(`JSON.stringify({ eating: !!game.player.eating, ticks: game.player.eating && game.player.eating.ticks, food: game.player.food, apples: __t.countOf(${I.APPLE}), chews: __chews })`));
  check('holding right-click with an apple starts eating (progress + chewing sounds)', mid.eating && mid.ticks > 4 && mid.chews >= 2 && mid.apples === 3, JSON.stringify(mid));
  await shot('eating_apple');
  await page.sleep(1300);
  await ev(`(() => { game.input.mouseDown[2] = false; })()`);
  await ev(`__t.frame()`);
  const ate = JSON.parse(await ev(`JSON.stringify({ food: game.player.food, sat: +game.player.saturation.toFixed(2), apples: __t.countOf(${I.APPLE}), eating: !!game.player.eating, chews: __chews })`));
  check('apple eaten after 1.6 s: hunger 10 -> 14, saturation +2.4, one apple consumed', ate.food === 14 && ate.sat === 2.4 && ate.apples === 2 && !ate.eating, JSON.stringify(ate));
  // full hunger: nothing happens
  await ev(`(() => { game.player.food = 20; game.input.mouseDown[2] = true; game.input.mouseClicked[2] = true; })()`);
  await page.sleep(700);
  const full = JSON.parse(await ev(`JSON.stringify({ eating: !!game.player.eating, apples: __t.countOf(${I.APPLE}), msg: game.hud.messages.slice(-1)[0] && game.hud.messages.slice(-1)[0].text })`));
  await ev(`(() => { game.input.mouseDown[2] = false; })()`);
  check('cannot eat at full hunger', !full.eating && full.apples === 2, JSON.stringify(full));
  // saturation drains before hunger (4 exhaustion = 1 point)
  const ctrl = '{ forward: 0, strafe: 0, jump: false, sneak: false, sprint: false }';
  const drain = JSON.parse(await ev(`JSON.stringify((() => { const p = game.player; p.food = 14; p.saturation = 2; p.exhaustion = 4.5; p.tick(${ctrl}); const a = { food: p.food, sat: p.saturation }; p.saturation = 0; p.exhaustion = 4.5; p.tick(${ctrl}); return { afterSat: a, afterFood: { food: p.food, sat: p.saturation } }; })())`));
  check('exhaustion drains saturation first, then hunger', drain.afterSat.food === 14 && drain.afterSat.sat === 1 && drain.afterFood.food === 13, JSON.stringify(drain));
  // natural regen only with food >= 18 (1 HP / 4 s), and never below 1 HP when starving
  const regen = JSON.parse(await ev(`JSON.stringify((() => { const p = game.player; p.health = 10; p.food = 17; p.saturation = 0; p.foodTimer = 0; for (let i = 0; i < 100; i++) p.tick(${ctrl}); const low = p.health; p.food = 18; p.foodTimer = 0; for (let i = 0; i < 81; i++) p.tick(${ctrl}); const high = p.health; p.health = 1; p.food = 0; p.foodTimer = 0; for (let i = 0; i < 200; i++) p.tick(${ctrl}); return { low, high, starved: p.health, dead: p.dead }; })())`));
  check('natural regen needs hunger >= 18 (17: none, 18: +1 HP in 4 s); starvation stops at 1 HP', regen.low === 10 && regen.high === 11 && regen.starved === 1 && !regen.dead, JSON.stringify(regen));
  await ev(`(() => { game.player.saturation = 0; game.player.food = 14; game.player.health = 20; })()`);

  // ------------------------------------------------------------------ 4. animals: hit, knockback, flash, death, drops
  log('\n== Animals ==');
  // a cow with two free cells on its +x side (the knockback direction when hit from -x)
  const cow = await ev(`JSON.stringify((() => {
    const free = (x, y, z) => !game.world.getBlockDef(x, y, z).solid && !game.world.getBlockDef(x, y + 1, z).solid && game.world.getBlockDef(x, y - 1, z).solid;
    const cows = game.animals.list.filter((a) => a.type === 'cow' && !a.dead && !a.air);
    const a = cows.find((a) => { const x = Math.floor(a.pos.x), y = Math.floor(a.pos.y + 0.01), z = Math.floor(a.pos.z); return free(x + 1, y, z) && free(x + 2, y, z) && free(x - 1, y, z) && free(x - 2, y, z); }) || cows[0];
    return a ? { id: a.id, x: a.pos.x, y: a.pos.y, z: a.pos.z, health: a.health } : null;
  })())`);
  const c = JSON.parse(cow);
  check('found a cow with 10 health', c && c.health === 10, cow);
  if (c) {
    const hitRes = JSON.parse(await ev(`(async () => {
      const a = game.animals.list.find((a) => a.id === ${c.id});
      const p = game.player; p.flying = true;
      p.teleport(a.pos.x - 1.6, a.pos.y + 0.2, a.pos.z);
      __t.aimAt(a.pos.x, a.pos.y + 0.7, a.pos.z);
      const start = { x: a.pos.x, z: a.pos.z };
      // the hit state (hurt timer, knockback, red flash) only lasts a few ticks: sample it from inside the hit / render calls
      const A = game.animals, origHit = A.hit.bind(A), origRender = A.render.bind(A);
      window.__hit = null;
      A.hit = (an, from, dmg) => { const r = origHit(an, from, dmg); if (an === a && !window.__hit) window.__hit = { health: a.health, hurt: a.hurt, knock: !!a.knock, panic: a.panic, flash: 0, viaClick: game.input.mouseClicked[0] }; return r; };
      A.render = (al, dt, cam) => { origRender(al, dt, cam); if (window.__hit) window.__hit.flash = Math.max(window.__hit.flash, a.model.material.uniforms.uHurt.value); };
      await __t.click(0);
      A.hit = origHit; A.render = origRender;
      __t.ticks(6);
      const moved = Math.hypot(a.pos.x - start.x, a.pos.z - start.z);
      return JSON.stringify({ afterClick: window.__hit, moved: +moved.toFixed(2), healthNow: a.health });
    })()`));
    const h = hitRes.afterClick;
    check('left-click hits the cow: -1 health, hurt flash, knockback, flees', h && h.health === 9 && h.hurt > 0 && h.flash === 1 && h.knock && h.panic && hitRes.moved > 0.3, JSON.stringify(hitRes));
    await shot('cow_hit');
    const death = JSON.parse(await ev(`(async () => {
      const a = game.animals.list.find((a) => a.id === ${c.id});
      const dropsBefore = game.drops.items.length, beefBefore = __t.countOf(${I.BEEF_RAW}), leatherBefore = __t.countOf(1011);
      while (!a.dead) game.animals.hit(a, { x: a.pos.x - 1, z: a.pos.z }, 1);
      const dropped = game.drops.items.slice(dropsBefore).map((d) => [d.id, d.count]);
      const at = { x: a.pos.x, y: a.pos.y, z: a.pos.z };
      let removedAfter = -1;
      for (let i = 1; i <= 30; i++) { game.animals.tick(game.player, game.sky); if (!game.animals.list.includes(a)) { removedAfter = i; break; } }
      return JSON.stringify({ dropped, removedAfter, at, beefBefore, leatherBefore });
    })()`));
    const beef = death.dropped.filter((d) => d[0] === I.BEEF_RAW).reduce((n, d) => n + d[1], 0);
    const leather = death.dropped.filter((d) => d[0] === 1011).reduce((n, d) => n + d[1], 0);
    check('killing the cow drops 1-3 raw beef (+ 0-2 leather) and the body vanishes after 1 s', beef >= 1 && beef <= 3 && leather <= 2 && death.removedAfter > 15 && death.removedAfter <= 21, JSON.stringify(death));
    const pick = JSON.parse(await ev(`(async () => {
      const p = game.player; p.flying = true; p.teleport(${death.at.x}, ${death.at.y}, ${death.at.z});
      for (let i = 0; i < 40; i++) game.tick(false);
      return JSON.stringify({ beef: __t.countOf(${I.BEEF_RAW}), leather: __t.countOf(1011), dropsLeft: game.drops.items.length });
    })()`));
    check('walking over the drops picks up the beef (and leather)', pick.beef === death.beefBefore + beef && pick.leather === death.leatherBefore + leather, JSON.stringify({ ...pick, beefBefore: death.beefBefore, dropped: beef }));
  }

  // ------------------------------------------------------------------ 5. wheat: harvest, replant, growth
  log('\n== Wheat ==');
  const wheat = await ev(`JSON.stringify((() => { const w = __t.find([${B.WHEAT}], 40).find((c) => game.world.getBlock(c.x, c.y - 1, c.z) === ${B.FARMLAND}); return w || null; })())`);
  const wh = JSON.parse(wheat);
  check('found mature wheat on farmland (ranch field)', !!wh, wheat);
  if (wh) {
    // hover above the crop and look straight down so the ray only crosses air before the target (fields are dense)
    const harvest = JSON.parse(await ev(`(async () => {
      const p = game.player; p.flying = true; p.teleport(${wh.x + 0.5}, ${wh.y + 1.6}, ${wh.z + 0.5});
      __t.aimAt(${wh.x + 0.5}, ${wh.y + 0.3}, ${wh.z + 0.5});
      const before = game.drops.items.length;
      await __t.breakAt(${wh.x}, ${wh.y}, ${wh.z});
      return JSON.stringify({ block: game.world.getBlock(${wh.x}, ${wh.y}, ${wh.z}), farmland: game.world.getBlock(${wh.x}, ${wh.y - 1}, ${wh.z}), drops: game.drops.items.slice(before).map((d) => [d.id, d.count]) });
    })()`));
    const gotWheat = harvest.drops.some((d) => d[0] === I.WHEAT), gotSeeds = harvest.drops.some((d) => d[0] === I.SEEDS);
    check('breaking mature wheat drops wheat + seeds (farmland stays)', harvest.block === B.AIR && harvest.farmland === B.FARMLAND && gotWheat && gotSeeds, JSON.stringify(harvest));
    const picked = JSON.parse(await ev(`(async () => { const p = game.player; p.teleport(${wh.x + 0.5}, ${wh.y}, ${wh.z + 0.5}); for (let i = 0; i < 30; i++) game.tick(false); return JSON.stringify({ wheat: __t.countOf(${I.WHEAT}), seeds: __t.countOf(${I.SEEDS}) }); })()`));
    check('picked up the wheat and seeds', picked.wheat >= 1 && picked.seeds >= 1, JSON.stringify(picked));
    // replant: select seeds, right-click the farmland's top face (looking down through the now-empty crop cell)
    const plant = JSON.parse(await ev(`(async () => {
      const inv = game.inventory; inv.selected = inv.slots.findIndex((s) => s && s.id === ${I.SEEDS});
      const seedsBefore = inv.count(${I.SEEDS});
      const p = game.player; p.flying = true; p.teleport(${wh.x + 0.5}, ${wh.y + 1.6}, ${wh.z + 0.5});
      __t.aimAt(${wh.x + 0.5}, ${wh.y - 0.5}, ${wh.z + 0.5});
      await __t.click(2);
      const ent = game.world.getBlockEntity(${wh.x}, ${wh.y}, ${wh.z});
      return JSON.stringify({ block: game.world.getBlock(${wh.x}, ${wh.y}, ${wh.z}), seeds: inv.count(${I.SEEDS}), seedsBefore, entity: ent && ent.type, hit: game.lastHit && [game.lastHit.x, game.lastHit.y, game.lastHit.z, game.lastHit.id, game.lastHit.face] });
    })()`));
    check('right-click with seeds on farmland plants a wheat seedling (1 seed used, crop entity)', plant.block === B.WHEAT_0 && plant.seeds === plant.seedsBefore - 1 && plant.entity === 'crop', JSON.stringify(plant));
    const grow = JSON.parse(await ev(`(() => { game.cropStageTicks = 40; const stages = []; for (let i = 0; i < 12; i++) { __t.ticks(10); stages.push(game.world.getBlock(${wh.x}, ${wh.y}, ${wh.z})); } game.cropStageTicks = 400; return JSON.stringify({ stages, entity: !!game.world.getBlockEntity(${wh.x}, ${wh.y}, ${wh.z}) }); })()`));
    const seq = [...new Set(grow.stages)];
    check('the crop grows through 3 stages on a deterministic tick timer', seq.join(',') === `${B.WHEAT_0},${B.WHEAT_1},${B.WHEAT}` && !grow.entity, JSON.stringify(grow));
  }

  // ------------------------------------------------------------------ 6. furnace cooking / baking
  log('\n== Cooking ==');
  // a furnace with an all-air cell next to it; the player stands there and aims at the centre of the facing side
  const furnace = await ev(`JSON.stringify((() => {
    const air = (x, y, z) => game.world.getBlock(x, y, z) === 0;
    const clear = (x, z) => game.npcs.list.every((n) => Math.hypot(n.pos.x - x, n.pos.z - z) > 3) && game.animals.list.every((a) => Math.hypot(a.pos.x - x, a.pos.z - z) > 3); // nobody standing in the way of the ray
    for (const f of __t.find([${B.FURNACE}], 30)) for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if (air(f.x + dx, f.y, f.z + dz) && air(f.x + dx, f.y + 1, f.z + dz) && clear(f.x + dx + 0.5, f.z + dz + 0.5)) return { ...f, sx: f.x + dx + 0.5, sz: f.z + dz + 0.5, ax: f.x + 0.5 + dx * 0.45, az: f.z + 0.5 + dz * 0.45 };
    }
    return null;
  })())`);
  const fu = JSON.parse(furnace);
  check('found a furnace', !!fu, furnace);
  if (fu) {
    const cook = JSON.parse(await ev(`(async () => {
      const inv = game.inventory; inv.set(2, ${I.BEEF_RAW}, 2); inv.selected = 2;
      const p = game.player; p.flying = true; p.teleport(${fu.sx}, ${fu.y}, ${fu.sz}); __t.aimAt(${fu.ax}, ${fu.y + 0.5}, ${fu.az});
      await __t.click(2);
      const started = !!game.cooking, rawAfter = inv.count(${I.BEEF_RAW}), cookedBefore = inv.count(${I.BEEF_COOKED});
      const diag = { hit: game.lastHit && [game.lastHit.x, game.lastHit.y, game.lastHit.z, game.lastHit.id], looking: game.lookingAtName, screen: game.hud.screen, locked: game.input.locked, dead: p.dead };
      __t.ticks(61);
      return JSON.stringify({ started, rawAfter, cookedBefore, cooked: inv.count(${I.BEEF_COOKED}), busy: !!game.cooking, ...diag });
    })()`));
    check('right-click raw beef on a furnace cooks it into steak after 3 s', cook.started && cook.rawAfter === 1 && cook.cooked === cook.cookedBefore + 1 && !cook.busy, JSON.stringify(cook));
    const bake = JSON.parse(await ev(`(async () => {
      const inv = game.inventory; inv.set(3, ${I.WHEAT}, 3); inv.selected = 3;
      const wheatBefore = inv.count(${I.WHEAT}), breadBefore = inv.count(${I.BREAD});
      __t.aimAt(${fu.ax}, ${fu.y + 0.5}, ${fu.az});
      await __t.click(2);
      __t.ticks(61);
      return JSON.stringify({ wheatBefore, wheat: inv.count(${I.WHEAT}), breadBefore, bread: inv.count(${I.BREAD}) });
    })()`));
    check('3 wheat bake into bread on the furnace', bake.wheat === bake.wheatBefore - 3 && bake.bread === bake.breadBefore + 1, JSON.stringify(bake));
  }

  // ------------------------------------------------------------------ 7. save & reload
  log('\n== Save / reload ==');
  // leave the door open (a player-set state is never auto-closed) so the reload has a non-default door state to restore
  let doorOpenBefore = null;
  if (door) {
    doorOpenBefore = await ev(`(async () => {
      game.player.flying = true; game.player.teleport(${door.standX}, ${door.y}, ${door.standZ}); __t.aimAt(${door.x + 0.5}, ${door.y + 1.0}, ${door.z + 0.5});
      for (let i = 0; i < 2 && !game.world.getBlockDef(${door.x}, ${door.y}, ${door.z}).doorOpen; i++) await __t.click(2);
      return [game.world.getBlock(${door.x}, ${door.y}, ${door.z}), game.world.getBlock(${door.x}, ${door.y + 1}, ${door.z})];
    })()`);
    check('door left open before saving', doorOpenBefore[0] === B.OAK_DOOR_OPEN || doorOpenBefore[0] === B.SPRUCE_DOOR_OPEN, doorOpenBefore.join(','));
  }
  // plant a second seed on a neighbouring farmland cell: a young crop (block + growth timer entity) must survive the reload
  let seedling = null;
  if (wh) {
    seedling = JSON.parse(await ev(`(async () => {
      const inv = game.inventory; if (inv.count(${I.SEEDS}) < 1) inv.set(4, ${I.SEEDS}, 2); inv.selected = inv.slots.findIndex((s) => s && s.id === ${I.SEEDS});
      let cell = null;
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [2, 0], [-2, 0]]) { const x = ${wh.x} + dx, z = ${wh.z} + dz; if (game.world.getBlock(x, ${wh.y - 1}, z) === ${B.FARMLAND} && game.world.getBlock(x, ${wh.y}, z) !== ${B.AIR} && game.world.getBlockDef(x, ${wh.y}, z).growth >= 0) { game.world.setBlock(x, ${wh.y}, z, ${B.AIR}); game.onPlayerEdit(x, ${wh.y}, z, ${B.AIR}); cell = { x, z }; break; } if (game.world.getBlock(x, ${wh.y - 1}, z) === ${B.FARMLAND} && game.world.getBlock(x, ${wh.y}, z) === ${B.AIR}) { cell = { x, z }; break; } }
      if (!cell) return 'null';
      game.player.flying = true; game.player.teleport(cell.x + 0.5, ${wh.y + 1.6}, cell.z + 0.5); __t.aimAt(cell.x + 0.5, ${wh.y - 0.5}, cell.z + 0.5);
      await __t.click(2);
      const ent = game.world.getBlockEntity(cell.x, ${wh.y}, cell.z);
      return JSON.stringify({ ...cell, block: game.world.getBlock(cell.x, ${wh.y}, cell.z), entity: ent && ent.type });
    })()`));
    check('a second seed is planted before saving', seedling && seedling.block === B.WHEAT_0 && seedling.entity === 'crop', JSON.stringify(seedling));
  }
  const before = JSON.parse(await ev(`(() => { const p = game.player; p.flying = false; p.health = 17; p.food = 13; p.saturation = 2.5; p.teleport(-6.5, ${wh ? wh.y : 60}, 3.5); game.persistNow(); return JSON.stringify({ snap: __t.snap(), inv: __t.inv(), key: game.save.key, raw: localStorage.getItem(game.save.key).length }); })()`));
  check('save written to localStorage (v2 with player, inventory, entities)', before.raw > 100 && before.key.includes(':v2:'), `${before.raw} bytes at ${before.key}`);
  // reload in the same tab (a plain navigation, like a player pressing F5) without the position / fresh URL params
  await ev(`(() => { window.__old = true; location.href = ${JSON.stringify(`${base}/?time=0.45&mode=survival`)}; })()`);
  for (let i = 0; i < 100; i++) { await page.sleep(200); const gone = await ev('!window.__old').catch(() => false); if (gone) break; }
  await page.waitForGame(180000);
  await ev(HELPERS);
  await page.sleep(1000);
  const after = JSON.parse(await ev(`JSON.stringify({ snap: __t.snap(), inv: __t.inv(), version: JSON.parse(localStorage.getItem(game.save.key)).version })`));
  check('reload restores player position / health / hunger / saturation', Math.abs(after.snap.x - before.snap.x) < 0.01 && Math.abs(after.snap.z - before.snap.z) < 0.01 && after.snap.health === 17 && after.snap.food === 13 && after.snap.sat === 2.5, JSON.stringify(after.snap));
  check('reload restores the inventory (hotbar + main)', JSON.stringify(after.inv) === JSON.stringify(before.inv), `${after.inv.filter(Boolean).length} stacks`);
  if (saveState) {
    const ent = await ev(`JSON.stringify(game.world.getBlockEntity(${saveState.chest.x}, ${saveState.chest.y}, ${saveState.chest.z}).slots[${saveState.slot}])`);
    check('reload restores chest contents', ent === saveState.stack, ent);
  }
  if (door) {
    const d = await ev(`(async () => { game.player.teleport(${door.standX}, ${door.y}, ${door.standZ}); for (let i = 0; i < 40; i++) { await __t.frame(); if (game.world.isLoaded(${door.x}, ${door.z})) break; } return [game.world.getBlock(${door.x}, ${door.y}, ${door.z}), game.world.getBlock(${door.x}, ${door.y + 1}, ${door.z})]; })()`);
    check('reload restores the door state (still open) from the edit list', d[0] === doorOpenBefore[0] && d[1] === doorOpenBefore[1], d.join(','));
  }
  if (wh) {
    const cropAfter = JSON.parse(await ev(`(async () => { game.player.teleport(${wh.x + 0.5}, ${wh.y}, ${wh.z + 2}); for (let i = 0; i < 40; i++) { await __t.frame(); if (game.world.isLoaded(${wh.x}, ${wh.z})) break; } const s = ${JSON.stringify(seedling)}; const ent = s && game.world.getBlockEntity(s.x, ${wh.y}, s.z); return JSON.stringify({ mature: game.world.getBlock(${wh.x}, ${wh.y}, ${wh.z}), seedling: s ? game.world.getBlock(s.x, ${wh.y}, s.z) : null, seedlingEntity: ent ? ent.type + ':' + ent.age : null }); })()`));
    check('reload restores the regrown wheat and the young seedling with its growth timer', cropAfter.mature === B.WHEAT && (!seedling || ((cropAfter.seedling === B.WHEAT_0 || cropAfter.seedling === B.WHEAT_1) && cropAfter.seedlingEntity && cropAfter.seedlingEntity.startsWith('crop:'))), JSON.stringify(cropAfter));
  }
  const errs = page.exceptions.slice(0, 3);
  check('no uncaught exceptions during the run', errs.length === 0, errs.join(' | '));
} catch (e) {
  failed++;
  log('ERROR', e.stack || e.message);
} finally {
  if (page) { const errs = page.exceptions.slice(0, 5); if (errs.length) log('page exceptions:', errs); page.close(); }
}
log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
