import { stubScene } from './_stub.js';

export const id = 'trench';
export async function build(ctx) {
  return stubScene('trench', ctx.dur, 'trench');
}
