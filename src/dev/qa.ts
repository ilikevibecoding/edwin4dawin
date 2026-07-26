import * as THREE from 'three';
import type { Game } from '../game/game';
import type { PropProto } from '../assets/models/props/kit';
import * as office from '../assets/models/props/office';
import * as breakroom from '../assets/models/props/breakroom';
import * as restroom from '../assets/models/props/restroom';
import * as maintenance from '../assets/models/props/maintenance';
import * as lobbyset from '../assets/models/props/lobbyset';
import { Humanoid, type AnimName } from '../assets/models/characters/humanoid';
import { buildSkin, kestrelOutfits, civilianOutfits } from '../assets/models/characters/skins';
import { worldWeapon } from '../assets/models/weapons/worldmodels';
import { makeCanvas, toTexture } from '../assets/textures/gen';

/**
 * QA asset gallery + collision/nav visualization (Opus 4).
 * Gallery lives far below the map; the camera is repositioned by exhibit.
 */

interface Exhibit {
  id: string;
  build: () => THREE.Object3D;
  /** camera distance */
  dist?: number;
}

function protoToGroup(proto: PropProto): THREE.Group {
  const g = new THREE.Group();
  for (const part of proto.parts) {
    const mesh = new THREE.Mesh(part.geo, part.mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    g.add(mesh);
  }
  return g;
}

function humanoidExhibit(outfitIdx: number, head: number, hostile: boolean, anim: AnimName, weapon?: string): () => THREE.Object3D {
  return () => {
    const outfit = hostile ? kestrelOutfits()[outfitIdx] : civilianOutfits()[outfitIdx];
    const h = new Humanoid(buildSkin(outfit, head, hostile));
    if (weapon) h.attachWeapon(worldWeapon(weapon));
    if (anim === 'death') h.die(new THREE.Vector3(0.4, 0, 0.8), 1);
    else h.setAnim(anim);
    for (let i = 0; i < 40; i++) h.update(1 / 30, anim.includes('walk') || anim === 'follow' || anim === 'run' ? 2 : 0);
    return h.root;
  };
}

export function buildExhibits(): Exhibit[] {
  const list: Exhibit[] = [];
  const addP = (id: string, fn: () => PropProto, dist = 2.6): void => {
    list.push({ id, build: () => protoToGroup(fn()), dist });
  };
  addP('prop.desk.standard', office.standardDesk);
  addP('prop.desk.exec', office.execDesk, 3.4);
  addP('prop.table.conference', office.conferenceTable, 5);
  addP('prop.chair.task', () => office.taskChair(0), 1.8);
  addP('prop.chair.conf', office.confChair, 1.8);
  addP('prop.chair.waiting', office.waitingChair, 1.8);
  addP('prop.sofa', office.sofa, 3);
  addP('prop.cubicle.pod', () => office.cubiclePod(3), 4.5);
  addP('prop.electronics.monitor', () => office.monitorProto('spreadsheet'), 1.2);
  addP('prop.electronics.laptop', () => office.laptop('code'), 1);
  addP('prop.electronics.copier', office.copier, 2.4);
  addP('prop.electronics.serverrack', office.serverRack, 3);
  addP('prop.electronics.security', office.securityConsole, 3.4);
  addP('prop.storage.filing', () => office.filingCabinet(true), 2.2);
  addP('prop.storage.bookcase', () => office.bookcase(1), 2.8);
  addP('prop.storage.archive', () => office.archiveRack(2), 4.4);
  addP('prop.storage.locker', office.lockerBank, 2.8);
  addP('prop.wall.whiteboard', office.whiteboard, 2.4);
  addP('prop.wall.noticeboard', office.noticeBoard, 2);
  addP('prop.wall.display', office.presentationDisplay, 2.4);
  addP('prop.wall.brand', office.brandWallPanel, 5);
  addP('prop.decor.plant', () => office.officePlant(true), 2.2);
  addP('prop.decor.planter', office.planterBox, 2.2);
  addP('prop.decor.coatrack', () => office.coatRack(true), 2.4);
  addP('prop.kitchen.counter', () => breakroom.kitchenCounter(2.4), 3.4);
  addP('prop.kitchen.fridge', breakroom.fridge, 2.6);
  addP('prop.kitchen.vending', breakroom.vendingMachine, 2.8);
  addP('prop.kitchen.watercooler', breakroom.waterCooler, 2);
  addP('prop.wellness.cot', breakroom.wellnessCot, 2.8);
  addP('prop.restroom.sink', () => restroom.sinkCounter(1.6), 2.6);
  addP('prop.restroom.stalls', () => restroom.stallRow(2), 3.2);
  addP('prop.restroom.toilet', restroom.toilet, 1.8);
  addP('prop.janitor.cart', restroom.janitorCart, 2.4);
  addP('prop.mech.panel', maintenance.electricalPanel, 2.6);
  addP('prop.mech.hvac', maintenance.hvacUnit, 3.2);
  addP('prop.safety.extinguisher', () => maintenance.fireExtinguisher(false), 1.4);
  addP('prop.loading.crates', () => maintenance.crateStack(4, true), 2.8);
  addP('prop.loading.pallet', maintenance.palletBoxes, 2.8);
  addP('prop.garage.van', maintenance.responseVan, 6);
  addP('prop.garage.barrels', maintenance.barrelGroup, 2.6);
  addP('prop.garage.workbench', maintenance.workbench, 2.8);
  addP('prop.reception.desk', lobbyset.receptionDesk, 4);
  addP('prop.vestibule.gate', lobbyset.badgeGate, 2.2);
  addP('prop.kestrel.banner', maintenance.kestrelBannerProp, 3);
  // characters
  list.push({ id: 'char.kestrel.charcoal.idle', build: humanoidExhibit(0, 0, true, 'idle', 'vc7'), dist: 2.4 });
  list.push({ id: 'char.kestrel.olive.walk', build: humanoidExhibit(1, 1, true, 'walk', 'kis10'), dist: 2.4 });
  list.push({ id: 'char.kestrel.snow.aim', build: humanoidExhibit(2, 2, true, 'aim', 'br8'), dist: 2.4 });
  list.push({ id: 'char.kestrel.head3.search', build: humanoidExhibit(0, 3, true, 'search', 'vc7'), dist: 2.4 });
  list.push({ id: 'char.hostage.analyst.kneel', build: humanoidExhibit(0, 0, false, 'kneel'), dist: 2.2 });
  list.push({ id: 'char.hostage.engineer.follow', build: humanoidExhibit(1, 1, false, 'follow'), dist: 2.4 });
  list.push({ id: 'char.kestrel.death', build: humanoidExhibit(1, 2, true, 'death', 'vc7'), dist: 2.6 });
  list.push({ id: 'char.hostage.fear', build: humanoidExhibit(0, 1, false, 'fear'), dist: 2.2 });
  // world weapons
  for (const w of ['vc7', 'kis10', 'br8']) {
    list.push({ id: `weapon.world.${w}`, build: () => worldWeapon(w), dist: 1.2 });
  }
  return list;
}

export class QaTools {
  private game: Game;
  private galleryGroup: THREE.Group | null = null;
  private exhibits = buildExhibits();
  private currentLabel: THREE.Sprite | null = null;
  private collisionGroup: THREE.Group | null = null;
  private savedCam: { pos: THREE.Vector3; quat: THREE.Quaternion } | null = null;

  constructor(game: Game) {
    this.game = game;
  }

  galleryList(): string[] {
    return this.exhibits.map((e) => e.id);
  }

  /** Show exhibit by id or index on an isolated platform below the map. */
  galleryShow(idOrIndex: string | number): string | null {
    const ex = typeof idOrIndex === 'number'
      ? this.exhibits[idOrIndex]
      : this.exhibits.find((e) => e.id === idOrIndex || e.id.includes(String(idOrIndex)));
    if (!ex) return null;
    const scene = this.game.engine.scene;
    if (!this.galleryGroup) {
      this.galleryGroup = new THREE.Group();
      this.galleryGroup.name = 'qa-gallery';
      this.galleryGroup.position.set(0, -60, 0);
      const floor = new THREE.Mesh(
        new THREE.CircleGeometry(8, 32).rotateX(-Math.PI / 2),
        new THREE.MeshStandardMaterial({ color: 0x707880, roughness: 0.9 }),
      );
      floor.receiveShadow = true;
      this.galleryGroup.add(floor);
      const key = new THREE.DirectionalLight(0xffffff, 2.4);
      key.position.set(3, 5, 4);
      key.castShadow = true;
      const fill = new THREE.HemisphereLight(0xcfe0f2, 0x3a4048, 1.0);
      const rim = new THREE.PointLight(0x88bbff, 30, 15);
      rim.position.set(-3, 3, -3);
      this.galleryGroup.add(key, fill, rim);
      scene.add(this.galleryGroup);
    }
    // clear previous exhibit (children after the 4 fixtures)
    while (this.galleryGroup.children.length > 4) {
      this.galleryGroup.remove(this.galleryGroup.children[4]);
    }
    const obj = ex.build();
    if (ex.id.startsWith('char.')) obj.rotation.y = -0.7; // 3/4 view
    this.galleryGroup.add(obj);
    this.game.hud.setVisible(false);
    // label sprite
    const { canvas, ctx } = makeCanvas(512, 64);
    ctx.fillStyle = 'rgba(8,12,16,0.85)';
    ctx.fillRect(0, 0, 512, 64);
    ctx.fillStyle = '#37d0e6';
    ctx.font = '600 30px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ex.id, 256, 32);
    const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: toTexture(canvas, { repeat: false }), depthTest: false }));
    label.scale.set(3, 0.375, 1);
    label.position.set(0, -0.4, 2);
    this.galleryGroup.add(label);
    this.currentLabel = label;
    // move camera
    if (!this.savedCam) {
      this.savedCam = {
        pos: this.game.engine.camera.position.clone(),
        quat: this.game.engine.camera.quaternion.clone(),
      };
    }
    const d = ex.dist ?? 2.6;
    const cam = this.game.engine.camera;
    this.game.cameraOverride = true;
    cam.position.set(d * 0.75, -60 + d * 0.55 + 0.8, d);
    cam.lookAt(0, -60 + Math.min(1.1, d * 0.3), 0);
    return ex.id;
  }

  galleryClose(): void {
    if (this.galleryGroup) {
      this.game.engine.scene.remove(this.galleryGroup);
      this.galleryGroup = null;
    }
    this.game.cameraOverride = false;
    this.savedCam = null;
  }

  /** wireframe collision + nav-node display */
  showCollision(on: boolean): void {
    if (!on) {
      if (this.collisionGroup) {
        this.game.engine.scene.remove(this.collisionGroup);
        this.collisionGroup = null;
      }
      return;
    }
    if (this.collisionGroup) return;
    const g = new THREE.Group();
    g.name = 'qa-collision';
    const mat = new THREE.LineBasicMaterial({ color: 0x37d0e6, transparent: true, opacity: 0.35 });
    const matDyn = new THREE.LineBasicMaterial({ color: 0xe6b64c, transparent: true, opacity: 0.7 });
    const addBox = (min: THREE.Vector3, max: THREE.Vector3, m: THREE.LineBasicMaterial): void => {
      const box = new THREE.Box3(min, max);
      const helper = new THREE.Box3Helper(box, m.color);
      (helper.material as THREE.LineBasicMaterial).transparent = true;
      (helper.material as THREE.LineBasicMaterial).opacity = m.opacity;
      g.add(helper);
    };
    for (const b of this.game.world.collision.allStatics()) addBox(b.min, b.max, mat);
    for (const [, b] of this.game.world.collision.allDynamics()) addBox(b.min, b.max, matDyn);
    // nav nodes
    const pts: number[] = [];
    for (const n of this.game.nav.nodes) {
      const w = this.game.nav.worldOf(n);
      pts.push(w.x, w.y + 0.05, w.z);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pts), 3));
    const points = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0x5ad08e, size: 0.08 }));
    g.add(points);
    this.collisionGroup = g;
    this.game.engine.scene.add(g);
  }
}
