import { stubScene } from './_stub.js';

export const id = 'boarding';
export async function build(ctx) {
  return stubScene('boarding', ctx.dur, 'boarding');
}
