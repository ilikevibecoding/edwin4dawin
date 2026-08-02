import title from './title.js';
import chase from './chase.js';
import boarding from './boarding.js';
import message from './message.js';
import dunes from './dunes.js';
import twinsuns from './twinsuns.js';
import saber from './saber.js';
import trench from './trench.js';
import medals from './medals.js';

/** Chapters play in this order; durations come from src/story/timing.json. */
export const CHAPTERS = [
  title, chase, boarding, message, dunes, twinsuns, saber, trench, medals,
];

export default CHAPTERS;
