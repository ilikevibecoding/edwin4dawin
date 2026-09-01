import * as THREE from 'three';
import { Game } from './core/Game.js';

window.THREE = THREE;

const canvas = document.getElementById('game-canvas');
const hudRoot = document.getElementById('hud');
const menuRoot = document.getElementById('menu');
const loading = document.getElementById('loading');

const game = new Game({ canvas, hudRoot, menuRoot });
window.__game = game;

game
  .init()
  .then(() => {
    loading.classList.add('hidden');
    setTimeout(() => loading.remove(), 700);
    game.start();
  })
  .catch((err) => {
    console.error('[main] init failed', err);
    const lbl = document.getElementById('loading-label');
    if (lbl) {
      lbl.textContent = `ERROR: ${err.message}`;
      lbl.style.color = '#ff6b6b';
    }
    window.__gameError = String(err?.stack || err);
  });
