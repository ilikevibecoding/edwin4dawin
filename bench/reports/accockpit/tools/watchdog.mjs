// Watchdog for a still session's Chrome: a page whose renderer hangs (seen under memory pressure with three
// browsers on the box: the tab sits at 22 MB, every CDP call to it blocks, the session waits out its 25-minute
// timeouts) is closed through the browser-level DevTools HTTP endpoint, which needs no answer from the renderer.
// The session then logs FAIL for that view and goes on with the next one.
//   node watchdog.mjs <devtoolsPort> [maxPageSec=480]
const [port, maxArg = '480'] = process.argv.slice(2);
const maxMs = Number(maxArg) * 1000;
const seen = new Map();
const get = async (path) => { const r = await fetch(`http://127.0.0.1:${port}${path}`); return r.text(); };
console.log(`watchdog on :${port}, closing pages older than ${maxArg} s`);
while (true) {
  try {
    const targets = JSON.parse(await get('/json'));
    const now = Date.now();
    const live = new Set();
    for (const t of targets) {
      if (t.type !== 'page' || t.url === 'about:blank') continue;
      live.add(t.id);
      if (!seen.has(t.id)) seen.set(t.id, now);
      else if (now - seen.get(t.id) > maxMs) {
        console.log(`${new Date().toISOString()} closing hung page ${t.id.slice(0, 8)} ${t.url.slice(0, 90)}`);
        await get(`/json/close/${t.id}`).catch(() => {});
        seen.delete(t.id);
      }
    }
    for (const id of [...seen.keys()]) if (!live.has(id)) seen.delete(id);
  } catch (e) {
    console.log(`${new Date().toISOString()} browser gone (${e.message}); exiting`);
    break;
  }
  await new Promise((r) => setTimeout(r, 20000));
}
