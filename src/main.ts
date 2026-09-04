import { readParams } from './core/params';
import { Game } from './game';
import { Input } from './core/input';
import { Hud } from './ui/hud';
import { Bench } from './bench/bench';

declare global {
  interface Window {
    __game?: Game;
    __bench?: Bench;
    __build: string;
    __ready?: boolean;
    __benchReady?: boolean;
  }
}

window.__build = __BUILD_ID__;

async function boot(): Promise<void> {
  const params = readParams();
  const canvas = document.getElementById('view') as HTMLCanvasElement;
  const status = document.getElementById('start-status')!;
  const startBtn = document.getElementById('start-btn') as HTMLButtonElement;
  const startEl = document.getElementById('start')!;
  startBtn.disabled = true;
  const game = new Game(canvas, params);
  window.__game = game;
  const progress = (label: string, p: number) => { status.textContent = `${label}… ${Math.round(p * 100)}%`; };
  await game.init(progress);

  const resize = () => {
    const w = params.width ?? window.innerWidth;
    const h = params.height ?? window.innerHeight;
    if (params.width) { canvas.style.width = `${w}px`; canvas.style.height = `${h}px`; }
    game.setSize(w, h, params.width ? 1 : Math.min(window.devicePixelRatio, 1.5));
  };
  window.addEventListener('resize', resize);
  resize();

  const hud = new Hud();
  const input = new Input(canvas);
  const bench = new Bench(game);
  window.__bench = bench;
  status.textContent = `Build ${window.__build}`;
  startBtn.disabled = false;

  // ---------------------------------------------------------------- bench mode
  if (params.bench) {
    startEl.classList.add('hidden');
    hud.show(!params.noHud);
    const ok = bench.setup(params.bench);
    if (!ok) { status.textContent = `Unknown bench view ${params.bench}`; return; }
    const tag = document.getElementById('benchtag')!;
    tag.classList.remove('hidden');
    tag.textContent = `${params.bench} · seed ${params.seed} · ${window.__build}`;
    if (params.noHud) tag.classList.add('hidden');
    // render the frozen frame; the capture script drives further steps through window.__bench
    const refreshHud = () => hud.update(game.aircraft.flight.telemetry, game.aircraft.inputs.throttle, game.flightCamera.mode, game.atmos.hour, 1 / 30);
    bench.onFrame = refreshHud; // flight stills and clips show live telemetry, not the frozen-frame values
    const frozenLoop = () => {
      bench.render();
      refreshHud();
      window.__ready = true;
      window.__benchReady = true;
      if (!params.freeze) requestAnimationFrame(frozenLoop);
    };
    frozenLoop();
    return;
  }

  // ---------------------------------------------------------------- play mode
  let started = false;
  const start = () => {
    if (started) return;
    started = true;
    startEl.classList.add('hidden');
    hud.show(true);
    hud.flash('Full throttle (Shift) to take off. S pulls the nose up once above 55 KIAS.', 6);
    game.aircraft.inputs.throttle = 0;
    game.flightCamera.mode = 'chase';
    game.flightCamera.snap();
  };
  startBtn.addEventListener('click', start);
  window.addEventListener('keydown', (e) => { if (e.code === 'Enter' && !started) start(); });
  if (params.autostart) start();

  let last = performance.now();
  let acc = 0;
  const loop = () => {
    const now = performance.now();
    let frameDt = params.fixedDt ?? Math.min(0.1, (now - last) / 1000);
    last = now;
    if (params.freeze) frameDt = 0;
    input.update(frameDt);
    if (started) {
      const f = input.flight;
      const a = game.aircraft.inputs;
      a.throttle = f.throttle; a.pitch = f.pitch; a.roll = f.roll; a.yaw = f.yaw; a.flaps = f.flaps; a.brake = f.brake;
      if (input.consume('KeyC')) { game.flightCamera.mode = game.flightCamera.mode === 'chase' ? 'cockpit' : 'chase'; game.flightCamera.snap(); }
      if (input.consume('KeyV')) { game.flightCamera.mode = 'cockpit'; game.flightCamera.snap(); }
      if (input.consume('KeyH')) hud.toggle();
      if (input.consume('KeyT')) { game.atmos.hour = (game.atmos.hour + 2) % 24; hud.flash(`Time ${Math.floor(game.atmos.hour)}:00`); }
      if (input.consume('KeyY')) { const w = ['clear', 'scattered', 'cloudy', 'storm'] as const; const i = (w.indexOf(game.atmos.weather) + 1) % w.length; game.atmos.setWeather(w[i]); hud.flash(`Weather: ${w[i]}`); }
      if (input.consume('KeyR')) { const base = game.map.pois.find((p) => p.kind === 'seaplane')!; game.aircraft.place(base.x + 120, 1.6, base.z + 60, Math.PI * 0.5, 0, 0, 0, 0); f.throttle = 0; game.flightCamera.snap(); hud.flash('Reset to the seaplane base'); }
      if (input.consume('KeyG')) { game.aircraft.place(game.aircraft.flight.position.x, 350, game.aircraft.flight.position.z, Math.PI * 0.5, 0, 0, 55, 0.7); f.throttle = 0.7; hud.flash('Airborne at 350 m'); }
      game.flightCamera.orbitYaw = input.orbitYaw;
      game.flightCamera.orbitPitch = input.orbitPitch;
    }
    // fixed-step simulation for stable physics
    acc += frameDt;
    const step = 1 / 60;
    let n = 0;
    while (acc >= step && n < 8) { game.update(step, started); acc -= step; n++; }
    if (n === 8) acc = 0;
    game.flightCamera.update(game.aircraft.flight, game.aircraft.model, frameDt);
    game.render();
    hud.update(game.aircraft.flight.telemetry, game.aircraft.inputs.throttle, game.flightCamera.mode, game.atmos.hour, frameDt);
    window.__ready = true;
    requestAnimationFrame(loop);
  };
  game.update(0, false);
  game.flightCamera.update(game.aircraft.flight, game.aircraft.model, 1 / 60);
  loop();
}

boot().catch((e) => {
  console.error(e);
  const status = document.getElementById('start-status');
  if (status) status.textContent = `Failed to start: ${(e as Error).message}`;
});
