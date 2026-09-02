const fs = require("fs");
const path = require("path");
const { WASI } = require("wasi");

const modulePath = path.join(
  __dirname,
  "verify_rank6_small_core_isolate_payments.wasm",
);
const wasi = new WASI({
  version: "preview1",
  args: [
    "verify_rank6_small_core_isolate_payments",
    ...process.argv.slice(2),
  ],
});

WebAssembly.instantiate(
  fs.readFileSync(modulePath),
  wasi.getImportObject(),
).then(({ instance }) => wasi.start(instance));
