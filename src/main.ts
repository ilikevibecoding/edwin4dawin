import * as THREE from 'three';
import { Game } from './game/game';

const canvas = document.getElementById('viewport') as HTMLCanvasElement;
const game = new Game(canvas);
game.start();

// Exposed for the headless smoke tests and for poking at the world in the console.
Object.assign(window as unknown as Record<string, unknown>, {
  game,
  engine: game.engine,
  env: game.env,
  islands: game.islands,
  ocean: game.ocean,
  ship: game.playerShip,
  player: game.player,
  THREE,
  __gameReady: true,
});
