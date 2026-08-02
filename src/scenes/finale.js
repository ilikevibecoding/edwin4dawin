import { stubScene } from './_stub.js';

export const id = 'finale';
export async function build(ctx) {
  return stubScene('finale', ctx.dur, 'finale');
}
