import * as THREE from 'three';
import { Engine } from './core/engine';
import { Environment } from './world/environment';
import { IslandField } from './world/islands';
import { Ocean } from './world/ocean';
import { Ship } from './ship/ship';

const canvas = document.getElementById('viewport') as HTMLCanvasElement;
const engine = new Engine(canvas);
const env = new Environment(engine.scene);
const islands = new IslandField();
islands.build();
engine.scene.add(islands.group);
const ocean = new Ocean(env, islands, engine.scene, engine.quality.oceanSegments);

const ship = new Ship({ name: 'The Salty Regret' });
engine.scene.add(ship.group);
ship.place(-60, 240, 0.4);
ship.sailAmount = 1;
ship.anchorUp = true;
ship.anchorRaise = 1;

engine.camera.position.set(-90, 9, 258);
engine.camera.lookAt(ship.position.x, 4, ship.position.z);

engine.onFixedUpdate = (dt) => {
  ship.update(dt, env, ocean, islands);
};

engine.onRender = (dt) => {
  env.update(dt, engine.camera.position);
  env.focusShadows(ship.position);
  ocean.update(dt, engine.camera.position, [ship.wakeSource()]);
};

engine.start();
document.getElementById('loading')?.classList.add('hidden');
document.getElementById('title-screen')?.classList.add('hidden');

Object.assign(window as unknown as Record<string, unknown>, {
  engine,
  env,
  islands,
  ocean,
  ship,
  THREE,
  __gameReady: true,
});
