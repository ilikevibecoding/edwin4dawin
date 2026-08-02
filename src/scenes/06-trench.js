import { makeStub } from './_stub.js';

export const meta = { id: 'trench', title: 'The Trench', duration: 54, letterbox: 0.105 };

const stub = makeStub(meta);
export const build = stub.build;
