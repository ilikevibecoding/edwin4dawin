import { stubScene } from './_stub.js';

export const id = 'crawl';
export async function build(ctx) {
  return stubScene('crawl', ctx.dur, 'crawl');
}
