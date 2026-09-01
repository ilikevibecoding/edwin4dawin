// Autonomous western townsfolk: roles, daily schedules, A* navigation, name tags and dialog.
import * as THREE from 'three';
import { paintSkin } from './skins.js';
import { buildHumanoid } from './model.js';
import { findPath, findStand, standHeight } from './pathfinding.js';
import { RNG } from '../rng.js';
import { drawText, measureText } from '../font.js';
import { AABB } from '../player.js';
import { BLOCKS, SHAPE } from '../blocks.js';

const TICK = 0.05;
const WALK_SPEED = 2.6;   // blocks/s
const HURRY_SPEED = 3.4;

const MALE = ['Arthur', 'Charles', 'John', 'Hosea', 'Lenny', 'Sean', 'Javier', 'Bill', 'Dutch', 'Micah', 'Jack', 'Eli', 'Jeb', 'Clyde', 'Silas', 'Wyatt', 'Ezra', 'Amos', 'Cornelius', 'Josiah', 'Buck', 'Kieran', 'Milton', 'Albert', 'Tomas', 'Jed', 'Otis', 'Rufus'];
const FEMALE = ['Mary', 'Abigail', 'Sadie', 'Tilly', 'Karen', 'Molly', 'Susan', 'Hattie', 'Eleanor', 'Rosalind', 'Ida', 'Delilah', 'Beatrice', 'Cassidy', 'Pearl', 'Ada'];

const LINES = {
  generic: ['Howdy, stranger.', "Fine day, ain't it?", 'You new in town?', 'Mind yourself around here.', "The saloon's got the coldest beer this side of the river.", "Heard the train's runnin' late again.", 'Dustwater. Nothing but dust and water, friend.'],
  sheriff: ['Keep your nose clean, stranger.', 'No trouble in my town, you hear?', 'Seen any outlaws on the road?', "I've got my eye on you."],
  deputy: ["Sheriff's got his eye on you.", "Quiet day. Let's keep it that way.", 'Move along now.'],
  bartender: ["What'll it be? Whiskey?", 'Pay up front, friend.', "Piano man's takin' requests.", 'No fighting in my saloon.'],
  shopkeeper: ['Come on in, take a look around.', 'Fresh goods off the morning train.', "We ain't running a charity, friend.", 'Best prices in the territory.'],
  doctor: ['You look pale. Sleep more, drink less.', 'Bullet wounds cost extra.', "Don't drink the river water."],
  banker: ["Your money's safe with us. Mostly.", 'Interest rates are... reasonable.', 'The vault is quite secure, I assure you.'],
  preacher: ['Bless you, child.', "Sunday service at nine. Don't be late.", 'The Lord watches even out here.'],
  blacksmith: ['Need a horse shod?', "Iron don't bend itself.", 'Mind the forge, it bites.'],
  rancher: ['Cattle prices are down again.', "Rain'd be nice.", 'Them coyotes been at the chickens.', 'Long day ahead.'],
  farmer: ["Wheat's coming in fine this year.", 'Soil out here is stubborn as a mule.'],
  stablehand: ['Fine horses, all of them.', 'Two dollars a night for the stable.'],
  railworker: ['Train\'s due any minute.', 'Mind the tracks, friend.', 'Freight comes in twice a day.'],
  townswoman: ['Good day to you.', 'Lovely weather for a walk.', "Have you seen the new dresses at the tailor's?", 'Keep out of that saloon, young man.'],
  traveler: ["Just passin' through.", 'Long ride from the north.', 'Poker game tonight at the saloon.', 'Nice town. Quiet.'],
  pianist: ['Requests cost a nickel.', 'Music soothes the savage cowboy.'],
  poke: ['Hey! Watch it!', 'Keep your hands to yourself!', "You lookin' for trouble?", 'Easy there, partner.'],
};

function hourOf(time) { return (time * 24) % 24; }

class NPC {
  constructor(mgr, id, def) {
    this.mgr = mgr;
    this.id = id;
    this.name = def.name;
    this.role = def.role;
    this.female = !!def.female;
    this.work = def.work || null;       // building record
    this.home = def.home || null;       // building record with beds
    this.patrol = !!def.patrol;
    this.rng = new RNG(1000 + id * 31);
    const skin = paintSkin({ role: def.role, female: this.female, seed: id + 7 });
    const model = buildHumanoid(skin.canvas, skin.hat, skin.hatColor);
    this.model = model;
    this.root = model.root;
    this.pos = new THREE.Vector3(def.x, def.y, def.z);
    this.prevPos = this.pos.clone();
    this.yaw = this.rng.range(0, Math.PI * 2);
    this.targetYaw = this.yaw;
    this.headYaw = 0;
    this.headPitch = 0;
    this.state = 'idle';
    this.idleTimer = this.rng.range(1, 6);
    this.path = null;
    this.pathIndex = 0;
    this.target = null;
    this.waitingPath = false;
    this.pathFails = 0;
    this.walkTime = 0;
    this.speed = WALK_SPEED;
    this.sitting = false;
    this.lookAt = null;
    this.lightTimer = id % 5;
    this.stepDist = 0;
    this.hurt = 0;
    this.talkCooldown = 0;
    this.lastKind = null;
    this.tag = this.makeTag();
    this.root.add(this.tag);
  }

  makeTag() {
    const s = 2;
    const w = measureText(this.name, s) + 8, h = 8 * s + 6;
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(0, 0, w, h);
    drawText(ctx, this.name, 4, 3, s, '#ffffff', true);
    const tex = new THREE.CanvasTexture(c);
    tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.colorSpace = THREE.NoColorSpace;
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: true, depthWrite: false });
    const sp = new THREE.Sprite(mat);
    sp.scale.set(w * 0.0125, h * 0.0125, 1);
    sp.position.set(0, 2.25, 0);
    sp.visible = false;
    return sp;
  }

  get box() { return new AABB(this.pos.x - 0.3, this.pos.y, this.pos.z - 0.3, this.pos.x + 0.3, this.pos.y + 1.8, this.pos.z + 0.3); }

  say(kind) {
    const lines = LINES[kind] || LINES.generic;
    return lines[Math.floor(this.rng.next() * lines.length)];
  }
}

export class NPCManager {
  constructor(scene, world, town, audio, hud) {
    this.scene = scene;
    this.world = world;
    this.town = town;
    this.audio = audio;
    this.hud = hud;
    this.list = [];
    this.pathQueue = [];
    this.group = new THREE.Group();
    scene.add(this.group);
    this.rng = new RNG(4242);
    this.tickCount = 0;
    this.spawnAll();
  }

  // -------------------------------------------------------------------------------- roster
  spawnAll() {
    const t = this.town;
    const byKind = (k) => t.buildings.filter((b) => b.kind === k);
    const byName = (n) => t.buildings.find((b) => b.name === n);
    const houses = byKind('house');
    const shops = t.buildings.filter((b) => b.kind === 'shop' || b.kind === 'store' || b.kind === 'gunsmith' || b.kind === 'doctor');
    const saloon = t.saloon, sheriff = byKind('sheriff')[0], bank = byKind('bank')[0], hotel = byName('Grand Hotel'), boarding = byName('Boarding House');
    const blacksmith = byKind('blacksmith')[0], stable = byKind('stable')[0], station = t.station, church = t.church, barn = byKind('barn')[0], ranch = byKind('ranch')[0];
    const warehouses = byKind('warehouse'), market = byKind('market')[0];
    let hi = 0; const nextHouse = () => houses[(hi++) % houses.length];
    const males = this.rng.shuffle(MALE.slice()), females = this.rng.shuffle(FEMALE.slice());
    let mi = 0, fi = 0;
    const male = () => males[(mi++) % males.length], female = () => females[(fi++) % females.length];
    const defs = [];
    defs.push({ name: 'Sheriff Freeman', role: 'sheriff', work: sheriff, home: sheriff, patrol: true });
    defs.push({ name: 'Deputy Ross', role: 'deputy', work: sheriff, home: nextHouse(), patrol: true });
    defs.push({ name: 'Deputy Hayes', role: 'deputy', work: sheriff, home: nextHouse(), patrol: true });
    defs.push({ name: 'Bartender Sam', role: 'bartender', work: saloon, home: saloon, stay: true });
    defs.push({ name: 'Lenny', role: 'pianist', work: saloon, home: saloon, stay: true, workIndex: 2 });
    defs.push({ name: 'Doc Whitmore', role: 'doctor', work: byKind('doctor')[0], home: nextHouse() });
    defs.push({ name: 'Mr. Cornelius', role: 'banker', work: bank, home: nextHouse() });
    defs.push({ name: 'Strauss', role: 'banker', work: bank, home: hotel, workIndex: 1 });
    defs.push({ name: 'Charles', role: 'blacksmith', work: blacksmith, home: nextHouse() });
    defs.push({ name: 'Kieran', role: 'stablehand', work: stable, home: stable });
    defs.push({ name: 'Wyatt', role: 'railworker', work: station, home: nextHouse() });
    defs.push({ name: 'Eli', role: 'railworker', work: warehouses[0], home: boarding });
    defs.push({ name: 'Father Callahan', role: 'preacher', work: church, home: nextHouse() });
    defs.push({ name: 'John', role: 'rancher', work: barn, home: ranch });
    defs.push({ name: 'Abigail', role: 'rancher', female: true, work: ranch, home: ranch });
    defs.push({ name: 'Hosea', role: 'farmer', work: barn, home: nextHouse(), workIndex: 1 });
    // shopkeepers (some shops)
    const keeperShops = shops.filter((s) => s.kind !== 'doctor').slice(0, 11);
    keeperShops.forEach((shop, i) => {
      const fem = i % 4 === 3;
      defs.push({ name: (fem ? 'Mrs. ' : '') + (fem ? female() : male()), role: 'shopkeeper', female: fem, work: shop, home: nextHouse() });
    });
    // market vendors
    if (market) for (let i = 0; i < 2; i++) defs.push({ name: male(), role: 'farmer', work: market, home: nextHouse(), workIndex: i });
    // townswomen
    for (let i = 0; i < 4; i++) defs.push({ name: female(), role: 'townswoman', female: true, home: nextHouse() });
    // cowboys / travelers staying at the hotel
    const cowboyNames = ['Arthur', 'Dutch', 'Javier', 'Bill', 'Micah', 'Sean'];
    cowboyNames.forEach((n, i) => defs.push({ name: n, role: i % 2 ? 'traveler' : 'cowboy', home: i % 3 === 0 ? boarding : hotel, traveler: true }));

    defs.forEach((d, i) => {
      // initial position: at work during the day, else home
      const spotList = d.work && d.work.work.length ? d.work.work : d.work ? d.work.spots : null;
      let p = spotList && spotList.length ? spotList[(d.workIndex || 0) % spotList.length] : null;
      if (!p) p = d.home && d.home.spots.length ? d.home.spots[0] : t.streetSpots[i % t.streetSpots.length];
      const npc = new NPC(this, i, { ...d, x: p.x + 0.5, y: p.y, z: p.z + 0.5 });
      npc.workIndex = d.workIndex || 0;
      npc.stay = !!d.stay;
      npc.traveler = !!d.traveler;
      this.list.push(npc);
      this.group.add(npc.root);
      const st = findStand(this.world, Math.floor(npc.pos.x), Math.floor(npc.pos.y), Math.floor(npc.pos.z), 4);
      if (st) npc.pos.y = st.h;
      npc.prevPos.copy(npc.pos);
    });
  }

  // -------------------------------------------------------------------------------- scheduling
  chooseTarget(npc, hour, dayFactor) {
    const t = this.town, r = npc.rng;
    const night = hour < 6 || hour >= 22;
    const morning = hour >= 6 && hour < 9;
    const evening = hour >= 17 && hour < 22;
    const pick = (arr) => arr[Math.floor(r.next() * arr.length)];
    const spotIn = (b, list = 'spots') => {
      if (!b) return null;
      const arr = b[list] && b[list].length ? b[list] : b.spots;
      if (!arr || !arr.length) return null;
      return pick(arr);
    };
    const mk = (p, kind, dwell, building = null, face = null) => (p ? { x: p.x, y: p.y, z: p.z, kind, dwell, building, face } : null);
    const shops = t.buildings.filter((b) => b.kind === 'shop' || b.kind === 'store' || b.kind === 'gunsmith');
    const street = () => mk(pick(t.streetSpots), 'street', r.range(4, 12));
    const gather = () => { const g = pick(t.gatherSpots); const slot = g.slots[npc.id % g.slots.length]; return { x: slot[0], y: g.y, z: slot[1], kind: 'gather', dwell: r.range(20, 60), face: { x: g.x + 0.5, z: g.z + 0.5 } }; };
    const saloon = () => { const sp = r.chance(0.5) ? pick(t.saloon.barSpots) : spotIn(t.saloon); return mk(sp, 'saloon', r.range(30, 90), t.saloon); };
    const shop = () => { const b = pick(shops); return mk(spotIn(b), 'shop', r.range(12, 35), b); };
    const home = (dwell = r.range(60, 180)) => { const b = npc.home; if (!b) return street(); const sp = night ? spotIn(b, 'beds') || spotIn(b) : spotIn(b); return mk(sp, 'home', dwell, b); };
    const work = () => { const b = npc.work; if (!b) return street(); const arr = b.work && b.work.length ? b.work : b.spots; const sp = arr[(npc.workIndex + (r.chance(0.8) ? 0 : Math.floor(r.next() * arr.length))) % arr.length]; return mk(sp, 'work', r.range(30, 90), b); };
    const church = () => mk(spotIn(t.church), 'church', r.range(20, 50), t.church);
    const stationSpot = () => mk(spotIn(t.station), 'station', r.range(15, 40), t.station);

    if (npc.stay) { // saloon staff
      if (night && hour >= 2 && hour < 6) return home();
      return r.chance(0.85) ? work() : saloon();
    }
    if (npc.patrol) {
      if (npc.role === 'sheriff' && night) return r.chance(0.7) ? work() : street();
      const x = r.next();
      if (night) return x < 0.7 ? street() : x < 0.85 ? gather() : work();
      if (evening) return x < 0.35 ? street() : x < 0.6 ? saloon() : x < 0.8 ? work() : gather();
      return x < 0.45 ? street() : x < 0.75 ? work() : x < 0.9 ? gather() : shop();
    }
    if (npc.traveler) {
      const x = r.next();
      if (night) return x < 0.75 ? home() : saloon();
      if (evening) return x < 0.6 ? saloon() : x < 0.8 ? street() : gather();
      if (morning) return x < 0.4 ? home(r.range(10, 30)) : x < 0.7 ? stationSpot() : street();
      return x < 0.3 ? saloon() : x < 0.55 ? street() : x < 0.75 ? shop() : x < 0.9 ? stationSpot() : gather();
    }
    if (npc.work) {
      const x = r.next();
      if (night) return x < 0.85 ? home() : saloon();
      if (morning) return x < 0.8 ? work() : street();
      if (evening) return npc.female ? (x < 0.6 ? home() : x < 0.8 ? street() : shop()) : (x < 0.5 ? saloon() : x < 0.75 ? home() : x < 0.9 ? street() : gather());
      return x < 0.7 ? work() : x < 0.82 ? street() : x < 0.9 ? shop() : x < 0.95 ? saloon() : gather();
    }
    // townspeople
    const x = r.next();
    if (night) return x < 0.9 ? home() : street();
    if (morning) return x < 0.4 ? home(r.range(15, 40)) : x < 0.7 ? street() : shop();
    if (evening) return npc.female ? (x < 0.5 ? home() : x < 0.75 ? street() : gather()) : (x < 0.45 ? saloon() : x < 0.7 ? street() : home());
    return x < 0.3 ? shop() : x < 0.5 ? street() : x < 0.65 ? gather() : x < 0.8 ? church() : x < 0.9 ? stationSpot() : home(r.range(10, 30));
  }

  requestPath(npc) {
    if (npc.waitingPath) return;
    npc.waitingPath = true;
    this.pathQueue.push(npc);
  }

  processPaths() {
    let budget = 3;
    const t0 = performance.now();
    while (this.pathQueue.length && budget-- > 0 && performance.now() - t0 < 6) {
      const npc = this.pathQueue.shift();
      npc.waitingPath = false;
      if (!npc.target) continue;
      const p = findPath(this.world, Math.floor(npc.pos.x), Math.floor(npc.pos.y + 0.01), Math.floor(npc.pos.z), npc.target.x, npc.target.y, npc.target.z, 4500);
      if (p && p.length) { npc.path = p; npc.pathIndex = 0; npc.state = 'walk'; npc.pathFails = 0; }
      else {
        npc.pathFails++;
        npc.target = null; npc.path = null; npc.state = 'idle'; npc.idleTimer = npc.rng.range(2, 6);
        if (npc.pathFails > 4) { // stuck somewhere: teleport to a street spot
          const sp = this.town.streetSpots[Math.floor(npc.rng.next() * this.town.streetSpots.length)];
          const st = findStand(this.world, sp.x, sp.y, sp.z, 4);
          if (st) { npc.pos.set(sp.x + 0.5, st.h, sp.z + 0.5); npc.prevPos.copy(npc.pos); }
          npc.pathFails = 0;
        }
      }
    }
  }

  // -------------------------------------------------------------------------------- simulation (20 tps)
  tick(player, sky) {
    this.tickCount++;
    const hour = hourOf(sky.time);
    const pp = player.pos;
    for (const npc of this.list) {
      npc.prevPos.copy(npc.pos);
      const dx = npc.pos.x - pp.x, dz = npc.pos.z - pp.z;
      const d2 = dx * dx + dz * dz;
      // LOD: far NPCs think less often
      const far = d2 > 60 * 60;
      if (far && (this.tickCount + npc.id) % 4 !== 0) continue;
      const dt = far ? TICK * 4 : TICK;
      this.updateNPC(npc, dt, hour, sky.dayFactor, player, d2);
    }
    this.processPaths();
    // simple separation so NPCs don't stack on the same spot
    if (this.tickCount % 2 === 0) this.separate();
  }

  separate() {
    const n = this.list.length;
    for (let i = 0; i < n; i++) {
      const a = this.list[i];
      for (let j = i + 1; j < n; j++) {
        const b = this.list[j];
        const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z;
        const d2 = dx * dx + dz * dz;
        if (d2 > 0.36 || d2 < 1e-6 || Math.abs(a.pos.y - b.pos.y) > 1) continue;
        const d = Math.sqrt(d2), push = (0.6 - d) * 0.15;
        const nx = dx / d, nz = dz / d;
        if (a.state === 'walk') this.tryMove(a, -nx * push, -nz * push);
        if (b.state === 'walk') this.tryMove(b, nx * push, nz * push);
      }
    }
  }

  tryMove(npc, mx, mz) {
    const nx = npc.pos.x + mx, nz = npc.pos.z + mz;
    const h = standHeight(this.world, Math.floor(nx), Math.floor(npc.pos.y + 0.01), Math.floor(nz));
    if (h !== null && Math.abs(h - npc.pos.y) < 0.6) { npc.pos.x = nx; npc.pos.z = nz; }
  }

  updateNPC(npc, dt, hour, dayFactor, player, d2) {
    if (npc.hurt > 0) npc.hurt -= dt;
    if (npc.talkCooldown > 0) npc.talkCooldown -= dt;
    // look at the player when close and not walking
    if (d2 < 9 && npc.state !== 'walk') npc.lookAt = { x: player.pos.x, y: player.pos.y + 1.6, z: player.pos.z };
    else if (npc.state !== 'walk') { if (npc.rng.chance(0.01)) npc.lookAt = npc.rng.chance(0.5) ? null : { x: npc.pos.x + npc.rng.range(-5, 5), y: npc.pos.y + 1.4, z: npc.pos.z + npc.rng.range(-5, 5) }; }
    else npc.lookAt = null;

    if (npc.state === 'idle') {
      npc.idleTimer -= dt;
      if (npc.idleTimer <= 0 && !npc.waitingPath) {
        const target = this.chooseTarget(npc, hour, dayFactor);
        if (!target) { npc.idleTimer = 3; return; }
        // already there? just dwell
        const ddx = target.x + 0.5 - npc.pos.x, ddz = target.z + 0.5 - npc.pos.z;
        if (ddx * ddx + ddz * ddz < 1.5) { npc.idleTimer = target.dwell; npc.target = null; return; }
        npc.target = target;
        npc.speed = target.kind === 'home' && (hour >= 21 || hour < 6) ? HURRY_SPEED : WALK_SPEED;
        this.requestPath(npc);
        npc.sitting = false;
      }
      return;
    }
    if (npc.state === 'walk') {
      if (!npc.path || npc.pathIndex >= npc.path.length) { this.arrive(npc); return; }
      const cell = npc.path[npc.pathIndex];
      // re-validate the next cell (player may have placed/broken blocks)
      const sh = standHeight(this.world, cell.x, cell.y, cell.z);
      if (sh === null) { npc.path = null; npc.state = 'idle'; npc.idleTimer = 0.3; this.requestPath(npc); return; }
      const tx = cell.x + 0.5, tz = cell.z + 0.5;
      const dx = tx - npc.pos.x, dz = tz - npc.pos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      const step = npc.speed * dt;
      if (dist <= step + 0.02) {
        npc.pos.x = tx; npc.pos.z = tz; npc.pos.y = sh;
        npc.pathIndex++;
        if (npc.pathIndex >= npc.path.length) this.arrive(npc);
      } else {
        npc.pos.x += (dx / dist) * step; npc.pos.z += (dz / dist) * step;
        // height: blend toward the target cell's height when close
        const targetH = dist < 0.5 ? sh : Math.max(npc.pos.y, Math.min(sh, npc.pos.y + 1));
        if (Math.abs(sh - npc.pos.y) > 0.01) npc.pos.y += (targetH - npc.pos.y) * Math.min(1, dt * 12);
        npc.targetYaw = Math.atan2(dx, dz);
      }
      npc.walkTime += dt * npc.speed;
      npc.stepDist += step;
      if (npc.stepDist > 0.9) { npc.stepDist = 0; if (d2 < 14 * 14) this.audio.step(BLOCKS[this.world.getBlock(Math.floor(npc.pos.x), Math.floor(npc.pos.y - 0.3), Math.floor(npc.pos.z))].sound, npc.pos, 0.5); }
    }
  }

  arrive(npc) {
    const t = npc.target;
    npc.state = 'idle';
    npc.path = null;
    npc.idleTimer = t ? t.dwell : npc.rng.range(3, 8);
    if (t && t.face) npc.targetYaw = Math.atan2(t.face.x - npc.pos.x, t.face.z - npc.pos.z);
    else if (t && t.kind === 'work' && t.building && t.building.kind === 'saloon') npc.targetYaw = npc.rng.range(0, Math.PI * 2);
    // sit on benches (bottom slabs)
    const under = this.world.getBlock(Math.floor(npc.pos.x), Math.floor(npc.pos.y - 0.01), Math.floor(npc.pos.z));
    npc.sitting = BLOCKS[under].shape === SHAPE.SLAB && t && (t.kind === 'street' || t.kind === 'church' || t.kind === 'station' || t.kind === 'saloon');
    if (npc.sitting) npc.targetYaw = Math.round(npc.yaw / (Math.PI / 2)) * (Math.PI / 2);
    npc.lastKind = t ? t.kind : null;
    npc.target = null;
  }

  // -------------------------------------------------------------------------------- rendering (per frame)
  render(alpha, dt, camera) {
    const cp = camera.position;
    for (const npc of this.list) {
      const r = npc.root;
      const px = npc.prevPos.x + (npc.pos.x - npc.prevPos.x) * alpha;
      const py = npc.prevPos.y + (npc.pos.y - npc.prevPos.y) * alpha;
      const pz = npc.prevPos.z + (npc.pos.z - npc.prevPos.z) * alpha;
      const dx = px - cp.x, dz = pz - cp.z;
      const d2 = dx * dx + dz * dz;
      if (d2 > 110 * 110) { r.visible = false; continue; }
      r.visible = true;
      r.position.set(px, py - (npc.sitting ? 0.42 : 0), pz);
      // smooth turning
      let dy = npc.targetYaw - npc.yaw;
      while (dy > Math.PI) dy -= Math.PI * 2;
      while (dy < -Math.PI) dy += Math.PI * 2;
      npc.yaw += dy * Math.min(1, dt * 10);
      r.rotation.y = npc.yaw;
      if (d2 > 50 * 50) { npc.tag.visible = false; continue; }
      // limbs
      const m = npc.model;
      if (npc.state === 'walk') {
        const s = Math.sin(npc.walkTime * 3.6) * 0.75;
        m.rightLeg.rotation.x = s; m.leftLeg.rotation.x = -s;
        m.rightArm.rotation.x = -s * 0.9; m.leftArm.rotation.x = s * 0.9;
        m.rightArm.rotation.z = 0.05; m.leftArm.rotation.z = -0.05;
      } else if (npc.sitting) {
        m.rightLeg.rotation.x = m.leftLeg.rotation.x = -Math.PI / 2;
        m.rightArm.rotation.x = m.leftArm.rotation.x = -0.4;
      } else {
        const idle = Math.sin(performance.now() * 0.0015 + npc.id) * 0.04;
        m.rightLeg.rotation.x *= 0.8; m.leftLeg.rotation.x *= 0.8;
        m.rightArm.rotation.x *= 0.8; m.leftArm.rotation.x *= 0.8;
        m.rightArm.rotation.z = 0.05 + idle; m.leftArm.rotation.z = -0.05 - idle;
        if (npc.role === 'pianist' && npc.lastKind === 'work') { m.rightArm.rotation.x = -1.3 + Math.sin(performance.now() * 0.02) * 0.15; m.leftArm.rotation.x = -1.3 + Math.cos(performance.now() * 0.017) * 0.15; }
        if (npc.role === 'blacksmith' && npc.lastKind === 'work') { m.rightArm.rotation.x = -1.0 - Math.abs(Math.sin(performance.now() * 0.004)) * 1.4; }
      }
      // head look
      let hy = 0, hp = 0;
      if (npc.lookAt) {
        const ldx = npc.lookAt.x - px, ldz = npc.lookAt.z - pz;
        const want = Math.atan2(ldx, ldz) - npc.yaw;
        let w = want; while (w > Math.PI) w -= Math.PI * 2; while (w < -Math.PI) w += Math.PI * 2;
        hy = Math.max(-1.1, Math.min(1.1, w));
        const dist = Math.sqrt(ldx * ldx + ldz * ldz);
        hp = -Math.atan2(npc.lookAt.y - (py + 1.62), dist);
      }
      npc.headYaw += (hy - npc.headYaw) * Math.min(1, dt * 8);
      npc.headPitch += (hp - npc.headPitch) * Math.min(1, dt * 8);
      m.head.rotation.y = npc.headYaw;
      m.head.rotation.x = npc.headPitch;
      // lighting
      if (++npc.lightTimer >= 6) {
        npc.lightTimer = 0;
        const l = this.world.sampleLight(npc.pos.x, npc.pos.y + 1, npc.pos.z);
        m.material.uniforms.uLight.value.set(l[0], l[1]);
        for (const child of m.head.children) if (child.material && child.material.uniforms) child.material.uniforms.uLight.value.set(l[0], l[1]);
      }
      m.material.uniforms.uHurt.value = npc.hurt > 0 ? 1 : 0;
      // name tag: visible when close or targeted
      npc.tag.visible = d2 < 8 * 8 || npc === this.targeted;
      if (npc.tag.visible) { npc.tag.position.y = (npc.sitting ? 2.25 + 0.42 : 2.25); }
    }
  }

  // Ray vs NPC boxes. Returns {npc, dist} or null
  raycast(origin, dir, maxDist) {
    let best = null;
    for (const npc of this.list) {
      const b = npc.box;
      const t = rayAABB(origin, dir, b);
      if (t !== null && t < maxDist && (!best || t < best.dist)) best = { npc, dist: t };
    }
    this.targeted = best ? best.npc : null;
    return best;
  }

  collectBoxes(out, x, z) {
    for (const npc of this.list) if (Math.abs(npc.pos.x - x) < 3 && Math.abs(npc.pos.z - z) < 3) out.push(npc.box);
  }

  onWorldChanged(x, y, z) {
    for (const npc of this.list) {
      if (!npc.path) continue;
      for (let i = npc.pathIndex; i < npc.path.length; i++) {
        const c = npc.path[i];
        if (Math.abs(c.x - x) <= 1 && Math.abs(c.z - z) <= 1 && Math.abs(c.y - y) <= 2) { npc.path = null; npc.state = 'idle'; npc.idleTimer = 0.2; if (npc.target) this.requestPath(npc); break; }
      }
    }
  }

  talk(npc, game) {
    if (npc.talkCooldown > 0) return;
    npc.talkCooldown = 2;
    const kind = ['sheriff', 'deputy', 'bartender', 'shopkeeper', 'doctor', 'banker', 'preacher', 'blacksmith', 'rancher', 'farmer', 'stablehand', 'railworker', 'townswoman', 'traveler', 'pianist'].includes(npc.role) ? npc.role : (npc.role === 'cowboy' ? 'traveler' : 'generic');
    const line = npc.rng.chance(0.7) ? npc.say(kind) : npc.say('generic');
    game.hud.addMessage(`<${npc.name}> ${line}`);
    this.audio.npcGrunt(npc.pos, npc.female ? 1.5 : 0.9 + npc.rng.next() * 0.3);
    npc.lookAt = { x: game.player.pos.x, y: game.player.pos.y + 1.6, z: game.player.pos.z };
    npc.targetYaw = Math.atan2(game.player.pos.x - npc.pos.x, game.player.pos.z - npc.pos.z);
    if (npc.state === 'idle') npc.idleTimer = Math.max(npc.idleTimer, 3);
  }

  poke(npc, game) {
    npc.hurt = 0.4;
    if (npc.talkCooldown <= 0) { game.hud.addMessage(`<${npc.name}> ${npc.say('poke')}`); npc.talkCooldown = 1.5; this.audio.npcGrunt(npc.pos, 1.2); }
    // stumble back a little and walk off
    const dx = npc.pos.x - game.player.pos.x, dz = npc.pos.z - game.player.pos.z;
    const d = Math.hypot(dx, dz) || 1;
    this.tryMove(npc, (dx / d) * 0.4, (dz / d) * 0.4);
    npc.targetYaw = Math.atan2(-dx, -dz);
    if (npc.state === 'idle') npc.idleTimer = Math.min(npc.idleTimer, 1.5);
  }
}

function rayAABB(o, d, b) {
  let tmin = -Infinity, tmax = Infinity;
  const axes = [[o.x, d.x, b.x0, b.x1], [o.y, d.y, b.y0, b.y1], [o.z, d.z, b.z0, b.z1]];
  for (const [oo, dd, lo, hi] of axes) {
    if (Math.abs(dd) < 1e-9) { if (oo < lo || oo > hi) return null; continue; }
    let t1 = (lo - oo) / dd, t2 = (hi - oo) / dd;
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
    tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
    if (tmin > tmax) return null;
  }
  if (tmax < 0) return null;
  return Math.max(tmin, 0);
}
