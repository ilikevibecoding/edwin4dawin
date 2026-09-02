const fs = require("fs");
const path = require("path");
const { WASI } = require("wasi");

const modulePath = path.join(
  __dirname,
  "verify_rank6_finite_orders_18_21.wasm",
);
const wasi = new WASI({ version: "preview1" });

WebAssembly.instantiate(
  fs.readFileSync(modulePath),
  wasi.getImportObject(),
).then(({ instance }) => wasi.start(instance));
