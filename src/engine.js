// The beat interpreter: walks a chapter's beat list, delegating to
// stage / ui / fx / audio, applying flags, marks and branching.

import { wait, T } from './util.js';
import { stage } from './stage.js';
import { ui } from './ui.js';
import { fx } from './fx.js';
import { audio } from './audio.js';

const REL_NAMES = { reese: 'REESE', opinion: 'PUBLIC OPINION' };

export class Engine {
  constructor(settings) {
    this.settings = settings;
  }

  applyEffects(fxDef, flags) {
    if (!fxDef) return;
    const tasks = [];
    if (fxDef.ins) {
      flags.ins = (flags.ins || 0) + fxDef.ins;
      if (fxDef.ins > 0) ui.toast('ins', 'SOFTWARE INSTABILITY', 'up');
    }
    for (const key of ['reese', 'opinion']) {
      if (fxDef[key]) {
        flags[key] = (flags[key] || 0) + fxDef[key];
        ui.toast('rel', REL_NAMES[key], fxDef[key] > 0 ? 'up' : 'down');
      }
    }
    if (fxDef.prob) tasks.push(ui.prob(fxDef.prob).then(() => { flags.prob = ui.probVal; }));
    if (fxDef.stress) tasks.push(ui.stress(fxDef.stress).then(() => { flags.stress = ui.stressVal; }));
    if (fxDef.set) Object.assign(flags, fxDef.set);
    if (fxDef.add) { for (const k in fxDef.add) flags[k] = (flags[k] || 0) + fxDef.add[k]; }
    return Promise.all(tasks);
  }

  cmp(a, op, b) {
    switch (op) {
      case '>=': return a >= b;
      case '<=': return a <= b;
      case '>': return a > b;
      case '<': return a < b;
      case '==': return a === b;
      case '!=': return a !== b;
      default: return false;
    }
  }

  // Runs a linear list of beats (used for investigation hotspots).
  async runLinear(beats, flags, marks) {
    for (const b of beats) await this.execBeat(b, flags, marks);
  }

  // Executes one beat; returns a label name when a jump is requested.
  async execBeat(b, flags, marks) {
    if (b.label !== undefined) return null;

    if (b.sh) {
      await stage.show(b.sh, b);
      if (b.hold) await wait(T(b.hold));
      return null;
    }
    if (b.card) { stage.setLetterbox(true); await stage.card(b.card); return null; }
    if (b.cap) { await stage.caption(b.cap, b.ms); return null; }
    if (b.boot) { await stage.boot(); return null; }

    if (b.say) { await ui.say(b.say[0], b.say[1], { led: b.led }); return null; }
    if (b.inner) { await ui.say('ADAM', b.inner, { inner: true }); return null; }
    if (b.sys) { await ui.say('SYSTEM', b.sys, { sys: true }); return null; }

    if (b.choice) {
      const opt = await ui.choice(b.choice, flags);
      await this.applyEffects(opt.fx, flags);
      if (opt.mark) marks.add(opt.mark);
      return opt.go || null;
    }
    if (b.qte) {
      const { ok } = await ui.qte(b.qte);
      if (ok && b.qte.okMark) marks.add(b.qte.okMark);
      if (!ok && b.qte.failMark) marks.add(b.qte.failMark);
      return ok ? (b.qte.ok || null) : (b.qte.fail || null);
    }
    if (b.mash) {
      const { ok } = await ui.mash(b.mash);
      if (ok && b.mash.okMark) marks.add(b.mash.okMark);
      if (!ok && b.mash.failMark) marks.add(b.mash.failMark);
      return ok ? (b.mash.ok || null) : (b.mash.fail || null);
    }
    if (b.invest) {
      await ui.investigate(b.invest, flags, (sub) => this.runLinear(sub, flags, marks));
      return b.invest.done || null;
    }

    if (b.go) return b.go;
    if (b.if) {
      const { k, op, v, go } = b.if;
      if (this.cmp(flags[k] || 0, op, v)) return go;
      return null;
    }
    if (b.ifMark) return marks.has(b.ifMark) ? b.go2 || b.goMark : null;
    if (b.ifNotMark) return !marks.has(b.ifNotMark) ? b.go2 || b.goMark : null;

    if (b.set) { Object.assign(flags, b.set); return null; }
    if (b.add) { for (const k in b.add) flags[k] = (flags[k] || 0) + b.add[k]; return null; }
    if (b.mark) { marks.add(b.mark); return null; }
    if (b.fx) { await this.applyEffects(b.fx, flags); return null; }

    if (b.toast) { ui.toast(b.toast.kind, b.toast.text, b.toast.dir); return null; }
    if (b.obj) { ui.objective(b.obj); return null; }
    if (b.objHide) { ui.hideObjective(); return null; }

    if (b.probShow !== undefined) { ui.showProb(b.probShow); flags.prob = b.probShow; return null; }
    if (b.prob !== undefined) { await ui.prob(b.prob); flags.prob = ui.probVal; return null; }
    if (b.probHide) { ui.hideProb(); return null; }
    if (b.stressShow !== undefined) { ui.showStress(b.stressShow); flags.stress = b.stressShow; return null; }
    if (b.stress !== undefined) { await ui.stress(b.stress); flags.stress = ui.stressVal; return null; }
    if (b.stressHide) { ui.hideStress(); return null; }

    if (b.banner) { await ui.banner(b.banner.text, b.banner.sub, b.banner.kind); return null; }
    if (b.wait) { await wait(T(b.wait)); return null; }
    if (b.flash) { fx.flash(b.flash === true ? undefined : b.flash); return null; }
    if (b.shake) { fx.shake(b.shake); return null; }
    if (b.glitch) { fx.glitch(b.glitch); return null; }
    if (b.letter !== undefined) { stage.setLetterbox(b.letter); return null; }
    if (b.amb) { audio.setAmbience(b.amb); return null; }
    if (b.weather) { fx.setWeather(b.weather); return null; }
    if (b.hideDlg) { ui.hideDialogue(); return null; }
    if (b.heartbeat !== undefined) { audio.heartbeat(b.heartbeat); return null; }

    if (b.end) return '__END__';

    console.warn('Unknown beat', b);
    return null;
  }

  async run(chapter, flags, marks) {
    const beats = chapter.beats;
    const labels = {};
    beats.forEach((b, i) => { if (b.label !== undefined) labels[b.label] = i; });

    let i = 0;
    let endBeat = null;
    while (i < beats.length) {
      const b = beats[i];
      if (b.end) { endBeat = b; break; }
      const jump = await this.execBeat(b, flags, marks);
      if (jump === '__END__') { endBeat = b; break; }
      if (jump) {
        if (!(jump in labels)) throw new Error(`Missing label "${jump}" in ${chapter.id}`);
        i = labels[jump];
      } else {
        i++;
      }
    }

    ui.hideDialogue();
    ui.hideObjective();
    ui.hideProb();
    ui.hideStress();

    if (endBeat && endBeat.end.flow) {
      audio.setAmbience('somber');
      await ui.flowchart(endBeat.end.flow, marks, chapter.title);
    }
    return { flags, marks, next: endBeat ? endBeat.end.next : null };
  }
}
