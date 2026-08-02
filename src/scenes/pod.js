import { stubScene } from './_stub.js';

export const id = 'pod';
export async function build(ctx) {
  return stubScene('pod', ctx.dur, 'pod');
}
