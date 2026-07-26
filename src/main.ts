import './ui/styles.css';
import { Game } from './core/Game';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const uiRoot = document.getElementById('ui-root') as HTMLElement;

const game = new Game(canvas, uiRoot);
void game.boot();
