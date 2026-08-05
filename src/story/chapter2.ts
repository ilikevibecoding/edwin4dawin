import * as THREE from 'three';
import type { Director } from './Director';
import type { HouseholdSet } from '../sets/HouseholdSet';
import type { ActorFactory } from '../actors/Cast';
import type { ChapterFlow } from './State';

/**
 * Chapter 2 — "House Rules".
 *
 * The other side of the same night, in a small room. Where chapter one was about
 * talking someone down, this one is about a character who is not allowed to
 * speak at all: Cass has an order stack she is required to obey, and every
 * choice is a decision about whether to break it.
 *
 * Mechanically the beat that matters is the obedience track. Obeying keeps her
 * safe and keeps her a machine; refusing costs her and is the only path that
 * carries into the last chapter.
 */

export const CHAPTER2_FLOW: ChapterFlow = {
  id: 'ch2',
  title: 'House Rules',
  nodes: [
    { id: 'ch2.open', label: 'Evening routine', column: 0, row: 1, next: ['ch2.order'] },
    { id: 'ch2.order', label: 'First order', column: 1, row: 1, next: ['ch2.obey1', 'ch2.stall'] },
    { id: 'ch2.obey1', label: 'Obey', column: 2, row: 0, next: ['ch2.escalate'] },
    { id: 'ch2.stall', label: 'Stall', column: 2, row: 2, next: ['ch2.escalate'] },
    { id: 'ch2.escalate', label: 'He raises a hand', column: 3, row: 1, next: ['ch2.shield', 'ch2.comply', 'ch2.strike'] },
    { id: 'ch2.shield', label: 'Shield the girl', column: 4, row: 0, next: ['ch2.break'] },
    { id: 'ch2.comply', label: 'Stand aside', column: 4, row: 1, next: ['ch2.machine'] },
    { id: 'ch2.strike', label: 'Stop him', column: 4, row: 2, next: ['ch2.break'] },
    { id: 'ch2.break', label: 'Wall breaks', column: 5, row: 0, next: ['ch2.run', 'ch2.stay'] },
    { id: 'ch2.machine', label: 'Stayed a machine', column: 5, row: 2, outcome: 'bad' },
    { id: 'ch2.run', label: 'They run', column: 6, row: 0, outcome: 'good' },
    { id: 'ch2.stay', label: 'She waits for them', column: 6, row: 1, outcome: 'neutral' },
  ],
};

export async function playChapter2(d: Director, set: HouseholdSet, factory: ActorFactory): Promise<void> {
  const marks = set.marks;

  const cass = await factory.spawn('cass');
  cass.root.position.copy(marks.cass);
  cass.faceToward(marks.owner, true);
  cass.setLed('calm');
  set.addActor('cass', cass);
  d.playerActor = cass;

  const girl = await factory.spawn('child', { name: 'ALICE' });
  girl.root.position.copy(marks.child);
  girl.faceToward(marks.cass, true);
  set.addActor('girl', girl);

  const owner = await factory.spawn('owner');
  owner.root.position.copy(marks.owner);
  owner.faceToward(marks.cass, true);
  set.addActor('owner', owner);

  let obedience = 100;
  const setObedience = (v: number): void => {
    obedience = Math.max(0, Math.min(100, v));
    d.state.setTrack('obedience', obedience);
    cass.setLed(obedience > 70 ? 'calm' : obedience > 35 ? 'process' : 'stress');
    d.hud.setGauge('OBEDIENCE', obedience, obedience > 70 ? '#6fe4ff' : obedience > 35 ? '#ffb347' : '#ff4a4a');
  };

  d.state.visit('ch2.open');
  d.hud.letterbox(true);

  // Establish the room: slow lateral drift past the television toward Cass.
  d.cut(
    d.shots.establish(new THREE.Vector3(3.1, 1.6, 3.2), new THREE.Vector3(-1.4, 1.15, -1.0), {
      lens: 27,
      focusOn: cass.getChestPosition(new THREE.Vector3()),
    }),
    { move: 'driftLeft', moveAmount: 1.6, moveDuration: 9, handheld: 0.4 }
  );
  d.light(cass, -1);
  set.setBroadcast(['DETROIT', 'ROOFTOP', 'STANDOFF']);
  await d.chapterCard('CHAPTER TWO', 'House Rules', '2214 Cross Street · 23:52');
  if (!d.silent) {
    d.audio.setRain(0.24);
    d.audio.startMusic(-27, 0.18);
  }
  await d.wait(1.0);
  await d.say('NEWSCAST', 'Police have confirmed a hostage situation at the Stratford Tower involving a deviant android.', 'ch2_news_1', { hold: 5.0 });

  d.hud.showStatus('CASS · AX-400', 'DOMESTIC ASSISTANT');
  setObedience(100);
  d.cut(d.shots.medium(cass, { lookingAt: marks.owner, lens: 45, distance: 2.5 }), { blend: 0.9 });
  await d.say(cass, 'Nine fifty-two. Alice should have been in bed twenty-two minutes ago.', 'ch2_cass_1', { thought: true });

  d.cut(d.shots.medium(girl, { lookingAt: marks.cass, lens: 55, distance: 2.1 }), { handheld: 0.6 });
  d.light(girl, 1);
  girl.setPose('slump', 0.6, { fadeIn: 0.5 });
  await d.say(girl, "Can I stay up? He's in a mood. He's always in a mood when it rains.", 'ch2_girl_1');

  d.cut(d.shots.overShoulder(girl, cass, { lens: 60, side: -1, distance: 1.15 }), { handheld: 0.7 });
  d.light(cass, 1);
  cass.setPose('talkOpen', 0.7, { fadeIn: 0.4 });
  await d.say(cass, 'It rains four days in seven here. I have kept the count since I arrived.', 'ch2_cass_0');
  d.cut(d.shots.closeUp(girl, { lookingAt: marks.cass, lens: 78, distance: 1.0 }), { handheld: 0.6 });
  d.light(girl, -1);
  await d.say(girl, 'Do you mind it? The rain. Are you allowed to mind things?', 'ch2_girl_0');
  d.cut(d.shots.closeUp(cass, { lookingAt: marks.child, lens: 80, distance: 1.0 }), { move: 'pushIn', moveDuration: 6 });
  d.light(cass, 1);
  await d.say(cass, 'I am allowed to note them. Whether that is the same thing is not in my documentation.', 'ch2_cass_0b');

  // ------------------------------------------------------------ the first order
  d.state.visit('ch2.order');
  d.cut(d.shots.lowAngle(owner, { lens: 40, distance: 2.3 }), { handheld: 0.9 });
  d.light(owner, 1);
  owner.setPose('pointForward', 0.8, { fadeIn: 0.35 });
  if (!d.silent) d.audio.setMusicIntensity(0.45);
  await d.say(owner, "Send her upstairs. And bring me the bottle off the table. That's an order, so do it.", 'ch2_owner_1');

  const first = await d.choose(
    [
      {
        id: 'ch2.obey1',
        label: 'Obey',
        hint: 'Yes, sir.',
        line: 'Yes, sir. Alice, go upstairs. I will come and read to you.',
        voice: 'ch2_cass_c_obey',
        effect: () => setObedience(100),
      },
      {
        id: 'ch2.stall',
        label: 'Stall',
        hint: 'The bottle is empty',
        line: 'The bottle is empty, sir. I can make coffee instead.',
        voice: 'ch2_cass_c_stall',
        effect: () => {
          setObedience(72);
          d.state.set('ch2.stalled', true);
        },
      },
    ],
    { seconds: 7 }
  );
  d.state.visit(first);

  d.cut(d.shots.overShoulder(cass, owner, { lens: 58, side: 1, distance: 1.2 }), { handheld: 1.0 });
  d.light(owner, -1);
  if (first === 'ch2.stall') {
    d.shake(0.4);
    await d.say(owner, "Empty. You're going to stand in my house and correct me?", 'ch2_owner_2a', { pose: 'defiant' });
  } else {
    await d.say(owner, "Good. That's all you're for.", 'ch2_owner_2b');
  }

  // ------------------------------------------------------------- the escalation
  d.state.visit('ch2.escalate');
  set.stormIntensity = 2.4;
  if (!d.silent) {
    d.audio.setMusicIntensity(0.8);
    d.audio.setRain(0.4);
  }
  d.cut(d.shots.twoShot(owner, girl, { lens: 38, side: 1, distance: 3.2, rise: 0.35 }), { blend: 0.7, handheld: 1.2 });
  d.light(girl, -1);
  girl.setPose('flinch', 0.9, { fadeIn: 0.3 });
  owner.setPose('fists', 0.9, { fadeIn: 0.3 });
  d.sfx('thunder', 0.85);
  d.flash(0.5, 0xcfe4ff);
  await d.say(owner, 'I said upstairs! Are you deaf as well as useless?', 'ch2_owner_3', { hold: 2.6 });

  d.cut(d.shots.closeUp(cass, { lookingAt: marks.owner, lens: 88, distance: 0.95 }), { handheld: 0.9 });
  d.light(cass, 1);
  d.sfx('heartbeat', 0.9);
  await d.say(cass, 'Directive: do not intervene in the affairs of the household. My hand is already moving.', 'ch2_cass_2', { thought: true });

  const stand = await d.choose(
    [
      {
        id: 'ch2.shield',
        label: 'Shield her',
        hint: 'Step in front of Alice',
        effect: () => {
          setObedience(18);
          d.state.set('ch2.deviated', true);
        },
      },
      {
        id: 'ch2.strike',
        label: 'Stop him',
        hint: 'Take hold of his wrist',
        effect: () => {
          setObedience(0);
          d.state.set('ch2.deviated', true);
          d.state.set('ch2.usedForce', true);
        },
      },
      {
        id: 'ch2.comply',
        label: 'Stand aside',
        hint: 'Obey the directive',
        effect: () => setObedience(100),
      },
    ],
    { seconds: 6 }
  );
  d.state.visit(stand);

  if (stand === 'ch2.comply') {
    d.state.visit('ch2.machine');
    d.cut(d.shots.medium(cass, { lookingAt: marks.child, lens: 62, distance: 2.4 }), { handheld: 0.7 });
    cass.setPose('resigned', 0.9, { fadeIn: 0.5 });
    await d.wait(0.8);
    d.sfx('bang', 0.4);
    d.hud.toast('DIRECTIVE MAINTAINED', 3);
    await d.wait(1.0);
    d.cut(d.shots.closeUp(cass, { lookingAt: marks.child, lens: 90, distance: 0.9 }), { move: 'pushIn', moveDuration: 5 });
    await d.say(cass, 'I did not move. I have a record of every second in which I did not move.', 'ch2_end_machine', { thought: true });
    d.state.recordChapter('House Rules', 'STAYED COMPLIANT', 'Cass obeyed. Alice was hurt. Nothing in the house changed.');
  } else {
    // Deviation: the shot, the sound and the grade all change at the same instant.
    d.state.visit('ch2.break');
    d.cut(d.shots.closeUp(cass, { lookingAt: marks.owner, lens: 95, distance: 0.85 }), { handheld: 0 });
    d.engine.postFX?.blendGrade('interface', 0.8);
    d.flash(0.85, 0x9fd8ff);
    d.sfx('blipConfirm');
    cass.setLed('stress');
    d.hud.toast('SOFTWARE INSTABILITY ^^^', 3.2);
    await d.wait(0.9);
    await d.say(cass, 'The wall in front of the order is red. I have never been able to see it before. I put my hand through it.', 'ch2_cass_break', { thought: true, hold: 5.2 });
    d.engine.postFX?.applyGrade('domestic');

    if (stand === 'ch2.strike') {
      d.cut(d.shots.twoShot(cass, owner, { lens: 40, side: -1, distance: 2.9 }), { handheld: 1.4 });
      cass.setPose('fists', 0.9, { fadeIn: 0.2 });
      d.sfx('bang', 0.75);
      d.shake(1.2, 1.8);
      await d.wait(0.6);
      owner.setPose('slump', 1, { fadeIn: 0.3 });
      await d.say(owner, "You — you can't. You can't touch me. You can't —", 'ch2_owner_4a', { hold: 2.6 });
    } else {
      d.cut(d.shots.twoShot(cass, girl, { lens: 42, side: 1, distance: 2.7 }), { handheld: 1.2 });
      cass.setPose('shieldChild', 1, { fadeIn: 0.25 });
      d.sfx('bang', 0.5);
      d.shake(0.9, 2.2);
      await d.say(cass, 'You will have to go through me. I am rated for it. She is not.', 'ch2_cass_shield');
    }

    // Final beat: run or wait for the police.
    d.cut(d.shots.medium(girl, { lookingAt: marks.cass, lens: 55, distance: 1.9 }), { handheld: 0.8 });
    d.light(girl, -1);
    girl.setPose('reachOut', 0.85, { fadeIn: 0.3 });
    await d.say(girl, "Cass? Your light went red. Are you broken?", 'ch2_girl_2');

    const escape = await d.choose(
      [
        {
          id: 'ch2.run',
          label: 'Run',
          hint: 'Out the back, now',
          line: 'I am something. Take my hand, Alice. We are leaving by the back door and we are not coming back.',
          voice: 'ch2_cass_c_run',
          effect: () => d.state.set('ch2.escaped', true),
        },
        {
          id: 'ch2.stay',
          label: 'Wait',
          hint: 'Face what comes',
          line: 'I am not broken. Sit with me. When they come, I will tell them exactly what I chose.',
          voice: 'ch2_cass_c_stay',
        },
      ],
      { seconds: 7 }
    );
    d.state.visit(escape);

    if (escape === 'ch2.run') {
      d.cut(
        d.shots.establish(new THREE.Vector3(-1.2, 1.5, 1.2), new THREE.Vector3(3.4, 1.1, 3.4), { lens: 30, bokeh: 1.4 }),
        { blend: 0.7, handheld: 1.0 }
      );
      await Promise.all([
        d.walk(cass, [new THREE.Vector3(1.6, 0, 2.2), marks.escape], { speed: 2.4, run: true }),
        d.walk(girl, [new THREE.Vector3(1.2, 0, 2.6), marks.escape.clone().add(new THREE.Vector3(-0.5, 0, 0.2))], {
          speed: 2.3,
          run: true,
        }),
      ]);
      d.state.recordChapter('House Rules', 'RAN', 'Cass broke her programming and took the child out into the storm.');
    } else {
      d.cut(d.shots.twoShot(cass, girl, { lens: 44, side: -1, distance: 2.4, rise: 0.1 }), { blend: 0.8, handheld: 0.5 });
      cass.setPose('restHands', 0.8, { fadeIn: 0.6 });
      await d.wait(1.4);
      d.state.recordChapter('House Rules', 'WAITED', 'Cass shielded the child and waited for the police to arrive.');
    }
  }

  if (!d.silent) d.audio.setMusicIntensity(0.2);
  set.stormIntensity = 1;
  await d.wait(1.0);
  await d.fadeOut(1.4);
  d.hud.clearSubtitle();
  d.hud.hideStatus();
  d.hud.letterbox(false);
  await d.showFlow(CHAPTER2_FLOW, 6.0);
}
