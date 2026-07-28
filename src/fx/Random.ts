/**
 * The random source for the effects system.
 *
 * This is `MathUtils.Rng` with one change: the state is kept as a *signed*
 * 32-bit integer rather than an unsigned one. The shared class finishes its
 * mixing step with `>>> 0`, which yields a number above 2^31 about half the
 * time — outside V8's small-integer range, so the field can no longer hold it
 * inline and every other draw allocates a boxed heap number.
 *
 * That is nothing in ordinary use and a great deal here. A single concrete
 * impact draws something like four hundred randoms across its dust, grit, chips
 * and settling ring; an airstrike detonation draws nearly nine thousand. At
 * roughly eleven bytes a draw, measured, a firefight was producing about six
 * kilobytes of garbage per impact and a hundred and forty per explosion, which
 * is most of the way to a collection every few seconds of sustained fire.
 *
 * Masking with `| 0` instead keeps the state a small integer forever. Every
 * operation downstream — `^`, `>>>`, `|`, `Math.imul` — is defined on the 32-bit
 * two's-complement pattern and does not care how that pattern was signed, so
 * the output sequence is bit-identical to the shared implementation. That
 * matters beyond tidiness: the showcase captures are tuned against these exact
 * numbers, and a different stream would be a different photograph.
 */
export class FxRng {
  private s: number;

  constructor(seed = 0x9e3779b9) {
    this.s = seed | 0;
  }

  next(): number {
    let t = (this.s = (this.s + 0x6d2b79f5) | 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  range(a: number, b: number): number {
    return a + this.next() * (b - a);
  }
}
