import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { compileModel } from "./compiler.mjs";

const root = new URL("../../../", import.meta.url);
const sources = new URL("model-sources/", root);
const manifest = JSON.parse(readFileSync(new URL("manifest.json", sources), "utf8"));
for (const [name, hash] of Object.entries(manifest.files)) {
  const actual = createHash("sha256")
    .update(readFileSync(new URL(name, sources)))
    .digest("hex");
  if (actual !== hash) throw new Error(`Source changed without manifest update: ${name}`);
}
const resolve = (id) => {
  if (!/^[a-z_]+:[a-z_/]+$/.test(id)) throw new Error(`Invalid resource ID ${id}`);
  const [namespace, path] = id.split(":");
  return JSON.parse(readFileSync(new URL(`${namespace}/models/${path}.json`, sources), "utf8"));
};
const models = Object.fromEntries(
  ["steve", "alex"].map((variant) => [
    variant,
    compileModel(`minelittlepony:races/${variant}/earth_pony`, resolve),
  ]),
);
const data = { schemaVersion: 1, provenance: manifest.sources, models };
const target = new URL("packages/models/src/generated/earthpony.json", root);
const output = JSON.stringify(data) + "\n";
if (process.argv.includes("--check")) {
  if (readFileSync(target, "utf8") !== output)
    throw new Error("Generated models are stale; run npm run models:generate");
  console.log("Model sources and generated models verified.");
} else {
  writeFileSync(target, output);
  console.log(`Generated ${fileURLToPath(target)}`);
}
