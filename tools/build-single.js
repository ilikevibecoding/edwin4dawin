// Builds dist/arena-rumble.html: the whole game in one self-contained file.
// CSS inlined, the six ES modules concatenated in dependency order (imports and
// export keywords stripped — the module graph is acyclic and collision-free),
// and the font embedded as a base64 data URI. The result runs from file://
// with a double-click, or from any host that serves plain HTML.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

// ---- css with the font embedded
const fontB64 = fs.readFileSync(path.join(root, 'assets/fonts/LilitaOne.woff2')).toString('base64');
const css = read('styles.css').replace(
  "url('assets/fonts/LilitaOne.woff2')",
  `url('data:font/woff2;base64,${fontB64}')`,
);

// ---- modules, dependency order
const order = ['util.js', 'data.js', 'art.js', 'audio.js', 'battle.js', 'main.js'];
const js = order
  .map((f) => {
    let src = read('src/' + f);
    src = src.replace(/^import[\s\S]*?from\s+['"][^'"]+['"];\s*$/gm, ''); // import lists (incl. multiline)
    src = src.replace(/^export\s+(?=(?:function|const|let|class)\b)/gm, ''); // export prefixes
    return `/* ===== src/${f} ===== */\n${src.trim()}`;
  })
  .join('\n\n');

// ---- html shell
const html = read('index.html')
  .replace('<link rel="stylesheet" href="styles.css">', () => `<style>\n${css}\n</style>`)
  .replace('<script type="module" src="src/main.js"></script>', () => `<script type="module">\n${js}\n</script>`);

fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
const out = path.join(root, 'dist', 'arena-rumble.html');
fs.writeFileSync(out, html);
console.log(`ok -> dist/arena-rumble.html (${(fs.statSync(out).size / 1024).toFixed(0)} KB)`);
