import * as THREE from 'three';
import type { EngineContext } from '../../core/System';

const GRID_PX = 64;
const FLOOR_SIZE = 140;
const WALL_WIDTH = 30;
const WALL_HEIGHT = 14;
/** Distance from the floor centre to the target wall. */
const WALL_BACK = 10;
/** Height of the reference figures, in metres. */
const FIGURE_HEIGHT = 1.8;

/**
 * A proving ground for the effects, built only under `?fxdemo=1`.
 *
 * Judging an effect against the level itself does not work: a dust puff in front
 * of a beige building at an unknown distance could be thirty centimetres or
 * eight metres across, and there is no way to tell which from a screenshot. The
 * range is a flat grid floor with one square per metre, a gridded target wall
 * and a row of 1.8 m reference figures, so every effect is measured against
 * something instead of guessed at. It floats well above the level so nothing
 * intersects it and smoke reads as a silhouette against the sky.
 */
export class FXRange {
  readonly root = new THREE.Group();
  /** Centre of the floor, on its surface. */
  readonly floorCenter = new THREE.Vector3();
  /** Point on the target wall at chest height. */
  readonly wallPoint = new THREE.Vector3();
  /** Outward normal of the target wall. */
  readonly wallNormal = new THREE.Vector3(0, 0, 1);

  private grid: THREE.DataTexture | null = null;
  private readonly materials: THREE.Material[] = [];
  private readonly geometries: THREE.BufferGeometry[] = [];

  build(ctx: EngineContext, at: THREE.Vector3): void {
    this.root.name = 'fx:range';
    this.floorCenter.copy(at);
    this.wallPoint.set(at.x, at.y + 1.4, at.z - WALL_BACK);
    this.wallNormal.set(0, 0, 1);

    const grid = this.makeGrid();
    grid.anisotropy = ctx.config.anisotropy;

    const floorMap = grid.clone();
    floorMap.needsUpdate = true;
    floorMap.wrapS = THREE.RepeatWrapping;
    floorMap.wrapT = THREE.RepeatWrapping;
    floorMap.repeat.set(FLOOR_SIZE, FLOOR_SIZE);
    floorMap.anisotropy = ctx.config.anisotropy;
    this.add(
      new THREE.PlaneGeometry(FLOOR_SIZE, FLOOR_SIZE),
      new THREE.MeshStandardMaterial({ map: floorMap, roughness: 0.92, metalness: 0 }),
      (mesh) => {
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.copy(at);
        mesh.receiveShadow = true;
      },
    );

    const wallMap = grid.clone();
    wallMap.needsUpdate = true;
    wallMap.wrapS = THREE.RepeatWrapping;
    wallMap.wrapT = THREE.RepeatWrapping;
    wallMap.repeat.set(WALL_WIDTH, WALL_HEIGHT);
    wallMap.anisotropy = ctx.config.anisotropy;
    this.add(
      new THREE.PlaneGeometry(WALL_WIDTH, WALL_HEIGHT),
      new THREE.MeshStandardMaterial({ map: wallMap, roughness: 0.9, metalness: 0 }),
      (mesh) => {
        mesh.position.set(at.x, at.y + WALL_HEIGHT / 2, at.z - WALL_BACK);
        mesh.receiveShadow = true;
      },
    );

    // Human scale, at metre marks either side of the effect origin.
    const figure = new THREE.CapsuleGeometry(0.22, FIGURE_HEIGHT - 0.44, 4, 8);
    this.geometries.push(figure);
    const skin = new THREE.MeshStandardMaterial({ color: 0x8d8f92, roughness: 0.7, metalness: 0 });
    this.materials.push(skin);
    for (const offset of FIGURES) {
      const mesh = new THREE.Mesh(figure, skin);
      mesh.name = 'fx:rangeFigure';
      mesh.position.set(at.x + offset[0], at.y + FIGURE_HEIGHT / 2, at.z + offset[1]);
      mesh.castShadow = true;
      this.root.add(mesh);
    }

    ctx.scene.add(this.root);
  }

  private add(
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    setup: (mesh: THREE.Mesh) => void,
  ): void {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = 'fx:rangeSurface';
    setup(mesh);
    this.geometries.push(geometry);
    this.materials.push(material);
    this.root.add(mesh);
  }

  /** One tile per metre: a mid-grey square with a lighter edge on two sides. */
  private makeGrid(): THREE.DataTexture {
    if (this.grid) return this.grid;
    const data = new Uint8Array(GRID_PX * GRID_PX * 4);
    for (let y = 0; y < GRID_PX; y++) {
      for (let x = 0; x < GRID_PX; x++) {
        const edge = x < 2 || y < 2;
        // A tenth-metre tick as well, so sub-metre effects can still be sized.
        const tick = x % 8 === 0 || y % 8 === 0;
        const v = edge ? 152 : tick ? 118 : 104;
        const i = (y * GRID_PX + x) * 4;
        data[i] = v;
        data[i + 1] = v;
        data[i + 2] = Math.round(v * 0.97);
        data[i + 3] = 255;
      }
    }
    const texture = new THREE.DataTexture(data, GRID_PX, GRID_PX, THREE.RGBAFormat);
    texture.name = 'fx:rangeGrid';
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.generateMipmaps = true;
    texture.needsUpdate = true;
    this.grid = texture;
    return texture;
  }

  dispose(): void {
    this.root.removeFromParent();
    for (const g of this.geometries) g.dispose();
    for (const m of this.materials) m.dispose();
    this.grid?.dispose();
    this.geometries.length = 0;
    this.materials.length = 0;
  }
}

/** Reference-figure offsets from the floor centre, in metres. */
const FIGURES: readonly [number, number][] = [
  [-2, 0],
  [2, 0],
  [-6, -2],
  [6, -2],
  [-14, -4],
  [14, -4],
  // Near the camera for scale, but off the axis: a figure directly between the
  // eye and the effect hides the thing being reviewed.
  [3.6, 4],
];
