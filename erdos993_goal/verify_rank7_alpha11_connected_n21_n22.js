const fs = require("fs");
const path = require("path");
const { WASI } = require("wasi");

const modulePath = path.join(
  __dirname,
  "verify_rank7_alpha11_connected_n21_n22.wasm",
);
const wasi = new WASI({
  version: "preview1",
  args: ["verify_rank7_alpha11_connected_n21_n22"],
});
WebAssembly.instantiate(
  fs.readFileSync(modulePath),
  wasi.getImportObject(),
).then(({ instance }) => wasi.start(instance));
