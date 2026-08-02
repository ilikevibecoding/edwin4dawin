/**
 * Scene registry.
 *
 * Scenes are loaded independently and a scene that fails to import or build is
 * replaced by a placeholder rather than taking the whole film down. That keeps
 * the film playable while individual shots are still being worked on.
 */
import { stubScene } from './_stub.js';

const LOADERS = {
  crawl: () => import('./crawl.js'),
  chase: () => import('./chase.js'),
  boarding: () => import('./boarding.js'),
  pod: () => import('./pod.js'),
  tatooine: () => import('./tatooine.js'),
  trench: () => import('./trench.js'),
  finale: () => import('./finale.js'),
};

export const SCENE_IDS = Object.keys(LOADERS);

export const SCENE_MODULES = Object.fromEntries(
  SCENE_IDS.map((id) => [id, {
    async build(ctx) {
      try {
        const mod = await LOADERS[id]();
        return await mod.build(ctx);
      } catch (e) {
        console.error(`scene "${id}" failed to build:`, e);
        return stubScene(id, ctx.dur, `${id} — build failed`);
      }
    },
  }])
);
