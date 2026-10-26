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
const names = [
  "earth_pony",
  "pegasus",
  "unicorn",
  "alicorn",
  "changeling",
  "zebra",
  "reformed_changeling",
  "gryphon",
  "hippogriff",
  "kirin",
  "bat_pony",
  "sea_pony",
];
const catalog = Object.fromEntries(
  names.map((name) => [
    name,
    Object.fromEntries(
      ["steve", "alex"].map((variant) => [
        variant,
        compileModel(`minelittlepony:races/${variant}/${name}`, resolve),
      ]),
    ),
  ]),
);
catalog.human = {
  steve: compileModel("mson:steve", resolve),
  alex: compileModel("mson:alex", resolve),
};
const gear = Object.fromEntries(
  ["crown", "muffin", "witch_hat", "antlers", "saddlebags", "stetson"].map((name) => [
    name,
    compileModel(`minelittlepony:gear/${name}`, resolve),
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
const catalogTarget = new URL("packages/models/src/generated/catalog.json", root);
const catalogOutput =
  JSON.stringify({ schemaVersion: 2, provenance: manifest.sources, models: catalog, gear }) + "\n";
if (process.argv.includes("--check")) {
  if (readFileSync(catalogTarget, "utf8") !== catalogOutput)
    throw new Error("Model catalog is stale; run npm run models:generate");
} else writeFileSync(catalogTarget, catalogOutput);
const textures = {};
for (const file of Object.keys(manifest.files).filter((f) => f.endsWith(".png")))
  textures[file.split("/").at(-1).replace(".png", "")] =
    `data:image/png;base64,${readFileSync(new URL(file, sources)).toString("base64")}`;
const textureTarget = new URL("packages/models/src/generated/textures.json", root),
  textureOutput = JSON.stringify(textures) + "\n";
if (process.argv.includes("--check")) {
  if (readFileSync(textureTarget, "utf8") !== textureOutput)
    throw new Error("Model textures are stale");
} else writeFileSync(textureTarget, textureOutput);
