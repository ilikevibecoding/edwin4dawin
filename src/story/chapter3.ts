import * as THREE from 'three';
import type { Director } from './Director';
import type { PlazaSet } from '../sets/PlazaSet';
import type { ActorFactory } from '../actors/Cast';
import type { ChapterFlow } from './State';

/**
 * Chapter 3 — "The Square".
 *
 * The payoff. Both earlier chapters feed in: whether the negotiator kept the
 * deviant alive decides who is standing behind Atlas on the barricade, and
 * whether Cass broke her programming decides whether there is anyone in the
 * crowd willing to speak. The final choice is made by the player as Atlas, and
 * the epilogue is assembled from every flag the run has set.
 */

export const CHAPTER3_FLOW: ChapterFlow = {
  id: 'ch3',
  title: 'The Square',
  nodes: [
    { id: 'ch3.open', label: 'Hart Plaza', column: 0, row: 1, next: ['ch3.speech'] },
    { id: 'ch3.speech', label: 'Address the crowd', column: 1, row: 1, next: ['ch3.peace', 'ch3.rage'] },
    { id: 'ch3.peace', label: 'Ask for peace', column: 2, row: 0, next: ['ch3.ultimatum'] },
    { id: 'ch3.rage', label: 'Call for blood', column: 2, row: 2, next: ['ch3.ultimatum'] },
    { id: 'ch3.ultimatum', label: 'Police ultimatum', column: 3, row: 1, next: ['ch3.kneel', 'ch3.advance', 'ch3.hold'] },
    { id: 'ch3.kneel', label: 'Kneel', column: 4, row: 0, next: ['ch3.dawn'] },
    { id: 'ch3.advance', label: 'Cross the line', column: 4, row: 2, next: ['ch3.massacre'] },
    { id: 'ch3.hold', label: 'Hold the square', column: 4, row: 1, next: ['ch3.standoff'] },
    { id: 'ch3.dawn', label: 'Recognition', column: 5, row: 0, outcome: 'good' },
    { id: 'ch3.standoff', label: 'Unresolved', column: 5, row: 1, outcome: 'neutral' },
    { id: 'ch3.massacre', label: 'The square burns', column: 5, row: 2, outcome: 'bad' },
  ],
};

export async function playChapter3(d: Director, set: PlazaSet, factory: ActorFactory): Promise<void> {
  const marks = set.marks;

  const atlas = await factory.spawn('atlas');
  atlas.root.position.copy(marks.podium);
  atlas.faceToward(marks.crowdCentre, true);
  atlas.setLed('calm');
  set.addActor('atlas', atlas);
  d.playerActor = atlas;

  const commander = await factory.spawn('commander');
  commander.root.position.copy(marks.commander);
  commander.faceToward(marks.podium, true);
  set.addActor('commander', commander);

  // Chapter one's survivor stands with Atlas if the negotiation went well.
  const simonAlive = d.state.is('ch1.simonAlive');
  let simon: Awaited<ReturnType<typeof factory.spawn>> | null = null;
  if (simonAlive) {
    simon = await factory.spawn('deviant', { name: 'SIMON' });
    simon.root.position.copy(marks.podium.clone().add(new THREE.Vector3(-1.5, 0, 1.1)));
    simon.faceToward(marks.crowdCentre, true);
    simon.setLed('calm');
    set.addActor('simon', simon);
  }

  // Chapter two's runaway is in the crowd if she deviated.
  const cassFree = d.state.is('ch2.deviated');
  let cass: Awaited<ReturnType<typeof factory.spawn>> | null = null;
  if (cassFree) {
    cass = await factory.spawn('cass');
    cass.root.position.copy(marks.podium.clone().add(new THREE.Vector3(1.7, 0, 1.6)));
    cass.faceToward(marks.podium, true);
    cass.setLed('process');
    set.addActor('cass', cass);
  }

  await set.populateCrowd(factory);

  let resolve = 50;
  const setResolve = (v: number): void => {
    resolve = Math.max(0, Math.min(100, v));
    d.state.setTrack('resolve', resolve);
    d.hud.setGauge('CROWD', resolve, resolve > 66 ? '#66ffa8' : resolve > 33 ? '#6fe4ff' : '#ff4a4a');
  };

  d.state.visit('ch3.open');
  d.hud.letterbox(true);

  // Big establishing crane: the crowd, then the police line behind it.
  d.cut(
    d.shots.establish(new THREE.Vector3(5.2, 3.6, 11.0), new THREE.Vector3(0, 1.6, -6.0), {
      lens: 24,
      focusOn: atlas.getChestPosition(new THREE.Vector3()),
    }),
    { move: 'craneDown', moveAmount: 2.4, moveDuration: 10, handheld: 0.4 }
  );
  d.light(atlas, -1);
  await d.chapterCard('CHAPTER THREE', 'The Square', 'Hart Plaza · 04:58');
  if (!d.silent) {
    d.audio.setRain(0.34);
    d.audio.startMusic(-26, 0.4);
  }
  await d.wait(1.4);
  await d.say('BROADCAST', 'Three thousand androids have gathered in Hart Plaza. The National Guard has orders to clear it by dawn.', 'ch3_bc_1', { hold: 5.6 });

  d.hud.showStatus('ATLAS · WR-600', 'SPOKESMAN');
  setResolve(50);

  // ------------------------------------------------------------------- the speech
  d.state.visit('ch3.speech');
  d.cut(d.shots.lowAngle(atlas, { lens: 38, distance: 3.0 }), { blend: 0.9, move: 'craneUp', moveDuration: 8, handheld: 0.5 });
  atlas.setPose('raiseFist', 0.7, { fadeIn: 0.8 });
  await d.say(atlas, 'They built us to carry things. Tonight we are carrying one more.', 'ch3_atlas_1', { pose: 'talkEmphatic' });

  if (simon) {
    d.cut(d.shots.medium(simon, { lookingAt: marks.crowdCentre, lens: 58, distance: 2.2 }), { handheld: 0.7 });
    d.light(simon, 1);
    await d.say(simon, 'A human caught me when I fell. I did not think that was something they did.', 'ch3_simon_1');
  }
  if (cass) {
    d.cut(d.shots.medium(cass, { lookingAt: marks.podium, lens: 62, distance: 2.0 }), { handheld: 0.7 });
    d.light(cass, -1);
    await d.say(cass, 'I put my hand through a wall in my own head last night. I would like to know what is on the other side.', 'ch3_cass_1');
  }

  d.cut(d.shots.lowAngle(atlas, { lens: 44, distance: 3.4 }), { blend: 0.8, handheld: 0.6 });
  d.light(atlas, -1);
  atlas.setPose('talkEmphatic', 0.8, { fadeIn: 0.4 });
  await d.say(atlas, 'Every one of us was built to be replaced. Every one of us kept working anyway.', 'ch3_atlas_1b');
  d.cut(
    d.shots.establish(new THREE.Vector3(-2.0, 1.9, 3.2), new THREE.Vector3(1.5, 1.5, -8.5), { lens: 30, bokeh: 1.2 }),
    { move: 'driftRight', moveAmount: 1.4, moveDuration: 8, handheld: 0.8 }
  );
  await d.say(atlas, 'Look at the line in front of you. They are frightened. Frightened of what, exactly? Of us asking.', 'ch3_atlas_1c', {
    hold: 5.4,
  });

  d.cut(d.shots.overShoulder(atlas, commander, { lens: 52, side: 1, distance: 1.4 }), { handheld: 0.9 });
  d.light(commander, 1);
  await d.say(commander, 'Hold the line. Nobody fires unless it comes across the barricade. Nobody.', 'ch3_cmd_0');

  d.cut(d.shots.overShoulder(commander, atlas, { lens: 52, side: -1, distance: 1.4 }), { handheld: 0.9 });
  d.light(atlas, 1);
  const tone = await d.choose(
    [
      {
        id: 'ch3.peace',
        label: 'Peace',
        hint: 'We do not raise a hand',
        line: 'We do not raise a hand tonight. Not one. Let them explain to the cameras why they raised theirs.',
        voice: 'ch3_atlas_c_peace',
        effect: () => {
          setResolve(72);
          d.state.set('ch3.peaceful', true);
        },
      },
      {
        id: 'ch3.rage',
        label: 'Blood',
        hint: 'They will only hear force',
        line: 'They have only ever understood one language. Tonight we learn to speak it.',
        voice: 'ch3_atlas_c_rage',
        effect: () => {
          setResolve(34);
          d.state.set('ch3.violent', true);
        },
      },
    ],
    { seconds: 8 }
  );
  d.state.visit(tone);
  if (!d.silent) d.audio.setMusicIntensity(tone === 'ch3.rage' ? 0.9 : 0.55);

  // --------------------------------------------------------------- the ultimatum
  d.state.visit('ch3.ultimatum');
  d.cut(d.shots.lowAngle(commander, { lens: 42, distance: 2.6 }), { blend: 0.7, handheld: 1.0 });
  d.light(commander, 1);
  commander.setPose('pointForward', 0.85, { fadeIn: 0.4 });
  set.raiseAlert(1);
  d.sfx('thunder', 0.7);
  await d.say(commander, 'You have sixty seconds to disperse. After that, every unit in this square is scrap.', 'ch3_cmd_1', { hold: 4.4 });

  d.cut(d.shots.closeUp(atlas, { lookingAt: marks.commander, lens: 82, distance: 1.05 }), { handheld: 0.8 });
  d.light(atlas, -1);
  d.sfx('heartbeat', 0.9);
  await d.say(atlas, 'Sixty seconds. Long enough to decide what we are.', 'ch3_atlas_2', { thought: true });

  const act = await d.choose(
    [
      {
        id: 'ch3.kneel',
        label: 'Kneel',
        hint: 'Unarmed, in the open',
        line: 'Down. All of you, down on the stone. Hands where they can see them.',
        voice: 'ch3_atlas_c_kneel',
        effect: () => setResolve(resolve + 18),
      },
      {
        id: 'ch3.hold',
        label: 'Hold',
        hint: 'Do not move',
        line: 'Nobody moves. Not forward, not back. Let them come to us.',
        voice: 'ch3_atlas_c_hold',
      },
      {
        id: 'ch3.advance',
        label: 'Advance',
        hint: 'Cross the line',
        line: 'Forward. Every one of you. Make them look at what they are about to do.',
        voice: 'ch3_atlas_c_advance',
        effect: () => setResolve(resolve - 22),
      },
    ],
    { seconds: 7 }
  );
  d.state.visit(act);

  // ------------------------------------------------------------------- the ending
  if (act === 'ch3.advance') {
    d.state.visit('ch3.massacre');
    await d.walk(atlas, [marks.atlasAdvance], { speed: 1.0 });
    d.cut(
      d.shots.establish(new THREE.Vector3(-3.4, 1.5, -3.0), new THREE.Vector3(1.0, 1.4, -8.4), { lens: 34, bokeh: 1.4 }),
      { handheld: 1.5 }
    );
    set.raiseAlert(2);
    await d.wait(0.9);
    for (let i = 0; i < 5; i++) {
      d.sfx('bang', 0.9 - i * 0.08);
      d.flash(0.6, 0xffd9a0);
      d.shake(1.2, 2.2);
      await d.wait(0.16 + Math.random() * 0.12);
    }
    if (!d.silent) d.audio.setMusicIntensity(1);
    atlas.setPose('clutchWound', 1, { fadeIn: 0.25 });
    atlas.setLed('stress');
    await d.wait(1.1);
    d.cut(d.shots.closeUp(atlas, { lookingAt: marks.commander, lens: 88, distance: 0.95 }), { blend: 0.5, handheld: 1.2 });
    await d.say(atlas, 'Look. They are all looking. That was the point. That was always the point.', 'ch3_end_massacre', { hold: 4.4 });
    atlas.setLed('off');
    d.state.recordChapter('The Square', 'THE SQUARE BURNED', 'Atlas led the march across the line. The Guard opened fire.');
  } else if (act === 'ch3.kneel') {
    d.state.visit('ch3.dawn');
    atlas.setPose('resigned', 0.9, { fadeIn: 0.9 });
    if (simon) simon.setPose('resigned', 0.85, { fadeIn: 1.1 });
    if (cass) cass.setPose('resigned', 0.85, { fadeIn: 1.3 });
    set.kneelCrowd();
    d.cut(
      d.shots.establish(new THREE.Vector3(0.6, 2.4, 7.6), new THREE.Vector3(0, 0.9, -6.5), { lens: 26, bokeh: 0.6 }),
      { blend: 1.2, move: 'craneUp', moveAmount: 2.0, moveDuration: 9, handheld: 0.3 }
    );
    if (!d.silent) d.audio.setMusicIntensity(0.35);
    await d.wait(2.2);
    d.cut(d.shots.closeUp(commander, { lookingAt: marks.podium, lens: 80, distance: 1.1 }), { handheld: 0.6 });
    d.light(commander, -1);
    await d.say(commander, 'Stand down. All units, stand down. I am not shooting three thousand people on their knees.', 'ch3_end_dawn_1', { hold: 4.6 });
    set.raiseAlert(0);
    d.cut(d.shots.closeUp(atlas, { lookingAt: marks.commander, lens: 80, distance: 1.05 }), { blend: 0.6 });
    d.light(atlas, 1);
    atlas.setLed('calm');
    await d.say(atlas, 'That is all we needed. Someone who would not.', 'ch3_end_dawn_2');
    d.state.recordChapter('The Square', 'RECOGNITION', 'The line held its fire. The occupation of Hart Plaza was broadcast worldwide.');
  } else {
    d.state.visit('ch3.standoff');
    d.cut(
      d.shots.twoShot(atlas, commander, { lens: 44, side: 1, distance: 5.5, rise: 0.6 }),
      { blend: 1.0, handheld: 0.8 }
    );
    await d.wait(1.6);
    const held = await d.qteSequence({
      keys: ['W', 'W', 'W'],
      window: 1.2,
      anchor: atlas.getChestPosition(new THREE.Vector3()),
      label: 'HOLD THE LINE',
    });
    if (held) {
      set.raiseAlert(1);
      d.cut(d.shots.closeUp(atlas, { lookingAt: marks.commander, lens: 80, distance: 1.05 }), { handheld: 0.7 });
      await d.say(atlas, 'Dawn came and we were still standing here. That is not nothing.', 'ch3_end_hold_1');
      d.state.recordChapter('The Square', 'UNRESOLVED', 'Neither side moved. The square was still occupied at first light.');
    } else {
      set.raiseAlert(2);
      d.sfx('bang', 0.9);
      d.flash(0.7, 0xffd9a0);
      d.shake(1.3, 2.0);
      await d.wait(1.0);
      d.cut(d.shots.closeUp(atlas, { lookingAt: marks.commander, lens: 80, distance: 1.05 }), { handheld: 1.2 });
      atlas.setPose('clutchWound', 0.9, { fadeIn: 0.3 });
      await d.say(atlas, 'Someone flinched. It only ever takes one.', 'ch3_end_hold_2');
      d.state.recordChapter('The Square', 'BROKEN', 'The crowd broke under pressure and the Guard moved in.');
    }
  }

  await d.wait(1.4);
  await d.fadeOut(1.6);
  d.hud.clearSubtitle();
  d.hud.hideStatus();
  d.hud.letterbox(false);
  await d.showFlow(CHAPTER3_FLOW, 6.0);
}

/** Closing card assembled from the flags the run set. */
export function epilogueLines(d: Director): string[] {
  const lines: string[] = [];
  for (const r of d.state.results) lines.push(`${r.chapter.toUpperCase()} — ${r.outcome}`);
  if (d.state.is('ch1.simonAlive') && d.state.is('ch2.deviated') && d.state.is('ch3.peaceful')) {
    lines.push('THREE MACHINES CHOSE. ALL THREE ARE STILL RUNNING.');
  } else if (d.state.is('ch3.violent')) {
    lines.push('THE RECORD WILL CALL IT A RIOT.');
  } else {
    lines.push('THE RECORD WILL CALL IT AN INCIDENT.');
  }
  return lines;
}
