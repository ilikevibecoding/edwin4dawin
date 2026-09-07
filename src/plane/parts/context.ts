import * as THREE from 'three';
import { Batch, placement, quadGeometry } from '../geometry';
import type { UvRect } from '../textures';
import type { Materials } from './materials';
import type { FuselageFrame } from './fuselage';

// ------------------------------------------------------------ shared layout (body space: +X nose, +Y up, +Z starboard)

/** fuselage skin thickness: the cabin interior is the exterior loft offset inwards by this much */
export const SKIN = 0.05;
/** window band heights (body space): sill, top of the side windows, bottom of the windshield side-lights */
export const SILL = 0.40, WIN_TOP = 1.07, WS_BASE = 0.78;
/** cabin interior extent (firewall .. rear bulkhead) */
export const CABIN_FRONT = 2.30, CABIN_REAR = -1.60;
/** cabin floor height; seats and pedals stand on it, the pilot's eye ends up ~0.7 m above the cushion */
export const FLOOR = -0.25;
/** instrument panel: top edge station (under the glare shield's rear edge) and its lean toward the pilot */
export const PANEL_X = 2.05, PANEL_TILT = 0.3;
/** yoke hub (neutral): ~0.66 m ahead of and 0.48 m below the eye (chest height), so the horns show at the bottom of the view */
export const YOKE_HUB_X = 1.66, YOKE_HUB_Y = 0.52;
export const YOKE_HUB = new THREE.Vector3(YOKE_HUB_X, YOKE_HUB_Y, 0);
/** where the pilot's wrists meet the hands on the grips (hub space), for the static forearms in the cabin kit */
export const WRIST = (s: number) => new THREE.Vector3(-0.115, 0.045, s * 0.165);
/** the throttle lever's pivot inside the pedestal quadrant (the lever mesh's origin; the right hand rides on it) */
export const THROTTLE_PIVOT = new THREE.Vector3(1.60, -0.25 + 0.345, -0.045);
/** wing datum (root 30 % chord point): the root's lower surface touches the roof crest (1.18) at mid chord */
export const WING_POS = new THREE.Vector3(0.55, 1.25, 0);
// seats: cushion top ~0.39 m over the floor so a seated pilot's eye (0.79 m over the cushion) lands at cockpitEye
export const SEAT_Y = FLOOR + 0.33;
/** live instrument channels (index into the needle shader's angle/shift arrays) */
export const CH = { fixed: 0, asi: 1, adi: 2, alt100: 3, alt1000: 4, tc: 5, tcBall: 6, hdg: 7, vsi: 8, rpm: 9, map: 10, oilp: 11, oilt: 12, egt: 13, fuell: 14, fuelr: 15, adiBank: 16 } as const;
export const N_CHANNELS = 17;
/** instrument canvases (GPS screen) are redrawn at most this often (simulated seconds) */
export const CANVAS_PERIOD = 1 / 15;

/** channels of the navigation-light mesh (index into `lightPower`) */
export const LIGHT = { red: 0, green: 1, tail: 2, beacon: 3, strobe: 4, landing: 5 } as const;
export const N_LIGHTS = 6;

export const DEG = Math.PI / 180;

// ------------------------------------------------------------ shorthands used by every part builder

export const at = placement;
export const V3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
export const UP = new THREE.Vector3(0, 1, 0);

export interface MeshOptions { parent?: THREE.Object3D; exterior?: boolean; cast?: boolean; receive?: boolean }
export type MeshFn = (geo: THREE.BufferGeometry, mat: THREE.Material, o?: MeshOptions) => THREE.Mesh;
export type DecalFn = (uv: UvRect, w: number, h: number, centre: THREE.Vector3, facing: THREE.Vector3, up: THREE.Vector3) => void;

/** The model's registries the part builders write into (`PlaneModel` provides them). */
export interface ModelRegistry {
  readonly root: THREE.Group;
  readonly materials: THREE.Material[];
  readonly exteriorMeshes: THREE.Mesh[];
  readonly interiorMeshes: THREE.Object3D[];
}

/**
 * Everything a part builder needs: the model's registries, the material table, the fuselage loft frame, the shared
 * batches that several parts add to (each is merged into one mesh exactly once, see `PlaneModel`'s constructor)
 * and the `mesh` / `decal` helpers. Builders run in a fixed order and must keep it: three.js sorts opaque objects
 * by material id then object id, so the creation order of materials and meshes is part of the rendered result.
 */
export interface BuildContext extends ModelRegistry {
  /** finished mesh of a batch (or single geometry) with shadow flags, registered as exterior or interior */
  readonly mesh: MeshFn;
  /** placard quad: centre, size, facing direction (unit), up direction (goes into `textured`) */
  readonly decal: DecalFn;
  readonly mat: Materials;
  readonly fuselage: FuselageFrame;
  /** exterior fittings (one merged mesh, `parts` material): steps, exhaust, struts, cleats, pitot, antenna ... */
  readonly fittings: Batch;
  /** intake scoop on the cowl top, cowl flaps, wing root fairing (white paint batch) */
  readonly white: Batch;
  /** every fixed lifting surface (wings, stabiliser, fin) shares the wing paint: one mesh */
  readonly airframe: Batch;
  /**
   * fixed cabin surfaces that must not cast shadows (the skin already does): the lined shell (headliner, window
   * band, sidewalls and door panels painted by cabinMaps in the loft's own UVs), the bulkheads, window reveals, floor
   */
  readonly cabinFixed: Batch;
  readonly cabinShell: Batch;
  /** cabin furniture (casts shadows inside the cabin) */
  readonly cabinKit: Batch;
  /**
   * textured cabin parts share the panel atlas: the face, the glare shield with its rolled lip, placards, the
   * compass card and the dome-light lens
   */
  readonly textured: THREE.BufferGeometry[];
}

export function createBuildContext(model: ModelRegistry, mat: Materials, fuselage: FuselageFrame): BuildContext {
  const mesh: MeshFn = (geo, mat, o = {}) => {
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = o.cast ?? true; m.receiveShadow = o.receive ?? true;
    (o.parent ?? model.root).add(m);
    if (o.exterior ?? true) model.exteriorMeshes.push(m); else model.interiorMeshes.push(m);
    return m;
  };
  const textured: THREE.BufferGeometry[] = [];
  const decal: DecalFn = (uv, w, h, centre, facing, up) => {
    const g = quadGeometry(w, h, uv);
    const zAxis = facing.clone().normalize(), yAxis = up.clone().addScaledVector(zAxis, -up.dot(zAxis)).normalize(), xAxis = new THREE.Vector3().crossVectors(yAxis, zAxis);
    g.applyMatrix4(new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis).setPosition(centre));
    textured.push(g);
  };
  return {
    root: model.root, materials: model.materials, exteriorMeshes: model.exteriorMeshes, interiorMeshes: model.interiorMeshes,
    mesh, decal, mat, fuselage,
    fittings: new Batch(), white: new Batch(), airframe: new Batch(), cabinFixed: new Batch(), cabinShell: new Batch(), cabinKit: new Batch(), textured,
  };
}
