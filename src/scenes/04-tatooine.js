import { makeStub } from './_stub.js';

export const meta = { id: 'tatooine', title: 'Twin Suns', duration: 40, letterbox: 0.105 };

const stub = makeStub(meta);
export const build = stub.build;
