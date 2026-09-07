import { Game } from './game.js';

const errorBox = document.getElementById('error');
function showError(msg) {
  errorBox.style.display = 'block';
  errorBox.textContent += msg + '\n';
}
window.addEventListener('error', (e) => showError((e.error && e.error.stack) || e.message));
window.addEventListener('unhandledrejection', (e) => showError('Unhandled rejection: ' + (e.reason && e.reason.stack ? e.reason.stack : e.reason)));

const game = new Game();
window.game = game;
game.start().catch((e) => showError(e.stack || String(e)));
