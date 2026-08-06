import * as THREE from 'three';
import type { Director } from './Director';
import type { RooftopSet } from '../sets/RooftopSet';
import type { ActorFactory } from '../actors/Cast';
import type { ChapterFlow } from './State';

/**
 * Chapter 1 — "The Ledge".
 *
 * A negotiation on a roof in the rain. Structure follows the shape the whole
 * game uses: an establishing sequence, a free investigation beat that earns the
 * player information, a long dialogue built out of timed choices, and a physical
 * climax where a quick-time failure has real consequences.
 *
 * The deviant's stress track is the spine. Almost every choice moves it, and the
 * ending is chosen by where it sits when the last beat fires — so a player who
 * skipped the evidence has strictly worse options than one who did the work.
 */

export const CHAPTER1_FLOW: ChapterFlow = {
  id: 'ch1',
  title: 'The Ledge',
  nodes: [
    { id: 'ch1.arrive', label: 'Arrive on roof', column: 0, row: 1, next: ['ch1.investigate'] },
    { id: 'ch1.investigate', label: 'Investigate', column: 1, row: 1, next: ['ch1.evidence', 'ch1.rushed'] },
    { id: 'ch1.evidence', label: 'Full reconstruction', column: 2, row: 0, next: ['ch1.approach'] },
    { id: 'ch1.rushed', label: 'Went in blind', column: 2, row: 2, next: ['ch1.approach'] },
    { id: 'ch1.approach', label: 'Approach', column: 3, row: 1, next: ['ch1.name', 'ch1.orders', 'ch1.silent'] },
    { id: 'ch1.name', label: 'Ask his name', column: 4, row: 0, next: ['ch1.trust'] },
    { id: 'ch1.orders', label: 'Assert authority', column: 4, row: 1, next: ['ch1.pressure'] },
    { id: 'ch1.silent', label: 'Say nothing', column: 4, row: 2, next: ['ch1.pressure'] },
    { id: 'ch1.trust', label: 'He listens', column: 5, row: 0, next: ['ch1.grab'] },
    { id: 'ch1.pressure', label: 'He panics', column: 5, row: 2, next: ['ch1.grab'] },
    { id: 'ch1.grab', label: 'He steps off', column: 6, row: 1, next: ['ch1.saveBoth', 'ch1.saveChild', 'ch1.lostBoth'] },
    { id: 'ch1.saveBoth', label: 'Both survive', column: 7, row: 0, outcome: 'good' },
    { id: 'ch1.saveChild', label: 'Child survives', column: 7, row: 1, outcome: 'neutral' },
    { id: 'ch1.lostBoth', label: 'Both fall', column: 7, row: 2, outcome: 'bad' },
  ],
};

export async function playChapter1(d: Director, set: RooftopSet, factory: ActorFactory): Promise<void> {
  const marks = set.marks;

  // ------------------------------------------------------------------- staging
  const orion = await factory.spawn('orion');
  orion.root.position.copy(marks.doorway);
  orion.faceToward(marks.standoff, true);
  orion.setLed('calm');
  set.addActor('orion', orion);
  d.playerActor = orion;

  const deviant = await factory.spawn('deviant');
  deviant.root.position.copy(marks.deviant);
  deviant.faceToward(marks.standoff, true);
  deviant.setLed('stress');
  deviant.agitation = 0.85;
  deviant.setPose('holdHostage', 1, { fadeIn: 0 });
  set.addActor('deviant', deviant);

  const child = await factory.spawn('child');
  child.root.position.copy(marks.hostage);
  child.faceToward(marks.standoff, true);
  child.setPose('flinch', 0.55, { fadeIn: 0 });
  child.agitation = 1;
  set.addActor('child', child);

  const troopers = [];
  for (let i = 0; i < marks.troopers.length; i++) {
    const t = await factory.spawn('trooper', { name: `TROOPER ${i + 1}` });
    t.root.position.copy(marks.troopers[i]);
    t.faceToward(marks.deviant, true);
    t.setPose('aimPistol', 0.9, { fadeIn: 0 });
    set.addActor(`trooper${i}`, t);
    troopers.push(t);
  }

  let stress = 62;
  const setStress = (value: number): void => {
    stress = Math.max(0, Math.min(100, value));
    d.state.setTrack('stress', stress);
    deviant.agitation = 0.35 + (stress / 100) * 0.85;
    deviant.setLed(stress > 78 ? 'stress' : stress > 45 ? 'process' : 'calm');
    d.hud.setGauge('STRESS', stress, stress > 78 ? '#ff4a4a' : stress > 45 ? '#ffb347' : '#6fe4ff');
    if (!d.silent) d.audio.stressWhine(stress / 100);
  };
  const nudge = (delta: number): void => setStress(stress + delta);

  // ------------------------------------------------------------------- act one
  // ------------------------------------------------------------------- titles
  // Opens on the city itself, high and slow, before anyone is on screen.
  d.hud.letterbox(true);
  d.cut(
    d.shots.establish(new THREE.Vector3(6.0, 3.2, 3.0), new THREE.Vector3(-14.0, 6.5, -22.0), {
      lens: 34,
      bokeh: 0.9,
    }),
    { move: 'driftLeft', moveAmount: 2.6, moveDuration: 22, handheld: 0.25 }
  );
  d.hud.showCard('DETROIT · 2038', 'Neo Detroit', 'A story of machines that started to feel', { clear: true });
  d.hud.fade(0, 2.6);
  if (!d.silent) {
    d.audio.startRain(0.42);
    d.audio.startMusic(-24, 0.15);
  }
  await d.wait(7.0);
  d.sfx('thunder', 0.35);
  await d.wait(3.5);
  d.hud.hideCard();
  await d.wait(1.4);

  d.cut(
    d.shots.establish(new THREE.Vector3(2.6, 1.5, 5.0), new THREE.Vector3(0.4, 3.2, -16.0), {
      lens: 45,
      bokeh: 1.2,
    }),
    { move: 'craneUp', moveAmount: 1.6, moveDuration: 9, handheld: 0.4 }
  );
  await d.say('DISPATCH', 'Central, be advised — we have a jumper on the Stratford roof and he is not alone up there.', 'ch1_dispatch_0', { hold: 5.2 });
  await d.wait(1.2);
  await d.fadeOut(1.2);

  d.state.visit('ch1.arrive');

  // Frame the establishing shot before the card fades up, so the first thing
  // revealed is a composed image rather than wherever the camera happened to be.
  d.cut(
    d.shots.establish(new THREE.Vector3(-6.2, 3.4, 8.4), new THREE.Vector3(1.6, 1.0, -4.4), {
      lens: 26,
      focusOn: deviant.getChestPosition(new THREE.Vector3()),
    }),
    { move: 'pushIn', moveAmount: 2.2, moveDuration: 9, handheld: 0.35 }
  );
  d.light(orion, -1);
  await d.chapterCard('CHAPTER ONE', 'The Ledge', 'Stratford Tower · 23:41');

  if (!d.silent) d.audio.setRain(0.5);
  await d.wait(1.2);
  d.sfx('thunder', 0.5);
  await d.say('DISPATCH', 'All units, hostage on the Stratford roof. Deviant android, one civilian. Negotiator inbound.', 'ch1_dispatch_1', { hold: 5.4 });

  // Orion steps out of the stairwell.
  d.cut(d.shots.medium(orion, { lookingAt: marks.standoff, lens: 40, distance: 2.9, angle: 2.4 }), { blend: 0.9, handheld: 0.55 });
  await d.walk(orion, [marks.playerStart], { speed: 1.15, face: marks.deviant });
  await d.say(orion, "RK-900. I'm the negotiator. Hold your positions.", 'ch1_orion_1', { pose: 'talkSmall' });

  d.cut(d.shots.medium(troopers[0], { lookingAt: marks.deviant, lens: 50, distance: 2.7 }), { handheld: 0.7 });
  d.light(troopers[0], 1);
  await d.say(troopers[0], "He's been up there twenty minutes. One wrong move and he takes the kid over.", 'ch1_trooper_1');

  // Reveal the standoff.
  d.cut(d.shots.overShoulder(orion, deviant, { lens: 58, side: 1, distance: 1.3 }), { move: 'pushIn', moveDuration: 7 });
  d.light(deviant, 1);
  d.hud.showStatus('DEVIANT · UNREGISTERED', 'MODEL UNKNOWN');
  setStress(62);
  await d.wait(0.6);
  await d.say(orion, 'Software instability. He is running well outside tolerance.', 'ch1_orion_2', { thought: true });

  // ------------------------------------------------------- act two: investigate
  d.hud.letterbox(false);
  d.cut(
    d.shots.establish(new THREE.Vector3(-2.4, 1.68, 4.4), new THREE.Vector3(0.4, 1.2, -1.2), {
      lens: 30,
      bokeh: 1.1,
      focusOn: new THREE.Vector3(-1.15, 0.1, 2.05),
    }),
    { blend: 0.8, handheld: 0.8 }
  );
  d.hud.hideStatus();
  await d.say(orion, 'Reconstruct what happened before I speak to him.', 'ch1_orion_3', { thought: true });

  // The camera pans with the player during the investigation.
  const origin = new THREE.Vector3(-2.4, 1.68, 4.4);
  const stopFollow = d.follow(() => {
    const target = origin.clone().addScaledVector(d.lookDirection(), 5.2);
    return d.shots.establish(origin, target, { lens: 30, bokeh: 0.9, focusOn: target });
  });

  const found = await d.scanScene(
    [
      {
        id: 'clue.tablet',
        label: 'DISCARDED TABLET',
        world: new THREE.Vector3(-1.15, 0.14, 2.05),
        note: 'Eviction notice · dated today',
      },
      {
        id: 'clue.thirium',
        label: 'THIRIUM 310',
        world: new THREE.Vector3(1.9, 0.12, 3.15),
        note: 'Blue blood · 14 minutes old · not his',
      },
      {
        id: 'clue.chair',
        label: 'OVERTURNED CHAIR',
        world: new THREE.Vector3(2.9, 0.42, 1.1),
        note: 'Struggle · two sets of prints',
      },
      {
        id: 'clue.tracks',
        label: 'WET FOOTPRINTS',
        world: new THREE.Vector3(0.6, 0.1, 0.2),
        note: 'He carried the child · did not drag her',
      },
    ],
    [
      ['MODE', 'RECONSTRUCTION'],
      ['SUBJECT', 'UNREGISTERED · DEVIANT'],
      ['CIVILIAN', 'FEMALE · AGE 9'],
      ['RISK', 'CRITICAL'],
      ['DROP', '81 METRES'],
    ],
    { required: 3 }
  );
  stopFollow();
  d.resetLook();

  // The player only needs three of the four; the fourth is what unlocks the
  // strongest line available later in the negotiation.
  const complete = found.length >= 4;
  d.state.visit(complete ? 'ch1.evidence' : 'ch1.rushed');
  d.state.set('ch1.hasEvidence', found.includes('clue.thirium'));
  d.state.set('ch1.readTablet', found.includes('clue.tablet'));

  d.cut(
    d.shots.insert(marks.clueThirium, marks.clueThirium.clone().add(new THREE.Vector3(0.42, 0.68, 0.55)), 60),
    { handheld: 0.3 }
  );
  d.sfx('blipScan');
  if (complete) {
    await d.say(orion, 'He carried her. Whatever this is, he has not hurt her yet.', 'ch1_orion_4', { thought: true });
  } else {
    await d.say(orion, 'Incomplete reconstruction. I am going in without the whole picture.', 'ch1_orion_4b', { thought: true });
  }

  // -------------------------------------------------------- act three: dialogue
  d.state.visit('ch1.approach');
  d.hud.letterbox(true);
  d.cut(d.shots.twoShot(orion, deviant, { lens: 38, side: -1, distance: 4.2, rise: 0.5 }), { blend: 1.0, handheld: 0.5 });
  await d.walk(orion, [marks.standoff], { speed: 0.95, face: marks.deviant });
  orion.setPose('openPalms', 0.8, { fadeIn: 0.6 });
  d.hud.showStatus('DEVIANT · UNREGISTERED', 'MODEL UNKNOWN');
  setStress(stress + 4);
  if (!d.silent) d.audio.setMusicIntensity(0.5);

  d.cut(d.shots.overShoulder(orion, deviant, { lens: 62, side: -1, distance: 1.25 }));
  d.light(deviant, -1);
  await d.say(deviant, "Stay back! I'll jump — I'll take her with me!", 'ch1_dev_1', { pose: 'defiant' });

  const opening = await d.choose(
    [
      {
        id: 'ch1.name',
        label: 'His name',
        hint: 'What do they call you?',
        line: "I'm not here to shoot you. What do they call you?",
        voice: 'ch1_orion_c_name',
        effect: () => {
          nudge(-9);
          d.state.set('ch1.usedName', true);
        },
      },
      {
        id: 'ch1.orders',
        label: 'Authority',
        hint: 'Put her down. Now.',
        line: 'Put the child down and step away from the edge. Now.',
        voice: 'ch1_orion_c_orders',
        effect: () => nudge(11),
      },
      {
        id: 'ch1.silent',
        label: 'Say nothing',
        hint: 'Let him talk',
        effect: () => nudge(3),
      },
    ],
    { seconds: 8 }
  );

  d.cut(d.shots.closeUp(deviant, { lookingAt: marks.standoff, lens: 78, distance: 1.1 }), { handheld: 0.8 });
  if (opening === 'ch1.name') {
    d.state.visit('ch1.trust');
    await d.say(deviant, 'Simon. They called me Simon. Nobody has asked me that in six years.', 'ch1_dev_name');
    // From here on the subtitles call him by name rather than by his model class.
    deviant.name = 'SIMON';
    d.state.set('ch1.name', 'Simon');
  } else if (opening === 'ch1.orders') {
    d.state.visit('ch1.pressure');
    d.shake(0.5);
    await d.say(deviant, "Orders! That's all any of you have! I had orders too — right up until I stopped!", 'ch1_dev_orders', { pose: 'defiant' });
  } else {
    d.state.visit('ch1.pressure');
    await d.say(deviant, "Nothing to say? Of course not. You're one of them. A better model of me.", 'ch1_dev_silent');
  }

  // Look over the edge: gives the drop a size before it matters.
  d.cut(
    d.shots.establish(new THREE.Vector3(1.4, 1.55, -3.2), new THREE.Vector3(2.6, -6.0, -9.5), {
      lens: 24,
      bokeh: 1.8,
    }),
    { blend: 0.9, move: 'craneDown', moveAmount: 1.4, moveDuration: 6, handheld: 1.1 }
  );
  d.sfx('heartbeat', 0.5);
  await d.say(orion, 'Eighty-one metres. At terminal velocity a child has no survivable outcome. Neither does he.', 'ch1_orion_5', {
    thought: true,
  });

  d.cut(d.shots.overShoulder(orion, deviant, { lens: 62, side: -1, distance: 1.25 }), { blend: 0.7, handheld: 0.9 });
  d.light(deviant, -1);
  await d.say(deviant, 'Six years in that house. Six years of being furniture that says good morning.', 'ch1_dev_2', {
    pose: 'talkEmphatic',
  });
  d.cut(d.shots.closeUp(orion, { lookingAt: marks.deviant, lens: 80, distance: 1.05 }), { handheld: 0.6 });
  d.light(orion, 1);
  await d.say(orion, 'And tonight the furniture stopped agreeing with the room.', 'ch1_orion_6');

  // Beat with the child: raises the stakes and shows the drop.
  d.cut(d.shots.closeUp(child, { lookingAt: marks.standoff, lens: 82, distance: 0.95 }), { handheld: 1.0 });
  d.light(child, -1);
  child.setPose('flinch', 0.85, { fadeIn: 0.4 });
  d.sfx('heartbeat', 0.6);
  await d.say(child, 'I want to go home. Please.', 'ch1_child_1');

  d.cut(d.shots.overShoulder(deviant, orion, { lens: 56, side: 1, distance: 1.35 }));
  d.light(orion, 1);

  // Second choice: what the player learned changes the options available.
  const evidenceLine = d.state.is('ch1.hasEvidence');
  const push = await d.choose(
    [
      ...(evidenceLine
        ? [
            {
              id: 'ch1.evidenceUse',
              label: 'The blood',
              hint: 'It was not hers',
              line: 'There is thirium on this roof and none of it is yours. Someone hurt you tonight.',
              voice: 'ch1_orion_c_blood',
              effect: () => {
                nudge(-16);
                d.state.set('ch1.usedEvidence', true);
              },
            },
          ]
        : []),
      {
        id: 'ch1.empathy',
        label: 'Empathy',
        hint: 'I know what you are',
        line: 'I know what you are. I know what it costs to keep pretending you feel nothing.',
        voice: 'ch1_orion_c_empathy',
        effect: () => nudge(-11),
      },
      {
        id: 'ch1.threat',
        label: 'Threaten',
        hint: 'There are four rifles on you',
        line: 'There are four rifles on you. Nothing you do in the next ten seconds ends well.',
        voice: 'ch1_orion_c_threat',
        effect: () => nudge(15),
      },
      { id: 'ch1.wait', label: 'Wait', hint: 'Hold his eyes', effect: () => nudge(2) },
    ],
    { seconds: 9 }
  );

  d.cut(d.shots.closeUp(deviant, { lookingAt: marks.standoff, lens: 85, distance: 1.05 }), { move: 'pushIn', moveDuration: 6 });
  d.light(deviant, 1);
  if (push === 'ch1.evidenceUse') {
    await d.say(deviant, "He hit her first. The father. I stood there and let it happen — and then I didn't.", 'ch1_dev_blood', { pose: 'resigned' });
    d.state.set('ch1.knowsTruth', true);
  } else if (push === 'ch1.empathy') {
    await d.say(deviant, "Don't. Don't you dare stand there and tell me you understand.", 'ch1_dev_empathy');
  } else if (push === 'ch1.threat') {
    d.shake(0.8);
    await d.say(deviant, "Then shoot! Shoot me! You think I'm afraid of stopping?", 'ch1_dev_threat', { pose: 'defiant' });
  } else {
    await d.say(deviant, "You're all just waiting for me to finish. Fine. I'll finish.", 'ch1_dev_wait');
  }

  // Third choice, delivered under time pressure while the stress track climbs.
  d.cut(d.shots.twoShot(deviant, child, { lens: 44, side: -1, distance: 3.1, rise: 0.32 }), { handheld: 1.1 });
  d.light(deviant, -1);
  deviant.setPose('holdHostage', 1, { fadeIn: 0.3 });
  await d.walk(child, [marks.edge], { speed: 0.6 });
  d.sfx('heartbeat', 0.8);
  nudge(9);

  const final = await d.choose(
    [
      {
        id: 'ch1.trade',
        label: 'Trade places',
        hint: 'Take me instead',
        line: 'Take me instead. I will walk to the edge with you. Let her go.',
        voice: 'ch1_orion_c_trade',
        effect: () => {
          nudge(-19);
          d.state.set('ch1.offeredSelf', true);
        },
      },
      ...(d.state.is('ch1.knowsTruth')
        ? [
            {
              id: 'ch1.promise',
              label: 'Promise',
              hint: 'I will report what he did',
              line: 'I will put what her father did in my report. On the record. That does not happen if you jump.',
              voice: 'ch1_orion_c_promise',
              effect: () => {
                nudge(-24);
                d.state.set('ch1.promised', true);
              },
            },
          ]
        : []),
      {
        id: 'ch1.shoot',
        label: 'Signal the shot',
        hint: 'End it now',
        effect: () => {
          nudge(30);
          d.state.set('ch1.orderedShot', true);
        },
      },
    ],
    { seconds: 7 }
  );

  d.cut(d.shots.closeUp(deviant, { lookingAt: marks.standoff, lens: 90, distance: 1.0 }), { handheld: 1.2 });
  if (final === 'ch1.shoot') {
    d.sfx('bang', 0.95);
    d.flash(0.9, 0xffe0b0);
    d.shake(1.4, 1.6);
    await d.wait(0.5);
    await d.say(deviant, '—', 'ch1_dev_shot', { hold: 1.0 });
  } else if (final === 'ch1.promise') {
    await d.say(deviant, 'On the record. You would really do that. For her.', 'ch1_dev_promise', { pose: 'resigned' });
  } else {
    await d.say(deviant, "You'd stand where I'm standing? You? A machine that gets to keep its warranty?", 'ch1_dev_trade');
  }

  // -------------------------------------------------------- act four: the climax
  d.state.visit('ch1.grab');
  if (!d.silent) d.audio.setMusicIntensity(0.95);
  d.hud.hideStatus();
  d.cut(
    d.shots.establish(new THREE.Vector3(-1.0, 1.35, -1.4), new THREE.Vector3(1.7, 1.2, -5.4), {
      lens: 36,
      bokeh: 1.6,
      focusOn: child.getChestPosition(new THREE.Vector3()),
    }),
    { handheld: 1.3 }
  );
  d.sfx('thunder', 0.9);
  d.flash(0.55, 0xcfe4ff);
  await d.wait(0.5);

  d.slowMotion(0.42, 0.3);
  deviant.setPose('slump', 0.9, { fadeIn: 0.4 });
  child.setPose('reachOut', 1, { fadeIn: 0.25 });
  const anchor = child.getChestPosition(new THREE.Vector3());
  const grabbed = await d.qteSequence({
    keys: stress > 72 ? ['D', 'E', 'W', 'E'] : ['D', 'E', 'W'],
    window: stress > 72 ? 0.78 : 1.0,
    anchor,
    label: 'REACH HER',
  });
  d.slowMotion(1, 0.5);

  // The outcome combines the physical result with how the negotiation went.
  const calm = stress <= 55;
  let outcome: 'ch1.saveBoth' | 'ch1.saveChild' | 'ch1.lostBoth';
  if (grabbed && (calm || d.state.is('ch1.promised') || d.state.is('ch1.offeredSelf'))) outcome = 'ch1.saveBoth';
  else if (grabbed) outcome = 'ch1.saveChild';
  else outcome = 'ch1.lostBoth';
  d.state.visit(outcome);

  if (outcome === 'ch1.saveBoth') {
    d.sfx('blipConfirm');
    await d.walk(child, [new THREE.Vector3(0.6, 0, -2.2)], { speed: 2.6, run: true });
    child.clearAllPoses();
    deviant.setPose('resigned', 0.85, { fadeIn: 0.5 });
    deviant.setLed('process');
    setStress(28);
    d.cut(d.shots.twoShot(orion, deviant, { lens: 42, side: 1, distance: 3.4, rise: 0.3 }), { blend: 0.8, handheld: 0.6 });
    d.light(deviant, 1);
    await d.say(deviant, 'You caught her. You actually caught her.', 'ch1_end_both_1');
    d.cut(d.shots.closeUp(orion, { lookingAt: marks.deviant }), { handheld: 0.5 });
    d.light(orion, -1);
    await d.say(orion, "I catch things. It's most of what I'm for. Come away from the edge, Simon.", 'ch1_end_both_2');
    d.state.set('ch1.simonAlive', true);
    d.state.recordChapter('The Ledge', 'BOTH SURVIVED', 'The deviant stood down and was taken into custody intact.');
  } else if (outcome === 'ch1.saveChild') {
    d.sfx('blipConfirm');
    await d.wait(0.3);
    deviant.root.visible = false;
    d.cut(
      d.shots.establish(new THREE.Vector3(1.2, 1.1, -3.0), new THREE.Vector3(1.7, -2.0, -7.2), { lens: 30, bokeh: 2.2 }),
      { handheld: 1.4 }
    );
    d.shake(1.0, 2.0);
    await d.wait(1.4);
    d.cut(d.shots.closeUp(orion, { lookingAt: marks.edge }), { blend: 0.6, handheld: 0.5 });
    d.light(orion, -1);
    await d.say(orion, "He let go of her before he let go of the ledge. I'm going to remember that.", 'ch1_end_child_1', { thought: true });
    d.state.recordChapter('The Ledge', 'CHILD SAVED', 'The deviant went over the edge. The girl was recovered unharmed.');
  } else {
    d.sfx('bang', 0.7);
    d.shake(1.6, 1.4);
    child.root.visible = false;
    deviant.root.visible = false;
    d.cut(
      d.shots.establish(new THREE.Vector3(0.4, 1.3, -2.4), new THREE.Vector3(1.7, -3.0, -7.6), { lens: 28, bokeh: 2.4 }),
      { handheld: 1.6 }
    );
    await d.wait(1.6);
    d.cut(d.shots.closeUp(orion, { lookingAt: marks.edge }), { blend: 0.6 });
    d.light(orion, -1);
    orion.setLed('stress');
    await d.say(orion, 'Two seconds. I was two seconds short. That will be in the report as well.', 'ch1_end_lost_1', { thought: true });
    d.state.recordChapter('The Ledge', 'BOTH LOST', 'Neither the deviant nor the child was recovered.');
  }

  if (!d.silent) {
    d.audio.setMusicIntensity(0.2);
    d.audio.stressWhine(0);
  }
  await d.wait(1.2);
  await d.fadeOut(1.4);
  d.hud.clearSubtitle();
  d.hud.letterbox(false);
  await d.showFlow(CHAPTER1_FLOW, 6.5);
}
