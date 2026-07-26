// Per-room prop placement (Fable 3 domain). Everything is driven by src/map/layout.js rects.
// Rules honored here:
//   - interior wall faces sit 0.08 m off rect lines (0.17 exterior) — props keep clear;
//   - walkways stay >= 0.9 m, doorway aprons stay empty;
//   - the two escort routes (server->it->sc->garage, exec->stair-a->sc->garage) stay walkable;
//   - enemy patrol waypoints in layout.js keep >= 0.4 m clearance from prop colliders.
// Geometry merges into three zone buckets (ground-service / ground-public / upper) so the whole
// prop pass costs ~3 meshes per material and culls per zone.
import * as THREE from 'three';
import { Bucket, Kit, Frame } from './kit.js';
import * as P from './library.js';
import { getArt } from './signage.js';
import { placeDecals } from './decals.js';
import { PLANTERS } from '../map/atrium.js';

const D2R = Math.PI / 180;
const Y1 = 3.6; // upper floor y

export function placeAll(scene, world) {
  const art = getArt();
  const zones = {
    gService: new Kit({ bucket: new Bucket('props-gs'), world }),
    gPublic: new Kit({ bucket: new Bucket('props-gp'), world }),
    upper: new Kit({ bucket: new Bucket('props-f1'), world }),
  };
  const fr = (kit, x, y, z, deg = 0) => new Frame(kit, x, y, z, deg * D2R);
  const gs = (x, z, deg) => fr(zones.gService, x, 0, z, deg);
  const gp = (x, z, deg) => fr(zones.gPublic, x, 0, z, deg);
  const up = (x, z, deg) => fr(zones.upper, x, Y1, z, deg);

  // --- shared compound: desk + chair + monitor + keyboard (chair sits at local +Z) ---
  function deskCluster(f, { dual = false, variant = 0, w = 1.4, phone = false, plantP = false, tower = false, lamp = false, papers = 0 } = {}) {
    P.desk(f, { w });
    P.monitor(f, { at: [0.08, 0.75, -0.16], dual, variant });
    P.keyboard(f, { at: [0, 0.745, 0.12], ry: Math.PI });
    P.taskChair(f.sub(0, 0.78, Math.PI + (variant % 3 - 1) * 0.3));
    if (phone) P.deskPhone(f, { at: [-0.5, 0.745, -0.05], ry: Math.PI * 0.9 });
    if (plantP) P.deskPlant(f, { at: [w / 2 - 0.16, 0.745, -0.2] });
    if (tower) P.towerPC(f, { at: [w / 2 + 0.18, 0, -0.1] });
    if (lamp) P.deskLamp(f, { at: [-w / 2 + 0.2, 0.745, -0.2] });
    if (papers) P.paperStack(f, { at: [-0.42, 0.745, 0.16], n: papers });
  }

  // --- cubicle pod: 2x2 bays around a fabric-panel spine ---
  function pod(F, cx, cz, seed) {
    P.cubiclePanel(F(cx, cz, 0), { len: 4.0 });                       // spine
    for (const s of [-1, 1]) {
      P.cubiclePanel(F(cx, cz + s * 0.875, 90), { len: 1.7 });        // center dividers
      P.cubiclePanel(F(cx - 1.95, cz + s * 0.875, 90), { len: 1.7 }); // west caps
      P.cubiclePanel(F(cx + 1.95, cz + s * 0.875, 90), { len: 1.7 }); // east caps
    }
    let v = seed;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      P.cubicleBay(F(cx + sx * 0.975, cz + sz * 1.0, sz > 0 ? 0 : 180), { variant: v, chairA: (v % 3 - 1) * 0.5 });
      v++;
    }
  }

  // =========================================================================
  // GROUND FLOOR — SERVICE SIDE
  // =========================================================================
  // --- garage [0,0,14,12] — extraction; van parked west of the zone center ---
  P.responseVan(gs(3.6, 5.4, 180));
  P.desk(gs(11.5, 0.62, 0), { w: 1.8, d: 0.7, top: 'wood', legs: 'paintedMetal', modesty: false }); // workbench
  P.toolCase(gs(11.5, 0.62, 0), { at: [0.45, 0.74, 0], ry: 0.4 });
  P.shelfUnit(gs(0.45, 2.5, 90), { fill: 'boxes', seed: 3 });
  P.ladder(gs(0.5, 7.6, 90));
  P.warningCone(gs(6.4, 1.6, 0));
  P.warningCone(gs(8.0, 9.2, 0));
  P.handTruck(gs(12.7, 10.5, 150));
  for (let i = 0; i < 3; i++) zones.gService.cyl('rubber', 0.34, 0.24, 0.95, i * 0.24, 4.6, { seg: 12 }); // tire stack
  zones.gService.collide(0.95, 4.6, 0.7, 0.7, 0.75, { material: 'metal', blockSight: false });
  P.fireExtinguisher(gs(10.2, 11.83, 180), { at: [0, 1.0, 0], cabinet: true });

  // --- loading [14,0,30,12] ---
  P.pallet(gs(15.6, 2.0, 6));
  P.cardboardBox(gs(15.4, 1.8, 20), { w: 0.5, h: 0.4 });
  gs(15.9, 2.3, -35).box('cardboard', 0.42, 0.3, 0.36, 0, 0.12, 0); // box on pallet
  P.crate(gs(28.8, 2.2, 0));
  P.crate(gs(28.8, 3.6, 4), { h: 0.7 });
  gs(28.75, 3.6, 12).box('wood', 0.7, 0.5, 0.6, 0, 0.7, 0); // small crate stacked
  P.dockBumper(gs(17.6, 0.26, 0), { at: [0, 0.35, 0] });
  P.dockBumper(gs(20.4, 0.26, 0), { at: [0, 0.35, 0] });
  P.handTruck(gs(21.6, 1.3, 210));
  P.shelfUnit(gs(24.5, 11.6, 180), { w: 1.1, fill: 'boxes', seed: 8 });
  // drum cluster
  for (const [dx, dz] of [[29.3, 7.0], [29.35, 7.75], [28.65, 7.35]]) {
    zones.gService.cyl('paintedMetalRed', 0.28, 0.88, dx, 0, dz, { seg: 12 });
  }
  zones.gService.collide(29.0, 7.35, 1.3, 1.3, 0.9, { material: 'metal', blockSight: false });
  P.pallet(gs(27.4, 10.8, -8));
  P.poster(fr(zones.gService, 22.4, 1.15, 11.91, 180), { uvRect: art.uv.safety, w: 0.5, h: 0.7 });
  P.fireExtinguisher(gs(29.5, 11.84, 180), { at: [0, 0.75, 0] });

  // --- mech [30,0,38,12] ---
  P.transformerCabinet(gs(31.05, 1.6, 90));
  P.hvacUnit(gs(35.3, 1.4, 0));
  P.electricalPanel(gs(30.18, 6.5, 90), { at: [0, 1.0, 0] });
  P.electricalPanel(gs(30.18, 8.2, 90), { at: [0, 1.2, 0], w: 0.4, h: 0.5 });
  P.pipeRun(gs(30.38, 6.0, 90), { len: 8, valves: 2 });
  P.pipeRun(gs(30.52, 6.0, 90), { len: 8, r: 0.035, valves: 0 });
  P.pipeRun(gs(34.0, 11.68, 0), { len: 7, valves: 1 });
  P.ductRun(gs(34.0, 4.0, 0), { len: 6 });
  P.ductRun(gs(36.5, 4.0, 90), { len: 5, w: 0.4 });
  P.shelfUnit(gs(37.4, 11.62, 180), { fill: 'chem', seed: 5 });
  P.toolCase(gs(31.8, 4.0, 0), { at: [0, 0, 0], ry: 0.7 });
  P.warningCone(gs(33.0, 9.2, 0));
  P.mopBucket(gs(30.6, 10.6, 0), { at: [0, 0, 0] });
  P.floorDrain(gs(34, 7, 0), { at: [0, 0] });
  P.fireExtinguisher(gs(36.0, 11.83, 180), { at: [0, 1.0, 0], cabinet: true });

  // --- server [38,0,48,10] — hostage A at (45.5, 3) ---
  const rackSeeds = [11, 23, 37, 51, 67, 83];
  [[39.4, 2.1, 0], [40.4, 2.1, 0], [41.4, 2.1, 0], [42.4, 2.1, 0]].forEach(([x, z, d], i) => P.serverRack(gs(x, z, d), { seed: rackSeeds[i] }));
  P.serverRack(gs(38.7, 7.5, 180), { seed: rackSeeds[4] });
  P.serverRack(gs(39.7, 7.5, 180), { seed: rackSeeds[5] });
  P.networkCabinet(gs(47.3, 0.55, 0));
  P.upsUnit(gs(46.2, 0.5, 0), { at: [0, 0, 0] });
  P.cableTray(fr(zones.gService, 40.9, 2.5, 2.1, 0), { len: 3.2 });
  P.cableTray(fr(zones.gService, 39.2, 2.5, 7.5, 0), { len: 2.4 });
  // hostage-holding evidence: dragged chair, tools, drink refuse
  P.stackChair(gs(44.9, 2.3, 205));
  P.toolCase(gs(46.3, 3.9, 0), { at: [0, 0, 0], ry: -0.5 });
  P.bottle(gs(46.0, 2.4, 0), { at: [0, 0, 0] });
  P.sodaCan(gs(46.25, 2.55, 0), { at: [0, 0, 0] });
  P.tapeDispenser(gs(45.4, 3.7, 0), { at: [0, 0, 0], ry: 1.1 });
  P.folderStack(gs(44.6, 3.4, 0), { at: [0, 0, 0], n: 3 });
  // WP-012b: reads instantly as a holding site — snipped zip ties by the hostage, a second
  // chair shoved to face the far corner, the guard's stool with a magazine tossed on it
  P.zipTies(gs(45.5, 2.7, 0), { at: [0, 0, 0], n: 4 });
  P.stackChair(gs(47.3, 8.9, 32));
  P.stool(gs(44.0, 4.4, 0));
  P.magazine(gs(44.0, 4.4, -70), { at: [0, 0.565, 0] });

  // --- it [38,10,48,18] --- (desks back onto the z=10 wall, chairs on the room side)
  deskCluster(gs(45.8, 10.75, 0), { dual: true, variant: 0, tower: true, papers: 2 });
  deskCluster(gs(39.3, 10.75, 0), { dual: false, variant: 3, phone: true, tower: true });
  P.laptop(gs(45.15, 10.7, 15), { at: [0, 0.75, 0], variant: 1 });
  P.networkCabinet(gs(39.0, 17.55, 0));
  P.shelfUnit(gs(46.9, 17.6, 180), { fill: 'boxes', seed: 12 });
  P.upsUnit(gs(47.4, 10.6, 0), { at: [0, 0, 0] });
  P.trashBin(gs(44.6, 11.0, 0));
  P.cardboardBox(gs(38.6, 16.4, 25), { w: 0.5, open: true });
  P.wallSign(fr(zones.gService, 43.4, 1.5, 10.09, 0), { uvRect: art.uv.dept.server, w: 0.7, h: 0.155 });

  // --- service corridor [0,12,38,15] — patrol spine, wall dressing only ---
  P.fireExtinguisher(gs(13.4, 12.2, 0), { at: [0, 1.0, 0], cabinet: true });
  P.fireExtinguisher(gs(31.8, 14.84, 180), { at: [0, 0.75, 0] });
  P.pipeRun(fr(zones.gService, 19.0, 2.5, 14.78, 0), { len: 10, valves: 0 });
  P.cableTray(fr(zones.gService, 28.0, 2.55, 12.32, 0), { len: 8 });
  P.cardboardBox(gs(36.6, 12.45, 8), { w: 0.45 });
  gs(36.15, 12.45, -12).box('cardboard', 0.4, 0.26, 0.34, 0, 0, 0);
  P.floorMat(gs(0.8, 13.5, 90), { w: 1.4, d: 1.0 });
  P.wallSign(fr(zones.gService, 9.6, 1.55, 12.09, 0), { uvRect: art.uv.dept.garage, w: 0.62, h: 0.14 });
  P.wallSign(fr(zones.gService, 21.7, 1.55, 12.09, 0), { uvRect: art.uv.dept.loading, w: 0.72, h: 0.16 });
  P.wallSign(fr(zones.gService, 34.5, 1.55, 12.09, 0), { uvRect: art.uv.dept.mech, w: 0.62, h: 0.14 });
  P.wallSign(fr(zones.gService, 11.85, 1.55, 14.915, 180), { uvRect: art.uv.dept.janitor, w: 0.55, h: 0.13 });
  P.wallSign(fr(zones.gService, 18.4, 1.5, 14.915, 180), { uvRect: art.uv.directional2, w: 0.85, h: 0.37 });
  P.poster(fr(zones.gService, 6.0, 1.0, 14.915, 180), { uvRect: art.uv.evac, w: 0.45, h: 0.62 });
  P.emergencyLight(fr(zones.gService, 2.0, 2.55, 12.14, 0), { at: [0, 0, 0] });
  P.emergencyLight(fr(zones.gService, 30.0, 2.55, 14.86, 180), { at: [0, 0, 0] });

  // --- janitor [8,15,14,18] ---
  P.janitorCart(gs(11.6, 16.8, 40));
  P.mopBucket(gs(8.8, 16.2, 0), { at: [0, 0, 0] });
  P.shelfUnit(gs(9.3, 17.5, 180), { fill: 'chem', seed: 9 });
  P.shelfUnit(gs(12.7, 17.5, 180), { w: 0.8, fill: 'boxes', seed: 4 });
  P.floorDrain(gs(10.2, 16.4, 0), { at: [0, 0] });
  P.warningCone(gs(9.9, 15.6, 0));

  // =========================================================================
  // GROUND FLOOR — PUBLIC SIDE
  // =========================================================================
  // --- break room [0,15,8,24] ---
  P.kitchenRun(gp(0.2, 15.45, 0), { len: 3.4 });
  P.microwave(gp(2.55, 15.42, 0), { at: [0, 0.9, 0] });
  P.coffeeMachine(gp(1.65, 15.4, 0), { at: [0, 0.9, 0] });
  P.kettle(gp(3.3, 15.38, 0), { at: [0, 0.9, 0] });
  P.mug(gp(2.15, 0, 0), { at: [0, 0.9, 15.4] });
  P.mug(gp(3.02, 0, 0), { at: [0, 0.9, 15.44], mat: 'paintedMetalRed' });
  P.fridge(gp(7.35, 15.95, 270));
  P.vendingMachine(gp(7.4, 20.0, 270));
  P.waterCooler(gp(7.6, 22.3, 270));
  for (const [tx, tz, a] of [[2.6, 19.3, 10], [5.2, 21.3, 205], [2.8, 22.6, 120]]) {
    P.cafeTable(gp(tx, tz, 0));
    P.stackChair(gp(tx - 0.62, tz + 0.1, 80 + a % 40));
    P.stackChair(gp(tx + 0.6, tz - 0.15, 250 + a % 30));
    if (a > 100) P.stackChair(gp(tx + 0.15, tz + 0.62, 190));
    P.sodaCan(gp(tx, 0, 0), { at: [0.12, 0.75, tz - 0.1] });
  }
  P.mug(gp(2.62, 0, 0), { at: [0, 0.75, 19.36], full: true }); // fresh coffee — someone just left
  // WP-012b warm pocket: interrupted lunch at the near table + a jacket left behind
  P.snackPlate(gp(2.42, 0, 0), { at: [0, 0.75, 19.1], ry: 0.7 });
  P.jacketOnChair(gp(1.98, 19.4, 90), { top: 0.76, back: -0.2, mat: 'upholstery' });
  P.snakePlant(gp(0.55, 18.2, 0));
  P.trashBin(gp(0.55, 23.2, 0));
  P.trashBin(gp(1.15, 23.25, 0), { recycle: true });
  P.noticeBoard(fr(zones.gPublic, 3.4, 1.05, 23.9, 180), { w: 1.4 });
  P.wallClock(fr(zones.gPublic, 5.8, 2.3, 15.09, 0));
  P.wallDispenser(fr(zones.gPublic, 0.25, 0, 16.6, 90), { at: [0, 1.2, 0] });
  P.paperTowel(fr(zones.gPublic, 0.25, 0, 17.3, 90), { at: [0, 1.15, 0] });
  // wall TV (east wall) with news frame
  {
    const f = fr(zones.gPublic, 7.9, 1.55, 18.1, 270);
    f.box('electronics', 1.1, 0.66, 0.06, 0, 0, 0, { bevel: 0.01 });
    f.quad(art.screenMat, 1.02, 0.58, 0, 0.04, 0.033, { uv: art.uv.breakTv });
  }

  // --- restroom M [8,18,14,24] ---
  P.vanity(gp(8.38, 20.6, 90), { sinks: 2 });
  P.stallRun(gp(12.2, 18.83, 0), { stalls: 2 });
  P.handDryer(fr(zones.gPublic, 13.85, 0, 22.5, 270), { at: [0, 1.15, 0] });
  P.wallDispenser(fr(zones.gPublic, 8.14, 0, 19.3, 90), { at: [0, 1.1, 0] });
  P.trashBin(gp(8.6, 23.2, 0), { r: 0.14, h: 0.5 });
  P.floorDrain(gp(11, 21.5, 0), { at: [0, 0] });

  // --- restroom W [0,24,6,29] ---
  P.vanity(gp(2.8, 24.38, 0), { sinks: 2 });
  P.stallRun(gp(0.87, 27.0, 90), { stalls: 2 });
  P.handDryer(fr(zones.gPublic, 3.2, 0, 28.85, 180), { at: [0, 1.15, 0] });
  P.wallDispenser(fr(zones.gPublic, 4.6, 0, 24.14, 0), { at: [0, 1.1, 0] });
  P.trashBin(gp(5.4, 28.5, 0), { r: 0.14, h: 0.5 });
  P.floorDrain(gp(2, 27, 0), { at: [0, 0] });

  // --- lobby [6,24,34,32]+[20,32,34,36] — reception hero + struggle storytelling ---
  P.receptionDesk(gp(17, 26.9, 0));
  P.brochureHolder(gp(16.3, 27.42, 0), { at: [0, 1.17, 0] });
  // struggle: tipped chair + scattered papers (decals) near the vestibule
  P.tippedChair(gp(19.6, 30.5, 25));
  P.briefcase(gp(20.9, 30.9, 70), { at: [0, 0, 0] });
  // west seating nook
  P.sofa(gp(9.5, 25.0, 0), { seats: 2 });
  P.coffeeTable(gp(9.5, 26.15, 0));
  P.paperStack(gp(9.5, 0, 0), { at: [0.2, 0.43, 26.1], n: 2 });
  P.floorPlant(gp(6.8, 30.8, 0));
  // gallery lounge (south leg)
  P.sofa(gp(24, 33.6, 0), { seats: 3 });
  P.coffeeTable(gp(24, 34.75, 0));
  P.brochureHolder(gp(24.3, 0, 0), { at: [0, 0.44, 34.72], ry: 0.4 });
  P.floorPlant(gp(33.2, 35.2, 0));
  P.umbrellaStand(gp(20.45, 32.7, 0));
  P.coatRack(gp(20.55, 33.6, 0));
  P.trashBin(gp(33.4, 32.3, 0));
  P.floorMat(gp(17, 31.1, 0), { w: 1.9, d: 1.2 });
  P.wallSign(fr(zones.gPublic, 12.2, 1.62, 24.085, 0), { uvRect: art.uv.dept.reception, w: 0.72, h: 0.16 });
  P.wallSign(fr(zones.gPublic, 27.2, 1.55, 24.085, 0), { uvRect: art.uv.directional, w: 0.85, h: 0.37 });
  P.wallSign(fr(zones.gPublic, 25.35, 1.6, 24.085, 0), { uvRect: art.uv.roomPlate[0], w: 0.2, h: 0.09 });
  P.wallClock(fr(zones.gPublic, 33.91, 2.3, 25.3, 270));
  // planter greenery (architectural boxes from Fable 2)
  for (const pl of PLANTERS) {
    const kit = pl.floor ? zones.upper : zones.gPublic;
    P.planterPlants(new Frame(kit, pl.x, pl.floor ? Y1 : 0, pl.z, 0));
  }

  // --- vestibule [14,32,20,36] ---
  P.floorMat(gp(17, 33.0, 0), { w: 1.9, d: 1.2 });
  P.floorMat(gp(17, 35.0, 0), { w: 1.9, d: 1.2 });
  P.warningCone(gp(15.2, 32.8, 0));
  // WP-012b snow-wet transition: tracked-in clumps melting off the mats, and the wet-floor
  // A-frame facilities put out just inside the lobby door
  P.snowClump(gp(16.5, 35.55, 0), { at: [0, 0, 0], s: 1.2 });
  P.snowClump(gp(17.6, 35.3, 0), { at: [0, 0, 0] });
  P.snowClump(gp(17.15, 34.35, 0), { at: [0, 0, 0], s: 0.8 });
  P.snowClump(gp(16.6, 32.5, 0), { at: [0, 0, 0], s: 0.7 });
  P.snowClump(gp(17.4, 31.75, 0), { at: [0, 0, 0], s: 0.55 });
  P.wetFloorSign(gp(15.9, 31.2, -35), { at: [0, 0, 0] });

  // --- waiting [34,24,48,36] ---
  P.sofa(gp(38.6, 34.55, 180), { seats: 3 });
  P.sofa(gp(35.6, 31.2, 90), { seats: 2 });
  P.coffeeTable(gp(37.2, 32.9, 15));
  P.paperStack(gp(37.2, 0, 0), { at: [-0.2, 0.43, 32.85], n: 3, ry: 0.8 });
  P.brochureHolder(gp(37.45, 0, 0), { at: [0, 0.44, 33.05], ry: -0.3 });
  P.floorPlant(gp(34.6, 35.2, 0));
  P.floorPlant(gp(47.3, 24.8, 0));
  P.snakePlant(gp(47.45, 29.5, 0)); // WP-012b species variety under the east window
  P.trashBin(gp(47.4, 35.2, 0));
  P.waterCooler(gp(34.4, 24.6, 0));
  {
    const f = fr(zones.gPublic, 45.0, 1.15, 24.14, 0); // lobby news display
    P.confDisplay(f, { w: 1.6 });
  }
  P.wallClock(fr(zones.gPublic, 41.5, 2.3, 24.09, 0));
  P.poster(fr(zones.gPublic, 43.0, 1.1, 24.09, 0), { uvRect: art.uv.photo, w: 0.85, h: 0.6 });

  // --- corr-e [38,18,48,24] ---
  P.filingCabinet(gp(44.3, 23.55, 180));
  P.filingCabinet(gp(44.85, 23.55, 180));
  P.deskPlant(gp(44.3, 0, 0), { at: [0, 1.33, 23.55] });
  P.floorPlant(gp(47.5, 23.3, 0));
  P.wallClock(fr(zones.gPublic, 43, 2.25, 18.09, 0));
  P.poster(fr(zones.gPublic, 45.6, 1.1, 18.09, 0), { uvRect: art.uv.safety, w: 0.45, h: 0.62 });
  P.wallSign(fr(zones.gPublic, 39.8, 1.55, 18.09, 0), { uvRect: art.uv.dept.it, w: 0.6, h: 0.14 });
  P.wallSign(fr(zones.gPublic, 37.92, 1.55, 19.4, 270), { uvRect: art.uv.dept.copy, w: 0.62, h: 0.14 });
  P.wallSign(fr(zones.gPublic, 37.92, 1.28, 19.4, 270), { uvRect: art.uv.roomPlate[1], w: 0.2, h: 0.09 });

  // --- copy [34,15,38,24] ---
  P.copier(gp(34.85, 17.5, 90));
  P.desk(gp(34.78, 20.8, 90), { w: 1.5, top: 'laminateWhite' });
  P.printerSmall(gp(34.78, 20.5, 90), { at: [0, 0.74, 0] });
  P.paperStack(gp(34.75, 0, 0), { at: [0, 0.75, 21.5], n: 4 });
  P.fernPlant(gp(34.78, 0, 0), { at: [0, 0.75, 20.12], s: 0.7 }); // WP-012b
  P.shelfUnit(gp(36.4, 15.4, 0), { fill: 'boxes', seed: 6 });
  P.shelfUnit(gp(36.4, 23.6, 180), { fill: 'binders', seed: 2 });
  P.cardboardBox(gp(34.5, 22.6, 10), { w: 0.5 });
  P.cardboardBox(gp(35.1, 22.7, -20), { w: 0.45, h: 0.3 });
  gp(34.8, 22.65, 30).box('cardboard', 0.4, 0.28, 0.34, 0, 0.32, 0);
  P.trashBin(gp(37.4, 15.6, 0), { recycle: true });
  P.trashBin(gp(37.4, 16.2, 0));

  // --- security office [20,15,28,24] — occupied guard post ---
  P.secMonitorWall(gp(20.24, 19.5, 90));
  {
    const f = gp(21.55, 19.5, 90); // desk cluster facing the monitor wall
    P.desk(f, { w: 1.6 });
    P.monitor(f, { at: [-0.35, 0.75, -0.14], variant: 3 });
    P.keyboard(f, { at: [-0.3, 0.745, 0.14], ry: Math.PI });
    P.taskChair(f.sub(0.1, 0.8, Math.PI - 0.4));
    P.deskPhone(f, { at: [0.55, 0.745, -0.1], ry: Math.PI });
    P.mug(f, { at: [0.35, 0.75, 0.2], full: true }); // still-full coffee in the monitor glow
    P.paperStack(f, { at: [0.62, 0.745, 0.25], n: 3 });
  }
  // WP-012b: the guards were taken mid-shift — chair knocked over behind the console,
  // second coffee and half a sandwich abandoned at the corner table, jacket never picked up
  P.tippedChair(gp(23.4, 20.6, 250));
  P.mug(gp(26.5, 0, 0), { at: [0.18, 0.75, 22.55], mat: 'paintedMetalRed', full: true });
  P.snackPlate(gp(26.5, 0, 0), { at: [-0.12, 0.75, 22.8], ry: 2.1 });
  P.jacketOnChair(gp(27.1, 23.1, 300), { top: 0.76, back: -0.2 });
  P.filingCabinet(gp(26.55, 15.65, 0));
  P.filingCabinet(gp(27.1, 15.65, 0));
  P.mug(gp(26.55, 0, 0), { at: [0, 1.33, 15.65], mat: 'plasticWhite' });
  P.binderRow(gp(26.9, 0, 0), { at: [0, 1.33, 15.7], n: 3 });
  P.cafeTable(gp(26.5, 22.7, 0));
  P.stackChair(gp(25.9, 22.3, 130));
  P.stackChair(gp(27.1, 23.1, 300));
  P.backpack(gp(20.4, 22.5, 100), { at: [0, 0, 0] });
  P.whiteboard(fr(zones.gPublic, 27.9, 1.0, 19.5, 270), { w: 1.6, variant: 1 });
  P.poster(fr(zones.gPublic, 22.0, 1.1, 15.09, 0), { uvRect: art.uv.evac, w: 0.45, h: 0.62 });
  P.wallSign(fr(zones.gPublic, 25.9, 1.6, 24.085, 0), { uvRect: art.uv.dept.security, w: 0.7, h: 0.155 });

  // =========================================================================
  // UPPER FLOOR
  // =========================================================================
  const F1 = (x, z, deg) => up(x, z, deg);

  // --- open office [0,0,28,15]+[0,15,14,21] — the cubicle field ---
  pod(F1, 5, 4, 0);
  pod(F1, 11, 4, 4);
  pod(F1, 17, 4, 8);
  pod(F1, 23, 4, 12);
  pod(F1, 5, 10, 16);
  pod(F1, 11, 10, 20);
  pod(F1, 17, 10, 24);
  pod(F1, 23, 10, 28);
  // WP-012b warm pocket: the SE bay of pod (17,10) was clearly just occupied — running fan,
  // open laptop, family photos, half-eaten snack, fresh coffee, jacket over the chair
  P.deskFan(up(18.7, 10.55, -30), { at: [0, 0.745, 0] });
  P.laptop(up(17.45, 10.5, 190), { at: [0, 0.745, 0], variant: 4 });
  P.photoFrame(up(17.75, 0, 0), { at: [0, 0.75, 10.38], ry: 0.3 });
  P.photoFrame(up(17.9, 0, 0), { at: [0, 0.75, 10.44], ry: -0.25 });
  P.snackPlate(up(18.55, 0, 0), { at: [0, 0.75, 10.66], ry: 3.6 });
  P.mug(up(17.7, 0, 0), { at: [0, 0.75, 10.62], full: true });
  P.jacketOnChair(up(18.075, 11.28, 151.4));
  // south support strip (z 13..15): filing + shared gear against the z15 wall (x14..28)
  P.filingCabinet(F1(16.2, 14.55, 180));
  P.filingCabinet(F1(16.75, 14.55, 180));
  P.filingCabinet(F1(17.3, 14.55, 180));
  P.deskPlant(F1(16.75, 0, 0), { at: [0, 1.33, 14.55] });
  P.printerSmall(F1(19.2, 14.6, 180), { at: [0, 0.4, 0] });
  F1(19.2, 14.6, 0).box('metalBlack', 0.55, 0.4, 0.5, 0, 0, 0, { bevel: 0.01 }); // printer stand
  P.waterCooler(F1(26.6, 14.55, 180));
  P.trashBin(F1(25.9, 14.6, 0), { recycle: true });
  P.wallClock(fr(zones.upper, 17.9, Y1 + 2.15, 15.09, 0));
  // annex (x0..14, z15..21): collab corner
  P.filingCabinet(F1(0.55, 16.4, 90));
  P.filingCabinet(F1(0.55, 16.95, 90));
  P.filingCabinet(F1(0.55, 17.5, 90), { drawers: 2 });
  P.cafeTable(F1(4.0, 19.0, 0));
  P.stackChair(F1(3.4, 18.6, 120));
  P.stackChair(F1(4.65, 19.3, 290));
  P.stackChair(F1(3.9, 19.75, 185));
  P.whiteboard(fr(zones.upper, 13.9, Y1 + 0.9, 18.0, 270), { w: 1.8, variant: 0 });
  P.coatRack(F1(1.0, 20.3, 0));
  P.floorPlant(F1(12.9, 20.3, 0));
  P.poster(fr(zones.upper, 4.0, Y1 + 1.1, 20.91, 180), { uvRect: art.uv.safety, w: 0.45, h: 0.62 });
  P.backpack(F1(3.0, 18.55, 200), { at: [0, 0, 0], mat: 'drywallBlue' });

  // --- print & supply [20,15,28,24] ---
  P.copier(up(20.65, 17.5, 90));
  P.shelfUnit(up(27.5, 16.9, 270), { fill: 'boxes', seed: 14 });
  P.shelfUnit(up(27.5, 17.9, 270), { fill: 'binders', seed: 7 });
  P.desk(up(24, 18.6, 0), { w: 1.6, top: 'laminateWhite' });
  P.printerSmall(up(24, 18.6, 0), { at: [-0.3, 0.74, 0] });
  P.paperStack(up(24, 0, 0), { at: [0.35, 0.745, 18.6], n: 5, ry: 0.1 });
  P.cardboardBox(up(26.9, 22.8, 15), { w: 0.5, open: true });
  P.cardboardBox(up(26.3, 22.85, -10), { w: 0.42, h: 0.3 });
  P.trashBin(up(21.0, 22.5, 0), { recycle: true });
  P.trashBin(up(21.55, 22.55, 0));
  P.wallSign(fr(zones.upper, 26.5, Y1 + 1.55, 15.09, 0), { uvRect: art.uv.dept.print, w: 0.62, h: 0.14 });

  // --- conference [28,0,40,10] ---
  P.confTable(up(35.8, 4.2, 0), { l: 3.6, w: 1.3 });
  for (const cx of [34.6, 35.7, 36.8]) {
    P.taskChair(up(cx, 3.35, 5));
    P.taskChair(up(cx + 0.25, 5.05, 182));
  }
  P.taskChair(up(37.9, 4.2, 95));
  P.taskChair(up(33.6, 4.25, 268));
  {
    const f = fr(zones.upper, 28.16, Y1 + 0.85, 5.0, 90);
    P.confDisplay(f, { w: 2.2 });
  }
  P.projector(up(35.8, 4.2, 0), { at: [0, 2.15, 0] });
  P.whiteboard(fr(zones.upper, 39.9, Y1 + 0.9, 4.0, 270), { w: 1.8, variant: 1 });
  P.filingCabinet(up(30.3, 0.62, 0), { drawers: 2 });
  P.filingCabinet(up(30.85, 0.62, 0), { drawers: 2 });
  P.deskPlant(up(30.3, 0, 0), { at: [0, 0.73, 0.62] });
  P.bottle(up(35.2, 0, 0), { at: [0, 0.74, 4.0] });
  P.bottle(up(36.3, 0, 0), { at: [0, 0.74, 4.5] });
  P.mug(up(34.9, 0, 0), { at: [0, 0.74, 4.6] });
  P.paperStack(up(36.6, 0, 0), { at: [0, 0.74, 3.9], n: 2, ry: 1.2 });
  P.floorPlant(up(29.0, 9.2, 0));

  // --- records [40,0,48,10] — rolling archive, one aisle open ---
  P.archiveRack(up(43.8, 1.5, 0), { seed: 3 });
  P.archiveRack(up(43.8, 2.55, 0), { seed: 11 });
  P.archiveRack(up(43.8, 3.6, 0), { seed: 19 });
  P.desk(up(46.4, 8.8, 180), { w: 1.3, top: 'laminate' });
  P.taskChair(up(46.4, 7.95, 350));
  P.deskLamp(up(46.4, 8.8, 180), { at: [-0.4, 0.745, -0.1] });
  P.paperStack(up(46.4, 0, 0), { at: [0.3, 0.745, 8.85], n: 4, ry: 0.5 });
  P.cardboardBox(up(40.7, 0.9, 12), { w: 0.5 });
  P.cardboardBox(up(41.35, 0.85, -18), { w: 0.45, h: 0.28 });
  P.ladder(up(47.5, 1.4, 270), { lean: 0.16 });
  P.trashBin(up(47.4, 9.3, 0));

  // --- corr-n [28,10,48,13] ---
  P.floorPlant(up(47.5, 10.5, 0));
  P.wallSign(fr(zones.upper, 31.6, Y1 + 1.55, 10.09, 0), { uvRect: art.uv.dept.conference, w: 0.85, h: 0.19 });
  P.wallSign(fr(zones.upper, 44.9, Y1 + 1.55, 10.09, 0), { uvRect: art.uv.dept.records, w: 0.75, h: 0.165 });
  P.poster(fr(zones.upper, 41.2, Y1 + 1.05, 10.09, 0), { uvRect: art.uv.evac, w: 0.45, h: 0.62 });
  P.emergencyLight(fr(zones.upper, 30.0, Y1 + 2.3, 12.91, 180), { at: [0, 0, 0] });

  // --- exec corridor [34,13,48,17] ---
  P.coffeeTable(up(40.0, 13.42, 0), { w: 1.1, d: 0.35, h: 0.78 });
  P.photoFrame(up(39.7, 13.42, 0), { at: [0, 0.79, 0], ry: 0.3 });
  P.deskPlant(up(40.35, 0, 0), { at: [0, 0.79, 13.42] });
  P.floorPlant(up(47.5, 16.3, 0));
  P.poster(fr(zones.upper, 38.0, Y1 + 1.25, 13.09, 0), { uvRect: art.uv.photo, w: 0.8, h: 0.56 });
  P.poster(fr(zones.upper, 44.5, Y1 + 1.25, 16.91, 180), { uvRect: art.uv.photo, w: 0.8, h: 0.56 });
  P.wallSign(fr(zones.upper, 41.35, Y1 + 1.6, 16.91, 180), { uvRect: art.uv.dept.exec, w: 0.75, h: 0.165 });

  // --- assistant [34,17,40,24] --- (assistant faces the executive corridor door)
  deskCluster(up(37.3, 20.6, 0), { variant: 1, phone: true, papers: 3, lamp: true });
  // WP-012b warm pocket: the assistant stepped away seconds ago — fresh coffee, laptop still
  // open on the lock screen (on the sofa table), desk fan running, family photo, coat on chair
  P.mug(up(37.3, 0, 0), { at: [0.62, 0.75, 20.75], full: true });
  P.deskFan(up(37.84, 20.4, -35), { at: [0, 0.745, 0] });
  P.photoFrame(up(37.05, 0, 0), { at: [0, 0.75, 20.31], ry: -0.4 });
  P.jacketOnChair(up(37.3, 21.38, 180));
  P.snackPlate(up(37.68, 0, 0), { at: [0, 0.75, 20.86], ry: 1.4 });
  P.laptop(up(35.45, 21.45, 270), { at: [0, 0.44, 0], variant: 6 });
  P.fernPlant(up(39.55, 0, 0), { at: [0, 1.33, 22.62], s: 0.7 });
  P.filingCabinet(up(39.55, 22.3, 270));
  P.filingCabinet(up(39.55, 22.95, 270));
  P.sofa(up(34.55, 21.5, 90), { seats: 2, mat: 'upholsteryWarm' });
  P.coffeeTable(up(35.5, 21.5, 90), { w: 0.55, d: 0.55 });
  P.brochureHolder(up(35.5, 0, 0), { at: [0.15, 0.44, 21.66], ry: 1.2 });
  P.floorPlant(up(34.6, 23.4, 0));
  P.poster(fr(zones.upper, 39.91, Y1 + 1.15, 21.8, 270), { uvRect: art.uv.calendar, w: 0.34, h: 0.42 });
  P.wallSign(fr(zones.upper, 35.3, Y1 + 1.55, 17.09, 0), { uvRect: art.uv.roomPlate[4], w: 0.2, h: 0.09 });

  // --- executive office [40,17,48,24] — hostage B at (45.8, 21.5) ---
  {
    const f = up(44.6, 19.2, 180);
    P.deskExec(f);
    P.monitor(f, { at: [-0.4, 0.76, -0.2], variant: 1 });
    P.deskPhone(f, { at: [0.55, 0.755, -0.15], ry: Math.PI * 1.1 });
    P.deskLamp(f, { at: [0.85, 0.755, -0.25] });
    P.photoFrame(f, { at: [0.2, 0.755, -0.3], ry: 0.5 });
    P.paperStack(f, { at: [-0.75, 0.755, 0.1], n: 2, ry: -0.4 });
  }
  P.taskChair(up(44.6, 18.35, 355), { fabricMat: 'leather' });
  P.bookcase(up(46.8, 17.44, 0));
  // WP-012b: furniture shoved out of its arrangement when the room became a holding site
  P.sofa(up(40.9, 21.1, 72), { seats: 2, mat: 'upholsteryWarm' });
  P.coffeeTable(up(41.9, 21.75, 25), { w: 0.6, d: 0.6 });
  P.filingCabinet(up(43.0, 23.55, 180), { drawers: 2 });
  P.filingCabinet(up(43.55, 23.55, 180), { drawers: 2 });
  P.deskLamp(up(43.0, 0, 0), { at: [0, 0.73, 23.55], ry: 2.6 });
  P.floorPlant(up(40.6, 17.7, 0));
  // hostage-holding evidence: tipped seat, tape, refuse, dumped folders
  P.tippedChair(up(44.7, 22.45, 130));
  P.tapeDispenser(up(45.3, 22.7, 0), { at: [0, 0, 0], ry: 0.9 });
  P.folderStack(up(45.9, 22.9, 0), { at: [0, 0, 0], n: 4 });
  P.bottle(up(46.3, 22.3, 0), { at: [0, 0, 0] });
  P.sodaCan(up(45.1, 23.0, 0), { at: [0, 0, 0], mat: 'softPlastic' });
  // WP-012b: blinds pulled shut over the whole east ribbon window, zip ties at the hostage,
  // a chair turned to the corner, the watcher's stool + magazine by the door
  for (const bz of [18.75, 20.5, 22.25]) {
    P.blindsClosed(up(47.82, bz, 90), { at: [0, 0.5, 0], w: 1.7, h: 2.0 });
  }
  P.zipTies(up(45.9, 21.9, 0), { at: [0, 0, 0], n: 3 });
  P.stackChair(up(47.25, 22.95, 38));
  P.stool(up(43.2, 18.4, 0));
  P.magazine(up(43.2, 18.4, 55), { at: [0, 0.565, 0] });

  // --- HR / personnel [34,24,44,30] ---
  deskCluster(up(38.3, 25.7, 180), { variant: 2, phone: true, papers: 2 });
  deskCluster(up(41.3, 27.55, 0), { variant: 0, plantP: true });
  P.filingCabinet(up(43.55, 25.4, 270));
  P.filingCabinet(up(43.55, 25.95, 270));
  P.filingCabinet(up(43.55, 26.5, 270));
  P.binderRow(up(43.55, 0, 0), { at: [-0.12, 1.33, 25.4], n: 4, ry: Math.PI / 2 });
  P.fernPlant(up(43.55, 0, 0), { at: [0, 1.33, 26.5], s: 0.65 }); // WP-012b
  P.whiteboard(fr(zones.upper, 40.5, Y1 + 0.9, 24.095, 0), { w: 1.6, variant: 0 });
  P.noticeBoard(fr(zones.upper, 36.4, Y1 + 1.0, 29.9, 180), { w: 1.2 });
  P.trashBin(up(43.4, 29.3, 0));
  P.floorPlant(up(34.6, 29.2, 0));
  P.wallSign(fr(zones.upper, 40.4, Y1 + 1.55, 30.085, 0), { uvRect: art.uv.dept.hr, w: 0.66, h: 0.15 });
  P.wallSign(fr(zones.upper, 40.15, Y1 + 1.52, 30.085, 0), { uvRect: art.uv.roomPlate[3], w: 0.2, h: 0.09 });

  // --- upper storage [44,24,48,36] ---
  P.shelfUnit(up(45.2, 24.4, 0), { fill: 'boxes', seed: 21 });
  P.shelfUnit(up(46.3, 24.4, 0), { fill: 'boxes', seed: 33 });
  P.crate(up(46.8, 26.4, 8), { w: 0.9, h: 0.7, d: 0.8 });
  P.stackChair(up(44.8, 27.5, 75));
  P.stackChair(fr(zones.upper, 44.82, Y1 + 0.24, 27.52, 78));
  P.stackChair(up(44.85, 28.3, 100));
  // folded tables leaning on the east wall (south of the window)
  up(47.6, 33.8, 270).box('veneer', 1.3, 1.5, 0.045, 0, 0, 0.1, { rx: -0.13 });
  up(47.55, 34.6, 270).box('laminateWhite', 1.2, 1.4, 0.04, 0, 0, 0.12, { rx: -0.16 });
  zones.upper.collide(47.45, 34.2, 0.5, 1.8, 1.5, { material: 'wood', blockSight: false, y0: Y1 });
  P.cardboardBox(up(44.6, 35.35, 12), { w: 0.5 });
  P.cardboardBox(up(45.3, 35.4, -22), { w: 0.45 });
  up(44.95, 35.35, 5).box('cardboard', 0.42, 0.3, 0.36, 0, 0.34, 0);
  P.ladder(up(46.5, 35.35, 180), { lean: 0.18 });
  for (const [mx, mz] of [[47.55, 26.6], [47.4, 27.0]]) {
    zones.upper.cyl('rubber', 0.13, 0.85, mx, Y1, mz, { seg: 9 }); // rolled floor mats
  }
  P.wallSign(fr(zones.upper, 43.915, Y1 + 1.55, 31.3, 270), { uvRect: art.uv.dept.storage, w: 0.6, h: 0.135 });

  // --- quiet room [0,24,6,29] ---
  P.sofa(up(0.8, 26.5, 90), { seats: 2, mat: 'upholsteryWarm' });
  P.coffeeTable(up(1.9, 26.5, 90), { w: 0.6, d: 0.6 });
  P.mug(up(1.9, 0, 0), { at: [0.1, 0.43, 26.4] });
  P.fernPlant(up(1.9, 0, 0), { at: [-0.18, 0.43, 26.62], s: 0.6 }); // WP-012b
  P.bookcase(up(4.5, 28.68, 180), { w: 0.8, h: 1.5 });
  P.floorPlant(up(0.7, 24.7, 0));
  P.floorPlant(up(5.3, 24.7, 0));
  P.poster(fr(zones.upper, 5.91, Y1 + 1.2, 26.2, 270), { uvRect: art.uv.photo, w: 0.7, h: 0.5 });

  // --- corr-w [0,21,20,24] ---
  P.poster(fr(zones.upper, 11.5, Y1 + 1.15, 21.09, 0), { uvRect: art.uv.evac, w: 0.45, h: 0.62 });
  P.wallSign(fr(zones.upper, 17.0, Y1 + 1.55, 21.09, 0), { uvRect: art.uv.directional, w: 0.85, h: 0.37 });
  P.floorPlant(up(19.5, 23.4, 0));

  // --- mezzanine [6,24,14,30]+[6,30,44,36]+[28,24,34,30] ---
  P.cafeTable(up(8.6, 26.0, 0));
  P.stackChair(up(8.0, 25.6, 130));
  P.stackChair(up(9.2, 26.4, 300));
  P.cafeTable(up(11.6, 28.6, 0));
  P.stackChair(up(11.0, 28.2, 60));
  P.stackChair(up(12.2, 29.0, 245));
  // south gallery clusters (patrol lane at z=33 stays clear)
  P.sofa(up(12, 34.8, 180), { seats: 2 });
  P.coffeeTable(up(12, 33.95, 0));
  P.stackChair(up(10.9, 34.1, 40));
  P.sofa(up(38.5, 34.8, 180), { seats: 2 });
  P.coffeeTable(up(38.5, 34.0, 0));
  P.floorPlant(up(6.7, 30.7, 0));
  P.floorPlant(up(43.5, 35.2, 0));
  P.floorPlant(up(33.5, 25.2, 0));
  P.trashBin(up(29.0, 30.8, 0));
  P.wallClock(fr(zones.upper, 6.09, Y1 + 2.0, 27.0, 90));
  P.poster(fr(zones.upper, 9.0, Y1 + 1.2, 30.09, 0), { uvRect: art.uv.photo, w: 0.8, h: 0.56 });

  // decals last (they need only the zone kits)
  placeDecals(zones);

  // flush zone buckets into one group
  const group = new THREE.Group();
  group.name = 'props';
  for (const kit of Object.values(zones)) kit.bucket.flush(group);
  scene.add(group);
  return group;
}
