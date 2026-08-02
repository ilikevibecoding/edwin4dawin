import { stubScene } from './_stub.js';

export const id = 'tatooine';
export async function build(ctx) {
  return stubScene('tatooine', ctx.dur, 'tatooine');
}
