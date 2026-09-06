// Build stamp injected by vite.config.js (`__BUILD__` = "<short hash> <date> <time> UTC"); "dev" when the game is
// loaded outside Vite (node tests import game modules without the define).
export const BUILD = typeof __BUILD__ !== 'undefined' ? __BUILD__ : 'dev';
