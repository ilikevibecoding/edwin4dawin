// Many headless screenshots from ONE Chrome instance, with boat-relative cameras (see shotlib.mjs for the spec):
//   node bench/reports/boats2/tools/shots2.mjs <spec.txt> [width] [height] [settleFrames]
import { launch, parseSpec, shootAll } from './shotlib.mjs';

const [specPath, w = '1280', h = '720', settle = '3'] = process.argv.slice(2);
if (!specPath) { console.error('usage: shots2.mjs <spec.txt> [w] [h] [settleFrames]'); process.exit(2); }
const specs = parseSpec(specPath);
const browser = await launch(w, h);
const failures = await shootAll(browser, specs, w, h, settle);
await browser.close();
process.exit(failures ? 1 : 0);
