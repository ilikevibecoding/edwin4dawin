import * as THREE from 'three';
import { buildShell, shellReport } from './shell.js';
import { batchParts } from './merge.js';
import { LightRig } from './lighting.js';
import { DoorSystem } from './doors.js';
import { collision } from './collision.js';
import { buildProps } from '../props/dress.js';
import { buildGlass, GlassSystem } from './glass.js';
import { NavGraph } from './nav.js';
import { INTERIOR_ROOMS, ROOMS, CHECKPOINTS } from './layout.js';

/**
 * LEVEL ASSEMBLY
 * Owner: Opus 1.
 *
 * Build order matters: shell first (it owns the collision AABBs and the room
 * volumes), then glazing, then lighting fixtures, then props, then doors, and
 * finally the navigation graph which samples the finished collision world.
 */

export class Level {
  constructor(scene) {
    this.scene = scene;
    this.root = new THREE.Group();
    this.root.name = 'level';
    scene.add(this.root);
    this.stats = {};
  }

  async build(onProgress = () => {}) {
    const t0 = performance.now();
    collision.clear();
    const timings = {};
    let mark = performance.now();
    const lap = (k) => { timings[k] = Math.round(performance.now() - mark); mark = performance.now(); };

    onProgress(0.05, 'Surveying the building shell');
    const shell = buildShell();
    lap('shell');
    await frame();

    onProgress(0.2, 'Casting walls, floors and stairs');
    this.shellBatch = batchParts(shell.parts, { name: 'shell', cellSize: 24 });
    lap('shellBatch');
    this.root.add(this.shellBatch);
    collision.addAll(shell.colliders);
    collision.registerRaycastTarget(this.shellBatch);
    await frame();

    onProgress(0.4, 'Glazing the curtain wall');
    this.glass = new GlassSystem(this.root);
    this.glass.build(buildGlass(shell.glassPanes));
    await frame();

    onProgress(0.52, 'Commissioning the lighting plan');
    this.lights = new LightRig(this.scene);
    this.lights.onShadowMoved = () => this.onShadowMoved?.();
    const lightBuild = this.lights.build();
    this.lightBatch = batchParts(lightBuild.parts, { name: 'fixtures', castShadow: false, cellSize: 24 });
    this.root.add(this.lightBatch);
    collision.registerRaycastTarget(this.lightBatch);
    await frame();

    lap('glassAndLights');
    onProgress(0.62, 'Furnishing the floors');
    const props = buildProps();
    lap('propsBuild');
    this.propBatch = batchParts(props.parts, { name: 'props', cellSize: 12 });
    lap('propsBatch');
    this.root.add(this.propBatch);
    collision.addAll(props.colliders);
    collision.registerRaycastTarget(this.propBatch);
    if (props.dynamic) {
      this.propDynamic = props.dynamic;
      this.root.add(props.dynamic);
      collision.registerRaycastTarget(props.dynamic);
    }
    this.screens = props.screens ?? [];
    await frame();

    onProgress(0.8, 'Hanging doors and hardware');
    this.doors = new DoorSystem(this.root);
    this.doors.build(shell.doorSlots);
    await frame();

    lap('doors');
    onProgress(0.9, 'Baking the navigation graph');
    this.nav = new NavGraph();
    this.nav.build();
    lap('nav');
    await frame();

    this.stats = {
      buildMs: Math.round(performance.now() - t0),
      timings,
      batches: {
        shell: this.shellBatch.children.length,
        props: this.propBatch.children.length,
        fixtures: this.lightBatch.children.length,
      },
      shell: shellReport(),
      collision: collision.stats(),
      doors: this.doors.doors.length,
      glass: this.glass.panes.length,
      props: props.count,
      nav: this.nav.report(),
      lights: this.lights.report(),
      triangles: (this.shellBatch.userData.triangles ?? 0) + (this.propBatch.userData.triangles ?? 0) + (this.lightBatch.userData.triangles ?? 0),
      trianglesByGroup: {
        shell: Math.round(this.shellBatch.userData.triangles ?? 0),
        props: Math.round(this.propBatch.userData.triangles ?? 0),
        fixtures: Math.round(this.lightBatch.userData.triangles ?? 0),
      },
    };
    onProgress(1, 'Ready');
    return this.stats;
  }

  update(dt, cameraPos) {
    this.doors.update(dt);
    this.lights.update(cameraPos);
    this.glass.update(dt);
  }

  reset() {
    this.doors.reset();
    this.glass.reset();
  }

  roomList() {
    return INTERIOR_ROOMS.map((r) => r.id);
  }

  checkpoint(name) {
    return CHECKPOINTS[name] ?? null;
  }
}

function frame() {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

void ROOMS;
