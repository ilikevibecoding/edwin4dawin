import { makeStub } from './_stub.js';

export const meta = { id: 'medals', title: 'Medals', duration: 30, letterbox: 0.105 };

const stub = makeStub(meta);
export const build = stub.build;
