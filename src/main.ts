import * as THREE from 'three';
import { Engine } from './core/engine';
import { Environment } from './world/environment';
import { IslandField } from './world/islands';
import { Ocean } from './world/ocean';

const canvas = document.getElementById('viewport') as HTMLCanvasElement;
const engine = new Engine(canvas);
const env = new Environment(engine.scene);
const islands = new IslandField();
islands.build();
engine.scene.add(islands.group);
const ocean = new Ocean(env, islands, engine.scene, engine.quality.oceanSegments);

engine.camera.position.set(-40, 8, 200);
engine.camera.lookAt(-180, 20, -160);

engine.onRender = (dt) => {
  env.update(dt, engine.camera.position);
  env.focusShadows(engine.camera.position);
  ocean.update(dt, engine.camera.position, []);
};

engine.start();
document.getElementById('loading')?.classList.add('hidden');
document.getElementById('title-screen')?.classList.add('hidden');

Object.assign(window as unknown as Record<string, unknown>, {
  engine,
  env,
  islands,
  ocean,
  THREE,
  __gameReady: true,
});
