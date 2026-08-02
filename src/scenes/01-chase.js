import { makeStub } from './_stub.js';

export const meta = { id: 'chase', title: 'The Chase', duration: 34, letterbox: 0.105 };

const stub = makeStub(meta);
export const build = stub.build;
