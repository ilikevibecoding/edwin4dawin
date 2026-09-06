import type { Weather } from '../core/params';

export type CamMode = 'fixed' | 'chase' | 'cockpit';

export interface BenchView {
  id: string;
  name: string;
  description: string;
  time: number;
  weather: Weather;
  camera: {
    mode: CamMode;
    /** fixed mode: world position, heading (deg, 0 = north, clockwise), pitch (deg, negative = down), vertical FOV */
    pos?: [number, number, number];
    headingDeg?: number;
    pitchDeg?: number;
    fov: number;
    /** fixed mode: once the clip runs, translate the camera with the aircraft (heading kept) so the composition of
     *  the still holds instead of the aircraft leaving the frame; the still itself is unaffected */
    follow?: boolean;
  };
  plane: {
    /** absolute position, or `fromCamera` = place the plane at screen coordinates relative to the fixed camera */
    pos?: [number, number, number];
    fromCamera?: { screenX: number; screenY: number; distance: number };
    headingDeg: number;
    pitchDeg: number;
    bankDeg: number;
    speed: number;
    throttle: number;
    flaps?: number;
  };
  /** seconds of world pre-simulation before the frozen capture (boats, cars, clouds) */
  presim: number;
  /** control inputs held during the flight clip */
  clipInputs: { pitch: number; roll: number; yaw: number };
}

export const BENCH_VIEWS: BenchView[] = [
  {
    id: 'aerial-a', name: 'Reference A — high aerial', description: 'Reference-style wide aerial over Isla Garza looking north: causeway receding NNE, downtown skyline upper-left, boats with wakes below, aircraft lower right.',
    time: 14.6, weather: 'scattered',
    camera: { mode: 'fixed', pos: [480, 400, 3720], headingDeg: -6, pitchDeg: -11, fov: 42, follow: true },
    // reference (measured on the frame): aircraft bbox x 0.653-0.885, y 0.595-0.885, centroid ~(0.77, 0.74); the
    // aircraft flies toward the camera and to its left, seen from above its starboard bow (spinner visible,
    // far wing upper-left, near wing lower-right), banked toward the near wing
    plane: { fromCamera: { screenX: 0.76, screenY: 0.74, distance: 50 }, headingDeg: 200, pitchDeg: 2, bankDeg: -24, speed: 52, throttle: 0.75 },
    presim: 40, clipInputs: { pitch: 0.05, roll: -0.05, yaw: 0 },
  },
  {
    id: 'cockpit-city', name: 'Cockpit approaching the city', description: 'From the pilot seat, downtown ahead beyond the bay, instrument panel and windshield frame in view.',
    time: 10.5, weather: 'clear',
    camera: { mode: 'cockpit', fov: 50 },
    plane: { pos: [-900, 320, 1400], headingDeg: 342, pitchDeg: 1, bankDeg: 0, speed: 58, throttle: 0.7 },
    presim: 30, clipInputs: { pitch: 0, roll: 0, yaw: 0 },
  },
  {
    id: 'bridge-low', name: 'Low-altitude bridge flyover', description: 'Chase view 45 m over the northern causeway arch, traffic on the deck, piers meeting the water.',
    time: 15.5, weather: 'clear',
    camera: { mode: 'chase', fov: 50 },
    // 30 m off the north side of the deck (bridge heading 82 deg), diverging by a degree and wings level, so
    // neither a 30- nor a 60-frame clip carries the aircraft through the stay fan of the pylon 270 m ahead
    plane: { pos: [-1950, 52, -3750], headingDeg: 81, pitchDeg: 0, bankDeg: 0, speed: 55, throttle: 0.7 },
    presim: 30, clipInputs: { pitch: 0, roll: 0, yaw: 0 },
  },
  {
    id: 'skyline-high', name: 'High-altitude skyline', description: 'Fixed camera 900 m up over the bay looking north-west at the downtown skyline hierarchy, port in the middle distance.',
    time: 16.2, weather: 'scattered',
    camera: { mode: 'fixed', pos: [-300, 900, -1200], headingDeg: -38, pitchDeg: -10, fov: 45, follow: true },
    plane: { fromCamera: { screenX: 0.72, screenY: 0.68, distance: 70 }, headingDeg: -30, pitchDeg: 0, bankDeg: 12, speed: 60, throttle: 0.7 },
    presim: 30, clipInputs: { pitch: 0, roll: 0.1, yaw: 0 },
  },
  {
    id: 'island-pass', name: 'Coastal island pass', description: 'Low along the barrier island ocean beach: hotels left, surf and shallows right, dunes and palms below.',
    time: 11.5, weather: 'clear',
    camera: { mode: 'chase', fov: 50 },
    plane: { pos: [3350, 130, -2200], headingDeg: 352, pitchDeg: 0, bankDeg: -6, speed: 52, throttle: 0.65 },
    presim: 30, clipInputs: { pitch: 0, roll: -0.05, yaw: 0 },
  },
  {
    id: 'harbor', name: 'Harbor and marina pass', description: 'Over the port: container cranes, cruise terminal, ship channel and the downtown marina beyond.',
    time: 9.5, weather: 'clear',
    camera: { mode: 'chase', fov: 50 },
    plane: { pos: [-2100, 160, -2500], headingDeg: 52, pitchDeg: 0, bankDeg: 0, speed: 50, throttle: 0.65 },
    presim: 30, clipInputs: { pitch: 0, roll: 0, yaw: 0 },
  },
  {
    id: 'water-landing', name: 'Seaplane water approach', description: 'Final approach a few metres above the Garza channel, floats about to touch: foam, wake and spray.',
    time: 13.0, weather: 'clear',
    camera: { mode: 'chase', fov: 48 },
    // floats ~0.5 m above the water in the flare, downwind (5 m/s tailwind on 086): the aircraft touches down
    // at ~1.5 m/s about 0.33 s into the clip (10 fps clip frame 3-4), the steps drive 20 cm under, it rebounds onto
    // the step (bows out of the water by 0.9 s, nose 7 deg up, settled by ~2.5 s) and runs
    // on at ~27 m/s nose-up with spray and float wakes; the old 5.5 m start floated in ground effect through the
    // whole 3 s clip. The landing line runs 110 m north of the channel's boat lane (z 3300) so the clip does not
    // open on a boat wake stretching ahead of the aircraft with its boat already behind the camera
    plane: { pos: [-500, 2.45, 3410], headingDeg: 86, pitchDeg: 1, bankDeg: 0, speed: 27, throttle: 0.12, flaps: 1 },
    presim: 30, clipInputs: { pitch: 0.12, roll: 0, yaw: 0 },
  },
  {
    id: 'water-landing-firm', name: 'Seaplane firm water landing', description: 'Same approach line, arriving nose-down with no flare: the floats hit at 3 m/s (0.3 s, 10 fps clip frame 3-4), drive 40 cm under, throw a splash, and the aircraft skips clear (0.9-1.3 s, clip frames 9-13) before it settles on the step nose-up by 2.5 s.',
    time: 13.0, weather: 'clear',
    camera: { mode: 'chase', fov: 48 },
    plane: { pos: [-500, 3.0, 3410], headingDeg: 86, pitchDeg: -3, bankDeg: 0, speed: 28, throttle: 0.05, flaps: 1 },
    presim: 30, clipInputs: { pitch: 0.05, roll: 0, yaw: 0 },
  },
  {
    id: 'sunset', name: 'Sunset flight', description: 'Low sun in the west over the bay, downtown silhouetted, warm haze and long water reflections.',
    time: 17.9, weather: 'scattered',
    camera: { mode: 'chase', fov: 50 },
    plane: { pos: [1400, 280, 600], headingDeg: 262, pitchDeg: 1, bankDeg: 0, speed: 55, throttle: 0.7 },
    presim: 30, clipInputs: { pitch: 0, roll: 0, yaw: 0 },
  },
  {
    id: 'cloudy', name: 'Cloudy-weather flight', description: 'Heavy cumulus and grey haze over Isla Garza; softer light, cloud shadows moving across the water.',
    time: 15.0, weather: 'cloudy',
    camera: { mode: 'chase', fov: 50 },
    plane: { pos: [700, 300, 3100], headingDeg: 335, pitchDeg: 0, bankDeg: 0, speed: 55, throttle: 0.7 },
    presim: 30, clipInputs: { pitch: 0, roll: 0, yaw: 0 },
  },
  {
    id: 'night', name: 'Night flight with city lights', description: 'Over the bay at 22:00 looking toward downtown: lit windows, street lamps, headlights and navigation strobes.',
    time: 22.0, weather: 'clear',
    camera: { mode: 'chase', fov: 50 },
    plane: { pos: [-400, 320, -900], headingDeg: 318, pitchDeg: 0, bankDeg: 0, speed: 55, throttle: 0.7 },
    presim: 30, clipInputs: { pitch: 0, roll: 0, yaw: 0 },
  },
  {
    id: 'city-close', name: 'Downtown core at facade range', description: 'Fixed camera 120 m up over the west side of downtown looking east into the core: the Faro Bahía drum at 330 m, the glass slabs and Meridian Tower at 400-600 m, a stone tower and a deco tower at 150-200 m, roofs below; the sun (16:48, el 21 deg) stands behind the camera, so the west-facing glass mirrors it toward the lens.',
    time: 16.8, weather: 'clear',
    camera: { mode: 'fixed', pos: [-3150, 120, -3930], headingDeg: 82, pitchDeg: 4, fov: 50, follow: true },
    plane: { fromCamera: { screenX: 0.5, screenY: 0.86, distance: 120 }, headingDeg: 82, pitchDeg: 0, bankDeg: 0, speed: 50, throttle: 0.6 },
    presim: 30, clipInputs: { pitch: 0, roll: 0, yaw: 0 },
  },
];

/** Aircraft inspection views (used by the aircraft / glass / cockpit gauntlet loops). The aircraft taxis at 3.5 m/s
 *  (the HUD read 7 kt IAS from the breeze while it was moored, and the critics scored the missing wake): the still
 *  keeps the same pose, the flight frames add the bow waves and float wakes, and the fixed cameras dolly along. */
BENCH_VIEWS.push(
  {
    id: 'plane-rear-quarter', name: 'Aircraft rear three-quarter', description: 'Fixed camera 14 m from the aircraft, rear-left-above, aircraft taxiing slowly off the Garza marina in sunlight.',
    time: 14.0, weather: 'clear',
    camera: { mode: 'fixed', pos: [425.9, 4.25, 1892.3], headingDeg: 205, pitchDeg: -9, fov: 40, follow: true },
    plane: { pos: [420, 1.96, 1905], headingDeg: 240, pitchDeg: 0, bankDeg: 0, speed: 3.5, throttle: 0.12 },
    presim: 10, clipInputs: { pitch: 0, roll: 0, yaw: 0 },
  },
  {
    id: 'plane-front-quarter', name: 'Aircraft front three-quarter', description: 'Fixed camera 13 m ahead-right of the slowly taxiing aircraft, low, showing cowl, propeller, windshield and floats.',
    time: 10.0, weather: 'clear',
    camera: { mode: 'fixed', pos: [415.6, 2.65, 1917.2], headingDeg: 20, pitchDeg: -3, fov: 40, follow: true },
    plane: { pos: [420, 1.96, 1905], headingDeg: 240, pitchDeg: 0, bankDeg: 0, speed: 3.5, throttle: 0.12 },
    presim: 10, clipInputs: { pitch: 0, roll: 0, yaw: 0 },
  },
  {
    id: 'glass-sun', name: 'Cockpit glass in direct sun', description: 'Close on the windshield and left side windows, the sun high off the starboard bow so its mirror image lands on the windshield; interior visible through the glass.',
    // Camera and aircraft keep their relative pose (same framing as before) but the whole rig is turned 60 degrees:
    // the moored heading 240 -> 180 with the camera on the same fore-port bearing, at 14:00 (sun el 58, az 246).
    // With the old pose (15:30, sun behind the camera) no pane could mirror the sun toward the lens; now the
    // windshield's left pane reflects it at ~(2.1, 0.93, -0.59) body, clear of the wing's shadow.
    time: 14.0, weather: 'clear',
    camera: { mode: 'fixed', pos: [424.6, 3.05, 1909.6], headingDeg: -45, pitchDeg: -8, fov: 32 },
    plane: { pos: [420, 1.96, 1905], headingDeg: 180, pitchDeg: 0, bankDeg: 0, speed: 0, throttle: 0.0 },
    presim: 10, clipInputs: { pitch: 0, roll: 0, yaw: 0 },
  },
);

export function findView(id: string): BenchView | undefined {
  if (id === 'dev') return devView(new URLSearchParams(window.location.search));
  return BENCH_VIEWS.find((v) => v.id === id);
}

/** Ad-hoc view from URL parameters (`?bench=dev&...`) so builders can pose cameras without editing this file:
 *  `cam=x,y,z` + `hdg` + `pch` (fixed camera; omit `cam` for `mode=chase|cockpit`), `fov`, `follow=1`,
 *  `plane=x,y,z,headingDeg,pitchDeg,bankDeg,speed,throttle`, `flaps`, `time` (hours), `weather`, `presim` (s),
 *  `inputs=pitch,roll,yaw` held during a clip. Missing values fall back to a taxiing aircraft off the marina. */
export function devView(q: URLSearchParams): BenchView {
  const nums = (k: string): number[] => (q.get(k) ?? '').split(',').map(Number).filter((n) => Number.isFinite(n));
  const num = (k: string, d: number): number => { const n = Number(q.get(k)); return q.has(k) && Number.isFinite(n) ? n : d; };
  const cam = nums('cam');
  const p = nums('plane');
  const inputs = nums('inputs');
  const modeParam = q.get('mode');
  const mode: CamMode = cam.length === 3 ? 'fixed' : modeParam === 'cockpit' ? 'cockpit' : 'chase';
  const weather = (q.get('weather') ?? 'clear') as Weather;
  return {
    id: 'dev', name: 'Dev view', description: 'URL-parameterised camera and aircraft pose.',
    time: num('time', 14), weather,
    camera: {
      mode,
      pos: cam.length === 3 ? [cam[0], cam[1], cam[2]] : undefined,
      headingDeg: num('hdg', 0), pitchDeg: num('pch', -10), fov: num('fov', 50), follow: q.get('follow') === '1',
    },
    plane: {
      pos: [p[0] ?? 420, p[1] ?? 1.96, p[2] ?? 1905],
      headingDeg: p[3] ?? 240, pitchDeg: p[4] ?? 0, bankDeg: p[5] ?? 0, speed: p[6] ?? 3.5, throttle: p[7] ?? 0.12,
      flaps: num('flaps', 0),
    },
    presim: num('presim', 10),
    clipInputs: { pitch: inputs[0] ?? 0, roll: inputs[1] ?? 0, yaw: inputs[2] ?? 0 },
  };
}
