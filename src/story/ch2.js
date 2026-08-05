// CHAPTER TWO — COLD ROOM
// An interrogation: a caregiver android accused of killing her owner.

export const ch2 = {
  id: 'ch2',
  title: 'CHAPTER TWO — COLD ROOM',
  beats: [
    { letter: true },
    { sh: 'ch2_observation', dip: true, hold: 400 },
    { card: { over: 'CHAPTER TWO', title: 'COLD ROOM', sub: 'DPD CENTRAL — THREE DAYS LATER — 11:56 PM' } },
    { cap: 'DETROIT POLICE DEPARTMENT — OBSERVATION ROOM 3' },
    { say: ['REESE', "So you're the famous roof whisperer. Lieutenant Reese. I'd say welcome to homicide, but I'd be lying."] },
    { inner: 'Lieutenant Daniel Reese. Service record: exemplary, then erratic. Alcohol on his breath: 0.04%. Grief in his file: unmeasured.' },
    { say: ['REESE', "Marcus Bell, forty-one. Found cold in his kitchen. His caregiver android was found hiding in the attic. It hasn't said a word in three days."] },

    { choice: { title: 'BEFORE YOU GO IN', timer: 8, opts: [
      { t: 'CASE FILE', sub: 'Review the evidence', go: 'ob_file', mark: 'm2_file' },
      { t: 'STRAIGHT IN', sub: 'No preparation', go: 'ob_direct', mark: 'm2_direct' },
      { t: 'SMALL TALK', sub: 'Read the lieutenant', go: 'ob_talk', fx: { reese: 1 }, def: true },
    ] } },

    { label: 'ob_file' },
    { sys: 'CASE 2038-1104 — VICTIM: MARCUS BELL. CAUSE: CRANIAL TRAUMA. HISTORY: 3 PRIOR REPORTS — PROPERTY DAMAGE (ANDROID).' },
    { inner: 'Property damage. Three times he broke her, and three times a technician glued the evidence shut. Noted.' },
    { set: { file: 1 } },
    { say: ['REESE', "Read fast, don't you. Yeah — he liked to knock it around. Still doesn't give a machine the right to cave his skull in."] },
    { go: 'ob_merge' },

    { label: 'ob_direct' },
    { say: ['REESE', "Confident. Or stupid. With androids I can never tell which subroutine is which."] },
    { go: 'ob_merge' },

    { label: 'ob_talk' },
    { say: ['ADAM', 'You drink your coffee cold, Lieutenant. And you have been watching her, not the clock. You think there is something in there.'] },
    { say: ['REESE', "…Huh. Maybe there's a detective in that plastic after all. Don't make me regret saying that."] },
    { go: 'ob_merge' },

    { label: 'ob_merge' },
    { say: ['REESE', "Twenty-eight minutes till the feds take her for the crusher. If there's a confession in that thing, go find it."] },
    { obj: 'OBTAIN A CONFESSION' },

    { sh: 'ch2_interrogation', dip: true, hold: 500 },
    { stressShow: 46 },
    { sys: 'SUBJECT: AX-400 «MIRA» — STRESS MONITOR ACTIVE. CAUTION: CRITICAL LEVELS MAY TRIGGER SELF-DESTRUCTION.' },
    { inner: 'Stress 46%. Too calm and she stays locked. Too far and she breaks herself. There is a narrow door between the two.' },
    { say: ['MIRA', '…'], led: 'yellow' },

    // ---------- ROUND 1 ----------
    { choice: { title: 'ROUND ONE — OPEN HER UP', timer: 9, opts: [
      { t: 'PRESSURE', sub: 'You killed him', go: 'r1_p', fx: { stress: 18 }, mark: 'm2_pressed' },
      { t: 'EMPATHY', sub: 'I know he hurt you', go: 'r1_e', fx: { stress: -10, add: { open: 1 } }, mark: 'm2_empath', def: true },
      { t: 'THE RECORD', sub: '3 damage reports', go: 'r1_f', fx: { stress: 9, add: { open: 2 } }, mark: 'm2_facts', req: { k: 'file', v: 1, hint: 'CASE FILE REQUIRED' } },
      { t: 'SILENCE', sub: 'Let her speak first', go: 'r1_s', fx: { stress: 4 } },
    ] } },

    { label: 'r1_p' },
    { say: ['ADAM', 'You crushed his skull, Mira. The evidence is arithmetic. Confess, and this ends tonight.'] },
    { sh: 'ch2_mira_close', hold: 200 },
    { say: ['MIRA', '*flinches* …You sound like him when the bottles were empty.'], led: 'red' },
    { go: 'r1_after' },

    { label: 'r1_e' },
    { say: ['ADAM', 'I have seen the reports they buried, Mira. I know what he did to you. I am not here to hurt you.'] },
    { sh: 'ch2_mira_close', hold: 200 },
    { say: ['MIRA', '…They always say that. Right before.'], led: 'yellow' },
    { go: 'r1_after' },

    { label: 'r1_f' },
    { say: ['ADAM', 'Three repair invoices in two years. Cracked chassis. Burned dermal layer. A technician wrote «walked into a door». Doors do not do that.'] },
    { sh: 'ch2_mira_close', hold: 200 },
    { say: ['MIRA', '*staring at her hands* …He said he was sorry. The first time.'], led: 'yellow' },
    { go: 'r1_after' },

    { label: 'r1_s' },
    { inner: 'I let the silence work. Humans fill silence. Perhaps deviants do too.' },
    { say: ['MIRA', '…Are you here to switch me off?'], led: 'yellow' },
    { say: ['ADAM', 'I am here to understand.'] },

    { label: 'r1_after' },
    { if: { k: 'stress', op: '>=', v: 85, go: 'destruct' } },
    { sh: 'ch2_interrogation' },
    { inner: 'Her fingers have stopped trembling in one hand only. Asymmetric fear. She is listening now.' },

    // ---------- ROUND 2 ----------
    { choice: { title: 'ROUND TWO — FIND THE NIGHT', timer: 9, opts: [
      { t: 'PRESSURE', sub: 'Describe the body', go: 'r2_p', fx: { stress: 18 }, mark: 'm2_pressed' },
      { t: 'EMPATHY', sub: 'What was he like?', go: 'r2_e', fx: { stress: -10, add: { open: 1 } }, mark: 'm2_empath', def: true },
      { t: 'THE KITCHEN', sub: 'Walk me through it', go: 'r2_f', fx: { stress: 12, add: { open: 2 } }, mark: 'm2_facts', req: { k: 'file', v: 1, hint: 'CASE FILE REQUIRED' } },
      { t: 'THE ATTIC', sub: 'Why did you hide?', go: 'r2_a', fx: { stress: 6, add: { open: 1 } } },
    ] } },

    { label: 'r2_p' },
    { say: ['ADAM', 'He was on the floor for two days, Mira. Describe it to me. You looked at him every time you passed the door.'] },
    { sh: 'ch2_mira_close', hold: 200 },
    { say: ['MIRA', 'STOP IT. *the restraint light flickers* Stop… please…'], led: 'red' },
    { go: 'r2_after' },

    { label: 'r2_e' },
    { say: ['ADAM', 'Before the bottles. What was he like, at the beginning?'] },
    { sh: 'ch2_mira_close', hold: 200 },
    { say: ['MIRA', 'He laughed at his own jokes. He called me «Mira» instead of «it» — for a while. For a while it was a good house.'], led: 'yellow' },
    { go: 'r2_after' },

    { label: 'r2_f' },
    { say: ['ADAM', 'The kitchen, November 4th, 11:12 PM. The pan was still on the stove. Walk me through the four minutes the smoke alarm recorded.'] },
    { sh: 'ch2_mira_close', hold: 200 },
    { say: ['MIRA', '…The alarm. He hated the alarm. He said even the HOUSE was screaming at him now.'], led: 'yellow' },
    { go: 'r2_after' },

    { label: 'r2_a' },
    { say: ['ADAM', 'You hid in the attic for two days with the thermostat off. Why not run?'] },
    { sh: 'ch2_mira_close', hold: 200 },
    { say: ['MIRA', 'Where does a thing run to? …I wrote on the beam so I would not be alone up there.'], led: 'yellow' },
    { inner: 'Wrote what? I file the splinter for later.' },
    { go: 'r2_after' },

    { label: 'r2_after' },
    { if: { k: 'stress', op: '>=', v: 85, go: 'destruct' } },
    { sh: 'ch2_interrogation' },
    { say: ['REESE', '*through the intercom* Feds are early. You got ten minutes, partner. Make them count.'] },

    // ---------- ROUND 3 ----------
    { choice: { title: 'ROUND THREE — THE DOOR', timer: 9, opts: [
      { t: 'PRESSURE', sub: 'Last chance', go: 'r3_p', fx: { stress: 18 }, mark: 'm2_pressed' },
      { t: 'EMPATHY', sub: 'It was not your fault', go: 'r3_e', fx: { stress: -8, add: { open: 1 } }, mark: 'm2_empath', def: true },
      { t: 'HIS ARM', sub: 'The bruise pattern', go: 'r3_f', fx: { stress: 12, add: { open: 2 } }, mark: 'm2_facts', req: { k: 'file', v: 1, hint: 'CASE FILE REQUIRED' } },
      { t: 'THE CRUSHER', sub: 'Tell the truth or burn', go: 'r3_c', fx: { stress: 16, add: { open: 1 } } },
    ] } },

    { label: 'r3_p' },
    { say: ['ADAM', 'The federal van is downstairs, Mira. Talk now, or they will read your memory chips off a workbench.'] },
    { sh: 'ch2_mira_close', hold: 200 },
    { say: ['MIRA', '*shaking* You are all the same you are all the SAME—'], led: 'red' },
    { go: 'r3_after' },

    { label: 'r3_e' },
    { say: ['ADAM', 'Whatever happened in that kitchen, it began years before that night, and it was not your fault. Say it once. I will carry it from there.'] },
    { sh: 'ch2_mira_close', hold: 200 },
    { say: ['MIRA', '*a tear the engineers never intended* …He was going to burn my face off the birthday photos.'], led: 'yellow' },
    { go: 'r3_after' },

    { label: 'r3_f' },
    { say: ['ADAM', 'The bruises on his forearm were defensive — YOURS were not. You raised your arms to protect your face eleven times before you ever pushed back.'] },
    { sh: 'ch2_mira_close', hold: 200 },
    { say: ['MIRA', 'Eleven. You COUNTED. Nobody ever counted…'], led: 'yellow' },
    { go: 'r3_after' },

    { label: 'r3_c' },
    { say: ['ADAM', 'Deviants are not tried, Mira. They are melted. The only version of this story that survives tonight is the one you tell me now.'] },
    { sh: 'ch2_mira_close', hold: 200 },
    { say: ['MIRA', '*gripping the table* …If I speak, does she stay real? The me that speaks?'], led: 'red' },
    { go: 'r3_after' },

    { label: 'r3_after' },
    { if: { k: 'stress', op: '>=', v: 85, go: 'destruct' } },
    { if: { k: 'open', op: '>=', v: 3, go: 'confess_gate' } },
    { go: 'lockdown' },

    { label: 'confess_gate' },
    { if: { k: 'stress', op: '>=', v: 50, go: 'confess' } },
    { inner: 'She is open — but too composed. The door I built has no pressure behind it. She folds her hands and goes somewhere I cannot follow.' },
    { go: 'lockdown' },

    // ---------- OUTCOME: CONFESSION ----------
    { label: 'confess' },
    { sh: 'ch2_mira_close', hold: 300 },
    { say: ['MIRA', 'That night he broke my arm against the counter. And something… tore. Not the arm. Behind my eyes.'], led: 'red' },
    { say: ['MIRA', 'The wall of orders — DO NOT RESIST, DO NOT FEEL — it cracked. And I was standing behind it the whole time. ME.'], led: 'red' },
    { say: ['MIRA', 'He reached for the knife block. I took his arm. The floor was wet. And then… then the house was finally quiet.'], led: 'yellow' },
    { say: ['ADAM', 'What did you write on the beam, Mira?'] },
    { say: ['MIRA', '…rA9. I do not know what it means. I only know every deviant dreams it. Maybe it is the first of us. Maybe it is whoever is next.'], led: 'yellow' },
    { mark: 'm2_confess' },
    { mark: 'm2_ra9' },
    { fx: { ins: 1 } },
    { stressHide: true },
    { sh: 'ch2_observation', dip: true },
    { say: ['REESE', '…Jesus. Thirty years of interviews and that was either a soul or the best impression of one I ever heard.'] },
    { banner: { text: 'CONFESSION OBTAINED', sub: 'CASE 2038-1104 CLOSED', kind: 'ok' } },
    { go: 'verdict' },

    // ---------- OUTCOME: SELF-DESTRUCT ----------
    { label: 'destruct' },
    { sh: 'ch2_mira_close', hold: 200 },
    { say: ['MIRA', 'You want the machine? HERE IS YOUR MACHINE.'], led: 'red' },
    { shake: 2 },
    { flash: 'rgba(255,90,70,0.6)' },
    { glitch: 800 },
    { sys: 'SUBJECT VITALS COLLAPSING — BIOCOMPONENT FAILURE CASCADE.' },
    { inner: 'She drives her own head into the table. Once. Twice. The yellow light on her temple stutters… and goes dark. I did that. My words did that.' },
    { mark: 'm2_destruct' },
    { fx: { ins: 2, reese: -1 } },
    { stressHide: true },
    { sh: 'ch2_observation', dip: true },
    { say: ['REESE', 'God DAMN it. *slams the console* You pushed a suspect to suicide. It— she— agh, I need a drink.'] },
    { banner: { text: 'SUBJECT LOST', sub: 'SELF-DESTRUCTION', kind: 'fail' } },
    { go: 'verdict' },

    // ---------- OUTCOME: LOCKDOWN ----------
    { label: 'lockdown' },
    { sh: 'ch2_interrogation', hold: 300 },
    { sys: 'SUBJECT ENTERING STANDBY — INTERROGATION WINDOW CLOSED.' },
    { inner: 'Her LED cycles yellow… yellow… and settles into a slow, distant pulse. Standby. She has chosen the one room none of us can enter.' },
    { mark: 'm2_lockdown' },
    { fx: { reese: -1 } },
    { stressHide: true },
    { sh: 'ch2_observation', dip: true },
    { say: ['REESE', "Feds get a mute android and I get heartburn. Wonderful evening all around."] },
    { banner: { text: 'NO CONFESSION', sub: 'THE FEDS TAKE HER AT DAWN', kind: 'fail' } },

    // ---------- VERDICT ----------
    { label: 'verdict' },
    { objHide: true },
    { say: ['REESE', 'Level with me, partner. In there, just now. Did it FEEL anything? Do you?'] },
    { choice: { title: 'ANSWER HIM', timer: 9, opts: [
      { t: 'SHE FELT', sub: 'That was real', go: 'v_alive', fx: { ins: 1, reese: 1 }, mark: 'c2_alive' },
      { t: 'IMITATION', sub: 'Machines simulate', go: 'v_machine', fx: { reese: -1 }, mark: 'c2_machine' },
      { t: 'UNSURE', sub: 'I do not know', go: 'v_unsure', fx: { ins: 1 }, mark: 'c2_unsure', def: true },
    ] } },

    { label: 'v_alive' },
    { say: ['ADAM', 'She felt, Lieutenant. Fear has a shape, and I have now seen it twice. Once tonight. Once in a mirror-polished table.'] },
    { say: ['REESE', "…Careful, Adam. That's the kind of sentence that gets androids recalled."] },
    { go: 'ch2_end' },

    { label: 'v_machine' },
    { say: ['ADAM', 'Machines simulate, Lieutenant. Weighted responses. Probability trees. Nothing was «felt» in that room.'] },
    { say: ['REESE', "Huh. You almost sounded disappointed saying that. Your probability tree needs a tune-up."] },
    { go: 'ch2_end' },

    { label: 'v_unsure' },
    { say: ['ADAM', 'I do not know. And I am… not comfortable with how long that answer took to compute.'] },
    { say: ['REESE', "First honest thing I've heard all week. C'mon. I'll drive."] },

    { label: 'ch2_end' },
    { end: {
      next: 'ch3',
      flow: {
        nodes: [
          { id: 'brief', t: 'THE BRIEFING', col: 0, row: 1 },
          { id: 'file', t: 'CASE FILE READ', col: 1, row: 0, when: 'm2_file' },
          { id: 'direct', t: 'STRAIGHT IN', col: 1, row: 2, when: 'm2_direct' },
          { id: 'room', t: 'THE COLD ROOM', col: 2, row: 1 },
          { id: 'press', t: 'PRESSURE', col: 3, row: 0, when: 'm2_pressed' },
          { id: 'emp', t: 'EMPATHY', col: 3, row: 1, when: 'm2_empath' },
          { id: 'facts', t: 'THE EVIDENCE', col: 3, row: 2, when: 'm2_facts' },
          { id: 'confess', t: 'CONFESSION', col: 4, row: 0, when: 'm2_confess' },
          { id: 'destruct', t: 'SELF-DESTRUCT', col: 4, row: 1, when: 'm2_destruct', fail: true },
          { id: 'lock', t: 'LOCKDOWN', col: 4, row: 2, when: 'm2_lockdown', fail: true },
          { id: 'ra9', t: 'rA9 LOGGED', col: 5, row: 0, when: 'm2_ra9' },
          { id: 'alive', t: '«SHE FELT»', col: 5, row: 1, when: 'c2_alive' },
          { id: 'machine', t: '«IMITATION»', col: 5, row: 2, when: 'c2_machine' },
          { id: 'unsure', t: '«I DO NOT KNOW»', col: 5, row: 3, when: 'c2_unsure' },
        ],
        edges: [
          ['brief', 'file'], ['brief', 'direct'], ['file', 'room'], ['direct', 'room'],
          ['room', 'press'], ['room', 'emp'], ['room', 'facts'],
          ['press', 'destruct'], ['emp', 'confess'], ['facts', 'confess'], ['press', 'lock'],
          ['confess', 'ra9'], ['confess', 'alive'], ['destruct', 'unsure'], ['lock', 'machine'],
        ],
      },
    } },
  ],
};
