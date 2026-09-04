// Headless regression test for the procedural audio layer (src/systems/audio.js).
// Drives the live AudioSystem through SYSTEMS + debugAPI (graph counters, event log, profile state, mute /
// volume, alert klaxon poll, lift ride hum, HUD hooks, spatial pan) and renders every synth voice through an
// OfflineAudioContext to check real signal levels (non-silent, never clipping) — headless Chromium has no
// speakers, so nothing here depends on audible output.
// Usage: node tools/audio_test.mjs [url]   (exit code 0 = all checks passed)
import { chromium } from "playwright-core";
import { existsSync } from "node:fs";

const url = process.argv[2] || "http://127.0.0.1:5209/";
const executablePath = ["/usr/bin/google-chrome-stable", "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"].find((p) => existsSync(p));
const browser = await chromium.launch({
  headless: true,
  executablePath,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--use-gl=angle", "--use-angle=swiftshader-webgl", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--enable-webgl", "--autoplay-policy=no-user-gesture-required"],
});
const page = await browser.newPage({ viewport: { width: 800, height: 450 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
// console errors, plus the audio layer's own warnings (SwiftShader GL performance warnings are noise here)
page.on("console", (m) => {
  if (m.type() === "error") errors.push("[error] " + m.text().slice(0, 200));
  else if (m.type() === "warning" && m.text().includes("[audio]")) errors.push("[warning] " + m.text().slice(0, 200));
});
const t0 = Date.now();
await page.goto(url, { waitUntil: "load", timeout: 120000 });
await page.waitForFunction(() => window.debugAPI && window.debugAPI.ready, null, { timeout: 300000 });
console.log(`ready in ${((Date.now() - t0) / 1000).toFixed(1)} s`);

const results = [];
let tSection = Date.now();
const check = (name, ok, detail = "") => {
  results.push({ name, ok: !!ok });
  console.log(`${ok ? "PASS" : "FAIL"} ${name} ${detail}`);
};
const section = (title) => {
  console.log(`-- ${title} (+${((Date.now() - tSection) / 1000).toFixed(1)} s)`);
  tSection = Date.now();
};
const ev = (fn, arg) => page.evaluate(fn, arg);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const settle = async (n = 2) => {
  const f0 = await ev(() => window.debugAPI.frames());
  await page.waitForFunction((t) => window.debugAPI.frames() >= t, f0 + n, { timeout: 240000 });
};

// 1. start(): context + graph, idempotent
section("start / graph");
{
  const r = await ev(async () => {
    const m = await import("/src/core/systems.js");
    const a = m.SYSTEMS.audio;
    const before = a.graph();
    a.start();
    const g1 = a.graph();
    a.start();
    a.start();
    const g2 = a.graph();
    return { before: before.state, g1, g2, hasApi: ["start", "setRoom", "on", "event", "update", "volume", "mute", "rideHum", "registerSample", "profileFor", "graph", "dispose"].every((k) => typeof a[k] === "function"), listener: !!a.listener || a.listener === null };
  });
  check("public API present", r.hasApi);
  check("start() creates the context and the ambience graph", r.g1.enabled && r.g1.nodes > 40 && r.g1.layers.length === 8, `state=${r.g1.state} nodes=${r.g1.nodes} layers=${r.g1.layers.join(",")}`);
  check("start() is idempotent", r.g2.nodes === r.g1.nodes && r.g2.enabled, `nodes ${r.g1.nodes} -> ${r.g2.nodes}`);
  check("context running or resumable", r.g1.state === "running" || (r.g1.state === "suspended" && r.g1.pendingResume), `state=${r.g1.state} pendingResume=${r.g1.pendingResume}`);
  check("hooks attached (fighter traffic / HUD)", r.g1.hooked);
}

// 2. room profiles: table lookup, legacy triple, def argument, crossfade reaches its targets
section("room profiles");
{
  await ev(() => window.debugAPI.setView("bridge"));
  await settle(1);
  const bridge = await ev(async () => (await import("/src/core/systems.js")).SYSTEMS.audio.profile);
  check("entering the bridge selects the bridge profile", bridge && bridge.id === "bridge" && bridge.beeps === "console" && bridge.space === "medium", JSON.stringify(bridge));
  await ev(() => window.debugAPI.setView("reactor"));
  await settle(1);
  await sleep(1400);
  const reactor = await ev(async () => {
    const a = (await import("/src/core/systems.js")).SYSTEMS.audio;
    return { p: a.profile, throbGain: a.ambience.throb.gain.value, cutoff: a.ambience.lp.frequency.value, humGain: a.ambience.hum.gain.value, sendLarge: a.sendLarge.gain.value };
  });
  check("reactor profile: deep throb, huge space, legacy hum/air/cutoff from main.js honoured", reactor.p.id === "reactor" && reactor.p.throb === 1 && reactor.p.space === "huge" && reactor.p.hum === 1 && reactor.p.cutoff === 260, JSON.stringify(reactor.p));
  check("crossfade reached the reactor targets (~1 s)", Math.abs(reactor.throbGain - 0.14) < 0.02 && Math.abs(reactor.cutoff - 260) < 20 && Math.abs(reactor.humGain - 0.08) < 0.012 && reactor.sendLarge > 0.4, `throb=${reactor.throbGain.toFixed(3)} cutoff=${reactor.cutoff.toFixed(0)} hum=${reactor.humGain.toFixed(3)} sendLarge=${reactor.sendLarge.toFixed(2)}`);
  await ev(() => window.debugAPI.setView("medbay"));
  await settle(1);
  const med = await ev(async () => {
    const a = (await import("/src/core/systems.js")).SYSTEMS.audio;
    const table = a.profile;
    a.setRoom({ hum: 0.9, air: 0.1, cutoff: 123 }); // legacy override keeps the table's extra layers
    const legacy = a.profile;
    const def = (await import("/src/core/layout.js")).ROOM_BY_ID.hangar;
    a.setRoom(def);
    const fromDef = a.profile;
    a.setRoom({ id: "detention", drone: 0.5 });
    const byId = a.profile;
    const pf = a.profileFor((await import("/src/core/layout.js")).ROOM_BY_ID.hyperdrive);
    a.setRoom({ hum: 0.5, air: 0.5, cutoff: 400 }); // back to what main.js sends for the medbay
    return { table, legacy, fromDef, byId, pf, timers: a.graph().timers };
  });
  check("medbay profile: clean tone + heartbeat monitor", med.table.id === "medbay" && med.table.tone === 1 && med.table.beeps === "monitor", JSON.stringify(med.table));
  check("legacy {hum,air,cutoff} overrides the bed and keeps the room's layers", med.legacy.id === "medbay" && med.legacy.hum === 0.9 && med.legacy.cutoff === 123 && med.legacy.tone === 1, JSON.stringify(med.legacy));
  check("setRoom(roomDef) uses the table", med.fromDef.id === "hangar" && med.fromDef.wind === 1 && med.fromDef.space === "huge", JSON.stringify(med.fromDef));
  check("setRoom({id, …}) resolves the room and applies overrides", med.byId.id === "detention" && med.byId.drone === 0.5 && med.byId.space === "medium", JSON.stringify(med.byId));
  check("profileFor(def) returns the built-in entry", med.pf.id === "hyperdrive" && med.pf.whine === 1, JSON.stringify(med.pf));
  check("ambient schedulers armed for the room (timers)", med.timers >= 1, `timers=${med.timers}`);
}

// 3. events: every synth plays, spatial gain and pan, handlers, unknown names
section("events + spatial");
{
  await ev(() => window.debugAPI.setView("bridge"));
  await settle(1);
  const r = await ev(async () => {
    const a = (await import("/src/core/systems.js")).SYSTEMS.audio;
    const P = window.debugAPI.player.position;
    const near = { x: P.x, y: P.y, z: P.z - 2 };
    const right = { x: P.x + 6, y: P.y, z: P.z };
    const left = { x: P.x - 6, y: P.y, z: P.z };
    const far = { x: P.x + 500, y: P.y, z: P.z };
    let handled = 0;
    a.on("door_open", () => handled++);
    const n0 = a.graph().nodes;
    const fire = (name, data) => {
      const i0 = a.log.length;
      a.event(name, data);
      return a.log[i0 === 200 ? 199 : i0] || a.log[a.log.length - 1];
    };
    const out = {};
    out.slide = fire("door_open", { position: near, kind: "slide", id: "br_tac" });
    out.blast = fire("door_open", { position: near, kind: "blast", id: "br_corr" });
    out.secure = fire("door_open", { position: near, kind: "secure", id: "corr_intel" });
    out.closeBlast = fire("door_close", { position: near, kind: "blast", id: "hg_shuttle" });
    out.closeSlide = fire("door_close", { position: near, kind: "slide", id: "br_tac" });
    out.liftStart = fire("lift_start", { position: near });
    const rideOn = a.graph().ride;
    out.liftArrive = fire("lift_arrive", { position: near });
    const rideOff = a.graph().ride;
    out.launch = fire("fighter_launch", { position: near, id: "tie_1" });
    out.field = fire("field_pass", { position: near, id: "tie_1" });
    out.depart = fire("depart", { position: near, id: "tie_1" });
    out.ret = fire("return", { position: near, id: "tie_1" });
    out.dock = fire("dock", { position: [near.x, near.y, near.z], id: "tie_1" });
    out.uiOpen = fire("ui_open", {});
    out.uiChoose = fire("ui_choose", { index: 0 });
    out.right = fire("door_open", { position: right, kind: "slide", id: "br_nav" });
    out.left = fire("door_open", { position: left, kind: "slide", id: "br_tac" });
    out.far = fire("door_open", { position: far, kind: "slide", id: "br_tac" });
    out.unknown = fire("nonsense_event", { foo: 1 });
    out.nodes = a.graph().nodes - n0;
    out.handled = handled;
    out.rideOn = rideOn;
    out.rideOff = rideOff;
    out.voices = a.graph().voices;
    return out;
  });
  const played = ["slide", "blast", "secure", "closeBlast", "closeSlide", "liftStart", "liftArrive", "launch", "field", "depart", "ret", "dock", "uiOpen", "uiChoose"];
  const notPlayed = played.filter((k) => !r[k].played);
  check("every event synth plays (door slide/blast/secure, lift, fighter, field, fly-by, dock, UI)", notPlayed.length === 0, notPlayed.length ? "not played: " + notPlayed.map((k) => `${k}:${r[k].reason}`).join(", ") : `${played.length} voices, ${r.nodes} nodes created`);
  check("lift_start turns the ride hum on, lift_arrive turns it off", r.rideOn && !r.rideOff, `on=${r.rideOn} off=${r.rideOff}`);
  check("blast doors are louder than slide doors (per-event gain ≤ 0.5)", r.blast.gain > r.slide.gain && r.blast.gain <= 0.5 && r.slide.gain <= 0.5, `blast=${r.blast.gain} slide=${r.slide.gain}`);
  check("stereo pan follows the camera (right > 0, left < 0)", r.right.pan > 0.3 && r.left.pan < -0.3, `right=${r.right.pan} left=${r.left.pan}`);
  check("out-of-range sources are culled", !r.far.played && r.far.reason === "out of range", JSON.stringify(r.far));
  check("handlers receive events", r.handled >= 5, `handled=${r.handled}`);
  check("unknown events are logged, not played, no exception", r.unknown && r.unknown.name === "nonsense_event" && !r.unknown.played && !r.unknown.error);
  check("voice accounting", r.voices > 0 && r.voices <= 24, `voices=${r.voices}`);
}

// 4. alert klaxon follows SYSTEMS.lighting.alert
section("alert klaxon");
{
  await ev(() => window.debugAPI.setAlert(1));
  await sleep(700);
  const on = await ev(async () => (await import("/src/core/systems.js")).SYSTEMS.audio.graph());
  check("alert → klaxon loop running (event + poll)", on.klaxon, `klaxon=${on.klaxon} timers=${on.timers}`);
  await ev(() => window.debugAPI.setAlert(0));
  await sleep(700);
  const off = await ev(async () => (await import("/src/core/systems.js")).SYSTEMS.audio.graph());
  check("alert cleared → klaxon stops", !off.klaxon, `klaxon=${off.klaxon}`);
}

// 5. mute (key M) and volume clamp
section("mute / volume");
{
  const r = await ev(async () => {
    const a = (await import("/src/core/systems.js")).SYSTEMS.audio;
    window.debugAPI.pressKey("KeyM");
    const muted = { muted: a.muted, target: a.masterTarget };
    a.event("door_open", { kind: "slide" }); // still logged + dispatched while muted
    const logged = a.log[a.log.length - 1].name === "door_open";
    window.debugAPI.pressKey("KeyM");
    const unmuted = { muted: a.muted, target: a.masterTarget };
    const clamped = a.volume(0.9);
    const low = a.volume(-1);
    a.volume(0.5);
    return { muted, unmuted, logged, clamped, low, master: a.master.gain.value };
  });
  check("key M mutes / unmutes", r.muted.muted && r.muted.target === 0 && !r.unmuted.muted && r.unmuted.target === 0.5, JSON.stringify([r.muted, r.unmuted]));
  check("events keep logging while muted", r.logged);
  check("volume() clamps to MASTER_MAX 0.6", r.clamped === 0.6 && r.low === 0, `0.9→${r.clamped} -1→${r.low}`);
}

// 6. HUD hooks: menu open / choose blips, prompt hover tick
section("HUD hooks");
{
  const r = await ev(async () => {
    const S = (await import("/src/core/systems.js")).SYSTEMS;
    const a = S.audio;
    const i0 = a.log.length;
    let chosen = null;
    S.hud.showMenu("TEST", [{ key: "1", label: "one" }], (k) => (chosen = k));
    window.debugAPI.pressKey("Digit1");
    S.hud.showPrompt("E", "Test prompt");
    S.hud.hidePrompt();
    const names = a.log.slice(i0).map((e) => e.name);
    return { names, chosen, menuOpen: S.hud.menuOpen() };
  });
  check("HUD menu emits ui_open / ui_choose and still calls the chooser", r.names.includes("ui_open") && r.names.includes("ui_choose") && r.chosen === 0 && !r.menuOpen, JSON.stringify(r));
  check("interaction prompt emits ui_hover", r.names.includes("ui_hover"));
}

// 7. voice cap never throws, cheap
section("voice cap");
{
  const r = await ev(async () => {
    const a = (await import("/src/core/systems.js")).SYSTEMS.audio;
    const t0 = performance.now();
    let capped = 0;
    for (let i = 0; i < 60; i++) {
      a.event("dock", { position: window.debugAPI.player.position });
      if (a.log[a.log.length - 1].reason === "voice cap") capped++;
    }
    return { ms: performance.now() - t0, capped, voices: a.graph().voices };
  });
  check("60 burst events: voice cap engages, no exception", r.capped > 0 && r.voices <= 24, `capped=${r.capped} voices=${r.voices} in ${r.ms.toFixed(1)} ms`);
}

// 8. offline render: every synth produces signal and never clips (real samples, no speakers needed)
section("offline render levels + synth shapes");
{
  await ev(() => window.debugAPI.setView("hangar"));
  await settle(1);
  const r = await ev(async () => {
    const { AudioSystem } = await import("/src/systems/audio.js");
    const measure = (buf) => {
      let peak = 0;
      let sum = 0;
      let n = 0;
      for (let ch = 0; ch < buf.numberOfChannels; ch++) {
        const d = buf.getChannelData(ch);
        for (let i = 0; i < d.length; i++) {
          const v = Math.abs(d[i]);
          if (v > peak) peak = v;
          sum += d[i] * d[i];
          n++;
        }
      }
      return { peak: +peak.toFixed(3), rms: +Math.sqrt(sum / n).toFixed(4) };
    };
    // 100 ms windows: RMS and zero-crossing rate (≈ dominant frequency) to check the shape of a voice
    const series = (buf, win = 0.1) => {
      const d = buf.getChannelData(0);
      const n = Math.floor(buf.sampleRate * win);
      const rms = [];
      const freq = [];
      for (let s = 0; s + n <= d.length; s += n) {
        let sum = 0;
        let z = 0;
        for (let i = s; i < s + n; i++) {
          sum += d[i] * d[i];
          if (i > s && d[i] >= 0 !== d[i - 1] >= 0) z++;
        }
        rms.push(+Math.sqrt(sum / n).toFixed(4));
        freq.push(Math.round(z / win / 2));
      }
      return { rms, freq };
    };
    const render = async (seconds, setup) => {
      const off = new OfflineAudioContext(2, Math.floor(44100 * seconds), 44100);
      const a = new AudioSystem();
      a.start(off);
      // beds off and a small room: measure the voice itself, not the reverb tail
      a.setRoom({ id: "hangar", hum: 0, air: 0, wind: 0, clanks: 0, beeps: "none", swoosh: 0, throb: 0, whine: 0, drone: 0, tone: 0, warm: 0, space: "small" });
      setup(a);
      const buf = await off.startRendering();
      const g = a.graph();
      a.dispose();
      return { ...measure(buf), ...series(buf), nodes: g.nodes };
    };
    const out = {};
    const events = [
      ["door_open:slide", (a) => a.event("door_open", { kind: "slide", id: "br_tac" })],
      ["door_open:blast", (a) => a.event("door_open", { kind: "blast", id: "br_corr" })],
      ["door_open:secure", (a) => a.event("door_open", { kind: "secure", id: "corr_intel" })],
      ["door_close:blast_huge", (a) => a.event("door_close", { kind: "blast", id: "hg_shuttle" })],
      ["door_close:slide", (a) => a.event("door_close", { kind: "slide", id: "br_tac" })],
      ["lift_start", (a) => a.event("lift_start", {})],
      ["lift_arrive", (a) => a.event("lift_arrive", {})],
      ["fighter_launch", (a) => a.event("fighter_launch", {})],
      ["field_pass", (a) => a.event("field_pass", {})],
      ["depart", (a) => a.event("depart", {})],
      ["return", (a) => a.event("return", {})],
      ["dock", (a) => a.event("dock", {})],
      ["alert", (a) => a.event("alert", {})],
      ["ui_open", (a) => a.event("ui_open", {})],
    ];
    for (const [k, fn] of events) out[k] = await render(2.6, fn);
    // stacked worst case: several loud events at once must not clip
    out.stacked = await render(2.6, (a) => {
      a.event("door_open", { kind: "blast", id: "br_corr" });
      a.event("fighter_launch", {});
      a.event("dock", {});
      a.event("alert", {});
      a.event("depart", {});
    });
    // ambience beds
    const beds = {};
    for (const id of ["reactor", "hyperdrive", "hangar", "bridge", "medbay", "detention", "mess", "cmd_corridor"]) {
      const off = new OfflineAudioContext(2, 44100 * 3, 44100);
      const a = new AudioSystem();
      a.start(off);
      a.setRoom({ id });
      const buf = await off.startRendering();
      a.dispose();
      const m = measure(buf);
      // second-half RMS (after the ~1 s crossfade) — the bed should be steady, not swelling or dying
      let sum = 0;
      const d = buf.getChannelData(0);
      for (let i = (d.length / 2) | 0; i < d.length; i++) sum += d[i] * d[i];
      beds[id] = { ...m, settled: +Math.sqrt(sum / (d.length / 2)).toFixed(4) };
    }
    out.beds = beds;
    return out;
  });
  const names = Object.keys(r).filter((k) => k !== "beds" && k !== "stacked");
  const silent = names.filter((k) => r[k].rms < 0.002);
  const clipping = [...names, "stacked"].filter((k) => r[k].peak >= 0.98);
  console.log("   levels:", names.map((k) => `${k} peak ${r[k].peak} rms ${r[k].rms}`).join(" | "));
  console.log("   stacked:", JSON.stringify(r.stacked));
  console.log("   beds:", Object.entries(r.beds).map(([k, v]) => `${k} peak ${v.peak} rms ${v.rms} settled ${v.settled}`).join(" | "));
  check("offline render: every event voice produces signal", silent.length === 0, silent.length ? "silent: " + silent.join(", ") : `${names.length} voices rendered`);
  check("offline render: nothing clips (peak < 0.98), including 5 stacked loud events", clipping.length === 0, clipping.length ? "clipping: " + clipping.join(", ") : `max peak ${Math.max(...[...names, "stacked"].map((k) => r[k].peak))}`);
  const bedBad = Object.entries(r.beds).filter(([, v]) => v.settled < 0.004 || v.settled > 0.25 || v.peak >= 0.9);
  check("offline render: every ambience bed is audible, steady and headroom-safe", bedBad.length === 0, bedBad.length ? "bad beds: " + bedBad.map(([k, v]) => `${k}:${JSON.stringify(v)}`).join(", ") : `${Object.keys(r.beds).length} beds`);
  check("reactor bed is heavier than the bridge bed", r.beds.reactor.settled > r.beds.bridge.settled * 1.5, `reactor ${r.beds.reactor.settled} vs bridge ${r.beds.bridge.settled}`);
  // synth shapes
  const mean = (arr) => arr.reduce((s, x) => s + x, 0) / Math.max(1, arr.length);
  const sc = r.fighter_launch;
  check("fighter_launch: descending scream (pitch 0–0.3 s ≫ pitch 1.0–1.5 s, ≥ 1 s long)", mean(sc.freq.slice(0, 3)) > 1.8 * mean(sc.freq.slice(10, 15)) && sc.rms[10] > 0.01 * 0.5 && sc.rms[2] > 0.05, `f ${sc.freq.slice(0, 16).join(" ")} | rms ${sc.rms.slice(0, 16).join(" ")}`);
  const dp = r.depart;
  const rt = r.return;
  check("depart falls / return rises (doppler-like slides), both peak mid-way", mean(dp.freq.slice(0, 4)) > 1.3 * mean(dp.freq.slice(12, 18)) && mean(rt.freq.slice(8, 14)) > 1.5 * mean(rt.freq.slice(0, 3)) && dp.rms.indexOf(Math.max(...dp.rms)) >= 4 && dp.rms[0] > 0.001, `depart f ${dp.freq.slice(0, 18).join(" ")} | return f ${rt.freq.slice(0, 14).join(" ")} | depart rms ${dp.rms.slice(0, 12).join(" ")}`);
  const bl = r["door_open:blast"];
  check("blast door: low rumble sustained ≥ 1 s (f < 150 Hz, 0.3–1.0 s within 50 % of peak)", mean(bl.freq.slice(3, 10)) < 150 && Math.min(...bl.rms.slice(3, 10)) > 0.5 * Math.max(...bl.rms), `f ${bl.freq.slice(0, 13).join(" ")} | rms ${bl.rms.slice(0, 13).join(" ")}`);
  const kx = r.alert;
  const kMax = Math.max(...kx.rms.slice(0, 10));
  check("klaxon: two bursts with a gap (0.42–0.56 s dip), second lower in pitch", kx.rms[4] < 0.25 * kMax && kx.rms[1] > 0.5 * kMax && kx.rms[7] > 0.5 * kMax && mean(kx.freq.slice(1, 3)) > mean(kx.freq.slice(6, 9)), `rms ${kx.rms.slice(0, 11).join(" ")} | f ${kx.freq.slice(0, 11).join(" ")}`);
  const ls = r.lift_start;
  check("lift_start: motor spin-up (pitch rises over the first second) then the ride hum holds", ls.freq[9] > ls.freq[1] && ls.rms[18] > 0.02 && ls.rms[24] > 0.02, `f ${ls.freq.slice(0, 12).join(" ")} | rms ${ls.rms.slice(14, 26).join(" ")}`);
}

// 9. dispose() then start() again rebuilds the graph
section("dispose / restart");
{
  const r = await ev(async () => {
    const a = (await import("/src/core/systems.js")).SYSTEMS.audio;
    a.dispose();
    const gone = a.graph();
    a.start();
    await new Promise((res) => setTimeout(res, 200));
    a.event("door_open", { kind: "slide" });
    return { gone, back: a.graph(), played: a.log[a.log.length - 1].played };
  });
  check("dispose() tears down (enabled=false, timers cleared) and start() rebuilds", !r.gone.enabled && r.gone.timers === 0 && r.back.enabled && r.back.nodes > 40 && r.back.profile === "hangar", `after dispose: ${JSON.stringify(r.gone)} | after restart: nodes=${r.back.nodes} state=${r.back.state} played=${r.played}`);
}

if (errors.length) {
  console.log("PAGE ERRORS / WARNINGS:");
  errors.slice(0, 10).forEach((e) => console.log(" ", e));
}
const failed = results.filter((x) => !x.ok).length;
console.log(`${results.length - failed}/${results.length} checks passed${errors.length ? `, ${errors.length} page errors` : ", no page errors"}`);
await browser.close();
process.exit(failed || errors.length ? 1 : 0);
