/**
 * Escape-pod bay at the aft end of the corridor.
 *
 * The pod sits broadside in an open cradle, nose lined up with a rectangular
 * launch hatch in the port wall. That geometry is chosen for the camera: a pod
 * parked down a circular tube can only ever be photographed stern-on, which
 * reads as a washing machine. Broadside, its silhouette, porthole and boarding
 * hatch are all legible from the one place the camera can stand — back by the
 * corridor doorway.
 *
 * Local space: floor at y = 0, the corridor arrives from −Z, and the pod leaves
 * along −X through the hatch. The bay is deliberately wider and deeper than it
 * needs to be, because the shot needs standoff more than the ship needs volume.
 */

import * as THREE from 'three';
import {
  corridorWallMaterial,
  corridorFloorMaterial,
  metalMaterial,
  emissiveMaterial,
  additiveMaterial,
} from '../assets/materials';
import { roundedBox } from '../assets/geometry';
import { glowSprite } from '../assets/textures';
import { ControlPanel } from './control-panel';
import { CORRIDOR_WIDTH, CORRIDOR_HEIGHT } from './corridor';
import { POD_RADIUS } from '../ships/escape-pod';

export const BAY_WIDTH = 11.2;
export const BAY_DEPTH = 9.2;
export const BAY_HEIGHT = 4.3;
/** Bay-local Z of the cradle and the hatch centreline. */
export const CRADLE_Z = 1.55;
/** Bay-local X and Y of the pod's axis while it is docked. */
export const POD_SEAT_X = -1.55;
export const POD_SEAT_Y = 1.52;
/** Top surface of the boarding platform, and the Z its front edge stops at. */
export const PLATFORM_Y = 0.7;
export const PLATFORM_FRONT_Z = CRADLE_Z - 1.24;
export const PLATFORM_BACK_Z = CRADLE_Z - 3.5;
/** Bay-local X of the pod's boarding hatch, and where a droid stands to enter. */
export const BOARDING_X = POD_SEAT_X + 0.34;

export class PodBay {
  readonly group = new THREE.Group();
  /** Where the pod sits before launch; its −Z points out through the hatch. */
  readonly podSeat = new THREE.Object3D();
  readonly hatchCentre = new THREE.Object3D();
  private hatchLeaves: THREE.Group[] = [];
  private hatchGlow: THREE.Mesh;
  private hatchGlowMat: THREE.MeshBasicMaterial;
  private starField: THREE.Mesh;
  private lampMats: THREE.MeshStandardMaterial[] = [];
  private warnMats: THREE.MeshStandardMaterial[] = [];
  private panel: ControlPanel;
  private lights: THREE.PointLight[] = [];
  /** Full-power intensity of each lamp, so dimming stays proportional. */
  private lightBase: number[] = [];
  private hatchOpen = 0;
  private alarm = 0;

  /** Opening in the port wall, in bay-local units. */
  private readonly openHalfZ = 2.1;
  private readonly openTop = 3.5;

  constructor() {
    this.group.name = 'PodBay';
    const wall = corridorWallMaterial('bay');
    const floorMat = corridorFloorMaterial('bayfloor');
    const struct = metalMaterial('bayStruct', '#7f838a', 0.5, 0.6);
    const dark = metalMaterial('bayDark', '#33373d', 0.7, 0.55);

    const h = BAY_HEIGHT;
    const hw = BAY_WIDTH / 2;
    const hd = BAY_DEPTH / 2;
    const { openHalfZ, openTop } = this;

    /* ------------------------------------------------------------ shell */
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(BAY_WIDTH, BAY_DEPTH), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.group.add(floor);

    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(BAY_WIDTH, BAY_DEPTH), wall);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = h;
    this.group.add(ceiling);

    const aft = new THREE.Mesh(new THREE.PlaneGeometry(BAY_WIDTH, h), wall);
    aft.position.set(0, h / 2, hd);
    aft.rotation.y = Math.PI;
    this.group.add(aft);

    const forward = new THREE.Mesh(new THREE.PlaneGeometry(BAY_WIDTH, h), wall);
    forward.position.set(0, h / 2, -hd);
    this.group.add(forward);
    // The corridor mouth is faked with a dark recess and a heavy frame.
    const doorway = new THREE.Mesh(
      new THREE.PlaneGeometry(CORRIDOR_WIDTH, CORRIDOR_HEIGHT),
      metalMaterial('bayDoorway', '#14171c', 0.9, 0.2),
    );
    doorway.position.set(0, CORRIDOR_HEIGHT / 2, -hd + 0.01);
    this.group.add(doorway);
    const doorFrame = new THREE.Mesh(roundedBox(CORRIDOR_WIDTH + 0.5, CORRIDOR_HEIGHT + 0.4, 0.25, 0.05), struct);
    doorFrame.position.set(0, (CORRIDOR_HEIGHT + 0.4) / 2, -hd + 0.14);
    this.group.add(doorFrame);

    const starboard = new THREE.Mesh(new THREE.PlaneGeometry(BAY_DEPTH, h), wall);
    starboard.position.set(hw, h / 2, 0);
    starboard.rotation.y = -Math.PI / 2;
    this.group.add(starboard);

    /* ------------------------------ port wall, built around the hatch */
    const portPanel = (width: number, height: number, y: number, z: number) => {
      const panel = new THREE.Mesh(new THREE.PlaneGeometry(width, height), wall);
      panel.position.set(-hw, y, z);
      panel.rotation.y = Math.PI / 2;
      this.group.add(panel);
    };
    portPanel(BAY_DEPTH, h - openTop, openTop + (h - openTop) / 2, 0);
    for (const s of [-1, 1]) {
      const zNear = CRADLE_Z + s * openHalfZ;
      const zFar = s > 0 ? hd : -hd;
      const w = Math.abs(zFar - zNear);
      if (w > 0.02) portPanel(w, openTop, openTop / 2, (zNear + zFar) / 2);
    }

    // Hatch frame.
    for (const s of [-1, 1]) {
      const jamb = new THREE.Mesh(roundedBox(0.36, openTop + 0.32, 0.34, 0.05), struct);
      jamb.position.set(-hw + 0.17, (openTop + 0.32) / 2, CRADLE_Z + s * (openHalfZ + 0.17));
      this.group.add(jamb);
    }
    const lintel = new THREE.Mesh(roundedBox(0.36, 0.32, openHalfZ * 2 + 0.68, 0.05), struct);
    lintel.position.set(-hw + 0.17, openTop + 0.16, CRADLE_Z);
    this.group.add(lintel);

    /* ------------------------------------- what is beyond the hatch */
    // A dark card carrying a few stars. Once the leaves part this is all the
    // audience sees of vacuum, and an empty black rectangle reads as a hole in
    // the render rather than as space.
    const starMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      map: starPatch(),
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    });
    this.starField = new THREE.Mesh(new THREE.PlaneGeometry(openHalfZ * 2, openTop), starMat);
    this.starField.rotation.y = Math.PI / 2;
    this.starField.position.set(-hw - 1.1, openTop / 2, CRADLE_Z);
    this.starField.visible = false;
    this.group.add(this.starField);

    /* --------------------------------------------------- the outer hatch */
    // Two leaves that part vertically, set just outboard of the frame.
    const hatchX = -hw - 0.3;
    const hatchMat = metalMaterial('bayHatch', '#4a4f56', 0.5, 0.75);
    for (const s of [-1, 1]) {
      const leaf = new THREE.Group();
      const slab = new THREE.Mesh(roundedBox(0.24, openTop / 2, openHalfZ * 2, 0.04), hatchMat);
      leaf.add(slab);
      for (let i = 0; i < 3; i++) {
        const stripe = new THREE.Mesh(
          new THREE.PlaneGeometry(0.9, 0.12),
          emissiveMaterial('bayHatchStripe', '#c98b32', 0.45),
        );
        stripe.rotation.set(0, Math.PI / 2, 0.5);
        stripe.position.set(0.13, 0, -1.2 + i * 1.2);
        leaf.add(stripe);
      }
      leaf.position.set(hatchX, openTop / 4 + (s > 0 ? openTop / 2 : 0), CRADLE_Z);
      this.hatchLeaves.push(leaf);
      this.group.add(leaf);
    }

    this.hatchGlowMat = additiveMaterial('bayHatchGlow', '#9ec8ff', 0, glowSprite(0.35)).clone();
    this.hatchGlowMat.opacity = 0;
    this.hatchGlow = new THREE.Mesh(new THREE.PlaneGeometry(6.2, 5.4), this.hatchGlowMat);
    this.hatchGlow.rotation.y = -Math.PI / 2;
    this.hatchGlow.position.set(hatchX - 0.5, 1.7, CRADLE_Z);
    this.hatchGlow.visible = false;
    this.group.add(this.hatchGlow);

    /* --------------------------------------------------------- the cradle */
    // Two saddles clamped round the hull, on legs down to the deck, with a
    // launch rail running out to the hatch.
    const cradleMat = metalMaterial('bayCradle', '#585d64', 0.6, 0.65);
    const saddleR = POD_RADIUS + 0.09;
    for (const dx of [-1.45, 1.0]) {
      const saddle = new THREE.Mesh(
        new THREE.CylinderGeometry(saddleR, saddleR, 0.36, 22, 1, true, Math.PI * 1.1, Math.PI * 0.8),
        cradleMat,
      );
      saddle.rotation.z = Math.PI / 2;
      saddle.position.set(POD_SEAT_X + dx, POD_SEAT_Y, CRADLE_Z);
      this.group.add(saddle);
      const legTop = POD_SEAT_Y - saddleR + 0.1;
      const leg = new THREE.Mesh(roundedBox(0.34, legTop, 1.5, 0.05), cradleMat);
      leg.position.set(POD_SEAT_X + dx, legTop / 2, CRADLE_Z);
      this.group.add(leg);
    }
    for (const dz of [-1.6, 1.6]) {
      const rail = new THREE.Mesh(roundedBox(7.4, 0.18, 0.26, 0.04), struct);
      rail.position.set(POD_SEAT_X - 1.3, 0.5, CRADLE_Z + dz);
      this.group.add(rail);
    }
    // Overhead gantry arm above the cradle.
    const gantry = new THREE.Mesh(roundedBox(6.0, 0.24, 0.38, 0.05), struct);
    gantry.position.set(POD_SEAT_X - 0.7, h - 0.46, CRADLE_Z);
    this.group.add(gantry);
    for (const dx of [-2.3, 1.8]) {
      const hanger = new THREE.Mesh(roundedBox(0.18, 0.66, 0.22, 0.03), dark);
      hanger.position.set(POD_SEAT_X - 0.7 + dx, h - 0.82, CRADLE_Z);
      this.group.add(hanger);
    }

    /* --------------------------------------------- boarding platform */
    // Square in front of the pod's side hatch, with a ramp running back toward
    // the corridor so the droids' whole path is one straight line into frame.
    const platDepth = PLATFORM_FRONT_Z - PLATFORM_BACK_Z;
    const platZ = (PLATFORM_FRONT_Z + PLATFORM_BACK_Z) / 2;
    const deck = new THREE.Mesh(roundedBox(3.6, 0.22, platDepth, 0.04), struct);
    deck.position.set(BOARDING_X, PLATFORM_Y - 0.11, platZ);
    this.group.add(deck);
    const skirt = new THREE.Mesh(roundedBox(3.4, PLATFORM_Y - 0.22, platDepth - 0.3, 0.04), dark);
    skirt.position.set(BOARDING_X, (PLATFORM_Y - 0.22) / 2, platZ);
    this.group.add(skirt);
    const ramp = new THREE.Mesh(roundedBox(2.6, 0.16, 2.45, 0.04), struct);
    ramp.position.set(BOARDING_X, PLATFORM_Y / 2 - 0.02, PLATFORM_BACK_Z - 1.15);
    ramp.rotation.x = Math.atan2(PLATFORM_Y, 2.3);
    this.group.add(ramp);
    // Handrails down the outboard edge only, so nothing crosses the pod.
    for (const dz of [PLATFORM_BACK_Z + 0.35, PLATFORM_FRONT_Z - 0.35]) {
      const post = new THREE.Mesh(roundedBox(0.08, 0.9, 0.08, 0.02), dark);
      post.position.set(BOARDING_X - 1.72, PLATFORM_Y + 0.45, dz);
      this.group.add(post);
    }
    const handrail = new THREE.Mesh(roundedBox(0.07, 0.07, platDepth - 0.7, 0.02), dark);
    handrail.position.set(BOARDING_X - 1.72, PLATFORM_Y + 0.88, platZ);
    this.group.add(handrail);

    // Hazard edging along the front lip of the platform.
    const lip = new THREE.Mesh(
      new THREE.PlaneGeometry(3.5, 0.16),
      emissiveMaterial('bayLip', '#c98b32', 0.55),
    );
    lip.rotation.x = -Math.PI / 2;
    lip.position.set(BOARDING_X, PLATFORM_Y + 0.005, PLATFORM_FRONT_Z - 0.12);
    this.group.add(lip);

    // The pod's nose (local −Z) must point out through the hatch, along −X.
    this.podSeat.position.set(POD_SEAT_X, POD_SEAT_Y, CRADLE_Z);
    this.podSeat.rotation.y = Math.PI / 2;
    this.group.add(this.podSeat);
    this.hatchCentre.position.set(hatchX, openTop / 2, CRADLE_Z);
    this.group.add(this.hatchCentre);

    /* ------------------------------------------------------------ fittings */
    this.panel = new ControlPanel('bay-panel');
    this.panel.group.position.set(hw - 0.08, 1.4, -2.2);
    this.panel.group.rotation.y = -Math.PI / 2;
    this.group.add(this.panel.group);

    const plinth = new THREE.Mesh(roundedBox(0.5, 1.05, 0.4, 0.05), dark);
    plinth.position.set(hw - 0.9, 0.52, 2.6);
    this.group.add(plinth);
    const plinthTop = new THREE.Mesh(roundedBox(0.55, 0.09, 0.45, 0.03), struct);
    plinthTop.position.set(hw - 0.9, 1.08, 2.6);
    plinthTop.rotation.x = -0.24;
    this.group.add(plinthTop);
    const plinthLight = new THREE.Mesh(
      new THREE.PlaneGeometry(0.34, 0.24),
      emissiveMaterial('plinthUi', '#7dc8ff', 0.9),
    );
    plinthLight.position.set(hw - 0.9, 1.14, 2.62);
    plinthLight.rotation.x = -Math.PI / 2 + 0.24;
    this.group.add(plinthLight);

    // Ceiling lights: two runs down the length of the bay, one of them over
    // the cradle so the pod's near flank is lit rather than silhouetted.
    for (const z of [-2.6, 1.4]) {
      const housing = new THREE.Mesh(roundedBox(4.6, 0.12, 0.46, 0.03), dark);
      housing.position.set(-0.4, h - 0.05, z);
      this.group.add(housing);
      const m = emissiveMaterial('bayLamp', '#f2f6ff', 1.15).clone();
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.03, 0.32), m);
      lamp.position.set(-0.4, h - 0.11, z);
      this.group.add(lamp);
      this.lampMats.push(m);
      const light = new THREE.PointLight(0xf0f5ff, 14, 15, 2);
      light.position.set(-0.4, h - 0.4, z);
      this.group.add(light);
      this.addLight(light);
    }
    // A soft fill from the doorway side so the flank facing the camera is not
    // reading as a dark cylinder against a bright wall.
    const fill = new THREE.PointLight(0xd6e2f2, 9, 14, 2);
    fill.position.set(POD_SEAT_X + 1.6, 2.5, -hd + 1.6);
    this.group.add(fill);
    this.addLight(fill);
    // A lamp in the throat of the opening. Without it the closed leaves sit in
    // their own shadow and the launch hatch reads as a hole cut in the wall.
    const throat = new THREE.PointLight(0xbcd0e6, 7, 8, 2);
    throat.position.set(-hw + 0.5, openTop - 0.5, CRADLE_Z);
    this.group.add(throat);
    this.addLight(throat);

    // Launch warning beacons either side of the hatch.
    for (const z of [-1, 1]) {
      const m = emissiveMaterial('bayWarn', '#ffb02a', 0.6).clone();
      const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 7), m);
      beacon.position.set(-hw + 0.32, openTop + 0.16, CRADLE_Z + z * (openHalfZ + 0.17));
      this.group.add(beacon);
      this.warnMats.push(m);
    }

    // Hazard chevrons on the deck under the launch line.
    for (let i = 0; i < 5; i++) {
      const chev = new THREE.Mesh(
        new THREE.PlaneGeometry(0.75, 0.17),
        emissiveMaterial('bayChevron', '#c98b32', 0.5),
      );
      chev.rotation.x = -Math.PI / 2;
      chev.position.set(-hw + 0.8 + i * 0.95, 0.012, CRADLE_Z + 3.0);
      this.group.add(chev);
    }

    /* ------------------------------------------------------------ dressing */
    // Bare walls read as an unfinished level. Equipment lockers, a coolant
    // manifold and a couple of pipe runs give the bay a working purpose and
    // break up the large flat panels behind the pod.
    for (let i = 0; i < 4; i++) {
      const locker = new THREE.Mesh(roundedBox(0.5, 1.85, 0.78, 0.04), struct);
      locker.position.set(hw - 0.26, 0.93, -3.4 + i * 0.84);
      this.group.add(locker);
      const face = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 1.6), dark);
      face.rotation.y = -Math.PI / 2;
      face.position.set(hw - 0.5, 0.95, -3.4 + i * 0.84);
      this.group.add(face);
      const tag = new THREE.Mesh(
        new THREE.PlaneGeometry(0.2, 0.06),
        emissiveMaterial('bayTag', '#7dc8ff', 0.7),
      );
      tag.rotation.y = -Math.PI / 2;
      tag.position.set(hw - 0.51, 1.62, -3.4 + i * 0.84);
      this.group.add(tag);
    }
    // Coolant bottles racked against the aft wall.
    for (let i = 0; i < 3; i++) {
      const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 1.3, 12), struct);
      bottle.position.set(2.5 + i * 0.56, 0.65, hd - 0.36);
      this.group.add(bottle);
      const collarTop = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 0.2, 12), dark);
      collarTop.position.set(2.5 + i * 0.56, 1.38, hd - 0.36);
      this.group.add(collarTop);
    }
    const strap = new THREE.Mesh(roundedBox(2.0, 0.1, 0.12, 0.03), dark);
    strap.position.set(3.06, 1.0, hd - 0.2);
    this.group.add(strap);
    // Pipe runs along the top of the aft and starboard walls.
    for (const dy of [h - 0.55, h - 0.85]) {
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, BAY_WIDTH - 0.6, 10), struct);
      pipe.rotation.z = Math.PI / 2;
      pipe.position.set(0, dy, hd - 0.22);
      this.group.add(pipe);
    }
    for (let i = 0; i < 5; i++) {
      const bracket = new THREE.Mesh(roundedBox(0.14, 0.5, 0.3, 0.03), dark);
      bracket.position.set(-4 + i * 2, h - 0.7, hd - 0.1);
      this.group.add(bracket);
    }
  }

  private addLight(l: THREE.PointLight): void {
    this.lights.push(l);
    this.lightBase.push(l.intensity);
  }

  /** 0 = sealed, 1 = fully open to vacuum. */
  setHatch(v: number): void {
    this.hatchOpen = THREE.MathUtils.clamp(v, 0, 1);
  }

  setAlarm(v: number): void {
    this.alarm = THREE.MathUtils.clamp(v, 0, 1);
  }

  setLightLevel(v: number): void {
    for (const m of this.lampMats) m.emissiveIntensity = 1.15 * v;
    for (let i = 0; i < this.lights.length; i++) this.lights[i].intensity = this.lightBase[i] * v;
  }

  update(dt: number, elapsed: number): void {
    this.panel.update(dt, elapsed);
    for (let i = 0; i < this.hatchLeaves.length; i++) {
      const s = i === 0 ? -1 : 1;
      this.hatchLeaves[i].position.y =
        (i === 0 ? this.openTop / 4 : (this.openTop * 3) / 4) + s * this.hatchOpen * (this.openTop / 2 + 0.25);
    }
    this.starField.visible = this.hatchOpen > 0.02;
    (this.starField.material as THREE.MeshBasicMaterial).opacity = Math.min(1, this.hatchOpen * 1.6);
    this.hatchGlow.visible = this.hatchOpen > 0.02;
    this.hatchGlowMat.opacity = this.hatchOpen * 0.16;
    const strobe = this.alarm * (Math.sin(elapsed * 6.4) > 0 ? 1 : 0.08);
    for (const m of this.warnMats) m.emissiveIntensity = 0.4 + strobe * 4.5;
  }
}

/** A small canvas of stars, for the vacuum seen through the open hatch. */
let starPatchTexture: THREE.Texture | null = null;
function starPatch(): THREE.Texture {
  if (starPatchTexture) return starPatchTexture;
  const size = 256;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  g.fillStyle = '#04050a';
  g.fillRect(0, 0, size, size);
  let seed = 1337;
  const rand = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  for (let i = 0; i < 150; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = rand() * 1.1 + 0.25;
    const a = 0.3 + rand() * 0.7;
    g.fillStyle = `rgba(${210 + rand() * 45 | 0},${220 + rand() * 35 | 0},255,${a})`;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
  starPatchTexture = new THREE.CanvasTexture(c);
  starPatchTexture.colorSpace = THREE.SRGBColorSpace;
  return starPatchTexture;
}
