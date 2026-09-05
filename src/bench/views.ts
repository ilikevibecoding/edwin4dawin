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
    plane: { pos: [-1950, 52, -3740], headingDeg: 96, pitchDeg: 0, bankDeg: 4, speed: 55, throttle: 0.7 },
    presim: 30, clipInputs: { pitch: 0, roll: 0.05, yaw: 0 },
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
    // floats ~0.7 m above the water, flaring downwind (5 m/s tailwind on 086): the aircraft balloons a few
    // decimetres, sinks and touches down about 0.7 s into the clip (frame 7), then runs on the step at ~27 m/s
    // with spray and float wakes; the old 5.5 m start floated in ground effect through the whole 3 s clip.
    // The landing line runs 110 m north of the channel's boat lane (z 3300) so the clip does not open on a
    // boat wake stretching ahead of the aircraft with its boat already behind the camera
    plane: { pos: [-500, 2.7, 3410], headingDeg: 86, pitchDeg: 3, bankDeg: 0, speed: 28, throttle: 0.12, flaps: 1 },
    presim: 30, clipInputs: { pitch: 0.15, roll: 0, yaw: 0 },
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
  return BENCH_VIEWS.find((v) => v.id === id);
}
