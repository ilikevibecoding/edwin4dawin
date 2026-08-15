import { Group, PlaneGeometry, Mesh } from 'three';
import { LAYOUT } from './seed.js';
import { box, cyl, roundedBox } from './geom.js';
import {
  makeAccessPanel,
  makeCableTray,
  makeFloorGrate,
  makeHandrail,
  makeJunctionBox,
  makePorthole,
  makeStraightPipe,
  makeVent,
  makeWarningPlate,
  mesh,
} from './kit.js';

function makeBlanket(mats, w, d) {
  const geo = new PlaneGeometry(w, d, 18, 14);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const fold = Math.sin(x * 9 + y * 4) * 0.012 + Math.sin(y * 11) * 0.01;
    pos.setZ(i, fold + Math.abs(x) * 0.01);
  }
  geo.computeVertexNormals();
  const m = new Mesh(geo, mats.fabric);
  m.rotation.x = -Math.PI * 0.5;
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function makePillow(mats) {
  const p = mesh(roundedBox(0.2, 0.06, 0.16, 0.03, 2), mats.fabric);
  p.scale.set(1, 0.85, 1);
  return p;
}

function makeBunk(mats, withPersonWear = true) {
  const g = new Group();
  const frame = mesh(roundedBox(0.72, 0.06, 1.85, 0.012, 1), mats.brushed);
  frame.position.y = 0.02;
  g.add(frame);
  const rail = mesh(roundedBox(0.72, 0.08, 0.03, 0.008, 1), mats.chipped);
  rail.position.set(0, 0.08, 0.91);
  g.add(rail);
  const rail2 = rail.clone();
  rail2.position.z = -0.91;
  g.add(rail2);
  const mattress = mesh(roundedBox(0.68, 0.08, 1.78, 0.03, 2), mats.foam);
  mattress.position.y = 0.08;
  g.add(mattress);
  const sheet = makeBlanket(mats, 0.66, 1.5);
  sheet.position.set(0, 0.13, 0.08);
  g.add(sheet);
  const pillow = makePillow(mats);
  pillow.position.set(0.02, 0.16, -0.72);
  g.add(pillow);
  const strap = mesh(box(0.62, 0.012, 0.03), mats.rubber);
  strap.position.set(0, 0.15, 0.35);
  g.add(strap);
  const curtain = mesh(roundedBox(0.02, 0.42, 0.7, 0.01, 1), mats.fabric);
  curtain.position.set(0.36, 0.32, 0.1);
  g.add(curtain);
  const light = mesh(cyl(0.02, 0.02, 0.03, 8), mats.emissiveAmber);
  light.position.set(-0.28, 0.38, -0.7);
  g.add(light);
  const lockerSlot = mesh(roundedBox(0.16, 0.12, 0.22, 0.008, 1), mats.hullGreen);
  lockerSlot.position.set(0.26, 0.08, 0.7);
  g.add(lockerSlot);
  return g;
}

export function buildCrewQuarters(mats, collision, interactables, animators) {
  const g = new Group();
  g.name = 'crewQuarters';
  const z0 = LAYOUT.rooms.crew.z0;
  const z1 = LAYOUT.rooms.crew.z1;
  const mid = (z0 + z1) * 0.5;

  const bunks = [];
  const positions = [
    [-0.42, 0.18, 9.15],
    [-0.42, 1.05, 9.15],
    [-0.42, 0.18, 11.15],
    [-0.42, 1.05, 11.15],
  ];
  positions.forEach((p, i) => {
    const bunk = makeBunk(mats);
    bunk.position.set(p[0], p[1], p[2]);
    bunk.rotation.y = Math.PI * 0.5;
    g.add(bunk);
    bunks.push(bunk);
    collision.addBox(p[0], p[1] + 0.2, p[2], 1.85, 0.45, 0.75);
  });
  const restBunk = bunks[0];
  restBunk.userData.interact = 'rest';
  restBunk.userData.prompt = 'E: Rest';
  interactables.push(restBunk);

  const posts = mesh(roundedBox(0.05, 1.85, 0.05, 0.01, 1), mats.brushed);
  posts.position.set(-0.72, 0.95, 10.15);
  const post2 = posts.clone();
  post2.position.z = 9.15;
  const post3 = posts.clone();
  post3.position.z = 11.15;
  g.add(posts, post2, post3);

  const lockers = mesh(roundedBox(0.28, 1.15, 0.85, 0.012, 1), mats.hullGreen);
  lockers.position.set(0.62, 0.6, 9.35);
  g.add(lockers);
  for (let i = 0; i < 4; i++) {
    const door = mesh(roundedBox(0.02, 0.48, 0.18, 0.006, 1), mats.chipped);
    door.position.set(0.48, i < 2 ? 0.85 : 0.32, 9.05 + (i % 2) * 0.42);
    g.add(door);
    const h = mesh(box(0.012, 0.04, 0.012), mats.brushed);
    h.position.copy(door.position);
    h.position.x -= 0.02;
    g.add(h);
  }
  const lockerLabel = makeWarningPlate(mats, 'LOCKER', '01-04');
  lockerLabel.position.set(0.48, 1.28, 9.35);
  lockerLabel.rotation.y = -Math.PI * 0.5;
  g.add(lockerLabel);

  const table = new Group();
  const leaf = mesh(roundedBox(0.42, 0.03, 0.55, 0.01, 1), mats.chipped);
  leaf.position.y = 0.72;
  table.add(leaf);
  const hinge = mesh(box(0.42, 0.02, 0.03), mats.brushed);
  hinge.position.set(0, 0.7, -0.26);
  table.add(hinge);
  const brace = mesh(box(0.03, 0.28, 0.03), mats.brushed);
  brace.position.set(0.16, 0.56, 0.1);
  table.add(brace);
  table.position.set(0.42, 0, 10.55);
  g.add(table);
  const bench = mesh(roundedBox(0.22, 0.08, 0.5, 0.02, 2), mats.leather);
  bench.position.set(0.22, 0.42, 10.55);
  g.add(bench);
  const benchLeg = mesh(roundedBox(0.2, 0.38, 0.2, 0.01, 1), mats.brushed);
  benchLeg.position.set(0.22, 0.2, 10.55);
  g.add(benchLeg);

  const galley = new Group();
  galley.add(mesh(roundedBox(0.42, 0.72, 0.7, 0.015, 1), mats.hull));
  galley.position.set(0.55, 0.4, 12.15);
  const counter = mesh(roundedBox(0.42, 0.04, 0.7, 0.01, 1), mats.brushed);
  counter.position.set(0, 0.38, 0);
  galley.add(counter);
  const sink = mesh(roundedBox(0.2, 0.06, 0.18, 0.02, 2), mats.brushed);
  sink.position.set(0.02, 0.4, -0.12);
  galley.add(sink);
  const basin = mesh(roundedBox(0.16, 0.04, 0.14, 0.015, 1), mats.ceramic);
  basin.position.set(0.02, 0.38, -0.12);
  galley.add(basin);
  const tap = mesh(cyl(0.01, 0.01, 0.12, 8), mats.brushed);
  tap.position.set(0.08, 0.48, -0.12);
  galley.add(tap);
  const spout = mesh(cyl(0.008, 0.008, 0.08, 8), mats.brushed);
  spout.rotation.z = Math.PI * 0.5;
  spout.position.set(0.03, 0.53, -0.12);
  galley.add(spout);
  const cab = mesh(roundedBox(0.38, 0.28, 0.02, 0.006, 1), mats.chipped);
  cab.position.set(-0.2, 0.05, 0.2);
  galley.add(cab);
  const handle = mesh(box(0.08, 0.012, 0.012), mats.brushed);
  handle.position.set(-0.2, 0.05, 0.22);
  galley.add(handle);
  const fridge = mesh(roundedBox(0.28, 0.55, 0.28, 0.012, 1), mats.hullGreen);
  fridge.position.set(0.02, 0.55, 0.18);
  galley.add(fridge);
  const cup = mesh(cyl(0.025, 0.02, 0.05, 10), mats.ceramic);
  cup.position.set(-0.1, 0.44, 0.18);
  galley.add(cup);
  const cup2 = mesh(cyl(0.025, 0.02, 0.05, 10), mats.plastic);
  cup2.position.set(-0.16, 0.44, 0.22);
  galley.add(cup2);
  g.add(galley);

  const wash = new Group();
  wash.add(mesh(roundedBox(0.36, 1.5, 0.55, 0.015, 1), mats.hull));
  wash.position.set(0.58, 0.78, 12.75);
  const mirror = mesh(roundedBox(0.2, 0.22, 0.01, 0.004, 1), mats.glassThick);
  mirror.position.set(-0.18, 0.45, 0);
  wash.add(mirror);
  const mirrorFrame = mesh(roundedBox(0.22, 0.24, 0.016, 0.006, 1), mats.brushed);
  mirrorFrame.position.set(-0.18, 0.45, -0.01);
  wash.add(mirrorFrame);
  const basin2 = mesh(roundedBox(0.2, 0.08, 0.18, 0.02, 2), mats.ceramic);
  basin2.position.set(-0.12, -0.05, 0.05);
  wash.add(basin2);
  const towel = mesh(roundedBox(0.04, 0.22, 0.12, 0.02, 2), mats.fabric);
  towel.position.set(-0.16, 0.15, 0.18);
  wash.add(towel);
  const toilet = mesh(roundedBox(0.2, 0.28, 0.22, 0.03, 2), mats.ceramic);
  toilet.position.set(0.02, -0.4, -0.08);
  wash.add(toilet);
  g.add(wash);

  const porthole = makePorthole(mats, 0.12);
  porthole.position.set(0.78, 1.38, 10.7);
  porthole.rotation.y = -Math.PI * 0.5;
  g.add(porthole);

  g.add(makeStraightPipe(mats, -0.72, 1.88, mid, 4.4, 0.026, 'z', 'pipe'));
  g.add(makeStraightPipe(mats, 0.72, 1.9, mid, 4.2, 0.02, 'z', 'pipeBlue'));
  const tray = makeCableTray(mats, 4.3, 0.16);
  tray.position.set(0.0, 2.06, mid);
  g.add(tray);
  const vent = makeVent(mats, 0.2, 0.08);
  vent.position.set(0.15, 1.94, 10.2);
  g.add(vent);
  const box = makeJunctionBox(mats, 0.14, 0.16, 0.06);
  box.position.set(0.7, 1.55, 10.15);
  box.rotation.y = -Math.PI * 0.5;
  g.add(box);
  const grate = makeFloorGrate(mats, 0.36, 0.5);
  grate.position.set(0.05, 0.03, 10.55);
  g.add(grate);
  const rail = makeHandrail(mats, 1.2, 0.88);
  rail.position.set(0.12, 0, 9.0);
  g.add(rail);
  const warn = makeWarningPlate(mats, 'CREW', 'BERTH');
  warn.position.set(0.5, 1.75, 8.4);
  g.add(warn);
  const panel = makeAccessPanel(mats, 0.2, 0.14);
  panel.position.set(-0.72, 0.55, 10.2);
  panel.rotation.y = Math.PI * 0.5;
  g.add(panel);

  collision.addBox(0.62, 0.6, 9.35, 0.3, 1.2, 0.88);
  collision.addBox(0.42, 0.5, 10.55, 0.45, 0.85, 0.55);
  collision.addBox(0.55, 0.5, 12.15, 0.45, 0.9, 0.72);
  collision.addBox(0.58, 0.78, 12.75, 0.38, 1.5, 0.55);

  return g;
}
