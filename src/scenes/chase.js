import { stubScene } from './_stub.js';

export const id = 'chase';
export async function build(ctx) {
  return stubScene('chase', ctx.dur, 'chase');
}
