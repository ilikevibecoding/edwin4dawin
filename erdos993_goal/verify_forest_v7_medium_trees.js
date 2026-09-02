const fs = require("fs");
const path = require("path");
const { WASI } = require("wasi");

const modulePath = path.join(__dirname, "verify_forest_v7_medium_trees.wasm");
const wasi = new WASI({
  version: "preview1",
  args: ["verify_forest_v7_medium_trees", ...process.argv.slice(2)],
});
WebAssembly.instantiate(
  fs.readFileSync(modulePath),
  wasi.getImportObject(),
).then(({ instance }) => wasi.start(instance));
