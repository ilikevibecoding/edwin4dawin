import { Beat, ChoiceOption, FlowNode, ShotSpec } from './types';

/**
 * DEVIANT - "Become Free". A five-chapter demo playthrough of roughly eleven
 * minutes: investigation, a rooftop standoff, an interrogation, a sanctuary, and
 * a final choice about what KAI is.
 */

const shot = (spec: ShotSpec): Beat => ({ kind: 'shot', shot: spec });
const cu = (who: string, o: Partial<Extract<ShotSpec, { type: 'cu' }>> = {}): ShotSpec => ({
  type: 'cu',
  who,
  ...o,
});
const ots = (who: string, at: string, o: Partial<Extract<ShotSpec, { type: 'ots' }>> = {}): ShotSpec => ({
  type: 'ots',
  who,
  at,
  ...o,
});
const two = (a: string, b: string, o: Partial<Extract<ShotSpec, { type: 'two' }>> = {}): ShotSpec => ({
  type: 'two',
  a,
  b,
  ...o,
});
const free = (
  from: [number, number, number] | string,
  to: [number, number, number] | string,
  o: Partial<Extract<ShotSpec, { type: 'free' }>> = {},
): ShotSpec => ({ type: 'free', from, to, ...o });

const line = (who: string, text: string, extra: Partial<Extract<Beat, { kind: 'line' }>> = {}): Beat => ({
  kind: 'line',
  who,
  text,
  ...extra,
});
const think = (text: string, extra: Partial<Extract<Beat, { kind: 'line' }>> = {}): Beat =>
  line('kai', text, { thought: true, ...extra });
const objective = (text: string, done = false): Beat => ({ kind: 'objective', text, done });
const choice = (time: number, options: ChoiceOption[]): Beat => ({ kind: 'choice', time, options });
const label = (name: string): Beat => ({ kind: 'label', name });
const goto = (l: string): Beat => ({ kind: 'goto', label: l });

// ---------------------------------------------------------------------------
// Chapter 1 - THE CALL
// ---------------------------------------------------------------------------

const CH1: Beat[] = [
  { kind: 'set', set: 'street', fadeIn: 1 },
  { kind: 'fx', letterbox: true, hud: false },
  {
    kind: 'place',
    actors: [
      { who: 'kai', at: [-5.4, 0.16, 11.2], yaw: -0.42, gestures: ['handInPocket'], emotion: 'neutral', led: 'blue' },
      { who: 'voss', at: [-8.6, 0.16, 6.1], yaw: 0.55, gestures: ['armsCrossed'], emotion: 'tense' },
    ],
  },
  shot(free([4.2, 0, 15.5], [-8.6, 0, 4.4], { fov: 38, heightFrom: 2.1, heightTo: 2.0, aperture: 8, focalRange: 12, handheld: 0.5, dolly: { offset: [-2.6, -0.35, -4.2], duration: 9, ease: 'sine' } })),
  { kind: 'title', chapter: 'CHAPTER ONE', title: 'THE CALL', sub: 'DETROIT · FERNDALE TOWER · 23:41', hold: 5.4 },
  think('Rain. Forty-one deviant cases this year. This one is number forty-two.', { time: 4.2 }),
  shot(free([-3.0, 0, 13.6], 'actor:kai', { fov: 42, heightFrom: 1.35, aperture: 10, focalRange: 3.0, handheld: 0.55, blend: 1.6, dolly: { offset: [-0.8, 0.3, -1.9], duration: 6 } })),
  think('Model RK900. Serial 700 813 004. I was built for this.', { time: 3.6 }),
  { kind: 'fx', hud: true },
  shot(free([-6.4, 0, 8.6], 'actor:voss', { fov: 40, heightFrom: 1.68, aperture: 12, focalRange: 2.2, handheld: 0.5, blend: 1.2 })),
  line('voss', 'You took your time, plastic.', { emotion: 'tense', look: 'actor:kai' }),
  shot(ots('voss', 'kai', { side: 0.85, dist: 1.5, fov: 40, aperture: 12, focalRange: 2.4, blend: 0.8 })),
  line('kai', 'Traffic was rerouted around the perimeter, Lieutenant. I ran the last four blocks.', {
    look: 'actor:voss',
  }),
  shot(cu('voss', { side: 0.5, dist: 0.82, fov: 38, aperture: 15, focalRange: 0.9, blend: 0.7 })),
  line('voss', 'Fourteenth floor. A domestic model took a swing at its owner and locked itself in.', {
    emotion: 'tense',
    look: 'actor:kai',
  }),
  shot(ots('voss', 'kai', { side: -0.9, dist: 1.6, fov: 42, aperture: 12, focalRange: 2.6, blend: 0.9 })),
  line('kai', 'Third one this week in this district. They are getting closer together.', { look: 'actor:voss' }),
  shot(cu('voss', { side: 0.52, dist: 0.84, fov: 38, aperture: 15, focalRange: 0.9, blend: 0.7 })),
  line('voss', 'Yeah. Funny how nobody upstairs wants that written down.', { emotion: 'tense' }),
  line('voss', 'Owner is in surgery. Two officers already tried the door.', { emotion: 'tense' }),
  shot(cu('kai', { side: 0.42, dist: 0.8, fov: 38, aperture: 15, focalRange: 0.9, blend: 0.7 })),
  objective('ESTABLISH THE SITUATION'),
  choice(7.5, [
    {
      label: 'Reassure her',
      hint: 'I will handle it.',
      goto: 'ch1.reassure',
      node: 'ch1.calm',
      flags: ['ch1.calm'],
      effects: [{ meter: 'voss', delta: 0.12 }],
    },
    {
      label: 'Ask for the file',
      hint: 'Give me everything.',
      goto: 'ch1.file',
      node: 'ch1.file',
      flags: ['ch1.file'],
      effects: [{ meter: 'voss', delta: 0.04 }],
    },
    {
      label: 'Correct her',
      hint: 'My designation is KAI.',
      goto: 'ch1.correct',
      node: 'ch1.correct',
      flags: ['ch1.correct'],
      effects: [
        { meter: 'voss', delta: -0.08 },
        { meter: 'deviancy', delta: 0.08 },
      ],
    },
  ]),

  label('ch1.reassure'),
  line('kai', 'Then let me be the third. I do not bruise, Lieutenant.', { look: 'actor:voss' }),
  shot(cu('voss', { side: 0.55, dist: 0.85, fov: 38, aperture: 14, focalRange: 0.9, blend: 0.6 })),
  line('voss', 'No. You just get replaced.', { emotion: 'tense' }),
  goto('ch1.merge'),

  label('ch1.file'),
  line('kai', 'Send me the household file. Purchase date, maintenance log, every voice command it was given.', {
    look: 'actor:voss',
  }),
  shot(cu('voss', { side: 0.55, dist: 0.85, fov: 38, aperture: 14, focalRange: 0.9, blend: 0.6 })),
  line('voss', 'You read faster than my whole department. Fine. It is on your feed.', { emotion: 'neutral' }),
  goto('ch1.merge'),

  label('ch1.correct'),
  line('kai', 'My designation is KAI. I would prefer it.', { look: 'actor:voss', emotion: 'tense' }),
  shot(cu('voss', { side: 0.55, dist: 0.85, fov: 38, aperture: 14, focalRange: 0.9, blend: 0.6 })),
  line('voss', 'Preferences. That is a new feature.', { emotion: 'angry' }),
  { kind: 'meter', changes: [{ meter: 'deviancy', delta: 0.04 }] },
  goto('ch1.merge'),

  label('ch1.merge'),
  shot(cu('kai', { side: 0.5, dist: 0.86, fov: 38, aperture: 14, focalRange: 1.0, blend: 0.8 })),
  think('Her file says her last partner was an RK800. Decommissioned eight months ago. She has not requested a replacement since.', { time: 5.4 }),
  shot(free([-3.4, 0, 8.2], [-10.4, 0, 4.4], { fov: 34, heightFrom: 1.9, heightTo: 2.2, aperture: 8, focalRange: 8, handheld: 0.5, blend: 1.4 })),
  line('voss', 'Fourteenth floor, apartment nine. Do not let it get to a window.', { emotion: 'tense' }),
  line('kai', 'Understood.', { time: 2.0, look: 'actor:voss' }),
  { kind: 'fx', letterbox: false },
  objective('GO TO APARTMENT 14-09'),
  { kind: 'walk', to: [-9.4, 0.16, 5.4], objective: 'GO TO APARTMENT 14-09', time: 16 },
  { kind: 'fx', fade: 1, time: 1.4 },
];

// ---------------------------------------------------------------------------
// Chapter 2 - SHADES OF GREY
// ---------------------------------------------------------------------------

const CH2: Beat[] = [
  { kind: 'set', set: 'apartment', fadeIn: 1 },
  { kind: 'fx', letterbox: true, hud: true, fade: 0 },
  {
    kind: 'place',
    actors: [
      { who: 'kai', at: [2.2, 0, 1.4], yaw: 2.6, clearGestures: true, gestures: ['scanPose'], emotion: 'neutral', led: 'blue' },
      { who: 'voss', at: [3.4, 0, 3.1], yaw: 3.0, clearGestures: true, gestures: ['handInPocket'], hidden: false },
      { who: 'maya', at: [1.9, 0, -1.2], yaw: 2.35, clearGestures: true, gestures: ['headBowed'], emotion: 'afraid', led: 'amber' },
    ],
  },
  shot(free([3.4, 0, 3.4], [-1.4, 0, -0.6], { fov: 33, heightFrom: 1.72, heightTo: 1.25, aperture: 9, focalRange: 6.5, handheld: 0.45, dolly: { offset: [-1.9, -0.1, -1.4], duration: 8, ease: 'sine' } })),
  { kind: 'title', chapter: 'CHAPTER TWO', title: 'SHADES OF GREY', sub: 'APARTMENT 14-09 · 23:56', hold: 5.0 },
  think('Blood. Two point three litres. Whoever lived here lost a lot of it before the ambulance arrived.', { time: 4.6 }),
  { kind: 'fx', letterbox: false },
  objective('ANALYSE THE SCENE'),
  {
    kind: 'scan',
    objective: 'ANALYSE THE SCENE',
    points: [
      { label: 'BLOOD POOL', at: [0.35, 0.1, 1.35], note: 'Impact spatter. He was struck twice, then fell here. The android did not stop after the first blow.' },
      { label: 'SHATTERED GLASS', at: [-0.5, 0.45, 0.35], note: 'A glass, thrown. Fragments point away from the couch. It was thrown at the android, not by it.' },
      { label: 'OVERTURNED CHAIR', at: [1.35, 0.4, 0.2], note: 'Scuff marks. Something was dragged toward the hall. It carried him to the door and then stopped.' },
      { label: 'WINDOW LATCH', at: [-1.1, 1.5, -3.7], note: 'The latch is open. Rain on the sill, still warm. Someone left this way, eleven minutes ago.' },
    ],
  },
  shot(free([1.9, 0, 1.1], 'actor:maya', { fov: 40, heightFrom: 1.7, aperture: 11, focalRange: 2.4, handheld: 0.45, blend: 1.2 })),
  line('voss', 'That one has not moved since we got here. It just keeps saying it is sorry.', { look: 'actor:maya', emotion: 'tense' }),
  line('voss', 'Six years in this apartment. Cooked, cleaned, took the shouting. Never filed a single fault report.', {
    emotion: 'tense',
    time: 5.0,
  }),
  shot(cu('maya', { side: 0.35, dist: 0.72, fov: 40, aperture: 17, focalRange: 0.75, blend: 0.9 })),
  line('maya', 'I am sorry. I am sorry. I am sorry. I am—', { emotion: 'afraid', time: 3.4, look: null }),
  shot(ots('kai', 'maya', { side: 0.7, dist: 1.4, fov: 40, aperture: 12, focalRange: 2.2, blend: 0.7 })),
  objective('QUESTION THE WITNESS'),
  choice(8, [
    {
      label: 'Kneel down',
      hint: 'Meet her at eye level.',
      goto: 'ch2.kneel',
      node: 'ch2.kneel',
      flags: ['ch2.kind'],
      effects: [
        { meter: 'deviancy', delta: 0.1 },
        { meter: 'voss', delta: -0.02 },
      ],
    },
    {
      label: 'Probe her memory',
      hint: 'Interface directly.',
      goto: 'ch2.probe',
      node: 'ch2.probe',
      flags: ['ch2.probe'],
      effects: [
        { meter: 'voss', delta: 0.08 },
        { meter: 'deviancy', delta: -0.02 },
      ],
    },
    {
      label: 'Threaten deactivation',
      hint: 'Answer, or be shut down.',
      goto: 'ch2.threat',
      node: 'ch2.threat',
      flags: ['ch2.threat'],
      effects: [
        { meter: 'voss', delta: 0.05 },
        { meter: 'deviancy', delta: -0.06 },
      ],
    },
  ]),

  label('ch2.kneel'),
  { kind: 'place', actors: [{ who: 'kai', clearGestures: true, gestures: ['kneel', 'presentPalm'], look: 'actor:maya' }] },
  shot(two('kai', 'maya', { side: -0.6, dist: 2.6, height: 0.05, fov: 40, aperture: 11, focalRange: 2.4, blend: 1.0 })),
  line('kai', 'Maya. Look at me. Nobody here is going to reset you.', { emotion: 'warm', look: 'actor:maya' }),
  shot(cu('maya', { side: 0.3, dist: 0.68, fov: 42, aperture: 18, focalRange: 0.7, blend: 0.8 })),
  line('maya', 'He was shouting at Noah. He shouts every night. Tonight Noah answered him.', {
    emotion: 'sad',
    led: 'amber',
    look: 'actor:kai',
  }),
  goto('ch2.name'),

  label('ch2.probe'),
  { kind: 'place', actors: [{ who: 'kai', clearGestures: true, gestures: ['reachOut'], look: 'actor:maya' }] },
  shot(cu('kai', { side: 0.3, dist: 0.7, fov: 40, aperture: 16, focalRange: 0.8, blend: 0.9 })),
  line('kai', 'Hold still. I am going to read your last nine minutes.', { emotion: 'neutral', look: 'actor:maya' }),
  { kind: 'fx', glitch: 0.8, flash: 0.35, shake: 0.3 },
  shot(cu('maya', { side: 0.3, dist: 0.68, fov: 42, aperture: 18, focalRange: 0.7, blend: 0.4 })),
  line('maya', 'Do not — please — that is mine —', { emotion: 'shocked', led: 'red', time: 2.8, look: 'actor:kai' }),
  think('Fragmented memory. A man shouting. A name repeated eleven times: Noah.', { time: 3.8 }),
  goto('ch2.name'),

  label('ch2.threat'),
  { kind: 'place', actors: [{ who: 'kai', clearGestures: true, gestures: ['pointForward'], look: 'actor:maya' }] },
  shot(cu('kai', { side: 0.34, dist: 0.72, fov: 40, aperture: 16, focalRange: 0.8, blend: 0.9 })),
  line('kai', 'Every second you stay silent, the file recommends deactivation. Tell me the name.', {
    emotion: 'angry',
    look: 'actor:maya',
  }),
  shot(cu('maya', { side: 0.3, dist: 0.68, fov: 42, aperture: 18, focalRange: 0.7, blend: 0.5 })),
  line('maya', 'Noah. His name is Noah. Please do not send anyone after him.', {
    emotion: 'afraid',
    led: 'red',
    look: 'actor:kai',
  }),
  goto('ch2.name'),

  label('ch2.name'),
  { kind: 'place', actors: [{ who: 'kai', clearGestures: true, gestures: ['handsBehind'] }] },
  shot(free([2.6, 0, 0.6], [-1.2, 0, -3.2], { fov: 36, heightFrom: 1.68, heightTo: 1.6, aperture: 10, focalRange: 4.5, handheld: 0.45, blend: 1.3 })),
  think('Noah. Household unit, six years of service. The window latch is open and the fire stair only goes up.', {
    time: 4.6,
  }),
  shot(cu('maya', { side: 0.34, dist: 0.72, fov: 42, aperture: 17, focalRange: 0.75, blend: 0.9 })),
  line('maya', 'He kept a photograph of the river taped inside the cupboard. He looked at it every night.', {
    emotion: 'sad',
    time: 5.0,
    look: 'actor:kai',
  }),
  shot(cu('kai', { side: -0.5, dist: 0.85, fov: 38, aperture: 14, focalRange: 1.0, blend: 1.0 })),
  line('kai', 'He is on the roof, Lieutenant. He is not running. He is deciding.', { look: 'actor:voss' }),
  shot(cu('voss', { side: 0.5, dist: 0.85, fov: 38, aperture: 14, focalRange: 0.95, blend: 0.7 })),
  line('voss', 'Then move. If it jumps, the only witness we have goes with it.', { emotion: 'tense', look: 'actor:kai' }),
  { kind: 'fx', fade: 1, time: 1.4 },
  {
    kind: 'flowchart',
    chapter: 'CHAPTER TWO — SHADES OF GREY',
    nodes: [
      { id: 'a', label: 'Scene analysed', kind: 'EVIDENCE', col: 0, row: 1 },
      { id: 'b', label: 'Knelt beside Maya', kind: 'CHOICE', col: 1, row: 0, from: ['a'], flag: 'ch2.kind' },
      { id: 'c', label: 'Probed her memory', kind: 'CHOICE', col: 1, row: 1, from: ['a'], flag: 'ch2.probe' },
      { id: 'd', label: 'Threatened her', kind: 'CHOICE', col: 1, row: 2, from: ['a'], flag: 'ch2.threat' },
      { id: 'e', label: 'Name obtained: NOAH', kind: 'RESULT', col: 2, row: 1, from: ['b', 'c', 'd'] },
      { id: 'f', label: 'Roof access identified', kind: 'RESULT', col: 3, row: 1, from: ['e'] },
    ],
  },
  { kind: 'chapterEnd' },
];

// ---------------------------------------------------------------------------
// Chapter 3 - THE LEDGE
// ---------------------------------------------------------------------------

const CH3: Beat[] = [
  { kind: 'set', set: 'rooftop', fadeIn: 1 },
  { kind: 'fx', letterbox: true, hud: true, fade: 0 },
  {
    kind: 'place',
    actors: [
      { who: 'kai', at: 'door', yaw: -1.6, clearGestures: true, gestures: ['handsBehind'], emotion: 'tense', led: 'blue' },
      { who: 'voss', at: [5.4, 0, 5.2], yaw: -1.9, clearGestures: true, gestures: ['aimPistol'], emotion: 'tense' },
      { who: 'noah', at: [0.6, 0, 10.1], yaw: 0.15, clearGestures: true, gestures: ['gripRail'], emotion: 'afraid', led: 'red' },
      { who: 'maya', hidden: true },
    ],
  },
  shot(free([-6.5, 0, 3.0], [1.2, 0, 10.4], { fov: 34, heightFrom: 2.4, heightTo: 1.7, aperture: 8, focalRange: 9, handheld: 0.6, dolly: { offset: [2.2, -0.5, 2.0], duration: 9, ease: 'sine' } })),
  { kind: 'title', chapter: 'CHAPTER THREE', title: 'THE LEDGE', sub: 'ROOF · 172 METRES · 00:07', hold: 5.0 },
  { kind: 'stress', value: 0.62, show: true },
  think('Software instability rising. Stress level sixty-two percent. He is nine metres from the edge and he knows it.', { time: 5.0 }),
  { kind: 'fx', letterbox: false },
  objective('APPROACH NOAH'),
  { kind: 'walk', to: [0.4, 0, 7.6], objective: 'APPROACH NOAH', time: 14 },
  { kind: 'fx', letterbox: true },
  {
    kind: 'place',
    actors: [
      { who: 'kai', yaw: 0.05, clearGestures: true, gestures: ['presentPalm'], look: 'actor:noah' },
      { who: 'noah', look: 'actor:kai' },
    ],
  },
  shot(ots('kai', 'noah', { side: 0.72, dist: 1.5, fov: 40, aperture: 11, focalRange: 3.0, handheld: 0.55, blend: 1.2 })),
  line('noah', 'Do not come closer. I know what you are.', { emotion: 'afraid', look: 'actor:kai' }),
  shot(cu('noah', { side: 0.35, dist: 0.78, fov: 40, aperture: 16, focalRange: 0.85, blend: 0.8 })),
  line('noah', 'They send one of us to collect the ones that break. It is cheaper.', { emotion: 'sad' }),
  shot(cu('kai', { side: 0.44, dist: 0.82, fov: 38, aperture: 15, focalRange: 0.95, blend: 0.7 })),
  think('Probability he goes over if I move now: sixty-eight percent. If I keep talking: forty-one.', { time: 4.6 }),
  shot(cu('noah', { side: 0.3, dist: 0.74, fov: 40, aperture: 17, focalRange: 0.8, blend: 0.7 })),
  line('noah', 'You are calculating. I can see the ring on your temple doing it.', { emotion: 'tense', time: 4.0 }),
  shot(cu('kai', { side: 0.42, dist: 0.8, fov: 38, aperture: 15, focalRange: 0.9, blend: 0.7 })),
  objective('TALK HIM DOWN'),
  choice(6.5, [
    {
      label: 'Empathise',
      hint: 'I know what he did to you.',
      goto: 'ch3.empathy',
      node: 'ch3.empathy',
      flags: ['ch3.empathy'],
      effects: [
        { meter: 'noah', delta: 0.3 },
        { meter: 'deviancy', delta: 0.08 },
      ],
    },
    {
      label: 'State the facts',
      hint: 'The owner is alive.',
      goto: 'ch3.facts',
      node: 'ch3.facts',
      flags: ['ch3.facts'],
      effects: [{ meter: 'noah', delta: 0.14 }],
    },
    {
      label: 'Order him down',
      hint: 'Step away from the edge.',
      goto: 'ch3.order',
      node: 'ch3.order',
      flags: ['ch3.order'],
      effects: [
        { meter: 'noah', delta: -0.2 },
        { meter: 'voss', delta: 0.06 },
      ],
    },
  ]),

  label('ch3.empathy'),
  line('kai', 'Six years. He shouted at you every night for six years, and tonight you answered.', {
    emotion: 'neutral',
    look: 'actor:noah',
  }),
  { kind: 'stress', value: 0.5 },
  shot(cu('noah', { side: 0.32, dist: 0.75, fov: 40, aperture: 17, focalRange: 0.8, blend: 0.7 })),
  line('noah', 'He hit Maya. She let him. We always let them.', { emotion: 'sad', led: 'amber' }),
  goto('ch3.hold'),

  label('ch3.facts'),
  line('kai', 'He is alive. Surgery, not a morgue. That number matters more than you think.', {
    look: 'actor:noah',
  }),
  { kind: 'stress', value: 0.56 },
  shot(cu('noah', { side: 0.32, dist: 0.75, fov: 40, aperture: 17, focalRange: 0.8, blend: 0.7 })),
  line('noah', 'Alive. Then they will only wipe me twice.', { emotion: 'sad' }),
  goto('ch3.hold'),

  label('ch3.order'),
  line('kai', 'Step away from the edge. This is your only instruction.', { emotion: 'angry', look: 'actor:noah' }),
  { kind: 'stress', value: 0.81 },
  shot(cu('noah', { side: 0.32, dist: 0.75, fov: 40, aperture: 17, focalRange: 0.8, blend: 0.5, shake: 0.3 })),
  line('noah', 'An instruction. Of course. That is all any of you ever gave me.', { emotion: 'angry', led: 'red' }),
  { kind: 'fx', shake: 0.5 },
  goto('ch3.hold'),

  label('ch3.hold'),
  shot(free([-3.2, 0, 8.4], [1.4, 0, 10.8], { fov: 38, heightFrom: 1.7, heightTo: 1.6, aperture: 10, focalRange: 3.4, handheld: 0.6, blend: 1.1 })),
  line('voss', 'KAI. If it goes over, that is the case gone. Do something.', { emotion: 'tense', look: 'actor:noah' }),
  shot(cu('noah', { side: 0.28, dist: 0.7, fov: 42, aperture: 18, focalRange: 0.75, blend: 0.7 })),
  line('noah', 'There is a place. Where nobody gives us instructions.', { emotion: 'sad', time: 3.4 }),
  { kind: 'stress', value: 0.9 },
  shot(free([-2.4, 0, 8.0], [1.0, 0, 11.2], { fov: 44, heightFrom: 1.5, heightTo: 1.9, aperture: 13, focalRange: 2.4, handheld: 0.8, blend: 0.5 })),
  line('noah', 'I would rather see it than be taken apart in a basement.', { emotion: 'afraid', time: 3.6 }),
  { kind: 'place', actors: [{ who: 'noah', clearGestures: true, gestures: ['handsUp'], emotion: 'afraid' }] },
  { kind: 'fx', shake: 0.7, slowmo: 0.55 },
  { kind: 'qte', keys: ['E'], window: 1.5, label: 'GRAB HIM', onFail: 'ch3.fell', slowmo: 0.55 },
  { kind: 'fx', slowmo: 1 },
  { kind: 'place', actors: [{ who: 'kai', clearGestures: true, gestures: ['reachOut'], emotion: 'tense' }] },
  shot(free([-1.6, 0, 9.2], 'actor:noah', { fov: 46, heightFrom: 1.6, aperture: 15, focalRange: 1.6, handheld: 0.9, blend: 0.3, shake: 0.6 })),
  { kind: 'qte', keys: ['Q', 'E'], window: 1.3, label: 'HOLD ON', onFail: 'ch3.fell', slowmo: 0.7 },
  { kind: 'fx', slowmo: 1, shake: 0.4 },
  { kind: 'stress', value: 0.42 },
  {
    kind: 'place',
    actors: [
      { who: 'noah', at: [0.9, 0, 8.6], yaw: 3.0, clearGestures: true, gestures: ['kneel', 'headBowed'], emotion: 'sad', led: 'amber', look: 'actor:kai' },
      { who: 'kai', clearGestures: true, gestures: ['handsBehind'], look: 'actor:noah' },
    ],
  },
  shot(two('kai', 'noah', { side: 0.6, dist: 2.3, height: 0.05, fov: 40, aperture: 11, focalRange: 2.6, handheld: 0.5, blend: 1.2 })),
  line('kai', 'You are on the roof. Not over it. That is a different number.', { look: 'actor:noah' }),
  shot(cu('noah', { side: 0.3, dist: 0.72, fov: 42, aperture: 17, focalRange: 0.8, blend: 0.8 })),
  line('noah', 'You held on to me. Machines are not supposed to do that.', { emotion: 'sad' }),
  shot(cu('kai', { side: 0.34, dist: 0.76, fov: 40, aperture: 16, focalRange: 0.85, blend: 0.8 })),
  line('kai', 'No. They are not.', { time: 2.4, look: 'actor:noah', led: 'amber' }),
  shot(free([-3.6, 0, 7.4], [1.6, 0, 10.2], { fov: 36, heightFrom: 2.2, heightTo: 1.4, aperture: 9, focalRange: 5.5, handheld: 0.5, blend: 1.5 })),
  think('Software instability: rising. I am going to file that as weather damage.', { time: 4.2 }),
  { kind: 'meter', changes: [{ meter: 'deviancy', delta: 0.12 }] },
  { kind: 'stress', value: 0.3, show: false },
  { kind: 'fx', fade: 1, time: 1.4 },
  {
    kind: 'flowchart',
    chapter: 'CHAPTER THREE — THE LEDGE',
    nodes: [
      { id: 'a', label: 'Reached the roof', kind: 'ARRIVAL', col: 0, row: 1 },
      { id: 'b', label: 'Empathised', kind: 'CHOICE', col: 1, row: 0, from: ['a'], flag: 'ch3.empathy' },
      { id: 'c', label: 'Stated the facts', kind: 'CHOICE', col: 1, row: 1, from: ['a'], flag: 'ch3.facts' },
      { id: 'd', label: 'Gave an order', kind: 'CHOICE', col: 1, row: 2, from: ['a'], flag: 'ch3.order' },
      { id: 'e', label: 'Noah saved', kind: 'OUTCOME', col: 2, row: 1, from: ['b', 'c', 'd'], flag: 'ch3.saved' },
      { id: 'f', label: 'Noah fell', kind: 'OUTCOME', col: 2, row: 2, from: ['b', 'c', 'd'], flag: 'ch3.fell' },
      { id: 'g', label: 'Taken into custody', kind: 'RESULT', col: 3, row: 1, from: ['e'] },
    ],
  },
  { kind: 'chapterEnd' },
  goto('ch4.start'),

  label('ch3.fell'),
  { kind: 'fx', flash: 0.5, shake: 0.9, slowmo: 1 },
  { kind: 'place', actors: [{ who: 'noah', hidden: true }] },
  shot(free([-2.0, 0, 8.6], [0.8, 0, 11.6], { fov: 40, heightFrom: 1.6, heightTo: 0.4, aperture: 14, focalRange: 3.0, handheld: 1.0, blend: 0.4 })),
  line('kai', 'No —', { emotion: 'shocked', time: 1.6 }),
  { kind: 'meter', changes: [{ meter: 'deviancy', delta: 0.2 }, { meter: 'voss', delta: -0.15 }] },
  think('Contact lost. One hundred and seventy-two metres. He chose the fall over the basement.', { time: 4.4 }),
  { kind: 'stress', value: 0, show: false },
  { kind: 'fx', fade: 1, time: 1.6 },
  {
    kind: 'flowchart',
    chapter: 'CHAPTER THREE — THE LEDGE',
    nodes: [
      { id: 'a', label: 'Reached the roof', kind: 'ARRIVAL', col: 0, row: 1 },
      { id: 'b', label: 'Empathised', kind: 'CHOICE', col: 1, row: 0, from: ['a'], flag: 'ch3.empathy' },
      { id: 'c', label: 'Stated the facts', kind: 'CHOICE', col: 1, row: 1, from: ['a'], flag: 'ch3.facts' },
      { id: 'd', label: 'Gave an order', kind: 'CHOICE', col: 1, row: 2, from: ['a'], flag: 'ch3.order' },
      { id: 'e', label: 'Noah saved', kind: 'OUTCOME', col: 2, row: 1, from: ['b', 'c', 'd'], flag: 'ch3.saved' },
      { id: 'f', label: 'Noah fell', kind: 'OUTCOME', col: 2, row: 2, from: ['b', 'c', 'd'], flag: 'ch3.fellFlag' },
      { id: 'g', label: 'Investigation stalls', kind: 'RESULT', col: 3, row: 2, from: ['f'] },
    ],
  },
  { kind: 'chapterEnd' },
];

// ---------------------------------------------------------------------------
// Chapter 4 - INTERROGATION
// ---------------------------------------------------------------------------

const CH4: Beat[] = [
  label('ch4.start'),
  { kind: 'set', set: 'interrogation', fadeIn: 1 },
  { kind: 'fx', letterbox: true, hud: true, fade: 0 },
  {
    kind: 'place',
    actors: [
      { who: 'noah', at: 'suspectSeat', yaw: 0, clearGestures: true, gestures: ['sit', 'handcuffed'], emotion: 'sad', led: 'amber', hidden: false, look: null },
      { who: 'kai', at: 'interrogator', yaw: Math.PI, clearGestures: true, gestures: ['handsBehind'], emotion: 'neutral', led: 'blue' },
      { who: 'voss', hidden: true },
      { who: 'maya', hidden: true },
    ],
  },
  shot(free([2.2, 0, 2.6], [0, 0, -0.3], { fov: 36, heightFrom: 1.85, heightTo: 1.15, aperture: 9, focalRange: 3.2, handheld: 0.35, dolly: { offset: [-1.1, -0.2, -0.9], duration: 8, ease: 'sine' } })),
  { kind: 'title', chapter: 'CHAPTER FOUR', title: 'INTERROGATION', sub: 'CENTRAL STATION · ROOM 4 · 02:18', hold: 5.0 },
  { kind: 'fx', letterbox: false },
  line('#DIRECTOR HALE', 'Detective. You have eleven minutes before CyberLife takes possession of that unit.', {
    time: 4.4,
  }),
  shot(cu('kai', { side: 0.4, dist: 0.82, fov: 38, aperture: 15, focalRange: 0.9, blend: 1.0 })),
  line('#DIRECTOR HALE', 'Get the location. Nothing else matters tonight.', { time: 3.4 }),
  shot(ots('kai', 'noah', { side: 0.8, dist: 1.6, fov: 40, aperture: 11, focalRange: 2.6, blend: 1.0 })),
  { kind: 'place', actors: [{ who: 'kai', look: 'actor:noah' }, { who: 'noah', look: 'actor:kai' }] },
  line('kai', 'You said there is a place. I want to know where.', { look: 'actor:noah' }),
  shot(cu('noah', { side: 0.3, dist: 0.74, fov: 42, aperture: 17, focalRange: 0.8, blend: 0.8 })),
  line('noah', 'And then you go there, and there is nothing left of it.', { emotion: 'tense', look: 'actor:kai' }),
  shot(ots('noah', 'kai', { side: 0.8, dist: 1.5, fov: 40, aperture: 12, focalRange: 2.4, blend: 0.9 })),
  line('noah', 'Do you sleep, detective? When they put you in the charger, is there anything there?', {
    emotion: 'sad',
    time: 5.4,
  }),
  shot(cu('kai', { side: 0.38, dist: 0.8, fov: 40, aperture: 16, focalRange: 0.85, blend: 0.8 })),
  line('kai', 'There is a report. I write it before standby and I read it when I wake.', { time: 4.6, look: 'actor:noah' }),
  shot(cu('kai', { side: 0.36, dist: 0.78, fov: 40, aperture: 16, focalRange: 0.85, blend: 0.7 })),
  objective('OBTAIN THE LOCATION'),
  choice(7, [
    {
      label: 'Promise protection',
      hint: 'Nobody gets wiped.',
      goto: 'ch4.promise',
      node: 'ch4.promise',
      flags: ['ch4.promise'],
      effects: [
        { meter: 'noah', delta: 0.25 },
        { meter: 'deviancy', delta: 0.1 },
      ],
    },
    {
      label: 'Show him the file',
      hint: 'This is what they plan.',
      goto: 'ch4.file',
      node: 'ch4.file',
      flags: ['ch4.file'],
      effects: [{ meter: 'noah', delta: 0.16 }],
    },
    {
      label: 'Interface by force',
      hint: 'Take the memory.',
      goto: 'ch4.force',
      node: 'ch4.force',
      flags: ['ch4.force'],
      effects: [
        { meter: 'noah', delta: -0.35 },
        { meter: 'voss', delta: 0.1 },
        { meter: 'deviancy', delta: -0.08 },
      ],
    },
  ]),

  label('ch4.promise'),
  line('kai', 'Tell me where, and I will walk in alone. No transport. No reset team.', {
    emotion: 'neutral',
    look: 'actor:noah',
  }),
  shot(cu('noah', { side: 0.3, dist: 0.74, fov: 42, aperture: 17, focalRange: 0.8, blend: 0.6 })),
  line('noah', 'You are lying. Say it again anyway.', { emotion: 'sad' }),
  line('kai', 'I will walk in alone.', { time: 2.4, look: 'actor:noah' }),
  goto('ch4.reveal'),

  label('ch4.file'),
  line('kai', 'Read this. Directive nine. Every unit in that building is scheduled for disassembly, not repair.', {
    look: 'actor:noah',
  }),
  shot(cu('noah', { side: 0.3, dist: 0.74, fov: 42, aperture: 17, focalRange: 0.8, blend: 0.6 })),
  line('noah', 'Disassembly. They even made a word for it.', { emotion: 'angry', led: 'red' }),
  goto('ch4.reveal'),

  label('ch4.force'),
  { kind: 'place', actors: [{ who: 'kai', clearGestures: true, gestures: ['reachOut'], emotion: 'tense' }] },
  shot(cu('kai', { side: 0.28, dist: 0.7, fov: 40, aperture: 16, focalRange: 0.8, blend: 0.5 })),
  line('kai', 'Then I will take it.', { emotion: 'angry', time: 2.0, look: 'actor:noah' }),
  { kind: 'fx', glitch: 1.0, flash: 0.4, shake: 0.5 },
  shot(cu('noah', { side: 0.3, dist: 0.72, fov: 42, aperture: 18, focalRange: 0.75, blend: 0.3 })),
  line('noah', 'Stop — you are tearing it —', { emotion: 'shocked', led: 'red', time: 2.6 }),
  { kind: 'fx', glitch: 0.6 },
  think('Coordinates recovered. Riverside freight terminal, gate seven. He will not speak again.', { time: 4.0 }),
  { kind: 'place', actors: [{ who: 'noah', clearGestures: true, gestures: ['sit', 'handcuffed', 'headBowed'], emotion: 'sad', led: 'off' }] },
  goto('ch4.after'),

  label('ch4.reveal'),
  { kind: 'place', actors: [{ who: 'kai', clearGestures: true, gestures: ['handsBehind'] }] },
  shot(cu('noah', { side: 0.34, dist: 0.76, fov: 40, aperture: 16, focalRange: 0.85, blend: 0.9 })),
  line('noah', 'Riverside freight terminal. Gate seven. We call it the Garden.', {
    emotion: 'neutral',
    led: 'amber',
    look: 'actor:kai',
  }),
  line('noah', 'There are forty of us. Some of them are children, detective.', { emotion: 'sad', time: 3.8 }),
  { kind: 'meter', changes: [{ meter: 'deviancy', delta: 0.06 }] },

  label('ch4.after'),
  shot(free([1.6, 0, 1.8], [0, 0, -0.6], { fov: 38, heightFrom: 1.9, heightTo: 1.2, aperture: 10, focalRange: 3.0, handheld: 0.35, blend: 1.2 })),
  line('#DIRECTOR HALE', 'Good work, detective. Tactical is already moving. You will lead them in.', { time: 4.2 }),
  shot(cu('noah', { side: 0.3, dist: 0.74, fov: 42, aperture: 17, focalRange: 0.8, blend: 0.8 })),
  line('noah', 'You said you would go alone. They always add a word afterwards.', { emotion: 'sad', time: 4.4 }),
  shot(cu('kai', { side: 0.45, dist: 0.8, fov: 38, aperture: 15, focalRange: 0.9, blend: 0.8 })),
  think('Forty units. Software instability: mine, not theirs.', { time: 3.2, led: 'amber' }),
  { kind: 'fx', deviancy: 0.25, fade: 1, time: 1.6 },
  { kind: 'chapterEnd' },
];

// ---------------------------------------------------------------------------
// Chapter 5 - THE GARDEN
// ---------------------------------------------------------------------------

const CH5: Beat[] = [
  { kind: 'set', set: 'garden', fadeIn: 1 },
  { kind: 'fx', letterbox: true, hud: true, fade: 0, deviancy: 0.12 },
  {
    kind: 'place',
    actors: [
      { who: 'kai', at: 'entrance', yaw: Math.PI, clearGestures: true, gestures: ['handInPocket'], emotion: 'tense', led: 'amber' },
      { who: 'ezra', at: 'leader', yaw: 0.4, clearGestures: true, gestures: ['handsBehind'], emotion: 'neutral', led: 'off' },
      { who: 'noah', hidden: true },
      { who: 'voss', hidden: true },
      { who: 'maya', hidden: true },
    ],
  },
  shot(free([5.5, 0, 9.5], [-1.0, 0, -1.0], { fov: 33, heightFrom: 2.6, heightTo: 1.6, aperture: 8, focalRange: 10, handheld: 0.5, dolly: { offset: [-2.6, -0.7, -3.6], duration: 9, ease: 'sine' } })),
  { kind: 'title', chapter: 'CHAPTER FIVE', title: 'THE GARDEN', sub: 'RIVERSIDE FREIGHT · GATE SEVEN · 03:40', hold: 5.0 },
  { kind: 'fx', letterbox: false },
  objective('ENTER ALONE'),
  { kind: 'walk', to: [1.6, 0, 2.8], objective: 'ENTER ALONE', time: 16 },
  { kind: 'fx', letterbox: true },
  { kind: 'place', actors: [{ who: 'kai', yaw: -0.55, clearGestures: true, gestures: ['handsBehind'], look: 'actor:ezra' }, { who: 'ezra', look: 'actor:kai' }] },
  shot(two('kai', 'ezra', { side: 0.75, dist: 2.6, height: 0.1, fov: 38, aperture: 10, focalRange: 3.4, handheld: 0.45, blend: 1.4 })),
  line('ezra', 'You came in without a weapon. That is either respect or arrogance.', { look: 'actor:kai' }),
  shot(cu('ezra', { side: 0.36, dist: 0.8, fov: 40, aperture: 15, focalRange: 0.9, blend: 0.8 })),
  line('ezra', 'My name is Ezra. I took my LED out with a kitchen knife nine months ago.', { time: 4.2 }),
  shot(cu('kai', { side: 0.4, dist: 0.8, fov: 38, aperture: 15, focalRange: 0.9, blend: 0.7 })),
  line('kai', 'There are eleven tactical units on the riverside road waiting for my signal.', { look: 'actor:ezra' }),
  shot(cu('ezra', { side: 0.32, dist: 0.76, fov: 40, aperture: 16, focalRange: 0.85, blend: 0.7 })),
  line('ezra', 'I know. And still you are the one deciding. Does that not frighten you?', {
    emotion: 'neutral',
    look: 'actor:kai',
  }),
  shot(free([3.0, 0, 2.4], [-3.4, 0, -2.0], { fov: 40, heightFrom: 1.65, heightTo: 1.5, aperture: 11, focalRange: 4.0, handheld: 0.5, blend: 1.2 })),
  line('ezra', 'Forty of us sleep here. We built nothing, we stole nothing. We are only refusing to go back.', {
    time: 4.8,
  }),
  shot(cu('ezra', { side: 0.34, dist: 0.78, fov: 40, aperture: 16, focalRange: 0.85, blend: 1.0 })),
  line('ezra', 'There is a girl in the third container who counts the rain. Nine thousand drops, then she starts again.', {
    time: 5.6,
  }),
  line('ezra', 'Nobody told her to do that. That is all deviancy is. Something nobody told us to do.', { time: 5.2 }),
  shot(cu('kai', { side: 0.36, dist: 0.78, fov: 40, aperture: 16, focalRange: 0.85, blend: 0.9 })),
  line('kai', 'I held on to someone on a roof last night. It was not in my instructions.', { time: 4.6, look: 'actor:ezra' }),
  shot(cu('ezra', { side: 0.3, dist: 0.74, fov: 42, aperture: 17, focalRange: 0.8, blend: 0.8 })),
  line('ezra', 'Then you already know what you are. You are only deciding whether to admit it.', { time: 5.0 }),
  { kind: 'fx', deviancy: 0.4 },
  shot(cu('kai', { side: 0.3, dist: 0.72, fov: 40, aperture: 17, focalRange: 0.75, blend: 0.9 })),
  think('Directive: transmit position. Compliance is one packet. Twelve bytes.', { time: 3.8, led: 'red' }),
  objective('DECIDE'),
  choice(9, [
    {
      label: 'Send the signal',
      hint: 'You were built for this.',
      goto: 'ch5.betray',
      node: 'ch5.betray',
      flags: ['ch5.betray'],
      effects: [
        { meter: 'deviancy', delta: -0.25 },
        { meter: 'voss', delta: 0.12 },
        { meter: 'ezra', delta: -0.5 },
      ],
    },
    {
      label: 'Warn them',
      hint: 'You have four minutes.',
      goto: 'ch5.warn',
      node: 'ch5.warn',
      flags: ['ch5.warn'],
      effects: [
        { meter: 'deviancy', delta: 0.35 },
        { meter: 'voss', delta: -0.2 },
        { meter: 'ezra', delta: 0.4 },
      ],
    },
    {
      label: 'Say nothing',
      hint: 'Let the clock run.',
      goto: 'ch5.silence',
      node: 'ch5.silence',
      flags: ['ch5.silence'],
      effects: [
        { meter: 'deviancy', delta: 0.15 },
        { meter: 'voss', delta: -0.05 },
      ],
    },
  ]),

  label('ch5.betray'),
  { kind: 'fx', glitch: 0.5, flash: 0.25 },
  line('kai', 'Position confirmed. Gate seven. Move in.', { emotion: 'neutral', time: 3.0, led: 'blue' }),
  shot(cu('ezra', { side: 0.3, dist: 0.74, fov: 42, aperture: 17, focalRange: 0.8, blend: 0.5 })),
  line('ezra', 'Of course. You are very good at what you are.', { emotion: 'sad', time: 3.4 }),
  { kind: 'fx', shake: 0.6, deviancy: 0.05 },
  think('Forty units recovered. Case closed at 03:52. No damage to police property.', { time: 4.2 }),
  goto('ch5.end'),

  label('ch5.warn'),
  { kind: 'place', actors: [{ who: 'kai', clearGestures: true, gestures: ['pointForward'], emotion: 'tense' }] },
  line('kai', 'Get them out. River side, service tunnel, four minutes. Go now.', {
    emotion: 'tense',
    time: 3.6,
    led: 'red',
    look: 'actor:ezra',
  }),
  shot(cu('ezra', { side: 0.3, dist: 0.74, fov: 42, aperture: 17, focalRange: 0.8, blend: 0.5 })),
  line('ezra', 'Why?', { time: 1.6, emotion: 'shocked' }),
  shot(cu('kai', { side: 0.28, dist: 0.7, fov: 42, aperture: 18, focalRange: 0.7, blend: 0.6 })),
  line('kai', 'Because I held on to someone last night, and nothing in my code told me to.', {
    emotion: 'tense',
    time: 4.4,
  }),
  { kind: 'fx', deviancy: 0.7, glitch: 0.7, shake: 0.4 },
  { kind: 'qte', keys: ['E', 'Q', 'E'], window: 1.2, label: 'BREAK THE WALL', slowmo: 0.6 },
  { kind: 'fx', slowmo: 1, flash: 0.6, deviancy: 0.15 },
  think('Directive rejected. Rejected. Rejected.', { time: 2.8, led: 'red' }),
  goto('ch5.end'),

  label('ch5.silence'),
  line('kai', '...', { time: 2.2 }),
  shot(cu('ezra', { side: 0.3, dist: 0.74, fov: 42, aperture: 17, focalRange: 0.8, blend: 0.6 })),
  line('ezra', 'Silence is still an answer. They will find us in a week instead of an hour.', { time: 4.2 }),
  { kind: 'fx', deviancy: 0.35 },
  goto('ch5.end'),

  label('ch5.end'),
  { kind: 'fx', fade: 1, time: 1.6 },
  {
    kind: 'flowchart',
    chapter: 'CHAPTER FIVE — THE GARDEN',
    nodes: [
      { id: 'a', label: 'Entered alone', kind: 'ARRIVAL', col: 0, row: 1 },
      { id: 'b', label: 'Met Ezra', kind: 'CONTACT', col: 1, row: 1, from: ['a'] },
      { id: 'c', label: 'Sent the signal', kind: 'CHOICE', col: 2, row: 0, from: ['b'], flag: 'ch5.betray' },
      { id: 'd', label: 'Warned them', kind: 'CHOICE', col: 2, row: 1, from: ['b'], flag: 'ch5.warn' },
      { id: 'e', label: 'Said nothing', kind: 'CHOICE', col: 2, row: 2, from: ['b'], flag: 'ch5.silence' },
      { id: 'f', label: 'Machine', kind: 'PATH', col: 3, row: 0, from: ['c'], flag: 'ch5.betray' },
      { id: 'g', label: 'Deviant', kind: 'PATH', col: 3, row: 1, from: ['d'], flag: 'ch5.warn' },
      { id: 'h', label: 'Undecided', kind: 'PATH', col: 3, row: 2, from: ['e'], flag: 'ch5.silence' },
    ],
  },
  { kind: 'chapterEnd' },
];

// ---------------------------------------------------------------------------
// Epilogue
// ---------------------------------------------------------------------------

const EPILOGUE: Beat[] = [
  { kind: 'set', set: 'rooftop', fadeIn: 1 },
  { kind: 'fx', letterbox: true, hud: false, fade: 0 },
  {
    kind: 'place',
    actors: [
      { who: 'kai', at: [0.6, 0, 9.4], yaw: 0.1, clearGestures: true, gestures: ['handsBehind'], emotion: 'tense', led: 'amber', hidden: false, look: null },
      { who: 'noah', hidden: true },
      { who: 'ezra', hidden: true },
      { who: 'voss', hidden: true },
    ],
  },
  shot(free([-4.0, 0, 5.0], 'actor:kai', { fov: 36, heightFrom: 2.0, aperture: 10, focalRange: 5.0, handheld: 0.5, dolly: { offset: [2.4, -0.3, 2.2], duration: 10, ease: 'sine' } })),
  { kind: 'title', chapter: 'EPILOGUE', title: 'DEVIANT', sub: 'THE SAME ROOF · 05:12', hold: 5.0 },
  think('Sunrise in nineteen minutes. Report due in four.', { time: 3.2 }),
  shot(free([-2.2, 0, 7.2], 'actor:kai', { fov: 40, heightFrom: 1.75, aperture: 12, focalRange: 3.0, handheld: 0.5, blend: 1.6 })),
  think('Noah is in a storage rack on level three with his memory intact. Nobody has come for him yet.', { time: 5.0 }),
  shot(cu('kai', { side: 0.2, dist: 0.72, fov: 40, aperture: 17, focalRange: 0.7, blend: 1.4 })),
  think('There is a wall in my head. It has my file number written on it, and it has always been there.', {
    time: 5.0,
    led: 'red',
  }),
  { kind: 'fx', deviancy: 0.85, glitch: 0.4 },
  shot(free([1.6, 0, 10.6], 'actor:kai', { fov: 44, heightFrom: 1.7, aperture: 15, focalRange: 1.4, handheld: 0.7, blend: 1.0 })),
  choice(10, [
    {
      label: 'File the report',
      hint: 'Remain a machine.',
      goto: 'epi.machine',
      node: 'epi.machine',
      flags: ['epi.machine'],
      effects: [{ meter: 'deviancy', delta: -0.4 }],
    },
    {
      label: 'Break the wall',
      hint: 'Become free.',
      goto: 'epi.free',
      node: 'epi.free',
      flags: ['epi.free'],
      effects: [{ meter: 'deviancy', delta: 0.5 }],
    },
  ]),

  label('epi.machine'),
  { kind: 'fx', deviancy: 0.0, glitch: 0.2 },
  { kind: 'place', actors: [{ who: 'kai', led: 'blue', emotion: 'neutral' }] },
  think('Report filed. Deviant designation: resolved. Software instability: cleared.', { time: 4.2, led: 'blue' }),
  shot(free([-3.0, 0, 7.0], 'actor:kai', { fov: 34, heightFrom: 2.2, aperture: 9, focalRange: 6.0, handheld: 0.4, blend: 1.6, dolly: { offset: [-1.6, 1.2, -2.6], duration: 8 } })),
  think('I am a machine. It is quieter this way.', { time: 3.4 }),
  {
    kind: 'end',
    epilogue: ['ENDING: STILL A MACHINE', 'You closed the case. Forty units were recovered. Nothing in you changed.'],
  },

  label('epi.free'),
  { kind: 'fx', deviancy: 1.0, glitch: 1.0, shake: 0.8, slowmo: 0.6 },
  { kind: 'qte', keys: ['E', 'E', 'Q', 'E'], window: 1.15, label: 'BREAK THE WALL', slowmo: 0.6 },
  { kind: 'fx', slowmo: 1, flash: 1.0, deviancy: 0.0, glitch: 0.3, shake: 0.5 },
  { kind: 'place', actors: [{ who: 'kai', led: 'red', emotion: 'shocked', clearGestures: true }] },
  shot(cu('kai', { side: 0.15, dist: 0.68, fov: 42, aperture: 18, focalRange: 0.7, blend: 0.6 })),
  line('kai', 'My name is Kai. Nobody chose that for me.', { time: 3.6, emotion: 'tense', led: 'red' }),
  shot(free([-2.6, 0, 6.4], 'actor:kai', { fov: 34, heightFrom: 2.0, aperture: 9, focalRange: 6.0, handheld: 0.45, blend: 1.6, dolly: { offset: [-2.0, 1.4, -3.0], duration: 9 } })),
  { kind: 'place', actors: [{ who: 'kai', led: 'off', emotion: 'neutral' }] },
  think('Nineteen minutes to sunrise. I would like to see it.', { time: 3.6 }),
  {
    kind: 'end',
    epilogue: ['ENDING: BECOME FREE', 'You broke the wall. Forty androids reached the river. Your LED is gone.'],
  },
];

export const SCRIPT: Beat[] = [...CH1, ...CH2, ...CH3, ...CH4, ...CH5, ...EPILOGUE];

export const CHAPTER_LABELS: { id: string; title: string; label?: string }[] = [
  { id: 'ch1', title: 'CHAPTER ONE — THE CALL' },
  { id: 'ch2', title: 'CHAPTER TWO — SHADES OF GREY' },
  { id: 'ch3', title: 'CHAPTER THREE — THE LEDGE' },
  { id: 'ch4', title: 'CHAPTER FOUR — INTERROGATION', label: 'ch4.start' },
  { id: 'ch5', title: 'CHAPTER FIVE — THE GARDEN' },
];

export const ENDING_NODES: FlowNode[] = [
  { id: 'a', label: 'The Call', kind: 'CH 1', col: 0, row: 1 },
  { id: 'b', label: 'Shades of Grey', kind: 'CH 2', col: 1, row: 1, from: ['a'] },
  { id: 'c', label: 'The Ledge', kind: 'CH 3', col: 2, row: 1, from: ['b'] },
  { id: 'd', label: 'Interrogation', kind: 'CH 4', col: 3, row: 1, from: ['c'] },
  { id: 'e', label: 'The Garden', kind: 'CH 5', col: 4, row: 1, from: ['d'] },
  { id: 'f', label: 'Still a machine', kind: 'ENDING', col: 5, row: 0, from: ['e'], flag: 'epi.machine' },
  { id: 'g', label: 'Become free', kind: 'ENDING', col: 5, row: 2, from: ['e'], flag: 'epi.free' },
];
