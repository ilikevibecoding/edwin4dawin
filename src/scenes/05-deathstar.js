import { makeStub } from './_stub.js';

export const meta = { id: 'deathstar', title: 'The Battle Station', duration: 28, letterbox: 0.105 };

const stub = makeStub(meta);
export const build = stub.build;
