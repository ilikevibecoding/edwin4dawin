import * as THREE from 'three';
import type { WorldModel } from './mapbuilder';
import { PropBatcher, P, boxGeo, type PropProto } from '../assets/models/props/kit';
import { M } from '../assets/models/props/mats';
import {
  taskChair, confChair, waitingChair, sofa, standardDesk, execDesk, conferenceTable,
  lowTable, breakTable, sideTable, monitorProto, laptop, pcTower, keyboardMouse,
  deskPhone, deskLamp, printerSmall, copier, serverRack, upsUnit, securityConsole,
  filingCabinet, drawerUnit, bookcase, archiveRack, lockerBank, cubiclePod,
  whiteboard, noticeBoard, wallClock, presentationDisplay, brandWallPanel,
  officePlant, planterBox, lobbyBench, coatRack, backpack,
} from '../assets/models/props/office';
import {
  kitchenCounter, fridge, vendingMachine, coffeeMachine, microwave, waterCooler,
  trashBins, wellnessCot, medCabinet,
} from '../assets/models/props/breakroom';
import {
  sinkCounter, toilet, urinal, stallRow, handDryer, towelDispenser, janitorShelf, janitorCart,
} from '../assets/models/props/restroom';
import {
  electricalPanel, hvacUnit, pipeRun, fireExtinguisher, crateStack, palletBoxes,
  handTruck, ladder, warningCone, barrelGroup, workbench, responseVan, garageControls,
  utilityShelving, kestrelBannerProp, ammoCrate,
} from '../assets/models/props/maintenance';
import {
  receptionDesk, badgeGate, wetFloorMat, deptSignProp, magazineRack, flagStand,
} from '../assets/models/props/lobbyset';
import { LIGHT_FIXTURES } from './lighting';
import { exitSign, poster } from '../assets/textures/signage';
import { registerAsset } from '../assets/registry';
import { MAP_BOUNDS } from './layout';

registerAsset({
  id: 'placement.full',
  name: 'Full-map prop placement (all rooms furnished)',
  category: 'furniture',
  agent: 'Fable 3',
  files: 'src/world/propplacement.ts',
  where: 'every room',
  dims: 'map-wide',
  materials: 'prop palette + library',
  collision: 'static-aabb per prop',
  lod: 'merged-static (per material)',
  status: 'integrated',
  accept: 'cover matches graybox plan; no floating/overlapping props; every room purposeful',
});

const HPI = Math.PI / 2;

/** Ceiling & wall dressing protos built inline (Fable 2 lane). */
function trofferProto(): PropProto {
  const p = new P();
  p.box(M.alu, 1.2, 0.04, 0.6, 0, 0.02, 0, { bevel: 0.008 });
  p.box(M.troffer, 1.1, 0.025, 0.5, 0, 0, 0);
  return p.proto('fix.troffer');
}
function tubeProto(): PropProto {
  const p = new P();
  p.box(M.steelDark, 1.24, 0.05, 0.12, 0, 0.03, 0, { bevel: 0.008 });
  p.cyl(M.troffer, 0.02, 1.15, 0, 0.0, 0, { rz: HPI });
  return p.proto('fix.tube');
}
function pendantProto(): PropProto {
  const p = new P();
  p.cyl(M.steelDark, 0.008, 1.35, 0, -1.35, 0);
  p.cyl(M.steelDark, 0.19, 0.16, 0, -1.5, 0, { seg: 16, r1: 0.3 });
  p.cyl(M.lampWarm, 0.17, 0.02, 0, -1.5, 0, { seg: 16 });
  return p.proto('fix.pendant');
}
function highbayProto(): PropProto {
  const p = new P();
  p.cyl(M.steelDark, 0.05, 0.12, 0, -0.12, 0);
  p.cyl(M.steelDark, 0.24, 0.18, 0, -0.3, 0, { seg: 14, r1: 0.34 });
  p.cyl(M.sodiumLamp, 0.2, 0.02, 0, -0.3, 0, { seg: 14 });
  return p.proto('fix.highbay');
}
function exitSignProto(): PropProto {
  const p = new P();
  p.box(M.plasticBlack, 0.42, 0.2, 0.05, 0, 0, 0, { bevel: 0.008 });
  p.geo(new THREE.MeshStandardMaterial({
    emissiveMap: exitSign(), emissive: 0xffffff, emissiveIntensity: 1.6, color: 0x061007, roughness: 0.5, name: 'exit-face',
  }), boxGeo(0.4, 0.18, 0.012).clone().translate(0, 0.1, 0.03));
  return p.proto('fix.exit');
}
function emergencyLightProto(): PropProto {
  const p = new P();
  p.box(M.plasticWhite, 0.3, 0.1, 0.08, 0, 0, 0.04, { bevel: 0.01 });
  p.box(M.ledAmber, 0.06, 0.05, 0.04, -0.09, 0.02, 0.09, { bevel: 0.008 });
  p.box(M.ledAmber, 0.06, 0.05, 0.04, 0.09, 0.02, 0.09, { bevel: 0.008 });
  return p.proto('fix.emergency');
}
function sprinklerProto(): PropProto {
  const p = new P();
  p.cyl(M.chrome, 0.012, 0.06, 0, -0.06, 0);
  p.cyl(M.safetyRed, 0.02, 0.015, 0, -0.075, 0, { seg: 8 });
  return p.proto('fix.sprinkler');
}
function smokeDetectorProto(): PropProto {
  const p = new P();
  p.cyl(M.plasticWhite, 0.07, 0.03, 0, -0.03, 0, { seg: 12 });
  p.box(M.ledRed, 0.012, 0.012, 0.012, 0.03, -0.035, 0);
  return p.proto('fix.smoke');
}
function ventProto(): PropProto {
  const p = new P();
  p.box(M.alu, 0.6, 0.03, 0.6, 0, 0, 0, { bevel: 0.008 });
  for (let i = 0; i < 5; i++) p.box(M.steelDark, 0.5, 0.012, 0.06, 0, 0.005, -0.24 + i * 0.12);
  return p.proto('fix.vent');
}
function posterProto(kind: Parameters<typeof poster>[0]): PropProto {
  const p = new P();
  p.geo(new THREE.MeshStandardMaterial({ map: poster(kind), roughness: 0.85, name: `poster-${kind}` }),
    boxGeo(0.5, 0.75, 0.012).clone().translate(0, 0.375, 0));
  return p.proto(`fix.poster.${kind}`);
}
function columnProto(h: number): PropProto {
  const p = new P();
  p.box(M.plasticWhite, 0.44, h, 0.44, 0, 0, 0, { bevel: 0.02 });
  p.box(M.steelDark, 0.5, 0.12, 0.5, 0, 0, 0, { bevel: 0.012 });
  p.col('concrete', 0.46, h, 0.46, 0, 0, 0);
  return p.proto('fix.column');
}
function cardReaderProto(): PropProto {
  const p = new P();
  p.box(M.plasticBlack, 0.08, 0.12, 0.03, 0, 0, 0.015, { bevel: 0.008 });
  p.box(M.ledRed, 0.03, 0.012, 0.01, 0, 0.08, 0.032);
  return p.proto('fix.cardreader');
}
function ductRunProto(len: number): PropProto {
  const p = new P();
  p.box(M.galv(), len, 0.4, 0.5, 0, 0, 0, { bevel: 0.02 });
  for (let x = -len / 2 + 0.6; x < len / 2; x += 1.2) {
    p.box(M.steelDark, 0.04, 0.44, 0.54, x, -0.02, 0);
  }
  return p.proto('fix.duct');
}
function cableTrayProto(len: number): PropProto {
  const p = new P();
  p.box(M.galv(), len, 0.04, 0.3, 0, 0, 0);
  p.box(M.steelDark, len, 0.06, 0.02, 0, 0, -0.15);
  p.box(M.steelDark, len, 0.06, 0.02, 0, 0, 0.15);
  // cable bundles
  p.cyl(M.rubber, 0.02, len, -0.08, 0.045, 0, { rz: HPI });
  p.cyl(M.tealAccent, 0.014, len, 0, 0.04, 0.04, { rz: HPI });
  p.cyl(M.rubber, 0.016, len, 0.06, 0.04, -0.05, { rz: HPI });
  return p.proto('fix.cabletray');
}

export function placeProps(world: WorldModel, scene: THREE.Scene): void {
  const B = new PropBatcher(world.collision);
  const put = (proto: PropProto, x: number, z: number, ry = 0, y = 0): void => B.place(proto, x, y, z, ry);

  // shared protos
  const chairA = taskChair(0);
  const chairB = taskChair(1);
  const cChair = confChair();
  const wChair = waitingChair();
  const desk = standardDesk();
  const monSpread = monitorProto('spreadsheet');
  const monCode = monitorProto('code');
  const monDualMap = monitorProto('map', true);
  const monOff = monitorProto('off');
  const kbm = keyboardMouse();
  const pc = pcTower();
  const phone = deskPhone();
  const lamp = deskLamp();
  const plantTall = officePlant(true);
  const plantSmall = officePlant(false);
  const filing = filingCabinet(true);
  const filingLow = filingCabinet(false);
  const drawers = drawerUnit();
  const troffer = trofferProto();
  const tube = tubeProto();
  const pendant = pendantProto();
  const highbay = highbayProto();
  const exit = exitSignProto();
  const emg = emergencyLightProto();
  const sprinkler = sprinklerProto();
  const smoke = smokeDetectorProto();
  const vent = ventProto();
  const column = columnProto(2.9);
  const columnTall = columnProto(6.15);
  const reader = cardReaderProto();
  const ext = fireExtinguisher(false);
  const extCab = fireExtinguisher(true);

  // ============ COURTYARD & ENTRANCE ============
  put(lobbyBench(), 4, 3, 0);
  put(lobbyBench(), 16.5, 1.2, 0);
  put(planterBox(), 13.5, 2.2, 0);
  put(planterBox(), 20, 4, 0);
  put(flagStand(), 12.6, 5.2, 0.4);
  put(wetFloorMat(), 9, 7.4, 0);
  put(warningCone(), 8.2, 9.6, 0.4);

  // ============ VESTIBULE & SECURITY ============
  put(wetFloorMat(), 9, 10.6, 0);
  put(badgeGate(), 11.0, 10.2, 0);
  put(badgeGate(), 11.0, 11.4, 0);
  put(badgeGate(), 11.0, 12.6, 0);
  put(coatRack(true), 6.7, 12.8, 0);
  put(deptSignProp('Security', 'Vestibule B-1'), 11.3, 13.93, Math.PI, 1.5);
  put(securityConsole(), 8, 18.6, Math.PI);
  put(chairA, 8, 17.6, Math.PI);
  put(lockerBank(), 6.9, 15.2, HPI);
  put(filingLow, 11.4, 19.3, -HPI);
  put(noticeBoard(), 6.2, 17, HPI, 1.1);
  put(kestrelBannerProp(), 9.5, 15, 0);

  // ============ LOBBY ============
  put(receptionDesk(), 21.5, 14.6, 0);
  put(chairB, 21.2, 15.8, Math.PI * 0.9);
  // brand wall mounted on the tall feature wall above the hall opening
  put(brandWallPanel(), 19, 17.86, Math.PI, 3.15);
  put(lobbyBench(), 15.5, 12.5, HPI);
  put(planterBox(), 24.5, 8.5, 0);
  put(planterBox(), 14.5, 8.0, 0);
  put(plantTall, 25.2, 16.8, 0);
  put(flagStand(), 13, 6.9, 0.9);
  put(columnTall, 16.5, 10.5, 0);
  put(columnTall, 21.5, 10.5, 0);
  put(kestrelBannerProp(), 21.5, 10.9, 0);
  put(ammoCrate(), 17.0, 11.6, 0.5);
  put(ammoCrate(), 17.7, 12.1, -0.3);
  put(deptSignProp('Reception', 'Norrsken Dynamics'), 20, 17.8, Math.PI, 1.9);

  // ============ NORTH CORRIDOR ============
  put(plantTall, 27, 9.3, 0);
  put(plantTall, 47.2, 6.9, 0);
  put(lobbyBench(), 36, 6.7, 0);
  put(extCab, 30, 9.85, Math.PI, 0.9);
  put(deptSignProp('Restrooms'), 35.2, 9.9, Math.PI, 1.5);
  put(deptSignProp('Server Room', 'Authorized access only'), 44.9, 9.9, Math.PI, 1.5);
  put(reader, 48.15, 8.8, HPI, 1.1);
  put(posterProto('safety'), 26.2, 8, HPI, 1.1);
  put(posterProto('motivation'), 40, 6.25, 0, 1.1);

  // ============ RESTROOMS ============
  put(sinkCounter(1.6), 33, 10.6, 0);
  put(stallRow(2), 34, 16.9, Math.PI);
  put(urinal(), 35.6, 11.2, -HPI);
  put(handDryer(), 32.3, 12.8, HPI, 1.1);
  put(towelDispenser(), 35.7, 13.5, -HPI, 1.0);
  put(trashBins(), 32.6, 14.6, HPI);
  put(sinkCounter(1.6), 37, 10.6, 0);
  put(stallRow(2), 38, 16.9, Math.PI);
  put(handDryer(), 39.7, 12.8, -HPI, 1.1);
  put(towelDispenser(), 36.3, 13.5, HPI, 1.0);
  put(trashBins(), 39.4, 14.6, -HPI);

  // ============ JANITOR ============
  put(janitorShelf(), 41, 11.5, 0);
  put(janitorCart(), 41, 14.5, 0.3);
  put(ladder(), 40.35, 16.5, HPI);

  // ============ SERVER ROOM ============
  const rack = serverRack();
  for (let i = 0; i < 3; i++) put(rack, 43.4, 11.6 + i * 0.9, HPI);
  for (let i = 0; i < 3; i++) put(rack, 45.6, 11.6 + i * 0.9, -HPI);
  put(upsUnit(), 47.2, 16.4, Math.PI);
  put(cableTrayProto(5), 45, 13.8, HPI, 2.25);
  put(monCode, 43, 16.6, Math.PI * 0.75, 0.74);
  put(desk, 43.2, 16.9, Math.PI * 0.75);
  put(chairA, 43.8, 16.2, Math.PI * 0.75);
  put(ammoCrate(), 46.8, 10.8, 0.2);

  // ============ IT WORKSPACE ============
  put(desk, 50, 7.2, 0);
  put(monDualMap, 50, 7.0, 0, 0.74);
  put(kbm, 50, 7.4, 0, 0.74);
  put(chairA, 50, 8.2, Math.PI);
  put(desk, 52.5, 7.2, 0);
  put(monCode, 52.5, 7.0, 0, 0.74);
  put(kbm, 52.5, 7.4, 0, 0.74);
  put(chairB, 52.5, 8.3, Math.PI * 0.9);
  put(pc, 51.2, 7.1, 0);
  put(utilityShelving(3), 52.9, 13, -HPI);
  put(printerSmall(), 49, 12.9, HPI, 0.74);
  put(desk, 49.2, 13.1, HPI);
  put(crateStack(5), 53, 15.2, 0.2);
  put(deskLamp(), 52.2, 7.0, 0.4, 0.74);
  put(posterProto('notice'), 48.2, 12, HPI, 1.2);
  put(noticeBoard(), 51, 6.28, 0, 1.15);

  // ============ MAIN HALL ============
  put(planterBox(), 26, 19.5, 0);
  put(lobbyBench(), 36, 19.6, 0);
  put(extCab, 47.8, 19.2, -HPI, 0.9);
  put(deptSignProp('Open Office', 'Sections C1–C3'), 27, 20.9, Math.PI, 1.5);
  put(deptSignProp('Copy & Mail'), 37.4, 20.9, Math.PI, 1.5);
  put(deptSignProp('Loading', 'Deliveries 07–16'), 43, 20.9, Math.PI, 1.5);
  put(posterProto('evac'), 14, 20.93, Math.PI, 1.1);
  put(posterProto('wanted'), 33.4, 17.9, 0, 1.15);
  put(wallClock(), 24, 20.9, Math.PI, 2.1);

  // ============ WAITING ============
  put(sofa(), 14, 23, HPI);
  put(wChair, 16.4, 21.8, Math.PI * 0.85);
  put(wChair, 17.6, 22.6, Math.PI * 0.7);
  put(lowTable(), 15.8, 23.4, 0.2);
  put(magazineRack(), 12.4, 24.4, HPI);
  put(waterCooler(), 19.4, 21.6, Math.PI);
  put(plantTall, 12.5, 21.6, 0);
  put(posterProto('motivation'), 12.2, 23, HPI, 1.2);

  // ============ CUBICLE FLOOR ============
  const podRows = [23.4, 27.2, 31.4, 35.2];
  const podCols = [22.6, 27.0, 31.4];
  let podSeed = 0;
  for (const z of podRows) {
    for (const x of podCols) {
      podSeed++;
      if ((z === 27.2 && x === 27.0) || (z === 31.4 && x === 22.6)) continue;
      put(cubiclePod(podSeed), x, z, 0);
      // chairs around pods (pulled out, varied)
      put(podSeed % 2 ? chairA : chairB, x - 0.9, z + 1.35, Math.PI * (0.85 + 0.001 * podSeed));
      put(podSeed % 2 ? chairB : chairA, x + 0.8, z - 1.4, Math.PI * 0.1);
    }
  }
  put(column, 25, 29.5, 0);
  put(column, 33, 29.5, 0);
  put(filing, 20.4, 22.2, HPI);
  put(filing, 20.4, 23.0, HPI);
  put(printerSmall(), 34.5, 21.6, 0, 0.74);
  put(desk, 34.6, 21.8, 0);
  put(plantTall, 35.4, 37.3, 0);
  put(plantSmall, 20.5, 30.6, 0, 0);
  put(whiteboard(), 20.15, 26.5, HPI, 1.0);
  put(wallClock(), 35.9, 29, -HPI, 2.1);
  put(backpack(1), 23.5, 25.4, 0.4);
  put(coatRack(true), 34.9, 36.6, 0);
  put(posterProto('safety'), 35.9, 24, -HPI, 1.2);

  // ============ BREAK ROOM ============
  put(kitchenCounter(2.4), 13.4, 26.8, 0);
  put(fridge(), 12.6, 29.4, HPI);
  put(microwave(), 14.2, 26.75, 0, 0.91);
  put(coffeeMachine(), 12.9, 26.75, 0, 0.91);
  put(vendingMachine(), 19.2, 27.5, Math.PI);
  put(waterCooler(), 19.5, 31.9, Math.PI);
  put(breakTable(), 16.5, 30.5, 0);
  put(wChair, 15.6, 29.8, Math.PI * 0.3);
  put(wChair, 17.4, 30.2, Math.PI * 1.4);
  put(wChair, 16.2, 31.4, Math.PI * 1.9);
  put(trashBins(), 13, 32.4, 0);
  put(noticeBoard(), 16, 32.9, Math.PI, 1.15);
  put(posterProto('notice'), 12.2, 28, HPI, 1.15);

  // ============ WELLNESS ============
  put(wellnessCot(), 14, 35.5, 0);
  put(medCabinet(), 18, 37.6, Math.PI);
  put(sideTable(), 15.6, 36.6, 0);
  put(plantSmall, 12.6, 33.6, 0);
  put(posterProto('safety'), 19.85, 35, -HPI, 1.2);

  // ============ COPY ROOM ============
  put(copier(), 37.4, 23, HPI);
  put(printerSmall(), 39.3, 21.8, Math.PI, 0.9);
  put(utilityShelving(7), 39.4, 27, -HPI);
  put(desk, 37, 28.8, Math.PI);
  put(kbm, 37, 28.6, Math.PI, 0.74);
  put(monOff, 37, 29.0, Math.PI, 0.74);
  put(crateStack(9), 36.8, 21.9, 0.1);
  put(trashBins(), 39.4, 29.3, Math.PI);
  put(posterProto('notice'), 36.15, 26, HPI, 1.2);

  // ============ LOADING ============
  put(palletBoxes(), 42, 24, 0.1);
  put(palletBoxes(), 45.5, 27.5, -0.15);
  put(crateStack(1, true), 46.8, 22.2, 0.3);
  put(crateStack(3), 41.2, 27.8, -0.2);
  put(handTruck(), 43, 28.8, 0.9);
  put(warningCone(), 44, 25.6, 0);
  put(ladder(), 40.3, 22.6, HPI);
  put(extCab, 47.8, 24, -HPI, 0.9);
  put(cableTrayProto(6), 44, 24, 0, 2.9);
  put(ductRunProto(7), 44, 27, 0, 2.7);

  // ============ GARAGE ============
  put(responseVan(), 40.5, 33.8, 0);
  put(workbench(), 46.5, 32.5, 0);
  put(barrelGroup(), 48.8, 36, 0);
  put(crateStack(11), 37.2, 31.4, 0.2);
  put(garageControls(), 49.35, 34.5, -HPI, 1.1);
  put(warningCone(), 44.6, 36.6, 0);
  put(warningCone(), 39, 36.9, 0);
  put(kestrelBannerProp(), 47.5, 30.6, Math.PI);
  put(ammoCrate(), 46.2, 30.9, 0.15);
  put(ammoCrate(), 46.9, 31.3, -0.4);
  put(ext, 36.35, 33, HPI, 0.35);
  put(ductRunProto(9), 43, 31, 0, 3.5);

  // ============ SERVICE CORRIDOR & MECH ============
  put(pipeRun(13, false), 51, 21.5, HPI, 2.1);
  put(cableTrayProto(12), 53.6, 23, HPI, 2.2);
  put(utilityShelving(11), 48.5, 21, HPI);
  put(warningCone(), 50.5, 27, 0);
  put(emg, 51, 16.2, Math.PI, 2.2);
  put(electricalPanel(), 52.8, 31.4, -HPI);
  put(electricalPanel(), 52.8, 33.2, -HPI);
  put(hvacUnit(), 51.5, 36.5, 0);
  put(pipeRun(3.4, true), 50.6, 30.7, 0, 0);
  put(janitorCart(), 49, 28.9, -0.4);
  put(ext, 48.35, 18, HPI, 0.35);

  // ============ STAIRWELL ============
  put(ext, 26.65, 17, HPI, 0.35);
  put(deptSignProp('Level 2', 'Executive · Records'), 29, 10.28, 0, 5.2);

  // ============ UPPER: RECORDS ============
  const rackA = archiveRack(1);
  for (let i = 0; i < 4; i++) put(rackA, 8.8, 8.6 + i * 2.6, 0, 3.6);
  put(desk, 8, 18.2, Math.PI, 3.6);
  put(monOff, 8, 18.4, Math.PI, 4.34);
  put(kbm, 8, 18.0, Math.PI, 4.34);
  put(chairB, 8, 17.4, 0.2, 3.6);
  put(filingLow, 11.3, 18.9, -HPI, 3.6);
  put(crateStack(13), 6.9, 6.9, 0.2, 3.6);
  put(posterProto('notice'), 6.2, 12, HPI, 4.8);

  // ============ UPPER: BALCONY & CORRIDOR ============
  put(lobbyBench(), 20, 7.5, 0, 3.6);
  put(plantTall, 25.4, 6.9, 0, 3.6);
  put(plantTall, 12.7, 6.9, 0, 3.6);
  put(deptSignProp('Records Archive'), 12.3, 8.6, HPI, 5.1);
  put(deptSignProp('Executive Suite'), 26.3, 8.8, -HPI, 5.1);
  put(posterProto('motivation'), 34, 6.25, 0, 4.7);
  put(lobbyBench(), 38, 6.7, 0, 3.6);
  put(plantSmall, 43.5, 6.8, 0, 3.6);
  put(wallClock(), 30, 6.27, 0, 5.4);

  // ============ UPPER: CONFERENCE ============
  put(conferenceTable(), 38, 14, 0, 3.6);
  for (let i = 0; i < 4; i++) {
    put(cChair, 36.2 + i * 1.2, 12.9, Math.PI * 0.97 + i * 0.02, 3.6);
    put(cChair, 36.2 + i * 1.2, 15.1, Math.PI * 0.02 + i * -0.015, 3.6);
  }
  put(cChair, 40.9, 14, -HPI, 3.6);
  put(presentationDisplay(), 43.85, 14, -HPI, 4.6);
  put(whiteboard(), 35, 17.85, Math.PI, 4.6);
  put(sideTable(), 33, 11.2, 0, 3.6);
  put(coffeeMachine(), 33, 11.2, 0.4, 4.08);
  put(plantTall, 33, 16.9, 0, 3.6);

  // ============ UPPER: EXECUTIVE ============
  put(execDesk(), 50, 10.5, Math.PI, 3.6);
  put(chairB, 50, 9.4, 0, 3.6);
  put(monDualMap, 49.7, 10.7, Math.PI, 4.36);
  put(deskPhone(), 51, 10.6, Math.PI * 0.9, 4.36);
  put(deskLamp(), 48.9, 10.3, 0.3, 4.36);
  put(laptop('map'), 50.4, 10.3, Math.PI * 1.05, 4.36);
  put(sofa(), 46, 15.5, 0, 3.6);
  put(lowTable(), 46, 14.2, 0, 3.6);
  put(bookcase(2), 52.9, 15.5, -HPI, 3.6);
  put(bookcase(5), 52.9, 14.4, -HPI, 3.6);
  put(plantTall, 44.7, 6.9, 0, 3.6);
  put(coatRack(true), 44.8, 16.9, 0, 3.6);
  put(filingCabinet(true), 52.4, 8.4, -HPI, 3.6);
  put(wallClock(), 47, 6.28, 0, 5.6);

  // ============ CEILING FIXTURES (aligned with lights) ============
  for (const f of LIGHT_FIXTURES) {
    const proto = f.kind === 'troffer' ? troffer : f.kind === 'tube' ? tube : f.kind === 'pendant' ? pendant : highbay;
    put(proto, f.x, f.z, f.kind === 'tube' ? HPI : 0, f.y);
  }
  // sprinklers + smoke detectors (regular grid in offices)
  const sprinklerSpots: [number, number, number][] = [
    [16, 2.66, 12], [22, 2.66, 12], [9, 2.64, 11.5], [30, 2.64, 8.4], [40, 2.64, 8.4],
    [24, 2.84, 27], [32, 2.84, 27], [24, 2.84, 33], [32, 2.84, 33], [16, 2.64, 29.5],
    [16, 2.64, 23.5], [38, 2.64, 25], [18, 2.64, 19.5], [30, 2.64, 19.5], [42, 2.64, 19.5],
    [38, 6.05, 14], [30, 6.05, 8], [40, 6.05, 8], [49, 6.05, 12], [9, 6.05, 13],
  ];
  for (const [x, y, z] of sprinklerSpots) put(sprinkler, x, z, 0, y);
  const smokeSpots: [number, number, number][] = [
    [19, 2.66, 14], [34, 2.56, 14], [45, 2.56, 14], [28, 2.86, 29.5], [16, 2.66, 27],
    [44, 3.36, 25.5], [43, 4.16, 34], [38, 6.07, 12], [50, 6.07, 12],
  ];
  for (const [x, y, z] of smokeSpots) put(smoke, x, z, 0, y);
  // vents
  const ventSpots: [number, number, number, number][] = [
    [14, 2.68, 10, 0], [24, 2.68, 16, 0], [28, 2.88, 24, 0], [30, 2.68, 19.5, 0],
    [45, 2.58, 12, 0], [16, 2.68, 31, 0], [38, 6.08, 16, 0], [31, 6.08, 8, 0],
  ];
  for (const [x, y, z, r] of ventSpots) put(vent, x, z, r, y);

  // exit signs above egress doors
  const exits: [number, number, number, number][] = [
    [9, 2.3, 9.35, Math.PI],      // vestibule → entrance
    [11.7, 2.3, 11.1, HPI],       // vestibule → lobby (side)
    [29, 2.3, 10.35, 0],          // ncorr → stairwell
    [29, 2.3, 17.7, Math.PI],     // MH → stairwell
    [48.3, 2.3, 19.5, -HPI],      // MH → service corr
    [44, 2.3, 20.7, Math.PI],     // MH → loading
    [36.3, 2.3, 33.5, HPI],       // cubicles → garage door
    [43.9, 3.0, 30.35, 0],        // loading → garage
    [29, 5.9, 10.35, 0],          // upper stairwell door
    [26.35, 5.9, 8, HPI],         // balcony → corridor
  ];
  for (const [x, y, z, ry] of exits) put(exit, x, z, ry, y);
  // emergency lights in service/dark areas
  put(emg, 52, 2.2, 20, -HPI);
  put(emg, 41, 2.35, 12, 0);
  put(emg, 44, 3.9, 31.2, Math.PI);

  B.build(world.group);
  world.collision.build(MAP_BOUNDS.minX, MAP_BOUNDS.minZ, MAP_BOUNDS.maxX, MAP_BOUNDS.maxZ);
}
