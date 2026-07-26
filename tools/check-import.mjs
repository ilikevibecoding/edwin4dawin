// Syntax/import sanity check for browser modules in Node (no DOM at import
// time allowed). Usage: node tools/check-import.mjs src/assets/foo.js
const target = process.argv[2];
if (!target) { console.error('usage: node tools/check-import.mjs <file>'); process.exit(2); }
globalThis.window = globalThis.window || { addEventListener() {}, innerWidth: 1280, innerHeight: 720, location: { search: '' } };
globalThis.document = globalThis.document || {
  createElement: () => ({ getContext: () => null, style: {}, width: 0, height: 0 }),
  addEventListener() {}, getElementById: () => null,
};
globalThis.localStorage = globalThis.localStorage || { getItem: () => null, setItem() {} };
try { if (!globalThis.navigator) globalThis.navigator = { userAgent: 'node' }; } catch (e) { /* getter-only on modern Node */ }
globalThis.requestAnimationFrame = globalThis.requestAnimationFrame || ((fn) => setTimeout(fn, 16));
try {
  await import('../' + target.replace(/^\.\//, ''));
  console.log('OK import', target);
} catch (e) {
  console.error('FAIL import', target);
  console.error(e);
  process.exit(1);
}
