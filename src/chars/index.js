// Characters (minifigs + droids). Each character module registers itself here.
import { register } from '../registry.js';

import { buildVader } from './vader.js';
import { buildLeia } from './leia.js';
import { buildLuke } from './luke.js';
import { buildObiwan } from './obiwan.js';
import { buildStormtrooper, buildCrowdTroopers } from './stormtrooper.js';
import { buildRebelTrooper } from './rebeltrooper.js';
import { buildImperialOfficer } from './imperialofficer.js';
import { buildR2 } from './r2.js';
import { buildC3po } from './c3po.js';
import { buildJawa } from './jawa.js';
import { buildRebelPilot } from './rebelpilot.js';

export {
  buildVader, buildLeia, buildLuke, buildObiwan, buildStormtrooper,
  buildCrowdTroopers, buildRebelTrooper, buildImperialOfficer, buildR2,
  buildC3po, buildJawa, buildRebelPilot,
};
export * from './prints.js';
export * from './headgear.js';
export * from './weapons.js';
export { figGroup, setHeldPitch } from './util.js';

register('vader', (opts) => buildVader(opts), {
  notes: 'Sith lord: brick helmet (dome + flared mask + vocoder grille), shoulder mantle, '
    + 'cape 2.0x3.4, root scaled 1.08. userData.saber is a red Lightsaber, '
    + 'sheathed unless opts.saber is given (0..1 extension).',
});

register('leia', (opts) => buildLeia(opts), {
  notes: 'White senatorial gown with skirt, dark brown side buns, silver disc belt. '
    + 'Pass gown=0 for legs only.',
});

register('luke', (opts) => buildLuke(opts), {
  notes: 'Farm boy: cream tunic wrap, tan legs, sandy hair. luke?pilot=1 swaps in the '
    + 'orange flight suit and X-wing helmet; saber=1 ignites a blue blade.',
});

register('obiwan', (opts) => buildObiwan(opts), {
  notes: 'Hermit Kenobi: brown cowl shadowing the face, white beard printed in, '
    + 'blue Lightsaber on userData.saber.',
});

register('stormtrooper', (opts) => buildStormtrooper(opts), {
  notes: 'Brick-built helmet (dome, brow, lens cowls, frown vent, ear cups) over a printed '
    + 'white head. E-11 blaster on userData.blaster.',
});

register('rebeltrooper', (opts) => buildRebelTrooper(opts), {
  notes: 'Fleet trooper: blue-grey uniform, tan flak vest, tall open-crowned helmet, DH-17.',
});

register('imperialofficer', (opts) => buildImperialOfficer(opts), {
  notes: 'Olive-grey tunic with rank plaque and code cylinders, flat imperial cap, '
    + 'hands clasped behind the back.',
});

register('r2', (opts) => buildR2(opts), {
  notes: 'Astromech, 3.3 studs tall. userData.spinDome(angle), userData.holoOrigin, '
    + 'userData.update bobs the dome and flickers the eye.',
});

register('c3po', (opts) => buildC3po(opts), {
  notes: 'Protocol droid in pearl gold: brick dome head with photoreceptors and mouth '
    + 'grille, exposed wiring print at the midriff, stiff-legged.',
});

register('jawa', (opts) => buildJawa(opts), {
  notes: 'Hooded scavenger scaled to 0.75 with two glowing yellow eyes in a black face.',
});

register('rebelpilot', (opts) => buildRebelPilot(opts), {
  notes: 'X-wing pilot: orange flight suit, chest box print, white helmet with raised visor.',
});

register('crowd_troopers', (opts) => buildCrowdTroopers(opts), {
  notes: 'N stormtroopers (default 8, clamped to 22 = the 80k triangle budget) in formation, '
    + 'sharing helmet/blaster geometry and prints. userData.marchAt(t) drives the '
    + 'synchronised march; opts are { n, cols, spacing, speed }.',
});
