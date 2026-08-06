/**
 * Contract between environment modules and the game director.
 *
 * An environment module builds geometry into a detached Group and describes the
 * look of the scene declaratively. The director attaches the group, applies the
 * sky / atmosphere / grade, and drives `update` each frame.
 */
import * as THREE from 'three';
import type { AtmosphereParams, GradePreset } from '../engine/PostFX';
import type { SkyPreset } from '../engine/Sky';
import type { Stage } from '../engine/Stage';

export interface ShaftSpec {
  position: THREE.Vector3;
  color: THREE.Color;
  intensity: number;
}

/**
 * A named point of interest.
 *
 * IMPORTANT CONVENTION: `yaw` is the facing direction of a thing that looks
 * along +Z at yaw 0, matching how characters are modelled. An actor placed at a
 * mark with yaw 0 faces +Z; yaw = Math.PI faces -Z; yaw = Math.PI/2 faces +X.
 * Two actors facing each other therefore have yaws that differ by PI.
 */
export interface Mark {
  position: THREE.Vector3;
  yaw: number;
}

export interface ClueSpec {
  id: string;
  label: string;
  /** World position the reticle locks on to. */
  position: THREE.Vector3;
  /** Text revealed once analysed. */
  detail: string;
  target?: THREE.Object3D;
}

export interface SceneBuild {
  /** Not yet parented; the director adds this to the stage scene. */
  root: THREE.Group;
  sky: SkyPreset;
  /** Hidden for fully enclosed interiors so the background stays black. */
  showSkyBackground?: boolean;
  atmosphere: AtmosphereParams;
  grade: GradePreset;
  /** 0..1 rain intensity: drives both the world particles and the lens drops. */
  rain: number;
  /** Volumetric shafts; at most two are used. */
  shafts?: ShaftSpec[];
  marks: Record<string, Mark>;
  lights?: Record<string, THREE.Light>;
  /** Interactive/scannable points of interest for analysis mode. */
  clues?: ClueSpec[];
  /**
   * Region the camera is allowed to occupy. Interior sets must supply this or
   * shot solvers will happily place the lens outside the room.
   */
  cameraBounds?: THREE.Box3;
  update?: (dt: number, elapsed: number) => void;
  dispose?: () => void;
}

export type SceneBuilder = (stage: Stage) => SceneBuild;

export function mark(x: number, y: number, z: number, yaw = 0): Mark {
  return { position: new THREE.Vector3(x, y, z), yaw };
}

/** Applies shadow flags across a subtree. */
export function setShadows(root: THREE.Object3D, cast: boolean, receive: boolean) {
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) {
      m.castShadow = cast;
      m.receiveShadow = receive;
    }
  });
}
