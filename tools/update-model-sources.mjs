import { readFileSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";

// Explicit maintenance operation only. Normal builds never execute this script.
const root = new URL("../model-sources/", import.meta.url);
const manifest = JSON.parse(readFileSync(new URL("manifest.json", root), "utf8"));
const args = process.argv.slice(2);
const paths = {};
for (let i = 0; i < args.length; i += 2) {
  const namespace = { "--mlp": "minelittlepony", "--mson": "mson" }[args[i]];
  if (!namespace || !args[i + 1])
    throw new Error(
      "Usage: npm run models:import -- --mlp /path/to/checkout --mson /path/to/checkout",
    );
  paths[namespace] = resolve(args[i + 1]);
}
const writes = [];
for (const namespace of ["minelittlepony", "mson"]) {
  if (!paths[namespace]) throw new Error(`Missing checkout for ${namespace}`);
  const revision = execFileSync("git", ["-C", paths[namespace], "rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim();
  if (revision !== manifest.sources[namespace].revision)
    throw new Error(
      `${namespace}: checkout ${revision} does not match manifest revision ${manifest.sources[namespace].revision}`,
    );
}
for (const name of Object.keys(manifest.files)) {
  const [namespace, category, ...rest] = name.split("/");
  let source;
  if (category === "LICENSE") source = "LICENSE";
  else if (category === "models")
    source = `src/main/resources/assets/${namespace}/models/entity/${rest.join("/")}`;
  else if (category === "behavior" && namespace === "minelittlepony")
    source = `src/main/java/com/minelittlepony/${rest[0] === "PonyTransformation.java" ? "client/transform" : "api/pony/meta"}/${rest[0]}`;
  else throw new Error(`Unsupported source path ${name}`);
  const data = readFileSync(join(paths[namespace], source));
  // Verify the exact snapshot too: a dirty checkout must not silently change vendored files.
  const hash = createHash("sha256").update(data).digest("hex");
  if (hash !== manifest.files[name])
    throw new Error(
      `Source hash differs for ${name}; review and update the manifest explicitly first`,
    );
  writes.push([new URL(name, root), data]);
}
for (const [target, data] of writes) writeFileSync(target, data);
console.log(`Imported ${writes.length} pinned source files. Run npm run models:generate.`);
