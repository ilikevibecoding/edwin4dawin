// The space train: engine + three passenger cars + observation car (74 blocks) running on the hyperlane between the
// frontier station and Coruscant on the shared tick clock. One voxel grid for the whole train (walkable end to end
// through the gangways), a second tiny grid for the sliding doors that closes while moving, announcements, an engine
// hum, and predictive chunk preloading along the track while the player rides.
import { B } from '../blocks.js';
import { CHUNK_SIZE as CS } from '../constants.js';
import { Vehicle } from './vehicle.js';
import { VoxelGrid, buildVoxelMesh } from './voxelMesh.js';
import { ROUTE, CARS, CAR_LENGTH, DOOR_OFFSETS, TRAIN_LENGTH, TRAIN_HEIGHT, SCHEDULE, trainState } from './route.js';

// grid layout: x = along the track (west -> east), y: 0 undercarriage, 1 floor, 2..4 interior, 5 roof; z: 0 north
// wall .. 5 south (platform side) wall. Grid (0,0,0) sits at world (x0, ROUTE.railY, ROUTE.trainZ0).
const W = ROUTE.trainWidth, H = TRAIN_HEIGHT;
const SEAT = B.BED_FOOT;     // cushioned bench (9/16 high)
const TABLE = B.CONSOLE;     // holo table between facing seats
const DOOR_LOW = B.DURASTEEL_DARK, DOOR_HIGH = B.STEEL_GLASS;

export function buildTrainGrid() {
  const g = new VoxelGrid(TRAIN_LENGTH, H, W);
  const doors = []; // [x, y, z] cells of the sliding doors (air while docked)
  for (let ci = 0; ci < CARS.length; ci++) {
    const car = CARS[ci], x0 = car.x0, x1 = x0 + CAR_LENGTH - 1;
    const local = (x) => x - x0;
    // shell -----------------------------------------------------------------------------------------
    g.fill(x0 + 1, 0, 1, x1 - 1, 0, 4, B.DURASTEEL_DARK);          // undercarriage skirt
    for (let x = x0 + 1; x <= x1 - 1; x++) { g.set(x, 0, 1, B.CHROME); g.set(x, 0, 4, B.CHROME); } // skids over the rails
    g.set(x0 + 1, 0, 2, 0); g.set(x0 + 1, 0, 3, 0); g.set(x1 - 1, 0, 2, 0); g.set(x1 - 1, 0, 3, 0);
    g.fill(x0, 1, 0, x1, 1, 5, B.DECK_PLATE);                       // floor
    for (let x = x0; x <= x1; x++) { g.set(x, 1, 0, B.DURASTEEL_DARK); g.set(x, 1, 5, B.DURASTEEL_DARK); } // sills
    for (let x = x0; x <= x1; x++) for (const z of [0, 5]) {
      const l = local(x), end = l === 0 || l === CAR_LENGTH - 1;
      g.set(x, 2, z, car.kind === 'engine' ? B.PANEL_RED : B.PANEL_STRIPE);
      g.set(x, 3, z, end ? B.DURASTEEL : B.STEEL_GLASS);
      g.set(x, 4, z, car.kind === 'observation' && !end ? B.STEEL_GLASS : B.DURASTEEL);
    }
    g.fill(x0, 5, 0, x1, 5, 5, B.DURASTEEL_DARK);                   // roof
    // end walls with the gangway opening in the aisle
    for (const x of [x0, x1]) { g.fill(x, 2, 0, x, 4, 5, B.DURASTEEL); g.fill(x, 2, 2, x, 4, 3, 0); }
    // ceiling light strips over the aisle
    for (let x = x0 + 2; x <= x1 - 2; x += 3) { g.set(x, 5, 2, B.GLOW_PANEL); g.set(x, 5, 3, B.GLOW_PANEL); }
    // roof vents
    for (let x = x0 + 3; x <= x1 - 3; x += 4) { g.set(x, 5, 0, B.VENT); g.set(x, 5, 5, B.VENT); }
    // doors on the platform side + destination boards above them
    for (const dx of DOOR_OFFSETS[car.kind]) for (let k = 0; k < 2; k++) {
      const x = x0 + dx + k;
      g.set(x, 2, 5, 0); g.set(x, 3, 5, 0);
      doors.push([x, 2, 5], [x, 3, 5]);
      g.set(x, 4, 5, B.HOLO_SIGN);
      g.set(x, 4, 0, B.HOLO_SIGN); // matching board on the other side
    }
    // interior ---------------------------------------------------------------------------------------
    if (car.kind === 'passenger' || car.kind === 'observation') {
      const seats = car.kind === 'passenger' ? [1, 4, 5, 7, 8, 12] : [1, 5, 7, 12];
      const tables = car.kind === 'passenger' ? [6] : [6];
      for (const z of [1, 4]) {
        for (const l of seats) g.set(x0 + l, 2, z, SEAT);
        for (const l of tables) g.set(x0 + l, 2, z, TABLE);
      }
      if (car.kind === 'observation') {
        // lounge at the back: glass end wall, seats facing it
        g.fill(x1, 2, 1, x1, 4, 4, B.STEEL_GLASS);
        g.fill(x1, 5, 1, x1, 5, 4, B.DURASTEEL_DARK);
        g.fill(x0 + 1, 5, 1, x1 - 1, 5, 4, B.STEEL_GLASS); // glass dome roof
        for (let x = x0 + 2; x <= x1 - 2; x += 3) { g.set(x, 5, 0, B.GLOW_PANEL); g.set(x, 5, 5, B.GLOW_PANEL); }
        g.set(x0 + 9, 2, 1, SEAT); g.set(x0 + 9, 2, 4, SEAT);
      }
    } else {
      // engine: chrome wedge nose, cockpit, reactor room
      g.fill(x0, 0, 0, x0 + 2, 5, 5, 0);
      g.fill(x0 + 3, 5, 0, x0 + 3, 5, 5, 0);
      g.fill(x0 + 3, 4, 0, x0 + 3, 4, 5, B.DURASTEEL_DARK);      // sloped roof step
      g.set(x0 + 3, 4, 2, B.HOLO_SIGN); g.set(x0 + 3, 4, 3, B.HOLO_SIGN); // destination board on the nose
      g.fill(x0 + 2, 1, 0, x0 + 2, 2, 5, B.CHROME);
      g.fill(x0 + 2, 3, 0, x0 + 2, 3, 5, B.STEEL_GLASS);           // windshield
      g.set(x0 + 2, 3, 0, B.CHROME); g.set(x0 + 2, 3, 5, B.CHROME);
      g.fill(x0 + 1, 1, 0, x0 + 1, 1, 5, B.CHROME);
      g.fill(x0 + 1, 2, 1, x0 + 1, 2, 4, B.CHROME);
      g.fill(x0, 1, 1, x0, 1, 4, B.CHROME);
      g.set(x0, 1, 2, B.GLOW_PANEL_BLUE); g.set(x0, 1, 3, B.GLOW_PANEL_BLUE); // headlights
      g.fill(x0 + 1, 0, 1, x0 + 1, 0, 4, B.DURASTEEL_DARK);
      g.fill(x0 + 3, 2, 2, x0 + 3, 4, 3, B.DURASTEEL); g.fill(x0 + 3, 2, 2, x0 + 3, 3, 3, 0); // cab bulkhead: opening kept low
      // cab consoles (facing the windshield) and side windows
      for (const z of [1, 4]) { g.set(x0 + 3, 2, z, TABLE); g.set(x0 + 4, 3, 0 + (z === 1 ? 0 : 5), B.STEEL_GLASS); }
      g.fill(x0 + 3, 2, 0, x0 + 3, 4, 0, B.DURASTEEL); g.fill(x0 + 3, 2, 5, x0 + 3, 4, 5, B.DURASTEEL);
      g.set(x0 + 4, 4, 0, B.DURASTEEL); g.set(x0 + 4, 4, 5, B.DURASTEEL);
      // engine room: reactor columns, vents, glowing coolant panels
      for (const x of [7, 9]) for (const z of [1, 4]) { g.set(x0 + x, 2, z, B.VENT); g.set(x0 + x, 3, z, B.GLOW_PANEL_BLUE); g.set(x0 + x, 4, z, B.VENT); }
      g.set(x0 + 8, 2, 1, TABLE); g.set(x0 + 8, 2, 4, TABLE);
      for (let x = x0 + 5; x <= x1 - 1; x++) for (const z of [0, 5]) if (x !== x0 + 10 && x !== x0 + 11) g.set(x, 3, z, x % 3 === 0 ? B.VENT : B.DURASTEEL);
      g.set(x0 + 6, 3, 0, B.STEEL_GLASS); g.set(x0 + 6, 3, 5, B.STEEL_GLASS);
    }
    // gangway to the next car
    if (ci < CARS.length - 1) {
      const gx = x1 + 1;
      g.set(gx, 1, 2, B.DECK_PLATE); g.set(gx, 1, 3, B.DECK_PLATE);
      g.fill(gx, 1, 1, gx, 5, 1, B.DURASTEEL); g.fill(gx, 1, 4, gx, 5, 4, B.DURASTEEL);
      g.set(gx, 5, 2, B.DURASTEEL_DARK); g.set(gx, 5, 3, B.DURASTEEL_DARK);
    }
  }
  // the engine's front is closed (no gangway opening on the nose side): x0 is the nose itself
  // the observation car's rear is its glass wall (set above); make sure the opening at x1 is closed
  const last = CARS[CARS.length - 1]; g.fill(last.x0 + CAR_LENGTH - 1, 2, 2, last.x0 + CAR_LENGTH - 1, 4, 3, B.STEEL_GLASS);
  return { grid: g, doors };
}

export class SpaceTrain extends Vehicle {
  constructor() {
    const { grid, doors } = buildTrainGrid();
    super({
      grid, name: 'space_train', emissive: 0.55,
      // whole cabin volume (floor top to ceiling), including the doorway cells on the platform side
      interiors: [{ x0: 0, x1: TRAIN_LENGTH, y0: 2, y1: 5, z0: 1, z1: 6 }],
    });
    this.doors = doors;
    this.doorsClosed = false;
    this.state = trainState(0);
    this.lastState = this.state;
    this.doorMesh = null;
    this.humOn = false;
    this.listeners = []; // (event, train) => void   events: 'doors', 'arrive', 'depart'
    this.preloadStats = { chunks: 0, ms: 0 };
    this.setDoors(!this.state.doorsOpen);
  }

  pose(tick) {
    this.state = trainState(tick);
    return { x: this.state.x0, y: ROUTE.railY, z: ROUTE.trainZ0, yaw: 0 };
  }

  buildMeshes() {
    super.buildMeshes();
    const dg = new VoxelGrid(this.grid.w, this.grid.h, this.grid.d);
    for (const [x, y, z] of this.doors) dg.set(x, y, z, y === 2 ? DOOR_LOW : DOOR_HIGH);
    this.doorMesh = buildVoxelMesh(dg, this.game.atlas, { emissive: this.emissive });
    this.doorMesh.name = 'space_train_doors';
    this.doorMesh.visible = this.doorsClosed;
    this.game.scene.add(this.doorMesh);
    this.meshes.push(this.doorMesh);
  }

  setDoors(closed) {
    if (closed === this.doorsClosed) return;
    this.doorsClosed = closed;
    for (const [x, y, z] of this.doors) this.grid.set(x, y, z, closed ? (y === 2 ? DOOR_LOW : DOOR_HIGH) : 0);
    if (this.doorMesh) this.doorMesh.visible = closed;
    this.emit('doors');
  }

  on(fn) { this.listeners.push(fn); }
  emit(ev) { for (const fn of this.listeners) { try { fn(ev, this); } catch (e) { console.error('train listener', e); } } }

  // distance from a point to the train's bounds (0 inside)
  distanceTo(x, y, z) {
    const b = this.bounds; if (!b) return Infinity;
    const dx = Math.max(b.x0 - x, 0, x - b.x1), dy = Math.max(b.y0 - y, 0, y - b.y1), dz = Math.max(b.z0 - z, 0, z - b.z1);
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  tick(tickCount) {
    const prevState = this.state;
    super.tick(tickCount); // updates this.state via pose()
    const st = this.state;
    this.setDoors(!st.doorsOpen);
    const game = this.game;
    if (game && game.player) {
      const p = game.player.pos, near = this.distanceTo(p.x, p.y, p.z) <= 80;
      if (prevState.doorsOpen && !st.doorsOpen && st.phase === 'dwell') { this.emit('depart'); if (near && game.hud) game.hud.addMessage(`Space train departing for ${st.dest.name}. Mind the doors.`); }
      if (prevState.phase !== 'dwell' && st.phase === 'dwell') { this.emit('arrive'); if (near && game.hud) game.hud.addMessage(`Arriving at ${st.at.name}.`); }
      if (prevState.phase === 'accel' && st.phase === 'cruise' && near && game.hud) game.hud.addMessage(`Next stop: ${st.dest.name}. Cruising at ${SCHEDULE.vmax} blocks per second.`);
    }
    this.preloadAhead();
  }

  // While the player rides, generate + light the chunks the train is about to reach (both track rows and one row
  // on each side) so nothing is missing under the train; bounded per tick so the sim never stalls.
  preloadAhead() {
    const game = this.game;
    if (!game || !game.terrain || !game.world || !this.isPlayerRiding()) return;
    const st = this.state;
    if (st.v === 0) return;
    const terrain = game.terrain, world = game.world;
    const dir = st.v > 0 ? 1 : -1;
    const front = dir > 0 ? this.cur.x + this.grid.w : this.cur.x;
    const cxFront = Math.floor(front / CS), pcx = Math.floor(game.player.pos.x / CS);
    const maxLead = terrain.renderDistance + 3; // stay inside the unload radius (renderDistance + 4)
    const t0 = performance.now();
    let done = 0;
    for (let k = 0; k <= 9 && done < 3; k++) {
      const cx = cxFront + dir * k;
      if (Math.abs(cx - pcx) > maxLead) break;
      for (const cz of [-1, 0, -2, 1]) {
        const c = world.getChunk(cx, cz);
        if (c && c.generated && c.lit) continue;
        if (done > 0 && performance.now() - t0 > 3) return;
        terrain.ensureChunk(cx, cz);
        done++;
        this.preloadStats.chunks++;
      }
    }
    this.preloadStats.ms += performance.now() - t0;
  }

  update(dt, alpha, camera) {
    super.update(dt, alpha, camera);
    this.updateAudio();
  }

  updateAudio() {
    const audio = this.game && this.game.audio;
    if (!audio || !audio.ctx) return;
    const L = audio.listener, b = this.bounds;
    if (!b) return;
    const px = Math.max(b.x0, Math.min(b.x1, L.x)), py = Math.max(b.y0, Math.min(b.y1, L.y)), pz = Math.max(b.z0, Math.min(b.z1, L.z));
    const [g, pan] = audio.spatial({ x: px, y: py, z: pz }, 150);
    const f = Math.min(1, Math.abs(this.state.v) / SCHEDULE.vmax);
    if (g > 0.002 && audio.enabled) {
      if (!this.humOn) {
        audio.loopStart('trainHum', { kind: 'osc', type: 'sine', freq: 44, cutoff: 220, q: 0.9, gain: 0 });
        audio.loopStart('trainWind', { kind: 'noise', filter: 'lowpass', cutoff: 260, q: 0.6, gain: 0 });
        this.humOn = true;
      }
      const inside = this.isPlayerRiding() ? 0.7 : 1; // hull damps the hum for passengers
      audio.loopSet('trainHum', { freq: 44 + 48 * f, cutoff: 200 + 500 * f, gain: g * (0.09 + 0.13 * f) * inside, pan }, 0.2);
      audio.loopSet('trainWind', { gain: g * 0.2 * f * f * inside, cutoff: 240 + 1400 * f, rate: 0.8 + 0.5 * f, pan }, 0.2);
    } else if (this.humOn) {
      audio.loopStop('trainHum', 0.8); audio.loopStop('trainWind', 0.8); this.humOn = false;
    }
  }

  onRemove(game) {
    super.onRemove(game);
    if (this.humOn && game.audio) { game.audio.loopStop('trainHum'); game.audio.loopStop('trainWind'); this.humOn = false; }
  }

  // debugging / tests
  get drawCalls() { return this.meshes.filter((m) => m.visible).length; }
  info() {
    const st = this.state;
    return { x0: st.x0, v: st.v, phase: st.phase, at: st.at ? st.at.name : null, dest: st.dest.name, doorsOpen: st.doorsOpen, cycleT: st.cycleT, riding: this.isPlayerRiding(), draws: this.drawCalls, cells: this.grid.count(), faces: this.meshes.reduce((n, m) => n + (m.userData.faces || 0), 0), preload: this.preloadStats };
  }
}
