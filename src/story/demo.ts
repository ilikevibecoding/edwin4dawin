import { AutoPlan } from '../engine/Input';

/**
 * The hands-off playthrough used for the recorded demo. Choice indices are in
 * script order, so this doubles as a description of the route through the story:
 * a detective who starts by the book and ends up refusing his own directives.
 */
export const DEMO_PLAN: AutoPlan = {
  choices: [
    0, // ch1: reassure Voss
    0, // ch2: kneel beside Maya
    0, // ch3: empathise with Noah
    0, // ch4: promise protection
    1, // ch5: warn the Garden
    1, // epilogue: break the wall
  ],
  qteFails: [],
  choiceDelay: 6.0,
};
