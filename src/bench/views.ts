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
    camera: { mode: 'fixed', pos: [430, 392, 3660], headingDeg: -7, pitchDeg: -12.5, fov: 42 },
    plane: { fromCamera: { screenX: 0.795, screenY: 0.755, distance: 54 }, headingDeg: -22, pitchDeg: 3, bankDeg: -9, speed: 52, throttle: 0.75 },
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
    plane: { pos: [-1950, 52, -3740], headingDeg: 96, pitchDeg: 0, bankDeg: 4, speed: 55, throttle: 0.7 },
    presim: 30, clipInputs: { pitch: 0, roll: 0.05, yaw: 0 },
  },
  {
    id: 'skyline-high', name: 'High-altitude skyline', description: 'Fixed camera 900 m up over the bay looking north-west at the downtown skyline hierarchy, port in the middle distance.',
    time: 16.2, weather: 'scattered',
    camera: { mode: 'fixed', pos: [-300, 900, -1200], headingDeg: -38, pitchDeg: -10, fov: 45 },
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
    plane: { pos: [-500, 5.5, 3330], headingDeg: 86, pitchDeg: 4, bankDeg: 0, speed: 29, throttle: 0.25, flaps: 1 },
    presim: 30, clipInputs: { pitch: 0.12, roll: 0, yaw: 0 },
  },
  {
    id: 'sunset', name: 'Sunset flight', description: 'Low sun in the west over the bay, downtown silhouetted, warm haze and long water reflections.',
    time: 18.75, weather: 'scattered',
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
];

export function findView(id: string): BenchView | undefined {
  return BENCH_VIEWS.find((v) => v.id === id);
}
