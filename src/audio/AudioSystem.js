/**
 * Audio. STUB — real synthesized/spatial sound design lives in src/audio/* (audio team).
 *
 * Required interface:
 *   async load(); update(dt)
 *   play(name, { position?: Vector3, volume?, pitch? })
 *   setMasterVolume(v)
 * Must respect game.settings.muted and resume the AudioContext on first user gesture (pointer lock / click).
 * Listens to: weapon:fire, weapon:reload:*, weapon:empty, weapon:casing, bullet:hit, footstep, player:jump/land,
 *             explosion, enemy:fire, enemy:damaged, enemy:killed, killstreak:*, ui:hitmarker, game:state
 */
export class AudioSystem {
  constructor(game) {
    this.game = game;
    this.enabled = !game.settings.muted;
  }
  async load() {}
  play() {}
  setMasterVolume() {}
  update() {}
}
