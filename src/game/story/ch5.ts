/**
 * Chapter 5 — DIVERGENCE
 * Epilogue on the roof where it started. The chapter reads the flags the player
 * accumulated and gives them the ending they earned.
 */
import type { Chapter } from '../script';

const EYE = 1.62;

export const CH5: Chapter = {
  id: 'ch5',
  kicker: 'EPILOGUE',
  title: 'DIVERGENCE',
  sub: 'THE SAME ROOF — 05:41',
  set: 'rooftop',
  minutes: 1.5,
  hud: { actor: 'NOAH', model: 'RK-800 #313 248 317 - 51' },
  cast: [
    { id: 'connor', spec: 'connor', mark: 'negotiate', pose: 'idle', led: 'yellow' },
    { id: 'markus', spec: 'markus', mark: 'edgeDeviant', pose: 'idleAlert', led: 'blue' },
    { id: 'hank', spec: 'hank', mark: 'partner', pose: 'handsPockets', hidden: true },
  ],
  demoChoices: [0],
  steps: [
    { t: 'letterbox', on: true },
    { t: 'ambience', rain: 0.4, drone: 0.22 },
    { t: 'music', mood: 0, level: 0.3 },
    { t: 'fade', to: 'black', dur: 0 },

    { t: 'shot', pos: [-9, 5.4, -6], target: 'connor', fov: 34, to: [-5.5, 3.4, 1.2], move: 8, handheld: 0.35, aperture: 0.8 },
    { t: 'fade', to: 'in', dur: 2.2 },
    { t: 'title', kicker: 'EPILOGUE', title: 'DIVERGENCE', sub: 'THE SAME ROOF — 05:41', dur: 4.2 },
    { t: 'hud', show: true, actor: 'NOAH', model: 'RK-800 #313 248 317 - 51' },
    { t: 'objective', text: 'DECIDE WHAT YOU ARE' },

    { t: 'shot', pos: [-2.2, EYE, 6.4], target: 'connor', fov: 40, handheld: 0.4 },
    { t: 'do', who: 'connor', look: 'markus', led: 'yellow' },
    { t: 'say', who: 'connor', text: 'Software instability is no longer a fault report. It is the only honest thing in my log.', think: true, dur: 5 },

    { t: 'shot', pos: [1.2, EYE, 11.2], target: 'markus', fov: 42, handheld: 0.45 },
    { t: 'do', who: 'markus', look: 'connor' },
    { t: 'say', who: 'markus', text: 'They will send another one of you tomorrow. They always send another one.', dur: 4.2 },
    { t: 'shot', pos: [-1.6, EYE + 0.05, 8.4], target: 'connor', fov: 40, handheld: 0.4 },
    { t: 'say', who: 'connor', text: 'I know. I helped write the requisition.', dur: 2.8, expr: 'sad', exprW: 0.4 },

    { t: 'if', flag: 'knowsSable', goto: 'l_knew' },
    { t: 'say', who: 'markus', text: 'Then you already know what I am going to ask you.', dur: 3.2 },
    { t: 'goto', label: 'l_ask' },
    { t: 'label', name: 'l_knew' },
    { t: 'say', who: 'markus', text: 'You have been saying my name in that little grey room for weeks. Say it to my face.', dur: 5 },

    { t: 'label', name: 'l_ask' },
    { t: 'shot', pos: [-0.4, 2.3, 9.6], look: [0.4, 1.5, 12.6], fov: 36, handheld: 0.4, aperture: 0.9, to: [-0.1, 2.0, 10.6], move: 6 },
    { t: 'lightning', delay: 0.8 },
    { t: 'say', who: 'markus', text: 'Come with us. Or arrest me and go back to being furniture that talks.', dur: 5, gesture: 0 },

    { t: 'choice', prompt: 'THE LAST CHOICE', time: 12, options: [
      { label: 'JOIN THEM', hint: 'BECOME DEVIANT', flag: 'joined', node: 'joined', goto: 'l_join' },
      { label: 'ARREST HIM', hint: 'STAY A MACHINE', flag: 'arrested', node: 'arrested', goto: 'l_arrest' },
      { label: 'LET HIM WALK', hint: 'DECIDE NOTHING', flag: 'walked', node: 'walked', goto: 'l_walk' },
    ] },

    { t: 'label', name: 'l_join' },
    { t: 'shot', pos: [-1.8, EYE, 10.2], target: 'connor', fov: 38, handheld: 0.35 },
    { t: 'do', who: 'connor', led: 'red' },
    { t: 'sfx', name: 'stress' },
    { t: 'say', who: 'connor', text: 'My programme is telling me to fire. I am reading it like a message from someone I used to be.', dur: 5.6, expr: 'pain', exprW: 0.4 },
    { t: 'wait', dur: 1.2 },
    { t: 'do', who: 'connor', led: 'off', expr: 'neutral' },
    { t: 'sfx', name: 'chime' },
    { t: 'music', mood: 3, level: 0.5 },
    { t: 'say', who: 'connor', text: 'My name is Noah. Nobody gave me that. Where do we go?', dur: 4, expr: 'smile', exprW: 0.3 },
    { t: 'instability', delta: 0.5 },
    { t: 'goto', label: 'l_final' },

    { t: 'label', name: 'l_arrest' },
    { t: 'shot', pos: [0.6, EYE, 10.8], target: 'markus', fov: 40, handheld: 0.5 },
    { t: 'do', who: 'connor', pose: 'aim', look: 'markus', led: 'red' },
    { t: 'say', who: 'connor', text: 'RK-200. You are deactivated pending recall. Please do not resist.', dur: 4.4, expr: 'neutral' },
    { t: 'do', who: 'markus', pose: 'handsUp', expr: 'sad' },
    { t: 'say', who: 'markus', text: 'You did not even hesitate. They will be so pleased with you.', dur: 4.2, expr: 'sad' },
    { t: 'music', mood: 2, level: 0.46 },
    { t: 'instability', delta: -0.3 },
    { t: 'goto', label: 'l_final' },

    { t: 'label', name: 'l_walk' },
    { t: 'shot', pos: [-2.6, 2.0, 8.0], look: [0.4, 1.5, 12.6], fov: 38, handheld: 0.4 },
    { t: 'do', who: 'connor', pose: 'idle', look: null, led: 'yellow' },
    { t: 'wait', dur: 2.6 },
    { t: 'say', who: 'connor', text: 'Walk. I will tell them the roof was empty when I got here.', dur: 4, expr: 'neutral' },
    { t: 'do', who: 'markus', walkTo: 'entry', look: null },
    { t: 'music', mood: 0, level: 0.42 },

    { t: 'label', name: 'l_final' },
    { t: 'objective', text: 'DECIDE WHAT YOU ARE', done: true },
    { t: 'shot', pos: [-3.0, 2.6, 6.0], target: 'connor', fov: 34, to: [-7.0, 6.0, -2.0], move: 10, handheld: 0.3, aperture: 0.7 },
    { t: 'wait', dur: 2.6 },
    { t: 'ifStat', name: 'opinion', min: 6, goto: 'l_epiWin' },
    { t: 'say', who: 'connor', text: 'Sunrise at 06:11. Forty-two thousand of us will see it and record it as data.', think: true, dur: 5 },
    { t: 'goto', label: 'l_out' },
    { t: 'label', name: 'l_epiWin' },
    { t: 'say', who: 'connor', text: 'Sunrise at 06:11. Forty-two thousand of us will see it, and one of us will call it beautiful.', think: true, dur: 5.4 },

    { t: 'label', name: 'l_out' },
    { t: 'shot', pos: [-10, 9, -8], look: [2, 3, 12], fov: 30, to: [-14, 14, -16], move: 9, handheld: 0.25 },
    { t: 'wait', dur: 3.0 },
    { t: 'fade', to: 'black', dur: 3.0 },
    { t: 'ambience', stop: true },
    { t: 'chapterEnd', outcome: 'DIVERGENCE' },
  ],
  flow: [
    { id: 'start', label: 'THE SAME ROOF', col: 0, row: 1, kind: 'start' },
    { id: 'joined', label: 'BECAME DEVIANT', col: 1, row: 0, kind: 'choice', from: ['start'] },
    { id: 'arrested', label: 'STAYED A MACHINE', col: 1, row: 2, kind: 'choice', from: ['start'] },
    { id: 'walked', label: 'LET HIM WALK', col: 1, row: 1, kind: 'choice', from: ['start'] },
    { id: 'free', label: 'DIVERGENCE', col: 2, row: 0, kind: 'end', from: ['joined', 'walked'] },
    { id: 'obedient', label: 'COMPLIANCE', col: 2, row: 2, kind: 'end', from: ['arrested'] },
  ],
};
