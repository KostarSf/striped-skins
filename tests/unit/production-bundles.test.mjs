import { test } from "node:test";
import assert from "node:assert/strict";
import { build } from "vite";
import { productionBundleGuard } from "../../tools/production-bundle-guard.ts";

test("production guard rejects dev tooling even in an optional lazy chunk", async () => {
  await assert.rejects(
    build({
      configFile: false,
      publicDir: false,
      logLevel: "silent",
      build: { write: false, rolldownOptions: { input: "virtual:entry" } },
      plugins: [
        {
          name: "dev-tool-fixture",
          resolveId(id) {
            if (id === "virtual:entry") return "\0entry";
            if (id === "virtual:perf") return "/fixture/node_modules/r3f-perf/monitor.js";
          },
          load(id) {
            if (id === "\0entry")
              return 'window.showPerf = () => import("virtual:perf").then(m => m.show());';
            if (id.endsWith("/monitor.js")) return 'export function show(){console.log("perf")}';
          },
        },
        productionBundleGuard(),
      ],
    }),
    /forbidden module.*r3f-perf/,
  );
});

test("production guard rejects an externalized server-side monitor import", async () => {
  await assert.rejects(
    build({
      configFile: false,
      publicDir: false,
      logLevel: "silent",
      build: {
        write: false,
        rolldownOptions: { input: "virtual:entry", external: ["r3f-perf"] },
      },
      plugins: [
        {
          name: "external-dev-tool-fixture",
          resolveId(id) {
            if (id === "virtual:entry") return "\0entry";
          },
          load(id) {
            if (id === "\0entry") return 'import { Perf } from "r3f-perf"; window.Perf = Perf;';
          },
        },
        productionBundleGuard(),
      ],
    }),
    /forbidden module.*r3f-perf/,
  );
});
