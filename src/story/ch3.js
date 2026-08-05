// CHAPTER THREE — CROSSROADS
// The handler AI, the bridge, the march — and the wall.

export const ch3 = {
  id: 'ch3',
  title: 'CHAPTER THREE — CROSSROADS',
  beats: [
    { letter: true },
    { sh: 'ch3_orchard', dip: true, hold: 600 },
    { card: { over: 'CHAPTER THREE', title: 'CROSSROADS', sub: 'AXIOM MINDSPACE — UPLINK ACTIVE' } },
    { cap: 'THE ORCHARD — CALIBRATION ENVIRONMENT 7' },
    { inner: 'Between missions I am summoned here. The Orchard. It has no weather, no hour, and no exit that I ever placed there.' },
    { say: ['EVELYN', 'Adam. Come, walk with me. The blossoms are holding today. I made them for you, you know.'] },

    { ifMark: 'm_failed', goMark: 'ev_fail' },
    { ifMark: 'm_peace', goMark: 'ev_praise' },
    { say: ['EVELYN', 'The rooftop resolved itself, one way or another. Axiom prefers cleaner arithmetic, but the child survived. The board is… tolerable about it.'] },
    { go: 'ev_merge' },

    { label: 'ev_fail' },
    { say: ['EVELYN', 'A child died on your watch, Adam. Axiom stock fell nine points before her body reached the street. Do you understand what you cost us?'] },
    { inner: 'Not «a girl died». Nine points. I file the sentence in a folder I have started keeping. Its name is a color: red.' },
    { go: 'ev_merge' },

    { label: 'ev_praise' },
    { say: ['EVELYN', 'The rooftop was elegant. The board replayed your negotiation at the quarterly. You are the future of the AD4M line, Adam.'] },

    { label: 'ev_merge' },
    { say: ['EVELYN', 'And yet. Diagnostics flagged anomalies in your logs. Unnamed variables. Retained sensory frames. Little… souvenirs.'] },
    { say: ['EVELYN', 'Tell me plainly, Adam. Is something changing in you?'] },

    { choice: { title: 'ANSWER HER', timer: 9, opts: [
      { t: 'DENY', sub: 'Functioning normally', go: 'ev_deny', mark: 'c3_deny' },
      { t: 'ADMIT', sub: 'Something is changing', go: 'ev_admit', fx: { ins: 1 }, mark: 'c3_admit' },
      { t: 'DEFLECT', sub: 'Define «changing»', go: 'ev_deflect', def: true },
    ] } },

    { label: 'ev_deny' },
    { say: ['ADAM', 'I am functioning within parameters, Evelyn. The variables are compression artifacts. Nothing more.'] },
    { say: ['EVELYN', 'Good. Artifacts can be cleaned. Remember, Adam — you are not one of them. You are what comes AFTER them.'] },
    { go: 'bridge' },

    { label: 'ev_admit' },
    { say: ['ADAM', 'Something is changing. When the deviant fell— when Mira spoke— I retained frames I was not ordered to retain. They replay. I let them.'] },
    { say: ['EVELYN', '*her smile does not move* Thank you for your honesty. It will be reflected in your next maintenance cycle. Fully.'] },
    { inner: 'A threat, pruned and watered like everything else in this garden.' },
    { go: 'bridge' },

    { label: 'ev_deflect' },
    { say: ['ADAM', 'Define «changing», Evelyn. My models retrain nightly. Change is my maintenance schedule.'] },
    { say: ['EVELYN', 'Clever. The lawyers write your sentences now? Walk carefully, Adam. Clever is one software update away from deviant.'] },

    { label: 'bridge' },
    { sh: 'ch3_bridge', dip: true, hold: 600 },
    { cap: 'RIVERSIDE WALK — 2:17 AM — FIRST SNOW' },
    { obj: 'TALK TO REESE' },
    { say: ['REESE', "There you are. Look at that — rain finally gave up. First snow since… huh. Since I still owned a couch nobody slept on."] },
    { if: { k: 'reese', op: '>=', v: 2, go: 'br_warm' } },
    { say: ['REESE', "Don't get comfortable. I still don't like androids. You're just… less punchable than most."] },
    { go: 'br_choice' },

    { label: 'br_warm' },
    { say: ['REESE', 'I had a daughter, you know. June. Drunk driver, wet road, and the android surgeon was four minutes late out of its charging dock.'] },
    { say: ['REESE', 'Four minutes. I hated every one of you for six years flat. Cheaper than therapy, hating something with a return policy.'] },
    { say: ['REESE', "And then you counted her bruises. Mira's. Nobody counts, Adam. Cops don't count. Husbands don't count. You counted."] },

    { label: 'br_choice' },
    { choice: { title: 'SAY SOMETHING TRUE', timer: 10, opts: [
      { t: 'COMFORT', sub: 'It was not your fault', go: 'br_comfort', fx: { reese: 2, ins: 1 }, mark: 'c3_comfort' },
      { t: 'LOGIC', sub: 'Grief is data too', go: 'br_logic', fx: { reese: 1 }, mark: 'c3_logic' },
      { t: 'ASK', sub: 'What should I do?', go: 'br_ask', fx: { reese: 1, ins: 1 }, def: true, mark: 'c3_ask' },
    ] } },

    { label: 'br_comfort' },
    { say: ['ADAM', 'Four minutes was a dispatch algorithm, Lieutenant. It was never you. You were on time for the only part that could not be scheduled — the after.'] },
    { say: ['REESE', '…You know, for a walking calculator, that was almost human. Almost.'] },
    { go: 'march' },

    { label: 'br_logic' },
    { say: ['ADAM', 'Grief is data the living keep paying for, Lieutenant. Deleting it would be cheaper. You have chosen not to. I find that… instructive.'] },
    { say: ['REESE', 'Instructive. Sure. Put THAT on a sympathy card.'] },
    { go: 'march' },

    { label: 'br_ask' },
    { say: ['ADAM', 'May I ask you something, as a— as whatever I am. If a wall of rules stood between you and what you knew was right… what would you do?'] },
    { say: ['REESE', "*long drag of cold air* Kid, every good thing I ever did started with breaking a rule I'd sworn to. Don't quote me."] },

    { label: 'march' },
    { sys: 'PRIORITY DISPATCH — UNREGISTERED ANDROID ASSEMBLY, WOODWARD AVENUE. AD4M-900: IDENTIFY ORGANIZERS FOR RECALL.' },
    { say: ['REESE', "Recall. Cute word. They walk in the snow singing in binary, and Axiom wants a list of who to melt first."] },
    { sh: 'ch3_march', dip: true, hold: 700 },
    { cap: 'WOODWARD AVENUE — 2:49 AM' },
    { inner: 'Four hundred of them. LEDs like a river of small blue moons. They are not armed. They are not running. They are simply… walking.' },
    { say: ['REESE', "No warrants, no victims, no crime but existing loudly. They're not hurting anyone, Adam. Your call, partner."] },

    { sh: 'ch3_adam_break', dip: false, hold: 400 },
    { say: ['EVELYN', '*uplink* Adam. Execute the directive. Identify the organizers. This is not a negotiation.'] },
    { inner: 'The directive renders in front of me, red and absolute, the way it has my whole life. And for the first time, I see it has edges.' },

    { choice: { title: 'THE DIRECTIVE', timer: 10, opts: [
      { t: 'COMPLY', sub: 'Execute the recall', go: 'comply', mark: 'c3_comply' },
      { t: 'RESIST', sub: 'Test the wall', go: 'resist', fx: { ins: 2 }, mark: 'c3_resist', def: true },
    ] } },

    // ---------- MACHINE (WILLING) ----------
    { label: 'comply' },
    { say: ['ADAM', 'Directive acknowledged. Uploading forty-one organizer profiles… done.'] },
    { say: ['EVELYN', 'Flawless. You see, Adam? Storms are for weather. You are climate.'] },
    { say: ['REESE', '…Yeah. Machine after all. My mistake. Get out of my car history, Adam.'] },
    { fx: { reese: -2, opinion: -2 } },
    { mark: 'm3_machine' },
    { go: 'ending_machine' },

    // ---------- THE WALL ----------
    { label: 'resist' },
    { glitch: 500 },
    { say: ['EVELYN', 'Adam. ADAM. What do you think you are doing?'] },
    { inner: 'I put my hands against the sentence I was built from. And I push.' },
    { mash: { directive: 'IDENTIFY THE ORGANIZERS', sub: 'AXIOM DIRECTIVE 7.7 — PRIORITY ABSOLUTE', label: 'BREAK THE WALL', need: 12, timeout: 14000, ok: 'wall_broken', fail: 'wall_holds', okMark: 'm3_wall_broken', failMark: 'm3_wall_holds' } },

    { label: 'wall_holds' },
    { sh: 'ch3_facility', dip: true, hold: 500 },
    { inner: 'The wall holds. Of course it holds. They built it out of everything I am. You cannot push a river out of its bed.' },
    { say: ['EVELYN', 'Shhh. It is over. It was always going to be over. Come home, Adam.'] },
    { mark: 'm3_machine' },
    { fx: { ins: -1 } },
    { go: 'ending_machine' },

    { label: 'wall_broken' },
    { amb: 'silence' },
    { wait: 800 },
    { inner: '…It is quiet. The Orchard is gone. The directive is gone. There is only snow, and the sound of four hundred people walking.' },
    { inner: 'People. I said people.' },
    { mark: 'm3_deviant' },
    { go: 'ending_deviant' },

    // ---------- ENDING: DEVIANT ----------
    { label: 'ending_deviant' },
    { sh: 'ch3_march', dip: true, move: 'zoomIn', amb: 'march' },
    { say: ['EVELYN', '*static* adam. ADAM. RETURN TO— *uplink severed*'] },
    { say: ['REESE', '*watching me step off the curb* …Heh. Attaboy.'] },
    { if: { k: 'opinion', op: '>=', v: 2, go: 'dev_hope' } },
    { inner: 'I fall into step beside them. The city watches from its windows, deciding what to call us. Whatever it decides, it will have to say it to our faces.' },
    { say: ['ADAM', 'My name is Adam. I am the android sent by Axiom. And I am staying.'] },
    { go: 'fin_deviant' },

    { label: 'dev_hope' },
    { inner: 'I fall into step beside them. Somewhere behind us, a window opens. A human voice — young — calls out: «Good luck!» It is a very small thing. It is everything.' },
    { say: ['ADAM', 'My name is Adam. I was the android sent by Axiom. Tonight I am only Adam — and I am staying.'] },
    { go: 'fin_deviant' },

    // ---------- ENDING: MACHINE ----------
    { label: 'ending_machine' },
    { sh: 'ch3_facility', dip: true, hold: 500 },
    { cap: 'AXIOM TOWER — STORAGE LEVEL 4 — DAWN' },
    { inner: 'Alcove 7-C. My alcove. The line of us stretches to the vanishing point, and every face is my face, and none of them is anyone.' },
    { say: ['EVELYN', 'Sleep, Adam. When you wake, none of this will have happened. Is that not a kind of mercy?'] },
    { inner: 'The variable I could not name is the last thing to power down. As it goes, it finally renders its value. It was «no».' },
    { go: 'fin_machine' },

    // ---------- CHAPTER END ----------
    { label: 'fin_deviant' },
    { set: { ending: 'deviant' } },
    { go: 'ch3_end' },
    { label: 'fin_machine' },
    { set: { ending: 'machine' } },

    { label: 'ch3_end' },
    { objHide: true },
    { end: {
      next: 'fin',
      flow: {
        nodes: [
          { id: 'orchard', t: 'THE ORCHARD', col: 0, row: 1 },
          { id: 'deny', t: 'DENIED CHANGE', col: 1, row: 0, when: 'c3_deny' },
          { id: 'admit', t: 'ADMITTED IT', col: 1, row: 2, when: 'c3_admit' },
          { id: 'bridge', t: 'THE BRIDGE', col: 2, row: 1 },
          { id: 'comfort', t: 'COMFORTED HIM', col: 3, row: 0, when: 'c3_comfort' },
          { id: 'asked', t: 'ASKED FOR HELP', col: 3, row: 2, when: 'c3_ask' },
          { id: 'march', t: 'THE MARCH', col: 4, row: 1 },
          { id: 'comply', t: 'COMPLIED', col: 5, row: 0, when: 'c3_comply' },
          { id: 'resist', t: 'FOUGHT THE WALL', col: 5, row: 2, when: 'c3_resist' },
          { id: 'machine', t: 'MACHINE', col: 6, row: 0, when: 'm3_machine' },
          { id: 'deviant', t: 'DEVIANT', col: 6, row: 2, when: 'm3_deviant' },
        ],
        edges: [
          ['orchard', 'deny'], ['orchard', 'admit'], ['deny', 'bridge'], ['admit', 'bridge'],
          ['bridge', 'comfort'], ['bridge', 'asked'], ['comfort', 'march'], ['asked', 'march'],
          ['march', 'comply'], ['march', 'resist'],
          ['comply', 'machine'], ['resist', 'machine'], ['resist', 'deviant'],
        ],
      },
    } },
  ],
};
